---
name: guardrails
description: Tooling that keeps agents on track, run as one gate, with setups for TypeScript and Rust. Use when scaffolding a repo, or adding, tightening, or retrofitting its type, lint, format, dead-code, dependency, complexity, or mutation checks, or its git hooks.
---

An agent obeys a failing check more reliably than a style guide. Every convention a machine can check lives in a tool, and the **gate** runs every tool. The gate is green end to end, so anything it reports belongs to whoever is working.

## Pick the language

The rules here hold in both languages. Each language file names its owners, setup, and templates; read the repo's before touching its tooling:

- TypeScript: [typescript.md](typescript.md)
- Rust: [rust.md](rust.md)

## One owner per concern

Each concern has exactly one owner, and the language file's table names it. A concern no tool covers is a **gap**, named there too, so nobody assumes a check exists.

When two tools cover one concern, turn the second one's rules off with a note naming the owner. Otherwise the same finding shows up twice, and the two tools disagree at the edges.

## The gate

- `check` only reports. `fix` autofixes, then reports whatever it couldn't fix. Each is one named command in the language's runner, so the hook, the human, and the agent all run the same thing. Pre-push runs `check`.
- A warning fails the gate just like an error does. `warn` only changes how the editor paints it.
- Unit tests belong in the gate. Slow suites stay out of it, and `AGENTS.md` lists how to run them.
- Output shows only on failure. Agents skim past banners, and a passing tool's report buries the one that failed.

Setup is done when `check` exits clean without a single new suppression. Then add these lines to `AGENTS.md`, with the repo's own commands:

```md
- `check` reports, `fix` mutates. Run `fix` once after a chunk of work, not after every edit
- `check` is green end to end, so anything it reports is yours
```

## Suppressions carry a reason

Every escape hatch states its reason, in the syntax its tool provides. A suppression outlives the problem it was written for, so one that no longer suppresses anything fails the gate wherever the tool can tell. The language file names the hatches nothing watches, and review looks for those. When a whole directory shares the reason, use a scoped config block with a note instead of repeating the inline comment.

## Existing repos

A retrofit gets the gate green first and strict second.

1. Turn on one tool at a time, in the order the language file gives, and get each green before the next.
2. Set each **ceiling** at the worst case the code already has, with a note saying so. Then **ratchet** it down as the code under it gets refactored. A ceiling only ever moves down.
3. Autofix one rule at a time, and review each batch as a diff: fixers change behaviour at the edges.
4. Treat dead-code findings in an old tree as claims. Trace each one before deleting.

## Growing the guardrails

When an agent repeats a mistake a machine can detect, first look for a structural fix that makes it unwritable: one owner for the state, internals a wrong import cannot reach, a type that rejects the bad value. A check is the fallback: a ban on the pattern, scoped to where the mistake happens (or banned everywhere, with the one module that owns it exempt), with a message written as the instruction the agent follows next.

**Prove every check with a planted violation.** Plant the past mistake and watch the gate fail, because a ban that matches nothing, or a detector that never ran, reports the same empty list as one that found nothing.

A mistake of understanding gets prose instead, placed where the agent will read it. A check that has caught nothing in a long while is a candidate for deletion.

## Audits

Audits run on demand, never in the gate.

- **Mutation testing** finds tests that run code without asserting anything about it. It isn't part of setup; add it once there's a suite worth auditing. Read the surviving mutants and ignore the score, because a test written only to move the score is a tautology.
- **Formal verification**: when a rule must hold past what example tests reach (async steps interleaving, every input to a parser), the `formal-verification` skill, published alongside this one, checks it with a property test, TLA+ or Lean.
