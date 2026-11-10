// ─────────────────────────────────────────────────────────────────
// GutFeel – relais IA (Cloudflare Worker)
//
// Rôle : garder la clé API Anthropic côté serveur. L'app envoie ses
// requêtes ici avec le « code famille » ; le Worker vérifie le code,
// ajoute la clé et transmet à Anthropic.
//
// Deux secrets à créer dans Cloudflare (Settings → Variables and Secrets,
// type « Secret ») — JAMAIS dans ce fichier :
//   ANTHROPIC_API_KEY  → ta clé sk-ant-...
//   FAMILY_CODE        → le code à donner à la famille
//
// Ce fichier ne contient aucun secret : il peut être mis sur GitHub.
// ─────────────────────────────────────────────────────────────────

// Sites autorisés à appeler le relais.
const ALLOWED_ORIGINS = [
  "https://n58s29.github.io",
  "http://localhost:5173",
];

// Modèle imposé par le relais (l'app ne peut pas en choisir un autre).
const MODEL = "claude-sonnet-5-5";
const MAX_TOKENS_CAP = 8000;
const MAX_BODY_BYTES = 4_000_000; // ~ une photo compressée

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: { type: "forbidden_origin", message: "Origine non autorisée" } }, 403, cors);
    }

    const code = request.headers.get("x-family-code") || "";
    if (!env.FAMILY_CODE || !(await sameSecret(code, env.FAMILY_CODE))) {
      return json({ error: { type: "family_code_invalid", message: "Code famille incorrect" } }, 401, cors);
    }

    const url = new URL(request.url);

    // Vérification du code depuis l'écran « Code famille ».
    if (url.pathname === "/check" && request.method === "GET") {
      return json({ ok: true }, 200, cors);
    }

    if (url.pathname !== "/v1/messages" || request.method !== "POST") {
      return json({ error: { type: "not_found", message: "Route inconnue" } }, 404, cors);
    }

    const length = Number(request.headers.get("content-length") || 0);
    if (length > MAX_BODY_BYTES) {
      return json({ error: { type: "too_large", message: "Requête trop lourde" } }, 413, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: { type: "bad_request", message: "JSON invalide" } }, 400, cors);
    }
    if (!Array.isArray(body.messages)) {
      return json({ error: { type: "bad_request", message: "messages manquant" } }, 400, cors);
    }

    // On ne transmet que les champs utiles : modèle et plafond imposés ici.
    const payload = {
      model: MODEL,
      max_tokens: Math.min(Number(body.max_tokens) || 2000, MAX_TOKENS_CAP),
      messages: body.messages,
    };
    if (body.system) payload.system = body.system;
    if (body.output_config) payload.output_config = body.output_config;

    // Repli automatique si le modèle refuse une requête (cas rare).
    let upstream = await callAnthropic(env, { ...payload, fallbacks: "default" }, "server-side-fallback-2026-07-01");
    if (upstream.status === 400) {
      const text = await upstream.clone().text();
      if (/fallback/i.test(text)) {
        upstream = await callAnthropic(env, payload, null);
      }
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  },
};

function callAnthropic(env, payload, beta) {
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  };
  if (beta) headers["anthropic-beta"] = beta;
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-family-code",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// Comparaison à temps constant (via empreintes SHA-256).
async function sameSecret(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
