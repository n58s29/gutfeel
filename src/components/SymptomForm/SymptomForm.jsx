import { useState } from "react";
import { ChevronLeft, Check } from "lucide-react";
import { SYMPTOM_TYPES, SEVERITY_LEVELS, LOCATABLE_SYMPTOMS, BRISTOL_SYMPTOMS } from "../../lib/symptomTypes.js";
import AbdomenMap from "./AbdomenMap.jsx";
import BristolScale from "./BristolScale.jsx";

function toLocalDatetimeValue(isoString) {
  const d = new Date(isoString);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function SymptomForm({ onSave, onCancel }) {
  const [step, setStep] = useState("symptoms"); // symptoms | details
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [severity, setSeverity] = useState(null);
  const [location, setLocation] = useState(null);
  const [bristol, setBristol] = useState(null);
  const [timestamp, setTimestamp] = useState(toLocalDatetimeValue(new Date().toISOString()));

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
  const canSave    = canProceed && severity !== null;

  return (
    <div className="gf-abs" style={{ background: "#FFFBF5" }}>
      {/* Header */}
      <div className="gf-header">
        <button
          onClick={step === "details" ? () => setStep("symptoms") : onCancel}
          className="gf-back-btn"
        >
          <ChevronLeft size={20} />
          {step === "details" ? "Retour" : "Annuler"}
        </button>
        <h1 className="gf-title">
          {step === "symptoms" ? "Quel(s) symptôme(s) ?" : "Détails"}
        </h1>
        <div style={{ width: 80 }} />
      </div>

      <div className="gf-scroll" style={{ paddingTop: 16 }}>

        {/* ── STEP 1: Symptom selection ── */}
        {step === "symptoms" && (
          <>
            <p style={{ fontSize: 12, color: "#8D99AE", marginBottom: 12, padding: "0 4px" }}>
              Sélectionne un ou plusieurs symptômes
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {SYMPTOM_TYPES.map(s => {
                const isActive = selectedSymptoms.includes(s.key);
                return (
                  <button
                    key={s.key}
                    onClick={() => toggleSymptom(s.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: isActive ? "2px solid #E07A5F" : "1.5px solid #F0E6D8",
                      background: isActive ? "#FFF5EE" : "#fff",
                      cursor: "pointer",
                      fontFamily: "Nunito, sans-serif",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{s.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, lineHeight: 1.2, color: isActive ? "#E07A5F" : "#2B2D42" }}>
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── STEP 2: Severity + conditional fields ── */}
        {step === "details" && (
          <>
            {/* Selected symptoms recap */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {selectedSymptoms.map(sk => {
                const st = SYMPTOM_TYPES.find(s => s.key === sk);
                return (
                  <span key={sk} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 99, background: "#FFF5EE", border: "1px solid #FFD4C0", color: "#E07A5F", fontWeight: 600 }}>
                    {st?.emoji} {st?.label}
                  </span>
                );
              })}
            </div>

            {/* Severity */}
            <p className="gf-section-label">Intensité</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
              {SEVERITY_LEVELS.map(lv => {
                const isActive = severity === lv.v;
                return (
                  <button
                    key={lv.v}
                    onClick={() => setSeverity(lv.v)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      padding: "14px 8px",
                      borderRadius: 14,
                      border: isActive ? `2px solid ${lv.color}` : "1.5px solid #F0E6D8",
                      background: isActive ? "#FFFBF5" : "#fff",
                      cursor: "pointer",
                      fontFamily: "Nunito, sans-serif",
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{lv.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500 }}>{lv.label}</span>
                    <span style={{ fontSize: 10, color: "#8D99AE", lineHeight: 1.2, textAlign: "center" }}>{lv.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* AbdomenMap (conditional) */}
            {showLocation && (
              <>
                <p className="gf-section-label">Localisation</p>
                <div style={{ marginBottom: 20, padding: "12px", borderRadius: 16, background: "#fff", border: "1px solid #F0E6D8" }}>
                  <AbdomenMap selected={location} onChange={setLocation} />
                </div>
              </>
            )}

            {/* Bristol Scale (conditional) */}
            {showBristol && (
              <>
                <p className="gf-section-label">Échelle de Bristol</p>
                <div style={{ marginBottom: 20 }}>
                  <BristolScale value={bristol} onChange={setBristol} />
                </div>
              </>
            )}

            {/* Timestamp */}
            <p className="gf-section-label">Heure</p>
            <div style={{ borderRadius: 14, padding: 12, background: "#fff", border: "1px solid #F0E6D8", marginBottom: 16 }}>
              <input
                type="datetime-local"
                value={timestamp}
                onChange={e => setTimestamp(e.target.value)}
                style={{ width: "100%", fontSize: 14, outline: "none", background: "transparent", border: "none", fontFamily: "Nunito, sans-serif", color: "#2B2D42" }}
              />
            </div>
          </>
        )}
      </div>

      {/* Footer button */}
      <div style={{ padding: "0 16px 24px", flexShrink: 0 }}>
        {step === "symptoms" ? (
          <button
            className="gf-btn-primary"
            onClick={() => setStep("details")}
            disabled={!canProceed}
            style={{ opacity: canProceed ? 1 : 0.5 }}
          >
            Suivant →
          </button>
        ) : (
          <button
            className="gf-btn-primary"
            onClick={handleSave}
            disabled={!canSave}
            style={{ background: canSave ? undefined : "#D8D0C8", opacity: canSave ? 1 : 0.7 }}
          >
            <Check size={18} /> Enregistrer
          </button>
        )}
      </div>
    </div>
  );
}
