# A shared reaction language from intake to report

## Problem and change

The graph-paper foundation still exposed too many similarly styled controls and loose labels. Intake made reading depth a separate gate. Review placed source/reword actions below their importance, gave Skip the same prominence as a personal judgment, and moved the response area when wording changed. The report lacked a graphic summary that connected back to individual claims.

- Intake defaults to Quick overview with a descriptive pill toggle. Upload, Paste, and URL are available as soon as the own-policy disclosure opens. Larger policy marks and labels share a single bordered tile.
- Optional focus choices sit in a collapsed disclosure, apply to new reviews, and reorder/highlight without hiding claims. Existing reviews retain a focus settings route.
- Comfortable, Concerned, and Unsure share green/red/amber colors and symbols across the response controls, progress stack, and report map. Skip is separate, and unreviewed is distinct from skipped.
- Claim wording has its own scrollable reading region, while tools and response controls occupy stable rows. Next no longer scrolls the page to the header.
- Source and Reword use full buttons. A successful reword reveals an accuracy note; explicitly selected focus topics get a brief arrival treatment. Both animations honor reduced motion.
- Occasional actions move into Review menu. Undo is offered during active review, not in the report. Existing saved notes remain readable without new note entry.
- A report square represents one claim and opens that claim. Topic rows and explicit accessible labels keep the map connected to the detailed report. The report identifies the policy independently of the application header for print.

## Design rationale

The block-distribution reference informed the report's visual structure only. Each square maps to a claim rather than an arbitrary percentage or word count. Colors describe personal reactions, not policy risk. A symbol accompanies each reaction, and labeled counts provide a textual summary.

Focus is optional because making personalization another required step would recreate the intake friction. Stable workspace height addresses pointer travel; a scrollable, focusable reading region accommodates long claims instead of truncating them. Browser verification is still required to assess that tradeoff on small screens and at zoom.

## Evidence

- [Before-state references and archive gap](../assets/index.md#reaction-focused-ux-before-states--november-18-2026).
- Seven new acceptance cases were observed failing before implementation: immediate intake, draft-preserving depth changes, direct featured selection, focus propagation, map status/navigation, report Undo removal, and reword success feedback.
- Additional failing regressions reproduced the Next scroll reset and a missing policy name in the printable report, and duplicate own-policy import errors before their fixes.
- All 100 automated tests pass. Tests exercise real client state/render functions in a Node VM; they do not simulate browser layout.
- Build and whitespace checks pass. Declared reaction text/surface colors exceed 4.5:1 after adjustments; [contrast calculations](../evidence/2026-11-18-reaction-contrast.json) cover those six pairs only.
- Live browser inspection was blocked by the approval gate. No responsive measurements, animation inspection, screen-reader test, or rendered print check was performed. No live model request or new policy decomposition was needed; the reword feedback case uses a stubbed response.
- No deployment or usability study was performed.

## Takeaways

- A visual summary should preserve identity: one report square maps to one claim, so the summary can become navigation rather than decoration.
- State tests prove selection and navigation rules; rendered inspection is still needed to establish layout stability and accessibility.
