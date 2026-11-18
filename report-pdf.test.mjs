import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readAppAsset} from './scripts/assets.mjs';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createReportPdf} from './app/report-pdf.js';

// Exercise the delivered browser bundles, without Node resolving their imports.
async function standalone(name){
  const source=await readAppAsset(name);
  return import(`data:text/javascript;base64,${source.toString('base64')}`)
    .catch(error=>{throw new Error(error.message.split(' from ')[0]);});
}
const [pdfLib,{default:fontkit},fontBytes]=await Promise.all([
  standalone('vendor/pdf-lib.js'),standalone('vendor/fontkit.js'),
  readFile(new URL('./app/fonts/instrument-sans.ttf',import.meta.url))
]);
const options={...pdfLib,fontkit,fontBytes};
const sample={title:'Example report',generatedAt:'2026-11-18T12:00:00Z',priorities:['Retention and deletion','Advertising and tracking'],
  totals:{comfortable:1,concern:1,clarify:1,skipped:0,unseen:0},reviewed:3,total:3,depth:'Quick overview',coverage:'Selected themes only.',
  source:{url:'https://example.com/privacy',fetchedAt:'2026-11-17T12:00:00Z',scope:'United States'},
  items:[{id:'point-001',status:'concern',label:'Concerned',topic:'Retention and deletion',wording:'Your account data stays for 30 days.',sourceQuote:'We retain your account data for 30 days.',contextQuote:'',note:'',question:''},
    {id:'point-002',status:'clarify',label:'Unsure',topic:'Advertising and tracking',wording:'Partners receive browsing information.',sourceQuote:'Advertising partners receive browsing information.',note:'',question:''},
    {id:'point-003',status:'comfortable',label:'Comfortable',topic:'Security',wording:'COMFORTABLE_DETAIL_SHOULD_NOT_APPEAR',sourceQuote:'COMFORTABLE_SOURCE_SHOULD_NOT_APPEAR'}]};
async function readPdf(bytes){
  const task=getDocument({data:new Uint8Array(bytes),useSystemFonts:false,isEvalSupported:false});
  const doc=await task.promise;
  const pages=[];
  try{
    for(let i=1;i<=doc.numPages;i++){
      const page=await doc.getPage(i),content=await page.getTextContent();
      pages.push({text:content.items.map(item=>item.str).join(' '),items:content.items,view:page.view});
    }
    return pages;
  }finally{await task.destroy();}
}

test('PDF includes priorities, totals and source-linked concerns without comfortable details',async()=>{
  const pages=await readPdf(await createReportPdf(sample,options));
  const text=pages.map(page=>page.text).join(' ');
  assert.match(text,/Your priorities/);
  assert.match(text,/Advertising and tracking/);
  assert.match(text,/Comfortable/);
  assert.match(text,/account data for 30 days/);
  assert.match(text,/Source fetched/);
  assert.doesNotMatch(text,/COMFORTABLE_DETAIL|COMFORTABLE_SOURCE/);
});

test('a long claim and source continue across pages without clipping or dropping their endings',async()=>{
  const long={...sample,items:[{...sample.items[0],wording:('We retain account information for 30 days. '.repeat(120))+'CLAIM_END',sourceQuote:('Retention can be extended where the law requires it. '.repeat(140))+'SOURCE_END'}]};
  const pages=await readPdf(await createReportPdf(long,options));
  assert.ok(pages.length>2);
  const text=pages.map(page=>page.text).join(' ');
  assert.match(text,/CLAIM_END/);assert.match(text,/SOURCE_END/);
  for(const page of pages)for(const item of page.items.filter(item=>item.str.trim())){
    assert.ok(item.transform[4]>=35,'text stays inside the left margin');
    assert.ok(item.transform[4]+item.width<=577,'text stays inside the right margin');
    assert.ok(item.transform[5]>=28&&item.transform[5]<=760,'text stays inside page bounds');
  }
});

test('PDF export refuses unsupported glyphs instead of silently changing policy wording',async()=>{
  await assert.rejects(createReportPdf({...sample,items:[{...sample.items[0],wording:'個人情報'}]},options),/font|characters|text/i);
});
