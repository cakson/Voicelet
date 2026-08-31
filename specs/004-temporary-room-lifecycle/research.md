# Research: Temporary Room Lifecycle

## Decision: Use an injected cancellable scheduler

**Rationale**: Inactivity and retry behavior must be deterministic in unit, integration, and child-process E2E tests. A scheduler port lets a manual scheduler advance immediately in CI while composition provides production timers. Cancellation and a per-room generation make stale callbacks harmless after a rejoin.

**Alternatives considered**: Direct `setTimeout` calls are rejected because E2E would require real elapsed minutes. Test-framework fake timers alone cannot control a forked worker.

## Decision: Model room state and deletion results explicitly

**Rationale**: A boolean existence check cannot distinguish a missing room from a Discord fetch failure. The port returns `empty`, `occupied`, `missing`, or `unavailable`; deletion returns `deleted`, `missing`, or `failed`. A move failure remains unrelated to existence.

**Alternatives considered**: Treating fetch failures as absence can discard valid associations and create duplicates. Inferring occupancy from event order fails under delayed events and races.

## Decision: Keep lifecycle and association state in application

**Rationale**: The existing manager already owns transient associations and locks. A reverse room index, lifecycle records, and per-room serialization preserve provider independence and architecture direction.

**Alternatives considered**: Adapter-owned timers/ownership would mix policy with Discord. Persistent state is explicitly out of scope.

## Decision: Retry deletion every 15 minutes while empty

**Rationale**: This clarified policy avoids busy looping. Each retry rechecks state and preserves associations until confirmed deletion or absence.

## Decision: Use provider deletion notification plus creation-path fallback

**Rationale**: A channel-deletion notification promptly clears known state; a state check when the creator triggers room creation recovers from missed/delayed notification. Failed movement is not missing-room evidence.

## Decision: Extend the simulated client and IPC controls

**Rationale**: Existing simulation lacks occupancy, deletion, external-deletion notifications, and controllable time. Extending it behind ports proves the lifecycle without credentials or real-time waits.
