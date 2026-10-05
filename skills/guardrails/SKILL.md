---
name: guardrails
description: Tooling that keeps agents on track in a TypeScript repo, run as one gate. Use when scaffolding a TypeScript repo, or adding, tightening, or retrofitting its type, lint, format, dead-code, complexity, or mutation checks, or its git hooks.
---

An agent obeys a failing check more reliably than a style guide. Every convention a machine can check lives in a tool, and the **gate** runs every tool. The gate is green end to end, so anything it reports belongs to whoever is working.

## One owner per concern

| Concern | Owner |
| --- | --- |
| Types | `tsc`, or the framework's checker (`astro check`) |
| Formatting | Prettier |
| Code quality, house style, banned patterns | ESLint |
| Unused files, exports, dependencies | Knip |
| Duplication, complexity, boundaries, cycles | Fallow |
| Test strength | Stryker, as an **audit** |

When two tools cover one concern, turn the second one's rules off with a note naming the owner. Otherwise the same finding shows up twice, and the two tools disagree at the edges.

## Setup

[`templates/`](templates/) holds the house configuration. The notes in it are reasons, so keep them in the copy. Commands assume pnpm.

1. **Survey.** Read `package.json`, the lockfile, and any config these tools already have. Pin to the installed majors, and check each template against its tool's docs for that version.
2. **Install** as devDependencies: `typescript@^6 @types/node eslint @eslint/js typescript-eslint eslint-plugin-unicorn eslint-plugin-perfectionist @eslint-community/eslint-plugin-eslint-comments globals prettier knip fallow lefthook vitest`. Keep TypeScript on 6 until typescript-eslint supports 7, because it refuses to load under 7.
3. **Copy the templates**, then fit their globs to the repo's layout.
4. **Wire the gate.** Add the scripts `"check": "lefthook run check"` and `"fix": "lefthook run fix"`, then run `pnpm exec lefthook install`. pnpm blocks lefthook's postinstall, so the hooks don't install themselves.
5. **Go green.** Run `pnpm fix`, then `pnpm check`. You're done when `check` exits clean without a single new suppression.
6. **Tell the agents.** Add the gate lines below to `AGENTS.md`.

## The gate

`check` only reports. `fix` autofixes, then reports whatever it couldn't fix. Both are named Lefthook commands, so the hook, the human, and the agent all run the same thing. Pre-push runs `check`.

- ESLint runs with `--max-warnings 0`, so a warning fails the gate just like an error does. `warn` only changes how the editor paints it.
- Unit tests belong in the gate. Slow suites stay out of it, and `AGENTS.md` lists how to run them.
- Output shows only on failure. Agents skim past banners, and a passing tool's report buries the one that failed.

```md
- `pnpm check` reports, `pnpm fix` mutates. Run `fix` once after a chunk of work, not after every edit
- `check` is green end to end, so anything it reports is yours
```

## Layout

- One config file per tool, at the root. Use `.ts` wherever the tool can load it.
- Caches go in `node_modules/.cache/<tool>/`, audit reports in `.cache/`, scratch files in `temp/`. All three are gitignored, and so is `.claude/worktrees/`.
- Imports go through `#` subpaths declared in `package.json` `imports`, with explicit `.ts` extensions.
- Browser code lives in directories that ESLint gives browser globals. Everything else sees Node's globals. A Node module that has to live in a browser directory imports `process` and `Buffer` from `node:`.
- File names are kebab-case, which `unicorn/filename-case` enforces.

## Suppressions carry a reason

Every escape hatch states its reason, using the syntax its tool provides:

- ESLint: `// eslint-disable-next-line <rule> -- <reason>`
- Knip: `/** @public */` on a deliberate export
- Fallow: `// fallow-ignore-next-line <issue> -- <reason>`, or `thresholdOverrides[].reason` in the config

The ESLint template fails any suppression that no longer suppresses anything. When a whole directory shares the reason, use a scoped config block with a note instead of repeating the inline comment.

## Existing repos

A retrofit gets the gate green first and strict second.

1. Turn on one tool at a time, and get each green before the next: tsconfig flags, then ESLint, then Knip, then Fallow.
2. Set each **ceiling** at the worst case the code already has, with a note saying so. Then **ratchet** it down as the code under it gets refactored. A ceiling only ever moves down.
3. Autofix one rule at a time. Unicorn's fixers change behaviour at the edges (array-likes, sparse arrays, `this`), so review each batch as a diff.
4. Treat Knip's dead-code findings in an old tree as claims. Trace each one (`knip --trace-file <file> --trace-export <name>`) before deleting.

## Growing the guardrails

When an agent repeats a mistake a machine can detect, the fix is a check. Scope a `no-restricted-syntax` or `no-restricted-imports` block to the files where the mistake happens, and write its `message` as the instruction the agent follows next. ESLint replaces a rule's options wholesale, so a scoped block has to spread the base list back in.

A mistake of understanding gets prose instead, placed where the agent will read it. A check that has caught nothing in a long while is a candidate for deletion.

## Audits

Audits run on demand, never in the gate.

- **Stryker** finds tests that run code without asserting anything about it. It isn't part of setup; add it once there's a suite worth auditing. Read the `Survived` mutants and ignore the score, because a test written only to move the score is a tautology.
- **Lean**: when one rule is implemented twice (a predicate and its SQL filter, client and server validation), the `lean-audit` skill, published alongside this one, proves or refutes that the two halves agree.
