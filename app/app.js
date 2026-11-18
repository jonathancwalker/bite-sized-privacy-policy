import { analyzePolicy, TOPICS } from './engine.js';
import { MAX_POLICY_CHARS, preparedAnalysis, restoreReview, reviewDepth, switchReviewDepth } from './review-state.js';

const root = document.querySelector('#app');
const KEY = 'bite-sized-review-v1';
const MAX = MAX_POLICY_CHARS;
const reactions = {comfortable:'Comfortable',clarify:'Unsure',concern:'Concerned',skipped:'Skipped'};
const reactionMarks = {comfortable:'✓',concern:'!',clarify:'?',skipped:'–',unseen:'·'};
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state = null, analysis = null, screen = 'paste', cursor = 0, checkpointTopic = '', storageError = false;
let draft = {title:'',text:'',url:''}, modalReturn = null;
let ownOpen = false;
let inputMode = 'upload', selectedFile = null, pending = null, busy = '', importError = '';
let readingMode = 'user', intakePreferences = [];
let rewordBusy = '', rewordError = '';
let renderedCardId = null, rewordEntrance = null, previousReadingMode = null;
let exportBusy = false, exportError = '';
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
const platformName = () => ({meta:'Instagram','tiktok-us':'TikTok','youtube-google':'YouTube'}[state?.source?.catalogId] || state?.title || 'Privacy policy');
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
function setScreen(next){
  const stayingInReview=screen==='review'&&next==='review';
  pendingReaction=null;screen=next;save();render();
  if(!stayingInReview)window.scrollTo(0,0);
  const heading=root.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
}
function toast(message){document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.role='status';el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),3000);}
function frame(content){
  const entry=['paste','import','preview'].includes(screen);
  return `<a class="skip-link" href="#main">Skip to content</a>
    <div class="shell ${entry?'entry-shell':''}">
      <header class="header">
        <button class="brand" data-action="home" aria-label="Plainer — all policies">plainer<span aria-hidden="true">.</span></button>
        <div class="header-right">${state&&['review','report'].includes(screen)?reviewMenu():''}</div>
      </header>
      <main id="main">
        ${storageError?'<p class="save-warning" role="status">Browser storage is unavailable. Your review works in this tab, but may not survive a refresh. Download your report before leaving.</p>':''}
        ${recoveryError?`<p class="save-warning" role="status">${escape(recoveryError)}</p>`:''}
        ${content}
      </main>
    </div>`;
}

function reviewMenu(){
  return `<details class="review-menu"><summary>Review menu <span aria-hidden="true">⋯</span></summary><div class="menu-panel">
    ${screen==='review'&&lastDecision?.review===state?'<button data-action="undo">Undo last response</button>':''}
    <button data-action="priorities">Priority areas</button><button data-action="change-mode">Reading depth</button><button data-action="full-source">Full policy</button><button data-action="download-full">Download full source record</button><button class="danger-action" data-action="reset">Clear review</button>
  </div></details>`;
}
function statusOf(p){return reactions[response(p.id).reaction]?response(p.id).reaction:'unseen';}
function reactionCounts(){return Object.fromEntries(['comfortable','concern','clarify','skipped','unseen'].map(status=>[status,points().filter(p=>statusOf(p)===status).length]));}
function reactionLegend(totals){
  return `<ul class="reaction-legend" aria-label="Your reactions">${Object.entries(totals).map(([status,count])=>`<li data-state="${status}"><span class="status-swatch" aria-hidden="true">${reactionMarks[status]}</span><span>${reactions[status]||'Not reviewed'}</span><strong>${count}</strong></li>`).join('')}</ul>`;
}
function reactionTrail(){
  const byId=new Map(points().map(p=>[p.id,p]));
  const recorded=[...new Set(state.responseOrder||[])].map(id=>byId.get(id)).filter(p=>p&&response(p.id).reaction);
  const shown=new Set(recorded.map(p=>p.id));
  const list=[...recorded,...ordered().filter(p=>!shown.has(p.id))];
  return `<div class="reaction-trail" style="--trail-columns:${Math.min(32,list.length)||1}" role="img" aria-label="Your responses: ${Object.entries(reactionCounts()).map(([status,n])=>n+' '+(reactions[status]||'not reviewed').toLowerCase()).join(', ')}">${list.map(p=>`<span data-trail-id="${p.id}" data-state="${statusOf(p)}" title="${escape((reactions[response(p.id).reaction]||'Not reviewed')+': '+(p.model?p.title:p.text.trim()))}"></span>`).join('')}</div>`;
}
function readerFrame(content){
  const totals=reactionCounts();
  return `<div class="reader-layout">
    <aside class="review-sidebar" aria-label="Review progress"><div class="progress-card">
      <div class="progress-heading"><h2>${escape(platformName())} review</h2></div>
      <p class="progress-label"><strong>${reviewed().length} of ${points().length}</strong> reviewed</p>
      ${reactionTrail()}${reactionLegend(totals)}
      <button class="secondary report-return" data-action="report">Back to report</button>
    </div><button class="help-button" data-action="help"><span aria-hidden="true">?</span>How to use</button></aside>
    <div class="reader-content">${content}</div>
  </div>`;
}
function claimMap(){
  let index=0;
  return `<section class="claim-map-panel" aria-label="Reactions by topic"><div class="map-heading"><h2>Reactions by topic</h2></div>
    <div class="claim-map" role="group" aria-label="Claims grouped by topic">${groups().map(topic=>{
      const list=ordered().filter(p=>p.topic===topic);
      return `<section class="map-category"><h3>${escape(TOPICS[topic].label)}</h3><div class="claim-tiles">${list.map(p=>{
        const status=statusOf(p), label=reactions[status]||'Not reviewed', text=response(p.id).rewording||(p.model?p.title:p.text.trim());
        return `<button class="claim-tile" data-action="point" data-id="${p.id}" data-map-id="${p.id}" data-state="${status}" aria-label="Claim ${++index}: ${label}. ${escape(text)}" title="${escape(label+': '+text)}"><span aria-hidden="true">${reactionMarks[status]}</span></button>`;
      }).join('')}</div></section>`;
    }).join('')}</div>
  </section>`;
}
const policyMarks = {
  meta: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="8" width="32" height="32" rx="9" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="24" r="7" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="33.5" cy="14.5" r="2" fill="currentColor"/></svg>`,
  'tiktok-us': `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="currentColor" d="M27 7h6c.5 5 3 7.8 8 8v6c-3.1 0-5.8-.9-8-2.5V30c0 7-4.4 11-10.5 11C16.7 41 13 37 13 32c0-6.1 4.6-10 11-9v6c-3-.8-5 .7-5 3 0 2.1 1.5 3.5 3.6 3.5 2.8 0 4.4-1.7 4.4-5.5V7z"/></svg>`,
  'youtube-google': `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="12" width="38" height="25" rx="7" fill="#e52d27"/><path d="M21 18l11 6.5L21 31z" fill="white"/></svg>`
};
function modeChoice(action='reading-depth',mode=readingMode){
  return `<div class="depth-choice"><div class="depth-toggle" role="group" aria-label="Reading depth" data-mode="${mode}" ${previousReadingMode?`data-from="${previousReadingMode}"`:''}>${[['user','Quick overview'],['lawyer','Lawyer mode']].map(([value,label])=>`<button type="button" data-action="${action}" data-mode="${value}" aria-pressed="${mode===value}" ${busy?'disabled':''}>${label}</button>`).join('')}</div><p class="mode-context ${previousReadingMode?'mode-context-enter':''}" aria-live="polite">${mode==='user'?'The big picture in a handful of cards.':'More detail, no law degree needed.'}</p></div>`;
}
function intakeFocus(){
  return `<div class="priority-entry"><button class="secondary priority-button" data-action="priorities" ${busy?'disabled':''}><span aria-hidden="true">+</span>Priority areas${intakePreferences.length?`<span class="priority-count">${intakePreferences.length}</span>`:''}</button>${intakePreferences.length?`<p class="priority-selection">${intakePreferences.map(id=>escape(TOPICS[id].label)).join(' · ')}</p>`:''}</div>`;
}
function openPriorities(){
  const intake=['paste','import','preview'].includes(screen), review=state;
  let selected=[...(intake?intakePreferences:state.preferences)];
  const topics=Object.keys(TOPICS).filter(id=>id!=='other'||(!intake&&analysis.topics.includes(id)));
  const wrap=openModal(`<div class="modal-top"><h2 id="modal-title">Priority areas</h2><button class="secondary" data-close>Cancel</button></div><p class="priority-intro">Choose the topics you care about most. We'll bring them forward.</p><div class="priority-options">${topics.map(id=>`<button class="pref" data-priority="${id}" aria-pressed="${selected.includes(id)}">${escape(TOPICS[id].label)}</button>`).join('')}</div><button class="primary" id="apply-priorities">Done</button>`);
  for(const button of wrap.querySelectorAll('[data-priority]'))button.onclick=()=>{
    const id=button.dataset.priority;
    selected=selected.includes(id)?selected.filter(value=>value!==id):[...selected,id];
    button.setAttribute('aria-pressed',String(selected.includes(id)));
  };
  wrap.querySelector('#apply-priorities').onclick=()=>{
    if(intake)intakePreferences=selected;
    else if(state===review){const id=current()?.id;state.preferences=selected;cursor=Math.max(0,sequence().findIndex(p=>p.id===id));save();}
    closeModal();render();root.querySelector(intake?'[data-action="priorities"]':'.review-menu > summary')?.focus({preventScroll:true});
  };
}
function pasteView(){
  return `<div class="home-layout"><section class="entry-home">
    <h1>Privacy policies,<br><em>plainer.</em></h1>
    <div class="entry-setup"><div class="entry-section-title"><h2>Review a policy</h2>${modeChoice()}</div>${intakeFocus()}</div>
    <div class="policy-logos">${featuredPolicies.map(item=>`<button class="policy-logo" data-action="featured" data-id="${item.id}" ${busy?'disabled':''} aria-label="Open ${escape(item.name)} privacy policy"><span class="policy-logo-mark ${item.id}">${policyMarks[item.id]}</span><span>${escape(item.id==='meta'?'Instagram':item.id==='youtube-google'?'YouTube':item.name)}</span></button>`).join('')}</div>
    ${busy&&!ownOpen?`<p class="entry-status" role="status">${escape(busy)}</p>`:''}${importError&&!ownOpen?`<p class="entry-error" role="alert">${escape(importError)}</p>`:''}
    <div class="own-disclosure ${ownOpen?'open':''}"><button class="own-toggle" data-action="own" aria-expanded="${ownOpen}" aria-controls="own-panel">Review my own policy <span aria-hidden="true">${ownOpen?'−':'+'}</span></button><div id="own-panel" class="own-panel" ${ownOpen?'':'inert'}><div>${importView(true)}</div></div></div>
  </section>${state?`<button type="button" class="saved-review" data-action="resume" aria-labelledby="saved-review-title saved-review-action" aria-describedby="saved-review-count"><span class="saved-review-copy"><span class="saved-review-title" id="saved-review-title">${escape(platformName())} review</span><span class="saved-review-count" id="saved-review-count"><strong>${reviewed().length} / ${points().length}</strong> reviewed</span></span><span class="saved-review-action" id="saved-review-action">${state.screen==='report'?'Open report':'Continue review'} <span aria-hidden="true">↗</span></span></button>`:''}</div>`;
}
function importView(inline=false){
  const tabs=[['upload','Upload'],['paste','Paste'],['url','URL']];
  const modeBody=inputMode==='upload'
    ? `<div id="drop-zone" class="drop-zone"><div class="drop-symbol" aria-hidden="true">↑</div><strong>Drop your file here</strong><span>PDF, DOCX, TXT, RTF</span><button type="button" class="choose-button" data-action="choose-file">Choose a file</button><input id="policy-file" hidden type="file" accept=".pdf,.docx,.txt,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf"></div>${selectedFile?`<div class="selected-file"><span class="selected-icon" aria-hidden="true">▤</span><span><strong>${escape(selectedFile.name)}</strong><small>${(selectedFile.size/1024).toFixed(0)} KB · ready to upload</small></span><button type="button" data-action="remove-file" aria-label="Remove selected file">×</button></div>`:''}<button class="primary entry-continue" data-action="import-file" ${!selectedFile||busy?'disabled':''}>Continue <span>→</span></button>`
    : inputMode==='paste'
    ? `<form id="policy-form"><label for="policy-title">Policy name <span>(optional)</span></label><input id="policy-title" name="title" type="text" maxlength="160" placeholder="e.g. A service you're considering" value="${escape(draft.title)}"><label for="policy-text">Policy text</label><textarea id="policy-text" name="policy" required maxlength="${MAX}" placeholder="Paste the privacy policy here…" aria-describedby="policy-help">${escape(draft.text)}</textarea><div class="entry-field-note" id="policy-help"><span id="char-count">${draft.text.length.toLocaleString()} / 80,000</span></div><button class="primary entry-continue" type="submit" ${busy?'disabled':''}>Continue <span>→</span></button></form>`
    : `<form id="url-form"><label for="policy-url">Privacy policy link</label><input id="policy-url" type="url" required placeholder="https://example.com/privacy" value="${escape(draft.url)}"><button class="primary entry-continue" type="submit" ${busy?'disabled':''}>Continue <span>→</span></button></form>`;
  return `<section class="${inline?'inline-import':'entry-import'}">${inline?'':`<button class="entry-back" data-action="home">← Back to policies</button><h1>Add a privacy policy.</h1>${modeChoice()}`}<div class="import-tabs" role="tablist" aria-label="Ways to add a policy">${tabs.map(([id,label])=>`<button type="button" role="tab" id="tab-${id}" aria-controls="import-panel" aria-selected="${inputMode===id}" tabindex="${inputMode===id?0:-1}" data-action="input-mode" data-id="${id}">${label}</button>`).join('')}</div><div id="import-panel" role="tabpanel" aria-labelledby="tab-${inputMode}">${modeBody}</div>${busy?`<p class="entry-status" role="status">${escape(busy)}</p>`:''}${importError?`<p class="entry-error" role="alert">${escape(importError)}</p>`:''}</section>`;
}
function warningText(warning){const message=typeof warning==='string'?warning:warning.message||'Extraction warning';return message.startsWith('No semantic main/article region found')?'This page may include navigation text. Check the extracted wording before continuing.':message;}
function previewView(){
  if(!pending)return pasteView();
  return `<section class="entry-preview"><button class="secondary entry-back" data-action="home">← Choose another policy</button><div class="preview-panel"><h1>Is this the policy you meant?</h1>
    <div class="entry-document"><div><strong>${escape(pending.title)}</strong><small>${pending.text.length.toLocaleString()} characters · ${escape(pending.source?.kind||'policy')}</small></div>${pending.source?.finalUrl?`<a href="${escape(pending.source.finalUrl)}" target="_blank" rel="noopener noreferrer">Original page ↗</a>`:''}</div>
    ${pending.warnings?.length?`<div class="warning-list"><strong>Check these details</strong>${pending.warnings.map(w=>`<p>${escape(warningText(w))}</p>`).join('')}</div>`:''}
    <details class="entry-source"><summary>See the extracted text <span aria-hidden="true">↘</span></summary><pre>${escape(pending.text)}</pre></details>
    ${modeChoice()}
    ${!pending.source?.catalogId?'<p class="page-meta intake-privacy">Your policy text is sent to OpenAI to prepare claims. Your reactions stay in this browser.</p>':''}
    <button class="primary entry-continue" data-action="build" ${busy?'disabled':''}>${busy?'Preparing claims…':'Continue to claims'} <span>→</span></button>
    ${busy?'<p class="entry-status" role="status">Preparing claims and linking them to the source. Longer policies can take a minute.</p>':''}
    ${importError?`<p class="entry-error" role="alert">${escape(importError)}</p><button class="secondary" data-action="source-fallback">Continue with exact passages</button>`:''}
  </div></section>`;
}
function overviewView(){return `<section class="simple-page settings-panel"><button class="secondary" data-action="start">← Back to review</button><h1>Priority areas</h1><p>Highlight these topics and show them first. Every claim stays in your review.</p><div class="pref-list">${analysis.topics.map(t=>`<button class="pref" data-action="preference" data-id="${t}" aria-pressed="${state.preferences.includes(t)}">${TOPICS[t].label}</button>`).join('')}</div><div class="actions"><button class="secondary" data-action="change-mode">Reading depth</button><button class="secondary" data-action="full-source">Full policy</button></div></section>`;}
function depthView(){
  return `<section class="simple-page settings-panel"><button class="secondary" data-action="resume">← Back</button><h1>Reading depth</h1><p class="page-meta">Progress is saved separately for each depth.</p>${modeChoice('switch-depth',reviewDepth(state))}${busy?`<p role="status">${escape(busy)}</p>`:''}${importError?`<p role="alert" class="entry-error">${escape(importError)}</p>`:''}</section>`;
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
  const priority=state.preferences.includes(p.topic);
  const entering=renderedCardId!==p.id;renderedCardId=p.id;
  const display=r.rewording||(p.model?p.title:p.text.trim());
  const selected=pendingReaction||r.reaction;
  const justReworded=rewordEntrance===p.id;
  return readerFrame(`<section class="review-workspace" aria-label="Claim review">
    <article class="claim-card ${priority?'is-priority':''} ${priority&&entering?'focus-enter':''} ${r.rewording?'is-reworded':''}" aria-busy="${rewordBusy===p.id}">
      <div class="claim-card-label"><span>${escape(TOPICS[p.topic].label)}${priority?'<span class="focus-badge">Your priority</span>':''}</span><span class="sr-only">${state.queue?queueLabels[state.queue.kind]:'Claim'} ${cursor+1} of ${sequence().length}</span></div>
      <div class="claim-reading" role="region" aria-label="Claim wording" tabindex="0">
        <h1 tabindex="-1">${escape(display)}</h1>
        ${r.rewording?`<aside class="reword-note ${justReworded?'reword-enter':''}" role="status"><strong>Reworded for clarity</strong><p>AI wording may change or miss meaning. Compare it with the source.</p></aside>`:''}
        ${rewordError?`<p class="card-error" role="alert">${escape(rewordError)}</p>`:''}
      </div>
      <div class="claim-tools">
        <div class="claim-tool-buttons"><button class="feature-action" data-action="source" data-id="${p.id}"><span aria-hidden="true">≡</span>Check source</button><button class="feature-action reword-action" data-action="reword" ${rewordBusy===p.id||!p.model?'disabled':''}><span aria-hidden="true">↻</span>${rewordBusy===p.id?'Rewording…':'Reword claim'}</button></div>
      </div>
    </article>
    <div class="response-dock">
      <div class="response-heading"><h2>Your response</h2><span id="selection-status" class="sr-only" aria-live="polite">${selected?reactions[selected]+' selected':''}</span></div>
      <div class="claim-card-actions" role="group" aria-label="Your response">${[['comfortable','Comfortable'],['concern','Concerned'],['clarify','Unsure']].map(([id,label])=>`<button class="card-action" data-state="${id}" data-action="react" data-id="${id}" aria-pressed="${selected===id}"><span class="reaction-mark" aria-hidden="true">${reactionMarks[id]}</span>${label}</button>`).join('')}</div>
      <div class="decision-navigation"><button class="secondary" data-action="previous" ${cursor===0?'disabled':''} aria-label="Previous claim">← Back</button><button class="skip-action" data-action="skip" data-state="skipped" aria-pressed="${selected==='skipped'}">Skip for now</button><button class="primary" data-action="confirm" ${selected?'':'disabled'}>${cursor===sequence().length-1?(state.queue?'Finish round':'View report'):'Next →'}</button></div>
    </div>
  </section>`);
}
function checkpointView(){const list=points().filter(p=>p.topic===checkpointTopic);const c=counts(list);return `<section class="checkpoint"><div class="panel"><div class="check-emblem">✓</div><h1 tabindex="-1">${TOPICS[checkpointTopic].label}<br>checkpoint.</h1><div class="stats"><div class="stat"><strong>${list.length-c.unreviewed}/${list.length}</strong><span>reviewed</span></div><div class="stat"><strong>${c.clarify}</strong><span>unsure</span></div><div class="stat"><strong>${c.concern}</strong><span>concerned</span></div><div class="stat"><strong>${c.unreviewed}</strong><span>still to review</span></div></div><div class="actions" style="margin-top:25px"><button class="primary" data-action="continue">${cursor>=ordered().length-1?'See my report':'Continue to next section'} →</button><button class="text-button" data-action="report">Finish with report</button></div><button class="text-button" style="margin-top:18px" data-action="topic" data-id="${checkpointTopic}">Revisit this section</button></div></section>`;}
function reportItem(p){
  const r=response(p.id);
  return `<article class="report-item"><div class="report-item-header"><div><h3>${escape(r.rewording||(p.model?p.title:p.text.trim()))}</h3><span class="tag reaction-tag" data-state="${statusOf(p)}">${reactions[r.reaction]||'Not reviewed'}</span>${r.rewording?'<span class="tag">AI rewording</span>':''}${r.reaction==='concern'&&r.dealbreaker?'<span class="tag dealbreaker">Potential dealbreaker</span>':''}</div><button class="secondary" data-action="point" data-id="${p.id}">Revisit ↗</button></div>${r.question?`<p class="note"><strong>${r.reaction==='clarify'?'Saved question:':'Earlier question:'}</strong> ${escape(r.question)}</p>`:''}${r.note?`<p class="note"><strong>Your note:</strong> ${escape(r.note)}</p>`:''}<details class="details"><summary>Exact source wording</summary><p class="excerpt">${escape(p.text.trim())}</p>${p.contextQuote?`<p class="excerpt"><strong>Context:</strong> ${escape(p.contextQuote.trim())}</p>`:''}<button class="text-button" data-action="source" data-id="${p.id}">View in full policy</button></details></article>`;
}
function reportView(){
  const c=counts(points()), totals=reactionCounts();
  const attention=points().filter(p=>['concern','clarify'].includes(response(p.id).reaction));
  return `<section class="report-page">
    <header class="report-overview"><div class="report-title-row"><div><h1>${escape(platformName())} report</h1><p class="report-tally"><strong>${reviewed().length} of ${points().length}</strong> reviewed</p></div><div class="actions report-actions">
      ${c.unreviewed?'<button class="primary" data-action="review-unfinished">Continue review</button>':''}
      ${c.clarify?`<button class="${c.unreviewed?'secondary':'primary'}" data-action="review-unsure">Revisit cards</button>`:''}
      ${c.concern||totals.skipped?`<details class="followup-menu"><summary>More follow-ups <span aria-hidden="true">+</span></summary><div class="menu-panel">${c.concern?'<button data-action="review-attention">Review my concerns</button>':''}${totals.skipped?'<button data-action="review-skipped">Finish skipped cards</button>':''}</div></details>`:''}
    </div></div>${reactionTrail()}${reactionLegend(totals)}${state.preferences.length?`<div class="report-priorities"><h2>Your priorities</h2><p>${state.preferences.map(id=>escape(TOPICS[id].label)).join(' · ')}</p></div>`:''}</header>
    ${claimMap()}
    ${attention.length?`<section class="attention-panel"><h2>Needs attention <span class="topic-total">${attention.length}</span></h2>${attention.map(reportItem).join('')}</section>`:''}
    ${state.reflection?`<section class="saved-note"><h2>Your saved note</h2><p>${escape(state.reflection)}</p></section>`:''}
    <div class="report-utilities"><div class="actions"><button class="primary" data-action="download" ${exportBusy?'disabled':''}>${exportBusy?'Preparing PDF…':'Download PDF'}</button><button class="secondary" data-action="download-text">Save as text</button><button class="secondary" data-action="report-info"><span aria-hidden="true">ⓘ</span>About this report</button></div>${exportError?`<p class="entry-error" role="alert">${escape(exportError)}</p>`:''}</div>
  </section>`;
}
function helpReview(){
  openModal(`<div class="modal-top"><h2 id="modal-title">How to use Plainer</h2><button class="secondary" data-close>Close</button></div><ol class="help-steps"><li><strong>Choose how you feel</strong><p>Select Comfortable, Concerned, or Unsure, then press Next. Skip leaves a card for later.</p></li><li><strong>Double-click to move ahead</strong><p>Double-click a response to select it and advance in one move. You can go Back or undo your latest response in Review menu.</p></li><li><strong>Check source</strong><p>Open the exact passage behind a claim, highlighted in the original policy.</p></li><li><strong>Reword claim</strong><p>Try a different explanation. AI wording can miss or change meaning; compare it with the source.</p></li></ol>`);
}
function reportInfo(){
  openModal(`<div class="modal-top"><h2 id="modal-title">About this report</h2><button class="secondary" data-close>Close</button></div><div class="help-copy"><p>${analysis.readingMode==='user'?`Quick overview covers selected themes. ${analysis.unclaimedUnitIds.length} source units are outside this overview.`:'Lawyer mode covers individual claims in more detail.'} AI wording is unverified; compare it with the original policy.</p><p>Colors record your personal reactions, not a risk score or acceptance of the policy. Each square opens its claim.</p><p>The PDF includes your priorities, response totals, and Concerned or Unsure claim details. It ends with a count of unreviewed claims, including skipped cards.</p>${state.source?.fetchedAt?`<p>Source fetched ${escape(new Date(state.source.fetchedAt).toLocaleDateString())}.</p>`:''}<p>You can download the full source record from Review menu.</p></div>`);
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
  state={version:2,text:pending.text,title:pending.title,source:pending.source,warnings:pending.warnings||[],createdAt:new Date().toISOString(),preferences:[...intakePreferences],responses:{},responseOrder:[],reflection:'',analysis:nextAnalysis};
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
  try{const result=await apiPost('/api/reword',{claim:p.title,sourceQuote:p.text,contextQuote:p.contextQuote||'',previousWording:response(p.id).rewording||p.title});if(state!==review||token!==flowToken)return;state.responses[pointId]={...response(pointId),rewording:result.reworded};rewordEntrance=pointId;save();}
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
function render(){if(screen!=='review')renderedCardId=null;root.innerHTML=frame(screen==='paste'?pasteView():screen==='import'?importView():screen==='preview'?previewView():screen==='depth'?depthView():screen==='overview'?overviewView():screen==='review'?reviewView():screen==='checkpoint'?checkpointView():reportView());rewordEntrance=null;previousReadingMode=null;}
function next(){if(cursor>=sequence().length-1)setScreen('report');else{cursor++;setScreen('review');}}
function selectReaction(reaction){
  pendingReaction=reaction;
  for(const button of root.querySelectorAll('[data-action="react"], [data-action="skip"]'))button.setAttribute('aria-pressed',String((button.dataset.id||'skipped')===reaction));
  const confirm=root.querySelector('[data-action="confirm"]');if(confirm)confirm.disabled=false;
  const status=root.querySelector('#selection-status');if(status)status.textContent=`${reactions[reaction]} selected`;
}
function confirmReaction(){
  const p=current();const reaction=pendingReaction||response(p.id).reaction;if(!reaction)return;
  lastDecision={review:state,id:p.id,cursor,queue:state.queue,previousReaction:response(p.id).reaction,previousDealbreaker:response(p.id).dealbreaker,responseOrder:[...(state.responseOrder||[])]};
  state.responses[p.id]={...response(p.id),reaction,dealbreaker:reaction==='concern'&&response(p.id).dealbreaker===true};
  state.responseOrder=[...new Set([...(state.responseOrder||[]),p.id])];
  rewordError='';next();
}
function undoDecision(){
  if(lastDecision?.review!==state)return;
  const {id,queue,previousReaction,previousDealbreaker}=lastDecision;
  const restored={...response(id)};
  if(previousReaction)restored.reaction=previousReaction;else delete restored.reaction;
  restored.dealbreaker=previousDealbreaker===true;
  state.responses[id]=restored;state.responseOrder=lastDecision.responseOrder;state.queue=queue||null;cursor=sequence().findIndex(p=>p.id===id);lastDecision=null;setScreen('review');
}
function goPoint(id){state.queue=null;cursor=ordered().findIndex(p=>p.id===id);if(cursor<0)cursor=0;setScreen('review');}
function openModal(html){modalReturn=document.activeElement;const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">${html}</section>`;document.body.append(wrap);root.inert=true;document.body.style.overflow='hidden';wrap.querySelector('button')?.focus();wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('[data-close]'))closeModal();});wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeModal();}if(e.key==='Tab'){const els=[...wrap.querySelectorAll('button,a,input,textarea,[tabindex="0"]')];const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});return wrap;}
function closeModal(){document.querySelector('.modal-backdrop')?.remove();root.inert=false;document.body.style.overflow='';modalReturn?.focus();}
function showSource(id){const p=points().find(x=>x.id===id);openModal(`<div class="modal-top"><div><p class="eyebrow">Original document</p><h2 id="modal-title">${escape(state.title)}</h2></div><button class="secondary" data-close>Close</button></div><p class="muted" style="font-size:12px">The highlighted passage is the exact source. AI explanations can miss or change meaning; this wording is the reference.</p><div class="source-full">${escape(state.text.slice(0,p.start))}<mark id="source-highlight">${escape(state.text.slice(p.start,p.end))}</mark>${escape(state.text.slice(p.end))}</div>`);document.querySelector('#source-highlight').scrollIntoView({block:'center'});}
function showFullSource(){openModal(`<div class="modal-top"><div><p class="eyebrow">Original document</p><h2 id="modal-title">${escape(state.title)}</h2></div><button class="secondary" data-close>Close</button></div><div class="source-full">${escape(state.text)}</div>`);}
function reportData(){
  const totals=reactionCounts(), statusOrder=['concern','clarify','skipped','unseen'];
  return {
    title:platformName()+' report', policyTitle:state.title, generatedAt:new Date().toISOString(),
    priorities:state.preferences.map(id=>TOPICS[id].label), totals,
    reviewed:reviewed().length, total:points().length,
    depth:reviewDepth(state)==='user'?'Quick overview':'Lawyer mode',
    coverage:analysis.readingMode==='user'?`Selected themes only; ${analysis.unclaimedUnitIds.length} source units are outside this overview.`:'Individual claims from the prepared policy review.',
    source:{url:state.source?.finalUrl||'',kind:state.source?.kind||'paste',fetchedAt:state.source?.fetchedAt||'',scope:state.source?.scope||''},
    items:statusOrder.flatMap(status=>ordered().filter(p=>statusOf(p)===status).map(p=>{
      const r=response(p.id);
      return {id:p.id,topic:TOPICS[p.topic].label,status,label:reactions[status]||'Not reviewed',
        wording:r.rewording||(p.model?p.title:p.text.trim()),sourceQuote:p.text.trim(),contextQuote:p.contextQuote||'',
        start:p.start,end:p.end,note:r.note||'',question:r.question||'',dealbreaker:r.dealbreaker===true};
    }))
  };
}
function reportText(){
  const data=reportData();
  return [data.title.toUpperCase(),`Exported: ${data.generatedAt}`,
    ...(data.priorities.length?[`Priority areas: ${data.priorities.join(', ')}`]:[]),
    `${data.reviewed} of ${data.total} reviewed`,
    `${data.totals.comfortable} comfortable | ${data.totals.concern} concerned | ${data.totals.clarify} unsure | ${data.totals.skipped} skipped | ${data.totals.unseen} not reviewed`,
    `Reading depth: ${data.depth}. ${data.coverage}`,
    `Source: ${data.source.url||data.source.kind}`,`Source fetched: ${data.source.fetchedAt||'Not recorded'}`,`Scope: ${data.source.scope||'Not recorded'}`,
    'Personal reactions, not acceptance of the policy or legal advice. AI wording may miss or change meaning. Comfortable claims are counted without repeating their details.',
    ...data.items.map(item=>`\n[${item.id}] ${item.label} · ${item.topic}\n${item.wording}\nExact source (${item.start}–${item.end}):\n${item.sourceQuote}${item.contextQuote?`\nContext:\n${item.contextQuote}`:''}${item.question?`\nSaved question: ${item.question}`:''}${item.note?`\nSaved note: ${item.note}`:''}`)
  ].join('\n');
}
function downloadFile(content,type,suffix,name=platformName()){
  const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const link=document.createElement('a');
  link.href=url;link.download=`${name.replace(/[^a-z0-9]+/gi,'-').slice(0,60)}-${suffix}`;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function downloadPdf(){
  if(exportBusy)return;
  const data=reportData(), review=state;exportBusy=true;exportError='';render();
  try{
    const [{createReportPdf},pdfLib,fontkit,fontResponse]=await Promise.all([
      import('./report-pdf.js'),import('./vendor/pdf-lib.js'),import('./vendor/fontkit.js'),
      fetch('fonts/instrument-sans.ttf',{signal:AbortSignal.timeout(15_000)})
    ]);
    if(!fontResponse.ok)throw new Error('The report font could not load. Try again or save as text.');
    const bytes=await createReportPdf(data,{...pdfLib,fontkit:fontkit.default,fontBytes:new Uint8Array(await fontResponse.arrayBuffer())});
    downloadFile(bytes,'application/pdf','review.pdf',data.title.replace(/ report$/,''));
  }catch(error){if(state===review)exportError=error.message||'The PDF could not be created. Save as text instead.';}
  finally{exportBusy=false;if(state===review&&screen==='report')render();}
}
function fullReportText(){
  const c=counts(points());
  return ['PLAINER · PERSONAL PRIVACY POLICY REVIEW',state.title,`Document added: ${state.createdAt}`,`Report exported: ${new Date().toISOString()}`,`Cards reviewed: ${reviewed().length}/${points().length}${analysis.readingMode==='user'?'; selective overview, not complete policy coverage':''}`,`${c.concern} concerned | ${c.clarify} unsure | ${c.comfortable} comfortable | ${c.unreviewed} still to review`,`Analysis: ${analysis.readingMode==='user'?`User overview; ${analysis.unclaimedUnitIds.length} source units not summarized`:analysis.mode==='model-assisted'?`${analysis.modelCount} AI draft claims; ${points().length-analysis.modelCount} exact passages; status ${analysis.status||'unknown'}`:'Exact source passages only'}`,`Source: ${state.source?.finalUrl||state.source?.kind||'paste'}`,`Source fetched: ${state.source?.fetchedAt||'Not recorded'}`,`Scope: ${state.source?.scope||'Not recorded'}`,`\nThis report records personal reactions, not legal advice or acceptance. Check AI claims against the original wording. Topic suggestions are navigation aids, not risk ratings.`,`\nNOTE TO MY FUTURE SELF\n${state.reflection||'(None)'}`,...ordered().map(p=>{const r=response(p.id);return `\n[${p.id}] ${p.title}\nReaction: ${reactions[r.reaction]||'Not reviewed'}${r.reaction==='concern'&&r.dealbreaker?' · POTENTIAL DEALBREAKER':''}\n${r.question?`Question: ${r.question}\n`:''}${r.note?`Note: ${r.note}\n`:''}Exact source characters ${p.start}–${p.end}:\n${p.text.trim()}${r.rewording?`\nOriginal claim: ${p.title}\nRewording shown: ${r.rewording}`:''}${p.contextQuote?`\nCited context:\n${p.contextQuote.trim()}`:''}`;}),`\nORIGINAL POLICY (COMPLETE)\n${state.text}`].join('\n');
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
});
root.addEventListener('dragover',e=>{const zone=e.target.closest('#drop-zone');if(!zone)return;e.preventDefault();e.dataTransfer.dropEffect='copy';zone.classList.add('is-dragging');});
root.addEventListener('dragleave',e=>{const zone=e.target.closest('#drop-zone');if(zone&&!zone.contains(e.relatedTarget))zone.classList.remove('is-dragging');});
root.addEventListener('drop',e=>{const zone=e.target.closest('#drop-zone');if(!zone)return;e.preventDefault();selectFile(e.dataTransfer.files[0]||null);});
root.addEventListener('keydown',e=>{const tab=e.target.closest('[role="tab"]');if(!tab)return;const modes=['upload','paste','url'];const index=modes.indexOf(tab.dataset.id);let next=index;if(e.key==='ArrowRight')next=(index+1)%modes.length;else if(e.key==='ArrowLeft')next=(index+modes.length-1)%modes.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=modes.length-1;else return;e.preventDefault();flowToken++;inputMode=modes[next];busy='';importError='';render();root.querySelector(`#tab-${inputMode}`)?.focus();});
root.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(!button||button.disabled)return;const action=button.dataset.action,id=button.dataset.id;
  if(action==='home'){flowToken++;screen='paste';pending=null;busy='';importError='';render();focusEntry();}
  if(action==='own'){flowToken++;busy='';ownOpen=!ownOpen;importError='';render();root.querySelector('[data-action="own"]')?.focus({preventScroll:true});}
  if(action==='featured'){ownOpen=false;openFeatured(id,readingMode);}
  if(action==='reading-depth'&&['user','lawyer'].includes(button.dataset.mode)&&!busy){previousReadingMode=readingMode;readingMode=button.dataset.mode;render();root.querySelector(`[data-action="reading-depth"][data-mode="${readingMode}"]`)?.focus({preventScroll:true});}
  if(action==='input-mode'){flowToken++;inputMode=id;busy='';importError='';render();root.querySelector(`#tab-${id}`)?.focus();}
  if(action==='choose-file')root.querySelector('#policy-file')?.click();
  if(action==='remove-file'){selectedFile=null;render();root.querySelector('[data-action="choose-file"]')?.focus();}
  if(action==='import-file'){importFile(selectedFile).catch(error=>{importError=error.message;render();});}
  if(action==='build')buildReview();
  if(action==='source-fallback')exactPassageFallback();
  if(action==='about')openModal(`<div class="modal-top"><h2 id="modal-title">How this review works</h2><button class="secondary" data-close>Close</button></div><div class="help-copy"><p>Choose a privacy policy and reading depth, check the text we extracted, then review one source-linked claim at a time. Mark claims comfortable, concerning, or unsure, skip, or request a rewording. Your report keeps your reactions and unfinished material together.</p><p><strong>Analysis:</strong> policy text is sent to the server and OpenAI to propose claims. Those paraphrases are not legally verified; check the exact source before relying on them. If analysis fails, you can continue with exact source passages.</p><p><strong>Your review:</strong> reactions and notes are saved in this browser. They are not sent to the policy provider. Anyone using this browser profile may be able to reopen them; “Clear review” removes them here.</p></div>`);
  if(action==='reset'){openModal(`<div class="modal-top"><h2 id="modal-title">Clear this review?</h2><button class="secondary" data-close>Keep review</button></div><p class="help-copy">This removes the saved policy, reactions, questions, and notes from this browser. Download your report first if you’d like to keep a copy.</p><button class="primary" id="confirm-clear">Clear review</button>`);document.querySelector('#confirm-clear').onclick=()=>{try{localStorage.removeItem(KEY);}catch{toast('Could not remove browser storage. Clear site data in your browser settings.');return;}flowToken++;closeModal();state=null;analysis=null;pending=null;draft={title:'',text:'',url:''};screen='paste';render();};}
  if(action==='resume'){flowToken++;busy='';importError='';resumeDepth();}
  if(action==='priorities')openPriorities();
  if(action==='help')helpReview();
  if(action==='report-info')reportInfo();
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
  if(action==='download')downloadPdf();
  if(action==='download-text')downloadFile(reportText(),'text/plain;charset=utf-8','review.txt');
  if(action==='download-full')downloadFile(fullReportText(),'text/plain;charset=utf-8','full-record.txt');
  if(action==='print')window.print();
});
let printDisclosures = [];
window.addEventListener('beforeprint', () => {
  if (printDisclosures.length) return;
  printDisclosures = [...root.querySelectorAll('.attention-panel details')].map(element => ({element, open:element.open}));
  printDisclosures.forEach(({element}) => { element.open = true; });
});
window.addEventListener('afterprint', () => {
  printDisclosures.forEach(({element, open}) => { element.open = open; });
  printDisclosures = [];
});
render();
