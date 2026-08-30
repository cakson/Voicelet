# Data Model: Engineering Foundation

This foundation has no persisted data model. All models below are transient process state; raw
Discord events, tokens, and personal identifiers are never stored or logged.

## AppConfig

| Field | Type | Rules |
|---|---|---|
| `discordToken` | secret string | Required in production mode; read only by the Discord adapter; never returned or logged. |
| `host` | string | Optional bind address with a safe local default. |
| `port` | positive integer | Optional HTTP port with a documented local default. |
| `logLevel` | enum | Limited to documented safe logging levels. |
| `gatewayMode` | enum | `discord` for runtime or `simulated` for tests only. |

## GatewayReadiness

| Field | Type | Rules |
|---|---|---|
| `state` | enum | `starting`, `connecting`, `ready`, `reconnecting`, `disconnected`, or `stopped`. |
| `changedAt` | timestamp | Set on every state transition. |
| `lastErrorClass` | optional enum | A safe error category; it must not contain raw provider errors or credentials. |

**Transitions**: `starting → connecting → ready`; an interruption transitions `ready → reconnecting`
or `disconnected`; a successful reconnect returns to `ready`; graceful shutdown transitions any
state to `stopped`. `GET /readyz` is successful only in `ready`.

## VoiceStateChanged

Normalized domain input produced only after boundary validation.

| Field | Type | Rules |
|---|---|---|
| `guildId` | identifier | Required processing-only Discord identifier. |
| `userId` | identifier | Required processing-only Discord identifier. |
| `channelId` | identifier or null | Null denotes leaving a voice channel. |
| `sessionId` | optional identifier | Passed only when supplied by the event. |
| `receivedAt` | timestamp | Assigned by the worker clock at receipt. |

Validation rejects missing/non-string identifiers and unexpected structural payloads. The worker
handles join, leave, and move events identically for this foundation; product-specific state changes
are out of scope.

## VoiceStateHandled

Safe outcome emitted after successful domain handling.

| Field | Type | Rules |
|---|---|---|
| `eventType` | literal | Always `voice_state` in this feature. |
| `outcome` | enum | `handled` or `rejected`. |
| `recordedAt` | timestamp | Captured by the worker clock. |

This model intentionally excludes guild, user, channel, token, event payload, and message content
from logs and metric labels.
