import { useState, useRef, useMemo } from "react";
import { X, Download, Upload, FileText, ShieldCheck, ChevronRight, RotateCcw, Loader2, Check } from "lucide-react";
import pkg from "../../../package.json";
import { getFamilyCode, setFamilyCode, hasV2Snapshot, restoreV2Snapshot } from "../../lib/storage.js";
import { verifyFamilyCode } from "../../lib/api.js";
import { exportBackup, importBackup } from "../../lib/backup.js";
import { exportCSV } from "../../lib/csv.js";
import AboutSheet from "./AboutSheet.jsx";
import FamilyCodeInput from "../Onboarding/FamilyCodeInput.jsx";
import NewAnalysisSheet from "./NewAnalysisSheet.jsx";

export default function SettingsModal({ entries, currentAnalysis, onStartNewAnalysis, onClose }) {
  const savedCode = getFamilyCode();
  const [codeInput, setCodeInput] = useState(savedCode);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showNewAnalysis, setShowNewAnalysis] = useState(false);
  const fileInputRef = useRef(null);

  const scopedCount = useMemo(() => {
    if (!currentAnalysis?.startDate) return 0;
    const start = new Date(currentAnalysis.startDate).getTime();
    return entries.filter(e => new Date(e.timestamp).getTime() >= start).length;
  }, [entries, currentAnalysis]);

  const codeChanged = codeInput.trim() !== savedCode;

  const handleSave = async () => {
    const c = codeInput.trim();
    if (!codeChanged) { onClose(); return; }
    if (!c) { setFamilyCode(""); onClose(); return; }
    setChecking(true);
    setError(null);
    try {
      const ok = await verifyFamilyCode(c);
      if (!ok) { setError("Code famille incorrect. Vérifie l'orthographe (majuscules comprises)."); return; }
      setFamilyCode(c);
      onClose();
    } catch (e) {
      setError(e.message || "Vérification impossible pour le moment.");
    } finally {
      setChecking(false);
    }
  };

  const handleRestoreV2 = () => {
    if (!window.confirm("Remettre les ingrédients de tes anciens repas exactement comme avant la mise à jour v2 ?\n\nTes douleurs et tes nouveaux repas ne sont pas touchés.")) return;
    try {
      const n = restoreV2Snapshot();
      window.alert(`${n} repas remis comme avant la v2.`);
      window.location.reload();
    } catch {
      setError("Restauration impossible.");
    }
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

        {/* ── Family code ───────────────────────────── */}
        <p className="section-label" style={{ marginTop: 16 }}>Code famille</p>
        <FamilyCodeInput
          value={codeInput}
          onChange={v => { setCodeInput(v); setError(null); }}
          onEnter={handleSave}
        />
        <p className="body-md text-muted" style={{ marginTop: 8 }}>
          {savedCode
            ? <><Check size={14} style={{ verticalAlign: "-2px" }} /> Code enregistré : l'analyse IA (vocal, texte, photo) est active.</>
            : "Nécessaire pour l'analyse IA (vocal, texte, photo). Demande-le à la personne qui gère l'appli."}
        </p>

        {/* ── Current analysis ──────────────────────── */}
        {currentAnalysis && (
          <>
            <p className="section-label">Analyse en cours</p>
            <div className="settings-actions">
              <button className="settings-action-row" onClick={() => setShowNewAnalysis(true)}>
                <span className="settings-action-icon"><RotateCcw size={18} /></span>
                <div className="settings-action-text">
                  <div className="settings-action-title">Démarrer une nouvelle analyse</div>
                  <div className="settings-action-sub">
                    « {currentAnalysis.label} » — {scopedCount} entrée{scopedCount > 1 ? "s" : ""} seront archivées
                  </div>
                </div>
                <ChevronRight size={18} className="text-muted" />
              </button>
            </div>
          </>
        )}

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

          {hasV2Snapshot() && (
            <button className="settings-action-row" onClick={handleRestoreV2}>
              <span className="settings-action-icon settings-action-icon-warn"><RotateCcw size={18} /></span>
              <div className="settings-action-text">
                <div className="settings-action-title">Ingrédients d'avant la v2</div>
                <div className="settings-action-sub">Remettre les noms d'ingrédients des anciens repas comme avant la mise à jour</div>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </button>
          )}

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
            <div className="settings-privacy-title">Confidentialité</div>
            <div className="settings-privacy-body">
              Ton journal reste sur cet appareil. Seuls les textes et photos de repas que tu fais analyser passent par le relais sécurisé jusqu'à l'IA (Anthropic), sans y être conservés par l'appli.
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
            Annuler
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={checking}
          >
            {checking ? <Loader2 size={18} className="spin" /> : null}
            Enregistrer
          </button>
        </div>

        {showAbout && <AboutSheet onClose={() => setShowAbout(false)} />}
        {showNewAnalysis && (
          <NewAnalysisSheet
            currentLabel={currentAnalysis?.label}
            entryCount={scopedCount}
            onConfirm={(label) => {
              onStartNewAnalysis(label);
              setShowNewAnalysis(false);
            }}
            onCancel={() => setShowNewAnalysis(false)}
          />
        )}
      </div>
    </div>
  );
}
