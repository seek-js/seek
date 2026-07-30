# Deployment Provider Constraints Research

## Build, Artifact, and Runtime Constraints That Shape Seek.js Compatibility

**Status:** Draft  
**Type:** Research Note  
**Applies To:** Seek.js indexing, hosting, CI/CD integration  
**Related Areas:** `[../../specs/02-cli-contract.md](../../specs/02-cli-contract.md)`, `[../../specs/03-answer-endpoint.md](../../specs/03-answer-endpoint.md)`

**Partially superseded.** The build-step, output-dir, and static-hosting constraints below still bind. The extraction-mode and SaaS-ingestion framing does not; see `[../00-scope-change-2026-07.md](../00-scope-change-2026-07.md)`.

## TL;DR

Provider compatibility not framework-name checklist.  
Compatibility = run inside build/CI, extract locally when possible, emit static artifacts, avoid provider lock-in.

Canonical deployment pattern:

1. install
2. build
3. `seek build ./dist` (Pagefind index bundle + context files)
4. deploy static artifacts
5. deploy the answer endpoint to the same host's free tier

## Compatibility Invariants

Seek.js should remain:

- CLI-first
- build/CI-step friendly
- operating on build output only, never on a live site
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
| SSR and non-static outputs | no guaranteed parseable HTML artifact     | out of scope; input is a directory of built HTML |
| Debuggability in CI        | failures must be actionable from logs     | explicit exit codes + per-file diagnostics      |
| Static hosting bias        | providers best at file artifact deploy    | emit `pagefind/` + `seek/` as plain static files |


## Provider Patterns (Condensed)


| Provider class          | Typical behavior                                         | Design implication                                              |
| ----------------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| Vercel                  | framework auto-detect, SSR-heavy usage, monorepos common | require an explicit HTML output dir; ship an answer-fn template |
| Netlify                 | explicit build/publish dirs, strong static workflows     | strongest default path; ship an answer-fn template              |
| Cloudflare Pages        | explicit output, edge-first mindset                      | keep provider-agnostic outputs, optional edge artifact delivery |
| GitHub Pages (+Actions) | static host, CI often real build surface                 | generic CI support is mandatory baseline                        |
| Generic CI/self-host    | custom paths and strict control                          | fully config-driven behavior required                           |


## Design Guardrails

1. Seek.js must run as build-time/CI-time tool.
2. Seek.js must read build output only; never crawl, render, or boot a server.
3. Seek.js must emit portable static artifacts.
4. Seek.js must not require provider APIs.
5. Seek.js must separate indexing from hosting choice.
6. Seek.js must support explicit path configuration.
7. Seek.js default path must avoid native-install friction.
8. Build-only tooling must stay out of browser bundles.

## Failure Modes to Spec


| Failure mode             | Typical symptom                               | Spec follow-up                          |
| ------------------------ | --------------------------------------------- | --------------------------------------- |
| Build timeout            | deploy fails before indexing finishes         | keep indexing seconds-scale; no LLM at build time |
| Memory spike             | OOM on very large sites                       | rely on Pagefind's streaming index writer |
| Path misconfig           | empty/absent index artifact                   | exit code `1` on `pageCount === 0`      |
| Env drift                | local pass, CI fail                           | runtime compatibility matrix + checks   |
| Missing endpoint secret  | "Ask AI" broken on a deployed site            | component hides "Ask AI" when unconfigured |


## No Hosted Boundary

There is no managed service. Everything ships in the user's own deploy:

1. `seek build` runs in the user's build env
2. artifacts deploy as static files with the site
3. the answer endpoint deploys to the same host's free tier and holds the key

## Open Questions

1. framework-specific output asset placement policy?
2. boundary for optional provider-specific DX helpers before lock-in?
3. which hosts need an answer-endpoint template beyond Cloudflare, Vercel, and Netlify?

## Feeds Into Specs

- `[../../specs/02-cli-contract.md](../../specs/02-cli-contract.md)`
- `[../../specs/03-answer-endpoint.md](../../specs/03-answer-endpoint.md)`

## Conclusion

Provider constraints do not force provider lock-in.  
They force disciplined pipeline:

- build/CI compatible
- build-output-only input
- static artifact outputs
- endpoint deployed by the user, on their host

More Seek.js behaves like portable build artifact system, more universal deployment compatibility it gets.