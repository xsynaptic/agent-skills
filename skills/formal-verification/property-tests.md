# Property tests

Use fast-check where the tests already run. It exercises the **real engine** (regex, Unicode, sort stability), which a model abstracts away, and it shrinks each failure to its smallest counterexample; report that input.

Install the runner's binding as the devDependency (`@fast-check/vitest`, which brings fast-check with it), import `fc` and `test` from it, and write each property as `test.prop([generators])('claim', (…) => { expect(…) })`.

- Cover a small finite domain with a loop over every combination; fast-check is for domains a loop cannot exhaust.
- Keep generators to small domains, so duplicates, ties and boundaries come up often.
- Build inputs that reach the claim (a query cut from the title it searches), and assert the case was reached (the search returned the row) so the property is never vacuous.
- Keep example tests for exact boundaries, which a search can miss.
- Name what enforces each constraint on a generator (the type system, the runtime, the build, or convention alone), and let the generator's name state the constraint (`singleSchemeUrl`); report each one that only convention enforces.
- Read the counterexample from every red run, including one that passes on rerun: an intermittent red is a real input found on some seeds.
- Mutants go in the code and are reverted after. A mutant caught on only some runs means the generators need narrowing.
- `fc.record` builds null-prototype objects, which `toStrictEqual` rejects; pass `noNullPrototype: true`. `fc.date` yields invalid dates unless given `noInvalidDate: true`.
- For claims about order over time, `fc.commands` runs generated sequences of actions against the real code alongside a small reference model and compares the two after each step. `fc.scheduler` makes the code's promises resolve in generated orders.
- At the default `size`, `fc.array` stays near ten elements whatever `maxLength` says; pass `size: 'max'` when the claim needs long sequences of steps.
