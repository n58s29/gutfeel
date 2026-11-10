export const SYMPTOM_TYPES = [
  { key: "abdominal_pain", emoji: "😣", label: "Douleur abdominale" },
  { key: "gas",            emoji: "💨", label: "Gaz / flatulences" },
  { key: "bloating",       emoji: "🎈", label: "Ballonnement" },
  { key: "nausea",         emoji: "🤢", label: "Nausée / vomissement" },
  { key: "fatigue",        emoji: "😴", label: "Fatigue" },
  { key: "heartburn",      emoji: "🔥", label: "Brûlures / reflux" },
  { key: "diarrhea",       emoji: "💧", label: "Diarrhée" },
  { key: "discomfort",     emoji: "😕", label: "Inconfort abdominal" },
  { key: "belching",       emoji: "🫧", label: "Éructations" },
  { key: "headache",       emoji: "🤕", label: "Maux de tête" },
  { key: "constipation",   emoji: "🧱", label: "Constipation" },
  { key: "psych_distress", emoji: "😰", label: "Stress / détresse" },
];

export const SEVERITY_LEVELS = [
  { v: 2.5,  label: "Léger",        desc: "Gênant mais supportable",    emoji: "😐", color: "#FFE082" },
  { v: 5.0,  label: "Modéré",       desc: "Perturbe mes activités",      emoji: "😣", color: "#FFB74D" },
  { v: 7.5,  label: "Sévère",       desc: "Doit m'arrêter",             emoji: "😖", color: "#FF8A65" },
  { v: 10.0, label: "Insupportable",desc: "Besoin d'aide",              emoji: "🤢", color: "#EF9A9A" },
];

// Symptoms that trigger the AbdomenMap selector
export const LOCATABLE_SYMPTOMS = ["abdominal_pain", "discomfort"];

// Symptoms that trigger the Bristol Scale selector
export const BRISTOL_SYMPTOMS = ["diarrhea", "constipation"];

export function getSymptom(key) {
  return SYMPTOM_TYPES.find(s => s.key === key);
}

export function getSeverity(score) {
  return SEVERITY_LEVELS.find(s => s.v === score) ?? SEVERITY_LEVELS[0];
}

// Backwards compat: old entries use intensity 1|2|3, new use severity float
export function legacyIntensityToSeverity(intensity) {
  return intensity === 3 ? 7.5 : intensity === 2 ? 5.0 : 2.5;
}

// Get canonical symptom keys from an entry (handles both old and new data model)
export function getEntrySymptoms(entry) {
  if (entry.symptoms?.length) return entry.symptoms;
  if (entry.symptom) return [entry.symptom];
  return ["abdominal_pain"];
}

export function getEntrySeverity(entry) {
  if (entry.severity != null) return entry.severity;
  return legacyIntensityToSeverity(entry.intensity ?? 1);
}
