# Performance Budgets

**Status:** Draft  
**Audience:** Extractor and compiler implementers, CI/CD maintainers  
**Read time:** 5 min

## TL;DR

Performance budgets define time, memory, and throughput limits.  
This spec defines budgets and enforcement for extraction and compilation.

## Scope

This spec defines:

- time budgets
- memory budgets
- throughput limits
- enforcement and reporting

This spec does not define:

- mode-specific budgets (implementation detail)
- provider-specific limits (owned by `research/platform/`)

## Why Budgets Matter

Without budgets:

- Slow extractions go unnoticed in CI
- No failure detection (slow vs broken)
- Unpredictable behavior on large sites

With budgets:

- Fail-fast on regressions
- Predictable CI times
- Actionable diagnostics

## Time Budgets

### Extraction

| Operation              | Budget             | Description           |
| ---------------------- | ------------------ | --------------------- |
| Per-page extraction    | 5,000 ms           | Single page from dist |
| Entire site extraction | 300,000 ms (5 min) | Total for all pages   |
| Per-adapter detect     | 1,000 ms           | Framework detection   |

### Compilation

| Operation           | Budget            | Description                 |
| ------------------- | ----------------- | --------------------------- |
| Manifest validation | 5,000 ms          | Schema validation           |
| Per-chunk operation | 100 ms            | Individual chunk processing |
| Full compilation    | 60,000 ms (1 min) | Entire manifest to index    |

## Memory Budgets

### Extraction

| Operation           | Budget | Description            |
| ------------------- | ------ | ---------------------- |
| Per-page extraction | 128 MB | Single page processing |
| Peak extraction     | 512 MB | All concurrent pages   |

### Compilation

| Operation        | Budget | Description             |
| ---------------- | ------ | ----------------------- |
| Per-chunk memory | 64 MB  | Individual chunk        |
| Full compilation | 512 MB | Entire manifest → index |
| Output index     | 50 MB  | Compressed index file   |

## Throughput Limits

| Operation                    | Limit | Description       |
| ---------------------------- | ----- | ----------------- |
| Concurrent page extraction   | 4     | Parallel pages    |
| Concurrent chunk operations  | 8     | Parallel chunking |
| HTTP requests (render fetch) | 10    | Parallel fetches  |

## Configuration

### Interface

```typescript
interface PerformanceBudgets {
  extraction: ExtractionBudgets;
  compilation: CompilationBudgets;
}

interface ExtractionBudgets {
  maxTimePerPage: number; // ms (default: 5000)
  maxMemoryPerPage: number; // MB (default: 128)
  maxConcurrent: number; // (default: 4)
  maxTotalTime: number; // ms (default: 300000)
  maxPages: number; // 0 = unlimited
}

interface CompilationBudgets {
  maxCompileTime: number; // ms (default: 60000)
  maxMemory: number; // MB (default: 512)
  maxIndexSize: number; // MB (default: 50)
  maxChunkTime: number; // ms (default: 100)
}

const defaultBudgets: PerformanceBudgets = {
  extraction: {
    maxTimePerPage: 5000,
    maxMemoryPerPage: 128,
    maxConcurrent: 4,
    maxTotalTime: 300000,
    maxPages: 0,
  },
  compilation: {
    maxCompileTime: 60000,
    maxMemory: 512,
    maxIndexSize: 50,
    maxChunkTime: 100,
  },
};
```

### Presets

```typescript
const budgetPresets = {
  /** Strict CI enforcement */
  ci: {
    extraction: { maxTimePerPage: 3000, maxConcurrent: 2 },
    compilation: { maxCompileTime: 30000 },
  },

  /** Standard defaults */
  default: defaultBudgets,

  /** Relaxed for large sites */
  large: {
    extraction: { maxTimePerPage: 10000, maxConcurrent: 8 },
    compilation: { maxCompileTime: 120000 },
  },
};
```

## Enforcement

### Time Measurement

```typescript
class PerformanceEnforcer {
  private budgets: PerformanceBudgets;
  private pageTimings: Map<string, number> = new Map();

  async measurePage<T>(
    url: string,
    fn: () => Promise<T>,
  ): Promise<MeasureResult<T>> {
    const start = performance.now();

    try {
      const result = await Promise.race([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `Exceeded ${this.budgets.extraction.maxTimePerPage}ms`,
                ),
              ),
            this.budgets.extraction.maxTimePerPage,
          ),
        ),
      ]);

      const timing = performance.now() - start;
      this.pageTimings.set(url, timing);

      return { result, passed: true, timing };
    } catch (error) {
      const timing = performance.now() - start;
      return { result: null as T, passed: false, timing, error };
    }
  }

  async extractAll(urls: string[], fn: (url: string) => Promise<any>) {
    const limit = pLimit(this.budgets.extraction.maxConcurrent);

    const results = await Promise.all(
      urls.map((url) => limit(() => this.measurePage(url, () => fn(url)))),
    );

    return results;
  }
}
```

### Concurrency Control

```typescript
import pLimit from "p-limit";

async function extractWithLimit(
  urls: string[],
  extractionFn: (url: string) => Promise<any>,
  concurrency: number,
) {
  const limit = pLimit(concurrency);

  return Promise.all(urls.map((url) => limit(() => extractionFn(url))));
}
```

## Reporting

### Report Format

```typescript
interface PerformanceReport {
  totalPages: number;
  successful: number;
  failed: number;
  totalTime: number;
  avgTimePerPage: number;
  p50Time: number;
  p95Time: number;
  p99Time: number;
  violations: BudgetViolation[];
}

interface BudgetViolation {
  page: string;
  type: "time" | "memory";
  actual: number;
  budget: number;
}
```

### Example Output

```json
{
  "totalPages": 150,
  "successful": 148,
  "failed": 2,
  "totalTime": 180000,
  "avgTimePerPage": 1200,
  "p50Time": 1100,
  "p95Time": 3400,
  "p99Time": 4800,
  "violations": [
    {
      "page": "/docs/api",
      "type": "time",
      "actual": 8000,
      "budget": 5000
    },
    {
      "page": "/docs/advanced",
      "type": "memory",
      "actual": 180,
      "budget": 128
    }
  ]
}
```

### Usage

```typescript
const enforcer = new PerformanceEnforcer(budgetPresets.ci);

const results = await enforcer.extractAll(pages, extractPage);

const report = enforcer.getReport();

if (report.failed > 0) {
  console.error(`Budget exceeded: ${report.failed} pages failed`);
  console.error(report.violations);
  process.exit(1);
}
```

## CLI Integration

### Flags

```bash
# Use preset
seek extract --perf-budget ci

# Use custom config
seek extract --perf-budget ./budgets.json

# Output report
seek extract --perf-report ./perf-report.json

# Fail on any violation
seek extract --perf-strict
```

### Config File

```json
// budgets.json
{
  "extraction": {
    "maxTimePerPage": 3000,
    "maxMemoryPerPage": 128,
    "maxConcurrent": 4,
    "maxTotalTime": 300000
  },
  "compilation": {
    "maxCompileTime": 60000,
    "maxMemory": 512,
    "maxIndexSize": 50
  }
}
```

## References

- [p-limit](https://www.npmjs.com/package/p-limit)
- [Node.js performance](https://nodejs.org/api/performance.html)
- [clinic.js](https://clinicjs.org/)
