// Backup / restore of the user's localStorage. Same wire format as v0.10.0,
// so files exported from v0 are importable in v1 and vice-versa.

import { STORAGE_PREFIX, readAllAppKeys, clearAllAppKeys } from "./storage.js";

export function exportBackup(version) {
  const data = readAllAppKeys();
  const payload = {
    app: "gutfeel",
    version,
    exportedAt: new Date().toISOString(),
    data,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `gutfeel-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Returns -1 / 0 / 1, or null if either side isn't a valid "X.Y.Z" string.
export function compareSemver(a, b) {
  const parse = v => {
    if (typeof v !== "string") return null;
    const parts = v.split(".");
    if (parts.length !== 3) return null;
    const nums = parts.map(p => parseInt(p, 10));
    return nums.every(n => Number.isFinite(n) && n >= 0) ? nums : null;
  };
  const pa = parse(a), pb = parse(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}

export function importBackup(file, appVersion, { onError, onSuccess } = {}) {
  const reader = new FileReader();
  reader.onload = () => {
    let backup;
    try { backup = JSON.parse(reader.result); }
    catch { onError?.("Fichier de backup invalide"); return; }
    if (!backup || backup.app !== "gutfeel" || !backup.data || typeof backup.data !== "object") {
      onError?.("Fichier de backup invalide"); return;
    }

    const cmp = compareSemver(backup.version, appVersion);
    let successMsg;
    if (cmp === null) {
      if (!window.confirm("Version du backup non détectée. Continuer quand même ?")) return;
      successMsg = "Données restaurées avec succès";
    } else if (cmp > 0) {
      onError?.(`Ce backup vient d'une version plus récente (v${backup.version}) que l'app actuelle (v${appVersion}). Mets à jour l'app avant de l'importer pour éviter de corrompre tes données.`);
      return;
    } else if (cmp < 0) {
      successMsg = `Backup d'une version antérieure (v${backup.version}) importé. Les migrations vont se lancer automatiquement au prochain chargement.`;
    } else {
      successMsg = "Données restaurées avec succès";
    }

    if (!window.confirm("⚠️ Cela va remplacer TOUTES tes données actuelles (repas, douleurs, clé API). Continuer ?")) return;

    // Wipe current app keys, then restore backup keys verbatim. Migration flags
    // are restored as-is, so the existing migrations re-run only if absent.
    clearAllAppKeys();
    Object.entries(backup.data).forEach(([k, v]) => {
      if (typeof v === "string" && k.startsWith(STORAGE_PREFIX)) {
        localStorage.setItem(k, v);
      }
    });

    onSuccess?.(successMsg);
  };
  reader.onerror = () => onError?.("Lecture du fichier impossible");
  reader.readAsText(file);
}
