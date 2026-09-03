# Research: Guild Administration UI

## Single-process React delivery

**Decision**: Treat `admin/` as a Vite build target within the root pnpm package. Configure the
production base as `/admin/`, emit to `dist/admin`, and serve the result with `@fastify/static` from
the existing Fastify instance and Node.js process.

**Rationale**: Vite produces deployable static assets, and its public base rewrites imported asset
URLs for a nested path. `@fastify/static` 8+ supports Fastify 5 and can serve a prefixed root. This
keeps the requested `/admin`, `/admin/assets/*`, API, health, and metrics topology in the current
container without a production frontend server.

**Alternatives considered**: A separate frontend service/CDN violates the deployment requirement.
Vite preview is not a production server. Middleware mode, SSR, Next.js, and another Node process add
runtime complexity without value for one administration page.

## Current shadcn/ui Vite setup

**Decision**: Use React 19, the Vite React plugin, Tailwind CSS 4 through `@tailwindcss/vite`, the
`@/*` TypeScript/Vite alias, and a committed `components.json`. Initialize shadcn/ui for the existing
Vite project, then add only Button, Badge, Table, Dialog, AlertDialog, Input, Label, Switch, Skeleton,
and Alert.

**Rationale**: This follows the current official shadcn/ui Vite guidance and preserves the defining
shadcn model: generated component source lives in the repository. These components cover the list,
focused forms, status, loading, feedback, toggle, and destructive confirmation requirements.

**Alternatives considered**: A general component package obscures editable source and adds unused
surface. Card and DropdownMenu are unnecessary initially. The deprecated shadcn toast is avoided;
an inline Alert with an `aria-live` region provides sufficient feedback without Sonner. A form
framework is unnecessary for this small controlled form.

## Frontend structure and state

**Decision**: Keep one primary React page without a client router. Put generated primitives in
`admin/src/components/ui`, guild-specific components and validation in
`admin/src/features/guilds`, and all fetch construction in one typed API client. Reload the affected
guild or list after mutations and render only confirmed server state.

**Rationale**: Dialogs satisfy registration, view, edit, and deletion without additional routes.
Local component state is enough for one page and a handful of dialogs. Server-authoritative refresh
prevents failed toggles or uncertain responses from appearing successful.

**Alternatives considered**: Redux, a client query/cache library, browser storage, and a router have
no demonstrated need. Optimistic toggles risk displaying a state persistence rejected.

## Local development

**Decision**: Add `pnpm dev:admin` as the single administration workflow. It starts the official
Firestore emulator around a simulated Voicelet backend and Vite dev server, with Vite proxying
`/admin/api` to Fastify. Keep `pnpm dev` available for the existing worker workflow.

**Rationale**: Vite's prefix proxy is the documented solution for forwarding development requests.
The emulator command provides disposable persistence and exports its host to the backend child
process. A fixed Vite port with `strictPort` prevents documentation from pointing at a moving URL.

**Alternatives considered**: Development CORS creates policy absent from production. Requiring three
manual terminals does not meet the one-workflow goal. Depending on Vite in production violates the
topology.

## Persistent registration and active configuration

**Decision**: Add a separate `GuildRegistration` record and extend configuration with `enabled` and
an application-owned revision. Provide narrow registration, configuration-creation,
configuration-mutation, deletion, and enabled-config-reader capability ports, all implemented by the
same Firestore and memory adapters over shared storage. Configuration data alone does not register a
guild.

**Rationale**: Separate records represent an unconfigured guild honestly. The worker-facing reader
can enforce the complete gate—registered, valid, configured, enabled—without duplicating policy in
room behavior. A revision supports explicit stale-edit conflicts without exposing Firestore metadata.

**Alternatives considered**: Fake/incomplete configuration violates the domain requirements.
Encoding registration only in configuration cannot represent unconfigured guilds. Firestore
timestamps or snapshot versions would leak provider concepts.

## Mutation consistency

**Decision**: Use Firestore transactions for duplicate-free registration, optional atomic initial
configuration, revision-checked configuration replacement/enabled changes, and registration plus
configuration deletion. Use equivalent deterministic behavior in memory.

**Rationale**: Transactions make concurrent duplicate registration and destructive multi-record
operations testable and prevent stale UI forms from silently overwriting a newer valid value. Safe
result unions map provider failures without exposing exceptions.

**Alternatives considered**: Unconditional `set` is last-write-wins and cannot distinguish duplicate
registration. Sequential deletion can leave partial state. A provider-specific batch or transaction
type must not cross the infrastructure boundary.

## Dynamic worker behavior

**Decision**: Publish successful configuration lifecycle changes through a provider-neutral
application port. Composition connects it to reconciliation so create/enable starts scheduling,
interval edits reschedule, and disable/delete cancel; room creation continues to load current active
configuration per event.

**Rationale**: Existing reconciliation schedules are created only when the Gateway becomes ready.
Without an in-process change signal, newly enabled configuration would not fully resume behavior
until restart. The persisted store remains authoritative because notifications occur only after a
successful write and restart rebuilds schedules from storage.

**Alternatives considered**: Polling adds delay and datastore load. Calling Discord infrastructure
from HTTP handlers breaks dependency direction. Persistent provider listeners introduce
provider-specific application behavior.

## HTTP contract and static routing

**Decision**: Expose resource-oriented JSON routes under `/admin/api/guilds`, validate with Zod at
the boundary, and map application outcomes to 400 validation, 404 not found, 409 duplicate/stale
conflict, and 503 unavailable responses using one safe error envelope. Register API and asset routes
before a non-API `/admin/*` index fallback.

**Rationale**: Stable DTOs let React handle expected failures without provider knowledge. Decimal
snowflakes remain strings. Route precedence prevents the SPA fallback from turning API or missing
asset failures into HTML success responses.

**Alternatives considered**: Exposing repository documents leaks schema and provider concerns.
Returning raw exceptions violates security. GraphQL and generated full-stack RPC are unnecessary for
the small resource surface.

## Tests and delivery

**Decision**: Extend root Vitest with a jsdom component project, use Testing Library for interactions,
and add Playwright for one compiled-asset CRUD journey against simulated Discord and the Firestore
emulator. Root build/check scripts compile backend and frontend; Docker copies `dist/admin` into the
existing runtime image after pruning development dependencies.

**Rationale**: The layers align with the constitution: pure use cases, HTTP/persistence boundaries,
and the critical browser journey each have direct evidence. One lockfile and one Docker artifact keep
CI and GHCR/Northflank delivery reproducible.

**Alternatives considered**: jsdom alone cannot prove static delivery and browser behavior. Browser
tests against production services would require credentials and be nondeterministic. A separate
frontend pipeline violates the requested release boundary.

## Security posture

**Decision**: Add no authentication or placeholder mechanism. Serve `/admin` and `/admin/api` on the
existing listener, put no secret into Vite environment values or bundles, sanitize all HTTP errors,
and require a VPN or equivalent private-network boundary in Northflank/internet-exposed deployment
documentation.

**Rationale**: This matches the explicit feature scope while reducing accidental exposure and
credential leakage. Operational endpoints remain independent, but sharing the listener means the
deployment boundary must protect the administration paths.

**Alternatives considered**: Temporary shared secrets create an undocumented authentication system
outside scope. A second private listener contradicts the clarification choosing the existing
listener.

## Sources

- [shadcn/ui Vite installation](https://ui.shadcn.com/docs/installation/vite)
- [shadcn/ui Tailwind CSS 4 guidance](https://ui.shadcn.com/docs/tailwind-v4)
- [shadcn/ui CLI](https://ui.shadcn.com/docs/cli)
- [Vite production build and nested base path](https://vite.dev/guide/build)
- [Vite development proxy and strict port](https://vite.dev/config/server-options.html#server-proxy)
- [`@fastify/static` compatibility and usage](https://github.com/fastify/fastify-static)
- [Firestore transactions](https://cloud.google.com/firestore/docs/manage-data/transactions)
