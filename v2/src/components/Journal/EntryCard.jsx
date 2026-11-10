import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Copy, Trash2 } from "lucide-react";
import { CAT_EMOJI } from "../../lib/categories.js";
import { fmtTime, mealLabelFromTime, entryEmoji } from "../../lib/utils.js";
import {
  getEntrySymptoms,
  getEntrySeverity,
  getSymptom,
  getSeverity,
} from "../../lib/symptomTypes.js";

export default function EntryCard({ entry, onEdit, onDuplicate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const isPain = entry.type === "pain";

  return (
    <div
      className="journal-card"
      onClick={() => setExpanded(v => !v)}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(v => !v); } }}
    >
      <div className="journal-card-row">
        <span className="journal-card-icon">{entryEmoji(entry, CAT_EMOJI)}</span>
        <div className="journal-card-info">
          <div className="journal-card-title">{cardTitle(entry)}</div>
          <div className="journal-card-meta">
            {fmtTime(entry.timestamp)}
            {cardSubtitle(entry) && <> · {cardSubtitle(entry)}</>}
          </div>
        </div>
        {expanded ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
      </div>

      {expanded && (
        <div className="journal-card-expanded" onClick={e => e.stopPropagation()}>
          {isPain ? <PainDetails entry={entry} /> : <MealDetails entry={entry} />}

          <div className="journal-card-actions">
            <button className="journal-action" onClick={() => onEdit?.(entry)}>
              <Pencil size={14} /> Modifier
            </button>
            {!isPain && (
              <button className="journal-action" onClick={() => onDuplicate?.(entry)}>
                <Copy size={14} /> Dupliquer
              </button>
            )}
            <button className="journal-action journal-action-danger" onClick={() => onDelete?.(entry)}>
              <Trash2 size={14} /> Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function cardTitle(entry) {
  if (entry.type === "pain") {
    const syms = getEntrySymptoms(entry);
    const s = getSymptom(syms[0]);
    return s ? s.label : "Douleur";
  }
  return mealLabelFromTime(entry.timestamp);
}

function cardSubtitle(entry) {
  if (entry.type === "pain") {
    const sev = getSeverity(getEntrySeverity(entry));
    return sev.label;
  }
  if (entry.dishes?.length) return entry.dishes.slice(0, 2).join(", ");
  if (entry.product_name) return entry.product_name;
  if (entry.ingredients?.length) {
    return entry.ingredients.slice(0, 3).map(i => i.nom).join(", ");
  }
  return "";
}

function MealDetails({ entry }) {
  const ingredients = entry.ingredients || [];
  const dishes = entry.dishes || [];
  const transcript = entry.transcript;

  return (
    <>
      {dishes.length > 0 && (
        <>
          <div className="journal-card-section-label">Plats</div>
          <div className="body-md" style={{ marginBottom: 12 }}>
            {dishes.join(" · ")}
          </div>
        </>
      )}

      {ingredients.length > 0 && (
        <>
          <div className="journal-card-section-label">Ingrédients</div>
          <div className="journal-chips">
            {ingredients.map((ing, i) => (
              <span key={i} className="chip">{ing.nom}</span>
            ))}
          </div>
        </>
      )}

      {entry.product_name && (
        <>
          <div className="journal-card-section-label" style={{ marginTop: 12 }}>Produit</div>
          <div className="body-md">{entry.product_name}</div>
        </>
      )}

      {transcript && (
        <div className="journal-quote">"{transcript}"</div>
      )}
    </>
  );
}

function PainDetails({ entry }) {
  const symptoms = getEntrySymptoms(entry);
  const severity = getSeverity(getEntrySeverity(entry));

  return (
    <>
      <div className="journal-card-section-label">Symptômes</div>
      <div className="journal-chips">
        {symptoms.map((key, i) => {
          const s = getSymptom(key);
          return s ? (
            <span key={i} className="chip">{s.emoji} {s.label}</span>
          ) : null;
        })}
      </div>

      <div className="journal-card-section-label" style={{ marginTop: 12 }}>Sévérité</div>
      <div className="body-md">
        {severity.emoji} {severity.label} <span className="text-muted">— {severity.desc}</span>
      </div>

      {entry.location && (
        <>
          <div className="journal-card-section-label" style={{ marginTop: 12 }}>Localisation</div>
          <div className="body-md">{entry.location}</div>
        </>
      )}

      {entry.bristol && (
        <>
          <div className="journal-card-section-label" style={{ marginTop: 12 }}>Bristol</div>
          <div className="body-md">Type {entry.bristol}</div>
        </>
      )}
    </>
  );
}
