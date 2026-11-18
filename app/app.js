import { analyzePolicy, TOPICS } from './engine.js';
import { MAX_POLICY_CHARS, preparedAnalysis, restoreReview, reviewDepth, switchReviewDepth } from './review-state.js';

const root = document.querySelector('#app');
const KEY = 'bite-sized-review-v1';
const MAX = MAX_POLICY_CHARS;
const reactions = {comfortable:'Accepted',clarify:'Unsure',concern:'Rejected',skipped:'Skipped'};
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state = null, analysis = null, screen = 'paste', cursor = 0, checkpointTopic = '', storageError = false;
let draft = {title:'',text:'',url:''}, modalReturn = null;
let ownOpen = false;
let inputMode = 'upload', selectedFile = null, pending = null, busy = '', importError = '';
let readingMode = 'user', selectedFeatured = null, ownModeSelected = false, previewModeOpen = false;
let rewordBusy = '', rewordError = '';
let flowToken = 0;
let pendingReaction = null, lastDecision = null;
const featuredPolicies = [
  {id:'meta',name:'Instagram & Facebook',company:'Meta'},
  {id:'tiktok-us',name:'TikTok',company:'United States policy'},
  {id:'youtube-google',name:'YouTube & Google',company:'Google'}
];
let recoveryError = '';
let savedReview;
try { savedReview = localStorage.getItem(KEY); }
catch { storageError = true; }
try {
  state = restoreReview(savedReview);
  analysis = state?.analysis || null;
} catch {
  state = null;
  analysis = null;
  recoveryError = 'Your saved review could not be restored. Its browser data has been kept; starting a new review will replace it.';
}
const points = () => analysis?.points || [];
const response = id => state.responses[id] || {};
const reviewed = () => points().filter(p=>['comfortable','clarify','concern'].includes(response(p.id).reaction));
const groups = () => {
  const all = analysis.topics.slice();
  return all.sort((a,b)=>Number(state.preferences.includes(b))-Number(state.preferences.includes(a)));
};
const ordered = () => groups().flatMap(topic=>points().filter(p=>p.topic===topic));
const sequence = () => state?.queue ? state.queue.ids.map(id=>points().find(p=>p.id===id)).filter(Boolean) : ordered();
const current = () => sequence()[cursor];
const queueLabels = {unsure:'Unsure cards',attention:'Concerns',unfinished:'Left to review',skipped:'Skipped cards'};
const counts = list => ({comfortable:list.filter(p=>response(p.id).reaction==='comfortable').length,clarify:list.filter(p=>response(p.id).reaction==='clarify').length,concern:list.filter(p=>response(p.id).reaction==='concern').length,unreviewed:list.filter(p=>!['comfortable','clarify','concern'].includes(response(p.id).reaction)).length});
function save(){if(!state)return;Object.assign(state,{cursor,checkpointTopic});if(['overview','review','checkpoint','report'].includes(screen))state.screen=screen;try{localStorage.setItem(KEY,JSON.stringify(state));storageError=false;}catch{storageError=true;}}
function setScreen(next){pendingReaction=null;screen=next;save();render();window.scrollTo(0,0);const heading=root.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
function toast(message){document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.role='status';el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),3000);}
function frame(content){
  const entry=['paste','import','preview'].includes(screen);
  return `<a class="skip-link" href="#main">Skip to content</a>
    <div class="shell ${entry?'entry-shell':''}">
      <header class="header">
        <button class="brand" data-action="home" aria-label="Plainer — all policies">plainer<span aria-hidden="true">.</span></button>
        ${!entry&&state?`<span class="header-document">${escape(state.title)}</span>`:''}
        <div class="header-right">${state?'<button class="text-button" data-action="reset">Clear review</button>':''}</div>
      </header>
      <main id="main">
        ${storageError?'<p class="save-warning" role="status">Browser storage is unavailable. Your review works in this tab, but may not survive a refresh. Download your report before leaving.</p>':''}
        ${recoveryError?`<p class="save-warning" role="status">${escape(recoveryError)}</p>`:''}
        ${content}
      </main>
    </div>`;
}

function readerFrame(content){
  const completed=reviewed().length, total=points().length;
  const skipped=points().filter(p=>response(p.id).reaction==='skipped').length;
  return `<div class="reader-layout">
    <aside class="review-sidebar" aria-label="Review progress">
      <p class="eyebrow">${reviewDepth(state)==='user'?'User view':'Lawyer mode'}</p>
      <p class="progress-label"><strong>${completed} of ${total}</strong> reviewed${skipped?`<span>${skipped} skipped</span>`:''}</p>
      <div class="card-progress-track" role="progressbar" aria-label="Review progress" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${completed}"><span style="width:${total?completed/total*100:0}%"></span></div>
      ${state.queue&&screen==='review'?`<p class="queue-label">${queueLabels[state.queue.kind]}</p>`:`<ol class="review-topics" aria-label="Policy sections">${groups().map((topic,index)=>{
        const list=points().filter(p=>p.topic===topic), done=list.length-counts(list).unreviewed;
        return `<li ${screen==='review'&&current()?.topic===topic?'aria-current="step"':''}><span class="topic-number">${String(index+1).padStart(2,'0')}</span><span>${escape(TOPICS[topic].label)}</span><span class="topic-count" aria-label="${done} of ${list.length} reviewed">${done}/${list.length}</span></li>`;
      }).join('')}</ol>`}
    </aside>
    <div class="reader-content">${content}</div>
  </div>`;
}
const policyMarks = {
  meta: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="8" width="32" height="32" rx="9" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="24" r="7" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="33.5" cy="14.5" r="2" fill="currentColor"/></svg>`,
  'tiktok-us': `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="currentColor" d="M27 7h6c.5 5 3 7.8 8 8v6c-3.1 0-5.8-.9-8-2.5V30c0 7-4.4 11-10.5 11C16.7 41 13 37 13 32c0-6.1 4.6-10 11-9v6c-3-.8-5 .7-5 3 0 2.1 1.5 3.5 3.6 3.5 2.8 0 4.4-1.7 4.4-5.5V7z"/></svg>`,
  'youtube-google': `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="12" width="38" height="25" rx="7" fill="#e52d27"/><path d="M21 18l11 6.5L21 31z" fill="white"/></svg>`
};
function modeChoice(kind){return `<div class="home-mode-choice" id="reading-choice"><h3 tabindex="-1">How would you like to read it?</h3><div class="home-mode-options"><button data-action="${kind==='featured'?'choose-reading':'choose-own-mode'}" data-mode="user"><strong>User view</strong><small>Quick overview</small></button><button data-action="${kind==='featured'?'choose-reading':'choose-own-mode'}" data-mode="lawyer"><strong>Lawyer mode</strong><small>Detailed overview</small></button></div></div>`;}
function pasteView(){return `<section class="entry-home"><h1>Privacy policies,<br><em>plainer.</em></h1>${state?`<div class="entry-resume"><span><strong>Your current review</strong><small>${escape(state.title)} · ${reviewed().length} of ${points().length} reviewed</small></span><button data-action="resume">Resume <span aria-hidden="true">↗</span></button></div>`:''}<div class="entry-section-title"><h2>Review a policy</h2></div><div class="policy-logos">${featuredPolicies.map(item=>`<button class="policy-logo ${selectedFeatured===item.id?'selected':''}" data-action="featured" aria-pressed="${selectedFeatured===item.id}" data-id="${item.id}" ${busy?'disabled':''} aria-label="Select ${escape(item.name)} privacy policy"><span class="policy-logo-mark ${item.id}">${policyMarks[item.id]}</span><span>${escape(item.id==='meta'?'Instagram':item.id==='youtube-google'?'YouTube':item.name)}</span></button>`).join('')}</div>${selectedFeatured?modeChoice('featured'):''}${busy?`<p class="entry-status" role="status">${escape(busy)}</p>`:''}${importError?`<p class="entry-error" role="alert">${escape(importError)}</p>`:''}<div class="own-disclosure ${ownOpen?'open':''}"><button class="own-toggle" data-action="own" aria-expanded="${ownOpen}" aria-controls="own-panel">Review my own policy <span aria-hidden="true">⌄</span></button><div id="own-panel" class="own-panel" ${ownOpen?'':'inert'}><div>${ownModeSelected?importView(true):modeChoice('own')}</div></div></div></section>`;}
function importView(inline=false){
  const tabs=[['upload','Upload'],['paste','Paste'],['url','URL']];
  const modeBody=inputMode==='upload'
    ? `<div id="drop-zone" class="drop-zone"><div class="drop-symbol" aria-hidden="true">↑</div><strong>Drop your file here</strong><span>PDF, DOCX, TXT, RTF</span><button type="button" class="choose-button" data-action="choose-file">Choose a file</button><input id="policy-file" hidden type="file" accept=".pdf,.docx,.txt,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf"></div>${selectedFile?`<div class="selected-file"><span class="selected-icon" aria-hidden="true">▤</span><span><strong>${escape(selectedFile.name)}</strong><small>${(selectedFile.size/1024).toFixed(0)} KB · ready to upload</small></span><button type="button" data-action="remove-file" aria-label="Remove selected file">×</button></div>`:''}<button class="primary entry-continue" data-action="import-file" ${!selectedFile||busy?'disabled':''}>Continue <span>→</span></button>`
    : inputMode==='paste'
    ? `<form id="policy-form"><label for="policy-title">Policy name <span>(optional)</span></label><input id="policy-title" name="title" type="text" maxlength="160" placeholder="e.g. A service you're considering" value="${escape(draft.title)}"><label for="policy-text">Policy text</label><textarea id="policy-text" name="policy" required maxlength="${MAX}" placeholder="Paste the privacy policy here…" aria-describedby="policy-help">${escape(draft.text)}</textarea><div class="entry-field-note" id="policy-help"><span id="char-count">${draft.text.length.toLocaleString()} / 80,000</span></div><button class="primary entry-continue" type="submit" ${busy?'disabled':''}>Continue <span>→</span></button></form>`
    : `<form id="url-form"><label for="policy-url">Privacy policy link</label><input id="policy-url" type="url" required placeholder="https://example.com/privacy" value="${escape(draft.url)}"><button class="primary entry-continue" type="submit" ${busy?'disabled':''}>Continue <span>→</span></button></form>`;
  return `<section class="${inline?'inline-import':'entry-import'}">${inline?`<div class="inline-mode-summary"><span>${readingMode==='user'?'Quick overview':'Detailed review'}</span><button class="text-button" data-action="change-own-mode">Change</button></div>`:'<button class="entry-back" data-action="home">← &nbsp; Back to policies</button><h1>Add a privacy policy.</h1>'}<div class="import-tabs" role="tablist" aria-label="Ways to add a policy">${tabs.map(([id,label])=>`<button type="button" role="tab" id="tab-${id}" aria-controls="import-panel" aria-selected="${inputMode===id}" tabindex="${inputMode===id?0:-1}" data-action="input-mode" data-id="${id}">${label}</button>`).join('')}</div><div id="import-panel" role="tabpanel" aria-labelledby="tab-${inputMode}">${modeBody}</div>${busy?`<p class="entry-status" role="status">${escape(busy)}</p>`:''}${importError?`<p class="entry-error" role="alert">${escape(importError)}</p>`:''}</section>`;
}
function warningText(warning){const message=typeof warning==='string'?warning:warning.message||'Extraction warning';return message.startsWith('No semantic main/article region found')?'This page may include navigation text. Check the extracted wording before continuing.':message;}
function previewView(){
  if(!pending)return pasteView();
  const excerpt=pending.text;
  return `<section class="entry-preview"><button class="entry-back" data-action="home">← &nbsp; Choose another policy</button><h1>Is this the policy you meant?</h1><div class="entry-document"><div><strong>${escape(pending.title)}</strong><small>${pending.text.length.toLocaleString()} characters · ${escape(pending.source?.kind||'policy')}</small></div>${pending.source?.finalUrl?`<a href="${escape(pending.source.finalUrl)}" target="_blank" rel="noopener noreferrer">Original page ↗</a>`:''}</div>${pending.warnings?.length?`<div class="warning-list"><strong>Check these details</strong>${pending.warnings.map(w=>`<p>${escape(warningText(w))}</p>`).join('')}</div>`:''}<details class="entry-source"><summary>See the extracted text <span aria-hidden="true">↘</span></summary><pre>${escape(excerpt)}</pre></details>${!pending.source?.catalogId&&ownModeSelected&&!previewModeOpen?`<div class="mode-summary">${readingMode==='user'?'Quick overview':'Detailed review'} <button class="text-button" data-action="preview-mode">Change</button></div>`:`<fieldset class="reading-modes"><legend>How would you like to read it?</legend><label><input type="radio" name="reading-mode" value="user" ${readingMode==='user'?'checked':''} ${busy?'disabled':''}><span><strong>User view</strong><small>Quick overview</small></span></label><label><input type="radio" name="reading-mode" value="lawyer" ${readingMode==='lawyer'?'checked':''} ${busy?'disabled':''}><span><strong>Lawyer mode</strong><small>Detailed overview</small></span></label></fieldset>`}${!pending.source?.catalogId?'<p class="page-meta">Your policy text is sent to OpenAI to prepare claims. Your reactions stay in this browser.</p>':''}<button class="primary entry-continue" data-action="build" ${busy?'disabled':''}>${busy?'Preparing claims…':'Continue to claims'} <span>→</span></button>${busy?'<p class="entry-status" role="status">The model is linking claims to exact source wording. Longer policies can take a minute.</p>':''}${importError?`<p class="entry-error" role="alert">${escape(importError)}</p><button class="secondary" data-action="source-fallback">Continue with exact passages</button>`:''}</section>`;
}
function overviewView(){return `<section class="simple-page"><button class="text-button" data-action="home">← All policies</button><h1>${escape(state.title)}</h1><button class="primary primary-wide" data-action="start">Continue review →</button><details class="details"><summary>Topic order (optional)</summary><div class="pref-list">${analysis.topics.map(t=>`<button class="pref" data-action="preference" data-id="${t}" aria-pressed="${state.preferences.includes(t)}">${TOPICS[t].label}</button>`).join('')}</div></details><button class="text-button" data-action="change-mode">Change depth</button><button class="text-button" data-action="full-source">Full policy</button></section>`;}
function depthView(){
  return `<section class="simple-page"><button class="text-button" data-action="resume">← Back</button><h1>Reading depth</h1><p class="page-meta">Progress is saved separately for each depth.</p><div class="home-mode-options">${[['user','User view','Quick overview'],['lawyer','Lawyer mode','Detailed overview']].map(([mode,title,description])=>`<button data-action="switch-depth" data-mode="${mode}" aria-pressed="${reviewDepth(state)===mode}" ${busy?'disabled':''}><strong>${title}</strong><small>${description}</small></button>`).join('')}</div>${busy?`<p role="status">${escape(busy)}</p>`:''}${importError?`<p role="alert" class="entry-error">${escape(importError)}</p>`:''}</section>`;
}
function resumeDepth(){
  analysis=state.analysis;
  cursor=Math.max(0,Math.min(state.cursor||0,sequence().length-1));
  checkpointTopic=state.checkpointTopic||current()?.topic;
  setScreen(['report','overview','checkpoint'].includes(state.screen)?state.screen:'review');
}
async function changeDepth(mode){
  if(busy||!['user','lawyer'].includes(mode))return;
  if(mode===reviewDepth(state)){resumeDepth();return;}
  const review=state, token=++flowToken;
  busy='Preparing this depth…';importError='';render();
  try{
    let nextAnalysis=null;
    if(!state.depths?.[mode]){
      const id=review.source?.catalogId;
      const saved=id&&featuredPolicies.some(item=>item.id===id)?await savedFeatured(id):null;
      if(state!==review||token!==flowToken)return;
      const raw=saved&&saved.imported.text===review.text?saved.analyses[mode]:(await apiPost('/api/decompose',{title:review.title,text:review.text,source:review.source,mode})).analysis;
      nextAnalysis=preparedAnalysis(raw,review.text);
    }
    if(state!==review||token!==flowToken)return;
    state=switchReviewDepth(review,mode,nextAnalysis);
    lastDecision=null;rewordError='';busy='';resumeDepth();
  }catch(error){if(state===review&&token===flowToken){busy='';importError=error.message;render();}}
}
function startQueue(kind){
  const matches={unsure:r=>r==='clarify',attention:r=>['concern','clarify'].includes(r),unfinished:r=>!['comfortable','clarify','concern'].includes(r),skipped:r=>r==='skipped'};
  const ids=ordered().filter(p=>matches[kind](response(p.id).reaction)).map(p=>p.id);
  state.queue=ids.length?{kind,ids}:null;cursor=0;lastDecision=null;
  setScreen(ids.length?'review':'report');
}
function reviewView(){
  const p=current();if(!p)return reportView();const r=response(p.id);
  const priority=state.preferences.includes(p.topic)||p.priority==='high';
  const display=r.rewording|| (p.model?p.title:p.text.trim());
  const selected=pendingReaction||r.reaction;
  return readerFrame(`<section class="card-flow">
    <div class="card-flow-top"><span>${state.queue?queueLabels[state.queue.kind]:'Claim'} ${cursor+1} of ${sequence().length}</span><button class="text-button" data-action="report">Back to report</button></div>
    <article class="claim-card ${priority?'is-priority':''} ${analysis.readingMode==='user'?'is-overview':''} ${r.rewording?'is-reworded':''}">
      <div class="claim-card-label"><span>${escape(TOPICS[p.topic].label)}</span>${priority?'<span class="ambient-label">Highlighted</span>':''}</div>
      <h1 tabindex="-1">${escape(display)}</h1>
      <div class="claim-card-meta">
        <span class="claim-kind">${r.rewording?'AI rewording · check source':!p.model?'Exact source passage':analysis.readingMode==='user'?'AI overview · check source':'AI claim · check source'}</span>
        <button class="text-button" data-action="source" data-id="${p.id}">Check source ↗</button>
        <button class="text-button" data-action="reword" ${rewordBusy===p.id||!p.model?'disabled':''}>${rewordBusy===p.id?'Rewording…':'Reword claim ↻'}</button>
      </div>
      <p class="reaction-label">Your response</p>
      <div class="claim-card-actions">
        <button class="card-action accept" data-action="react" data-id="comfortable" aria-pressed="${selected==='comfortable'}" aria-label="Accept this claim for my personal review">Accept</button>
        <button class="card-action reject" data-action="react" data-id="concern" aria-pressed="${selected==='concern'}" aria-label="Reject this claim in my review">Reject</button>
        <button class="card-action unsure" data-action="react" data-id="clarify" aria-pressed="${selected==='clarify'}">I’m unsure</button>
        <button class="card-action skip" data-action="skip" aria-pressed="${selected==='skipped'}">Skip</button>
      </div>
      ${rewordError?`<p class="card-error" role="alert">${escape(rewordError)}</p>`:''}
    </article>
    <div class="actions card-confirm"><span class="page-meta" aria-live="polite" id="selection-status">${selected?`${reactions[selected]} selected`:'Select a response'}</span><button class="primary" data-action="confirm" ${selected?'':'disabled'}>${cursor===sequence().length-1?(state.queue?'Finish round':'Finish review'):'Next →'}</button></div>
    <div class="card-flow-bottom"><button class="text-button" data-action="previous" ${cursor===0?'disabled':''}>← Previous claim</button>${lastDecision?.review===state?'<button class="text-button" data-action="undo">Undo last response</button>':''}<button class="text-button" data-action="overview">Review settings</button></div>
    ${analysis.readingMode==='user'?'<p class="page-meta coverage-note">Quick overview · selected themes, not the full policy.</p>':''}
  </section>`);
}
function checkpointView(){const list=points().filter(p=>p.topic===checkpointTopic);const c=counts(list);return `<section class="checkpoint"><div class="panel"><div class="check-emblem">✓</div><h1 tabindex="-1">${TOPICS[checkpointTopic].label}<br>checkpoint.</h1><div class="stats"><div class="stat"><strong>${list.length-c.unreviewed}/${list.length}</strong><span>reviewed</span></div><div class="stat"><strong>${c.clarify}</strong><span>unsure</span></div><div class="stat"><strong>${c.concern}</strong><span>rejected</span></div><div class="stat"><strong>${c.unreviewed}</strong><span>still to review</span></div></div><div class="actions" style="margin-top:25px"><button class="primary" data-action="continue">${cursor>=ordered().length-1?'See my report':'Continue to next section'} →</button><button class="text-button" data-action="report">Finish with report</button></div><button class="text-button" style="margin-top:18px" data-action="topic" data-id="${checkpointTopic}">Revisit this section</button></div></section>`;}
function reportItem(p){
  const r=response(p.id);
  return `<article class="report-item"><div class="report-item-header"><div><h3>${escape(r.rewording||(p.model?p.title:p.text.trim()))}</h3>${r.rewording?'<span class="tag">AI rewording</span>':''}${r.reaction==='concern'&&r.dealbreaker?'<span class="tag dealbreaker">Potential dealbreaker</span>':''}${r.reaction==='clarify'?'<span class="tag">Unsure</span>':''}${r.reaction==='skipped'?'<span class="tag">Skipped for now</span>':''}</div><button class="text-button" data-action="point" data-id="${p.id}">Revisit ↗</button></div>${r.question?`<p class="note"><strong>${r.reaction==='clarify'?'Saved question:':'Earlier question:'}</strong> ${escape(r.question)}</p>`:''}${r.note?`<p class="note"><strong>Your note:</strong> ${escape(r.note)}</p>`:''}<details class="details"><summary>Exact source wording</summary><p class="excerpt">${escape(p.text.trim())}</p>${p.contextQuote?`<p class="excerpt"><strong>Context:</strong> ${escape(p.contextQuote.trim())}</p>`:''}<button class="text-button" data-action="source" data-id="${p.id}">View in full policy</button></details></article>`;
}
function reportView(){
  const c=counts(points());
  const sections=[['Needs attention',p=>['concern','clarify'].includes(response(p.id).reaction)],['Left to review',p=>!['comfortable','clarify','concern'].includes(response(p.id).reaction)],['Accepted',p=>response(p.id).reaction==='comfortable']];
  return readerFrame(`<section class="report-page"><p class="page-label">${escape(state.title)}</p><h1>Your report</h1>${analysis.readingMode==='user'?'<p class="page-meta">Quick overview covers selected themes only.</p>':''}<div class="actions report-actions">${c.unreviewed?'<button class="primary" data-action="review-unfinished">Continue review</button>':''}${c.clarify?`<button class="${c.unreviewed?'secondary':'primary'}" data-action="review-unsure">Revisit cards</button>`:''}${c.concern+c.clarify?'<button class="secondary" data-action="review-attention">Review my concerns</button>':''}${points().some(p=>response(p.id).reaction==='skipped')?'<button class="text-button" data-action="review-skipped">Finish skipped cards</button>':''}${lastDecision?.review===state?'<button class="text-button" data-action="undo">Undo last response</button>':''}</div>${sections.map(([label,match],i)=>{const list=points().filter(match);return `<section class="report-section"><details class="details" ${i===0&&list.length?'open':''}><summary>${label} · ${list.length}</summary>${list.length?list.map(reportItem).join(''):'<p>None yet.</p>'}</details></section>`;}).join('')}<details class="details"><summary>Your note</summary><label class="sr-only" for="reflection">Your note</label><textarea id="reflection" data-field="reflection">${escape(state.reflection||'')}</textarea></details><div class="actions report-tools"><button class="secondary" data-action="download">Download</button><button class="text-button" data-action="print">Print</button><button class="text-button" data-action="change-mode">Change depth</button><button class="text-button" data-action="full-source">Full policy</button></div><details class="details"><summary>Source and limits</summary><p>${state.source?.fetchedAt?`Source fetched ${escape(new Date(state.source.fetchedAt).toLocaleDateString())}. `:''}Personal reactions, not acceptance of the policy. AI wording is unverified.${analysis.readingMode==='user'?` ${analysis.unclaimedUnitIds.length} source units are outside this overview.`:''} The download includes the full original policy.</p></details></section>`);
}
async function apiPost(route, payload){
  const response=await fetch(route,{signal:AbortSignal.timeout(300_000),method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  let body;try{body=await response.json();}catch{throw new Error('The local preparation service did not return a readable response.');}
  if(!response.ok)throw new Error(body.error||`Request failed (HTTP ${response.status}).`);return body;
}
async function savedFeatured(id){
  if(!featuredPolicies.some(item=>item.id===id))throw new Error('This featured policy is not available.');
  const response=await fetch(`data/featured/${id}.json`,{signal:AbortSignal.timeout(15_000)});
  if(!response.ok)throw new Error('The saved policy could not be opened. Try again later.');
  const saved=await response.json();
  if(saved.version!==1||saved.id!==id||saved.imported?.source?.catalogId!==id||!saved.imported?.text||!saved.analyses?.user||!saved.analyses?.lawyer||saved.analyses.user.document?.text!==saved.imported.text||saved.analyses.lawyer.document?.text!==saved.imported.text)throw new Error('The saved policy is incomplete.');
  return saved;
}
async function openFeatured(id,mode='user'){
  const token=++flowToken;busy='Opening saved policy…';importError='';render();
  try{
    const saved=await savedFeatured(id);if(token!==flowToken)return;
    if(state?.source?.catalogId===id&&state.text===saved.imported.text){
      const existingDepth=state.depths?.[mode]||reviewDepth(state)===mode;
      state=switchReviewDepth(state,mode,existingDepth?null:preparedAnalysis(saved.analyses[mode],state.text));
      lastDecision=null;rewordError='';busy='';resumeDepth();return;
    }
    pending=saved.imported;readingMode=mode;busy='';replaceWithPrepared(preparedAnalysis(saved.analyses[mode],pending.text));
  }
  catch(error){if(token!==flowToken)return;busy='';importError=error.message;render();}
}
async function importPolicy(input){
  const token=++flowToken;importError='';busy='Reading the privacy policy…';render();
  try{const result=await apiPost('/api/import',input);if(token!==flowToken)return;if(result.text.length>MAX)throw new Error('This policy is over the 80,000-character limit.');pending=result;busy='';setScreen('preview');}
  catch(error){if(token!==flowToken)return;busy='';importError=error.message;render();}
}
function replaceWithPrepared(nextAnalysis,confirmed=false){
  if(state&&!confirmed){openModal(`<div class="modal-top"><h2 id="modal-title">Replace your current review?</h2><button class="secondary" data-close>Keep it</button></div><p class="help-copy">The current policy and reactions will be replaced in this browser. Download its report first if you want a copy.</p><button class="primary" id="confirm-replace">Start new review</button>`);document.querySelector('#confirm-replace').onclick=()=>{closeModal();replaceWithPrepared(nextAnalysis,true);};return;}
  state={version:2,text:pending.text,title:pending.title,source:pending.source,warnings:pending.warnings||[],createdAt:new Date().toISOString(),preferences:[],responses:{},reflection:'',analysis:nextAnalysis};
  analysis=nextAnalysis;cursor=0;pending=null;importError='';recoveryError='';lastDecision=null;setScreen('review');
}
async function buildReview(){
  if(!pending||busy)return;const token=++flowToken;busy='Preparing source-linked claims…';importError='';render();
  try{const id=pending.source?.catalogId;const saved=id&&featuredPolicies.some(item=>item.id===id)?await savedFeatured(id):null;const raw=saved&&saved.imported.text===pending.text?saved.analyses[readingMode]:(await apiPost('/api/decompose',{title:pending.title,text:pending.text,source:pending.source,mode:readingMode})).analysis;if(token!==flowToken)return;busy='';replaceWithPrepared(preparedAnalysis(raw,pending.text));}
  catch(error){if(token!==flowToken)return;busy='';importError=error.message;render();}
}
async function rewordCurrent(){
  const p=current();if(!p||rewordBusy)return;
  const token=flowToken, review=state, pointId=p.id;
  rewordBusy=pointId;rewordError='';render();
  try{const result=await apiPost('/api/reword',{claim:p.title,sourceQuote:p.text,contextQuote:p.contextQuote||'',previousWording:response(p.id).rewording||p.title});if(state!==review||token!==flowToken)return;state.responses[pointId]={...response(pointId),rewording:result.reworded};save();}
  catch(error){if(state===review&&token===flowToken&&current()?.id===pointId)rewordError=error.message;}
  finally{rewordBusy='';if(state===review&&current()?.id===pointId)render();}
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
function render(){root.innerHTML=frame(screen==='paste'?pasteView():screen==='import'?importView():screen==='preview'?previewView():screen==='depth'?depthView():screen==='overview'?overviewView():screen==='review'?reviewView():screen==='checkpoint'?checkpointView():reportView());}
function next(){if(cursor>=sequence().length-1)setScreen('report');else{cursor++;setScreen('review');}}
function selectReaction(reaction){
  pendingReaction=reaction;
  for(const button of root.querySelectorAll('[data-action="react"], [data-action="skip"]'))button.setAttribute('aria-pressed',String((button.dataset.id||'skipped')===reaction));
  const confirm=root.querySelector('[data-action="confirm"]');if(confirm)confirm.disabled=false;
  const status=root.querySelector('#selection-status');if(status)status.textContent=`${reactions[reaction]} selected`;
}
function confirmReaction(){
  const p=current();const reaction=pendingReaction||response(p.id).reaction;if(!reaction)return;
  lastDecision={review:state,id:p.id,cursor,queue:state.queue,previousReaction:response(p.id).reaction,previousDealbreaker:response(p.id).dealbreaker};
  state.responses[p.id]={...response(p.id),reaction,dealbreaker:reaction==='concern'&&response(p.id).dealbreaker===true};
  rewordError='';next();
}
function undoDecision(){
  if(lastDecision?.review!==state)return;
  const {id,queue,previousReaction,previousDealbreaker}=lastDecision;
  const restored={...response(id)};
  if(previousReaction)restored.reaction=previousReaction;else delete restored.reaction;
  restored.dealbreaker=previousDealbreaker===true;
  state.responses[id]=restored;state.queue=queue||null;cursor=sequence().findIndex(p=>p.id===id);lastDecision=null;setScreen('review');
}
function goPoint(id){state.queue=null;cursor=ordered().findIndex(p=>p.id===id);if(cursor<0)cursor=0;setScreen('review');}
function openModal(html){modalReturn=document.activeElement;const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">${html}</section>`;document.body.append(wrap);root.inert=true;document.body.style.overflow='hidden';wrap.querySelector('button')?.focus();wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('[data-close]'))closeModal();});wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeModal();}if(e.key==='Tab'){const els=[...wrap.querySelectorAll('button,a,input,textarea,[tabindex="0"]')];const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});}
function closeModal(){document.querySelector('.modal-backdrop')?.remove();root.inert=false;document.body.style.overflow='';modalReturn?.focus();}
function showSource(id){const p=points().find(x=>x.id===id);openModal(`<div class="modal-top"><div><p class="eyebrow">Original document</p><h2 id="modal-title">${escape(state.title)}</h2></div><button class="secondary" data-close>Close</button></div><p class="muted" style="font-size:12px">The highlighted passage is this claim’s exact position in the extracted policy text.</p><div class="source-full">${escape(state.text.slice(0,p.start))}<mark id="source-highlight">${escape(state.text.slice(p.start,p.end))}</mark>${escape(state.text.slice(p.end))}</div>`);document.querySelector('#source-highlight').scrollIntoView({block:'center'});}
function showFullSource(){openModal(`<div class="modal-top"><div><p class="eyebrow">Original document</p><h2 id="modal-title">${escape(state.title)}</h2></div><button class="secondary" data-close>Close</button></div><div class="source-full">${escape(state.text)}</div>`);}
function reportText(){
  const c=counts(points());
  return ['PLAINER · PERSONAL PRIVACY POLICY REVIEW',state.title,`Document added: ${state.createdAt}`,`Report exported: ${new Date().toISOString()}`,`Cards reviewed: ${reviewed().length}/${points().length}${analysis.readingMode==='user'?'; selective overview, not complete policy coverage':''}`,`${c.concern} rejected | ${c.clarify} unsure | ${c.comfortable} accepted | ${c.unreviewed} still to review`,`Analysis: ${analysis.readingMode==='user'?`User overview; ${analysis.unclaimedUnitIds.length} source units not summarized`:analysis.mode==='model-assisted'?`${analysis.modelCount} AI draft claims; ${points().length-analysis.modelCount} exact passages; status ${analysis.status||'unknown'}`:'Exact source passages only'}`,`Source: ${state.source?.finalUrl||state.source?.kind||'paste'}`,`Source fetched: ${state.source?.fetchedAt||'Not recorded'}`,`Scope: ${state.source?.scope||'Not recorded'}`,`\nThis report records personal reactions, not legal advice or acceptance. Check AI claims against the original wording. Topic suggestions are navigation aids, not risk ratings.`,`\nNOTE TO MY FUTURE SELF\n${state.reflection||'(None)'}`,...ordered().map(p=>{const r=response(p.id);return `\n[${p.id}] ${p.title}\nReaction: ${reactions[r.reaction]||'Not reviewed'}${r.reaction==='concern'&&r.dealbreaker?' · POTENTIAL DEALBREAKER':''}\n${r.question?`Question: ${r.question}\n`:''}${r.note?`Note: ${r.note}\n`:''}Exact source characters ${p.start}–${p.end}:\n${p.text.trim()}${r.rewording?`\nOriginal claim: ${p.title}\nRewording shown: ${r.rewording}`:''}${p.contextQuote?`\nCited context:\n${p.contextQuote.trim()}`:''}`;}),`\nORIGINAL POLICY (COMPLETE)\n${state.text}`].join('\n');
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
  if(action==='own'){ownOpen=!ownOpen;selectedFeatured=null;importError='';render();root.querySelector('[data-action="own"]')?.focus({preventScroll:true});}
  if(action==='featured'){selectedFeatured=id;ownOpen=false;render();root.querySelector('#reading-choice')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});root.querySelector('#reading-choice h3')?.focus({preventScroll:true});}
  if(action==='choose-reading')openFeatured(selectedFeatured,button.dataset.mode);
  if(action==='choose-own-mode'){readingMode=button.dataset.mode;ownModeSelected=true;previewModeOpen=false;render();root.querySelector('#import-panel')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});}
  if(action==='change-own-mode'){ownModeSelected=false;render();root.querySelector('#reading-choice h3')?.focus({preventScroll:true});}
  if(action==='preview-mode'){previewModeOpen=true;render();}
  if(action==='input-mode'){flowToken++;inputMode=id;busy='';importError='';render();root.querySelector(`#tab-${id}`)?.focus();}
  if(action==='choose-file')root.querySelector('#policy-file')?.click();
  if(action==='remove-file'){selectedFile=null;render();root.querySelector('[data-action="choose-file"]')?.focus();}
  if(action==='import-file'){importFile(selectedFile).catch(error=>{importError=error.message;render();});}
  if(action==='build')buildReview();
  if(action==='source-fallback')exactPassageFallback();
  if(action==='about')openModal(`<div class="modal-top"><h2 id="modal-title">How this review works</h2><button class="secondary" data-close>Close</button></div><div class="help-copy"><p>Choose a privacy policy and reading depth, check the text we extracted, then review one source-linked claim at a time. Accept, reject, mark unsure, skip, or request a rewording. Your report keeps your reactions and unfinished material together.</p><p><strong>Analysis:</strong> policy text is sent to the server and OpenAI to propose claims. Those paraphrases are not legally verified; check the exact source before relying on them. If analysis fails, you can continue with exact source passages.</p><p><strong>Your review:</strong> reactions and notes are saved in this browser. They are not sent to the policy provider. Anyone using this browser profile may be able to reopen them; “Clear review” removes them here.</p></div>`);
  if(action==='reset'){openModal(`<div class="modal-top"><h2 id="modal-title">Clear this review?</h2><button class="secondary" data-close>Keep review</button></div><p class="help-copy">This removes the saved policy, reactions, questions, and notes from this browser. Download your report first if you’d like to keep a copy.</p><button class="primary" id="confirm-clear">Clear review</button>`);document.querySelector('#confirm-clear').onclick=()=>{try{localStorage.removeItem(KEY);}catch{toast('Could not remove browser storage. Clear site data in your browser settings.');return;}flowToken++;closeModal();state=null;analysis=null;pending=null;draft={title:'',text:'',url:''};screen='paste';render();};}
  if(action==='resume'){flowToken++;busy='';importError='';resumeDepth();}
  if(action==='overview')setScreen('overview');
  if(action==='edit'){flowToken++;draft={...draft,text:state.text,title:state.title};inputMode='paste';screen='import';render();focusEntry();}
  if(action==='preference'){const currentId=current()?.id;state.preferences=state.preferences.includes(id)?state.preferences.filter(t=>t!==id):[...state.preferences,id];cursor=Math.max(0,sequence().findIndex(p=>p.id===currentId));save();render();}
  if(action==='start')setScreen('review');
  if(action==='review-unfinished')startQueue('unfinished');
  if(action==='review-attention')startQueue('attention');
  if(action==='review-skipped')startQueue('skipped');
  if(action==='review-unsure')startQueue('unsure');
  if(action==='topic'){goPoint(ordered().find(p=>p.topic===id).id);}
  if(action==='point')goPoint(id);
  if(action==='source')showSource(id);
  if(action==='reword')rewordCurrent();
  if(action==='full-source')showFullSource();
  if(action==='change-mode'){flowToken++;busy='';importError='';setScreen('depth');}
  if(action==='switch-depth')changeDepth(button.dataset.mode);
  if(action==='react'){selectReaction(id);if(e.detail===2)confirmReaction();}
  if(action==='confirm'&&e.detail<2)confirmReaction();
  if(action==='undo')undoDecision();
  if(action==='next')next();
  if(action==='skip'){selectReaction('skipped');if(e.detail===2)confirmReaction();}
  if(action==='previous'){rewordError='';cursor--;setScreen('review');}
  if(action==='continue'){if(cursor>=ordered().length-1)setScreen('report');else{cursor++;setScreen('review');}}
  if(action==='report')setScreen('report');
  if(action==='download'){const blob=new Blob([reportText()],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`${state.title.replace(/[^a-z0-9]+/gi,'-').slice(0,60)}-review.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Your full report has been downloaded.');}
  if(action==='print')window.print();
});
let printDisclosures = [];
window.addEventListener('beforeprint', () => {
  if (printDisclosures.length) return;
  printDisclosures = [...root.querySelectorAll('.report-section details')].map(element => ({element, open:element.open}));
  printDisclosures.forEach(({element}) => { element.open = true; });
});
window.addEventListener('afterprint', () => {
  printDisclosures.forEach(({element, open}) => { element.open = open; });
  printDisclosures = [];
});
render();
