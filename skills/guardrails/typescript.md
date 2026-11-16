# TypeScript guardrails

The TypeScript branch of [`guardrails`](SKILL.md). The rules there apply; this file names the owners and the setup.

| Concern | Owner |
| --- | --- |
| Types | `tsc`, or the framework's checker (`astro check`) |
| Formatting | Prettier |
| Code quality, house style, banned patterns | ESLint |
| Unused files, exports, dependencies | Knip |
| Duplication, complexity, boundaries, cycles | Fallow |
| Install scripts | pnpm's `allowBuilds` |
| Test strength | Stryker, as an audit |

Licences and advisories are a **gap** in the gate; `pnpm audit` runs as an audit.

## Setup

[`templates/typescript/`](templates/typescript/) holds the house configuration. The notes in it are reasons, so keep them in the copy. Commands assume pnpm.

1. **Survey.** Read `package.json`, the lockfile, and any config these tools already have. Pin to the installed majors, and check each template against its tool's docs for that version.
2. **Install** as devDependencies: `typescript@^6 @types/node eslint @eslint/js typescript-eslint eslint-plugin-unicorn eslint-plugin-perfectionist @eslint-community/eslint-plugin-eslint-comments globals jiti prettier knip fallow lefthook vitest`. Keep TypeScript on 6 until typescript-eslint supports 7, because it refuses to load under 7. ESLint needs `jiti` to load a `.ts` config.
3. **Copy the templates**, then fit their globs to the repo's layout.
4. **Wire the gate.** Add the scripts `"check": "lefthook run check"` and `"fix": "lefthook run fix"`, then run `pnpm exec lefthook install`. pnpm blocks lefthook's postinstall unless `allowBuilds` in `pnpm-workspace.yaml` lists `lefthook: true`, so without that entry the hooks don't install themselves. On pnpm 12.11+, deny fallow's bundled agent skills in the same file with `permissions: { fallow: { skills: false } }`: they duplicate this setup and hand dead code to fallow, and the denial stops pnpm offering them. Older pnpm rejects or warns on the key, so leave it out until the pin moves.
5. **Go green.** Run `pnpm fix`, then `pnpm check`.
6. **Tell the agents** with the gate lines from [SKILL.md](SKILL.md), as `pnpm check` and `pnpm fix`.

## The gate

`check` and `fix` are named Lefthook commands. ESLint runs with `--max-warnings 0`, which is what makes a warning fail. `lefthook run` installs the git hooks on its first run; where git belongs to the operator, add `--no-auto-install` to both scripts.

## Layout

- One config file per tool, at the root. Use `.ts` wherever the tool can load it.
- Caches go in `node_modules/.cache/<tool>/`, audit reports in `.cache/`, scratch files in `temp/`. All three are gitignored, and so is `.claude/worktrees/`.
- Imports go through `#` subpaths declared in `package.json` `imports`, with explicit `.ts` extensions.
- Browser code lives in directories that ESLint gives browser globals. Everything else sees Node's globals. A Node module that has to live in a browser directory imports `process` and `Buffer` from `node:`.
- File names are kebab-case, which `unicorn/filename-case` enforces.

## Suppressions

- ESLint: `// eslint-disable-next-line <rule> -- <reason>`
- Knip: `/** @public */` on a deliberate export
- Fallow: `// fallow-ignore-next-line <issue> -- <reason>`, or `thresholdOverrides[].reason` in the config

The ESLint and Fallow templates fail any suppression that no longer suppresses anything, and the Fallow template also fails one with no reason.

## Existing repos

- Turn the tools on in this order: tsconfig flags, then ESLint, then Knip, then Fallow.
- Unicorn's fixers change behaviour at the edges (array-likes, sparse arrays, `this`), and its renames are mechanical (`args` becomes `arguments_`, `needsAdmin` becomes `isNeedsAdmin`).
- Trace a Knip finding with `knip --trace-file <file> --trace-export <name>`.

## Fallow in practice

- **`fallow fix` stays out of `fix`.** It strips `export` from unused exports and edits `package.json`, so it unexports work an agent has not wired up yet.
- **A cognitive ceiling is a per-unit regression detector.** Give each unit its own `thresholdOverrides` entry at its measured score plus 2: an exact ceiling fires on any incidental edit and trains a reflex bump, and one shared ceiling hides growth. Read actuals from `threshold_overrides[].metrics` in `health --complexity --format json`.
- **Astro markup scores as one `<template>` unit**, so every `class:list` ternary adds to it. The fix is a subcomponent; hoisting class lists into frontmatter only moves the score.

## Growing the guardrails

The ban is a `no-restricted-syntax` or `no-restricted-imports` block scoped to the files where the mistake happens, with its `message` written as the instruction. ESLint replaces a rule's options wholesale, so a scoped block has to spread the base list back in.

## Audits

**Stryker** is the mutation tester. Read its `Survived` mutants.
