# Data Model: Room Reconciliation & Zombie Cleanup

## Server Room Configuration

| Field | Meaning | Validation |
|---|---|---|
| Server ID | Selects one server mapping. | Non-empty identifier; mapping key. |
| Trigger channel ID | Voice channel that creates/reuses a managed room. | Non-empty; always a permanent exclusion. |
| Temporary-room category ID | Dedicated category containing managed and eligible zombie voice rooms. | Non-empty. |
| Inactivity timeout minutes | Existing continuous-empty lifetime for known managed rooms. | Existing whole-minute validation. |
| Reconciliation interval minutes | Cadence for startup-following scans. | Whole integer 1–1,440; default 15. |
| Permanent channel IDs | Additional voice channels in the category that must remain untouched. | Optional list; defaults empty; each ID non-empty; duplicate entries normalize to one exclusion. |

## Room Classification

| Classification | Predicate | Reconciliation action |
|---|---|---|
| Out of scope | Not returned by the configured category voice-room enumeration. | Do not inspect or delete. |
| Permanent | Candidate equals trigger ID or is in permanent channel IDs. | Preserve. |
| Known managed | Candidate is in current transient managed-room state. | Preserve; existing inactivity lifecycle remains sole authority. |
| Zombie | Candidate is neither permanent nor known managed. | Inspect current state; delete immediately only when empty. |

Classification is recomputed under candidate serialization before cleanup. A candidate changing classification or disappearing is preserved or treated as a safe no-op.

## Reconciliation Scan

| Attribute | Rule |
|---|---|
| Scope | One configured server and its temporary-room category. |
| Trigger | One immediate request after an effective ready transition and one request after each configured interval. |
| Concurrency | At most one active scan and one pending recurrence per server; duplicate requests coalesce. |
| Candidate processing | One candidate at a time; individual inspect/delete errors do not stop independent candidates. |
| Persistence | None. Restart discards known managed-room state and schedules; pre-existing untracked rooms become zombies. |
| Disposal | Pending recurrence work is cancelled on disconnect/stop. |

## Candidate State Transitions

```text
category candidate
  ├─ permanent → preserved
  ├─ known managed → existing lifecycle only
  └─ zombie
       ├─ occupied / unavailable → preserved, no association created
       ├─ missing → no-op
       ├─ empty → guarded deletion
       │            ├─ deleted / missing → complete, no association change
       │            ├─ occupied → preserved
       │            └─ failed → observable failure; continue scan
       └─ later scan repeats classification from current state
```

## Transient Association Boundary

The managed-room manager retains creator-to-room and room-to-creator associations plus inactivity work only while the process is alive. Reconciliation receives a read-only known-managed predicate. It must not create, clear, transfer, or reconstruct an association for a zombie, including after a successful zombie deletion.
