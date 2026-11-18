# Plainer visual foundation

The interface uses pale graph paper, Instrument Sans, and white cards with thin blue-gray borders. Reading, progress, controls, and report content sit on opaque surfaces. Reserve the grid for space between them.

## Shared choices

| Role | Value / treatment |
| --- | --- |
| Canvas | `#fcfdff`, 28px square grid at low opacity |
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

- Large, optically balanced policy marks and labels share one bordered tile.
- Quick overview is selected by default. The compact pill toggle also offers Detailed review, with no subtitle or mandatory selection step.
- Focus areas is an optional, collapsed disclosure. It applies to new reviews and never gates intake; preferences reorder and highlight without removing claims.
- Upload, Paste, and URL appear immediately when the own-policy panel opens. Source preview still precedes model analysis.

## Review

- A contained progress card shows the reaction distribution, labeled counts, reading depth, and report access. It becomes compact at narrow widths.
- The claim workspace has a bounded height. Long wording scrolls inside a focusable reading region; the source/reword tools and response dock remain outside that region. Advancing preserves page scroll.
- Comfortable, Concerned, and Unsure are parallel choices. Skip is a separate dashed control beside Back and Next. A single click selects, Next confirms, and double-click remains a shortcut.
- Check source and Reword claim remain prominent. Occasional actions live in Review menu; Undo is available there during active review only.
- Explicit focus topics get a blue edge and short arrival animation. Rewording adds a tinted accuracy note after success. Reduced-motion preferences disable these animations.

## Report

- Summary, topic map, claim details, and utilities each have a bordered surface.
- Each map square represents exactly one claim, grouped by topic. Its symbol/color records a stored response, not a pending selection. Hover exposes wording through a native title; accessible names include the wording and status; click returns to that claim.
- Fine-pointer squares are 28px with 6px gaps; coarse-pointer squares are 44px. Other primary controls are at least 44px high. The entire square is interactive.
- Skipped and unseen remain separate. All wording and source disclosures remain available in the detailed groups and export.
- No Undo or new note entry appears on the report; previously saved notes remain visible.

## Verification boundary

Automated state/rendering tests and declared-color contrast calculations do not establish rendered usability. Live desktop/mobile layout, long-text scrolling, zoom, keyboard/screen-reader behavior, animation, and print appearance still require browser inspection. The implementation has not been deployed.
