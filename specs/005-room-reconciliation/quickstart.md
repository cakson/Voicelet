# Room Reconciliation Validation Guide

## Purpose

Validate reconciliation end to end without production credentials or real-time waits. Refer to the [data model](./data-model.md) and [contract](./contracts/room-reconciliation-contract.md) for the exact classifications and outcomes.

## Prerequisites

```sh
pnpm install --frozen-lockfile
pnpm check
```

Use the repository's simulated Gateway and its controllable scheduler. Do not add a real Discord token.

## Automated Validation

Run the focused suites while developing, then the full gate:

```sh
pnpm test -- tests/unit/reconcile-temporary-rooms.test.ts
pnpm test -- tests/integration/configuration-startup.test.ts tests/integration/gateway-lifecycle.test.ts
pnpm test -- tests/e2e/worker-voice-state.test.ts
pnpm check
```

Expected evidence:

1. A server mapping without an interval resolves to 15 minutes; invalid non-integers and values outside 1–1,440 are rejected safely.
2. A pre-seeded category has a trigger/permanent channel, an empty zombie, an occupied zombie, and a tracked managed room before ready.
3. After ready, the empty zombie is removed; the permanent and occupied zombie remain; the managed room retains its existing inactivity timing.
4. After controlled occupancy removal and one later controlled reconciliation interval, the former occupied zombie is removed immediately.
5. Repeated scan requests produce no duplicate deletion attempts or managed-association changes; an individual simulated failure produces bounded evidence while other eligible zombies continue.

## Local Discord Manual Smoke Test

Use the development-only setup in [Local Discord development](../../docs/local-discord-development.md). Configure a dedicated temporary-room category and an interval suitable for observation (for example, 1 minute); do not place unrelated permanent channels inside it unless they are listed in `permanentChannelIds`.

1. Start Voicelet and wait for `/readyz`.
2. In the dedicated category, create an unconfigured empty test voice channel and another with a test member connected. Keep the trigger and any permanent channel configured as exclusions.
3. Restart Voicelet to demonstrate transient-state loss, then wait for startup reconciliation.
4. Verify the empty untracked channel is deleted immediately, while the occupied untracked channel, trigger, configured permanent channel, category, and channels outside the category remain.
5. Leave the occupied untracked channel empty and wait for the next reconciliation cadence; verify immediate deletion at that scan, not the inactivity timeout.
6. Create a normal Voicelet-managed room, leave it empty, and verify its configured inactivity timeout still governs its deletion independently.

If a check fails, preserve the category and inspect only bounded operational outcome metrics/logs. Do not copy Discord tokens, raw events, channel IDs, or member data into issue reports.

## Validation Record

**2026-08-31** — `pnpm check` passed. The credential-free simulated suites covered interval validation, category-scoped classification, startup cleanup of an empty zombie, preservation and later cleanup of an occupied zombie, permanent exclusion safety, known-room lifecycle isolation, repeatable scheduling, and bounded failure observations.
