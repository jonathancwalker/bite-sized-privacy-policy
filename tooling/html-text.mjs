/** Extract readable policy text from a fetched HTML page without inventing copy. */
const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…', copy: '©' };
export function decodeEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z][\da-z]+);?/gi, (entity, key) => {
    if (key[0] === '#') {
      const code = key[1]?.toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : entity;
    }
    return named[key.toLowerCase()] ?? entity;
  });
}

export function extractHtml(html, sourceUrl = '') {
  if (typeof html !== 'string' || html.length > 3_000_000) throw new Error('HTML exceeds the 3 MB extraction limit.');
  const pageTitle = decodeEntities((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<[^>]*>/g, '').trim());
  // Prefer a semantic reading region. Removing non-content blocks before
  // selecting it avoids header/navigation copy dominating the policy.
  let body = html.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|svg|iframe|form|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const region = body.match(/<(main|article)\b[^>]*>([\s\S]*?)<\/\1\s*>/i);
  if (region) body = region[2];
  const hadTable=/<table\b/i.test(body);
  body = body.replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:td|th)>/gi, ' | ')
    .replace(/<\/(?:h[1-6]|p|li|div|section|blockquote|tr|dt|dd)>/gi, '\n\n')
    .replace(/<li\b[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ');
  let text = decodeEntities(body).replace(/\r/g, '')
    .replace(/[\t ]+\n/g, '\n').replace(/\n[\t ]+/g, '\n')
    .replace(/[\t ]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const warnings = [];
  if (hadTable) warnings.push('HTML table cells were separated with pipes; inspect row and column relationships against the source page.');
  if (!region) warnings.push('No semantic main/article region found; navigation or boilerplate may be included.');
  if (text.length < 100) warnings.push('Very little readable text was extracted; the page may render content with JavaScript or block automated fetching.');
  if (/privacy/i.test(sourceUrl) && !/privacy/i.test(text.slice(0, 1000))) warnings.push('Privacy policy heading was not detected near the start; inspect the source page.');
  return { text, title: pageTitle, warnings };
}
