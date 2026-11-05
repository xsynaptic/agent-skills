---
name: formal-verification
description: Formal verification of a rule in the code, with property tests, TLA+ or Lean. Use when asked to prove or formally verify behaviour, to check how async steps interleave, to write or repair a Lean proof, when a check under `verify/` fails or may have drifted from the code, or when editing a file that a model under `verify/` names.
---

This skill picks one of three ways to check a rule in the code, or decides that an existing check already covers it. The rule is the **claim**: one plain sentence whose breaking a user or developer would notice, such as "a customer is charged at most once". Pick the cheapest tool that could show the claim breaking.

## Pick the tool

Look first for a test, type, runtime assertion or build step that already checks the claim against the real code. When it settles the question, report it and stop; otherwise the new check adds to it.

| The claim is about | Use |
| --- | --- |
| Inputs a random search can reach: a round trip, two implementations that must agree, a bound on output | A **property test** on the real code, per [property-tests.md](property-tests.md) |
| Order over time: user actions interleaving, async work landing late, a state that must never be reached | **TLA+**, per [tla.md](tla.md) |
| Every input, where sampling is not enough: unbounded sizes, deep structure, inputs too rare to generate | **Lean**, per [lean.md](lean.md) |

TLA+ needs orderings to search: when the steps can land in only one order, however async, a direct test of that sequence settles the claim. If the real code can run in a test, try a property test first: it generates sequences of actions and runs them on the real engine. Use TLA+ for orderings a test cannot drive, such as a browser, storage or several processes, or when the claim needs every interleaving of a design rather than a sample of them.

When a property test and Lean both fit, write the property test first, and move to Lean only when the operator asks for certainty beyond sampling or the generators cannot reach the inputs in question.

Before starting, tell the operator the claim, the tool and the reason, one sentence each, then carry on. The operator can judge the claim without knowing the code, and a wrong claim caught here saves the most work.

TLA+ and Lean check a hand-written model of the code, so read [models.md](models.md) before the tool file. Read it too when a check under `verify/` fails, when you need to confirm that the models still match the code, or before editing a file that a model names.

## See it fail

A check never seen red proves nothing. Break each claim the way a real bug would (constant or empty output, off by one in what a reader sees, a dropped guard or step) and confirm the check goes red on that claim. A red from another cause, such as a broken lemma or a tool error, does not count. Each tool file says where its mutants live.

## Hand off

Every result gets a home: each bug a regression test built from its counterexample (and a fix, if asked), and a hand-off saying what holds, under which bounds and assumptions, what broke, and what the check leaves out. The bounds are what the run covered: the constants and state count for TLC, the generator domains and run count for a property test. Keep each bound where the claim needs it; if you must reduce a bound, say so in the hand-off.
