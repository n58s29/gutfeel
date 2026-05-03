import { useState, useRef } from "react";
import { X, Key, Download, Upload, FileText, ShieldCheck, ExternalLink, ChevronRight } from "lucide-react";
import pkg from "../../../package.json";
import { getApiKey, setApiKey } from "../../lib/storage.js";
import { exportBackup, importBackup } from "../../lib/backup.js";
import { exportCSV } from "../../lib/csv.js";
import AboutSheet from "./AboutSheet.jsx";

export default function SettingsModal({ entries, onClose }) {
  const [apiKeyInput, setApiKeyInput] = useState(getApiKey());
  const [error, setError] = useState(null);
  const [showAbout, setShowAbout] = useState(false);
  const fileInputRef = useRef(null);

  const handleSave = () => {
    setApiKey(apiKeyInput.trim());
    onClose();
  };

  const handleImport = (file) => {
    setError(null);
    importBackup(file, pkg.version, {
      onError: setError,
      onSuccess: (msg) => {
        window.alert(msg);
        window.location.reload();
      },
    });
  };

  const hasKey = apiKeyInput.trim().length > 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: "92vh" }}>
        <div className="modal-handle" />

        <div className="settings-header">
          <h2 className="headline-md">Paramètres</h2>
          <button className="app-icon-btn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        {error && (
          <div className="settings-error">
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => setError(null)} aria-label="Fermer"><X size={14} /></button>
          </div>
        )}

        {/* ── API key ───────────────────────────────── */}
        <p className="section-label" style={{ marginTop: 16 }}>Clé API</p>
        <div className="settings-input-row">
          <Key size={18} className="settings-input-icon" />
          <input
            type="password"
            value={apiKeyInput}
            onChange={e => setApiKeyInput(e.target.value)}
            placeholder="sk-ant-api03-..."
            className="input"
            style={{ paddingLeft: 44 }}
          />
        </div>
        <p className="body-md text-muted" style={{ marginTop: 8 }}>
          Utilisée pour l'analyse IA (vocal, photo, étiquettes). Vos clés restent locales, jamais transmises ailleurs qu'à l'API Anthropic.
        </p>
        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="settings-link"
        >
          <ExternalLink size={14} /> Obtenir une clé API
        </a>

        {/* ── Data management ───────────────────────── */}
        <p className="section-label">Gestion des données</p>
        <div className="settings-actions">
          <button className="settings-action-row" onClick={() => exportBackup(pkg.version)}>
            <span className="settings-action-icon"><Download size={18} /></span>
            <div className="settings-action-text">
              <div className="settings-action-title">Exporter (JSON)</div>
              <div className="settings-action-sub">Backup complet pour transfert ou rollback</div>
            </div>
            <ChevronRight size={18} className="text-muted" />
          </button>

          <button className="settings-action-row" onClick={() => fileInputRef.current?.click()}>
            <span className="settings-action-icon settings-action-icon-warn"><Upload size={18} /></span>
            <div className="settings-action-text">
              <div className="settings-action-title">Importer (JSON)</div>
              <div className="settings-action-sub">Restaurer depuis un backup précédent</div>
            </div>
            <ChevronRight size={18} className="text-muted" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }}
          />

          {entries.length > 0 && (
            <button className="settings-action-row" onClick={() => exportCSV(entries)}>
              <span className="settings-action-icon"><FileText size={18} /></span>
              <div className="settings-action-text">
                <div className="settings-action-title">Exporter le journal (CSV)</div>
                <div className="settings-action-sub">Pour analyse externe (Excel, Sheets…)</div>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </button>
          )}
        </div>

        {/* ── Privacy notice ────────────────────────── */}
        <div className="settings-privacy">
          <span className="settings-privacy-icon"><ShieldCheck size={20} /></span>
          <div>
            <div className="settings-privacy-title">Confidentialité totale</div>
            <div className="settings-privacy-body">
              Vos données ne quittent jamais cet appareil, sauf si vous choisissez de les exporter manuellement.
            </div>
          </div>
        </div>

        {/* ── About link ────────────────────────────── */}
        <button className="settings-about-link" onClick={() => setShowAbout(true)}>
          À propos & sources scientifiques
          <ChevronRight size={16} />
        </button>
        <p className="settings-version">Mieux Demain v{pkg.version}</p>

        {/* ── Save / Cancel ─────────────────────────── */}
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            {getApiKey() ? "Annuler" : "Passer"}
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={!hasKey}
          >
            Enregistrer
          </button>
        </div>

        {showAbout && <AboutSheet onClose={() => setShowAbout(false)} />}
      </div>
    </div>
  );
}
