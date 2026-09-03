# Data Model: Guild Administration UI

All canonical types are Voicelet-owned plain data. Firestore collection names, document references,
snapshots, timestamps, errors, and credentials remain inside the infrastructure adapter.

## Discord Snowflake

A guild, channel, or category identifier is serialized as a string in domain, repository, API, and
browser types. Validation accepts a canonical unsigned 64-bit decimal value greater than zero and
rejects whitespace, signs, decimals, exponent notation, leading zeroes, non-digits, and overflow.
Identifiers are never converted to JavaScript numbers.

## Guild Registration

`GuildRegistration` declares that Voicelet manages one Discord guild. It does not imply that usable
configuration exists.

| Field | Rules |
|---|---|
| `guildId` | Valid Discord snowflake; stable logical identity and unique among registrations. |

Persistent `StoredGuildRegistrationV1` adds `schemaVersion: 1`. No Discord guild name or membership
data is stored because this feature does not query Discord during registration.

## Guild Configuration

`GuildConfiguration` is the complete configuration value associated with exactly one registered
guild.

| Field | Rules |
|---|---|
| `guildId` | Valid snowflake matching the owning registration. |
| `triggerChannelId` | Required valid snowflake for the designated trigger voice channel. |
| `destinationCategoryId` | Required valid snowflake for the temporary-room category. |
| `inactivityTimeoutMinutes` | Whole number from 1 through 1,440; create default 60. |
| `reconciliationIntervalMinutes` | Whole number from 1 through 1,440; create default 15. |
| `permanentChannelIds` | Unique valid snowflake strings; create default empty list. |
| `enabled` | Required canonical boolean; create default `true`. |
| `revision` | Positive Voicelet-owned integer, initially 1 and incremented by each replacement or enabled-state mutation. |

`GuildConfigurationInput` omits `guildId` from nested API bodies because the route/registration owns
it. During creation it may omit the two timeout values, permanent IDs, and enabled value so the
application service can apply canonical defaults. Replacement submits every editable setting and an
`expectedRevision`; it does not accept `enabled`, which is preserved and changed only through the
dedicated enabled-state operation.

Persistent `StoredGuildConfigurationV2` adds `schemaVersion: 2` while preserving every V1 field. A
legacy V1 record may be read as `enabled: true`, `revision: 1`, but it remains inactive unless an
independent registration exists. The next successful mutation writes V2.

Discord resource existence, guild membership, and channel/category types remain use-time checks in
the Discord adapter; the administration UI validates only identifier structure and configuration
invariants.

## Guild Administration View

This application/API projection combines a registration with optional configuration without
exposing storage details.

| Field | Rules |
|---|---|
| `guildId` | Registration identity. |
| `configuration` | Complete configuration projection or `null`. |

The list projection may replace the complete configuration with:

| Field | Values |
|---|---|
| `configurationStatus` | `unconfigured` or `configured`. |
| `enabled` | `true` or `false` when configured; `null` when unconfigured. |

The configuration revision is transported to the browser only as a conflict token. It is not shown
as operator-facing persistence metadata.

## Relationships and invariants

```text
GuildRegistration 1 ───── 0..1 GuildConfiguration
```

- Configuration creation requires an existing registration, except when both are created atomically
  by the registration use case.
- Configuration does not imply registration. A legacy/orphan configuration is inactive and omitted
  from administration guild lists until its guild is explicitly registered.
- Disabled configuration retains every value and its registration.
- Worker behavior receives configuration only when registration exists, configuration parses as
  valid, and `enabled` is true.
- Deleting a registration also deletes its configuration in the same repository operation.
- Re-registering a deleted guild begins unconfigured unless a new initial configuration is supplied.

## State transitions

```text
unregistered
  ├── register(no config) ───────────────────────────────> registered / unconfigured
  └── register(valid config, enabled default true) ─────> registered / configured / enabled

registered / unconfigured
  ├── create config(enabled) ────────────────────────────> registered / configured / enabled
  ├── create config(disabled) ───────────────────────────> registered / configured / disabled
  └── delete ────────────────────────────────────────────> unregistered

registered / configured / enabled
  ├── replace(valid, matching revision) ─────────────────> configured / enabled, revision + 1
  ├── disable(matching revision) ────────────────────────> configured / disabled, revision + 1
  └── delete ────────────────────────────────────────────> unregistered (configuration removed)

registered / configured / disabled
  ├── replace(valid, matching revision) ─────────────────> configured / disabled, revision + 1
  ├── enable(matching revision) ─────────────────────────> configured / enabled, revision + 1
  └── delete ────────────────────────────────────────────> unregistered (configuration removed)
```

Invalid input causes no transition. Duplicate registration, missing registration/configuration, or a
stale revision returns a bounded conflict/not-found outcome and causes no transition. Provider
failure returns unavailable; the caller re-reads authoritative state before presenting a result.

## Repository results

Application-facing operations use discriminated outcomes containing canonical values only:

| Outcome | Meaning |
|---|---|
| `found` | Requested registration/projection or enabled configuration exists and is valid. |
| `not_found` | Requested registration or configuration is absent. |
| `registered` | A new registration, with optional initial configuration, was committed. |
| `duplicate` | The guild is already registered; nothing changed. |
| `saved` | Configuration creation/replacement was committed. |
| `enabled` / `disabled` | Only enabled state and revision changed. |
| `deleted` | Registration and optional configuration were removed together. |
| `conflict` | Expected revision/state no longer matches; nothing changed. |
| `invalid` | Submitted or stored data failed Voicelet validation and was not used. |
| `unavailable` | Provider failure was reduced to a safe bounded result. |

Enumeration returns only registrations joined with valid optional configurations plus a bounded
invalid-record count for observability. It never returns orphan configurations or provider records.
