# Seek Manifest Schema
## Normalized Extraction Contract for Seek.js

**Status:** Draft  
**Decision Type:** Schema Specification  
**Applies To:** `@seekjs/extractor`, `@seekjs/compiler`, Seek.js SaaS ingestion pipeline  
**Audience:** SDK maintainers, compiler implementers, extractor implementers, infrastructure engineers

---

## Executive Summary

The **Seek Manifest** is the normalized intermediate representation between content extraction and index compilation in Seek.js.

Every extraction mode must converge on this format:

- source adapter mode
- static artifact parse mode
- local render fetch mode
- local headless render mode
- remote crawl mode

The compiler must treat the manifest as the authoritative input contract for content ingestion.

This schema exists to solve four problems:

1. **Multi-mode consistency**
   - Different extraction modes must emit the same structural output.
2. **Citation fidelity**
   - URLs, anchors, titles, and locale/version metadata must survive extraction.
3. **Extractor/compiler stability**
   - The compiler must not depend on framework-specific acquisition details.
4. **Debuggability**
   - Manifest output must be inspectable, versioned, and validation-friendly.

In one sentence:

> The Seek Manifest is the stable, versioned section-level contract that lets Seek.js extract content in many ways while compiling it in one consistent way.

---

## 1. Goals

The Seek Manifest schema must:

1. provide a stable contract between extractor and compiler
2. preserve citation-grade routing information
3. support static, SSR, source-native, and crawl-based extraction modes
4. support i18n and versioned content
5. be inspectable and easy to validate
6. be portable across local and SaaS execution paths
7. support incremental indexing and deduplication
8. avoid coupling the compiler to any one framework or parser

---

## 2. Non-Goals

The Seek Manifest schema is **not** intended to:

- store final vector embeddings
- define the final `.msp` binary layout
- encode browser hydration behavior
- replace all debugging formats forever
- expose framework-internal compiler state
- define the final retrieval ranking logic

Those belong to later pipeline stages.

---

## 3. Manifest Model

The Seek Manifest is a **versioned document collection** composed of:

1. **Manifest header**
   - metadata about the extraction run and schema version
2. **Section records**
   - normalized section-level content records
3. **Optional diagnostics**
   - warnings, skipped routes, and extraction notes
4. **Optional source metadata**
   - route acquisition provenance and mode information

The manifest is intentionally **section-level**, not page-level.

Why section-level?

Because Seek.js needs stable retrieval and citation units that map to:

- a page
- a heading or section boundary
- a meaningful content block
- a canonical URL target

Page-level blobs are too coarse for high-quality RAG and citation behavior.

---

## 4. Boundary Between Extractor and Compiler

This spec also defines the extractor/compiler boundary at a high level.

### Extractor owns

- route discovery
- content acquisition
- semantic root selection
- canonical URL resolution
- locale/version detection
- heading and section association
- emission of normalized section records

### Compiler owns

- manifest validation
- chunk size enforcement if further chunking is needed
- overlap policy if applicable
- lexical/vector indexing structures
- embedding generation
- final `.msp` serialization

### Important rule

The extractor emits **normalized section records**, not final index structures.

If future compiler strategies require additional chunking, that must happen **after** manifest validation.

---

## 5. Serialization Format

The Seek Manifest may be serialized in one of the following transport/storage forms:

- JSON file
- JSON Lines (`.jsonl`)
- MessagePack
- streamed structured records in SaaS transport

For `v1`, the recommended debugging and development representation is:

- **JSON Lines**

Why JSONL?

- easy to diff
- easy to stream
- easy to validate incrementally
- easy to inspect in CI logs and local tooling

The logical schema defined here is independent of physical transport format.

---

## 6. Versioning Strategy

The manifest must declare a schema version.

### Rules

- schema version is required
- extractor must emit it
- compiler must validate it
- incompatible versions must fail loudly
- additive, backward-compatible fields may be introduced in minor revisions
- removals or semantic reinterpretations require a major version bump

### Recommended format

Use semantic-style versioning for the schema:

- `1.0.0`
- `1.1.0`
- `2.0.0`

For `v1` implementation work, the initial target is:

- `1.0.0`

---

## 7. Top-Level Structure

The logical manifest shape is:

1. one header object
2. zero or more section records
3. optional diagnostics block

A conceptual structure looks like:

- `manifest`
  - `version`
  - `generatedAt`
  - `project`
  - `extraction`
  - `records`
  - `diagnostics`

For JSONL-based transport, this may be split as:

- one header record
- many section records
- optional final diagnostics record

---

## 8. TypeScript Reference Interface

This interface is normative for field naming and expected types in `v1`.

```ts
export interface SeekManifest {
  version: string;
  generatedAt: string;
  project: SeekManifestProject;
  extraction: SeekManifestExtraction;
  records: SeekManifestRecord[];
  diagnostics?: SeekManifestDiagnostics;
}

export interface SeekManifestProject {
  name?: string;
  sourceType: 'source-adapter' | 'static-artifact' | 'local-render-fetch' | 'local-headless' | 'remote-crawl' | 'mixed';
  baseUrl?: string;
  defaultLocale?: string;
  defaultVersion?: string;
}

export interface SeekManifestExtraction {
  mode: 'source-adapter' | 'static-artifact' | 'local-render-fetch' | 'local-headless' | 'remote-crawl' | 'mixed';
  startedAt?: string;
  completedAt?: string;
  routeDiscoverySources?: Array<'user-routes' | 'sitemap' | 'source-adapter' | 'artifact-scan' | 'framework-hint' | 'internal-links' | 'remote-crawl'>;
  parserEngine?: string;
  parserEngineVersion?: string;
  contentSelectors?: string[];
  excludeSelectors?: string[];
}

export interface SeekManifestRecord {
  recordType: 'section';
  manifestVersion: string;
  id: string;
  sourceId: string;
  sourceType: 'source-adapter' | 'static-artifact' | 'local-render-fetch' | 'local-headless' | 'remote-crawl';
  acquisitionMode: 'source-adapter' | 'static-artifact' | 'local-render-fetch' | 'local-headless' | 'remote-crawl';

  canonicalUrl: string;
  pageUrl: string;
  resolvedUrl: string;
  pathname: string;
  anchor?: string;

  title: string;
  sectionTitle?: string;
  headingPath: string[];
  sectionDepth?: number;

  text: string;
  textHash: string;
  pageHash?: string;
  contentHash: string;

  locale?: string;
  version?: string;

  noindex?: boolean;
  priority?: number;
  lastModified?: string;

  metadata?: Record<string, unknown>;
  provenance?: SeekManifestProvenance;
}

export interface SeekManifestProvenance {
  routeDiscoverySource?: 'user-routes' | 'sitemap' | 'source-adapter' | 'artifact-scan' | 'framework-hint' | 'internal-links' | 'remote-crawl';
  sourcePath?: string;
  sourceRoute?: string;
  contentRootSelector?: string;
  extractionNotes?: string[];
}

export interface SeekManifestDiagnostics {
  warnings?: SeekManifestWarning[];
  skippedRoutes?: SeekManifestSkippedRoute[];
  stats?: SeekManifestStats;
}

export interface SeekManifestWarning {
  code: string;
  message: string;
  recordId?: string;
  route?: string;
  severity?: 'info' | 'warn' | 'error';
}

export interface SeekManifestSkippedRoute {
  route: string;
  reason: string;
  stage?: 'discovery' | 'fetch' | 'parse' | 'normalize';
}

export interface SeekManifestStats {
  totalRoutesDiscovered?: number;
  totalRoutesProcessed?: number;
  totalRecordsEmitted?: number;
  totalSkippedRoutes?: number;
  totalWarnings?: number;
}
```

---

## 9. Required Fields

The following fields are required for every section record in `v1`:

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
- `title`
- `headingPath`
- `text`
- `textHash`
- `contentHash`

### Why these are required

These fields define the minimum set needed for:

- retrieval identity
- route identity
- citation behavior
- deduplication
- source provenance
- compiler-side validation

---

## 10. Field Semantics

### `recordType`
Must be:

- `section`

Reserved for future expansion if other record kinds are introduced.

### `manifestVersion`
The schema version used to interpret this record.

Must exactly match or be compatible with the top-level manifest version.

### `id`
Stable record identifier for this section.

Requirements:
- unique within the manifest
- deterministic for the same extracted content when possible
- should not depend on array position

Recommended composition:
- hash of canonical URL + anchor + normalized heading path + normalized text hash

### `sourceId`
Identifier of the page-level or source-level parent object from which the section was derived.

Use cases:
- group records by page
- compiler-side page aggregation
- diagnostics and reindexing

### `sourceType`
How the content was acquired at a high level.

Allowed values:
- `source-adapter`
- `static-artifact`
- `local-render-fetch`
- `local-headless`
- `remote-crawl`

### `acquisitionMode`
The effective extraction mode used for this record.

This may match `sourceType` in most cases. It exists to preserve explicit extraction routing even if source provenance becomes richer later.

### `canonicalUrl`
The authoritative citation URL for this section's page.

Requirements:
- absolute URL
- preferred over all other URL variants
- should reflect canonical metadata if present

### `pageUrl`
The URL used to identify the containing page.

May differ from `canonicalUrl` if:
- the fetched route redirected
- the page contains canonical normalization
- the source path was transformed

### `resolvedUrl`
The final citation target for this record.

This should typically be:

- `canonicalUrl` if no anchor exists
- `canonicalUrl + anchor` if an anchor exists

This is the most important retrieval/citation field for downstream usage.

### `pathname`
Normalized pathname of the page.

Examples:
- `/docs/authentication`
- `/en/docs/getting-started`

Must not include:
- origin
- query string
- fragment

### `anchor`
The section fragment, including leading `#` if present.

Examples:
- `#setup`
- `#configure-callback-url`

If absent, the record refers to the page root or an unanchored section.

### `title`
Page-level human-readable title.

Examples:
- `Authentication`
- `Getting Started`

### `sectionTitle`
Nearest section or heading title associated with the record.

Examples:
- `OAuth Setup`
- `Install the SDK`

May be omitted if the page has no meaningful subheading structure.

### `headingPath`
Ordered heading hierarchy from page root to current section.

Examples:
- `["Authentication"]`
- `["Authentication", "OAuth", "Configure callback URL"]`

Rules:
- must be ordered from broadest to most specific
- empty array is not allowed in `v1`; use at least the page title if no deeper heading exists

### `sectionDepth`
Optional numeric depth of the associated heading.

Examples:
- `1` for `h1`
- `2` for `h2`

Useful for weighting and debugging, but not required in `v1`.

### `text`
Normalized section text content.

Rules:
- must contain visible, meaningful content
- must not be empty after normalization
- should exclude obvious layout chrome
- should preserve reading order as much as possible

### `textHash`
Hash of normalized `text`.

Use cases:
- deduplication
- incremental reindexing
- stability testing

### `pageHash`
Optional page-level content hash.

Useful when multiple section records come from the same page and a whole-page invalidation signal is needed.

### `contentHash`
Hash representing the effective record content identity.

Recommended inputs:
- resolved URL
- title
- sectionTitle
- headingPath
- normalized text
- locale
- version

This should change when the section meaning changes.

### `locale`
Optional locale identifier.

Examples:
- `en`
- `fr`
- `en-US`

### `version`
Optional docs/product version identifier.

Examples:
- `v1`
- `v2`
- `latest`

### `noindex`
Whether this record should be excluded from downstream indexing.

If `true`, the compiler may skip it or retain it only for diagnostics depending on policy.

### `priority`
Optional numeric hint for ranking or crawl provenance.

Not required for `v1` ranking behavior.

### `lastModified`
Optional RFC 3339 timestamp indicating last modified time, if known.

### `metadata`
Optional open-ended metadata map.

This should be used sparingly and must not replace core schema fields.

Examples:
- category
- product area
- frontmatter tags
- source framework hints

### `provenance`
Optional provenance metadata used for diagnostics and auditability.

---

## 11. Top-Level Manifest Fields

### `version`
Required manifest schema version.

### `generatedAt`
Required RFC 3339 timestamp.

### `project`
Required project-level metadata block.

### `extraction`
Required extraction-run metadata block.

### `records`
Required array of section records.

### `diagnostics`
Optional diagnostics block.

---

## 12. Validation Rules

### 12.1 Record-level invariants

For each record:

1. `recordType` must equal `section`
2. `canonicalUrl` must be absolute
3. `pageUrl` must be absolute
4. `resolvedUrl` must be absolute
5. `pathname` must begin with `/`
6. `text` must not be empty after normalization
7. `title` must not be empty
8. `headingPath.length` must be at least `1`
9. `contentHash` must not be empty
10. `id` must be unique across the manifest

### 12.2 URL invariants

- `resolvedUrl` must be derivable from `canonicalUrl` and `anchor` semantics
- `pathname` must match the path component of `pageUrl` after normalization
- if `anchor` exists, it should begin with `#`

### 12.3 Locale/version invariants

- if `locale` is absent, the compiler may fall back to project defaults
- if `version` is absent, the compiler may fall back to project defaults
- locale/version must not be inferred differently for records from the same source unless explicitly supported

### 12.4 Hash invariants

- `textHash` must be derived only from normalized text
- `contentHash` must be derived from stable record semantics, not array order
- hash algorithms must be stable across extractor/compiler implementations for a given manifest version

---

## 13. Recommended Hashing Strategy

This spec does not hardcode a required cryptographic algorithm for `v1`, but it does require determinism.

Recommended default:
- SHA-256 truncated for identifier use if needed

Recommended derivation:
- `textHash` = hash(normalized text)
- `pageHash` = hash(normalized page-level content or stable concatenation of section texts)
- `contentHash` = hash(canonical URL + anchor + heading path + locale + version + normalized text)

### Important rule

Do not derive IDs from:
- record array position
- extraction timestamp
- process-specific randomness

That would break incremental stability.

---

## 14. Diagnostics Model

Diagnostics are optional but strongly recommended in `v1`.

### Why diagnostics matter

Seek.js is a multi-mode extraction system. Failures and ambiguities are expected.

Diagnostics allow teams to answer:
- what routes were skipped?
- why did extraction choose this mode?
- which records were emitted with warnings?
- where did canonical resolution fail?
- did shell detection trigger headless escalation?

### Recommended diagnostics categories

- route discovery warnings
- canonical URL conflicts
- heading/anchor ambiguity
- content root fallback usage
- shell-only route detection
- skipped route reasons
- locale/version ambiguity

---

## 15. Manifest Version Negotiation

The extractor and compiler must agree on a compatible schema version.

### Rules

- extractor emits manifest version
- compiler declares supported version range
- incompatible versions must fail before compilation begins
- partial compilation of unsupported schema versions is not allowed

### Recommended compiler behavior

- validate top-level version first
- validate record structure second
- fail fast on major incompatibility
- emit actionable diagnostics for minor field incompatibility

---

## 16. Example Manifest

The following example is illustrative.

```json
{
  "version": "1.0.0",
  "generatedAt": "2026-01-15T12:00:00Z",
  "project": {
    "name": "example-docs",
    "sourceType": "local-render-fetch",
    "baseUrl": "https://example.com",
    "defaultLocale": "en",
    "defaultVersion": "latest"
  },
  "extraction": {
    "mode": "local-render-fetch",
    "startedAt": "2026-01-15T11:59:00Z",
    "completedAt": "2026-01-15T12:00:00Z",
    "routeDiscoverySources": ["sitemap", "framework-hint"],
    "parserEngine": "html-rewriter-wasm",
    "parserEngineVersion": "0.4.1",
    "contentSelectors": ["main", "article", "[role='main']"],
    "excludeSelectors": ["nav", "footer"]
  },
  "records": [
    {
      "recordType": "section",
      "manifestVersion": "1.0.0",
      "id": "rec_6d77f03c",
      "sourceId": "page_authentication",
      "sourceType": "local-render-fetch",
      "acquisitionMode": "local-render-fetch",
      "canonicalUrl": "https://example.com/docs/authentication",
      "pageUrl": "https://example.com/docs/authentication",
      "resolvedUrl": "https://example.com/docs/authentication#oauth-setup",
      "pathname": "/docs/authentication",
      "anchor": "#oauth-setup",
      "title": "Authentication",
      "sectionTitle": "OAuth Setup",
      "headingPath": ["Authentication", "OAuth Setup"],
      "sectionDepth": 2,
      "text": "To configure OAuth, create an application in your provider dashboard and set the callback URL to your Seek.js application route.",
      "textHash": "txt_1f3318",
      "pageHash": "page_0e2af9",
      "contentHash": "cnt_9267b1",
      "locale": "en",
      "version": "latest",
      "noindex": false,
      "metadata": {
        "category": "auth",
        "framework": "nextjs"
      },
      "provenance": {
        "routeDiscoverySource": "sitemap",
        "sourceRoute": "/docs/authentication",
        "contentRootSelector": "main"
      }
    }
  ],
  "diagnostics": {
    "warnings": [
      {
        "code": "CONTENT_ROOT_FALLBACK",
        "message": "Fell back to semantic HTML root detection for one route.",
        "severity": "warn"
      }
    ],
    "stats": {
      "totalRoutesDiscovered": 12,
      "totalRoutesProcessed": 12,
      "totalRecordsEmitted": 53,
      "totalSkippedRoutes": 0,
      "totalWarnings": 1
    }
  }
}
```

---

## 17. JSON Schema Guidance

A formal machine-validatable JSON Schema should be generated from this spec and checked into the repo alongside implementation work.

Recommended path later:
- `seek/specs/extractor/schema/seek-manifest.schema.json`

This Markdown spec remains the human-readable source of truth until the machine schema is checked in.

---

## 18. Open Questions

The following questions remain open for follow-up specs:

1. Should the extractor emit raw sections only, or may it emit chunk hints?
2. Should `records` remain grouped in one JSON document, or should JSONL be the default manifest transport?
3. How strict should compiler validation be for unknown metadata fields?
4. Should locale/version inheritance be resolved by extractor only, or can compiler defaults fill gaps?
5. Should code-block-heavy sections carry additional structured metadata in `v1`?

These questions should be finalized in:

- extractor/compiler contract spec
- chunking spec
- i18n/versioning spec

---

## 19. Implementation Guidance

### For extractor implementers
- emit deterministic record IDs
- normalize URLs before record creation
- preserve heading hierarchy
- prefer stable canonical resolution over raw fetched route identity
- avoid emitting empty or near-empty sections
- include provenance where available

### For compiler implementers
- validate manifest schema before processing
- treat missing required fields as hard failures
- treat optional metadata as advisory only
- avoid framework-specific assumptions
- use diagnostics to explain skipped records and validation failures

---

## 20. Final Recommendation

The Seek Manifest should be implemented as a **versioned, section-level, citation-safe normalized contract**.

This is the most important data boundary in the Seek.js extraction pipeline.

If the manifest is weak:
- extraction modes will drift
- compiler behavior will become inconsistent
- citations will degrade
- debugging will become difficult

If the manifest is strong:
- Seek.js can support many acquisition modes
- compiler behavior can remain stable
- local and SaaS paths can stay aligned
- future evolution becomes much safer

In one sentence:

> The Seek Manifest is the abstraction that makes Seek.js multi-mode extraction operationally safe.

---