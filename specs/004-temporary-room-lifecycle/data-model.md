# Data Model: Temporary Room Lifecycle

## Configuration Mapping

| Field | Rules | Meaning |
|---|---|---|
| `triggerChannelId` | Non-empty string | Voice channel that starts room creation. |
| `destinationCategoryId` | Non-empty string | Category where managed rooms are created. |
| `inactivityTimeoutMinutes` | Optional integer, 1–1,440; default 60 | Per-mapping continuous-empty duration before deletion eligibility. |

## Active-room Association

| Field | Rules | Meaning |
|---|---|---|
| Creator key | Unique server/member pair | Enforces at most one active room for a creator. |
| Room identifier | Unique managed voice room | Target for occupancy/deletion operations. |
| Mapping key | Same server as association | Supplies lifecycle policy. |

The application maintains a reverse room-to-creator index so deletion or external removal clears the correct association without a full scan.

## Inactivity Lifecycle Record

| Field | Rules | Meaning |
|---|---|---|
| Room identifier | At most one record per managed room | Links lifecycle work to an association. |
| Empty since | Set at first empty observation | Defines continuous inactivity. |
| Generation | Changes when work is invalidated/replaced | Makes delayed callbacks harmless. |
| Scheduled work | One cancellable expiry or retry | Prevents duplicate effective timers. |
| State | Pending expiry or retry | Describes next work. |

## State Transitions

- Managed occupied → empty: create one pending expiry record.
- Pending expiry → occupied: cancel/invalidate lifecycle work.
- Pending expiry → empty at expiry: attempt deletion after final state check.
- Expiry → missing: clear association; expiry → unavailable: retain the association and schedule only a room-state recheck. A later deletion attempt is eligible only after that recheck authoritatively reports the room empty.
- Delete attempt → deleted or missing: clear association; failed: schedule retry after 15 minutes.
- Pending retry → unavailable: retain association and schedule another room-state recheck; pending retry → empty: attempt deletion; pending retry → occupied: cancel; external deletion: clear association.

All single-room transitions are serialized. Successful or external deletion cancels work and clears both indexes. No record survives restart.
