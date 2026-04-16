# Route Discovery

**Status:** Draft  
**Audience:** Extractor implementers  
**Read time:** 5 min

## TL;DR

Route discovery answers: which URLs exist on this site?  
This spec defines route sources, precedence rules, and conflict resolution.

## Scope

This spec defines:

- route source types
- precedence ordering
- conflict resolution policies
- output format

This spec does not define:

- framework-specific route extraction (owned by source adapters)
- URL normalization details (owned by `02-seek-manifest-schema.md`)

## Why Route Discovery Matters

Without route discovery:

- Incomplete search index (missing pages)
- No conflict detection (duplicate URLs)
- No missing page identification

With route discovery, extraction can process complete site content and validate against known routes.

## Route Sources

### Available Sources

| Source       | Description                               | Confidence |
| ------------ | ----------------------------------------- | ---------- |
| `sitemap`    | Parse `sitemap.xml`                       | 0.95       |
| `source`     | Walk source files (.md, .mdx, .tsx, .jsx) | 0.7        |
| `filesystem` | Walk build output directory               | 0.5        |
| `links`      | Extract from markdown links               | 0.4        |
| `manifest`   | Read previously generated manifest        | 0.8        |

### Source Priority Order

Default precedence:

```
sitemap → source → filesystem → links
```

Rationale: prioritize what the site explicitly declares (sitemap) over what might exist (filesystem), with inference (links) as fallback.

## Precedence Configuration

```typescript
interface RouteDiscoveryConfig {
  /** Ordered sources to check (first wins for each URL) */
  precedence: RouteSource[];

  /** How to resolve conflicts between sources */
  conflictResolution:
    | "source-first"
    | "sitemap-first"
    | "canonical-first"
    | "merge";

  /** How to handle missing routes (not in any source) */
  missingRoutes: "warn" | "error" | "ignore";
}

type RouteSource = "sitemap" | "source" | "filesystem" | "links" | "manifest";

const defaultConfig: RouteDiscoveryConfig = {
  precedence: ["sitemap", "source", "filesystem", "links"],
  conflictResolution: "merge",
  missingRoutes: "warn",
};
```

## Discovering Routes

### From Sitemap

```typescript
async function fromSitemap(projectRoot: string): Promise<DiscoveredRoute[]> {
  const paths = ["sitemap.xml", "sitemap-index.xml", "public/sitemap.xml"];

  for (const path of paths) {
    const fullPath = join(projectRoot, path);
    if (!existsSync(fullPath)) continue;

    const xml = await readFile(fullPath, "utf-8");
    const urls = parseSitemap(xml);

    return urls.map((url) => ({
      url: url.loc,
      canonical: url.loc,
      source: "sitemap",
      confidence: 0.95,
      metadata: { lastmod: url.lastmod },
    }));
  }

  return [];
}
```

### From Source Files

```typescript
async function fromSource(projectRoot: string): Promise<DiscoveredRoute[]> {
  const routes: DiscoveredRoute[] = [];
  const contentDirs = ["docs", "src/pages", "src/content", "pages", "content"];

  for (const dir of contentDirs) {
    const dirPath = join(projectRoot, dir);
    if (!existsSync(dirPath)) continue;

    const files = await glob("**/*.{md,mdx,tsx,jsx}", { cwd: dirPath });

    for (const file of files) {
      routes.push({
        url: fileToUrl(file),
        source: "source",
        confidence: 0.7,
        metadata: { file: join(dir, file) },
      });
    }
  }

  return routes;
}
```

### From Links (Inference)

```typescript
async function fromLinks(projectRoot: string): Promise<DiscoveredRoute[]> {
  const routes: DiscoveredRoute[] = [];
  const seen = new Set<string>();

  const mdFiles = await glob("**/*.md", { cwd: projectRoot });

  for (const file of mdFiles) {
    const content = await readFile(join(projectRoot, file), "utf-8");
    const links = extractLinks(content); // [text](/path) or [text](path)

    for (const link of links) {
      if (link.startsWith("http") || seen.has(link)) continue;
      seen.add(link);

      routes.push({
        url: link,
        source: "links",
        confidence: 0.4,
        metadata: { discoveredFrom: file },
      });
    }
  }

  return routes;
}
```

### File to URL Mapping

```typescript
function fileToUrl(file: string): string {
  let url = file.replace(/\.(md|mdx|tsx|jsx)$/, "").replace(/^index$/, "");

  // docs/getting-started.md → /getting-started
  // docs/api/reference.md → /api/reference
  url = url.replace(/^(docs|from content)\//, "/");

  return url.startsWith("/") ? url : `/${url}`;
}
```

## Conflict Resolution

### Merge Strategy

When the same URL appears in multiple sources:

```typescript
function resolveConflict(
  existing: DiscoveredRoute,
  incoming: DiscoveredRoute,
): DiscoveredRoute {
  switch (config.conflictResolution) {
    case "source-first":
      return existing;

    case "sitemap-first":
      return existing.source === "sitemap" ? existing : incoming;

    case "canonical-first":
      return existing.canonical ? existing : incoming;

    case "merge":
    default:
      return {
        ...existing,
        confidence: Math.max(existing.confidence, incoming.confidence),
        metadata: { ...existing.metadata, ...incoming.metadata },
      };
  }
}
```

## Output Format

### Discovered Route

```typescript
interface DiscoveredRoute {
  /** The URL path */
  url: string;

  /** Canonical URL if different */
  canonical?: string;

  /** Where this route was discovered */
  source: RouteSource;

  /** Confidence this route is valid (0-1) */
  confidence: number;

  /** Source-specific metadata */
  metadata: Record<string, unknown>;
}
```

### Discovery Result

```typescript
interface RouteDiscoveryResult {
  routes: DiscoveredRoute[];
  conflicts: DiscoveredRoute[]; // routes with multiple sources
  missing: DiscoveredRoute[]; // routes in sitemap but not found
  sourceCounts: Record<RouteSource, number>;
}
```

## Usage

```typescript
const discovery = new RouteDiscovery({
  precedence: ["sitemap", "source", "filesystem"],
  conflictResolution: "merge",
  missingRoutes: "warn",
});

const result = await discovery.discover("/path/to/project");

// Check for issues
if (result.conflicts.length > 0) {
  console.warn(`Found ${result.conflicts.length} conflicting routes`);
}

if (result.missing.length > 0) {
  console.warn(
    `Found ${result.missing.length} routes in sitemap not extracted`,
  );
}
```

## References

- [Sitemap protocol](https://www.sitemaps.org/protocol.html)
- [glob](https://www.npmjs.com/package/glob)
- [sitemap npm](https://www.npmjs.com/package/sitemap)
