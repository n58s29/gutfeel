import { useState } from "react";
import { Plus, Mic, Type, Camera, Tag, ScanBarcode, AlertCircle, ChevronRight } from "lucide-react";
import EntryCard from "./EntryCard.jsx";

const QUICK_ACTIONS = [
  { key: "voice",   icon: Mic,         label: "Enregistrement vocal" },
  { key: "text",    icon: Type,        label: "Saisie texte" },
  { key: "photo",   icon: Camera,      label: "Photo du plat" },
  { key: "label",   icon: Tag,         label: "Étiquette nutritionnelle" },
  { key: "barcode", icon: ScanBarcode, label: "Scanner code-barres" },
];

export default function JournalScreen({ entries, onCapture, onPain, onEditEntry, onDuplicateEntry, onDeleteEntry }) {
  const [showQuickActions, setShowQuickActions] = useState(false);

  return (
    <div className="journal-screen">
      <h1 className="headline-lg">Mon Journal</h1>
      <p className="body-md text-muted" style={{ marginTop: 4 }}>
        Suivi quotidien de votre confort digestif.
      </p>

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ marginTop: 24 }}>
          {groupByDay(entries).map(({ day, items }) => (
            <div key={day} style={{ marginBottom: 20 }}>
              <p className="section-label" style={{ marginTop: 0 }}>{day}</p>
              {items.map(e => (
                <EntryCard
                  key={e.id}
                  entry={e}
                  onEdit={onEditEntry}
                  onDuplicate={onDuplicateEntry}
                  onDelete={onDeleteEntry}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <button className="fab" onClick={() => setShowQuickActions(true)} aria-label="Ajouter une entrée">
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {showQuickActions && (
        <QuickActionsSheet
          onClose={() => setShowQuickActions(false)}
          onCapture={(method) => { setShowQuickActions(false); onCapture(method); }}
          onPain={() => { setShowQuickActions(false); onPain(); }}
        />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="journal-empty">
      <div className="journal-empty-emoji">🌱</div>
      <p className="headline-md" style={{ color: "var(--color-on-surface-variant)" }}>
        Ton journal est vide
      </p>
      <p className="body-md text-muted" style={{ marginTop: 8 }}>
        Commence par noter ce que tu as mangé.
      </p>
    </div>
  );
}

function QuickActionsSheet({ onClose, onCapture, onPain }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 className="headline-md" style={{ textAlign: "center", marginBottom: 4 }}>Ajouter</h2>
        <p className="body-md text-muted" style={{ textAlign: "center", marginBottom: 20 }}>
          Que veux-tu enregistrer ?
        </p>

        <div className="quick-actions-list">
          {QUICK_ACTIONS.map(({ key, icon: Icon, label }) => (
            <button key={key} className="quick-action-row" onClick={() => onCapture(key)}>
              <span className="quick-action-icon"><Icon size={20} strokeWidth={1.75} /></span>
              <span className="quick-action-label">{label}</span>
              <ChevronRight size={18} className="text-muted" />
            </button>
          ))}

          <button className="quick-action-row quick-action-pain" onClick={onPain}>
            <span className="quick-action-icon" style={{ background: "var(--color-tertiary-container)", color: "var(--color-on-tertiary-container)" }}>
              <AlertCircle size={20} strokeWidth={2} />
            </span>
            <span className="quick-action-label">Signaler une douleur</span>
            <ChevronRight size={18} className="text-muted" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Group entries by day, returning an array of { day: "Aujourd'hui" | "Hier" | "lundi 21 avril", items: [...] }
// Days in descending order, items within a day in descending order.
function groupByDay(entries) {
  const sorted = [...entries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const map = new Map();
  for (const e of sorted) {
    const dayKey = new Date(e.timestamp).toISOString().slice(0, 10);
    if (!map.has(dayKey)) map.set(dayKey, []);
    map.get(dayKey).push(e);
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);

  return [...map.entries()].map(([key, items]) => {
    let label;
    if (key === today) label = "Aujourd'hui";
    else if (key === yesterday) label = "Hier";
    else {
      const d = new Date(key);
      label = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    }
    return { day: label, items };
  });
}
