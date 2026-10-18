# Agent Access

An agent reads Umami through the instance's built-in MCP endpoint (`/mcp`, 3.4.0+) with an API key owned by a view-only user. A key carries its owner's permissions exactly, so the owner's team membership is the whole scope.

## Setup

Agent: set `MCP_ENABLED=1` on the Umami container and recreate it. `/mcp` then answers 401 without a key; 404 means it is off.

Operator, in the dashboard as admin:

1. Create a team for the site. Teams are the only way to share one site.
2. Transfer the site into it: Websites (not Admin), the site, Settings, Transfer website. ID and data are unchanged.
3. Admin, Users: create a `view-only` user (`umami-agent`) with a long random password and no 2FA.
4. Admin, Teams, the team, Add member: View only.
5. Log in as that user, Settings, API keys: create one. It is shown once.
6. Register it from your own terminal, never through a `!` command, which lands the key in the transcript:
   ```sh
   claude mcp add -s user -t http umami-<instance> https://<host>/mcp -H "Authorization: Bearer umami_…"
   ```
   Restart the session.

**Prove scope** before any query: `list_websites` returns `[]` (it lists sites the owner owns, never team sites) and `get_website_daterange` on the site's ID returns data. A non-empty listing means the owner owns sites, sits in another team, or is admin. The operator confirms the single team membership; the key cannot prove what it cannot see.

Revoke by deleting the key. Stdio (`@umami/mcp`, pinned) is only for Umami Cloud or an instance with the endpoint off.

## Querying

- Every filter field takes operator prefixes (`neq.SG`, `c./blog`, `re.^signup-`), though the schemas claim UTM only. Filters AND together; exclude a combination by subtracting two queries.
- There is no `screen` filter. Reach a screen cohort through the country, city or OS it co-occurs with.
- `get_website_metrics` with an `event` filter returns `[]` for pageview dimensions. Use `get_event_stats` with `event` plus one dimension value, or `get_sessions` with `event`, which returns each session's screen, city and language.
- The `language` ranking folds locales to the base (`zh`), while sessions and filters keep the full tag (`zh-CN`).
- Bare dates (`2026-09-17`) work. Ranges are UTC unless `timezone` is set.
- For anything MCP lacks, the same key works as a Bearer token on REST: `/api/websites/<id>/metrics`, `/event-data/values`, `/export`.

## Reading the data

- Umami stores no IP, user agent or ASN. It fingerprints a cohort; blocking it takes the edge's logs to turn the fingerprint into an ASN or IP.
- Read `screen` before quoting visitors. A fixed resolution with a large count, one view per visit and 1 to 2 s visits is automation (`800x600` is the headless default), and it lands in `laptop`. Datacenter cities (Santa Clara) and a language foreign to the country are the next tells. Headless browsers lack WebGL, so a site that tracks WebGL failures sees them pile up there.
- Some crawlers randomize the screen: a city with hundreds of visitors whose top screen holds a dozen, spread over near-square `laptop` sizes (`1300x1200`) seen once each. A screen denylist cannot catch them; only the edge can.
- A referrer whose visitors all share one screen is spam, not a source.
- Organic search traffic on varied real devices that bounces in seconds is intent mismatch, not bots: check what else the page's name means.
- Tracker re-run inflation ([tracker.md](tracker.md)) is quadratic per session: hourly pageview spikes over flat visits, and identical pageviews milliseconds apart in `get_events`. Totals carry it; path rankings do not.
- `umami.track()` events and `data-umami-event` clicks take separate paths. Ask which one an event takes before trusting its history.
- Property values filtered by event name are wrong before 3.3.1 (#4461).
- Rows with hostname `localhost`, `127.0.0.1` or a LAN IP are local builds reporting to production ([tracker.md](tracker.md)). A `*.translate.goog` hostname is a real visitor reading through Google Translate.
- `get_annotations` returns the team's dated notes. A view-only key cannot write them, so ask the operator to annotate each deploy that changes tracking.
- The first events after a deploy can come from stale edge HTML. Judge a fix on sessions that start well after it.
- A returning visitor whose session spans a deploy is the cleanest before and after: `get_session` lists both visits' activity.
- A client-side drop leaves no row, so absence is the only evidence. Compare the cohort's pre-deploy cadence and last-seen time against the silence after; a cohort that went quiet before the deploy proves nothing.
- Report sample size, date range, and the days to discount.
