# TLA+

TLC in a pinned, tool-only container, driven by a wrapper that derives every run from one claims index.

## Layout

```
verify/models/
  compose.yaml  check-models.ts  claims.ts
  <unit>/spec.tla      the model: variables, actions, rules
  <unit>/mutants.tla   EXTENDS spec; one broken helper per mutant
  <unit>/witness.tla   optional: a path the e2e suite replays
```

- A module's name must equal its file name, so files take role names (`spec`, `mutants`, `witness`) and stay kebab-safe.
- `claims.ts` is the only list of rules: per unit, `holds` (invariants), `properties` (temporal rules), `findings` (invariants known to break today) and `mutants`. The wrapper writes every config from it with `SPECIFICATION Spec`; there is no hand-written `.cfg`, since a parsed one once let a comment silently drop invariants.

## Writing the spec

- Name actions and rules in the **reader's** words (`YouPressPay`, `TheChargeLands`, `ChargedOnce`), so a counterexample reads as a story the operator can check without TLA+.
- Each action is one indivisible step in the code. An `await`, a callback or a released lock inside a handler splits it into two actions; merged, they hide the interleavings TLA+ is there to find.
- `Next` is a disjunction of actions; actions that differ only by an argument are one parameterized action (`YouFollowALink(p)`). TLC names each coverage row after the operator that holds an action's body, and the wrapper fails any action never enabled, so an action no state needs is deleted.
- A rule about eventually reaching a state is a `PROPERTY`, not an invariant over a ghost variable. A property needs fairness in `Spec`, or the system may simply stop; fairness on an outside actor (the user, the network) promises it always acts, which the real one may not, so name it as an assumption.
- Deadlock checking is on: a correct end state needs a step out (a `Done` action that changes nothing).
- Keep constants small; TLC explores every reachable state, and the wrapper prints the count as information only.
- Mutants override a small named helper in the spec (`CanCharge`, `RecordCharge`) through `CONSTANT Helper <- Mutant`, so each is one fast run with no copy. A copied action goes stale while still breaking its rule. A mutant targets a holding rule and never calls the definition it replaces, which overflows the stack.
- A rule that breaks is a finding. Report it and list it under `findings`, where the wrapper checks on every run that it still breaks. When a fix lands, that check turns red, which is the signal to move the rule to `holds`.

## Witness

The tie to the code: one path, written once in `witness.tla`, that TLC confirms reachable and an end-to-end test replays against the real code.

- `Observed` maps model state to what the test can read (a rendered value, a stored row, a response); `Settled` holds when no environment action (a request, a timer, an animation) is in flight.
- `Path` is a sequence of `[step |-> "<Action>", seen |-> <Observed>]`. `WitnessNext` lets environment actions run freely while unsettled and takes the next reader step only once settled and matching. `PathNotReplayed` is the invariant TLC must break.
- The test parses `Path` from the file, asserts its own step names equal the path's, then performs each step and polls the observables until they equal `seen`. A step whose observables do not change needs an arrival marker of its own (a status message, say), or the poll passes before the step lands.

## Chart

When the operator wants to see how a model behaves, draw it with [scripts/chart.ts](scripts/chart.ts). The script turns the model's reachable states into a Mermaid chart, using a view module you write to name each state and step in the reader's words; `--help` lists what the view exports. Keep the view, any narrowing module and the output in the scratchpad unless the operator asks to keep them, and open `chart.html` to show the result. A chart only shows what the model contains, so it is for reviewing behaviour, not for detecting drift.

## Setup

1. Copy [templates/tla/](templates/tla/) into `verify/models/`. The wrapper is project-local and runs on Node's type stripping.
2. Bring the pins current: the TLC release in the jar URL, the jar's sha256, the base image digests (`docker buildx imagetools inspect <image> --format '{{json .Manifest.Digest}}'`), and the tag, which names the TLC version.
3. `"check-models": "node verify/models/check-models.ts"`.

Done when `pnpm check-models` passes with an empty `claims`.

## Reading TLC

- Exit codes: 0 every rule holds, 12 an invariant broke, 13 a property broke. Anything else stops the check with TLC's output: 11 is a deadlock, 151 a config or parse error.
- The wrapper runs TLC with `-metadir /tmp/tlc` against a read-only mount, which keeps the tree clean (TLC 1.7.4 has no `-noGenerateSpecTE`), and builds the image once before its runs, since parallel `compose run`s race the first build.
- Coverage rows and traces are read from TLC's text output, held stable by the jar pin; `-tool` mode prints numbered messages and is the upgrade path.
