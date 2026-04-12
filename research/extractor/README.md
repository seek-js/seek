# Extractor Research

## Purpose

This directory contains the research material that informs the design of the Seek.js extraction layer.

The extractor is the most important part of the Seek.js pipeline. If extraction is weak, every downstream system becomes unreliable:

- citations point to the wrong pages
- chunking becomes noisy
- vectorization quality drops
- i18n and versioned content get mixed together
- browser-side search quality degrades
- AI summaries become less trustworthy

The goal of this folder is to capture **why** the extractor is being designed a certain way before those ideas are turned into implementation specs.

---

## What belongs here

Research documents in this folder should focus on:

- framework ecosystem realities
- deployment-provider constraints that affect extraction
- SSR vs static extraction tradeoffs
- crawl vs artifact vs source-adapter comparisons
- parser/runtime evaluation
- benchmark ideas
- operational risks
- research-backed product reasoning

This folder is for **evidence, analysis, experiments, and rationale**.

It is intentionally different from `seek/specs/`, which is where implementation-facing contracts and accepted architecture decisions should live.

---

## Relationship to `specs/`

A simple way to think about the repo structure:

- `docs/`
  - public or product-facing documentation

- `research/`
  - exploratory thinking, comparisons, findings, tradeoffs, and intent

- `specs/`
  - implementation-ready design contracts

Research should answer questions like:

- What problem are we solving?
- What are the realistic constraints of modern frameworks?
- What alternatives did we compare?
- Why is one path better than another?
- What risks should we expect before implementation begins?

Specs should answer questions like:

- What is the schema?
- What is the contract?
- What does the CLI do?
- What are the exact failure modes and fallback rules?
- What must implementation teams build?

---

## Current extraction direction

The current research direction for Seek.js extraction is:

1. Treat the **final user-visible page** as the source of truth
2. Prefer **local extraction paths** before remote crawling
3. Use a **hybrid acquisition strategy** depending on project type
4. Normalize all extraction output into a shared **Seek Manifest**
5. Keep the system **framework-agnostic by default**
6. Use adapters only where they materially improve fidelity

This means Seek.js should support multiple extraction modes, such as:

- source adapters for MDX/Markdown-driven docs systems
- static artifact parsing for true static builds
- local render fetching for SSR frameworks like Next.js App Router
- local headless rendering as a last resort for shell-only SPAs
- remote crawling only as a controlled fallback

---

## Why this matters

Modern frameworks do not all expose content in the same way:

- static site generators may emit parseable HTML files
- SSR frameworks may only expose final HTML when a production server is running
- MDX-driven docs frameworks often have cleaner source-level structures than their final HTML
- SPA shells may require local browser rendering to reveal meaningful content

A good extractor design must acknowledge these realities without turning Seek.js into a framework-specific maintenance nightmare.

That is why the research here pushes toward:

- contract-first extraction
- probe-and-pivot mode selection
- local-first acquisition
- build-time compatibility
- clean separation between extraction and compilation

---

## Current documents in this folder

### `01-extraction-strategy-landscape.md`
The high-level research map for content acquisition.

This document compares:
- source adapters
- static artifact parsing
- local render fetching
- local headless rendering
- remote crawling

Use it to understand why Seek.js is taking a multi-mode, local-first extraction direction.

### `02-ssr-and-local-render-fetch.md`
Focused research on the SSR compatibility problem.

This document explains:
- why static artifact parsing alone is insufficient
- why Next.js App Router creates a major blind spot
- why Local Render Fetch should be a first-class extraction mode
- why SSR should be treated as a local rendered-output problem before it becomes a remote crawl problem

### `03-parser-runtime-evaluation.md`
Research on parser/runtime selection for the extractor.

This document explains:
- why `html-rewriter-wasm` is the current best fit for `v1`
- why portability matters more than native-only throughput right now
- why package boundaries matter more than parser size for browser bundle health
- why Seek.js should preserve a swappable internal parser engine abstraction

---

## Research themes in this folder

The extractor research should continue to develop around a few core themes.

### 1. Acquisition strategy
How should Seek.js obtain content?

Possible paths include:

- source/AST adapters
- static HTML artifact parsing
- local production server fetching
- local headless rendering
- remote crawling

### 2. URL fidelity
How do we preserve:

- canonical URLs
- anchors
- locale/version routing
- stable citation targets

### 3. Content cleanliness
How do we avoid indexing:

- nav
- footers
- sidebars
- duplicated layout chrome
- hidden UI state

### 4. Runtime portability
How do we support:

- Node
- Bun
- Deno
- CI/build environments

without adding too much installation complexity?

### 5. Operational safety
How do we prevent:

- runaway crawling
- excessive build latency
- unstable extraction
- mode-selection surprises
- SaaS cost explosions

---

## Current working hypotheses

The current research-backed hypotheses are:

### Hypothesis 1
**Static artifact parsing alone is not enough.**

This is especially true for modern SSR frameworks like Next.js App Router.

### Hypothesis 2
**Remote crawling should not be the default compatibility path.**

It is too costly, too variable, and too operationally heavy to become the foundation.

### Hypothesis 3
**Source adapters are a high-fidelity path for docs systems, but not a universal one.**

They are powerful for MDX/Markdown ecosystems, but they cannot be the only model Seek.js depends on.

### Hypothesis 4
**Local Render Fetch is likely the most important compatibility layer for SSR.**

It preserves local determinism while giving Seek.js access to the final rendered HTML users actually receive.

### Hypothesis 5
**The Seek Manifest is the core abstraction that makes multi-mode extraction feasible.**

As long as every mode converges on the same normalized output, the compiler and client layers can stay stable.

---

## Expected outputs from research

Research in this folder should eventually feed directly into specs such as:

- extractor architecture RFC
- seek manifest schema
- extractor/compiler contract
- probe-and-pivot strategy
- route discovery rules
- failure handling and escalation
- chunking rules
- i18n/version handling
- performance targets
- test strategy

If a research document is mature and its conclusions are stable, it should be converted into a corresponding document under `seek/specs/extractor/`.

---

## Suggested reading order

For someone new to the project, a good reading order is:

1. this file
2. `01-extraction-strategy-landscape.md`
3. `02-ssr-and-local-render-fetch.md`
4. `03-parser-runtime-evaluation.md`
5. related platform/deployment research in `../platform/`
6. extractor specs in `../../specs/extractor/`

A good paired reading flow is:

- research first for intent and tradeoffs
- specs second for implementation rules

---

## Relationship to current specs

The current research documents map cleanly to the existing extractor specs:

- `01-extraction-strategy-landscape.md`
  - informs `../../specs/extractor/01-hybrid-extraction-architecture.md`
- `02-ssr-and-local-render-fetch.md`
  - informs `../../specs/extractor/01-hybrid-extraction-architecture.md`
  - informs `../../specs/extractor/04-probe-and-pivot-strategy.md`
- `03-parser-runtime-evaluation.md`
  - informs parser-engine and packaging decisions captured in the extractor architecture and future engine-specific specs

This relationship is intentional.

Research should explain the reasoning.
Specs should define the contract.

---

## Status

This folder is intentionally early-stage and exploratory.

Documents here may:
- compare multiple paths
- contain open questions
- propose experiments
- challenge current assumptions

That is expected.

The purpose of this folder is not to declare implementation truth too early.
Its purpose is to make sure Seek.js chooses the right truth before implementation hardens around it.