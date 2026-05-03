import { useState } from "react";
import { ChevronLeft, X, Check, Plus, Sparkles, Loader2 } from "lucide-react";
import { CAT_EMOJI, CAT_LABEL } from "../../lib/categories.js";
import { guessCategory, normalizeIngredientName } from "../../lib/foodNormalizer.js";
import { suggestIngredientsWithAI } from "../../lib/api.js";
import { getApiKey } from "../../lib/storage.js";

const PORTIONS = [
  { v: "small",  emoji: "🥣", label: "Petite" },
  { v: "normal", emoji: "🍽️", label: "Normale" },
  { v: "large",  emoji: "🫕", label: "Grande" },
];

function toLocalDatetimeValue(isoString) {
  const d = new Date(isoString);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function MealEditor({
  mode = "create",          // "create" | "edit"
  source = null,            // "voice" | "text" | "photo-meal" | "photo-label" | null
  initialDishes = [],
  initialIngredients = [],
  initialPortion = "normal",
  initialTimestamp = null,
  transcript = null,
  imagePreview = null,      // base64 string for image preview
  onSave,
  onCancel,
}) {
  const [dishes, setDishes] = useState(initialDishes);
  const [dishInput, setDishInput] = useState("");
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [ingInput, setIngInput] = useState("");
  const [portion, setPortion] = useState(initialPortion);
  const [timestamp, setTimestamp] = useState(
    initialTimestamp ? toLocalDatetimeValue(initialTimestamp) : toLocalDatetimeValue(new Date().toISOString())
  );
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const headerLabel = mode === "edit" ? "MODIFIER" : "RÉVISER";
  const showTimestamp = mode === "edit";
  const apiKey = getApiKey();

  function addDish() {
    const d = dishInput.trim();
    if (!d || dishes.includes(d)) { setDishInput(""); return; }
    setDishes(prev => [...prev, d]);
    setDishInput("");
  }

  function removeDish(idx) {
    setDishes(prev => prev.filter((_, i) => i !== idx));
  }

  function addIngredient(ing) {
    setIngredients(prev =>
      prev.some(e => e.nom === ing.nom) ? prev : [...prev, ing]
    );
    setIngInput("");
    setAiSuggestions([]);
  }

  function addCustomIngredient() {
    const nom = normalizeIngredientName(ingInput);
    if (!nom) return;
    addIngredient({ nom, categorie: guessCategory(nom) });
  }

  function removeIngredient(idx) {
    setIngredients(prev => prev.filter((_, i) => i !== idx));
  }

  async function runAiSuggest() {
    if (!apiKey) {
      setAiError("Configure ta clé API dans les paramètres pour utiliser les suggestions.");
      return;
    }
    setAiError(null);
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const dishCtx = dishes.join(", ");
      const results = await suggestIngredientsWithAI(
        dishCtx,
        ingredients.map(i => i.nom),
        ingInput.trim(),
        apiKey
      );
      setAiSuggestions(results);
    } catch (e) {
      setAiError(e.message || "Erreur lors de la suggestion.");
    } finally {
      setAiLoading(false);
    }
  }

  function handleSave() {
    const payload = {
      dishes,
      ingredients,
      portion,
      timestamp: showTimestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      transcript,
      source,
    };
    onSave(payload);
  }

  return (
    <div className="fullscreen-modal">
      <div className="fullscreen-modal-header">
        <button className="app-icon-btn" onClick={onCancel} aria-label="Annuler">
          {mode === "edit" ? <X size={20} /> : <ChevronLeft size={20} />}
        </button>
        <div className="fullscreen-modal-title label-md">{headerLabel}</div>
        <div style={{ width: 40 }} />
      </div>

      <div className="fullscreen-modal-content">
        <h1 className="headline-lg" style={{ marginTop: 8 }}>
          {mode === "edit" ? "Modifier ce repas" : "Confirme les détails"}
        </h1>
        {mode !== "edit" && (
          <p className="body-md text-muted" style={{ marginTop: 4 }}>
            Vérifie ce qui a été identifié, ajuste si besoin, puis enregistre.
          </p>
        )}

        {/* Source context */}
        {(transcript || imagePreview) && (
          <div className="meal-context" style={{ marginTop: 16 }}>
            {imagePreview && (
              <img
                src={`data:image/jpeg;base64,${imagePreview}`}
                alt="Aperçu"
                className="meal-context-image"
              />
            )}
            {transcript && (
              <div className="meal-context-quote">"{transcript}"</div>
            )}
          </div>
        )}

        {/* Dishes */}
        <p className="section-label">Plats</p>
        <div className="meal-chips">
          {dishes.map((d, i) => (
            <span key={i} className="chip meal-chip-removable">
              {d}
              <button onClick={() => removeDish(i)} aria-label={`Retirer ${d}`}>
                <X size={14} />
              </button>
            </span>
          ))}
          {dishes.length === 0 && (
            <span className="body-md text-muted">Aucun plat — ajoute-en un.</span>
          )}
        </div>
        <div className="meal-add-row">
          <input
            className="input"
            value={dishInput}
            onChange={e => setDishInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addDish(); } }}
            placeholder="Ajouter un plat (ex : salade verte)"
          />
          <button className="btn btn-secondary meal-add-btn" onClick={addDish} disabled={!dishInput.trim()}>
            <Plus size={18} />
          </button>
        </div>

        {/* Ingredients */}
        <p className="section-label">Ingrédients</p>
        <div className="meal-chips">
          {ingredients.map((ing, i) => (
            <span key={i} className="chip meal-chip-removable" title={CAT_LABEL[ing.categorie] || ""}>
              <span style={{ marginRight: 4 }}>{CAT_EMOJI[ing.categorie] || "🔹"}</span>
              {ing.nom}
              <button onClick={() => removeIngredient(i)} aria-label={`Retirer ${ing.nom}`}>
                <X size={14} />
              </button>
            </span>
          ))}
          {ingredients.length === 0 && (
            <span className="body-md text-muted">Aucun ingrédient — ajoute-en ou utilise la suggestion IA.</span>
          )}
        </div>
        <div className="meal-add-row">
          <input
            className="input"
            value={ingInput}
            onChange={e => { setIngInput(e.target.value); setAiError(null); }}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomIngredient(); } }}
            placeholder="Ajouter un ingrédient (ex : ail)"
          />
          <button className="btn btn-secondary meal-add-btn" onClick={addCustomIngredient} disabled={!ingInput.trim()}>
            <Plus size={18} />
          </button>
          {apiKey && (
            <button
              className="btn btn-secondary meal-add-btn"
              onClick={runAiSuggest}
              disabled={aiLoading}
              title="Suggérer avec l'IA"
              aria-label="Suggérer avec l'IA"
            >
              {aiLoading ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
            </button>
          )}
        </div>
        {aiError && <p className="settings-error" style={{ marginTop: 8 }}>{aiError}</p>}
        {aiSuggestions.length > 0 && (
          <>
            <p className="label-sm" style={{ marginTop: 12, marginBottom: 8 }}>Suggestions IA</p>
            <div className="meal-chips">
              {aiSuggestions.map((sug, i) => (
                <button key={i} className="chip meal-suggestion-chip" onClick={() => addIngredient(sug)}>
                  {CAT_EMOJI[sug.categorie] || "🔹"} {sug.nom} <Plus size={12} />
                </button>
              ))}
            </div>
          </>
        )}

        {/* Portion */}
        <p className="section-label">Portion</p>
        <div className="portion-grid">
          {PORTIONS.map(p => {
            const isActive = portion === p.v;
            return (
              <button
                key={p.v}
                onClick={() => setPortion(p.v)}
                className={`portion-card ${isActive ? "active" : ""}`}
              >
                <span className="portion-emoji">{p.emoji}</span>
                <span className="portion-label">{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Timestamp (edit mode only) */}
        {showTimestamp && (
          <>
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
        <button
          className="btn btn-primary btn-block"
          onClick={handleSave}
          disabled={dishes.length === 0 && ingredients.length === 0}
        >
          <Check size={18} /> Enregistrer
        </button>
      </div>
    </div>
  );
}
