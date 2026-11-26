// Turning stored text into page content. Descriptions, blurbs and plant notes
// are written by users, garden managers or admins, so none of it may reach
// v-html as-is: render markdown through `renderMarkdown`, render pasted/rich
// HTML through `renderRichText`, or show plain text with `{{ }}` after
// `toPlainText`.
import MarkdownIt from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';

// html:false (markdown-it's default) escapes raw HTML in the source, and
// markdown-it's link validation drops javascript:, vbscript:, file: and
// non-image data: URLs. markdown-it-attrs accepts any attribute unless given
// an allowlist, so `[x](https://…){onmouseover=…}` would add a live handler.
const md = new MarkdownIt({ html: false }).use(markdownItAttrs, {
  allowedAttributes: ['id', 'class', 'title', 'target', 'rel', 'width', 'height'],
});

/** Markdown source -> HTML that is safe to pass to v-html. */
export function renderMarkdown(source) {
  return source ? md.render(String(source)) : '';
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

/**
 * Text with any HTML tags removed and common entities decoded, for display
 * with `{{ }}` (which escapes it). Whitespace is kept as written.
 */
export function toPlainText(value) {
  if (!value) return '';
  return String(value)
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (_, name) => ENTITIES[name]);
}

/**
 * Plain text cut to at most `max` characters at a word boundary, with "..."
 * when shortened. Whitespace runs collapse to one space.
 */
export function truncatePlainText(value, max = 200) {
  const text = toPlainText(value).replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.substring(0, max).trim();
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.substring(0, lastSpace) : cut) + '...';
}

// ── HTML-aware rendering ────────────────────────────────────────────────
// Some rich-text fields (e.g. plant descriptions) arrive as HTML rather than
// markdown — authored in a rich editor or pasted in. Rendering those through
// markdown-it with `html:false` escapes the raw tags onto the page. So we
// detect HTML and sanitize it to a small, safe tag/attribute allowlist before
// passing it to v-html. Runs only in the browser (the Vue SPA renders
// client-side), so DOMParser is available.

// Tags whose entire subtree is dropped (unsafe / non-content).
const DROP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'FORM',
  'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'OPTION', 'TEMPLATE', 'NOSCRIPT',
  'AUDIO', 'VIDEO', 'SOURCE', 'TRACK', 'CANVAS', 'SVG', 'MATH',
]);

// Formatting/content tags that may survive (attribute-stripped). Anything not
// in this list or DROP_TAGS is unwrapped (its text kept, the wrapper dropped).
const ALLOWED_TAGS = new Set([
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'BR', 'HR',
  'STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL', 'INS', 'MARK', 'SUB', 'SUP', 'SMALL',
  'UL', 'OL', 'LI', 'DL', 'DT', 'DD',
  'BLOCKQUOTE', 'PRE', 'CODE', 'KBD', 'SAMP',
  'A', 'IMG', 'FIGURE', 'FIGCAPTION',
  'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD', 'CAPTION',
  'SPAN', 'DIV',
]);

// Generic neutral attributes (no URLs, no handlers, no styles) kept on any tag.
const ALLOWED_ATTRS = new Set(['title', 'alt', 'width', 'height', 'colspan', 'rowspan', 'lang', 'dir']);
const LINK_REL_TOKENS = new Set(['nofollow', 'noopener', 'noreferrer', 'ugc', 'sponsored']);

function isSafeUrl(value) {
  const v = value.trim().toLowerCase();
  if (!v) return false;
  return !(
    v.startsWith('javascript:') ||
    v.startsWith('vbscript:') ||
    v.startsWith('data:') ||
    v.startsWith('file:')
  );
}

function sanitizeEl(el) {
  const tag = el.tagName.toUpperCase();

  // Drop the whole dangerous subtree without touching it.
  if (DROP_TAGS.has(tag)) {
    el.remove();
    return;
  }

  // Clean children bottom-up first (snapshot — the tree mutates below).
  for (const child of Array.from(el.children)) sanitizeEl(child);

  // Unknown/harmless wrapper: keep its (now-clean) contents, drop the tag.
  if (!ALLOWED_TAGS.has(tag)) {
    const parent = el.parentNode;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
    return;
  }

  // Allowed tag → strip attributes to a per-tag allowlist.
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith('on')) {
      el.removeAttribute(attr.name);
      continue;
    }

    if (tag === 'A') {
      if (!['href', 'title', 'target', 'rel'].includes(name)) { el.removeAttribute(attr.name); continue; }
      if (name === 'href') { if (!isSafeUrl(attr.value)) el.removeAttribute(attr.name); continue; }
      if (name === 'target') { if (!['_blank', '_self'].includes(attr.value)) el.removeAttribute(attr.name); continue; }
      if (name === 'rel') {
        const tokens = attr.value.split(/\s+/).filter((t) => LINK_REL_TOKENS.has(t));
        tokens.length ? el.setAttribute('rel', tokens.join(' ')) : el.removeAttribute('rel');
      }
      continue;
    }

    if (tag === 'IMG') {
      if (!['src', 'alt', 'title', 'width', 'height', 'loading'].includes(name)) { el.removeAttribute(attr.name); continue; }
      if (name === 'src') { if (!isSafeUrl(attr.value)) el.removeAttribute(attr.name); continue; }
      if (name === 'loading') { if (!['lazy', 'eager'].includes(attr.value)) el.removeAttribute(attr.name); continue; }
      continue;
    }

    if (!ALLOWED_ATTRS.has(name)) el.removeAttribute(attr.name);
  }

  // A link opening a new tab must not hand over the opener.
  if (tag === 'A' && el.getAttribute('target') === '_blank' && !/noopener/.test(el.getAttribute('rel') || '')) {
    const rel = el.getAttribute('rel') || '';
    el.setAttribute('rel', rel ? `${rel} noopener` : 'noopener');
  }
}

/** HTML source → sanitized HTML safe for v-html. Browser-only. */
export function sanitizeHtml(source) {
  const doc = new DOMParser().parseFromString(
    `<!doctype html><html><body>${String(source)}</body></html>`,
    'text/html',
  );
  for (const node of Array.from(doc.body.children)) sanitizeEl(node);
  return doc.body.innerHTML;
}

/**
 * Render content that may be either markdown or HTML. Detects HTML (an actual
 * opening/closing tag, not a stray `a < b`), sanitizes it, and renders it;
 * otherwise falls through to markdown. Safe to pass to v-html.
 */
export function renderRichText(source) {
  if (!source) return '';
  const s = String(source);
  if (!/<\/?[a-z][\s\S]*?>/i.test(s)) return renderMarkdown(s);
  if (typeof DOMParser === 'undefined') return renderMarkdown(s); // non-DOM fallback: escape via markdown
  return sanitizeHtml(s);
}