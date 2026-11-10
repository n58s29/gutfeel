import { useState } from "react";
import { X, RotateCcw } from "lucide-react";

export default function NewAnalysisSheet({ currentLabel, entryCount, onConfirm, onCancel }) {
  const [label, setLabel] = useState("");

  const submit = () => onConfirm(label);

  return (
    <div className="modal-backdrop" onClick={onCancel} style={{ zIndex: 200 }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: "92vh" }}>
        <div className="modal-handle" />

        <div className="settings-header">
          <h2 className="headline-md">Nouvelle analyse</h2>
          <button className="app-icon-btn" onClick={onCancel} aria-label="Fermer"><X size={18} /></button>
        </div>

        <p className="body-md" style={{ marginTop: 12 }}>
          Vous démarrez un nouveau cycle d'analyse. L'analyse actuelle{currentLabel ? <> <strong>« {currentLabel} »</strong></> : null} sera archivée et {entryCount} entrée{entryCount > 1 ? "s" : ""} précédente{entryCount > 1 ? "s" : ""} ne seront plus utilisées pour identifier les suspects.
        </p>
        <p className="body-md text-muted" style={{ marginTop: 8 }}>
          Vos anciennes données restent visibles dans le Journal — seul le moteur d'analyse les ignore.
        </p>

        <p className="section-label" style={{ marginTop: 20 }}>Nom (optionnel)</p>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="ex : douleur ventre bas, mai 2026"
          className="input"
          maxLength={80}
          autoFocus
        />
        <p className="body-md text-muted" style={{ marginTop: 8 }}>
          Laissez vide pour utiliser la date du jour.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
            Annuler
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit}>
            <RotateCcw size={16} style={{ marginRight: 6 }} />
            Démarrer
          </button>
        </div>
      </div>
    </div>
  );
}
