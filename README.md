# Agent skills

Skills for [Claude Code](https://claude.com/claude-code). Each is a folder under `skills/` that installs on its own.

## Checking work

- [`browser-verify`](skills/browser-verify/SKILL.md) checks front-end work in its own Chrome: whether the page renders, how an interaction behaves, screenshots and console errors. On request it opens a visible browser or runs a Lighthouse audit, a performance trace or a heap snapshot. Each session gets its own browser, so parallel sessions don't collide. Needs Chrome and the `chrome-devtools` CLI (`npm i -g chrome-devtools-mcp`).
- [`critique`](skills/critique/SKILL.md) is a lightweight second opinion on your pending changes. Two reviewers who never saw the session read the diff, one hunting bugs and one questioning the design, and the agent weighs what they find in a single pass. Larger review setups spawn many more agents and take much longer; this one aims for most of the value at a fraction of the cost. Needs a git repository.
- [`formal-verification`](skills/formal-verification/SKILL.md) checks one rule in the code with the cheapest tool that could show it breaking: a property test on the real code, a TLA+ model when steps can interleave, or a Lean proof when every input matters. Rules worth keeping stay in the repo, paired with a test on the real code that fails if the two drift apart. Needs Docker for TLA+ and Lean.
- [`guardrails`](skills/guardrails/SKILL.md) sets up type, lint, format, dead-code and complexity checks in a TypeScript repo, with git hooks and a single `check` command that runs them all. An agent obeys a failing check more reliably than a style guide. Needs Node and pnpm.

## Working with a service

- [`umami`](skills/umami/SKILL.md) covers running Umami yourself: upgrades and migrations that fail quietly, adding the tracker to sites with client-side routing, putting it behind a reverse proxy, and querying the data over MCP to find bots. Assumes Docker Compose; agent access needs Umami 3.4.0 or later.
- [`wikipedia-research`](skills/wikipedia-research/SKILL.md) reads Wikipedia through its own APIs in any language edition, starting from the summary and section list. The agent gets the article's actual text instead of a fetch tool's summary of it. Needs `curl` and `python3`.

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

`pnpm install` sets up git hooks that lint and format staged files on commit. `pnpm check` runs every check (format, types, lint), and `pnpm fix` fixes what it can.

## Licence

[MIT](LICENSE)
