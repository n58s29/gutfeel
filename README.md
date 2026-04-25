# 🫶 GutFeel

**Tracker alimentaire vocal pour identifier les intolérances.**

Enregistre tout ce que tu manges (voix, photo, scan code-barres), décompose les ingrédients via IA, note tes douleurs, et identifie les ingrédients suspects par corrélation.

🌐 **App live** : https://n58s29.github.io/gutfeel/

---

## 📁 Structure du repo

Le projet est organisé par version majeure pour permettre des refontes complètes sans casser l'existant.

```
gutfeel/
├── v0/                   ← Version actuellement déployée (série v0.x, dernière : v0.10.0)
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── README.md         ← Doc spécifique v0 (stack, dev, déploiement)
│
├── v1/                   ← (à venir) refonte v1, en cours de design
│
├── CHANGELOG.md          ← Historique des versions (toutes versions confondues)
├── TICKETS.md            ← Suivi des tickets ouverts
└── .github/workflows/    ← CI/CD (build & deploy de la version active)
```

### Quelle version travailler ?

- **Pour modifier l'app actuellement en prod** → bosse dans `v0/`
- **Pour la prochaine refonte** → ce sera `v1/` (créé quand le design sera prêt)

### Quelle version est déployée ?

Le workflow `.github/workflows/deploy.yml` build et déploie le dossier `v0/` sur GitHub Pages. Quand `v1/` sera prêt, on basculera le workflow pour pointer vers `v1/`.

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

- **v0.10.0** (avril 2026) — version actuelle en prod, voir [`CHANGELOG.md`](CHANGELOG.md)
- **v1** — en cours de design, refonte complète à venir

---

## 🛠 Stack actuelle (v0)

React 18 + Vite, Web Speech API, BarcodeDetector API, Claude Sonnet (analyse), OpenFoodFacts (lookup produits), localStorage. Pas de backend.
