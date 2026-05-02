import { useState, useRef, useEffect } from "react";
import { X, Mic, Square, Loader2, ChevronRight, Settings } from "lucide-react";
import { decomposeWithAI } from "../../lib/api.js";
import { getApiKey } from "../../lib/storage.js";

export default function VoiceCapture({ onComplete, onCancel, onOpenSettings }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const isRecordingRef = useRef(false);

  const apiKey = getApiKey();

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch {}
    };
  }, []);

  function startRecording() {
    setError(null);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError("Reconnaissance vocale non supportée. Utilise Chrome.");
      return;
    }

    if (!finalTranscriptRef.current) finalTranscriptRef.current = "";
    setInterimText("");
    isRecordingRef.current = true;
    setRecording(true);

    const rec = new SR();
    rec.lang = "fr-FR";
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = e => {
      let interim = "";
      let final = finalTranscriptRef.current;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      finalTranscriptRef.current = final;
      setTranscript(final.trim());
      setInterimText(interim);
    };

    rec.onerror = e => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        setError(`Erreur micro : ${e.error}`);
      }
    };

    rec.onend = () => {
      isRecordingRef.current = false;
      setRecording(false);
      setInterimText("");
    };

    rec.start();
    recognitionRef.current = rec;
  }

  function stopRecording() {
    try { recognitionRef.current?.stop(); } catch {}
    isRecordingRef.current = false;
    setRecording(false);
  }

  async function handleAnalyze() {
    const text = transcript.trim();
    if (!text) {
      setError("Aucun texte capté. Essaie d'enregistrer à nouveau.");
      return;
    }
    if (!apiKey) {
      setError("Configure ta clé API dans les paramètres pour utiliser l'analyse.");
      return;
    }

    if (recording) stopRecording();
    setAnalyzing(true);
    setError(null);
    try {
      const result = await decomposeWithAI(text, apiKey);
      if (result.plats.length === 0 && result.ingredients.length === 0) {
        setError("Aucun aliment détecté. Si tu n'as rien mangé, pas besoin d'enregistrer.");
        setAnalyzing(false);
        return;
      }
      onComplete({
        plats: result.plats,
        ingredients: result.ingredients,
        transcript: text,
        source: "voice",
      });
    } catch (e) {
      setError(e.message || "Erreur lors de l'analyse.");
      setAnalyzing(false);
    }
  }

  const hasContent = transcript.trim().length > 0;

  return (
    <div className="fullscreen-modal">
      <div className="fullscreen-modal-header">
        <button className="app-icon-btn" onClick={onCancel} aria-label="Annuler">
          <X size={20} />
        </button>
        <div className="fullscreen-modal-title label-md">ENREGISTREMENT</div>
        <div style={{ width: 40 }} />
      </div>

      <div className="fullscreen-modal-content">
        <h1 className="headline-lg" style={{ marginTop: 8 }}>Décrivez votre repas</h1>
        <p className="body-md text-muted" style={{ marginTop: 4 }}>
          Parlez naturellement, on identifie les ingrédients pour vous.
        </p>

        <div className="voice-transcript-card" style={{ marginTop: 24 }}>
          {recording && (
            <div className="voice-live-indicator">
              <span className="voice-live-dot" />
              <span>EN DIRECT</span>
            </div>
          )}
          {transcript || interimText ? (
            <p className="voice-transcript-text">
              "{transcript}{interimText && <span className="voice-interim"> {interimText}</span>}"
            </p>
          ) : (
            <p className="voice-transcript-empty">
              Tap sur le micro pour commencer.
            </p>
          )}
        </div>

        {!apiKey && (
          <div className="settings-error" style={{ marginTop: 16 }}>
            <span style={{ flex: 1 }}>Aucune clé API configurée.</span>
            <button onClick={onOpenSettings} aria-label="Ouvrir les paramètres" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
              <Settings size={14} /> Paramètres
            </button>
          </div>
        )}

        {error && (
          <div className="settings-error" style={{ marginTop: 16 }}>
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => setError(null)} aria-label="Fermer"><X size={14} /></button>
          </div>
        )}

        <div className="voice-mic-section">
          <button
            className={`voice-mic-button ${recording ? "recording" : ""}`}
            onClick={recording ? stopRecording : startRecording}
            aria-label={recording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement"}
            disabled={analyzing}
          >
            {recording ? <Square size={28} fill="currentColor" /> : <Mic size={28} />}
          </button>
          <p className="voice-mic-hint">
            {recording ? "Tap pour arrêter" : (hasContent ? "Tap pour ajouter à la transcription" : "Tap pour parler")}
          </p>
        </div>
      </div>

      <div className="fullscreen-modal-footer">
        <button
          className="btn btn-primary btn-block"
          onClick={handleAnalyze}
          disabled={!hasContent || analyzing}
        >
          {analyzing ? <Loader2 size={18} className="spin" /> : null}
          {analyzing ? "Analyse en cours…" : <>Terminer l'analyse <ChevronRight size={18} /></>}
        </button>
      </div>
    </div>
  );
}
