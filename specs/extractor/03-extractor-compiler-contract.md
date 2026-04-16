# Seek.js Extractor ↔ Compiler Contract

**Status:** Accepted  
**Audience:** SDK maintainers and pipeline implementers  
**Read time:** 9 min

## TL;DR

Extractor and compiler communicate only through `Seek Manifest` defined in `02-seek-manifest-schema.md`.  
Extractor owns acquisition + normalization into section records.  
Compiler owns validation + chunk derivation + index serialization.

## Scope

This spec defines subsystem boundary, assumptions, and compatibility rules.  
This spec does not redefine manifest schema fields.

## Canonical Handoff

Only supported handoff input to compiler is versioned manifest:

- top-level shape from `02`
- `source` metadata from `02`
- `documents[]` section records from `02`

Compiler must not consume mode-specific raw inputs (HTML/MDX/crawl payloads) directly.

## Responsibility Split

### Extractor owns

- route/content input discovery
- acquisition mode execution
- content cleanup and section normalization
- canonical URL resolution
- locale/version capture
- record-level provenance metadata in schema-compatible fields
- manifest emission

### Compiler owns

- manifest validation
- section-to-chunk transformation
- chunk sizing and overlap policy
- embedding preparation
- lexical/vector index build
- compression/serialization output

### Shared concern with explicit split

- extractor owns semantic section boundaries
- compiler owns final retrieval chunks

## Compiler Assumptions

Compiler may assume each `documents[]` record:

1. represents user-visible normalized section content
2. has stable URL identity fields per schema
3. includes required fields from `02`
4. has deterministic `id` semantics from extractor normalization

Compiler may not assume:

- records are already final chunks
- records come from one acquisition mode
- records originated from one parser engine
- extractor emitted embeddings

## Validation Requirements

Before compile, compiler MUST validate:

1. `schemaVersion` compatibility.
2. required top-level fields (`schemaVersion`, `generatedAt`, `source`, `documents`).
3. required per-record fields from `02`.
4. URL and text integrity constraints from `02`.
5. duplicate `id` handling policy from `02` (`warn + deterministic keep-first` unless stricter compile mode configured).

If validation fails, compile MUST stop or enter explicit degraded mode based on compiler policy.

## Version Compatibility

Compiler behavior by version:

- supported major: proceed
- unsupported major: fail
- supported minor with unknown optional fields: ignore unknown optional fields
- patch-only differences: proceed

Extractor must emit schema version exactly in canonical `schemaVersion` field.

## Failure Semantics

Manifest may represent partial extraction outcomes (failures/skips/degraded pages) via schema-compatible metadata.  
Compiler policy must support:

- strict mode: fail on any unacceptable extraction quality
- tolerant mode: continue with warnings when quality thresholds met

Compiler must surface degradation in diagnostics, never silently hide boundary failures.

## Extension Rules

- Extensions allowed only in optional schema-compatible metadata fields.
- Unknown optional extensions: ignore safely.
- Unknown required extensions: reject with explicit error.
- No alternate field naming conventions permitted outside schema.

## Local and SaaS Parity

Same manifest must compile both:

- local `@seekjs/compiler`
- managed SaaS compiler pipeline

No hidden SaaS-only mandatory fields allowed at boundary.

## Non-goals

This spec does not define:

- exact JSON schema (owned by `02`)
- probe order (owned by `04`)
- exact chunk constants (future chunking spec)
- retry schedule details (future failure spec)

## Change Policy

When boundary behavior changes:

1. update this contract first,
2. update `02` if schema impact exists,
3. update `04` if mode-selection behavior changes,
4. bump version compatibility behavior when backward incompatible.

## Contract Statement

Extractor emits schema-valid normalized section records in `Seek Manifest`.  
Compiler validates manifest, derives final retrieval chunks, builds search index, serializes output.  
Manifest boundary remains stable across extraction modes and deployment models.