import { useState, useMemo } from "react";
import { Sparkles, Info, HelpCircle } from "lucide-react";
import { analyzeCorrelations, LOOKBACK_HOURS, LEVELS } from "../../lib/correlation.js";
import { CAT_EMOJI } from "../../lib/categories.js";
import { getFodmapCategories } from "../../lib/fodmapDictionary.js";
import { getSymptom } from "../../lib/symptomTypes.js";
import HowItWorksModal from "./HowItWorksModal.jsx";

// FODMAP families regrouped at a higher level for display.
// Each suspect ingredient appears under the first display group whose
// `fodmaps` overlap its dictionary mapping. Low-FODMAP and unknown
// ingredients share the last group: they can still be real triggers
// (gluten, histamine, graisses…), just outside the FODMAP families.
const FODMAP_DISPLAY_GROUPS = [
  { key: "oligo",    label: "Oligosaccharides",  chip: "GOS & Fructanes", fodmaps: ["fructans", "gos"] },
  { key: "di",       label: "Disaccharides",     chip: "Lactose",         fodmaps: ["lactose"] },
  { key: "mono",     label: "Monosaccharides",   chip: "Fructose",        fodmaps: ["fructose"] },
  { key: "polyols",  label: "Polyols",           chip: "Sorbitol & co.",  fodmaps: ["polyols"] },
  { key: "other",    label: "Hors FODMAP",       chip: "Autres pistes",   fodmaps: [] }, // catch-all
];

function fodmapGroupForIngredient(name) {
  const cats = getFodmapCategories(name);
  if (!cats || cats.length === 0) return "other";
  for (const group of FODMAP_DISPLAY_GROUPS) {
    if (group.fodmaps.some(f => cats.includes(f))) return group.key;
  }
  return "other";
}

function fmtRatio(x) {
  return x.toLocaleString("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

function fmtLag(h) {
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${Math.round(h)} h`;
}

export default function AnalysisScreen({ entries, currentAnalysis }) {
  const [showHow, setShowHow] = useState(false);

  // Only entries from the current analysis period feed the correlation engine.
  // Pre-existing data stays visible in the Journal but is excluded here so a
  // new investigation isn't polluted by an older one (cf. v4 migration).
  const scopedEntries = useMemo(() => {
    if (!currentAnalysis?.startDate) return entries;
    const start = new Date(currentAnalysis.startDate).getTime();
    return entries.filter(e => new Date(e.timestamp).getTime() >= start);
  }, [entries, currentAnalysis]);

  const data = useMemo(() => analyzeCorrelations(scopedEntries), [scopedEntries]);

  const banner = currentAnalysis ? <AnalysisBanner analysis={currentAnalysis} /> : null;

  if (scopedEntries.length === 0) {
    return <EmptyState
      banner={banner}
      emoji="🌱"
      title="Aucune donnée"
      subtitle="Commence par enregistrer un repas et un symptôme. L'analyse arrivera quand tu auras assez de données." />;
  }

  if (data.symptomCount < 3 || data.mealCount < 5) {
    return <EmptyState
      banner={banner}
      emoji="📊"
      title="Continue, on y est presque"
      subtitle={`Il faut au moins 3 épisodes de symptômes et 5 repas pour des corrélations fiables. Tu en es à ${data.symptomCount} épisode${data.symptomCount>1?"s":""} et ${data.mealCount} repas.`} />;
  }

  if (data.ingredients.length === 0) {
    return <EmptyState
      banner={banner}
      emoji="🤔"
      title="Aucun suspect identifié"
      subtitle={data.insufficientCount > 0
        ? `Aucun ingrédient n'est nettement plus souvent suivi de symptômes que les autres. ${data.insufficientCount} ingrédient${data.insufficientCount > 1 ? "s ont" : " a"} été mangé${data.insufficientCount > 1 ? "s" : ""} trop rarement pour conclure : continue à noter.`
        : "Aucun ingrédient n'est nettement plus souvent suivi de symptômes que les autres. Continue à noter, on finira par trouver."} />;
  }

  // ── We have suspects. Compute summary + group by FODMAP ──
  const correlationRate = data.explainedRate;
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
        Ingrédients plus souvent suivis de symptômes (dans les {LOOKBACK_HOURS} h) que les autres. {data.symptomCount} épisode{data.symptomCount > 1 ? "s" : ""}, {data.mealCount} repas.
      </p>

      {banner}

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
          {correlationPct}% de tes épisodes ont été précédés d'au moins un des suspects ci-dessous.
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
  const level = LEVELS[ingredient.level] || LEVELS.low;
  const emoji = CAT_EMOJI[ingredient.categorie] || "🔹";
  const cap = ingredient.name.charAt(0).toUpperCase() + ingredient.name.slice(1);
  const symptom = getSymptom(ingredient.topSymptom);
  const detail = [
    `× ${fmtRatio(ingredient.relativeRisk)} de risque`,
    `${ingredient.episodeCount} épisode${ingredient.episodeCount > 1 ? "s" : ""} sur ${ingredient.totalMeals} repas`,
    `~${fmtLag(ingredient.avgTimeLag)} après`,
    symptom ? `${symptom.emoji} ${symptom.label.toLowerCase()}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="suspect-row">
      <span className="suspect-icon">{emoji}</span>
      <div className="suspect-text">
        <span className="suspect-name">{cap}</span>
        <span className="suspect-detail">{detail}</span>
      </div>
      <span className={`chip ${level.className}`}>{level.label}</span>
    </div>
  );
}

function AnalysisBanner({ analysis }) {
  const start = new Date(analysis.startDate);
  const formatted = start.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="analysis-banner">
      <span className="analysis-banner-label">Analyse en cours</span>
      <span className="analysis-banner-title">« {analysis.label} »</span>
      <span className="analysis-banner-meta">depuis le {formatted}</span>
    </div>
  );
}

function EmptyState({ banner, emoji, title, subtitle }) {
  return (
    <div className="analysis-screen">
      <h1 className="headline-lg">Analyse digestive</h1>
      {banner}
      <div className="analysis-empty">
        <div className="analysis-empty-emoji">{emoji}</div>
        <p className="headline-md" style={{ color: "var(--color-on-surface-variant)" }}>{title}</p>
        <p className="body-md text-muted" style={{ marginTop: 8, maxWidth: 320 }}>{subtitle}</p>
      </div>
    </div>
  );
}
