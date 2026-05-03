import { useState } from "react";

const ZONES = [
  { id: "upper_left",  label: "Haut gauche", hint: "Estomac, rate, pancréas",      cx: 90,  cy: 60  },
  { id: "upper_right", label: "Haut droit",  hint: "Foie, vésicule",                cx: 160, cy: 60  },
  { id: "lower_left",  label: "Bas gauche",  hint: "Côlon descendant, sigmoïde",     cx: 90,  cy: 130 },
  { id: "lower_right", label: "Bas droit",   hint: "Appendice, iléon terminal",      cx: 160, cy: 130 },
];

export default function AbdomenMap({ selected, onChange }) {
  const [hovered, setHovered] = useState(null);
  const active = Array.isArray(selected) ? selected : selected ? [selected] : [];

  function toggle(id) {
    if (id === "diffuse") {
      onChange(active.includes("diffuse") ? [] : ["diffuse"]);
    } else {
      const noDiff = active.filter(z => z !== "diffuse");
      onChange(noDiff.includes(id) ? noDiff.filter(z => z !== id) : [...noDiff, id]);
    }
  }

  const isDiffuse = active.includes("diffuse");
  const activeZones = ZONES.filter(z => active.includes(z.id));

  return (
    <div className="abdomen-map">
      <svg
        viewBox="50 20 160 150"
        style={{ width: "100%", maxWidth: 240, display: "block", margin: "0 auto", cursor: "pointer" }}
        role="img"
        aria-label="Carte abdominale"
      >
        <ellipse cx="125" cy="95" rx="72" ry="72"
          fill="var(--color-surface-container-low)"
          stroke="var(--color-outline-variant)" strokeWidth="1.5" />

        {ZONES.map(z => {
          const isActive = active.includes(z.id);
          const isHov = hovered === z.id;
          return (
            <rect
              key={z.id}
              x={z.id.includes("left") ? 62 : 127}
              y={z.id.includes("upper") ? 32 : 97}
              width={60} height={60} rx={10}
              fill={isActive ? "var(--color-primary)" : isHov ? "var(--color-primary-container)" : "var(--color-surface-container)"}
              stroke={isActive ? "var(--color-primary)" : "var(--color-outline-variant)"}
              strokeWidth={isActive ? 2 : 1}
              onClick={() => toggle(z.id)}
              onMouseEnter={() => setHovered(z.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ transition: "fill 0.15s" }}
            />
          );
        })}

        <line x1="125" y1="32" x2="125" y2="157" stroke="var(--color-outline-variant)" strokeWidth="1" />
        <line x1="62" y1="95" x2="188" y2="95" stroke="var(--color-outline-variant)" strokeWidth="1" />

        {ZONES.map(z => (
          <text
            key={z.id + "_l"} x={z.cx} y={z.cy}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fontWeight="600"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fill={active.includes(z.id) ? "#fff" : "var(--color-on-surface-variant)"}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {z.id.includes("upper") ? "↑" : "↓"} {z.id.includes("left") ? "G" : "D"}
          </text>
        ))}
      </svg>

      <button
        onClick={() => toggle("diffuse")}
        className={`abdomen-diffuse-btn ${isDiffuse ? "active" : ""}`}
      >
        🌐 Diffus / partout
      </button>

      {(activeZones.length > 0 || isDiffuse) && (
        <p className="abdomen-hint">
          {isDiffuse
            ? "Diffus / partout — douleur généralisée"
            : activeZones.map(z => `${z.label} (${z.hint})`).join(" · ")}
        </p>
      )}
    </div>
  );
}
