import { useState } from "react";
import { SYMPTOM_TYPES } from "../../lib/symptomTypes.js";
import CorrelationEngine from "./CorrelationEngine.jsx";
import IngredientRanking from "./IngredientRanking.jsx";
import FodmapGroupView from "./FodmapGroupView.jsx";
import TimeLagScatter from "./TimeLagScatter.jsx";

const VIEWS = [
  { id: "ranking", label: "Classement" },
  { id: "fodmap",  label: "FODMAP" },
];

export default function AnalysisDashboard({ entries }) {
  const [activeView, setActiveView] = useState("ranking");
  const [filterSymptom, setFilterSymptom] = useState(null);
  const [scatterIngredient, setScatterIngredient] = useState(null);

  const symptomEntries = entries.filter(e => e.type === "pain");
  const mealEntries = entries.filter(e => e.type === "meal" && e.ingredients?.length > 0);

  return (
    <CorrelationEngine entries={entries} filterSymptom={filterSymptom}>
      {(data) => (
        <>
          {/* ── Summary cards ── */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1, padding: "10px 12px", borderRadius: 12, background: "#FFF0F0", textAlign: "center" }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#E63946", fontFamily: "Sora" }}>{data.symptomCount}</p>
              <p style={{ fontSize: 11, color: "#C4363A", fontWeight: 600 }}>Symptômes</p>
            </div>
            <div style={{ flex: 1, padding: "10px 12px", borderRadius: 12, background: "#F0F8F4", textAlign: "center" }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#81B29A", fontFamily: "Sora" }}>{data.mealCount}</p>
              <p style={{ fontSize: 11, color: "#5A8F7B", fontWeight: 600 }}>Repas</p>
            </div>
            <div style={{ flex: 1, padding: "10px 12px", borderRadius: 12, background: "#FFF5EE", textAlign: "center" }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#E07A5F", fontFamily: "Sora" }}>{data.ingredients.length}</p>
              <p style={{ fontSize: 11, color: "#C4623F", fontWeight: 600 }}>Suspects</p>
            </div>
          </div>

          {/* ── Not enough data ── */}
          {(data.symptomCount < 3 || data.mealCount < 5) && (
            <div style={{ textAlign: "center", padding: "32px 20px", borderRadius: 16, background: "#FFF8E1", border: "1px solid #FFE082", marginBottom: 14 }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>📊</p>
              <p style={{ fontWeight: 700, fontSize: 14, color: "#E07A5F", fontFamily: "Sora", marginBottom: 6 }}>Continue, on y est presque !</p>
              <p style={{ fontSize: 12, color: "#8D99AE", lineHeight: 1.5 }}>
                Il faut au moins <strong>3 symptômes</strong> et <strong>5 repas</strong> pour des corrélations fiables.
                Tu en es à {data.symptomCount} symptôme(s) et {data.mealCount} repas.
              </p>
            </div>
          )}

          {/* ── Symptom filter ── */}
          {data.symptomCount >= 3 && (
            <>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                <button
                  onClick={() => setFilterSymptom(null)}
                  style={{
                    padding: "5px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                    border: filterSymptom === null ? "2px solid #E07A5F" : "1.5px solid #F0E6D8",
                    background: filterSymptom === null ? "#FFF5EE" : "#fff",
                    color: filterSymptom === null ? "#E07A5F" : "#8D99AE",
                    cursor: "pointer", fontFamily: "Nunito",
                  }}
                >
                  Tous
                </button>
                {SYMPTOM_TYPES
                  .filter(s => (data.symptomBreakdown?.[s.key] ?? 0) > 0)
                  .map(s => (
                    <button
                      key={s.key}
                      onClick={() => setFilterSymptom(filterSymptom === s.key ? null : s.key)}
                      style={{
                        padding: "5px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                        border: filterSymptom === s.key ? "2px solid #E07A5F" : "1.5px solid #F0E6D8",
                        background: filterSymptom === s.key ? "#FFF5EE" : "#fff",
                        color: filterSymptom === s.key ? "#E07A5F" : "#5C5470",
                        cursor: "pointer", fontFamily: "Nunito",
                      }}
                    >
                      {s.emoji} {s.label}
                      <span style={{ marginLeft: 4, opacity: 0.6 }}>({data.symptomBreakdown[s.key]})</span>
                    </button>
                  ))}
              </div>

              {/* ── View tabs ── */}
              <div style={{ display: "flex", gap: 0, marginBottom: 14, borderRadius: 12, overflow: "hidden", border: "1.5px solid #F0E6D8", background: "#fff" }}>
                {VIEWS.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setActiveView(v.id)}
                    style={{
                      flex: 1, padding: "9px 0", fontSize: 12, fontWeight: activeView === v.id ? 700 : 500,
                      background: activeView === v.id ? "#E07A5F" : "#fff",
                      color: activeView === v.id ? "#fff" : "#8D99AE",
                      border: "none", cursor: "pointer", fontFamily: "Nunito", transition: "background 0.15s",
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {/* ── No suspects found ── */}
              {data.ingredients.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 20px" }}>
                  <p style={{ fontSize: 32, marginBottom: 8 }}>🤔</p>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "#8D99AE" }}>Aucun suspect identifié</p>
                  <p style={{ fontSize: 12, color: "#B0B8C8", marginTop: 4, lineHeight: 1.5 }}>
                    Aucun ingrédient ne revient avant tes symptômes.
                    Continue à noter, on finira par trouver.
                  </p>
                </div>
              )}

              {/* ── Ranking view ── */}
              {activeView === "ranking" && data.ingredients.length > 0 && (
                <>
                  <p style={{ fontSize: 11, color: "#8D99AE", marginBottom: 10, padding: "0 4px", lineHeight: 1.5 }}>
                    Ingrédients consommés dans les <strong>24h</strong> avant chaque symptôme.
                    Score = couverture × sévérité moyenne.
                  </p>
                  <IngredientRanking
                    data={data}
                    onSelectIngredient={name => setScatterIngredient(scatterIngredient === name ? null : name)}
                  />
                  {scatterIngredient && (
                    <div style={{ marginTop: 12, padding: 14, borderRadius: 14, background: "#fff", border: "1px solid #F0E6D8" }}>
                      <TimeLagScatter entries={entries} ingredientName={scatterIngredient} />
                    </div>
                  )}
                </>
              )}

              {/* ── FODMAP view ── */}
              {activeView === "fodmap" && data.ingredients.length > 0 && (
                <>
                  <p style={{ fontSize: 11, color: "#8D99AE", marginBottom: 10, padding: "0 4px", lineHeight: 1.5 }}>
                    Ingrédients suspects regroupés par catégorie FODMAP.
                  </p>
                  <FodmapGroupView data={data} />
                </>
              )}
            </>
          )}
        </>
      )}
    </CorrelationEngine>
  );
}
