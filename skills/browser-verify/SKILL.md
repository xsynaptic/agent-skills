---
name: browser-verify
description: Verify front-end work in a real Chrome browser. Use when checking that a page renders, testing an interaction, capturing a screenshot, or reading console errors on a dev server; also when a visible browser, a Lighthouse audit, a performance trace, or a heap snapshot is needed.
---

# Browser verify

Parallel sessions each drive their own Chrome through the `chrome-devtools` CLI, keyed on this session's ID.

## Setup

Only when `chrome-devtools` is missing from the PATH. The CLI ships in the `chrome-devtools-mcp` npm package and drives the Chrome already installed on the machine. Ask before installing it globally:

```sh
npm install -g chrome-devtools-mcp
chrome-devtools --version
```

## Session

Every CLI call carries `--sessionId "$CLAUDE_CODE_SESSION_ID"`. `start` opens the session, before any other command, and launches an isolated, headless Chrome. A tool command that runs first auto-starts the daemon on a shared persistent profile instead, and the next session to try fails with "The browser is already running". When that error appears, run `stop` and then `start` for this session.

## Target URL

1. The URL the request names
2. Otherwise a dev server already running for this checkout; Astro records its `url` in `.astro/dev.json` at the worktree root (`git rev-parse --show-toplevel`) while it runs
3. Otherwise start the project's dev script as a background job, take the URL it prints, and stop it once the check is done
4. Ask when none of these yields a URL

## The loop

Required parameters are positional; optional ones are flags. The page ID is the number on the `[selected]` line that `new_page` prints.

```sh
S="$CLAUDE_CODE_SESSION_ID"
chrome-devtools start --sessionId "$S"
chrome-devtools new_page "$URL" --sessionId "$S"
chrome-devtools take_snapshot 2 --sessionId "$S"
chrome-devtools click 2 1_4 --sessionId "$S"
chrome-devtools take_snapshot 2 --sessionId "$S"
chrome-devtools take_screenshot 2 --filePath "$SHOT" --sessionId "$S"
chrome-devtools list_console_messages 2 --types error --sessionId "$S"
```

- `take_snapshot` returns the accessibility tree with element uids; act on those uids with `click`, `fill`, `hover`, or `press_key`
- Snapshot again after every action, since uids from an older snapshot go stale
- `take_screenshot` carries `--filePath "$SHOT"` every time, an absolute path in your scratchpad directory (`$TMPDIR` when there is none); the default leaves a multi-MB PNG in a temp dir nothing cleans up. Open it with Read
- `evaluate_script "<function>" --pageId 2` reads values the snapshot lacks

## Finish

```sh
chrome-devtools stop --sessionId "$CLAUDE_CODE_SESSION_ID"
```

`stop` closes Chrome and deletes its temporary profile. The check is done when `stop` has run and the report names the URL, what was checked, the console errors found (or none), and any screenshot path.

## Visible browser and deep diagnostics

`start` launches headless. When the user wants to watch, or for visual debugging, open the session with `--headless=false` instead (chrome-devtools-mcp 1.10.1 or later):

```sh
chrome-devtools start --headless=false --sessionId "$S"
```

Lighthouse audits, performance traces, and heap snapshots are CLI commands too (`lighthouse_audit`, `performance_start_trace`, `take_heapsnapshot`). `chrome-devtools <command> --help` lists each one's parameters.
