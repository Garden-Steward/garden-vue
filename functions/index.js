/**
 * plantOg — dynamic OpenGraph/link-preview meta for the public plant pages.
 *
 * Fired on the /plants/:slug route (see firebase.json rewrite). Behaviour:
 *   - Crawlers (Discord, Facebook, Twitter, Slack, WhatsApp, Telegram,
 *     Googlebot, etc.) get a tiny HTML page whose <title> + og:/twitter:
 *     meta reflect the actual plant (real title, and the plant's clipart
 *     as og:image). This is what makes link previews show the plant photo.
 *   - Human visitors get the SPA shell (index.html) served unchanged, so the
 *     app boots at the same URL with zero extra image downloads.
 *
 * The og:image is ONLY fetched by social crawlers at share-time; normal
 * browsers ignore it entirely (no per-visit image load).
 */
const { onRequest } = require('firebase-functions/v2/https');

const STRAPI_URL = 'https://steward-bank.fly.dev';
const SITE_URL = 'https://steward.garden';
// Firebase Hosting default domains for the SPA shell (human fallback route).
const SPA_ORIGINS = [
  'https://garden-steward.web.app',
  'https://garden-steward.firebaseapp.com'
];

// Broad crawler / link-preview user-agent detection.
const CRAWLER_RE = /bot|crawler|spider|facebookexternalhit|twitterbot|discord|whatsapp|telegram|linkedinbot|slurp|bingpreview|googlebot|pinterest|embedly|quora|redditbot|iframely|slack|preview|prerender|headless|duckduckbot/i;

function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fetchPlant(slug) {
  const qs = new URLSearchParams({
    'filters[slug][$eq]': slug,
    'populate[0]': 'clipart',
    'fields[0]': 'title',
    'fields[1]': 'latin',
    'fields[2]': 'description',
    'fields[3]': 'magic'
  });
  const res = await fetch(`${STRAPI_URL}/api/plants?${qs.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  const list = Array.isArray(data.data) ? data.data : [];
  return list.length ? list[0] : null;
}

function clipartUrl(plant) {
  const c = plant && plant.clipart;
  if (!c) return null;
  const url = (c.formats && c.formats.large && c.formats.large.url) || c.url;
  return url || null;
}

// Memoized SPA shell so human page loads don't pay a fetch every request.
let cachedIndex = null;
let cachedAt = 0;
async function getIndexHtml() {
  if (cachedIndex && Date.now() - cachedAt < 10 * 60 * 1000) return cachedIndex;
  for (const origin of SPA_ORIGINS) {
    try {
      const res = await fetch(`${origin}/index.html`);
      if (res.ok) {
        cachedIndex = await res.text();
        cachedAt = Date.now();
        break;
      }
    } catch (_) {
      /* try next origin */
    }
  }
  return cachedIndex;
}

function ogHtml(plant, slug) {
  const title = (plant.title || 'Garden Steward').trim();
  const latin = (plant.latin || '').trim();
  const fullTitle = latin ? `${title} (${latin}) — Garden Steward` : `${title} — Garden Steward`;
  const image = clipartUrl(plant);
  const desc = stripHtml(plant.magic || plant.description || '').slice(0, 220);
  const url = `${SITE_URL}/plants/${encodeURIComponent(slug)}`;

  const meta = [
    `  <meta property="og:title" content="${escapeHtml(fullTitle)}">`,
    `  <meta property="og:description" content="${escapeHtml(desc)}">`,
    image ? `  <meta property="og:image" content="${escapeHtml(image)}">` : '',
    image ? '  <meta property="og:image:width" content="1024">' : '',
    image ? '  <meta property="og:image:height" content="1024">' : '',
    `  <meta property="og:url" content="${escapeHtml(url)}">`,
    '  <meta property="og:type" content="article">',
    '  <meta property="og:site_name" content="Garden Steward">',
    '  <meta name="twitter:card" content="summary_large_image">',
    `  <meta name="twitter:title" content="${escapeHtml(fullTitle)}">`,
    `  <meta name="twitter:description" content="${escapeHtml(desc)}">`,
    image ? `  <meta name="twitter:image" content="${escapeHtml(image)}">` : '',
    `  <link rel="canonical" href="${escapeHtml(url)}">`
  ].filter(Boolean).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
${meta}
</head>
<body></body>
</html>`;
}

exports.plantOg = onRequest({ region: 'us-central1' }, async (req, res) => {
  const m = (req.path || '').match(/^\/plants\/([^/?#]+)/);
  const slug = m ? decodeURIComponent(m[1]) : null;
  const ua = String(req.headers['user-agent'] || '');

  if (!slug) {
    return res.redirect(303, '/');
  }

  if (!CRAWLER_RE.test(ua)) {
    // Human visitor — serve the SPA shell so the app boots normally.
    const html = await getIndexHtml();
    if (html) {
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=300');
      return res.send(html);
    }
    return res.redirect(303, '/');
  }

  // Crawler / link-preview bot — return dynamic OG meta.
  try {
    const plant = await fetchPlant(slug);
    if (!plant) return res.redirect(303, '/');
    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.send(ogHtml(plant, slug));
  } catch (err) {
    console.error('plantOg error for slug', slug, err);
    return res.redirect(303, '/');
  }
});
