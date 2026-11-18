# Quieter review controls and a portable personal report

## Interaction changes

- Priority areas opens a modal with staged selections and Done/Cancel instead of a native triangle disclosure. It preserves drafts and selected files. Priorities survive reload even when a selective overview contains no corresponding claim.
- Quick overview and Lawyer mode share a sliding pill and a changing, primary-ink explanation. Saved reviews sit beside homepage content, then below it on narrow screens.
- Platform names identify the review and report directly. Repeated reading-depth labels, visible claim position, model-status labels, and selection prompts are removed from the card. Source/AI limits remain in How to use, Check source, About this report, and exports.
- Priority cards use a subtle moving border. Reduced-motion preferences disable it and the depth transitions.
- Progress uses one sliver per claim. A saved per-depth order records the first confirmed response; revisits update the existing slot and Undo restores the prior order. Earlier saved reviews have no timestamps, so their existing reactions fall back to source order.
- The report keeps its clickable topic map and an expanded Needs attention list. Small gray counts become number badges. Comfortable, skipped, and unseen details are available through their squares without duplicate lists below.

## PDF export

PDF generation runs entirely in the browser. The PDF and font libraries are self-hosted and loaded only for export; reactions and source text are not submitted to an export service. A shared asset manifest includes those libraries in both local serving and static builds, along with their license notices.

The document leads with priorities and all five response totals, then lists concerned, unsure, skipped, and unseen claims with their source wording and cited context. Comfortable details are omitted. A concise text report and separate complete source record remain available. Unsupported font characters fail explicitly with a text-download alternative rather than silently changing policy wording.

The layout carries the application’s graph-paper margins, white reading surfaces, Instrument Sans, and reaction colors into letter-sized pages. Source passages paginate with continuation labels. Blank source paragraphs do not create excess vertical gaps; tiny continuation fragments are avoided.

## Verification

- Eight acceptance cases were observed failing before their fixes: modal priorities, changing mode explanation, saved-review placement, quiet review/help, response order, undo order, report simplification, and concise export content.
- A separate failing case demonstrated priority loss after reload when a topic was absent. A failing asset test reproduced unavailable PDF library routes.
- PDF tests cover priorities and totals, omission of comfortable details, retained source endings across multiple pages, text positions inside page margins, and explicit unsupported-glyph failure.
- All 113 automated tests pass; the static build and whitespace checks pass.
- A sample generated from the saved Instagram overview uses explicitly labeled synthetic responses: four comfortable, one concerned, one unsure, one skipped, and one untouched. All three final PDF pages were rendered with Poppler and inspected. The initial rendering exposed excess paragraph spacing and a one-line continuation; the final layout corrected them. This is export-layout evidence, not a comprehension study or assessment of the policy.
- The PDF has extractable text but is not a tagged accessibility document. Assistive-technology behavior has not been verified.
- Browser access remains blocked by the approval gate. Homepage/review layout, border/depth animation, modal keyboard behavior, and the actual browser download interaction were not inspected live. No model calls or deployment were performed.

## Takeaways

- A history visualization requires stored order; a current-state snapshot cannot reconstruct past interaction chronology.
- Document QA needs both content checks and rendered-page inspection: complete text can still produce awkward pagination.
