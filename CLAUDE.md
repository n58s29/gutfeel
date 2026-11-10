# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

GutFeel (nom du repo/déploiement) / « Mieux Demain » (nom interne, préfixe des clés localStorage) : tracker alimentaire vocal pour identifier des intolérances par corrélation ingrédients ↔ douleurs. SPA React 18 + Vite hébergée sur GitHub Pages, plus un relais IA Cloudflare Worker. README et CHANGELOG sont en français. App utilisée par quelques membres d'une famille.

Le dossier local n'est pas un dépôt git : l'utilisateur met les fichiers en ligne **à la main** via l'interface web GitHub. Après chaque modification, donner la liste exacte des fichiers créés/modifiés/supprimés (chemins depuis la racine). `.github/workflows/deploy.yml` n'existe qu'en ligne ; c'est lui qui choisit le dossier buildé (`v1` → `v2` pour la bascule).

## Versions

- `v2/` : version active (à modifier).
- `v1/`, `v0/` : archives pour rollback. Ne pas y travailler sauf demande explicite.
- `cloudflare-worker/worker.js` : relais IA, collé à la main dans le dashboard Cloudflare (pas de déploiement automatique). Secrets `ANTHROPIC_API_KEY` et `FAMILY_CODE` côté Cloudflare uniquement.
- `CHANGELOG.md` (toutes versions) et `TICKETS.md` (signalements utilisateur) sont à la racine.

## Commandes (depuis `v2/`)

```bash
npm install
npm run dev       # http://localhost:5173/gutfeel/  (base Vite = /gutfeel/)
npm run build
npm run preview
```

Aucun test, linter ni typecheck configuré. Les modules de `src/lib/` (hors `storage.js`/`api.js`) sont du JS pur : on peut les tester avec un script `node` qui les importe directement.

## Architecture

- `src/App.jsx` : composant racine `MieuxDemain`. Il tient tout l'état (entrées, analyse courante, modales, méthode de capture) et le passe aux écrans par props. Pas de router ni de store : onglets `home` / `journal` / `analysis` et modales pilotées par des états `null | {...}`.
- `src/components/<Feature>/` : pas de composants atomiques (`<Button>`, `<Card>`), uniquement des classes CSS de `theme.css`.
- `src/config.js` : `WORKER_URL`, adresse du relais (pas un secret).
- `src/lib/` :
  - `storage.js` : seul point d'accès à localStorage, clés préfixées `mieuxdemain-`. Le code famille (`mieuxdemain-family-code`) n'est ni exporté ni écrasé par l'import JSON (`isExportableKey`).
  - `migrations.js` : migrations idempotentes (flags localStorage), exécutées au montage dans l'ordre. Nouvelle migration = nouveau flag à la suite, sans modifier les anciennes. v5 = renormalisation v2 + suppression des anciennes clés API.
  - `api.js` : tous les appels IA passent par `callClaude()` → `WORKER_URL/v1/messages` avec l'en-tête `x-family-code`, et une réponse contrainte par schéma JSON (`output_config.format`). Le Worker impose le modèle et plafonne `max_tokens`. Le vocabulaire d'ingrédients déjà présent dans le journal est injecté dans les prompts. Open Food Facts pour les codes-barres (arbre d'ingrédients aplati).
  - `foodNormalizer.js` : `normalizeIngredientName` (nettoyage → synonymes → qualificatifs → singulier → accents) et `normalizeIngredients` (normalise + dédoublonne + catégorie via `resolveCategory`, le dictionnaire local primant sur l'IA). Toute source d'ingrédients doit passer par là.
  - `fodmapDictionary.js` : clés normalisées par le même normaliseur, correspondance partielle en mots entiers.
  - `correlation.js` : risque relatif lissé avec/sans ingrédient, épisodes (saisies < 2 h fusionnées), pondération par délai (`lagWeight`), seuils (`MIN_MEALS_WITH`, `MIN_EPISODES`) et test z (`Z_MIN`). `AnalysisScreen` filtre d'abord les entrées sur l'analyse en cours.
  - `backup.js` / `csv.js` : export/import JSON (`{app:"gutfeel", version, data}`, validation semver) et export CSV.

## Points d'attention

- **Compatibilité des données** : schéma des entrées inchangé depuis v0 ; un backup v2 n'est pas importable en v1 (refus des versions plus récentes).
- **Ingrédients en français, un nom par aliment** : normalisation côté code + prompts stricts + vocabulaire du journal. En ajoutant un synonyme, mettre la cible au singulier ; les pluriels canoniques assumés sont dans `PROTECTED` (`pâtes`, `petits pois`…).
- **Filtre code-barres** : `isLikelyIngredient` teste sur le texte sans accents (`\b` ne gère pas les accents en JS) ; voir `TICKETS.md` #1 et #2.
- Quand une version ou un correctif est livré, mettre à jour `CHANGELOG.md` / `TICKETS.md`.
