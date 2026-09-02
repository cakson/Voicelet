# Architecture

Voicelet is a single background-worker process. Dependencies flow in one direction:
`domain ← application/ports ← infrastructure/composition`.

- `src/domain` holds transient voice-state types and validation.
- `src/application` contains the pure event handler.
- `src/ports` defines the Gateway client, clock, observation, and provider-independent
  `GuildConfigRepository` boundaries.
- `src/infrastructure/discord` adapts `discord.js` in production and supplies a deterministic
  simulated client for CI; Gateway failures are reduced to a safe failure class, readiness state,
  and bounded metrics without retaining provider error details.
- `src/infrastructure/http` exposes `/livez`, `/readyz`, and `/metrics`.
- `src/composition` wires dependencies; `src/main.ts` owns process lifecycle.

`src/domain/guild-config.ts` owns the canonical versioned plain-data model. The Firestore adapter
translates that model at the infrastructure edge; Firestore SDK types and collection paths never
cross into application or domain code. A future PostgreSQL adapter can implement the same repository
at the composition root without changing room behavior. Tokens, production Discord identifiers,
and raw event payloads must not be logged or emitted as metric labels.

Temporary-room associations and per-member operation locks live in the application layer only and
are discarded at restart. The Discord adapter owns channel creation, member movement,
member-specific owner overwrites, and tracked-room category restoration. Owner overwrites contain
only `ManageChannels` and `ManageRoles` on the created room; no owner role is created.

Temporary-room lifecycle scheduling and occupancy policy also live in the application layer. The
Discord adapter supplies current room state, deletion, and external-deletion notification; timers are
injected through a port so simulated tests can control time. Lifecycle observations use bounded
outcomes without Discord identifiers or raw Gateway data.

Room reconciliation is a separate application policy. It receives category-scoped voice-room IDs and
guarded empty-room deletion outcomes through the Discord port, compares them with the manager's
read-only transient association view, and never mutates associations for zombies. The gateway source
starts one coalesced per-server scan schedule after ready and cancels it on disconnect or stop.

Container delivery is an operations-layer concern. The production image contains compiled Voicelet
output and runtime dependencies only; GitHub Actions publishes a full-SHA GHCR version after
`pnpm check`. A compatible external container environment independently pulls and deploys that
image, owns runtime configuration and Discord credentials, and defines its own health, observability,
and rollback policy. Repository CI does not call or verify that environment.
