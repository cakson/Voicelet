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
deliveries, concurrent members, safe failures, continuous-empty lifecycle deletion, and readiness
after failure. Lifecycle timing is controlled in simulation; tests never wait for the 60-minute default.
Owner-permission tests assert the two member-specific native permissions, two-owner isolation,
absence of server-wide privileges, allowance-failure containment, category restoration, and
deletion/replacement without affecting another association.

Reconciliation coverage uses the same deterministic scheduler: startup scans classify known rooms,
permanent exclusions, empty zombies, and occupied zombies; later controlled scans remove zombies that
become empty. The suite also covers repeatability, guarded deletion races, contained provider failures,
and restart/state-loss behavior without real interval waits.

Automated tests use the simulated Gateway and never require a Discord credential or live server.
For a real Discord connection, use the manual [Local Discord development onboarding guide](local-discord-development.md),
which keeps the bot token in an ignored local `.env`, checks loopback `/livez` and `/readyz`, and
walks through create, move, reuse, and clean shutdown.

Container and workflow contract tests inspect the Dockerfile, `.dockerignore`, GHCR publication
workflow, manually dispatched Northflank workflow, and deployment documentation. The documented
Docker smoke test uses `GATEWAY_MODE=simulated` and separately supplied environment values, then
checks `/livez`, `/readyz`, and `/metrics`. It never records Discord or deployment credentials.
