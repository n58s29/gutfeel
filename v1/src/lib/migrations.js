// Schema migrations carried over verbatim from v0 (idempotent via flags).
// A user opening v1 with old v0 data will have any missing migrations
// re-run automatically. v1 ships no new migrations of its own — all
// localStorage schemas remain identical to v0.

import { loadEntries, persistEntries, setFlag, getFlag, loadAnalyses, persistAnalyses } from "./storage.js";
import { normalizeIngredients, normalizeIngredientName, guessCategory } from "./foodNormalizer.js";

const MIGRATION_KEY_V1 = "mieuxdemain-migration-v1-food-normalize";
const MIGRATION_KEY_V2 = "mieuxdemain-migration-v2-barcode-cats";
const MIGRATION_KEY_V3 = "mieuxdemain-migration-v3-renormalize";
const MIGRATION_KEY_V4 = "mieuxdemain-migration-v4-seed-initial-analysis";

// Carried over from v0/App.jsx mount useEffect — kept in same order, same flags.
export function runMigrations() {
  // Legacy: rename old "gutfeel-apikey" → "mieuxdemain-apikey" (pre-v0.7).
  const oldK = localStorage.getItem("gutfeel-apikey");
  if (oldK && !localStorage.getItem("mieuxdemain-apikey")) {
    localStorage.setItem("mieuxdemain-apikey", oldK);
  }

  // v1 — normalise les noms d'ingrédients existants.
  if (!getFlag(MIGRATION_KEY_V1)) {
    try {
      const raw = loadEntries();
      const migrated = raw.map(e =>
        e.type === "meal" && e.ingredients?.length
          ? { ...e, ingredients: normalizeIngredients(e.ingredients) }
          : e
      );
      persistEntries(migrated);
    } catch {}
    setFlag(MIGRATION_KEY_V1);
  }

  // v2 — re-catégorise les ingrédients barcode tagged "autre".
  if (!getFlag(MIGRATION_KEY_V2)) {
    try {
      const raw = loadEntries();
      const migrated = raw.map(e => {
        if (e.type === "meal" && e.source === "barcode" && e.ingredients?.length) {
          return {
            ...e,
            ingredients: e.ingredients.map(ing => ({
              ...ing,
              categorie: ing.categorie === "autre" ? guessCategory(ing.nom) : ing.categorie,
            })),
          };
        }
        return e;
      });
      persistEntries(migrated);
    } catch {}
    setFlag(MIGRATION_KEY_V2);
  }

  // v3 — re-normalise rétroactivement (anglicismes Nature Valley & co.) + dédup canonique.
  if (!getFlag(MIGRATION_KEY_V3)) {
    try {
      const raw = loadEntries();
      const migrated = raw.map(e => {
        if (e.type !== "meal" || !e.ingredients?.length) return e;
        const seen = new Set();
        const ings = e.ingredients.reduce((acc, ing) => {
          const nom = normalizeIngredientName(ing.nom);
          if (!nom || seen.has(nom)) return acc;
          seen.add(nom);
          acc.push({ ...ing, nom });
          return acc;
        }, []);
        return { ...e, ingredients: ings };
      });
      persistEntries(migrated);
    } catch {}
    setFlag(MIGRATION_KEY_V3);
  }

  // v4 — seed an initial analysis covering existing data, so the new
  // "analyse en cours" filter has something to work with. startDate is
  // backdated to the oldest entry (or now, if there are none yet) so
  // pre-existing users see their full history analysed exactly as before.
  if (!getFlag(MIGRATION_KEY_V4)) {
    try {
      if (loadAnalyses().length === 0) {
        const entries = loadEntries();
        const oldest = entries.reduce((min, e) => {
          const t = new Date(e.timestamp).getTime();
          return Number.isFinite(t) && (min === null || t < min) ? t : min;
        }, null);
        const startDate = oldest !== null
          ? new Date(oldest).toISOString()
          : new Date().toISOString();
        persistAnalyses([{
          id: "an_initial",
          label: "Analyse initiale",
          startDate,
        }]);
      }
    } catch {}
    setFlag(MIGRATION_KEY_V4);
  }
}
