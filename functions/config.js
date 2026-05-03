/**
 * GET /config
 *
 * Returns optional server-side overrides to the browser.
 * GOOGLE_CLIENT_ID and ALLOWED_DOMAINS are baked into index.html —
 * no env vars needed for those.
 *
 * Optional env vars (Cloudflare Pages → Settings → Environment variables):
 *   PORTAL_URL      string   override the portal URL baked into index.html
 *   BRAND_NAME      string   override the page title / header label
 *   HIDE_VOTING     string   '1' or 'true' to hide voting (default: '1')
 *   HIDE_SHARING    string   '1' or 'true' to hide sharing (default: '1')
 *   HIDE_LOGO       string   '1' or 'true' to hide logo (default: '0')
 *   HIDE_HEADER     string   '1' or 'true' to hide header (default: '0')
 *
 * Required env var (mark as Secret):
 *   PB_SHARED_SECRET   → used by functions/token.js, not here
 */
export async function onRequestGet({ env }) {
  return Response.json({
    portalUrl: env.PORTAL_URL  || null,
    brandName: env.BRAND_NAME  || null,
    hideVoting: env.HIDE_VOTING !== undefined ? env.HIDE_VOTING : '1',
    hideSharing: env.HIDE_SHARING !== undefined ? env.HIDE_SHARING : '1',
    hideLogo: env.HIDE_LOGO !== undefined ? env.HIDE_LOGO : '0',
    hideHeader: env.HIDE_HEADER !== undefined ? env.HIDE_HEADER : '0',
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
