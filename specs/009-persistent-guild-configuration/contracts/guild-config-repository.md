# Guild Configuration Repository Contract

This internal application contract belongs in `src/ports` and uses only Voicelet-owned types.

```text
GuildConfigRepository
  get(guildId) -> Promise<GuildConfigLookup>
  list() -> Promise<GuildConfigList>
  save(input) -> Promise<GuildConfigSave>
```

Exact TypeScript naming follows repository conventions. `save` is complete create-or-replace;
a separate update method is optional only when it returns the same normalized complete value.

```text
GuildConfigLookup = found(config) | not_found | invalid | unavailable
GuildConfigSave   = saved(config) | invalid | unavailable
GuildConfigList   = found(configs, invalidCount) | unavailable
```

- `get` distinguishes absent, corrupt, and unavailable states.
- `save` validates and atomically replaces a complete configuration; it never returns partial data.
- `list` preserves existing reconciliation scheduling and exposes only canonical values plus an
  aggregate invalid count.
- No SDK error, snapshot, reference, timestamp, query, path, document, provider record ID, or raw
  provider detail is exposed. A composition-only adapter disposal hook is permitted separately.
