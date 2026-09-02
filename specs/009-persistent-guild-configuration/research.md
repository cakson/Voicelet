# Research: Persistent Guild Configuration

## Official server client

**Decision**: Use `@google-cloud/firestore` only under `src/infrastructure/firestore`.

**Rationale**: Google identifies it as the Node.js Firestore client. Voicelet is a Node server
worker, so production uses standard runtime Application Default Credentials, not credentials embedded
in code or the image.

**Alternatives**: Firebase web SDK and REST calls were rejected because they add inappropriate client
concerns or custom provider transport. A second adapter is deferred because the port is sufficient.

## Official emulator and CI lifecycle

**Decision**: Commit Firestore-only `firebase.json`; invoke a pinned Firebase CLI with
`firebase emulators:exec --only firestore` for integration/E2E scripts.

**Rationale**: Firebase documents `emulators:exec` as appropriate for CI because it starts configured
emulators for a command and terminates them afterwards. A disposable project and deterministic test
values avoid stale data, production credentials, and production access.

**Alternatives**: A shared manually started emulator is nondeterministic; third-party emulators and
production testing violate requirements.

## Emulator routing

**Decision**: Route the server client through `FIRESTORE_EMULATOR_HOST` only when explicitly set by
local/test runtime configuration.

**Rationale**: Google documents this environment variable for server clients. The same repository
port then works with emulator and production without application-level provider branching.

## Data and failures

**Decision**: One versioned scalar document per guild; port results are `found`, `not_found`,
`invalid`, and `unavailable`.

**Rationale**: Plain values preserve application meaning for later PostgreSQL/MongoDB/export use.
Firestore timestamps, references, transforms, transactions, auto IDs, and listeners are unnecessary.
Invalid data is distinct from absence; provider errors never escape the adapter. Failure makes
readiness unhealthy and the next successful read restores it.

## Sources

- [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Firebase emulator configuration and CI](https://firebase.google.com/docs/emulator-suite/install_and_configure?hl=en)
- [Firestore emulator server-client routing](https://docs.cloud.google.com/firestore/native/docs/emulator?authuser=6)
- [Google Cloud Node.js client libraries](https://docs.cloud.google.com/nodejs/docs/reference)
