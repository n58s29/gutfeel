// Centralized localStorage access for Mieux Demain v1.
// Keys are prefixed `mieuxdemain-` for backwards-compatibility with v0 data.

export const STORAGE_KEY = "mieuxdemain-entries";
export const FAMILY_CODE_KEY = "mieuxdemain-family-code";
// Copie des repas avant la renormalisation v2 (migration v5), pour pouvoir revenir en arrière.
export const SNAPSHOT_V2_KEY = "mieuxdemain-snapshot-before-v2";
// Anciennes clés API (v0/v1) : supprimées par la migration v5.
export const LEGACY_APIKEY_KEYS = ["mieuxdemain-apikey", "gutfeel-apikey"];
export const ANALYSES_KEY = "mieuxdemain-analyses";
export const STORAGE_PREFIX = "mieuxdemain-";

export function loadEntries() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

export function persistEntries(entries) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
}

// Code famille : donne accès au relais IA (la vraie clé API reste côté serveur).
export function getFamilyCode() {
  try { return localStorage.getItem(FAMILY_CODE_KEY) || ""; } catch { return ""; }
}

export function setFamilyCode(code) {
  try {
    if (code) localStorage.setItem(FAMILY_CODE_KEY, code);
    else localStorage.removeItem(FAMILY_CODE_KEY);
  } catch {}
}

// ── Analyses (named tracking periods) ─────────────────────────
// Stored as an array of { id, label, startDate, endedAt? }.
// The current analysis is the entry without `endedAt`; there is
// always exactly one current after the v4 migration has run.

export function loadAnalyses() {
  try { return JSON.parse(localStorage.getItem(ANALYSES_KEY) || "[]"); }
  catch { return []; }
}

export function persistAnalyses(arr) {
  try { localStorage.setItem(ANALYSES_KEY, JSON.stringify(arr)); } catch {}
}

export function getCurrentAnalysis() {
  const all = loadAnalyses();
  return all.find(a => !a.endedAt) || null;
}

function genAnalysisId() {
  return "an_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Archives the current analysis (sets endedAt = now) and pushes a
// new one starting now with the given label (or a date-based fallback).
// Returns the new current analysis.
export function startNewAnalysis(label) {
  const now = new Date().toISOString();
  const all = loadAnalyses();
  const archived = all.map(a => a.endedAt ? a : { ...a, endedAt: now });
  const next = {
    id: genAnalysisId(),
    label: (label || "").trim() || defaultAnalysisLabel(now),
    startDate: now,
  };
  const updated = [...archived, next];
  persistAnalyses(updated);
  return next;
}

export function defaultAnalysisLabel(iso) {
  try {
    const d = new Date(iso);
    return "Analyse du " + d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "Analyse";
  }
}

export function getFlag(key) {
  return localStorage.getItem(key);
}

export function setFlag(key, value = "1") {
  localStorage.setItem(key, value);
}

// Clés jamais exportées ni écrasées par un import (identifiants).
const NON_EXPORTED_KEYS = new Set([FAMILY_CODE_KEY, SNAPSHOT_V2_KEY, ...LEGACY_APIKEY_KEYS]);
export function isExportableKey(k) {
  return !!k && k.startsWith(STORAGE_PREFIX) && !NON_EXPORTED_KEYS.has(k);
}

// Used by the Settings export/import buttons.
export function readAllAppKeys() {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (isExportableKey(k)) out[k] = localStorage.getItem(k);
  }
  return out;
}

// Efface les données de l'app avant un import (garde le code famille).
export function clearAllAppKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (isExportableKey(k)) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
}

// ── Retour arrière de la renormalisation v2 ─────────────────────
export function hasV2Snapshot() {
  try { return !!localStorage.getItem(SNAPSHOT_V2_KEY); } catch { return false; }
}

// Remet les ingrédients des repas tels qu'ils étaient avant la v2.
// Les entrées créées ou modifiées après restent intactes, sauf les repas
// présents dans la copie, qui reprennent leur version d'origine.
// Renvoie le nombre de repas restaurés.
export function restoreV2Snapshot() {
  const raw = localStorage.getItem(SNAPSHOT_V2_KEY);
  if (!raw) return 0;
  const before = JSON.parse(raw);
  const byId = new Map(before.filter(e => e && e.id).map(e => [e.id, e]));
  let restored = 0;
  const next = loadEntries().map(e => {
    const old = byId.get(e.id);
    if (old && e.type === "meal") { restored++; return { ...e, ingredients: old.ingredients }; }
    return e;
  });
  persistEntries(next);
  return restored;
}
