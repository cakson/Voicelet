# Data Model: Temporary Room Owner Permissions

## Transient Managed-Room Association

| Field | Meaning | Validation / lifecycle rule |
|---|---|---|
| Server ID | Server containing the room. | Non-empty configured mapping key. |
| Owner member ID | Creator and sole room owner. | One owner per current room association. |
| Room ID | Voice room created for that owner. | One current room per owner; removed on confirmed deletion. |
| Destination category ID | Configured dedicated category for the server. | Immutable for the association; a moved room is restored to it. |
| Owner permission state | `applied` or `failed` after the initial member-overwrite attempt. | `missing` maps to `failed` while stale-deletion handling runs. Never report `applied` after failed/missing provider outcome; discarded with association. |
| Inactivity state | Existing empty-room lifecycle work. | Unchanged by owner settings or a permission setup failure. |

Associations and owner-permission state are in-memory only. Restart/transient loss removes them;
reconciliation must not infer a replacement owner or apply an overwrite to a zombie.

## Channel-Scoped Owner Allowance

| Property | Rule |
|---|---|
| Subject | Exactly the association's owner member. |
| Resource | Exactly the association's temporary voice room. |
| Allows | Discord `ManageChannels` and `ManageRoles` on that room only. |
| Does not allow | Administrator; any server role; Manage Guild; Kick/Ban Members; or authority on the trigger, category, other rooms, or unrelated channels. |
| Removal | Channel deletion removes the Discord overwrite; association cleanup discards transient status. |

## Parent-Restoration State Transition

```text
tracked room
  ├─ parent is configured category → normal lifecycle + category reconciliation boundary
  └─ parent changes elsewhere
       ├─ restore succeeds / already restored → association retained; owner overwrite reapplied
       ├─ room missing → existing external-deletion cleanup
       └─ restore fails / unavailable → association retained; bounded failure; reconciliation skips it
```

Duplicate parent-change events are coalesced per room. Confirmed external deletion wins over any
in-flight restoration: the matching association is cleared and no later restoration or overwrite
reapplication occurs. Restoration-induced overwrite reapplication is idempotent and is the only
automatic repeat application; no background retry is introduced for a failed initial attempt.

Reconciliation enumerates only rooms currently in the configured category. It never uses a moved
room to expand the candidate boundary, and it does not adopt or recreate an owner for any untracked
room.
