# Implementation Plan: Guild Administration UI

**Branch**: `010-guild-administration-ui` | **Date**: 2026-09-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-guild-administration-ui/spec.md` plus the required
React, Vite, shadcn/ui, single-process, and single-container technology direction.

## Summary

Add a compact React administration application at `/admin`, a provider-independent JSON API under
`/admin/api`, and application use cases for guild registration and configuration lifecycle. Extend
the persistent model so registration, configuration, and enabled state are distinct; expose only
registered and enabled configuration to Discord behavior. Vite builds static assets into the normal
backend output, and the existing Fastify server serves the UI, API, health endpoints, and metrics in
the same Node.js process and Docker image deployed through the existing GHCR/Northflank path.

## Technical Context

**Language/Version**: TypeScript 5.9; Node.js 24 for the backend/build; React 19 browser client.

**Primary Dependencies**: Existing Fastify 5, Zod 4, Firestore server client, Discord.js, Pino, and
prom-client; React, React DOM, Vite with the React plugin, Tailwind CSS 4 with its Vite plugin,
`@fastify/static`, current shadcn/ui-generated source and only its required Radix/utility
dependencies. `concurrently` and `cross-env` support the one-command local workflow.

**Storage**: Existing Firestore production adapter and official local emulator; deterministic
in-memory adapter for unit/component and backend tests. No browser persistence and no Firebase client
SDK.

**Testing**: Existing Vitest projects plus a jsdom frontend project using Testing Library; Playwright
for the compiled administration CRUD journey; Fastify injection for API integration; official
Firestore emulator for persistence integration and browser E2E; simulated Discord Gateway.

**Target Platform**: One Node.js 24 Linux container and one Northflank service; modern desktop/tablet
browsers supported by the selected Vite production target.

**Project Type**: Single web-service/worker repository with a build-time browser application and one
production process.

**Performance Goals**: In the isolated loopback Playwright/Firestore-emulator harness with a warm
backend and 100 seeded registrations, the median of five page loads must render the complete list or
a clear failure within 2 seconds from navigation start. A confirmed mutation must render its
authoritative result within 2 seconds of submission without a manual page reload.

**Constraints**: Preserve `domain ← application/ports ← infrastructure/composition`; `/admin` and
`/admin/api` share the current operational listener and are intentionally unauthenticated; no SSR,
frontend server, CDN, second service/process, browser secrets, direct browser persistence access,
global state library, or production Vite runtime. Static asset failure must not break `/livez`,
`/readyz`, or `/metrics`.

**Scale/Scope**: One administration page, four focused dialog/confirmation flows, five guild settings,
and an unpaginated list designed and tested for 100 registrations. Pagination and larger-scale
dashboard behavior are deferred until demonstrated by actual usage.

## Constitution Check

*GATE: Passed before research and re-checked after design.*

| Gate | Result | Evidence |
|---|---|---|
| I. Testability | Pass | Pure application services use memory ports; HTTP uses injection; Firestore uses the emulator; React uses component tests; the critical browser flow uses Playwright. |
| II. Enforced Quality Gates | Pass | Root scripts add frontend format, lint, type, component-test, production-build, and browser-E2E gates while retaining all worker/Gateway suites. |
| III. Explicit Architecture | Pass | React calls the admin HTTP adapter; handlers call application use cases; application code owns invariants and ports; only infrastructure adapters know Firestore or Discord. |
| IV. Documentation | Pass | README, architecture, testing, local development, deployment, shadcn maintenance, and unauthenticated endpoint guidance are planned together. |
| V. Explicit API Contracts | Pass | [admin-api.yaml](contracts/admin-api.yaml) defines JSON DTOs, string identifiers, status codes, conflict behavior, and a bounded error envelope. |
| VI. Security by Default | Pass with explicit product constraint | Authentication is intentionally out of scope; no placeholder auth is added. The UI and API expose no secrets/provider details, and docs require VPN/private-network protection. |
| VII. Actionable Observability | Pass | Admin operations add bounded outcome metrics/logs without guild IDs, request values, raw Discord data, provider errors, or secrets. |
| VIII. Reproducible Repository | Pass | One root pnpm lockfile controls backend/frontend dependencies; shadcn source is committed; local, CI, emulator, browser, and container commands are documented. |
| IX. Definition of Done | Pass | Implementation, layered tests, production asset build, container smoke, docs, and `pnpm check` are required before completion. |

Post-design review: all gates remain satisfied. The unauthenticated surface is an explicit feature
constraint rather than an exception hidden by placeholder security. Deployment documentation and
tests must make the private-network requirement conspicuous.

## Project Structure

### Documentation (this feature)

```text
specs/010-guild-administration-ui/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── admin-api.yaml
│   └── guild-administration-ports.md
└── tasks.md                         # created by $speckit-tasks
```

### Source Code (repository root)

```text
admin/
├── index.html
├── components.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── app/
    │   ├── app.tsx
    │   └── main.tsx
    ├── components/ui/               # committed shadcn/ui generated source only
    ├── features/guilds/
    │   ├── api/guild-admin-api.ts
    │   ├── components/
    │   │   ├── guild-list.tsx
    │   │   ├── register-guild-dialog.tsx
    │   │   ├── guild-config-dialog.tsx
    │   │   ├── guild-config-view.tsx
    │   │   └── delete-guild-dialog.tsx
    │   ├── types.ts
    │   └── validation.ts
    ├── lib/utils.ts
    ├── test/setup.ts
    └── styles.css

src/
├── domain/
│   ├── guild-registration.ts
│   └── guild-config.ts
├── application/
│   ├── guild-administration-service.ts
│   ├── manage-temporary-room.ts
│   └── reconcile-temporary-rooms.ts
├── ports/
│   ├── guild-administration-repository.ts
│   ├── enabled-guild-config-repository.ts
│   └── guild-config-change-notifier.ts
├── infrastructure/
│   ├── firestore/firestore-guild-repository.ts
│   ├── memory/in-memory-guild-repository.ts
│   ├── http/
│   │   ├── admin-api-routes.ts
│   │   ├── admin-static-routes.ts
│   │   └── operational-server.ts
│   └── logging/observability.ts
├── composition/root.ts
└── main.ts

tests/
├── unit/
│   ├── guild-administration-service.test.ts
│   ├── guild-registration.test.ts
│   └── admin/*.test.tsx
├── integration/
│   ├── admin-http.test.ts
│   ├── admin-static-assets.test.ts
│   └── firestore-guild-repository.test.ts
├── e2e/admin-guild-management.spec.ts
└── support/
    ├── firestore-emulator.ts
    └── admin-test-server.ts
```

**Structure Decision**: Keep a single root package and lockfile. `admin/` is a Vite build target, not
a separately versioned or deployed application. Backend output remains `dist/`; Vite emits hashed
browser assets under `dist/admin/assets` and an `index.html` under `dist/admin`. Generic generated
shadcn components stay in `admin/src/components/ui`, while Voicelet behavior stays under the guild
feature and backend application layers.

## Implementation Approach

1. Introduce `GuildRegistration` independently from `GuildConfiguration`. Refine the current
   repository boundary into narrow registration, configuration-creation, configuration-mutation,
   deletion, and enabled-configuration-reader capability ports. Room creation and reconciliation
   depend only on the enabled reader. One memory adapter and one Firestore adapter implement these
   capabilities over shared storage; there is no UI-specific persistence path.
2. Store registrations and configurations separately. Firestore transactions enforce duplicate-free
   registration, optional atomic registration-with-configuration, create-versus-update conflicts,
   enabled-state changes, and deletion of both records. A Voicelet-owned configuration revision
   prevents stale forms or toggles from silently overwriting newer state.
3. Update worker reads so a configuration is usable only when the registration exists, persisted
   data is valid, and `enabled` is true. After successful configuration creation, interval edit,
   enable, disable, or deletion, an application port notifies reconciliation to start, reschedule, or
   cancel that guild's timer; room creation continues resolving current state per event.
4. Add `GuildAdministrationService` use cases for list, register, retrieve, create/replace
   configuration, set enabled state, and delete. Validate Discord snowflakes and complete
   configuration invariants here as well as at the HTTP boundary. Return discriminated bounded
   outcomes rather than exceptions or provider values.
5. Register resource-oriented Fastify routes from [admin-api.yaml](contracts/admin-api.yaml). Zod
   validates params and JSON bodies at the adapter edge; route mapping distinguishes 400, 404, 409,
   and 503 while returning one stable safe error envelope. Keep `/livez`, `/readyz`, and `/metrics`
   behavior independent.
6. Configure Vite with `/admin/` as the production base, `/admin/api` proxying to local Fastify, a
   fixed strict development port, React, and Tailwind 4. Initialize shadcn for the existing project
   and generate only Button, Badge, Table, Dialog, AlertDialog, Input, Label, Switch, Skeleton, and
   Alert sources plus their required dependencies; retain those generated sources in the repository
   and omit routing, form frameworks, dropdown menus, and global state libraries.
7. Build one page with a small centralized API client and server-authoritative refresh after every
   mutation. Use a multi-step registration dialog for either an atomic registration-only or
   registration-with-configuration request, one shared create/edit configuration form, a read-only
   dialog, a persisted-result switch, and destructive AlertDialog. Inline Alert/`aria-live` feedback
   covers loading, success, empty, validation, conflict, and unavailable states.
8. Serve compiled files through the existing Fastify instance using `@fastify/static`: immutable
   caching for fingerprinted `/admin/assets/*`, no-store for `index.html`, `/admin` and `/admin/`
   entry routes, and a non-API `/admin/*` fallback for direct loads. Missing assets/UI build yield
   bounded 404/503 responses without affecting operational endpoints.
9. Keep `pnpm dev` compatible with worker development and add one documented `pnpm dev:admin`
   command that starts the disposable Firestore emulator, simulated backend, and Vite together.
   Vite proxies only `/admin/api`; no development CORS policy or production Vite server is added.
10. Extend `pnpm check`, CI, Docker, and container smoke validation. The build stage compiles backend
    and frontend; the runtime stage receives backend JS, `dist/admin`, production dependencies, and
    package metadata only. The same image, process, port, GHCR publication, and Northflank service
    remain authoritative.

## Test Strategy

- **Domain/application**: validate decimal string snowflakes, registration/config relationships,
  duplicate and stale-revision conflicts, all CRUD outcomes, preservation while disabled, atomic
  deletion, notifier behavior, and safe unavailable/invalid results using memory ports.
- **Worker regression**: prove unregistered, unconfigured, disabled, deleted, invalid, and unavailable
  guilds safely skip; enabled guilds retain room creation; reconciliation starts/reschedules/cancels
  after admin mutations and restart.
- **HTTP integration**: inject every API route; assert JSON contracts, content types, 400/404/409/503
  mappings, no raw errors/secrets/IDs in diagnostics, and health endpoints independent of admin asset
  or persistence failures.
- **Persistence integration**: against the official emulator, prove registration without config,
  duplicate/concurrent registration, atomic initial config, create/update conflict behavior,
  enabled-state restart persistence, transactional deletion, guild isolation, legacy-config gating,
  and re-registration after deletion.
- **Frontend components**: render loading/empty/error/list states and configured/enabled badges; test
  keyboard/dialog behavior, validation, duplicate-submit prevention, persisted edit population,
  non-optimistic toggles, delete confirmation/copy, and safe API errors.
- **Browser E2E**: use Playwright against compiled assets served by Voicelet, simulated Gateway, and
  disposable Firestore emulator. Exercise register-unconfigured → configure → view → edit → disable
  → verify retained values → restart persistence → enable → confirm delete → absent list.
- **Delivery**: assert root scripts, lockfile, no browser Firebase SDK/secrets, static route behavior,
  Vite-free runtime stage, bundled assets, unchanged health endpoints, GHCR publication, and the
  single Northflank service handoff.

## Migration and Rollback

- Production is expected to have no configuration data. Introduce `guildRegistrations` separately;
  configuration documents never imply registration.
- Persist new configurations as V2 with `enabled` and application revision. The adapter may read V1
  configuration as enabled revision 1 for non-production/local compatibility, but it remains inactive
  until an explicit registration exists and is rewritten as V2 on the next successful mutation.
- The prior image cannot understand V2 configuration and does not honor registration or enabled
  state. A rollback therefore safely skips V2-created guild behavior but cannot continue managing
  those guilds. Preserve V1 fields for forward migration, take a datastore backup before rollout,
  and document roll-forward as the normal recovery; restoring a verified pre-feature backup is the
  only supported data rollback.

## Complexity Tracking

No constitution violations. React/Vite exists only as source and build tooling; it does not create a
second production runtime. Narrow registration, configuration-creation, configuration-mutation,
deletion, and enabled-reader ports are justified by independently delivered administration stories
and worker consumers with different permissions and consistency needs; the same adapters implement
them over shared storage.
