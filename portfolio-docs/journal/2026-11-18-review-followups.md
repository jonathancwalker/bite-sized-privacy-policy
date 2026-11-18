# Uncertainty, focused follow-ups, and depth continuity

## Behavior

- I’m unsure records uncertainty without a note or question field. It uses the same selection, confirmation, double-click, and Undo flow as other reactions and appears under Needs attention.
- The report launches rounds for rejected/unsure cards, skipped cards, or all unfinished cards. Queue membership stays fixed while answers change. Previous and Undo stay within that round; refresh restores it; completion returns to the full report.
- Each reading depth keeps independent answers, rewordings, topic order, position, and follow-up queue for the same policy. Switching never infers agreement with more detailed claims. Reopening the same featured source snapshot also preserves both depths.
- Preparing a missing depth uses the saved featured analysis or the existing decomposition API. Returning to a prepared depth needs no request. Failed or abandoned preparation leaves the earlier review usable.
- Stored inactive analyses are validated against the shared original source. Invalid saved source data is not silently trusted.

## Implementation choices

- Reuse the existing clarification reaction as Unsure, retaining old notes/questions for compatibility without adding new input fields.
- Snapshot the round’s card IDs rather than filtering after every answer; otherwise resolving a card could shift the next item under the cursor.
- Keep the source once and store only per-depth analysis and review state in inactive snapshots. The existing saved-review format remains readable.
- Keep the report and export scoped to the active depth. Preparing or returning to another depth does not merge responses.
- Keep four reaction buttons together; move Reword beside source access and allow that row to wrap on narrow screens.

## Verification

- Six concrete regression cases failed before implementation: selecting uncertainty, concern-only progression, unfinished-round resume, skipped-only progression, independent depth restoration, and invalid inactive-source recovery.
- An additional homepage regression failed before fixing same-policy depth reopening.
- Ten added tests cover the new behavior, failure/recovery, late results after leaving depth selection, and cached depth reuse without a request.
- All 86 automated tests and the static build pass; whitespace validation passes.
- Browser rendering, mobile layout, and real pointer timing were not verified in this pass. The client tests run actual application logic in a minimal DOM fixture, not a browser. No new live model evaluation was needed for these state/navigation changes.

## Journal takeaways

- Stable queue membership prevents navigation errors when an action changes the filter that originally selected the items.
- Different reading depths are distinct representations: share their source, but keep decisions and progress separate.
