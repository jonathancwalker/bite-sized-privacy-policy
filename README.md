# Plainer

A concept for helping people understand a privacy policy or contract, record their reactions to individual provisions, and leave with a decision report grounded in the original document.

## Current state

The [private hosted prototype](https://bite-sized-privacy-jcw.foggypanda2049.chatgpt.site) is the November 12 source-first version. A newer **local flow** now connects a redesigned entry experience, policy import, extracted-text preview, server-side LLM claim generation, browser reactions, and the report. The local flow has not yet been deployed to the hosted Site.

The entry screen offers three familiar policies or “Use my own policy.” The latter expands to show Upload, Paste, and URL tabs; file upload accepts PDF, DOCX, TXT, or RTF through a chooser or drop zone. After checking the extracted text, the flow continues to optional topic priorities, source-linked claims, reactions, checkpoints, and a personal report. Reviews autosave in that browser, including the current checkpoint. The fictional sample has 11 exact-passage points in the hosted version.

### Homepage visual studies

The local [concept gallery](app/concepts.html) explores three **visual-only** homepage directions: Clear, Grounded, and Signal. With the local server running, open `/concepts.html` (for example, `http://localhost:4175/concepts.html`). The gallery is separate from the working intake; no direction has been selected or applied to the product yet.

**Hosted prototype extraction limit:** the published first version organizes exact passages using keyword-based topics. The local flow generates plain-language model claims and links them to exact quotes, but those paraphrases have not been legally verified. Topic assignment and attention cues remain imperfect navigation aids.

### Run locally

Requires Node.js 22+:

```sh
npm run dev
# Open http://127.0.0.1:4173
npm test
npm run build
```

`app/` is the dedicated Sites source checkout. `scripts/build.mjs` copies the runtime files into `app/dist/`; the hosting manifest is `app/.openai/hosting.json`. The current hosted Site is static and does not run the local Node API. Root-level scripts and tests stay in this project.

For the connected local flow, supply `OPENAI_API_KEY` to the process environment and run `npm run dev`. The authorized ad-detection `.env` can be passed to Node locally with `node --env-file=/absolute/path/to/ad-detection/.env scripts/serve.mjs`. The key stays on the server and must not be copied into browser code or this repository. If port 4173 is already in use, set `PORT=4174` before the command.

### Data and reports

In the new local flow, policy text goes to the local server and OpenAI for claim generation. Reactions and notes remain in this origin's browser local storage. One review is saved at a time; switching documents prompts before replacing it. “Clear review” deletes the stored review. Private/incognito modes or browser storage restrictions may prevent recovery; the app shows a warning if storage is unavailable. The text report contains every reviewed claim or exact passage and the full original policy; browser printing provides a PDF option. Local and hosted reviews are separate because they use different origins.

Input limit: 80,000 characters. The sample is fictional, and this is a reading aid rather than legal advice. No user comprehension study has been run.

### Verification

Earlier automated and browser checks are recorded in [verification evidence](portfolio-docs/experiments.md#e02--working-prototype-verification). For the redesigned local entry flow, browser checks covered a featured-policy import, all three own-policy tabs, native file chooser and selected-file confirmation, paste and URL imports, source preview, AI claim generation, a saved reaction, and the partial report. The 390-pixel layout was inspected. See [entry UX verification](portfolio-docs/experiments.md#e05--focused-entry-flow).

Historical baseline: the project was concept-only at the November 10 handoff.


## Intake and intelligent decomposition tooling (November 17, 2026)

A separate [tooling pipeline](tooling/README.md) now supports a curated catalog of 15 official policy entry points, arbitrary public HTTPS policy pages, pasted text on stdin, and TXT/RTF/DOCX/text-PDF files. Regional variants are explicit. Every extraction records its source and warnings. One public Anthropic page was fetched successfully (40,685 extracted characters, 31 sections, 76 units, complete source coverage); OpenAI’s public page returned HTTP 403 to the command-line fetcher, so catalog URLs are not a guarantee of automated retrieval.

The new decomposition layer preserves exact source offsets and section paths, aims for units under 120 words, and gives an LLM bounded source plus neighboring context. Structured outputs propose plain-language claims with source and optional context quotes. A validator rejects quotes outside their cited source and marks accepted paraphrases unverified. A six-case synthetic benchmark and a public-policy smoke test have run with a user-authorized API key supplied through the process environment. **These tools are not yet connected to the deployed review interface.** The user is still considering that experience.

Run `npm run policy -- --list` to see choices, `npm run policy -- --file /path/to/policy.pdf` for file intake, or `npm run benchmark` for the local baseline. See the tooling README for URL, paste, and live LLM commands.

## Product intent

- Break long documents into understandable points, preserving conditions, exceptions, and links to exact source wording.
- Let people record comfort, concerns, and questions for each point.
- Summarize concerns, unanswered questions, acceptable terms, and unreviewed material.
- Explore explicit preferences to highlight relevant terms, while keeping the person's judgment in control.

## Emerging interaction model

The review should feel like a guided decision, not a quiz and not a stack of identical cards. People choose how far to go on each point, with the next useful action revealed progressively:

1. **Comfortable** — record that this point seems acceptable and continue.
2. **Need clarification** — capture a question, or ask for a simpler explanation or an example.
3. **Not comfortable** — mark the point as a concern, then optionally flag it as a potential dealbreaker.

Keep the primary actions visible and lightweight. Put deeper actions (view exact wording, see related points, add a note, mark as a dealbreaker) behind the relevant response so the first decision stays quick. Avoid implying that a reaction changes or negotiates the policy.

### Pacing and checkpoints

- Begin with a topic map and an estimate of the review, including how many high-priority points there are.
- Group related points into short sections (for example, collection, sharing, retention, and user controls).
- Offer a checkpoint after each section: reviewed, still to review, questions saved, and concerns flagged. Let people pause and return without losing their place.
- Allow skipping lower-priority material while making skipped topics visible in the final report.

### Preference onboarding

Before review, invite people to pick the topics that matter most to them (such as location, sensitive data, targeted ads, sharing, retention, or deletion). Use those explicit choices to order or highlight relevant points and explain why a point is surfaced. Keep the full review available, make preferences editable, and never hide a point or infer that the person is comfortable with it.

### Linked provisions

Some points only make sense together: a permission may be limited by an exception elsewhere, or a defined term may change the scope of a clause. Keep each point independently readable, but show a clear “Related points” path with a short explanation of the relationship and source links. The report should preserve those links rather than treating every reaction as isolated.

## Proposed first prototype

Start with a consumer app privacy policy. Use an overview → preference setup → point review → section checkpoints → decision report flow. These are design proposals to validate, not shipped functionality or settled requirements.

- Show document topics and review coverage before asking someone to navigate cards.
- Prefer reactions such as **Comfortable**, **Need clarification**, and **Not comfortable**. Let clarification branch into simpler wording, an example, or a saved question; let discomfort optionally branch into a concern or potential dealbreaker. Recording a reaction does not amend or accept contractual terms.
- Keep source text, document version, and uncertainty visible.
- Preserve unresolved issues and dealbreakers instead of reducing them to one score.
- Use editable, explicit preferences for emphasis; do not silently generalize one response to all contexts.

## Next work

1. Have the user try the redesigned entry flow and report where the path still feels busy or unclear.
2. Refine the downstream topic map, claim cards, and report to match the quieter entry screens.
3. Evaluate cross-clause relationships, category accuracy, and comprehension with real policies when UX direction is settled.

The new local LLM tooling uses the OpenAI Responses API with structured outputs. The deployed browser app still uses its earlier keyword grouping. Keep API credentials and private policy files outside Git. See [tooling](tooling/README.md).
