# Graph-paper foundation in the application

## Change

The application now uses a pale graph-paper canvas, white bordered cards, Instrument Sans, and a single blue accent. Entry, reading-depth selection, upload/paste/URL intake, source preview, review, report, and source dialogs share the same styles. The stylesheet replaces accumulated competing overrides with named tokens and component sections.

Review and report share a progress column with topic completion counts. The mobile rules place progress above the content. Reaction selection, explicit confirmation, focused follow-up queues, Undo, separate depth progress, and source disclosures retain their existing behavior.

The font and its SIL Open Font License are bundled in both local serving and static builds, avoiding a third-party font request. `DESIGN.md` records the reusable visual rules.

## Evidence and limits

- Based on merged PR #8, commit `2151d75`.
- The new font-serving test failed with HTTP 404 before implementation, then passed with the font MIME type, TrueType header, and license checked.
- All 90 automated tests passed, including selection/confirmation, unsure follow-up, direct report return, source validation, persistence, and print disclosure handling.
- `npm run build` and `git diff --check` passed. These do not establish browser layout correctness.
- Live browser inspection was blocked by the browser permission gate. No live screenshots, responsive measurements, or accessibility audit were obtained for this implementation. Earlier concept-preview checks are not application verification.
- The local server was restarted to load the font asset manifest. The hosted application was not deployed.

## Takeaways

- Shared tokens and component rules make a visual direction easier to extend without accumulating contradictory overrides.
- Bundling a font is an asset-delivery change as well as a styling change; verify serving, packaging, and licensing together.

