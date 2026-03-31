import { useState } from "react";

const ZONES = [
  { id: "upper_left",  label: "Haut gauche", hint: "Estomac, rate, pancréas",         cx: 90,  cy: 60  },
  { id: "upper_right", label: "Haut droit",  hint: "Foie, vésicule",                   cx: 160, cy: 60  },
  { id: "lower_left",  label: "Bas gauche",  hint: "Côlon descendant, sigmoïde",        cx: 90,  cy: 130 },
  { id: "lower_right", label: "Bas droit",   hint: "Appendice, iléon terminal",         cx: 160, cy: 130 },
];

export default function AbdomenMap({ selected, onChange }) {
  const [hovered, setHovered] = useState(null);

  // Normalise : accepte string (ancien format) ou array
  const active = Array.isArray(selected)
    ? selected
    : selected ? [selected] : [];

  function toggle(id) {
    if (id === "diffuse") {
      // Diffus : exclusif — si déjà sélectionné on déselectionne, sinon on remplace tout
      const next = active.includes("diffuse") ? [] : ["diffuse"];
      onChange(next);
    } else {
      // Zone normale : bascule, retire "diffuse" si présent
      const withoutDiffuse = active.filter(z => z !== "diffuse");
      const next = withoutDiffuse.includes(id)
        ? withoutDiffuse.filter(z => z !== id)
        : [...withoutDiffuse, id];
      onChange(next);
    }
  }

  const activeZones = ZONES.filter(z => active.includes(z.id));
  const isDiffuse = active.includes("diffuse");

  return (
    <div>
      <svg
        viewBox="50 20 160 150"
        style={{ width: "100%", maxWidth: 260, display: "block", margin: "0 auto", cursor: "pointer" }}
        role="img"
        aria-label="Carte abdominale interactive"
      >
        {/* Body outline ellipse */}
        <ellipse cx="125" cy="95" rx="72" ry="72" fill="#FFF5EE" stroke="#F0E6D8" strokeWidth="1.5" />

        {/* Grid zones */}
        {ZONES.map(z => {
          const isActive = active.includes(z.id);
          const isHov = hovered === z.id;
          return (
            <rect
              key={z.id}
              x={z.id.includes("left") ? 62 : 127}
              y={z.id.includes("upper") ? 32 : 97}
              width={60}
              height={60}
              rx={8}
              fill={isActive ? "#E07A5F" : isHov ? "#FFD4C0" : "#FFEDE4"}
              stroke={isActive ? "#D4583B" : "#F0C8B0"}
              strokeWidth={isActive ? 2 : 1}
              opacity={0.85}
              onClick={() => toggle(z.id)}
              onMouseEnter={() => setHovered(z.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ transition: "fill 0.15s" }}
            />
          );
        })}

        {/* Dividing lines */}
        <line x1="125" y1="32" x2="125" y2="157" stroke="#F0C8B0" strokeWidth="1" />
        <line x1="62" y1="95" x2="188" y2="95" stroke="#F0C8B0" strokeWidth="1" />

        {/* Zone labels */}
        {ZONES.map(z => (
          <text
            key={z.id + "_label"}
            x={z.cx}
            y={z.cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="8"
            fill={active.includes(z.id) ? "#fff" : "#8D6E4C"}
            fontFamily="Nunito, sans-serif"
            fontWeight="600"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {z.id.includes("upper") ? "↑" : "↓"} {z.id.includes("left") ? "G" : "D"}
          </text>
        ))}
      </svg>

      {/* Diffuse button */}
      <button
        onClick={() => toggle("diffuse")}
        style={{
          display: "block",
          width: "100%",
          marginTop: 8,
          padding: "10px 0",
          borderRadius: 12,
          border: isDiffuse ? "2px solid #E07A5F" : "1.5px solid #F0E6D8",
          background: isDiffuse ? "#FFF5EE" : "#fff",
          color: isDiffuse ? "#E07A5F" : "#5C5470",
          fontFamily: "Nunito, sans-serif",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        🌐 Diffus / partout
      </button>

      {/* Active zones hint */}
      {(activeZones.length > 0 || isDiffuse) && (
        <p style={{ textAlign: "center", fontSize: 11, color: "#8D99AE", marginTop: 6, lineHeight: 1.5 }}>
          {isDiffuse
            ? "Diffus / partout — Douleur généralisée"
            : activeZones.map(z => `${z.label} (${z.hint})`).join(" · ")}
        </p>
      )}
    </div>
  );
}
