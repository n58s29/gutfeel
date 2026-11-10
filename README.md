# 🫶 GutFeel

**Tracker alimentaire vocal pour identifier les intolérances.**

Enregistre tout ce que tu manges (voix, photo, scan code-barres), décompose les ingrédients via IA, note tes douleurs, et identifie les ingrédients suspects par corrélation.

🌐 **App live** : https://n58s29.github.io/gutfeel/

---

## 📁 Structure du repo

Le projet est organisé par version majeure pour permettre des refontes complètes sans casser l'existant.

```
gutfeel/
├── v2/                   ← Version active (v2.0.0 — code famille, nouveau normaliseur, nouvelle analyse)
│   ├── src/
│   │   ├── components/   ← Home, Journal, Analysis, Settings, Capture, Pain, MealEditor, Onboarding
│   │   ├── lib/          ← api, storage, migrations, correlation, fodmapDictionary, foodNormalizer…
│   │   ├── config.js     ← Adresse du relais IA (Cloudflare Worker)
│   │   └── theme.css     ← Design system "Calme et minimal" (variables CSS)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── cloudflare-worker/    ← Relais IA : garde la clé API côté serveur (à coller dans Cloudflare)
├── v1/                   ← Archive — v1.0.0 (clé API saisie dans l'app)
├── v0/                   ← Archive — série v0.x (dernière v0.10.0)
│
├── CHANGELOG.md          ← Historique des versions (toutes versions confondues)
├── TICKETS.md            ← Suivi des tickets ouverts
└── .github/workflows/    ← CI/CD (build & deploy de la version active)
```

### Quelle version travailler ?

- **Pour modifier l'app en prod** → bosse dans `v2/`
- **v1/** et **v0/** restent dans le repo pour rollback éventuel

### Quelle version est déployée ?

Le workflow `.github/workflows/deploy.yml` build et déploie le dossier indiqué dans ses chemins (`v2/` depuis la v2.0.0) sur GitHub Pages.

---

## 🚀 Démarrage rapide

```bash
cd v2
npm install
npm run dev
```

Puis ouvre `http://localhost:5173/gutfeel/` dans Chrome.

L'analyse IA passe par le relais Cloudflare : renseigne son adresse dans `v2/src/config.js`, puis entre le code famille dans l'app. Voir [`cloudflare-worker/README.md`](cloudflare-worker/README.md).

---

## 📋 Versions

- **v2.0.0** (novembre 2026) — code famille au lieu de la clé API, ingrédients mieux normalisés, analyse des douleurs refondue. Voir [`CHANGELOG.md`](CHANGELOG.md)
- **v1.0.0** (mai 2026) — refonte visuelle complète, archivée dans `v1/`
- **v0.10.0** (avril 2026) — dernière de la série v0.x, archivée dans `v0/`

---

## 🛠 Stack actuelle (v2)

React 18 + Vite, Plus Jakarta Sans (Google Fonts), Web Speech API, BarcodeDetector API, Claude Sonnet 5.5 (analyse, via un Cloudflare Worker), OpenFoodFacts (lookup produits), localStorage. Le seul composant serveur est le relais IA. Design system documenté dans `v2/src/theme.css`.
