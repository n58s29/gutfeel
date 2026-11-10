import { Plus } from "lucide-react";
import EntryCard from "./EntryCard.jsx";

export default function JournalScreen({ entries, onShowQuickActions, onEditEntry, onDuplicateEntry, onDeleteEntry }) {
  return (
    <div className="journal-screen">
      <h1 className="headline-lg">Mon Journal</h1>
      <p className="body-md text-muted" style={{ marginTop: 4 }}>
        Suivi quotidien de votre confort digestif.
      </p>

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ marginTop: 24 }}>
          {groupByDay(entries).map(({ day, items }) => (
            <div key={day} style={{ marginBottom: 20 }}>
              <p className="section-label" style={{ marginTop: 0 }}>{day}</p>
              {items.map(e => (
                <EntryCard
                  key={e.id}
                  entry={e}
                  onEdit={onEditEntry}
                  onDuplicate={onDuplicateEntry}
                  onDelete={onDeleteEntry}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <button className="fab" onClick={onShowQuickActions} aria-label="Ajouter une entrée">
        <Plus size={24} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="journal-empty">
      <div className="journal-empty-emoji">🌱</div>
      <p className="headline-md" style={{ color: "var(--color-on-surface-variant)" }}>
        Ton journal est vide
      </p>
      <p className="body-md text-muted" style={{ marginTop: 8 }}>
        Commence par noter ce que tu as mangé.
      </p>
    </div>
  );
}

// Group entries by day, returning an array of { day: "Aujourd'hui" | "Hier" | "lundi 21 avril", items: [...] }
// Days in descending order, items within a day in descending order.
function groupByDay(entries) {
  const sorted = [...entries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const map = new Map();
  for (const e of sorted) {
    const dayKey = new Date(e.timestamp).toISOString().slice(0, 10);
    if (!map.has(dayKey)) map.set(dayKey, []);
    map.get(dayKey).push(e);
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);

  return [...map.entries()].map(([key, items]) => {
    let label;
    if (key === today) label = "Aujourd'hui";
    else if (key === yesterday) label = "Hier";
    else {
      const d = new Date(key);
      label = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    }
    return { day: label, items };
  });
}
