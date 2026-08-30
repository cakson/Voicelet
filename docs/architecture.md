# Architecture

Voicelet is a single background-worker process. Dependencies flow in one direction:
`domain ← application/ports ← infrastructure/composition`.

- `src/domain` holds transient voice-state types and validation.
- `src/application` contains the pure event handler.
- `src/ports` defines the Gateway client, clock, and observation boundaries.
- `src/infrastructure/discord` adapts `discord.js` in production and supplies a deterministic
  simulated client for CI.
- `src/infrastructure/http` exposes `/livez`, `/readyz`, and `/metrics`.
- `src/composition` wires dependencies; `src/main.ts` owns process lifecycle.

No data is persisted in this foundation. Tokens, production Discord identifiers, and raw event
payloads must not be logged or emitted as metric labels.
