# Seek.js Specs

Specs define implementation contracts.  
If code must obey it, it belongs here.

## Status Vocabulary

- `Draft`: early, not safe to implement against.
- `Proposed`: review-ready, not final.
- `Accepted`: implementation source of truth.
- `Deprecated`: obsolete, kept for history.

## Scope

Put doc in `specs/` when it defines:

- data contracts and schemas
- package boundaries
- invariants and failure behavior
- compatibility and version rules
- measurable targets

Keep exploratory reasoning in `research/`.

## Index

| File                                                                             | Defines                                                | Status     |
| -------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------- |
| `[01-architecture.md](01-architecture.md)`                                       | v1 pipeline, package layout, architecture decisions    | `Accepted` |
| `[02-cli-contract.md](02-cli-contract.md)`                                       | `seek build <dir>` flags and emitted artifacts         | `Proposed` |
| `[03-answer-endpoint.md](03-answer-endpoint.md)`                                 | serverless answer contract, security, caching          | `Proposed` |
| `[04-component-contract.md](04-component-contract.md)`                           | `<seek-search>` and `useSeek()` API, quality budgets   | `Proposed` |
| `[05-grounding-and-failure-modes.md](05-grounding-and-failure-modes.md)`         | citation scheme, refusal rule, failure-path matrix     | `Accepted` |
| `[toolchain-spec.md](toolchain-spec.md)`                                          | workspace, build, quality, validation, release         | see file   |
| `[turbo-spec.md](turbo-spec.md)`                                                  | task graph, caching, and pipeline contracts            | see file   |

## Read Order

1. `[01-architecture.md](01-architecture.md)` for the pipeline and the decisions.
2. `[02-cli-contract.md](02-cli-contract.md)` for what the build emits.
3. `[03-answer-endpoint.md](03-answer-endpoint.md)` for what consumes it.
4. `[04-component-contract.md](04-component-contract.md)` for the user-facing surface.
5. `[05-grounding-and-failure-modes.md](05-grounding-and-failure-modes.md)` last; it overrides
   the `Proposed` specs where they conflict.

## Superseded

The `specs/extractor/` set (hybrid extraction architecture, `Seek Manifest` schema,
extractor/compiler contract, probe-and-pivot, source adapters, route discovery, chunking,
performance budgets) was removed in 2026-07. So was `research/plan.md` and the
`research/extractor/` set.

- Reasoning, corrected arithmetic, and the full cut list:
  `[../research/00-scope-change-2026-07.md](../research/00-scope-change-2026-07.md)`.
- The files themselves: `git log --diff-filter=D --name-only -- specs/extractor research/extractor`.

Do not resurrect a removed spec without adding a decision record that reverses the relevant
decision in `[01-architecture.md](01-architecture.md)`.
