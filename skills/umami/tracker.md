# Tracker

`script.js` learns the URL only by wrapping `history.pushState` and `replaceState`, and each time it executes it sets up a new, separate tracker. Both matter on sites with client-side routing (Astro's `<ClientRouter />`, any SPA), where mistakes show up as inflated or missing counts rather than errors.

## Embedding

- **Load the tracker once.** Re-executing it on navigation (Astro's `data-astro-rerun`) adds another tracker each time: the nth navigation sends n+1 pageviews, and every `data-umami-event` click and performance beacon multiplies the same way. `window.umami` keeps pointing at the first tracker, so `umami.track()` calls, custom events and session counts stay correct while pageviews and clicks inflate.
- **Resync on back and forward.** A router traversing history never calls `pushState`, so that pageview is lost and later events carry the previous URL. After the swap, call `history.replaceState(history.state, '', location.href)` when the navigation type is `traverse`.
- **Every URL change through the history API is a pageview.** That includes an app rewriting its own query string with `replaceState` (filters, stripping a tracking parameter). `data-exclude-search` makes query-only changes count as the same page.
- **Gate on the hostname, not only the build.** A tracker gated on `import.meta.env.PROD` still loads in local previews, e2e runs and LAN testing, all reporting to the real site. Set `data-domains` to the production hostname from the same source canonical URLs use (`Astro.site?.hostname`), so a wrong value breaks visibly. The tracker then sends nothing on other hosts, though `window.umami` stays defined.
- `data-domains` is an exact hostname match, so it also drops visitors reading through Google Translate's proxy (`example-com.translate.goog`). Add that hostname to the comma-separated list to keep them.
- **Filter bots in `data-before-send`.** The attribute names a global function, defined before the tracker loads, that receives every payload (`event`, `performance`, `identify`) and drops it by returning a falsy value. Drop `navigator.webdriver` and the fixed screen sizes the data shows to be crawlers ([agent-access.md](agent-access.md)); `800x600` is the headless default.

## Custom events

- **Track links from a click listener, not `data-umami-event`.** On an `<a href>`, the tracker cancels the click, waits for the beacon request to finish, then sets `location.href`. That delays every click, drops the `download` attribute and bypasses the client router. Call `umami.track()` from a listener instead; a `<button>` with `data-umami-event` is fine.
- The tracker reads `data-umami-event-*` attributes at click time, so a component can update them as its state changes.
- Send one event per completed action: a search when the user picks a result or closes the box, with the query and result count, rather than one per keystroke.
- Limits: event names are cut at 50 characters, string values at 500, and event data holds at most 50 properties.

## Testing

- In e2e tests, stub `window.umami = { track }` with an init script and assert on the recorded calls. The real tracker keeps any `window.umami` it finds, so the stub holds even when the script loads.
- A `data-before-send` filter on `navigator.webdriver` also drops the Playwright runner's own traffic. Playwright's MCP browser hides the flag, so pin it with an init script before testing either path.
- To prove a change against real traffic, route `**/api/send` to abort in a browser and count the payloads per navigation. Nothing reaches the database, and on the live site it also checks custom event payloads before any visitor sends them.
- To prove an unshipped change on the live site, bundle the patched module (esbuild, IIFE) and add it as an init script so it runs before the page's own copy; a custom element's first `define` wins. Stub any live chunk that imports the same library, or the two copies split its singletons.
