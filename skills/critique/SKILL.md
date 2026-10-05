---
name: critique
description: Fresh-eyes review of the pending work by two isolated subagents on opposing lenses, then weigh their findings and act. Use when the user asks for a critique, a second opinion, or a review of the current changes before committing.
---

# Critique

Two **fresh-eyes** reviewers (subagents whose contexts never saw this session) review the pending work by opposing methods; you weigh what they find. Isolation is the whole point, so never describe the work to them. Point them at the diff and let them discover the rest.

**One pass, not a loop.** Run it once per body of work. Fresh reviewers are blind to this session, so a second round resurfaces findings you already rejected rather than catching new ones. Verify your own fixes by re-reading and running the checks, as with any edit. Run a second pass only if the user asks, never more than twice.

## Steps

1. **Check `git status` for something to review.** Uncommitted changes are the target. A clean tree on a work branch is fine, the reviewers fall back to the branch diff. A clean tree on the default branch means there is nothing to review: say so and stop.

2. **Spawn both reviewers concurrently**, as two Agent calls in one message, `general-purpose`. Reviewer A runs on `haiku`, Reviewer B on `opus`; you stay the judge. Send the shared preamble with that reviewer's lens appended, **verbatim**, and nothing else.

3. **Weigh every finding.** You hold context they lack: use it to judge, not to defer or defend. Agreement between the two is a confidence signal, not a duplicate.
   - Apply clear wins yourself (unambiguous bugs, cleanups), then sanity-check by re-reading and running the relevant check.
   - Propose anything carrying a tradeoff (architecture, scope, design) for the user.
   - Reject a wrong finding with a one-line reason.

4. **Report your assessment only.** Every finding both reviewers raised gets a line: accepted with what you did, or rejected with why. Keep the raw reports internal.

## The reviewer prompt

Shared preamble, sent to both:

> You are an expert reviewer with no prior knowledge of this work. Review every uncommitted change in this repo as a demanding senior engineer would.
>
> Find the changes yourself: `git status`, `git diff HEAD` for tracked edits, and read untracked files directly. If the tree is clean, the work is already committed on this branch: review the branch's full diff against the default branch instead (`git diff <default>...HEAD`). Read the diff plus the immediate call sites and definitions you need to judge each change in context; what looks fine in isolation can be wrong against the code around it. Don't tour the whole repo.
>
> Each finding will be weighed and either fixed or rejected with a reason, so make it count: rank by real impact, justify why it matters, and separate confidence from speculation. Report genuine problems; skip style nits and praise.
>
> Return prose grouped by severity. Per finding: `file:line`, what's wrong, why it matters. Cap the report at your five most impactful findings, a tight paragraph each; a short report is a stronger signal than a long one. Review only; change nothing.

Reviewer A, append:

> **Assume this change is subtly broken, and prove it.** Work bottom-up, line by line. Find the input, state, or event sequence that makes it misbehave: edge cases, boundary values, unhandled errors, null/empty/overflow, races, off-by-one, wrong assumptions about callers or data. Name the trigger and the wrong result. Flag dead or redundant logic, and anything the change implies should exist but doesn't.

Reviewer B, append:

> **Assume it works today, and ask whether it should exist as written.** Work top-down from intent and structure, not line by line. Imagine inheriting this in six months: what will you curse? Wrong or leaky abstractions, scope creep, coupling, tech debt, missing tests, design omissions in the broader system. Lead with fit and maintainability. Name a correctness bug only if it's unavoidable; don't go bug-hunting, that's the other reviewer's job.
