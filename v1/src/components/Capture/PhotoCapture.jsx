import { useState, useRef } from "react";
import { X, Camera, Loader2, RefreshCw, Settings } from "lucide-react";
import { compressImage, analyzeImageWithAI } from "../../lib/api.js";
import { getApiKey } from "../../lib/storage.js";

const COPY = {
  meal: {
    headerLabel: "PHOTO DU PLAT",
    title: "Prends une photo de ton repas",
    subtitle: "L'IA identifiera les ingrédients visibles.",
    pickHint: "Vise ton assiette de manière à voir tous les éléments.",
  },
  label: {
    headerLabel: "ÉTIQUETTE NUTRITIONNELLE",
    title: "Prends une photo de l'étiquette",
    subtitle: "L'IA décomposera la liste d'ingrédients.",
    pickHint: "Cadre la liste d'ingrédients du produit.",
  },
};

export default function PhotoCapture({ mode = "meal", onComplete, onCancel, onOpenSettings }) {
  const [state, setState] = useState("picking"); // "picking" | "analyzing" | "error"
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const apiKey = getApiKey();
  const copy = COPY[mode] || COPY.meal;

  function openPicker() {
    setError(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!apiKey) {
      setError("Configure ta clé API dans les paramètres pour analyser une photo.");
      return;
    }

    setState("analyzing");
    setError(null);

    try {
      const base64 = await compressImage(file);
      setImagePreview(base64);
      const result = await analyzeImageWithAI(base64, mode, apiKey);
      onComplete({
        plats: result.plats || [],
        ingredients: result.ingredients || [],
        imagePreview: base64,
        source: mode === "label" ? "photo-label" : "photo-meal",
      });
    } catch (e) {
      setError(e.message || "Erreur lors de l'analyse de l'image.");
      setState("error");
    }
  }

  function retry() {
    setState("picking");
    setImagePreview(null);
    setError(null);
  }

  return (
    <div className="fullscreen-modal">
      <div className="fullscreen-modal-header">
        <button className="app-icon-btn" onClick={onCancel} aria-label="Annuler">
          <X size={20} />
        </button>
        <div className="fullscreen-modal-title label-md">{copy.headerLabel}</div>
        <div style={{ width: 40 }} />
      </div>

      <div className="fullscreen-modal-content">
        <h1 className="headline-lg" style={{ marginTop: 8 }}>{copy.title}</h1>
        <p className="body-md text-muted" style={{ marginTop: 4 }}>
          {copy.subtitle}
        </p>

        {!apiKey && (
          <div className="settings-error" style={{ marginTop: 16 }}>
            <span style={{ flex: 1 }}>Aucune clé API configurée.</span>
            <button onClick={onOpenSettings} aria-label="Ouvrir les paramètres" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
              <Settings size={14} /> Paramètres
            </button>
          </div>
        )}

        {state === "picking" && (
          <div className="photo-capture-pick">
            <button
              className="photo-capture-cta"
              onClick={openPicker}
              disabled={!apiKey}
              aria-label="Choisir une photo"
            >
              <Camera size={36} />
            </button>
            <p className="photo-capture-hint">{copy.pickHint}</p>
            <p className="body-md text-muted" style={{ marginTop: 8, fontSize: 12 }}>
              L'appareil photo s'ouvre, ou tu peux choisir une image existante.
            </p>
          </div>
        )}

        {state === "analyzing" && (
          <div className="photo-capture-analyzing">
            {imagePreview && (
              <img
                src={`data:image/jpeg;base64,${imagePreview}`}
                alt="Aperçu"
                className="photo-capture-preview"
              />
            )}
            <div className="photo-capture-spinner">
              <Loader2 size={32} className="spin" />
              <p className="body-md text-muted">Analyse en cours…</p>
            </div>
          </div>
        )}

        {state === "error" && error && (
          <div className="photo-capture-analyzing">
            {imagePreview && (
              <img
                src={`data:image/jpeg;base64,${imagePreview}`}
                alt="Aperçu"
                className="photo-capture-preview"
              />
            )}
            <div className="settings-error" style={{ marginTop: 16 }}>
              <span style={{ flex: 1 }}>{error}</span>
            </div>
            <button className="btn btn-secondary btn-block" style={{ marginTop: 16 }} onClick={retry}>
              <RefreshCw size={16} /> Réessayer
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
