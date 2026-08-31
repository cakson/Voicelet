# Implementation Plan: Temporary Room Owner Permissions

**Branch**: `006-temporary-room-owner-permissions` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-temporary-room-owner-permissions/spec.md`

## Summary

Give each newly created temporary voice room a member-specific Discord permission overwrite for its
creator. The overwrite grants only the native, room-scoped management permissions necessary for
ordinary channel settings and channel permission editing; it never grants a role or any server-wide
owner capability. The temporary-room manager retains its in-memory association if owner setup fails,
and the Discord boundary reports a bounded outcome rather than throwing. A channel-parent change for
a tracked room triggers restoration to the configured category while retaining the association;
reconciliation remains exclusively category-scoped.

Because Discord's native channel permission editor requires `ManageRoles`, an owner could otherwise
deny Voicelet's channel access. The deployment contract therefore requires Voicelet's **bot** role,
not any room owner, to have Administrator effective permission. That is the only reliable Discord
mechanism that keeps lifecycle access effective after owner-managed overwrite changes. The owner
override remains channel-scoped and includes neither Administrator nor any server-wide permission.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node.js 24

**Primary Dependencies**: discord.js 14.22, Fastify 5, Pino 9, prom-client 15, Zod 4

**Storage**: No persistent storage. Creator/room associations and owner-permission application state
exist only in process memory and are discarded on restart.

**Testing**: Vitest 3 unit, integration, and child-process E2E tests; deterministic simulated Discord
client and manually controlled scheduler.

**Target Platform**: Node.js background worker connected to Discord Gateway; local operational HTTP
endpoints.

**Project Type**: Background worker with Discord adapter and simulated integration boundary.

**Performance Goals**: Owner setup and category restoration add one bounded provider operation per
relevant room event; failures must not block independent member events or reconciliation candidates.

**Constraints**: Owner authority is a member overwrite on one voice channel only; never grant owner
Administrator, a server role, Manage Guild, Kick Members, Ban Members, or unrelated privileged
permissions. The bot requires Administrator effective permission only to preserve lifecycle access
after native owner permission edits. Logs and metrics contain outcome labels only, never Discord IDs,
names, raw payloads, or tokens.

**Scale/Scope**: One active owner per current in-memory temporary-room association; no persistence,
ownership transfer, multiple owners, or ownership reconstruction after restart.

## Constitution Check

| Gate | Status | Evidence / plan response |
|---|---|---|
| Testability | Pass | Unit policy/state tests, adapter tests, gateway integration, and deterministic simulated E2E are planned before behavior completion. |
| Enforced quality gates | Pass | Final task phase will run `pnpm check`; all feature test layers are required. |
| Explicit architecture | Pass | Domain remains dependency-free; application owns association and restoration policy; ports describe provider operations; Discord and simulator implement them. |
| Documentation as deliverable | Pass | README, local Discord guide, architecture, and testing documentation cover scope, bot prerequisite, and smoke tests. |
| Explicit API contracts | Pass | A typed Discord-boundary contract defines overwrite, parent-change, and restoration outcomes. |
| Security by default | Conditional pass | Owner grants remain least-privilege and room scoped. Native access editing cannot safely preserve the bot's access without a bot Administrator prerequisite; this documented Discord limitation is explicit and never applies to owners. |
| Actionable observability | Pass | New bounded owner-permission and category-restoration outcome metrics/logs contain no identifiers or provider details. |
| Reproducible repository / Definition of done | Pass | Simulated tests avoid credentials and wall-clock waits; documentation and `pnpm check` are required. |

**Post-design re-check**: Pass. The documented exception has an approved named owner, risk,
remediation plan, and expiration date; T001 records that approval.

## Project Structure

### Documentation (this feature)

```text
specs/006-temporary-room-owner-permissions/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── temporary-room-owner-permissions-contract.md
└── tasks.md                 # Created later by $speckit-tasks
```

### Source Code (repository root)

```text
src/
├── application/
│   └── manage-temporary-room.ts
├── infrastructure/
│   ├── discord/
│   │   ├── discord-client-factory.ts
│   │   ├── discord-gateway-event-source.ts
│   │   └── simulated-client-factory.ts
│   └── logging/observability.ts
└── ports/index.ts

tests/
├── e2e/worker-voice-state.test.ts
├── integration/
│   ├── documentation.test.ts
│   └── gateway-lifecycle.test.ts
├── unit/
│   ├── discord-client-factory.test.ts
│   ├── manage-temporary-room.test.ts
│   └── reconcile-temporary-rooms.test.ts
└── support/gateway-simulator/index.ts

docs/
├── architecture.md
├── local-discord-development.md
└── testing.md
```

**Structure Decision**: Extend the existing single-worker layering. The application manager owns
transient association, owner-configuration state, and category-restoration policy. The port carries
bounded Discord actions/events; production and simulated adapters implement it. The gateway source
wires provider events to the application policy. Reconciliation remains a separate, category-only
application policy.

## Implementation Approach

1. Add typed, bounded Discord port operations for applying an owner member overwrite, restoring a
   voice room's parent category, and receiving a voice-channel parent-change notification. Add
   privacy-safe owner-permission and restoration observations.
2. Extend the temporary-room manager's association record with `ownerPermissionState`. After room
   creation and association creation, attempt the overwrite exactly once before the normal member
   move. On `failed` or `missing`, record `failed`, retain the association and lifecycle behavior,
   record a failure, and never create another room for that creation attempt. Clear the state with
   its association on deletion. No background or failure-triggered retry is introduced in this
   feature.
3. In the Discord adapter, create a member overwrite on only the created voice channel allowing
   `ManageChannels` and `ManageRoles`; never create or edit an owner role. Translate provider errors
   to `failed`, validate guild/channel type, and subscribe to voice-channel update events. On a
   tracked room parent change away from its configured category, coalesce duplicate events and
   restore the parent; reapply the required owner overwrite idempotently after restoration in case
   category synchronization replaced it. Confirmed deletion wins over restoration and prevents any
   subsequent restore or reapplication for that association.
4. Preserve Voicelet's lifecycle authority by documenting and validating the bot Administrator
   prerequisite. Owner-native permission editing is unsupported unless that prerequisite is met;
   no room owner receives Administrator or broader server privileges.
5. Extend the simulator with room-level member-overwrite state, native capability assertions,
   controllable permission and restoration failures, category moves, and parent-change callbacks.
   Extend test-only IPC only with bounded controls/assertions needed for simulated E2E evidence.
6. Cover creation, two-owner isolation, policy exclusion, failure containment, external deletion and
   replacement, restoration, reconciliation boundary preservation, and privacy-safe observations.
   Update administrator and local smoke-test documentation, then run `pnpm check`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Bot Administrator deployment prerequisite | Discord permits an owner with native channel permission-editing authority to alter channel overwrites. Administrator is required for Voicelet to retain lifecycle access regardless of such owner changes. | Granting only `ManageChannels` to the owner would remove native access-management capability; relying on bot role ordering or a normal bot overwrite does not reliably prevent overwrite denial. |

### Required Exception Approval

**Status**: Approved by the Voicelet project maintainer on 2026-08-31. This approval is limited to
the bot-only deployment prerequisite described below; it does not authorize Administrator or any
server-wide privilege for room owners.

| Field | Record |
|---|---|
| Owner | @cakson |
| Approval evidence | @cakson's instruction in the feature planning session on 2026-08-31. |
| Risk acceptance | Voicelet's bot receives effective Administrator permission, increasing its server-wide blast radius, so owners can safely use native channel permission editing without disabling required lifecycle access. |
| Remediation | Reassess and replace this prerequisite if Discord supplies a narrower channel-scoped mechanism that protects the bot's lifecycle authority from owner overwrite edits. |
| Expiry | 2026-12-31; reassess before any production Discord onboarding, which remains out of scope for this feature. |
