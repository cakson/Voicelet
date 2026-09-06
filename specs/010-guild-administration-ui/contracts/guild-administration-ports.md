# Guild Administration Application Port Contracts

These internal contracts belong to Voicelet's application boundary. Exact TypeScript names may be
adjusted to repository conventions, but the capabilities and bounded outcomes are normative.

## Administration repositories

Administration persistence is exposed as narrow capability ports so each independently deliverable
story depends only on operations implemented in that increment. The memory and Firestore adapters
may implement every port over one shared source of truth without forcing earlier stories to stub
later mutation capabilities.

```text
GuildRegistrationRepository
  listGuilds() -> Promise<GuildListResult>
  getGuild(guildId) -> Promise<GuildLookupResult>
  registerGuild(guildId, optionalInitialConfiguration) -> Promise<GuildRegisterResult>

GuildConfigurationCreationRepository
  createConfiguration(guildId, configuration) -> Promise<ConfigSaveResult>

GuildConfigurationMutationRepository
  replaceConfiguration(guildId, configuration, expectedRevision) -> Promise<ConfigSaveResult>
  setConfigurationEnabled(guildId, enabled, expectedRevision) -> Promise<ConfigStateResult>

GuildDeletionRepository
  deleteGuild(guildId) -> Promise<GuildDeleteResult>
```

- `registerGuild` is create-only. It returns `duplicate` if the registration exists. When initial
  configuration is present, registration and configuration commit atomically or neither commits.
- `createConfiguration` requires registration and conflicts if configuration already exists. It
  applies creation defaults, including `enabled: true` unless the operator explicitly supplies
  `false`.
- `replaceConfiguration` requires every editable setting, replaces only the expected revision, and
  preserves `enabled`.
- `setConfigurationEnabled` changes only `enabled` and revision. All other values are preserved.
- `deleteGuild` atomically removes registration and associated configuration. Absence is `not_found`;
  it never touches Discord.
- Every operation validates or returns already-validated Voicelet-owned data. No Firestore value,
  exception, reference, timestamp, path, or transaction type crosses the port.

## Enabled configuration reader

```text
EnabledGuildConfigRepository
  getEnabled(guildId) -> Promise<EnabledConfigLookup>
  listEnabled() -> Promise<EnabledConfigList>
```

- A result is `found` only when an explicit registration and valid enabled configuration both exist.
- Unregistered, unconfigured, disabled, and deleted guilds are normal `not_found` results to product
  behavior; invalid and unavailable remain distinguishable for safe observability/readiness.
- `listEnabled` exists for reconciliation scheduling and returns no disabled or orphan values.
- The Firestore and memory guild repository adapters implement both ports over the same source of
  truth; this is interface separation, not duplicated persistence.

## Application service

```text
GuildAdministrationService
  listRegisteredGuilds()
  getRegisteredGuild(guildId)
  registerGuild(input)
  createOrReplaceConfiguration(guildId, input, expectedRevision)
  enableConfiguration(guildId, expectedRevision)
  disableConfiguration(guildId, expectedRevision)
  deleteGuild(guildId)
```

The service depends on the narrow capability ports required by its supported methods. It owns
snowflake/configuration validation, defaulting, state preconditions, result unions, and post-commit
change notification. The HTTP adapter only parses transport input and maps outcomes.

## Configuration change notifier

```text
GuildConfigChangeNotifier
  configurationChanged(guildId, changeKind) -> Promise<void>

changeKind = configured | interval_changed | enabled | disabled | deleted
```

- Notify only after persistence reports a committed mutation.
- Composition connects the notifier to the current reconciliation lifecycle; the application service
  does not import Discord or timer implementations.
- `configured`, `interval_changed`, and `enabled` load authoritative state and start/reschedule the
  affected guild. `disabled` and `deleted` cancel it.
- Room creation continues to resolve current enabled configuration on each event.
- If post-commit notification fails, return an unavailable/uncertain outcome, record a bounded metric,
  and let the HTTP adapter re-read persisted state. Restart always reconstructs schedules from storage.

## Bounded outcome families

```text
GuildListResult     = found(guilds, invalidCount) | unavailable
GuildLookupResult   = found(guild) | not_found | invalid | unavailable
GuildRegisterResult = registered(guild) | duplicate | invalid | unavailable
ConfigSaveResult    = saved(guild) | not_found | conflict(currentGuild) | invalid | unavailable
ConfigStateResult   = enabled(guild) | disabled(guild) | not_found | conflict(currentGuild) |
                      invalid | unavailable
GuildDeleteResult   = deleted | not_found | invalid | unavailable

EnabledConfigLookup = found(config) | not_found | invalid | unavailable
EnabledConfigList   = found(configs, invalidCount) | unavailable
```

Results may carry current canonical state for conflict recovery, but never raw submitted values,
provider detail, credentials, or identifiers in observability labels/messages.
