# Hosting

Umami behind a reverse proxy. Caddy syntax is shown; each constraint carries to any proxy.

## Ingest gate

Gate `/api/send*` on `Origin`, which leaves the dashboard's other `/api` routes open. Caddy's `header` matcher takes one value, so list each site as its own line inside `not { }`:

```caddy
@foreign_beacon {
	path /api/send*
	not {
		header Origin https://example.com
		header Origin https://blog.example.com
	}
}
respond @foreign_beacon 403
reverse_proxy umami:3000
```

- `Origin` is client-set: the gate stops non-browser replays and other sites' pages, not a forged header.
- Probe with body `{}`: 403 is the gate refusing, 400 is Umami rejecting the payload after the gate let it through, and nothing is written either way.
- A beacon host behind Cloudflare Access needs a Bypass on `/script.js` and `/api/send`. An unauthenticated 302 there means only signed-in admins are tracked.

## Health checks

Use `127.0.0.1`, not `localhost`, in wget-based health checks. Alpine resolves `localhost` to IPv6 first, while the server listens on IPv4.
