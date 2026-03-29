import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, ScanBarcode, Frown, ChevronLeft, Check, X, Trash2, Loader2, Search, Clock, ChevronDown, ChevronUp, Zap, Settings, Key, ExternalLink, Download, Pencil, Save } from "lucide-react";

/* ─── Theme & Constants ─── */
const CAT_EMOJI = { laitier:"🥛", cereale:"🌾", viande:"🥩", poisson:"🐟", legume:"🥬", fruit:"🍎", noix:"🥜", epice:"🧂", additif:"🧪", legumineuse:"🫘", oeuf:"🥚", sucre:"🍯", graisse:"🫒", autre:"📦" };
const CAT_LABEL = { laitier:"Produits laitiers", cereale:"Céréales & Gluten", viande:"Viandes", poisson:"Poissons", legume:"Légumes", fruit:"Fruits", noix:"Noix & Graines", epice:"Épices & Condiments", additif:"Additifs", legumineuse:"Légumineuses", oeuf:"Œufs", sucre:"Sucres", graisse:"Huiles & Graisses", autre:"Autres" };
const PAIN_LEVELS = [{ v:1, emoji:"😐", label:"Léger" }, { v:2, emoji:"😣", label:"Moyen" }, { v:3, emoji:"🤢", label:"Fort" }];
const STORAGE_KEY = "gutfeel-entries";
const APIKEY_KEY = "gutfeel-apikey";

/* ─── Storage (localStorage) ─── */
function loadEntries() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveEntries(entries) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
}
function getApiKey() { return localStorage.getItem(APIKEY_KEY) || ""; }
function setApiKeyStore(key) { localStorage.setItem(APIKEY_KEY, key); }

/* ─── Claude API ─── */
async function decomposeWithAI(text, apiKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 1000,
      messages: [{ role: "user", content: `Tu es un expert en nutrition. L'utilisateur décrit ce qu'il a mangé. Identifie TOUS les ingrédients élémentaires (non transformés, non composés). Inclus les ingrédients "cachés" courants (huile, sel, etc.) et les additifs probables si produit industriel.
Réponds UNIQUEMENT en JSON valide sans backticks:
{"plats":["nom1","nom2"],"ingredients":[{"nom":"farine de blé","categorie":"cereale"}]}
Catégories: laitier, cereale, viande, poisson, legume, fruit, noix, epice, additif, legumineuse, oeuf, sucre, graisse, autre
Description du repas: "${text}"` }]
    })
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message || `Erreur API (${res.status})`); }
  const data = await res.json();
  const raw = data.content?.map(b => b.text || "").join("") || "";
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

/* ─── OpenFoodFacts API ─── */
async function lookupBarcode(code) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
  const data = await res.json();
  if (data.status !== 1) return null;
  const p = data.product;
  return {
    name: p.product_name_fr || p.product_name || "Produit inconnu",
    image: p.image_front_url || p.image_url || null,
    ingredients_text: p.ingredients_text_fr || p.ingredients_text || "",
    ingredients: (p.ingredients || []).map(i => i.text),
    additives: (p.additives_tags || []).map(t => t.replace("en:", "")),
    allergens: (p.allergens_tags || []).map(t => t.replace("en:", "")),
    brands: p.brands || "",
    barcode: code,
  };
}

/* ─── Date helpers ─── */
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

/* ─── CSV Export ─── */
function exportCSV(entries) {
  const header = "Date,Heure,Type,Source,Plats,Ingrédients,Catégories,Additifs,Allergènes,Intensité douleur,Transcript,Produit,Code-barres\n";
  const rows = [...entries].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp)).map(e => {
    const date = fmtDateShort(e.timestamp);
    const time = fmtTime(e.timestamp);
    const type = e.type === "pain" ? "Douleur" : "Repas";
    const source = e.source || "";
    const plats = (e.dishes || []).join(" + ");
    const ings = (e.ingredients || []).map(i => i.nom).join(", ");
    const cats = [...new Set((e.ingredients || []).map(i => CAT_LABEL[i.categorie] || i.categorie))].join(", ");
    const additifs = (e.additives || []).join(", ");
    const allergens = (e.allergens || []).join(", ");
    const intensity = e.type === "pain" ? (PAIN_LEVELS.find(p=>p.v===e.intensity)?.label || e.intensity) : "";
    const transcript = (e.transcript || "").replace(/"/g, '""');
    const produit = e.product_name || "";
    const barcode = e.barcode || "";
    return `"${date}","${time}","${type}","${source}","${plats}","${ings}","${cats}","${additifs}","${allergens}","${intensity}","${transcript}","${produit}","${barcode}"`;
  }).join("\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gutfeel_export_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Components ─── */
function Header({ title, onBack, right }) {
  return (
    <div className="gf-header">
      {onBack ? (
        <button onClick={onBack} className="gf-back-btn"><ChevronLeft size={20}/> Retour</button>
      ) : <div style={{ width:80 }}/>}
      <h1 className="gf-title">{title}</h1>
      {right || <div style={{ width:80 }}/>}
    </div>
  );
}

function EntryCard({ entry, onDelete, onEdit, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const isPain = entry.type === "pain";
  return (
    <div className={`gf-card ${isPain ? "gf-card-pain" : ""}`}>
      <div className="gf-card-header" onClick={() => !isPain && setOpen(!open)}>
        <div className="gf-card-left">
          <span className="gf-card-emoji">{isPain ? PAIN_LEVELS.find(p=>p.v===entry.intensity)?.emoji || "😣" : entry.source === "barcode" ? "📦" : "🍽️"}</span>
          <div>
            <p className="gf-card-title">
              {isPain ? `Douleur – ${PAIN_LEVELS.find(p=>p.v===entry.intensity)?.label || "?"}` : (entry.dishes?.join(", ") || entry.product_name || entry.transcript?.slice(0,40) || "Repas")}
            </p>
            <p className="gf-card-time">{fmtTime(entry.timestamp)}{entry.source === "barcode" ? " · scan" : entry.source === "voice" ? " · vocal" : ""}</p>
          </div>
        </div>
        <div className="gf-card-right">
          {!isPain && entry.ingredients?.length > 0 && (
            <span className="gf-badge">{entry.ingredients.length}</span>
          )}
          {!isPain && (open ? <ChevronUp size={16} color="#8D99AE"/> : <ChevronDown size={16} color="#8D99AE"/>)}
        </div>
      </div>
      {open && entry.ingredients?.length > 0 && (
        <div className="gf-card-ingredients">
          {entry.ingredients.map((ing, i) => (
            <span key={i} className="gf-ingredient-tag">
              {CAT_EMOJI[ing.categorie] || "📦"} {ing.nom}
            </span>
          ))}
        </div>
      )}
      {open && (
        <div style={{ display:"flex", gap:8, marginTop:8, justifyContent:"flex-end" }}>
          {onEdit && <button onClick={(ev) => { ev.stopPropagation(); onEdit(entry); }} style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, padding:"4px 10px", borderRadius:8, background:"#F0E6D8", color:"#8D6E4C", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
            <Pencil size={12}/> Modifier
          </button>}
          {onDelete && <button onClick={(ev) => { ev.stopPropagation(); onDelete(entry.id); }} style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, padding:"4px 10px", borderRadius:8, background:"#FFF0F0", color:"#E63946", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
            <Trash2 size={12}/> Supprimer
          </button>}
        </div>
      )}
    </div>
  );
}

/* ─── Main App ─── */
export default function GutFeel() {
  const [view, setView] = useState("home");
  const [entries, setEntries] = useState([]);

  // Voice
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const isRecordingRef = useRef(false);

  // Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [editedIngredients, setEditedIngredients] = useState([]);
  const [error, setError] = useState(null);

  // Scanner
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [hasBarcodeAPI, setHasBarcodeAPI] = useState(false);
  const [scanningActive, setScanningActive] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [productResult, setProductResult] = useState(null);

  // Pain & feedback
  const [showPainModal, setShowPainModal] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(null);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");

  // Edit mode
  const [editingEntry, setEditingEntry] = useState(null);
  const [editDishes, setEditDishes] = useState("");
  const [editIngredients, setEditIngredients] = useState([]);

  // Load
  useEffect(() => {
    setEntries(loadEntries());
    setApiKeyInput(getApiKey());
    setHasBarcodeAPI("BarcodeDetector" in window);
    if (!getApiKey()) setShowSettings(true);
  }, []);

  useEffect(() => { return () => { stopCamera(); stopRecognition(); }; }, []);

  function updateEntries(updated) { setEntries(updated); saveEntries(updated); }

  function saveApiKeyAndClose() { setApiKeyStore(apiKeyInput.trim()); setShowSettings(false); }

  /* ─── Speech Recognition (FIX v2: single-utterance mode, no duplicates) ─── */
  function startRecognition() {
    if (!getApiKey()) { setShowSettings(true); setError("Configure ta clé API Anthropic d'abord !"); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError("Reconnaissance vocale non supportée. Utilise Chrome."); return; }

    // Reset state
    finalTranscriptRef.current = "";
    isRecordingRef.current = true;
    setTranscript("");
    setInterimText("");
    setView("recording");
    setIsRecording(true);

    function createAndStartSession() {
      const rec = new SR();
      rec.lang = "fr-FR";
      rec.continuous = false;     // ← single utterance = clean results per session
      rec.interimResults = true;

      rec.onresult = (e) => {
        let sessionFinal = "";
        let interim = "";
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            sessionFinal += e.results[i][0].transcript;
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        if (sessionFinal) {
          finalTranscriptRef.current += sessionFinal.trim() + " ";
          setTranscript(finalTranscriptRef.current.trim());
        }
        setInterimText(interim);
      };

      rec.onerror = (e) => {
        if (e.error !== "no-speech" && e.error !== "aborted") {
          setError(`Erreur micro : ${e.error}`);
        }
      };

      rec.onend = () => {
        // Auto-restart if still recording (new clean session each time)
        if (isRecordingRef.current) {
          try { createAndStartSession(); } catch {}
        }
      };

      try { rec.start(); } catch {}
      recognitionRef.current = rec;
    }

    createAndStartSession();
  }

  function stopRecognition() {
    isRecordingRef.current = false;
    const rec = recognitionRef.current;
    if (rec) { rec.onend = null; rec.stop(); recognitionRef.current = null; }
    setIsRecording(false);
    setInterimText("");
  }

  function handleStopRecording() {
    stopRecognition();
    if (transcript.trim() || finalTranscriptRef.current.trim()) {
      setTranscript(finalTranscriptRef.current.trim());
      setView("transcript");
    } else setView("home");
  }

  /* ─── AI Analysis ─── */
  async function handleAnalyze() {
    setAnalyzing(true); setError(null);
    try {
      const result = await decomposeWithAI(transcript, getApiKey());
      setAnalysisResult(result);
      setEditedIngredients(result.ingredients || []);
      setView("ingredients");
    } catch (e) {
      setError(e.message || "Erreur lors de l'analyse IA.");
    } finally { setAnalyzing(false); }
  }

  function removeIngredient(idx) { setEditedIngredients(prev => prev.filter((_, i) => i !== idx)); }

  function saveVoiceEntry() {
    const entry = {
      id: genId(), timestamp: new Date().toISOString(), type: "meal", source: "voice",
      transcript, dishes: analysisResult?.plats || [], ingredients: editedIngredients,
    };
    updateEntries([entry, ...entries]);
    showSavedFeedbackFn();
    resetAndHome();
  }

  /* ─── Barcode Scanner ─── */
  async function startCamera() {
    setView("scanner"); setScanningActive(true); setManualBarcode(""); setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      if (hasBarcodeAPI) startBarcodeDetection();
    } catch { setScanningActive(false); setError("Impossible d'accéder à la caméra. Saisis le code manuellement."); }
  }

  function startBarcodeDetection() {
    const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0 && barcodes[0].rawValue) { stopCamera(); handleBarcodeLookup(barcodes[0].rawValue); }
      } catch {}
    }, 400);
  }

  function stopCamera() {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setScanningActive(false);
  }

  async function handleBarcodeLookup(code) {
    setBarcodeLoading(true); setError(null);
    try {
      const product = await lookupBarcode(code);
      if (!product) { setError(`Produit non trouvé pour le code ${code}.`); setBarcodeLoading(false); return; }
      setProductResult(product);
      setView("product");
    } catch { setError("Erreur lors de la recherche du produit."); }
    finally { setBarcodeLoading(false); }
  }

  function saveProductEntry() {
    const ingredients = (productResult.ingredients || []).map(name => ({ nom: name.toLowerCase(), categorie: "autre" }));
    const entry = {
      id: genId(), timestamp: new Date().toISOString(), type: "meal", source: "barcode",
      product_name: productResult.name, barcode: productResult.barcode, brands: productResult.brands,
      dishes: [productResult.name], ingredients, additives: productResult.additives, allergens: productResult.allergens,
    };
    updateEntries([entry, ...entries]);
    showSavedFeedbackFn();
    resetAndHome();
  }

  /* ─── Pain ─── */
  function savePain(level) {
    const entry = { id: genId(), timestamp: new Date().toISOString(), type: "pain", intensity: level };
    updateEntries([entry, ...entries]);
    setShowPainModal(false);
    showSavedFeedbackFn();
  }

  /* ─── Edit entry ─── */
  function startEdit(entry) {
    setEditingEntry(entry);
    setEditDishes((entry.dishes || []).join(", "));
    setEditIngredients([...(entry.ingredients || [])]);
    setView("edit");
  }

  function saveEdit() {
    const updated = entries.map(e => {
      if (e.id !== editingEntry.id) return e;
      return { ...e, dishes: editDishes.split(",").map(d=>d.trim()).filter(Boolean), ingredients: editIngredients };
    });
    updateEntries(updated);
    showSavedFeedbackFn();
    setEditingEntry(null);
    setView("history");
  }

  function removeEditIngredient(idx) { setEditIngredients(prev => prev.filter((_, i) => i !== idx)); }

  /* ─── Delete ─── */
  function deleteEntry(id) {
    if (!window.confirm("Supprimer cet enregistrement ?")) return;
    updateEntries(entries.filter(e => e.id !== id));
  }

  /* ─── Helpers ─── */
  function resetAndHome() {
    setTranscript(""); setInterimText(""); setAnalysisResult(null); setEditedIngredients([]);
    setProductResult(null); setManualBarcode(""); setError(null);
    finalTranscriptRef.current = ""; isRecordingRef.current = false;
    setView("home");
  }

  function showSavedFeedbackFn() { setSavedFeedback(true); setTimeout(() => setSavedFeedback(false), 1800); }

  const grouped = groupByDay(entries);

  /* ─── Render ingredient list (reused in ingredients + edit views) ─── */
  function renderIngredientList(ings, onRemove) {
    const grouped = ings.reduce((acc, ing, idx) => {
      const cat = ing.categorie || "autre";
      (acc[cat] = acc[cat] || []).push({ ...ing, _idx: idx });
      return acc;
    }, {});
    return Object.entries(grouped).sort(([a],[b]) => a.localeCompare(b)).map(([cat, items]) => (
      <div key={cat} style={{ marginBottom:12 }}>
        <p style={{ fontSize:12, fontWeight:600, marginBottom:6, display:"flex", alignItems:"center", gap:6, color:"#5C5470" }}>
          {CAT_EMOJI[cat] || "📦"} {CAT_LABEL[cat] || cat}
        </p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {items.map(ing => (
            <span key={ing._idx} style={{ fontSize:12, paddingLeft:10, paddingRight:4, paddingTop:4, paddingBottom:4, borderRadius:99, fontWeight:500, display:"inline-flex", alignItems:"center", gap:4, background:"#fff", border:"1px solid #F0E6D8", color:"#2B2D42" }}>
              {ing.nom}
              <button onClick={() => onRemove(ing._idx)} style={{ borderRadius:99, padding:2, marginLeft:2, background:"none", border:"none", cursor:"pointer" }}>
                <X size={12} color="#E63946"/>
              </button>
            </span>
          ))}
        </div>
      </div>
    ));
  }

  return (
    <div className="gf-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Nunito:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .gf-root {
          font-family: 'Nunito', sans-serif; background: #FFFBF5; color: #2B2D42;
          height: 100vh; height: 100dvh; max-width: 480px; margin: 0 auto;
          display: flex; flex-direction: column; position: relative; overflow: hidden;
          -webkit-font-smoothing: antialiased;
        }
        .gf-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #F0E6D8; flex-shrink: 0; }
        .gf-title { font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 700; letter-spacing: -0.5px; }
        .gf-back-btn { display: flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 500; color: #E07A5F; background: none; border: none; cursor: pointer; font-family: inherit; }
        .gf-card { background: #fff; border: 1px solid #F0E6D8; border-radius: 16px; padding: 12px; margin-bottom: 8px; animation: gf-fadein 0.35s ease-out both; }
        .gf-card-pain { background: #FFF0F0; border-color: #FECACA; }
        .gf-card-header { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
        .gf-card-left { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
        .gf-card-emoji { font-size: 20px; flex-shrink: 0; }
        .gf-card-title { font-weight: 600; font-size: 13px; line-height: 1.3; color: #2B2D42; overflow: hidden; text-overflow: ellipsis; }
        .gf-card-time { font-size: 11px; color: #8D99AE; margin-top: 2px; }
        .gf-card-right { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .gf-badge { font-size: 11px; padding: 2px 8px; border-radius: 99px; font-weight: 600; background: #F0E6D8; color: #8D6E4C; }
        .gf-card-ingredients { margin-top: 10px; padding-top: 10px; border-top: 1px solid #F0E6D8; display: flex; flex-wrap: wrap; gap: 6px; }
        .gf-ingredient-tag { font-size: 11px; padding: 4px 8px; border-radius: 99px; font-weight: 500; background: #FFFBF5; border: 1px solid #F0E6D8; color: #5C5470; }
        .gf-btn-primary { width: 100%; border-radius: 16px; padding: 14px; font-weight: 600; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; background: #81B29A; color: #fff; border: none; cursor: pointer; font-family: inherit; transition: transform 0.1s; }
        .gf-btn-primary:active { transform: scale(0.97); }
        .gf-btn-secondary { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 16px; padding: 14px; font-weight: 600; font-size: 14px; background: #fff; border: 1.5px solid #F0E6D8; color: #2B2D42; cursor: pointer; font-family: inherit; transition: transform 0.1s; }
        .gf-btn-secondary:active { transform: scale(0.97); }
        .gf-btn-pain { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 16px; padding: 14px; font-weight: 600; font-size: 14px; background: #FFF0F0; border: 1.5px solid #FECACA; color: #E63946; cursor: pointer; font-family: inherit; transition: transform 0.1s; animation: gf-painpulse 3s ease-in-out infinite; }
        .gf-btn-pain:active { transform: scale(0.97); }
        .gf-mic-hero { width: 96px; height: 96px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #E07A5F, #D4583B); box-shadow: 0 8px 30px rgba(224,122,95,0.35); border: none; cursor: pointer; animation: gf-pulse 2.5s ease-in-out infinite; transition: transform 0.1s; }
        .gf-mic-hero:active { transform: scale(0.93); }
        .gf-scroll { flex: 1; overflow-y: auto; padding: 0 16px 16px; -webkit-overflow-scrolling: touch; min-height: 0; }
        .gf-section-label { font-family: 'Sora', sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #B0A090; margin-bottom: 8px; padding: 0 4px; }
        @keyframes gf-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(224,122,95,0.45)} 50%{box-shadow:0 0 0 22px rgba(224,122,95,0)} }
        @keyframes gf-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        @keyframes gf-painpulse { 0%,100%{box-shadow:0 0 0 0 rgba(230,57,70,0.4)} 50%{box-shadow:0 0 0 14px rgba(230,57,70,0)} }
        @keyframes gf-fadein { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes gf-scan { 0%{top:15%} 50%{top:75%} 100%{top:15%} }
        @keyframes gf-check { 0%{transform:scale(0)} 50%{transform:scale(1.2)} 100%{transform:scale(1)} }
        @keyframes gf-spin { to{transform:rotate(360deg)} }
        .gf-spin { animation: gf-spin 1s linear infinite; }
        .gf-overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 50; background: rgba(255,251,245,0.85); backdrop-filter: blur(4px); }
        .gf-modal-backdrop { position: fixed; inset: 0; display: flex; align-items: flex-end; justify-content: center; z-index: 50; }
        .gf-modal-bg { position: absolute; inset: 0; background: rgba(43,45,66,0.4); backdrop-filter: blur(4px); }
        .gf-modal { position: relative; width: 100%; max-width: 480px; border-radius: 24px 24px 0 0; padding: 24px; background: #FFFBF5; animation: gf-fadein 0.3s ease-out; }
        .gf-modal-handle { width: 40px; height: 4px; border-radius: 99px; background: #D8D0C8; margin: 0 auto 16px; }
        .gf-error { position: absolute; top: 64px; left: 16px; right: 16px; z-index: 40; border-radius: 12px; padding: 12px; display: flex; align-items: flex-start; gap: 10px; background: #FFF0F0; border: 1px solid #FECACA; animation: gf-fadein 0.3s ease-out; }
        .gf-error p { font-size: 13px; color: #C4363A; flex: 1; }
        .gf-error button { background: none; border: none; cursor: pointer; }
        .gf-viewfinder { position: relative; width: 75%; aspect-ratio: 3/1; border: 3px solid rgba(255,255,255,0.6); border-radius: 16px; }
        .gf-scanline { position: absolute; left: 8px; right: 8px; height: 2px; background: #E07A5F; animation: gf-scan 2s linear infinite; }
      `}</style>

      {/* ═══ Saved feedback ═══ */}
      {savedFeedback && (
        <div className="gf-overlay">
          <div style={{ animation:"gf-check 0.4s ease-out" }}>
            <div style={{ width:80, height:80, borderRadius:"50%", background:"#81B29A", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Check size={40} color="#fff" strokeWidth={3}/>
            </div>
            <p style={{ textAlign:"center", marginTop:12, fontWeight:600, color:"#81B29A", fontFamily:"Sora" }}>Enregistré !</p>
          </div>
        </div>
      )}

      {/* ═══ Error toast ═══ */}
      {error && (
        <div className="gf-error">
          <Zap size={18} color="#E63946" style={{ flexShrink:0, marginTop:2 }}/>
          <p>{error}</p>
          <button onClick={() => setError(null)}><X size={16} color="#E63946"/></button>
        </div>
      )}

      {/* ═══ HOME ═══ */}
      {view === "home" && (<>
        <div className="gf-header">
          <button onClick={() => setShowSettings(true)} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}>
            <Settings size={20} color="#8D99AE"/>
          </button>
          <h1 className="gf-title">GutFeel</h1>
          <button onClick={() => setView("history")} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:4, color:"#E07A5F", fontSize:14, fontWeight:500, fontFamily:"inherit" }}>
            <Clock size={16}/> Tout
          </button>
        </div>
        <div className="gf-scroll">
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:24, paddingBottom:16 }}>
            <button className="gf-mic-hero" onClick={startRecognition}><Mic size={38} color="#fff" strokeWidth={2.5}/></button>
            <p style={{ marginTop:12, fontWeight:600, fontSize:14, color:"#2B2D42" }}>Enregistrer un repas</p>
            <p style={{ fontSize:12, marginTop:2, color:"#8D99AE" }}>Dis ce que tu as mangé</p>
          </div>
          <div style={{ display:"flex", gap:12, marginBottom:24 }}>
            <button className="gf-btn-secondary" onClick={startCamera}><ScanBarcode size={20} color="#E07A5F"/> Scanner</button>
            <button className="gf-btn-pain" onClick={() => setShowPainModal(true)}><Frown size={20}/> Aïe !</button>
          </div>
          {entries.length === 0 ? (
            <div style={{ textAlign:"center", padding:"32px 0" }}>
              <p style={{ fontSize:32, marginBottom:8 }}>🍽️</p>
              <p style={{ fontWeight:600, fontSize:14, color:"#8D99AE" }}>Aucun enregistrement</p>
              <p style={{ fontSize:12, marginTop:4, color:"#B0B8C8" }}>Commence par dire ce que tu as mangé !</p>
            </div>
          ) : (
            Object.entries(grouped).slice(0, 3).map(([day, items]) => (
              <div key={day} style={{ marginBottom:16 }}>
                <p className="gf-section-label">{day}</p>
                {items.slice(0, 5).map(e => <EntryCard key={e.id} entry={e}/>)}
              </div>
            ))
          )}
        </div>
      </>)}

      {/* ═══ RECORDING (FIX: sticky stop button + scrollable transcript) ═══ */}
      {view === "recording" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", background:"linear-gradient(180deg,#FFFBF5 0%,#FFF0E8 100%)", minHeight:0, overflow:"hidden" }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:40, flexShrink:0 }}>
            <div style={{ width:120, height:120, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#E07A5F,#D4583B)", animation:"gf-breathe 1.8s ease-in-out infinite", boxShadow:"0 10px 40px rgba(224,122,95,0.4)" }}>
              <Mic size={48} color="#fff" strokeWidth={2}/>
            </div>
            <p style={{ fontFamily:"Sora", fontWeight:700, fontSize:18, marginTop:16, marginBottom:4, color:"#2B2D42" }}>Je t'écoute...</p>
            <p style={{ fontSize:14, color:"#8D99AE", marginBottom:16 }}>Dis-moi ce que tu as mangé</p>
          </div>
          {/* Scrollable transcript area */}
          <div style={{ flex:1, overflow:"hidden", padding:"0 24px", minHeight:0 }}>
            <div style={{ height:"100%", overflowY:"auto", borderRadius:16, padding:16, background:"rgba(255,255,255,0.8)", border:"1px solid #F0E6D8" }}>
              {transcript && <p style={{ fontSize:14, color:"#2B2D42", lineHeight:1.6 }}>{transcript}</p>}
              {interimText && <span style={{ fontSize:14, fontStyle:"italic", color:"#B0A090" }}>{interimText}</span>}
              {!transcript && !interimText && <p style={{ fontSize:14, fontStyle:"italic", color:"#C8C0B8" }}>En attente de ta voix...</p>}
            </div>
          </div>
          {/* Sticky stop button */}
          <div style={{ padding:"16px 24px 32px", flexShrink:0, display:"flex", justifyContent:"center" }}>
            <button onClick={handleStopRecording} style={{ borderRadius:99, padding:"14px 32px", fontWeight:600, fontSize:14, display:"flex", alignItems:"center", gap:8, background:"#2B2D42", color:"#fff", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
              <MicOff size={18}/> Arrêter
            </button>
          </div>
        </div>
      )}

      {/* ═══ TRANSCRIPT REVIEW ═══ */}
      {view === "transcript" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>
          <Header title="Vérification" onBack={resetAndHome}/>
          <div className="gf-scroll" style={{ paddingTop:16 }}>
            <p className="gf-section-label">Ce que j'ai compris</p>
            <div style={{ borderRadius:16, padding:16, background:"#fff", border:"1px solid #F0E6D8", marginBottom:16 }}>
              <textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={5}
                style={{ width:"100%", fontSize:14, resize:"none", outline:"none", background:"transparent", border:"none", color:"#2B2D42", fontFamily:"Nunito", lineHeight:1.6 }}/>
            </div>
            <p style={{ fontSize:12, color:"#8D99AE" }}>✏️ Tu peux corriger le texte avant l'analyse</p>
          </div>
          <div style={{ padding:"0 16px 24px", display:"flex", gap:12, flexShrink:0 }}>
            <button onClick={resetAndHome} style={{ flex:1, borderRadius:16, padding:14, fontWeight:600, fontSize:14, background:"#F0E6D8", color:"#8D6E4C", border:"none", cursor:"pointer", fontFamily:"inherit" }}>Annuler</button>
            <button onClick={handleAnalyze} disabled={analyzing || !transcript.trim()}
              style={{ flex:1, borderRadius:16, padding:14, fontWeight:600, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, background: analyzing ? "#F0C8B8" : "linear-gradient(135deg,#E07A5F,#D4583B)", color:"#fff", border:"none", cursor:"pointer", fontFamily:"inherit", opacity:(!transcript.trim() && !analyzing) ? 0.5 : 1 }}>
              {analyzing ? <><Loader2 size={16} className="gf-spin"/> Analyse...</> : <><Search size={16}/> Analyser</>}
            </button>
          </div>
        </div>
      )}

      {/* ═══ INGREDIENTS REVIEW ═══ */}
      {view === "ingredients" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>
          <Header title="Ingrédients" onBack={() => setView("transcript")}/>
          <div className="gf-scroll" style={{ paddingTop:12 }}>
            {analysisResult?.plats?.length > 0 && (
              <div style={{ marginBottom:12 }}>
                <p className="gf-section-label">Plats identifiés</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {analysisResult.plats.map((p, i) => (
                    <span key={i} style={{ fontSize:12, padding:"6px 12px", borderRadius:99, fontWeight:600, background:"#E07A5F", color:"#fff" }}>🍽️ {p}</span>
                  ))}
                </div>
              </div>
            )}
            <p className="gf-section-label" style={{ marginTop:12 }}>
              {editedIngredients.length} ingrédient{editedIngredients.length > 1 ? "s" : ""} détecté{editedIngredients.length > 1 ? "s" : ""}
            </p>
            <p style={{ fontSize:12, color:"#8D99AE", marginBottom:12 }}>Supprime ceux qui ne correspondent pas</p>
            {renderIngredientList(editedIngredients, removeIngredient)}
          </div>
          <div style={{ padding:"0 16px 24px", flexShrink:0 }}>
            <button className="gf-btn-primary" onClick={saveVoiceEntry}>
              <Check size={18}/> Enregistrer ({editedIngredients.length} ingrédients)
            </button>
          </div>
        </div>
      )}

      {/* ═══ SCANNER ═══ */}
      {view === "scanner" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", background:"#000", minHeight:0, overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px" }}>
            <button onClick={() => { stopCamera(); resetAndHome(); }} style={{ display:"flex", alignItems:"center", gap:4, fontSize:14, fontWeight:500, color:"#fff", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
              <ChevronLeft size={20}/> Retour
            </button>
            <span style={{ fontFamily:"Sora", fontWeight:700, fontSize:14, color:"#fff" }}>Scanner</span>
            <div style={{ width:60 }}/>
          </div>
          <div style={{ flex:1, position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <video ref={videoRef} playsInline muted style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
            <div className="gf-viewfinder">
              {scanningActive && hasBarcodeAPI && <div className="gf-scanline"/>}
            </div>
            {barcodeLoading && (
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.6)", zIndex:20 }}>
                <Loader2 size={32} className="gf-spin" color="#E07A5F"/>
              </div>
            )}
          </div>
          <div style={{ padding:16, background:"#111" }}>
            <p style={{ fontSize:12, textAlign:"center", marginBottom:8, color:"#888" }}>
              {hasBarcodeAPI ? "Ou saisis le code manuellement" : "Saisis le code-barres manuellement"}
            </p>
            <div style={{ display:"flex", gap:8 }}>
              <input type="tel" value={manualBarcode} onChange={e => setManualBarcode(e.target.value.replace(/\D/g,""))}
                placeholder="Ex: 3017620422003"
                style={{ flex:1, borderRadius:12, padding:"12px 16px", fontSize:14, background:"#222", color:"#fff", border:"1px solid #333", fontFamily:"monospace", outline:"none" }}/>
              <button onClick={() => { stopCamera(); handleBarcodeLookup(manualBarcode); }} disabled={manualBarcode.length < 8 || barcodeLoading}
                style={{ borderRadius:12, padding:"12px 20px", fontWeight:600, fontSize:14, background: manualBarcode.length >= 8 ? "#E07A5F" : "#333", color:"#fff", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PRODUCT REVIEW (FIX v2: robust flex layout) ═══ */}
      {view === "product" && productResult && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>
          <Header title="Produit scanné" onBack={resetAndHome}/>
          <div className="gf-scroll" style={{ paddingTop:16 }}>
            <div className="gf-card" style={{ overflow:"hidden", marginBottom:16 }}>
              {productResult.image && (
                <div style={{ display:"flex", justifyContent:"center", padding:16, background:"#FAFAF8" }}>
                  <img src={productResult.image} alt={productResult.name} style={{ maxHeight:140, objectFit:"contain", borderRadius:8 }}/>
                </div>
              )}
              <div style={{ padding:16 }}>
                <h2 style={{ fontFamily:"Sora", fontWeight:700, fontSize:16, marginBottom:4, color:"#2B2D42" }}>{productResult.name}</h2>
                {productResult.brands && <p style={{ fontSize:12, color:"#8D99AE", marginBottom:8 }}>{productResult.brands}</p>}
                <p style={{ fontSize:12, fontFamily:"monospace", padding:"4px 8px", borderRadius:4, display:"inline-block", background:"#F5F0E8", color:"#8D6E4C" }}>🔢 {productResult.barcode}</p>
              </div>
            </div>
            {productResult.ingredients_text && (
              <div style={{ marginBottom:12 }}>
                <p className="gf-section-label">Composition</p>
                <div className="gf-card"><p style={{ fontSize:12, lineHeight:1.6, color:"#5C5470" }}>{productResult.ingredients_text}</p></div>
              </div>
            )}
            {productResult.additives?.length > 0 && (
              <div style={{ marginBottom:12 }}>
                <p className="gf-section-label">🧪 Additifs</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {productResult.additives.map((a, i) => (
                    <span key={i} style={{ fontSize:11, padding:"4px 8px", borderRadius:99, fontWeight:500, background:"#FFF0F0", border:"1px solid #FECACA", color:"#C4363A" }}>{a}</span>
                  ))}
                </div>
              </div>
            )}
            {productResult.allergens?.length > 0 && (
              <div style={{ marginBottom:12 }}>
                <p className="gf-section-label">⚠️ Allergènes</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {productResult.allergens.map((a, i) => (
                    <span key={i} style={{ fontSize:11, padding:"4px 8px", borderRadius:99, fontWeight:500, background:"#FFF8E1", border:"1px solid #FFE082", color:"#A67C00" }}>{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* FIX: sticky save button always visible */}
          <div style={{ padding:"12px 16px 24px", flexShrink:0, borderTop:"1px solid #F0E6D8", background:"#FFFBF5" }}>
            <button className="gf-btn-primary" onClick={saveProductEntry}>
              <Check size={18}/> Ajouter au journal ({productResult.ingredients?.length || 0} ingrédients)
            </button>
          </div>
        </div>
      )}

      {/* ═══ HISTORY (full + edit + export) ═══ */}
      {view === "history" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>
          <Header title="Historique" onBack={() => setView("home")} right={
            entries.length > 0 ? (
              <button onClick={() => exportCSV(entries)} style={{ display:"flex", alignItems:"center", gap:4, fontSize:13, fontWeight:600, color:"#E07A5F", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                <Download size={15}/> CSV
              </button>
            ) : null
          }/>
          <div className="gf-scroll" style={{ paddingTop:12 }}>
            {entries.length === 0 ? (
              <div style={{ textAlign:"center", padding:"48px 0" }}>
                <p style={{ fontSize:32, marginBottom:8 }}>📋</p>
                <p style={{ fontWeight:600, fontSize:14, color:"#8D99AE" }}>Rien pour l'instant</p>
              </div>
            ) : (<>
              <div style={{ marginBottom:12, padding:"8px 12px", borderRadius:12, background:"#F5F0E8", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:13, fontWeight:600, color:"#8D6E4C" }}>{entries.length} enregistrement{entries.length > 1 ? "s" : ""}</span>
                <span style={{ fontSize:12, color:"#B0A090" }}>
                  {entries.filter(e=>e.type==="meal").length} repas · {entries.filter(e=>e.type==="pain").length} douleurs
                </span>
              </div>
              {Object.entries(grouped).map(([day, items]) => (
                <div key={day} style={{ marginBottom:20 }}>
                  <p className="gf-section-label">{day}</p>
                  {items.map(e => <EntryCard key={e.id} entry={e} onDelete={deleteEntry} onEdit={e.type === "meal" ? startEdit : undefined}/>)}
                </div>
              ))}
            </>)}
          </div>
        </div>
      )}

      {/* ═══ EDIT ENTRY ═══ */}
      {view === "edit" && editingEntry && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>
          <Header title="Modifier" onBack={() => setView("history")}/>
          <div className="gf-scroll" style={{ paddingTop:16 }}>
            <p className="gf-section-label">Plats</p>
            <div style={{ borderRadius:16, padding:12, background:"#fff", border:"1px solid #F0E6D8", marginBottom:16 }}>
              <input value={editDishes} onChange={e => setEditDishes(e.target.value)}
                placeholder="Ex: pâtes carbonara, salade"
                style={{ width:"100%", fontSize:14, outline:"none", background:"transparent", border:"none", color:"#2B2D42", fontFamily:"Nunito" }}/>
            </div>
            <p className="gf-section-label">{editIngredients.length} ingrédient{editIngredients.length > 1 ? "s" : ""}</p>
            {renderIngredientList(editIngredients, removeEditIngredient)}
            {editingEntry.transcript && (
              <div style={{ marginTop:16 }}>
                <p className="gf-section-label">Transcript original</p>
                <p style={{ fontSize:12, color:"#8D99AE", fontStyle:"italic", padding:"8px 12px", borderRadius:12, background:"#F5F0E8" }}>"{editingEntry.transcript}"</p>
              </div>
            )}
          </div>
          <div style={{ padding:"0 16px 24px", flexShrink:0 }}>
            <button className="gf-btn-primary" onClick={saveEdit}>
              <Save size={18}/> Sauvegarder les modifications
            </button>
          </div>
        </div>
      )}

      {/* ═══ PAIN MODAL ═══ */}
      {showPainModal && (
        <div className="gf-modal-backdrop" onClick={() => setShowPainModal(false)}>
          <div className="gf-modal-bg"/>
          <div className="gf-modal" onClick={e => e.stopPropagation()}>
            <div className="gf-modal-handle"/>
            <h2 style={{ fontFamily:"Sora", fontWeight:700, textAlign:"center", fontSize:18, marginBottom:4, color:"#2B2D42" }}>Comment tu te sens ?</h2>
            <p style={{ textAlign:"center", fontSize:12, marginBottom:20, color:"#8D99AE" }}>Enregistré à {new Date().toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" })}</p>
            <div style={{ display:"flex", gap:12, marginBottom:16 }}>
              {PAIN_LEVELS.map(pl => (
                <button key={pl.v} onClick={() => savePain(pl.v)}
                  style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:8, borderRadius:16, padding:20, border: pl.v === 1 ? "1.5px solid #FFE082" : pl.v === 2 ? "1.5px solid #FFB74D" : "1.5px solid #FECACA", background: pl.v === 1 ? "#FFF8E1" : pl.v === 2 ? "#FFF0E0" : "#FFF0F0", cursor:"pointer", fontFamily:"inherit" }}>
                  <span style={{ fontSize:28 }}>{pl.emoji}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:"#2B2D42" }}>{pl.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowPainModal(false)} style={{ width:"100%", padding:12, fontSize:14, fontWeight:500, borderRadius:12, color:"#8D99AE", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>Annuler</button>
          </div>
        </div>
      )}

      {/* ═══ SETTINGS ═══ */}
      {showSettings && (
        <div className="gf-modal-backdrop" onClick={() => getApiKey() && setShowSettings(false)}>
          <div className="gf-modal-bg"/>
          <div className="gf-modal" onClick={e => e.stopPropagation()}>
            <div className="gf-modal-handle"/>
            <h2 style={{ fontFamily:"Sora", fontWeight:700, textAlign:"center", fontSize:18, marginBottom:4, color:"#2B2D42" }}>
              <Key size={20} style={{ display:"inline", verticalAlign:"-3px", marginRight:8 }}/>Configuration
            </h2>
            <p style={{ textAlign:"center", fontSize:12, marginBottom:20, color:"#8D99AE" }}>Clé nécessaire pour l'analyse vocale des ingrédients</p>
            <div style={{ padding:16 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, color:"#B0A090", marginBottom:8, fontFamily:"Sora" }}>Clé API Anthropic</label>
              <input type="password" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)}
                placeholder="sk-ant-api03-..."
                style={{ width:"100%", borderRadius:12, padding:"12px 16px", fontSize:14, background:"#fff", color:"#2B2D42", border:"1.5px solid #F0E6D8", outline:"none", fontFamily:"monospace" }}/>
              <p style={{ fontSize:11, color:"#8D99AE", marginTop:8 }}>🔒 Stockée uniquement dans ton navigateur.</p>
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener"
                style={{ fontSize:12, color:"#E07A5F", display:"flex", alignItems:"center", gap:4, marginTop:8, textDecoration:"none" }}>
                <ExternalLink size={12}/> Obtenir une clé API
              </a>
            </div>
            <div style={{ display:"flex", gap:12, marginTop:20 }}>
              {getApiKey() && (
                <button onClick={() => setShowSettings(false)} style={{ flex:1, borderRadius:16, padding:14, fontWeight:600, fontSize:14, background:"#F0E6D8", color:"#8D6E4C", border:"none", cursor:"pointer", fontFamily:"inherit" }}>Annuler</button>
              )}
              <button onClick={saveApiKeyAndClose} disabled={!apiKeyInput.trim()}
                style={{ flex:1, borderRadius:16, padding:14, fontWeight:600, fontSize:14, background: apiKeyInput.trim() ? "#81B29A" : "#D8D0C8", color:"#fff", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
