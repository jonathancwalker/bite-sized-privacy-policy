# Bite-sized Privacy Policy — experiments and verification

Reconstructed 2026-11-12. Historical results below were read from saved records, not rerun during this backfill. Planned tests remain labeled as planned.

## E01 — Planned interaction comparison

Compare the short guided review with a plain-language summary for speed, understanding of linked provisions, and unresolved questions. No test was run in the reviewed record.

Evidence: [README.md](evidence/project-records/README.md).

## Backfill verification

Source copies were checked with SHA-256. Structured log files were parsed and indexed; this is a file-integrity check, not a rerun of experiments or a claim that every raw response received qualitative review. Newly captured interfaces use isolated browser contexts with network blocked. Visuals are indexed with provenance.

[Log inventory](evidence/log-inventory.json) · [Asset register](assets/index.md)


## E02 — Working prototype verification
Date: 2026-11-12 (local; deployment completed November 13 UTC). Status: run.

Question: Can a person move from pasted text through a complete review to a usable report, preserving original wording and unfinished material?

- `npm test`: 6/6 tests pass. Tests cover the 11-point sample, contiguous source ranges, negations/exceptions, CRLF and whitespace, long paragraphs, hostile punctuation, deterministic classification, and empty inputs.
- Chrome desktop: completed all 11 sample points through section checkpoints. Final report showed 9 comfortable, 1 clarification, 1 concern/dealbreaker, and 0 unreviewed (synthetic QA reactions, not user findings).
- Partial report: 1 comfortable, 1 clarification, 1 concern/dealbreaker, and 8 skipped/unreviewed. Downloaded text was inspected on disk and contains all 11 passages, notes, question, reflection, source offsets, related point IDs, and the original policy.
- Custom 358-character paste: created three points; preserved a negation, retention exception, and literal script markup without executing it. Changed clarification → comfortable retained the earlier question with a contextual label. Skipped final point remained visible in the partial report. Captured console error list was empty.
- Refreshed at a checkpoint, resumed to that checkpoint with prior responses intact. Priority selection moved retention to the front without hiding other topics.
- Desktop and 390 × 844 mobile views inspected. Source modal showed the selected exact text highlighted in the full policy. Mobile report access was made visible during review.
- Independent sub-agent static critique and screenshot review found no remaining flow blocker after fixes. Generic topic titles and missing plain-language claims remain a product-scope limitation, explicitly disclosed.

Infrastructure observations: local preview and source upload first hit sandbox restrictions; the approved retries succeeded. Browser automation's download observer timed out, but the generated text report was found and read in Downloads. Private deployment succeeded for source commit `21cc99d8aeba5104f9f3a3fc70d8c0de4e1209ad`.

Limits: these are implementation checks, not a user study, extraction accuracy benchmark, legal validation, or performance study. Print/PDF output and `.txt` file chooser were not exercised. No provider API or server analysis exists.

Evidence: [screenshots](assets/index.md), [downloaded QA report](evidence/2026-11-12-sample-review.txt), [engine tests](../engine.test.mjs).


## E03 — Intake and LLM decomposition benchmark
Date: 2026-11-17. Status: run, limited sample.

Question: Can URL/file intake preserve source, and can a model propose claims with traceable context without silently dropping material?

- Automated suite: 28 tests passed after validator tightening; subsequent focused HTML-table and canonical-intake tests also passed (31 total). Tests cover URL safety/redirects/limits, TXT/RTF/DOCX/PDF extraction, section hierarchy, lossless offsets, and proposed-claim validation. A later context-link and completeness regression test was added.
- Six synthetic policy-like cases cover negated sharing, retention exceptions, linked definitions, location conditions, table choices, and an embedded instruction. Deterministic decomposition retained the complete source on every case. This is a source integrity check, not a comprehension score.
- Initial live five-case comparison: GPT-6.1 Sol and GPT-6 Luna each produced 17 proposed claims, all with exact quote ranges; there were no rejected quotes, unclaimed units, or API failures. The initial benchmark counted source phrase retention, not semantic claim fidelity.
- Manual defined-term inspection: Sol expanded “Partners” using the preceding exact definition and retained the consent condition and withdrawal limit. Luna kept the same condition and limit but largely repeated the source. Both cited the exact definition.
- Independent critique found that the original validator accepted arbitrary document-wide context and labeled partial runs complete. Context is now restricted to a cited adjacent unit; structural completeness requires all units accounted for and no rejected proposals or failures. The updated schema passed a live Sol defined-term rerun. Accepted paraphrases are explicitly marked unverified.
- Embedded-instruction case: Sol described the instruction as a test artifact inside policy text and retained the explicit no-sale clause. It did not follow the embedded instruction. One case does not prove general prompt-injection resilience.
- Public URL smoke test: Anthropic policy HTML yielded 40,685 extracted characters, 31 sections, 76 units, and exact source coverage. A limited 7,795-character LLM sample yielded 33 draft claims across 14 units, no rejected citations or unclaimed units, and some qualifier review flags. Example claims kept the Enterprise-policy exclusion and regional supplemental conditions. OpenAI's public URL returned HTTP 403 to the command-line fetcher; this source needs a better authorized retrieval path or manual paste.
- File extractor tests generated sample DOCX and text/image-only PDF fixtures. Text PDFs extracted; scanned/image-only PDFs returned a clear no-OCR error. File layout and column reading order remain a limitation.

Interpretation: structural checks and sampled manual reading support a functioning intake and proposal pipeline. They do not prove that all model paraphrases are semantically correct, or that the two models differ reliably. The deployed browser app has not been migrated to this tooling. The key was read from the user-authorized local ad-detection environment at process start and was not copied into project files or logs.

Evidence: [benchmark code](../tooling/benchmark.mjs), [file tests](../tooling/extract-file.test.mjs), [LLM validator](../tooling/llm-decompose.mjs), [tooling guide](../tooling/README.md).


## E04 — Connected local review flow
Date: 2026-11-17. Status: run.

Question: Can the separate intake and model tooling drive a browser path from source selection through extracted-text preview, source-linked claims, personal reactions, and report export?

- Method: local same-origin Node server with the user-authorized key supplied from the ad-detection environment at process start; browser at `127.0.0.1:4174`, desktop and 390 × 844 mobile; synthetic fictional sample and a temporary TXT policy. Separately exercised Anthropic catalog and arbitrary URL import through the API. No key value was logged or copied.
- Automated checks: `npm test` passed 36/36 after the local API tests were included, with localhost socket permission. The first sandboxed run failed only the five socket-binding tests with `EPERM`; the approved rerun passed. `node --check` passed for browser and server scripts, and `npm run build` copied the static assets.
- Browser result: the fictional sample imported and previewed, then produced 19 source-linked model draft claims. A clarification question was saved, appeared in a partial report, survived refresh, and appeared in a downloaded text report alongside exact quotes and the complete source. TXT upload displayed the expected 252-character extraction preview. Mobile claim reactions appeared within the first viewport; direct mobile report access was checked. A separate read-only agent review prompted navigation-race, partial-analysis, catalog fallback, and preview fixes.
- API result: Anthropic catalog and direct URL intake each returned 40,685 extracted characters. Official sources can still block retrieval; the UI provides the official link and a paste path. Scanned PDFs remain unsupported without OCR.

Interpretation and limits: the connected **local** plumbing works on the exercised paths. The sample claims are unverified paraphrases; this run does not establish legal or semantic accuracy, comprehensive file-format reliability, or a user-study outcome. The private hosted Site still runs the older static interface; the local Node API has not been ported to a hosted Worker.

Evidence: [local API](../scripts/serve.mjs), [browser harness](../app/app.js), [API tests](../scripts/serve.test.mjs), [flow checkpoint](journal/2026-11-17-flow-integration.md).


## E05 — Focused entry flow
Date: 2026-11-17. Status: run.

Question: Can a constrained two-screen entry experience reduce visual clutter while retaining each working import path and the route into claims and report?

Method: rebuilt the local browser entry screens; checked them in the in-app browser at `127.0.0.1:4174` and a separate `localhost:4174` test origin. The latter preserved the earlier saved review. Used a synthetic 859-character TXT policy, a short synthetic paste, and the public TikTok US policy URL. The local Node server received the previously authorized key through its process environment. A read-only sub-agent reviewed screenshots and code; its concrete findings were fixed before the final check. Ran `node --check app/app.js` and `npm run build`.

Observed result: the featured TikTok choice fetched 27,939 characters and reached the source check. The native chooser selected the test TXT file, showed the filename and enabled Continue; Continue reached source check. Model processing produced 12 draft claims, and a synthetic clarification appeared in the partial report. Paste retained its draft across tabs and imported 169 characters. Direct URL import reached source check with 27,939 characters. Upload, Paste, URL, home, source check, and a 390-pixel layout were visually inspected. Invalid file types and files over 12 MB are now rejected at selection/drop. The first model claim on the test document described its title heading, which is an output-quality issue to revisit.

Interpretation and limits: these checks support the local flow and visual hierarchy, not human usability or semantic accuracy. A physical drag gesture, DOCX/PDF/RTF through the browser chooser, and browser print were not exercised in this pass. The private hosted Site still has the earlier static experience. The downstream map, cards, and report still use their previous layout. Evidence: [browser screenshots](assets/index.md), [entry code](../app/app.js), [entry journal](journal/2026-11-17-entry-ux-reset.md).


## E06 — Homepage visual direction gallery
Date: 2026-11-17. Status: run as a design prototype; user selection pending.

Question: Can four mission-derived homepage directions look genuinely different without relying on the serif/off-white language the user rejected?

Method: built a separate local gallery at `/concepts.html` with four switchable visual-only mockups and a short rationale/tradeoff for each. Used the same familiar-policy and own-policy content across directions. A read-only agent critiqued code and screenshots. In the in-app browser at `localhost:4175`, captured all four desktop states, inspected Plain Talk at a 390 × 844 viewport, checked horizontal overflow for all four at that width, tested left-arrow tab switching and the jump-to-mock control, and followed the gallery's link to the working flow. Ran `node --check` and `npm run build`.

Observed result: Open File, Spotlight, Margin Notes, and Plain Talk rendered as distinct compositions and palettes; the gallery switched between them. At 390 pixels, none produced horizontal overflow. Keyboard navigation selected the prior tab, and Jump to mock focused and scrolled the study into view. The working-flow link reached the local intake. Critique prompted revisions to acceptance language, an illustrative claim that had omitted its retention condition, arrow cues, small-text contrast, and the gallery jump control.

Interpretation and limits: this is a visual exploration, not a usability test or an accepted design system. Open File preserves the three familiar starters most prominently; the other styles give more space to the hero. The interactive mock controls inside each study are intentionally inert and labeled visual-only. The existing product UI and private hosted Site have not adopted any of these directions. Evidence: [gallery source](../app/concepts.js), [gallery styles](../app/concepts.css), [screenshots](assets/index.md), [journal](journal/2026-11-17-visual-language-exploration.md).

## E07 — Reading modes and featured-policy cache
Date: 2026-11-18. Status: run locally; cache approach superseded by saved snapshots.

Question: Can a selective overview substantially reduce cards, parallel requests shorten first-time decomposition, and saved featured results make repeat opens immediate without persisting private policy input?

Method: copied the current untracked working app into `codex/reading-modes-cache`; changed model grouping to four concurrent requests; added user and lawyer prompts; cached only server-imported catalog text with exact-text/mode/model analysis keys; prewarmed Meta, TikTok US, and YouTube/Google using the previously authorized API key in the process environment. `npm test` ran locally. Opened the isolated server in Chrome and followed Meta from homepage through preview into user mode.

Observed result: user mode produced 21 Meta cards from 81 units (29.5 seconds), 12 TikTok US cards from 52 units (18.5 seconds), and 30 YouTube/Google cards from 111 units (36.6 seconds). Detailed mode produced 174, 121, and 291 cards respectively in 68.1, 38.6, and 69.0 seconds. All three user runs returned `selective_overview`; one Meta and one TikTok claim received an automated qualifier-review flag. These timings are one live generation run and exclude import time. Browser inspection confirmed the interim mode picker, Meta topic map, selective-coverage notice, and first source-linked claim. After the user's correction, saved snapshots replaced the runtime cache. In a fresh browser origin, the Meta tile opened directly to its saved 21-card overview; switching to saved lawyer mode opened 174 cards. Static-file API tests verified that all three saved policies and both modes are served without a key; the full suite passed 41/41 and `npm run build` copied the saved files.

Interpretation and limits: user mode has substantially fewer cards than detailed mode on the same three saved sources, but no comprehension or semantic-fidelity comparison was run. User mode deliberately omits clauses from cards and must never be represented as full-policy coverage. Exact quotes and validator flags do not establish semantic or legal fidelity. Parallel request timing depends on model service conditions and may face rate limits. Saved snapshots require an explicit refresh when policies change. The deployed static Site has not been updated.

Evidence: [journal](journal/2026-11-18-reading-modes-cache.md), [LLM pipeline](../tooling/llm-decompose.mjs), [saved snapshots](../app/data/featured/), [API tests](../scripts/serve.test.mjs).

## E08 — Progressive card review and shorter overviews
Date: 2026-11-18. Status: run locally; reader evaluation pending.

Question: Can readers choose depth before supplying a policy, work through one constrained claim card at a time, and receive a meaningfully shorter overview from the same source?

Method: implemented progressive homepage mode selection, a claim-only card with progress and four reactions, source-on-demand, and a server-side rewording endpoint. Changed the live user-mode prompt to prioritize broad practices and increased its bounded source group to roughly 14,000 characters. Regenerated only the three featured user analyses from their already saved source text; detailed analyses and original fetch dates were retained. Inspected the local Chrome flow at desktop and 390-pixel widths, including featured and own-policy mode reveals, source disclosure, a live AI rewording, priority border, and Accept progression. Ran `npm test` and `npm run build`.

Observed result: saved user overviews now contain 8 Meta, 4 TikTok US, and 10 YouTube/Google cards, versus 174, 121, and 291 detailed cards. The previous overviews had 21, 12, and 30 cards. All 22 refreshed overview cards match exact source spans and have no automated qualifier flags; 73, 48, and 101 source units respectively remain outside their card sets. The browser showed the updated 8-card Meta overview and a priority card with zero handled before the first reaction; a previous local card test advanced from zero to one handled after Accept. A live Reword action returned a shorter alternate phrasing with an AI rewording cue. The automated suite passed 42/42 and the build succeeded.

Interpretation and limits: this supports a smaller, working card flow; it does not measure comprehension, compare reader preference, or establish paraphrase accuracy. Exact source matching only proves the citation exists. The new source grouping may produce varying numbers of cards for other imported policies, including very short documents. The user-mode overview is selective; the full policy remains available. The hosted static prototype has not been updated. Evidence: [implementation journal](journal/2026-11-18-card-review.md), [saved analyses](../app/data/featured/), [client](../app/app.js), [pipeline](../tooling/llm-decompose.mjs).
