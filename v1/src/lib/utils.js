// Date / meal-label helpers, en français.

export function fmtTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDateShort(timestamp) {
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function fmtRelativeTime(timestamp) {
  const now = Date.now();
  const ts = new Date(timestamp).getTime();
  const diffMin = Math.floor((now - ts) / 60000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Il y a ${diffHr} h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Hier";
  if (diffDay < 7) return `Il y a ${diffDay} jours`;
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function mealLabelFromTime(timestamp) {
  const h = new Date(timestamp).getHours();
  if (h < 10) return "Petit-déjeuner";
  if (h < 14) return "Déjeuner";
  if (h < 17) return "Goûter";
  if (h < 22) return "Dîner";
  return "Encas";
}

// Returns the most likely category emoji from an entry's ingredients.
// Falls back to a meal-type emoji if no ingredients.
export function entryEmoji(entry, catEmoji) {
  if (entry.type === "pain") return "💢";
  const firstCat = entry.ingredients?.[0]?.categorie;
  if (firstCat && catEmoji[firstCat]) return catEmoji[firstCat];
  return "🍽️";
}
