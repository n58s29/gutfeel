import { useState, useEffect, useRef } from "react";
import { X, Loader2, ChevronRight, Settings } from "lucide-react";
import { decomposeWithAI } from "../../lib/api.js";
import { getApiKey } from "../../lib/storage.js";

export default function TextCapture({ onComplete, onCancel, onOpenSettings }) {
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  const apiKey = getApiKey();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleAnalyze() {
    const t = text.trim();
    if (!t) return;
    if (!apiKey) {
      setError("Configure ta clé API dans les paramètres pour utiliser l'analyse.");
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const result = await decomposeWithAI(t, apiKey);
      if (result.plats.length === 0 && result.ingredients.length === 0) {
        setError("Aucun aliment détecté. Si tu n'as rien mangé, pas besoin d'enregistrer.");
        setAnalyzing(false);
        return;
      }
      onComplete({
        plats: result.plats,
        ingredients: result.ingredients,
        transcript: t,
        source: "text",
      });
    } catch (e) {
      setError(e.message || "Erreur lors de l'analyse.");
      setAnalyzing(false);
    }
  }

  return (
    <div className="fullscreen-modal">
      <div className="fullscreen-modal-header">
        <button className="app-icon-btn" onClick={onCancel} aria-label="Annuler">
          <X size={20} />
        </button>
        <div className="fullscreen-modal-title label-md">SAISIE TEXTE</div>
        <div style={{ width: 40 }} />
      </div>

      <div className="fullscreen-modal-content">
        <h1 className="headline-lg" style={{ marginTop: 8 }}>Décrivez votre repas</h1>
        <p className="body-md text-muted" style={{ marginTop: 4 }}>
          Texte libre, en français. L'IA s'occupe d'identifier les ingrédients.
        </p>

        <textarea
          ref={textareaRef}
          className="text-capture-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Ex : « J'ai mangé un avocat bien mûr sur une tartine de pain complet. »"
          rows={8}
        />

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
      </div>

      <div className="fullscreen-modal-footer">
        <button
          className="btn btn-primary btn-block"
          onClick={handleAnalyze}
          disabled={!text.trim() || analyzing}
        >
          {analyzing ? <Loader2 size={18} className="spin" /> : null}
          {analyzing ? "Analyse en cours…" : <>Analyser <ChevronRight size={18} /></>}
        </button>
      </div>
    </div>
  );
}
