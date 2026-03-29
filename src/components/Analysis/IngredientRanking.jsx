import { useState } from "react";
import { SYMPTOM_TYPES } from "../../lib/symptomTypes.js";
import { getFodmapCategories, FODMAP_CATEGORIES } from "../../lib/fodmapDictionary.js";

const CAT_EMOJI = { laitier:"🥛", cereale:"🌾", viande:"🥩", poisson:"🐟", legume:"🥬", fruit:"🍎", noix:"🥜", epice:"🧂", additif:"🧪", legumineuse:"🫘", oeuf:"🥚", sucre:"🍯", graisse:"🫒", autre:"📦" };

function ImpactBar({ score, maxScore }) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const color = pct >= 70 ? "#E63946" : pct >= 40 ? "#E07A5F" : "#FFB74D";
  return (
    <div style={{ width: "100%", height: 5, borderRadius: 3, background: "#F0E6D8", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: color, transition: "width 0.5s ease-out" }} />
    </div>
  );
}

function SuspicionBadge({ pct }) {
  const { label, color } =
    pct >= 70 ? { label: "Très suspect", color: "#E63946" } :
    pct >= 40 ? { label: "Suspect",       color: "#E07A5F" } :
    pct >= 20 ? { label: "À surveiller",  color: "#D4A017" } :
               { label: "Faible",         color: "#8D99AE" };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 99, background: color, color: "#fff", flexShrink: 0 }}>
      {label}
    </span>
  );
}

export default function IngredientRanking({ data, onSelectIngredient }) {
  const [expanded, setExpanded] = useState(null);

  if (!data?.ingredients?.length) return null;

  const maxScore = data.ingredients[0]?.totalImpact ?? 1;

  return (
    <div>
      {data.ingredients.map((ing, i) => {
        const isOpen = expanded === ing.name;
        const pct = maxScore > 0 ? Math.round((ing.totalImpact / maxScore) * 100) : 0;
        const fodmapCats = getFodmapCategories(ing.name);
        const topFodmap = fodmapCats?.[0];
        const fodmapMeta = topFodmap ? FODMAP_CATEGORIES[topFodmap] : null;
        const topSymptomInfo = SYMPTOM_TYPES.find(s => s.key === ing.topSymptom);

        return (
          <div
            key={ing.name}
            style={{
              borderRadius: 14,
              border: "1px solid #F0E6D8",
              marginBottom: 8,
              background: "#fff",
              overflow: "hidden",
              animationDelay: `${i * 0.04}s`,
            }}
            className="gf-card"
          >
            {/* Main row */}
            <div
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", cursor: "pointer" }}
              onClick={() => setExpanded(isOpen ? null : ing.name)}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{CAT_EMOJI[ing.categorie] || "📦"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ing.name}
                  </span>
                  {topFodmap && topFodmap !== "none" && (
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 99, background: fodmapMeta.bg, border: `1px solid ${fodmapMeta.border}`, color: fodmapMeta.color, flexShrink: 0 }}>
                      {fodmapMeta.label}
                    </span>
                  )}
                </div>
                <ImpactBar score={ing.totalImpact} maxScore={maxScore} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: "#8D99AE" }}>
                    {topSymptomInfo?.emoji} {topSymptomInfo?.label}
                  </span>
                  <span style={{ fontSize: 10, color: "#8D99AE" }}>
                    {ing.totalMeals}× consommé
                  </span>
                </div>
              </div>
              <SuspicionBadge pct={pct} />
            </div>

            {/* Expanded: per-symptom breakdown */}
            {isOpen && (
              <div style={{ borderTop: "1px solid #F0E6D8", padding: "12px 14px", background: "#FFFBF5" }}>
                {Object.entries(ing.symptomScores)
                  .sort((a, b) => b[1].score - a[1].score)
                  .map(([sk, s]) => {
                    const sym = SYMPTOM_TYPES.find(st => st.key === sk);
                    return (
                      <div key={sk} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{sym?.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 11, fontWeight: 600 }}>{sym?.label}</span>
                            <span style={{ fontSize: 11, color: "#8D99AE" }}>
                              {s.count} fois · sév. moy. {s.avgSeverity.toFixed(1)} · lag {s.avgTimeLag.toFixed(0)}h
                            </span>
                          </div>
                          <div style={{ height: 4, borderRadius: 2, background: "#F0E6D8", overflow: "hidden" }}>
                            <div style={{ width: `${Math.round(s.coverage * 100)}%`, height: "100%", background: "#E07A5F", borderRadius: 2 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
                {onSelectIngredient && (
                  <button
                    onClick={() => onSelectIngredient(ing.name)}
                    style={{ marginTop: 4, width: "100%", padding: "8px 0", fontSize: 12, fontWeight: 600, borderRadius: 10, border: "1.5px solid #F0E6D8", background: "#fff", color: "#E07A5F", cursor: "pointer", fontFamily: "Nunito, sans-serif" }}
                  >
                    📈 Voir la chronologie
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
