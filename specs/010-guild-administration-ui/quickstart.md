# Quickstart: Guild Administration UI Validation

## Prerequisites

- Node.js 24.20.0 and pnpm 10.15.0 selected by the repository.
- Java 21 for the pinned Firestore emulator tooling.
- A supported Chromium browser installed by the planned Playwright setup.
- No production Discord token, Firestore credential, or Northflank credential.

The administration interface is intentionally unauthenticated. Use it only on localhost or behind a
VPN/equivalent private network. Never expose `/admin` or `/admin/api` directly to the public internet.

## Install

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
```

All backend, React, Vite, shadcn/ui, test, and emulator dependencies use the root package and
lockfile. Generated shadcn source lives under `admin/src/components/ui`; add future components one at
a time with the documented shadcn CLI workflow and review generated changes before committing.

## One-command local administration workflow

After implementation:

```sh
pnpm dev:admin
```

Expected services:

| Address | Purpose |
|---|---|
| `http://127.0.0.1:5173/admin/` | Vite development UI. |
| `http://127.0.0.1:3000/admin/api/` | Voicelet administration API, reached by Vite proxy from browser requests. |
| `http://127.0.0.1:3000/livez` | Existing backend liveness endpoint. |
| Local Firestore emulator | Disposable registration/configuration persistence started by the command. |

The workflow uses simulated Discord and isolated local persistence. It introduces no CORS setting and
does not require Discord or production datastore credentials. Existing `pnpm dev`, local Discord,
and standalone emulator workflows remain available as documented.

## Manual acceptance journey

1. Open `/admin/` and verify the empty state, page title, description, and Register Guild action.
2. Submit an invalid guild ID and verify field feedback appears without a list entry.
3. Register a valid test snowflake without configuration and verify one Unconfigured row appears.
4. Attempt to register it again and verify a duplicate message with no duplicate row.
5. Add configuration using valid test snowflakes for trigger channel/category plus the lifecycle
   values described in [data-model.md](data-model.md).
6. View the configuration and verify all saved values and Enabled status.
7. Edit one value, save, reopen, and verify the persisted replacement. Cancel another edit and verify
   no change.
8. Disable the switch and verify Disabled status while every configuration value remains visible and
   editable. Restart the local stack against retained emulator data and verify it remains disabled.
9. Re-enable and verify the saved values remain.
10. Open Delete, verify its copy distinguishes Voicelet data from Discord resources, cancel once,
    then confirm. Verify the row disappears and another seeded guild remains unchanged.
11. Register the deleted ID again and verify it starts unconfigured.

## Automated validation

| Layer | Planned command | Evidence |
|---|---|---|
| Domain/application | `pnpm test:unit` | Registration/config lifecycle, validation, conflicts, enabled filtering, notifications, and worker safe skips. |
| React components | `pnpm test:admin` | Loading/empty/error/list rendering, forms, dialogs, persisted toggles, confirmation, and safe error presentation. |
| HTTP integration | `pnpm test:integration` | Fastify-injected route validation and stable JSON/status contracts without React. |
| Persistence integration | `pnpm test:persistence:integration` | Firestore emulator transactions, restart persistence, deletion, and guild isolation. |
| Browser E2E | `pnpm test:admin:e2e` | Compiled React UI + Voicelet + emulator + simulated Gateway executes the complete CRUD journey. |
| Performance budget | `pnpm test:admin:e2e` | A warm loopback/emulator fixture measures five 100-guild page loads and confirmed mutations against the two-second budget. |
| Full local gate | `pnpm check` | Format, lint, backend/frontend types, all non-emulator suites, and backend/frontend production builds. |
| Container smoke | `pnpm container:smoke` | One image/process serves admin HTML/assets/API and unchanged liveness/readiness/metrics. |

CI runs the full gate plus emulator-backed persistence and administration browser suites. Tests use
disposable project data and must fail before touching a production endpoint or credential.

## API contract validation

Use [admin-api.yaml](contracts/admin-api.yaml) as the stable browser/backend contract. Verify:

- all identifiers remain JSON strings;
- invalid payloads return 400 with `validation_error`;
- duplicate or stale writes return 409 without mutation;
- missing resources return 404;
- provider failure returns a safe 503 without exception/provider detail;
- deletion returns 204 and removes both Voicelet records only;
- responses and diagnostics never include tokens, credentials, raw Discord data, Firestore shapes, or
  submitted identifiers in logs/metric labels.

## Production build and static serving

```sh
pnpm build
node dist/main.js
```

With safe local runtime configuration, verify:

- `GET /admin` and `GET /admin/` return the built application;
- generated references resolve under `/admin/assets/*`;
- a direct non-API `/admin/*` load returns the application entry point;
- unknown API and missing asset paths do not return the application HTML;
- `/livez`, `/readyz`, and `/metrics` remain functional when admin persistence is unavailable or an
  admin asset is missing;
- no Vite development server runs or is required.

## Container and deployment validation

```sh
pnpm check
pnpm container:build
pnpm container:smoke
```

Inspect the runtime image and confirm it contains backend output, `dist/admin`, package metadata, and
production runtime dependencies only—no `.env`, source map intentionally excluded by the Vite build,
frontend source, test data, browser credentials, or Vite process. Deploy the same immutable GHCR
image to the existing Northflank service. Configure the Northflank/private ingress so `/admin` and
`/admin/api` are reachable only through the required VPN/private network boundary.

Before rollout, take a verified datastore backup. A prior Voicelet image cannot interpret V2
configuration or honor registration/enabled state, so normal recovery is a roll-forward. Restoring a
verified pre-feature backup is the only supported data rollback; a prior image safely skips V2 data
but cannot continue managing guilds created by this feature.

## Regression expectations

- Existing Discord Gateway and temporary-room tests remain green for registered, enabled guilds.
- Unregistered, unconfigured, disabled, deleted, invalid, and unavailable configurations never crash
  the worker or trigger guild-specific room behavior.
- Enabling/configuring starts reconciliation; interval edits reschedule it; disabling/deleting cancels
  it; restart reconstructs only registered/enabled schedules.
- No administration operation creates, updates, or deletes a Discord-side guild, channel, category,
  or room.
