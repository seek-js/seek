# SSR and Local Render Fetch Research

## Why SSR-Safe Local Extraction Is Essential for Seek.js

**Status:** Research  
**Area:** Extractor  
**Related Specs:** `../../specs/extractor/01-hybrid-extraction-architecture.md`

## TL;DR

Static artifact parsing alone cannot cover modern SSR frameworks.  
Local Render Fetch is required core compatibility layer: run production server locally, fetch rendered HTML over localhost, normalize output into `Seek Manifest`.

## Scope

This doc focuses only on SSR problem and Local Render Fetch rationale.  
General multi-mode strategy is canonical in `01-extraction-strategy-landscape.md`.

## Problem Statement

In SSR frameworks, build output often contains server/runtime artifacts, not universally parseable final HTML pages.

Typical SSR reality:

- server bundles and route manifests
- framework internals (e.g. RSC payload boundaries)
- mixed rendering modes
- final content visible only when app runs

Result: static-folder-only extraction misses major share of valid sites.

## Core Insight

Seek extraction target is final user-visible HTML, not internal build artifact shape.  
For SSR, that HTML is often best obtained by local render fetch.

## Local Render Fetch Model

1. build app
2. start production server locally
3. wait for readiness
4. discover routes from controlled inputs
5. fetch local routes
6. parse/normalize into `Seek Manifest`

Important: this is local acquisition mode, not internet crawl.

## Why Local Render Fetch > Remote Crawl for SSR


| Dimension        | Local Render Fetch       | Remote Crawl           |
| ---------------- | ------------------------ | ---------------------- |
| Network boundary | local process            | public/preview network |
| Auth complexity  | low                      | medium-high            |
| Determinism      | higher                   | lower                  |
| Debuggability    | high (same env as build) | lower (env drift)      |
| Cost             | lower                    | higher                 |
| CI ergonomics    | single-job friendly      | operationally heavier  |


Conclusion: remote crawl remains fallback, not first SSR answer.

## Why Not Headless First

If SSR endpoint already returns meaningful HTML, headless adds unnecessary cost.

Headless-first downsides:

- startup/memory overhead
- more flakes
- lower CI efficiency

Preferred escalation order (SSR context):

1. static parse when valid
2. local render fetch
3. headless only when fetched HTML insufficient
4. remote crawl only when local modes unavailable

## Framework-Class Mapping


| Class                           | Examples                                        | Best local path                         |
| ------------------------------- | ----------------------------------------------- | --------------------------------------- |
| SSR frameworks                  | Next App Router, Remix, Nuxt SSR, SvelteKit SSR | Local Render Fetch                      |
| shell-heavy SSR or hybrid pages | SSR route returns low-content shell             | Local Render Fetch -> Headless fallback |


## Route Discovery for Local Render Fetch

Local fetch must use controlled route inputs, not blind crawl-first behavior.

Preferred route input precedence:

1. explicit user route list
2. sitemap
3. framework/source hints
4. project config
5. internal link discovery
6. framework manifests when stable

## HTML Sufficiency Gate

Fetched HTML should pass sufficiency checks before accept.

Likely sufficient signals:

- content root (`main`/`article`)
- meaningful text length
- heading structure exists
- canonical metadata present or inferable

Likely insufficient signals:

- mostly scripts + mount div
- very low text density
- absent content structure

If insufficient -> escalate to local headless mode.

## Operational Needs (Spec Inputs)

Local Render Fetch requires explicit lifecycle controls:

- start command
- readiness URL/check
- startup timeout
- per-route timeout
- fetch concurrency
- include/exclude patterns
- fallback behavior on insufficiency
- clean teardown

## Risks


| Risk                      | Impact                               | Mitigation direction                    |
| ------------------------- | ------------------------------------ | --------------------------------------- |
| server lifecycle failures | extraction never starts or hangs     | readiness + timeout + teardown contract |
| env assumptions missing   | local render fails despite valid app | explicit env validation and diagnostics |
| route instability         | partial coverage                     | route precedence and conflict rules     |
| streaming SSR timing      | incomplete HTML capture              | stable-response criteria                |
| normalization drift       | mode-specific output inconsistency   | shared parser/normalization pipeline    |


## Recommendation

Treat Local Render Fetch as first-class mode in extractor architecture and probe order for SSR frameworks.  
Do not demote SSR support to remote crawl default.

## Spec Follow-ups

- probe and pivot mode selection rules
- route discovery precedence/merge policy
- HTML sufficiency thresholds
- failure/retry/timeout behavior
- performance budgets for local render mode

## One-Sentence Takeaway

SSR compatibility for Seek.js is local rendered-output acquisition problem first, remote crawl problem second.