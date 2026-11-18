# Bite-sized Privacy Policy — decisions and changes of direction

Reconstructed 2026-11-12. Historical acceptance/proposal status is stated in the record; backfill date is not the original decision date.

## D01 — Use comfort, not approval

User-agreed labels: Comfortable, Need clarification, Not comfortable. Deeper actions can simplify, save a question, or mark a concern/dealbreaker without implying that the agreement changes.

Evidence: [Reviewed project conversations](evidence/sources.md#conversations).

## D02 — Personalize attention without hiding information

Use explicit editable priorities to order or highlight points, retain all material and linked exceptions, and show unreviewed coverage in the report.

Evidence: [README.md](evidence/project-records/README.md).

## D03 — Prototype a short end-to-end review

Proposed first test: one policy, 8–12 source-linked points, a checkpoint, and a decision report. The user chose to sketch before returning.

Evidence: [Reviewed project conversations](evidence/sources.md#conversations).


## D04 — Ship the full interaction with source-first passages
Date: 2026-11-12. Status: implemented prototype choice, open to user iteration.

The user asked Codex to move autonomously from the README to a usable paste → cards → reactions → report flow, and explicitly requested smaller sub-agents for testing and critique. Codex selected dependency-free browser JavaScript with local persistence and private Sites hosting. There was no selected model or API credential. The first version uses exact source ranges and keyword-based topics rather than inventing simplifications. This provides a real interaction baseline but leaves AI claim generation and verified cross-clause dependencies for a subsequent iteration. This is an assistant implementation decision, not evidence of user preference against AI.

The engine initially produced 33 fragments from the sample. Critique of pacing led to paragraph-first segmentation, yielding 11 points while preserving every character. Independent review led to checkpoint restoration, earlier-question labeling after reaction changes, keyboard-accessible import, and a clearer skipped-material heading.

Evidence: [milestone](journal/2026-11-12-working-prototype.md), [verification](experiments.md#e02--working-prototype-verification).


## D05 — Make decomposition source-grounded and model-assisted
Date: 2026-11-17. Status: implemented in local tooling; browser integration pending UX direction.

The user narrowed the next scope to privacy policies and three intake paths: official common-policy selection, a policy URL, or pasted/uploaded content (PDF, DOCX, TXT, RTF). They emphasized genuinely bite-sized, coherent decomposition and preserving conditions and context. After learning the browser prototype used keyword rules, the user explicitly asked for an LLM-based parser and benchmarks. The user later authorized using an OpenAI key from the ad-detection project's local environment for tests.

Codex implemented a common source record, lossless small units with headings and neighboring context, and structured LLM claim proposals with exact quote references. Quoted text and source offsets are validated, while paraphrases remain marked unverified. This avoids claiming that quote matching proves semantic accuracy. The existing browser UX is unchanged while the user considers its next iteration.

Alternatives actually compared: the prior paragraph/keyword splitter, the new source-first splitter, GPT-6.1 Sol, and GPT-6 Luna on synthetic cases. Both models met structural grounding checks in the initial five-case run. Sol resolved a defined term in its prose where Luna largely echoed the source; this single observation does not establish a general winner. A separate embedded-instruction case and a limited public Anthropic policy smoke test used Sol.

Evidence: [experiment](experiments.md#e03--intake-and-llm-decomposition-benchmark), [tooling specification](../tooling/README.md).


## D06 — Test the connected flow before further benchmarking
Date: 2026-11-17. Status: accepted for the current iteration.

The user corrected the proposed gold-set-first priority: benchmarks are outside the immediate scope, and they want a good working flow. They clarified that a simple or fake front end is enough now because the plumbing is what they want to test. Codex therefore connected the existing intake and model modules to a local browser harness with an extraction preview, claim reactions, and report export. This uses the authorized key in the local server process only. The hosted Site remains on its earlier static version because the new API requires a server-backed deployment and hosted secret configuration.

Evidence: [flow checkpoint](journal/2026-11-17-flow-integration.md), [local verification](experiments.md#e04--connected-local-review-flow).


## D07 — Replace the intake dashboard with two focused screens
Date: 2026-11-17. Status: implemented local mock, pending user feedback.

The user called the broad local interface “very AI” and proposed a quieter hierarchy: “Privacy policies, bite-sized” first, three familiar policies to reduce cold start, and a separate “put in my own” path. On that path they wanted Upload, Paste, and URL tabs, with a large drop zone and a native file chooser. They supplied an upload screenshot for structure rather than aesthetic copying and emphasized progressive disclosure and a narrow centered layout.

Codex replaced the four-way intake panel and decorative hero with two constrained screens, then made the extracted-text check a compact next step. The three starters are Meta, TikTok US, and YouTube/Google because each imported successfully in a local smoke test; this selection is provisional. Upload waits for an explicit Continue after selection. Reactions and the report remain connected while their visual redesign awaits the next pass.

Alternatives actually considered: retaining the original four-input grid versus separating starter selection from own-policy input; the latter follows the user's proposed hierarchy. The attached reference was used only for tab/drop-zone placement. The critique pass tightened above-the-fold spacing, changed starter arrows to in-app arrows, added early file validation, and restored focus after navigation.

Attribution: interaction direction and rationale from the user; implementation and provisional starter choice from Codex; read-only critique by a sub-agent. Evidence: [entry journal](journal/2026-11-17-entry-ux-reset.md), [browser check](experiments.md#e05--focused-entry-flow), [before and after screenshots](assets/index.md).


## D08 — Explore mission-led homepage voices
Date: 2026-11-17. Status: proposed; no visual direction selected.

The user rejected the serif/off-white treatment as “very AI-esque” and asked for three to five named homepage concepts whose design language follows from the mission. They wanted to compare styles in a component before developing one further. Codex kept the connected product flow intact and made a separate visual-only gallery with four approaches: Open File (clarity), Spotlight (agency), Margin Notes (context), and Plain Talk (approachability). The same policy starters and own-policy path appear in each, but hierarchy, copy, color, typography, and layout vary.

These are alternatives for discussion, not a decision about the final brand. Open File most visibly preserves the prior starter-first hierarchy. Spotlight makes the mission energetic but may feel urgent; Margin Notes makes source grounding tangible but may feel editorial; Plain Talk feels accessible but risks sounding too casual. The user has not yet evaluated or selected a direction.

Attribution: rejection of the prior aesthetic and mission-first brief from the user; four proposals and gallery implementation from Codex; read-only critique by a sub-agent. Evidence: [journal](journal/2026-11-17-visual-language-exploration.md), [browser experiment](experiments.md#e06--homepage-visual-direction-gallery), [concept screenshots](assets/index.md).

## D09 — Try two reading modes with a selective overview
Date: 2026-11-18. Status: proposed in isolated worktree; pending user evaluation.

The user identified both long processing time and excessive card volume. They proposed a faithful, granular lawyer mode and a plainer, intent-focused user mode. Codex interpreted the card-volume concern as a reason for user mode to show fewer selected takeaways while keeping the whole source accessible. Lawyer mode retains detailed source-linked cards. User mode visibly labels unsummarized source units so completion of its cards cannot imply comprehensive policy review. The exact granularity and names remain open to user feedback.

Attribution: modes and product rationale from the user; grouping, disclosure, and implementation from Codex. Evidence: [journal](journal/2026-11-18-reading-modes-cache.md), [pipeline](../tooling/llm-decompose.mjs), [interface](../app/app.js).

## D10 — Cache only official catalog text and matching analyses
Date: 2026-11-18. Status: superseded by D11.

The user proposed saving results for the familiar homepage policies and avoiding duplicate calls. Codex chose a 24-hour local import cache plus versioned analysis keys for exact text, model, and mode. The server first verifies that analysis text matches its own catalog import; arbitrary pasted, uploaded, or edited text does not enter the persistent cache. The cache is local and ignored by Git. A prewarm command makes initial featured-policy visits fast after preparation. This is not yet a hosted deployment strategy.

The user then clarified that saving prepared results was sufficient; the runtime cache and prewarm command were removed. Attribution: caching opportunity from the user; interim cache lifetime, keying, and privacy boundary from Codex. Evidence: [journal](journal/2026-11-18-reading-modes-cache.md), [experiment](experiments.md#e07--reading-modes-and-featured-policy-cache).

## D11 — Save featured results and open them directly
Date: 2026-11-18. Status: implemented in isolated worktree; pending user evaluation.

The user explicitly preferred saving prepared results over a runtime cache so featured policies can open directly. Codex saved dated, versioned source and both mode analyses for Meta, TikTok US, and YouTube/Google as static files. Clicking a homepage tile opens the saved user overview without source fetching or model generation; switching to lawyer mode reads the same saved file. A deliberate `save-featured` command refreshes snapshots. New source versions do not update automatically, so the interface displays the fetch date and points readers to the original page.

Attribution: saved-results direction from the user; snapshot format, refresh command, and direct route from Codex. Evidence: [saved files](../app/data/featured/), [interface](../app/app.js), [refresh script](../scripts/save-featured.mjs), [experiment](experiments.md#e07--reading-modes-and-featured-policy-cache).
