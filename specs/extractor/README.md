# Seek.js Extractor Specs

This folder contains the implementation-oriented specifications for the Seek.js extraction system.

The extractor is the most critical subsystem in the Seek.js architecture. It is responsible for turning user-visible website content into a normalized, citation-safe intermediate representation that can later be compiled into the Seek search index.

These specs are intentionally separated from:
- `docs/` — public-facing or product-facing documentation
- `research/` — exploratory notes, alternatives, tradeoff analysis, and background reasoning

The goal of `specs/extractor/` is to answer:

- What exactly does the extractor do?
- What are the supported extraction modes?
- What data contract does it emit?
- How does it interact with the compiler?
- What happens when extraction fails?
- How do we validate correctness, performance, and compatibility?

---

## Why This Folder Exists

Seek.js supports a broad set of inputs:

- static HTML sites
- SSR frameworks such as Next.js, Remix, Nuxt, and SvelteKit
- MDX/Markdown-based documentation systems
- client-rendered SPAs
- managed SaaS ingestion workflows

Because of this, the extractor cannot be designed as a single parser or a single crawl mode. It must be a multi-mode system with a stable internal contract.

That stable contract is the foundation for the rest of the pipeline:
- route discovery
- content acquisition
- content cleaning
- semantic sectioning
- manifest emission
- later compilation into `.msp`

This folder defines that system in an implementation-safe way.

---

## Reading Order

If you are new to the extractor design, read the files in this order:

1. `01-hybrid-extraction-architecture.md`
   - High-level architectural RFC
   - Describes the Contract-First Hybrid model
   - Introduces Probe-and-Pivot extraction selection
   - Defines the supported extraction modes and overall system boundaries

The current documents in this folder and their intended reading order are:

2. `02-seek-manifest-schema.md`
   - Exact manifest contract
   - Field definitions
   - required vs optional fields
   - schema versioning rules

3. `03-extractor-compiler-contract.md`
   - Boundary between extractor and compiler
   - ownership of sectioning vs chunking
   - compatibility and version negotiation rules

4. `04-probe-and-pivot-strategy.md`
   - mode selection logic
   - mode escalation rules
   - shell detection and fallback selection

The next planned documents should continue narrowing toward implementation detail in this order:

5. `05-route-discovery-and-conflict-resolution.md`
   - sitemap, adapter, route list, and internal-link precedence
   - duplicate route handling
   - canonical resolution rules

6. `06-failure-handling-and-recovery.md`
   - timeouts
   - retries
   - partial extraction behavior
   - fallback escalation rules

7. `07-chunking-spec.md`
   - section boundaries
   - chunk limits
   - overlap policy
   - code/prose handling

8. `08-i18n-and-versioning.md`
   - locale detection
   - version detection
   - high-cardinality language/version handling

9. `09-performance-targets.md`
   - throughput goals
   - memory budgets
   - timeout defaults
   - extraction-mode performance expectations

10. `10-testing-and-validation.md`
   - fixture strategy
   - parity testing between modes
   - regression testing
   - extraction quality metrics

11. `11-parser-engine-decision.md`
   - `html-rewriter-wasm` vs `lol-html`
   - runtime portability rationale
   - engine abstraction and migration path

---

## Scope of the Extractor

The extractor is responsible for:

- discovering or receiving routes/content inputs
- acquiring content from source, artifacts, local render fetch, headless fallback, or remote crawl
- identifying primary content regions
- preserving canonical URL and anchor fidelity
- preserving locale and version metadata
- emitting normalized section-level records into the Seek Manifest

The extractor is **not** responsible for:

- final vectorization
- final chunk packing policy, unless explicitly delegated by contract
- index serialization
- client hydration logic
- browser-side search execution

Those responsibilities belong elsewhere in the pipeline.

---

## Core Architectural Principles

All extractor specs should remain aligned with these principles:

### 1. Final user-visible content is the source of truth
Seek.js should optimize for what users actually read, not what frameworks internally compile.

### 2. Local-first before remote
If content can be extracted from:
- source adapters
- static HTML artifacts
- a local production render

then those paths should be preferred before remote crawling.

### 3. Multi-mode extraction, single normalized output
Different inputs and frameworks may require different extraction modes, but all modes must converge on the same Seek Manifest.

### 4. Build-adjacent, not build-coupled
Seek.js should integrate with builds and CI without becoming tightly coupled to any one bundler or framework compiler.

### 5. Package boundary discipline
Extractor code is build-time only and must not leak into the browser/client runtime bundle.

### 6. Research-backed evolution
Every new spec should be grounded in practical extraction tradeoffs, not just implementation convenience.

---

## Relationship to Research

This folder should not become a dumping ground for raw notes.

Before a concept becomes a spec here, it should ideally be supported by one or more of the following:

- competitive analysis
- framework behavior research
- extraction experiments
- performance measurements
- implementation constraints
- failure case analysis

That research should live in `research/`, while this folder captures the resulting engineering decisions.

In short:

- `research/` explains **why we believe something**
- `specs/` defines **what we are building because of it**

---

## Status Conventions

Each spec in this folder should clearly declare its status near the top, for example:

- `Draft`
- `Proposed`
- `Accepted`
- `Superseded`

This makes it easier to understand which documents are still exploratory and which ones are implementation-ready.

---

## Authoring Guidelines

When adding new extractor specs:

- keep each file focused on one contract or concern
- prefer concrete rules over vague aspirations
- define failure behavior, not just happy paths
- include explicit precedence rules when multiple inputs may disagree
- define measurable targets where possible
- note assumptions and non-goals
- avoid hidden coupling to one framework unless the file is explicitly adapter-specific

If a topic starts feeling too broad for one file, split it.

---

## Immediate Priorities

The highest-priority completed specs in this folder are now:

1. Seek Manifest schema
2. Extractor ↔ compiler contract
3. Probe-and-Pivot strategy

The next highest-value specs to add are:

4. Route discovery and conflict resolution
5. Failure handling and recovery
6. Chunking spec
7. i18n and versioning
8. Performance targets
9. Testing and validation
10. Parser engine decision

These documents will turn the current architecture into a more complete implementation-safe system.

---

## Short Summary

If `01-hybrid-extraction-architecture.md` explains the extractor strategy, this folder explains how to make that strategy buildable.

This directory should become the source of truth for extraction behavior inside Seek.js.