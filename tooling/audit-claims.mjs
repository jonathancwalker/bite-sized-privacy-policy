#!/usr/bin/env node
/** Compact structural audit for a saved real-policy model run.
 *  This flags review targets; it cannot decide whether a paraphrase is true.
 */
import { readFile } from 'node:fs/promises';

export const words = text => (String(text || '').match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || []).length;
const quantile = (sorted, fraction) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] : 0;
const canonical = text => String(text || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function summarizeClaims(input) {
  const result = input.analysis || input;
  const claims = result.claims || [];
  const units = result.units || [];
  const lengths = claims.map(item => words(item.claim)).sort((a, b) => a - b);
  const quotes = claims.map(item => words(item.sourceQuote)).sort((a, b) => a - b);
  const byText = new Map();
  for (const item of claims) {
    const key = canonical(item.claim);
    if (key) byText.set(key, [...(byText.get(key) || []), item]);
  }
  const duplicates = [...byText.values()].filter(list => list.length > 1).map(list => ({ count:list.length, claim:list[0].claim, unitIds:list.map(item => item.unitId) }));
  const likelyMeta = claims.filter(item => /\b(?:this (?:policy|section|document|heading)|the (?:policy|section|document|heading) (?:describes|explains|identifies|introduces|states)|read this source passage)\b/i.test(item.claim));
  return {
    source: result.document?.source || null,
    title: result.document?.title || null,
    sourceCharacters: result.document?.text?.length || null,
    sourceWords: result.document?.wordCount || null,
    units: units.length,
    claims: claims.length,
    nonClaimUnits: result.nonClaimUnits?.length ?? 0,
    claimsPerThousandSourceWords: result.document?.wordCount ? Number((1000 * claims.length / result.document.wordCount).toFixed(1)) : null,
    status: result.status || null,
    coverageComplete: result.coverage?.complete ?? null,
    unclaimedUnits: result.unclaimedUnitIds?.length ?? null,
    rejectedClaims: result.rejected?.length ?? null,
    failedBatches: result.failures?.length ?? null,
    claimWords: { median:quantile(lengths,.5), p90:quantile(lengths,.9), max:lengths.at(-1) || 0, over30:lengths.filter(n => n > 30).length, over45:lengths.filter(n => n > 45).length },
    sourceQuoteWords: { median:quantile(quotes,.5), p90:quantile(quotes,.9), max:quotes.at(-1) || 0 },
    contextCitations: claims.filter(item => item.contextQuote).length,
    qualifierReviewFlags: claims.filter(item => item.validationFlags?.includes('qualifier-review-needed')).length,
    exactDuplicateGroups: duplicates.slice(0, 15),
    likelyMetaClaims: likelyMeta.slice(0, 20).map(item => ({ unitId:item.unitId, claim:item.claim }))
  };
}

if (process.argv[1]?.endsWith('/audit-claims.mjs')) {
  const path = process.argv[2];
  if (!path) { console.error('Usage: node tooling/audit-claims.mjs /path/to/saved-analysis.json'); process.exit(2); }
  const input = JSON.parse(await readFile(path, 'utf8'));
  console.log(JSON.stringify(summarizeClaims(input), null, 2));
}
