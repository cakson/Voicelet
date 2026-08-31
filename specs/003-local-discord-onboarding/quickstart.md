# Quickstart: Real Discord Local Development

This guide is the validation path that the implementation will make available through the repository
documentation. Follow the final local-development guide for the authoritative Portal screenshots or
links; do not place a real token in this document, source control, terminal history, or screenshots.

## Prerequisites

- A Voicelet checkout with the documented Node and pnpm versions.
- A Discord account permitted to manage a dedicated test server.
- A second non-bot test member (another account or a collaborator) to exercise the trigger flow.
- No production bot, production server, user token, tunnel, public domain, or port forwarding.

## Setup validation

1. Install dependencies with `pnpm install --frozen-lockfile`.
2. In the Discord Developer Portal, create a separate development application and add its bot.
   Copy the bot token only into a local ignored `.env` created from `.env.example`.
3. Configure a Guild Install for the `bot` scope and install the bot in a dedicated test server.
   Grant only View Channel, Manage Channels, Move Members, and Connect for the relevant voice
   resources; check category/channel overrides too.
4. Leave privileged Gateway toggles off. The existing voice-state capability is standard and does
   not need Developer Portal activation.
5. Enable Discord developer mode, copy the development server ID, create/select a temporary-room
   category and trigger voice channel, then copy their IDs.
6. In `.env`, set real mode and fill the mapping in the shape defined by
   [the configuration contract](./contracts/local-discord-configuration.md). The token is secret;
   the three Discord IDs are non-secret but must be development-only.

## Start and connection validation

1. Run `pnpm dev` and leave it running locally.
2. From the same machine, check `curl http://127.0.0.1:3000/livez`. A successful response proves
   the local worker is listening, not that Discord is connected.
3. Check `curl http://127.0.0.1:3000/readyz` until it reports ready. Confirm the bot is online in
   the dedicated test server. If it remains unsuccessful, do not expose the endpoint publicly;
   use the troubleshooting guidance for credentials and Discord availability.
4. Optionally inspect `curl http://127.0.0.1:3000/metrics` for bounded Gateway and temporary-room
   outcomes. Do not add tokens or Discord identifiers to log searches or diagnostic captures.

## Manual smoke test

1. Confirm the worker is live and ready and the development bot is online.
2. With a non-bot test user, join the configured trigger voice channel.
3. Verify exactly one temporary voice room appears under the configured category and the user is
   moved into it.
4. While that room still exists, have the same user join the trigger channel again.
5. Verify no additional room is created and the user returns to their existing room.
6. Stop Voicelet with an interrupt. Confirm the process exits cleanly and local health endpoints no
   longer respond. Temporary-room recovery or cleanup after restart is not part of this test.

## Expected failure checks

| Symptom | First check |
| --- | --- |
| Worker does not reach ready | Token, outbound Discord availability, and real-mode selection |
| Bot absent from server | Guild installation and selected test server |
| No room after joining trigger | Server/category/channel IDs, trigger resource type, and standard voice-state capability |
| Room creation fails | Manage Channels plus category access/overrides |
| User is not moved | Move Members and Connect plus target-channel access/overrides |

Run `pnpm check` after changing the onboarding artifacts. A real Discord smoke test remains a
manual developer validation because CI never receives real Discord credentials.
