import { BRISTOL_SCALE } from "../../lib/bristolScale.js";

export default function BristolScale({ value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {BRISTOL_SCALE.map(b => {
        const isActive = value === b.type;
        return (
          <button
            key={b.type}
            onClick={() => onChange(isActive ? null : b.type)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 12,
              border: isActive ? `2px solid ${b.color}` : "1.5px solid #F0E6D8",
              background: isActive ? "#FFFBF5" : "#fff",
              cursor: "pointer",
              fontFamily: "Nunito, sans-serif",
              textAlign: "left",
            }}
          >
            {/* Type badge */}
            <span
              style={{
                minWidth: 32,
                height: 32,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isActive ? b.color : "#F0E6D8",
                color: isActive ? "#fff" : "#8D6E4C",
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {b.type}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: isActive ? b.color : "#2B2D42", marginBottom: 1 }}>
                {b.description}
              </p>
              <p style={{ fontSize: 11, color: "#8D99AE" }}>{b.hint}</p>
            </div>
            {/* Visual bar */}
            <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
              {Array.from({ length: b.type }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: isActive ? b.color : "#D8D0C8",
                  }}
                />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
