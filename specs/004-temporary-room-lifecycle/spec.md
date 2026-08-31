# Feature Specification: Temporary Room Lifecycle

**Feature Branch**: `004-temporary-room-lifecycle`

**Created**: 2026-08-31

**Status**: Draft

**Input**: User description: "Create the Temporary Room Lifecycle feature."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Remove Continuously Empty Temporary Rooms (Priority: P1)

A server member benefits from automatic removal of a Voicelet-managed temporary voice room after
it has been vacant without interruption for the configured inactivity period.

**Why this priority**: Removing abandoned rooms keeps the destination category usable while
preserving rooms that are still in use.

**Independent Test**: Create a managed temporary room, make it empty, advance a controlled clock
by the configured period, and verify that the room and its creator's active-room association are
removed.

**Acceptance Scenarios**:

1. **Given** a managed temporary room becomes empty, **When** it remains empty for the complete
   configured inactivity period, **Then** Voicelet verifies it is still empty, deletes it, and
   removes its creator's active-room association.
2. **Given** a managed temporary room is empty for less than the configured period, **When** a
   member joins it, **Then** its pending inactivity period is cancelled and that period cannot
   delete the room.
3. **Given** a room whose pending inactivity period was cancelled becomes empty again, **When** it
   remains empty, **Then** a new full inactivity period begins at the later empty transition with
   no time carried forward.
4. **Given** a user enters the room-creation channel after their prior temporary room was removed,
   **When** the normal creation flow runs, **Then** the user can receive a new temporary room.

---

### User Story 2 - Safely Handle Room Activity and Deletion Failures (Priority: P2)

Members can join and leave temporary rooms around an expiry boundary without Voicelet intentionally
deleting an occupied room, while operators can detect a deletion failure without exposure of Discord
secrets or personal data.

**Why this priority**: Race-safe lifecycle handling protects active conversations and makes
operational failures diagnosable.

**Independent Test**: Exercise duplicate, delayed, and closely ordered join/leave activity with a
controlled clock, including an attempted deletion that fails, and verify the occupied room remains
and safe failure evidence is available.

**Acceptance Scenarios**:

1. **Given** repeated or delayed reports that an already empty managed room is empty, **When** they
   are processed, **Then** they create only one effective inactivity period for that empty state.
2. **Given** a member joins at approximately the time an empty room reaches expiry, **When**
   Voicelet considers deletion, **Then** it does not intentionally delete the room if it is
   occupied at the final emptiness check.
3. **Given** automatic deletion of a still-empty managed room fails, **When** the failure is
   handled, **Then** the worker continues operating, the association remains active, and a
   privacy-safe observable failure is recorded.

---

### User Story 3 - Recover from Externally Deleted Rooms (Priority: P3)

A creator whose managed temporary room was manually deleted can create a replacement room without
being blocked by a stale active-room association.

**Why this priority**: Discord resources can change outside Voicelet, and stale state must not
prevent normal room creation or violate the one-active-room rule.

**Independent Test**: Create a managed room and association, remove the room outside Voicelet, then
have its creator enter the room-creation channel and verify stale state is discarded before one new
room is created.

**Acceptance Scenarios**:

1. **Given** Voicelet observes external deletion of a managed temporary room, **When** it processes
   that observation, **Then** it removes the associated active-room record.
2. **Given** a creator enters the room-creation channel with an existing association, **When** the
   associated room no longer exists, **Then** Voicelet discards the stale association and may create
   one replacement room through the existing behavior.
3. **Given** moving a creator to an existing associated room fails, **When** no independent evidence
   shows that room is missing, **Then** Voicelet retains the association and does not create a
   replacement room solely because of the move failure.

### Edge Cases

- Multiple members leave close together; only the transition to an empty room starts the effective
  inactivity period.
- Duplicate, delayed, or repeated activity reports do not reset an unchanged empty period or cause
  more than one deletion attempt for its expiry.
- A join after a prior empty period but before deletion invalidates that period, even if its delayed
  expiry processing occurs later.
- The configured trigger channel, destination category, unmanaged temporary-looking channels, and
  unrelated Discord channels are never automatic-deletion targets.
- External deletion may be observed late or not at all; a later creator request checks the associated
  room's existence before relying on it.
- A deletion failure leaves the room association active; a move failure alone is not evidence that
  an associated room was externally deleted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Voicelet MUST begin one inactivity period when it detects that a recognized managed
  temporary room has become empty.
- **FR-002**: Voicelet MUST delete a managed temporary room only when it has remained continuously
  empty for the entire configured inactivity period and is still empty immediately before deletion.
- **FR-003**: Any member joining a room with a pending inactivity period MUST invalidate that period;
  a later empty transition MUST begin a new full period without carrying forward elapsed time.
- **FR-004**: Repeated, duplicate, or delayed activity reports MUST NOT create duplicate effective
  inactivity periods, duplicate deletion attempts, or incorrectly reset an unchanged room state.
- **FR-005**: Concurrent activity and expiry handling MUST preserve the rule that Voicelet never
  intentionally deletes a room it finds occupied at its final pre-deletion check.
- **FR-006**: Voicelet MUST only automatically delete rooms it recognizes as managed temporary
  rooms; it MUST NOT delete the configured creation channel, destination category, or unrelated
  channels.
- **FR-007**: The inactivity timeout MUST use the existing configuration pattern for Discord
  channel/category settings, default to 60 minutes, accept only whole minutes from 1 through 1,440
  inclusive, and reject absent-or-invalid values with a clear configuration error rather than
  ambiguous lifecycle behavior.
- **FR-008**: Documentation and a credential-free example configuration MUST explain the inactivity
  timeout's setting, default, whole-minute unit, accepted range, and a safe value for local testing.
- **FR-009**: After successful automatic deletion, Voicelet MUST remove the deleted room's active
  creator association so it no longer counts toward the one-active-temporary-room rule.
- **FR-010**: If automatic deletion fails, Voicelet MUST remain running, retain the association, and
  record an observable privacy-safe failure without logging Discord tokens, raw event data, or
  unnecessary personal identifiers.
- **FR-011**: When Voicelet observes external deletion of a managed room, it MUST discard any active
  association for that room.
- **FR-012**: Before relying on an existing room association during room creation, Voicelet MUST
  determine whether the associated room still exists; if it does not, Voicelet MUST discard the
  stale association before applying the existing creation behavior.
- **FR-013**: A failed attempt to move a user into an existing associated room MUST NOT by itself
  discard that association or create a replacement room.
- **FR-014**: The feature MUST include deterministic automated unit coverage for inactivity start,
  cancellation, reset, expiry, continuous emptiness, and stale associations; integration coverage
  for deletion and association cleanup; and a simulated end-to-end lifecycle covering creation,
  cancellation by rejoin, fresh expiry, deletion, cleanup, and later recreation without waiting for
  the real default period.
- **FR-015**: The feature MUST remain bounded to runtime lifecycle management of temporary rooms;
  it MUST NOT add restart recovery, persistent room/timer state, offline reconciliation, deployment
  work, permissions management, room locking, room rename or ownership commands, ownership transfer,
  custom room limits, or production onboarding.

### Key Entities

- **Managed temporary room**: A voice room created and currently recognized by Voicelet as belonging
  to its temporary-room flow, including its creator association and current occupancy state.
- **Inactivity period**: The uninterrupted interval beginning when a managed room becomes empty and
  ending when it is occupied, deleted, or reaches the configured expiry while still empty.
- **Active-room association**: The current relationship between a creator and one managed temporary
  room that enforces the one-active-room rule during the process lifetime.
- **Inactivity timeout**: The configured duration in whole minutes that a managed room must remain
  continuously empty before automatic deletion is eligible.
- **Stale association**: An active-room association that refers to a room no longer present in
  Discord because of external or manual deletion.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In deterministic automated lifecycle scenarios, 100% of managed rooms that remain
  empty through the full configured period are deleted and have their creator association removed.
- **SC-002**: In deterministic scenarios with a rejoin before expiry, 100% of affected rooms survive
  the prior pending period, and every later empty state requires a full new period before deletion.
- **SC-003**: Automated coverage demonstrates zero intentional deletions of occupied, unmanaged,
  trigger, destination-category, or unrelated channels across the defined lifecycle cases.
- **SC-004**: In the simulated end-to-end flow, a creator can create, abandon, rejoin, abandon again,
  have the room removed after a fresh full period, and create one replacement room without real-time
  waiting.
- **SC-005**: All invalid timeout cases in the accepted configuration boundary produce a clear
  configuration error, and all required configuration documentation states the default, unit, and
  range without including credentials or production identifiers.
- **SC-006**: Deletion and move failure scenarios leave the worker able to process subsequent room
  activity while preserving valid associations unless independent missing-room evidence is present.

## Assumptions

- The timeout is expressed as a whole number of minutes, with 60 minutes as the default and 1 to
  1,440 minutes inclusive as the accepted range; this limits accidental immediate deletion while
  permitting an explicit short local-test duration.
- Existing in-memory managed-room associations remain authoritative only while Voicelet is running;
  no state is reconstructed after restart.
- Existing room-creation behavior continues to enforce one active temporary room per creator, and
  this feature extends it only to remove stale or successfully deleted associations.
- Room existence is verified separately from a member-move result; access or transient move failures
  are not evidence that a room is absent.
- Automated tests use controllable time and the existing simulated Discord environment so they are
  deterministic and suitable for continuous integration.
