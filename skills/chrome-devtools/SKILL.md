---
name: chrome-devtools
description: Drive a real Chrome when a task needs the page as a browser renders it. Use to verify front-end work (rendering, interactions, screenshots, console errors), to read a site that WebFetch returns empty or broken, or when a visible browser, a Lighthouse audit, a performance trace, or a heap snapshot is needed.
---

# Chrome DevTools

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

Use the URL the request names. To verify this checkout's own front-end when none is named:

1. A dev server already running for this checkout; Astro records its `url` in `.astro/dev.json` at the worktree root (`git rev-parse --show-toplevel`) while it runs. A crashed server leaves the file behind and another project can take the port, so check the page `<title>` is this project's
2. Otherwise start the project's dev script as a background job, take the URL it prints, and stop it once the check is done
3. Ask when neither yields a URL

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

## Reading a page

- `evaluate_script "() => document.body.innerText" --pageId 2` returns the rendered text in one call, without the uids and roles a snapshot carries; narrow it to `main` or `article` when navigation crowds the content, and add `--filePath` for a long page
- A page that renders from an API often holds its data whole in the response: `list_network_requests 2 --resourceTypes fetch xhr`, then `get_network_request 2 --reqid <id>`

## Reading styles

- `getComputedStyle` returns an interpolated value mid-transition, so sample it once the transition has run its duration
- Check a `:hover` rule with `hover 2 <uid>` then `get_css_styles 2 <uid>`, which lists the rules that matched; the computed value right after `hover` is still mid-transition

## Finish

```sh
chrome-devtools stop --sessionId "$CLAUDE_CODE_SESSION_ID"
```

`stop` closes Chrome and deletes its temporary profile. Every task ends with `stop`. A verification report names the URL, what was checked, the console errors found (or none), and any screenshot path.

## Visible browser and deep diagnostics

`start` launches headless. When the user wants to watch, or for visual debugging, open the session with `--headless=false` instead (chrome-devtools-mcp 1.10.1 or later):

```sh
chrome-devtools start --headless=false --sessionId "$S"
```

Lighthouse audits, performance traces, and heap snapshots are CLI commands too (`lighthouse_audit`, `performance_start_trace`, `take_heapsnapshot`). `chrome-devtools <command> --help` lists each one's parameters.
