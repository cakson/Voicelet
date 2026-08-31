# Quickstart: Validate Temporary Room Lifecycle

## Prerequisites

- Supported Node.js and pnpm versions from `package.json`.
- `pnpm install --frozen-lockfile` has completed.
- Automated validation requires no Discord credential or live server.

## Validate Configuration

1. Inspect `.env.example` and its `TEMPORARY_ROOM_CONFIG` mapping.
2. Confirm an omitted `inactivityTimeoutMinutes` defaults to 60 minutes.
3. For a real local test only, use a small whole-minute value from 1–1,440 in ignored `.env`; never track development identifiers or tokens.
4. Run `pnpm test:integration`; valid defaults/boundaries load while malformed, fractional, out-of-range, and non-number values fail redaction-safely.

## Validate the Deterministic Lifecycle

```sh
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

The simulator must demonstrate creation, empty-period start, rejoin cancellation, a later fresh empty period, deletion after controlled expiry, association cleanup, and creator recreation. It must also prove a failed deletion retries after exactly 15 simulated minutes only while empty, external deletion cleans state, and failed movement does not invalidate an existing association.

## Final Gate

Run `pnpm check`. For a live manual check, use `docs/local-discord-development.md`; verify only configured managed rooms are removed after their continuous-empty duration.
