/**
 * GET /config
 *
 * Returns server-side env var overrides to the browser.
 * All vars are optional — set them in Cloudflare Pages → Settings → Environment variables.
 * Unset vars return null so the browser falls back to its own hardcoded defaults.
 *
 *   PORTAL_URL       full URL or hostname   override the portal URL
 *   BRAND_NAME       string                 override the page title / header label
 *   HIDE_VOTING      '1' to hide, '0' to show  (browser default: '1')
 *   HIDE_SHARING     '1' to hide, '0' to show  (browser default: '1')
 *   HIDE_LOGO        '1' to hide, '0' to show  (browser default: '0')
 *   HIDE_HEADER      '1' to hide, '0' to show  (browser default: '0')
 *   PB_SHARED_SECRET Secret — used by functions/token.js, not here
 */
export async function onRequestGet({ env }) {
  return Response.json({
    portalUrl:   env.PORTAL_URL   || null,
    brandName:   env.BRAND_NAME   || null,
    hideVoting:  env.HIDE_VOTING  ?? null,
    hideSharing: env.HIDE_SHARING ?? null,
    hideLogo:    env.HIDE_LOGO    ?? null,
    hideHeader:  env.HIDE_HEADER  ?? null,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
