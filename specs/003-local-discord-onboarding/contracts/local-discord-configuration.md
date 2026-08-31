# Local Discord Development Configuration Contract

## Purpose

This contract defines the tracked example and local runtime configuration needed to exercise the
current Voicelet temporary-room flow with a real Discord development bot. It is intentionally
limited to local development and does not define deployment or production secret handling.

## Environment Values

| Setting | Required for this workflow | Example form | Secret | Contract |
| --- | --- | --- | --- | --- |
| `DISCORD_TOKEN` | Yes | `<development-bot-token>` | Yes | Non-empty bot token, stored only in ignored `.env` |
| `GATEWAY_MODE` | Yes | `discord` | No | Selects real Discord mode |
| `TEMPORARY_ROOM_CONFIG` | Yes | JSON server mapping | No | Valid JSON object; each key is a server identifier with `triggerChannelId` and `destinationCategoryId` |
| `HOST` | Yes, unless `SOCKET_PATH` is deliberately used | `127.0.0.1` | No | Keep loopback for local development |
| `PORT` | Yes, unless `SOCKET_PATH` is deliberately used | `3000` | No | Positive local TCP port |
| `LOG_LEVEL` | No | `info` | No | Supported application log level |
| `SOCKET_PATH` | No | `/tmp/voicelet.sock` | No | Optional local alternative to host/port, primarily for process tests |

### Mapping Shape

```json
{
  "<development-server-id>": {
    "triggerChannelId": "<room-creation-voice-channel-id>",
    "destinationCategoryId": "<temporary-rooms-category-id>"
  }
}
```

Identifiers are non-secret but must be development-only in examples. A malformed mapping prevents
startup; documentation and logs must not echo the supplied value.

## Discord Authorization Contract

| Concern | Required contract |
| --- | --- |
| Identity | Dedicated Discord bot identity, not a personal user credential |
| Installation | Guild/server installation using the bot scope, into a dedicated test server |
| Permissions | Effective View Channel, Manage Channels, Move Members, and Connect permission for relevant voice resources; no Administrator requirement |
| Gateway | Standard `GuildVoiceStates` capability only; no Privileged Gateway Intents Portal toggle |
| Token handling | Never track, log, fixture, screenshot, or otherwise publish the token; regenerate it after suspected compromise |

## Local Operational Contract

| Request | Expected result |
| --- | --- |
| `GET /livez` | Successful response when the local worker process is listening |
| `GET /readyz` before a Discord connection | Unsuccessful response with a non-ready Gateway state |
| `GET /readyz` after connection | Successful response reporting ready Gateway state |
| `GET /metrics` | Optional local bounded operational metrics |

The worker opens its connection to Discord. These endpoints are local operational inspection only;
no public endpoint, callback URL, tunnel, port forwarding, or public domain is part of the contract.
