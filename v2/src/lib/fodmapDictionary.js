import { normalizeIngredientName, deaccent } from "./foodNormalizer.js";

export const FODMAP_CATEGORIES = {
  fructans: { label: "Fructanes", color: "#E07A5F", bg: "#FFF5EE", border: "#FFD4C0", description: "Blé, seigle, oignon, ail…" },
  gos:      { label: "GOS / Galactanes", color: "#D4A017", bg: "#FFF8E1", border: "#FFE082", description: "Légumineuses…" },
  lactose:  { label: "Lactose", color: "#81B29A", bg: "#F0F8F4", border: "#B2DFDB", description: "Lait, yaourt, fromage frais…" },
  fructose: { label: "Fructose excédentaire", color: "#5C88C4", bg: "#EEF4FF", border: "#BBDEFB", description: "Miel, pomme, poire, mangue…" },
  polyols:  { label: "Polyols", color: "#9575CD", bg: "#F3EEF8", border: "#D1C4E9", description: "Fruits à noyau, champignons…" },
  none:     { label: "Faible FODMAP", color: "#8D99AE", bg: "#F5F5F5", border: "#E0E0E0", description: "" },
};

// ingredient name (lowercase) → array of FODMAP category keys
const MAP = {
  // ─── Fructanes ───
  "blé": ["fructans"], "farine de blé": ["fructans"], "farine": ["fructans"],
  "pain": ["fructans"], "pain de mie": ["fructans"], "baguette": ["fructans"],
  "pâtes": ["fructans"], "spaghetti": ["fructans"], "tagliatelle": ["fructans"],
  "macaroni": ["fructans"], "fusilli": ["fructans"], "linguine": ["fructans"],
  "semoule": ["fructans"], "couscous": ["fructans"], "boulgour": ["fructans"],
  "seigle": ["fructans"], "orge": ["fructans"], "épeautre": ["fructans"],
  "oignon": ["fructans"], "oignon rouge": ["fructans"], "oignon blanc": ["fructans"],
  "ail": ["fructans"], "échalote": ["fructans"], "poireau": ["fructans"],
  "asperge": ["fructans"], "artichaut": ["fructans"],
  "betterave": ["fructans"], "chou de bruxelles": ["fructans"],
  "biscuit": ["fructans"], "crackers": ["fructans"], "céréales": ["fructans"],

  // ─── GOS ───
  "lentilles": ["gos"], "lentilles vertes": ["gos"], "lentilles corail": ["gos"],
  "pois chiches": ["gos"], "houmous": ["gos"],
  "haricots rouges": ["gos"], "haricots blancs": ["gos"], "haricots noirs": ["gos"],
  "fèves": ["gos"], "edamame": ["gos"], "soja": ["gos"],
  "tofu": ["gos"], "tempeh": ["gos"],
  "pois cassés": ["gos"], "flageolets": ["gos"],
  "haricot": ["gos"], "lentille": ["gos"],

  // ─── Lactose ───
  "lait": ["lactose"], "lait de vache": ["lactose"], "lait entier": ["lactose"],
  "lait demi-écrémé": ["lactose"], "lait écrémé": ["lactose"],
  "crème": ["lactose"], "crème fraîche": ["lactose"], "crème liquide": ["lactose"],
  "fromage frais": ["lactose"], "ricotta": ["lactose"], "mascarpone": ["lactose"],
  "yaourt": ["lactose"], "yogourt": ["lactose"],
  "glace": ["lactose"], "crème glacée": ["lactose"], "sorbet au lait": ["lactose"],
  "fromage blanc": ["lactose"], "petit-suisse": ["lactose"],
  "beurre": ["lactose"], // très faible en lactose mais inclus

  // ─── Fructose excédentaire ───
  "miel": ["fructose"], "sirop d'agave": ["fructose"],
  "pomme": ["fructose", "polyols"], "jus de pomme": ["fructose"],
  "poire": ["fructose", "polyols"], "jus de poire": ["fructose"],
  "mangue": ["fructose"], "pastèque": ["fructose"],
  "figue": ["fructose"], "datte": ["fructose"], "raisin sec": ["fructose"],
  "sirop de maïs": ["fructose"], "sucre de coco": ["fructose"],
  "concentré de pomme": ["fructose"],

  // ─── Polyols ───
  "pêche": ["polyols"], "nectarine": ["polyols"], "brugnon": ["polyols"],
  "prune": ["polyols"], "pruneau": ["polyols"],
  "cerise": ["polyols"], "abricot": ["polyols"],
  "champignon": ["polyols"], "champignons de paris": ["polyols"],
  "chou-fleur": ["polyols"], "céleri": ["polyols"],
  "avocat": ["polyols"], "litchi": ["polyols"],
  "mûre": ["polyols"], "pastèque": ["fructose", "polyols"],
  "xylitol": ["polyols"], "sorbitol": ["polyols"], "mannitol": ["polyols"],
  "maltitol": ["polyols"], "érythritol": ["polyols"],

  // ─── Faible FODMAP ───
  "riz": ["none"], "riz basmati": ["none"], "riz complet": ["none"],
  "quinoa": ["none"], "maïs": ["none"], "polenta": ["none"],
  "pomme de terre": ["none"], "patate douce": ["none"],
  "carotte": ["none"], "courgette": ["none"], "concombre": ["none"],
  "salade": ["none"], "laitue": ["none"], "roquette": ["none"],
  "épinard": ["none"], "tomate": ["none"], "poivron": ["none"],
  "aubergine": ["none"], "haricots verts": ["none"], "brocoli": ["none"],
  "banane": ["none"], "raisin": ["none"], "fraise": ["none"],
  "orange": ["none"], "citron": ["none"], "kiwi": ["none"],
  "ananas": ["none"], "melon": ["none"], "papaye": ["none"],
  "canneberge": ["none"], "framboise": ["none"], "myrtille": ["none"],
  "poulet": ["none"], "dinde": ["none"], "bœuf": ["none"],
  "porc": ["none"], "agneau": ["none"], "veau": ["none"],
  "saumon": ["none"], "thon": ["none"], "cabillaud": ["none"],
  "crevette": ["none"], "œuf": ["none"],
  "fromage dur": ["none"], "parmesan": ["none"], "gruyère": ["none"],
  "emmental": ["none"], "cheddar": ["none"], "camembert": ["none"],
  "huile": ["none"], "huile d'olive": ["none"], "beurre de cacahuète": ["none"],
  "lait de coco": ["none"], "lait d'amande": ["none"], "lait sans lactose": ["none"],
  "fromage de chèvre": ["none"], "comté": ["none"], "mozzarella": ["lactose"], "feta": ["none"],
  "chocolat au lait": ["lactose"], "chocolat noir": ["none"],
  "sucre": ["none"], "sirop d'érable": ["none"], "eau": ["none"],
  "vin rouge": ["none"], "vin blanc": ["none"],
  "sel": ["none"], "poivre": ["none"],
};

// Index construit une fois : clés passées par le même normaliseur que les
// ingrédients du journal (« lentilles » → « lentille », « oeuf » → « œuf »…).
let INDEX = null;
function index() {
  if (INDEX) return INDEX;
  INDEX = new Map();
  for (const [k, v] of Object.entries(MAP)) {
    const nk = normalizeIngredientName(k) || k;
    if (!INDEX.has(nk)) INDEX.set(nk, v);
  }
  // Pour la recherche partielle : du plus long au plus court, en mots entiers.
  INDEX_PARTIAL = [...INDEX.entries()]
    .sort((a, b) => b[0].length - a[0].length)
    .map(([k, v]) => ({ re: new RegExp(`(^|[\\s'-])${deaccent(k).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[\\s'-])`), v }));
  return INDEX;
}
let INDEX_PARTIAL = [];

export function getFodmapCategories(ingredientName) {
  const key = normalizeIngredientName(ingredientName || "");
  if (!key) return null;
  const idx = index();
  if (idx.has(key)) return idx.get(key);
  // Correspondance partielle en mots entiers : « pain complet » → pain,
  // mais « volaille » ne matche plus « ail ».
  const a = deaccent(key);
  for (const { re, v } of INDEX_PARTIAL) {
    if (re.test(a)) return v;
  }
  return null; // inconnu
}

export function groupIngredientsByFodmap(ingredients) {
  const groups = {};
  ingredients.forEach(ing => {
    const cats = getFodmapCategories(ing.name || ing.nom || "");
    const cat = cats?.[0] ?? "unknown";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(ing);
  });
  return groups;
}
