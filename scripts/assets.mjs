// One manifest for local serving and static builds.
export const FEATURED_IDS = Object.freeze(['meta', 'tiktok-us', 'youtube-google']);
export const APP_ASSETS = Object.freeze([
  'index.html', 'styles.css', 'app.js', 'engine.js', 'review-state.js',
  'concepts.html', 'concepts.css', 'concepts.js',
  ...FEATURED_IDS.map(id => `data/featured/${id}.json`)
]);
