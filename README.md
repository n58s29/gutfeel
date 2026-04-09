# 🫶 GutFeel

**Tracker alimentaire vocal pour identifier les intolérances.**

Enregistre tout ce que tu manges (voix ou scan code-barres), décompose les ingrédients via IA, et note tes douleurs pour trouver le coupable.

## 🚀 Déploiement sur GitHub Pages (5 minutes)

### Étape 1 — Créer le repo GitHub

1. Va sur [github.com/new](https://github.com/new)
2. Nom du repo : `gutfeel`
3. Visibilité : **Public** (nécessaire pour GitHub Pages gratuit)
4. **NE PAS** cocher "Add a README" (on en a déjà un)
5. Clique **Create repository**

### Étape 2 — Pousser le code

Ouvre un terminal dans le dossier `gutfeel-project` et tape :

```bash
git init
git add .
git commit -m "🫶 GutFeel v1"
git branch -M main
git remote add origin https://github.com/TON-USERNAME/gutfeel.git
git push -u origin main
```

> ⚠️ Remplace `TON-USERNAME` par ton pseudo GitHub !

### Étape 3 — Activer GitHub Pages

1. Va dans **Settings** de ton repo (onglet en haut)
2. Menu gauche → **Pages**
3. Source → sélectionne **GitHub Actions**
4. C'est tout ! Le workflow se déclenche automatiquement au push

### Étape 4 — Attendre le déploiement

1. Va dans l'onglet **Actions** de ton repo
2. Tu verras le workflow "Deploy to GitHub Pages" en cours
3. Attends 1-2 minutes qu'il passe au vert ✅
4. Ton app est live sur : `https://TON-USERNAME.github.io/gutfeel/`

## 📱 Utilisation

1. Ouvre l'URL sur ton **téléphone** (Chrome Android recommandé)
2. Au premier lancement, entre ta **clé API Anthropic** (⚙️ Settings)
   - Obtiens-en une sur [console.anthropic.com](https://console.anthropic.com/settings/keys)
   - Elle reste stockée localement dans ton navigateur
3. **Enregistre un repas** : appuie sur le micro, parle, vérifie, valide
4. **Scanne un produit** : code-barres via caméra ou saisie manuelle
5. **Note une douleur** : bouton "Aïe !" avec 3 niveaux d'intensité
6. **Enrichis un repas** : clique "Modifier" sur n'importe quelle entrée pour ajouter des ingrédients oubliés — via l'historique, la saisie libre, ou une suggestion IA
7. **Comprends l'analyse** : dans l'onglet Analyse, le bouton "💡 Comment ça marche ?" explique la logique de corrélation, les badges de suspicion et la vue FODMAP

## 🏗️ Stack technique

- **React 18** + **Vite** (build ultra-rapide)
- **Web Speech API** (reconnaissance vocale gratuite, navigateur)
- **BarcodeDetector API** (scan code-barres natif Chrome)
- **Claude Sonnet** (décomposition des ingrédients)
- **OpenFoodFacts API** (lookup produits par code-barres)
- **localStorage** (stockage données dans le navigateur)

## 🔧 Dev local

```bash
npm install
npm run dev
```

Ouvre `http://localhost:5173/gutfeel/` dans Chrome.

## ⚠️ Notes

- Le scan code-barres natif fonctionne sur **Chrome Android/Desktop**. Sur iOS, utilise la saisie manuelle.
- La reconnaissance vocale nécessite **Chrome** (Web Speech API).
- La clé API est stockée uniquement dans ton navigateur, jamais transmise ailleurs que l'API Anthropic.
