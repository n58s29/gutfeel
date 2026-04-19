import { useState, useEffect, useRef, useMemo } from "react";
import { Mic, MicOff, ScanBarcode, Frown, ChevronLeft, Check, X, Trash2, Loader2, Search, ChevronDown, ChevronUp, Zap, Settings, Key, ExternalLink, Download, Pencil, Save, Home, ShieldAlert, Activity, MessageSquare, ScanLine, Type, Camera, Tag, Copy, Plus, Sparkles } from "lucide-react";
import { SYMPTOM_TYPES as SYMPTOM_TYPES_LIB } from "./lib/symptomTypes.js";
import { normalizeIngredients, guessCategory } from "./lib/foodNormalizer.js";
import SymptomForm from "./components/SymptomForm/SymptomForm.jsx";
import AnalysisDashboard from "./components/Analysis/AnalysisDashboard.jsx";
import InfoPanel from "./components/InfoPanel.jsx";

const CAT_EMOJI = { laitier:"🥛", cereale:"🌾", viande:"🥩", poisson:"🐟", legume:"🥦", fruit:"🍎", noix:"🥜", epice:"🌶️", additif:"🧪", legumineuse:"🫘", oeuf:"🥚", sucre:"🍬", graisse:"🫒", autre:"🔹" };
const CAT_LABEL = { laitier:"Produits laitiers", cereale:"Céréales & Gluten", viande:"Viandes", poisson:"Poissons", legume:"Légumes", fruit:"Fruits", noix:"Noix & Graines", epice:"Épices & Condiments", additif:"Additifs", legumineuse:"Légumineuses", oeuf:"Œufs", sucre:"Sucres", graisse:"Huiles & Graisses", autre:"Autres" };
const PAIN_LEVELS = [{ v:1, emoji:"😐", label:"Léger", color:"#FFE082" }, { v:2, emoji:"😣", label:"Moyen", color:"#FFB74D" }, { v:3, emoji:"🤢", label:"Fort", color:"#EF9A9A" }];
const PORTION_SIZES = [{ v:"small", emoji:"🥣", label:"Petite" }, { v:"normal", emoji:"🍽️", label:"Normale" }, { v:"large", emoji:"🫕", label:"Grande" }];
// Use the canonical list from lib — aliased for backwards-compat with rest of file
const SYMPTOM_TYPES = SYMPTOM_TYPES_LIB;
const STORAGE_KEY = "mieuxdemain-entries";
const APIKEY_KEY = "mieuxdemain-apikey";
const MIGRATION_KEY = "mieuxdemain-migration-v1-food-normalize";
const MIGRATION_KEY_V2 = "mieuxdemain-migration-v2-barcode-cats";
const LOOKBACK_HOURS = 24;

function loadEntries() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function persistEntries(e) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(e)); } catch {} }
function getApiKey() { return localStorage.getItem(APIKEY_KEY) || ""; }
function setApiKeyStore(k) { localStorage.setItem(APIKEY_KEY, k); }
function humanizeApiError(err, status) {
  const type = err?.error?.type || "";
  const msg = err?.error?.message || "";
  if (type === "overloaded_error" || msg.toLowerCase() === "overloaded") return "L'IA est surchargée en ce moment. Réessaie dans quelques secondes.";
  if (status === 401 || type === "authentication_error") return "Clé API invalide. Vérifie ta clé dans les réglages.";
  if (status === 429 || type === "rate_limit_error") return "Trop de requêtes. Attends un moment avant de réessayer.";
  return msg || `Erreur API (${status})`;
}

async function suggestIngredientsWithAI(dishContext, existingIngNames, query, apiKey) {
  const context = dishContext ? `Plat : "${dishContext}". ` : "";
  const existing = existingIngNames.length ? `Ingrédients déjà identifiés : ${existingIngNames.join(", ")}. ` : "";
  const queryPart = query ? `L'utilisateur cherche : "${query}". Priorise les ingrédients correspondant à cette recherche.` : "Suggère des ingrédients supplémentaires probables.";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 500,
      messages: [{ role: "user", content: `Tu es un expert en nutrition. ${context}${existing}${queryPart}
Propose jusqu'à 8 ingrédients supplémentaires NON DÉJÀ listés, en français, minuscules, singulier.
Réponds UNIQUEMENT en JSON valide sans backticks : [{"nom":"...","categorie":"..."}]
Catégories : laitier, cereale, viande, poisson, legume, fruit, noix, epice, additif, legumineuse, oeuf, sucre, graisse, autre` }] })
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(humanizeApiError(err, res.status)); }
  const data = await res.json();
  const raw = data.content?.map(b => b.text || "").join("") || "";
  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  return normalizeIngredients(Array.isArray(parsed) ? parsed : []);
}

const NOTHING_PATTERNS = [
  /\brien\b/, /\bpas mang[eé]\b/, /\bn['']ai pas mang[eé]\b/, /\bje n['']ai rien\b/,
  /\bà jeun\b/, /\bjeûn[eé]\b/, /\bjeun[eé]\b/, /\bsauté (le |ce )?repas\b/,
  /\bpas faim\b/, /\bskip\b/, /\bnothing\b/, /\bzéro aliment\b/, /\baucun aliment\b/,
];
function detectNothingEaten(text) {
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return NOTHING_PATTERNS.some(re => re.test(t));
}

const NOTHING_DISH_NAMES = new Set(["rien", "nothing", "vide", "jeûne", "jeune", "à jeun", "a jeun", "pas de repas", "aucun repas"]);
function sanitizeResult(result) {
  // Si tous les plats sont des variantes de "rien", vider les ingrédients inventés
  const plats = (result.plats || []).map(p => p.trim().toLowerCase());
  if (plats.length > 0 && plats.every(p => NOTHING_DISH_NAMES.has(p))) {
    return { plats: [], ingredients: [] };
  }
  // Retirer "rien" des plats s'il apparaît mélangé avec de vrais plats
  return {
    ...result,
    plats: (result.plats || []).filter(p => !NOTHING_DISH_NAMES.has(p.trim().toLowerCase())),
  };
}

async function decomposeWithAI(text, apiKey) {
  if (detectNothingEaten(text)) return { plats: [], ingredients: [] };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000,
      messages: [{ role: "user", content: `Tu es un expert en nutrition. L'utilisateur décrit ce qu'il a mangé. Identifie TOUS les ingrédients élémentaires (non transformés). Inclus les ingrédients "cachés" courants et les additifs probables si produit industriel.
IMPORTANT : Les noms d'ingrédients doivent TOUJOURS être en français, en minuscules, au singulier. Exemple : "poulet", "farine de blé", "huile d'olive".
Réponds UNIQUEMENT en JSON valide sans backticks:
{"plats":["nom1","nom2"],"ingredients":[{"nom":"farine de blé","categorie":"cereale"}]}
Catégories: laitier, cereale, viande, poisson, legume, fruit, noix, epice, additif, legumineuse, oeuf, sucre, graisse, autre
Description: "${text}"` }] })
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(humanizeApiError(err, res.status)); }
  const data = await res.json();
  const raw = data.content?.map(b => b.text || "").join("") || "";
  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  return sanitizeResult({ ...parsed, ingredients: normalizeIngredients(parsed.ingredients || []) });
}

async function lookupBarcode(code) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?lc=fr&fields=product_name,product_name_fr,image_front_url,image_url,ingredients_text,ingredients_text_fr,ingredients,additives_tags,allergens_tags,brands`);
  const data = await res.json();
  if (data.status !== 1) return null;
  const p = data.product;
  const frIngredients = (p.ingredients || []).filter(i => !i.lang || i.lang === "fr").map(i => i.text);
  const allIngredients = frIngredients.length > 0 ? frIngredients : (p.ingredients || []).map(i => i.text);
  return { name: p.product_name_fr || p.product_name || "Produit inconnu", image: p.image_front_url || p.image_url || null, ingredients_text: p.ingredients_text_fr || "", ingredients: allIngredients, additives: (p.additives_tags || []).map(t => t.replace("en:", "")), allergens: (p.allergens_tags || []).map(t => t.replace("en:", "")), brands: p.brands || "", barcode: code };
}

async function compressImage(file) {
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

async function analyzeImageWithAI(base64Data, mode, apiKey) {
  const prompt = mode === "label"
    ? `Tu es un expert en nutrition et en OCR.\nCette photo montre la liste des ingrédients d'un produit alimentaire.\n1. Extrais le texte de la liste d'ingrédients visible sur l'image.\n2. Décompose chaque ingrédient individuellement (sépare les ingrédients composés).\n3. Catégorise chaque ingrédient parmi : laitier, cereale, viande, poisson, legume, fruit, noix, epice, additif, legumineuse, oeuf, sucre, graisse, autre.\nIMPORTANT : Les noms doivent TOUJOURS être en français, en minuscules, au singulier.\nRéponds UNIQUEMENT en JSON : [{"nom": "...", "categorie": "..."}]\nPas de markdown, pas de commentaire, juste le JSON.`
    : `Tu es un expert en nutrition. Analyse cette photo d'assiette/repas.\nIdentifie tous les ingrédients visibles et probables.\nPour chaque ingrédient, donne son nom et sa catégorie parmi : laitier, cereale, viande, poisson, legume, fruit, noix, epice, additif, legumineuse, oeuf, sucre, graisse, autre.\nIMPORTANT : Les noms doivent TOUJOURS être en français, en minuscules, au singulier.\nRéponds UNIQUEMENT en JSON : [{"nom": "...", "categorie": "..."}]\nPas de markdown, pas de commentaire, juste le JSON.`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Data } },
        { type: "text", text: prompt }
      ]}]
    })
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(humanizeApiError(err, res.status)); }
  const data = await res.json();
  const raw = data.content?.map(b => b.text || "").join("") || "";
  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  const ingredients = normalizeIngredients(Array.isArray(parsed) ? parsed : (parsed.ingredients || []));
  if (Array.isArray(parsed)) return { plats: [], ingredients };
  return { plats: parsed.plats || [], ingredients };
}

function fmtTime(iso) { return new Date(iso).toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" }); }
function fmtDate(iso) { return new Date(iso).toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" }); }
function fmtDateShort(iso) { return new Date(iso).toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit", year:"numeric" }); }
function isToday(iso) { const d = new Date(iso), n = new Date(); return d.toDateString() === n.toDateString(); }
function isYesterday(iso) { const d = new Date(iso), y = new Date(); y.setDate(y.getDate()-1); return d.toDateString() === y.toDateString(); }
function groupByDay(entries) {
  const groups = {};
  [...entries].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(e => {
    const key = isToday(e.timestamp) ? "Aujourd'hui" : isYesterday(e.timestamp) ? "Hier" : fmtDate(e.timestamp);
    (groups[key] = groups[key] || []).push(e);
  });
  return groups;
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function computeSuspects(entries) {
  const pains = entries.filter(e => e.type === "pain");
  const meals = entries.filter(e => e.type === "meal" && e.ingredients?.length > 0);
  if (!pains.length || !meals.length) return { suspects: [], painCount: pains.length, mealCount: meals.length };
  const stats = {};
  meals.forEach(meal => {
    const seen = new Set();
    (meal.ingredients || []).forEach(ing => {
      const key = ing.nom.toLowerCase().trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      if (!stats[key]) stats[key] = { painsBefore: 0, totalMeals: 0, categorie: ing.categorie };
      stats[key].totalMeals++;
    });
  });
  pains.forEach(pain => {
    const pt = new Date(pain.timestamp).getTime(), ws = pt - LOOKBACK_HOURS * 3600000;
    const credited = new Set();
    meals.forEach(meal => {
      const mt = new Date(meal.timestamp).getTime();
      if (mt >= ws && mt <= pt) (meal.ingredients || []).forEach(ing => {
        const key = ing.nom.toLowerCase().trim();
        if (key && !credited.has(key) && stats[key]) { credited.add(key); stats[key].painsBefore++; }
      });
    });
  });
  const suspects = Object.entries(stats).filter(([,s]) => s.painsBefore > 0)
    .map(([name, s]) => ({ name, categorie: s.categorie, painsBefore: s.painsBefore, totalMeals: s.totalMeals, score: Math.round(s.painsBefore / pains.length * 100), frequency: Math.round(s.painsBefore / s.totalMeals * 100) }))
    .sort((a, b) => b.frequency - a.frequency || b.painsBefore - a.painsBefore);
  return { suspects, painCount: pains.length, mealCount: meals.length };
}

function exportCSV(entries) {
  const header = "Date,Heure,Type,Symptômes,Sévérité,Localisation,Bristol,Source,Plats,Ingrédients,Catégories,Additifs,Allergènes,Transcript,Produit,Code-barres\n";
  const rows = [...entries].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp)).map(e => {
    const symptomsLabel = e.type==="pain" ? (e.symptoms||[e.symptom||"abdominal_pain"]).map(k=>SYMPTOM_TYPES.find(s=>s.key===k)?.label||k).join(" + ") : "";
    const severityLabel = e.type==="pain" ? (e.severity ?? (e.intensity===3?7.5:e.intensity===2?5.0:2.5)) : "";
    return `"${fmtDateShort(e.timestamp)}","${fmtTime(e.timestamp)}","${e.type==="pain"?"Douleur":"Repas"}","${symptomsLabel}","${severityLabel}","${e.location||""}","${e.bristol||""}","${e.source||""}","${(e.dishes||[]).join(" + ")}","${(e.ingredients||[]).map(i=>i.nom).join(", ")}","${[...new Set((e.ingredients||[]).map(i=>CAT_LABEL[i.categorie]||i.categorie))].join(", ")}","${(e.additives||[]).join(", ")}","${(e.allergens||[]).join(", ")}","${(e.transcript||"").replace(/"/g,'""')}","${e.product_name||""}","${e.barcode||""}"`;
  }).join("\n");
  const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `mieux_demain_${new Date().toISOString().slice(0,10)}.csv`; a.click();
}

function SuspectBar({ pct, color }) {
  return <div style={{ width:"100%", height:6, borderRadius:3, background:"#F0E6D8", overflow:"hidden" }}><div style={{ width:`${pct}%`, height:"100%", borderRadius:3, background: color, transition:"width 0.5s ease-out" }}/></div>;
}
function getSuspicionLevel(freq) {
  if (freq >= 75) return { label:"Très suspect", color:"#E63946", bg:"#FFF0F0", border:"#FECACA" };
  if (freq >= 50) return { label:"Suspect", color:"#E07A5F", bg:"#FFF5EE", border:"#FFD4C0" };
  if (freq >= 25) return { label:"À surveiller", color:"#D4A017", bg:"#FFF8E1", border:"#FFE082" };
  return { label:"Faible", color:"#8D99AE", bg:"#F5F5F5", border:"#E0E0E0" };
}

const SOURCE_CFG = {
  voice:         { Icon: Mic,         color: "#E07A5F", bg: "#FDEEE8" },
  text:          { Icon: Type,        color: "#8D6E4C", bg: "#F5EDE4" },
  "photo-meal":  { Icon: Camera,      color: "#81B29A", bg: "#EEF5F0" },
  "photo-label": { Icon: Tag,         color: "#8D99AE", bg: "#F0F3F7" },
  barcode:       { Icon: ScanBarcode, color: "#5C6BC0", bg: "#ECEEFE" },
};
function SourceIcon({ source }) {
  const { Icon, color, bg } = SOURCE_CFG[source] || SOURCE_CFG.voice;
  return <div style={{ width:34, height:34, borderRadius:10, background:bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon size={16} color={color}/></div>;
}

function Header({ title, onBack, right }) {
  return <div className="gf-header">{onBack ? <button onClick={onBack} className="gf-back-btn"><ChevronLeft size={20}/> Retour</button> : <div style={{width:80}}/>}<h1 className="gf-title">{title}</h1>{right || <div style={{width:80}}/>}</div>;
}

function EntryCard({ entry, onDelete, onEdit, onDuplicate }) {
  const [open, setOpen] = useState(false);
  const isPain = entry.type === "pain";
  const sourceLabel = { voice:" · vocal", text:" · texte", "photo-meal":" · photo", "photo-label":" · étiquette", barcode:" · scan" }[entry.source] || "";
  return (
    <div className={`gf-card ${isPain ? "gf-card-pain" : ""}`}>
      <div className="gf-card-header" onClick={() => setOpen(!open)}>
        <div className="gf-card-left">
          {isPain ? <span style={{fontSize:20,flexShrink:0}}>{SYMPTOM_TYPES.find(s=>s.key===(entry.symptom||"abdominal_pain"))?.emoji||"😣"}</span> : <SourceIcon source={entry.source}/>}
          <div style={{minWidth:0}}>
            <p className="gf-card-title">{isPain ? (() => { const st = SYMPTOM_TYPES.find(s=>s.key===(entry.symptom||"abdominal_pain")); const pl = PAIN_LEVELS.find(p=>p.v===entry.intensity); return `${st?.emoji||"😣"} ${st?.label||"Douleur"} – ${pl?.label||"?"}`;})() : (entry.dishes?.join(", ")||entry.product_name||entry.transcript?.slice(0,40)||"Repas")}</p>
            <p style={{fontSize:11,color:"#8D99AE",marginTop:2}}>{fmtTime(entry.timestamp)}{sourceLabel}{!isPain && entry.portion && entry.portion !== "normal" ? ` · ${PORTION_SIZES.find(p=>p.v===entry.portion)?.emoji} ${PORTION_SIZES.find(p=>p.v===entry.portion)?.label}` : ""}</p>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
          {!isPain && entry.ingredients?.length > 0 && <span className="gf-badge">{entry.ingredients.length}</span>}
          {open ? <ChevronUp size={16} color="#8D99AE"/> : <ChevronDown size={16} color="#8D99AE"/>}
        </div>
      </div>
      {open && entry.ingredients?.length > 0 && (
        <div className="gf-card-ingredients">{entry.ingredients.map((ing,i) => <span key={i} className="gf-ingredient-tag">{CAT_EMOJI[ing.categorie]||"🔹"} {ing.nom}</span>)}</div>
      )}
      {open && (
        <div style={{display:"flex",gap:8,marginTop:8,justifyContent:"flex-end"}}>
          {!isPain && onDuplicate && <button onClick={ev=>{ev.stopPropagation();onDuplicate(entry)}} className="gf-action-btn" style={{background:"#EEEDFE",color:"#534AB7"}}><Copy size={12}/> Copier</button>}
          {onEdit && <button onClick={ev=>{ev.stopPropagation();onEdit(entry)}} className="gf-action-btn" style={{background:"#F0E6D8",color:"#8D6E4C"}}><Pencil size={12}/> Modifier</button>}
          {onDelete && <button onClick={ev=>{ev.stopPropagation();onDelete(entry.id)}} className="gf-action-btn" style={{background:"#FFF0F0",color:"#E63946"}}><Trash2 size={12}/> Supprimer</button>}
        </div>
      )}
    </div>
  );
}

function BottomNav({ tab, setTab, suspectCount }) {
  const tabs = [{ id:"home", icon:Home, label:"Journal" }, { id:"analysis", icon:Activity, label:"Analyse" }, { id:"suspects", icon:ShieldAlert, label:"Suspects", badge:suspectCount }];
  return (
    <div className="gf-bottomnav">
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} className={`gf-nav-item ${tab===t.id?"gf-nav-active":""}`}>
          <div style={{position:"relative"}}><t.icon size={22} strokeWidth={tab===t.id?2.5:1.8}/>{t.badge>0&&<span className="gf-nav-badge">{t.badge}</span>}</div>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function MieuxDemain() {
  const [tab, setTab] = useState("home");
  const [view, setView] = useState(null);
  const [entries, setEntries] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const isRecordingRef = useRef(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [editedIngredients, setEditedIngredients] = useState([]);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [hasBarcodeAPI, setHasBarcodeAPI] = useState(false);
  const [scanningActive, setScanningActive] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [productResult, setProductResult] = useState(null);
  const [showPainModal, setShowPainModal] = useState(false);
  const [painStep, setPainStep] = useState("symptom"); // "symptom" | "intensity"
  const [pendingSymptom, setPendingSymptom] = useState(null);
  const [editSymptom, setEditSymptom] = useState("abdominal_pain");
  const [showSymptomForm, setShowSymptomForm] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [editingEntry, setEditingEntry] = useState(null);
  const [editDishes, setEditDishes] = useState("");
  const [editIngredients, setEditIngredients] = useState([]);

  const [editTimestamp, setEditTimestamp] = useState("");
  const [editPainLevel, setEditPainLevel] = useState(1);
  const [portion, setPortion] = useState("normal");
  const [editPortion, setEditPortion] = useState("normal");
  const [textInput, setTextInput] = useState("");
  const [capturedImage, setCapturedImage] = useState(null);
  const [currentSource, setCurrentSource] = useState("voice");
  const [visionMsg, setVisionMsg] = useState("");
  const [ingSearch, setIngSearch] = useState("");
  const [ingSearchOpen, setIngSearchOpen] = useState(false);
  const [aiIngLoading, setAiIngLoading] = useState(false);
  const [aiIngSuggestions, setAiIngSuggestions] = useState([]);
  const ingSearchRef = useRef(null);

  const suspectsData = useMemo(() => computeSuspects(entries), [entries]);
  const knownIngredients = useMemo(() => {
    const map = {};
    entries.filter(e => e.type === "meal").forEach(e => {
      (e.ingredients || []).forEach(ing => {
        if (ing.nom) map[ing.nom.toLowerCase()] = ing;
      });
    });
    return Object.values(map).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [entries]);

  useEffect(() => {
    const old = localStorage.getItem("gutfeel-entries");
    if (old && !localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, old);
    const oldK = localStorage.getItem("gutfeel-apikey");
    if (oldK && !localStorage.getItem(APIKEY_KEY)) localStorage.setItem(APIKEY_KEY, oldK);
    // Migration : normalise les noms d'ingrédients existants (une seule fois)
    if (!localStorage.getItem(MIGRATION_KEY)) {
      try {
        const raw = loadEntries();
        const migrated = raw.map(e =>
          e.type === "meal" && e.ingredients?.length
            ? { ...e, ingredients: normalizeIngredients(e.ingredients) }
            : e
        );
        persistEntries(migrated);
      } catch {}
      localStorage.setItem(MIGRATION_KEY, "1");
    }
    // Migration v2 : re-catégorise les ingrédients barcode qui avaient tous "autre"
    if (!localStorage.getItem(MIGRATION_KEY_V2)) {
      try {
        const raw = loadEntries();
        const migrated = raw.map(e => {
          if (e.type === "meal" && e.source === "barcode" && e.ingredients?.length) {
            return { ...e, ingredients: e.ingredients.map(ing => ({ ...ing, categorie: ing.categorie === "autre" ? guessCategory(ing.nom) : ing.categorie })) };
          }
          return e;
        });
        persistEntries(migrated);
      } catch {}
      localStorage.setItem(MIGRATION_KEY_V2, "1");
    }
    setEntries(loadEntries()); setApiKeyInput(getApiKey()); setHasBarcodeAPI("BarcodeDetector" in window);
    if (!getApiKey()) setShowSettings(true);
  }, []);
  useEffect(() => () => { stopCamera(); stopRecognition(); }, []);

  // ── Android back button ──────────────────────────────────────────────────
  const backStateRef = useRef({});
  useEffect(() => {
    backStateRef.current = { view, showSymptomForm, showPainModal, showSettings, showInfo, tab, editingEntry, currentSource };
  });
  const handleBackRef = useRef(null);
  useEffect(() => {
    handleBackRef.current = () => {
      const s = backStateRef.current;
      if (s.view === "recording") {
        stopRecognition();
        if (finalTranscriptRef.current.trim()) { setTranscript(finalTranscriptRef.current.trim()); setView("transcript"); }
        else setView(null);
        return true;
      }
      if (s.view === "ingredients") {
        if (s.currentSource === "voice") setView("transcript");
        else if (s.currentSource === "text") setView("text-input");
        else { setAnalysisResult(null); setEditedIngredients([]); setCapturedImage(null); setView(null); }
        return true;
      }
      if (s.view === "edit") { setView(null); setEditingEntry(null); return true; }
      if (s.view === "scanner") { stopCamera(); setView(null); return true; }
      if (s.view !== null) { resetAndHome(); return true; }
      if (s.showSymptomForm) { setShowSymptomForm(false); return true; }
      if (s.showPainModal) { setShowPainModal(false); return true; }
      if (s.showSettings) { setShowSettings(false); return true; }
      if (s.showInfo) { setShowInfo(false); return true; }
      if (s.tab !== "home") { setTab("home"); return true; }
      return false;
    };
  });
  useEffect(() => {
    history.pushState({ gutfeel: true }, "");
    const onPopState = () => {
      const handled = handleBackRef.current?.();
      if (handled) history.pushState({ gutfeel: true }, "");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  // ────────────────────────────────────────────────────────────────────────

  function updateEntries(u) { setEntries(u); persistEntries(u); }
  function showFeedback() { setSavedFeedback(true); setTimeout(() => setSavedFeedback(false), 1800); }

  function startRecognition() {
    if (!getApiKey()) { setShowSettings(true); setError("Configure ta clé API d'abord !"); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError("Reconnaissance vocale non supportée. Utilise Chrome."); return; }
    finalTranscriptRef.current = ""; isRecordingRef.current = true;
    setTranscript(""); setInterimText(""); setIsRecording(true); setView("recording");
    function createSession() {
      const rec = new SR(); rec.lang = "fr-FR"; rec.continuous = false; rec.interimResults = true;
      rec.onresult = e => {
        let sf = "", interim = "";
        for (let i = 0; i < e.results.length; i++) { if (e.results[i].isFinal) sf += e.results[i][0].transcript; else interim += e.results[i][0].transcript; }
        if (sf) { finalTranscriptRef.current += sf.trim() + " "; setTranscript(finalTranscriptRef.current.trim()); }
        setInterimText(interim);
      };
      rec.onerror = e => { if (e.error !== "no-speech" && e.error !== "aborted") setError(`Erreur micro : ${e.error}`); };
      rec.onend = () => { if (isRecordingRef.current) try { createSession(); } catch {} };
      try { rec.start(); } catch {} recognitionRef.current = rec;
    }
    createSession();
  }
  function stopRecognition() { isRecordingRef.current = false; const r = recognitionRef.current; if (r) { r.onend = null; r.stop(); recognitionRef.current = null; } setIsRecording(false); setInterimText(""); }
  function handleStopRecording() { stopRecognition(); if (finalTranscriptRef.current.trim()) { setTranscript(finalTranscriptRef.current.trim()); setView("transcript"); } else setView(null); }

  async function handleAnalyze() {
    setAnalyzing(true); setError(null);
    try {
      const r = await decomposeWithAI(transcript, getApiKey());
      if (!r.plats.length && !r.ingredients.length) { setError("Aucun aliment détecté. Si tu n'as rien mangé, pas besoin d'enregistrer !"); return; }
      setAnalysisResult(r); setEditedIngredients(r.ingredients || []); setCurrentSource("voice"); setView("ingredients");
    }
    catch (e) { setError(e.message || "Erreur analyse IA."); } finally { setAnalyzing(false); }
  }
  async function handleTextAnalyze() {
    if (!getApiKey()) { setShowSettings(true); setError("Configure ta clé API d'abord !"); return; }
    setAnalyzing(true); setError(null);
    try {
      const r = await decomposeWithAI(textInput, getApiKey());
      if (!r.plats.length && !r.ingredients.length) { setError("Aucun aliment détecté. Si tu n'as rien mangé, pas besoin d'enregistrer !"); return; }
      setAnalysisResult(r); setEditedIngredients(r.ingredients || []); setCurrentSource("text"); setView("ingredients");
    }
    catch (e) { setError(e.message || "Erreur analyse IA."); } finally { setAnalyzing(false); }
  }
  async function handleImageCapture(file, mode) {
    if (!file) return;
    if (!getApiKey()) { setShowSettings(true); setError("Configure ta clé API d'abord !"); return; }
    try {
      const base64 = await compressImage(file);
      setCapturedImage(`data:image/jpeg;base64,${base64}`);
      setVisionMsg(mode === "label" ? "Lecture de l'étiquette en cours..." : "Analyse de votre assiette en cours...");
      setView("vision-loading"); setError(null);
      const result = await analyzeImageWithAI(base64, mode, getApiKey());
      if (!result.ingredients?.length) {
        setError("Aucun ingrédient reconnu. Essaie avec une photo plus nette ou sous meilleur éclairage.");
        setView(null); return;
      }
      setAnalysisResult(result); setEditedIngredients(result.ingredients);
      setCurrentSource(mode === "label" ? "photo-label" : "photo-meal");
      setView("ingredients");
    } catch (e) { setError(e.message || "Erreur lors de l'analyse de l'image."); setView(null); }
  }
  function saveIngredientEntry() {
    const extraMap = {
      "voice": { transcript },
      "text": { transcript: textInput },
      "photo-meal": {},
      "photo-label": {},
    };
    updateEntries([{ id: genId(), timestamp: new Date().toISOString(), type: "meal", source: currentSource, dishes: analysisResult?.plats || [], ingredients: editedIngredients, portion, ...(extraMap[currentSource] || {}) }, ...entries]);
    showFeedback(); resetAndHome();
  }

  async function startCamera() {
    setView("scanner"); setScanningActive(true); setManualBarcode(""); setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } });
      streamRef.current = stream; if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      if (hasBarcodeAPI) { const det = new window.BarcodeDetector({ formats: ["ean_13","ean_8","upc_a","upc_e","code_128"] }); scanIntervalRef.current = setInterval(async () => { if (!videoRef.current || videoRef.current.readyState < 2) return; try { const bc = await det.detect(videoRef.current); if (bc.length > 0 && bc[0].rawValue) { stopCamera(); handleBarcodeLookup(bc[0].rawValue); } } catch {} }, 400); }
    } catch { setScanningActive(false); setError("Caméra indisponible. Saisis le code manuellement."); }
  }
  function stopCamera() { if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; } if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; } setScanningActive(false); }
  async function handleBarcodeLookup(code) {
    setBarcodeLoading(true); setError(null);
    try { const p = await lookupBarcode(code); if (!p) { setError(`Produit non trouvé (${code}).`); setBarcodeLoading(false); return; } setProductResult(p); setView("product"); }
    catch { setError("Erreur recherche produit."); } finally { setBarcodeLoading(false); }
  }
  function saveProductEntry() {
    const ings = (productResult.ingredients || []).map(n => { const nom = n.toLowerCase(); return { nom, categorie: guessCategory(nom) }; });
    updateEntries([{ id: genId(), timestamp: new Date().toISOString(), type: "meal", source: "barcode", product_name: productResult.name, barcode: productResult.barcode, brands: productResult.brands, dishes: [productResult.name], ingredients: ings, additives: productResult.additives, allergens: productResult.allergens, portion }, ...entries]);
    showFeedback(); resetAndHome();
  }

  function saveSymptomEntry({ symptoms, severity, location, bristol, timestamp }) {
    updateEntries([{
      id: genId(),
      timestamp,
      type: "pain",
      symptoms,
      symptom: symptoms[0],           // backwards compat
      severity,
      intensity: severity >= 7.5 ? 3 : severity >= 5 ? 2 : 1, // backwards compat
      location: location ?? null,
      bristol:  bristol  ?? null,
    }, ...entries]);
    setShowSymptomForm(false);
    showFeedback();
  }

  function openPainModal() { setPainStep("symptom"); setPendingSymptom(null); setShowPainModal(true); }
  function selectSymptom(key) { setPendingSymptom(key); setPainStep("intensity"); }
  function savePain(level) { updateEntries([{ id: genId(), timestamp: new Date().toISOString(), type: "pain", intensity: level, symptom: pendingSymptom || "abdominal_pain" }, ...entries]); setShowPainModal(false); showFeedback(); }

  function startEdit(entry) {
    // Normalize ingredients: ensure all are {nom, categorie} objects
    const normalizedIngs = (entry.ingredients || []).map(ing => {
      if (typeof ing === "string") return { nom: ing, categorie: "autre" };
      return { nom: ing.nom || ing.text || String(ing), categorie: ing.categorie || "autre" };
    }).filter(ing => ing.nom);
    setEditingEntry(entry);
    setEditDishes((entry.dishes || []).join(", "));
    setEditIngredients(normalizedIngs);
    // Format timestamp for datetime-local input
    const d = new Date(entry.timestamp);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditTimestamp(local);
    setEditPainLevel(entry.intensity || 1);
    setEditSymptom(entry.symptom || "abdominal_pain");
    setEditPortion(entry.portion || "normal");
    setIngSearch(""); setIngSearchOpen(false); setAiIngSuggestions([]);
    setView("edit");
  }
  function saveEdit() {
    const newTimestamp = editTimestamp ? new Date(editTimestamp).toISOString() : editingEntry.timestamp;
    const updated = entries.map(e => {
      if (e.id !== editingEntry.id) return e;
      if (e.type === "pain") return { ...e, timestamp: newTimestamp, intensity: editPainLevel, symptom: editSymptom };
      return { ...e, timestamp: newTimestamp, dishes: editDishes.split(",").map(d=>d.trim()).filter(Boolean), ingredients: editIngredients, portion: editPortion };
    });
    updateEntries(updated); showFeedback(); setEditingEntry(null); setView(null); setTab("home");
  }

  function removeIngredient(idx) { setEditedIngredients(prev => prev.filter((_, i) => i !== idx)); }
  function removeEditIngredient(idx) { setEditIngredients(prev => prev.filter((_, i) => i !== idx)); }

  function addIngredientToEdit(ing) {
    setEditIngredients(prev => prev.some(e => e.nom === ing.nom) ? prev : [...prev, ing]);
    setIngSearch(""); setIngSearchOpen(false); setAiIngSuggestions([]);
  }
  function addCustomIngredient() {
    const nom = ingSearch.trim().toLowerCase();
    if (!nom) return;
    addIngredientToEdit({ nom, categorie: guessCategory(nom) });
  }
  async function handleAiIngSearch() {
    const apiKey = getApiKey();
    if (!apiKey) return;
    setAiIngLoading(true); setAiIngSuggestions([]);
    try {
      const results = await suggestIngredientsWithAI(editDishes, editIngredients.map(i => i.nom), ingSearch, apiKey);
      setAiIngSuggestions(results);
      setIngSearchOpen(true);
    } catch (e) { setError(e.message); }
    finally { setAiIngLoading(false); }
  }

  function duplicateEntry(entry) {
    const { id: _id, timestamp: _ts, ...rest } = entry;
    updateEntries([{ ...rest, id: genId(), timestamp: new Date().toISOString() }, ...entries]);
    showFeedback();
  }
  function deleteEntry(id) { if (!window.confirm("Supprimer ?")) return; updateEntries(entries.filter(e => e.id !== id)); }
  function resetAndHome() { setTranscript(""); setInterimText(""); setAnalysisResult(null); setEditedIngredients([]); setProductResult(null); setManualBarcode(""); setError(null); finalTranscriptRef.current = ""; isRecordingRef.current = false; setCapturedImage(null); setTextInput(""); setCurrentSource("voice"); setPortion("normal"); setView(null); }

  function renderIngredientList(ings, onRemove) {
    if (!ings || !ings.length) return null;
    const safe = ings.map((ing, idx) => {
      if (typeof ing === "string") return { nom: ing, categorie: "autre", _idx: idx };
      return { nom: ing.nom || ing.text || "?", categorie: ing.categorie || "autre", _idx: idx };
    }).filter(ing => ing.nom && ing.nom !== "?");
    const g = safe.reduce((acc, ing) => { const c = ing.categorie||"autre"; (acc[c]=acc[c]||[]).push(ing); return acc; }, {});
    return Object.entries(g).sort(([a],[b])=>a.localeCompare(b)).map(([cat,items]) => (
      <div key={cat} style={{marginBottom:12}}>
        <p style={{fontSize:12,fontWeight:600,marginBottom:6,display:"flex",alignItems:"center",gap:6,color:"#5C5470"}}>{CAT_EMOJI[cat]||"🔹"} {CAT_LABEL[cat]||cat}</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{items.map(ing => (
          <span key={ing._idx} style={{fontSize:12,padding:"4px 4px 4px 10px",borderRadius:99,fontWeight:500,display:"inline-flex",alignItems:"center",gap:4,background:"#fff",border:"1px solid #F0E6D8",color:"#2B2D42"}}>
            {ing.nom}<button onClick={()=>onRemove(ing._idx)} style={{borderRadius:99,padding:2,marginLeft:2,background:"none",border:"none",cursor:"pointer"}}><X size={12} color="#E63946"/></button>
          </span>
        ))}</div>
      </div>
    ));
  }

  const grouped = groupByDay(entries);
  const showingTab = view === null;

  return (
    <div className="gf-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Nunito:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        .gf-root{font-family:'Nunito',sans-serif;background:#FFFBF5;color:#2B2D42;height:100vh;height:100dvh;max-width:480px;margin:0 auto;display:flex;flex-direction:column;position:relative;overflow:hidden;-webkit-font-smoothing:antialiased}
        .gf-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #F0E6D8;flex-shrink:0}
        .gf-title{font-family:'Sora',sans-serif;font-size:18px;font-weight:700;letter-spacing:-0.5px}
        .gf-back-btn{display:flex;align-items:center;gap:4px;font-size:14px;font-weight:500;color:#E07A5F;background:none;border:none;cursor:pointer;font-family:inherit}
        .gf-card{background:#fff;border:1px solid #F0E6D8;border-radius:16px;padding:12px;margin-bottom:8px;animation:gf-fi .35s ease-out both}
        .gf-card-pain{background:#FFF0F0;border-color:#FECACA}
        .gf-card-header{display:flex;align-items:center;justify-content:space-between;cursor:pointer}
        .gf-card-left{display:flex;align-items:center;gap:10px;min-width:0;flex:1}
        .gf-card-title{font-weight:600;font-size:13px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .gf-badge{font-size:11px;padding:2px 8px;border-radius:99px;font-weight:600;background:#F0E6D8;color:#8D6E4C}
        .gf-card-ingredients{margin-top:10px;padding-top:10px;border-top:1px solid #F0E6D8;display:flex;flex-wrap:wrap;gap:6px}
        .gf-ingredient-tag{font-size:11px;padding:4px 8px;border-radius:99px;font-weight:500;background:#FFFBF5;border:1px solid #F0E6D8;color:#5C5470}
        .gf-action-btn{display:flex;align-items:center;gap:4px;font-size:12px;padding:4px 10px;border-radius:8px;border:none;cursor:pointer;font-family:inherit;font-weight:600}
        .gf-btn-primary{width:100%;border-radius:16px;padding:14px;font-weight:600;font-size:14px;display:flex;align-items:center;justify-content:center;gap:8px;background:#81B29A;color:#fff;border:none;cursor:pointer;font-family:inherit;transition:transform .1s}
        .gf-btn-primary:active{transform:scale(.97)}
        .gf-btn-secondary{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:16px;padding:14px;font-weight:600;font-size:14px;background:#fff;border:1.5px solid #F0E6D8;color:#2B2D42;cursor:pointer;font-family:inherit;transition:transform .1s}
        .gf-btn-secondary:active{transform:scale(.97)}
        .gf-btn-pain{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:16px;padding:14px;font-weight:600;font-size:14px;background:#FFF0F0;border:1.5px solid #FECACA;color:#E63946;cursor:pointer;font-family:inherit;transition:transform .1s;animation:gf-pp 3s ease-in-out infinite}
        .gf-btn-pain:active{transform:scale(.97)}
        .gf-mic-hero{width:96px;height:96px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#E07A5F,#D4583B);box-shadow:0 8px 30px rgba(224,122,95,.35);border:none;cursor:pointer;animation:gf-p 2.5s ease-in-out infinite;transition:transform .1s}
        .gf-mic-hero:active{transform:scale(.93)}
        .gf-scroll{flex:1;overflow-y:auto;padding:0 16px 16px;-webkit-overflow-scrolling:touch;min-height:0}
        .gf-section-label{font-family:'Sora',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#B0A090;margin-bottom:8px;padding:0 4px}
        .gf-bottomnav{display:flex;border-top:1px solid #F0E6D8;background:#FFFBF5;flex-shrink:0;padding:4px 0 env(safe-area-inset-bottom,8px)}
        .gf-nav-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;background:none;border:none;cursor:pointer;font-family:inherit;font-size:11px;font-weight:500;color:#8D99AE;transition:color .15s}
        .gf-nav-active{color:#E07A5F;font-weight:700}
        .gf-nav-badge{position:absolute;top:-4px;right:-8px;min-width:16px;height:16px;border-radius:99px;background:#E63946;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px}
        .gf-suspect{border-radius:16px;padding:14px;margin-bottom:10px;animation:gf-fi .35s ease-out both}
        .gf-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:50;background:rgba(255,251,245,.85);backdrop-filter:blur(4px)}
        .gf-modal-backdrop{position:fixed;inset:0;display:flex;align-items:flex-end;justify-content:center;z-index:50}
        .gf-modal-bg{position:absolute;inset:0;background:rgba(43,45,66,.4);backdrop-filter:blur(4px)}
        .gf-modal{position:relative;width:100%;max-width:480px;border-radius:24px 24px 0 0;padding:24px;background:#FFFBF5;animation:gf-fi .3s ease-out}
        .gf-modal-handle{width:40px;height:4px;border-radius:99px;background:#D8D0C8;margin:0 auto 16px}
        .gf-error{position:absolute;top:64px;left:16px;right:16px;z-index:40;border-radius:12px;padding:12px;display:flex;align-items:flex-start;gap:10px;background:#FFF0F0;border:1px solid #FECACA;animation:gf-fi .3s ease-out}
        .gf-error p{font-size:13px;color:#C4363A;flex:1}
        .gf-error button{background:none;border:none;cursor:pointer}
        .gf-viewfinder{position:relative;width:75%;aspect-ratio:3/1;border:3px solid rgba(255,255,255,.6);border-radius:16px}
        .gf-scanline{position:absolute;left:8px;right:8px;height:2px;background:#E07A5F;animation:gf-sc 2s linear infinite}
        .gf-abs{position:absolute;inset:0;z-index:30;background:#FFFBF5;display:flex;flex-direction:column;min-height:0;overflow:hidden}
        @keyframes gf-p{0%,100%{box-shadow:0 0 0 0 rgba(224,122,95,.45)}50%{box-shadow:0 0 0 22px rgba(224,122,95,0)}}
        @keyframes gf-br{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes gf-pp{0%,100%{box-shadow:0 0 0 0 rgba(230,57,70,.4)}50%{box-shadow:0 0 0 14px rgba(230,57,70,0)}}
        @keyframes gf-fi{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes gf-sc{0%{top:15%}50%{top:75%}100%{top:15%}}
        @keyframes gf-ch{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}}
        @keyframes gf-sp{to{transform:rotate(360deg)}}
        .gf-spin{animation:gf-sp 1s linear infinite}
      `}</style>

      {savedFeedback && <div className="gf-overlay"><div style={{animation:"gf-ch .4s ease-out"}}><div style={{width:80,height:80,borderRadius:"50%",background:"#81B29A",display:"flex",alignItems:"center",justifyContent:"center"}}><Check size={40} color="#fff" strokeWidth={3}/></div><p style={{textAlign:"center",marginTop:12,fontWeight:600,color:"#81B29A",fontFamily:"Sora"}}>Enregistré !</p></div></div>}
      {error && <div className="gf-error"><Zap size={18} color="#E63946" style={{flexShrink:0,marginTop:2}}/><p>{error}</p><button onClick={()=>setError(null)}><X size={16} color="#E63946"/></button></div>}

      {/* ═══ TAB: HOME ═══ */}
      {showingTab && tab === "home" && <>
        <div className="gf-header">
          <button onClick={()=>setShowSettings(true)} style={{background:"none",border:"none",cursor:"pointer",padding:4}}><Settings size={20} color="#8D99AE"/></button>
          <h1 className="gf-title">Mieux Demain</h1>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            {entries.length > 0 && <button onClick={()=>exportCSV(entries)} style={{display:"flex",alignItems:"center",gap:3,fontSize:12,fontWeight:600,color:"#E07A5F",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:4}}><Download size={14}/> CSV</button>}
            <button onClick={()=>setShowInfo(true)} style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex",alignItems:"center",justifyContent:"center",width:28,height:28,borderRadius:"50%",color:"#8D99AE"}} aria-label="À propos">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8" strokeWidth="3"/><line x1="12" y1="12" x2="12" y2="16"/></svg>
            </button>
          </div>
        </div>
        <div className="gf-scroll" style={{paddingTop:16}}>
          {/* Carte 1 — Décrivez votre repas */}
          <div style={{borderRadius:20,padding:16,background:"#EEEDFE",border:"1px solid #C5C2F5",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <MessageSquare size={16} color="#534AB7"/>
              <span style={{fontFamily:"Sora",fontWeight:700,fontSize:14,color:"#534AB7"}}>Décrivez votre repas</span>
            </div>
            <p style={{fontSize:12,color:"#7A74C4",marginBottom:14}}>Vous savez ce que vous mangez ? Décrivez-le</p>
            <div style={{display:"flex",gap:8}}>
              <button onClick={startRecognition} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,borderRadius:14,padding:"14px 8px",background:"#fff",border:"1.5px solid #C5C2F5",cursor:"pointer",fontFamily:"inherit"}}>
                <Mic size={22} color="#534AB7"/>
                <span style={{fontSize:11,fontWeight:700,color:"#534AB7"}}>Audio</span>
              </button>
              <button onClick={()=>{if(!getApiKey()){setShowSettings(true);return;}setView("text-input")}} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,borderRadius:14,padding:"14px 8px",background:"#fff",border:"1.5px solid #C5C2F5",cursor:"pointer",fontFamily:"inherit"}}>
                <Type size={22} color="#534AB7"/>
                <span style={{fontSize:11,fontWeight:700,color:"#534AB7"}}>Texte</span>
              </button>
              <label style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,borderRadius:14,padding:"14px 8px",background:"#FEF3C7",border:"1.5px solid #FCD34D",cursor:"pointer",fontFamily:"inherit"}}>
                <Camera size={22} color="#854F0B"/>
                <span style={{fontSize:11,fontWeight:700,color:"#854F0B"}}>Photo</span>
                <input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{handleImageCapture(e.target.files[0],"meal");e.target.value="";}}/>
              </label>
            </div>
          </div>
          {/* Carte 2 — Scannez un produit */}
          <div style={{borderRadius:20,padding:16,background:"#E1F5EE",border:"1px solid #A7DEC8",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <ScanLine size={16} color="#0F6E56"/>
              <span style={{fontFamily:"Sora",fontWeight:700,fontSize:14,color:"#0F6E56"}}>Scannez un produit</span>
            </div>
            <p style={{fontSize:12,color:"#2A8F72",marginBottom:14}}>Vous avez l'emballage ? Scannez-le</p>
            <div style={{display:"flex",gap:8}}>
              <button onClick={startCamera} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,borderRadius:14,padding:"14px 8px",background:"#fff",border:"1.5px solid #A7DEC8",cursor:"pointer",fontFamily:"inherit"}}>
                <ScanBarcode size={22} color="#0F6E56"/>
                <span style={{fontSize:11,fontWeight:700,color:"#0F6E56"}}>Code-barres</span>
              </button>
              <label style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,borderRadius:14,padding:"14px 8px",background:"#fff",border:"1.5px solid #A7DEC8",cursor:"pointer",fontFamily:"inherit",position:"relative"}}>
                <span style={{position:"absolute",top:6,right:6,fontSize:9,fontWeight:700,padding:"2px 5px",borderRadius:99,background:"#FAEEDA",color:"#854F0B"}}>new</span>
                <Tag size={22} color="#0F6E56"/>
                <span style={{fontSize:11,fontWeight:700,color:"#0F6E56"}}>Étiquette</span>
                <input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{handleImageCapture(e.target.files[0],"label");e.target.value="";}}/>
              </label>
            </div>
          </div>
          {/* Séparateur + douleur */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{flex:1,height:1,background:"#F0E6D8"}}/><span style={{fontSize:12,color:"#B0A090",fontWeight:500}}>ou</span><div style={{flex:1,height:1,background:"#F0E6D8"}}/>
          </div>
          <button className="gf-btn-pain" style={{width:"100%",marginBottom:20}} onClick={()=>setShowSymptomForm(true)}><Frown size={20}/> Signaler une douleur</button>
          {entries.length === 0 ? <div style={{textAlign:"center",padding:"24px 0"}}><p style={{fontSize:32,marginBottom:8}}>🌱</p><p style={{fontWeight:600,fontSize:14,color:"#8D99AE"}}>Ton journal est vide</p><p style={{fontSize:12,marginTop:4,color:"#B0B8C8"}}>Commence par noter ce que tu as mangé</p></div>
          : <>{<div style={{marginBottom:12,padding:"8px 12px",borderRadius:12,background:"#F5F0E8",display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:600,color:"#8D6E4C"}}>{entries.length} entrée{entries.length>1?"s":""}</span><span style={{fontSize:12,color:"#B0A090"}}>{entries.filter(e=>e.type==="meal").length} repas · {entries.filter(e=>e.type==="pain").length} douleurs</span></div>}{Object.entries(grouped).map(([day,items]) => <div key={day} style={{marginBottom:16}}><p className="gf-section-label">{day}</p>{items.map(e => <EntryCard key={e.id} entry={e} onDelete={deleteEntry} onEdit={startEdit} onDuplicate={duplicateEntry}/>)}</div>)}</>}
        </div>
      </>}

      {/* ═══ TAB: ANALYSIS ═══ */}
      {showingTab && tab === "analysis" && <>
        <div className="gf-header"><div style={{width:28}}/><h1 className="gf-title">📈 Analyse</h1><div style={{width:28}}/></div>
        <div className="gf-scroll" style={{paddingTop:12}}>
          <AnalysisDashboard entries={entries}/>
        </div>
      </>}

      {/* ═══ TAB: SUSPECTS ═══ */}
      {showingTab && tab === "suspects" && <>
        <div className="gf-header"><div style={{width:28}}/><h1 className="gf-title">🔍 Suspects</h1><div style={{width:28}}/></div>
        <div className="gf-scroll" style={{paddingTop:12}}>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <div style={{flex:1,padding:"10px 12px",borderRadius:12,background:"#FFF0F0",textAlign:"center"}}><p style={{fontSize:20,fontWeight:700,color:"#E63946",fontFamily:"Sora"}}>{suspectsData.painCount}</p><p style={{fontSize:11,color:"#C4363A",fontWeight:600}}>Douleurs</p></div>
            <div style={{flex:1,padding:"10px 12px",borderRadius:12,background:"#F0F8F4",textAlign:"center"}}><p style={{fontSize:20,fontWeight:700,color:"#81B29A",fontFamily:"Sora"}}>{suspectsData.mealCount}</p><p style={{fontSize:11,color:"#5A8F7B",fontWeight:600}}>Repas</p></div>
            <div style={{flex:1,padding:"10px 12px",borderRadius:12,background:"#FFF5EE",textAlign:"center"}}><p style={{fontSize:20,fontWeight:700,color:"#E07A5F",fontFamily:"Sora"}}>{suspectsData.suspects.length}</p><p style={{fontSize:11,color:"#C4623F",fontWeight:600}}>Suspects</p></div>
          </div>
          {suspectsData.painCount === 0 ? <div style={{textAlign:"center",padding:"40px 20px"}}><p style={{fontSize:40,marginBottom:12}}>😊</p><p style={{fontWeight:700,fontSize:16,color:"#81B29A",fontFamily:"Sora",marginBottom:8}}>Aucune douleur enregistrée</p><p style={{fontSize:13,color:"#8D99AE",lineHeight:1.5}}>C'est une bonne nouvelle ! Quand tu auras mal, appuie sur "Aïe !" pour qu'on cherche ensemble.</p></div>
          : (suspectsData.painCount < 3 || suspectsData.mealCount < 5) ? <div style={{textAlign:"center",padding:"40px 20px"}}><p style={{fontSize:40,marginBottom:12}}>📊</p><p style={{fontWeight:700,fontSize:16,color:"#E07A5F",fontFamily:"Sora",marginBottom:8}}>Continue, on y est presque !</p><p style={{fontSize:13,color:"#8D99AE",lineHeight:1.5}}>Il faut au moins <strong>3 douleurs</strong> et <strong>5 repas</strong> pour que les corrélations soient fiables. Tu en es à {suspectsData.painCount} douleur{suspectsData.painCount>1?"s":""} et {suspectsData.mealCount} repas.</p></div>
          : suspectsData.suspects.length === 0 ? <div style={{textAlign:"center",padding:"40px 20px"}}><p style={{fontSize:40,marginBottom:12}}>🤔</p><p style={{fontWeight:700,fontSize:16,color:"#E07A5F",fontFamily:"Sora",marginBottom:8}}>Aucun suspect identifié</p><p style={{fontSize:13,color:"#8D99AE",lineHeight:1.5}}>Aucun ingrédient ne revient systématiquement avant tes douleurs. Continue à noter, on finira par trouver.</p></div>
          : <>
            <p style={{fontSize:12,color:"#8D99AE",marginBottom:12,padding:"0 4px",lineHeight:1.5}}>Ingrédients consommés dans les <strong>{LOOKBACK_HOURS}h</strong> avant chaque douleur.</p>
            {suspectsData.suspects.map((s,i) => { const lv = getSuspicionLevel(s.frequency); return (
              <div key={s.name} className="gf-suspect" style={{background:lv.bg,border:`1px solid ${lv.border}`,animationDelay:`${i*.05}s`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>{CAT_EMOJI[s.categorie]||"🔹"}</span><span style={{fontWeight:700,fontSize:14}}>{s.name}</span></div>
                  <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:99,background:lv.color,color:"#fff"}}>{lv.label}</span>
                </div>
                <SuspectBar pct={s.frequency} color={lv.color}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                  <span style={{fontSize:11,color:"#8D99AE"}}>Avant <strong style={{color:lv.color}}>{s.painsBefore}/{suspectsData.painCount}</strong> douleurs</span>
                  <span style={{fontSize:11,color:"#8D99AE"}}>Mangé <strong>{s.totalMeals}×</strong></span>
                </div>
              </div>
            ); })}
          </>}
        </div>
      </>}

      {showingTab && <BottomNav tab={tab} setTab={setTab} suspectCount={suspectsData.suspects.filter(s=>s.frequency>=50).length}/>}

      {/* ═══ OVERLAY VIEWS ═══ */}
      {view === "recording" && <div className="gf-abs" style={{background:"linear-gradient(180deg,#FFFBF5 0%,#FFF0E8 100%)"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:40,flexShrink:0}}>
          <div style={{width:120,height:120,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#E07A5F,#D4583B)",animation:"gf-br 1.8s ease-in-out infinite",boxShadow:"0 10px 40px rgba(224,122,95,.4)"}}><Mic size={48} color="#fff" strokeWidth={2}/></div>
          <p style={{fontFamily:"Sora",fontWeight:700,fontSize:18,marginTop:16,marginBottom:4}}>Je t'écoute...</p>
          <p style={{fontSize:14,color:"#8D99AE",marginBottom:16}}>Dis-moi ce que tu as mangé</p>
        </div>
        <div style={{flex:1,overflow:"hidden",padding:"0 24px",minHeight:0}}><div style={{height:"100%",overflowY:"auto",borderRadius:16,padding:16,background:"rgba(255,255,255,.8)",border:"1px solid #F0E6D8"}}>
          {transcript && <p style={{fontSize:14,lineHeight:1.6}}>{transcript}</p>}
          {interimText && <span style={{fontSize:14,fontStyle:"italic",color:"#B0A090"}}>{interimText}</span>}
          {!transcript && !interimText && <p style={{fontSize:14,fontStyle:"italic",color:"#C8C0B8"}}>En attente de ta voix...</p>}
        </div></div>
        <div style={{padding:"16px 24px 32px",flexShrink:0,display:"flex",justifyContent:"center"}}>
          <button onClick={handleStopRecording} style={{borderRadius:99,padding:"14px 32px",fontWeight:600,fontSize:14,display:"flex",alignItems:"center",gap:8,background:"#2B2D42",color:"#fff",border:"none",cursor:"pointer",fontFamily:"inherit"}}><MicOff size={18}/> Arrêter</button>
        </div>
      </div>}

      {view === "transcript" && <div className="gf-abs">
        <Header title="Vérification" onBack={resetAndHome}/>
        <div className="gf-scroll" style={{paddingTop:16}}>
          <p className="gf-section-label">Ce que j'ai compris</p>
          <div style={{borderRadius:16,padding:16,background:"#fff",border:"1px solid #F0E6D8",marginBottom:16}}>
            <textarea value={transcript} onChange={e=>setTranscript(e.target.value)} rows={5} style={{width:"100%",fontSize:14,resize:"none",outline:"none",background:"transparent",border:"none",fontFamily:"Nunito",lineHeight:1.6}}/>
          </div>
          <p style={{fontSize:12,color:"#8D99AE"}}>✏️ Tu peux corriger avant l'analyse</p>
        </div>
        <div style={{padding:"0 16px 24px",display:"flex",gap:12,flexShrink:0}}>
          <button onClick={resetAndHome} style={{flex:1,borderRadius:16,padding:14,fontWeight:600,fontSize:14,background:"#F0E6D8",color:"#8D6E4C",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
          <button onClick={handleAnalyze} disabled={analyzing||!transcript.trim()} style={{flex:1,borderRadius:16,padding:14,fontWeight:600,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:analyzing?"#F0C8B8":"linear-gradient(135deg,#E07A5F,#D4583B)",color:"#fff",border:"none",cursor:"pointer",fontFamily:"inherit",opacity:(!transcript.trim()&&!analyzing)?.5:1}}>
            {analyzing ? <><Loader2 size={16} className="gf-spin"/> Analyse...</> : <><Search size={16}/> Analyser</>}
          </button>
        </div>
      </div>}

      {view === "ingredients" && <div className="gf-abs">
        <Header title="Ingrédients" onBack={()=>{ if(currentSource==="voice") setView("transcript"); else if(currentSource==="text") setView("text-input"); else resetAndHome(); }}/>
        <div className="gf-scroll" style={{paddingTop:12}}>
          {capturedImage && <div style={{marginBottom:12,display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,background:"#F5F0E8"}}><img src={capturedImage} alt="" style={{width:48,height:48,objectFit:"cover",borderRadius:8,flexShrink:0}}/><span style={{fontSize:12,color:"#8D6E4C"}}>Photo analysée par IA</span></div>}
          {analysisResult?.plats?.length > 0 && <div style={{marginBottom:12}}><p className="gf-section-label">Plats identifiés</p><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{analysisResult.plats.map((p,i) => <span key={i} style={{fontSize:12,padding:"6px 12px",borderRadius:99,fontWeight:600,background:"#E07A5F",color:"#fff"}}>🍽️ {p}</span>)}</div></div>}
          <p className="gf-section-label" style={{marginTop:12}}>{editedIngredients.length} ingrédient{editedIngredients.length>1?"s":""}</p>
          <p style={{fontSize:12,color:"#8D99AE",marginBottom:12}}>Supprime ceux qui ne correspondent pas</p>
          {renderIngredientList(editedIngredients, removeIngredient)}
        </div>
        <div style={{padding:"0 16px 8px",flexShrink:0}}>
          <p className="gf-section-label">Quantité mangée</p>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            {PORTION_SIZES.map(ps => (
              <button key={ps.v} onClick={()=>setPortion(ps.v)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,borderRadius:14,padding:"10px 0",border: portion===ps.v ? "2.5px solid #E07A5F" : "1.5px solid #F0E6D8",background: portion===ps.v ? "#FFF5EE" : "#fff",cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
                <span style={{fontSize:22}}>{ps.emoji}</span>
                <span style={{fontSize:12,fontWeight:portion===ps.v?700:500,color: portion===ps.v?"#E07A5F":"#5C5470"}}>{ps.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{padding:"0 16px 24px",flexShrink:0}}><button className="gf-btn-primary" onClick={saveIngredientEntry}><Check size={18}/> Enregistrer ({editedIngredients.length})</button></div>
      </div>}

      {view === "text-input" && <div className="gf-abs">
        <Header title="Décrivez votre repas" onBack={resetAndHome}/>
        <div className="gf-scroll" style={{paddingTop:16}}>
          <p style={{fontSize:12,color:"#8D99AE",marginBottom:8}}>Décris ce que tu as mangé en quelques mots</p>
          <div style={{borderRadius:16,padding:16,background:"#fff",border:"1px solid #F0E6D8",marginBottom:12}}>
            <textarea value={textInput} onChange={e=>setTextInput(e.target.value)} rows={6} placeholder="Ex. : salade niçoise avec thon, tomates, œufs, olives..." style={{width:"100%",fontSize:14,resize:"none",outline:"none",background:"transparent",border:"none",fontFamily:"Nunito",lineHeight:1.6}}/>
          </div>
        </div>
        <div style={{padding:"0 16px 24px",display:"flex",gap:12,flexShrink:0}}>
          <button onClick={resetAndHome} style={{flex:1,borderRadius:16,padding:14,fontWeight:600,fontSize:14,background:"#F0E6D8",color:"#8D6E4C",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
          <button onClick={handleTextAnalyze} disabled={analyzing||!textInput.trim()} style={{flex:1,borderRadius:16,padding:14,fontWeight:600,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:analyzing?"#9E96D8":"linear-gradient(135deg,#534AB7,#4039A0)",color:"#fff",border:"none",cursor:"pointer",fontFamily:"inherit",opacity:(!textInput.trim()&&!analyzing)?0.5:1}}>
            {analyzing ? <><Loader2 size={16} className="gf-spin"/> Analyse...</> : <><Search size={16}/> Analyser</>}
          </button>
        </div>
      </div>}

      {view === "vision-loading" && <div className="gf-abs" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24,padding:40}}>
        {capturedImage && <img src={capturedImage} alt="" style={{width:180,height:180,objectFit:"cover",borderRadius:20,border:"2px solid #F0E6D8",boxShadow:"0 8px 24px rgba(0,0,0,.12)"}}/>}
        <Loader2 size={32} className="gf-spin" color="#534AB7"/>
        <p style={{fontWeight:600,fontSize:15,color:"#534AB7",textAlign:"center",lineHeight:1.5}}>{visionMsg}</p>
      </div>}

      {view === "scanner" && <div className="gf-abs" style={{background:"#000"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px"}}>
          <button onClick={()=>{stopCamera();resetAndHome()}} style={{display:"flex",alignItems:"center",gap:4,fontSize:14,fontWeight:500,color:"#fff",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}><ChevronLeft size={20}/> Retour</button>
          <span style={{fontFamily:"Sora",fontWeight:700,fontSize:14,color:"#fff"}}>Scanner</span><div style={{width:60}}/>
        </div>
        <div style={{flex:1,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <video ref={videoRef} playsInline muted style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
          <div className="gf-viewfinder">{scanningActive&&hasBarcodeAPI&&<div className="gf-scanline"/>}</div>
          {barcodeLoading&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.6)",zIndex:20}}><Loader2 size={32} className="gf-spin" color="#E07A5F"/></div>}
        </div>
        <div style={{padding:16,background:"#111"}}>
          <p style={{fontSize:12,textAlign:"center",marginBottom:8,color:"#888"}}>{hasBarcodeAPI?"Ou saisis le code":"Saisis le code-barres"}</p>
          <div style={{display:"flex",gap:8}}>
            <input type="tel" value={manualBarcode} onChange={e=>setManualBarcode(e.target.value.replace(/\D/g,""))} placeholder="Ex: 3017620422003" style={{flex:1,borderRadius:12,padding:"12px 16px",fontSize:14,background:"#222",color:"#fff",border:"1px solid #333",fontFamily:"monospace",outline:"none"}}/>
            <button onClick={()=>{stopCamera();handleBarcodeLookup(manualBarcode)}} disabled={manualBarcode.length<8||barcodeLoading} style={{borderRadius:12,padding:"12px 20px",fontWeight:600,fontSize:14,background:manualBarcode.length>=8?"#E07A5F":"#333",color:"#fff",border:"none",cursor:"pointer",fontFamily:"inherit"}}>OK</button>
          </div>
        </div>
      </div>}

      {view === "product" && productResult && <div className="gf-abs">
        <Header title="Produit scanné" onBack={resetAndHome}/>
        <div className="gf-scroll" style={{paddingTop:16}}>
          <div className="gf-card" style={{overflow:"hidden",marginBottom:16}}>
            {productResult.image&&<div style={{display:"flex",justifyContent:"center",padding:16,background:"#FAFAF8"}}><img src={productResult.image} alt="" style={{maxHeight:140,objectFit:"contain",borderRadius:8}}/></div>}
            <div style={{padding:16}}><h2 style={{fontFamily:"Sora",fontWeight:700,fontSize:16,marginBottom:4}}>{productResult.name}</h2>{productResult.brands&&<p style={{fontSize:12,color:"#8D99AE",marginBottom:8}}>{productResult.brands}</p>}<p style={{fontSize:12,fontFamily:"monospace",padding:"4px 8px",borderRadius:4,display:"inline-block",background:"#F5F0E8",color:"#8D6E4C"}}>🔢 {productResult.barcode}</p></div>
          </div>
          {productResult.ingredients_text&&<div style={{marginBottom:12}}><p className="gf-section-label">Composition</p><div className="gf-card"><p style={{fontSize:12,lineHeight:1.6,color:"#5C5470"}}>{productResult.ingredients_text}</p></div></div>}
          {productResult.additives?.length>0&&<div style={{marginBottom:12}}><p className="gf-section-label">🧪 Additifs</p><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{productResult.additives.map((a,i)=><span key={i} style={{fontSize:11,padding:"4px 8px",borderRadius:99,fontWeight:500,background:"#FFF0F0",border:"1px solid #FECACA",color:"#C4363A"}}>{a}</span>)}</div></div>}
          {productResult.allergens?.length>0&&<div style={{marginBottom:12}}><p className="gf-section-label">⚠️ Allergènes</p><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{productResult.allergens.map((a,i)=><span key={i} style={{fontSize:11,padding:"4px 8px",borderRadius:99,fontWeight:500,background:"#FFF8E1",border:"1px solid #FFE082",color:"#A67C00"}}>{a}</span>)}</div></div>}
        </div>
        <div style={{padding:"12px 16px 4px",flexShrink:0,borderTop:"1px solid #F0E6D8",background:"#FFFBF5"}}>
          <p className="gf-section-label">Quantité mangée</p>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            {PORTION_SIZES.map(ps => (
              <button key={ps.v} onClick={()=>setPortion(ps.v)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,borderRadius:14,padding:"10px 0",border: portion===ps.v ? "2.5px solid #E07A5F" : "1.5px solid #F0E6D8",background: portion===ps.v ? "#FFF5EE" : "#fff",cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
                <span style={{fontSize:22}}>{ps.emoji}</span>
                <span style={{fontSize:12,fontWeight:portion===ps.v?700:500,color: portion===ps.v?"#E07A5F":"#5C5470"}}>{ps.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{padding:"0 16px 24px",flexShrink:0,background:"#FFFBF5"}}><button className="gf-btn-primary" onClick={saveProductEntry}><Check size={18}/> Ajouter au journal ({productResult.ingredients?.length||0})</button></div>
      </div>}

      {view === "edit" && editingEntry && <div className="gf-abs">
        <Header title="Modifier" onBack={()=>{setView(null);setEditingEntry(null)}}/>
        <div className="gf-scroll" style={{paddingTop:16}}>
          {/* Date/time edit */}
          <p className="gf-section-label">Date et heure</p>
          <div style={{borderRadius:16,padding:12,background:"#fff",border:"1px solid #F0E6D8",marginBottom:16}}>
            <input type="datetime-local" value={editTimestamp} onChange={e=>setEditTimestamp(e.target.value)} style={{width:"100%",fontSize:14,outline:"none",background:"transparent",border:"none",fontFamily:"Nunito",color:"#2B2D42"}}/>
          </div>

          {editingEntry.type === "pain" ? <>
            {/* Symptom edit */}
            <p className="gf-section-label">Type de symptôme</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
              {SYMPTOM_TYPES.map(s => (
                <button key={s.key} onClick={()=>setEditSymptom(s.key)} style={{display:"flex",alignItems:"center",gap:8,borderRadius:12,padding:"10px 12px",border: editSymptom===s.key ? "2.5px solid #E07A5F" : "1.5px solid #F0E6D8",background: editSymptom===s.key ? "#FFF5EE" : "#fff",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                  <span style={{fontSize:18,flexShrink:0}}>{s.emoji}</span>
                  <span style={{fontSize:11,fontWeight:editSymptom===s.key?700:500,lineHeight:1.2}}>{s.label}</span>
                </button>
              ))}
            </div>
            {/* Pain intensity edit */}
            <p className="gf-section-label">Intensité</p>
            <div style={{display:"flex",gap:12,marginBottom:16}}>
              {PAIN_LEVELS.map(pl => (
                <button key={pl.v} onClick={()=>setEditPainLevel(pl.v)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,borderRadius:16,padding:16,border: editPainLevel===pl.v ? `2.5px solid ${pl.color}` : "1.5px solid #F0E6D8",background: editPainLevel===pl.v ? (pl.v===1?"#FFF8E1":pl.v===2?"#FFF0E0":"#FFF0F0") : "#fff",cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
                  <span style={{fontSize:24}}>{pl.emoji}</span>
                  <span style={{fontSize:12,fontWeight:editPainLevel===pl.v?700:500}}>{pl.label}</span>
                </button>
              ))}
            </div>
          </> : <>
            {/* Meal edit */}
            <p className="gf-section-label">Plats</p>
            <div style={{borderRadius:16,padding:12,background:"#fff",border:"1px solid #F0E6D8",marginBottom:16}}>
              <input value={editDishes} onChange={e=>setEditDishes(e.target.value)} placeholder="Ex: pâtes carbonara" style={{width:"100%",fontSize:14,outline:"none",background:"transparent",border:"none",fontFamily:"Nunito"}}/>
            </div>
            <p className="gf-section-label" style={{marginTop:8}}>Quantité mangée</p>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {PORTION_SIZES.map(ps => (
                <button key={ps.v} onClick={()=>setEditPortion(ps.v)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,borderRadius:14,padding:"10px 0",border: editPortion===ps.v ? "2.5px solid #E07A5F" : "1.5px solid #F0E6D8",background: editPortion===ps.v ? "#FFF5EE" : "#fff",cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
                  <span style={{fontSize:22}}>{ps.emoji}</span>
                  <span style={{fontSize:12,fontWeight:editPortion===ps.v?700:500,color: editPortion===ps.v?"#E07A5F":"#5C5470"}}>{ps.label}</span>
                </button>
              ))}
            </div>
            {editIngredients.length > 0 && <>
              <p className="gf-section-label">{editIngredients.length} ingrédient{editIngredients.length>1?"s":""}</p>
              {renderIngredientList(editIngredients, removeEditIngredient)}
            </>}

            {/* Add ingredient section */}
            <p className="gf-section-label" style={{marginTop:16}}>Ajouter un ingrédient</p>
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",gap:8,position:"relative"}}>
                <div style={{flex:1,position:"relative"}}>
                  <input
                    ref={ingSearchRef}
                    value={ingSearch}
                    onChange={e => { setIngSearch(e.target.value); setIngSearchOpen(true); }}
                    onFocus={() => setIngSearchOpen(true)}
                    onBlur={() => setTimeout(() => setIngSearchOpen(false), 150)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomIngredient(); } if (e.key === "Escape") setIngSearchOpen(false); }}
                    placeholder="Rechercher ou saisir un ingrédient..."
                    style={{width:"100%",borderRadius:12,padding:"10px 36px 10px 12px",fontSize:14,border:"1.5px solid #F0E6D8",background:"#fff",fontFamily:"inherit",outline:"none"}}
                  />
                  <Search size={14} color="#B0A090" style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
                </div>
                <button
                  onClick={addCustomIngredient}
                  disabled={!ingSearch.trim()}
                  style={{borderRadius:12,padding:"10px 12px",background:ingSearch.trim()?"#E07A5F":"#F0E6D8",color:ingSearch.trim()?"#fff":"#B0A090",border:"none",cursor:ingSearch.trim()?"pointer":"not-allowed",display:"flex",alignItems:"center",transition:"all .15s"}}
                  title="Ajouter cet ingrédient"
                ><Plus size={16}/></button>
              </div>

              {/* Dropdown suggestions */}
              {ingSearchOpen && (() => {
                const q = ingSearch.toLowerCase().trim();
                const historySuggestions = knownIngredients
                  .filter(ing => !editIngredients.some(e => e.nom === ing.nom) && (!q || ing.nom.toLowerCase().includes(q)))
                  .slice(0, 6);
                const aiFiltered = aiIngSuggestions.filter(ing => !editIngredients.some(e => e.nom === ing.nom));
                if (!historySuggestions.length && !aiFiltered.length) return null;
                return (
                  <div style={{background:"#fff",border:"1.5px solid #F0E6D8",borderRadius:12,marginTop:4,overflow:"hidden",boxShadow:"0 4px 16px rgba(0,0,0,0.08)",maxHeight:240,overflowY:"auto"}}>
                    {aiFiltered.length > 0 && <p style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:"#81B29A",padding:"8px 12px 4px",fontFamily:"Sora"}}>✨ Suggestions IA</p>}
                    {aiFiltered.map((ing, i) => (
                      <button key={`ai-${i}`} onMouseDown={() => addIngredientToEdit(ing)}
                        style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",background:"#F0FAF5",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,textAlign:"left",color:"#2B2D42"}}>
                        <span>{CAT_EMOJI[ing.categorie]||"🔹"}</span><span style={{flex:1}}>{ing.nom}</span><span style={{fontSize:10,color:"#81B29A"}}>IA</span>
                      </button>
                    ))}
                    {historySuggestions.length > 0 && <p style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:"#8D99AE",padding:"8px 12px 4px",fontFamily:"Sora"}}>Historique</p>}
                    {historySuggestions.map((ing, i) => (
                      <button key={`h-${i}`} onMouseDown={() => addIngredientToEdit(ing)}
                        style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,textAlign:"left",color:"#2B2D42",borderTop:"1px solid #F5F0E8"}}>
                        <span>{CAT_EMOJI[ing.categorie]||"🔹"}</span><span>{ing.nom}</span>
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* AI search button */}
              {getApiKey() && <button
                onClick={handleAiIngSearch}
                disabled={aiIngLoading}
                style={{marginTop:8,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px 12px",borderRadius:12,border:"1.5px dashed #81B29A",background:"#F0FAF5",color:"#4a9070",cursor:aiIngLoading?"not-allowed":"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit",transition:"all .15s"}}>
                {aiIngLoading ? <><Loader2 size={14} className="gf-spin"/> Recherche en cours…</> : <><Sparkles size={14}/> Suggérer via IA</>}
              </button>}
            </div>

            {editingEntry.transcript && <div style={{marginTop:16}}><p className="gf-section-label">Transcript</p><p style={{fontSize:12,color:"#8D99AE",fontStyle:"italic",padding:"8px 12px",borderRadius:12,background:"#F5F0E8"}}>"{editingEntry.transcript}"</p></div>}
          </>}
        </div>
        <div style={{padding:"0 16px 24px",flexShrink:0}}><button className="gf-btn-primary" onClick={saveEdit}><Save size={18}/> Sauvegarder</button></div>
      </div>}

      {showSymptomForm && <div className="gf-abs" style={{zIndex:60}}><SymptomForm onSave={saveSymptomEntry} onCancel={()=>setShowSymptomForm(false)}/></div>}
      {showInfo && <InfoPanel onClose={()=>setShowInfo(false)}/>}

      {showPainModal && <div className="gf-modal-backdrop" onClick={()=>setShowPainModal(false)}><div className="gf-modal-bg"/><div className="gf-modal" onClick={e=>e.stopPropagation()}>
        <div className="gf-modal-handle"/>
        {painStep === "symptom" ? <>
          <h2 style={{fontFamily:"Sora",fontWeight:700,textAlign:"center",fontSize:18,marginBottom:4}}>Quel symptôme ?</h2>
          <p style={{textAlign:"center",fontSize:12,marginBottom:16,color:"#8D99AE"}}>{new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
            {SYMPTOM_TYPES.map(s=>(
              <button key={s.key} onClick={()=>selectSymptom(s.key)} style={{display:"flex",alignItems:"center",gap:8,borderRadius:12,padding:"10px 12px",border:"1.5px solid #F0E6D8",background:"#fff",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                <span style={{fontSize:20,flexShrink:0}}>{s.emoji}</span>
                <span style={{fontSize:12,fontWeight:600,lineHeight:1.2}}>{s.label}</span>
              </button>
            ))}
          </div>
          <button onClick={()=>setShowPainModal(false)} style={{width:"100%",padding:12,fontSize:14,fontWeight:500,borderRadius:12,color:"#8D99AE",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
        </> : <>
          <h2 style={{fontFamily:"Sora",fontWeight:700,textAlign:"center",fontSize:18,marginBottom:4}}>Quelle intensité ?</h2>
          <p style={{textAlign:"center",fontSize:13,marginBottom:16,color:"#5C5470"}}>
            {SYMPTOM_TYPES.find(s=>s.key===pendingSymptom)?.emoji} {SYMPTOM_TYPES.find(s=>s.key===pendingSymptom)?.label}
          </p>
          <div style={{display:"flex",gap:12,marginBottom:16}}>{PAIN_LEVELS.map(pl=><button key={pl.v} onClick={()=>savePain(pl.v)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:8,borderRadius:16,padding:20,border:`1.5px solid ${pl.color}`,background:pl.v===1?"#FFF8E1":pl.v===2?"#FFF0E0":"#FFF0F0",cursor:"pointer",fontFamily:"inherit"}}><span style={{fontSize:28}}>{pl.emoji}</span><span style={{fontSize:12,fontWeight:600}}>{pl.label}</span></button>)}</div>
          <button onClick={()=>setPainStep("symptom")} style={{width:"100%",padding:12,fontSize:14,fontWeight:500,borderRadius:12,color:"#8D99AE",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>← Retour</button>
        </>}
      </div></div>}

      {showSettings && <div className="gf-modal-backdrop" onClick={()=>setShowSettings(false)}><div className="gf-modal-bg"/><div className="gf-modal" onClick={e=>e.stopPropagation()}>
        <div className="gf-modal-handle"/><h2 style={{fontFamily:"Sora",fontWeight:700,textAlign:"center",fontSize:18,marginBottom:4}}><Key size={20} style={{display:"inline",verticalAlign:"-3px",marginRight:8}}/>Configuration</h2>
        <p style={{textAlign:"center",fontSize:12,marginBottom:20,color:"#8D99AE"}}>Clé nécessaire pour l'analyse IA (audio, texte, photo)</p>
        <div style={{padding:16}}>
          <label style={{display:"block",fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:"#B0A090",marginBottom:8,fontFamily:"Sora"}}>Clé API Anthropic</label>
          <input type="password" value={apiKeyInput} onChange={e=>setApiKeyInput(e.target.value)} placeholder="sk-ant-api03-..." style={{width:"100%",borderRadius:12,padding:"12px 16px",fontSize:14,background:"#fff",border:"1.5px solid #F0E6D8",outline:"none",fontFamily:"monospace"}}/>
          <p style={{fontSize:11,color:"#8D99AE",marginTop:8}}>🔒 Stockée uniquement dans ton navigateur.</p>
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" style={{fontSize:12,color:"#E07A5F",display:"flex",alignItems:"center",gap:4,marginTop:8,textDecoration:"none"}}><ExternalLink size={12}/> Obtenir une clé API</a>
          {!getApiKey() && <p style={{fontSize:11,color:"#B0A090",marginTop:12,padding:"8px 10px",borderRadius:8,background:"#F5F0E8"}}>Sans clé, seul le scan code-barres et la saisie manuelle restent disponibles.</p>}
        </div>
        <div style={{display:"flex",gap:12,marginTop:20}}>
          <button onClick={()=>setShowSettings(false)} style={{flex:1,borderRadius:16,padding:14,fontWeight:600,fontSize:14,background:"#F0E6D8",color:"#8D6E4C",border:"none",cursor:"pointer",fontFamily:"inherit"}}>{getApiKey()?"Annuler":"Passer"}</button>
          <button onClick={()=>{setApiKeyStore(apiKeyInput.trim());setShowSettings(false)}} disabled={!apiKeyInput.trim()} style={{flex:1,borderRadius:16,padding:14,fontWeight:600,fontSize:14,background:apiKeyInput.trim()?"#81B29A":"#D8D0C8",color:"#fff",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Enregistrer</button>
        </div>
      </div></div>}
    </div>
  );
}
