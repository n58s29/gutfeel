// Schema migrations (idempotent via flags). v1–v4 come from v0/v1 ; v5 is
// new in v2. A user opening v2 with old data gets every missing migration
// re-run automatically, in order.

import { loadEntries, persistEntries, setFlag, getFlag, loadAnalyses, persistAnalyses, LEGACY_APIKEY_KEYS, SNAPSHOT_V2_KEY } from "./storage.js";
import { normalizeIngredients, normalizeIngredientName, guessCategory } from "./foodNormalizer.js";

const MIGRATION_KEY_V1 = "mieuxdemain-migration-v1-food-normalize";
const MIGRATION_KEY_V2 = "mieuxdemain-migration-v2-barcode-cats";
const MIGRATION_KEY_V3 = "mieuxdemain-migration-v3-renormalize";
const MIGRATION_KEY_V4 = "mieuxdemain-migration-v4-seed-initial-analysis";
const MIGRATION_KEY_V5 = "mieuxdemain-migration-v5-normalizer-v2";

// Carried over from v0/App.jsx mount useEffect — kept in same order, same flags.
export function runMigrations() {
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

  // v5 (app v2) — nouveau normaliseur : singulier, œ, qualificatifs retirés
  // (« oignons rouges émincés » → « oignon »), catégories corrigées, dédup.
  // Supprime aussi les anciennes clés API : en v2 elles vivent dans le relais.
  if (!getFlag(MIGRATION_KEY_V5)) {
    let ok = false;
    try {
      const raw = loadEntries();
      // Copie de sécurité AVANT toute modification (une seule fois).
      // Si elle ne peut pas être écrite (stockage plein), on ne touche à rien
      // et on réessaiera au prochain lancement.
      if (!localStorage.getItem(SNAPSHOT_V2_KEY)) {
        localStorage.setItem(SNAPSHOT_V2_KEY, JSON.stringify(raw));
      }
      const migrated = raw.map(e =>
        e.type === "meal" && e.ingredients?.length
          ? { ...e, ingredients: normalizeIngredients(e.ingredients) }
          : e
      );
      persistEntries(migrated);
      ok = true;
    } catch {}
    try { LEGACY_APIKEY_KEYS.forEach(k => localStorage.removeItem(k)); } catch {}
    if (ok) setFlag(MIGRATION_KEY_V5);
  }
}
