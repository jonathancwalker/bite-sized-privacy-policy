// One manifest for local serving and static builds.
const vendor = Object.freeze({
  'vendor/pdf-lib.js':'../node_modules/pdf-lib/dist/pdf-lib.esm.min.js',
  'vendor/fontkit.js':'../node_modules/@pdf-lib/fontkit/dist/fontkit.es.min.js',
  'vendor/pdf-lib-LICENSE.txt':'../node_modules/pdf-lib/LICENSE.md',
  'vendor/fontkit-LICENSE.txt':'../app/vendor/fontkit-LICENSE.txt'
});
export const FEATURED_IDS = Object.freeze(['meta', 'tiktok-us', 'youtube-google']);
export const APP_ASSETS = Object.freeze([
  'index.html', 'styles.css', 'app.js', 'engine.js', 'review-state.js', 'report-pdf.js',
  ...Object.keys(vendor),
  'fonts/instrument-sans.ttf', 'fonts/OFL.txt',
  'concepts.html', 'concepts.css', 'concepts.js',
  ...FEATURED_IDS.map(id => `data/featured/${id}.json`)
]);

export function appAssetUrl(name) {
  if(!APP_ASSETS.includes(name))throw new Error("Unknown app asset");
  return new URL(vendor[name] || "../app/"+name, import.meta.url);
}
