// Turning stored text into page content. Descriptions, blurbs and plant notes
// are written by users, garden managers or admins, so none of it may reach
// v-html as-is: render markdown through `renderMarkdown`, or show plain text
// with `{{ }}` after `toPlainText`.
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
