# Seek.js Extractor ↔ Compiler Contract
## Boundary Definition Between `@seekjs/extractor` and `@seekjs/compiler`

**Status:** Draft  
**Decision Type:** Subsystem Contract Spec  
**Applies To:** `@seekjs/extractor`, `@seekjs/compiler`  
**Audience:** SDK maintainers, compiler engineers, extraction pipeline implementers

---

## Executive Summary

Seek.js supports multiple extraction modes:

- source adapters
- static artifact parsing
- local render fetching
- local headless rendering
- remote crawl fallback

Those modes only remain maintainable if they converge on a **single stable contract** before compilation begins.

This document defines that contract.

The extractor is responsible for discovering and normalizing **user-visible content** into a stable intermediate representation called the **Seek Manifest**. The compiler is responsible for turning that normalized representation into a compiled search index (`.msp`) suitable for browser-side retrieval.

The extractor must not leak mode-specific details into the compiler. The compiler must not assume where the content came from.

In one sentence:

> The extractor owns content acquisition and section normalization; the compiler owns chunk formation policy, vectorization preparation, and index serialization.

---

## 1. Why This Contract Exists

Without a formal boundary between extractor and compiler, the system will drift in dangerous ways:

- extraction modes may emit incompatible shapes
- compiler logic may accidentally depend on one acquisition mode
- chunking behavior may become inconsistent across implementations
- citation fidelity may degrade
- schema evolution may break silently
- SaaS and local compilation may diverge

This contract exists to prevent those failures.

---

## 2. High-Level Responsibility Split

## 2.1 Extractor Responsibilities

The extractor owns:

- route discovery or content input discovery
- content acquisition
- source/artifact/local-render/headless/remote-crawl mode execution
- primary content root detection
- content cleaning and layout-noise removal
- canonical URL resolution
- anchor and heading association
- locale and version normalization
- section boundary detection
- manifest emission
- extraction metadata and provenance

The extractor does **not** own:

- final vectorization
- lexical index construction
- final chunk packing policy
- overlap strategy for production retrieval
- `.msp` serialization
- browser hydration/runtime behavior

---

## 2.2 Compiler Responsibilities

The compiler owns:

- manifest validation
- schema compatibility checks
- section-to-chunk transformation
- chunk size enforcement
- chunk overlap policy
- code/prose chunk handling policy
- embedding preparation
- lexical/vector/hybrid index construction
- quantization/compression decisions
- `.msp` serialization
- compiler metadata emission

The compiler does **not** own:

- route discovery
- HTML parsing
- source adapter execution
- SSR local fetching
- canonical URL discovery
- selector heuristics
- DOM cleaning
- locale detection from page structure

---

## 2.3 Shared Concern, Different Ownership

Some concerns touch both layers, but ownership must remain explicit.

### Example: Chunking
- extractor owns **section boundaries**
- compiler owns **final retrieval chunks**

### Example: URLs
- extractor owns **canonical URL and anchor resolution**
- compiler consumes URLs as immutable citation targets

### Example: Locale/version
- extractor owns **detection and normalization**
- compiler consumes locale/version as indexing/filtering metadata

---

## 3. Contract Philosophy

The extractor ↔ compiler boundary should satisfy these principles:

### 3.1 Mode Agnostic
The compiler must not care whether the input came from:
- MDX source
- static HTML
- local render fetch
- headless browser rendering
- remote crawl

### 3.2 Stable Citation Targets
The extractor must emit stable citation-grade page and section targets before the compiler begins chunking.

### 3.3 Section-First, Chunk-Later
The extractor emits normalized **sections**, not final production chunks.

### 3.4 Forward-Compatible
The contract must be versioned so both packages can evolve without accidental breakage.

### 3.5 Strict Validation
The compiler must validate the manifest aggressively before indexing begins.

---

## 4. Canonical Data Flow

The intended pipeline is:

1. Seek.js acquires content using one extraction mode
2. extractor normalizes content into **section records**
3. extractor emits a versioned **Seek Manifest**
4. compiler validates manifest version and schema
5. compiler transforms section records into retrieval chunks
6. compiler vectorizes and builds lexical/hybrid structures
7. compiler serializes `.msp`

### Core rule

> The manifest is the only supported handoff boundary between extractor and compiler.

The compiler must not parse raw HTML, raw markdown, or mode-specific extraction outputs directly.

---

## 5. Seek Manifest: Contract Position

This document does not replace the dedicated manifest schema spec. Instead, it defines how the manifest is used at the boundary.

At the extractor/compiler boundary, the manifest must be treated as:

- versioned
- validated
- normalized
- section-oriented
- citation-safe
- mode-agnostic

### Minimum top-level expectations

The manifest should include top-level metadata exactly as defined in `02-seek-manifest-schema.md`.

For `v1`, the canonical top-level fields are:

- `version`
- `generatedAt`
- `project`
- `extraction`
- `records`
- `diagnostics`

### Minimum per-record expectations

Each section record must include enough information for the compiler to:

- identify the source section
- preserve citation targets
- apply chunking policy
- associate locale/version
- compute embeddings and lexical tokens

At minimum, the compiler expects the canonical per-record fields defined in `02-seek-manifest-schema.md`, including:

- `recordType`
- `manifestVersion`
- `id`
- `sourceId`
- `sourceType`
- `acquisitionMode`
- `canonicalUrl`
- `pageUrl`
- `resolvedUrl`
- `pathname`
- `anchor`
- `title`
- `sectionTitle`
- `headingPath`
- `text`
- `locale`
- `version`
- `contentHash`
- `metadata`
- `provenance`

The exact schema is defined in the dedicated manifest schema spec, and this contract must not redefine alternate field names.

---

## 6. What the Extractor Must Emit

The extractor must emit **normalized section records**.

A normalized section record is:

- tied to one page or page section
- mapped to one stable citation target
- cleaned of known layout noise
- associated with a known heading context
- labeled with locale/version metadata where applicable
- suitable for later compiler chunking

### Important rule

The extractor should emit records that are:

- semantically coherent
- citation-safe
- not overly large
- not artificially split into tiny retrieval units unless clearly justified

### Extractor output should represent:
- page sections
- heading-scoped content groups
- natural semantic regions

### Extractor output should not represent:
- arbitrary fixed-size chunks
- embedding-sized fragments
- retrieval-window-sized blocks chosen purely for model convenience

That responsibility belongs to the compiler.

---

## 7. What the Compiler May Assume

The compiler may assume that each extracted record:

1. has already been normalized
2. refers to user-visible content
3. has stable URL identity
4. has already had route/anchor resolution applied
5. includes enough text to be a meaningful semantic unit
6. includes content provenance and hashes suitable for deduplication/change detection

The compiler may **not** assume:

- records are already final chunks
- all records are equal in size
- all records come from the same acquisition mode
- extractor used one specific parser engine
- headings were generated by one specific framework
- every record includes embeddings
- every record comes from HTML

---

## 8. What the Compiler Must Validate

Before compilation begins, the compiler must validate:

### 8.1 Manifest Version Compatibility
- Is the manifest version recognized?
- Is the version accepted, deprecated, or unsupported?

### 8.2 Required Top-Level Fields
- required metadata exists
- site/base URL metadata is coherent
- document collection exists and is non-empty

### 8.3 Required Record Fields
- required section fields exist
- text fields are non-empty after normalization
- URL identity fields are coherent
- locale/version shape is valid if present

### 8.4 Data Integrity
- no duplicate `id` values
- no malformed URLs where URLs are required
- no structurally invalid heading paths
- no non-string text payloads
- no records exceeding hard maximum payload thresholds without explicit allow rules

### 8.5 Contract Safety
- compiler-supported manifest version range matches extractor output
- chunking strategy selected by compiler is compatible with record granularity
- incompatible extensions are rejected or ignored according to spec

If validation fails, compilation must stop or degrade according to explicit failure policy.

---

## 9. Section Records vs Final Chunks

This is the most important conceptual distinction in the contract.

## 9.1 Section Records
Owned by the extractor.

These represent:
- normalized semantic regions
- heading-scoped content
- stable citation boundaries
- mode-agnostic extraction output

## 9.2 Final Chunks
Owned by the compiler.

These represent:
- retrieval units
- token/size bounded units
- overlap-aware units
- vectorization-ready units
- search-optimized units

### Why this split matters

If extraction owns final chunking:
- every extraction mode may chunk differently
- compiler behavior becomes inconsistent
- mode parity becomes hard to validate
- retrieval quality drifts

If compilation owns final chunking:
- retrieval policy stays centralized
- chunk size tuning is easier
- experiments are easier
- extractor remains mode-focused

### Final rule

> The extractor emits section records.  
> The compiler derives final chunks.

---

## 10. Optional Chunk Hints

The extractor may emit **chunk hints**, but these must be treated as hints, not authoritative chunk boundaries.

Examples of chunk hints may include:

- recommended split points
- section density estimates
- code block boundaries
- table boundaries
- heading nesting depth
- “keep together” groups

The compiler may use these hints to improve chunk formation, but it must remain the final owner of chunk policy.

### Why hints are acceptable
They let the extractor share structural knowledge without taking ownership of retrieval policy.

### Why hints must not be binding
If hints are binding, the extractor and compiler become too tightly coupled.

---

## 11. Extractor Extensions and Compiler Compatibility

The contract should support controlled extension without breaking the compiler.

### 11.1 Allowed Extension Model
The extractor may emit optional extension metadata in reserved extension fields, for example:

- extractor diagnostics
- source-specific metadata
- rendering metadata
- adapter metadata
- chunk hints

### 11.2 Compiler Behavior
The compiler must:
- ignore unknown optional extensions by default
- reject unknown required extensions
- record warnings for suspicious but ignorable fields when appropriate

### 11.3 Reserved Namespaces
The manifest schema should reserve namespaces for:
- extractor-owned metadata
- compiler-owned metadata
- shared contract metadata
- future plugins/extensions

This should be formalized in the manifest schema spec.

---

## 12. Version Negotiation

Extractor and compiler must not rely on accidental compatibility.

### 12.1 Manifest Version
The extractor must emit the manifest `version` field, and each section record must emit `manifestVersion` as defined in `02-seek-manifest-schema.md`.

### 12.2 Compiler Support Range
The compiler should declare a supported version range.

### 12.3 Compatibility Behavior
If manifest version is:
- supported → proceed
- deprecated but readable → proceed with warning
- newer but incompatible → fail with explicit error
- older but unsupported → fail with explicit error

### 12.4 Why This Matters
This allows:
- extractor evolution
- compiler evolution
- local/SaaS parity
- clearer migrations across releases

---

## 13. Failure Semantics at the Boundary

The contract should define what happens when the extractor succeeds partially.

### 13.1 Extractor Partial Success
Extractor may produce:
- successful records
- failed routes/pages
- skipped routes
- degraded routes
- warnings

The manifest should be able to carry extraction summary metadata such as:
- total discovered routes
- extracted routes
- skipped routes
- failed routes
- degraded routes
- warning counts

### 13.2 Compiler Behavior on Partial Inputs
Compiler should be configurable to:
- fail on any extractor failure
- continue if failure rate is below threshold
- continue but mark compilation as degraded

### 13.3 Why This Matters
Large sites should not necessarily fail completely because one route timed out, but the system must not silently hide low-quality extraction.

---

## 14. Provenance Requirements

Each record should preserve enough provenance for debugging and future validation.

At minimum, provenance should support answering:

- Which extraction mode produced this record?
- Which page or source file did it come from?
- What route was used?
- Was it rendered, fetched, or source-derived?
- What content hash corresponds to this record?

### Suggested provenance concepts
Use the provenance shape defined in `02-seek-manifest-schema.md`, including fields such as:

- `routeDiscoverySource`
- `sourcePath`
- `sourceRoute`
- `contentRootSelector`
- `extractionNotes`

Top-level or record-level source classification should continue to use the canonical schema fields such as `sourceType`, `acquisitionMode`, and `contentHash` rather than alternate snake_case names.

This is critical for:
- debugging
- parity testing
- incremental indexing
- compiler diagnostics
- SaaS support workflows

---

## 15. Stability Requirements

The extractor must aim for stable output under unchanged inputs.

This means:
- stable record IDs
- stable canonical URL mapping
- stable section boundaries where content is unchanged
- stable heading path emission
- stable locale/version assignment

The compiler depends on this stability for:
- incremental compilation
- cache reuse
- regression testing
- manifest diffing

---

## 16. Security and Trust Boundaries

The compiler must treat the manifest as structured input, not trusted executable logic.

That means:

- no execution of manifest-provided scripts
- no evaluation of extractor-provided code expressions
- no dynamic trust in extension blobs
- strict input sanitization/validation

The extractor/compiler boundary is a **data contract**, not a plugin execution boundary.

---

## 17. Local vs SaaS Parity

The same manifest emitted locally should be compilable both:

- locally by `@seekjs/compiler`
- remotely by Seek SaaS

This is essential for:
- debugging parity
- vendor trust
- portability
- migration between OSS and SaaS

### Contract implication
The compiler contract must not depend on hidden SaaS-only fields.

If SaaS needs additional metadata, it should be optional and additive, not foundational.

---

## 18. Recommended Minimal Interface Shape

The exact API surface may vary by language/runtime, but conceptually the boundary should look like:

### Extractor output
- versioned manifest object or stream
- extraction summary
- diagnostics/warnings
- optional provenance/extensions

### Compiler input
- manifest object or manifest stream
- compiler options
- validation mode
- chunking strategy
- embedding/indexing configuration

The important part is not the exact function signature. The important part is that the compiler accepts **manifest-shaped normalized input**, not mode-specific raw sources.

---

## 19. Non-Goals of This Contract

This document does not define:

- the exact manifest JSON schema
- exact chunk size constants
- exact overlap percentages
- exact locale detection rules
- exact route discovery precedence rules
- exact failure retry schedules
- exact parser implementation details

Those belong in separate specs.

This contract only defines:
- ownership boundaries
- required assumptions
- allowed expectations
- compatibility rules

---

## 20. Design Consequences

Adopting this contract implies:

### For extractor implementation
- do not overfit to compiler internals
- do not emit retrieval-specific chunks as the primary output
- preserve citation and provenance data carefully

### For compiler implementation
- do not assume one acquisition mode
- centralize chunk policy
- validate aggressively before indexing
- treat the manifest as the one true input contract

### For future subsystem growth
This contract makes it possible to add:
- new extraction modes
- new parser engines
- new SaaS flows
- new compiler strategies

without rewriting the entire pipeline.

---

## 21. Recommended Next Specs

This contract should be followed by:

1. `02-seek-manifest-schema.md`
   - exact schema definition
   - required/optional fields
   - JSON Schema / TypeScript interface
   - versioning rules

2. `04-probe-and-pivot-strategy.md`
   - extraction mode selection
   - fallback logic
   - shell detection and escalation

3. `07-chunking-spec.md`
   - compiler-owned chunk policy
   - chunk size limits
   - overlap rules
   - code/prose handling

4. `06-failure-handling-and-recovery.md`
   - extractor partial failures
   - compiler degraded-mode handling
   - retry and escalation policy

---

## 22. Final Contract Statement

The boundary between `@seekjs/extractor` and `@seekjs/compiler` should be defined as follows:

> The extractor is responsible for acquiring, cleaning, normalizing, and sectioning user-visible content into a versioned Seek Manifest with stable citation targets and provenance metadata. The compiler is responsible for validating that manifest, deriving final retrieval chunks, building hybrid search structures, and serializing the final compiled index.

This boundary should remain stable even as Seek.js adds new extraction modes, parser engines, and SaaS capabilities.

---

## 23. Summary

If the hybrid architecture RFC defines **how Seek.js finds content**, this contract defines **how that content crosses the subsystem boundary safely**.

The most important rules are:

1. extractor emits **normalized sections**, not final retrieval chunks
2. compiler owns **final chunk policy**
3. manifest is the **only supported handoff boundary**
4. citation targets must be resolved **before** compilation
5. provenance and versioning must be preserved
6. local and SaaS compilation must share the same manifest contract

These rules are what keep the extraction system extensible without making the compiler fragile.