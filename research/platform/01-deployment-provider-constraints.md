# Deployment Provider Constraints Research

## Build, Artifact, and Runtime Constraints That Shape Seek.js Compatibility

**Status:** Draft  
**Type:** Research Note  
**Applies To:** Seek.js extraction, compilation, hosting, CI/CD integration  
**Related Areas:** `specs/extractor/`, Seek.js SaaS ingestion model

## TL;DR

Provider compatibility not framework-name checklist.  
Compatibility = run inside build/CI, extract locally when possible, emit static artifacts, avoid provider lock-in.

Canonical deployment pattern:

1. install
2. build
3. extract (best local mode)
4. compile `.msp` locally or upload manifest to SaaS compile
5. deploy static artifacts

## Compatibility Invariants

Seek.js should remain:

- CLI-first
- build/CI-step friendly
- local-first for extraction
- static-artifact-first for outputs
- provider-agnostic
- configurable for monorepo paths
- conservative on native install/runtime assumptions

## Constraint Matrix


| Constraint theme           | Why it matters                            | Guardrail                                       |
| -------------------------- | ----------------------------------------- | ----------------------------------------------- |
| Build-step insertion       | all providers expose build command model  | no daemon; scriptable CLI                       |
| Bounded build env          | time/memory/process limits                | predictable mode selection; bounded concurrency |
| Output dir variance        | `dist`/`build`/custom/monorepo path drift | explicit input/output config                    |
| SSR and non-static outputs | no guaranteed parseable HTML artifact     | support local render fetch + headless fallback  |
| Debuggability in CI        | failures must be actionable from logs     | explicit phase diagnostics + mode trace         |
| Static hosting bias        | providers best at file artifact deploy    | emit `.msp` + optional sidecars                 |


## Provider Patterns (Condensed)


| Provider class          | Typical behavior                                         | Design implication                                              |
| ----------------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| Vercel                  | framework auto-detect, SSR-heavy usage, monorepos common | do not assume static HTML exists; local render fetch critical   |
| Netlify                 | explicit build/publish dirs, strong static workflows     | artifact parsing + local compile strong default                 |
| Cloudflare Pages        | explicit output, edge-first mindset                      | keep provider-agnostic outputs, optional edge artifact delivery |
| GitHub Pages (+Actions) | static host, CI often real build surface                 | generic CI support is mandatory baseline                        |
| Generic CI/self-host    | custom paths and strict control                          | fully config-driven behavior required                           |


## Design Guardrails

1. Seek.js must run as build-time/CI-time tool.
2. Seek.js must prefer local extraction before remote crawl.
3. Seek.js must emit portable static artifacts.
4. Seek.js must not require provider APIs.
5. Seek.js must separate extraction/compile from hosting choice.
6. Seek.js must support explicit path configuration.
7. Seek.js default path must avoid native-install friction.
8. Build-only tooling must stay out of browser bundles.

## Failure Modes to Spec


| Failure mode             | Typical symptom                               | Spec follow-up                          |
| ------------------------ | --------------------------------------------- | --------------------------------------- |
| Build timeout            | deploy fails before extraction/compile finish | performance targets + mode budgets      |
| Memory spike             | OOM on headless or heavy mode                 | fallback policy + concurrency caps      |
| Path misconfig           | empty/absent index artifact                   | path validation + fail-fast diagnostics |
| Local server boot fail   | render-fetch mode stuck                       | startup/readiness/teardown contract     |
| Env drift                | local pass, CI fail                           | runtime compatibility matrix + checks   |
| SaaS upload/compile fail | broken managed flow in CI                     | escalation + fallback rules             |


## SaaS Boundary from Provider Research

Best managed flow:

1. local extraction in user build env
2. manifest upload
3. SaaS compile/hosting optional
4. client fetches hosted `.msp`

Remote crawling remains secondary fallback path, not default.

## Open Questions

1. mode-specific timeout and memory budgets?
2. canonical readiness model for local render fetch?
3. CI behavior when SaaS compile fails?
4. framework-specific output asset placement policy?
5. boundary for optional provider-specific DX helpers before lock-in?

## Feeds Into Specs

- `specs/extractor/04-probe-and-pivot-strategy.md`
- `specs/extractor/06-failure-handling-and-recovery.md` (planned)
- `specs/extractor/09-performance-targets.md` (planned)
- future compile/hosting integration specs

## Conclusion

Provider constraints do not force provider lock-in.  
They force disciplined pipeline:

- build/CI compatible
- local-first extraction
- static artifact outputs
- optional managed compile

More Seek.js behaves like portable build artifact system, more universal deployment compatibility it gets.