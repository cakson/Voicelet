# Research: Room Reconciliation & Zombie Cleanup

## Decision 1: Store reconciliation settings in the existing per-server mapping

- **Decision**: Add `reconciliationIntervalMinutes`, defaulting to 15 and constrained to whole integers 1–1,440, plus `permanentChannelIds`, defaulting to an empty list, to the existing temporary-room mapping.
- **Rationale**: The mapping already scopes trigger, category, and inactivity rules to one server. A separate global setting would make multi-server behavior ambiguous. The trigger is always included in the effective permanent set without requiring duplication in the list.
- **Alternatives considered**: A global interval was rejected because it violates the required per-server configuration approach. Inferring permanent channels from names or membership was rejected because it violates the feature's safety and restart constraints.

## Decision 2: Enumerate category candidates through a narrow Discord port

- **Decision**: Add `listCategoryVoiceRooms(guildId, categoryId)` that returns only voice-channel identifiers or a bounded unavailable outcome. The production adapter fetches/filter channels by voice type and configured parent; the simulator filters its category-backed room state.
- **Rationale**: The application can apply product classification without seeing names, members, raw Discord payloads, or channels outside the configured category.
- **Alternatives considered**: Scanning every known guild channel in the application was rejected because it breaks the port boundary and broadens accidental cleanup scope. Reconstructing candidates from voice events was rejected because it misses restart-state rooms.

## Decision 3: Use a guarded zombie-deletion operation

- **Decision**: Add `deleteEmptyRoom(guildId, roomId)` with `deleted`, `occupied`, `missing`, and `failed` outcomes. The adapter re-fetches/rechecks current emptiness immediately before deleting; occupied, missing, or failed outcomes are safe no-ops for reconciliation.
- **Rationale**: A scan snapshot is stale by definition. A final provider-side occupancy guard is required before deleting a candidate whose membership may have changed.
- **Alternatives considered**: Reusing unconditional deletion after a prior state lookup was rejected because a join could occur between checks. Treating failed inspection as empty was rejected because safe cleanup must preserve uncertain channels.

## Decision 4: Make reconciliation an application policy separate from lifecycle

- **Decision**: Create an application reconciler with a read-only `isKnownManagedRoom` query from `TemporaryRoomManager`. It has independent per-server/candidate serialization and never mutates associations or lifecycle work for a zombie.
- **Rationale**: The existing manager remains authoritative for tracked-room ownership and inactivity timers, while reconciliation can prove it does not interfere with those records.
- **Alternatives considered**: Persisting associations was rejected as out of scope. Reconstructing owners from room names or occupants was rejected by the specification. Merging zombie cleanup into inactivity scheduling was rejected because empty zombies must delete immediately.

## Decision 5: Recurrence is scheduler-driven and coalesced

- **Decision**: On an effective transition to ready, request one immediate scan per configured server. Schedule the next scan only after the current one settles, keep one pending recurrence per server, and cancel it when readiness ends or the worker stops.
- **Rationale**: One-shot scheduler composition works in production and the existing deterministic simulator. Completing before rescheduling avoids overlapping periodic work and duplicate side effects, while guarding duplicate ready events emitted by the provider.
- **Alternatives considered**: `setInterval` was rejected because scans can overlap. Real-time test waits were rejected because CI tests must be deterministic.

## Decision 6: Use bounded reconciliation observations and simulator controls

- **Decision**: Add reconciliation operation outcomes/counters without guild, room, member, provider-error, or payload fields. Extend simulated IPC to seed category rooms and occupancy before readiness and to advance controlled time or invoke deterministic scan controls.
- **Rationale**: This makes startup/state-loss and repeated-scan E2E evidence possible without credentials or leaking Discord data.
- **Alternatives considered**: Test-only direct inspection of production state was rejected because E2E must cross the worker boundary. Logging names, IDs, or provider errors was rejected by privacy and security constraints.
