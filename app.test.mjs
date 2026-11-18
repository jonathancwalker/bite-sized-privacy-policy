import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as engine from './app/engine.js';
import * as reviewState from './app/review-state.js';
const { preparedAnalysis, restoreReview } = reviewState;
import { decompose } from './tooling/decompose.mjs';

// Exercise the real client state/rendering code without pretending this is browser layout QA.
async function client(saved = null) {
  const events = new Map();
  const root = {innerHTML:'', addEventListener(name,handler){events.set('root:'+name,handler);}, querySelector(){return null;}, querySelectorAll(){return [];}};
  const storage = new Map(saved == null ? [] : [['bite-sized-review-v1', JSON.stringify(saved)]]);
  const context = vm.createContext({
    ...engine, ...reviewState,
    document:{querySelector:selector => selector === '#app' ? root : null},
    localStorage:{getItem:key => storage.get(key) ?? null, setItem:(key,value) => storage.set(key,value)},
    window:{scrollTo(){},addEventListener:(name, handler) => events.set(name, handler)}, console, setTimeout, clearTimeout, AbortSignal
  });
  const source = (await readFile(new URL('./app/app.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '');
  vm.runInContext(source, context);
  return {root, context, events, click:(action,id,detail=1)=>events.get('root:click')({detail,target:{closest:()=>({dataset:{action,id}})}}), run:source => vm.runInContext(source, context)};
}

const text = 'We delete your account data after 30 days.';
const raw = {
  document:{text, wordCount:8}, readingMode:'user', status:'selective_overview',
  units:[{id:'unit-001', text, start:0, end:text.length, sectionPath:[]}],
  claims:[{unitId:'unit-001', claim:'Account data is deleted after 30 days.', sourceQuote:text, sourceRange:{start:0,end:text.length}, reviewState:'unverified-paraphrase'}],
  nonClaimUnits:[], unclaimedUnitIds:[], rejected:[], failures:[], warnings:[]
};

test('a malformed saved review cannot crash the homepage', async () => {
  const app = await client({version:2, text, title:'Saved policy', responses:{}, analysis:{points:{}, topics:[]}});
  assert.match(app.root.innerHTML, /Privacy policies/);
  assert.equal(app.run('state'), null);
  assert.match(app.root.innerHTML, /saved review/i);
});

test('claims with fabricated source positions cannot enter a review', async () => {
  const app = await client();
  app.context.raw = {...raw, claims:[{...raw.claims[0], sourceQuote:'We sell all personal information.'}]};
  app.context.sourceText = text;
  assert.throws(() => app.run('preparedAnalysis(raw, sourceText)'), /source|range/i);
});

test('a valid legacy review keeps its reactions and can resume', async () => {
  const app = await client({version:1, text, title:'Saved policy', responses:{'point-001':{reaction:'concern',note:'Keep this note'}}, preferences:[], createdAt:'2026-11-18T12:00:00Z'});
  assert.equal(app.run('state.responses["point-001"].note'), 'Keep this note');
  assert.match(app.root.innerHTML, /Resume/);
});

test('a checkpoint with a skipped claim does not claim the topic was reviewed', async () => {
  const app = await client({version:1, text, title:'Saved policy', responses:{'point-001':{reaction:'skipped'}}, preferences:[], createdAt:'2026-11-18T12:00:00Z'});
  const html = app.run('checkpointTopic = analysis.points[0].topic; checkpointView()');
  assert.doesNotMatch(html, /<br>reviewed\./);
  assert.match(html, /still to review/);
});

test('report exports preserve the original source date and scope', async () => {
  const app = await client({version:1, text, title:'Saved policy', responses:{}, preferences:[], createdAt:'2026-11-18T12:00:00Z', source:{finalUrl:'https://example.com/privacy', fetchedAt:'2026-11-17T12:00:00Z', scope:'United States'}});
  const report = app.run('reportText()');
  assert.match(report, /Source fetched: 2026-11-17T12:00:00Z/);
  assert.match(report, /Scope: United States/);
});

test('all six saved featured analyses can become cards and survive a saved-review round trip', async () => {
  for (const id of ['meta','tiktok-us','youtube-google']) {
    const snapshot = JSON.parse(await readFile(new URL(`./app/data/featured/${id}.json`, import.meta.url), 'utf8'));
    for (const mode of ['user','lawyer']) {
      const analysis = preparedAnalysis(snapshot.analyses[mode], snapshot.imported.text);
      const saved = {version:2, ...snapshot.imported, createdAt:snapshot.savedAt, responses:{'point-001':{reaction:'concern',note:'Keep this note'}}, analysis};
      const restored = restoreReview(JSON.stringify(saved));
      assert.equal(restored.analysis.points.length, snapshot.analyses[mode].claims.length);
      assert.equal(restored.responses['point-001'].note, 'Keep this note');
      assert.equal(restored.analysis.readingMode, mode);
    }
  }
});

test('saved model reviews from before reading modes keep their notes', async () => {
  const analysis = preparedAnalysis(raw, text);
  delete analysis.readingMode;
  delete analysis.unclaimedUnitIds;
  const saved = {version:2, text, title:'Older policy', createdAt:'2026-11-17T12:00:00Z', responses:{'point-001':{note:'Earlier note'}}, analysis};
  const restored = restoreReview(JSON.stringify(saved));
  assert.equal(restored.analysis.readingMode, 'lawyer');
  assert.equal(restored.responses['point-001'].note, 'Earlier note');
});

test('browser printing expands unfinished claims and restores disclosures afterward', async () => {
  const app = await client();
  const disclosures = [{open:false}, {open:true}, {open:false}];
  app.root.querySelectorAll = selector => selector === '.report-section details' ? disclosures : [];
  app.events.get('beforeprint')?.();
  assert.deepEqual(disclosures.map(item => item.open), [true, true, true]);
  app.events.get('afterprint')?.();
  assert.deepEqual(disclosures.map(item => item.open), [false, true, false]);
});

test('blank source units are preserved without creating empty fallback cards', () => {
  const source = '\n\nPrivacy Policy\n\nWe collect email addresses when you register.';
  const base = decompose({text:source});
  const prepared = preparedAnalysis({...base, readingMode:'lawyer', claims:[], nonClaimUnits:[]}, source);
  assert.ok(prepared.points.length);
  assert.ok(prepared.points.every(point => point.text.trim()));
  assert.equal(base.units.map(unit => unit.text).join(''), source);
});

test('removing a leading blank card does not move a saved reaction to another passage', () => {
  const saved = {version:1, title:'Policy', text:'\n\nWe collect email addresses when you register.', createdAt:'2026-11-17T12:00:00Z', responses:{'point-002':{reaction:'concern',note:'Keep this note'}}};
  const restored = restoreReview(JSON.stringify(saved));
  assert.equal(restored.analysis.points[0].id, 'point-002');
  assert.equal(restored.responses['point-002'].note, 'Keep this note');
});

const twoCards = {version:1,title:'Policy',text:'We collect your email address.\n\nWe collect your phone number.',createdAt:'2026-11-18T12:00:00Z',responses:{}};
test('selecting a response stays on the card until Next, and Undo restores it', async () => {
  const app = await client(twoCards);
  app.run("setScreen('review')");
  app.click('react','comfortable');
  assert.equal(app.run('cursor'), 0);
  assert.equal(app.run('response(current().id).reaction'), undefined);
  app.click('confirm');
  assert.equal(app.run('cursor'), 1);
  assert.equal(app.run('state.responses["point-001"].reaction'), 'comfortable');
  app.click('undo');
  assert.equal(app.run('cursor'), 0);
  assert.equal(app.run('response(current().id).reaction'), undefined);
});
test('double-click confirms exactly one card and skipped cards remain unfinished', async () => {
  const app = await client(twoCards);
  app.run("setScreen('review')");
  app.click('skip',undefined,1);
  assert.equal(app.run('cursor'), 0);
  app.click('skip',undefined,2);
  assert.equal(app.run('cursor'), 1);
  assert.equal(app.run('reviewed().length'), 0);
});
test('depth labels and report sections are concise', async () => {
  const app = await client(twoCards);
  const modes = app.run("modeChoice('featured')");
  assert.match(modes, /User view/);
  assert.doesNotMatch(modes, /a few high-level themes|granular claims/);
  const report = app.run('reportView()');
  assert.match(report, /Left to review/);
  assert.doesNotMatch(report, /Back to topic map/);
});

test('a double-click on Next cannot advance over a second previously reviewed card', async () => {
  const app = await client({...twoCards,responses:{'point-001':{reaction:'comfortable'},'point-002':{reaction:'comfortable'}}});
  app.run("setScreen('review')");
  app.click('confirm',undefined,1);
  app.click('confirm',undefined,2);
  assert.equal(app.run('screen'), 'review');
  assert.equal(app.run('cursor'), 1);
});

test('a new prepared review opens directly on the first card', async () => {
  const app = await client();
  app.context.imported = {text,title:'Policy',source:{kind:'paste'}};
  app.context.prepared = preparedAnalysis(raw,text);
  app.run('pending=imported; replaceWithPrepared(prepared)');
  assert.equal(app.run('screen'),'review');
  assert.equal(app.run('cursor'),0);
});

const followUpCards = {
  version:1,title:'Contact details',createdAt:'2026-11-18T12:00:00Z',
  text:['email address','phone number','mailing address','name','username'].map(field=>`We collect your ${field}.`).join('\n\n'),
  responses:{'point-001':{reaction:'concern'},'point-002':{reaction:'comfortable'},'point-003':{reaction:'clarify'},'point-004':{reaction:'skipped'}}
};

test('Unsure is selectable without a note and stays distinct from Skip in the report', async () => {
  const app = await client(twoCards);
  app.run("setScreen('review')");
  assert.match(app.root.innerHTML, /data-id="clarify"/);
  assert.doesNotMatch(app.root.innerHTML, /textarea/);
  app.click('react','clarify');
  app.click('confirm');
  assert.equal(app.run('state.responses["point-001"].reaction'),'clarify');
  assert.equal(app.run('reviewed().length'),1);
  const report = app.run('reportView()');
  assert.match(report,/Unsure/);
  assert.doesNotMatch(report,/no question added yet/);
});

test('concern follow-up skips accepted cards and keeps its order as answers change', async () => {
  const app = await client(followUpCards);
  app.click('review-attention');
  assert.equal(app.run('screen'),'review');
  assert.equal(app.run('current().id'),'point-001');
  app.click('react','comfortable');app.click('confirm');
  assert.equal(app.run('current().id'),'point-003');
  assert.match(app.root.innerHTML,/2 of 2/);
  app.click('previous');
  assert.equal(app.run('current().id'),'point-001');
  app.click('confirm');app.click('react','comfortable');app.click('confirm');
  assert.equal(app.run('screen'),'report');
  app.click('undo');
  assert.equal(app.run('current().id'),'point-003');
  assert.equal(app.run('response(current().id).reaction'),'clarify');
  assert.equal(app.run('state.responses["point-002"].reaction'),'comfortable');
});

test('unfinished follow-up includes only skipped and unseen cards, including after reload', async () => {
  const app = await client(followUpCards);
  app.click('review-unfinished');
  assert.equal(app.run('current().id'),'point-004');
  app.click('react','comfortable');app.click('confirm');
  const saved = JSON.parse(app.run('localStorage.getItem(KEY)'));
  const reloaded = await client(saved);
  reloaded.click('resume');
  assert.equal(reloaded.run('current().id'),'point-005');
  assert.match(reloaded.root.innerHTML,/2 of 2/);
  reloaded.click('skip',undefined,2);
  assert.equal(reloaded.run('screen'),'report');
});

test('skipped-only follow-up excludes unseen cards and returns to the full report', async () => {
  const app = await client(followUpCards);
  app.click('review-skipped');
  assert.equal(app.run('current().id'),'point-004');
  app.click('react','comfortable');app.click('confirm');
  assert.equal(app.run('screen'),'report');
  assert.equal(app.run('state.responses["point-005"]'),undefined);
  app.click('review-skipped');
  assert.equal(app.run('screen'),'report');
});

test('depth switching preserves separate answers, position, rewording and follow-up after reload', () => {
  let review = restoreReview(JSON.stringify(followUpCards));
  review.analysis.readingMode='user';
  review.cursor=1;review.screen='review';
  review.queue={kind:'attention',ids:['point-001','point-003']};
  review.responses['point-003'].rewording='We also collect your mailing address.';
  const detailed = {...review.analysis,readingMode:'lawyer'};
  review=reviewState.switchReviewDepth(review,'lawyer',detailed);
  assert.deepEqual(review.responses,{});
  assert.equal(review.cursor,0);
  assert.equal(review.queue,null);
  review.responses['point-001']={reaction:'skipped'};
  review.cursor=2;
  review=restoreReview(JSON.stringify(review));
  review=reviewState.switchReviewDepth(review,'user');
  assert.equal(review.responses['point-001'].reaction,'concern');
  assert.equal(review.responses['point-003'].rewording,'We also collect your mailing address.');
  assert.equal(review.cursor,1);
  assert.deepEqual(review.queue.ids,['point-001','point-003']);
  review=reviewState.switchReviewDepth(review,'lawyer');
  assert.equal(review.responses['point-001'].reaction,'skipped');
  assert.equal(review.cursor,2);
});

test('an inactive depth with fabricated source cannot be restored', () => {
  const review=restoreReview(JSON.stringify(followUpCards));
  const analysis=structuredClone(review.analysis);
  analysis.readingMode='user';analysis.points[0].text='Fabricated source';
  review.depths={user:{analysis,responses:{}}};
  assert.throws(()=>restoreReview(JSON.stringify(review)),/source|range/i);
});

test('reopening the same featured policy at another depth preserves the existing review', async () => {
  const snapshot=JSON.parse(await readFile(new URL('./app/data/featured/tiktok-us.json',import.meta.url),'utf8'));
  const saved={version:2,...snapshot.imported,createdAt:snapshot.savedAt,analysis:preparedAnalysis(snapshot.analyses.user,snapshot.imported.text),responses:{'point-001':{reaction:'clarify'}},cursor:2,screen:'review'};
  const app=await client(saved);
  app.context.fetch=async()=>({ok:true,json:async()=>snapshot});
  await app.run("openFeatured('tiktok-us','lawyer')");
  assert.equal(app.run('analysis.readingMode'),'lawyer');
  assert.equal(app.run('response("point-001").reaction'),undefined);
  await app.run("openFeatured('tiktok-us','user')");
  assert.equal(app.run('response("point-001").reaction'),'clarify');
  assert.equal(app.run('cursor'),2);
});

test('a failed depth request leaves the active answers resumable', async () => {
  const app=await client(followUpCards);
  app.click('review-attention');
  app.click('change-mode');
  app.context.fetch=async()=>({ok:false,status:503,json:async()=>({error:'Please try again.'})});
  await app.run("changeDepth('user')");
  assert.equal(app.run('screen'),'depth');
  assert.match(app.root.innerHTML,/Please try again/);
  app.click('resume');
  assert.equal(app.run('screen'),'review');
  assert.equal(app.run('current().id'),'point-001');
  assert.equal(app.run('response(current().id).reaction'),'concern');
});

test('returning from depth selection discards a late model result', async () => {
  const app=await client({version:1,title:'Policy',text,createdAt:'2026-11-18T12:00:00Z',responses:{'point-001':{reaction:'concern'}}});
  app.run("setScreen('review')");app.click('change-mode');
  let finish;
  app.context.fetch=()=>new Promise(resolve=>{finish=resolve;});
  const work=app.run("changeDepth('user')");
  app.click('resume');
  finish({ok:true,json:async()=>({analysis:raw})});
  await work;
  assert.equal(app.run('screen'),'review');
  assert.equal(app.run('reviewDepth(state)'),'lawyer');
  assert.equal(app.run('response(current().id).reaction'),'concern');
});

test('a newly prepared depth survives reload and returning to the prior depth needs no request', async () => {
  const app=await client({version:1,title:'Policy',text,createdAt:'2026-11-18T12:00:00Z',responses:{'point-001':{reaction:'concern'}}});
  app.run("setScreen('review')");app.click('change-mode');
  app.context.fetch=async()=>({ok:true,json:async()=>({analysis:raw})});
  await app.run("changeDepth('user')");
  assert.equal(app.run('analysis.readingMode'),'user');
  assert.equal(app.run('response(current().id).reaction'),undefined);
  app.click('react','comfortable');app.click('confirm');
  const reloaded=await client(JSON.parse(app.run('localStorage.getItem(KEY)')));
  reloaded.click('resume');
  assert.equal(reloaded.run('screen'),'report');
  reloaded.click('change-mode');
  reloaded.context.fetch=()=>{assert.fail('A saved depth must not make a request.');};
  await reloaded.run("changeDepth('lawyer')");
  assert.equal(reloaded.run('screen'),'review');
  assert.equal(reloaded.run('response(current().id).reaction'),'concern');
});

const completedWithUncertainty={...followUpCards,responses:{
  'point-001':{reaction:'comfortable'},'point-002':{reaction:'concern'},
  'point-003':{reaction:'clarify'},'point-004':{reaction:'comfortable'},'point-005':{reaction:'clarify'}
}};

test('Revisit cards opens only unsure cards and preserves that round after reload', async () => {
  const app=await client(completedWithUncertainty);
  app.run("setScreen('report')");
  const action=app.root.innerHTML.match(/data-action="([^"]+)"[^>]*>Revisit cards<\/button>/)?.[1];
  assert.ok(action,'Report must offer Revisit cards for uncertainty');
  app.click(action);
  assert.equal(app.run('current().id'),'point-003');
  app.click('react','comfortable');app.click('confirm');
  const reloaded=await client(JSON.parse(app.run('localStorage.getItem(KEY)')));
  reloaded.click('resume');
  assert.equal(reloaded.run('current().id'),'point-005');
  assert.match(reloaded.root.innerHTML,/2 of 2/);
  reloaded.click('confirm');
  assert.equal(reloaded.run('screen'),'report');
});

test('Back to report exits an unsure round immediately without confirming a pending answer', async () => {
  const app=await client(completedWithUncertainty);
  app.click('review-unsure');
  assert.equal(app.run('screen'),'review');
  assert.match(app.root.innerHTML,/data-action="report"[^>]*>Back to report<\/button>/);
  app.click('react','comfortable');
  app.click('report');
  assert.equal(app.run('screen'),'report');
  assert.equal(app.run('state.responses["point-003"].reaction'),'clarify');
  assert.match(app.root.innerHTML,/Accepted · 2/);
});

test('a review with no unsure cards offers no restart disguised as Revisit cards', async () => {
  const app=await client({...twoCards,responses:{'point-001':{reaction:'comfortable'},'point-002':{reaction:'concern'}}});
  assert.doesNotMatch(app.run('reportView()'),/>Revisit cards<\/button>/);
  app.click('review-unsure');
  assert.equal(app.run('screen'),'report');
});
