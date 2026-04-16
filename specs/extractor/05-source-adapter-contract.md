# Source Adapter Contract

**Status:** Draft  
**Audience:** Parser implementers and SDK maintainers  
**Read time:** 6 min

## TL;DR

Source adapters provide highest-fidelity content extraction for MDX/Markdown docs ecosystems.  
This spec defines the adapter interface, framework detection, and output normalization contract.

## Scope

This spec defines:

- adapter interface methods
- framework detection signals
- output normalization format
- first-party adapter implementation order

This spec does not define:

- specific framework implementations (those live in `packages/parser/src/adapters/`)
- extraction mode selection logic (owned by `04-probe-and-pivot-strategy.md`)

## Why Adapters Matter

| Without Adapters        | With Adapters             |
| ----------------------- | ------------------------- |
| Frontmatter lost        | Frontmatter preserved     |
| Headings become divs    | H1-H6 hierarchy preserved |
| No code language tags   | Language metadata intact  |
| No import relationships | Import graph navigable    |

Source adapter mode is the highest-fidelity extraction path per `01-hybrid-extraction-architecture.md`.

## Adapter Interface

### Required Interface

```typescript
interface SourceAdapter {
  /** Unique identifier for the framework */
  readonly framework: string;

  /** File extensions this adapter handles */
  readonly supportedExtensions: readonly string[];

  /** Minimum confidence (0-1) required to select this adapter */
  readonly minConfidence: number;

  /** Detect if a directory contains this framework */
  detect(projectRoot: string): Promise<AdapterDetectionResult>;

  /** Parse source file to normalized content */
  parse(filePath: string, content: string): Promise<ParsedContent>;

  /** Extract and normalize frontmatter */
  extractFrontmatter(content: string): Frontmatter;

  /** Resolve import/include references */
  resolveImports(content: string, basePath: string): ImportReference[];
}
```

### Detection Result

```typescript
interface AdapterDetectionResult {
  adapter: string;
  confidence: number; // 0-1
  evidence: {
    detectedFiles: string[];
    versions?: Record<string, string>;
  };
}
```

### Parsed Content Output

```typescript
interface ParsedContent {
  /** Unique identifier for this content unit */
  id: string;

  /** Source file path */
  sourcePath: string;

  /** Normalized content (markdown/HTML) */
  content: string;

  /** Parsed frontmatter */
  metadata: Record<string, unknown>;

  /** Heading hierarchy */
  headings: Heading[];

  /** Code blocks with language info */
  codeBlocks: CodeBlock[];

  /** Import/export relationships */
  imports: ImportReference[];
}

interface Heading {
  level: number; // 1-6
  text: string;
  id: string; // slugified
}

interface CodeBlock {
  language: string;
  content: string;
  meta?: string; // title, line numbers, etc.
}

interface ImportReference {
  source: string; // original import path
  resolved: string; // absolute path after resolution
  type: "mdx" | "md" | "component" | "image";
}
```

## Framework Detection

### Detection Strategy

Detector examines project root for framework-specific signals:

| Framework  | Primary Signals                                                  | Confidence If Present |
| ---------- | ---------------------------------------------------------------- | --------------------- |
| Docusaurus | `package.json` has `@docusaurus/core`, `docs/` directory exists  | 0.9                   |
| Next.js    | `next.config.js`, `app/` or `pages/` directory                   | 0.8                   |
| Starlight  | `astro.config.mjs` has `@astrojs/starlight`, `src/content/docs/` | 0.85                  |
| VuePress   | `.vuepress/` directory                                           | 0.8                   |

### Confidence Scoring

- **≥ 0.7**: use source adapter
- **< 0.7**: fall back to static artifact parsing

Detector returns highest-confidence match. If no adapter exceeds threshold, extraction uses lower-fidelity mode.

### Detection Implementation

```typescript
async function detectFramework(
  projectRoot: string,
): Promise<SourceAdapter | null> {
  const candidates = [
    docusaurusAdapter,
    starlightAdapter,
    nextJsAdapter,
    vuePressAdapter,
  ];

  let bestMatch: { adapter: SourceAdapter; confidence: number } | null = null;

  for (const candidate of candidates) {
    const result = await candidate.detect(projectRoot);
    if (result.confidence > (bestMatch?.confidence ?? 0)) {
      bestMatch = { adapter: candidate, confidence: result.confidence };
    }
  }

  if (!bestMatch || bestMatch.confidence < bestMatch.adapter.minConfidence) {
    return null; // fall back to static parsing
  }

  return bestMatch.adapter;
}
```

## Adapter Registry

Adapters must be registered for discovery:

```typescript
// packages/parser/src/adapters/index.ts

import { docusaurusAdapter } from './docusaurus';
import { starlightAdapter } from './starlight';
import { nextJsAdapter } from './nextjs';
import { vuePressAdapter } from './vuepress';

export const adapters = [
  docusaurusAdapter,
  starlightAdapter,
  nextJsAdapter,
  vuePressAdapter,
];

export function getAdapter(name: string): SourceAdapter | undefined {
  return adapters.find(a => a.framework === name);
}

export type SourceAdapter = /* ... interface from above ... */;
```

## Content Normalization

All adapters must output the same `ParsedContent` structure regardless of source format.

### Normalization Requirements

1. **IDs** must be stable across re-runs (use file path, not content hash)
2. **Headings** must preserve level and generate stable slugs
3. **Code blocks** must preserve language and metadata
4. **Frontmatter** must be parsed as structured data, not raw text
5. **Timestamps** must be normalized to ISO 8601

### Frontmatter Parsing

```typescript
function extractFrontmatter(content: string): Record<string, unknown> {
  const { data } = matter(content);
  return {
    ...data,
    // Normalize common fields
    title: data.title ?? data.name,
    description: data.description ?? data.excerpt,
    // Normalize dates
    lastUpdated: data.lastUpdated ?? data.updatedDate ?? data.date,
  };
}
```

## Implementation Priority

| Priority | Framework  | Rationale                       |
| -------- | ---------- | ------------------------------- |
| 1        | Docusaurus | Largest docs ecosystem          |
| 2        | Next.js    | Popular MDX usage               |
| 3        | Starlight  | Growing fast, simpler structure |
| 4        | VuePress   | Legacy but still used           |

## Change Policy

When adapter behavior changes:

1. update this contract if interface changes,
2. add new adapter files in `packages/parser/src/adapters/`,
3. add detection signals if new framework version,
4. bump contract version if output format changes.

## References

- [gray-matter](https://github.com/jonschlinkert/gray-matter) — frontmatter parsing
- [remark](https://remark.js.org/) — markdown/MDX parsing
- [Docusaurus content](https://docusaurus.io/docs/docs-introduction)
- [Next.js MDX](https://nextjs.org/docs/app/building-your-application/configuring/mdx)
- [Starlight authoring](https://starlight.astro.build/authoring-content/)
