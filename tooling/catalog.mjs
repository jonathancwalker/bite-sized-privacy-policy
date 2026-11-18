/** Curated entry points, verified against official policy pages 2026-11-17.
 * A catalog choice opens a URL; it is not a frozen copy or a claim that one
 * regional version applies to every reader. Always record final URL and time.
 */
export const POLICY_CATALOG = Object.freeze([
  { id:'meta', name:'Instagram & Facebook', company:'Meta', category:'social', url:'https://www.facebook.com/privacy/policy', scope:'Shared Meta policy; product details and local supplements can differ.' },
  { id:'x', name:'X', company:'X', category:'social', url:'https://x.com/en/privacy', scope:'English X privacy policy; controller differs by region.' },
  { id:'tiktok-us', name:'TikTok · US', company:'TikTok', category:'social', url:'https://www.tiktok.com/legal/privacy-policy', scope:'US version. Other regions have different policy text.' },
  { id:'tiktok-europe', name:'TikTok · Europe', company:'TikTok', category:'social', url:'https://www.tiktok.com/legal/page/eea/privacy-policy/en', scope:'EEA, UK, and Switzerland version.' },
  { id:'tiktok-other', name:'TikTok · other regions', company:'TikTok', category:'social', url:'https://www.tiktok.com/legal/page/row/privacy-policy/en', scope:'Rest-of-world version; confirm which applies to you.' },
  { id:'youtube-google', name:'YouTube & Google', company:'Google', category:'social', url:'https://policies.google.com/privacy?hl=en', scope:'Shared Google policy covers YouTube; some services have additional notices.' },
  { id:'reddit', name:'Reddit', company:'Reddit', category:'social', url:'https://redditinc.com/policies/privacy-policy', scope:'Regional addenda may apply.' },
  { id:'linkedin', name:'LinkedIn', company:'LinkedIn', category:'social', url:'https://www.linkedin.com/legal/privacy-policy', scope:'European regional and California disclosures may supplement this page.' },
  { id:'snapchat', name:'Snapchat', company:'Snap', category:'social', url:'https://values.snap.com/privacy/privacy-policy?lang=en-US', scope:'Regional and product notices may supplement this page.' },
  { id:'openai-us', name:'ChatGPT & OpenAI · US/other', company:'OpenAI', category:'ai', url:'https://openai.com/policies/privacy-policy', scope:'For readers outside EEA, UK, Switzerland; business/API processing has separate terms.' },
  { id:'openai-europe', name:'ChatGPT & OpenAI · Europe', company:'OpenAI', category:'ai', url:'https://openai.com/policies/eu-privacy-policy', scope:'EEA, UK, Switzerland version.' },
  { id:'anthropic', name:'Claude & Anthropic', company:'Anthropic', category:'ai', url:'https://www.anthropic.com/legal/privacy', scope:'Enterprise/customer processing and some regional notices may differ.' },
  { id:'gemini', name:'Gemini Apps', company:'Google', category:'ai', url:'https://support.google.com/gemini/answer/13594961?hl=en', scope:'Gemini Apps notice supplements Google policy for signed-in use.' },
  { id:'copilot', name:'Microsoft Copilot', company:'Microsoft', category:'ai', url:'https://www.microsoft.com/en-us/privacy/privacystatement', scope:'Consumer base policy; work/school products and Copilot guidance differ.' },
  { id:'perplexity', name:'Perplexity', company:'Perplexity', category:'ai', url:'https://www.perplexity.ai/hub/legal/privacy-policy', scope:'General notice; Enterprise/API processor data is excluded.' }
]);
export function catalogEntry(id) { return POLICY_CATALOG.find(item=>item.id===id) ?? null; }
