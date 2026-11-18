# Plainer feature list

This is the shared product backlog and current-state inventory for agents. Update it when a feature is added, changed, rejected, or shipped. **Local** means the working Node app on this branch; the hosted static prototype is an older version and has not received these features. A checked item describes implementation, not a usability or legal-accuracy finding.

Status: **Local** = implemented in the local app; **Partial** = present but needs the listed work; **Planned** = user direction or earlier project proposal, not implemented; **Explore** = an idea to validate before committing to it. Keep product decisions from the user distinct from implementation suggestions.

## Entry and policy intake

| Feature | Status | What exists / next step |
| --- | --- | --- |
| Simple, quiet homepage with three recognizable policy choices | Local | Instagram/Facebook (Meta), TikTok US, and YouTube/Google are shown. The design remains a prototype. |
| Shared graph-paper visual foundation | Local, visual QA pending | Light blue-gray grid, locally bundled Instrument Sans, white bordered cards, and common spacing across intake, review, report, and source dialogs. Review has a contained progress card; the report uses its own reaction summary and claim map. See `DESIGN.md`. |
| Defaulted reading-depth toggle | Local | Quick overview is selected on first visit. A sliding pill switches to Lawyer mode, with a changing explanation underneath. Depth does not block source selection or own-policy input; a saved review sits beside the homepage content. Changing depth preserves drafted text and the selected file. |
| Own-policy intake by upload, paste, or URL | Local | Upload accepts TXT, RTF, DOCX, and text-based PDF; paste and public HTTPS URL are supported. Scanned PDFs need OCR, which is not implemented. |
| Source preview before analysis | Local | Shows extracted title, source, warnings, and expandable text so the reader can check the input. |
| Public URL and local API safeguards | Local | DNS answers are checked and pinned per destination; downloads have size/time limits. The local API checks Host and Origin. Public deployment still needs its own authentication and request limits. |
| Curated official-policy catalog | Local tooling | 15 pointers, including regional variants. A pointer does not guarantee automated fetching; sites can block it. |
| More reliable policy extraction | Partial | HTML and supported files are handled with warnings. Improve blocked-site handling, regional/version detection, tables, and scanned PDFs as specific cases warrant. |

## Analysis and reading depth

| Feature | Status | What exists / next step |
| --- | --- | --- |
| LLM-assisted, source-linked claims | Local | The server proposes claims with exact source spans and optional neighboring context. Validators restrict claims to their assigned group and preserve good entries when another entry is malformed; model calls have deadlines. Exact quote validation does **not** verify a paraphrase's meaning. |
| Quick overview (user mode) | Local, refine | Selects a handful of broad, plain-language themes for an operating understanding. It is intentionally selective; the UI states how many source units were not summarized and keeps the full policy available. Review outputs for repetition, readability, and missing major themes. |
| Lawyer mode (detailed review) | Local, refine | Produces more granular, source-linked claims and exact-source fallback passages. It is not legal review. Card count can still be very high. |
| Faster live decomposition | Local | Bounded model groups run concurrently, up to four requests. Measure and improve wait time on representative own-policy imports if needed. |
| Saved featured analyses | Local | Dated source text and both reading modes are stored for the three homepage policies. Opening them avoids a new import/model call. Refresh deliberately when source policies change; show the original fetch date. This is saved content, not a runtime cache. |
| Refresh commands | Local | `npm run save-featured` refetches source and both modes; `npm run refresh-featured-overviews` updates only overviews from the saved source. Both require a server-side key. |
| Semantic faithfulness and coverage checks | Partial | Source ranges, missing units, and some qualifier risks are tracked. Human review of real policies is still needed for meaning, conditions, exceptions, regional scope, and whether the selected overview themes are useful. |
| Related provisions and cross-clause context | Planned | Show when a definition, exception, or other clause changes the meaning of a claim; preserve those links in the report. Source context exists in the pipeline, but this reader experience is not built. |

## Claim review

| Feature | Status | What exists / next step |
| --- | --- | --- |
| One focused claim card at a time | Local | The card shows the claim, topic and progress. A single click selects Comfortable, Concerned, Unsure, or the separate Skip action; Next confirms, with double-click as a shortcut. Undo is in the active Review menu. Source and Reword use substantial buttons. The reading region scrolls inside a stable workspace; Next preserves page scroll. Rendered layout verification is pending. |
| Personal reactions | Local | Comfortable/Concerned record a reaction to the **claim**, not acceptance or rejection of a policy. Green/red/amber colors and symbols repeat in controls, progress, and the report. Unsure records uncertainty without a note and appears under Needs attention. Skip leaves the claim unfinished in the report. Revisit can change a reaction. |
| Independent progress by reading depth | Local | Change depth from settings or the report without replacing the policy. Each mode retains its own answers, rewordings, cursor, and follow-up queue; returning to a prepared mode needs no model call. Reopening the same featured snapshot also resumes it. Failed or abandoned preparation leaves the previous mode intact. |
| AI rewording | Local, refine | Reword requests a newly structured explanation, which may be longer, and marks the card as AI-reworded. Successful rewording reveals a short animated accuracy note; reduced-motion settings disable animation. Cosmetic token changes or sentences over 35 words trigger one retry; repeated cosmetic output leaves the current wording intact. This heuristic does not verify clarity or meaning. The new wording remains unverified; compare it with the original. Consider whether people need examples or a question path after trying this interaction. |
| Ambient card cues | Local, refine | Explicitly selected focus topics have a slowly moving blue border and Your priority badge; motion is disabled with reduced-motion preferences. Overview and AI rewording retain unverified labels; algorithmic priority alone does not trigger the focus cue. Check with readers whether these cues are noticeable and understandable without implying a risk score. |
| Progress, help, and section checkpoints | Local | A bordered progress card combines reviewed count, individual colored slivers in first-response order, and labeled counts for Comfortable, Concerned, Unsure, Skipped, and Not reviewed. Revisits update an existing sliver, and legacy history uses source order. A How to use modal explains selection, double-click, source checks, rewording, and limits. Cards continue without topic interruptions; older saved checkpoints remain resumable. New reviews open on the first card. |
| Explicit topic preferences | Local, refine | A Priority areas modal stages changes until Done, preserving drafts and selected files. Existing reviews use the same modal through Review menu. Selections remain saved even if an overview has no card for a chosen topic. No preference step blocks the card flow. Selected topics affect order and card highlighting. Topic assignment still uses text matching and should not be interpreted as a risk rating. Preferences do not hide other content. |
| Uncertainty without a note | Local | Unsure uses the same select/confirm interaction as other reactions and stays distinct from Skip. No new note or question entry is offered. Older saved questions, notes, and dealbreaker flags remain readable. |
| Pause, resume, and browser persistence | Local | One policy is saved in local storage at a time, including separate progress for both prepared depths and a resumable follow-up queue. Replacing or clearing it is explicit. Recovery validates saved cards and source ranges; invalid data stays stored with a recovery notice. Private browsing or disabled storage can prevent recovery. |

## Report and trust

| Feature | Status | What exists / next step |
| --- | --- | --- |
| Personal report | Local, refine | A colored summary and category-grouped claim map sit above an expanded Needs attention list (concerned/unsure). Other claim details remain available through the map. Headings name the platform; topic counts use badges. Each square represents one claim, shows its wording in a native hover title and accessible label, and opens that card. No Undo or new note field appears in the report; existing saved notes remain readable. |
| Focused follow-up rounds | Local | Revisit cards includes only unsure cards and is hidden when there are none. Back to report exits immediately without confirming a pending response. Review my concerns includes concerned/unsure cards; Finish skipped cards includes only skipped cards; Continue review includes skipped/unseen cards. Membership is fixed for the round so changing an answer does not skip another card. Previous, Undo, refresh/resume, and returning to the full report retain the correct queue. |
| PDF and text exports | Local, browser QA pending | Download a designed PDF generated entirely in the browser: priorities, five reaction totals, then non-comfortable claims with source/context. Comfortable details are omitted. Concise text export and a separate full source record remain available. Long passages paginate, unsupported glyphs fail clearly with a text alternative, and local libraries/fonts ship in static builds. A three-page PDF sample was rendered and inspected; the browser download interaction and assistive technology remain unchecked. |
| Source access and provenance | Local, refine | A claim can open its location in the extracted policy; saved featured analyses display a fetch date. Make the source viewer easier to scan without turning the main card into a source panel. |
| Honest limits | Local | AI limitations are explained in How to use, Check source, About this report, and exports; Quick overview coverage is selective; full policy is available. Do not label output legally verified or silently treat old snapshots as current. |
| Reader comprehension and usability study | Planned | Test whether the overview gives a working understanding, whether cards feel manageable, and whether people understand Comfortable/Concerned, source cues, the reaction map, and skipped coverage. No such study has been run. |

## Future interaction ideas

- **Suggested approvals — Explore:** group likely acceptable claims using explicit preferences, label the suggestions separately from personal confirmations, and retain source access and reversal. No automatic approval or inferred preference model is implemented.

## Product boundaries and delivery

- Focus on **privacy policies**. Terms of service and other contracts are outside the current scope unless the user asks.
- The reader makes the judgment. Do not imply that reactions change, negotiate, or legally accept the policy.
- Keep the interface constrained and progressively disclosed; avoid decorative marketing copy and generic AI styling. Treat current visuals and copy as iterating.
- The local API needs `OPENAI_API_KEY` for new analyses and rewording. The hosted static prototype is older; publishing the live own-policy path requires a server-backed deployment and secret handling.
- Avoid committing credentials or private policy text. Preserve source URL, fetch date, version/scope when known, and extraction warnings.

## How agents should use this list

1. Check the **status** and source code before treating an item as finished; this file is an inventory, not proof of behavior.
2. For a new feature, add its intended reader outcome and acceptance criteria here, then update its status and limitations after implementation.
3. Do not silently promote an **Explore** item or older proposal to an accepted requirement. Confirm direction through user feedback or current task context.
4. Record substantive decisions and test evidence in `portfolio-docs/`; keep this list concise and actionable.

Implementation map: [`app/app.js`](app/app.js) and [`app/styles.css`](app/styles.css) for the local UI, [`scripts/serve.mjs`](scripts/serve.mjs) for the API, [`tooling/README.md`](tooling/README.md) for intake/decomposition, and [`portfolio-docs/decisions.md`](portfolio-docs/decisions.md) for the decision history.
