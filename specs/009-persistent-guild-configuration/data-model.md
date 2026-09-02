# Data Model: Persistent Guild Configuration

## Canonical `GuildConfig`

Voicelet owns this provider-independent plain-data model. It contains no secret, application runtime
setting, Firestore type, record ID, timestamp, document path, reference, or raw provider error.

| Field | Rules |
|---|---|
| `schemaVersion` | Positive integer, initially `1`. |
| `guildId` | Non-empty logical unique identity. |
| `triggerChannelId` | Non-empty voice-channel identifier. |
| `destinationCategoryId` | Non-empty category identifier. |
| `inactivityTimeoutMinutes` | Integer 1–1,440; normalized default 60. |
| `reconciliationIntervalMinutes` | Integer 1–1,440; normalized default 15. |
| `permanentChannelIds` | Unique non-empty string array; normalized default `[]`. |

`GuildConfigInput` accepts required IDs and optional lifecycle fields. Its application service
normalizes defaults and rejects invalid input. Returned canonical values are always complete.

## `StoredGuildConfigV1`

The adapter translates canonical values into the same fields as plain strings, numbers, and a string
array. `guildId` is also stored as data to detect mismatched/corrupt documents. Collection and
document paths are private to the adapter. Unknown future fields are ignored; unsupported schema
versions are `invalid`, never silently interpreted.

## Repository outcomes

| Result | Meaning |
|---|---|
| `found(config)` | Complete validated canonical configuration. |
| `not_found` | Normal unconfigured guild. |
| `invalid` | Persisted data fails version/data validation and is never returned to behavior. |
| `unavailable` | Provider/connection failure mapped without SDK details. |
| `saved(config)` | Complete normalized replacement was stored. |

Enumeration returns validated canonical values plus an aggregate invalid count only to preserve the
existing reconciliation schedule. It returns no Firestore query value and does not subscribe.

```text
unconfigured --save(valid)--> configured
configured --save(valid)--> configured (replacement)
configured --corrupt/unsupported stored data--> invalid (safe skip)
any read --provider failure--> unavailable (not ready)
unavailable --successful later read--> found/not_found (ready recovery)
```

Discord resource existence, guild membership, and channel/category type are checked when behavior
runs; stale but structurally valid IDs safely skip the affected behavior.
