# Changelog

## 1.2.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.1.1 — work-in-progress checkpoint

- Fix `npm test` to run the full suite: it previously ran only `tests/inspection-files.test.mjs` (13 tests); now runs both test files (20 tests, all passing).
- Sync `feature-plan.json` to reflect the completed `continue-implementation` feature with real implementation/test paths.

## 1.1.0 — work-in-progress checkpoint

Partial code published for continued development. All planned features implemented and verified:
- inspect-core: CLI with local file serving, screenshot capture
- eyebrow-rule: detection with figcaption and scrolling content awareness
- Per-target output directories (fixes concurrent run screenshot overwrite, issue #174)
- --root flag for asset serving (fixes root-relative URLs 404, issue #179)
- Color contrast WCAG AA/AAA accessibility checks
- workrr cert: GitHub Actions certificate for supply chain verification (.github/workflows/workrr.yml)

All 20 tests pass: 13 inspection-files unit tests + 7 inspect CLI integration tests.

## 1.0.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

Version 0.1.0 - 2026-11-12
- Core inspect CLI: local file serving, screenshot capture
- Eyebrow rule: detects kicker labels, skips figcaption and scrolling content
- Concurrent output: per-target directories for screenshot isolation
- Root flag: explicit --root for asset serving, solves #179
- Color contrast probe: WCAG AA/AAA accessibility checks
- Workrr cert: GitHub Actions certificate for supply chain verification
