# Functional reliability cleanup — November 18, 2026

## Scope

Improve source integrity, review recovery, report consistency and maintenance checks. Visual styling and saved model-generated policy summaries are unchanged. The earlier feature inventory and screenshots remain the before-state record.

## Changes and evidence

- Model validation now tolerates a malformed entry without discarding valid claims, restricts claims and non-claim dispositions to their assigned group, and rejects invalid worker counts. Regression cases first reproduced a null-entry crash, duplicate out-of-group claims and silently accepted concurrency settings. Model and rewording requests have 90-second deadlines.
- URL intake validates all DNS answers and pins those addresses to the HTTPS connection. Redirects are checked independently; private, loopback and special-use addresses are rejected. Downloads retain the 3 MB limit and now have a 15-second deadline. Tests reproduce private DNS destinations with injected transports and verify address pinning; no live external download was verified.
- Client card preparation checks the source text, unit coverage, exact ranges and adjacent context. Saved-review recovery validates known formats, preserves legacy notes and reactions, and leaves invalid browser data intact with a recovery notice. All three featured policies in both modes passed card preparation and save/restore checks.
- Blank leading source segments no longer become empty exact-passage cards. Original passage identifiers remain stable so existing reactions stay attached to their text. Source reconstruction and a legacy reaction regression case pass.
- Checkpoint copy no longer describes skipped material as reviewed. Text exports include source fetch date and scope when recorded. Print lifecycle handlers expand unfinished claims and restore disclosure states afterward. Own-policy preview explains the model-processing step.
- Unused sidebar and branching-card renderers were removed. Source validation/recovery moved to a dedicated module. Serving and static builds share an asset manifest; a build test checks imported modules and featured data.
- The local API rejects unexpected Host and Origin values before calling services. Direct handler tests cover those boundaries and import/error responses. This is local-server hardening, not a public deployment architecture.
- README and feature status now describe the current flow, three current visual concepts, saved analyses and deployment limits. Node 22 is declared in package metadata. A GitHub Actions workflow is configured to install dependencies, run all tests and build without model credentials.

## Verification

- Initial dependency-free baseline: 28 tests passed.
- New regression cases were observed failing before their fixes.
- Final full `npm test` attempt: **68 tests, 60 passed, 8 failed because required runtime capabilities were unavailable**. Seven HTTP integration tests failed with `listen EPERM` on loopback; one PDF extraction test failed because `pdfjs-dist` was unavailable. Dependency installation failed with DNS resolution errors for the npm registry. The failures were not skipped or relabeled as passes.
- Client compatibility, direct API handler tests, model-response validation, pinned DNS transport mocks and the static build test passed. These checks do not replace real network or browser tests.
- `npm run build`, changed-runtime syntax checks and `git diff --check` passed.
- A live preview could not start because the runtime denied listening on localhost. Current visual layout, real PDF extraction, external policy fetching, live model output quality and hosted deployment were not verified. No model calls or snapshot regeneration were performed.
- The new CI workflow has not run remotely. The full suite and browser flow still need verification in a runtime with dependencies and loopback access.

## Remaining work

Overview theme repetition and semantic fidelity require a focused model-output evaluation. Cross-clause reader navigation, legacy question/note entry and visual-system consolidation remain in the feature inventory. Existing CSS overrides were retained for the later design pass.

## Engineering takeaways

- Validate data again where it becomes user-facing state: server validation does not protect against damaged browser storage or stale saved files.
- Preserve identifiers during cleanup: removing an empty card must not move an existing reaction onto a different passage.
- Separate test outcomes from environment limits: direct handler tests can verify request logic while real socket and browser checks remain explicitly outstanding.
