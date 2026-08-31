# Temporary Room Owner Permissions Contract

## Discord Boundary Contract

| Operation | Input | Result | Safety rule |
|---|---|---|---|
| Apply owner allowance | Server ID, voice room ID, owner member ID | `applied`, `missing`, or `failed` | Applies only the owner member's `ManageChannels` and `ManageRoles` overwrite to that voice room. It never creates/changes a server role or grants owner Administrator. |
| Restore room category | Server ID, voice room ID, destination category ID | `restored`, `already_in_category`, `missing`, or `failed` | Operates only on the known tracked voice room. It never moves a category, trigger, other room, or unrelated channel. |
| Notify room parent change | Listener receives server ID, voice room ID, current parent ID or absent parent | No return value | Production adapter emits only voice-channel parent changes; application decides whether the room is tracked and must be restored. |

All provider exceptions are translated into the listed bounded results. The port must not expose raw
provider failures to observability.

## Creation and Failure Contract

1. Create the room through the existing category-scoped operation.
2. Create the normal transient owner/room association before applying the owner allowance.
3. Apply the owner allowance once. On `applied`, record owner configuration as applied. On `missing`
   or `failed`, record the owner-configuration state as failed, retain the association/lifecycle
   state, record a bounded failure, and do not report successful configuration. A `missing` result
   also defers to normal stale-deletion handling to determine whether the room was deleted.
4. Continue the existing move-member and lifecycle flow. Repeated creator requests reuse the
   associated room; they do not create a replacement solely because owner setup failed.
5. A confirmed external deletion clears the matching association and any owner-permission state.

## Restoration and Reconciliation Contract

1. On a parent-change event for a known tracked room whose parent differs from its configured
   category, request restoration.
2. Coalesce duplicate parent-change notifications for one tracked room so only one restoration is
   active at a time. On `restored` or `already_in_category`, retain the association and reapply the
   owner allowance idempotently; category synchronization may have replaced room overwrites. This
   restoration-induced reapplication is the only automatic repeat application in this feature.
3. On `missing`, defer to the existing external-deletion handling. On `failed`, retain the
   association and record a bounded restoration failure.
4. Reconciliation continues to enumerate only the configured category. It does not scan, delete,
   adopt, or reconstruct an owner for the moved room while restoration is pending.
5. Confirmed external deletion wins over a pending restoration: clear only the matching association
   and do not subsequently restore or reapply an owner allowance for that deleted room.

## Permission and Deployment Contract

- Room owners receive only member-specific channel overwrites; no owner role is created or changed.
- The owner overwrite may enable native rename, region/user-limit changes, deletion, parent moves,
  and channel permission editing where Discord permits them.
- Voicelet's bot must have effective Administrator permission before native owner access editing is
  enabled. This is a bot deployment prerequisite, not an owner grant, and prevents owner overwrite
  changes from disabling Voicelet's lifecycle authority.
- Observations use only bounded outcomes such as `owner_permission_applied`,
  `owner_permission_failed`, `room_category_restored`, and `room_category_restore_failed`.
  They never include Discord IDs, names, raw events, provider error text, or tokens.
