# Parser Runtime Evaluation

## Research Notes for the Seek.js Extraction Layer

**Status:** Draft  
**Type:** Research  
**Area:** `extractor`  
**Related Specs:** `../../specs/extractor/01-hybrid-extraction-architecture.md`

## TL;DR

For `v1`, best parser/runtime strategy is portability-first distribution: `html-rewriter-wasm`.  
Keep internal engine abstraction so direct `lol-html` (or other engine) can replace later if measured need appears.

## Scope

This doc evaluates parser/runtime engine choice only.  
Acquisition mode strategy lives in `01` and `02`.

## Decision Criteria

- runtime portability (Node/Bun/Deno/CI)
- installation friction
- build-time isolation from client bundles
- parsing model fit for structural extraction
- operational reliability in CI/local
- long-term swappability

## Candidates

- `html-rewriter-wasm` (portable WASM distribution)
- direct `lol-html` integration (native/low-level path)
- DOM-only parsing (supporting utility, not primary choice)
- headless-browser-as-parser (fallback tool, not primary parser layer)

## Comparative Scorecard


| Dimension                   | `html-rewriter-wasm` | direct `lol-html` | DOM-only parser | headless primary |
| --------------------------- | -------------------- | ----------------- | --------------- | ---------------- |
| Node portability            | strong               | medium            | strong          | strong           |
| Bun portability             | strong               | medium            | strong          | medium           |
| Deno portability            | strong               | weak/medium       | strong          | weak/medium      |
| install friction            | low                  | high              | low             | high             |
| native toolchain dependency | no                   | usually yes       | no              | no               |
| CI friendliness             | strong               | medium            | strong          | weak/medium      |
| parsing model fit           | strong               | strong            | medium          | indirect         |
| peak throughput ceiling     | medium/high          | high              | medium          | low              |
| v1 suitability              | excellent            | poor/medium       | medium          | poor             |


## Recommendation

### Adopt now

- `html-rewriter-wasm`
- build-time package isolation
- internal parser-engine boundary

### Keep as reserve options

- direct `lol-html`
- custom maintained WASM wrapper
- Rust-core extractor path for future high-scale SaaS workloads

## Why `html-rewriter-wasm` Wins Now

1. best portability/adoption tradeoff for current stage
2. lowest install friction in mixed CI/runtime environments
3. keeps one implementation surface for faster iteration
4. preserves compatible parsing model without native-first ops burden

## Why Direct `lol-html` Not Default Yet

- higher packaging/distribution burden
- bigger support matrix too early
- front-loads native infra work before evidence of bottleneck
- risks slowing extraction-quality progress

## Engine Boundary Requirement

Extractor architecture should isolate:

- HTML input acquisition
- parser initialization
- structural traversal
- root/heading/anchor extraction
- normalized record emission

So engine swap does not force rewrite of route discovery, normalization, or compiler contracts.

## Risks of Current Recommendation


| Risk                                | Impact                        | Mitigation                              |
| ----------------------------------- | ----------------------------- | --------------------------------------- |
| lower peak throughput vs native     | large-scale runtime ceiling   | benchmark gates + migration trigger     |
| wrapper maintenance risk            | dependency stagnation         | internal abstraction + replacement path |
| overconfidence in HTML parser layer | ignores source/headless needs | keep multi-mode extractor architecture  |


## Revisit Triggers

Re-open decision if:

1. `html-rewriter-wasm` becomes proven bottleneck in representative workloads.
2. portability/CI problems exceed expected baseline.
3. better maintained portable wrapper appears.
4. Seek SaaS workload justifies native throughput ROI.
5. project shifts toward Rust-core extractor strategy.

## Package/Repo Implications

- parser remains build-time only (`@seekjs/extractor` boundary)
- parser choice not part of public contract
- consumer contract remains extraction behavior + manifest output

## Spec Follow-ups

- parser-engine decision spec (planned)
- performance targets spec (planned)
- failure handling and recovery spec (planned)

## Conclusion

`html-rewriter-wasm` is pragmatic `v1` choice because portability + adoption speed matter more now than native peak throughput.  
Decision stays safe because architecture preserves parser swappability.