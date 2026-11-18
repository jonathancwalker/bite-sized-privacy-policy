# First working end-to-end prototype

The user asked Codex to “rip” through to a working paste → cards → claims/reactions → final report experience, then iterate, with smaller sub-agents testing and critiquing the result. Source: current project conversation, November 12, 2026. User supplied product intent and earlier interaction preferences; Codex implemented and verified the prototype.

Baseline: the current README and existing portfolio records documented a concept with no app. That earlier README is preserved in [project records](../evidence/project-records/README.md); there was no earlier interface to screenshot.

Delivered: dependency-free static app, fictional 11-point sample, custom paste and text import, source links, editable topic priorities, comfort/clarification/concern reactions, notes/questions, potential dealbreakers, section checkpoints, browser persistence, reports and export. Published privately using Sites. Plain-language claim generation was not added; source passages and keyword topics form the explicit first baseline.

Delegation: one gpt-6-luna sub-agent implemented/tested segmentation. Another reviewed state behavior, accessibility, report completeness, and saved screenshots, then re-reviewed fixes. Main agent built the interface and ran browser QA. Review corrections and measured test outcomes are in [experiments](../experiments.md#e02--working-prototype-verification).

The first extraction attempt fragmented 366 sample words into 33 cards; paragraph grouping reduced this to 11. Critique fixed checkpoint resume, retained-question ambiguity, import keyboard focus, and skipped-material labeling. Browser review exposed missing report access on mobile; it was restored.

Evidence: [asset register](../assets/index.md). No human usability outcomes or user approval of the finished design are claimed. Next: observe the user trying a real policy and determine the claim-generation approach.
