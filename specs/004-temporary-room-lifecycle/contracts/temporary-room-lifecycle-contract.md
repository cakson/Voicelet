# Temporary Room Lifecycle Contract

## Configuration

`TEMPORARY_ROOM_CONFIG` remains a JSON object keyed by server identifier, with `triggerChannelId`, `destinationCategoryId`, and optional `inactivityTimeoutMinutes` fields in each mapping.

`inactivityTimeoutMinutes` defaults to `60`. If supplied, it must be a JSON integer from `1` through `1440`. Invalid mappings fail startup with the existing redaction-safe configuration error; configuration contents are never included.

## Application Ports

| Operation | Result contract | Required safety behavior |
|---|---|---|
| Obtain current managed-room state | `empty`, `occupied`, `missing`, or `unavailable` | `unavailable` is never treated as missing or empty. |
| Delete a room | `deleted`, `missing`, or `failed` | Only the application requests deletion of an associated managed room. |
| Subscribe to room deletion | Server and room identifiers only | Forwards provider/manual deletion for application cleanup; no raw payload retained. |
| Schedule work | Cancellable scheduled callback | Production time and deterministic test time implement the same contract. |

The manager obtains current room state immediately before every deletion. A move failure has no bearing on room state or association validity.

## Observable Outcomes

Lifecycle observations use a fixed outcome vocabulary: `inactivity_started`, `inactivity_cancelled`, `deleted`, `delete_failed`, `retry_scheduled`, and `external_deleted`. Metrics/logs may include only bounded outcome/category fields, never tokens, identifiers, display names, raw Gateway events, or provider error text.
