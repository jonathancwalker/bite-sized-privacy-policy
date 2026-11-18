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
  return {root, context, events, click:(action,id,detail=1,attributes={})=>events.get('root:click')({detail,target:{closest:()=>({dataset:{action,id,...attributes}})}}), run:source => vm.runInContext(source, context)};
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
  assert.match(app.root.innerHTML, /Continue review/);
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

test('browser printing expands attention sources and restores disclosures afterward', async () => {
  const app = await client();
  const disclosures = [{open:false}, {open:true}, {open:false}];
  app.root.querySelectorAll = selector => selector === '.attention-panel details' ? disclosures : [];
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
  const modes = app.run("modeChoice()");
  assert.match(modes, /Quick overview/);
  assert.match(modes, /Lawyer mode/);
  assert.doesNotMatch(modes, /<small/);
  assert.doesNotMatch(modes, /a few high-level themes|granular claims/);
  const report = app.run('reportView()');
  assert.match(report, /Continue review/);
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
  assert.equal(app.run('reactionCounts().comfortable'),2);
});

test('a review with no unsure cards offers no restart disguised as Revisit cards', async () => {
  const app=await client({...twoCards,responses:{'point-001':{reaction:'comfortable'},'point-002':{reaction:'concern'}}});
  assert.doesNotMatch(app.run('reportView()'),/>Revisit cards<\/button>/);
  app.click('review-unsure');
  assert.equal(app.run('screen'),'report');
});

test('own-policy intake opens immediately with quick overview selected', async () => {
  const app=await client();
  app.click('own');
  assert.equal(app.run('readingMode'),'user');
  assert.match(app.root.innerHTML,/id="policy-file"/);
  assert.match(app.root.innerHTML,/data-mode="user"[^>]*aria-pressed="true"/);
  assert.doesNotMatch(app.root.innerHTML,/choose-own-mode|How would you like to read it/);
});

test('changing the intake depth keeps the pasted policy and file ready', async () => {
  const app=await client();
  app.run("draft={title:'Retention',text:'We delete account data after 30 days.',url:''}; selectedFile={name:'policy.txt',size:100}; ownOpen=true; inputMode='paste'");
  app.click('reading-depth',undefined,1,{mode:'lawyer'});
  assert.equal(app.run('readingMode'),'lawyer');
  assert.equal(app.run('draft.text'),'We delete account data after 30 days.');
  assert.equal(app.run('selectedFile.name'),'policy.txt');
  assert.match(app.root.innerHTML,/data-mode="lawyer"[^>]*aria-pressed="true"/);
  assert.match(app.root.innerHTML,/id="policy-text"/);
});

test('one featured-policy click uses the selected depth without an extra gate', async () => {
  const app=await client();
  app.run('openFeatured=(id,mode)=>{ globalThis.opened={id,mode}; }');
  app.click('featured','meta');
  assert.equal(app.run('opened.id'),'meta');
  assert.equal(app.run('opened.mode'),'user');
  app.click('reading-depth',undefined,1,{mode:'lawyer'});
  app.click('featured','tiktok-us');
  assert.equal(app.run('opened.mode'),'lawyer');
});

test('optional intake focus highlights retention without removing other claims', async () => {
  const app=await client();
  app.run("intakePreferences=['retention']");
  app.context.imported={title:'Policy',text:twoCards.text.split('\n\n')[0]+'\n\n'+text,source:{kind:'paste'}};
  app.run('pending=imported; replaceWithPrepared(analyzePolicy(imported.text))');
  assert.deepEqual(Array.from(app.run('state.preferences')),['retention']);
  assert.equal(app.run('points().length'),2);
  assert.equal(app.run('ordered().length'),2);
  assert.equal(app.run('current().topic'),'retention');
  assert.match(app.root.innerHTML,/Your priority/);
  app.click('skip',undefined,2);
  assert.doesNotMatch(app.root.innerHTML,/Your priority/);
});

test('the report map accounts for every claim and distinguishes skipped from unseen', async () => {
  const app=await client(followUpCards);
  const html=app.run('reportView()');
  assert.equal([...html.matchAll(/data-map-id="point-/g)].length,5);
  for(const [id,status] of [['001','concern'],['002','comfortable'],['003','clarify'],['004','skipped'],['005','unseen']]){
    assert.match(html,new RegExp('data-map-id="point-'+id+'"[^>]*data-state="'+status+'"'));
  }
  app.click('point','point-003');
  assert.equal(app.run('current().id'),'point-003');
  app.click('react','comfortable');
  app.click('report');
  assert.equal(app.run('state.responses["point-003"].reaction'),'clarify');
});

test('the report omits Undo while the active review still offers recovery', async () => {
  const app=await client(twoCards);
  app.run("setScreen('review')");app.click('react','comfortable');app.click('confirm');
  assert.match(app.root.innerHTML,/data-action="undo"/);
  app.click('report');
  assert.doesNotMatch(app.root.innerHTML,/data-action="undo"/);
});

test('successful rewording reveals an accuracy note and retains the exact source', async () => {
  const app=await client();
  app.context.imported={title:'Policy',text,source:{kind:'paste'}};
  app.context.prepared=preparedAnalysis(raw,text);
  app.run('pending=imported; replaceWithPrepared(prepared)');
  const source=app.run('current().text');
  assert.doesNotMatch(app.root.innerHTML,/Reworded for clarity/);
  app.context.fetch=async()=>({ok:true,json:async()=>({reworded:'After 30 days, your account information is removed.'})});
  await app.run('rewordCurrent()');
  assert.match(app.root.innerHTML,/Reworded for clarity/);
  assert.match(app.root.innerHTML,/may change or miss meaning/);
  assert.equal(app.run('current().text'),source);
  assert.equal(app.run('response(current().id).rewording'),'After 30 days, your account information is removed.');
});

test('advancing from email collection to phone collection keeps the reading position', async () => {
  const app=await client(twoCards);
  app.run("setScreen('review')");
  const scrolls=[];
  app.context.window.scrollTo=(...args)=>scrolls.push(args);
  app.click('react','comfortable');
  app.click('confirm');
  assert.equal(app.run('cursor'),1);
  assert.equal(scrolls.length,0,'Next must not jump the page back to the header');
});

test('the printable report identifies the policy without the app header', async () => {
  const app=await client(followUpCards);
  assert.match(app.run('reportView()'),/Contact details/);
});

test('an own-policy URL failure appears once beside the URL form', async () => {
  const app=await client();
  app.run("ownOpen=true; inputMode='url'; importError='This policy page could not be fetched.'; render()");
  assert.equal(app.root.innerHTML.split('This policy page could not be fetched.').length-1,1);
});

test('priority areas open a staged modal without disturbing a pasted policy', async () => {
  const app=await client();
  const apply={};
  const retention={dataset:{priority:'retention'},setAttribute(){}};
  app.context.priorityDialog={querySelector:selector=>selector==='#apply-priorities'?apply:null,querySelectorAll:()=>[retention]};
  app.run("openModal=html=>{globalThis.modalHTML=html;return priorityDialog;}; closeModal=()=>{}; ownOpen=true;inputMode='paste';draft.text='We delete account data after 30 days.';render()");
  assert.match(app.root.innerHTML,/data-action="priorities"/);
  assert.doesNotMatch(app.root.innerHTML,/focus-choices|>Optional</);
  app.click('priorities');
  assert.match(app.run('modalHTML'),/Priority areas/);
  retention.onclick();
  assert.equal(app.run('intakePreferences.length'),0,'selection stays staged until Done');
  apply.onclick();
  assert.deepEqual(Array.from(app.run('intakePreferences')),['retention']);
  assert.equal(app.run('draft.text'),'We delete account data after 30 days.');
});

test('lawyer mode changes the explanation below the depth pill', async () => {
  const app=await client();
  assert.match(app.root.innerHTML,/The big picture in a handful of cards/);
  app.click('reading-depth',undefined,1,{mode:'lawyer'});
  assert.match(app.root.innerHTML,/Lawyer mode/);
  assert.match(app.root.innerHTML,/More detail, no law degree needed\./);
  assert.doesNotMatch(app.root.innerHTML,/The big picture in a handful of cards/);
});

test('a saved Instagram review keeps its count and report action without a homepage tile grid', async () => {
  const app=await client({...twoCards,screen:'report',source:{catalogId:'meta'},responses:{'point-001':{reaction:'comfortable'}}});
  assert.match(app.root.innerHTML,/<section class="saved-review"/);
  assert.match(app.root.innerHTML,/Instagram review/);
  assert.match(app.root.innerHTML,/<strong>1 \/ 2<\/strong> reviewed/);
  assert.match(app.root.innerHTML,/Open report/);
  assert.doesNotMatch(app.root.innerHTML,/Your current review|data-trail-id|resume-sidebar/);
  assert.ok(app.root.innerHTML.indexOf('policy-logos')<app.root.innerHTML.indexOf('saved-review'));
  app.click('resume');
  assert.equal(app.run('screen'),'report');
});

test('topic groups retain every clickable card without count badges',async()=>{
  const app=await client(followUpCards);
  const map=app.run('claimMap()');
  assert.doesNotMatch(map,/topic-total|aria-label="\d+ claims"/);
  assert.match(map,/<h3>Data collection<\/h3>/);
  assert.equal([...map.matchAll(/data-map-id="point-/g)].length,5);
  app.click('point','point-003');
  assert.equal(app.run('current().id'),'point-003');
});

test('a saved review shows Review menu only on review and report screens',async()=>{
  const app=await client({...twoCards,screen:'report'});
  assert.doesNotMatch(app.root.innerHTML,/class="review-menu"/);
  app.click('resume');
  assert.equal(app.run('screen'),'report');
  assert.match(app.root.innerHTML,/class="review-menu"/);
  app.click('point','point-001');
  assert.equal(app.run('screen'),'review');
  assert.match(app.root.innerHTML,/class="review-menu"/);
  app.click('change-mode');
  assert.doesNotMatch(app.root.innerHTML,/class="review-menu"/);
  app.click('home');
  assert.doesNotMatch(app.root.innerHTML,/class="review-menu"/);
  assert.match(app.root.innerHTML,/class="saved-review"/);
});

test('review chrome names the platform and exposes help without repeated labels', async () => {
  const app=await client({...twoCards,source:{catalogId:'meta'}});
  app.run("setScreen('review')");
  assert.match(app.root.innerHTML,/Instagram review/);
  assert.match(app.root.innerHTML,/data-action="help"/);
  assert.doesNotMatch(app.root.innerHTML,/header-document|depth-label|claim-kind|Choose one/);
  app.run('openModal=html=>{globalThis.modalHTML=html;}');
  app.click('help');
  assert.match(app.run('modalHTML'),/Double-click/);
  assert.match(app.run('modalHTML'),/Check source/);
  assert.match(app.run('modalHTML'),/Reword claim/);
  assert.doesNotMatch(app.run('modalHTML'),/Quick overview covers selected themes|neither is legal advice|Your responses record how you feel/);
});

test('the response trail preserves first-response order through revisits, undo and reload', async () => {
  const app=await client(twoCards);
  app.click('point','point-002');app.click('react','concern');app.click('confirm');
  app.click('point','point-001');app.click('react','comfortable');app.click('confirm');
  const trail=app.run('reactionTrail()');
  assert.ok(trail.indexOf('data-trail-id="point-002"')<trail.indexOf('data-trail-id="point-001"'));
  app.click('point','point-002');app.click('react','clarify');app.click('confirm');
  assert.deepEqual(Array.from(app.run('state.responseOrder')),['point-002','point-001']);
  app.click('undo');
  assert.equal(app.run('state.responses["point-002"].reaction'),'concern');
  const restored=restoreReview(app.run('JSON.stringify(state)'));
  assert.deepEqual(restored.responseOrder,['point-002','point-001']);
});

test('undoing a first response removes its segment from the recorded response order', async () => {
  const app=await client(twoCards);
  app.run("setScreen('review')");app.click('react','comfortable');app.click('confirm');app.click('undo');
  assert.deepEqual(Array.from(app.run('state.responseOrder')),[]);
  assert.match(app.run('reactionTrail()'),/data-trail-id="point-001"[^>]*data-state="unseen"/);
});

test('the platform report keeps only attention details while every card stays in the map', async () => {
  const app=await client({...followUpCards,source:{catalogId:'meta'}});
  const html=app.run('reportView()');
  assert.match(html,/<h1>Instagram report<\/h1>/);
  assert.match(html,/Needs attention/);
  assert.doesNotMatch(html,/Claim details|Left to review ·|Comfortable ·|<small>\d+ claims/);
  assert.equal([...html.matchAll(/data-map-id="point-/g)].length,5);
  assert.equal([...html.matchAll(/class="report-item"/g)].length,2);
  assert.deepEqual([...html.matchAll(/class="tag reaction-tag"[^>]*>([^<]*)<\/span>/g)].map(match=>match[1]),['Concerned','Unsure']);
});

test('the concise download leads with priorities and totals and omits comfortable claim details', async () => {
  const app=await client({...followUpCards,preferences:['collection']});
  const report=app.run('reportText()');
  assert.match(report,/Priority areas: Data collection/);
  assert.match(report,/1 comfortable/);
  assert.match(report,/email address/);
  assert.match(report,/mailing address/);
  assert.match(report,/username/);
  assert.doesNotMatch(report,/phone number|ORIGINAL POLICY \(COMPLETE\)/);
});

test('a selected security priority survives reload when an overview only has collection cards',async()=>{
  const app=await client({...twoCards,preferences:['security']});
  assert.deepEqual(Array.from(app.run('state.preferences')),['security']);
  assert.match(app.run('reportText()'),/Priority areas: Security/);
});
