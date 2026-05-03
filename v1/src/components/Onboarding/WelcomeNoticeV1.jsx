import pkg from "../../../package.json";

const FEATURES = [
  {
    emoji: "🌿",
    title: "Nouvelle interface, même mission",
    body: "Couleurs apaisantes, typographie lisible, beaucoup d'air. Une expérience plus calme, pour des données déjà parfois éprouvantes à noter.",
  },
  {
    emoji: "💾",
    title: "Tes données sont là",
    body: "Tous tes repas, symptômes et ta clé API ont été repris automatiquement. Aucune migration manuelle nécessaire.",
  },
  {
    emoji: "🎯",
    title: "Toutes les fonctions, repensées",
    body: "Vocal, photo, code-barres, analyse FODMAP, export/import JSON et CSV — tout est conservé, juste plus agréable à utiliser.",
  },
];

export default function WelcomeNoticeV1({ onClose }) {
  return (
    <div className="modal-backdrop" style={{ zIndex: 200 }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: "92vh" }}>
        <div className="modal-handle" />

        <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>✨</div>
          <h2 className="headline-md">Bienvenue dans la v{pkg.version}</h2>
          <p className="body-md text-muted" style={{ marginTop: 4 }}>
            Mieux Demain a fait peau neuve.
          </p>
        </div>

        <div className="welcome-features">
          {FEATURES.map((f, i) => (
            <div key={i} className="welcome-feature">
              <div className="welcome-feature-emoji">{f.emoji}</div>
              <div className="welcome-feature-text">
                <div className="welcome-feature-title">{f.title}</div>
                <div className="welcome-feature-body">{f.body}</div>
              </div>
            </div>
          ))}
        </div>

        <p className="body-md text-muted" style={{ textAlign: "center", marginTop: 16, fontSize: 12 }}>
          Si quelque chose cloche, ton dernier export JSON reste rechargeable depuis ⚙️ Paramètres.
        </p>

        <button className="btn btn-primary btn-block" style={{ marginTop: 20 }} onClick={onClose}>
          Découvrir
        </button>
      </div>
    </div>
  );
}
