# Local Discord development

This guide takes a new Voicelet contributor from a checkout to a real Discord smoke test. Use a
separate development application and a dedicated development/test server. Do not use an actively
used production server or production credentials.

## 1. Create the development application and bot

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and choose
   **New Application**. Give it a development-only name.
2. Open the application's **Bot** page and choose **Add Bot**. This bot identity is the account
   Voicelet will operate; do not automate a normal Discord user account or provide personal Discord
   credentials.
3. On the Bot page choose **Reset Token** / **Copy** to obtain the bot token. Treat it like a
   password: it is a secret, must not be pasted into GitHub, documentation, screenshots, logs,
   fixtures, generated artifacts, or chat, and must be stored only in the local `.env` file. If it
   may have been exposed, reset/regenerate it in the Portal immediately rather than reusing it.

## 2. Install the bot in a test server

In the application's **Installation** (or OAuth2 install) settings, configure **Guild Install** and
the `bot` scope. Authorize the generated install link for a dedicated test server with an account
that can manage that server. A user-context-only installation is not sufficient for Voicelet's
server voice-channel operations. Confirm that the bot appears in the test server's member list.

Grant the bot only these effective permissions on the relevant server/category/channels:

- **View Channel** so it can access the trigger, category, and created voice channels;
- **Manage Channels** so it can create a temporary voice channel under the category;
- **Move Members** so it can move the triggering member; and
- **Connect**, which Discord requires when moving a member into a voice channel.

Check role ordering and category/channel permission overrides. Do not grant **Administrator**; it is
not required. The member authorizing the guild installation needs the server-management authority
Discord requires for installing a server-scoped application.

## 3. Gateway capability

Voicelet currently requests the standard `GuildVoiceStates` Gateway capability to receive
voice-state joins and moves. It is not a privileged capability, so no **Privileged Gateway Intents**
toggle or approval is required in the Developer Portal. Leave member, presence, and message-content
privileged capabilities disabled; this flow does not use them.

## 4. Create the voice resources and collect identifiers

In the dedicated test server:

1. Create or select a category named something like `Voicelet Development Rooms` for temporary
   rooms.
2. Create or select one voice channel named something like `Create a room`; entering this channel
   is the trigger. Keep it outside the destination category if that makes the test easier to see.
3. In Discord **User Settings → Advanced**, enable **Developer Mode**. Right-click the test server,
   the destination category, and the trigger voice channel and choose **Copy ID**.

These three IDs are non-secret Discord identifiers, but use only IDs from this development server.
Set them in `.env` as the mapping below:

```dotenv
# Secret: development bot token only; never commit this value.
DISCORD_TOKEN=<paste-development-bot-token-here>

# Non-secret local settings.
GATEWAY_MODE=discord
HOST=127.0.0.1
PORT=3000
LOG_LEVEL=info

# Non-secret development IDs: server ID -> trigger and destination category.
# inactivityTimeoutMinutes is optional (default 60), must be a whole number from 1 through 1440.
# Use 1 for this local automatic deletion smoke test.
TEMPORARY_ROOM_CONFIG='{"<development-server-id>":{"triggerChannelId":"<room-creation-voice-channel-id>","destinationCategoryId":"<temporary-rooms-category-id>","inactivityTimeoutMinutes":1}}'
```

Start with the repository example, which contains every setting and safe placeholders:

```sh
cp .env.example .env
```

Replace only the placeholders in your untracked `.env`. `.env` is the local-secret boundary; do not
create a tracked variant or copy production values. `SOCKET_PATH` is optional for process tests and
is not needed for ordinary real Discord development.

## 5. Start Voicelet and verify the connection

Install dependencies and start the documented development workflow:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The worker initiates its outbound connection to Discord. No port forwarding, tunnel, public domain,
or publicly reachable callback endpoint is required. Keep the operational HTTP server on its default
loopback address; never expose it to the public internet for this Gateway-based flow.

From the same machine, inspect the local endpoints:

```sh
curl http://127.0.0.1:3000/livez
curl http://127.0.0.1:3000/readyz
curl http://127.0.0.1:3000/metrics
```

`/livez` succeeding means the local process is listening. `/readyz` succeeds only after the Discord
Gateway reports ready; it is the connection check. `/metrics` is optional bounded diagnostics. Also
confirm the development bot shows **online** in the dedicated test server.

## 6. Manual smoke test

1. Confirm `pnpm dev` starts without a configuration error, `/livez` responds, and `/readyz` reports
   ready.
2. Confirm the development bot is online in the configured test server.
3. With a non-bot test member, join the configured `Create a room` trigger channel.
4. Verify Voicelet creates exactly one temporary voice room inside the configured category.
5. Verify Voicelet moves the member into that newly created room.
6. Move the same member back to the trigger channel while the temporary room still exists.
7. Verify no second room is created and the member is returned to the existing room.
8. Leave the temporary room empty for its configured `inactivityTimeoutMinutes` (one minute with the
   safe local value above). Verify automatic deletion happens only after it stays continuously empty.
   Rejoin before the minute expires to confirm that deletion is cancelled; after leaving again, a full
   new minute is required.
9. Stop Voicelet with Ctrl-C (SIGINT). Confirm the process exits cleanly and the local endpoints stop
   responding. This test does not cover restart recovery.

## Troubleshooting

### Missing or invalid bot credentials

Ensure `GATEWAY_MODE=discord`, `DISCORD_TOKEN` is non-empty in the local `.env`, and the token was
copied from the development application's Bot page. Never print it while debugging. Reset/regenerate
the token in the Portal if it was exposed, then update only the local `.env`.

### Bot is not in the configured server

Repeat the **Guild Install** authorization, choose the exact dedicated test server, and confirm the
bot appears online in that server. A user-only installation does not grant the required server scope.

### Wrong server, category, or trigger channel

Enable Developer Mode and copy each ID again. The server ID must own both the category and trigger
channel, the trigger must be a voice channel, and `TEMPORARY_ROOM_CONFIG` must use the exact JSON
property names `triggerChannelId`, `destinationCategoryId`, and optional `inactivityTimeoutMinutes`.
The timeout is a whole number from 1 through 1440 and defaults to 60. Malformed configuration prevents
startup with a generic validation error and is not echoed by the worker.

### Missing Discord permissions

Verify effective **View Channel**, **Manage Channels**, **Move Members**, and **Connect** permissions
for the bot's role. Inspect category and channel overrides, and ensure the bot's role is high enough
for the move operation. Administrator is unnecessary.

### Worker connects but receives no voice-state events

Confirm the bot is in the mapped server, the user is a non-bot member, the event is a transition into
the exact configured trigger channel, and the bot has access to that channel. The current worker
uses standard `GuildVoiceStates`; no privileged Portal toggle is needed or should be substituted.

### Worker cannot create a temporary voice channel

Check **Manage Channels** and **View Channel** on the destination category, confirm the category ID
belongs to the configured server, and remove denying permission overrides.

### Worker creates a room but cannot move the triggering user

Check **Move Members**, **Connect**, and **View Channel** on the created/destination voice channel.
Confirm the triggering account is a non-bot member and that the bot role is not blocked by a channel
override.

### Readiness remains unsuccessful

`/livez` can succeed while `/readyz` remains unsuccessful: liveness only proves the local process is
running, while readiness requires an available outbound Discord connection. Check the token, network
access to Discord, Portal installation, and local logs for bounded failure outcomes. Do not add a
public endpoint, callback, tunnel, or port forwarding; restore the outbound connection and wait for
readiness again.
