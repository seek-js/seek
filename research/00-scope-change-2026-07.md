# Scope Change: Disaggregated RAG to Pagefind Integration Layer

**Status:** Accepted (decision record)  
**Date:** 2026-07  
**Audience:** Maintainers and anyone reading deleted extractor specs in git history  
**Read time:** 12 min

## TL;DR

The original scope specced a browser-side vector search engine with a SaaS layer.  
It was wrong on three counts: the browser cannot embed the query cheaply, the index-size
arithmetic was off by ~8x, and Pagefind already ships most of the specced work.  
Seek is now a thin open-source integration layer over Pagefind plus a user-deployed answer
endpoint. No engine, no vectors, no SaaS.

## What Was Specced Before

- 5-mode HTML extractor with probe-and-pivot escalation.
- Custom `.msp` MessagePack binary index format.
- int8-quantized embeddings compiled at build time.
- WASM parser as the extraction runtime.
- Browser-side hybrid (BM25 + vector) search over a downloaded index.
- A `$19/mo` managed SaaS built on the "Vector Database Tax" framing.

## Finding 1: The Query-Embedder Gap

Browser-side vector search requires embedding the **query** in the browser. There is no
third option:

| Option | Cost |
| --- | --- |
| `transformers.js` in the browser | ~10-15MB model download before the first search resolves |
| Network call per query | a backend, an API key, and per-keystroke latency and spend |

The specced client API had neither:

```js
useAiSearch({ indexUrl, storageStrategy })
```

No embedder, no model URL, no endpoint. The vector half of "hybrid search" had no way to
run. The advertised `<15ms` latency only ever described the lexical half, which is exactly
the half Pagefind already does.

## Finding 2: The Index-Size Arithmetic Was Wrong by ~8x

Claim: 5,000 pages compresses to "under 1.5MB" with int8 quantization plus Brotli.

Actual, for 5,000 pages at ~3 chunks per page = 15,000 chunks:

| Component | Raw | Brotli |
| --- | --- | --- |
| int8 vectors, 384 dims (`bge-small`) | ~5.8MB | ~5.2-5.5MB |
| chunk text at ~2KB per chunk | ~30MB | ~7MB |
| **Total** | **~36MB** | **~12MB** |

Two errors compounded:

1. int8 vectors are high-entropy. Brotli recovers only ~5-10% on them, not the ~70% that
   text achieves. Quantization and compression do not stack the way the claim assumed.
2. Chunk text was omitted from the budget entirely. It is the larger half.

`1.5MB` is roughly correct for a **500**-page site, not 5,000. And because Orama is an
in-memory engine, the browser must download and hydrate the entire index before the first
query returns. A 12MB blocking download is not a search experience.

## Finding 3: Pagefind Already Solved Most of the Specced Work

| Specced as new work | Pagefind status |
| --- | --- |
| Index sharding for incremental hydration | ships it; stays ~300kB over the wire at 50,000 pages |
| URL and anchor binding for citations | ships it |
| Nav/chrome removal | ships it |
| Portable distribution | prebuilt Rust binary; no native compilation step, and npm/pip channels both available |
| Multilingual indexing | fully automatic from `<html lang>`: 40+ languages, per-language indexes, correct stemming |

The last row matters most. The old `research/plan.md` flagged i18n as an unsolved challenge
and deferred it ("I will try to see how we can mitigate... need some time"). Pagefind
resolves it with no configuration at all.

## Finding 4: The Free-Tier Landscape Removes the SaaS Rationale

Verified 2026-07:

| Offering | Free tier |
| --- | --- |
| Orama Cloud | unlimited search queries **and** unlimited answer generations; 150 index updates/month |
| Algolia DocSearch | free for all docs sites including commercial ones (application + "Search by Algolia" branding) |
| Cloudflare Workers AI | 10,000 neurons/day = only ~15-25 Llama-3.1-8B calls/day |

Consequences:

- A `$19/mo` tier competes against two credible free products, one with unlimited answers.
- The Workers AI free tier cannot underwrite a free hosted answer layer at any real traffic.
  The old `ai-edge` cost model (`~$2.54/mo` COGS, 86% margin) does not survive contact with
  the actual neuron budget.
- The "$500/mo Vector Database Tax" was a strawman at docs scale. Nobody running a docs site
  pays that; the comparison priced production Pinecone against a static file.

## Finding 5: Execution Reality

| Measure | Value |
| --- | --- |
| Commits | 6 |
| Lines of specs and research | ~4,650 |
| Lines of implementation | 0 |
| Package state | all five are `export const phase0XPlaceholder = true` |
| Last commit before this change | 2026-05-01 |

The specs enforced p99 latency reporting for an extractor that could not read a file. The
project specced the hardest 15% of the problem (vector quantization, sharding, WASM parsing,
mode escalation) before shipping the easy 85% (run Pagefind, render a modal, stream an
answer).

## The New Scope

Seek is a thin integration layer. It wraps existing tools so a developer can add AI search to
a static site with no backend to run, no vendor account, and no approval process.

```
your build           ->  ./dist (a folder of HTML)
seek build ./dist    ->  runs Pagefind + emits context files. No LLM. Seconds.
typing in the UI     ->  plain Pagefind. instant, local, free, no API key needed.
"Ask AI" click       ->  user's own serverless fn -> LLM with a search tool -> streamed answer + citations
```

See `[../specs/01-architecture.md](../specs/01-architecture.md)` for the accepted architecture.

## What Was Cut and Why

| Cut | Reason |
| --- | --- |
| 5-mode extractor, probe-and-pivot | one input: a directory of built HTML. Mode selection has nothing to select. |
| Source adapters | build output is already framework-agnostic; adapters re-solve a solved problem per framework |
| Local render fetch, local headless render | booting a server or a browser in CI to read HTML the build already wrote |
| Remote crawl | needs a deployed site; contradicts "runs in your build" |
| `.msp` format, `@seekjs/compiler` | Pagefind owns index serialization |
| int8 quantization, sharding work | Pagefind's index is already sharded and small |
| WASM parser evaluation | Pagefind is the parser |
| Embeddings, browser vector search | see Finding 1 and Finding 2 |
| `Seek Manifest` schema | superseded by the CLI artifact contract |
| SaaS (`Vaan`), pricing, margin model | see Finding 4 |
| Performance budget spec for the extractor | no extractor |
| Committed Web Worker for hydration | premature; profile first (see the component contract) |
| "Experiment 2: LLM Citation Drift" | replaced by a design guarantee: the model emits `[n]`, never a URL |
| Cross-repo docs-sync CI (`seek` -> `seekjs-website`) | overhead with no reader today |

## Considered and Rejected: LangChain

Rejected for the answer endpoint. Reasons:

1. Its abstractions are vector stores, document loaders, chains, and agents. None are used.
   Seek's retrieval is one Pagefind call.
2. It inflates serverless cold-start, which is the dominant latency on a free-tier worker.
3. It has a history of edge-runtime incompatibility (Node built-in assumptions).
4. It churns. A ~150-line `fetch` adapter has no upgrade treadmill.

Replacement: one OpenAI-compatible adapter over raw `fetch`. Swapping `baseURL` covers
OpenAI, Groq, Gemini's OpenAI-compat endpoint, OpenRouter, Together, DeepSeek, Mistral, and
local Ollama.

Vercel AI SDK is an acceptable **later, worker-only** addition if a native non-OpenAI-shaped
provider (Anthropic, Bedrock) is needed. Never ship an LLM SDK in the client bundle.

## Considered and Deferred: Build-Time Query Expansion (doc2query)

Not rejected. Deferred.

Upside: generating likely questions per chunk at build time and indexing them alongside the
text would make **as-you-type** search semantic without any query-time embedder and without
an API key at search time.

Cost:

- a build-time LLM pass, so `seek build` stops being free and instant
- a content-hash cache to avoid re-expanding unchanged pages
- excerpt pollution: generated questions can surface in Pagefind excerpts as text the page
  does not contain

Revisit condition: ship plain lexical as-you-type first. Only if real-world use shows it is
inadequate, add this as an opt-in `--expand llm` flag, never a default.

## Retained From the Old Work

- `[../specs/toolchain-spec.md](../specs/toolchain-spec.md)` and
  `[../specs/turbo-spec.md](../specs/turbo-spec.md)`: workspace, build, and quality contracts.
- `[platform/01-deployment-provider-constraints.md](platform/01-deployment-provider-constraints.md)`:
  build-step insertion and static-hosting constraints still bind.
- `[publishing/01-docs-publishing-strategy.md](publishing/01-docs-publishing-strategy.md)` and
  `[implementation-package-publishing-workflow.md](implementation-package-publishing-workflow.md)`.
- The MCP direction. The answer endpoint's `search` tool is the same retrieval surface an MCP
  server would expose, so it is now a reuse, not a second implementation.

## Follow-Up Not in This Change

`packages/` still contains `compiler`, `extractor`, and `client`. The restructure to
`cli` / `core` / `element` / `react` / `templates` is a separate change.
