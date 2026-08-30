<!--
Sync Impact Report
- Version change: 1.0.0 -> 2.0.0
- Modified principles:
  - User Intent and Consent First -> removed; requirements are superseded by this engineering constitution
  - Privacy and Security by Design -> VI. Security by Default
  - Accessible, Reliable Core Experience -> removed; requirements are superseded by this engineering constitution
  - Testable Changes and Regression Protection -> I. Testability
  - Simple, Observable Evolution -> III. Explicit Architecture and VII. Actionable Observability
- Added principles: II. Enforced Quality Gates, IV. Documentation as Deliverable,
  V. Explicit API Contracts, VIII. Reproducible Repository, IX. Definition of Done
- Added sections: Engineering Standards; Development Workflow and Definition of Done
- Removed sections: Product & Data Constraints
- Follow-up TODOs: TODO(RATIFICATION_DATE): The original adoption date is not recorded in the repository.
-->
# Voicelet Constitution

## Core Principles

### I. Testability
All business logic MUST have automated unit tests. Integration boundaries MUST have integration
tests, and critical user journeys MUST have end-to-end tests. A feature is incomplete when any
required test is absent. Rationale: layered automated coverage provides reliable evidence that the
system works within its domain, across boundaries, and for its users.

### II. Enforced Quality Gates
Linting, type checking, unit and integration tests, and builds MUST pass before merge. End-to-end
tests MUST pass for every affected critical flow. CI is the authoritative enforcement point for
these gates; local checks are a fast feedback mechanism, not a replacement. Rationale: a consistent
merge bar protects the shared codebase from preventable regressions.

### III. Explicit Architecture
Implementations MUST favor simple, explicit designs. New abstractions MUST solve an existing,
demonstrated need rather than a speculative future need. Domain and business logic MUST remain
independent of infrastructure where practical, and dependencies MUST flow in clearly defined,
documented directions. Rationale: explicit boundaries keep change understandable and maintainable.

### IV. Documentation as Deliverable
The README MUST enable a new engineer to run the project. Development and testing workflows MUST
be documented. Non-obvious architectural decisions MUST be recorded near the code or in an
architecture decision record, and documentation affected by a change MUST be updated in the same
change. Rationale: accurate documentation makes the project operable by the whole team.

### V. Explicit API Contracts
APIs MUST define explicit contracts, validate all inputs, and return predictable failure behavior.
Breaking API changes require explicit approval and a documented migration or compatibility plan
before merge. Rationale: contracts protect consumers and make integrations safe to evolve.

### VI. Security by Default
Secrets MUST NEVER be committed to source control, emitted in logs, or exposed to clients.
Implementations MUST use least-privilege access and validate untrusted input. Authentication and
authorization behavior MUST have automated tests. Rationale: secure defaults limit the impact of
errors and protect users and systems.

### VII. Actionable Observability
Production services MUST provide actionable, privacy-safe logging, and important failures MUST be
observable. New critical operations MUST include appropriate metrics, tracing, or both. Logs and
telemetry MUST NOT contain secrets or sensitive user content unless explicitly authorized and
protected. Rationale: teams must be able to detect, diagnose, and resolve production failures.

### VIII. Reproducible Repository
All build, test, lint, type-check, and development commands MUST be reproducible from the
repository’s documented setup. Dependencies MUST use lock files and changes to dependencies MUST
update the applicable lock file. Rationale: reproducibility eliminates environment-specific quality
gaps and makes CI results trustworthy.

### IX. Definition of Done
A task is complete only when its implementation and required tests are complete, linting,
type-checking, and builds pass, affected documentation is updated, and no known requirement remains
unimplemented. Rationale: completion is an evidence-based quality decision, not merely code written.

## Engineering Standards

Each change MUST identify its affected quality gates, test layers, API contracts, security impact,
observability needs, and documentation impact. Reviews MUST reject changes that lack required
evidence or an explicitly approved, time-bound exception. Exceptions MUST name an owner, risk,
remediation plan, and expiration date.

## Development Workflow and Definition of Done

User-visible, cross-cutting, API, security, and architectural changes MUST begin with a written
specification and an implementation plan. Before merge, CI MUST pass all applicable quality gates
and reviewers MUST verify compliance with this constitution. Release changes that affect stored
data, public contracts, or critical flows MUST document migration and rollback considerations.

## Governance

This constitution supersedes conflicting engineering practices. Amendments MUST update this file,
include a Sync Impact Report, and receive review before adoption. Versioning follows semantic
versioning: MAJOR for incompatible principle removals or redefinitions, MINOR for new principles or
materially expanded governance, and PATCH for clarifications that preserve intent. Every
specification, plan, implementation review, and release review MUST assess compliance; unresolved
deviations MUST be documented with their risk, owner, and expiration or remediation date.

**Version**: 2.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date unknown |
**Last Amended**: 2026-08-30
