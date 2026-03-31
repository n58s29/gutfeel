# Changelog — GutFeel

## v0.5.0 — 31 mars 2026

### Nouveau
- **Multi-sélection des zones de douleur** : on peut sélectionner plusieurs zones abdominales simultanément (ex. haut gauche + bas droit). "Diffus / partout" reste exclusif. Rétrocompatible avec les anciennes entrées.

---

## v0.4.0 — 31 mars 2026

### Nouveau
- **Quantité mangée** : sélecteur 🥣 Petite / 🍽️ Normale / 🫕 Grande à la confirmation de chaque repas (disponible aussi en mode édition et scan code-barres). Affiché dans la carte du journal si différent de "Normale".

### Corrections
- Popup de configuration de la clé API désormais fermable même si aucune clé n'est encore renseignée.

---

## v0.3.0 — 31 mars 2026

### Nouveau
- **Saisie texte** : décrire un repas par écrit en plus de la voix.
- **Photo assiette** : analyser une photo de son repas via IA pour en extraire les ingrédients.
- **OCR étiquette** : photographier la liste des ingrédients d'un produit pour les importer automatiquement.
- **Bouton "Re-manger"** : dupliquer un repas passé en un tap pour le ré-enregistrer à l'heure actuelle.
- Refonte de l'écran d'accueil avec les 4 modes de saisie mis en avant.

---

## v0.2.0 — 29 mars 2026

### Nouveau
- **12 types de symptômes** : saisie détaillée selon la classification Clevers et al. (douleurs abdominales, ballonnements, reflux, nausées, etc.).
- **Module d'analyse corrélation** : tableau de bord identifiant les ingrédients suspects en croisant repas et symptômes dans une fenêtre de 24h.
- **Panneau d'information** : fiche scientifique complète sur les intolérances alimentaires, le SII et la méthode de suivi.

### Corrections
- Écran blanc corrigé suite à des fonctions `removeIngredient` manquantes.

---

## v0.1.0 — 29 mars 2026

### Lancement initial
- **Enregistrement vocal** : dicter un repas, l'IA (Claude Sonnet) décompose automatiquement les ingrédients avec leur catégorie.
- **Scan code-barres** : identifier un produit par scan caméra (BarcodeDetector) ou saisie manuelle, lookup via OpenFoodFacts.
- **Journal des repas** : historique groupé par jour, affichage des ingrédients par catégorie.
- **Saisie des symptômes** : noter une douleur avec 3 niveaux d'intensité.
- **Modification / suppression** : éditer ou effacer n'importe quelle entrée du journal.
- **Clé API configurable** : stockée localement dans le navigateur, jamais transmise ailleurs.
- **Déploiement GitHub Pages** via GitHub Actions.
