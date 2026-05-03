import { Mic, Type, Camera, Tag, ScanBarcode, AlertCircle, ChevronRight } from "lucide-react";

const QUICK_ACTIONS = [
  { key: "voice",   icon: Mic,         label: "Enregistrement vocal" },
  { key: "text",    icon: Type,        label: "Saisie texte" },
  { key: "photo",   icon: Camera,      label: "Photo du plat" },
  { key: "label",   icon: Tag,         label: "Étiquette nutritionnelle" },
  { key: "barcode", icon: ScanBarcode, label: "Scanner code-barres" },
];

export default function QuickActionsSheet({ onClose, onCapture, onPain }) {
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
