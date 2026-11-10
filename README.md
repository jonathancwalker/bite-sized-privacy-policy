# Bite-sized Privacy Policy

A concept for helping people understand a privacy policy or contract, record their reactions to individual provisions, and leave with a decision report grounded in the original document.

## Current state

Concept only. No application code, dependencies, prototype, or tests existed in the project directory at the November 10, 2026 handoff.

## Product intent

- Break long documents into understandable points, preserving conditions, exceptions, and links to exact source wording.
- Let people record comfort, concerns, and questions for each point.
- Summarize concerns, unanswered questions, acceptable terms, and unreviewed material.
- Explore explicit preferences to highlight relevant terms, while keeping the person's judgment in control.

## Proposed first prototype

Start with a consumer app privacy policy. Use an overview → point review → questions → decision report flow. These are design proposals to validate, not shipped functionality or settled requirements.

- Show document topics and review coverage before asking someone to navigate cards.
- Prefer reactions such as **Comfortable**, **Have a question**, and **Concerned**. Recording a reaction does not amend or accept contractual terms.
- Keep source text, document version, and uncertainty visible.
- Preserve unresolved issues and dealbreakers instead of reducing them to one score.
- Use editable, explicit preferences for emphasis; do not silently generalize one response to all contexts.

## Next work

1. Choose one sample policy and a concrete user scenario.
2. Prototype a small set of source-linked points and a report.
3. Test whether people can explain consequential terms and make decisions consistent with their preferences; compare against a plain-language summary.
4. Decide the implementation stack after validating the flow.

No model/API integration has been chosen. Keep any future API credentials and uploaded private contracts outside Git.
