# Seek.js Research Map

Research = reasons, tradeoffs, experiments.

## Folder Map

| Area          | Purpose                                                                 | Start here                                     |
| ------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| `extractor/`  | extraction strategy, SSR/static/crawl tradeoffs, parser/runtime choices | `[extractor/README.md](extractor/README.md)`   |
| `platform/`   | deployment constraints and CI behavior                                  | `[platform/README.md](platform/README.md)`     |
| `publishing/` | docs publishing and `seek` to website sync operations                   | `[publishing/README.md](publishing/README.md)` |
| `tooling/`   | toolchain rationale and implementation research                     | `[tooling-toolchain-implementation-research.md](tooling-toolchain-implementation-research.md)` |

## Read Paths

### Path A: New architect

1. `[../README.md](../README.md)`
2. `[extractor/01-extraction-strategy-landscape.md](extractor/01-extraction-strategy-landscape.md)`
3. `[extractor/02-ssr-and-local-render-fetch.md](extractor/02-ssr-and-local-render-fetch.md)`
4. `[platform/01-deployment-provider-constraints.md](platform/01-deployment-provider-constraints.md)`
5. matching contracts in `[../specs/extractor/](../specs/extractor/)`

### Path B: Contributor picking task

1. subfolder README (`extractor`, `platform`, or `publishing`)
2. target deep research file
3. mapped spec file in `../specs/`

### Path C: Tooling contributor

1. `[tooling-toolchain-implementation-research.md](tooling-toolchain-implementation-research.md)`
2. `[../specs/02-phase1-toolchain-implementation-spec.md](../specs/02-phase1-toolchain-implementation-spec.md)`

## Decision Handoff Rule

Keep doc in `research/` if content is exploratory/comparative.  
Move to `specs/` when content becomes prescriptive and implementation-critical.

## Maintenance Rule

- Keep long reasoning in deep docs.
- Keep this file as navigation map only.
- Add new research file to map + read path immediately.
