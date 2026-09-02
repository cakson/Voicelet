# Quickstart: Persistent Guild Configuration Validation

## Prerequisites

Use Node 24, pnpm 10, locked dependencies, and the pinned Firebase CLI. The Firestore emulator
requires the Java runtime documented by its pinned tooling; CI plans Java 21. No production Firestore
or Discord credential is required for unit, integration, or E2E tests.

## Local emulator and seeding

```sh
pnpm install --frozen-lockfile
pnpm firebase:emulator
```

The implementation adds Firestore-only `firebase.json`, a disposable project ID, and documented
non-secret `.env` endpoint/project values. Start with no imported data to reset it. Use the documented
internal seed/setup command with placeholder guild/channel/category IDs. Never point a reset or seed
command at production.

For manual real Discord testing, keep the Discord token in ignored `.env`; emulator routing remains
non-secret. Production runtime supplies project configuration and Google credentials through
Northflank secrets/configuration; the image contains neither credential. Never set
`FIRESTORE_EMULATOR_HOST` in production.

## Automated validation

| Layer | Command after implementation | Evidence |
|---|---|---|
| Unit/application | `pnpm test:unit` | In-memory configured/unconfigured/invalid/unavailable behavior; no Firebase process. |
| Adapter integration | `pnpm test:persistence:integration` | Official emulator proves save/read/replace/not-found/malformed/error mapping. |
| E2E | `pnpm test:persistence:e2e` | Simulated Gateway + emulator proves room creation, safe unconfigured behavior, and process-restart persistence. |
| Full gate | `pnpm check` | Formatting, lint, types, all tests, build, and emulator lifecycle pass. |

In a persistence-failure test `/livez` remains successful, `/readyz` becomes unavailable, bounded
diagnostics contain no IDs/documents/errors, and a later successful read restores readiness.

See [data-model.md](data-model.md) and
[contracts/guild-config-repository.md](contracts/guild-config-repository.md).
