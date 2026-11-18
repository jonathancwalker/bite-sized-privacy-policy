# Plainer visual foundation

The interface uses Instrument Sans and white cards with thin blue-gray borders. Pale graph paper sits between opaque reading surfaces across home, review, and report.

## Shared choices

| Role | Value / treatment |
| --- | --- |
| Canvas | `#fcfdff`, 28px low-opacity square grid across screens |
| Surfaces | White, 1px `#cbd8e5` border, 7px corners |
| Primary / secondary text | `#29333e` / `#627285` |
| Action and focus accent | `#4265be`; selected surface `#f0f5ff` |
| Comfortable | Green ink `#205b47`, fill `#a5d6bf`, wash `#eef8f2`, check mark |
| Concerned | Red ink `#7d3038`, fill `#edacb1`, wash `#fff1f2`, exclamation mark |
| Unsure | Amber ink `#6e4d11`, fill `#edcd80`, wash `#fff8e8`, question mark |
| Skipped | Slate fill `#c6d0df`, dash, dashed map border |
| Not reviewed | White square, outline and dot |
| Typeface | Locally bundled Instrument Sans; system sans-serif fallback |
| Hierarchy | 30–40px page headings, 24–34px claims, 13–16px controls/body, 11–13px metadata |

`app/styles.css` owns tokens and component rules. Reaction colors represent the reader's judgment, never an inferred risk score. Pair colors with text or a consistent symbol. New components should reuse these states rather than define a second palette.

## Entry

- Keep the homepage in one centered column capped at 560px, including when a review is saved. Large, optically balanced policy marks and labels share one bordered tile.
- Quick overview is selected by default. The compact pill toggle also offers Lawyer mode. A short explanation changes underneath in primary ink on a uniformly pale blue surface with no accent stripe; the selected pill slides between positions. There is no mandatory selection step.
- Priority areas opens a modal with staged selections and Done/Cancel. Preferences reorder and highlight without removing claims; absent topics remain selected across reload. A compact saved-review card sits below policy entry, showing the platform, reviewed count, and resume/report action without reaction tiles. The entire card is one native button with hover/focus feedback; the action label is not a separate control.
- Upload, Paste, and URL appear immediately when the own-policy panel opens. Source preview still precedes model analysis.

## Review

- A contained, platform-named progress card shows one sliver per card in first-response order, labeled totals, and report access. Revisits update the existing sliver; legacy saved reactions fall back to source order. How to use sits directly below the panel. It becomes compact at narrow widths.
- The claim workspace has a bounded height. Long wording scrolls inside a focusable reading region; the source/reword tools and response dock remain outside that region. Advancing preserves page scroll.
- Comfortable, Concerned, and Unsure are parallel choices. Skip is a separate dashed control beside Back and Next. A single click selects, Next confirms, and double-click remains a shortcut.
- Check source and Reword claim remain prominent. Occasional actions live in Review menu, which appears only on the review and report screens; Undo is available there during active review only. How to use focuses on operating the controls without a separate reading-depth or policy-acceptance paragraph.
- Explicit priority topics get a blue edge with slow, subtle border movement. Rewording adds a tinted accuracy note after success. Reduced-motion preferences disable these animations.

## Report

- Use a platform-specific report heading. Summary, topic map, Needs attention, and utilities each have a bordered surface. Expanded reaction labels use words without leading symbols. Only concerned and unsure claims are expanded below the map; other cards remain reachable through their squares. Each topic heading sits above its full-width tile group, without a card-count badge.
- Each map square represents exactly one claim, grouped by topic. Its symbol/color records a stored response, not a pending selection. Hover exposes wording through a native title; accessible names include the wording and status; click returns to that claim.
- Fine-pointer squares are 28px with 6px gaps; coarse-pointer squares are 44px. Other primary controls are at least 44px high. The entire square is interactive.
- Skipped and unseen remain separate. All wording and source disclosures remain available by revisiting a square and in the complete source record.
- No Undo or new note entry appears on the report; previously saved notes remain visible.

## PDF report

- Generate the file locally in the browser, using self-hosted PDF/font libraries and Instrument Sans. Bundle transitive dependencies into standalone ES modules through the shared serving/build asset reader. Export does not send reactions or source text to a service.
- Put chosen priorities and five response totals first. Include only Concerned and Unsure claim details. End with an unreviewed fraction out of all claims, counting skipped and unseen cards. An empty attention list must not imply the review is complete.
- Preserve exact source wording and cited context with each included claim. Paginate long passages, label continuations, and retain readable margins and page numbers.
- Use the same graph-paper margin, white reading surfaces, and reaction colors as the app. The complete source record remains a separate text download in Review menu.
- Unsupported font glyphs produce a clear error and a text-download alternative rather than silent character replacement. The PDF is not a tagged accessibility document.

## Verification boundary

Automated state/rendering tests and declared-color contrast calculations do not establish rendered usability. Live desktop/mobile layout, long-text scrolling, zoom, keyboard/screen-reader behavior, animation, and the download interaction still require browser inspection. A generated three-page PDF sample has been rendered and visually inspected; this does not verify the browser UI. The implementation has not been deployed.
