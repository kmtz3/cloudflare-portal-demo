// GET /config — returns server-side env var overrides to the browser.
// Set these in CF Pages → Settings → Environment variables (all optional).
//
//   PORTAL_URL       full URL or hostname
//   BRAND_NAME       string
//   HIDE_VOTING      '1' to hide, '0' to show  (browser default: '1')
//   HIDE_SHARING     '1' to hide, '0' to show  (browser default: '1')
//   HIDE_LOGO        '1' to hide, '0' to show  (browser default: '0')
//   HIDE_HEADER      '1' to hide, '0' to show  (browser default: '0')
//   PB_SHARED_SECRET Secret — used by functions/token.js, not here

export async function onRequestGet({ env }) {
  return Response.json({
    portalUrl:   env.PORTAL_URL   || null,
    brandName:   env.BRAND_NAME   || null,
    hideVoting:  env.HIDE_VOTING  ?? null,
    hideSharing: env.HIDE_SHARING ?? null,
    hideLogo:    env.HIDE_LOGO    ?? null,
    hideHeader:  env.HIDE_HEADER  ?? null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
