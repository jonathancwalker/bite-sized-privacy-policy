# Attention-focused PDF details

- PDF claim details now include only Concerned and Unsure responses, preserving their exact source wording and context. Comfortable, skipped, and unseen claims remain represented in the summary totals without repeating their wording.
- A final coverage box shows unreviewed claims out of the full review total. Skipped and unseen cards both count as unreviewed. An empty attention list says no concerns or uncertainty were recorded; it does not imply completion or comfort.
- The homepage retains the pale graph-paper background in the single-column layout. Only the saved-review reaction grid is removed. This supersedes the plain-canvas choice in D15.
- Report detail badges use reaction names without leading symbols. The claim map still pairs colors with symbols and accessible names.
- Review menu appears only on review/report screens, and How to use contains operating instructions without the separate depth/acceptance paragraph.

## Verification

- The PDF cases failed before implementation: omitted skipped/unseen details, the final unreviewed fraction, and honest wording for a fully unreviewed policy. The report-label assertion also failed before removing its symbols.
- All 118 tests pass, including static-build packaging and long-document pagination. Whitespace checks pass.
- The saved Instagram sample uses synthetic responses. Its two updated PDF pages were rendered with Poppler and visually inspected, along with a one-page example containing five unreviewed claims. [Final-page evidence](../assets/exports/2026-11-18-pdf-attention-summary.jpg) shows the coverage box.
- Live browser layout and download interaction were not inspected. No deployment or model calls were performed.

## Takeaways

- Filtering detail must not filter coverage totals: omitted claims still count toward what remains unreviewed.
- An empty list of concerns is not evidence of approval; test untouched reviews separately from completed reviews.
