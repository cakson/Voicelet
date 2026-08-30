# Quickstart: Engineering Foundation

This guide validates the worker behavior. Every quality command below is mirrored by CI.

## Prerequisites

- Node.js 24 LTS
- Corepack enabled so the repository-pinned pnpm release is used
- A Discord application token only for optional live local connectivity; it is never required by CI

## Setup

1. Install dependencies with `pnpm install --frozen-lockfile`.
2. Copy `.env.example` to `.env` and provide a local Discord token only when testing a real
   connection. Do not commit `.env`.
3. Run `pnpm dev`. Confirm `GET /livez` returns `200`.
4. With valid local Discord configuration, confirm `GET /readyz` becomes `200` after the Gateway
   reports ready. Without valid configuration it must return a safe, actionable startup error or
   `503` readiness result without revealing the token.

## Quality Validation

Run the aggregate `pnpm check` command. It executes the same formatter, linter, type checker, unit,
integration, end-to-end, and build checks required by CI.

Expected outcomes:

- Unit tests prove valid and malformed voice-state normalization and safe observation.
- Integration tests prove readiness transitions and the HTTP contract using a controlled Gateway
  event source.
- End-to-end tests launch the worker with the simulated Gateway, emit Ready then a test
  voice-state event, verify ready status and safe handling evidence, and use no Discord credentials.
- The build succeeds from the pinned dependency graph.

## Optional Live Smoke Check

When a developer supplies a local token outside source control and enables only the
`GuildVoiceStates` intent, they may connect to a test Discord server and verify that the worker
transitions to ready. This smoke check is not part of the required CI quality gate.

## Validation Record

On 2026-08-30, the documented setup and simulated-worker validation were completed in under
15 minutes. `pnpm check` passed all formatting, linting, type-check, unit, integration, end-to-end,
and build checks.
