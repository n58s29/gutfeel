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

function HowItWorksModal({ onClose }) {
  const steps = [
    {
      emoji: "🕐",
      title: "On remonte 24h en arrière",
      body: "Après chaque symptôme enregistré, l'appli regarde tous les repas que tu as pris dans les 24 heures qui précèdent. Ces ingrédients deviennent des « suspects potentiels ».",
    },
    {
      emoji: "🔁",
      title: "On cherche les récurrences",
      body: "Un aliment qui revient régulièrement avant tes crises est plus suspect qu'un aliment mangé une seule fois. Plus il apparaît souvent, plus son score monte.",
    },
    {
      emoji: "📊",
      title: "Un score d'impact est calculé",
      body: "Le score combine deux choses : la couverture (dans combien de symptômes cet ingrédient était présent ?) et la sévérité moyenne des symptômes associés. Un ingrédient rare mais toujours lié à une crise forte monte haut.",
    },
    {
      emoji: "🏷️",
      title: "Les badges de suspicion",
      body: null,
      badges: [
        { label: "Très suspect", color: "#E63946", pct: "70%+ des symptômes" },
        { label: "Suspect",      color: "#E07A5F", pct: "40–70 %" },
        { label: "À surveiller", color: "#D4A017", pct: "20–40 %" },
        { label: "Faible",       color: "#8D99AE", pct: "moins de 20 %" },
      ],
    },
    {
      emoji: "🌿",
      title: "La vue FODMAP",
      body: "Les FODMAP sont des sucres fermentescibles (lactose, fructose, gluten…) que certaines personnes digèrent mal. L'onglet FODMAP regroupe tes suspects par famille biochimique pour voir si un groupe revient souvent.",
    },
    {
      emoji: "📈",
      title: "La chronologie (lag)",
      body: "En cliquant sur un ingrédient puis « Voir la chronologie », tu vois un graphique du délai entre le repas et le symptôme. Si les points se regroupent autour de 4–8h, c'est un signal fort.",
    },
    {
      emoji: "⚠️",
      title: "Ce que ce n'est PAS",
      body: "Ce n'est pas un diagnostic médical. Un ingrédient « très suspect » peut être une coïncidence. Plus tu as d'entrées (symptômes + repas), plus les résultats sont fiables. En dessous de 5 repas et 3 symptômes, les données ne sont pas suffisantes.",
      warn: true,
    },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480, maxHeight: "88vh",
          background: "#fff", borderRadius: "24px 24px 0 0",
          display: "flex", flexDirection: "column",
          boxShadow: "0 -4px 30px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 18, fontWeight: 800, fontFamily: "Sora", color: "#2D2D2D", margin: 0 }}>
              💡 Comment ça marche ?
            </p>
            <p style={{ fontSize: 12, color: "#8D99AE", margin: "2px 0 0" }}>
              Comprendre l'analyse Suspects
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "none", background: "#F4F4F4",
              fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", padding: "16px 20px 32px", flex: 1 }}>
          {steps.map((step, i) => (
            <div
              key={i}
              style={{
                marginBottom: 16,
                padding: "14px 16px",
                borderRadius: 16,
                background: step.warn ? "#FFF8E1" : "#FAFAF8",
                border: `1px solid ${step.warn ? "#FFE082" : "#F0E6D8"}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: step.body || step.badges ? 8 : 0 }}>
                <span style={{ fontSize: 22 }}>{step.emoji}</span>
                <p style={{ fontWeight: 700, fontSize: 13, fontFamily: "Sora", color: step.warn ? "#B8860B" : "#2D2D2D", margin: 0 }}>
                  {step.title}
                </p>
              </div>
              {step.body && (
                <p style={{ fontSize: 12, color: step.warn ? "#8D6E2A" : "#5C5470", lineHeight: 1.6, margin: 0 }}>
                  {step.body}
                </p>
              )}
              {step.badges && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {step.badges.map(b => (
                    <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99,
                        background: b.color, color: "#fff", flexShrink: 0, minWidth: 80, textAlign: "center",
                      }}>
                        {b.label}
                      </span>
                      <span style={{ fontSize: 12, color: "#5C5470" }}>{b.pct}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Footer tip */}
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <p style={{ fontSize: 11, color: "#B0B8C8", lineHeight: 1.5 }}>
              Chaque donnée que tu saisis rend l'analyse plus précise.<br />
              L'idéal : noter repas <strong>et</strong> symptômes pendant au moins 2 semaines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisDashboard({ entries }) {
  const [activeView, setActiveView] = useState("ranking");
  const [filterSymptom, setFilterSymptom] = useState(null);
  const [scatterIngredient, setScatterIngredient] = useState(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const symptomEntries = entries.filter(e => e.type === "pain");
  const mealEntries = entries.filter(e => e.type === "meal" && e.ingredients?.length > 0);

  return (
    <>
      {showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}
    <CorrelationEngine entries={entries} filterSymptom={filterSymptom}>
      {(data) => (
        <>
          {/* ── How it works button ── */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <button
              onClick={() => setShowHowItWorks(true)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                border: "1.5px solid #F0E6D8", background: "#fff",
                color: "#8D99AE", cursor: "pointer", fontFamily: "Nunito",
              }}
            >
              💡 Comment ça marche ?
            </button>
          </div>

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
    </>
  );
}
