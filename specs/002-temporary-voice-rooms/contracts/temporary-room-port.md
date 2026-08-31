# Temporary Room Gateway Contract

This is an internal application-to-infrastructure contract. It has no HTTP endpoint and does not expose Discord SDK types, raw provider errors, tokens, raw voice-state payloads, identifiers in observability, or personal display names in logs.

## Inputs

### `TemporaryRoomGateway.roomExists`

Receives a guild-scoped room identifier and resolves to `true` when that room still exists and is a usable voice room; resolves to `false` for a missing or unusable room. Provider failures resolve to a bounded failure result rather than throwing to the worker event loop.

### `TemporaryRoomGateway.createRoom`

Receives the event's guild scope, configured destination category, and a pre-sanitized, length-bounded room name. On success, returns a room identifier. On failure, returns the safe operation class `create_failed` and no provider error data.

### `TemporaryRoomGateway.moveMember`

Receives the event's guild scope, member identifier, and target room identifier. On success, returns `moved`; otherwise returns the safe operation class `move_failed`. A move failure never removes a successfully created association.

## Required Semantics

- The application invokes the port only for an eligible trigger entry from a server with a matching configuration entry.
- An event from a server with no configuration entry is ignored before any room-management operation or per-member observation.
- For one `(guildId, userId)` key, the application serializes existence check, stale handling, creation, association update, and movement.
- A successful creation is associated before movement is attempted.
- A missing associated room is stale; its association is removed before replacement creation.
- Port failures are returned as bounded outcomes and never crash the worker.

## Simulated Contract

The simulated adapter implements identical success/failure semantics and exposes test-only, deterministic controls to:

- emit voice transitions, including bot and duplicate events;
- inspect created rooms and member placements;
- mark an associated room missing; and
- make the next create or move operation fail.

Process-level simulation exposes only test commands and safe result counts necessary for E2E assertions; production operational endpoints remain unchanged.
