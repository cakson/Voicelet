# Architecture

Voicelet is a single background-worker process. Dependencies flow in one direction:
`domain ← application/ports ← infrastructure/composition`.

- `src/domain` holds transient voice-state types and validation.
- `src/application` contains the pure event handler.
- `src/ports` defines the Gateway client, clock, and observation boundaries.
- `src/infrastructure/discord` adapts `discord.js` in production and supplies a deterministic
  simulated client for CI; Gateway failures are reduced to a safe failure class, readiness state,
  and bounded metrics without retaining provider error details.
- `src/infrastructure/http` exposes `/livez`, `/readyz`, and `/metrics`.
- `src/composition` wires dependencies; `src/main.ts` owns process lifecycle.

No data is persisted in this foundation. Tokens, production Discord identifiers, and raw event
payloads must not be logged or emitted as metric labels.

Temporary-room associations and per-member operation locks live in the application layer only and
are discarded at restart. The Discord adapter owns channel creation and member movement.
