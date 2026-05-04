// GET  /token  — Cloudflare Access mode (reads CF_Authorization cookie)
// POST /token  — Google OAuth mode   (body: { credential: '<google-jwt>' })
//
// Returns a signed PB Portal SSO JWT that pre-authenticates the user in the iframe.
// Requires PB_SHARED_SECRET set in CF Pages → Settings → Environment variables.

export async function onRequest({ request, env }) {
  const allowedDomains = (env.ALLOWED_DOMAINS || '')
    .split(',').map(d => d.trim().toLowerCase()).filter(Boolean);

  let email = null, name = null, id = null;

  if (request.method === 'GET') {
    const cfToken = getCookie(request, 'CF_Authorization');
    if (cfToken) {
      const payload = decodeJwtPayload(cfToken);
      email = payload?.email?.toLowerCase() || null;
      name  = payload?.name  || null;
      id    = payload?.sub   || email;
    }
  } else if (request.method === 'POST') {
    try {
      const body    = await request.json();
      const payload = decodeJwtPayload(body?.credential || '');
      email = payload?.email?.toLowerCase() || null;
      name  = payload?.name  || null;
      id    = payload?.sub   || email;
    } catch { return errorResponse(400, 'Invalid request body'); }
  } else {
    return errorResponse(405, 'Method not allowed');
  }

  if (!email)
    return errorResponse(401, 'No identity resolved');
  if (allowedDomains.length && !allowedDomains.some(d => email.endsWith('@' + d)))
    return errorResponse(403, 'Domain not authorised');
  if (!env.PB_SHARED_SECRET)
    return errorResponse(500, 'PB_SHARED_SECRET not configured');

  const now            = Math.floor(Date.now() / 1000);
  const company_domain = email.split('@')[1] || null;
  const pbPayload      = { email, iat: now, exp: now + 3600 };
  if (id)             pbPayload.id             = id;
  if (name)           pbPayload.name           = name;
  if (company_domain) pbPayload.company_domain = company_domain;

  const token = await signHmacJwt(pbPayload, env.PB_SHARED_SECRET);
  return Response.json({ token }, { headers: { 'Cache-Control': 'no-store' } });
}

function getCookie(request, name) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function decodeJwtPayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}

function errorResponse(status, message) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function signHmacJwt(payload, secret) {
  const enc  = obj => btoa(JSON.stringify(obj)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const data = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}`;
  const key  = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig  = btoa(String.fromCharCode(...new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)))))
    .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${data}.${sig}`;
}
