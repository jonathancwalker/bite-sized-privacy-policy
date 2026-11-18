# Working on Plainer

Plainer helps people understand privacy policies through short, readable claims linked to the original wording. The current product focus is privacy policies; avoid expanding to terms of service or other contracts unless the user asks. The user is actively shaping the experience through sketches and iteration, so treat the current UI as a prototype rather than a final design.

Read [`FEATURE_LIST.md`](FEATURE_LIST.md) for the shared feature inventory, implementation status, and open work. Update it when substantive feature work changes the product.

## Product and design

- Make the flow simple and constrained: a clear hierarchy, generous but intentional spacing, minimal copy, and progressive disclosure. Avoid decorative marketing blurbs and generic AI-looking visual treatments.
- Respect the user's sketches and specific feedback. When changing a screen, consider the rest of the flow for consistency; use the running local app to inspect visual changes and provide screenshots when useful or requested.
- The homepage offers familiar policies as recognizable choices and an expandable own-policy entry with upload, paste, and URL options. Keep the path into a review straightforward.
- Choose the policy first, then reveal reading depth on the homepage before opening the result or accepting own-policy input. The user's preferred review is one constrained claim card at a time, with progress and Accept, Reject, Skip, and Reword actions. Keep original wording available on demand rather than occupying the card. Use quiet cues for priority, overview, and reworded claims.
- The user makes the judgment. Accept and Reject are personal reactions to a claim; they do not accept or change a policy. Reports keep skipped and unfinished material visible. Topic preferences may reorder content but should not silently hide it.

## Claims and source integrity

- Prefer intelligent, LLM-assisted decomposition to keyword-only claim extraction. Produce coherent, genuinely bite-sized plain-language claims while retaining the source text and context needed to understand them.
- Preserve actors, scope, modality, conditions, exceptions, negations, time limits, and regional differences. Link claims to exact source wording; retain unaccounted source passages rather than silently dropping substantive material.
- An exact quote proves a text match, not that a paraphrase is accurate. Do not label model output legally verified or infer policy practices that are not supported. Review representative real-policy outputs for readability, repetition, context, and faithfulness when changing decomposition.
- Some official sites block automated fetching or return region-specific versions. Record source URL, version or scope when known, and be honest about extraction limits. The OpenAI policy returned HTTP 403 to the command-line fetcher during a prior audit.
- Benchmarks can help answer a concrete question, but the user has prioritized a useful end-to-end experience over immediately building a comprehensive benchmark suite.
- Quick overview (user mode) should produce a handful of broad, source-linked themes that give a working understanding of an imported policy; detailed (lawyer) mode stays granular. The overview is selective, so disclose unsummarized source material and keep the complete policy easy to open. Neither mode implies legal review.
- The three homepage policies open from saved, dated analyses rather than triggering an import or model call on every visit. `npm run save-featured` refetches source and both modes; `npm run refresh-featured-overviews` regenerates just the quick overviews from the saved source. Show the original source fetch date and do not imply a snapshot is current without checking.

## Project map and verification

- `app/` contains the local interface; `scripts/serve.mjs` serves it and the local API. `tooling/` handles intake, source decomposition, model claims, and validation. `portfolio-docs/` records project decisions and evidence.
- Use Node.js 22+. Run `npm run dev` with `OPENAI_API_KEY` in the server environment for live claims, `npm test` for the suite, and `npm run build` to generate `app/dist/`. Never commit credentials or private policy text. The generated `app/dist/` is ignored.
- The local flow and hosted static prototype are distinct; do not imply a local change has been deployed. Topic classification still uses text matching, and model paraphrases remain unverified.
- For meaningful changes, run checks appropriate to the scope. For UI work, inspect the actual rendered states and responsive layout. When the user asks for critique or testing, iterate on issues found and be clear about what was and was not verified.

## Collaboration and Git

- Work autonomously within the user's stated scope and share concise progress updates. The user prefers seeing a working, reviewable result and iterating on it over extended upfront speculation.
- Use subagents for independent critique or testing when the user asks for them and the environment permits. Incorporate findings and report material limitations.
- Use focused branches, meaningful commits, and reviewable pull requests for substantial changes. Follow the user’s instructions about opening and merging PRs; preserve others' uncommitted work and check repository status before switching branches.
- `app/` may have its own nested Git checkout, and another worktree may contain independent uncommitted changes. Inspect before staging or switching; avoid accidentally adding a submodule or overwriting either checkout.

<!-- portfolio-documentation:start -->
## Portfolio documentation across projects

As part of substantive project work, use the `portfolio-documentation` skill at
`~/.codex/skills/portfolio-documentation/SKILL.md`. Read it when starting work in a
project, including planning, design, research, implementation, and testing.
Maintain `portfolio-docs/` at that project's root, or its established equivalent.
Initialize it on the first meaningful task and keep it current at useful
checkpoints and before finishing substantive work. Capture useful before-states
before changing them.

Preserve the user's stated goals, feedback, rationale, and contributions alongside
implementation work. Record meaningful decisions, alternatives, experiments,
results, setbacks, and learning with evidence links. Save useful visual assets
and create explanatory graphics when they help. Build an evidence-backed case
study and portable asset bundle as the project approaches completion.

Keep capture concise and low-noise. Use current context and accessible material
from the same project; record coverage gaps rather than inventing history,
outcomes, attribution, or personal reflections. Respect project-specific
instructions and requests to pause or exclude capture. Skip unrelated chats and
trivial turns. This is an ongoing part of Codex tasks, not an unattended recorder,
and does not authorize publishing or messaging others.
<!-- portfolio-documentation:end -->
