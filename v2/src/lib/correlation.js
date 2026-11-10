// Analyse des corrélations ingrédients ↔ symptômes (v2).
//
// Principe : on compare, pour chaque ingrédient, la fréquence des symptômes
// après les repas QUI LE CONTIENNENT à celle après les repas QUI NE LE
// CONTIENNENT PAS (risque relatif). Un ingrédient présent partout (sel,
// huile…) a un risque relatif proche de 1 et ne ressort plus.
//
// Changements par rapport à la v1 :
//  - comparaison avec / sans l'ingrédient (la v1 n'avait aucun point de comparaison) ;
//  - les saisies de douleur à moins de 2 h d'intervalle = un seul épisode ;
//  - un épisode compte une fois, même s'il a plusieurs symptômes cochés ;
//  - poids selon le délai repas → symptôme (plein entre 30 min et 8 h) ;
//  - seuils minimaux : 3 repas avec l'ingrédient et 2 épisodes liés ;
//  - lissage + test statistique (écart nettement supérieur au hasard) pour
//    éviter les faux positifs quand il y a peu de données.

import { getEntrySymptoms, getEntrySeverity } from "./symptomTypes.js";
import { normalizeIngredientName } from "./foodNormalizer.js";

export const LOOKBACK_HOURS = 24;
export const EPISODE_MERGE_HOURS = 2;
export const MIN_MEALS_WITH = 3;
export const MIN_EPISODES = 2;
const PRIOR_STRENGTH = 2; // poids du lissage (en « repas fictifs »)
// Écart minimal avec / sans, en nombre d'écarts-types (test unilatéral).
export const Z_MIN = { low: 1.96, medium: 2.5, high: 3 };

export const LEVELS = {
  high:   { label: "Très suspect", className: "chip-severity-high" },
  medium: { label: "Suspect",      className: "chip-severity-medium" },
  low:    { label: "À surveiller", className: "chip-severity-low" },
};
export const LEVEL_THRESHOLDS = { high: 2, medium: 1.5, low: 1.2 };

const H = 3600_000;

// Poids d'un repas selon le délai avant le symptôme (heures).
export function lagWeight(h) {
  if (!(h > 0) || h > LOOKBACK_HOURS) return 0;
  if (h < 0.5) return 0.5;                       // trop rapide pour être digestif, mais possible
  if (h <= 8) return 1;                          // fenêtre typique (FODMAP, lactose…)
  return 1 - 0.7 * (h - 8) / (LOOKBACK_HOURS - 8); // décroît jusqu'à 0,3 à 24 h
}

// Sévérité 2,5 → 0,625 ; 10 → 1 : une crise forte pèse plus, sans écraser le reste.
function severityFactor(sev) {
  return 0.5 + Math.min(Math.max(sev, 0), 10) / 20;
}

// Regroupe les saisies de douleur proches en épisodes.
export function buildEpisodes(painEntries, filterSymptom = null) {
  const sorted = painEntries
    .map(e => ({ e, t: new Date(e.timestamp).getTime() }))
    .filter(x => Number.isFinite(x.t))
    .sort((a, b) => a.t - b.t);

  const episodes = [];
  for (const { e, t } of sorted) {
    let symptoms = getEntrySymptoms(e);
    if (filterSymptom) symptoms = symptoms.filter(s => s === filterSymptom);
    if (!symptoms.length) continue;
    const severity = getEntrySeverity(e);
    const last = episodes[episodes.length - 1];
    if (last && t - last.times[last.times.length - 1] <= EPISODE_MERGE_HOURS * H) {
      last.times.push(t);
      last.severity = Math.max(last.severity, severity);
      symptoms.forEach(s => last.symptoms.add(s));
    } else {
      episodes.push({ id: episodes.length, times: [t], severity, symptoms: new Set(symptoms) });
    }
  }
  return episodes;
}

// Délai (h) entre un repas et la première saisie de l'épisode qui le suit.
function lagToEpisode(mealT, ep) {
  for (const t of ep.times) {
    if (t > mealT) return (t - mealT) / H;
  }
  return -1;
}

/**
 * Analyse principale.
 * @returns {{
 *   ingredients: Array, symptomCount: number, painEntryCount: number,
 *   mealCount: number, symptomBreakdown: Object, baselineRate: number,
 *   explainedRate: number, insufficientCount: number
 * }}
 */
export function analyzeCorrelations(entries, options = {}) {
  const { filterSymptom = null } = options;

  const painEntries = entries.filter(e => e.type === "pain");
  const meals = entries
    .filter(e => e.type === "meal")
    .map(m => ({ m, t: new Date(m.timestamp).getTime() }))
    .filter(x => Number.isFinite(x.t));
  const episodes = buildEpisodes(painEntries, filterSymptom);

  const symptomBreakdown = {};
  episodes.forEach(ep => ep.symptoms.forEach(s => {
    symptomBreakdown[s] = (symptomBreakdown[s] || 0) + 1;
  }));

  const empty = {
    ingredients: [], symptomCount: episodes.length, painEntryCount: painEntries.length,
    mealCount: meals.length, symptomBreakdown, baselineRate: 0, explainedRate: 0, insufficientCount: 0,
  };
  if (!episodes.length || !meals.length) return empty;

  // ── 1. Pour chaque repas : symptôme qui suit (pondéré) + épisodes liés ──
  const nameCache = new Map();
  const keyOf = (nom) => {
    if (!nameCache.has(nom)) nameCache.set(nom, normalizeIngredientName(nom));
    return nameCache.get(nom);
  };

  let totalOutcome = 0;
  let totalSq = 0;
  const mealInfos = meals.map(({ m, t }) => {
    let outcome = 0;
    const links = [];
    for (const ep of episodes) {
      const lag = lagToEpisode(t, ep);
      const w = lagWeight(lag);
      if (w <= 0) continue;
      outcome = Math.max(outcome, w * severityFactor(ep.severity));
      links.push({ ep, lag, w });
    }
    totalOutcome += outcome;
    totalSq += outcome * outcome;
    const keys = new Map();
    for (const ing of m.ingredients || []) {
      const nom = typeof ing === "string" ? ing : ing?.nom;
      const k = nom ? keyOf(nom) : "";
      if (k && !keys.has(k)) keys.set(k, typeof ing === "string" ? "autre" : ing.categorie);
    }
    return { outcome, links, keys };
  });

  const N = mealInfos.length;
  const baselineRate = totalOutcome / N;
  if (baselineRate <= 0) return empty;

  // ── 2. Agrégation par ingrédient ──
  const stats = new Map(); // key → { categorie, n, s, episodes: Map(id → {ep, lag, w}) }
  for (const info of mealInfos) {
    for (const [k, categorie] of info.keys) {
      let st = stats.get(k);
      if (!st) { st = { categorie, n: 0, s: 0, s2: 0, episodes: new Map() }; stats.set(k, st); }
      st.n++;
      st.s += info.outcome;
      st.s2 += info.outcome * info.outcome;
      for (const link of info.links) {
        const prev = st.episodes.get(link.ep.id);
        if (!prev || link.w > prev.w) st.episodes.set(link.ep.id, link);
      }
    }
  }

  // ── 3. Risque relatif lissé ──
  const k = PRIOR_STRENGTH;
  const results = [];
  let insufficientCount = 0;
  for (const [name, st] of stats) {
    const nEp = st.episodes.size;
    if (nEp === 0) continue;
    if (st.n < MIN_MEALS_WITH || nEp < MIN_EPISODES) { insufficientCount++; continue; }

    const rateWith = (st.s + k * baselineRate) / (st.n + k);
    const rateWithout = (totalOutcome - st.s + k * baselineRate) / (N - st.n + k);
    const relativeRisk = rateWithout > 0 ? rateWith / rateWithout : 1;
    if (relativeRisk < LEVEL_THRESHOLDS.low) continue;

    // Test : l'écart avec / sans dépasse-t-il nettement le hasard ?
    const nWo = N - st.n;
    if (nWo < 2) continue; // présent dans (presque) tous les repas : pas de comparaison possible
    const meanW = st.s / st.n;
    const meanWo = (totalOutcome - st.s) / nWo;
    const varW = Math.max(st.s2 / st.n - meanW * meanW, 0);
    const varWo = Math.max((totalSq - st.s2) / nWo - meanWo * meanWo, 0);
    const z = (meanW - meanWo) / Math.sqrt(varW / st.n + varWo / nWo + 1e-6);
    if (z < Z_MIN.low) continue;

    const links = [...st.episodes.values()];
    const avgSeverity = links.reduce((a, l) => a + l.ep.severity, 0) / links.length;
    const avgTimeLag = links.reduce((a, l) => a + l.lag, 0) / links.length;
    const symptomCounts = {};
    links.forEach(l => l.ep.symptoms.forEach(s => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; }));
    const topSymptom = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const level =
      relativeRisk >= LEVEL_THRESHOLDS.high && nEp >= 3 && z >= Z_MIN.high ? "high"
      : relativeRisk >= LEVEL_THRESHOLDS.medium && z >= Z_MIN.medium ? "medium"
      : "low";
    // Classement : force du lien × confiance (plus d'épisodes = plus fiable).
    const score = (relativeRisk - 1) * (nEp / (nEp + 2));

    results.push({
      name,
      categorie: st.categorie,
      totalMeals: st.n,
      episodeCount: nEp,
      coverage: nEp / episodes.length,
      relativeRisk,
      rateWith,
      rateWithout,
      avgSeverity,
      avgTimeLag,
      symptomCounts,
      topSymptom,
      level,
      z,
      score,
    });
  }
  results.sort((a, b) => b.score - a.score);

  // ── 4. Part des épisodes précédés d'au moins un suspect ──
  const suspectSet = new Set(results.map(r => r.name));
  const explained = new Set();
  for (const info of mealInfos) {
    if (![...info.keys.keys()].some(key => suspectSet.has(key))) continue;
    info.links.forEach(l => explained.add(l.ep.id));
  }

  return {
    ingredients: results,
    symptomCount: episodes.length,
    painEntryCount: painEntries.length,
    mealCount: N,
    symptomBreakdown,
    baselineRate,
    explainedRate: explained.size / episodes.length,
    insufficientCount,
  };
}
