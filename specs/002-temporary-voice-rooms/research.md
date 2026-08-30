# Research: Temporary Voice Room Creation

## Trigger Entry Recognition

**Decision**: Normalize both previous and current voice-channel IDs and invoke temporary-room work only for a non-bot transition where `currentChannelId` is the configured trigger and `previousChannelId` is different.

**Rationale**: Current-state-only events cannot distinguish entry from duplicate delivery or an unrelated update. Retaining the transition at the boundary gives the application a deterministic, testable eligibility rule while keeping raw Discord states outside the domain.

**Alternatives considered**:

- Treat every event whose current channel is the trigger as an entry: rejected because duplicate delivery would unnecessarily repeat work.
- Inspect Discord SDK state from application code: rejected because it violates the architecture boundary.

## Concurrency and Stale Associations

**Decision**: Use an in-memory association map and a keyed asynchronous mutex/promise chain by `guildId:userId`. Inside that key's critical section, confirm room existence, remove stale state, create and record a replacement when needed, then move the member.

**Rationale**: It makes the one-active-room rule atomic for a member while distinct members retain independent progress. Confirming existence before reuse turns externally deleted rooms into safe stale associations. Keeping a successfully created association when movement fails prevents a retry from leaking another room.

**Alternatives considered**:

- A single global lock: rejected because it serializes independent members.
- Persistent state or restart reconciliation: rejected as explicitly out of scope.
- Dropping the association on movement failure: rejected because it can create duplicate rooms on retry.

## Per-server Configuration

**Decision**: Read a single structured configuration value containing a map from guild identifiers to each server's trigger voice channel and destination category. An absent entry means the worker ignores that server's events; malformed supplied entries fail startup with a generic, redaction-safe configuration error.

**Rationale**: A map expresses multiple independent server configurations without adding persistent state or commands. Allowing an empty or non-matching map retains the explicitly chosen safe default for unconfigured servers.

**Alternatives considered**:

- One global trigger/category pair: rejected because it cannot serve multiple servers independently.
- One environment-variable trio per server: rejected because the number of server configurations cannot be known in advance and validation would be error-prone.
- Runtime configuration commands: rejected as outside this feature's command scope.

## Discord Room Operations and Permissions

**Decision**: Keep `GuildVoiceStates` as the sole Gateway intent. In the Discord infrastructure adapter, create a voice channel under the configured category and move the member through a dedicated room-management port. Treat missing access, permission, hierarchy, lookup, and API errors as bounded operation failures.

**Rationale**: The existing Gateway event flow needs no additional event intent. Discord documents that `MANAGE_CHANNELS` enables channel creation and `MOVE_MEMBERS` enables voice-channel movement; the target channel's `CONNECT` permission also affects whether movement can succeed.

**Alternatives considered**:

- Add broad member, presence, or message-content intents: rejected as unnecessary data access.
- Pass discord.js classes into the application: rejected because it couples business rules to the provider SDK.

**Sources**: [Discord permissions](https://docs.discord.com/developers/topics/permissions), [Discord server and channel management](https://docs.discord.com/developers/platform/server-and-channel-management), [Discord guild resource](https://docs.discord.com/developers/resources/guild).

## Naming and Privacy-safe Observability

**Decision**: Derive a deterministic sanitized name from the triggering display name using the `-room` suffix and a generic fallback. Observe only finite outcome classes and counters; never emit display names, Discord IDs, tokens, raw events, generated names, or provider errors.

**Rationale**: Members receive a predictable friendly room while logs and metrics remain useful without retaining or exposing personal information.

**Alternatives considered**:

- Use raw display names directly: rejected because names can be malformed for channel naming and should not be treated as safe operational data.
- Add identifiers as metric labels for diagnosis: rejected because they are high-cardinality and violate repository privacy requirements.

## Test Strategy

**Decision**: Extend the existing deterministic simulated Discord client rather than use a live server. Use unit tests for decisions and locking, integration tests for the adapter boundary and simulator, and process-level E2E tests for IPC, readiness, metrics, and the full primary flow.

**Rationale**: It meets the constitution's required test layers without credentials, provider availability, or nondeterministic data. It also enables reproducible injection of create/move failures and duplicate concurrent events.

**Alternatives considered**:

- Mock only the application service: rejected because it cannot prove adapter composition or process behavior.
- Test with a live Discord guild in CI: rejected because it requires secrets and is not reproducible.
