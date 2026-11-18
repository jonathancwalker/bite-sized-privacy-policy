# Bite-sized Privacy Policy — visual assets

Historical assets below are retained; working-prototype screenshots are added after them. Original files remain unchanged. Duplicate byte-identical files and platform icon renditions are listed in [omitted-duplicates.json](omitted-duplicates.json). [Machine-readable asset manifest](manifest.json).

## A001 — privacy review flow

**Type:** Explanatory diagram  
**File:** [privacy-review-flow.svg](source/backfill/privacy-review-flow.svg)

A backfill explanation of the documented design; not a product screenshot or measured result.

Provenance: Created by Codex on 2026-11-12 from the source documents cited in this project’s records.

Usage: Ready as a labeled explanatory graphic; preserve the caption.

Alt text: A backfill explanation of the documented design; not a product screenshot or measured result.

## A002 — privacy review flow

**Type:** Explanatory diagram  
**File:** [privacy-review-flow.png](exports/backfill/privacy-review-flow.png)

A backfill explanation of the documented design; not a product screenshot or measured result.

Provenance: Created by Codex on 2026-11-12 from the source documents cited in this project’s records.

Usage: Ready as a labeled explanatory graphic; preserve the caption.

Alt text: A backfill explanation of the documented design; not a product screenshot or measured result.

## 2026-11-12-report-desktop.png

**Type:** Product screenshot. **File:** [2026-11-12-report-desktop.png](exports/2026-11-12-report-desktop.png).

Caption / alt text: Partial review: one concern/dealbreaker, one question, one comfortable point, and eight skipped or unreviewed points.

Provenance: Codex browser QA of the local prototype, November 12, 2026. Fictional sample policy and synthetic reactions. Usage: ready as labeled prototype evidence; not user-study evidence.

## 2026-11-12-report-complete.png

**Type:** Product screenshot. **File:** [2026-11-12-report-complete.png](exports/2026-11-12-report-complete.png).

Caption / alt text: Completed 11-point sample review, retaining one question and one concern/dealbreaker.

Provenance: Codex browser QA of the local prototype, November 12, 2026. Fictional sample policy and synthetic reactions. Usage: ready as labeled prototype evidence; not user-study evidence.

## 2026-11-12-review-mobile.png

**Type:** Product screenshot. **File:** [2026-11-12-review-mobile.png](exports/2026-11-12-review-mobile.png).

Caption / alt text: A source-linked retention card at a 390 × 844 viewport; before the later mobile report-access button adjustment.

Provenance: Codex browser QA of the local prototype, November 12, 2026. Fictional sample policy and synthetic reactions. Usage: ready as labeled prototype evidence; not user-study evidence.

## Live private prototype

**Type:** Product screenshot. **File:** [Live prototype](exports/2026-11-12-live-prototype.png).

Caption / alt text: The deployed private prototype ready for a pasted policy or the sample. Captured after successful ChatGPT sign-in.

Provenance: Codex browser capture, November 12, 2026. Usage: ready as labeled prototype evidence.

## Intake and claim pipeline

**Type:** Explanatory SVG diagram. **File:** [Intake pipeline](source/2026-11-17-intake-pipeline.svg).

Caption / alt text: Catalog, URL, paste, and file input become a common source record; exact units and citations support draft claims, with structural checks and review flags. The diagram explicitly distinguishes quote matching from semantic correctness.

Provenance: Codex, November 17, 2026, based on the implemented tooling. Usage: ready as a labeled architecture diagram. SVG/XML validated; a PNG export was unavailable on this host.

## Connected local flow screenshots — November 17, 2026

**Type:** Product screenshots from remote Chrome on the local Node preview at `127.0.0.1:4175`. The policy is fictional; the clarification question is a synthetic QA input. These show implementation states, not user-study results. **Usage:** Ready as labeled local-prototype evidence. The privately hosted Site still serves the earlier static flow.

| Step | Screenshot | Caption / alt text |
| --- | --- | --- |
| 1. Choose a source | [Intake](exports/2026-11-17-flow-01-intake.jpg) | Four paths are visible: common policy, link, paste, and file upload. |
| 2. Check extraction | [Source preview](exports/2026-11-17-flow-02-source-preview.jpg) | Extracted fictional policy text appears before model analysis. |
| 3. Review map | [Topic map](exports/2026-11-17-flow-03-topic-map.jpg) | Nineteen draft claims appear with suggested topic counts and a start action. |
| 4. Read a claim | [Claim card](exports/2026-11-17-flow-04-claim-card.jpg) | A model draft claim sits above the exact quoted source and three reactions. |
| 5. Verify source | [Source highlight](exports/2026-11-17-flow-05-source-highlight.jpg) | The cited quote is highlighted in the full extracted policy. |
| 6. Save a question | [Clarification](exports/2026-11-17-flow-06-clarification.jpg) | “Need clarification” opens a field with a synthetic QA question. |
| 7. See report | [Partial report](exports/2026-11-17-flow-07-report.jpg) | The saved question appears in a partial report; 18 untouched claims remain visible as a collapsed section. |

## Focused entry redesign — November 17, 2026

**Type:** Local prototype screenshots. **Provenance:** Codex browser QA on the user's remote Mac, November 17, 2026. The clean first-visit capture used Chrome; the remaining captures used the in-app browser. All test policy text and reactions are synthetic except the public TikTok policy source preview. **Usage:** Ready as labeled implementation evidence, not usability-study evidence. The supplied upload reference remains external reference material and is not included in this bundle.

| Screen | File | Caption / alt text |
| --- | --- | --- |
| Earlier entry | [Before](exports/2026-11-17-flow-01-intake.jpg) | Broad two-column intake with four source methods and decorative card before the reset. |
| First visit | [New landing](exports/2026-11-17-entry-home-clean.jpg) | Narrow landing with three familiar policies and a separate own-policy action. A browser-extension overlay sits outside the product UI at right. |
| Saved review | [Landing with resume](exports/2026-11-17-entry-home.jpg) | The same landing keeps a quiet resume strip above starter policies. |
| Own policy: upload | [Upload tab](exports/2026-11-17-entry-upload.jpg) | Tabs sit above a large dashed drop area with an explicit file chooser; Continue is disabled before selection. |
| Chosen file | [Upload selected](exports/2026-11-17-entry-upload-selected.jpg) | A synthetic TXT file appears below the drop zone; Continue is enabled only after selection. |
| Own policy: paste | [Paste tab](exports/2026-11-17-entry-paste.jpg) | Policy name and a large text area replace the upload controls within the same narrow column. |
| Own policy: URL | [URL tab](exports/2026-11-17-entry-url.jpg) | A single public HTTPS link field and Continue action. |
| Source check | [Extracted policy](exports/2026-11-17-entry-source-check.jpg) | A fetched TikTok US policy reaches the compact source check, with a human-readable extraction warning. |
| Connected result | [Topic map](exports/2026-11-17-entry-to-overview.jpg) · [Claim card](exports/2026-11-17-entry-to-claim.jpg) · [Partial report](exports/2026-11-17-entry-to-report.jpg) | The synthetic TXT policy continued to model draft claims and a report with one saved clarification; downstream layout predates this visual redesign. |
| Narrow viewport | [Landing](exports/2026-11-17-entry-mobile-home.jpg) · [Upload](exports/2026-11-17-entry-mobile-upload.jpg) | 390 × 844 viewport checks found no horizontal overflow. These viewport exports clip the lower scrollable content and are QA-only, not full-page presentation assets. |

## Homepage visual direction studies — November 17, 2026

**Type:** Screenshots of visual-only concept mockups, not finished product UI. **Provenance:** Codex captured the local concept gallery in the in-app browser at `localhost:4175`; user brief and mission are recorded in the [visual exploration journal](../journal/2026-11-17-visual-language-exploration.md). **Usage:** Ready as labeled concept evidence for comparing directions. No style has been selected or deployed.

| Direction | File | Caption / alt text |
| --- | --- | --- |
| Open File · clarity | [Desktop study](exports/2026-11-17-visual-open-file.jpg) | White and ink reference layout with electric blue actions and three numbered policy starters. |
| Spotlight · agency | [Desktop study](exports/2026-11-17-visual-spotlight.jpg) | Charcoal and signal yellow composition with a large headline and direct own-policy action. |
| Margin Notes · context | [Desktop study](exports/2026-11-17-visual-margin-notes.jpg) | Cool gray and cobalt reading layout showing an illustrative exact quote beside a condition-preserving plain-language note. |
| Plain Talk · approachability | [Desktop study](exports/2026-11-17-visual-plain-talk.jpg) · [390-pixel study](exports/2026-11-17-visual-plain-talk-mobile.jpg) | Tomato and navy conversational homepage with an own-policy action and three tactile starter cards; the second image shows its narrow layout. |

## Reaction-focused UX before-states — November 18, 2026

Three supplied screenshots showed the graph-paper application before the interaction revision: small homepage marks with a depth gate, text-link review tools and uncontained topic progress, and a dispersed report with Undo and no reaction map. These images were available as visual references, but their temporary source files were unavailable when archival copying was attempted. No local before-state copies or revised-app screenshots are recorded for this pass.

The supplied Byline reference contributed the idea of a colored block distribution only; its subject matter and authorship metrics were not transferred into the product.

## Personal PDF report — November 18, 2026

[Sample first page](exports/2026-11-18-report-pdf-sample.jpg) is a Poppler rendering of the actual PDF generator output. It uses the saved Instagram overview and explicitly labeled synthetic responses for layout review. All three pages were inspected; this asset shows the priorities, totals, and first concerned claim. It verifies the generated document’s appearance only, not the browser interface or a real reader’s reactions. See the [verification journal](../journal/2026-11-18-priorities-and-pdf-reports.md).
