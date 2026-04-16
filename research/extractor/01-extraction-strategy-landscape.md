# Extraction Strategy Landscape

## Research Notes for Seek.js Content Acquisition

**Status:** Draft  
**Type:** Research  
**Area:** `extractor`  
**Related Specs:** `../../specs/extractor/01-hybrid-extraction-architecture.md`

## TL;DR

No single extraction mode covers static + SSR + SPA + docs systems.  
Best strategy: local-first multi-mode acquisition with deterministic escalation, all modes normalized into `Seek Manifest`.

## Scope

This doc defines:

- strategy-level mode landscape
- comparative tradeoffs
- recommended role per mode
- v1 baseline stance
- open questions for later specs

This doc does not define exact contracts.  
Normative behavior belongs in `../../specs/extractor/`.

## Evaluation Criteria

Use same criteria for every mode:

- content fidelity (user-visible text + URL/anchors)
- operational cost (time/compute/network/CI burden)
- portability (framework/runtime/provider compatibility)
- adoption friction (config/setup burden)
- determinism (repeatability in CI/local)
- scalability (large pages/locales/versions)

## Mode Landscape

| Mode                    | Best fit                                 | Strength                                   | Weakness                                        | Recommended role                         |
| ----------------------- | ---------------------------------------- | ------------------------------------------ | ----------------------------------------------- | ---------------------------------------- |
| Source adapters         | MDX/Markdown docs ecosystems             | highest semantic cleanliness               | ecosystem coupling, not universal               | high-fidelity specialization             |
| Static artifact parsing | true static builds                       | fast, cheap, deterministic                 | fails when artifacts not meaningful HTML        | default fast local path                  |
| Local render fetch      | SSR frameworks                           | bridges SSR artifact gap, still local      | server lifecycle and route discovery complexity | default SSR path                         |
| Local headless render   | shell-heavy/client-rendered pages        | captures final DOM when fetch insufficient | expensive, slow, brittle                        | strict local fallback                    |
| Remote crawl            | inaccessible local builds/external sites | broad reach                                | highest ops cost and instability                | controlled fallback/premium managed path |

## Strategy Decision

### Why single-mode fails

- Source-only: misses non-source-native and runtime-injected content.
- Static-only: fails on SSR systems without final build HTML.
- Local-fetch-only: fails on shell-only pages.
- Headless-only: too expensive as default.
- Remote-crawl-only: high cost, auth friction, unstable previews.

### Current best strategy

1. source adapter (when high-fidelity docs source available)
2. static artifact parse (when final HTML artifacts exist)
3. local render fetch (when SSR runtime required)
4. local headless render (when shell detection triggers)
5. remote crawl (only when local paths unavailable or explicitly chosen)

## Local-First Principle

Local-first wins because it:

- keeps extraction deterministic in build/CI
- reduces network/auth complexity
- lowers SaaS and crawl operations cost
- improves debugging reproducibility
- preserves provider agnosticism

## Seek Manifest Role

Multi-mode strategy only works with one normalized output contract.

Without shared manifest:

- compiler behavior drifts per mode,
- parity testing collapses,
- SaaS/local pipelines diverge.

With shared manifest:

- compiler remains stable,
- cross-mode quality comparison is possible,
- new acquisition modes can be added without re-architecting pipeline.

## v1 Stance

### Must include

- static artifact parsing
- local render fetch
- normalized manifest output
- remote crawl fallback (non-default)
- build/runtime portability constraints

### High-value additions

- source adapters for docs ecosystems
- headless fallback for shell-only pages
- route discovery precedence strategy
- shell detection heuristics

### Avoid as product identity

- framework lock-in
- deep bundler coupling
- remote crawl as default
- always-on browser rendering path

## Risks and Failure Areas

| Risk area                 | Symptom                    | Mitigation direction                        |
| ------------------------- | -------------------------- | ------------------------------------------- |
| Route discovery conflicts | missing/duplicate pages    | precedence rules + canonical resolution     |
| Shell detection errors    | empty/noisy extraction     | explicit heuristics + escalation thresholds |
| SSR runtime failures      | local fetch instability    | startup/readiness/timeout contracts         |
| Mode overuse cost         | slow CI/builds             | deterministic escalation and budgets        |
| Mode divergence           | inconsistent index quality | strict manifest invariants + parity tests   |

## Open Questions

1. source adapter fidelity vs final rendered truth reconciliation?
2. canonical route precedence when sitemap/links/canonical/source disagree?
3. exact shell-detection thresholds for fetch -> headless escalation?
4. extractor vs compiler ownership boundary for chunking hints?
5. throughput/memory/timeout budgets by mode for large docs sites?

## Feeds Into Specs

- `../../specs/extractor/01-hybrid-extraction-architecture.md`
- `../../specs/extractor/02-seek-manifest-schema.md`
- `../../specs/extractor/03-extractor-compiler-contract.md`
- `../../specs/extractor/04-probe-and-pivot-strategy.md`
- `../../specs/extractor/05-route-discovery-and-conflict-resolution.md` (planned)

## Working Principle

Extract from best available local representation of what users read.  
Escalate only when lighter reliable mode fails.
