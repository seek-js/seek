# Seek.js Research Map

Research = reasons, tradeoffs, experiments.

## Start Here

`[00-scope-change-2026-07.md](00-scope-change-2026-07.md)` — why Seek stopped being a search
engine and became an integration layer over Pagefind. Read it before anything else in this
folder; it is what invalidated the extractor research that used to live here.

## Folder Map

| Area          | Purpose                                                             | Start here                                                                                     |
| ------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `platform/`   | deployment constraints and CI behavior                              | `[platform/README.md](platform/README.md)`                                                     |
| `publishing/` | docs publishing operations                                          | `[publishing/README.md](publishing/README.md)`                                                 |
| root files    | scope decisions and package publishing workflow                     | `[implementation-package-publishing-workflow.md](implementation-package-publishing-workflow.md)` |

## Read Paths

### Path A: New architect

1. `[../README.md](../README.md)`
2. `[00-scope-change-2026-07.md](00-scope-change-2026-07.md)`
3. `[../specs/01-architecture.md](../specs/01-architecture.md)`
4. `[platform/01-deployment-provider-constraints.md](platform/01-deployment-provider-constraints.md)`

### Path B: Contributor picking task

1. `[00-scope-change-2026-07.md](00-scope-change-2026-07.md)` for what is and is not in scope
2. subfolder README (`platform` or `publishing`)
3. mapped spec file in `[../specs/](../specs/README.md)`

### Path C: Tooling contributor

1. `[implementation-package-publishing-workflow.md](implementation-package-publishing-workflow.md)`
2. `[../specs/toolchain-spec.md](../specs/toolchain-spec.md)`
3. `[../specs/turbo-spec.md](../specs/turbo-spec.md)`

## Decision Handoff Rule

Keep doc in `research/` if content is exploratory/comparative.  
Move to `specs/` when content becomes prescriptive and implementation-critical.

## Maintenance Rule

- Keep long reasoning in deep docs.
- Keep this file as navigation map only.
- Add new research file to map + read path immediately.
- Record a scope reversal as a dated decision record, never as an edit that erases the prior
  reasoning.
