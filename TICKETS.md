# Tickets — GutFeel

Historique des signalements utilisateur.
Statuts : `ouvert` · `en cours` · `corrigé` · `rejeté`

---

## #1 — Doublons et texte parasite dans les ingrédients du scan code-barres

- **Date** : 2026-04-25
- **Source** : utilisateur (capture d'écran)
- **Statut** : corrigé en v0.9.5
- **Produit testé** : Poêlée parisienne d'aucy 290g

**Description**
Sur un scan code-barres, deux problèmes apparaissent dans la liste d'ingrédients :
1. `oignon` apparaît deux fois (doublon non fusionné après normalisation).
2. Du texte non-ingrédient est présenté comme ingrédient :
   - `hormis les champignons` (mention d'exception sur l'origine)
   - `• tous ces légumes sont cultivés en france` (mention d'origine, préfixe `•` de footnote)

**Cause**
- Aucune déduplication post-normalisation dans `saveProductEntry`.
- `lookupBarcode` ne filtrait pas les chaînes renvoyées par Open Food Facts qui ne sont pas des ingrédients (lignes de footnote, mentions d'origine, exceptions).

**Correction**
- Ajout d'un filtre `isLikelyIngredient` rejetant : préfixes `•`/`*`, mots-clés d'exception (`hormis`, `sauf`…), mentions d'origine (`cultivé`, `origine`…), phrases complètes (verbes conjugués), chaînes > 6 mots.
- Déduplication par nom canonique dans `saveProductEntry` (préserve l'ordre d'apparition).

---

## #2 — Anciennes entrées en anglais non rétroactivement traduites

- **Date** : 2026-04-25
- **Source** : utilisateur (capture d'écran : produit Nature Valley)
- **Statut** : corrigé en v0.9.6

**Description**
Les nouveaux scans Nature Valley s'affichent bien en français, mais les anciennes entrées du même produit (déjà sauvées en localStorage) restent en anglais (`peanuts`, `soy protein`, `glucose syrup`…).

**Cause**
La migration v1 (`mieuxdemain-migration-v1-food-normalize`) avait normalisé les noms au moment de l'installation initiale, mais :
- `normalizeIngredientName` n'était pas appelée dans le flux scan code-barres avant v0.9.4 → les entrées scannées entre v1 et v0.9.4 sont passées sans normalisation,
- v1 ne se rejoue pas (flag posé), donc ces entrées restent figées en anglais.

**Correction**
Migration v3 (`mieuxdemain-migration-v3-renormalize`) qui re-passe `normalizeIngredientName` sur tous les ingrédients de tous les repas existants, avec dédup par nom canonique au passage (cohérent avec ticket #1).
