# Implementation Plan: Local Discord Development Onboarding

**Branch**: `003-local-discord-onboarding` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-local-discord-onboarding/spec.md`

## Summary

Publish a secure, repeatable path for running the existing Voicelet worker against a real Discord
development server. The change documents creation and guild installation of a dedicated bot,
least-privilege access, configuration identifiers, local health inspection, the manual
temporary-room smoke test, and targeted troubleshooting. It also replaces the abstract room-map
example with a safe, copyable placeholder configuration and adds automated documentation-contract
coverage. The feature changes documentation and example configuration only; it does not alter
Gateway behavior, public HTTP exposure, or room management.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node.js 24; Markdown and dotenv-style configuration for
the onboarding deliverables

**Primary Dependencies**: discord.js 14.22, Fastify 5, Pino 9, Zod 4; Discord Developer Portal and
Discord Gateway as the external development service

**Storage**: No persistent storage. An ignored local `.env` holds the development bot token; a
non-secret JSON mapping in that file binds server, trigger-channel, and category identifiers.

**Testing**: Vitest 3 unit, integration, and process-level E2E suites; this feature adds static
documentation/example assertions and retains deterministic simulated-Gateway tests. Live Discord is
validated by the documented manual smoke test, never automated with real credentials.

**Target Platform**: A developer workstation running a local background worker and Discord desktop
or web client; the worker initiates an outbound Discord Gateway connection.

**Project Type**: Single background-worker service with operational HTTP endpoints.

**Performance Goals**: A developer can complete real Discord onboarding and obtain readiness within
30 minutes excluding account creation; the current room assignment behavior completes within its
existing five-second simulated bound.

**Constraints**: Preserve `domain ← application/ports ← infrastructure/composition`; never commit,
log, fixture, screenshot, or generate a real bot token; retain no raw Discord data in logs; bind
operational HTTP locally; request no Administrator permission or unnecessary privileged Gateway
capability; do not require a public callback, tunnel, domain, or port forwarding.

**Scale/Scope**: One local development bot and dedicated test server per developer; one configured
temporary-room mapping per test server in the local configuration. Production onboarding, deployment,
webhooks, commands, cleanup, timers, and restart reconciliation remain out of scope.

## Constitution Check

### Pre-design Gate

- **I. Testability — PASS**: Documentation requirements will have integration assertions for the
  safe example and required guidance, while existing unit/integration/E2E coverage continues to
  validate the actual worker behavior. A manual real-Discord smoke test provides the missing
  external-service evidence without automating secrets.
- **II. Enforced Quality Gates — PASS**: The tasks will require focused tests plus the repository's
  complete `pnpm check` command.
- **III. Explicit Architecture — PASS**: No dependency direction or runtime boundary changes are
  proposed. The documentation describes the existing configuration and operations only.
- **IV. Documentation as Deliverable — PASS**: README, a dedicated local-development guide, the
  safe example, and testing documentation will be updated as a cohesive onboarding surface.
- **V. Explicit API Contracts — PASS**: The environment-variable and local operational-endpoint
  contract is captured in [local-discord-configuration.md](./contracts/local-discord-configuration.md)
  and backed by documentation tests.
- **VI. Security by Default — PASS**: The plan requires an ignored `.env`, placeholder-only tracked
  examples, token-regeneration guidance, least-privilege permissions, bot-only authentication, and
  privacy-safe troubleshooting.
- **VII. Actionable Observability — PASS**: The guide distinguishes liveness, readiness, and
  bounded logs/metrics without directing developers to expose identifiers or provider errors.
- **VIII. Reproducible Repository — PASS**: It uses the existing `pnpm install --frozen-lockfile`,
  `pnpm dev`, and `pnpm check` workflows; no dependency changes are expected.
- **IX. Definition of Done — PASS**: Tasks will cover documentation, safe configuration, automated
  checks, a manual smoke-test checklist, and final quality validation.

### Post-design Gate

**PASS** — The research, data model, configuration contract, and quickstart preserve the existing
worker boundary and make the operational workflow testable without introducing credentials or a
new external interface. No complexity exception is required.

## Project Structure

### Documentation (this feature)

```text
specs/003-local-discord-onboarding/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── local-discord-configuration.md
└── tasks.md                 # Created by $speckit-tasks
```

### Source Code (repository root)

```text
.env.example
README.md
docs/
├── architecture.md
├── local-discord-development.md
└── testing.md
tests/
└── integration/
    └── documentation.test.ts
```

**Structure Decision**: Keep the worker implementation unchanged. Place the complete onboarding
procedure in `docs/local-discord-development.md`, make README link to it as the discoverable entry
point, retain concise simulator/testing distinctions in `docs/testing.md`, and test the tracked
documentation/example contract in the existing documentation integration suite.

## Implementation Approach

1. Establish a dedicated local Discord guide with an explicit security boundary: use a separately
   created bot application and development server, store its token only in ignored `.env`, and
   regenerate any token that may have been exposed.
2. Document Discord Portal setup and guild installation using a bot identity, the `bot` scope, and
   the effective permissions required to view the configured voice resources, create rooms, and move
   members. Make category/channel overrides and the need for `Connect` when moving members explicit.
3. Document the existing standard `GuildVoiceStates` Gateway capability and no privileged-intent
   Portal toggle; do not imply requirements for message content, member, or presence capabilities.
4. Replace the empty generic mapping in `.env.example` with clearly fictional, syntactically valid
   placeholders and comments that distinguish secret `DISCORD_TOKEN` from non-secret identifiers and
   local HTTP settings. Preserve the existing variable names and defaults.
5. Define a documentation contract for configuration mapping, local endpoint outcomes, startup,
   shutdown, and smoke-test evidence. Add static tests that assert required onboarding content and
   reject credential-shaped values in tracked examples without ever using real credentials.
6. Give developers exact local commands to inspect `/livez`, `/readyz`, and optional metrics, and
   a numbered manual smoke test proving create, move, and reuse. Provide troubleshooting by observed
   symptom and explicitly state that the outbound Gateway path needs no public inbound endpoint.
7. Run focused documentation tests and `pnpm check`; manually review the safe example and document
   the resulting real-Discord smoke-test prerequisites without recording sensitive values.

## Complexity Tracking

No constitution violations or complexity exceptions require justification.
