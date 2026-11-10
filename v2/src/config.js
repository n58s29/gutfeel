// ─────────────────────────────────────────────────────────────────
// Adresse du relais IA (Cloudflare Worker).
//
// Remplace la valeur ci-dessous par l'adresse de TON Worker, celle que
// Cloudflare affiche après le déploiement, par exemple :
//   "https://gutfeel-proxy.mon-compte.workers.dev"
// (sans « / » à la fin). Ce n'est pas un secret : la clé API reste
// dans Cloudflare, jamais dans ce fichier.
// ─────────────────────────────────────────────────────────────────
export const WORKER_URL = "https://gutfeel-proxy.gentillebelette.workers.dev";
