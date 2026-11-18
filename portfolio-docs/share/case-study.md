# From fine print to a personal review

Bite-sized Privacy Policy helps someone read a policy in smaller source-linked pieces, record their own reactions, and keep a report of concerns, questions, comfortable points, and unfinished material.

The user originated the concept and favored comfort and clarification over language implying contractual approval. They then asked for a working end-to-end prototype and explicitly requested smaller-agent critique. Codex implemented a dependency-free browser app, delegated source segmentation and independent review, and tested the flow in Chrome.

The first engine fragmented the sample into 33 cards. Paragraph-first segmentation reduced it to 11. Review identified checkpoint recovery, contextual labeling of earlier questions, keyboard access to file import, and skipped-material labeling; those were corrected. Browser QA also restored report access during mobile review.

The delivered prototype accepts pasted policies, supports topic priorities and source inspection, saves reactions locally, pauses at section checkpoints, and downloads a complete text report. It is privately hosted. [Start screen](2026-11-12-live-prototype.png), [complete report](2026-11-12-report-complete.png), and [mobile card](2026-11-12-review-mobile.png) show the actual interface.

Six automated tests passed for source preservation and segmentation. A complete 11-point sample review and a custom three-point policy were exercised in the browser. Downloaded report content was checked against the fictional source. These are implementation checks, not evidence of improved human understanding.

The first hosted extraction approach uses exact passages with keyword-based topic suggestions. It does not produce plain-language claims or verify legal dependencies.


## Intelligent intake milestone

On November 17, the user narrowed the next build to privacy policies and requested catalog, URL, paste, and file intake, followed by intelligent decomposition with source context. Codex built these as separate local tools and a six-case benchmark, leaving the browser experience stable while the user considers it. [Pipeline diagram](2026-11-17-intake-pipeline.svg).

A public Anthropic policy extracted into 76 exact source units. A limited model sample produced draft claims with source quotes and warnings. Both Sol and Luna met structural quote checks on five synthetic cases; a manual defined-term example suggested Sol gave a clearer paraphrase. These observations do not establish general semantic accuracy.

## Connected local flow and screenshots

The user then said further benchmarking could wait and clarified that a simple front end was enough to test the plumbing. Codex connected the intake and model modules to a local browser flow, preserving the hosted static version. A smaller agent implemented the local API, and independent critique identified and helped correct navigation races, partial-analysis messaging, and source preview gaps.

In remote Chrome, the fictional sample moved through [source selection](2026-11-17-flow-01-intake.jpg), [extraction preview](2026-11-17-flow-02-source-preview.jpg), [topic map](2026-11-17-flow-03-topic-map.jpg), [source-linked claim](2026-11-17-flow-04-claim-card.jpg), [original-text highlight](2026-11-17-flow-05-source-highlight.jpg), [saved clarification](2026-11-17-flow-06-clarification.jpg), and [partial report](2026-11-17-flow-07-report.jpg). The model produced 19 draft claims from the fictional sample; a synthetic clarification appeared in the report. These captures show a working local flow, not measured user comprehension or verified legal accuracy.
