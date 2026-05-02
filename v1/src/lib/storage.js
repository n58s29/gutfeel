// Centralized localStorage access for Mieux Demain v1.
// Keys are prefixed `mieuxdemain-` for backwards-compatibility with v0 data.

export const STORAGE_KEY = "mieuxdemain-entries";
export const APIKEY_KEY = "mieuxdemain-apikey";
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
