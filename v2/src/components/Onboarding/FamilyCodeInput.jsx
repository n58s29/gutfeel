import { useState, useRef } from "react";
import { KeyRound, Eye, EyeOff, X } from "lucide-react";

// Champ « code famille » : bouton œil pour afficher / masquer,
// croix pour tout effacer. Utilisé au démarrage et dans les Paramètres.
export default function FamilyCodeInput({ value, onChange, onEnter, autoFocus = false }) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);

  function clear() {
    onChange("");
    inputRef.current?.focus();
  }

  return (
    <div className="settings-input-row">
      <KeyRound size={18} className="settings-input-icon" />
      <input
        ref={inputRef}
        type={visible ? "text" : "password"}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onEnter?.(); }}
        placeholder="Code famille"
        className="input"
        style={{ paddingLeft: 44, paddingRight: value ? 88 : 48 }}
        autoFocus={autoFocus}
      />
      <div className="code-input-actions">
        {value && (
          <button type="button" className="code-input-btn" onClick={clear} aria-label="Effacer le code" title="Effacer">
            <X size={18} />
          </button>
        )}
        <button
          type="button"
          className="code-input-btn"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? "Masquer le code" : "Afficher le code"}
          title={visible ? "Masquer" : "Afficher"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
