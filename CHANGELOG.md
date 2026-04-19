# Changelog — GutFeel

## v0.9.3 — 19 avril 2026

### Corrections
- **Ingrédients en français lors du scan code-barres** : l'appel à l'API Open Food Facts spécifie désormais `lc=fr` pour forcer la langue française. Le fallback sur `ingredients_text` (qui pouvait être en allemand ou toute autre langue) est supprimé — seul `ingredients_text_fr` est utilisé. Le tableau d'ingrédients est filtré pour ne conserver que les entrées taguées `lang: fr`.

---

## v0.9.2 — 13 avril 2026

### Corrections
- **Messages d'erreur API traduits en français** : les erreurs retournées par l'API Claude ("Overloaded", 401, 429…) sont désormais reformulées en français avec un message clair et actionnable (ex. "L'IA est surchargée en ce moment. Réessaie dans quelques secondes.").

---

## v0.9.1 — 12 avril 2026

### Corrections
- **Bouton Retour Android fonctionnel** : appuyer sur le bouton Retour Android ferme désormais l'overlay ou le modal actif (enregistrement, ingrédients, modification, paramètres, formulaire de douleur…) au lieu de quitter l'app. La priorité de fermeture suit la logique naturelle : vue active → modal → onglet → sortie.

---

## v0.9.0 — 12 avril 2026

### Évolution
- **Historique intégré à l'accueil** : l'onglet "Historique" est supprimé. L'onglet Journal affiche désormais la totalité des entrées (tous les jours, tous les repas), avec la barre de stats (nombre d'entrées, repas et douleurs) et le bouton d'export CSV.
- **Bouton "Modifier" sur les repas de l'accueil** : les repas enregistrés affichent maintenant les boutons Copier, Modifier et Supprimer directement depuis l'accueil — plus besoin d'aller dans l'historique pour éditer.

---

## v0.8.0 — 9 avril 2026

### Nouveau
- **Bouton "Comment ça marche ?" sur l'onglet Analyse** : un bouton discret en haut à droite de l'onglet ouvre un bottom sheet pédagogique. Il explique pas à pas la logique de corrélation (fenêtre 24h, score d'impact, badges de suspicion), la vue FODMAP, le graphique de chronologie (lag), et rappelle les limites de l'analyse (pas un diagnostic médical).

---

## v0.7.3 — 9 avril 2026

### Corrections
- **Underscores supprimés des noms d'ingrédients** : les noms encadrés de `_` (ex. `_lait_` généré par le LLM) sont maintenant nettoyés lors de la normalisation. Ils seront unifiés avec leur forme sans underscore dans les corrélations et le FODMAP.

---

## v0.7.2 — 9 avril 2026

### Corrections
- **Bouton "Re-manger" renommé "Copier"** : libellé plus court et plus neutre.

---

## v0.7.1 — 9 avril 2026

### Corrections
- **"Rien mangé" ne crée plus de plat avec ingrédients inventés** : quand l'utilisateur décrit qu'il n'a rien mangé ("rien", "pas mangé", "à jeun", "jeûné", "sauté le repas", etc.), l'appel API est court-circuité et aucune entrée n'est créée. Un message explicatif s'affiche à la place. Un post-filtre sanitise aussi les réponses LLM qui retourneraient malgré tout un plat "Rien".

---

## v0.7.0 — 9 avril 2026

### Nouveau
- **Ajout manuel d'ingrédients en édition** : dans la vue "Modifier" d'un repas, une nouvelle zone "Ajouter un ingrédient" permet d'enrichir la liste après analyse.
  - **Autocomplete depuis l'historique** : en tapant, un dropdown propose les ingrédients déjà rencontrés dans les repas passés (filtrés en temps réel).
  - **Saisie libre** : taper un nom et appuyer sur `+` (ou Entrée) ajoute l'ingrédient avec catégorie devinée automatiquement.
  - **Suggestions IA** : le bouton "Suggérer via IA" appelle Claude avec le contexte du plat, les ingrédients déjà présents et la recherche en cours — jusqu'à 8 suggestions pertinentes s'affichent dans le dropdown, taguées "IA".
  - Le bouton IA n'est affiché que si une clé API Anthropic est configurée.

---

## v0.6.1 — 2 avril 2026

### Nouveau
- **Icônes de source harmonisées** : chaque entrée repas affiche désormais une icône Lucide colorée selon la saisie (🎙 vocal, ⌨️ texte, 📷 photo repas, 🏷 étiquette, 🔲 scan). Plus de 📦 partout.

### Corrections
- **Catégorisation des ingrédients barcode** : les ingrédients issus d'un scan code-barres héritaient tous de la catégorie "autre" (📦). Ils sont désormais catégorisés automatiquement par détection de mots-clés (ex. "farine de blé" → céréale, "beurre" → laitier, "diphosphates" → additif).
- **Migration automatique** des entrées existantes pour re-catégoriser les ingrédients barcode.
- **Emojis catégories** mis à jour : légume 🥬→🥦, épice 🧂→🌶️, sucre 🍯→🍬, autre 📦→🔹.
- **Onglet Analyse** : les anciens emojis (🥬, 🧂, 🍯, 📦) étaient encore présents dans les composants `IngredientRanking` et `FodmapGroupView` qui avaient leur propre copie locale — alignés sur la palette commune.

---

## v0.6.0 — 1 avril 2026

### Nouveau
- **Normalisation des noms d'ingrédients** : les ingrédients sont désormais toujours stockés en français, en minuscules, au singulier. Un dictionnaire de ~180 synonymes (anglicismes, variantes orthographiques, alias courants) les ramène vers une forme canonique unique (ex. "chicken" → "poulet", "patate" → "pomme de terre", "yogurt" → "yaourt").
- **Migration automatique** : les données existantes sont normalisées silencieusement au premier lancement, sans perte d'information.
- **Numéro de version** : la version de l'app est désormais affichée dans le panneau "À propos" (lu depuis package.json).

---

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
