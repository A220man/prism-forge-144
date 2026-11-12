# Changelog

## 1.0.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

Version 0.1.0 - 2026-11-12
- Core inspect CLI: local file serving, screenshot capture, design probes
- Eyebrow rule: detects kicker labels, skips figcaption and scrolling content
- Concurrent output: per-target directories for screenshot isolation
- Root flag: explicit --root for asset serving, solves #179
- Color contrast probe: WCAG AA/AAA accessibility checks
- Workrr cert: GitHub Actions certificate for supply chain verification

Previous version: 0.0.2 - design-taste-frontend alignment
- Fixed root-relative asset serving with --root flag
- Fixed per-target output directories
- Fixed eyebrow detection to skip figcaption and scrolling items