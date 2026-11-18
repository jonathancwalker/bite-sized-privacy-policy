# Privacy policy intake and decomposition tools

The intake tools accept one source at a time and produce a common JSON document. `ingestPolicy()` in `ingest.mjs` is the programmatic entry point for all four sources; the CLI wraps it. The consumer review interface is a separate prototype; these tools are the extraction and evaluation layer for its next iteration.

```bash
npm install
npm run policy -- --list
npm run policy -- --catalog anthropic --out /tmp/claude.json
npm run policy -- --url https://www.anthropic.com/legal/privacy --out /tmp/claude.json
npm run policy -- --file /path/to/policy.pdf --out /tmp/policy.json
cat /path/to/policy.txt | npm run policy -- --stdin --title 'Example policy'

# Add --llm to create grounded draft claims. The key stays in the process environment.
OPENAI_API_KEY=... npm run policy -- --file /path/to/policy.pdf --llm --out /tmp/claims.json
npm run benchmark
OPENAI_API_KEY=... npm run benchmark -- --live --model gpt-6.1-sol
```

`--catalog` entries are pointers to current official pages, not stored snapshots. Regional versions are separate choices where they matter. URL intake follows a small number of HTTPS redirects, checks each destination, limits response size, extracts the main/article text when possible, and records the final URL and fetch time. Some policy sites block automated retrieval; the tool returns an error rather than pretending a policy was read. The catalog was researched on November 17, 2026; verify it periodically.

File intake accepts TXT, RTF, DOCX, and text-based PDF. DOCX extraction reads Word paragraphs, tabs, and breaks. PDF text extraction may lose reading order in columns and tables. Scanned/image PDFs need OCR, which this tool does not claim to perform. Each format returns warnings about limitations. Pasted text arrives on stdin, so it can be piped from a local file or supplied by another application without writing a second copy.

`decompose()` is the lossless base. It returns `document`, `sections`, `units`, `warnings`, and `coverage`; exact UTF-16 offsets and concatenated unit text reconstruct the extracted source. Units target 80 words and normally stay under 120. Section headings, neighboring unit IDs, and split-clause warnings carry context; these links do not assert a legal dependency.

`intelligentDecompose()` sends each bounded group of source units plus nearby context to an OpenAI model through the [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create) using [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses). The model proposes plain-language claims, exact source quotes, context quotes, and qualifiers. Local validation rejects quotes absent from the original text and leaves any unclaimed source units visible. Even a claim with an exact quote is marked as an unverified paraphrase; structural completeness does not establish semantic correctness. The API request uses `store:false`. This is an implementation safeguard, not proof that every accepted claim preserves meaning; the benchmark and human review remain necessary. The default is `gpt-6.1-sol`, with model override for comparisons. No API key is saved in this repository or sent to the browser.

The six benchmark fixtures probe negation, retention exceptions, defined terms, location conditions, table presentation, and an embedded instruction. `npm run benchmark` reports deterministic source coverage, clause retention, and length. `--live` adds exact quote positions, validation flags, unclaimed units, and failures. The benchmark uses synthetic policy-like language, not real user data. Read a live claim next to its source before treating it as trustworthy.

For a policy the reader adds, the local client sends imported text to the server-side model pipeline and renders its source-linked claims. Featured policies instead use saved analyses. The model can mark wholly non-substantive units, such as headings or navigation, as `nonClaimUnits`; those units remain in the exact source record but do not become review cards. Unaccounted units still become exact-source fallback cards. Topic grouping remains a navigation aid based on the earlier keyword classifier. Run `node tooling/audit-claims.mjs /path/to/saved-analysis.json` to summarize claim lengths, source coverage, duplicate text, and review flags; it cannot verify semantic fidelity.

The local reading-mode experiment adds `mode:'user'|'lawyer'` to `intelligentDecompose()` and `/api/decompose`. Lawyer mode is the comprehensive card path. User mode selects at most two takeaways per roughly 5,000-character group and intentionally leaves some source units out of the cards; the UI labels this as a selective overview and keeps the complete policy accessible. Up to four model groups run concurrently, preserving source order in the result. The three homepage policies are saved as dated JSON snapshots in `app/data/featured/`; selecting one reads its prepared user analysis directly without a model request. Both modes are included in each snapshot. `npm run save-featured` explicitly refreshes them with a model key; it does not run on a page visit. Pasted, uploaded, and direct-URL policies are handled live and are not saved by this command.

## Current measured checkpoints

On November 17, 2026, the initial five synthetic cases produced 17 draft claims each with GPT-6.1 Sol and GPT-6 Luna. All 34 had exact cited source ranges; no units were omitted in those runs. The updated adjacent-context schema passed a live Sol rerun on the defined-term case. An additional embedded-instruction case was handled as source text in a Sol run. A public Anthropic policy extracted into 76 exact source units; a 7,795-character sample produced 33 draft claims across 14 units with no missing citations and some advisory qualifier flags. These are small structural checks and manual samples, not a measured semantic accuracy rate.

The catalog includes an OpenAI URL that returned HTTP 403 to the Node fetcher in this environment. It remains a valid official pointer, but this tool cannot automatically retrieve that page here.
