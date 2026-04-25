import { getEntrySymptoms, getEntrySeverity } from "./symptomTypes.js";

const DEFAULT_LOOKBACK_HOURS = 24;
const MIN_OCCURRENCES = 1;

/**
 * Main correlation analysis.
 * Returns ingredients ranked by their total impact score across all symptom types.
 *
 * @param {Array} entries - all journal entries (meals + symptoms)
 * @param {Object} options
 * @param {number} options.lookbackHours - time window in hours (default 24)
 * @param {string|null} options.filterSymptom - restrict to one symptom type
 * @returns {{ ingredients, symptomCount, mealCount, symptomBreakdown }}
 */
export function analyzeCorrelations(entries, options = {}) {
  const { lookbackHours = DEFAULT_LOOKBACK_HOURS, filterSymptom = null } = options;

  const symptomEntries = entries.filter(e => e.type === "pain");
  const mealEntries = entries.filter(e => e.type === "meal" && e.ingredients?.length > 0);

  if (!symptomEntries.length || !mealEntries.length) {
    return { ingredients: [], symptomCount: symptomEntries.length, mealCount: mealEntries.length, symptomBreakdown: {} };
  }

  // ── Step 1: count total meals per ingredient ──────────────────────────────
  const ingredientMeta = {}; // key → { categorie, totalMeals }
  mealEntries.forEach(meal => {
    const seen = new Set();
    (meal.ingredients || []).forEach(ing => {
      const key = normalizeKey(ing.nom);
      if (!key || seen.has(key)) return;
      seen.add(key);
      if (!ingredientMeta[key]) ingredientMeta[key] = { categorie: ing.categorie, totalMeals: 0 };
      ingredientMeta[key].totalMeals++;
    });
  });

  // ── Step 2: count symptom occurrences per type ────────────────────────────
  const symptomTotals = {}; // symptomKey → count
  symptomEntries.forEach(e => {
    getEntrySymptoms(e).forEach(sk => {
      symptomTotals[sk] = (symptomTotals[sk] || 0) + 1;
    });
  });

  // ── Step 3: correlate ─────────────────────────────────────────────────────
  // stats[ingredientKey][symptomKey] = { count, totalSeverity, timeLags[] }
  const stats = {};

  symptomEntries.forEach(symptom => {
    const symptoms = getEntrySymptoms(symptom);
    const activeSymptoms = filterSymptom ? symptoms.filter(s => s === filterSymptom) : symptoms;
    if (!activeSymptoms.length) return;

    const severity = getEntrySeverity(symptom);
    const pt = new Date(symptom.timestamp).getTime();
    const windowStart = pt - lookbackHours * 3600_000;

    const credited = new Set(); // avoid double-counting same ingredient in same window
    mealEntries.forEach(meal => {
      const mt = new Date(meal.timestamp).getTime();
      if (mt < windowStart || mt > pt) return;
      const timeLagH = (pt - mt) / 3600_000;

      (meal.ingredients || []).forEach(ing => {
        const key = normalizeKey(ing.nom);
        if (!key || credited.has(key)) return;
        credited.add(key);

        if (!stats[key]) stats[key] = {};
        activeSymptoms.forEach(sk => {
          if (!stats[key][sk]) stats[key][sk] = { count: 0, totalSeverity: 0, timeLags: [] };
          stats[key][sk].count++;
          stats[key][sk].totalSeverity += severity;
          stats[key][sk].timeLags.push(timeLagH);
        });
      });
    });
  });

  // ── Step 4: compute scores ────────────────────────────────────────────────
  const ingredients = Object.entries(stats)
    .filter(([key]) => ingredientMeta[key])
    .map(([name, symptomData]) => {
      const meta = ingredientMeta[name];
      const symptomScores = {};

      Object.entries(symptomData).forEach(([sk, s]) => {
        if (s.count < MIN_OCCURRENCES) return;
        const totalSymptoms = symptomTotals[sk] || 1;
        const frequency = s.count / meta.totalMeals;         // % meals followed by symptom
        const coverage  = s.count / totalSymptoms;           // % of symptom events preceded by this
        const avgSeverity = s.totalSeverity / s.count;
        const avgTimeLag  = avg(s.timeLags);
        const score = coverage * avgSeverity;                 // main ranking metric
        symptomScores[sk] = { count: s.count, frequency, coverage, avgSeverity, avgTimeLag, score, timeLags: s.timeLags };
      });

      const totalImpact = Object.values(symptomScores).reduce((a, b) => a + b.score, 0);
      const topSymptomEntry = Object.entries(symptomScores).sort((a, b) => b[1].score - a[1].score)[0];

      return {
        name,
        categorie: meta.categorie,
        totalMeals: meta.totalMeals,
        symptomScores,
        totalImpact,
        topSymptom: topSymptomEntry?.[0] ?? null,
        topScore: topSymptomEntry?.[1]?.score ?? 0,
      };
    })
    .filter(r => r.totalImpact > 0)
    .sort((a, b) => b.totalImpact - a.totalImpact);

  return {
    ingredients,
    symptomCount: symptomEntries.length,
    mealCount: mealEntries.length,
    symptomBreakdown: symptomTotals,
  };
}

/**
 * For a single ingredient, return all (timeLag, severity, symptomKey) data points.
 * Used for the scatter plot.
 */
export function getTimeLagData(entries, ingredientName, options = {}) {
  const { lookbackHours = DEFAULT_LOOKBACK_HOURS } = options;
  const key = normalizeKey(ingredientName);
  const symptomEntries = entries.filter(e => e.type === "pain");
  const mealEntries = entries.filter(e => e.type === "meal" && e.ingredients?.length > 0);
  const points = [];

  symptomEntries.forEach(symptom => {
    const severity = getEntrySeverity(symptom);
    const symptoms = getEntrySymptoms(symptom);
    const pt = new Date(symptom.timestamp).getTime();
    const windowStart = pt - lookbackHours * 3600_000;

    mealEntries.forEach(meal => {
      const mt = new Date(meal.timestamp).getTime();
      if (mt < windowStart || mt > pt) return;
      const hasIngredient = (meal.ingredients || []).some(i => normalizeKey(i.nom) === key);
      if (!hasIngredient) return;
      const timeLagH = (pt - mt) / 3600_000;
      symptoms.forEach(sk => {
        points.push({ timeLag: timeLagH, severity, symptomKey: sk, timestamp: symptom.timestamp });
      });
    });
  });

  return points;
}

function normalizeKey(name) {
  return (name || "").toLowerCase().trim();
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
