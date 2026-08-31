# Feature Specification: Local Discord Development Onboarding

**Feature Branch**: `003-local-discord-onboarding`

**Created**: 2026-08-31

**Status**: Draft

**Input**: User description: "Create the Local Discord Development Onboarding feature."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete a Real Discord Smoke Test (Priority: P1)

A developer who has checked out Voicelet can set up an isolated Discord development application and
test server, configure the worker locally, and verify the existing temporary-room journey with a
real non-bot Discord user.

**Why this priority**: This is the core outcome: developers need a reliable route from checkout to
real Discord validation without depending on production credentials or infrastructure.

**Independent Test**: A developer unfamiliar with Voicelet follows only the documented onboarding
path, starts the worker locally, and completes the full temporary-room smoke test in a dedicated
test server.

**Acceptance Scenarios**:

1. **Given** a repository checkout and a Discord account allowed to manage a dedicated test server,
   **When** the developer follows the setup instructions, **Then** they create a separate
   development application and bot, install it in the test server, and preserve its token only in
   the supported untracked local-secret file.
2. **Given** the development bot and local configuration, **When** the developer starts Voicelet in
   real Discord mode, **Then** the worker connects, becomes ready, and the bot is shown online in
   the configured test server without publishing any local service endpoint.
3. **Given** a ready worker and a non-bot user, **When** the user enters the configured room-creation
   channel, **Then** one temporary voice room is created in the configured category and the user is
   moved into it.
4. **Given** the same user's temporary room still exists, **When** that user enters the room-creation
   channel again, **Then** the user is returned to the existing room and no second room is created.
5. **Given** the smoke test is complete, **When** the developer stops Voicelet, **Then** the worker
   shuts down cleanly and the instructions explain how to confirm that outcome.

---

### User Story 2 - Configure Discord Safely and Correctly (Priority: P2)

A developer can distinguish secret values from ordinary Discord identifiers, collect the required
server, category, and channel identifiers, and map every value to the local configuration without
copying production data or accidentally committing credentials.

**Why this priority**: Secure, correct setup prevents token exposure and the most common causes of
an apparently connected worker that does not create rooms.

**Independent Test**: A developer can use the safe example and identifier-collection instructions to
prepare a valid local configuration, while a repository status check confirms no real token is in a
tracked file.

**Acceptance Scenarios**:

1. **Given** a newly created development bot, **When** the developer obtains its token, **Then** the
   documentation identifies it as a secret, directs storage to the supported local-secret mechanism,
   and says to regenerate a compromised token rather than reuse it.
2. **Given** a dedicated test server with a selected category and trigger channel, **When** the
   developer enables Discord developer mode and copies identifiers, **Then** the documentation maps
   the server, category, and channel identifiers to their Voicelet configuration values and labels
   them non-secret.
3. **Given** the repository's safe example configuration, **When** a developer uses it as the basis
   for real Discord development, **Then** it contains every required real-mode setting, contains no
   credential or production identifier, and explains each setting's sensitivity.

---

### User Story 3 - Diagnose Local Connection and Room Failures (Priority: P3)

A developer whose smoke test does not progress can use documented local health checks and targeted
troubleshooting to identify configuration, installation, capability, permission, or connection
problems without exposing operational HTTP endpoints publicly.

**Why this priority**: Clear recovery guidance turns local Discord testing into a repeatable workflow
rather than a one-time setup exercise.

**Independent Test**: A developer can deliberately use an invalid local credential or unavailable
Discord connection and follow the guidance to identify the failed prerequisite from local output and
health status.

**Acceptance Scenarios**:

1. **Given** a local worker start, **When** the developer checks the documented liveness and readiness
   addresses from the same machine, **Then** they can distinguish a running process from one that has
   completed its Discord connection.
2. **Given** a connected worker that does not create or move a room, **When** the developer follows
   troubleshooting, **Then** they can verify the configured server, category, trigger channel,
   installation context, event capability, and minimum permissions.
3. **Given** Discord is unavailable, **When** readiness remains unsuccessful, **Then** the developer
   is told why that is expected and how to restore the connection without requiring a public domain,
   callback endpoint, port forwarding, or tunnel.

### Edge Cases

- A token is missing, invalid, exposed in an unsafe location, or suspected compromised; instructions
  must prevent sharing it and direct the developer to regenerate it through Discord.
- The bot is online but absent from the configured server, has channel-level permission overrides,
  or was installed only for a user rather than the server.
- The server, category, or trigger-channel identifier is malformed, belongs to a different server,
  or points to the wrong Discord resource type.
- Voice-state events are not received because the required standard capability was omitted, while
  unnecessary privileged capabilities were enabled or expected.
- The worker can connect but cannot create a room, or can create it but cannot move the triggering
  member because of missing permissions or channel access.
- The developer stops the local process before readiness; the smoke-test guidance must treat this as
  incomplete rather than successful.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Documentation MUST provide a start-to-finish local-development path from repository
  checkout through a successful real Discord temporary-room smoke test for a developer with no
  Voicelet-specific setup.
- **FR-002**: Documentation MUST explain how to create a separate Discord development application,
  create and configure its bot identity, and obtain its bot token from the Discord Developer Portal.
- **FR-003**: Documentation MUST state that Voicelet uses a bot identity only and MUST NOT instruct
  use of personal Discord credentials or automation of a normal user account.
- **FR-004**: Documentation MUST recommend a dedicated development/test server and MUST NOT present
  an actively used production server as the local-testing target.
- **FR-005**: Documentation MUST identify the required installation as a server (guild) installation
  of the bot and explain that a user-context-only installation does not meet this feature's needs.
- **FR-006**: Documentation MUST identify the least set of bot permissions needed for the current
  temporary-room flow, including channel visibility/access, channel management, and member movement,
  and explain that applicable category and channel overrides must allow them.
- **FR-007**: Documentation MUST identify the voice-state Gateway capability required by the current
  behavior, state whether it needs a Developer Portal toggle, and state that unneeded privileged
  capabilities are not required.
- **FR-008**: Documentation MUST explain how to create or select one voice-channel category for
  temporary rooms and one voice channel that triggers room creation.
- **FR-009**: Documentation MUST explain how to obtain the required server, category, and trigger
  channel identifiers and map them, along with the bot token and real-mode selection, to the
  corresponding Voicelet configuration settings.
- **FR-010**: The repository MUST provide a safe example local configuration containing all values
  required to run the current real Discord flow, with placeholders only for the token and Discord
  identifiers and clear secret versus non-secret labels.
- **FR-011**: Documentation MUST direct developers to keep local credentials in the repository's
  supported untracked local-secret configuration and MUST state that tokens must not appear in
  committed files, examples, logs, fixtures, screenshots, generated artifacts, or support messages.
- **FR-012**: Documentation MUST explain that development and production credentials can be configured
  independently and that real development does not require production credentials.
- **FR-013**: Documentation MUST explain the documented local real-mode start workflow, how to verify
  successful Discord connection and bot presence, and how to inspect liveness and readiness locally.
- **FR-014**: Documentation MUST state that the worker initiates its Discord connection and therefore
  requires neither port forwarding, tunneling, a public domain, nor a publicly reachable callback
  endpoint for the current Gateway-based behavior; its operational HTTP endpoints MUST remain local
  during this workflow.
- **FR-015**: Documentation MUST provide a numbered manual smoke test covering successful startup,
  ready state, bot online status, a non-bot user's trigger-channel entry, room creation in the
  configured category, user movement, existing-room reuse without duplication, and clean shutdown.
- **FR-016**: Documentation MUST include targeted troubleshooting for invalid credentials; missing
  server installation; incorrect server/category/trigger configuration; missing permissions; absent
  voice-state events; channel-creation failure; member-movement failure; and readiness failure when
  Discord is unavailable.
- **FR-017**: The feature MUST remain bounded to local real-Discord onboarding and documentation; it
  MUST NOT add deployment guidance, production server onboarding, production secret management,
  public HTTP exposure, webhook interactions, slash commands, room deletion, inactivity timers,
  restart recovery, or additional room-management behavior.

### Key Entities

- **Development Discord application**: An isolated Discord application used only for local Voicelet
  testing, with one bot identity and a separately managed token.
- **Development bot token**: The secret credential that authenticates the local worker as the
  development bot; it is never a source-controlled configuration value.
- **Development test server**: The dedicated Discord server containing the bot, the temporary-room
  category, and the room-creation trigger channel.
- **Temporary-room mapping**: The non-secret local association of one server identifier with its
  destination category identifier and trigger-channel identifier.
- **Local health state**: The locally inspectable distinction between a running worker and a worker
  that has successfully connected to Discord.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer with a repository checkout and Discord server-management access can
  complete the documented real Discord setup and reach a ready local worker within 30 minutes,
  excluding Discord account creation delays.
- **SC-002**: The manual smoke test demonstrates all eight required lifecycle and temporary-room
  outcomes in one dedicated test server without exposing a local endpoint to the public internet.
- **SC-003**: The safe example contains 100% of required real-development configuration values and
  0 real tokens or production Discord identifiers.
- **SC-004**: A developer can use the troubleshooting guide to classify each of the eight required
  failure categories as a credential, installation, configuration, permission, event-capability,
  room-creation, member-movement, or Discord-availability issue.
- **SC-005**: All documentation paths explicitly preserve the boundary between secret credentials
  and non-secret Discord identifiers, with no documented path that requires production credentials
  or a personal Discord user token.

## Assumptions

- The existing application behavior and configuration contract remain unchanged: one bot token,
  real Discord mode, and a mapping of each configured server to its trigger channel and destination
  category.
- The repository's supported local-secret mechanism is the ignored `.env` file created from the safe
  `.env.example`; the onboarding documentation will verify this status rather than introduce another
  secret store.
- The current worker needs standard guild voice-state events only. It does not need privileged
  member, presence, or message-content access, and the voice-state capability requires no Developer
  Portal privileged-intent toggle.
- The bot needs only the permissions necessary to view/access the configured voice resources, create
  temporary channels, and move members; it does not need administrator access or permission to join
  voice itself.
- A developer performing the smoke test can use a separate non-bot Discord account or another
  non-bot member in the test server to trigger the flow.
- Discord Developer Portal labels may evolve; the documentation will describe the intended result
  and reference the current Portal areas without depending on production infrastructure.
