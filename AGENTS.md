# AGENTS.md

Guidance for coding agents working in this repository.

Seek is pre-alpha: the packages under `packages/` are placeholders and nothing is
published. Read [`specs/01-architecture.md`](specs/01-architecture.md) for the
v1 architecture, and
[`research/00-scope-change-2026-07.md`](research/00-scope-change-2026-07.md)
before assuming anything about the older extractor/compiler design.

## Agent skills

### Issue tracker

Issues live as GitHub issues in `seek-js/seek`, driven via the `gh` CLI.
See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name.
See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root.
See `docs/agents/domain.md`.
