# Feature Specification: Persistent Guild Configuration

**Feature Branch**: `009-persistent-guild-configuration`

**Created**: 2026-09-02

**Status**: Draft

**Input**: User description: "Create the Persistent Guild Configuration feature. Voicelet currently relies on runtime configuration for Discord server-specific settings. Guild-specific application configuration must instead be stored persistently so that configuration survives application restarts, deployments, and Discord reconnects."

## Clarifications

### Session 2026-09-02

- Q: How should guild configuration creation and updates be exposed in this feature? → A: Internal application service plus local seed/setup workflow.
- Q: At what point should Voicelet verify that configured Discord channel and category identifiers still refer to usable resources? → A: Validate identifier format when loading; verify Discord resources when used.
- Q: When persistent guild configuration cannot be read, should readiness report the worker as not ready while liveness remains healthy? → A: Readiness fails; liveness stays healthy.
- Q: Which persistence technology should Voicelet implement as its first real storage adapter? → A: Firestore using the official client and official local emulator.
- Q: Which existing per-guild temporary-room settings must move into persistent guild configuration? → A: Trigger, category, both intervals, and permanent-channel IDs.
- Q: After this feature ships, should TEMPORARY_ROOM_CONFIG cease to be a source of guild-specific configuration? → A: Remove runtime guild configuration; persistent storage is authoritative.
- Q: When should readiness return to healthy after a persistent-configuration read failure? → A: After the next successful configuration read.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Use a Guild's Saved Configuration (Priority: P1)

As Voicelet, I can retrieve the saved configuration for the Discord guild whose event I am
processing, so that guild behavior uses the intended voice trigger channel and temporary-room
category after reconnects or restarts.

**Why this priority**: Persistent retrieval is the core user value: each guild's behavior must remain
consistent across process and connection lifecycles.

**Independent Test**: Write a valid configuration for one guild, restart the application using the
same isolated persistent datastore, and process that guild's event; verify the saved values are used.

**Acceptance Scenarios**:

1. **Given** a guild has a valid saved configuration, **When** Voicelet processes behavior for that
   guild, **Then** it retrieves and uses that guild's designated trigger voice channel and temporary
   room category.
2. **Given** two guilds have different saved configurations, **When** Voicelet processes an event
   for either guild, **Then** it uses only the configuration belonging to that event's guild.
3. **Given** a valid configuration was saved before an application restart or redeployment, **When**
   the application starts again and processes the guild, **Then** the configuration is available
   without being re-entered.
4. **Given** a saved configuration has well-formed identifiers for resources that no longer exist,
   belong to another guild, or have an incompatible type, **When** Voicelet attempts the configured
   behavior, **Then** it detects the unusable Discord resources, skips the behavior safely, and
   records a privacy-safe observable failure.
5. **Given** a guild has saved timeout, reconciliation, and protected permanent-channel settings,
   **When** Voicelet restarts and processes that guild, **Then** its temporary-room lifecycle and
   reconciliation behavior uses the same saved settings.

---

### User Story 2 - Create or Update Guild Configuration (Priority: P1)

As a local setup workflow or other application integration, I can use Voicelet's internal
configuration-management service to create a configuration for a guild or update its existing
configuration, so that the guild's behavior can be established and changed without changing
application-wide settings.

**Why this priority**: A persistence feature is useful only if configuration can be safely established
and maintained for each guild.

**Independent Test**: Save a configuration for an unconfigured guild, retrieve it, update one value,
and retrieve it again; verify the new values replace the old values for that guild only.

**Acceptance Scenarios**:

1. **Given** a guild has no configuration, **When** a valid configuration is saved, **Then** the
   guild becomes configured and the saved values can be retrieved.
2. **Given** a guild already has a configuration, **When** a valid replacement is saved, **Then**
   retrieval returns the updated values and does not create ambiguous duplicate configuration state.
3. **Given** a configuration update fails, **When** the caller observes the result, **Then** the
   failure is reported safely and the application continues operating without uncontrolled worker
   termination.

---

### User Story 3 - Operate Safely When Configuration Is Missing or Invalid (Priority: P1)

As an operator, I can rely on Voicelet to distinguish an unconfigured guild from a configured guild
with invalid data, so that missing or corrupt persistence data does not crash the worker or silently
drive unsafe room behavior.

**Why this priority**: Safe failure protects all guilds from a single missing, corrupt, or unavailable
record and makes operational issues diagnosable.

**Independent Test**: Exercise retrieval for an unconfigured guild, invalid persisted values, and a
 datastore failure; verify each result is handled without a worker crash and without using invalid
configuration.

**Acceptance Scenarios**:

1. **Given** a guild has no saved configuration, **When** Voicelet processes an event for it, **Then**
   it recognizes the guild as unconfigured, skips configuration-dependent behavior safely, and keeps
   the worker alive.
2. **Given** persisted configuration is malformed or violates configuration rules, **When** Voicelet
   retrieves it, **Then** it rejects the data before application or domain behavior uses it and records
   a privacy-safe observable failure.
3. **Given** the persistence service is unavailable, **When** Voicelet requests guild configuration,
   **Then** it applies a safe failure outcome, reports the worker as not ready while retaining
   liveness unless the process itself is unhealthy, and does not terminate unexpectedly.
4. **Given** readiness is not ready because a configuration read failed, **When** a subsequent
   configuration read succeeds, **Then** Voicelet returns readiness to healthy without a restart.

### Edge Cases

- A guild identifier is empty, malformed, or does not identify exactly one Discord guild; the request
  is rejected without persistence or application behavior using it.
- One required channel or category value is missing, blank, duplicated, or otherwise invalid; the
  entire configuration is rejected rather than partially applied.
- A structurally valid identifier refers to a deleted resource, a resource in another guild, or an
  incompatible Discord channel type; Voicelet skips the affected behavior safely when it verifies
  the resource at use time.
- A persisted record contains unknown future fields; known valid fields remain representable and the
  persistence boundary does not expose provider-specific record details to application behavior.
- A configuration update races with another update for the same guild; retrieval must not expose a
  partially written configuration, and the resulting stored state must be a complete valid value.
- A datastore returns an unexpected provider error or a record that cannot be translated into the
  canonical model; the failure is bounded, observable without full records or secrets, and safe for
  the worker.
- Discord credentials, application-wide operational settings, temporary-room state, room ownership,
  and user content are never included in guild configuration.
- A legacy runtime guild-configuration value is supplied alongside persistent data; Voicelet ignores
  it for guild behavior and documents that it is no longer supported.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Voicelet MUST persist a separate guild configuration for each Discord guild, identified
  by that guild's identifier.
- **FR-002**: Guild configuration MUST represent all current per-guild temporary-room settings: the
  designated voice channel that triggers temporary-room creation, the category in which rooms are
  created, the inactivity timeout, the reconciliation interval, and the protected permanent-channel
  identifiers excluded from reconciliation cleanup.
- **FR-002a**: The inactivity timeout and reconciliation interval MUST be whole minutes from 1 through
  1,440; when omitted during creation or replacement, they MUST default to 60 and 15 minutes,
  respectively. Protected permanent-channel identifiers MUST be unique.
- **FR-003**: Voicelet MUST retrieve guild configuration by guild identifier when processing
  configuration-dependent behavior.
- **FR-004**: Voicelet MUST distinguish a configured guild from a guild with no configuration and
  MUST handle an unconfigured guild without crashing the worker.
- **FR-005**: Voicelet MUST support creating configuration for an unconfigured guild and replacing
  the existing configuration for a configured guild.
- **FR-005a**: Voicelet MUST expose creation and replacement through an internal application service
  and MUST provide a documented local seed or setup workflow; it MUST NOT add a user-facing
  dashboard, HTTP configuration endpoint, or Discord slash-command interface in this feature.
- **FR-006**: Configuration MUST be validated before entering the application or domain layer;
  invalid persisted or submitted configuration MUST be rejected and MUST NOT influence behavior.
- **FR-006a**: Persistence-boundary validation MUST verify required identifier structure. Before
  configuration-dependent Discord behavior runs, Voicelet MUST verify that each configured resource
  exists, belongs to the guild, and has the required Discord channel or category type; unusable
  resources MUST result in a safe, observable skipped behavior.
- **FR-007**: The canonical guild configuration model MUST belong to Voicelet, remain independent of
  the persistence provider, and be extensible for future guild-specific settings.
- **FR-008**: Application and domain behavior MUST access guild configuration through an
  application-defined storage boundary and MUST NOT depend on provider-specific types, APIs, query
  syntax, persistence-record identifiers, timestamps, references, snapshots, or equivalent
  structures.
- **FR-009**: Provider-specific persistence representations MUST be translated at the infrastructure
  boundary into or from the canonical guild configuration representation without loss of
  application-level meaning.
- **FR-010**: Replacing the persistence provider MUST NOT require changes to core temporary-room
  creation behavior, and core guild configuration behavior MUST NOT depend on provider-specific
  realtime subscriptions or provider-specific business rules.
- **FR-011**: Guild configuration MUST survive application restart, redeployment, and Discord
  reconnect when the same persistent data store is available.
- **FR-012**: Discord bot credentials, application secrets, application-wide operational
  configuration, temporary-room runtime state, room ownership associations, and unnecessary personal
  identifiers MUST remain outside guild configuration.
- **FR-013**: Persistence failures, translation failures, and validation failures MUST produce
  bounded safe outcomes that do not cause uncontrolled worker termination.
- **FR-013a**: When Voicelet cannot read persistent guild configuration, it MUST report not ready;
  its liveness result MUST remain healthy unless the worker process itself is unhealthy.
- **FR-013b**: A successful subsequent configuration read MUST restore readiness without requiring a
  worker restart.
- **FR-014**: Important persistence failures MUST be observable through privacy-safe diagnostics that
  identify the failure category and relevant bounded context without logging full persisted records,
  Discord tokens, raw Discord payloads, or unnecessary personal identifiers.
- **FR-015**: The storage boundary MUST support deterministic in-memory implementations for unit and
  application-level tests.
- **FR-016**: The first real persistence adapter MUST use Firestore through its official client,
  while integration tests MUST exercise that adapter against the official local Firestore emulator
  using deterministic, disposable test data.
- **FR-017**: End-to-end tests MUST run with isolated test data and without production database
  infrastructure or production credentials, including a test proving configuration written before an
  application restart is retrieved and used after startup.
- **FR-018**: Automated tests MUST cover configured guilds, unconfigured guilds, invalid persisted
  configuration, creation, updates to existing configuration, persistence failures, and continued
  liveness/readiness behavior.
- **FR-019**: Documentation MUST explain the distinction between guild configuration,
  application-wide operational configuration, and secrets; describe local development management of
  persistent guild configuration; and explain how another persistence provider can replace the
  current provider without changing application or domain behavior.
- **FR-020**: Persistent storage MUST be the sole source of guild-specific configuration after this
  feature ships. Voicelet MUST remove `TEMPORARY_ROOM_CONFIG` as a supported guild-configuration
  input and MUST document its removal; application-wide operational configuration and secrets remain
  environment-supplied.

### Key Entities

- **Guild Configuration**: The canonical, provider-independent application settings for one Discord
  guild, including its guild identifier, designated trigger voice channel, temporary-room category,
  inactivity timeout, reconciliation interval, protected permanent-channel identifiers, and an
  extensible set of future guild-specific settings.
- **Guild Identifier**: The stable Discord identifier that associates exactly one configuration with
  one guild.
- **Configuration Lookup Result**: A safe application-level outcome that distinguishes a valid
  configured guild, an unconfigured guild, and a retrieval or validation failure.
- **Application Configuration**: Operational settings shared by the Voicelet deployment, such as
  runtime behavior or service endpoints; it is separate from guild configuration.
- **Secret**: Sensitive credentials such as Discord bot credentials; secrets are supplied through
  protected operational configuration and are not guild configuration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of tested restart and redeployment scenarios using the same isolated datastore,
  a previously saved valid guild configuration is retrieved and used without re-entry.
- **SC-002**: In 100% of tested lookup scenarios, configured guilds, unconfigured guilds, invalid
  persisted configurations, and persistence failures produce distinct, safe outcomes with no
  uncontrolled worker termination.
- **SC-003**: Tests demonstrate that at least two guilds can retain and retrieve different valid
  configurations with zero cross-guild value leakage.
- **SC-004**: 100% of configuration records entering application or domain behavior have passed
  validation, and invalid persisted records are never used to create temporary rooms.
- **SC-005**: Unit, integration, and end-to-end test suites run reproducibly in CI using deterministic
  isolated data and no production persistence credentials.
- **SC-006**: A maintainer can identify from the documentation within 5 minutes which settings are
  guild-specific, which are application-wide, which are secrets, how to manage local persisted data,
  and where to replace the persistence provider.
- **SC-007**: Existing liveness and readiness checks continue to return their documented normal
  outcomes; in 100% of simulated configuration-read failures, readiness reports not ready and
  liveness remains healthy while the process is otherwise healthy; in 100% of subsequent successful
  reads, readiness returns to healthy without restart.

## Assumptions

- The existing temporary-room behavior remains the consumer of the trigger channel and category
  settings, timeouts, reconciliation settings, and protected permanent-channel settings; this feature
  changes where guild configuration comes from, not temporary-room policy.
- A guild has at most one current configuration, and saving a valid configuration replaces the
  current value for that guild.
- A missing configuration is a normal unconfigured state, while malformed persisted data and
  persistence unavailability are failure states that must be distinguished for observability and
  safe behavior.
- Identifier structure can be validated without Discord access; availability, guild membership, and
  channel type are verified only when the corresponding Discord behavior runs.
- The selected persistence technology will provide a local or isolated test mode suitable for
  reproducible CI, while the canonical model and storage boundary remain provider-independent.
- Firestore is the first selected persistence provider. Voicelet will use its official client and
  official local emulator; this choice is confined to infrastructure and does not define the
  canonical guild configuration model or application storage boundary.
- Local development may use disposable persisted data and an explicit setup or seed workflow; no
  production datastore or credentials are required for local or end-to-end tests.
- Deployments transition their existing guild settings into persistent storage before removing the
  legacy runtime guild-configuration input; runtime fallback and override behavior are not provided.
- Configuration creation and replacement are invoked through an internal application service and a
  documented local seed or setup workflow. User-facing management interfaces, authentication, and
  authorization remain outside this feature; existing or future callers remain responsible for
  access control.

## Out of Scope

- Persisting temporary-room runtime state or room ownership associations.
- Recovery or reconciliation of temporary rooms after restart.
- Automatic deletion of inactive rooms.
- A user-facing configuration dashboard.
- Discord slash commands for changing configuration.
- Authentication or authorization for configuration management interfaces.
- Multi-region database replication.
- Database-provider migration execution.
- Production backup and disaster-recovery automation.
- Analytics or historical configuration auditing.
