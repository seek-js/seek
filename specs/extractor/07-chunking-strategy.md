# Chunking Strategy

**Status:** Draft  
**Audience:** Compiler implementers  
**Read time:** 5 min

## TL;DR

Chunking determines how content is split for retrieval.  
This spec defines configuration, split strategies, and overlap handling.

## Scope

This spec defines:

- chunk configuration options
- split strategies (priority order)
- token estimation
- overlap handling

This spec does not define:

- exact chunk constants (implementation detail)
- embedding generation (owned by compiler)

## Why Chunking Matters

| Chunk Size | Precision                | Context |
| ---------- | ------------------------ | ------- |
| Too large  | Low (irrelevant context) | High    |
| Too small  | High (exact match)       | Low     |

Chunking directly affects search quality and LLM token costs.

## Configuration

### Options

```typescript
interface ChunkConfig {
  /** Maximum tokens per chunk (default: 512) */
  maxTokens: number;

  /** Tokens to carry forward for context (default: 50) */
  overlapTokens: number;

  /** Preferred split boundaries (in priority order) */
  splitOn: ChunkSplitStrategy[];

  /** Minimum tokens for valid chunk (default: 50) */
  minTokens: number;

  /** Preserve structural boundaries */
  preserveStructure: boolean;
}

type ChunkSplitStrategy =
  | "heading" // Split on H1-H6
  | "paragraph" // Split on double newline
  | "sentence" // Split on .!?.
  | "code-block"; // Keep code intact

const defaultChunkConfig: ChunkConfig = {
  maxTokens: 512,
  overlapTokens: 50,
  splitOn: ["heading", "code-block", "paragraph"],
  minTokens: 50,
  preserveStructure: true,
};
```

### Presets

```typescript
const chunkPresets = {
  /** Precise for API docs */
  api: {
    maxTokens: 256,
    overlapTokens: 25,
    splitOn: ["heading", "code-block", "sentence"],
  },

  /** Balanced default */
  default: {
    maxTokens: 512,
    overlapTokens: 50,
    splitOn: ["heading", "code-block", "paragraph"],
  },

  /** Context-rich for long-form */
  longform: {
    maxTokens: 1024,
    overlapTokens: 100,
    splitOn: ["heading", "paragraph"],
  },
};
```

## Split Strategies

### Strategy Priority

1. **Heading** — Split at H1-H6 boundaries (preserves structure)
2. **Code block** — Keep code intact (splitting breaks it)
3. **Paragraph** — Split on double newlines (natural breaks)
4. **Sentence** — Fallback for oversized blocks

### Implementation

```typescript
class MarkdownChunker {
  constructor(private config: ChunkConfig) {}

  chunk(content: ParsedContent): Chunk[] {
    const chunks: Chunk[] = [];
    let current = "";
    let currentTokens = 0;

    for (const segment of this.segmentByStrategy(content)) {
      const segmentTokens = this.countTokens(segment.content);

      // Single segment too large — split it
      if (segmentTokens > this.config.maxTokens) {
        if (current) {
          chunks.push(this.finalizeChunk(current));
          current = "";
          currentTokens = 0;
        }
        chunks.push(...this.splitOversized(segment));
        continue;
      }

      // Adding exceeds max — flush current
      if (currentTokens + segmentTokens > this.config.maxTokens) {
        chunks.push(this.finalizeChunk(current));
        current = this.getOverlap(current);
        currentTokens = this.countTokens(current);
      }

      current += "\n" + segment.content;
      currentTokens += segmentTokens;
    }

    // Final chunk
    if (current && currentTokens >= this.config.minTokens) {
      chunks.push(this.finalizeChunk(current));
    }

    return chunks;
  }

  private segmentByStrategy(content: ParsedContent): ContentSegment[] {
    // Walk content, yielding segments by preferred split strategy
    // Returns array of { type, content, metadata }
  }
}
```

## Token Estimation

### Approximation Formula

```
tokens ≈ characters / 4
```

Add 20% buffer for markdown.

### Accurate Estimation

```typescript
import { encoding_for_model } from "tiktoken";

function countTokens(text: string): number {
  // More accurate: use tiktoken
  const enc = encoding_for_model("gpt-4");
  return enc.encode(text).length;
}

// Fallback approximation
function approximateTokens(text: string): number {
  return Math.ceil((text.length / 4) * 1.2);
}
```

## Overlap Handling

### Why Overlap Matters

Without overlap, context is lost at chunk boundaries:

```
Chunk 1: # Getting Started\n\nInstallation steps...
Chunk 2: # Configuration\n\nConfig options...
```

With overlap:

```
Chunk 1: # Getting Started\n\nInstallation steps...
Chunk 2: Installation steps...\n\n# Configuration\n\nConfig options...
```

### Implementation

```typescript
function getOverlap(text: string): string {
  if (this.config.overlapTokens === 0) return "";

  const words = text.split(/\s+/);
  const overlapWords = words.slice(-this.config.overlapTokens);
  return overlapWords.join(" ");
}

// Better: preserve semantic boundary
function getOverlap(text: string): string {
  const paragraphs = text.split(/\n\n+/);
  const lastParagraph = paragraphs[paragraphs.length - 1];

  // Include last heading if present
  const headingMatch = text.match(/#{1,6}\s+[^\n]+$/m);
  return headingMatch
    ? headingMatch[0] + "\n\n" + lastParagraph
    : lastParagraph;
}
```

## Output Format

### Chunk

```typescript
interface Chunk {
  id: string;
  content: string;
  tokenCount: number;
  heading?: string; // Parent heading if any
  sourcePath: string;
  position: number; // Index in sequence
}
```

### Chunk Result

```typescript
interface ChunkingResult {
  chunks: Chunk[];
  totalTokens: number;
  config: ChunkConfig;
}
```

## Usage

```typescript
const chunker = new MarkdownChunker(chunkPresets.default);

const result = chunker.chunk(parsedContent);

console.log(
  `Created ${result.chunks.length} chunks, ${result.totalTokens} tokens`,
);
```

## References

- [LangChain text splitters](https://js.langchain.com/docs/modules/data_connection/document_transformers/)
- [Semantic chunking](https://github.com/FullStackRetrieval/search/blob/main/semantic_chunking.md)
- [tiktoken](https://github.com/openai/tiktoken)
