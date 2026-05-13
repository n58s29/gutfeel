// Centralized localStorage access for Mieux Demain v1.
// Keys are prefixed `mieuxdemain-` for backwards-compatibility with v0 data.

export const STORAGE_KEY = "mieuxdemain-entries";
export const APIKEY_KEY = "mieuxdemain-apikey";
export const ANALYSES_KEY = "mieuxdemain-analyses";
export const STORAGE_PREFIX = "mieuxdemain-";

export function loadEntries() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

export function persistEntries(entries) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
}

export function getApiKey() {
  return localStorage.getItem(APIKEY_KEY) || "";
}

export function setApiKey(key) {
  localStorage.setItem(APIKEY_KEY, key);
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

// Used by the Settings export/import buttons.
export function readAllAppKeys() {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(STORAGE_PREFIX)) out[k] = localStorage.getItem(k);
  }
  return out;
}

export function clearAllAppKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
}
