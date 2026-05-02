// CSV export of the journal — same column layout as v0 so the file
// stays drop-in compatible with existing user spreadsheets.

import { SYMPTOM_TYPES, legacyIntensityToSeverity } from "./symptomTypes.js";
import { CAT_LABEL } from "./categories.js";
import { fmtDateShort, fmtTime } from "./utils.js";

const HEADER =
  "Date,Heure,Type,Symptômes,Sévérité,Localisation,Bristol,Source,Plats,Ingrédients,Catégories,Additifs,Allergènes,Transcript,Produit,Code-barres\n";

export function exportCSV(entries) {
  const rows = [...entries]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map(e => {
      const symptomsLabel = e.type === "pain"
        ? (e.symptoms || [e.symptom || "abdominal_pain"])
            .map(k => SYMPTOM_TYPES.find(s => s.key === k)?.label || k)
            .join(" + ")
        : "";
      const severityLabel = e.type === "pain"
        ? (e.severity ?? legacyIntensityToSeverity(e.intensity ?? 1))
        : "";
      const ingredients = e.ingredients || [];
      const cats = [...new Set(ingredients.map(i => CAT_LABEL[i.categorie] || i.categorie))];

      return `"${fmtDateShort(e.timestamp)}","${fmtTime(e.timestamp)}","${e.type === "pain" ? "Douleur" : "Repas"}","${symptomsLabel}","${severityLabel}","${e.location || ""}","${e.bristol || ""}","${e.source || ""}","${(e.dishes || []).join(" + ")}","${ingredients.map(i => i.nom).join(", ")}","${cats.join(", ")}","${(e.additives || []).join(", ")}","${(e.allergens || []).join(", ")}","${(e.transcript || "").replace(/"/g, '""')}","${e.product_name || ""}","${e.barcode || ""}"`;
    })
    .join("\n");

  const blob = new Blob(["﻿" + HEADER + rows], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mieux_demain_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
