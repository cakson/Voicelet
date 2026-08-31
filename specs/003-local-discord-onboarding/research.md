# Research: Local Discord Development Onboarding

## Decision: Use a dedicated Discord application and guild installation

**Decision**: The guide will direct developers to create a separate development application, add a
bot identity, and install that bot into a dedicated test server using the Discord `bot` scope. The
bot is installed in a server (guild) context, never as a user-only application. A server member
with server-management authority completes the installation.

**Rationale**: Voicelet reacts to and manages voice resources inside a server, so it needs a
server-scoped bot identity and permissions. A dedicated test server isolates disruptive room
creation and movement from active communities and keeps development credentials independent from
production.

**Alternatives considered**:

- User installation: rejected because it cannot grant the bot server/channel permissions needed for
  temporary-room operations.
- Personal Discord user credentials or self-bot automation: rejected as insecure, outside Discord's
  bot model, and explicitly prohibited by the feature.
- Reusing a production bot/server: rejected because it mixes credentials and testing effects with
  production operations.

## Decision: Document four effective bot permissions, not Administrator

**Decision**: The guide will request and verify `View Channel`, `Manage Channels`, `Move Members`,
and `Connect` as effective permissions for the relevant trigger channel, destination category, and
created rooms. It will state that category/channel overrides must not deny these permissions and
that Administrator is not required.

**Rationale**: Creating a voice channel requires `Manage Channels`; moving a member requires both
`Move Members` and `Connect`; and access to the involved resources requires `View Channel`. This is
the least-privilege set matching the existing create-and-move flow.

**Alternatives considered**:

- Administrator: rejected because it grants broad, unnecessary server control.
- Only `Manage Channels` and `Move Members`: rejected because a move also requires `Connect` and
  channel visibility/access must be effective after overrides.
- A fixed numeric permission value only: rejected as the primary instruction because named
  permissions are more auditable; a Portal-generated installation link remains acceptable.

## Decision: Retain the current single standard voice-state capability

**Decision**: The onboarding guide will state that the current worker requests only the standard
`GuildVoiceStates` Gateway capability. It requires no Privileged Gateway Intents toggle or approval
in the Developer Portal; `GuildMembers`, `GuildPresences`, and `MessageContent` are not needed.

**Rationale**: The existing Discord adapter requests only `GatewayIntentBits.GuildVoiceStates` and
uses voice-state updates to trigger rooms. The required capability is standard, while the excluded
capabilities are privileged and would expand data access without serving this flow.

**Alternatives considered**:

- Enable every Portal capability: rejected because it violates least privilege and confuses setup.
- Add member or presence capabilities for readiness: rejected because readiness is determined by
  the Gateway connection, not those event streams.

## Decision: Use the existing ignored `.env` as the local-secret boundary

**Decision**: Developers will copy `.env.example` to `.env`, place only the real bot token in
`DISCORD_TOKEN`, and place fictional or development-only identifiers in `TEMPORARY_ROOM_CONFIG`.
The safe tracked example will use placeholders and comments for every supported setting used in real
mode.

**Rationale**: The worker already loads `.env` before validation, and `.gitignore` excludes `.env`.
This is the repository-supported mechanism and keeps development and production tokens independent.

**Alternatives considered**:

- A newly introduced secret manager: rejected because it adds operational scope without need.
- Committing a token to a local profile: rejected because all tracked artifacts can leak.
- Reusing production environment values: rejected because local development must not require them.

## Decision: Keep health checks local and distinguish liveness from readiness

**Decision**: The guide will use the default loopback address and documented HTTP endpoints:
`/livez` confirms the worker process responds, `/readyz` confirms the Discord connection is ready,
and `/metrics` provides optional bounded diagnostics. It will explicitly state that Discord Gateway
is an outbound connection and needs no public callback, port forwarding, tunnel, or public domain.

**Rationale**: The worker listens before starting the Gateway and defaults to `127.0.0.1:3000`.
Readiness returns success only after Discord signals ready; liveness remains useful when a token or
network problem prevents readiness.

**Alternatives considered**:

- Publicly exposing the operational server for a callback: rejected because no current function
  requires inbound Discord traffic and public exposure increases risk.
- Treating an HTTP liveness response as connection success: rejected because it cannot prove the
  Gateway is ready.

## Decision: Validate documentation statically and Discord behavior manually

**Decision**: Add deterministic integration assertions for the local guide and safe example, retain
the existing simulated Gateway tests for worker behavior, and document a human-operated real Discord
smoke test rather than execute it in CI.

**Rationale**: CI cannot safely store or operate a real development bot token. Static tests prevent
documentation/configuration regressions, while the manual test demonstrates the live external
integration the feature exists to support.

**Alternatives considered**:

- Live Discord CI tests: rejected because they require secrets and a mutable external server.
- Documentation-only review with no tests: rejected because critical onboarding values can silently
  drift from the validated application contract.

## Sources

- [Discord OAuth2 and Permissions](https://docs.discord.com/developers/platform/oauth2-and-permissions)
- [Discord Gateway intents](https://docs.discord.com/developers/events/gateway)
- [Discord Guild resource](https://docs.discord.com/developers/resources/guild)
- [Discord permissions reference](https://docs.discord.com/developers/topics/permissions)
- Existing worker configuration: `src/config/load-config.ts`
- Existing Gateway adapter: `src/infrastructure/discord/discord-client-factory.ts`
- Existing operational server: `src/infrastructure/http/operational-server.ts`
