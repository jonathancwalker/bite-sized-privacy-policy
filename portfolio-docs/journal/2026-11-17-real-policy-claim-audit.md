# Real-policy claim audit

The user paused UI selection while making sketches and asked Codex to evaluate the current policy-to-claim plumbing on four named official privacy policies: Meta, OpenAI, TikTok, and Anthropic. The practical quality bar is short, human-readable cards that preserve source meaning and context. They authorized an autonomous critique-and-fix loop with sub-agents. Source: current project conversation, November 17, 2026.

Before this audit, the model pipeline targeted one or more claims per lossless source unit, with exact quote validation. The earlier synthetic browser run produced a card about a document title heading, a sign that structural grounding alone does not guarantee a useful card. The initial tooling and limitations are described in [E03](../experiments.md#e03--intake-and-llm-decomposition-benchmark) and [E05](../experiments.md#e05--focused-entry-flow). This audit will distinguish extraction failures from claim-quality failures and preserve regional/version provenance for each real policy.

## Four-policy baseline and revision

Official pages were captured on November 17, 2026, and run through the current intake/decomposition pipeline. Full source and output JSON were kept in `/tmp`, outside this portfolio. The policies were Meta (49,291 extracted characters), TikTok US (27,939), OpenAI US (27,431; official page captured in the browser because direct Node fetch returned HTTP 403), and Anthropic (40,685). Exact source-unit reconstruction passed for all four. The OpenAI page observed in the browser was the US policy updated September 10, 2026; regional variants must not be conflated.

| Policy | Baseline claims | Revised claims | Revised median words | Revised nonclaim units |
| --- | ---: | ---: | ---: | ---: |
| Meta | 260 | 186 | 22 | 3 |
| OpenAI US | 140 | 128 | 22 | 2 |
| TikTok US | 135 | 122 | 22 | 1 |
| Anthropic | 182 | 175 | 22 | 2 |

The initial prompts forced claims from every unit, including headings and navigation. The revision lets the model explicitly mark whole non-substantive units, requests shorter direct claims, and omits those units from review cards while retaining source text. It also narrows text-only heading recognition. Revised runs had no failed or rejected claims and no unaccounted units; this is structural coverage, not semantic verification.

Human critique found a deeper Meta issue: repeated information-category lists appear under different processing purposes. The text-only heading parser had promoted category headings to top-level sections, losing the governing purpose. Some baseline claims borrowed a purpose from weak adjacent context despite an exact quote. A further parser revision identifies Meta's purpose headings from their nearby explanatory label and recognizes country subheadings in Anthropic's addenda. A focused Meta rerun is underway to check this change. The remaining card volume and possible paraphrase errors still require review before claiming strong semantic accuracy.

The final-parser reruns completed on all four saved sources:

| Policy | Final claims | Nonclaim units | Median / p90 / maximum claim words | Unaccounted units |
| --- | ---: | ---: | --- | ---: |
| Meta | 179 | 4 | 24 / 28 / 31 | 0 |
| OpenAI US | 128 | 4 | 22 / 26 / 33 | 0 |
| TikTok US | 121 | 2 | 22 / 27 / 32 | 0 |
| Anthropic | 167 | 4 | 22 / 28 / 31 | 0 |

All four had exact source coverage, no failed batches or rejected claims, and no obvious heading/table-label meta-cards in a wording scan. Purpose sections now appear as separate Meta paths, and sampled category-list claims under marketing, anonymization, social-good research, and legal obligations carry the appropriate purpose. Anthropic's Canada, Brazil, and Republic of Korea addenda now have separate section paths. The source quote alone does not always contain the governing heading; the section path supplies part of the context, so the final product should expose that path beside the quote. Card volume remains high for whole policies, and exact quote checks cannot prove every paraphrase is faithful. These were focused manual samples, not a measured semantic accuracy rate. The final local test suite passed 39/39.

## Homepage sketch iteration

The user sketched a narrow homepage with recognizable policy logos in a row to help people start, followed by an expandable “Review my own policy” control. Implemented the row using the existing Instagram/Meta, TikTok US, and YouTube/Google catalog entries and placed upload, paste, and URL tabs inside an animated disclosure on the homepage. The marks are simple inline approximations for this flow prototype. Browser inspection confirmed the disclosure opens and the paste tab switches; a complete live policy run was not repeated in this iteration.

## Plainer visual refinement

The user liked the sketch-based flow and requested more space between the title and policy choices, removal of “How it works,” and a color and type treatment that feels more like Plainer. The homepage now uses a cool neutral background, muted blue-gray accents, and a sans-serif headline with a larger gap before the policy choices. The revised homepage was inspected in the local browser; the expandable input remains in place. Color and typography remain a design direction for iteration.

## Homepage proportions

On November 18, the user agreed with the critique that the headline felt heavy and the own-policy option needed equal weight, and asked for a self-reviewed refinement. Reduced the headline size and weight, brought the policy section closer, made the logo tiles slightly shallower, and gave the own-policy disclosure a stronger boundary and larger target. Inspected the homepage and opened the disclosure in the local browser. The fictional sample remains available while real-policy imports are still being refined.

## Reading flow alignment — November 18

The user asked to carry the homepage's simplicity across the other screens and review screenshots of each. The prior flow used a wide dashboard, serif claim text, multiple summaries and explanatory panels. The revised topic screen uses one narrow column with optional topic priorities, the reading screen keeps a compact topic sidebar and original wording, and the checkpoint and report use the same sans-serif type and muted blue-gray palette. The source-check screen and upload/paste/URL tabs remain in the flow. Screenshots of the local prototype are saved in [flow captures](../assets/exports/2026-11-18-flow/); screenshots use fictional example policies. A real two-claim example was submitted through paste, decomposed, and taken through a reaction, checkpoint, and partial report. This is an interaction check, not a user study.
