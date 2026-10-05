# Agent skills

Skills for [Claude Code](https://claude.com/claude-code). Each is a folder under `skills/` that installs on its own.

- [`browser-verify`](skills/browser-verify/SKILL.md) checks front-end work in an isolated Chrome: rendering, interactions, screenshots, console errors, and on request a visible browser, Lighthouse audit, performance trace, or heap snapshot. Requires Chrome and the `chrome-devtools` CLI (`npm i -g chrome-devtools-mcp`).
- [`critique`](skills/critique/SKILL.md) sends the pending changes to two isolated subagents, one hunting bugs and one questioning the design, then weighs what they find. Ask for a critique or a second opinion before committing. Requires a git repository.
- [`guardrails`](skills/guardrails/SKILL.md) sets up type, lint, format, dead-code, and complexity checks plus git hooks in a TypeScript repo, run as a single `check` and `fix` gate. Fires when scaffolding a repo or tightening its checks. Requires Node and pnpm.
- [`lean-audit`](skills/lean-audit/SKILL.md) models one rule that is implemented twice (a policy predicate and its SQL filter, client and server validation) in Lean 4, then proves or refutes that the halves agree. Ask for a Lean audit or a formal proof. Requires the Lean 4 toolchain via [elan](https://github.com/leanprover/elan).
- [`wikipedia-research`](skills/wikipedia-research/SKILL.md) reads Wikipedia through its APIs, summary and section list first, in any language edition. Fires on a Wikipedia URL or a request to look something up there. Requires `curl` and `python3`.

## Install

With the [`skills`](https://github.com/vercel-labs/skills) CLI:

```sh
npx skills add xsynaptic/agent-skills
npx skills add xsynaptic/agent-skills --skill critique
```

Or clone the repo and copy or symlink a skill into `~/.claude/skills/`:

```sh
git clone https://github.com/xsynaptic/agent-skills.git
cp -R agent-skills/skills/critique ~/.claude/skills/
ln -s "$PWD/agent-skills/skills/critique" ~/.claude/skills/critique
```

## Development

`pnpm install`, then `pnpm exec lefthook install` to format Markdown with Prettier on commit. `pnpm check` and `pnpm fix` run it by hand.

## Licence

[MIT](LICENSE)
