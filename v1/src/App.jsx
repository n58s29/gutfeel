import { useState, useEffect } from "react";
import { Settings, Home as HomeIcon, BookOpen, BarChart3 } from "lucide-react";
import { runMigrations } from "./lib/migrations.js";
import { loadEntries, persistEntries, getCurrentAnalysis, startNewAnalysis } from "./lib/storage.js";
import HomeScreen from "./components/Home/HomeScreen.jsx";
import JournalScreen from "./components/Journal/JournalScreen.jsx";
import AnalysisScreen from "./components/Analysis/AnalysisScreen.jsx";
import SettingsModal from "./components/Settings/SettingsModal.jsx";
import PainModal from "./components/Pain/PainModal.jsx";
import MealEditor from "./components/MealEditor/MealEditor.jsx";
import VoiceCapture from "./components/Capture/VoiceCapture.jsx";
import TextCapture from "./components/Capture/TextCapture.jsx";
import PhotoCapture from "./components/Capture/PhotoCapture.jsx";
import BarcodeCapture from "./components/Capture/BarcodeCapture.jsx";
import QuickActionsSheet from "./components/Capture/QuickActionsSheet.jsx";
import WelcomeNoticeV1 from "./components/Onboarding/WelcomeNoticeV1.jsx";

const NOTICE_KEY_V1 = "mieuxdemain-notice-v1.0.0-redesign";

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function MieuxDemain() {
  const [tab, setTab] = useState("home");
  const [entries, setEntries] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [painState, setPainState] = useState(null);   // null | { mode, initialEntry? }
  const [mealEditorState, setMealEditorState] = useState(null); // null | { mode, ... }
  const [captureMethod, setCaptureMethod] = useState(null); // null | "voice" | "text" | ...
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    runMigrations();
    const loaded = loadEntries();
    setEntries(loaded);
    setCurrentAnalysis(getCurrentAnalysis());
    // Show v1.0.0 redesign notice once for existing users (≥1 entry).
    // Skip for fresh installs to avoid bothering brand-new users.
    if (loaded.length > 0 && !localStorage.getItem(NOTICE_KEY_V1)) {
      setShowWelcome(true);
    }
  }, []);

  function handleStartNewAnalysis(label) {
    setCurrentAnalysis(startNewAnalysis(label));
  }

  function dismissWelcome() {
    localStorage.setItem(NOTICE_KEY_V1, "1");
    setShowWelcome(false);
  }

  function updateEntries(next) {
    setEntries(next);
    persistEntries(next);
  }

  // ── Pain capture / edit ────────────────────────────────────────
  function savePainEntry(form) {
    const isEdit = painState?.mode === "edit";
    if (isEdit) {
      const updated = entries.map(e =>
        e.id === painState.initialEntry.id
          ? { ...e, ...form, type: "pain" }
          : e
      );
      updateEntries(updated);
    } else {
      const entry = {
        id: genId(),
        type: "pain",
        timestamp: form.timestamp,
        symptoms: form.symptoms,
        severity: form.severity,
        location: form.location,
        bristol: form.bristol,
      };
      updateEntries([entry, ...entries]);
    }
    setPainState(null);
  }

  // ── Meal capture / edit ────────────────────────────────────────
  function saveMealEntry(form) {
    const isEdit = mealEditorState?.mode === "edit";
    if (isEdit) {
      const updated = entries.map(e =>
        e.id === mealEditorState.initialEntry.id
          ? {
              ...e,
              dishes: form.dishes,
              ingredients: form.ingredients,
              portion: form.portion,
              timestamp: form.timestamp,
            }
          : e
      );
      updateEntries(updated);
    } else {
      const entry = {
        id: genId(),
        type: "meal",
        timestamp: form.timestamp,
        source: form.source,
        dishes: form.dishes,
        ingredients: form.ingredients,
        portion: form.portion,
        ...(form.transcript ? { transcript: form.transcript } : {}),
      };
      updateEntries([entry, ...entries]);
    }
    setMealEditorState(null);
  }

  // ── Entry actions (Edit / Duplicate / Delete) ──────────────────
  function handleEditEntry(entry) {
    if (entry.type === "pain") {
      setPainState({ mode: "edit", initialEntry: entry });
    } else {
      setMealEditorState({
        mode: "edit",
        initialEntry: entry,
        initialDishes: entry.dishes || [],
        initialIngredients: (entry.ingredients || []).map(ing =>
          typeof ing === "string"
            ? { nom: ing, categorie: "autre" }
            : { nom: ing.nom, categorie: ing.categorie || "autre" }
        ),
        initialPortion: entry.portion || "normal",
        initialTimestamp: entry.timestamp,
      });
    }
  }

  function handleDuplicateEntry(entry) {
    const { id: _id, timestamp: _ts, ...rest } = entry;
    updateEntries([{ ...rest, id: genId(), timestamp: new Date().toISOString() }, ...entries]);
  }

  function handleDeleteEntry(entry) {
    if (!window.confirm("Supprimer cette entrée ?")) return;
    updateEntries(entries.filter(e => e.id !== entry.id));
  }

  // ── Capture flows ──────────────────────────────────────────────
  function handleCapture(method) {
    setCaptureMethod(method);
  }

  // Barcode saves directly without going through MealEditor — ingredients come
  // from Open Food Facts, not the AI, so the user just confirms the product card.
  function handleBarcodeSave(entry) {
    updateEntries([{ ...entry, id: genId() }, ...entries]);
    setCaptureMethod(null);
  }

  function handleCaptureComplete(result) {
    setCaptureMethod(null);
    setMealEditorState({
      mode: "create",
      source: result.source,
      initialDishes: result.plats || [],
      initialIngredients: result.ingredients || [],
      initialPortion: "normal",
      transcript: result.transcript,
      imagePreview: result.imagePreview,
    });
  }

  const handlePain = () => setPainState({ mode: "create" });

  return (
    <div className="app-shell" data-tab={tab}>
      <header className="app-header">
        <div className="app-logo">Mieux Demain</div>
        <button className="app-icon-btn" aria-label="Paramètres" onClick={() => setShowSettings(true)}>
          <Settings size={20} />
        </button>
      </header>

      <main className="app-scroll">
        {tab === "home" && (
          <HomeScreen
            entries={entries}
            onPain={handlePain}
            onCapture={handleCapture}
            onSeeJournal={() => setTab("journal")}
          />
        )}
        {tab === "journal" && (
          <JournalScreen
            entries={entries}
            onShowQuickActions={() => setShowQuickActions(true)}
            onEditEntry={handleEditEntry}
            onDuplicateEntry={handleDuplicateEntry}
            onDeleteEntry={handleDeleteEntry}
          />
        )}
        {tab === "analysis" && <AnalysisScreen entries={entries} currentAnalysis={currentAnalysis} />}
      </main>

      <nav className="tabbar">
        <TabButton active={tab === "home"} onClick={() => setTab("home")} icon={<HomeIcon size={22} />} label="Accueil" />
        <TabButton active={tab === "journal"} onClick={() => setTab("journal")} icon={<BookOpen size={22} />} label="Journal" />
        <TabButton active={tab === "analysis"} onClick={() => setTab("analysis")} icon={<BarChart3 size={22} />} label="Analyse" />
      </nav>

      {showSettings && (
        <SettingsModal
          entries={entries}
          currentAnalysis={currentAnalysis}
          onStartNewAnalysis={handleStartNewAnalysis}
          onClose={() => setShowSettings(false)}
        />
      )}

      {painState && (
        <PainModal
          mode={painState.mode}
          initialEntry={painState.initialEntry}
          onSave={savePainEntry}
          onCancel={() => setPainState(null)}
        />
      )}

      {mealEditorState && (
        <MealEditor
          mode={mealEditorState.mode}
          source={mealEditorState.source}
          initialDishes={mealEditorState.initialDishes}
          initialIngredients={mealEditorState.initialIngredients}
          initialPortion={mealEditorState.initialPortion}
          initialTimestamp={mealEditorState.initialTimestamp}
          transcript={mealEditorState.transcript}
          imagePreview={mealEditorState.imagePreview}
          onSave={saveMealEntry}
          onCancel={() => setMealEditorState(null)}
        />
      )}

      {captureMethod === "voice" && (
        <VoiceCapture
          onComplete={handleCaptureComplete}
          onCancel={() => setCaptureMethod(null)}
          onOpenSettings={() => { setCaptureMethod(null); setShowSettings(true); }}
        />
      )}

      {captureMethod === "text" && (
        <TextCapture
          onComplete={handleCaptureComplete}
          onCancel={() => setCaptureMethod(null)}
          onOpenSettings={() => { setCaptureMethod(null); setShowSettings(true); }}
        />
      )}

      {(captureMethod === "photo" || captureMethod === "label") && (
        <PhotoCapture
          mode={captureMethod === "label" ? "label" : "meal"}
          onComplete={handleCaptureComplete}
          onCancel={() => setCaptureMethod(null)}
          onOpenSettings={() => { setCaptureMethod(null); setShowSettings(true); }}
        />
      )}

      {captureMethod === "barcode" && (
        <BarcodeCapture
          onSave={handleBarcodeSave}
          onCancel={() => setCaptureMethod(null)}
        />
      )}

      {showQuickActions && (
        <QuickActionsSheet
          onClose={() => setShowQuickActions(false)}
          onCapture={(method) => { setShowQuickActions(false); handleCapture(method); }}
          onPain={() => { setShowQuickActions(false); handlePain(); }}
        />
      )}

      {showWelcome && <WelcomeNoticeV1 onClose={dismissWelcome} />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button className={`tabbar-item ${active ? "active" : ""}`} onClick={onClick}>
      {icon}
      <span className="tabbar-item-label">{label}</span>
    </button>
  );
}
