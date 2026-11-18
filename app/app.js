import { analyzePolicy, TOPICS, SAMPLE_POLICY, SAMPLE_TITLE } from './engine.js';

const root = document.querySelector('#app');
const KEY = 'bite-sized-review-v1';
const MAX = 80000;
const icons = {collection:'◎',sharing:'↗',advertising:'◉',retention:'◷',controls:'☷',security:'◇',other:'≡'};
const reactions = {comfortable:'Comfortable',clarify:'Need clarification',concern:'Not comfortable',skipped:'Skipped'};
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state = null, analysis = null, screen = 'paste', cursor = 0, checkpointTopic = '', storageError = false;
let draft = {title:'',text:'',url:''}, modalReturn = null;
let ownOpen = false;
let inputMode = 'upload', selectedFile = null, pending = null, busy = '', importError = '';
let readingMode = 'user';
let flowToken = 0;
const featuredPolicies = [
  {id:'meta',name:'Instagram & Facebook',company:'Meta'},
  {id:'tiktok-us',name:'TikTok',company:'United States policy'},
  {id:'youtube-google',name:'YouTube & Google',company:'Google'}
];
try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if ([1,2].includes(saved?.version) && typeof saved.text === 'string' && saved.text.length <= MAX && saved.text.trim() && saved.responses && typeof saved.responses === 'object') {
    state = {...saved, preferences:Array.isArray(saved.preferences)?saved.preferences.filter(t=>TOPICS[t]):[]};
    analysis = state.analysis || analyzePolicy(state.text);
    if(analysis.mode==='model-assisted'&&typeof analysis.modelCount!=='number')analysis.modelCount=analysis.points.filter(p=>p.model).length;
  }
} catch { storageError = true; }
const points = () => analysis?.points || [];
const response = id => state.responses[id] || {};
const reviewed = () => points().filter(p=>['comfortable','clarify','concern'].includes(response(p.id).reaction));
const groups = () => {
  const all = analysis.topics.slice();
  return all.sort((a,b)=>Number(state.preferences.includes(b))-Number(state.preferences.includes(a)));
};
const ordered = () => groups().flatMap(topic=>points().filter(p=>p.topic===topic));
const current = () => ordered()[cursor];
const counts = list => ({comfortable:list.filter(p=>response(p.id).reaction==='comfortable').length,clarify:list.filter(p=>response(p.id).reaction==='clarify').length,concern:list.filter(p=>response(p.id).reaction==='concern').length,unreviewed:list.filter(p=>!['comfortable','clarify','concern'].includes(response(p.id).reaction)).length});
function save(){if(!state)return;Object.assign(state,{cursor,screen,checkpointTopic});try{localStorage.setItem(KEY,JSON.stringify(state));storageError=false;}catch{storageError=true;}}
function setScreen(next){screen=next;save();render();window.scrollTo(0,0);const heading=root.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
function toast(message){document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.role='status';el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),3000);}
function frame(content){const entry=['paste','import','preview'].includes(screen);const active=screen==='overview'?1:['review','checkpoint'].includes(screen)?2:3;return `<a class="skip-link" href="#main">Skip to content</a><div class="shell ${entry?'entry-shell':''}"><header class="header"><div class="header-right">${state?'<button class="text-button" data-action="reset">Clear review</button>':''}</div></header>${entry?'':`<nav class="steps" aria-label="Review progress">${['Add a policy','Make it yours','Review claims','Your report'].map((s,i)=>`<span class="step ${i===active?'active':i<active?'done':''}" ${i===active?'aria-current="step"':''}><b>${i<active?'✓':i+1}</b>${s}</span>`).join('')}</nav>`}<main id="main">${storageError?'<p class="save-warning" role="status">Browser storage is unavailable. Your review works in this tab, but may not survive a refresh. Download your report before leaving.</p>':''}${content}</main><footer class="footer"></footer></div>`;}
const policyMarks = {
  meta: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="8" width="32" height="32" rx="9" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="24" r="7" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="33.5" cy="14.5" r="2" fill="currentColor"/></svg>`,
  'tiktok-us': `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="currentColor" d="M27 7h6c.5 5 3 7.8 8 8v6c-3.1 0-5.8-.9-8-2.5V30c0 7-4.4 11-10.5 11C16.7 41 13 37 13 32c0-6.1 4.6-10 11-9v6c-3-.8-5 .7-5 3 0 2.1 1.5 3.5 3.6 3.5 2.8 0 4.4-1.7 4.4-5.5V7z"/></svg>`,
  'youtube-google': `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="12" width="38" height="25" rx="7" fill="#e52d27"/><path d="M21 18l11 6.5L21 31z" fill="white"/></svg>`
};
function pasteView(){return `<section class="entry-home"><h1>Privacy policies,<br><em>plainer.</em></h1>${state?`<div class="entry-resume"><span><strong>Your current review</strong><small>${escape(state.title)} · ${reviewed().length} of ${points().length} reviewed</small></span><button data-action="resume">Resume <span aria-hidden="true">↗</span></button></div>`:''}<div class="entry-section-title"><h2>Review a policy</h2></div><div class="policy-logos">${featuredPolicies.map(item=>`<button class="policy-logo" data-action="featured" data-id="${item.id}" ${busy?'disabled':''} aria-label="Review ${escape(item.name)} privacy policy"><span class="policy-logo-mark ${item.id}">${policyMarks[item.id]}</span><span>${escape(item.id==='meta'?'Instagram':item.id==='youtube-google'?'YouTube':item.name)}</span></button>`).join('')}</div>${busy?`<p class="entry-status" role="status">${escape(busy)}</p>`:''}${importError?`<p class="entry-error" role="alert">${escape(importError)}</p>`:''}<div class="own-disclosure ${ownOpen?'open':''}"><button class="own-toggle" data-action="own" aria-expanded="${ownOpen}" aria-controls="own-panel">Review my own policy <span aria-hidden="true">⌄</span></button><div id="own-panel" class="own-panel" ${ownOpen?'':'inert'}><div>${importView(true)}</div></div></div></section>`;}
function importView(inline=false){
  const tabs=[['upload','Upload'],['paste','Paste'],['url','URL']];
  const modeBody=inputMode==='upload'
    ? `<div id="drop-zone" class="drop-zone"><div class="drop-symbol" aria-hidden="true">↑</div><strong>Drop your file here</strong><span>PDF, DOCX, TXT, RTF</span><button type="button" class="choose-button" data-action="choose-file">Choose a file</button><input id="policy-file" hidden type="file" accept=".pdf,.docx,.txt,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf"></div>${selectedFile?`<div class="selected-file"><span class="selected-icon" aria-hidden="true">▤</span><span><strong>${escape(selectedFile.name)}</strong><small>${(selectedFile.size/1024).toFixed(0)} KB · ready to upload</small></span><button type="button" data-action="remove-file" aria-label="Remove selected file">×</button></div>`:''}<button class="primary entry-continue" data-action="import-file" ${!selectedFile||busy?'disabled':''}>Continue <span>→</span></button>`
    : inputMode==='paste'
    ? `<form id="policy-form"><label for="policy-title">Policy name <span>(optional)</span></label><input id="policy-title" name="title" type="text" maxlength="160" placeholder="e.g. A service you're considering" value="${escape(draft.title)}"><label for="policy-text">Policy text</label><textarea id="policy-text" name="policy" required maxlength="${MAX}" placeholder="Paste the privacy policy here…" aria-describedby="policy-help">${escape(draft.text)}</textarea><div class="entry-field-note" id="policy-help"><span id="char-count">${draft.text.length.toLocaleString()} / 80,000</span></div><button class="primary entry-continue" type="submit" ${busy?'disabled':''}>Continue <span>→</span></button></form>`
    : `<form id="url-form"><label for="policy-url">Privacy policy link</label><input id="policy-url" type="url" required placeholder="https://example.com/privacy" value="${escape(draft.url)}"><button class="primary entry-continue" type="submit" ${busy?'disabled':''}>Continue <span>→</span></button></form>`;
  return `<section class="${inline?'inline-import':'entry-import'}">${inline?'':'<button class="entry-back" data-action="home">← &nbsp; Back to policies</button><h1>Add a privacy policy.</h1>'}<div class="import-tabs" role="tablist" aria-label="Ways to add a policy">${tabs.map(([id,label])=>`<button type="button" role="tab" id="tab-${id}" aria-controls="import-panel" aria-selected="${inputMode===id}" tabindex="${inputMode===id?0:-1}" data-action="input-mode" data-id="${id}">${label}</button>`).join('')}</div><div id="import-panel" role="tabpanel" aria-labelledby="tab-${inputMode}">${modeBody}</div>${busy?`<p class="entry-status" role="status">${escape(busy)}</p>`:''}${importError?`<p class="entry-error" role="alert">${escape(importError)}</p>`:''}</section>`;
}
function warningText(warning){const message=typeof warning==='string'?warning:warning.message||'Extraction warning';return message.startsWith('No semantic main/article region found')?'This page may include navigation text. Check the extracted wording before continuing.':message;}
function previewView(){
  if(!pending)return pasteView();
  const excerpt=pending.text;
  return `<section class="entry-preview"><button class="entry-back" data-action="home">← &nbsp; Choose another policy</button><h1>Is this the policy you meant?</h1><div class="entry-document"><div><strong>${escape(pending.title)}</strong><small>${pending.text.length.toLocaleString()} characters · ${escape(pending.source?.kind||'policy')}</small></div>${pending.source?.finalUrl?`<a href="${escape(pending.source.finalUrl)}" target="_blank" rel="noopener noreferrer">Original page ↗</a>`:''}</div>${pending.warnings?.length?`<div class="warning-list"><strong>Check these details</strong>${pending.warnings.map(w=>`<p>${escape(warningText(w))}</p>`).join('')}</div>`:''}<details class="entry-source"><summary>See the extracted text <span aria-hidden="true">↘</span></summary><pre>${escape(excerpt)}</pre></details><fieldset class="reading-modes"><legend>How would you like to read it?</legend><label><input type="radio" name="reading-mode" value="user" ${readingMode==='user'?'checked':''} ${busy?'disabled':''}><span><strong>User mode</strong><small>A short plain-language overview of key points. The full policy stays available.</small></span></label><label><input type="radio" name="reading-mode" value="lawyer" ${readingMode==='lawyer'?'checked':''} ${busy?'disabled':''}><span><strong>Lawyer mode</strong><small>A detailed, clause-by-clause reading with more source-linked cards.</small></span></label></fieldset><button class="primary entry-continue" data-action="build" ${busy?'disabled':''}>${busy?'Preparing claims…':'Continue to claims'} <span>→</span></button>${busy?'<p class="entry-status" role="status">The model is linking claims to exact source wording. Longer policies can take a minute.</p>':''}${importError?`<p class="entry-error" role="alert">${escape(importError)}</p><button class="secondary" data-action="source-fallback">Continue with exact passages</button>`:''}</section>`;
}
function overviewView(){return `<section class="simple-page overview-page"><button class="text-button back-link" data-action="home">← All policies</button><p class="page-label">${escape(state.title)}</p><h1>Choose where to start.</h1><p class="page-meta">${analysis.readingMode==='user'?'User mode · ':analysis.readingMode==='lawyer'?'Lawyer mode · ':''}${points().length} ${analysis.mode==='model-assisted'?'claims':'passages'} · ${reviewed().length} reviewed</p>${state.source?.catalogId&&state.source?.fetchedAt?`<p class="page-meta saved-date">Saved from the policy fetched ${new Date(state.source.fetchedAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}. Check the original page for updates.</p>`:''}${analysis.readingMode==='user'?`<div class="notice">User mode selects key points; it does not cover every clause. ${analysis.unclaimedUnitIds.length} source units are not summarized here. Read the full policy at any time.</div>`:analysis.mode==='model-assisted'&&analysis.status!=='structurally_complete'?`<div class="notice">Some claims need review. The original policy remains available.</div>`:''}<button class="text-button full-source-link" data-action="full-source">Read full policy ↗</button>${analysis.mode==='model-assisted'?`<button class="text-button mode-switch-link" data-action="change-mode">Change reading mode →</button>`:''}<h2 class="section-heading">What matters to you?</h2><p class="page-meta">Choose topics to see them first.</p><div class="pref-list">${analysis.topics.map(t=>`<button class="pref" data-action="preference" data-id="${t}" aria-pressed="${state.preferences.includes(t)}">${state.preferences.includes(t)?'✓ ':''}${TOPICS[t].label}</button>`).join('')}</div><button class="primary primary-wide" data-action="start">${reviewed().length?'Continue review':'Start review'} <span>→</span></button><details class="details"><summary>About these claims</summary><p>${analysis.mode==='model-assisted'?'AI-generated claims can miss context. Check each claim against the original wording.':'Cards show original policy passages.'} Topics are suggested using text matching.</p></details><button class="text-button overview-report" data-action="report">View report so far →</button></section>`;}
function sidebar(p){return `<aside class="sidebar"><button class="text-button" data-action="overview">← Topics</button><p class="doc-name">${escape(state.title)}</p><div class="meter"><span style="width:${reviewed().length/points().length*100}%"></span></div><div class="progress-label"><span>${reviewed().length} of ${points().length} reviewed</span></div><nav class="topic-nav" aria-label="Policy topics">${groups().map(t=>{const list=points().filter(x=>x.topic===t);return `<button class="nav-topic ${p.topic===t?'current':''}" data-action="topic" data-id="${t}" ${p.topic===t?'aria-current="true"':''}>${TOPICS[t].label}<small>${list.filter(x=>['comfortable','clarify','concern'].includes(response(x.id).reaction)).length}/${list.length}</small></button>`;}).join('')}</nav><button class="text-button" data-action="report">View report →</button></aside>`;}
function reviewView(){
  const p=current();if(!p)return reportView();const r=response(p.id);
  const sectionLabel=p.sectionPath?.filter(part=>part!=='Document').join(' › ')||TOPICS[p.topic].label;
  return `<div class="review-layout">${sidebar(p)}<section class="review-main"><div class="review-meta"><span>${p.model?'CLAIM':'SOURCE PASSAGE'} ${cursor+1} OF ${points().length}</span><span>${state.preferences.includes(p.topic)?'<span class="tag">✧ Your priority</span>':''}<button class="text-button mobile-report" data-action="report">Report so far ↗</button></span></div><p class="eyebrow">${escape(sectionLabel)}</p><h1 tabindex="-1">${escape(p.model?p.title:p.title.replace(/ detail (\d+)$/,' · $1'))}</h1><article class="source-card"><span class="point-id">Original wording</span><blockquote>${escape(p.text.trim())}</blockquote>${p.contextQuote?`<div class="context-quote"><strong>Context cited with this claim</strong><p>${escape(p.contextQuote.trim())}</p></div>`:''}<div class="source-bottom">${p.validationFlags?.length?'<span>Review the condition or exception carefully</span>':''}<button class="text-button" data-action="source" data-id="${p.id}">View in full policy ↗</button></div></article><h3 class="reaction-label">How do you feel about this?</h3><div class="reactions">${[['comfortable','✓','Comfortable'],['clarify','?','Need clarification'],['concern','!','Not comfortable']].map(([id,icon,label])=>`<button class="reaction ${id}" data-action="react" data-id="${id}" aria-pressed="${r.reaction===id}"><span aria-hidden="true">${icon}</span>${label}</button>`).join('')}</div>${r.reaction&&r.reaction!=='skipped'?branchView(p,r):''}<div class="review-nav"><button class="text-button" data-action="previous" ${cursor===0?'disabled':''}>← Previous</button><div class="actions"><button class="text-button" data-action="skip">Skip for now</button><button class="primary" data-action="next" ${!r.reaction||r.reaction==='skipped'?'disabled':''}>${ordered()[cursor+1]?.topic!==p.topic?'Section checkpoint':'Next claim'} <span>→</span></button></div></div></section></div>`;
}
function branchView(p,r){if(r.reaction==='clarify')return `<div class="branch"><label for="question">What would you like to understand?</label><textarea id="question" data-field="question" placeholder="e.g. Does this also apply after I delete my account?">${escape(r.question||'')}</textarea><details class="details"><summary>Help me frame a question</summary><p>Try asking: What information does this cover? When does it apply? Is there a choice or exception? What happens if I stop using the service?</p><p>Keep the full wording nearby. This prototype doesn’t generate explanations or verify the service’s practices.</p></details><p class="fine" style="text-align:left;margin-bottom:0">Your question is saved here. It isn’t sent to the provider.</p></div>`;if(r.reaction==='concern')return `<div class="branch"><label for="note">What concerns you? <span class="muted">(optional)</span></label><textarea id="note" data-field="note" placeholder="Put it in your own words…">${escape(r.note||'')}</textarea><label class="check-label"><input type="checkbox" data-field="dealbreaker" ${r.dealbreaker?'checked':''}> This could be a dealbreaker for me</label></div>`;return `<div class="branch"><p style="margin-bottom:0">Noted. This point feels okay to you.</p><details class="details" style="margin-top:10px"><summary>Add a note (optional)</summary><label class="sr-only" for="note">Your note</label><textarea id="note" data-field="note" placeholder="Anything you’d like to remember?">${escape(r.note||'')}</textarea></details></div>`;}
function checkpointView(){const list=points().filter(p=>p.topic===checkpointTopic);const c=counts(list);return `<section class="checkpoint"><div class="panel"><div class="check-emblem">✓</div><h1 tabindex="-1">${TOPICS[checkpointTopic].label}<br>reviewed.</h1><div class="stats"><div class="stat"><strong>${list.length-c.unreviewed}/${list.length}</strong><span>reviewed</span></div><div class="stat"><strong>${c.clarify}</strong><span>need clarification</span></div><div class="stat"><strong>${c.concern}</strong><span>concerns</span></div><div class="stat"><strong>${c.unreviewed}</strong><span>still to review</span></div></div><div class="actions" style="margin-top:25px"><button class="primary" data-action="continue">${cursor>=ordered().length-1?'See my report':'Continue to next section'} →</button><button class="text-button" data-action="report">Finish with report</button></div><button class="text-button" style="margin-top:18px" data-action="topic" data-id="${checkpointTopic}">Revisit this section</button></div></section>`;}
function reportItem(p){
  const r=response(p.id);
  return `<article class="report-item"><div class="report-item-header"><div><h3>${escape(p.title)}</h3>${r.reaction==='concern'&&r.dealbreaker?'<span class="tag dealbreaker">Potential dealbreaker</span>':''}${r.reaction==='skipped'?'<span class="tag">Skipped for now</span>':''}</div><button class="text-button" data-action="point" data-id="${p.id}">Revisit ↗</button></div>${r.question?`<p class="note"><strong>${r.reaction==='clarify'?'Saved question:':'Earlier question:'}</strong> ${escape(r.question)}</p>`:r.reaction==='clarify'?'<p class="note muted">Needs clarification · no question added yet.</p>':''}${r.note?`<p class="note"><strong>Your note:</strong> ${escape(r.note)}</p>`:''}<details class="details"><summary>Exact source wording</summary><p class="excerpt">${escape(p.text.trim())}</p>${p.contextQuote?`<p class="excerpt"><strong>Context:</strong> ${escape(p.contextQuote.trim())}</p>`:''}<button class="text-button" data-action="source" data-id="${p.id}">View in full policy</button></details></article>`;
}
function reportView(){
  const c=counts(points());
  const sections=[['Concerns to think through','concern'],['Questions to come back to','clarify'],['Skipped or not reviewed','unreviewed'],['Points you’re comfortable with','comfortable']];
  const sectionHtml=sections.map(([title,key])=>{const list=points().filter(p=>key==='unreviewed'?!['comfortable','clarify','concern'].includes(response(p.id).reaction):response(p.id).reaction===key);if(!list.length)return '';return `<section class="report-section"><h2>${title} <span class="count">${list.length}</span></h2>${key==='unreviewed'?`<details class="details"><summary>Show unreviewed claims</summary>${list.map(reportItem).join('')}</details>`:list.map(reportItem).join('')}</section>`;}).join('');
  return `<div class="topline"><div><p class="eyebrow">Your review / ${new Date(state.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</p><h1 tabindex="-1">Your report.</h1><p class="muted">${escape(state.title)} · ${reviewed().length} of ${points().length} claims reviewed${c.unreviewed?' · Partial review':''}</p></div><div class="actions no-print"><button class="secondary" data-action="overview">Back to topic map</button><button class="primary" data-action="download">Download report ↓</button></div></div>${analysis.readingMode==='user'?`<div class="notice report-notice">Selective user overview: ${analysis.unclaimedUnitIds.length} source units are not summarized in cards. The complete original policy is included in the downloaded report.</div>`:analysis.mode==='model-assisted'&&analysis.status!=='structurally_complete'?`<div class="notice report-notice">Partial model analysis: ${analysis.modelCount} AI claims and ${points().length-analysis.modelCount} exact passages. Check the original text.</div>`:''}<div class="report-summary"><div class="stats"><div class="stat"><strong>${c.concern}</strong><span>concerns</span></div><div class="stat"><strong>${c.clarify}</strong><span>need clarification</span></div><div class="stat"><strong>${c.unreviewed}</strong><span>still to review</span></div><div class="stat"><strong>${c.comfortable}</strong><span>comfortable</span></div></div></div><div class="report-layout"><div>${sectionHtml||'<p class="empty">No reactions recorded yet. Review a claim to begin.</p>'}</div><aside class="report-side"><div class="panel"><h2>Your note</h2><label for="reflection">What would you like to check before deciding?</label><textarea id="reflection" data-field="reflection" placeholder="Your note…">${escape(state.reflection||'')}</textarea><button class="primary" data-action="download">Download full report ↓</button><button class="secondary" data-action="print">Print / Save as PDF ↗</button><button class="text-button" data-action="review-unfinished">${c.unreviewed?'Review unfinished claims':'Revisit my review'} →</button><details class="details"><summary>About this report</summary><p>Document added ${new Date(state.createdAt).toLocaleString()}. ${analysis.mode==='model-assisted'?'Claims were proposed by an AI model and have not been legally verified.':'Cards display exact source passages.'} Topic suggestions use text matching. The full policy is retained in the downloaded report. Reactions and notes stay in this browser.</p></details></div></aside></div>`;
}
async function apiPost(route, payload){
  const response=await fetch(route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  let body;try{body=await response.json();}catch{throw new Error('The local preparation service did not return a readable response.');}
  if(!response.ok)throw new Error(body.error||`Request failed (HTTP ${response.status}).`);return body;
}
async function savedFeatured(id){
  if(!featuredPolicies.some(item=>item.id===id))throw new Error('This featured policy is not available.');
  const response=await fetch(`data/featured/${id}.json`);
  if(!response.ok)throw new Error('The saved policy could not be opened. Try again later.');
  const saved=await response.json();
  if(saved.version!==1||saved.id!==id||saved.imported?.source?.catalogId!==id||!saved.imported?.text||!saved.analyses?.user||!saved.analyses?.lawyer||saved.analyses.user.document?.text!==saved.imported.text||saved.analyses.lawyer.document?.text!==saved.imported.text)throw new Error('The saved policy is incomplete.');
  return saved;
}
async function openFeatured(id){
  const token=++flowToken;busy='Opening saved policy…';importError='';render();
  try{const saved=await savedFeatured(id);if(token!==flowToken)return;pending=saved.imported;readingMode='user';busy='';replaceWithPrepared(preparedAnalysis(saved.analyses.user,pending.text));}
  catch(error){if(token!==flowToken)return;busy='';importError=error.message;render();}
}
async function importPolicy(input){
  const token=++flowToken;importError='';busy='Reading the privacy policy…';render();
  try{const result=await apiPost('/api/import',input);if(token!==flowToken)return;if(result.text.length>MAX)throw new Error('This policy is over the 80,000-character limit.');pending=result;busy='';setScreen('preview');}
  catch(error){if(token!==flowToken)return;busy='';importError=error.message;render();}
}
function preparedAnalysis(raw,text){
  const byUnit=new Map();for(const claim of raw.claims||[]){const list=byUnit.get(claim.unitId)||[];list.push(claim);byUnit.set(claim.unitId,list);}
  const nonClaimUnitIds=new Set((raw.nonClaimUnits||[]).map(item=>item.unitId));
  const prepared=[];
  for(const unit of raw.units||[]){
    if(nonClaimUnitIds.has(unit.id))continue;
    const claims=byUnit.get(unit.id)||[];
    if(raw.readingMode==='user'&&!claims.length)continue;
    const sourceItems=claims.length?claims:[{claim:'Read this source passage',sourceQuote:unit.text,sourceRange:{start:unit.start,end:unit.end},reviewState:'exact-source-only'}];
    for(const item of sourceItems){
      if(!item.sourceQuote?.trim())continue;
      const classified=analyzePolicy(item.sourceQuote).points[0]||{topic:'other',priority:'standard'};
      prepared.push({id:`point-${String(prepared.length+1).padStart(3,'0')}`,title:item.claim,text:item.sourceQuote,start:item.sourceRange.start,end:item.sourceRange.end,
        contextQuote:item.contextQuote||'',contextRange:item.contextRange||null,topic:classified.topic,priority:classified.priority,relatedIds:[],
        model:item.reviewState!=='exact-source-only',validationFlags:item.validationFlags||[],unitId:unit.id,sectionPath:unit.sectionPath||[]});
    }
  }
  if(!prepared.length)throw new Error('No readable claims or passages were returned.');
  return {points:prepared,topics:[...new Set(prepared.map(p=>p.topic))],wordCount:raw.document?.wordCount||text.split(/\s+/).length,mode:'model-assisted',readingMode:raw.readingMode||readingMode,modelCount:prepared.filter(p=>p.model).length,status:raw.status,nonClaimCount:nonClaimUnitIds.size,unclaimedUnitIds:raw.unclaimedUnitIds||[],rejectedCount:raw.rejected?.length||0,failureCount:raw.failures?.length||0,warnings:raw.warnings||[]};
}
function replaceWithPrepared(nextAnalysis,confirmed=false){
  if(state&&!confirmed){openModal(`<div class="modal-top"><h2 id="modal-title">Replace your current review?</h2><button class="secondary" data-close>Keep it</button></div><p class="help-copy">The current policy and reactions will be replaced in this browser. Download its report first if you want a copy.</p><button class="primary" id="confirm-replace">Start new review</button>`);document.querySelector('#confirm-replace').onclick=()=>{closeModal();replaceWithPrepared(nextAnalysis,true);};return;}
  state={version:2,text:pending.text,title:pending.title,source:pending.source,warnings:pending.warnings||[],createdAt:new Date().toISOString(),preferences:[],responses:{},reflection:'',analysis:nextAnalysis};
  analysis=nextAnalysis;cursor=0;pending=null;importError='';setScreen('overview');
}
async function buildReview(){
  if(!pending||busy)return;const token=++flowToken;busy='Preparing source-linked claims…';importError='';render();
  try{const id=pending.source?.catalogId;const saved=id&&featuredPolicies.some(item=>item.id===id)?await savedFeatured(id):null;const raw=saved&&saved.imported.text===pending.text?saved.analyses[readingMode]:(await apiPost('/api/decompose',{title:pending.title,text:pending.text,source:pending.source,mode:readingMode})).analysis;if(token!==flowToken)return;busy='';replaceWithPrepared(preparedAnalysis(raw,pending.text));}
  catch(error){if(token!==flowToken)return;busy='';importError=error.message;render();}
}
function exactPassageFallback(){if(!pending)return;const fallback=analyzePolicy(pending.text);fallback.mode='exact-source-only';replaceWithPrepared(fallback);}
async function importFile(file){
  if(!file)return;const token=flowToken;if(!/\.(pdf|docx|txt|rtf)$/i.test(file.name))throw new Error('Choose a PDF, DOCX, TXT, or RTF file.');if(file.size>12*1024*1024)throw new Error('Use a file under 12 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  if(token!==flowToken)return;
  await importPolicy({kind:'file',filename:file.name,base64:btoa(binary)});
}
function selectFile(file){
  selectedFile=null;importError='';
  if(file){if(!/\.(pdf|docx|txt|rtf)$/i.test(file.name))importError='Choose a PDF, DOCX, TXT, or RTF file.';
    else if(file.size>12*1024*1024)importError='Use a file under 12 MB.';
    else selectedFile=file;}
  render();root.querySelector(selectedFile?'[data-action="import-file"]':'[data-action="choose-file"]')?.focus();
}
function focusEntry(){window.scrollTo(0,0);const heading=root.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
function render(){root.innerHTML=frame(screen==='paste'?pasteView():screen==='import'?importView():screen==='preview'?previewView():screen==='overview'?overviewView():screen==='review'?reviewView():screen==='checkpoint'?checkpointView():reportView());}
function begin(text,title,confirmed=false){if(state&&state.text===text){state.title=title.trim()||'Untitled privacy policy';setScreen('overview');return;}if(state&&!confirmed){openModal(`<div class="modal-top"><h2 id="modal-title">Start a new review?</h2><button class="secondary" data-close>Keep current review</button></div><p class="help-copy">Your current review will be replaced. Download its report first if you want to keep your notes.</p><button class="primary" id="confirm-replace">Start new review</button>`);document.querySelector('#confirm-replace').onclick=()=>{closeModal();begin(text,title,true);};return;}draft={text,title};state={version:1,text,title:title.trim()||'Untitled privacy policy',createdAt:new Date().toISOString(),preferences:[],responses:{},reflection:''};analysis=analyzePolicy(text);cursor=0;setScreen('overview');}
function next(){const p=current();const nextPoint=ordered()[cursor+1];if(!nextPoint||nextPoint.topic!==p.topic){checkpointTopic=p.topic;setScreen('checkpoint');}else{cursor++;setScreen('review');}}
function goPoint(id){cursor=ordered().findIndex(p=>p.id===id);if(cursor<0)cursor=0;setScreen('review');}
function openModal(html){modalReturn=document.activeElement;const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">${html}</section>`;document.body.append(wrap);root.inert=true;document.body.style.overflow='hidden';wrap.querySelector('button')?.focus();wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('[data-close]'))closeModal();});wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeModal();}if(e.key==='Tab'){const els=[...wrap.querySelectorAll('button,a,input,textarea,[tabindex="0"]')];const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});}
function closeModal(){document.querySelector('.modal-backdrop')?.remove();root.inert=false;document.body.style.overflow='';modalReturn?.focus();}
function showSource(id){const p=points().find(x=>x.id===id);openModal(`<div class="modal-top"><div><p class="eyebrow">Original document</p><h2 id="modal-title">${escape(state.title)}</h2></div><button class="secondary" data-close>Close</button></div><p class="muted" style="font-size:12px">The highlighted passage is this claim’s exact position in the extracted policy text.</p><div class="source-full">${escape(state.text.slice(0,p.start))}<mark id="source-highlight">${escape(state.text.slice(p.start,p.end))}</mark>${escape(state.text.slice(p.end))}</div>`);document.querySelector('#source-highlight').scrollIntoView({block:'center'});}
function showFullSource(){openModal(`<div class="modal-top"><div><p class="eyebrow">Original document</p><h2 id="modal-title">${escape(state.title)}</h2></div><button class="secondary" data-close>Close</button></div><div class="source-full">${escape(state.text)}</div>`);}
function reportText(){
  const c=counts(points());
  return ['BITE-SIZED · PERSONAL PRIVACY POLICY REVIEW',state.title,`Document added: ${state.createdAt}`,`Report exported: ${new Date().toISOString()}`,`Cards reviewed: ${reviewed().length}/${points().length}${analysis.readingMode==='user'?'; selective overview, not complete policy coverage':''}`,`${c.concern} concerns | ${c.clarify} need clarification | ${c.comfortable} comfortable | ${c.unreviewed} still to review`,`Analysis: ${analysis.readingMode==='user'?`User overview; ${analysis.unclaimedUnitIds.length} source units not summarized`:analysis.mode==='model-assisted'?`${analysis.modelCount} AI draft claims; ${points().length-analysis.modelCount} exact passages; status ${analysis.status||'unknown'}`:'Exact source passages only'}`,`Source: ${state.source?.finalUrl||state.source?.kind||'paste'}`,`\nThis report records personal reactions, not legal advice or acceptance. Check AI claims against the original wording. Topic suggestions are navigation aids, not risk ratings.`,`\nNOTE TO MY FUTURE SELF\n${state.reflection||'(None)'}`,...ordered().map(p=>{const r=response(p.id);return `\n[${p.id}] ${p.title}\nReaction: ${reactions[r.reaction]||'Not reviewed'}${r.reaction==='concern'&&r.dealbreaker?' · POTENTIAL DEALBREAKER':''}\n${r.question?`Question: ${r.question}\n`:''}${r.note?`Note: ${r.note}\n`:''}Exact source characters ${p.start}–${p.end}:\n${p.text.trim()}${p.contextQuote?`\nCited context:\n${p.contextQuote.trim()}`:''}`;}),`\nORIGINAL POLICY (COMPLETE)\n${state.text}`].join('\n');
}
root.addEventListener('submit',e=>{
  if(e.target.id==='policy-form'){
    e.preventDefault();const text=document.querySelector('#policy-text').value;const title=document.querySelector('#policy-title').value;
    if(text.trim().length<40){importError='Add at least 40 characters of policy text.';render();return;}
    if(text.length>MAX){importError='Use up to 80,000 characters.';render();return;}
    draft={...draft,text,title};importPolicy({kind:'paste',text,title});return;
  }
  if(e.target.id==='url-form'){
    e.preventDefault();const url=document.querySelector('#policy-url').value.trim();draft.url=url;importPolicy({kind:'url',url});
  }
});
root.addEventListener('input',e=>{if(e.target.id==='policy-text'){draft.text=e.target.value;document.querySelector('#char-count').textContent=`${e.target.value.length.toLocaleString()} / 80,000`;return;}if(e.target.id==='policy-title'){draft.title=e.target.value;return;}if(e.target.id==='policy-url'){draft.url=e.target.value;return;}const field=e.target.dataset.field;if(!field||!state)return;if(field==='reflection')state.reflection=e.target.value;else{const p=current();state.responses[p.id]={...response(p.id),[field]:field==='dealbreaker'?e.target.checked:e.target.value};}save();});
root.addEventListener('change',async e=>{
  if(e.target.id==='policy-file')selectFile(e.target.files[0]||null);
  if(e.target.name==='reading-mode')readingMode=e.target.value;
});
root.addEventListener('dragover',e=>{const zone=e.target.closest('#drop-zone');if(!zone)return;e.preventDefault();e.dataTransfer.dropEffect='copy';zone.classList.add('is-dragging');});
root.addEventListener('dragleave',e=>{const zone=e.target.closest('#drop-zone');if(zone&&!zone.contains(e.relatedTarget))zone.classList.remove('is-dragging');});
root.addEventListener('drop',e=>{const zone=e.target.closest('#drop-zone');if(!zone)return;e.preventDefault();selectFile(e.dataTransfer.files[0]||null);});
root.addEventListener('keydown',e=>{const tab=e.target.closest('[role="tab"]');if(!tab)return;const modes=['upload','paste','url'];const index=modes.indexOf(tab.dataset.id);let next=index;if(e.key==='ArrowRight')next=(index+1)%modes.length;else if(e.key==='ArrowLeft')next=(index+modes.length-1)%modes.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=modes.length-1;else return;e.preventDefault();flowToken++;inputMode=modes[next];busy='';importError='';render();root.querySelector(`#tab-${inputMode}`)?.focus();});
root.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(!button||button.disabled)return;const action=button.dataset.action,id=button.dataset.id;
  if(action==='home'){flowToken++;screen='paste';pending=null;busy='';importError='';render();focusEntry();}
  if(action==='own'){ownOpen=!ownOpen;importError='';render();root.querySelector('[data-action="own"]')?.focus({preventScroll:true});}
  if(action==='sample')importPolicy({kind:'paste',text:SAMPLE_POLICY,title:SAMPLE_TITLE});
  if(action==='featured')openFeatured(id);
  if(action==='input-mode'){flowToken++;inputMode=id;busy='';importError='';render();root.querySelector(`#tab-${id}`)?.focus();}
  if(action==='choose-file')root.querySelector('#policy-file')?.click();
  if(action==='remove-file'){selectedFile=null;render();root.querySelector('[data-action="choose-file"]')?.focus();}
  if(action==='import-file'){importFile(selectedFile).catch(error=>{importError=error.message;render();});}
  if(action==='build')buildReview();
  if(action==='source-fallback')exactPassageFallback();
  if(action==='about')openModal(`<div class="modal-top"><h2 id="modal-title">How this review works</h2><button class="secondary" data-close>Close</button></div><div class="help-copy"><p>Choose a privacy policy, check the text we extracted, then review short claims linked to exact wording. Record what feels comfortable, unclear, or concerning. Your report keeps your notes and unfinished material together.</p><p><strong>Analysis:</strong> policy text is sent to the server and OpenAI to propose claims. Those paraphrases are not legally verified; check the exact source before relying on them. If analysis fails, you can continue with exact source passages.</p><p><strong>Your review:</strong> reactions, questions, and notes are saved in this browser. They are not sent to the policy provider. Anyone using this browser profile may be able to reopen them; “Clear review” removes them here.</p></div>`);
  if(action==='reset'){openModal(`<div class="modal-top"><h2 id="modal-title">Clear this review?</h2><button class="secondary" data-close>Keep review</button></div><p class="help-copy">This removes the saved policy, reactions, questions, and notes from this browser. Download your report first if you’d like to keep a copy.</p><button class="primary" id="confirm-clear">Clear review</button>`);document.querySelector('#confirm-clear').onclick=()=>{try{localStorage.removeItem(KEY);}catch{toast('Could not remove browser storage. Clear site data in your browser settings.');return;}flowToken++;closeModal();state=null;analysis=null;pending=null;draft={title:'',text:'',url:''};screen='paste';render();};}
  if(action==='resume'){cursor=Math.max(0,Math.min(state.cursor||0,points().length-1));checkpointTopic=state.checkpointTopic||current().topic;setScreen(['report','overview','checkpoint'].includes(state.screen)?state.screen:'review');}
  if(action==='overview')setScreen('overview');
  if(action==='edit'){flowToken++;draft={...draft,text:state.text,title:state.title};inputMode='paste';screen='import';render();focusEntry();}
  if(action==='preference'){state.preferences=state.preferences.includes(id)?state.preferences.filter(t=>t!==id):[...state.preferences,id];save();render();}
  if(action==='start'||action==='review-unfinished'){const first=ordered().findIndex(p=>!['comfortable','clarify','concern'].includes(response(p.id).reaction));cursor=first<0?0:first;setScreen('review');}
  if(action==='topic'){goPoint(ordered().find(p=>p.topic===id).id);}
  if(action==='point')goPoint(id);
  if(action==='source')showSource(id);
  if(action==='full-source')showFullSource();
  if(action==='change-mode'){pending={title:state.title,text:state.text,source:state.source,warnings:state.warnings||[]};readingMode=analysis.readingMode||'user';setScreen('preview');}
  if(action==='react'){const p=current();state.responses[p.id]={...response(p.id),reaction:id,dealbreaker:id==='concern'?Boolean(response(p.id).dealbreaker):false};save();render();root.querySelector(`[data-action="react"][data-id="${id}"]`)?.focus({preventScroll:true});}
  if(action==='next')next();
  if(action==='skip'){const p=current();state.responses[p.id]={...response(p.id),reaction:'skipped',dealbreaker:false};save();next();}
  if(action==='previous'){cursor--;setScreen('review');}
  if(action==='continue'){if(cursor>=ordered().length-1)setScreen('report');else{cursor++;setScreen('review');}}
  if(action==='report')setScreen('report');
  if(action==='download'){const blob=new Blob([reportText()],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`${state.title.replace(/[^a-z0-9]+/gi,'-').slice(0,60)}-review.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Your full report has been downloaded.');}
  if(action==='print'){const details=[...root.querySelectorAll('.report-item details')];const prior=details.map(d=>d.open);details.forEach(d=>d.open=true);window.print();details.forEach((d,i)=>d.open=prior[i]);}
});
render();
