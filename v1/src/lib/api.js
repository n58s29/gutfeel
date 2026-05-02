// Anthropic + Open Food Facts API wrappers, ported verbatim from v0.
// All prompts and signatures match v0 exactly to preserve behavior.

import { normalizeIngredients, normalizeIngredientName, guessCategory } from "./foodNormalizer.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_HEADERS = (apiKey) => ({
  "Content-Type": "application/json",
  "x-api-key": apiKey,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
});
const MODEL = "claude-sonnet-4-20250514";

// ──────────────────────────────────────────────────────────────────
// Errors
// ──────────────────────────────────────────────────────────────────

export function humanizeApiError(err, status) {
  const type = err?.error?.type || "";
  const msg = err?.error?.message || "";
  if (type === "overloaded_error" || msg.toLowerCase() === "overloaded")
    return "L'IA est surchargée en ce moment. Réessaie dans quelques secondes.";
  if (status === 401 || type === "authentication_error")
    return "Clé API invalide. Vérifie ta clé dans les réglages.";
  if (status === 429 || type === "rate_limit_error")
    return "Trop de requêtes. Attends un moment avant de réessayer.";
  return msg || `Erreur API (${status})`;
}

// ──────────────────────────────────────────────────────────────────
// "Nothing eaten" detection
// ──────────────────────────────────────────────────────────────────

const NOTHING_PATTERNS = [
  /\brien\b/, /\bpas mang[eé]\b/, /\bn['']ai pas mang[eé]\b/, /\bje n['']ai rien\b/,
  /\bà jeun\b/, /\bjeûn[eé]\b/, /\bjeun[eé]\b/, /\bsauté (le |ce )?repas\b/,
  /\bpas faim\b/, /\bskip\b/, /\bnothing\b/, /\bzéro aliment\b/, /\baucun aliment\b/,
];

function detectNothingEaten(text) {
  const t = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return NOTHING_PATTERNS.some(re => re.test(t));
}

const NOTHING_DISH_NAMES = new Set([
  "rien", "nothing", "vide", "jeûne", "jeune", "à jeun", "a jeun", "pas de repas", "aucun repas",
]);

function sanitizeResult(result) {
  const plats = (result.plats || []).map(p => p.trim().toLowerCase());
  if (plats.length > 0 && plats.every(p => NOTHING_DISH_NAMES.has(p))) {
    return { plats: [], ingredients: [] };
  }
  return {
    ...result,
    plats: (result.plats || []).filter(p => !NOTHING_DISH_NAMES.has(p.trim().toLowerCase())),
  };
}

// ──────────────────────────────────────────────────────────────────
// Text → dishes + ingredients (voice transcript or typed text)
// ──────────────────────────────────────────────────────────────────

export async function decomposeWithAI(text, apiKey) {
  if (detectNothingEaten(text)) return { plats: [], ingredients: [] };

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: ANTHROPIC_HEADERS(apiKey),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Tu es un expert en nutrition. L'utilisateur décrit ce qu'il a mangé. Identifie TOUS les ingrédients élémentaires (non transformés). Inclus les ingrédients "cachés" courants et les additifs probables si produit industriel.
IMPORTANT : Les noms d'ingrédients doivent TOUJOURS être en français, en minuscules, au singulier. N'utilise JAMAIS de mots anglais. Exemple : "poulet" (pas "chicken"), "farine de blé" (pas "wheat flour"), "huile d'olive".
Réponds UNIQUEMENT en JSON valide sans backticks:
{"plats":["nom1","nom2"],"ingredients":[{"nom":"farine de blé","categorie":"cereale"}]}
Catégories: laitier, cereale, viande, poisson, legume, fruit, noix, epice, additif, legumineuse, oeuf, sucre, graisse, autre
Description: "${text}"`,
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(humanizeApiError(err, res.status));
  }
  const data = await res.json();
  const raw = data.content?.map(b => b.text || "").join("") || "";
  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  return sanitizeResult({
    ...parsed,
    ingredients: normalizeIngredients(parsed.ingredients || []),
  });
}

// ──────────────────────────────────────────────────────────────────
// Image → ingredients (mode: "meal" or "label")
// ──────────────────────────────────────────────────────────────────

export async function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxW = 1024;
      let w = img.width, h = img.height;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
      URL.revokeObjectURL(url);
      resolve(base64);
    };
    img.src = url;
  });
}

export async function analyzeImageWithAI(base64Data, mode, apiKey) {
  const prompt = mode === "label"
    ? `Tu es un expert en nutrition et en OCR.
Cette photo montre la liste des ingrédients d'un produit alimentaire.
1. Extrais le texte de la liste d'ingrédients visible sur l'image.
2. Décompose chaque ingrédient individuellement (sépare les ingrédients composés).
3. Catégorise chaque ingrédient parmi : laitier, cereale, viande, poisson, legume, fruit, noix, epice, additif, legumineuse, oeuf, sucre, graisse, autre.
IMPORTANT : Les noms doivent TOUJOURS être en français, en minuscules, au singulier. N'utilise JAMAIS de mots anglais (ex: "chicken" → "poulet", "wheat flour" → "farine de blé").
Réponds UNIQUEMENT en JSON : [{"nom": "...", "categorie": "..."}]
Pas de markdown, pas de commentaire, juste le JSON.`
    : `Tu es un expert en nutrition. Analyse cette photo d'assiette/repas.
Identifie tous les ingrédients visibles et probables.
Pour chaque ingrédient, donne son nom et sa catégorie parmi : laitier, cereale, viande, poisson, legume, fruit, noix, epice, additif, legumineuse, oeuf, sucre, graisse, autre.
IMPORTANT : Les noms doivent TOUJOURS être en français, en minuscules, au singulier. N'utilise JAMAIS de mots anglais (ex: "chicken" → "poulet", "wheat flour" → "farine de blé").
Réponds UNIQUEMENT en JSON : [{"nom": "...", "categorie": "..."}]
Pas de markdown, pas de commentaire, juste le JSON.`;

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: ANTHROPIC_HEADERS(apiKey),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Data } },
          { type: "text", text: prompt },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(humanizeApiError(err, res.status));
  }
  const data = await res.json();
  const raw = data.content?.map(b => b.text || "").join("") || "";
  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  const ingredients = normalizeIngredients(
    Array.isArray(parsed) ? parsed : (parsed.ingredients || [])
  );
  if (Array.isArray(parsed)) return { plats: [], ingredients };
  return { plats: parsed.plats || [], ingredients };
}

// ──────────────────────────────────────────────────────────────────
// AI ingredient suggestions (used by MealEditor "+" button)
// ──────────────────────────────────────────────────────────────────

export async function suggestIngredientsWithAI(dishContext, existingIngNames, query, apiKey) {
  const context = dishContext ? `Plat : "${dishContext}". ` : "";
  const existing = existingIngNames.length
    ? `Ingrédients déjà identifiés : ${existingIngNames.join(", ")}. `
    : "";
  const queryPart = query
    ? `L'utilisateur cherche : "${query}". Priorise les ingrédients correspondant à cette recherche.`
    : "Suggère des ingrédients supplémentaires probables.";

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: ANTHROPIC_HEADERS(apiKey),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `Tu es un expert en nutrition. ${context}${existing}${queryPart}
Propose jusqu'à 8 ingrédients supplémentaires NON DÉJÀ listés, OBLIGATOIREMENT en français, minuscules, singulier. N'utilise JAMAIS de mots anglais.
Réponds UNIQUEMENT en JSON valide sans backticks : [{"nom":"...","categorie":"..."}]
Catégories : laitier, cereale, viande, poisson, legume, fruit, noix, epice, additif, legumineuse, oeuf, sucre, graisse, autre`,
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(humanizeApiError(err, res.status));
  }
  const data = await res.json();
  const raw = data.content?.map(b => b.text || "").join("") || "";
  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  return normalizeIngredients(Array.isArray(parsed) ? parsed : []);
}

// ──────────────────────────────────────────────────────────────────
// Open Food Facts barcode lookup
// ──────────────────────────────────────────────────────────────────

function isLikelyIngredient(raw) {
  if (!raw || typeof raw !== "string") return false;
  const s = raw.trim();
  if (s.length < 2) return false;
  if (/^[•*()]/.test(s)) return false;
  if (/^\d/.test(s)) return false;
  const lower = s.toLowerCase();
  if (/\b(hormis|sauf|excepté|exceptée|à l['']exception|à l['']exclusion)\b/.test(lower)) return false;
  if (/\b(cultiv[ée]s?|élev[ée]s?|origine|provenance|issus? de|agriculture)\b/.test(lower)) return false;
  if (/\b(sont|est|peut|proviennent|garantit|ont été|contient|contiennent|fabriqué|conditionné)\b/.test(lower)) return false;
  if (/peut contenir|traces? de|présence éventuelle/.test(lower)) return false;
  if (s.split(/\s+/).length > 6) return false;
  return true;
}

export async function lookupBarcode(code) {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${code}.json?lc=fr&fields=product_name,product_name_fr,image_front_url,image_url,ingredients_text,ingredients_text_fr,ingredients,additives_tags,allergens_tags,brands`
  );
  const data = await res.json();
  if (data.status !== 1) return null;
  const p = data.product;
  const frIngredients = (p.ingredients || [])
    .filter(i => !i.lang || i.lang === "fr")
    .map(i => i.text)
    .filter(isLikelyIngredient);
  const frTextIngredients = (p.ingredients_text_fr || "")
    .split(/[,;]/)
    .map(s => s.replace(/\(.*?\)/g, "").trim())
    .filter(isLikelyIngredient);
  const fallbackIngredients = (p.ingredients || []).map(i => i.text).filter(isLikelyIngredient);
  const allIngredients = frIngredients.length > 0
    ? frIngredients
    : frTextIngredients.length > 0 ? frTextIngredients : fallbackIngredients;

  return {
    name: p.product_name_fr || p.product_name || "Produit inconnu",
    image: p.image_front_url || p.image_url || null,
    ingredients_text: p.ingredients_text_fr || p.ingredients_text || "",
    ingredients: allIngredients,
    additives: (p.additives_tags || []).map(t => t.replace(/^[a-z]{2}:/, "")),
    allergens: (p.allergens_tags || []).map(t => t.replace(/^[a-z]{2}:/, "")),
    brands: p.brands || "",
    barcode: code,
  };
}

// Used by saveProductEntry — converts OFF ingredient strings into
// normalized {nom, categorie} objects with deduplication.
export function normalizeBarcodeIngredients(rawIngredients) {
  const seen = new Set();
  return (rawIngredients || []).reduce((acc, n) => {
    const nom = normalizeIngredientName((n || "").toLowerCase());
    if (!nom || seen.has(nom)) return acc;
    seen.add(nom);
    acc.push({ nom, categorie: guessCategory(nom) });
    return acc;
  }, []);
}
