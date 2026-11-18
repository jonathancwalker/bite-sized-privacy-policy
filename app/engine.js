/**
 * Deterministic, dependency-free segmentation for privacy policies and other
 * pasted documents. Every emitted point maps to one contiguous source range.
 */

export const TOPICS = Object.freeze({
  collection: Object.freeze({ label: "Data collection", description: "Information the service collects or receives." }),
  sharing: Object.freeze({ label: "Sharing", description: "How information is disclosed or made available to others." }),
  advertising: Object.freeze({ label: "Advertising and tracking", description: "Advertising, analytics, and activity tracking." }),
  retention: Object.freeze({ label: "Retention and deletion", description: "How long information is kept and how it is removed." }),
  controls: Object.freeze({ label: "Your controls", description: "Choices, access, correction, and account controls." }),
  security: Object.freeze({ label: "Security", description: "Safeguards and incident practices." }),
  other: Object.freeze({ label: "Other terms", description: "Other policy provisions and document content." })
});

export const SAMPLE_TITLE = "Mosslight Journal Privacy Policy";

export const SAMPLE_POLICY = `Mosslight Journal is a fictional app for saving private notes, photos, and voice entries. We collect and use information when you create an account, use its features, or contact us.

When you register, we collect your email address, display name, and password credential. You may also add an optional profile picture and a short biography.

Entries, attachments, and voice recordings you choose to save are stored with your account. If you enable location tagging, we collect the location you attach to an entry; location tagging is off unless you turn it on.

The app receives device and log information, including device type, app version, language, time of requests, and error details. We use this information to operate the service and diagnose failures.

We use essential cookies and similar storage to keep you signed in and remember settings. With your permission, our analytics provider receives app events and a rotating identifier to help us understand feature use.

We do not sell personal information. We share account and service data with hosting, customer support, and analytics providers that process it for us under service agreements. They may not use it to advertise their own products.

If you choose to export an entry or share a public link, the selected content is provided to the destination or anyone who has that link. Public links remain available until you disable them, but recipients may have saved a copy.

We keep account information and entries while your account remains open. You can delete individual entries in the app; deleted entries are removed from active systems promptly and from routine backups within 60 days.

You can view, correct, and export profile information in settings. You may turn off optional analytics or location tagging there, and you can request account deletion from the account page.

We use access controls, encryption in transit, and encrypted backups to protect stored information. No internet service can guarantee that every transmission or storage system will always be secure.

We may retain information when needed to comply with law, resolve disputes, or enforce our terms. If we make a material change to this policy, we will post the updated version and notify account holders by email.`;

const TOPIC_RULES = [
  ["advertising", /\b(advertis(?:e|es|ed|ing|ement)|target(?:ed|ing)? ads?|marketing|analytics|track(?:ing|er|s|ed)?|cookies?|pixels?|cross[- ]site|interest[- ]based|personalized ads?)\b/i],
  ["sharing", /\b(share|sharing|disclos(?:e|es|ed|ure)|sell|sale|sold|third[- ]part(?:y|ies)|service providers?|processor|recipient|public link|partners?)\b/i],
  ["retention", /\b(retain|retention|keep|stored?|storage|delete|deletion|erase|backup|archiv(?:e|es|ed))\b/i],
  ["controls", /\b(you may|you can|your choice|opt[- ]out|opt[- ]in|consent|settings|access|correct|correction|export|download|withdraw|request|preferences|disable|turn off)\b/i],
  ["security", /\b(secur(?:e|ity)|protect|safeguard|encrypt(?:ion|ed)?|breach|incident|access controls?|authentication|fraud)\b/i],
  ["collection", /\b(collect|collection|receive|gather|device|location|biometric|health|financial|voice|contact|email address|log data|profile picture|password credential)\b/i]
];

const HIGH_PRIORITY_TERMS = /\b(sensitive|health|medical|biometric|genetic|racial|ethnic|religious|sexual orientation|precise location|geolocation|gps|financial|payment card|sell|sale|sold|targeted ads?|cross[- ]site tracking|track(?:ing|er)?|advertising identifier|government id)\b/i;

function wordCount(text) {
  const matches = text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu);
  return matches ? matches.length : 0;
}

function classify(text) {
  const matches = TOPIC_RULES.map(([topic, pattern], order) => ({ topic, count: (text.match(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`)) || []).length, order }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count || a.order - b.order);
  return matches[0]?.topic ?? "other";
}

// Break only at paragraph boundaries unless a paragraph exceeds either size
// target. Every returned index addresses the untouched original source.
function sentenceBoundaries(text) {
  const points = [];
  const re = /[.!?]+[\])}'"”’]*(?=\s|$)|(?:\r?\n)+/gu;
  let match;
  while ((match = re.exec(text))) points.push(re.lastIndex);
  if (!points.length || points[points.length - 1] !== text.length) points.push(text.length);
  return points;
}

function rangesFor(text, maxChars = 600, maxWords = 100) {
  if (!text.length) return [];
  const boundaries = [];
  const paragraphBreak = /(?:\r?\n[ \t]*){2,}/gu;
  let match;
  while ((match = paragraphBreak.exec(text))) boundaries.push(match.index + match[0].length);
  if (!boundaries.length || boundaries[boundaries.length - 1] !== text.length) boundaries.push(text.length);

  const ranges = [];
  let start = 0;
  for (const paragraphEnd of boundaries) {
    let cursor = start;
    while (paragraphEnd - cursor > maxChars || wordCount(text.slice(cursor, paragraphEnd)) > maxWords) {
      const charLimit = Math.min(paragraphEnd, cursor + maxChars);
      const wordMatches = [...text.slice(cursor, paragraphEnd).matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)];
      const wordLimit = wordMatches.length > maxWords
        ? cursor + wordMatches[maxWords - 1].index + wordMatches[maxWords - 1][0].length
        : paragraphEnd;
      const target = Math.min(charLimit, wordLimit);
      const candidates = sentenceBoundaries(text.slice(cursor, target)).map(position => cursor + position).filter(position => position < target);
      let cut = candidates.at(-1);
      if (!cut || cut <= cursor + 1) {
        cut = Math.max(text.lastIndexOf(" ", target), text.lastIndexOf("\n", target), text.lastIndexOf("\t", target));
        if (cut <= cursor) cut = target;
        else cut += 1;
      }
      ranges.push([cursor, cut]);
      cursor = cut;
    }
    if (paragraphEnd > cursor) ranges.push([cursor, paragraphEnd]);
    start = paragraphEnd;
  }
  const readable = [];
  for (const [index, [a, b]] of ranges.entries()) {
    if (b <= a) continue;
    if (!text.slice(a, b).trim()) {
      if (readable.length) readable.at(-1)[1] = b;
      continue;
    }
    // Retain the original passage number so saved reactions still refer to the same text.
    readable.push([readable.length ? a : 0, b, index + 1]);
  }
  return readable.length ? readable : [[0, text.length, 1]];
}

export function analyzePolicy(input) {
  const text = String(input ?? "");
  const ranges = rangesFor(text);
  const topicCounts = Object.create(null);
  const points = ranges.map(([start, end, passageNumber], index) => {
    const sourceText = text.slice(start, end);
    const topic = classify(sourceText);
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    return {
      id: `point-${String(passageNumber ?? index + 1).padStart(3, "0")}`,
      title: `${TOPICS[topic].label} detail ${topicCounts[topic]}`,
      text: sourceText,
      topic,
      priority: HIGH_PRIORITY_TERMS.test(sourceText) ? "high" : "standard",
      relatedIds: [],
      start,
      end
    };
  });

  // Link only nearby points assigned to the same broad topic. This is a
  // navigation hint, not a claim that the provisions legally depend on each other.
  for (let i = 0; i < points.length; i++) {
    const related = [];
    for (let j = Math.max(0, i - 3); j <= Math.min(points.length - 1, i + 3); j++) {
      if (j !== i && points[j].topic === points[i].topic) related.push(points[j].id);
      if (related.length === 2) break;
    }
    points[i].relatedIds = related;
  }

  return {
    points,
    topics: [...new Set(points.map(point => point.topic))],
    wordCount: wordCount(text),
    unclassifiedCount: points.filter(point => point.topic === "other").length,
    mode: "source-first"
  };
}
