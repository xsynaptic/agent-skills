# Lean

Core Lean 4 in a pinned, tool-only container. Mathlib stays out: it is gigabytes, and core closes these claims.

## Layout

```
verify/proofs/
  compose.yaml  lakefile.toml  lean-toolchain
  claims.lean          the index: one axiom pin per standing claim
  <rule>/spec.lean     model, claim, fixture: what a reviewer compares with the code
  <rule>/proof.lean    lemmas and tactics, for the kernel alone
```

- The claim is one `def … : Prop` in `spec.lean`; each step toward it is a lemma in `proof.lean`.
- The fixture sits beside the claim: `example … := rfl`, or `#guard` once the model calls `mergeSort` or other well-founded recursion. A comment above it names the test file that holds the claim against the real code.
- `claims.lean` imports each `proof.lean` and pins `#print axioms` for its claim under `#guard_msgs`, set to the axioms it prints: a subset of `propext`, `Classical.choice`, `Quot.sound`. Anything more (`sorryAx`, `Lean.ofReduceBool` from `native_decide`, a declared `axiom`) is a cheat, and the pin turns it red.
- Mutants live in a scratch copy of the `proofs` folder: break the model's definition there and prove `¬Claim` against the fixture. They rerun only when the claim or its model changes.

## Setup

1. Copy [templates/lean/](templates/lean/) into `verify/proofs/` (or a scratch folder named `proofs`).
2. `lean-toolchain`: `leanprover/lean4:v<latest stable>` from the Lean 4 GitHub releases. This file is the only place Lean's version lives; elan fetches it into the shared `lean-toolchains` volume, about 3 GB per version, once per machine.
3. Bring the image pins current: the elan release in the URL, its installer's sha256, and each base image's digest (`docker buildx imagetools inspect <image> --format '{{json .Manifest.Digest}}'`). The tag names the elan version, so it changes with the pin.
4. An empty `claims.lean`.
5. Ignore `verify/proofs/.lake/` and `verify/proofs/lake-manifest.json`, which holds nothing while there are no dependencies.
6. `"check-proofs": "docker compose -f verify/proofs/compose.yaml run --rm -q --build --quiet-build lean"`. `--build` matters: compose reuses any image carrying the tag, and every repo shares this tag.

Done when `pnpm check-proofs` builds the empty project.

## Why the layout looks odd

Lake's TOML globs reject the quoted names kebab-case modules need, so `srcDir` sits one level up and the library takes its folder's name: `proofs.+` covers every `proofs.«rule-name».*`, imported as `import proofs.«rule-name».spec`. The folder and the `/proofs` mount point both stay `proofs`, since `srcDir` resolves inside the container.

## Proving

- `grind` closes most case splits and arithmetic, `omega` the rest; `decide` for decidable goals.
- `grind` builds no existential witness from parts, such as a `(row, position)` pair: `rintro` the hypothesis and `exact ⟨…⟩`.
- Keep a predicate over lists folded and hand `grind` its nil, cons and append lemmas; unfolded into `∃`, it stalls.
- Without Mathlib: `Nat.le_of_not_lt` for `by_contra`, `conv => lhs` for `conv_lhs`, and no `tauto` or `aesop`.
- A custom `simp` lemma stated too generally loops against core lemmas; narrow it to the concrete type.
- `omega` can miss a hypothesis reached through a type abbreviation; restate the lemma over bare `Nat` or `Int`.
- Lemma names drift between releases and `--wfail` makes a deprecation fatal. The image has no shell, so search the toolchain from outside: `docker run --rm -v lean-toolchains:/toolchains:ro debian:bookworm-slim grep -rn '<name>' /toolchains`.
- `trace_state` before a failing tactic prints the goal its error truncates.
- `matches` is a keyword, and a structure named like its namespace (`World.World`) breaks field notation.
