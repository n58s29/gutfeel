import { BRISTOL_SCALE } from "../../lib/bristolScale.js";

export default function BristolScale({ value, onChange }) {
  return (
    <div className="bristol-list">
      {BRISTOL_SCALE.map(b => {
        const isActive = value === b.type;
        return (
          <button
            key={b.type}
            onClick={() => onChange(isActive ? null : b.type)}
            className={`bristol-row ${isActive ? "active" : ""}`}
            style={isActive ? { borderColor: b.color } : undefined}
          >
            <span
              className="bristol-row-badge"
              style={{ background: isActive ? b.color : "var(--color-surface-container)", color: isActive ? "#fff" : "var(--color-on-surface-variant)" }}
            >
              {b.type}
            </span>
            <div className="bristol-row-text">
              <div
                className="bristol-row-title"
                style={isActive ? { color: b.color } : undefined}
              >
                {b.description}
              </div>
              <div className="bristol-row-hint">{b.hint}</div>
            </div>
            <div className="bristol-row-dots">
              {Array.from({ length: b.type }).map((_, i) => (
                <span
                  key={i}
                  className="bristol-row-dot"
                  style={{ background: isActive ? b.color : "var(--color-outline-variant)" }}
                />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
