# Single-column entry and browser-safe PDF packaging

## Changes

- Restore the 560px centered homepage column, with a plain canvas. Keep the saved-review platform name, reviewed fraction, and resume/report action in a compact card below policy entry. Remove its reaction grid.
- Give the changing depth explanation a uniform pale-blue surface without the left accent stripe.
- Put each report topic heading above its full-width square group. Remove topic count badges while retaining every clickable claim, reaction state, accessible label, and source path.

## PDF failure and correction

The font library's distributed ES module contained `import e from "pako"`. Serving that file directly left a package specifier that the browser could not resolve. A previous Node check succeeded because Node found the installed package; it did not establish browser compatibility.

Local serving and static builds now use one asset reader that bundles vendor modules and rejects remaining imports. The font and compression license notices remain included. Bundles are generated locally, cached by the development server, and loaded by the app only when exporting.

## Evidence and verification

- Before implementation, the isolated font-module regression failed with `Failed to resolve module specifier "pako"`. The saved-review and topic-badge acceptance cases also failed before their changes.
- All 115 automated tests pass, including local asset delivery, static and lazy build imports, saved-review navigation, and map revisiting. Static build and whitespace checks pass.
- PDF content and pagination tests now use the delivered browser bundles imported from data URLs, which have no Node package-resolution parent. This isolates the reported import failure; it is not a browser interaction test.
- The three-page synthetic Instagram sample was regenerated from the static build, rendered with Poppler, and all pages inspected. Text, source passages, and pagination remain intact.
- Live browser layout, responsive proportions, and clicking Download were not checked. Browser access was blocked. No deployment or new model calls were performed.
- [Before-state screenshots](../assets/index.md#single-column-and-pdf-packaging-before-states) document the reported layout and dependency failure.

## Takeaways

- Test the artifact in its delivery environment: Node package resolution can hide a broken browser dependency graph.
- A single asset pipeline keeps local serving and static builds from shipping different runtime dependencies.

