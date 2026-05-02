# 🫶 GutFeel

**Tracker alimentaire vocal pour identifier les intolérances.**

Enregistre tout ce que tu manges (voix, photo, scan code-barres), décompose les ingrédients via IA, note tes douleurs, et identifie les ingrédients suspects par corrélation.

🌐 **App live** : https://n58s29.github.io/gutfeel/

---

## 📁 Structure du repo

Le projet est organisé par version majeure pour permettre des refontes complètes sans casser l'existant.

```
gutfeel/
├── v1/                   ← Version actuellement déployée (v1.0.0 — refonte complète)
│   ├── src/
│   │   ├── components/   ← Home, Journal, Analysis, Settings, Capture, Pain, MealEditor, Onboarding
│   │   ├── lib/          ← api, storage, migrations, correlation, fodmapDictionary…
│   │   └── theme.css     ← Design system "Calme et minimal" (variables CSS)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
├── v0/                   ← Archive — série v0.x (dernière v0.10.0). Conservé en filet de sécurité.
│
├── CHANGELOG.md          ← Historique des versions (toutes versions confondues)
├── TICKETS.md            ← Suivi des tickets ouverts
└── .github/workflows/    ← CI/CD (build & deploy de la version active)
```

### Quelle version travailler ?

- **Pour modifier l'app en prod** → bosse dans `v1/`
- **v0/** reste dans le repo pour rollback éventuel mais n'est plus la version active

### Quelle version est déployée ?

Le workflow `.github/workflows/deploy.yml` build et déploie le dossier `v1/` sur GitHub Pages.

---

## 🚀 Démarrage rapide

```bash
cd v0
npm install
npm run dev
```

Puis ouvre `http://localhost:5173/gutfeel/` dans Chrome.

Pour la doc complète (config API, stack technique, fonctionnalités), voir [`v0/README.md`](v0/README.md).

---

## 📋 Versions

- **v1.0.0** (mai 2026) — version actuelle en prod, refonte visuelle complète. Voir [`CHANGELOG.md`](CHANGELOG.md)
- **v0.10.0** (avril 2026) — dernière de la série v0.x, archivée dans `v0/`

---

## 🛠 Stack actuelle (v1)

React 18 + Vite, Plus Jakarta Sans (Google Fonts), Web Speech API, BarcodeDetector API, Claude Sonnet (analyse), OpenFoodFacts (lookup produits), localStorage. Pas de backend. Design system documenté dans `v1/src/theme.css` (variables CSS dérivées de `DESIGN.md`).
