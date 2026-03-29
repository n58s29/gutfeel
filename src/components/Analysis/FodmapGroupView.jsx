import { FODMAP_CATEGORIES, getFodmapCategories } from "../../lib/fodmapDictionary.js";

const CAT_EMOJI = { laitier:"🥛", cereale:"🌾", viande:"🥩", poisson:"🐟", legume:"🥬", fruit:"🍎", noix:"🥜", epice:"🧂", additif:"🧪", legumineuse:"🫘", oeuf:"🥚", sucre:"🍯", graisse:"🫒", autre:"📦" };

export default function FodmapGroupView({ data }) {
  if (!data?.ingredients?.length) return null;

  // Group by FODMAP category
  const groups = {};
  data.ingredients.forEach(ing => {
    const cats = getFodmapCategories(ing.name);
    const catKey = cats?.[0] ?? "unknown";
    if (!groups[catKey]) groups[catKey] = { ingredients: [], totalImpact: 0 };
    groups[catKey].ingredients.push(ing);
    groups[catKey].totalImpact += ing.totalImpact;
  });

  // Sort groups by total impact
  const sorted = Object.entries(groups)
    .filter(([k]) => k !== "unknown")
    .sort((a, b) => b[1].totalImpact - a[1].totalImpact);

  const unknownGroup = groups["unknown"];

  const maxGroupImpact = sorted[0]?.[1]?.totalImpact ?? 1;

  return (
    <div>
      {/* Unknown FODMAP */}
      {unknownGroup?.ingredients.length > 0 && (
        <p style={{ fontSize: 11, color: "#B0A090", marginBottom: 8, padding: "0 4px" }}>
          {unknownGroup.ingredients.length} ingrédient(s) non classifiés FODMAP ignorés
        </p>
      )}

      {sorted.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🤔</p>
          <p style={{ fontSize: 13, color: "#8D99AE" }}>Aucun ingrédient reconnu dans le dictionnaire FODMAP</p>
        </div>
      )}

      {sorted.map(([catKey, group]) => {
        const meta = FODMAP_CATEGORIES[catKey];
        if (!meta) return null;
        const barPct = Math.round((group.totalImpact / maxGroupImpact) * 100);
        return (
          <div
            key={catKey}
            style={{
              borderRadius: 14,
              border: `1px solid ${meta.border}`,
              background: meta.bg,
              padding: "12px 14px",
              marginBottom: 10,
            }}
          >
            {/* Group header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 13, color: meta.color }}>{meta.label}</span>
                <span style={{ fontSize: 11, color: "#8D99AE", marginLeft: 6 }}>{meta.description}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>
                {group.ingredients.length} ingr.
              </span>
            </div>

            {/* Group impact bar */}
            <div style={{ height: 5, borderRadius: 3, background: "rgba(0,0,0,0.08)", overflow: "hidden", marginBottom: 10 }}>
              <div style={{ width: `${barPct}%`, height: "100%", borderRadius: 3, background: meta.color, transition: "width 0.5s" }} />
            </div>

            {/* Ingredients in this group */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {group.ingredients
                .sort((a, b) => b.totalImpact - a.totalImpact)
                .map(ing => (
                  <span
                    key={ing.name}
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 99,
                      background: "#fff",
                      border: `1px solid ${meta.border}`,
                      color: "#2B2D42",
                      fontWeight: 500,
                    }}
                  >
                    {CAT_EMOJI[ing.categorie] || "📦"} {ing.name}
                  </span>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
