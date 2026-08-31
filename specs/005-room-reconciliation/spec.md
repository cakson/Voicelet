# Feature Specification: Room Reconciliation & Zombie Cleanup

**Feature Branch**: `005-room-reconciliation`  
**Created**: 2026-08-31  
**Status**: Draft  
**Input**: User description: "Create the Room Reconciliation & Zombie Cleanup feature."

## Clarifications

### Session 2026-08-31

- Q: What should the default reconciliation interval be? → A: 15 minutes (Option B).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Remove Empty Untracked Rooms (Priority: P1)

As a server administrator, I want Voicelet to remove empty, untracked voice rooms from the configured temporary-room category so that stale rooms do not accumulate after a restart or state loss.

**Why this priority**: Preventing category clutter while preserving legitimate active conversations is the core value of the feature.

**Independent Test**: Start Voicelet with a pre-existing empty voice channel in its configured temporary-room category that is absent from transient state, then verify that the ready-time scan deletes it.

**Acceptance Scenarios**:

1. **Given** an empty voice channel in the configured temporary-room category that is neither permanently excluded nor represented in transient state, **When** reconciliation runs, **Then** Voicelet deletes that channel immediately.
2. **Given** a voice channel in the configured temporary-room category represented in Voicelet's current transient state, **When** reconciliation runs, **Then** Voicelet leaves it to its existing inactivity lifecycle.
3. **Given** a voice channel outside the configured temporary-room category, **When** reconciliation runs, **Then** Voicelet does not inspect it as a cleanup candidate or delete it.
4. **Given** the configured temporary-room category, **When** reconciliation runs, **Then** Voicelet never deletes the category itself.

---

### User Story 2 - Preserve Active and Permanent Rooms (Priority: P1)

As a server administrator, I want occupied zombie rooms and configured permanent channels protected from cleanup so that active users and deliberate exclusions are never disrupted.

**Why this priority**: Safe cleanup must never sacrifice an active conversation or an administrator-designated permanent channel.

**Independent Test**: Reconcile a category containing an occupied untracked room, the room-creation trigger, and another explicitly permanent channel; verify that none is deleted, then empty the zombie and reconcile again.

**Acceptance Scenarios**:

1. **Given** an occupied untracked voice channel in the configured temporary-room category, **When** reconciliation runs, **Then** Voicelet leaves it unchanged and creates no ownership association for it.
2. **Given** that same zombie room becomes empty, **When** a later reconciliation runs, **Then** Voicelet deletes it immediately without applying the normal inactivity timeout.
3. **Given** the room-creation trigger channel inside the configured temporary-room category, **When** reconciliation runs, **Then** Voicelet never classifies or deletes it as a zombie.
4. **Given** an explicitly configured permanent channel inside the configured temporary-room category, **When** reconciliation runs, **Then** Voicelet never classifies or deletes it as a zombie.

---

### User Story 3 - Reconcile Reliably Over Time (Priority: P2)

As a server administrator, I want cleanup to run when Voicelet becomes ready and at a safe configurable cadence so that transient-state loss is recovered without manual intervention.

**Why this priority**: Automatic, repeatable reconciliation keeps managed categories healthy throughout normal operation and after restarts.

**Independent Test**: Configure a short test interval in the simulated Discord environment, verify a scan begins after readiness, repeat the scan against unchanged state, and verify no duplicate deletion or transient-state corruption occurs.

**Acceptance Scenarios**:

1. **Given** Voicelet reaches ready state with an empty transient room store and pre-existing category channels, **When** startup reconciliation runs, **Then** empty untracked rooms are deleted and occupied untracked rooms remain.
2. **Given** a valid server-specific reconciliation interval, **When** Voicelet remains ready, **Then** it runs subsequent scans at that interval.
3. **Given** two reconciliation runs observe the same desired state, **When** both complete, **Then** the outcome is equivalent to one run and active room associations remain unchanged.
4. **Given** a channel is created, deleted, joined, or left while a scan is underway, **When** reconciliation reaches that channel, **Then** Voicelet safely re-evaluates or skips the changed channel without crashing the worker.

---

### User Story 4 - Diagnose Safe Cleanup Failures (Priority: P3)

As an operator, I want contained, privacy-safe signals when reconciliation cannot inspect or delete a channel so that I can diagnose cleanup issues without exposing Discord secrets or member data.

**Why this priority**: Cleanup should continue safely even when individual provider operations fail.

**Independent Test**: Make inspection or deletion fail for one eligible channel while another eligible empty zombie exists; verify the worker remains available, the other channel is reconciled where safe, and the failure is observable without raw Discord data.

**Acceptance Scenarios**:

1. **Given** inspection of one candidate channel fails, **When** reconciliation runs, **Then** the worker remains running and continues reconciling other independent candidates where safe.
2. **Given** deletion of one empty zombie fails, **When** reconciliation runs, **Then** the failure is observable with bounded, privacy-safe context and no active association is created or altered.

### Edge Cases

- A channel disappears between category enumeration and inspection or deletion; reconciliation treats the already-missing channel as a safe no-op.
- A channel becomes occupied before deletion; Voicelet must not delete it unless its empty state is confirmed at the deletion decision.
- A new permanent exclusion is configured; the next applicable scan must preserve that channel even if it is absent from transient state.
- A configured category is unavailable or cannot be inspected; Voicelet records a safe failure and makes no deletion outside that category.
- Concurrent or duplicate scans must serialize or otherwise safely converge so that one channel cannot produce duplicate deletion effects.
- After restart, prior managed rooms have no transient association: empty rooms are eligible zombies, while occupied rooms remain untouched until a later scan finds them empty.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Voicelet MUST run reconciliation for each configured server immediately after it becomes ready and MUST repeat it using that server's configured reconciliation interval.
- **FR-002**: Voicelet MUST support a per-server reconciliation interval through the same configuration mapping that supplies the trigger channel, temporary-room category, and inactivity timeout.
- **FR-003**: The reconciliation interval MUST be expressed in whole minutes, default to 15 minutes when omitted, and accept only integers from 1 through 1,440 inclusive; invalid values MUST prevent unsafe configuration from being accepted without exposing configuration secrets.
- **FR-004**: Reconciliation MUST consider only voice channels currently inside the configured temporary-room category and MUST never delete that category or channels outside it.
- **FR-005**: The configured room-creation trigger channel MUST always be permanently excluded from zombie classification and deletion, regardless of transient state or its placement in the category.
- **FR-006**: Configuration MUST support additional explicit permanent-channel exclusions for any other permanent voice channels that administrators need to retain in the configured temporary-room category; every such exclusion MUST be permanently excluded from zombie classification and deletion.
- **FR-007**: Voicelet MUST classify a channel in the configured temporary-room category as a known managed room only when it is represented in the current transient room state.
- **FR-008**: Voicelet MUST classify a channel in the configured temporary-room category as a zombie only when it is neither a permanently excluded channel nor a known managed room.
- **FR-009**: Voicelet MUST delete an empty zombie immediately during reconciliation and MUST NOT apply the configured inactivity timeout, create an owner association, or modify an active room association as part of that deletion.
- **FR-010**: Voicelet MUST preserve an occupied zombie unchanged, MUST NOT infer or reconstruct its owner from names, members, or other Discord state, and MUST reconsider it only on a later reconciliation.
- **FR-011**: Reconciliation MUST leave known managed rooms under the existing temporary-room lifecycle; it MUST NOT reset, shorten, extend, create, or otherwise interfere with their inactivity tracking.
- **FR-012**: Voicelet MUST tolerate a candidate channel being created, deleted, joined, or left during a scan. An individual inspection or deletion failure MUST not crash the worker or prevent safely independent eligible channels from being reconciled.
- **FR-013**: Reconciliation MUST be safe to repeat. Duplicate or overlapping runs MUST not corrupt transient state or create duplicate deletion behavior.
- **FR-014**: Reconciliation failures MUST be observable through bounded, privacy-safe operational signals and MUST NOT log Discord tokens, raw Discord event payloads, or unnecessary personal identifiers.
- **FR-015**: Voicelet MUST not persist room ownership, inactivity tracking, or reconciliation state for this feature. After a restart or transient-state loss, previously created rooms that lack current transient state MUST follow the zombie rules.
- **FR-016**: Documentation MUST state that the configured temporary-room category is reserved for Voicelet-managed voice channels; unrelated permanent channels belong elsewhere unless explicitly configured as permanent exclusions.
- **FR-017**: Documentation MUST describe the interval's unit, default, valid range, and safe example configuration; permanent exclusions; known-room versus zombie classification; restart behavior; preservation of occupied zombies; immediate removal of empty zombies; intentional non-reconstruction of ownership; and a local manual reconciliation smoke test.
- **FR-018**: Automated coverage MUST include deterministic unit, integration, and simulated end-to-end evidence for classification, interval validation, startup scanning, empty/occupied zombie transitions, permanent and out-of-category safety, repeatability, and independent known-room inactivity behavior without waiting for real intervals.

### Key Entities

- **Server room configuration**: A server-specific mapping that identifies the dedicated temporary-room category, room-creation trigger, inactivity timeout, reconciliation interval, and any permanent-channel exclusions.
- **Known managed room**: A category voice channel represented by Voicelet's current transient room state and therefore governed by the ordinary temporary-room inactivity lifecycle.
- **Permanent channel**: The room-creation trigger or an explicitly configured exclusion that must never be considered a zombie, even within the managed category.
- **Zombie room**: A non-permanent category voice channel absent from current transient room state; it is retained while occupied and immediately removed when observed empty.
- **Reconciliation scan**: A safe, repeatable review of one configured category that applies the classification and cleanup rules without persisting scan state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In deterministic startup and interval scenarios, 100% of empty zombie rooms in a configured category are removed by the applicable scan, while 100% of occupied zombies observed in those scenarios remain until a later scan observes them empty.
- **SC-002**: In automated classification scenarios, 100% of known managed rooms, configured permanent channels, trigger channels, categories, and channels outside the configured category are preserved by reconciliation.
- **SC-003**: In repeated and overlapping deterministic reconciliation scenarios, there are zero duplicate deletion effects and zero unintended changes to active room associations or known-room inactivity timing.
- **SC-004**: In deterministic failure scenarios, an inspection or deletion failure for one channel leaves the worker operational and allows all other safely independent eligible channels in the same scan to be processed.
- **SC-005**: Documentation enables an administrator to configure the default or a valid custom interval and complete the local reconciliation smoke test without using production Discord credentials.

## Assumptions

- The selected default 15-minute cadence balances timely cleanup with avoiding unnecessarily frequent category scans; administrators may choose any valid whole-minute value from 1 to 1,440.
- The existing per-server configuration is the authoritative place for all category-specific identifiers and permanent exclusions.
- A channel's occupancy at the deletion decision is authoritative; an uninspectable channel is preserved rather than deleted.
- The existing transient managed-room state remains authoritative only for the running process, and no historical association is reconstructed after restart.
- The existing simulated Discord environment can expose controllable reconciliation triggering or time so all required tests remain deterministic and CI-suitable.

## Out of Scope

- Reconstructing or persisting room ownership, inactivity timers, or reconciliation state across restarts.
- Inferring ownership from channel names, channel membership, or historical Discord activity.
- Guaranteeing one physical room per user after transient-state loss.
- Northflank deployment, production Discord onboarding, room locks or permissions, room limits, rename commands, ownership transfer, and slash or other room-management commands.
