# Data Model: Local Discord Development Onboarding

## Development Discord Application

| Field | Description | Validation / sensitivity |
| --- | --- | --- |
| Application identity | Separate Discord application used only for local testing | Must not be a production application |
| Bot identity | Bot user created for the application | Used by Voicelet; never a normal user account |
| Bot token | Credential that authenticates the worker | Secret; only in ignored `.env`; regenerate after suspected exposure |
| Installation context | Where the bot is authorized | Must be a dedicated test server (guild), not user-only |
| Gateway capability | Event capability supplied to the bot | `GuildVoiceStates` only; standard, no Portal privileged toggle |

## Development Test Server

| Field | Description | Validation / sensitivity |
| --- | --- | --- |
| Server identifier | Discord identifier for the dedicated test server | Non-secret; key in the temporary-room mapping |
| Temporary-room category | Voice category that contains created rooms | Non-secret identifier; belongs to the mapped server |
| Trigger voice channel | Voice channel a non-bot user enters to request a room | Non-secret identifier; belongs to the mapped server |
| Effective bot permissions | Access granted at server/category/channel level | Must allow View Channel, Manage Channels, Move Members, and Connect where needed |

**Relationship**: Each local configuration mapping associates exactly one server identifier with one
trigger voice channel and one destination category. The server owns both Discord resources.

## Local Worker Configuration

| Setting | Value type | Sensitivity | Validation |
| --- | --- | --- | --- |
| `DISCORD_TOKEN` | Bot token | Secret | Required, non-empty in real Discord mode |
| `GATEWAY_MODE` | Mode selection | Non-secret | Must be `discord` for this workflow |
| `TEMPORARY_ROOM_CONFIG` | JSON object | Non-secret identifiers | Each server key has non-empty `triggerChannelId` and `destinationCategoryId` |
| `HOST` | Local bind address | Non-secret | Defaults to loopback address |
| `PORT` | Local TCP port | Non-secret | Positive integer; default 3000 |
| `LOG_LEVEL` | Log verbosity | Non-secret | Supported bounded level |
| `SOCKET_PATH` | Optional local socket path | Non-secret | Not needed for ordinary real-mode development |

## Local Health State

| State | Observable evidence | Meaning |
| --- | --- | --- |
| Live | `/livez` succeeds | Worker process and local operational server are running |
| Connecting / disconnected | `/readyz` responds unsuccessful | Worker has not completed, or has lost, its Discord connection |
| Ready | `/readyz` succeeds with ready gateway state; bot appears online | Worker has connected to Discord and can receive configured voice events |
| Stopped | Local process exits after interrupt | Worker has closed the Gateway and operational server cleanly |

## Temporary-Room Smoke-Test Lifecycle

1. A non-bot member enters the configured trigger voice channel.
2. The ready worker checks the mapping for that member's server.
3. Voicelet creates a temporary room under the configured category and moves the member into it.
4. A later qualifying trigger entry for the same member reuses the associated existing room.
5. Associations are transient and disappear on worker restart; recovery after restart is out of scope.
