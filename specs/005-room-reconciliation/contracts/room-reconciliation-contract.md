# Room Reconciliation Contract

## Configuration Contract

`TEMPORARY_ROOM_CONFIG` remains a JSON object keyed by server ID. Each mapping has these reconciliation fields in addition to the existing trigger, category, and inactivity fields:

```json
{
  "server-id": {
    "triggerChannelId": "voice-channel-id",
    "destinationCategoryId": "category-id",
    "inactivityTimeoutMinutes": 60,
    "reconciliationIntervalMinutes": 15,
    "permanentChannelIds": ["permanent-voice-channel-id"]
  }
}
```

- `reconciliationIntervalMinutes` is optional; omitted means 15. It must be a whole integer from 1 through 1,440.
- `permanentChannelIds` is optional; omitted means no additional exclusions. Values must be non-empty channel IDs; duplicates have no additional effect.
- The effective permanent set is `triggerChannelId` plus `permanentChannelIds`.
- Invalid mappings fail startup with the existing generic validation error and do not echo mapping contents.

## Discord Boundary Contract

| Operation | Input | Result | Safety rule |
|---|---|---|---|
| `listCategoryVoiceRooms` | Server ID, category ID | Voice-room IDs, or `unavailable` | Returns only voice channels currently parented by the requested category. It never returns categories or unrelated channels. |
| `roomState` | Server ID, room ID | `empty`, `occupied`, `missing`, or `unavailable` | Used for an authoritative candidate check; unavailable is never treated as empty. |
| `deleteEmptyRoom` | Server ID, room ID | `deleted`, `occupied`, `missing`, or `failed` | Rechecks that the voice room is empty immediately before deletion. `occupied`, `missing`, and `failed` preserve reconciliation safety. |

Provider exceptions are translated into the bounded unavailable/failed results. No raw provider error, channel name, member data, guild ID, or token enters logs or metric labels.

## Classification and Cleanup Contract

For each ID returned by `listCategoryVoiceRooms`:

1. If it is an effective permanent channel, preserve it.
2. Otherwise, if current transient state says it is known managed, preserve it and make no lifecycle change.
3. Otherwise it is a zombie. Under candidate serialization, repeat the permanent/known checks and read its current state.
4. Delete only an empty zombie through `deleteEmptyRoom`. Do not create, modify, clear, or infer an ownership association.
5. Preserve occupied or unavailable zombies. Treat missing candidates as a no-op. Record a bounded failure for failed inspection/deletion and continue safely independent candidates.

## Scheduling Contract

- An effective transition to ready requests an immediate scan for every configured server.
- Duplicate provider-ready signals and overlapping periodic requests coalesce to at most one scan per server.
- The next recurrence is scheduled only after the preceding scan settles, using that mapping's interval.
- Disconnect or worker stop cancels pending reconciliation recurrence work. A later ready transition starts a fresh immediate scan.
- All scheduler use is injectable so tests advance controlled time instead of waiting for a real interval.

## Observation Contract

Observations use bounded reconciliation outcomes such as scan started/completed, category unavailable, candidate preserved by classification, zombie deleted, zombie occupied, inspection failed, and deletion failed. They may contain only non-identifying outcome/state labels; they must not include IDs, names, raw events, payloads, tokens, or provider error text.
