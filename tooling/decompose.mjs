/**
 * Source-first decomposition for pasted policy text. This module never rewrites
 * unit text: offsets are JavaScript string indices (UTF-16), and concatenating
 * unit.text values must reproduce document.text byte-for-code-unit exactly.
 *
 * Schema: { document, sections, units, warnings, coverage }. Sections retain
 * heading hierarchy and source ranges; each unit belongs to a section path and
 * links to its immediate neighbors as navigation context (not legal meaning).
 *
 * Units aim for 50–100 words (soft target 80) and normally stay at or below
 * 120. A single long clause may exceed that limit; it is reported. Splitting
 * clauses is a last resort and always has a diagnostic. Conditions and
 * exceptions remain in their original sentence/unit wherever practical.
 * Pasted HTML and tables remain verbatim in source text, but their visual
 * structure may be lost; warnings make that limitation explicit.
 */

const SOFT_TARGET = 80;
const HARD_TARGET = 120;
const WORD_RE = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

function countWords(value) {
  return [...value.matchAll(WORD_RE)].length;
}

function lineRecords(text) {
  const lines = [];
  const re = /[^\r\n]*(?:\r\n|\n|\r|$)/gu;
  let match;
  while ((match = re.exec(text))) {
    if (!match[0] && re.lastIndex >= text.length) break;
    const raw = match[0];
    if (!raw) break;
    const content = raw.replace(/(?:\r\n|\n|\r)$/, "");
    lines.push({ start: match.index, end: re.lastIndex, content });
    if (re.lastIndex === text.length) break;
  }
  return lines;
}

const TITLE_CONNECTORS = new Set(['a','an','and','as','at','by','for','from','in','of','on','or','the','to','with']);
function titleCased(value) {
  const words=value.split(/\s+/);
  return words.every((word,index)=>{
    const clean=word.replace(/^["“'‘([{]+|["”'’),\]}]+$/g,'');
    return (index>0 && TITLE_CONNECTORS.has(clean.toLowerCase())) || /^[A-Z][\p{L}\p{N}'’&/-]*$/u.test(clean);
  });
}
function headingFor(line, nextContent = '') {
  const value = line.trim();
  if (!value) return null;
  const markdown = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(value);
  if (markdown) return { title: markdown[2].trim(), level: markdown[1].length };
  const numbered = /^(\d+(?:\.\d+)*[.)]?|[A-Z])\s+(.+?)\s*$/.exec(value);
  if (numbered && value.length <= 100 && !/[.!?;:]$/.test(numbered[2]) && countWords(value) <= 14) {
    return { title: numbered[2], level: numbered[1].replace(/[.)]$/, "").split(".").length + 1 };
  }
  const label = /^([A-Z][A-Z\s/&'-]{2,70})\s*:?$/.exec(value);
  if (label && value.length <= 75) return { title: value.replace(/:$/, ""), level: 1 };
  // Unnumbered Title Case is a useful heading signal. Sentence-case snippets
  // often come from lists and tables, so leave them inside their source unit.
  if (value.length <= 70 && countWords(value) >= 2 && countWords(value) <= 9 &&
      !/[.!?;:]$/.test(value) && !/^[-*+•(]/.test(value) && titleCased(value)) {
    return { title: value, level: 1 };
  }
  // Meta's processing-purpose headings use sentence case and are followed by
  // a stable explanatory label; category list items are not.
  if (value.length <= 100 && countWords(value) <= 12 && !/[.!?;:]$/.test(value) &&
      !/^[-*+•(]/.test(value) && /^Why and how we process your information:/i.test(nextContent.trim())) {
    return { title:value, level:1 };
  }
  return null;
}

function findSections(text) {
  const lines = lineRecords(text);
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    const nextContent=lines.slice(i+1).find(line=>line.content.trim())?.content||'';
    const heading = headingFor(lines[i].content,nextContent);
    if (heading) found.push({ ...heading, start: lines[i].start, headingEnd: lines[i].end });
  }
  const sections = [];
  const stack = [];
  if (found.length && found[0].start > 0) {
    sections.push({ id: "section-001", title: "Introduction", level: 0, start: 0, headingEnd: 0, end: found[0].start, path: ["Introduction"], hasHeading: false });
  }
  for (let i = 0; i < found.length; i++) {
    const item = found[i];
    while (stack.length && stack.at(-1).level >= item.level) stack.pop();
    stack.push(item);
    const nextStart = found[i + 1]?.start ?? text.length;
    const path = stack.map(entry => entry.title);
    sections.push({
      id: `section-${String(sections.length + 1).padStart(3, "0")}`,
      title: item.title, level: item.level, start: item.start,
      headingEnd: item.headingEnd, end: nextStart, path, hasHeading: true
    });
  }
  if (!sections.length) sections.push({ id: "section-001", title: "Document", level: 0, start: 0, headingEnd: 0, end: text.length, path: ["Document"], hasHeading: false });
  else if (found.length === 0) return sections;
  return sections;
}

function boundaryChunks(text, start, end) {
  // Sentence ends include following whitespace, preserving all intervening text.
  const segment = text.slice(start, end);
  const chunks = [];
  const re = /[.!?]+[\])}'"”’]*(?:[ \t]+|\r?\n(?![ \t]*\r?\n)|$)|(?:\r?\n[ \t]*){2,}/gu;
  let cursor = 0;
  let match;
  while ((match = re.exec(segment))) {
    const stop = re.lastIndex;
    if (stop > cursor) chunks.push({ start: start + cursor, end: start + stop });
    cursor = stop;
  }
  if (cursor < segment.length) chunks.push({ start: start + cursor, end });
  if (!chunks.length && end > start) chunks.push({ start, end });
  return chunks;
}

function clauseChunks(text, start, end) {
  const source = text.slice(start, end);
  const points = [];
  // Semicolons are the clearest low-risk break. Then consider comma/colon
  // boundaries; final fallback is whitespace between words.
  const candidates = [...source.matchAll(/;\s+|,\s+|:\s+/gu)].map(m => start + m.index + m[0].length);
  points.push(start);
  let cursor = start;
  while (countWords(text.slice(cursor, end)) > HARD_TARGET) {
    const feasible = candidates.filter(point => point > cursor && countWords(text.slice(cursor, point)) <= HARD_TARGET);
    let cut = feasible.at(-1);
    if (!cut) {
      const words = [...text.slice(cursor, end).matchAll(WORD_RE)];
      cut = cursor + words[HARD_TARGET - 1].index + words[HARD_TARGET - 1][0].length;
      const whitespace = text.indexOf(" ", cut);
      const newline = text.indexOf("\n", cut);
      const options = [whitespace, newline].filter(position => position >= cut && position < end);
      if (options.length) cut = Math.min(...options) + 1;
    }
    if (cut <= cursor) break;
    points.push(cut);
    cursor = cut;
  }
  points.push(end);
  return points.slice(0, -1).map((point, i) => ({ start: point, end: points[i + 1] }));
}

function isClauseBoundary(text, offset) {
  const before = text.slice(0, offset);
  return /[.!?][\])}'"”’]*\s*$/.test(before) || /\n\s*\n\s*$/.test(before);
}

function analyzeFormatting(text, warnings) {
  const html = /<\s*(?:table|tr|td|th|p|br|div|ul|ol|li)\b[^>]*>/i.exec(text);
  if (html) warnings.push({ code: "html-formatting-loss", message: "HTML markup is preserved as text; rendered layout and grouping may be lost.", start: html.index, end: html.index + html[0].length });
  const lines = lineRecords(text);
  const rows = lines.filter(line => line.content.trim() && (line.content.includes("|") || line.content.includes("\t")));
  if (rows.length >= 2) warnings.push({ code: "table-formatting-loss", message: "Table-like rows are preserved verbatim, but column relationships may be unclear in plain text.", start: rows[0].start, end: rows.at(-1).end });
}

export function decompose(input = {}) {
  const text = String(input?.text ?? "");
  const title = input?.title == null ? "Untitled document" : String(input.title);
  const source = input?.source == null ? null : String(input.source);
  const sections = findSections(text);
  const units = [];
  const warnings = [];
  analyzeFormatting(text, warnings);

  for (const section of sections) {
    const rawChunks = boundaryChunks(text, section.start, section.end);
    let pending = null;
    const emit = range => {
      if (range.end <= range.start) return;
      const unitText = text.slice(range.start, range.end);
      const words = countWords(unitText);
      const unit = {
        id: `unit-${String(units.length + 1).padStart(3, "0")}`,
        title: section.hasHeading && range.start <= section.headingEnd ? section.title : `Part ${units.length + 1}`,
        text: unitText, start: range.start, end: range.end,
        wordCount: words, sectionId: section.id, sectionPath: [...section.path],
        previousId: null, nextId: null, contextIds: []
      };
      units.push(unit);
      if (words > HARD_TARGET) warnings.push({ code: "oversize-unit", message: `Unit has ${words} words, above the ${HARD_TARGET}-word target.`, start: range.start, end: range.end, unitId: unit.id });
    };

    for (const chunk of rawChunks) {
      const words = countWords(text.slice(chunk.start, chunk.end));
      if (words > HARD_TARGET) {
        if (pending) { emit(pending); pending = null; }
        const pieces = clauseChunks(text, chunk.start, chunk.end);
        for (const piece of pieces) {
          emit(piece);
          if (!isClauseBoundary(text, piece.end)) warnings.push({ code: "split-clause", message: "A long sentence or clause was split to keep the unit bite-sized; read adjacent units together.", start: piece.end, end: piece.end, unitId: units.at(-1)?.id });
        }
        continue;
      }
      if (!pending) pending = { ...chunk };
      else if (countWords(text.slice(pending.start, chunk.end)) <= SOFT_TARGET || countWords(text.slice(pending.start, chunk.end)) <= HARD_TARGET) pending.end = chunk.end;
      else { emit(pending); pending = { ...chunk }; }
    }
    if (pending) emit(pending);
  }

  for (let i = 0; i < units.length; i++) {
    units[i].previousId = units[i - 1]?.id ?? null;
    units[i].nextId = units[i + 1]?.id ?? null;
    units[i].contextIds = [units[i - 1]?.id, units[i + 1]?.id].filter(Boolean);
  }
  if (text && units.map(unit => unit.text).join("") !== text) {
    warnings.push({ code: "coverage-error", message: "Internal coverage check failed; one or more source characters are not represented exactly.", start: 0, end: text.length });
  }
  return {
    document: { title, source, text, wordCount: countWords(text) },
    sections: sections.map(({ id, title: sectionTitle, level, start, end, path, hasHeading }) => ({ id, title: sectionTitle, level, start, end, path, hasHeading })),
    units, warnings,
    coverage: { complete: units.map(unit => unit.text).join("") === text, sourceLength: text.length, coveredLength: units.reduce((sum, unit) => sum + unit.text.length, 0) }
  };
}
