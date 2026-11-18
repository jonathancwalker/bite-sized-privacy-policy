# Plainer visual foundation

The interface uses a light graph-paper background, Instrument Sans, and white cards with thin blue-gray borders. Keep the reading area quiet and carry the same hierarchy through entry, review, reports, and source dialogs.

## Shared choices

| Role | Value / treatment |
| --- | --- |
| Canvas | `#fcfdff`, 28px square grid at low opacity |
| Reading surfaces | White, 1px `#cbd8e5` border, 7px corners, no decorative shadow |
| Primary text | `#29333e` |
| Secondary text | `#627285` |
| Accent | `#4265be`, reserved for actions, progress, and selection |
| Selected surface | `#f0f5ff`, with an accent border and stronger text weight |
| Typeface | Locally bundled Instrument Sans; system sans-serif fallback |
| Hierarchy | 30–40px page headings, 28–36px claims, 15–16px body text, 11–13px metadata |
| Spacing | 24–36px within primary cards; 40px between progress and content on desktop |

`app/styles.css` owns the tokens and responsive rules. Add new states beside their component styles rather than appending competing overrides. The grid belongs behind cards; source and claim text should sit on opaque surfaces.

## Layout and behavior

- Review and report share a progress column. At narrow widths it becomes a compact progress row above the content; the topic list is omitted.
- Cards contain the claim, source/reword controls, and response choices. Confirmation and navigation sit below the card.
- Unselected reactions have equal visual weight. A single click selects, Next confirms, double-click is a shortcut, and Undo remains available.
- Report entries use the same card border and spacing. Keep unfinished material and uncertainty visible in their existing groups.
- Preserve source disclosures, AI wording labels, coverage limits, and exact-source context. Visual emphasis does not imply legal verification or a risk score.
- Keep keyboard focus visible, controls at least 44px high, long source text wrappable, and print output free of the grid and navigation.

This is an initial foundation. Live responsive and accessibility review is still required before treating the visual implementation as finished.
