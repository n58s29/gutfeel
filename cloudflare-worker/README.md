# Relais IA (Cloudflare Worker)

Petit serveur qui garde la clé API Anthropic à l'abri. L'app GutFeel v2 l'appelle avec le **code famille** ; le relais vérifie le code, ajoute la clé et transmet la requête à Anthropic.

- `worker.js` : le code à coller dans Cloudflare. Il ne contient **aucun secret**.
- Secrets à créer dans Cloudflare (type *Secret*) : `ANTHROPIC_API_KEY` et `FAMILY_CODE`.
- Sites autorisés : `ALLOWED_ORIGINS` en haut de `worker.js` (GitHub Pages + `localhost:5173` pour le dev).
- Modèle imposé : `MODEL` en haut de `worker.js`.

Routes :
- `GET /check` : répond 200 si le code famille est bon, 401 sinon.
- `POST /v1/messages` : transmet à l'API Messages d'Anthropic (modèle et `max_tokens` plafonnés par le relais).

Changer le code famille : Cloudflare → Worker → Settings → Variables and Secrets → modifier `FAMILY_CODE`. Chaque personne devra saisir le nouveau code (⚙️ Paramètres).
