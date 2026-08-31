# Research: Temporary Room Owner Permissions

## Decision: Use a member-specific overwrite on the created voice room

Create an overwrite for the creator's member ID on only the newly created room. Discord evaluates a
member-specific channel overwrite after role overwrites, so it provides an isolated allowance for
one owner without creating or modifying a server role.

**Rationale**: It directly enforces one room/one owner, leaves trigger/category/unrelated channels
unchanged, and is removed naturally with the channel.

**Alternatives considered**:

- A server-wide owner role — rejected because it grants authority outside the temporary room.
- A category overwrite — rejected because it affects all rooms in the category and the category
  itself.
- Reconstructing owner permissions during reconciliation — rejected because transient state is the
  authority and zombie rooms must remain unowned.

## Decision: Grant `ManageChannels` and `ManageRoles` only on the owner room

`ManageChannels` enables ordinary native voice-channel settings, including name, region, user
limit, parent, and deletion. Discord requires `ManageRoles` for native channel permission editing,
which provides the requested room-access management. Neither permission is granted outside the
owner's voice-room overwrite.

**Rationale**: Discord offers no narrower native setting permission for only name, region, or user
limit, and no narrower native permission-editor authority. This is the least channel-scoped set
that fulfills both settings and access-management requirements.

**Alternatives considered**:

- `ManageChannels` alone — rejected because the owner could not manage channel access natively.
- Administrator for the owner — rejected because it is server-wide and expressly out of scope.
- Custom Voicelet commands — rejected as explicitly out of scope.

## Decision: Require effective Administrator for the Voicelet bot role

An owner granted channel `ManageRoles` can change that channel's permission overwrites. Discord
role ordering does not reliably protect a bot's ordinary channel overwrite from that action.
Voicelet's bot must therefore have effective Administrator permission, configured by a server
administrator, so it retains lifecycle, reconciliation, deletion, and restoration access regardless
of owner edits. This prerequisite applies only to Voicelet's bot and never to a room owner.

**Rationale**: It is the reliable native Discord mechanism that satisfies the specification's
requirement that owner permission changes cannot disable Voicelet's required operations.

**Alternatives considered**:

- Rely on bot role placement and ordinary channel overwrites — rejected as insufficient protection
  against channel overwrite edits.
- Omit `ManageRoles` from the owner — rejected because it removes the requested native access
  management experience.
- Detect and repair a removed bot overwrite — rejected because the bot may already have lost the
  permission needed to repair it.

## Decision: Restore moved tracked rooms and keep associations

Subscribe to voice-channel parent updates. If a currently tracked room is moved outside its
configured category, restore it to that category and keep its owner association. While it is outside
the category, reconciliation does not inspect, classify, adopt, or delete it. A missing room follows
existing external-deletion handling; a failed restoration is observable and retains the association.

**Rationale**: This implements the clarified dedicated-category boundary without treating an
out-of-category room as a zombie or expanding reconciliation scope.

**Alternatives considered**:

- Allowing the move to remain and continuing management outside the category — rejected because it
  broadens Voicelet's management boundary.
- Clearing the association on a move — rejected because a user could obtain duplicate rooms and the
  moved room would lose lifecycle management.

## Decision: Contain permission setup failures without duplicate creation

Record owner-permission application state in the transient association after the room is created.
If the provider returns `failed` or `missing`, keep the association and ordinary lifecycle state,
emit a bounded failure observation, and do not automatically retry in this feature. A subsequent
trigger reuses the associated room rather than creating another.

**Rationale**: A created room must remain lifecycle-managed even if its owner allowance could not be
applied, and the one-active-room rule must remain authoritative.

**Alternatives considered**:

- Delete and recreate the room — rejected because it produces needless churn and can duplicate
  rooms under retries.
- Mark every attempt successful — rejected because it conceals a security-relevant configuration
  failure.
- Add automatic retry now — rejected because no existing permission-retry scheduler exists; a
  future retry must be explicitly idempotent.

## Sources

- [Discord Permissions](https://docs.discord.com/developers/topics/permissions) — channel overwrite
  evaluation and permission semantics.
- [Discord Channel Resource](https://docs.discord.com/developers/resources/channel) — native channel
  modification permissions, including voice-channel fields and parent changes.
- [Discord permission setup FAQ](https://support.discord.com/hc/en-us/articles/206029707-Setting-Up-Permissions-FAQ)
  — role and channel permission behavior.
