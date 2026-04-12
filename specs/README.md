# Seek.js Engineering Specifications

This directory contains implementation-oriented specifications for Seek.js.

Unlike exploratory research notes, the documents in `specs/` are intended to define the contracts, boundaries, and decision records that implementation teams can build against with confidence.

## Purpose

The goal of `specs/` is to answer questions like:

- What exactly are we building?
- What contracts exist between packages?
- What is considered in-scope for `v1`?
- What assumptions are stable enough to implement?
- Where should future contributors look before making architectural changes?

These documents are more concrete than research notes and more internal than public product documentation.

## Relationship to Other Directories

### `research/`
Use `research/` for:
- early exploration
- technology comparisons
- alternative approaches
- market and ecosystem findings
- unresolved questions
- rationale gathering before a decision is made

### `specs/`
Use `specs/` for:
- accepted or near-accepted architecture
- package boundaries
- schemas and contracts
- operational rules
- failure handling
- performance targets
- testing strategy
- implementation guidance

### `docs/`
Use `docs/` for:
- future user-facing documentation
- product docs
- SDK usage guides
- integration guides
- content intended for the landing site or documentation site

## How to Read These Specs

Start with the top-level architecture document for the subsystem you are working on, then move into the narrower contract documents.

Recommended reading pattern:

1. subsystem architecture
2. schema and contract docs
3. operational rules
4. testing and validation docs
5. implementation ADRs and engine-specific decisions

## Current Spec Areas

### `extractor/`
Specifications for the extraction pipeline, including:
- hybrid extraction architecture
- manifest design
- extractor/compiler boundary
- route discovery
- failure handling
- chunking
- i18n/versioning
- performance and validation strategy
- parser engine decisions

## Spec Writing Guidelines

When adding a new spec:

- prefer one focused topic per file
- make the status explicit (`Draft`, `Proposed`, `Accepted`, `Deprecated`)
- explain both the decision and the reasoning behind it
- define clear boundaries between subsystems
- write in a way that implementation teams can act on
- link to relevant research when the decision depends on prior investigation

## Suggested Status Meanings

- `Draft` — early and incomplete, not safe to implement against
- `Proposed` — reviewed enough for discussion and refinement
- `Accepted` — stable enough to guide implementation
- `Deprecated` — retained for history, no longer current

## Design Principle

Seek.js should prefer specifications that are:

- portable across runtimes and deployment providers
- explicit about contracts and failure modes
- grounded in real framework constraints
- informed by research, not detached from it
- evolvable without forcing unnecessary rewrites

## Near-Term Plan

The highest-priority spec work currently lives under `specs/extractor/`, because extraction is the foundation of the entire Seek.js pipeline.

If extraction quality, URL fidelity, or normalization contracts are weak, every later stage becomes unreliable:
- chunking
- vectorization
- indexing
- browser retrieval
- AI citation quality

That is why the extractor specs are being developed first.

## Directory Philosophy

This folder should remain:

- easy to scan
- easy to navigate
- small in number of top-level areas
- rich in reasoning
- explicit about what is settled vs still under discussion

As the project grows, new top-level areas may include:

- `compiler/`
- `client/`
- `ai-edge/`
- `shared/`

But they should only be added when there is enough real design work to justify them.

## Maintainer Note

If you are unsure whether something belongs in `research/` or `specs/`, use this rule:

> If the document is still primarily exploring options, put it in `research/`.  
> If the document is intended to define how Seek.js should actually be built, put it in `specs/`.