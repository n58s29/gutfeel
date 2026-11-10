// Appels IA (via le relais Cloudflare) + Open Food Facts.
//
// v2 : l'app n'appelle plus Anthropic directement. Elle envoie la requête au
// Worker (WORKER_URL) avec le code famille ; le Worker ajoute la clé API,
// stockée chez Cloudflare, et transmet. La réponse est contrainte par un
// schéma JSON (structured outputs) : plus de JSON cassé.

import { WORKER_URL } from "../config.js";
import { getFamilyCode, loadEntries } from "./storage.js";
import { normalizeIngredients, normalizeIngredientName, deaccent, CATEGORIES } from "./foodNormalizer.js";

// ──────────────────────────────────────────────────────────────────
// Schémas de réponse
// ──────────────────────────────────────────────────────────────────

const INGREDIENT_SCHEMA = {
  type: "object",
  properties: {
    nom: { type: "string" },
    categorie: { type: "string", enum: CATEGORIES },
  },
  required: ["nom", "categorie"],
  additionalProperties: false,
};

const MEAL_SCHEMA = {
  type: "object",
  properties: {
    plats: { type: "array", items: { type: "string" } },
    ingredients: { type: "array", items: INGREDIENT_SCHEMA },
  },
  required: ["plats", "ingredients"],
  additionalProperties: false,
};

const SUGGEST_SCHEMA = {
  type: "object",
  properties: {
    ingredients: { type: "array", items: INGREDIENT_SCHEMA },
  },
  required: ["ingredients"],
  additionalProperties: false,
};

// ──────────────────────────────────────────────────────────────────
// Erreurs
// ──────────────────────────────────────────────────────────────────

export function humanizeApiError(err, status) {
  const type = err?.error?.type || "";
  const msg = err?.error?.message || "";
  if (type === "family_code_invalid" || status === 401)
    return "Code famille incorrect. Vérifie-le dans les paramètres (⚙️).";
  if (type === "forbidden_origin" || status === 403)
    return "Accès refusé par le relais IA.";
  if (status === 413)
    return "La photo est trop lourde. Réessaie avec une autre photo.";
  if (type === "overloaded_error" || status === 529 || msg.toLowerCase() === "overloaded")
    return "L'IA est surchargée en ce moment. Réessaie dans quelques secondes.";
  if (status === 429 || type === "rate_limit_error")
    return "Trop de requêtes. Attends un moment avant de réessayer.";
  if (status >= 500)
    return "Le service IA ne répond pas. Réessaie dans un instant.";
  return msg || `Erreur IA (${status})`;
}

export function isAiConfigured() {
  return !WORKER_URL.includes("REMPLACER");
}

// ──────────────────────────────────────────────────────────────────
// Appel générique au relais
// ──────────────────────────────────────────────────────────────────

async function callClaude(content, schema, maxTokens = 4000) {
  if (!isAiConfigured()) {
    throw new Error("Le relais IA n'est pas encore configuré (fichier config.js).");
  }
  const code = getFamilyCode();
  if (!code) {
    throw new Error("Entre le code famille dans les paramètres (⚙️) pour utiliser l'IA.");
  }

  let res;
  try {
    res = await fetch(`${WORKER_URL}/v1/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-family-code": code },
      body: JSON.stringify({
        max_tokens: maxTokens,
        messages: [{ role: "user", content }],
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema },
        },
      }),
    });
  } catch {
    throw new Error("Connexion impossible. Vérifie ta connexion internet.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(humanizeApiError(err, res.status));
  }
  const data = await res.json();
  if (data.stop_reason === "refusal") {
    throw new Error("L'IA n'a pas pu analyser ce contenu. Reformule ou réessaie.");
  }
  if (data.stop_reason === "max_tokens") {
    throw new Error("Repas trop long à analyser d'un coup. Découpe-le en deux saisies.");
  }
  const raw = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Réponse de l'IA illisible. Réessaie.");
  }
}

// Vérifie un code famille auprès du relais. Renvoie true / false,
// ou lève une erreur si le relais est injoignable.
export async function verifyFamilyCode(code) {
  if (!isAiConfigured()) throw new Error("Le relais IA n'est pas encore configuré (fichier config.js).");
  let res;
  try {
    res = await fetch(`${WORKER_URL}/check`, { headers: { "x-family-code": code } });
  } catch {
    throw new Error("Connexion impossible. Vérifie ta connexion internet.");
  }
  if (res.ok) return true;
  if (res.status === 401) return false;
  const err = await res.json().catch(() => ({}));
  throw new Error(humanizeApiError(err, res.status));
}

// ──────────────────────────────────────────────────────────────────
// Vocabulaire déjà utilisé dans le journal
// ──────────────────────────────────────────────────────────────────
// Donné à l'IA pour qu'elle réutilise exactement les mêmes noms
// (évite « oignon » un jour, « oignon jaune » le lendemain).

const VOCAB_LIMIT = 250;

function knownIngredientNames() {
  const counts = new Map();
  for (const e of loadEntries()) {
    if (e.type !== "meal") continue;
    for (const ing of e.ingredients || []) {
      const nom = typeof ing === "string" ? ing : ing?.nom;
      if (nom) counts.set(nom, (counts.get(nom) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, VOCAB_LIMIT)
    .map(([nom]) => nom);
}

function vocabularyBlock() {
  const names = knownIngredientNames();
  if (!names.length) return "";
  return `\nNoms d'ingrédients déjà utilisés dans ce journal. Si un ingrédient correspond à l'un d'eux, réutilise EXACTEMENT ce nom :\n${names.join(", ")}\n`;
}

const NAMING_RULES = `Règles pour les noms d'ingrédients :
- Uniquement en français (jamais d'anglais), en minuscules, au singulier.
- Le nom de l'aliment de base, sans quantité, sans marque, sans mode de cuisson, sans découpe, sans couleur : « poulet » (pas « blanc de poulet rôti »), « oignon » (pas « oignons rouges émincés »), « tomate » (pas « tomates cerises »), « lait » (pas « lait demi-écrémé »).
- Garde la précision seulement quand elle change l'aliment pour la digestion : « farine de blé », « farine de riz », « lait de coco », « crème fraîche », « fromage de chèvre », « pain complet », « haricot vert ».
- Un même aliment n'apparaît qu'une fois.
Catégories possibles : ${CATEGORIES.join(", ")}.`;

// ──────────────────────────────────────────────────────────────────
// « Rien mangé »
// ──────────────────────────────────────────────────────────────────
// v2 : on ne court-circuite l'IA que si TOUTE la phrase dit « rien mangé ».
// (v1 sortait vide sur « rien de spécial, des pâtes » à cause du mot « rien ».)

const NOTHING_PATTERNS = [
  /^(rien|nothing|aucun|zero|nada)( du tout)?$/,
  /^(j ?ai |je n ?ai |j ?ai rien |je )?(rien|pas) mange( de la journee| ce (midi|soir|matin))?( du tout)?$/,
  /^(je suis |j etais )?a jeun$/,
  /^(j ?ai )?saute (le |ce |mon )?(repas|petit dejeuner|dejeuner|diner|gouter)$/,
  /^(pas faim|jeune|skip)$/,
];

function detectNothingEaten(text) {
  const t = deaccent(text.toLowerCase())
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return NOTHING_PATTERNS.some(re => re.test(t));
}

const NOTHING_DISH_NAMES = new Set([
  "rien", "nothing", "vide", "jeûne", "jeune", "à jeun", "a jeun", "pas de repas", "aucun repas",
]);

function sanitizeResult(result) {
  const plats = (result.plats || [])
    .map(p => String(p).trim())
    .filter(p => p && !NOTHING_DISH_NAMES.has(p.toLowerCase()));
  return { plats, ingredients: normalizeIngredients(result.ingredients || []) };
}

// ──────────────────────────────────────────────────────────────────
// Texte → plats + ingrédients (vocal ou saisie texte)
// ──────────────────────────────────────────────────────────────────

export async function decomposeWithAI(text) {
  if (detectNothingEaten(text)) return { plats: [], ingredients: [] };

  const prompt = `Tu aides à tenir un journal alimentaire servant à repérer des intolérances digestives.
La personne décrit ce qu'elle a mangé. Liste les plats, puis décompose chaque plat en ingrédients élémentaires, comme dans une recette (ex. « quiche lorraine » → farine de blé, beurre, œuf, crème fraîche, lardon, lait, sel, poivre).
Inclus les ingrédients cachés très probables (beurre, huile, ail, oignon, sucre…). Pour un produit industriel, ajoute les additifs probables.
Si la personne n'a rien mangé, renvoie des listes vides.

${NAMING_RULES}
${vocabularyBlock()}
Description du repas :
"""${text}"""`;

  const parsed = await callClaude(prompt, MEAL_SCHEMA, 4000);
  return sanitizeResult(parsed);
}

// ──────────────────────────────────────────────────────────────────
// Image → ingrédients (mode : "meal" ou "label")
// ──────────────────────────────────────────────────────────────────

export async function compressImage(file) {
  return new Promise((resolve, reject) => {
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
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image illisible.")); };
    img.src = url;
  });
}

export async function analyzeImageWithAI(base64Data, mode) {
  const task = mode === "label"
    ? `Cette photo montre la liste des ingrédients d'un produit alimentaire.
Lis la liste et décompose chaque ingrédient individuellement : les ingrédients composés entre parenthèses sont remplacés par leurs sous-ingrédients (ex. « chocolat (sucre, pâte de cacao, beurre de cacao) » → sucre, cacao, beurre de cacao).
Ignore les pourcentages, les mentions d'origine (« cultivé en France »…) et les « peut contenir des traces de ». Renvoie le nom du produit dans « plats » s'il est visible, sinon une liste vide.`
    : `Cette photo montre une assiette ou un repas.
Identifie les plats, puis les ingrédients visibles et ceux très probables vu la recette (matière grasse de cuisson, sauce…).`;

  const prompt = `Tu aides à tenir un journal alimentaire servant à repérer des intolérances digestives.
${task}

${NAMING_RULES}
${vocabularyBlock()}`;

  const parsed = await callClaude([
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Data } },
    { type: "text", text: prompt },
  ], MEAL_SCHEMA, 4000);
  return sanitizeResult(parsed);
}

// ──────────────────────────────────────────────────────────────────
// Suggestions d'ingrédients (bouton ✨ de l'éditeur de repas)
// ──────────────────────────────────────────────────────────────────

export async function suggestIngredientsWithAI(dishContext, existingIngNames, query) {
  const context = dishContext ? `Plat : « ${dishContext} ». ` : "";
  const existing = existingIngNames.length
    ? `Ingrédients déjà notés : ${existingIngNames.join(", ")}. `
    : "";
  const queryPart = query
    ? `La personne cherche : « ${query} ». Priorise les ingrédients correspondant à cette recherche.`
    : "Suggère les ingrédients supplémentaires les plus probables.";

  const prompt = `Tu aides à tenir un journal alimentaire. ${context}${existing}${queryPart}
Propose jusqu'à 8 ingrédients qui ne sont PAS déjà notés.

${NAMING_RULES}
${vocabularyBlock()}`;

  const parsed = await callClaude(prompt, SUGGEST_SCHEMA, 3000);
  const existingSet = new Set(existingIngNames.map(n => normalizeIngredientName(n)));
  return normalizeIngredients(parsed.ingredients || []).filter(i => !existingSet.has(i.nom));
}

// ──────────────────────────────────────────────────────────────────
// Open Food Facts (code-barres)
// ──────────────────────────────────────────────────────────────────

// Rejette le texte qui n'est pas un ingrédient (mentions d'origine, traces…).
// v2 : test sur le texte sans accents — en JavaScript, \b ne fonctionne pas
// avec les lettres accentuées (« élevé », « excepté » n'étaient jamais filtrés).
function isLikelyIngredient(raw) {
  if (!raw || typeof raw !== "string") return false;
  const s = raw.trim();
  if (s.length < 2) return false;
  if (/^[•*()]/.test(s)) return false;
  if (/^\d/.test(s)) return false;
  const lower = deaccent(s.toLowerCase()).replace(/['’]/g, "'");
  if (/\b(hormis|sauf|excepte|exceptee|a l'exception|a l'exclusion)\b/.test(lower)) return false;
  if (/\b(cultive|cultivee|cultives|cultivees|eleve|elevee|eleves|elevees|origine|provenance|issus? de|agriculture)\b/.test(lower)) return false;
  if (/\b(sont|est|peut|proviennent|garantit|ont ete|contient|contiennent|fabrique|conditionne)\b/.test(lower)) return false;
  if (/peut contenir|traces? de|presence eventuelle/.test(lower)) return false;
  if (s.split(/\s+/).length > 6) return false;
  return true;
}

// Aplatit l'arbre d'ingrédients OFF : garde les feuilles (sous-ingrédients),
// pas les ingrédients composés. « chocolat (sucre, cacao) » → sucre, cacao.
function flattenOffIngredients(list) {
  const out = [];
  for (const i of list || []) {
    if (Array.isArray(i.ingredients) && i.ingredients.length) {
      out.push(...flattenOffIngredients(i.ingredients));
    } else if (i.text) {
      out.push(i.text);
    }
  }
  return out;
}

export async function lookupBarcode(code) {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${code}.json?lc=fr&fields=product_name,product_name_fr,image_front_url,image_url,ingredients_text,ingredients_text_fr,ingredients,additives_tags,allergens_tags,brands,lang`
  );
  const data = await res.json();
  if (data.status !== 1) return null;
  const p = data.product;

  // 1. Liste structurée OFF si le produit est décrit en français.
  const structured = (!p.lang || p.lang === "fr") ? flattenOffIngredients(p.ingredients).filter(isLikelyIngredient) : [];
  // 2. Sinon, texte français découpé (les parenthèses deviennent des séparateurs
  //    pour garder les sous-ingrédients).
  const frText = (p.ingredients_text_fr || "")
    .replace(/[()[\]]/g, ",")
    .split(/[,;]|\s-\s|\.\s/)
    .map(s => s.trim())
    .filter(isLikelyIngredient);
  // 3. En dernier recours, la liste structurée quelle que soit la langue
  //    (la normalisation traduit les noms anglais courants).
  const fallback = flattenOffIngredients(p.ingredients).filter(isLikelyIngredient);
  const allIngredients = frText.length > 0 && structured.length === 0
    ? frText
    : structured.length > 0 ? structured : fallback;

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

// Utilisé par l'enregistrement code-barres : chaînes OFF → {nom, categorie}
// normalisés et dédoublonnés.
export function normalizeBarcodeIngredients(rawIngredients) {
  return normalizeIngredients(rawIngredients || []);
}
