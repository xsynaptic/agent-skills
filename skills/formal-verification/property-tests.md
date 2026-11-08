# Property tests

Use fast-check where the tests already run. It exercises the **real engine** (regex, Unicode, sort stability), which a model abstracts away, and it shrinks each failure to its smallest counterexample; report that input.

Install the runner's binding as the devDependency (`@fast-check/vitest`, which brings fast-check with it), import `fc` and `test` from it, and write a property as `test.prop([generators])('claim', (…) => { expect(…) })`.

- Cover a small finite domain with a loop over every combination; fast-check is for domains a loop cannot exhaust.
- Keep generators to small domains, so duplicates, ties and boundaries come up often.
- Build inputs that reach the claim (a query cut from the title it searches), and assert the case was reached (the search returned the row) so the property is never vacuous. When not every input reaches every case, count each case across the runs and assert every count is above zero, with `fc.assert` inside a plain `test` so the counts are checked after the last run.
- Keep example tests for exact boundaries, which a search can miss.
- Let a generator's name state its constraint (`singleSchemeUrl`).
- Read the counterexample from every red run, including one that passes on rerun: an intermittent red is a real input found on some seeds.
- Mutants go in the code and are reverted after. A mutant caught on only some runs means the generators need narrowing.
- `fc.record` builds null-prototype objects, which `toStrictEqual` rejects; pass `noNullPrototype: true`. `fc.date` yields invalid dates unless given `noInvalidDate: true`.
- For claims about order over time, generate an array of steps, apply each to the real code and a small reference model, and compare the two after each step. At the default `size`, `fc.array` stays near ten elements whatever `maxLength` says, so pass `size: 'max'`. `fc.scheduler` makes the code's promises resolve in generated orders.
