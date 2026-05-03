import { useState, useMemo } from "react";
import { Sparkles, Info, HelpCircle } from "lucide-react";
import { analyzeCorrelations } from "../../lib/correlation.js";
import { CAT_EMOJI } from "../../lib/categories.js";
import { getFodmapCategories } from "../../lib/fodmapDictionary.js";
import HowItWorksModal from "./HowItWorksModal.jsx";

const LOOKBACK_HOURS = 24;

// FODMAP families regrouped at a higher level for display.
// Each suspect ingredient appears under the first display group whose
// `fodmaps` overlap its dictionary mapping.
const FODMAP_DISPLAY_GROUPS = [
  { key: "oligo",    label: "Oligosaccharides",  chip: "GOS & Fructanes", fodmaps: ["fructans", "gos"] },
  { key: "di",       label: "Disaccharides",     chip: "Lactose",         fodmaps: ["lactose"] },
  { key: "mono",     label: "Monosaccharides",   chip: "Fructose",        fodmaps: ["fructose"] },
  { key: "polyols",  label: "Polyols",           chip: "Sorbitol & co.",  fodmaps: ["polyols"] },
  { key: "neutral",  label: "Ingrédients neutres", chip: "Sûrs",          fodmaps: ["none"] },
  { key: "other",    label: "Autres ingrédients",  chip: "Non classés",   fodmaps: [] }, // catch-all
];

function severityForCoverage(maxCoverage) {
  const pct = maxCoverage * 100;
  if (pct >= 70) return { label: "Très suspect", className: "chip-severity-high" };
  if (pct >= 40) return { label: "Suspect",      className: "chip-severity-medium" };
  if (pct >= 20) return { label: "À surveiller", className: "chip-severity-low" };
  return { label: "Faible", className: "chip-severity-safe" };
}

function ingredientMaxCoverage(ing) {
  const coverages = Object.values(ing.symptomScores || {}).map(s => s.coverage || 0);
  return coverages.length ? Math.max(...coverages) : 0;
}

function fodmapGroupForIngredient(name) {
  const cats = getFodmapCategories(name);
  if (!cats || cats.length === 0) return "other";
  for (const group of FODMAP_DISPLAY_GROUPS) {
    if (group.fodmaps.some(f => cats.includes(f))) return group.key;
  }
  return "other";
}

// % of symptom entries that had at least one suspect ingredient
// in their lookback window.
function computeCorrelationRate(entries, suspectNames) {
  const painEntries = entries.filter(e => e.type === "pain");
  if (painEntries.length === 0) return 0;
  const mealEntries = entries.filter(e => e.type === "meal" && e.ingredients?.length);
  const suspectSet = new Set(suspectNames.map(n => n.toLowerCase().trim()));

  let count = 0;
  for (const pain of painEntries) {
    const pt = new Date(pain.timestamp).getTime();
    const windowStart = pt - LOOKBACK_HOURS * 3600_000;
    const hasSuspect = mealEntries.some(meal => {
      const mt = new Date(meal.timestamp).getTime();
      if (mt < windowStart || mt > pt) return false;
      return (meal.ingredients || []).some(ing => suspectSet.has((ing.nom || "").toLowerCase().trim()));
    });
    if (hasSuspect) count++;
  }
  return count / painEntries.length;
}

export default function AnalysisScreen({ entries }) {
  const [showHow, setShowHow] = useState(false);
  const data = useMemo(() => analyzeCorrelations(entries, { lookbackHours: LOOKBACK_HOURS }), [entries]);

  if (entries.length === 0) {
    return <EmptyState
      emoji="🌱"
      title="Aucune donnée"
      subtitle="Commence par enregistrer un repas et un symptôme. L'analyse arrivera quand tu auras assez de données." />;
  }

  if (data.symptomCount < 3 || data.mealCount < 5) {
    return <EmptyState
      emoji="📊"
      title="Continue, on y est presque"
      subtitle={`Il faut au moins 3 symptômes et 5 repas pour des corrélations fiables. Tu en es à ${data.symptomCount} symptôme${data.symptomCount>1?"s":""} et ${data.mealCount} repas.`} />;
  }

  if (data.ingredients.length === 0) {
    return <EmptyState
      emoji="🤔"
      title="Aucun suspect identifié"
      subtitle="Aucun ingrédient ne revient régulièrement avant tes symptômes. Continue à noter, on finira par trouver." />;
  }

  // ── We have suspects. Compute summary + group by FODMAP ──
  const correlationRate = computeCorrelationRate(entries, data.ingredients.map(i => i.name));
  const correlationPct = Math.round(correlationRate * 100);
  const sensitivityLabel =
    correlationRate > 0.6 ? "Sensibilité haute"
    : correlationRate > 0.35 ? "Sensibilité modérée"
    : "Sensibilité légère";

  // Group suspects by display group, preserving rank order within each group
  const grouped = {};
  data.ingredients.forEach(ing => {
    const g = fodmapGroupForIngredient(ing.name);
    (grouped[g] = grouped[g] || []).push(ing);
  });

  return (
    <div className="analysis-screen">
      <h1 className="headline-lg">Analyse digestive</h1>
      <p className="body-md text-muted" style={{ marginTop: 4 }}>
        Identification des ingrédients suspects basée sur les {LOOKBACK_HOURS} dernières heures avant chaque symptôme.
      </p>

      {/* Vue d'ensemble */}
      <div className="card overview-card" style={{ marginTop: 24 }}>
        <div className="overview-label">
          <Sparkles size={14} strokeWidth={2} />
          <span>Vue d'ensemble</span>
        </div>
        <div className="overview-title">Tendance : {sensitivityLabel}</div>
        <div className="overview-progress">
          <div className="overview-progress-fill" style={{ width: `${correlationPct}%` }} />
        </div>
        <p className="body-md text-muted">
          {correlationPct}% de vos symptômes sont corrélés à au moins un suspect identifié ci-dessous.
        </p>
      </div>

      {/* FODMAP grouped sections */}
      {FODMAP_DISPLAY_GROUPS.map(group => {
        const items = grouped[group.key];
        if (!items || items.length === 0) return null;
        return (
          <section key={group.key} className="fodmap-section">
            <div className="fodmap-section-header">
              <h2 className="headline-md">{group.label}</h2>
              <span className="chip chip-outline">{group.chip}</span>
            </div>
            <div className="fodmap-list">
              {items.map(ing => <SuspectRow key={ing.name} ingredient={ing} />)}
            </div>
          </section>
        );
      })}

      <button className="how-it-works-link" onClick={() => setShowHow(true)}>
        <HelpCircle size={14} /> Comment ça marche ?
      </button>

      {showHow && <HowItWorksModal onClose={() => setShowHow(false)} />}
    </div>
  );
}

function SuspectRow({ ingredient }) {
  const maxCov = ingredientMaxCoverage(ingredient);
  const sev = severityForCoverage(maxCov);
  const emoji = CAT_EMOJI[ingredient.categorie] || "🔹";
  const cap = ingredient.name.charAt(0).toUpperCase() + ingredient.name.slice(1);

  return (
    <div className="suspect-row">
      <span className="suspect-icon">{emoji}</span>
      <span className="suspect-name">{cap}</span>
      <span className={`chip ${sev.className}`}>{sev.label}</span>
    </div>
  );
}

function EmptyState({ emoji, title, subtitle }) {
  return (
    <div className="analysis-screen">
      <h1 className="headline-lg">Analyse digestive</h1>
      <div className="analysis-empty">
        <div className="analysis-empty-emoji">{emoji}</div>
        <p className="headline-md" style={{ color: "var(--color-on-surface-variant)" }}>{title}</p>
        <p className="body-md text-muted" style={{ marginTop: 8, maxWidth: 320 }}>{subtitle}</p>
      </div>
    </div>
  );
}
