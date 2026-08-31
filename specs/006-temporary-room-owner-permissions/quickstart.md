# Temporary Room Owner Permissions Validation Guide

## Purpose

Validate room-scoped native owner management without production credentials. Refer to the
[data model](./data-model.md) and [boundary contract](./contracts/temporary-room-owner-permissions-contract.md)
for the exact state and permission rules.

## Prerequisites

```sh
pnpm install --frozen-lockfile
pnpm check
```

Use the simulated Gateway for automated validation. For a real local Discord smoke test, use a
dedicated development server and development bot only. To enable the native owner access editor,
configure the Voicelet bot with effective Administrator permission; this protects its lifecycle
access after an owner changes channel overwrites. Never grant Administrator or a server-wide role to
room owners.

## Automated Validation

Run focused suites during development, then the full gate:

```sh
pnpm test -- tests/unit/manage-temporary-room.test.ts tests/unit/discord-client-factory.test.ts
pnpm test -- tests/integration/gateway-lifecycle.test.ts tests/integration/documentation.test.ts
pnpm test -- tests/e2e/worker-voice-state.test.ts
pnpm check
```

Expected evidence:

1. Creating a room associates it with its creator and applies exactly one member-specific owner
   allowance containing the two expected native channel permissions.
2. A second creator's room contains only that second creator's allowance. The first creator has no
   equivalent capability on the second room, trigger, category, permanent channel, or unrelated
   channel; no owner role or server-wide owner permission exists.
3. A simulated allowance failure records a bounded failure, leaves the created association and
   lifecycle operating, and produces no duplicate room when the creator retries the trigger.
4. An owner deletion clears only their association and permits a normal replacement room; other
   owner associations and allowances remain unchanged.
5. A simulated owner move outside the category triggers restoration, retains the association, and
   proves reconciliation never scans or deletes it outside the configured category. A restoration
   failure is bounded and leaves the association until deletion is independently confirmed.

## Local Discord Manual Smoke Test

Follow [Local Discord development](../../docs/local-discord-development.md) using two ordinary test
members, one development-only temporary-room category, and a Voicelet bot that satisfies the
documented bot Administrator prerequisite.

1. Start Voicelet and wait for `/readyz`; verify the bot has the documented bot-only effective
   Administrator prerequisite before testing native access editing.
2. Have test member A join the creation trigger. Verify their created room has a member-specific
   native management override and that they can change its name, region, or user limit.
3. Have test member B create another room. Verify A cannot manage B's room, the trigger, the
   category, or another unrelated channel; repeat this check in the opposite direction.
4. Use Discord's native permission editor in A's room to change a safe access setting. Verify the
   bot can still perform the normal room lifecycle operation, then restore the test setting.
5. Move A's room out of the configured category through the native interface. Verify Voicelet
   returns it to the configured category and retains A's room association.
6. Delete A's room through Discord. Verify A can create a replacement and B's room remains intact.

If a check fails, inspect only bounded outcome metrics/logs. Do not include Discord tokens, raw
events, channel IDs, or member data in diagnostics.
