# Testing

Run all checks with `pnpm check`; CI runs the same command after a frozen-lockfile install.

- `pnpm test:unit` validates voice-state normalization and safe outcomes.
- `pnpm test:integration` validates the operational HTTP contract, Gateway lifecycle, commands, and
  documentation requirements.
- `pnpm test:e2e` launches a separate worker process, drives its simulated Discord client through
  IPC, and checks its operational interface over a Unix-domain socket without Discord credentials
  or a live server.

The production adapter uses `discord.js`; tests inject the deterministic simulated client through
the `DiscordClientFactory` port. The E2E path enforces readiness and event handling within the
documented 30-second and 5-second bounds.

Temporary-room coverage includes per-server configuration, creation, reuse, stale rooms, duplicate
deliveries, concurrent members, safe failures, and readiness after failure.
