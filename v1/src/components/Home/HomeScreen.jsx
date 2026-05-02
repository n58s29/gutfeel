import { Mic, Camera, Tag, ScanBarcode, AlertCircle } from "lucide-react";
import { CAT_EMOJI } from "../../lib/categories.js";
import { fmtRelativeTime, mealLabelFromTime, entryEmoji } from "../../lib/utils.js";

const ENTRY_METHODS = [
  { key: "voice",   icon: Mic,         label: "Enregistrement vocal" },
  { key: "photo",   icon: Camera,      label: "Photo du plat" },
  { key: "label",   icon: Tag,         label: "Étiquette nutritionnelle" },
  { key: "barcode", icon: ScanBarcode, label: "Scanner code-barres" },
];

export default function HomeScreen({ entries, onPain, onCapture, onSeeJournal }) {
  const recent = [...entries]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 3);

  return (
    <div className="home-screen">
      <div className="home-greeting">
        <h1 className="headline-lg">Bonjour</h1>
        <p className="body-md text-muted">Comment va votre ventre aujourd'hui ?</p>
      </div>

      <button className="pain-button" onClick={onPain}>
        <AlertCircle size={20} strokeWidth={2.5} />
        Aïe !
      </button>

      <p className="section-label">Enregistrer un repas</p>
      <div className="entry-grid">
        {ENTRY_METHODS.map(({ key, icon: Icon, label }) => (
          <button key={key} className="entry-card" onClick={() => onCapture(key)}>
            <span className="entry-card-icon">
              <Icon size={22} strokeWidth={1.75} />
            </span>
            <span className="entry-card-label">{label}</span>
          </button>
        ))}
      </div>

      <button className="text-link-secondary" onClick={() => onCapture("text")}>
        Ou décrire votre repas par texte
      </button>

      {recent.length > 0 && (
        <>
          <div className="section-header">
            <span className="section-label" style={{ marginTop: 0, marginBottom: 0 }}>Entrées récentes</span>
            <button className="section-header-link" onClick={onSeeJournal}>Voir tout</button>
          </div>
          <div>
            {recent.map(e => <RecentRow key={e.id} entry={e} />)}
          </div>
        </>
      )}
    </div>
  );
}

function RecentRow({ entry }) {
  const isPain = entry.type === "pain";
  const title = isPain
    ? "Douleur"
    : mealLabelFromTime(entry.timestamp);
  const subtitle = isPain
    ? (entry.location || "Symptôme enregistré")
    : ((entry.dishes || []).join(" · ") || (entry.product_name) || "Repas");

  return (
    <div className="recent-row">
      <span className="recent-row-icon">{entryEmoji(entry, CAT_EMOJI)}</span>
      <div className="recent-row-info">
        <div className="recent-row-title">{title}</div>
        <div className="recent-row-subtitle">{subtitle}</div>
        <div className="recent-row-time">{fmtRelativeTime(entry.timestamp)}</div>
      </div>
    </div>
  );
}
