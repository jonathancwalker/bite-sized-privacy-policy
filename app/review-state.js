import { analyzePolicy, TOPICS } from './engine.js';

export const MAX_POLICY_CHARS = 80_000;
const REACTIONS = new Set(['comfortable', 'clarify', 'concern', 'skipped']);
const SCREENS = new Set(['overview', 'review', 'checkpoint', 'report']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function assertRange(text, quote, range, allowWhitespace = false) {
  if (typeof quote !== 'string' || (!allowWhitespace && !quote.trim()) || !Number.isInteger(range?.start) ||
      !Number.isInteger(range?.end) || range.start < 0 || range.end <= range.start ||
      range.end > text.length || text.slice(range.start, range.end) !== quote) {
    throw new Error('A claim does not match its exact source range. Please prepare the policy again.');
  }
}

/** Convert server/snapshot data into cards only after verifying the source record. */
export function preparedAnalysis(raw, text) {
  if (!object(raw) || raw.document?.text !== text || !Array.isArray(raw.units) ||
      !Array.isArray(raw.claims) || !Array.isArray(raw.nonClaimUnits) ||
      !['user', 'lawyer'].includes(raw.readingMode)) {
    throw new Error('The analysis does not match this policy source.');
  }
  const units = new Map();
  let end = 0;
  for (const unit of raw.units) {
    if (!object(unit) || typeof unit.id !== 'string' || units.has(unit.id) || unit.start !== end) {
      throw new Error('The policy source units are incomplete.');
    }
    assertRange(text, unit.text, unit, true);
    units.set(unit.id, unit);
    end = unit.end;
  }
  if (end !== text.length) throw new Error('The policy source units are incomplete.');

  const byUnit = new Map();
  for (const claim of raw.claims) {
    const unit = units.get(claim?.unitId);
    if (!unit || typeof claim.claim !== 'string' || !claim.claim.trim()) throw new Error('A claim has no valid source unit.');
    assertRange(text, claim.sourceQuote, claim.sourceRange);
    if (claim.sourceRange.start < unit.start || claim.sourceRange.end > unit.end) throw new Error('A claim is outside its source unit.');
    if (claim.contextQuote) {
      assertRange(text, claim.contextQuote, claim.contextRange);
      const context = units.get(claim.contextUnitId);
      if (!context || !unit.contextIds?.includes(context.id) || claim.contextRange.start < context.start || claim.contextRange.end > context.end) {
        throw new Error('A claim has an invalid source context.');
      }
    }
    const claims = byUnit.get(unit.id) || [];
    claims.push(claim);
    byUnit.set(unit.id, claims);
  }
  const nonClaimUnitIds = new Set();
  for (const item of raw.nonClaimUnits) {
    if (!units.has(item?.unitId) || byUnit.has(item.unitId)) throw new Error('The source coverage record is inconsistent.');
    nonClaimUnitIds.add(item.unitId);
  }

  const points = [];
  for (const unit of raw.units) {
    if (nonClaimUnitIds.has(unit.id)) continue;
    const claims = byUnit.get(unit.id) || [];
    if (raw.readingMode === 'user' && !claims.length) continue;
    const items = claims.length ? claims : [{claim:'Read this source passage', sourceQuote:unit.text,
      sourceRange:{start:unit.start, end:unit.end}, reviewState:'exact-source-only'}];
    for (const item of items) {
      if (!item.sourceQuote.trim()) continue;
      const classified = analyzePolicy(item.sourceQuote).points[0] || {topic:'other', priority:'standard'};
      points.push({
        id:`point-${String(points.length + 1).padStart(3, '0')}`,
        title:item.claim, text:item.sourceQuote, start:item.sourceRange.start, end:item.sourceRange.end,
        contextQuote:item.contextQuote || '', contextRange:item.contextRange || null,
        topic:classified.topic, priority:classified.priority, relatedIds:[],
        model:item.reviewState !== 'exact-source-only', validationFlags:item.validationFlags || [],
        unitId:unit.id, sectionPath:unit.sectionPath || []
      });
    }
  }
  if (!points.length) throw new Error('No readable claims or passages were returned.');
  return {
    points, topics:[...new Set(points.map(point => point.topic))], wordCount:raw.document.wordCount,
    mode:'model-assisted', readingMode:raw.readingMode, modelCount:points.filter(point => point.model).length,
    status:raw.status, nonClaimCount:nonClaimUnitIds.size,
    unclaimedUnitIds:raw.units.filter(unit => !byUnit.has(unit.id) && !nonClaimUnitIds.has(unit.id)).map(unit => unit.id),
    rejectedCount:raw.rejected?.length || 0, failureCount:raw.failures?.length || 0, warnings:raw.warnings || []
  };
}

/** Recover known review formats while preserving existing reactions and notes. */
export function restoreReview(serialized) {
  if (serialized == null) return null;
  const saved = JSON.parse(serialized);
  if (saved == null) return null;
  const review = restoreSingleReview(saved);
  const depths = {};
  if (saved.depths != null) {
    if (!object(saved.depths)) throw new Error('This saved review has invalid reading depths.');
    for (const mode of ['user', 'lawyer']) {
      if (!Object.hasOwn(saved.depths, mode)) continue;
      const snapshot = saved.depths[mode];
      if (!object(snapshot)) throw new Error('This saved review has invalid reading depths.');
      const restored = restoreSingleReview({...saved, ...depthSnapshot(snapshot), depths:undefined});
      if (reviewDepth(restored) !== mode) throw new Error('This saved review has mismatched reading depths.');
      if (mode !== reviewDepth(review)) depths[mode] = depthSnapshot(restored);
    }
  }
  return {...review, depths};
}

function restoreSingleReview(saved) {
  if (!object(saved) || ![1, 2].includes(saved.version) || typeof saved.text !== 'string' ||
      !saved.text.trim() || saved.text.length > MAX_POLICY_CHARS || !object(saved.responses) ||
      typeof saved.title !== 'string' || !Number.isFinite(Date.parse(saved.createdAt))) {
    throw new Error('This saved review could not be restored. Its browser data has been kept.');
  }
  const analysis = saved.analysis ?? analyzePolicy(saved.text);
  if (!object(analysis) || !Array.isArray(analysis.points) || !analysis.points.length ||
      !['source-first', 'model-assisted', 'exact-source-only'].includes(analysis.mode)) {
    throw new Error('This saved review has invalid cards. Its browser data has been kept.');
  }
  const ids = new Set();
  for (const point of analysis.points) {
    if (!object(point) || !/^point-\d+$/.test(point.id) || ids.has(point.id) ||
        !Object.hasOwn(TOPICS, point.topic) || typeof point.title !== 'string') {
      throw new Error('This saved review has invalid cards. Its browser data has been kept.');
    }
    assertRange(saved.text, point.text, point);
    if (point.contextQuote) assertRange(saved.text, point.contextQuote, point.contextRange);
    ids.add(point.id);
  }
  if (analysis.mode === 'model-assisted' && analysis.readingMode == null) {
    analysis.readingMode = 'lawyer';
    analysis.unclaimedUnitIds ??= [];
  }
  if (analysis.mode === 'model-assisted' && (!['user','lawyer'].includes(analysis.readingMode) ||
      !Array.isArray(analysis.unclaimedUnitIds))) throw new Error('This saved review has invalid coverage data.');
  analysis.topics = [...new Set(analysis.points.map(point => point.topic))];
  analysis.modelCount = analysis.points.filter(point => point.model).length;
  const responses = {};
  for (const [id, value] of Object.entries(saved.responses)) {
    if (!ids.has(id) || !object(value)) continue;
    const response = {};
    if (REACTIONS.has(value.reaction)) response.reaction = value.reaction;
    for (const field of ['question','note','rewording']) {
      if (typeof value[field] === 'string' && value[field].length <= (field === 'rewording' ? 600 : MAX_POLICY_CHARS)) response[field] = value[field];
    }
    response.dealbreaker = response.reaction === 'concern' && value.dealbreaker === true;
    responses[id] = response;
  }
  let queue = null;
  if (object(saved.queue) && ['attention','unfinished','skipped','unsure'].includes(saved.queue.kind) &&
      Array.isArray(saved.queue.ids)) {
    const queueIds = [...new Set(saved.queue.ids.filter(id => ids.has(id)))];
    if (queueIds.length) queue = {kind:saved.queue.kind, ids:queueIds};
  }
  return {
    ...saved, analysis, responses, queue,
    preferences:Array.isArray(saved.preferences) ? [...new Set(saved.preferences.filter(topic => analysis.topics.includes(topic)))] : [],
    reflection:typeof saved.reflection === 'string' ? saved.reflection : '',
    cursor:Number.isInteger(saved.cursor) ? Math.max(0, Math.min(saved.cursor, (queue?.ids.length || analysis.points.length) - 1)) : 0,
    screen:SCREENS.has(saved.screen) ? saved.screen : 'overview',
    checkpointTopic:analysis.topics.includes(saved.checkpointTopic) ? saved.checkpointTopic : analysis.topics[0]
  };
}


export const reviewDepth = review => review.analysis.readingMode || 'lawyer';

// Only per-depth state belongs here; the policy source remains shared and unchanged.
function depthSnapshot(review) {
  const fields = ['analysis','responses','preferences','reflection','cursor','screen','checkpointTopic','queue'];
  return Object.fromEntries(fields.map(field => [field, review[field]]));
}

export function switchReviewDepth(review, mode, nextAnalysis = null) {
  if (!['user','lawyer'].includes(mode)) throw new Error('Unknown reading depth.');
  if (reviewDepth(review) === mode) return review;
  const depths = {...review.depths, [reviewDepth(review)]:depthSnapshot(review)};
  const target = depths[mode] || (nextAnalysis && {
    analysis:nextAnalysis, responses:{}, preferences:[], reflection:'', cursor:0,
    screen:'review', checkpointTopic:nextAnalysis.topics[0], queue:null
  });
  if (!target || reviewDepth(target) !== mode) throw new Error('Prepare this reading depth first.');
  delete depths[mode];
  return {...review, ...target, depths};
}
