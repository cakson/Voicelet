# Feature Specification: Temporary Voice Room Creation

**Feature Branch**: `002-temporary-voice-rooms`

**Created**: 2026-08-30

**Status**: Draft

**Input**: User description: "Create the Temporary Voice Room Creation feature."

## Clarifications

### Session 2026-08-30

- Q: Should one running Voicelet worker support temporary-room configuration for multiple Discord servers? → A: Multiple servers, each with its own trigger channel and destination category.
- Q: If Voicelet creates a room but cannot move the member into it, should that room remain the member’s active room for a later retry? → A: Keep the room associated; a later trigger entry retries moving the member into it.
- Q: What should happen when a voice-state event comes from a Discord server that has no temporary-room configuration? → A: Ignore the event; create no room and emit no per-member details.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a Personal Voice Room (Priority: P1)

As a Discord member, I can join the server's designated voice-channel trigger and be placed in a
new personal temporary voice room, so I can begin a private conversation without needing a command
or moderator intervention.

**Why this priority**: Joining the trigger and receiving a usable room is the core value of the
feature.

**Independent Test**: In a server with a configured trigger channel and destination category, a
non-bot member joins the trigger and is placed into one newly created room in that category.

**Acceptance Scenarios**:

1. **Given** a configured trigger channel and destination category and a non-bot member with no
   active temporary room, **When** the member joins the trigger channel, **Then** one temporary
   voice room with a user-friendly name derived from that member is created in the destination
   category and the member is moved into it after creation succeeds.
2. **Given** a non-bot member joins any voice channel other than the configured trigger,
   **When** the voice-state change is processed, **Then** no temporary room is created.
3. **Given** a bot joins the configured trigger channel, **When** the voice-state change is
   processed, **Then** no temporary room is created and the bot is not moved by this feature.

---

### User Story 2 - Reuse an Existing Personal Room (Priority: P2)

As a Discord member who already has a temporary room, I return to that room when I join the trigger
again, so I do not accumulate duplicate rooms.

**Why this priority**: Reuse enforces the one-room-per-member rule and prevents unnecessary server
clutter.

**Independent Test**: Give a member an active temporary room, have them join the trigger channel,
and verify that they are moved to that room with no additional room created.

**Acceptance Scenarios**:

1. **Given** a non-bot member has an active associated temporary room that still exists,
   **When** they join the trigger channel, **Then** no new room is created and the member is moved
   into the existing room.
2. **Given** a member's associated temporary room no longer exists, **When** they join the trigger
   channel, **Then** the obsolete association is disregarded and the member may receive one new
   temporary room.

---

### User Story 3 - Remain Reliable During Overlapping Events (Priority: P3)

As a server operator, I can rely on temporary-room creation to remain safe when events overlap or
Discord operations fail, so the worker remains available and members do not receive duplicate rooms.

**Why this priority**: Voice-state delivery may duplicate or overlap, and a failed remote operation
must not impair the worker's lifecycle.

**Independent Test**: Simulate duplicate concurrent trigger events for one member, concurrent
events for separate members, and failures while creating or moving a member; verify the resulting
rooms, movements, safe failure evidence, and worker readiness.

**Acceptance Scenarios**:

1. **Given** duplicate or concurrent trigger events for one eligible member, **When** they are
   processed, **Then** at most one active temporary room is associated with that member.
2. **Given** two or more eligible members join the trigger channel concurrently, **When** their
   events are processed, **Then** each member is handled independently and may receive their own
   room.
3. **Given** room creation or member movement fails, **When** the failure is processed, **Then**
   the failure is observable without exposing Discord tokens, raw event data, or unnecessary
   personal identifiers, and the worker remains available for later events.

### Edge Cases

- A member moves between unrelated voice channels, leaves voice, or receives an unrelated
  voice-state update; none of these events creates a room.
- The member leaves or changes voice channel while a room is being created; the attempted movement
  can fail safely, the created room remains associated with that member for reuse, and the worker
  continues processing future events.
- A created room is deleted after it was associated with a member; the next trigger entry treats
  that association as stale.
- A duplicate delivery arrives while a room is being created or while the member is being moved;
  it must not create a second active room for that member.
- The configured trigger or destination category is unavailable when an event arrives; the event
  fails safely, is observable without sensitive data, and does not crash the worker.
- A voice-state event arrives from a server without temporary-room configuration; it is ignored,
  creates no room, and emits no per-member details.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Administrators MUST be able to configure a designated trigger voice channel and
  destination category for each Discord server served by the worker; each server's configuration
  applies only to voice-state events from that server.
- **FR-002**: When a non-bot member enters the configured trigger channel, the system MUST evaluate
  whether that member already has an active temporary-room association.
- **FR-003**: For an eligible member without an active existing room, the system MUST create exactly
  one temporary voice room within the configured destination category before attempting to move the
  member into it.
- **FR-004**: The system MUST give each created temporary room a predictable, user-friendly name
  derived from the triggering member.
- **FR-005**: When an associated temporary room exists, the system MUST not create another room and
  MUST move the member into the existing room after they enter the trigger channel.
- **FR-006**: When an associated room no longer exists, the system MUST treat its association as
  stale and permit creation of a replacement room on a later qualifying trigger entry.
- **FR-007**: The system MUST ensure that duplicate or concurrent qualifying events for the same
  member never result in more than one active temporary room for that member.
- **FR-008**: The system MUST process qualifying events for different members independently so one
  member's creation or movement does not prevent another member from receiving their own room.
- **FR-009**: The system MUST ignore bot users and voice-state events that do not represent entry to
  the configured trigger channel.
- **FR-010**: If room creation fails, the system MUST safely record a privacy-safe operational
  failure and remain able to process later events.
- **FR-011**: If movement after room creation or room reuse fails, the system MUST safely record a
  privacy-safe operational failure, retain any successfully created room as the member's active
  association, and remain able to process later events; a later qualifying trigger entry MUST retry
  movement to that associated room rather than create another room.
- **FR-012**: The feature MUST preserve the application's established readiness, startup,
  reconnection, and shutdown behavior.
- **FR-013**: The feature MUST have unit coverage for its decision rules, integration coverage for
  its Discord-facing behavior, and end-to-end coverage through the existing simulated Discord
  environment, including the primary flow and failure handling.
- **FR-014**: Documentation MUST explain the configuration needed to identify the trigger voice
  channel and destination category, including the effect of missing or invalid configuration.
- **FR-015**: The feature MUST NOT automatically delete empty rooms, use inactivity timers, retain
  temporary-room state across restarts, persist temporary-room state, manage room permissions,
  provide configurable room limits, rename rooms through member controls, or add room-management
  commands.
- **FR-016**: The system MUST ignore voice-state events from a Discord server without a
  temporary-room configuration; it MUST create no room and emit no per-member details for those
  events.

### Key Entities *(include if feature involves data)*

- **Temporary-room configuration**: The server-scoped mapping of each served Discord server to its
  trigger voice channel and destination category that enable room creation.
- **Temporary-room association**: The in-memory relationship between a member and the one temporary
  room currently considered active for that member; it becomes stale when that room no longer exists
  and does not survive a worker restart.
- **Temporary voice room**: A voice room created for one triggering member inside the configured
  destination category.
- **Trigger entry event**: A member voice-state transition into the configured trigger voice
  channel that may initiate creation or reuse of a room.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In the simulated Discord end-to-end journey, 100% of eligible members who join a
  valid trigger channel are assigned to a created or existing temporary room within 5 seconds of
  event delivery when Discord operations succeed.
- **SC-002**: Across at least 100 simulated duplicate or concurrent trigger-event trials for one
  member, no trial results in more than one active temporary room for that member.
- **SC-003**: In a simulated concurrent-entry test involving at least 10 eligible members, every
  member independently receives an eligible room and no member receives another member's room.
- **SC-004**: In all simulated room-creation and member-movement failure cases, the worker remains
  ready to process a subsequent valid event and the emitted operational evidence contains no tokens,
  raw event payloads, or member-identifying values beyond what is essential for safe diagnosis.
- **SC-005**: A developer following the project documentation can configure the trigger channel and
  destination category and complete the primary simulated flow without undocumented steps.

## Assumptions

- The existing worker receives Discord voice-state changes and provides a simulated Discord
  environment suitable for the required automated tests.
- Channel and category identifiers are supplied through the application's established configuration
  mechanism as an explicit mapping for every server handled by this worker.
- An active temporary-room association is held only while the worker is running; restart recovery,
  persistence, and cleanup are intentionally excluded.
- A user-friendly derived room name is deterministic for the triggering member and may be adjusted
  to comply with Discord channel naming constraints.
- The worker has the Discord permissions required to create a voice channel in the configured
  category and move eligible members; missing permissions are treated as safe operational failures.
