# Quickstart: Temporary Voice Room Creation

## Prerequisites

- Use the repository's documented Node.js and pnpm versions.
- Install dependencies with `pnpm install --frozen-lockfile`.
- Identify a Discord voice channel for the trigger and a category for created rooms in every server Voicelet will manage.
- For live Discord validation, grant the bot `Manage Channels`, `Move Members`, and access to the destination category and created voice channels. See the [temporary-room contract](./contracts/temporary-room-port.md).

## Configure

Copy the environment example and set the configured channel identifiers:

```sh
cp .env.example .env
```

Set `TEMPORARY_ROOM_CONFIG` to a JSON object keyed by Discord server ID. Each value must supply `triggerChannelId` and `destinationCategoryId`. For example:

```json
{
  "server-id": {
    "triggerChannelId": "trigger-channel-id",
    "destinationCategoryId": "destination-category-id"
  }
}
```

Servers omitted from this mapping are intentionally ignored. For a credential-free local readiness run, also set `GATEWAY_MODE=simulated`. Do not commit `.env` or a Discord token.

## Validate the Automated Feature Journey

Run the focused suites while developing, then the complete gate:

```sh
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm check
```

Expected evidence:

1. An eligible simulated non-bot transition into the trigger produces a room in the configured category and moves the member there.
2. A subsequent entry for that member reuses its associated room; a missing associated room is replaced.
3. Duplicate or concurrent events for one member create no more than one room; concurrent distinct members proceed independently.
4. Simulated create and move failures produce only safe outcome evidence, and a later valid event is still accepted while readiness remains healthy.
5. Events for bots or unrelated voice channels create no rooms.
6. An event from an unconfigured server creates no room and emits no per-member details.

The detailed transient state and transition rules are in [data-model.md](./data-model.md). The internal gateway behavior is defined in [temporary-room-port.md](./contracts/temporary-room-port.md).

## Verification record

The simulated quickstart journey was verified on 2026-08-31 with no discrepancies. The process-level suite requires permission to bind its temporary local Unix socket in restricted environments.
