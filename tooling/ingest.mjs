import { basename } from 'node:path';
import { fetchPolicyUrl } from './fetch-url.mjs';
import { extractFile } from './extract-file.mjs';
import { catalogEntry } from './catalog.mjs';

/** One canonical intake result for catalog, URL, file, and pasted sources. */
export async function ingestPolicy(input, options = {}) {
  if (!input || !['catalog','url','file','paste'].includes(input.kind)) throw new Error('Choose a catalog entry, URL, file, or pasted text.');
  if (input.kind === 'catalog') {
    const entry=catalogEntry(input.id);
    if (!entry) throw new Error('Unknown catalog ID.');
    const fetched=await fetchPolicyUrl(entry.url,options);
    return {text:fetched.text,title:entry.name,source:{...fetched.source,catalogId:entry.id,scope:entry.scope},warnings:[...fetched.warnings,entry.scope]};
  }
  if (input.kind === 'url') {
    const fetched=await fetchPolicyUrl(input.url,options);
    return {text:fetched.text,title:input.title||fetched.title||input.url,source:fetched.source,warnings:fetched.warnings};
  }
  if (input.kind === 'file') {
    const extracted=await extractFile(input.path??input.bytes,{...options,filename:input.filename??(input.path?basename(input.path):undefined)});
    return {text:extracted.text,title:input.title||extracted.metadata.filename||'Imported privacy policy',source:{kind:'file',format:extracted.format,...extracted.metadata},warnings:extracted.warnings};
  }
  const text=String(input.text??'');
  if (!text.trim()) throw new Error('No pasted policy text was provided.');
  return {text,title:input.title||'Pasted privacy policy',source:{kind:'paste',addedAt:new Date().toISOString()},warnings:[]};
}
