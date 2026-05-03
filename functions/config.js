/**
 * GET /config
 *
 * Returns optional server-side overrides to the browser.
 * GOOGLE_CLIENT_ID and ALLOWED_DOMAINS are baked into index.html —
 * no env vars needed for those.
 *
 * Optional env vars (Cloudflare Pages → Settings → Environment variables):
 *   PORTAL_URL   string   override the portal URL baked into index.html
 *   BRAND_NAME   string   override the page title / header label
 *
 * Required env var (mark as Secret):
 *   PB_SHARED_SECRET   → used by functions/token.js, not here
 */
export async function onRequestGet({ env }) {
  return Response.json({
    portalUrl: env.PORTAL_URL  || null,
    brandName: env.BRAND_NAME  || null,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
