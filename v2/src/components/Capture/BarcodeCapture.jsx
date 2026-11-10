import { useState, useRef, useEffect } from "react";
import { X, ScanBarcode, Loader2, RefreshCw, Check, Type, ChevronRight, Camera } from "lucide-react";
import { lookupBarcode, normalizeBarcodeIngredients } from "../../lib/api.js";

export default function BarcodeCapture({ onSave, onCancel }) {
  // States: "scanning" | "manual" | "looking-up" | "found" | "not-found" | "error"
  const [state, setState] = useState("scanning");
  const [error, setError] = useState(null);
  const [manualCode, setManualCode] = useState("");
  const [productResult, setProductResult] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  const hasBarcodeAPI = typeof window !== "undefined" && "BarcodeDetector" in window;

  // Mount / unmount
  useEffect(() => {
    if (!hasBarcodeAPI) {
      setError("Le scan caméra n'est pas supporté sur ce navigateur. Saisis le code manuellement.");
      setState("manual");
      return;
    }
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });

      scanIntervalRef.current = setInterval(async () => {
        const v = videoRef.current;
        if (!v || v.readyState < 2) return;
        try {
          const codes = await detector.detect(v);
          if (codes.length > 0 && codes[0].rawValue) {
            stopCamera();
            await handleLookup(codes[0].rawValue);
          }
        } catch {}
      }, 400);
    } catch {
      setError("Caméra indisponible. Saisis le code manuellement.");
      setState("manual");
    }
  }

  function stopCamera() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function handleLookup(code) {
    setState("looking-up");
    setError(null);
    try {
      const product = await lookupBarcode(code);
      if (!product) {
        setState("not-found");
        return;
      }
      setProductResult(product);
      setState("found");
    } catch {
      setError("Erreur lors de la recherche du produit.");
      setState("error");
    }
  }

  function handleManualSubmit() {
    const code = manualCode.trim();
    if (!code) return;
    handleLookup(code);
  }

  function handleSave() {
    if (!productResult) return;
    onSave({
      type: "meal",
      source: "barcode",
      product_name: productResult.name,
      barcode: productResult.barcode,
      brands: productResult.brands,
      dishes: [productResult.name],
      ingredients: normalizeBarcodeIngredients(productResult.ingredients),
      additives: productResult.additives,
      allergens: productResult.allergens,
      portion: "normal",
      timestamp: new Date().toISOString(),
    });
  }

  function retryScan() {
    setError(null);
    setProductResult(null);
    setManualCode("");
    if (hasBarcodeAPI) {
      setState("scanning");
      startCamera();
    } else {
      setState("manual");
    }
  }

  function switchToManual() {
    stopCamera();
    setState("manual");
  }

  return (
    <div className="fullscreen-modal">
      <div className="fullscreen-modal-header">
        <button className="app-icon-btn" onClick={onCancel} aria-label="Annuler">
          <X size={20} />
        </button>
        <div className="fullscreen-modal-title label-md">CODE-BARRES</div>
        <div style={{ width: 40 }} />
      </div>

      <div className="fullscreen-modal-content">
        {state === "scanning" && (
          <div className="barcode-scanner">
            <div className="barcode-camera-wrap">
              <video ref={videoRef} autoPlay playsInline muted className="barcode-video" />
              <div className="barcode-viewfinder">
                <div className="barcode-corner barcode-corner-tl" />
                <div className="barcode-corner barcode-corner-tr" />
                <div className="barcode-corner barcode-corner-bl" />
                <div className="barcode-corner barcode-corner-br" />
                <div className="barcode-scanline" />
              </div>
            </div>
            <p className="body-md text-muted" style={{ textAlign: "center", marginTop: 16 }}>
              Cadre le code-barres dans le rectangle.
            </p>
            <button className="btn btn-secondary btn-block" style={{ marginTop: 16 }} onClick={switchToManual}>
              <Type size={16} /> Saisir le code manuellement
            </button>
          </div>
        )}

        {state === "manual" && (
          <div style={{ marginTop: 16 }}>
            <h1 className="headline-lg">Saisir le code-barres</h1>
            <p className="body-md text-muted" style={{ marginTop: 4, marginBottom: 24 }}>
              Tape les chiffres affichés sous le code-barres (8 ou 13 chiffres).
            </p>

            {error && (
              <div className="settings-error" style={{ marginBottom: 16 }}>
                <span style={{ flex: 1 }}>{error}</span>
                <button onClick={() => setError(null)} aria-label="Fermer"><X size={14} /></button>
              </div>
            )}

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={manualCode}
              onChange={e => setManualCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => { if (e.key === "Enter") handleManualSubmit(); }}
              placeholder="3017620422003"
              className="input"
              style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}
              autoFocus
            />

            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 16 }}
              onClick={handleManualSubmit}
              disabled={manualCode.length < 6}
            >
              Rechercher <ChevronRight size={18} />
            </button>

            {hasBarcodeAPI && (
              <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={retryScan}>
                <Camera size={16} /> Revenir au scan caméra
              </button>
            )}
          </div>
        )}

        {state === "looking-up" && (
          <div className="photo-capture-spinner" style={{ marginTop: 64 }}>
            <Loader2 size={32} className="spin" />
            <p className="body-md text-muted">Recherche du produit…</p>
          </div>
        )}

        {state === "found" && productResult && (
          <ProductCard product={productResult} />
        )}

        {state === "not-found" && (
          <div style={{ textAlign: "center", marginTop: 64 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤷</div>
            <p className="headline-md" style={{ color: "var(--color-on-surface-variant)" }}>Produit non trouvé</p>
            <p className="body-md text-muted" style={{ marginTop: 8 }}>
              Pas de fiche dans Open Food Facts pour ce code. Essaie un autre, ou saisis manuellement.
            </p>
          </div>
        )}

        {state === "error" && error && (
          <div style={{ marginTop: 32 }}>
            <div className="settings-error">
              <span style={{ flex: 1 }}>{error}</span>
            </div>
          </div>
        )}
      </div>

      <div className="fullscreen-modal-footer">
        {state === "found" ? (
          <button className="btn btn-primary btn-block" onClick={handleSave}>
            <Check size={18} /> Enregistrer ce produit
          </button>
        ) : (state === "not-found" || state === "error") ? (
          <button className="btn btn-primary btn-block" onClick={retryScan}>
            <RefreshCw size={16} /> Réessayer
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ProductCard({ product }) {
  const ingredients = normalizeBarcodeIngredients(product.ingredients);

  return (
    <div style={{ marginTop: 16 }}>
      <div className="product-card">
        {product.image && (
          <img src={product.image} alt={product.name} className="product-image" />
        )}
        <div className="product-info">
          <div className="product-name">{product.name}</div>
          {product.brands && (
            <div className="product-brand">{product.brands.split(",")[0].trim()}</div>
          )}
          <div className="product-barcode">
            <ScanBarcode size={12} /> {product.barcode}
          </div>
        </div>
      </div>

      {ingredients.length > 0 && (
        <>
          <p className="section-label">Ingrédients ({ingredients.length})</p>
          <div className="meal-chips">
            {ingredients.slice(0, 30).map((ing, i) => (
              <span key={i} className="chip">{ing.nom}</span>
            ))}
            {ingredients.length > 30 && (
              <span className="chip chip-outline">+{ingredients.length - 30}</span>
            )}
          </div>
        </>
      )}

      {product.additives?.length > 0 && (
        <>
          <p className="section-label">Additifs ({product.additives.length})</p>
          <p className="body-md text-muted">{product.additives.slice(0, 10).join(", ").toUpperCase()}</p>
        </>
      )}

      {product.allergens?.length > 0 && (
        <>
          <p className="section-label">Allergènes</p>
          <div className="meal-chips">
            {product.allergens.map((a, i) => (
              <span key={i} className="chip" style={{ background: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
                {a}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
