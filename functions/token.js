/**
 * GET  /token  →  Cloudflare Access mode (reads CF_Authorization cookie)
 * POST /token  →  Google OAuth mode (body: { credential: '<google-jwt>' })
 *
 * Validates the caller's identity, then returns a signed Productboard
 * Portal SSO JWT that pre-authenticates the user inside the portal iframe.
 *
 * Required env var (mark as Secret in Pages dashboard):
 *   PB_SHARED_SECRET   string   from PB workspace → Settings → Portals → SSO
 *
 * Required env var:
 *   ALLOWED_DOMAINS    string   same value as in config.js
 */

export async function onRequest({ request, env }) {
  const allowedDomains = (env.ALLOWED_DOMAINS || '')
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(Boolean);

  // ── Resolve caller identity ────────────────────────────────────────
  let email = null;
  let name  = null;
  let id    = null;

  if (request.method === 'GET') {
    // Cloudflare Access path: CF sets CF_Authorization cookie after Google OAuth
    const cfToken = getCookie(request, 'CF_Authorization');
    if (cfToken) {
      const payload = decodeJwtPayload(cfToken);
      email = payload?.email?.toLowerCase() || null;
      name  = payload?.name  || null;
      id    = payload?.sub   || email;
      // Production hardening: verify the JWT signature against CF's public certs
      // GET https://<your-team>.cloudflareaccess.com/cdn-cgi/access/certs
    }

  } else if (request.method === 'POST') {
    // Google OAuth fallback path: client sends the raw Google ID token
    try {
      const body       = await request.json();
      const credential = body?.credential || '';
      const payload    = decodeJwtPayload(credential);
      email = payload?.email?.toLowerCase() || null;
      name  = payload?.name  || null;
      id    = payload?.sub   || email;
      // Production hardening: verify Google JWT signature against:
      // https://www.googleapis.com/oauth2/v3/certs
    } catch {
      return errorResponse(400, 'Invalid request body');
    }

  } else {
    return errorResponse(405, 'Method not allowed');
  }

  // ── Authorise ──────────────────────────────────────────────────────
  if (!email) {
    return errorResponse(401, 'No identity resolved — are you authenticated?');
  }
  if (allowedDomains.length && !allowedDomains.some(d => email.endsWith('@' + d))) {
    return errorResponse(403, 'Domain not authorised');
  }

  // ── Sign PB Portal SSO JWT ─────────────────────────────────────────
  if (!env.PB_SHARED_SECRET) {
    return errorResponse(500, 'PB_SHARED_SECRET not configured');
  }

  const now            = Math.floor(Date.now() / 1000);
  const company_domain = email.split('@')[1] || null;
  const pbPayload      = { email, iat: now, exp: now + 3600 };
  if (id)             pbPayload.id             = id;
  if (name)           pbPayload.name           = name;
  if (company_domain) pbPayload.company_domain = company_domain;

  const pbToken = await signHmacJwt(pbPayload, env.PB_SHARED_SECRET);

  return Response.json({ token: pbToken }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

// ── helpers ────────────────────────────────────────────────────────────

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match  = header.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function decodeJwtPayload(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch { return null; }
}

function errorResponse(status, message) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function signHmacJwt(payload, secret) {
  const enc = obj =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const header  = { alg: 'HS256', typ: 'JWT' };
  const data    = `${enc(header)}.${enc(payload)}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))
                .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${data}.${sig}`;
}
