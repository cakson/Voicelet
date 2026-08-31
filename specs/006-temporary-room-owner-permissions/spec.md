# Feature Specification: Temporary Room Owner Permissions

**Feature Branch**: `006-temporary-room-owner-permissions`  
**Created**: 2026-08-31  
**Status**: Draft  
**Input**: User description: "Create the Temporary Room Owner Permissions feature."

## Clarifications

### Session 2026-08-31

- Q: When an owner moves their temporary room outside Voicelet's configured category, should Voicelet restore it to that category and keep the association? → A: Restore the tracked room to the configured category, retain its owner association, and have reconciliation skip it until it is back in that category.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage an Assigned Temporary Room Natively (Priority: P1)

As the creator of a temporary voice room, I can use Discord's normal channel-management interface
to manage the settings and access of the room assigned to me, without receiving broader server
authority or needing Voicelet-specific room-management commands.

**Why this priority**: Native room controls are the feature's primary value and must be safe before
any additional resilience behavior is useful.

**Independent Test**: Create a room for one member, then verify that member has the expected
channel-management capability on that room only, can use the matching native room controls where
Discord permits them, and has no equivalent capability on another room, the trigger, or the category.

**Acceptance Scenarios**:

1. **Given** a member enters the configured room-creation channel and has no active association,
   **When** Voicelet creates their temporary room, **Then** it records that member as the room's
   sole owner and applies the required member-specific, room-scoped management allowance.
2. **Given** an owner whose room-specific management allowance was applied, **When** they open
   Discord's native interface for their room, **Then** they can perform ordinary voice-room settings
   and access-management actions that Discord permits through that channel-scoped capability.
3. **Given** two active temporary rooms with different owners, **When** either owner views the other
   room, the creation channel, or the temporary-room category, **Then** their room-owner allowance
   grants no equivalent management capability there.
4. **Given** a room owner changes a permitted ordinary setting, **When** Voicelet next processes
   room activity or reconciliation, **Then** the room remains a known managed room and continues
   under its existing lifecycle rules.
5. **Given** an owner moves their tracked room outside the configured temporary-room category,
   **When** Voicelet observes the move, **Then** it restores the room to the configured category,
   retains its owner association, and does not expand reconciliation outside that category.

---

### User Story 2 - Safely Delete and Replace an Owned Room (Priority: P2)

As a room owner, I can delete my assigned room through Discord when Discord permits it, and can
later create a replacement without stale ownership state blocking the normal creation flow.

**Why this priority**: Native management can include deletion, so the feature must preserve the
existing externally deleted-room lifecycle guarantee.

**Independent Test**: Create a room, delete it as its owner in the simulated Discord environment,
verify only that association is removed, and verify the former owner can create one replacement.

**Acceptance Scenarios**:

1. **Given** Discord permits an owner to delete their assigned room, **When** the owner deletes it,
   **Then** Voicelet treats it as an externally deleted managed room and removes only its associated
   active-room record.
2. **Given** an owner has deleted their assigned room and its association has been removed,
   **When** they re-enter the room-creation channel, **Then** the existing creation behavior creates
   a replacement room with a new allowance scoped only to that replacement.
3. **Given** one owner deletes their room, **When** Voicelet handles the deletion, **Then** every
   other active room and its owner-specific allowance remain unchanged.

---

### User Story 3 - Continue Safely When Owner Setup Fails (Priority: P3)

As an operator, I can detect a contained failure to apply a room-owner allowance while Voicelet
continues to manage the newly created room and avoids duplicate-room creation.

**Why this priority**: Permission setup depends on server configuration and must not make the
worker unreliable or misrepresent the resulting room state.

**Independent Test**: Simulate a failure while applying an owner allowance after room creation;
verify that the worker stays available, the created room is not reported as owner-configured, no
second room is created for the same attempt, and the failure is observable without sensitive data.

**Acceptance Scenarios**:

1. **Given** room creation succeeds but the owner-specific allowance cannot be applied, **When**
   Voicelet handles the failure, **Then** it remains running, retains the created room's normal
   lifecycle association, records a bounded privacy-safe failure, and does not mark the room as
   successfully owner-configured.
2. **Given** a prior owner-allowance application failed, **When** Voicelet processes the same
   creation request or performs the sole supported automatic reapplication after a successful
   category restoration, **Then** it does not create a duplicate room or conflicting allowance for
   that association.
3. **Given** an owner changes permissions in their own room, **When** Voicelet requires lifecycle
   or reconciliation access, **Then** Voicelet retains the effective access needed to perform those
   operations; an owner cannot use this feature to remove it.

### Edge Cases

- A member already associated with a room must not receive a second room or a copied allowance on
  any other room when they re-enter the creation channel.
- A room or owner disappears while the allowance is being applied; Voicelet contains the failure,
  avoids duplicate creation, and leaves stale-state handling to the existing lifecycle rules.
- A temporary room is deleted before or after its allowance is applied; external-deletion handling
  removes only the matching association, and a missing-room notification is safe to repeat.
- Duplicate parent-change notifications for the same tracked room are coalesced so at most one
  restoration is active at a time. A confirmed external deletion wins over a pending restoration:
  Voicelet clears only that association and performs neither a later restoration nor owner-allowance
  reapplication for the deleted room.
- A member-specific allowance cannot be applied because the bot role is insufficiently positioned
  or lacks required channel-management authority; the worker remains available and emits only
  bounded, privacy-safe operational evidence.
- An owner changes ordinary settings or channel access in their own tracked room; those changes do
  not transfer ownership, add another owner, or exempt the room from lifecycle cleanup.
- If an owner moves their tracked room outside the temporary-room category, Voicelet restores it to
  the configured category and retains its owner association. Until restoration is confirmed,
  reconciliation skips that room and never scans, adopts, or deletes any out-of-category channel.
- Restoration of a moved room fails or the room disappears before restoration; Voicelet retains the
  association unless the existing stale-state behavior independently confirms deletion, records a
  bounded privacy-safe failure, and does not expand reconciliation outside the configured category.
- A zombie room that has no current tracked association remains subject to the existing zombie
  rules and never receives a reconstructed owner allowance.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When Voicelet creates a temporary room, it MUST associate that room with its creating
  member as the room's exactly one owner for the lifetime of the current active-room association.
- **FR-002**: Voicelet MUST apply a member-specific native management allowance to the newly created
  room that is scoped to that room alone and enables ordinary voice-channel settings and access
  management that Discord permits through the corresponding channel-scoped capability.
- **FR-003**: The owner allowance MUST NOT grant Administrator, server management, server
  moderation, server-wide role authority, or any other unrelated server-wide privileged capability.
- **FR-004**: Voicelet MUST NOT grant a server-wide role solely to provide room-owner management
  capabilities, and it MUST leave existing server-level roles and permissions outside its ownership
  model.
- **FR-005**: An owner allowance MUST NOT grant equivalent authority over any other temporary room,
  the configured room-creation channel, the configured temporary-room category, unrelated channels,
  or server-wide configuration.
- **FR-006**: Creating, replacing, modifying, or deleting one member's room MUST NOT create, alter,
  or remove an owner allowance or active-room association for another member's room.
- **FR-007**: Voicelet MUST retain sufficient effective authority to create, inspect, reconcile, and
  delete its managed rooms regardless of owner-specific changes. Owner authority MUST NOT enable
  removal of Voicelet's effective lifecycle-management access.
- **FR-008**: Owner-initiated ordinary room changes MUST leave a currently tracked room managed by
  Voicelet and subject to the existing inactivity and external-deletion lifecycle behavior.
- **FR-009**: If Discord permits an owner to delete their own room, Voicelet MUST process the
  deletion using the existing stale-association behavior so the deleted association is removed and
  the member may subsequently use the ordinary room-creation flow.
- **FR-010**: When Voicelet observes that an owner has moved a tracked temporary room outside the
  configured temporary-room category, it MUST restore that room to the configured category and
  retain the room's owner association. The move MUST NOT be allowed to remain as a change to
  Voicelet's management boundary.
- **FR-010a**: Until the moved tracked room is confirmed back in the configured category,
  reconciliation MUST skip that room and MUST continue to inspect, classify, adopt, and delete
  zombie candidates only within the configured category. A restoration failure MUST be contained,
  observable with bounded privacy-safe context, and MUST NOT remove the association unless the
  existing stale-state behavior independently confirms the room was deleted.
- **FR-011**: Voicelet MUST NOT infer, reconstruct, transfer, persist, or assign a replacement owner
  allowance for a room that has lost its current tracked ownership association.
- **FR-012**: If application of the required owner-specific allowance fails after room creation,
  Voicelet MUST not crash, falsely report the room as successfully owner-configured, or create a
  duplicate room solely because that allowance failed. A `missing` provider result MUST be recorded
  as the `failed` owner-configuration state while existing stale-deletion handling determines
  whether the room was deleted.
- **FR-013**: A contained owner-allowance failure MUST leave existing room lifecycle and
  reconciliation behavior operational. No background or failure-triggered owner-allowance retry is
  introduced by this feature. The sole automatic repeat application is an idempotent reapplication
  after a successful category restoration, because Discord category synchronization can replace
  channel overwrites; it MUST NOT result in duplicate or conflicting member-specific allowances.
- **FR-014**: Permission-related failures MUST be observable through bounded, privacy-safe signals
  and MUST NOT log Discord tokens, raw Discord event payloads, or unnecessary personal identifiers.
- **FR-015**: Documentation MUST explain the native room settings and access controls owners may
  manage, the room-only scope of that authority, Discord's grouping of channel-management actions,
  and that native management can permit renaming, changing region or user limit, and deletion where
  Discord allows it.
- **FR-016**: Documentation MUST state that Voicelet grants no server-wide management privileges to
  owners. To enable native owner access-permission editing, an administrator MUST grant Voicelet's
  bot role effective Administrator permission as a bot-only, explicitly approved governance
  exception; this permission MUST NOT be granted to an owner. Documentation MUST explain that this
  prerequisite preserves Voicelet's lifecycle, reconciliation, restoration, and deletion authority
  after owner-managed channel-permission changes.
- **FR-017**: Local development documentation MUST include a manual smoke test that creates two
  temporary rooms and verifies each owner can manage only their own room, cannot manage the trigger
  or category, and can safely exercise owner-room deletion and replacement where Discord permits it.
- **FR-018**: Automated coverage MUST include unit tests for the newly created room's allowance
  policy, room-only isolation, absence of unrelated server-wide privileges, and allowance failures;
  integration tests for owner override placement, cross-room/category/trigger isolation, lifecycle
  cleanup, and permanent-channel preservation; and simulated end-to-end evidence for creation,
  association, allowance, native capability scope, lifecycle/reconciliation continuity, deletion,
  and non-corruption of other associations.

### Key Entities

- **Room owner**: The single member associated with one currently tracked temporary room and eligible
  for the room-specific native management allowance.
- **Owner allowance**: A member-specific permission setting that grants limited native room
  management only on the owner's associated temporary room and never as server-wide authority.
- **Active-room association**: The current in-memory relationship between a creator, one managed
  temporary room, and its room owner; it is removed by the existing deletion lifecycle and is not
  reconstructed after transient state loss.
- **Managed temporary room**: A room created and currently tracked by Voicelet, governed by the
  existing lifecycle and reconciliation boundaries even if its owner changes supported settings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In deterministic successful owner-configuration scenarios, 100% of newly created
  tracked rooms receive the expected member-specific owner allowance, and each allowance appears on
  exactly one room. Provider-failure scenarios are governed by SC-004.
- **SC-002**: In automated isolation scenarios with at least two owners, 100% of owners have the
  expected native management capability on their own room and 0% receive that capability on another
  temporary room, the trigger channel, the category, or an unrelated channel.
- **SC-003**: In automated policy scenarios, 0 owner allowances include Administrator, server-wide
  management, moderation, or other unrelated administrative capabilities, and 0 server-wide roles
  are introduced for room ownership.
- **SC-004**: In deterministic owner-allowance failure scenarios, the worker remains available, no
  duplicate temporary room is created, and the room is never represented as successfully
  owner-configured.
- **SC-005**: In simulated end-to-end deletion and replacement scenarios, 100% of deleted owner
  rooms have only their matching association removed, other associations remain intact, and the
  former owner can create one replacement room through the normal flow.
- **SC-006**: Documentation enables an administrator to complete the local two-owner smoke test and
  configure Voicelet's bot authority without production credentials or granting room owners
  server-wide privileges.

## Assumptions

- Discord's native channel-management permission model may group several ordinary room actions
  together; this feature deliberately grants only the least channel-scoped capability that supports
  the stated native-management experience and does not promise to bypass Discord hierarchy rules.
- The existing single active-room association per creator remains authoritative only while the
  process is running; ownership is neither persisted nor reconstructed after restart or state loss.
- Administrators retain responsibility for the server's role hierarchy and for any pre-existing
  permissions that independently grant a member broader authority.
- The configured temporary-room category remains a dedicated safety boundary. A tracked room moved
  out by an owner is restored to that category while retaining its association; until restoration is
  confirmed, it is excluded from reconciliation and no out-of-category room becomes a reconciliation
  candidate or receives reconstructed ownership.
- The simulated Discord environment can model member-specific room allowances and native capability
  checks deterministically for unit, integration, and end-to-end verification.

## Out of Scope

- Slash commands, custom commands, or a web interface for room management.
- Server-wide owner roles, Administrator, Manage Server, Kick Members, Ban Members, or unrelated
  moderation and administrative capabilities.
- Ownership transfer, multiple owners, persistence across restart, and ownership reconstruction.
- Management of the configured temporary-room category, room-creation channel, permanent channels,
  or unrelated server channels by a room owner through this feature.
- Northflank deployment and production Discord onboarding.
