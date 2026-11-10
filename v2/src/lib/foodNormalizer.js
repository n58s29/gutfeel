/**
 * Normalisation des noms d'ingrédients vers une forme canonique française.
 *
 * Objectif : un même aliment = un seul nom, quelle que soit la source
 * (vocal, texte, photo, code-barres, saisie manuelle). Pipeline :
 *   1. nettoyage (minuscules, œ, pourcentages, parenthèses, quantités, articles)
 *   2. synonymes exacts (anglais, variantes)
 *   3. suppression des qualificatifs (cuisson, découpe, bio, couleur…)
 *   4. passage au singulier
 *   5. synonymes + correction des accents manquants
 */

export const CATEGORIES = [
  "laitier", "cereale", "viande", "poisson", "legume", "fruit", "noix",
  "epice", "additif", "legumineuse", "oeuf", "sucre", "graisse", "autre",
];

// ── Synonymes : variante → nom canonique (canoniques au singulier) ──
const SYNONYMS = {
  // Anglais
  "chicken": "poulet", "beef": "bœuf", "pork": "porc", "lamb": "agneau", "veal": "veau",
  "turkey": "dinde", "duck": "canard", "ham": "jambon", "salmon": "saumon", "tuna": "thon",
  "shrimp": "crevette", "prawn": "crevette", "cod": "cabillaud", "egg": "œuf", "eggs": "œuf",
  "milk": "lait", "butter": "beurre", "cheese": "fromage", "cream": "crème",
  "yogurt": "yaourt", "yoghurt": "yaourt", "wheat": "blé", "wheat flour": "farine de blé",
  "flour": "farine", "sugar": "sucre", "salt": "sel", "pepper": "poivre", "black pepper": "poivre",
  "garlic": "ail", "onion": "oignon", "tomato": "tomate", "tomatoes": "tomate",
  "potato": "pomme de terre", "potatoes": "pomme de terre", "sweet potato": "patate douce",
  "rice": "riz", "pasta": "pâtes", "bread": "pain", "oil": "huile", "olive oil": "huile d'olive",
  "sunflower oil": "huile de tournesol", "rapeseed oil": "huile de colza", "palm oil": "huile de palme",
  "apple": "pomme", "banana": "banane", "lemon": "citron", "strawberry": "fraise",
  "carrot": "carotte", "broccoli": "brocoli", "spinach": "épinard", "lettuce": "laitue",
  "mushroom": "champignon", "mushrooms": "champignon", "corn": "maïs", "soy": "soja", "soya": "soja",
  "soy sauce": "sauce soja", "yeast": "levure", "vinegar": "vinaigre", "honey": "miel",
  "chocolate": "chocolat", "cocoa": "cacao", "cinnamon": "cannelle", "ginger": "gingembre",
  "vanilla": "vanille", "almond": "amande", "almonds": "amande", "walnut": "noix", "walnuts": "noix",
  "hazelnut": "noisette", "hazelnuts": "noisette", "peanut": "arachide", "peanuts": "arachide",
  "cashew": "noix de cajou", "cashews": "noix de cajou", "lentils": "lentille",
  "chickpeas": "pois chiche", "beans": "haricot", "oats": "avoine", "barley": "orge", "rye": "seigle",
  "cream cheese": "fromage frais", "sour cream": "crème aigre", "heavy cream": "crème",
  "whipping cream": "crème", "parsley": "persil", "cilantro": "coriandre", "coriander": "coriandre",
  "thyme": "thym", "rosemary": "romarin", "basil": "basilic", "mint": "menthe",
  "turmeric": "curcuma", "nutmeg": "noix de muscade", "mustard": "moutarde", "celery": "céleri",
  "leek": "poireau", "zucchini": "courgette", "courgettes": "courgette", "eggplant": "aubergine",
  "bell pepper": "poivron", "peas": "petits pois", "green beans": "haricot vert",
  "asparagus": "asperge", "cauliflower": "chou-fleur", "cabbage": "chou", "beet": "betterave",
  "beetroot": "betterave", "turnip": "navet", "cucumber": "concombre", "peach": "pêche",
  "pear": "poire", "grape": "raisin", "grapes": "raisin", "cherry": "cerise", "cherries": "cerise",
  "pineapple": "ananas", "mango": "mangue", "avocado": "avocat", "water": "eau",
  "whey": "lactosérum", "skimmed milk powder": "lait", "milk powder": "lait",
  "glucose syrup": "sirop de glucose", "soy protein": "protéine de soja", "soy lecithin": "lécithine de soja",

  // Synonymes français
  "patate": "pomme de terre", "frite": "pomme de terre", "chips": "pomme de terre",
  "pomme frite": "pomme de terre", "pommes frites": "pomme de terre", "pomme vapeur": "pomme de terre",
  "pommes vapeur": "pomme de terre", "pomme sautée": "pomme de terre", "pommes sautées": "pomme de terre",
  "purée": "pomme de terre", "purée de pomme de terre": "pomme de terre",
  "steak": "bœuf", "steak haché": "bœuf", "viande hachée": "bœuf", "viande de bœuf": "bœuf",
  "blanc de poulet": "poulet", "filet de poulet": "poulet", "escalope de poulet": "poulet",
  "cuisse de poulet": "poulet", "aiguillette de poulet": "poulet", "escalope de dinde": "dinde",
  "filet de dinde": "dinde", "côte de porc": "porc", "filet mignon": "porc",
  "filet de saumon": "saumon", "pavé de saumon": "saumon", "filet de cabillaud": "cabillaud",
  "dos de cabillaud": "cabillaud", "thon en boîte": "thon",
  "jaune d'œuf": "œuf", "blanc d'œuf": "œuf", "œuf entier": "œuf",
  "yoghourt": "yaourt", "yogourt": "yaourt", "yaourt nature": "yaourt",
  "cacahuète": "arachide", "cacahouète": "arachide",
  "beurre de cacahouète": "beurre de cacahuète",
  "lardon": "lardon", "bacon": "bacon",
  "maïzena": "fécule de maïs", "maizena": "fécule de maïs", "amidon de maïs": "fécule de maïs",
  "bicarbonate": "bicarbonate de soude",
  "sauce de soja": "sauce soja",
  "cube de bouillon": "bouillon", "bouillon cube": "bouillon",
  "huile d olive": "huile d'olive", "huile dolive": "huile d'olive",
  "fromage blanc battu": "fromage blanc", "petit suisse": "petit-suisse",
  "crème liquide": "crème", "crème entière": "crème", "crème légère": "crème", "crème fleurette": "crème",
  "crème épaisse": "crème fraîche",
  "pâte": "pâtes", "spaghetti": "pâtes", "spaghettis": "pâtes", "tagliatelle": "pâtes",
  "tagliatelles": "pâtes", "penne": "pâtes", "macaroni": "pâtes", "fusilli": "pâtes",
  "coquillette": "pâtes", "linguine": "pâtes", "nouille": "pâtes",
  "baguette": "pain", "pain de campagne": "pain", "pain blanc": "pain",
  "pain complet": "pain complet", "pain de mie": "pain de mie",
  "salade verte": "salade", "mâche": "salade", "laitue": "salade",
  "petit pois": "petits pois", "pois": "petits pois",
  "lait de vache": "lait", "lait demi écrémé": "lait",
  "sucre blanc": "sucre", "sucre roux": "sucre", "sucre de canne": "sucre", "sucre glace": "sucre",
  "cassonade": "sucre", "saccharose": "sucre",
  "sel de mer": "sel", "fleur de sel": "sel", "sel fin": "sel",
  "poivre noir": "poivre", "poivre blanc": "poivre",
  "gousse d'ail": "ail",
  "jus de citron": "citron", "zeste de citron": "citron",
  "concentré de tomate": "concentré de tomate", "coulis de tomate": "tomate", "sauce tomate": "tomate",
  "tomate concassée": "tomate", "pulpe de tomate": "tomate",
};

// Noms à garder tels quels (pluriels assumés ou qualificatifs signifiants).
const PROTECTED = new Set([
  "pâtes", "petits pois", "crème fraîche", "fromage frais", "fromage blanc", "jambon cru",
  "jambon blanc", "lait de coco", "lait d'amande", "lait de soja", "lait d'avoine", "lait de riz",
  "haricot vert", "haricot rouge", "haricot blanc", "haricot noir", "vin rouge", "vin blanc",
  "chocolat noir", "chocolat blanc", "chocolat au lait", "pain complet", "pain de mie",
  "riz complet", "fruits de mer", "fines herbes", "herbes de provence", "rillettes",
  "noix de coco", "noix de cajou", "noix de muscade", "pomme de terre", "patate douce",
  "saumon fumé", "sauce soja", "poivre", "sel", "œuf", "eau", "eau gazeuse",
]);

// Mots invariables (ne pas retirer le s/x final).
const INVARIANT = new Set([
  "pois", "noix", "riz", "maïs", "jus", "radis", "ananas", "cassis", "anis", "brebis", "gras",
  "frais", "épais", "gros", "os", "panais", "salsifis", "chips", "pastis", "couscous",
  "tapas", "nachos", "fois", "bras", "cervelas", "pâtes", "rillettes", "lys", "tournedos",
  "anchois", "chamallows", "abats",
]);

// Qualificatifs supprimés quand ils suivent le nom (cuisson, état, découpe…).
const QUALIFIERS = [
  "bio", "biologique", "maison", "fait maison", "de saison", "nature", "extra", "vierge",
  "vierge extra", "extra vierge", "surgelé", "surgelée", "surgelés", "surgelées",
  "en conserve", "en boîte", "frais", "fraîche", "fraîches", "entier", "entière", "entiers",
  "entières", "demi-écrémé", "demi écrémé", "écrémé", "écrémée", "allégé", "allégée",
  "cuit", "cuite", "cuits", "cuites", "précuit", "précuite", "rôti", "rôtie", "rôtis", "rôties",
  "grillé", "grillée", "grillés", "grillées", "poêlé", "poêlée", "poêlés", "poêlées",
  "sauté", "sautée", "sautés", "sautées", "braisé", "braisée", "mijoté", "mijotée",
  "vapeur", "à la vapeur", "bouilli", "bouillie", "frit", "frite", "frits", "frites",
  "au four", "à la poêle", "pané", "panée", "panés", "panées", "émincé", "émincée",
  "émincés", "émincées", "haché", "hachée", "hachés", "hachées", "râpé", "râpée", "râpés",
  "râpées", "en dés", "en cubes", "en morceaux", "en tranches", "en lamelles", "en rondelles",
  "en julienne", "tranché", "tranchée", "coupé", "coupée", "coupés", "coupées",
  "mûr", "mûre", "mûrs", "mûres", "moulu", "moulue", "en poudre", "en grains", "séché",
  "séchée", "séchés", "séchées", "déshydraté", "déshydratée", "pelé", "pelée", "pelés",
  "pelées", "épluché", "épluchée", "dénoyauté", "dénoyautées", "doux", "douce",
  "complet", "complète", "complets", "complètes", "basmati", "thaï", "de camargue",
];

// Couleurs supprimées seulement pour ces aliments (ailleurs elles changent l'aliment).
const COLOR_HEADS = new Set([
  "oignon", "poivron", "chou", "raisin", "lentille", "riz", "quinoa", "pomme", "olive",
  "échalote", "tomate", "carotte", "betterave", "poire", "pâtes", "salade", "cerise",
]);
const COLORS = [
  "rouge", "rouges", "blanc", "blanche", "blancs", "blanches", "vert", "verte", "verts", "vertes",
  "jaune", "jaunes", "noir", "noire", "noirs", "noires", "corail", "violet", "violette",
  "violets", "violettes", "doré", "dorée", "dorés", "dorées", "brun", "brune", "rosé", "rose",
];

const ARTICLES = /^(?:de la |de l'|du |des |de |d'|un |une |le |la |les |l'|quelques |un peu de |un peu d')+/;
const UNITS = "g|gr|grammes?|kg|mg|ml|cl|dl|l|litres?|cuill[eè]res?(?: à (?:soupe|café))?|c\\.? ?à ?[sc]\\.?|cas|cac|tasses?|verres?|bols?|tranches?|morceaux?|pincées?|gousses?|brins?|feuilles?|poignées?|boîtes?|sachets?|portions?|parts?|pots?";
const QUANTITY = new RegExp(`^\\d+(?:[.,]\\d+)?\\s*(?:${UNITS})?\\s*(?:de |d')?`);
// Contenants / mesures sans chiffre : « tranche de pain », « carré de chocolat ».
const MEASURE = /^(?:tranches?|morceaux?|cuill[eè]res?(?: à (?:soupe|café))?|bols?|verres?|tasses?|parts?|portions?|poignées?|pincées?|gousses?|brins?|feuilles?|boules?|carrés?|bouteilles?|canettes?|pots?|boîtes?|sachets?|paquets?|assiettes?|filet d'huile|trait) (?:de |d')/;

// Ordre décroissant de longueur pour retirer d'abord les expressions longues.
const QUALIFIERS_SORTED = [...QUALIFIERS].sort((a, b) => b.length - a.length);
const COLORS_SET = new Set(COLORS);

export function deaccent(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae");
}

function basicClean(raw) {
  let s = String(raw).normalize("NFC").toLowerCase();
  s = s.replace(/[’`]/g, "'");
  s = s.replace(/_/g, " ").replace(/\*/g, " ");
  s = s.replace(/\([^)]*\)|\[[^\]]*\]/g, " ");         // contenu entre parenthèses
  s = s.replace(/\d+(?:[.,]\d+)?\s*%/g, " ");           // pourcentages
  s = s.replace(/oeu/g, "œu");                          // oeuf, boeuf, coeur → œ
  s = s.replace(/[.;:!?"«»]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(QUANTITY, "").trim();
  s = s.replace(ARTICLES, "").trim();
  s = s.replace(MEASURE, "").trim();
  s = s.replace(ARTICLES, "").trim();
  s = s.replace(/^[-–•,\s]+|[-–•,\s]+$/g, "");
  return s;
}

function stripQualifiers(s) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const q of QUALIFIERS_SORTED) {
      if (s.endsWith(" " + q)) {
        const next = s.slice(0, -(q.length + 1)).trim();
        if (next && !PROTECTED.has(s)) { s = next; changed = true; }
      }
    }
    const words = s.split(" ");
    if (words.length >= 2 && COLORS_SET.has(words[words.length - 1])) {
      const head = singularWord(words[0]);
      if (COLOR_HEADS.has(head) && !PROTECTED.has(s)) {
        s = words.slice(0, -1).join(" ");
        changed = true;
      }
    }
  }
  return s;
}

function singularWord(w) {
  if (!w || w.length <= 3 || INVARIANT.has(w)) return w;
  if (w.endsWith("eaux")) return w.slice(0, -1);   // poireaux → poireau
  if (w.endsWith("oux")) return w.slice(0, -1);    // choux → chou
  if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

// Singulier sur les mots avant la première préposition :
// « pommes de terre » → « pomme de terre », « pois chiches » → « pois chiche ».
function singularize(s) {
  if (PROTECTED.has(s)) return s;
  const words = s.split(" ");
  const out = [];
  let afterPrep = false;
  for (const w of words) {
    if (/^(de|d'.*|du|des|à|au|aux|en|et|l'.*)$/.test(w)) afterPrep = true;
    out.push(afterPrep ? w : w.split("-").map(singularWord).join("-"));
  }
  return out.join(" ");
}

// Index sans accents de tous les noms canoniques connus (pour « creme fraiche » → « crème fraîche »).
let CANONICAL_ASCII = null;
function canonicalAscii() {
  if (CANONICAL_ASCII) return CANONICAL_ASCII;
  CANONICAL_ASCII = new Map();
  const add = (name) => { const k = deaccent(name); if (!CANONICAL_ASCII.has(k)) CANONICAL_ASCII.set(k, name); };
  Object.values(SYNONYMS).forEach(add);
  PROTECTED.forEach(add);
  Object.values(CATEGORY_KEYWORDS).flat().forEach(add);
  Object.keys(SYNONYMS).forEach(k => { const v = SYNONYMS[k]; const a = deaccent(k); if (!CANONICAL_ASCII.has(a)) CANONICAL_ASCII.set(a, v); });
  return CANONICAL_ASCII;
}

function lookup(s) {
  if (SYNONYMS[s]) return SYNONYMS[s];
  if (PROTECTED.has(s)) return s;
  const a = canonicalAscii().get(deaccent(s));
  return a || null;
}

/**
 * Normalise un nom d'ingrédient vers sa forme canonique française.
 */
export function normalizeIngredientName(name) {
  if (!name || typeof name !== "string") return "";
  let s = basicClean(name);
  if (!s) return "";
  const direct = lookup(s) || lookup(singularize(s));
  if (direct) return direct;
  s = stripQualifiers(s);
  s = singularize(s);
  s = stripQualifiers(s);
  return lookup(s) || s;
}

// ── Catégories ──────────────────────────────────────────────────────
// Comparaison par mots entiers, le mot-clé le plus long l'emporte
// (« beurre de cacahuète » → noix, pas laitier ; « volaille » ≠ « ail »).
const CATEGORY_OVERRIDES = {
  "pomme de terre": "legume", "patate douce": "legume", "lait de coco": "noix",
  "lait d'amande": "noix", "lait de soja": "legumineuse", "beurre de cacao": "graisse",
  "beurre de cacahuète": "noix", "crème de marron": "sucre", "sauce soja": "epice",
  "noix de muscade": "epice", "vinaigre": "epice", "levure": "autre", "eau": "autre",
};

const CATEGORY_KEYWORDS = {
  laitier:     ["lait", "crème", "crème fraîche", "beurre", "fromage", "fromage blanc", "fromage frais", "yaourt", "lactose", "caséine", "caséinate", "lactosérum", "mozzarella", "parmesan", "comté", "gruyère", "gouda", "cheddar", "brie", "camembert", "roquefort", "emmental", "mascarpone", "ricotta", "skyr", "feta", "chèvre", "raclette", "reblochon", "petit-suisse", "babeurre", "kéfir"],
  cereale:     ["farine", "blé", "blé dur", "seigle", "orge", "avoine", "épeautre", "gluten", "amidon", "fécule", "pâtes", "semoule", "céréale", "flocon", "son", "riz", "pain", "pain complet", "pain de mie", "maïs", "quinoa", "sarrasin", "polenta", "couscous", "boulgour", "biscuit", "brioche", "croissant", "biscotte", "cracker", "galette", "crêpe", "pizza", "tortilla", "malt"],
  viande:      ["poulet", "bœuf", "porc", "agneau", "veau", "dinde", "canard", "jambon", "jambon cru", "jambon blanc", "bacon", "lardon", "saucisse", "saucisson", "chorizo", "merguez", "viande", "volaille", "lapin", "pancetta", "rillettes", "pâté", "foie", "gélatine"],
  poisson:     ["saumon", "saumon fumé", "thon", "cabillaud", "sole", "truite", "sardine", "anchois", "maquereau", "dorade", "poisson", "crevette", "moule", "huître", "homard", "crabe", "colin", "merlu", "lieu", "surimi", "calamar", "fruits de mer", "noix de saint-jacques"],
  legume:      ["carotte", "tomate", "oignon", "ail", "échalote", "poireau", "courgette", "aubergine", "poivron", "brocoli", "chou", "chou-fleur", "épinard", "céleri", "betterave", "navet", "radis", "concombre", "salade", "endive", "champignon", "asperge", "artichaut", "fenouil", "haricot vert", "petits pois", "courge", "potiron", "butternut", "panais", "roquette", "cornichon", "olive", "légume"],
  fruit:       ["pomme", "poire", "banane", "orange", "citron", "fraise", "cerise", "raisin", "pêche", "abricot", "mangue", "ananas", "kiwi", "melon", "pastèque", "framboise", "myrtille", "figue", "datte", "prune", "pruneau", "avocat", "nectarine", "clémentine", "mandarine", "pamplemousse", "grenade", "litchi", "fruit", "compote", "marron", "châtaigne"],
  noix:        ["amande", "noisette", "pistache", "noix", "noix de cajou", "arachide", "noix de coco", "coco", "sésame", "graine", "graine de lin", "graine de chia", "graine de tournesol", "pignon", "noix de pécan"],
  epice:       ["sel", "poivre", "cannelle", "cumin", "curcuma", "paprika", "coriandre", "gingembre", "muscade", "cardamome", "curry", "thym", "romarin", "basilic", "persil", "menthe", "laurier", "safran", "vanille", "arôme", "moutarde", "ciboulette", "estragon", "origan", "piment", "herbes de provence", "fines herbes", "ketchup", "mayonnaise", "sauce", "bouillon", "épice"],
  additif:     ["phosphate", "carbonate", "nitrite", "nitrate", "sorbate", "benzoate", "citrate", "colorant", "conservateur", "émulsifiant", "stabilisant", "épaississant", "gélifiant", "antioxydant", "lécithine", "carraghénane", "gomme", "pectine", "agar", "cellulose", "maltodextrine", "bicarbonate de soude", "levure chimique", "poudre à lever", "acide", "acide ascorbique", "acide citrique", "tocophérol", "diphosphate", "correcteur d'acidité", "exhausteur de goût", "glutamate", "sorbitol", "xylitol", "maltitol", "mannitol", "érythritol", "aspartame", "sucralose", "acésulfame", "stévia"],
  legumineuse: ["lentille", "pois chiche", "haricot", "haricot rouge", "haricot blanc", "soja", "fève", "pois cassé", "lupin", "edamame", "tofu", "tempeh", "flageolet", "houmous", "protéine de soja"],
  oeuf:        ["œuf", "albumine", "ovalbumine"],
  sucre:       ["sucre", "miel", "sirop", "sirop de glucose", "caramel", "fructose", "glucose", "dextrose", "chocolat", "cacao", "confiture", "nutella", "pâte à tartiner", "sirop d'agave", "sirop d'érable", "bonbon", "gâteau", "glace", "sorbet"],
  graisse:     ["huile", "huile d'olive", "huile de tournesol", "huile de colza", "huile de palme", "margarine", "saindoux", "graisse", "graisse végétale", "matière grasse"],
};

// Liste aplatie [mot-clé, catégorie, regex], triée du plus long au plus court.
let KEYWORD_INDEX = null;
function keywordIndex() {
  if (KEYWORD_INDEX) return KEYWORD_INDEX;
  KEYWORD_INDEX = [];
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of kws) {
      const esc = deaccent(kw).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      KEYWORD_INDEX.push({ kw, cat, re: new RegExp(`(^|[\\s'-])${esc}(s|x)?($|[\\s'-])`) });
    }
  }
  KEYWORD_INDEX.sort((a, b) => b.kw.length - a.kw.length);
  return KEYWORD_INDEX;
}

/**
 * Devine la catégorie d'un ingrédient (déjà normalisé de préférence).
 */
export function guessCategory(name) {
  if (!name) return "autre";
  const n = normalizeIngredientName(name) || String(name).toLowerCase();
  if (CATEGORY_OVERRIDES[n]) return CATEGORY_OVERRIDES[n];
  if (/(^|\s)e ?\d{3,4}[a-z]?(\s|$)/i.test(n)) return "additif";
  const a = deaccent(n);
  for (const { cat, re } of keywordIndex()) {
    if (re.test(a)) return cat;
  }
  return "autre";
}

// Catégorie finale : le dictionnaire local prime (cohérence entre sources),
// sinon la catégorie proposée par l'IA si elle est valide.
export function resolveCategory(nom, proposed) {
  const g = guessCategory(nom);
  if (g !== "autre") return g;
  return CATEGORIES.includes(proposed) ? proposed : "autre";
}

/**
 * Normalise et dédoublonne une liste d'ingrédients.
 * Accepte des objets {nom, categorie} ou des chaînes.
 */
export function normalizeIngredients(ingredients) {
  if (!Array.isArray(ingredients)) return [];
  const seen = new Set();
  const out = [];
  for (const ing of ingredients) {
    const rawName = typeof ing === "string" ? ing : ing?.nom;
    const nom = normalizeIngredientName(rawName);
    if (!nom || seen.has(nom)) continue;
    seen.add(nom);
    const base = typeof ing === "string" ? {} : ing;
    out.push({ ...base, nom, categorie: resolveCategory(nom, base.categorie) });
  }
  return out;
}
