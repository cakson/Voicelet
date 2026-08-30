# Research: Engineering Foundation

## Node.js and Package Management

**Decision**: Use Node.js 24 LTS, strict TypeScript, Corepack, and a `packageManager`-pinned pnpm
release with a committed `pnpm-lock.yaml`.

**Rationale**: Node 24 is the current LTS line. Strict TypeScript makes the worker’s boundary types
and configuration checks enforceable. A pinned package-manager version and frozen lockfile install
make local and CI dependency resolution reproducible.

**Alternatives considered**:

- Node 26 Current: rejected because the foundation targets an LTS production runtime.
- Unpinned npm or a lockfile-free workflow: rejected because it cannot guarantee reproducible builds.

**Sources**: [Node release schedule](https://nodejs.org/en/about/previous-releases),
[pnpm frozen installs](https://pnpm.io/cli/install),
[TypeScript strict mode](https://www.typescriptlang.org/tsconfig/strict).

## Discord Gateway Integration

**Decision**: Use `discord.js` behind a `GatewayEventSource` port, enable only the standard
`GuildVoiceStates` intent, and regard the worker as ready only after the client receives the Gateway
Ready event.

**Rationale**: `VOICE_STATE_UPDATE` belongs to `GUILD_VOICE_STATES`; requesting only that intent
follows least privilege. The Gateway protocol requires heartbeats, session handling, and reconnect or
resume behavior, so a maintained client library is safer than a custom protocol implementation. Ready
is Discord’s successful-connection signal and supplies a crisp readiness boundary.

**Alternatives considered**:

- Broad, member, presence, or message-content intents: rejected as unnecessary data access; some
  are privileged.
- A hand-built Gateway client: rejected because it adds fragile protocol lifecycle responsibility.
- A live Discord test server in CI: rejected because credentials and third-party availability would
  make required checks non-reproducible.

**Sources**: [Discord Gateway](https://docs.discord.com/developers/events/gateway),
[Discord Gateway events](https://docs.discord.com/developers/events/gateway-events).

## HTTP Operations Surface

**Decision**: Expose a small Fastify server with `GET /livez`, `GET /readyz`, and `GET /metrics`.

**Rationale**: Liveness distinguishes a running process from a ready worker; readiness reflects the
Gateway lifecycle. A narrow metrics surface enables verification of critical event handling without
logging sensitive event data. Fastify is a mature, typed, minimal HTTP dependency for this isolated
operational interface.

**Alternatives considered**:

- No HTTP surface: rejected because the specification requires health/readiness proof.
- A general application API or UI: rejected because this is a background-worker foundation.

## Test Strategy

**Decision**: Use Vitest in three explicit layers: pure domain/application unit tests, adapter and
readiness integration tests, and a process-level E2E test with a local semantic Discord Gateway
simulator.

**Rationale**: The layers map directly to the constitution and specification. The simulator sends a
Ready lifecycle signal and a representative voice-state event, so CI proves startup, readiness,
handling, and safe observation without a Discord token. Browser automation is not applicable to a
background worker.

**Alternatives considered**:

- Only mocked unit tests: rejected because they cannot prove process startup and readiness.
- Real Discord CI integration: rejected by the explicit reproducibility decision.
- Browser E2E framework: rejected because the product has no browser surface.

**Sources**: [Vitest features](https://vitest.dev/guide/features),
[Vitest mocks](https://vitest.dev/guide/mocking).

## Quality Gates and CI

**Decision**: Define `format:check`, `lint`, `typecheck`, `test:unit`, `test:integration`,
`test:e2e`, `test`, `build`, and an aggregate `check` command. GitHub Actions installs with a frozen
lockfile and executes `pnpm check`.

**Rationale**: One aggregate command makes CI and local verification equivalent. Separate scripts
preserve fast feedback and make a failed quality layer obvious. CI must not cache secrets or
`node_modules` as an implicit source of dependency state.

**Alternatives considered**:

- CI-only scripts: rejected because developers must run the same checks locally.
- A combined undifferentiated test script: rejected because it obscures the required test layers.

**Sources**: [ESLint core concepts](https://eslint.org/docs/latest/use/core-concepts/),
[Prettier installation](https://prettier.io/docs/install.html),
[GitHub Actions dependency caching](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching).
