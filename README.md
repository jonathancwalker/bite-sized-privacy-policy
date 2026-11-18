# Plainer

Plainer helps people read privacy policies through short claims linked to exact source wording. Readers choose a policy and reading depth, review one claim at a time, record personal reactions, and export a report that keeps unfinished material visible.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
# Open http://127.0.0.1:4173
```

The saved Instagram/Meta, TikTok US, and YouTube/Google reviews work without an API key. New analyses and rewording require `OPENAI_API_KEY` in the server environment. To load a private local environment file, use `node --env-file=/absolute/path/to/.env scripts/serve.mjs`. Never commit credentials. Set `PORT=4174` if the default port is occupied.

The Node server is a local development server. Its API accepts requests addressed to localhost or loopback, with a matching browser origin. Public hosting needs a separate deployment design with authentication, request limits, and server-side secrets.

## Current experience

1. Choose a featured policy or expand **Review my own policy**.
2. Choose **Quick overview** or **Detailed review** before proceeding.
3. For an own policy, upload TXT/RTF/DOCX/text-PDF, paste text, or enter a public HTTPS URL; check the extracted text before analysis.
4. Choose topics to see first, then **Accept**, **Reject**, **Skip**, or **Reword** each claim. Original wording stays available through **Check source**.
5. Resume the review later or export a personal report. Reactions do not accept, amend, or negotiate a policy.

Quick overview selects a few themes and explicitly leaves some source material unsummarized. Detailed review produces more granular cards, including exact-source fallback passages when needed. Neither mode implies legal review. The current saved overviews have 8 Meta, 4 TikTok US, and 10 Google cards; detailed reviews have 174, 121, and 291 respectively.

The [feature inventory](FEATURE_LIST.md) is the current backlog. [Portfolio decisions](portfolio-docs/decisions.md) and [experiments](portfolio-docs/experiments.md) retain historical iterations; earlier screenshots and descriptions may differ from current code. The separate `/concepts.html` gallery contains three visual-only studies: Clear, Grounded, and Signal.

## Data and source integrity

- One review is saved in the browser's local storage. Reactions and notes are not sent to the policy provider. Clearing or replacing a review is explicit; restricted storage may prevent recovery.
- Own-policy text goes to the local server and OpenAI for claim generation. Rewording sends the selected claim and its source/context. Model requests use `store:false`; this is not a guarantee of zero provider retention.
- Intake records provenance and extraction warnings. The app accepts up to 80,000 characters or a 12 MiB file. URL downloads are limited to 3 MB and 15 seconds; every destination is checked, and production HTTPS connections use the validated public DNS addresses.
- Source decomposition preserves exact text and offsets. Model claims must cite their assigned source units; optional context must cite a neighboring unit. Malformed entries are rejected, and failures keep the source available.
- Exact quote matching proves the citation exists. It does **not** prove that a paraphrase preserves meaning. Claim quality, broad coverage, and cross-clause dependencies still need evaluation.
- Saved reviews are validated before recovery. Invalid saved data produces a recovery notice without clearing it. Exports include the source URL, fetch date and scope when recorded, claims, reactions, and the complete original text. Printing expands unfinished claims and source disclosures.

## Saved featured policies

`app/data/featured/` contains dated source text and both analyses for the three homepage policies. They are prepared files, not a runtime cache. Opening a featured review or switching its mode does not fetch the original policy or call a model.

```sh
npm run save-featured                 # Refetch and regenerate both modes
npm run save-featured -- meta         # Refresh one policy
npm run refresh-featured-overviews    # Regenerate only overviews from saved text
```

These commands require a server-side key. A failed refresh preserves the previous file. Display the original source fetch date; a regenerated overview does not make its source current.

## Project map

| Location | Responsibility |
| --- | --- |
| `app/app.js` | Screen rendering, navigation, reactions, report export |
| `app/review-state.js` | Source validation, card preparation, saved-review recovery |
| `app/engine.js` | Deterministic exact-passage fallback and topic classification |
| `scripts/serve.mjs` | Local static server and import/decompose/reword API |
| `scripts/assets.mjs` | Shared asset manifest for serving and builds |
| `tooling/` | Intake, extraction, source decomposition, model validation and audits |
| `portfolio-docs/` | Decisions, historical evidence, experiments and screenshots |

See [tooling commands and limitations](tooling/README.md) for the policy catalog, CLI and benchmark.

## Checks and build

```sh
npm test
npm run build
npm run benchmark  # Six deterministic synthetic cases; no model requests
```

The test suite covers exact source recovery, claim validation, intake, local API behavior, saved-review recovery and static assets. HTTP integration tests bind a loopback port; the PDF test requires the installed `pdfjs-dist` dependency. Tests inject model responses and do not require an API key. Client state tests are not browser layout checks.

The GitHub Actions workflow runs installation, the full suite and the build on pull requests and pushes to `main` using Node 22. It does not run live model evaluations.

The build copies the runtime assets and saved policies into ignored `app/dist/`, removing stale generated files first. The resulting static site supports saved-policy reviews. Own-policy intake and rewording require the Node API.

The older private hosted prototype is separate from this checkout. Building locally does not deploy it. No new deployment or reader comprehension study is recorded here.
