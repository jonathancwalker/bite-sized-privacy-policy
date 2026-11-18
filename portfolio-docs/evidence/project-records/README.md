# Bite-sized Privacy Policy

A concept for helping people understand a privacy policy or contract, record their reactions to individual provisions, and leave with a decision report grounded in the original document.

## Current state

Concept only. No application code, dependencies, prototype, or tests existed in the project directory at the November 10, 2026 handoff.

## Product intent

- Break long documents into understandable points, preserving conditions, exceptions, and links to exact source wording.
- Let people record comfort, concerns, and questions for each point.
- Summarize concerns, unanswered questions, acceptable terms, and unreviewed material.
- Explore explicit preferences to highlight relevant terms, while keeping the person's judgment in control.

## Emerging interaction model

The review should feel like a guided decision, not a quiz and not a stack of identical cards. People choose how far to go on each point, with the next useful action revealed progressively:

1. **Comfortable** — record that this point seems acceptable and continue.
2. **Need clarification** — capture a question, or ask for a simpler explanation or an example.
3. **Not comfortable** — mark the point as a concern, then optionally flag it as a potential dealbreaker.

Keep the primary actions visible and lightweight. Put deeper actions (view exact wording, see related points, add a note, mark as a dealbreaker) behind the relevant response so the first decision stays quick. Avoid implying that a reaction changes or negotiates the policy.

### Pacing and checkpoints

- Begin with a topic map and an estimate of the review, including how many high-priority points there are.
- Group related points into short sections (for example, collection, sharing, retention, and user controls).
- Offer a checkpoint after each section: reviewed, still to review, questions saved, and concerns flagged. Let people pause and return without losing their place.
- Allow skipping lower-priority material while making skipped topics visible in the final report.

### Preference onboarding

Before review, invite people to pick the topics that matter most to them (such as location, sensitive data, targeted ads, sharing, retention, or deletion). Use those explicit choices to order or highlight relevant points and explain why a point is surfaced. Keep the full review available, make preferences editable, and never hide a point or infer that the person is comfortable with it.

### Linked provisions

Some points only make sense together: a permission may be limited by an exception elsewhere, or a defined term may change the scope of a clause. Keep each point independently readable, but show a clear “Related points” path with a short explanation of the relationship and source links. The report should preserve those links rather than treating every reaction as isolated.

## Proposed first prototype

Start with a consumer app privacy policy. Use an overview → preference setup → point review → section checkpoints → decision report flow. These are design proposals to validate, not shipped functionality or settled requirements.

- Show document topics and review coverage before asking someone to navigate cards.
- Prefer reactions such as **Comfortable**, **Need clarification**, and **Not comfortable**. Let clarification branch into simpler wording, an example, or a saved question; let discomfort optionally branch into a concern or potential dealbreaker. Recording a reaction does not amend or accept contractual terms.
- Keep source text, document version, and uncertainty visible.
- Preserve unresolved issues and dealbreakers instead of reducing them to one score.
- Use editable, explicit preferences for emphasis; do not silently generalize one response to all contexts.

## Next work

1. Choose one sample policy and a concrete user scenario.
2. Prototype a short review with preference onboarding, 8–12 source-linked points, progressive responses, one checkpoint, and a decision report.
3. Test whether people can move quickly through routine points while noticing consequential terms, linked provisions, and unanswered questions; compare against a plain-language summary.
4. Refine pacing and preference cues based on observation, then decide the implementation stack.

No model/API integration has been chosen. Keep any future API credentials and uploaded private contracts outside Git.
