# Operational HTTP Contract

The worker exposes only loopback-safe operational endpoints in this feature. They are not a public
product API and must never expose Discord configuration, raw events, or identifiers.

## `GET /livez`

Returns `200 OK` when the process can serve the HTTP operation surface.

```json
{"status":"live"}
```

The endpoint does not assert Discord connectivity.

## `GET /readyz`

Returns `200 OK` only after the Gateway event source is ready to accept events.

```json
{"status":"ready","gateway":"ready"}
```

Returns `503 Service Unavailable` while starting, connecting, reconnecting, disconnected, or
stopping.

```json
{"status":"not_ready","gateway":"connecting"}
```

The allowed `gateway` values are `starting`, `connecting`, `reconnecting`, `disconnected`,
`stopped`, and `ready`. Responses must contain no URL, token, guild ID, user ID, channel ID, raw
error, or event data.

## `GET /metrics`

Returns a metrics payload suitable for collection by infrastructure. Required signals:

- a Gateway readiness state gauge;
- handled and rejected voice-state event counters; and
- a reconnect counter.

Metric labels must be bounded and must not contain Discord identifiers, tokens, raw payloads, or
unbounded error text.
