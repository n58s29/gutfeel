import { useState } from "react";

const ZONES = [
  {
    id: "upper_left",
    label: "Haut gauche",
    hint: "Estomac, rate, pancréas",
    d: "M 60 30 L 120 30 L 120 90 L 60 90 Z",
    cx: 90, cy: 60,
  },
  {
    id: "upper_right",
    label: "Haut droit",
    hint: "Foie, vésicule",
    d: "M 130 30 L 190 30 L 190 90 L 130 90 Z",
    cx: 160, cy: 60,
  },
  {
    id: "lower_left",
    label: "Bas gauche",
    hint: "Côlon descendant, sigmoïde",
    d: "M 60 100 L 120 100 L 120 160 L 60 160 Z",
    cx: 90, cy: 130,
  },
  {
    id: "lower_right",
    label: "Bas droit",
    hint: "Appendice, iléon terminal",
    d: "M 130 100 L 190 100 L 190 160 L 130 160 Z",
    cx: 160, cy: 130,
  },
  {
    id: "diffuse",
    label: "Diffus / partout",
    hint: "Douleur généralisée",
    d: null,
    cx: 125, cy: 95,
  },
];

export default function AbdomenMap({ selected, onChange }) {
  const [hovered, setHovered] = useState(null);
  const active = selected || null;

  function toggle(id) {
    onChange(active === id ? null : id);
  }

  const activeZone = ZONES.find(z => z.id === active);

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

        {/* Grid zones (upper/lower left/right) */}
        {ZONES.filter(z => z.id !== "diffuse").map(z => {
          const isActive = active === z.id;
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
        {ZONES.filter(z => z.id !== "diffuse").map(z => (
          <text
            key={z.id + "_label"}
            x={z.cx}
            y={z.cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="8"
            fill={active === z.id ? "#fff" : "#8D6E4C"}
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
          border: active === "diffuse" ? "2px solid #E07A5F" : "1.5px solid #F0E6D8",
          background: active === "diffuse" ? "#FFF5EE" : "#fff",
          color: active === "diffuse" ? "#E07A5F" : "#5C5470",
          fontFamily: "Nunito, sans-serif",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        🌐 Diffus / partout
      </button>

      {/* Active zone hint */}
      {activeZone && (
        <p style={{ textAlign: "center", fontSize: 11, color: "#8D99AE", marginTop: 6 }}>
          {activeZone.label} — {activeZone.hint}
        </p>
      )}
    </div>
  );
}
