# TLA+

TLC in a pinned, tool-only container, driven by a wrapper that derives every run from one claims index.

## Layout

```
verify/models/
  compose.yaml  check-models.ts  claims.ts
  <unit>/spec.tla      the model: variables, actions, rules
  <unit>/mutants.tla   EXTENDS spec; one broken helper per mutant
  <unit>/witness.tla   EXTENDS spec; optional: a path a browser test replays
```

- A module's name must equal its file name, so files take role names (`spec`, `mutants`, `witness`) and stay kebab-safe.
- `claims.ts` is the only list of rules (`holds` are invariants, `properties` temporal). The wrapper writes every config from it with `SPECIFICATION Spec`; there is no hand-written `.cfg`, since a parsed one once let a comment silently drop invariants.

## Writing the spec

- Name actions and rules in the **reader's** words (`YouPressPay`, `TheChargeLands`, `ChargedOnce`), so a counterexample reads as a story the operator can check without TLA+.
- Each action is one indivisible step in the code. An `await`, a callback or a released lock inside a handler splits it into two actions; merged, they hide the interleavings TLA+ is there to find.
- `Next` is a disjunction of actions; actions that differ only by an argument are one parameterized action (`YouFollowALink(p)`).
- A rule about eventually reaching a state is a `PROPERTY`, not an invariant over a ghost variable. A property needs fairness in `Spec`, or the system may simply stop; fairness on an outside actor (the user, the network) promises it always acts, which the real one may not, so name it as an assumption.
- Deadlock checking is on: a correct end state needs a step out (a `Done` action that changes nothing).
- Mutants override a small named helper in the spec (`CanCharge`, `RecordCharge`) through `CONSTANT Helper <- Mutant`, so each is one fast run with no copy. A copied action goes stale while still breaking its rule. A mutant never calls the definition it replaces, which overflows the stack.
- A rule that breaks is a finding: report it and list it under `findings`.

## Witness

The tie to the code: one path, written once in `witness.tla`, that TLC confirms reachable and a browser test replays against the real code.

- `Observed` maps model state to what the test can read (a rendered value, a stored row, a response); `Settled` holds when no environment action (a request, a timer, an animation) is in flight.
- `Path` is a sequence of `[step |-> "<Action>", seen |-> <Observed>]`. `WitnessNext` lets environment actions run freely while unsettled and takes the next reader step only once settled and matching. `PathNotReplayed` is the invariant TLC must break.
- The test parses `Path` from the file, asserts its own step names equal the path's, then performs each step and polls the observables until they equal `seen`. A step whose observables do not change needs an arrival marker of its own (a status message, say), or the poll passes before the step lands.

## Chart

When the operator wants to see how a model behaves, draw it with [scripts/chart.ts](scripts/chart.ts). The script turns the model's reachable states into a Mermaid chart, using a view module you write to name each state and step in the reader's words; `--help` lists what the view exports. Keep the view, any narrowing module and the output in the scratchpad unless the operator asks to keep them, and open `chart.html` to show the result. A chart only shows what the model contains, so it is for reviewing behaviour, not for detecting drift.

## Setup

1. Copy [templates/tla/](templates/tla/) into `verify/models/`, then run the project's formatter. The wrapper is project-local and runs on Node's type stripping.
2. Bring the pins current: the TLC release in the jar URL, the jar's sha256, the base image digests, and the tag, which names the TLC version. Coverage rows and traces are read from TLC's text output, held stable by the jar pin; `-tool` mode prints numbered messages and is the upgrade path.
3. `"check-models": "node verify/models/check-models.ts"`.

Done when `pnpm check-models` passes with an empty `claims`.
