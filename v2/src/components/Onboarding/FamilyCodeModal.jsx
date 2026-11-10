import { useState } from "react";
import { Loader2 } from "lucide-react";
import FamilyCodeInput from "./FamilyCodeInput.jsx";
import { verifyFamilyCode } from "../../lib/api.js";
import { setFamilyCode } from "../../lib/storage.js";

// Affichée au démarrage tant qu'aucun code famille n'est enregistré.
// Remplace la saisie de clé API de la v1.
export default function FamilyCodeModal({ isExistingUser, onDone, onLater }) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  async function handleValidate() {
    const c = code.trim();
    if (!c) return;
    setChecking(true);
    setError(null);
    try {
      const ok = await verifyFamilyCode(c);
      if (!ok) {
        setError("Ce code n'est pas le bon. Vérifie l'orthographe (majuscules comprises).");
        return;
      }
      setFamilyCode(c);
      onDone();
    } catch (e) {
      setError(e.message || "Vérification impossible pour le moment.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="modal-backdrop" style={{ zIndex: 200 }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: "92vh" }}>
        <div className="modal-handle" />

        <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🔑</div>
          <h2 className="headline-md">
            {isExistingUser ? "Nouveau : plus de clé API" : "Bienvenue dans Mieux Demain"}
          </h2>
          <p className="body-md text-muted" style={{ marginTop: 8 }}>
            Entre le code famille qu'on t'a transmis. Il suffit de le faire une fois sur ce téléphone.
            {isExistingUser ? " Tes repas et symptômes sont conservés." : ""}
          </p>
        </div>

        <FamilyCodeInput
          value={code}
          onChange={v => { setCode(v); setError(null); }}
          onEnter={handleValidate}
          autoFocus
        />

        {error && (
          <div className="settings-error" style={{ marginTop: 12 }}>
            <span style={{ flex: 1 }}>{error}</span>
          </div>
        )}

        <p className="body-md text-muted" style={{ marginTop: 12, fontSize: 12 }}>
          Sans code, tu peux quand même noter tes repas à la main, scanner des codes-barres et signaler tes douleurs.
          L'analyse IA (vocal, texte, photo) demande le code.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onLater}>
            Plus tard
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleValidate}
            disabled={!code.trim() || checking}
          >
            {checking ? <Loader2 size={18} className="spin" /> : null}
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}
