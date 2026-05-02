import { X } from "lucide-react";

const STEPS = [
  {
    emoji: "🕐",
    title: "On remonte 24h en arrière",
    body: "Après chaque symptôme enregistré, l'appli regarde tous les repas pris dans les 24h qui précèdent. Ces ingrédients deviennent des suspects potentiels.",
  },
  {
    emoji: "🔁",
    title: "On cherche les récurrences",
    body: "Un aliment qui revient régulièrement avant tes symptômes est plus suspect qu'un aliment mangé une seule fois. Plus il apparaît souvent, plus son score monte.",
  },
  {
    emoji: "📊",
    title: "Un score d'impact est calculé",
    body: "Le score combine la couverture (dans combien de symptômes l'ingrédient était présent) et la sévérité moyenne. Un ingrédient rare mais toujours lié à une crise forte monte haut.",
  },
  {
    emoji: "🌿",
    title: "Regroupement FODMAP",
    body: "Les FODMAP sont des sucres fermentescibles (lactose, fructose, fructanes…) que certaines personnes digèrent mal. Les suspects sont regroupés par famille pour repérer un schéma.",
  },
  {
    emoji: "⚠️",
    title: "Ce n'est pas un diagnostic",
    body: "Les suspects sont des indicateurs statistiques, pas des verdicts médicaux. Plus tu enregistres de données, plus les corrélations deviennent fiables.",
    warn: true,
  },
];

const BADGES = [
  { label: "Très suspect", className: "chip-severity-high",   pct: "≥ 70 % des symptômes" },
  { label: "Suspect",      className: "chip-severity-medium", pct: "40 – 70 %" },
  { label: "À surveiller", className: "chip-severity-low",    pct: "20 – 40 %" },
  { label: "Faible",       className: "chip-severity-safe",   pct: "< 20 %" },
];

export default function HowItWorksModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: "88vh" }}>
        <div className="modal-handle" />
        <div className="how-modal-header">
          <h2 className="headline-md">Comment ça marche ?</h2>
          <button className="app-icon-btn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        <div className="how-modal-content">
          {STEPS.map((step, i) => (
            <div key={i} className={`how-step ${step.warn ? "how-step-warn" : ""}`}>
              <div className="how-step-emoji">{step.emoji}</div>
              <div className="how-step-text">
                <div className="how-step-title">{step.title}</div>
                <div className="how-step-body">{step.body}</div>
              </div>
            </div>
          ))}

          <div className="how-step">
            <div className="how-step-emoji">🏷️</div>
            <div className="how-step-text">
              <div className="how-step-title">Les badges de suspicion</div>
              <div className="how-badges">
                {BADGES.map(b => (
                  <div key={b.label} className="how-badge-row">
                    <span className={`chip ${b.className}`}>{b.label}</span>
                    <span className="body-md text-muted">{b.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
