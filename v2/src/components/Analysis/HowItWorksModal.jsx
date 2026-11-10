import { X } from "lucide-react";

const STEPS = [
  {
    emoji: "🕐",
    title: "On relie repas et symptômes",
    body: "Pour chaque repas, l'appli regarde si un symptôme a suivi dans les 24 h. Un symptôme 30 min à 8 h après compte pleinement, au-delà il compte de moins en moins. Plusieurs saisies à moins de 2 h d'écart forment un seul épisode.",
  },
  {
    emoji: "⚖️",
    title: "On compare avec et sans",
    body: "Pour chaque ingrédient, on compare la fréquence des symptômes après les repas qui le contiennent et après ceux qui ne le contiennent pas. Le sel ou l'huile, présents partout, ne ressortent donc plus à tort.",
  },
  {
    emoji: "📊",
    title: "Un risque relatif",
    body: "« × 2,0 » veut dire : deux fois plus de symptômes après les repas avec cet ingrédient. Les crises fortes pèsent un peu plus. Pour qu'un ingrédient apparaisse, il faut au moins 3 repas avec lui, 2 épisodes, et un écart nettement plus grand que ce que le hasard produirait.",
  },
  {
    emoji: "🌿",
    title: "Regroupement FODMAP",
    body: "Les FODMAP sont des sucres fermentescibles (lactose, fructose, fructanes…) que certaines personnes digèrent mal. Les suspects sont regroupés par famille pour repérer un schéma.",
  },
  {
    emoji: "⚠️",
    title: "Ce n'est pas un diagnostic",
    body: "Les suspects sont des indicateurs statistiques, pas des verdicts médicaux. Deux aliments souvent mangés ensemble peuvent ressortir tous les deux. Parles-en à un médecin ou un diététicien avant d'exclure un aliment.",
    warn: true,
  },
];

const BADGES = [
  { label: "Très suspect", className: "chip-severity-high",   pct: "≥ × 2 et au moins 3 épisodes" },
  { label: "Suspect",      className: "chip-severity-medium", pct: "≥ × 1,5" },
  { label: "À surveiller", className: "chip-severity-low",    pct: "≥ × 1,2" },
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
