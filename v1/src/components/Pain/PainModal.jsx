import { useState } from "react";
import { ChevronLeft, X, Check } from "lucide-react";
import { SYMPTOM_TYPES, SEVERITY_LEVELS, LOCATABLE_SYMPTOMS, BRISTOL_SYMPTOMS } from "../../lib/symptomTypes.js";
import AbdomenMap from "./AbdomenMap.jsx";
import BristolScale from "./BristolScale.jsx";

function toLocalDatetimeValue(isoString) {
  const d = new Date(isoString);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function PainModal({
  onSave,
  onCancel,
  mode = "create",        // "create" | "edit"
  initialEntry = null,
}) {
  const [step, setStep] = useState(mode === "edit" ? "details" : "symptoms");
  const [selectedSymptoms, setSelectedSymptoms] = useState(
    initialEntry?.symptoms || (initialEntry?.symptom ? [initialEntry.symptom] : [])
  );
  const [severity, setSeverity] = useState(initialEntry?.severity ?? null);
  const [location, setLocation] = useState(
    Array.isArray(initialEntry?.location)
      ? initialEntry.location
      : initialEntry?.location ? [initialEntry.location] : []
  );
  const [bristol, setBristol] = useState(initialEntry?.bristol ?? null);
  const [timestamp, setTimestamp] = useState(
    toLocalDatetimeValue(initialEntry?.timestamp || new Date().toISOString())
  );

  const showLocation = selectedSymptoms.some(s => LOCATABLE_SYMPTOMS.includes(s));
  const showBristol  = selectedSymptoms.some(s => BRISTOL_SYMPTOMS.includes(s));

  function toggleSymptom(key) {
    setSelectedSymptoms(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  function handleSave() {
    if (!selectedSymptoms.length || severity === null) return;
    onSave({
      symptoms: selectedSymptoms,
      severity,
      location: showLocation ? location : null,
      bristol:  showBristol  ? bristol  : null,
      timestamp: new Date(timestamp).toISOString(),
    });
  }

  const canProceed = selectedSymptoms.length > 0;
  const canSave = canProceed && severity !== null;

  return (
    <div className="fullscreen-modal">
      <div className="fullscreen-modal-header">
        <button
          className="app-icon-btn"
          onClick={step === "details" ? () => setStep("symptoms") : onCancel}
          aria-label={step === "details" ? "Retour" : "Annuler"}
        >
          {step === "details" ? <ChevronLeft size={20} /> : <X size={20} />}
        </button>
        <div className="fullscreen-modal-title label-md" style={{ textTransform: "uppercase" }}>
          {mode === "edit" ? "Modifier" : (step === "symptoms" ? "Signaler une douleur" : "Détails")}
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div className="fullscreen-modal-content">
        {step === "symptoms" ? (
          <>
            <h1 className="headline-lg" style={{ marginTop: 8 }}>Quel(s) symptôme(s) ?</h1>
            <p className="body-md text-muted" style={{ marginTop: 4, marginBottom: 20 }}>
              Sélectionne un ou plusieurs.
            </p>
            <div className="symptom-grid">
              {SYMPTOM_TYPES.map(s => {
                const isActive = selectedSymptoms.includes(s.key);
                return (
                  <button
                    key={s.key}
                    onClick={() => toggleSymptom(s.key)}
                    className={`symptom-chip ${isActive ? "active" : ""}`}
                  >
                    <span className="symptom-chip-emoji">{s.emoji}</span>
                    <span className="symptom-chip-label">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <h1 className="headline-lg" style={{ marginTop: 8 }}>Détails</h1>
            <div className="pain-recap">
              {selectedSymptoms.map(sk => {
                const st = SYMPTOM_TYPES.find(s => s.key === sk);
                return (
                  <span key={sk} className="chip" style={{ background: "var(--color-primary-fixed)", color: "var(--color-primary)" }}>
                    {st?.emoji} {st?.label}
                  </span>
                );
              })}
            </div>

            <p className="section-label">Intensité</p>
            <div className="severity-grid">
              {SEVERITY_LEVELS.map(lv => {
                const isActive = severity === lv.v;
                return (
                  <button
                    key={lv.v}
                    onClick={() => setSeverity(lv.v)}
                    className={`severity-card ${isActive ? "active" : ""}`}
                  >
                    <span className="severity-card-emoji">{lv.emoji}</span>
                    <span className="severity-card-label">{lv.label}</span>
                    <span className="severity-card-desc">{lv.desc}</span>
                  </button>
                );
              })}
            </div>

            {showLocation && (
              <>
                <p className="section-label">Localisation</p>
                <div className="card" style={{ marginBottom: 8 }}>
                  <AbdomenMap selected={location} onChange={setLocation} />
                </div>
              </>
            )}

            {showBristol && (
              <>
                <p className="section-label">Échelle de Bristol</p>
                <BristolScale value={bristol} onChange={setBristol} />
              </>
            )}

            <p className="section-label">Heure</p>
            <div className="card pain-time-card">
              <input
                type="datetime-local"
                value={timestamp}
                onChange={e => setTimestamp(e.target.value)}
                className="pain-time-input"
              />
            </div>
          </>
        )}
      </div>

      <div className="fullscreen-modal-footer">
        {step === "symptoms" ? (
          <button
            className="btn btn-primary btn-block"
            onClick={() => setStep("details")}
            disabled={!canProceed}
          >
            Suivant →
          </button>
        ) : (
          <button
            className="btn btn-primary btn-block"
            onClick={handleSave}
            disabled={!canSave}
          >
            <Check size={18} /> Enregistrer
          </button>
        )}
      </div>
    </div>
  );
}
