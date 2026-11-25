# Product development plan

Each round completes one feature or repair. Future items are planned, not implemented claims.

## Current round

continue-implementation

## Roadmap

### continue-implementation — Continue implementation and resolve known failures

Status: done

Acceptance:
- Run checks, fix failures, and implement the next planned feature
- npm test runs the full suite (20 tests) and passes

Implementation: `scripts/inspect.mjs`, `lib/inspection-files.mjs`, `lib/probe.mjs`, `lib/server.mjs`

Tests: `tests/inspection-files.test.mjs`, `tests/inspect.test.mjs`

