# Deliberate card review — November 18, 2026

## Interaction decisions

A single click selects a response, Next confirms it, and double-clicking a response confirms as a shortcut. The latest confirmation can be undone. New reviews open directly on the first card and continue without topic interruptions; optional topic ordering lives in Review settings. Older stored checkpoints remain supported.

Depth labels are reduced to User view / Quick overview and Lawyer mode / Detailed overview. Progress shows reviewed cards and skipped cards separately, consistent with a report organized into Needs attention, Left to review and Accepted. Source access, selective-overview disclosure and personal notes remain available with progressive disclosure.

Rewording now requests a newly structured, source-grounded explanation instead of a shorter synonym substitution. A token edit-distance check detects cosmetic output and retries once under a shared 90-second deadline. Repeated cosmetic results produce an explicit failure without overwriting the current wording. The original claim stays in the request, with the current displayed wording supplied separately for repeat requests. This check is not a clarity or semantic-fidelity evaluator.

Suggested approvals remain a future interaction proposal. They should distinguish inference from confirmed personal reactions, keep evidence accessible and allow reversal. No inference model or automatic approval is implemented.

## Evidence and limits

- Failing cases reproduced immediate single-click advancement, cosmetic rewrites being accepted and a rapid double-click on Next skipping a previously reviewed card.
- All 75 automated tests passed; the static build and diff whitespace check passed.
- Client tests exercise the actual handlers and rendering code through a minimal DOM fixture. They cover select/confirm, double-click, undo, direct card entry and report labels. They do not establish browser rendering or actual pointer-event timing.
- Browser inspection of the preview on port 4174 was denied by the browser access gate. No alternate browser mechanism was used.
- Deterministic rewording cases cover cosmetic rejection/retry and a retention exception example. Live model output has not been evaluated because the server has no API key.
- Existing colors, typography and general card treatment are retained. Functional styles show the selected response and position confirmation controls.

## Takeaways

- Separate selection from commitment when an accidental click changes a recorded decision.
- A measurable output constraint can reject cosmetic rewrites, but semantic correctness still requires a separate check.
