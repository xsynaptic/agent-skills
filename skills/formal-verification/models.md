# Models

TLA+ and Lean check a hand-written **model** of the code, never the code itself, so a result means something only while the model matches the code.

## Write the model

- Model only what the claim touches: one definition per function or handler, named after it.
- State the claim as two independent descriptions that must agree, such as output against input, or a rule over every reachable state. A claim that unfolding the definitions proves is a tautology; restate it as the reader would.
- Make explicit each decision the code leaves implicit, since two implementations of one rule drift there: absent versus explicit false, `NULL` in a `WHERE` (dropped) versus in a selected column (a value), how the query builder renders an empty `IN` list, timestamp precision lost across a runtime boundary, and whether a purge rebuilds a cache key from the row after a write when the key was built from the row before it.
- The real engine (the database, the compiled query, the runtime) outranks the model on what it decides: parenthesization, casts, collation, date parsing, clock precision.
- Name what enforces each assumption in the model: the type system, the runtime, a library contract, the build, or convention alone. Report each one that only convention enforces; that is where the bugs are. Show with one example that the assumptions can all hold at once, since contradictory assumptions prove anything.
- The only prose in a model is a **source map**: each file names the code it covers, and a definition named differently from its code symbol names that symbol. `grep -rl <path>` over every `verify/` folder then finds every model of a file. The `spec` file also records the **sync commit**, the last commit the model was confirmed against.

## When a check goes red or drifts

A passing check only shows that each model is consistent with itself, not that it still matches the code. To confirm that it does, list the commits since the sync commit that touch a file its source map names (`git log <sync commit>..HEAD -- <files>`), then look for covered code the source map no longer names: a covered function renamed, split or moved, and new code that writes the state the model guards. Read each change against the model itself rather than trusting its commit message, and decide whether it leaves the model unaffected or falls under one of the causes below. Once the model describes the code at the commit you read up to, move the sync commit there.

Take the verdict from the tool's exit code (`lake build --wfail`, TLC), and fix a tool error before reading anything into the run. A red check, or a change to a file that a model names, has one of three causes:

1. **Stale model**: the code moved. Update the model from the code, never toward whatever makes it pass, then see it fail again, since an updated model can lose the ability to fail. Change the claim only when the promise changed on purpose, and cite the evidence (a doc comment, a test, the commit message) in the hand-off.
2. **Modelling error**: replay the counterexample against the real code, one step per action. A step the code cannot take is the model's fault.
3. **Bug**: the code takes every step. **Findings stay findings**: report the counterexample in the code's words with the claim unchanged, and change product code only when the operator asks. Once fixed, the bug gets a regression test and leaves the model.

## Where the work lives

- **Scratch** is the default: a folder in the session's scratchpad or the system temp directory, set up from [templates/](templates/) per the tool file. Only its **harvest** enters the repo.
- **Standing** is for a claim that paid off in code that keeps changing, or one the operator keeps as a worked example for later proofs. It lives in `verify/models/` or `verify/proofs/` of the package whose suite replays it, with a `check-*` script and this line in `AGENTS.md`: ``Before changing a file, `grep -rl <path> verify/` shows whether a formal model of it needs updating too.`` The line names every `verify/` folder the repo has, so a package that keeps its own suite adds its folder after the root's (`verify/ packages/player/verify/`). Runs write nothing into the repo. Delete a standing claim whose code was rewritten or removed.

The harvest is done when each proven claim also has a test on the real code, which fails in the project's own suite when the code drifts (a property test stating the Lean claim, an end-to-end replay of the TLA+ witness), and the hand-off lists the model's actions or definitions in the reader's words, so the operator can spot a step the real code takes that the model lacks.
