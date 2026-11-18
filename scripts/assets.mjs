import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// One manifest and browser packaging path for local serving and static builds.
const vendor = Object.freeze({
  'vendor/pdf-lib.js':'../node_modules/pdf-lib/dist/pdf-lib.esm.min.js',
  'vendor/fontkit.js':'../node_modules/@pdf-lib/fontkit/dist/fontkit.es.min.js',
  'vendor/pdf-lib-LICENSE.txt':'../node_modules/pdf-lib/LICENSE.md',
  'vendor/fontkit-LICENSE.txt':'../app/vendor/fontkit-LICENSE.txt',
  'vendor/pako-LICENSE.txt':'../node_modules/pako/LICENSE'
});
export const FEATURED_IDS = Object.freeze(['meta', 'tiktok-us', 'youtube-google']);
export const APP_ASSETS = Object.freeze([
  'index.html', 'styles.css', 'app.js', 'engine.js', 'review-state.js', 'report-pdf.js', 'limits.js',
  ...Object.keys(vendor),
  'fonts/instrument-sans.ttf', 'fonts/OFL.txt',
  'concepts.html', 'concepts.css', 'concepts.js',
  ...FEATURED_IDS.map(id => `data/featured/${id}.json`)
]);

export function appAssetUrl(name) {
  if(!APP_ASSETS.includes(name))throw new Error("Unknown app asset");
  return new URL(vendor[name] || "../app/"+name, import.meta.url);
}

const bundles = new Map();
export function readAppAsset(name) {
  const source = appAssetUrl(name);
  if (!vendor[name] || !name.endsWith('.js')) return readFile(source);
  if (!bundles.has(name)) {
    const bundled = build({
      entryPoints:[fileURLToPath(source)], bundle:true, platform:'browser',
      format:'esm', target:'es2022', minify:true, legalComments:'inline',
      write:false, metafile:true
    }).then(result => {
      if (Object.values(result.metafile.outputs).some(output => output.imports.length)) {
        throw new Error(`Browser asset ${name} contains unbundled imports.`);
      }
      return Buffer.from(result.outputFiles[0].contents);
    }).catch(error => { bundles.delete(name); throw error; });
    bundles.set(name, bundled);
  }
  return bundles.get(name);
}
