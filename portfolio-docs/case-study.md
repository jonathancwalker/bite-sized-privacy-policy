# Bite-sized Privacy Policy

Evidence-backed working draft · updated 2026-11-17

Help people understand long policies through source-linked points, progressive reactions, explicit preferences, and a personal decision report.

## Role and context

The user originated the concept, agreed to replace approval language with comfort/clarification language, proposed checkpoints and preference onboarding, and planned to sketch. Codex raised risks and recorded the evolving flow.

## Development and iteration

The discussion moved from approving/disapproving extracted claims toward a decision-support interface that does not imply a clause has been legally negotiated. The user favored three simple reactions, progressively revealed options, linked provisions, and checkpoints to prevent an overwhelming stack of cards. Privacy policies were chosen as the first scope, ending in a report that retains concerns, skipped topics, and unanswered questions.

The detailed choices and their sources are retained in [decisions.md](decisions.md).

## What the evidence supports

A working prototype now supports a complete review from pasted text to a downloadable report. It is privately deployed, with six passing automated tests and browser checks covering a complete sample review and a separate custom policy. No human usability study has been conducted.

**Planned interaction comparison.** Compare the short guided review with a plain-language summary for speed, understanding of linked provisions, and unresolved questions. No test was run in the reviewed record. Evidence: [README.md](evidence/project-records/README.md).

## Visual story

Use the captioned [asset register](assets/index.md) to select inputs, iterations, outputs, and explanatory graphics. Keep labels for mockups, simulated conditions, historical reports, and newly rendered captures.

## Remaining evidence

- User sketches have not been found or attached.
- Hosted model integration, extraction-quality evaluation against real policies, and user-study results remain open.

Personal reflections have not been invented. The record describes observed iteration and stated reasoning; any first-person learning statement should be grounded in the user’s own account.


## First implementation milestone

The user then prioritized feeling the full flow and explicitly authorized autonomous implementation with smaller-agent critique. Codex built the interface, delegated the segmentation engine and independent review, and fixed findings through a second review pass. Paragraph-first segmentation replaced an overly fragmented 33-point sample with 11 source-linked points. Private browser storage makes pause/resume functional without an account database or analysis API.

The prototype retains a deliberate limitation: it presents exact policy passages with keyword-based topic labels, rather than generated plain-language claims. This enables evaluation of the interaction while preserving source wording, but does not establish policy understanding or semantic extraction quality. The next iteration should be driven by actual use and an explicit choice of claim-generation approach.

See [working milestone](journal/2026-11-12-working-prototype.md), [verification](experiments.md#e02--working-prototype-verification), and [captured interface assets](assets/index.md). Synthetic QA reactions shown in screenshots are Codex test inputs, not the user's personal privacy judgments.


## Intake and claim parsing milestone

On November 17, the user shifted attention from review-screen details to the quality and reach of the policy intake layer. They requested common official sources, URL/paste/file import, and model-based decomposition that keeps conditions and source context. Codex built a separate toolchain and tested it against synthetic cases and a limited public policy sample. Three smaller agents contributed catalog research, file extraction, decomposition, and critique.

The work produced a testable split between lossless source units and draft plain-language claims. The source layer retains exact text and offsets; model proposals cite exact passages and neighboring context. A critique changed the validator so context must actually belong to the cited neighbor, and so partial results cannot be called structurally complete. A structural benchmark passed, while semantic accuracy remains open. At that checkpoint, the private review interface was separate from this pipeline. See [E03](experiments.md#e03--intake-and-llm-decomposition-benchmark).

## Connected local flow

The user then put further benchmarks aside and asked to test the plumbing with a simple front end. Codex connected the intake and model modules to a local browser flow: choose a common policy, enter a URL, paste, or upload a file; check the extracted text; review source-linked draft claims; record reactions; and export a report. A smaller agent built and tested the local API, while another independently reviewed flow and mobile behavior. A browser check completed the sample path and confirmed a saved clarification survived refresh and appeared in the exported report. The new flow is local and uses a server-only API key; the private hosted Site still serves the earlier static version. See [D06](decisions.md#d06--test-the-connected-flow-before-further-benchmarking) and [E04](experiments.md#e04--connected-local-review-flow).

## Entry experience reset

After seeing the connected flow, the user said its broad intake screen looked “very AI” and supplied a structural reference for tabs above a large upload area. They proposed a narrow first screen with three familiar policies and a separate own-policy path to reduce cold start and use progressive disclosure. Codex rebuilt the local entry screens and kept the working import and claim pipeline attached. A critique pass led to tighter vertical spacing, clearer in-app navigation cues, early file validation, and keyboard/focus improvements. A synthetic TXT upload reached the report with a saved question; direct paste and URL imports reached the extracted-text check. This is implementation evidence, not a user usability result. The downstream map, cards, and report still need the same visual treatment. See [D07](decisions.md#d07--replace-the-intake-dashboard-with-two-focused-screens), [E05](experiments.md#e05--focused-entry-flow), and [screenshots](assets/index.md).

## Visual language exploration

The user then rejected the serif/off-white aesthetic as “very AI-esque” and asked for several mission-derived homepage directions before selecting a system. Codex made a separate local comparison gallery with four visual-only studies: Open File for inspectable clarity, Spotlight for agency, Margin Notes for source context, and Plain Talk for approachability. A critique pass corrected acceptance-sounding wording and an illustrative paraphrase that initially lost a retention limit and legal exception. Browser captures and a narrow-width check show the alternatives as distinct layouts; no user preference or comprehension result has been measured, and no direction has been applied to the product. See [D08](decisions.md#d08--explore-mission-led-homepage-voices), [E06](experiments.md#e06--homepage-visual-direction-gallery), and [concept screenshots](assets/index.md).
