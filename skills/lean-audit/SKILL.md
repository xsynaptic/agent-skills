---
name: lean-audit
description: Lean 4 audit of one rule implemented twice, where drift between the halves is a bug. Use when asked to prove, formally verify, or audit a pair with Lean, such as a policy predicate and its SQL filter, client and server validation, a query and its cache key, or a migration and a reader of both shapes.
---

A one-off audit, not standing tooling. The deliverable is refutations reproduced against the real engine and invariants carried forward as property tests; the Lean is scaffolding that goes stale the day the code moves.

A proof is about the **model**, a hand transcription of the code as you read it. Human review of the model is the real check, and the real engine (the database, the compiled query, the runtime) outranks any proof on what it decides: parenthesization, casts, collation, date parsing, clock precision.

## Setup

- Install the toolchain first, through `elan`; it is ~500 MB and slow to fetch
- Work in a scratch directory outside the project's workspace and gates
- Pin the version in `lean-toolchain`, since lemma names drift between releases
- Core Lean 4 (`simp`, `omega`, `decide`, `rcases`) is enough; leave Mathlib out

## Steps

1. **Find the existing check.** Whatever already compares the two halves against the real engine, name it; the audit supplements it. If nothing does, that is the first finding.
2. **Model both halves.** Make explicit every decision the source leaves implicit, for example:
   - absent versus explicit false
   - `NULL` in a `WHERE` (dropped) versus in a selected column (a value)
   - how the query builder renders an empty `IN` list
   - timestamp precision lost crossing a runtime boundary
   - for a cache key against its invalidation, which world each side reads: the key a cached copy carries comes from before the write, the purge's facts from after it unless the write captured them
3. **Tier every hypothesis by its enforcer**: the schema or type system, the engine, repository code, or convention alone. Exhibit a witness for each hypothesis set, because contradictory hypotheses prove anything.
4. **Stop for review.** Show the user each model beside the code it mirrors. Done when they approve.
5. **Prove.** Run `#print axioms` on every theorem and accept only proofs free of `sorryAx` and native evaluation; close decidable goals with `decide`, never `native_decide`. Refutations cluster in hypotheses that only convention enforces.
6. **Reproduce each refutation** as a test against the real engine. One that does not reproduce is a modelling error.
7. **Harvest**, done when every refutation and every proven theorem has a home:
   - each real bug: a fix plus its regression test
   - each proven invariant: a property-based test against the real code
   - a write-up of what was proven, what was refuted, and what the model could not see, with the Lean sources as its appendix

## Proof gotchas

- A custom `simp` lemma stated too generally loops against core lemmas; narrow it to the concrete type
- `omega` can miss a hypothesis reached through `apply` with a type abbreviation; restate the lemma over bare `Int`
- Name the model's state structure apart from its namespace: `World.World` sends `world.helper` field notation looking for `World.World.helper`
