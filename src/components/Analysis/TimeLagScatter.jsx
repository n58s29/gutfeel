import { useMemo } from "react";
import { getTimeLagData } from "../../lib/correlation.js";
import { SYMPTOM_TYPES } from "../../lib/symptomTypes.js";

const W = 280;
const H = 160;
const PAD = { top: 12, right: 12, bottom: 30, left: 36 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;
const MAX_LAG = 24;
const MAX_SEV = 10;

const SYMPTOM_COLORS = {
  abdominal_pain: "#E63946",
  gas:            "#E07A5F",
  bloating:       "#D4A017",
  nausea:         "#81B29A",
  fatigue:        "#8D99AE",
  heartburn:      "#FF8A65",
  diarrhea:       "#5C88C4",
  discomfort:     "#9575CD",
  belching:       "#4CAF82",
  headache:       "#F06292",
  constipation:   "#8D6E4C",
  psych_distress: "#607D8B",
};

function toX(lag) {
  return PAD.left + Math.min(lag / MAX_LAG, 1) * INNER_W;
}
function toY(severity) {
  return PAD.top + (1 - severity / MAX_SEV) * INNER_H;
}

export default function TimeLagScatter({ entries, ingredientName }) {
  const points = useMemo(
    () => (entries && ingredientName ? getTimeLagData(entries, ingredientName) : []),
    [entries, ingredientName]
  );

  if (!ingredientName) return null;

  // Y-axis tick labels
  const yTicks = [2.5, 5, 7.5, 10];
  // X-axis tick labels
  const xTicks = [0, 6, 12, 18, 24];

  // Identify unique symptom keys in data
  const symptomKeys = [...new Set(points.map(p => p.symptomKey))];

  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#5C5470", marginBottom: 8 }}>
        Chronologie — <em>{ingredientName}</em>
      </p>
      {points.length === 0 ? (
        <p style={{ fontSize: 12, color: "#8D99AE", fontStyle: "italic" }}>
          Pas assez de données pour cet ingrédient.
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", maxWidth: W, display: "block", background: "#FFFBF5", borderRadius: 12, border: "1px solid #F0E6D8" }}
          >
            {/* Grid lines */}
            {yTicks.map(t => (
              <line
                key={t}
                x1={PAD.left}
                x2={W - PAD.right}
                y1={toY(t)}
                y2={toY(t)}
                stroke="#F0E6D8"
                strokeWidth={1}
              />
            ))}
            {xTicks.map(t => (
              <line
                key={t}
                x1={toX(t)}
                x2={toX(t)}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="#F0E6D8"
                strokeWidth={1}
              />
            ))}

            {/* Axes */}
            <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={H - PAD.bottom} stroke="#D8D0C8" strokeWidth={1.5} />
            <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="#D8D0C8" strokeWidth={1.5} />

            {/* Y-axis labels */}
            {yTicks.map(t => (
              <text key={t} x={PAD.left - 4} y={toY(t)} textAnchor="end" dominantBaseline="middle" fontSize={8} fill="#B0A090" fontFamily="Nunito">
                {t}
              </text>
            ))}

            {/* X-axis labels */}
            {xTicks.map(t => (
              <text key={t} x={toX(t)} y={H - PAD.bottom + 10} textAnchor="middle" fontSize={8} fill="#B0A090" fontFamily="Nunito">
                {t}h
              </text>
            ))}

            {/* Axis titles */}
            <text x={PAD.left + INNER_W / 2} y={H - 2} textAnchor="middle" fontSize={8} fill="#8D99AE" fontFamily="Nunito">
              Délai après repas (heures)
            </text>
            <text
              x={8}
              y={PAD.top + INNER_H / 2}
              textAnchor="middle"
              fontSize={8}
              fill="#8D99AE"
              fontFamily="Nunito"
              transform={`rotate(-90, 8, ${PAD.top + INNER_H / 2})`}
            >
              Sévérité
            </text>

            {/* Data points */}
            {points.map((p, i) => {
              const color = SYMPTOM_COLORS[p.symptomKey] || "#E07A5F";
              return (
                <circle
                  key={i}
                  cx={toX(p.timeLag)}
                  cy={toY(p.severity)}
                  r={5}
                  fill={color}
                  fillOpacity={0.75}
                  stroke="#fff"
                  strokeWidth={1}
                />
              );
            })}
          </svg>

          {/* Legend */}
          {symptomKeys.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {symptomKeys.map(sk => {
                const sym = SYMPTOM_TYPES.find(s => s.key === sk);
                return (
                  <span key={sk} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#5C5470" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: SYMPTOM_COLORS[sk] || "#E07A5F", display: "inline-block" }} />
                    {sym?.emoji} {sym?.label}
                  </span>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
