# Data Model: Temporary Voice Room Creation

All models in this feature are transient process state. Discord IDs and display names are used only while processing an event or performing a Discord operation; they must never be logged, used as metric labels, persisted, or returned by the operational HTTP interface.

## TemporaryRoomConfigurationMap

| Field | Type | Rules |
|---|---|---|
| `byGuildId` | map of guild identifier to `TemporaryRoomConfig` | A missing entry means the server is unsupported and its events are ignored. |

## TemporaryRoomConfig

| Field | Type | Rules |
|---|---|---|
| `triggerChannelId` | non-empty identifier | Required for a configured server. Only entry transitions into this channel are eligible. |
| `destinationCategoryId` | non-empty identifier | Required for a configured server. Every new room must be created under this category. |

The complete mapping is validated on startup. A malformed supplied entry produces a generic, redaction-safe configuration failure. A server absent from the map is ignored without per-member observation.

## VoiceChannelTransition

| Field | Type | Rules |
|---|---|---|
| `guildId` | identifier | Required processing-only guild scope. |
| `userId` | identifier | Required processing-only member key. |
| `previousChannelId` | identifier or `null` | The channel before this transition. |
| `currentChannelId` | identifier or `null` | The channel after this transition. |
| `isBot` | boolean | Bot transitions are ineligible. |
| `displayName` | string | Processing-only source for a safe room name. |
| `receivedAt` | timestamp | Assigned by the worker clock. |

An eligible trigger entry requires `isBot = false`, `currentChannelId = triggerChannelId`, and `previousChannelId != triggerChannelId`.

## TemporaryRoomAssociation

| Field | Type | Rules |
|---|---|---|
| `guildId` | identifier | Part of the in-memory association key. |
| `userId` | identifier | Part of the in-memory association key. |
| `roomId` | identifier | The current candidate room to verify or reuse. |

**Lifecycle**: Absent → create room → associated → verify/reuse on next trigger entry. If the room does not exist, associated → stale → absent, after which replacement creation is permitted. The map is discarded on restart. It is never persisted.

## TemporaryRoomOperationOutcome

| Field | Type | Rules |
|---|---|---|
| `kind` | enum | `ignored`, `created`, `reused`, `stale_replaced`, `create_failed`, or `move_failed`. |
| `recordedAt` | timestamp | Captured by the worker clock. |

Outcomes contain no Discord identifier, display name, generated channel name, token, raw event, or provider error detail. They drive bounded logs and metrics.

## Concurrency State

| State | Meaning |
|---|---|
| `idle` | No operation is running for the guild/member key. |
| `processing` | One eligible event owns validation, room lookup/create, association update, and move for the key. |
| `released` | The outcome is recorded and the next event for the key may proceed. |

Different guild/member keys are never serialized together. Every path, including failures, releases the key lock.
