# Extraction Strategy Landscape
## Research Notes for Seek.js Content Acquisition

**Status:** Draft  
**Type:** Research  
**Area:** `extractor`  
**Related Specs:** `../../specs/extractor/01-hybrid-extraction-architecture.md`

---

## Executive Summary

Seek.js needs an extraction strategy that works across:

- static documentation sites
- SSR frameworks
- MDX/Markdown-driven docs systems
- client-rendered SPAs
- managed SaaS indexing flows
- multiple deployment providers

There is no single acquisition mode that is ideal for all of these.

A strategy that depends only on **static artifact parsing** will fail for many SSR frameworks.  
A strategy that depends only on **remote crawling** will be too costly, too fragile, and too operationally heavy.  
A strategy that depends only on **source plugins** will miss non-source-native sites and reintroduce framework lock-in.

The current best direction for Seek.js is therefore a **multi-mode extraction system** that:

1. prefers local acquisition before remote crawl
2. treats final user-visible content as the truth source
3. supports source-native extraction where it materially improves fidelity
4. normalizes all modes into a common intermediate representation
5. escalates to heavier extraction modes only when cheaper paths fail

This document maps the strategy landscape and explains why the Seek.js extraction architecture is moving toward a hybrid model.

---

## 1. Problem Context

Extraction is the first irreversible step in the Seek.js pipeline.

If this step is wrong, every later stage becomes weaker:

- citations point to the wrong place
- sections are chunked poorly
- vectors are generated from noisy or duplicated content
- language/version boundaries get mixed together
- browser-side retrieval quality drops
- AI answers lose trustworthiness

Because of that, the extraction strategy must be chosen from the realities of the modern web, not from idealized assumptions.

### The key reality

Modern sites do not all expose content in the same way:

- some emit static HTML files
- some emit server bundles that only produce HTML when run
- some keep the cleanest content in Markdown or MDX source
- some expose meaningful content only after client-side rendering
- some rely on route manifests or sitemaps for discoverability
- some are easy to index locally
- some are only realistically indexable through controlled fallback modes

A universal AI search framework must recognize this heterogeneity.

---

## 2. Evaluation Criteria

The extraction strategy should be judged against the following criteria.

### 2.1 Content Fidelity
How accurately does the mode capture:
- the actual user-visible text
- heading structure
- canonical URL
- anchor targets
- locale/version boundaries

### 2.2 Operational Cost
How expensive is the mode in:
- compute
- latency
- network
- CI complexity
- SaaS infrastructure burden

### 2.3 Portability
How well does the mode work across:
- frameworks
- runtimes
- hosting providers
- local builds
- CI environments

### 2.4 Adoption Friction
How much setup does the user need?
- zero config
- light config
- plugin installation
- server lifecycle configuration
- browser automation setup

### 2.5 Determinism
Will repeated runs on the same input produce stable outputs?

### 2.6 Scalability
How well does the mode handle:
- 1,000+ pages
- 5,000+ pages
- multiple locales
- multiple versions

---

## 3. Extraction Modes in the Landscape

There are five meaningful acquisition strategies in the current Seek.js landscape.

1. source adapters
2. static artifact parsing
3. local render fetching
4. local headless rendering
5. remote crawling

These are not mutually exclusive. They are better understood as a stack of escalating acquisition methods.

---

## 4. Strategy A — Source Adapter Extraction

### Definition

Seek.js integrates with a source-native content system and extracts data before or alongside HTML generation.

Typical inputs:
- Markdown
- MDX
- content collections
- frontmatter
- ASTs
- docs-specific metadata

### Best fit

- Fumadocs
- Nextra
- Astro Starlight
- other MDX/Markdown-heavy doc systems

### Advantages

- highest semantic cleanliness
- less layout noise
- direct access to headings and sections
- access to frontmatter and source metadata
- strong fit for docs-first frameworks
- easier section-aware chunking inputs

### Weaknesses

- not universal
- final URL may differ from source path
- heading IDs may be finalized later in the rendering pipeline
- custom components may inject text that source extraction misses
- can create framework/content-system coupling

### Key insight

Source adapters are a **high-fidelity specialization**, not a universal foundation.

They are excellent when the ecosystem is source-native, but they cannot be the only path Seek.js depends on.

### Recommendation

Seek.js should support source adapters as a first-class mode for docs frameworks, but should not require them for basic compatibility.

---

## 5. Strategy B — Static Artifact Parsing

### Definition

Seek.js reads emitted HTML files from directories such as:
- `dist/`
- `build/`
- `out/`

and extracts content directly from those final artifacts.

### Best fit

- static site generators
- exported docs sites
- classic static hosting pipelines
- pure static landing sites

### Advantages

- deterministic
- fast
- cheap
- no server startup required
- no network dependency
- good fit for CI
- works naturally with semantic HTML
- ideal for static-first docs ecosystems

### Weaknesses

- fails when no meaningful HTML artifacts exist
- fragile for SSR-first frameworks
- may still include layout noise
- depends on the final build directory actually containing rendered pages

### Key insight

Static artifact parsing is excellent when it applies, but it is not enough for a modern framework-agnostic product.

### Recommendation

Seek.js should keep this as a major local mode, but should not assume it covers SSR ecosystems.

---

## 6. Strategy C — Local Render Fetching

### Definition

Seek.js starts the app's production server locally, discovers routes, and fetches rendered HTML from localhost.

This is not a generic crawl of the internet. It is a controlled local acquisition mode.

### Best fit

- Next.js App Router
- Remix
- Nuxt SSR
- SvelteKit SSR
- SSR landing pages
- frameworks that render HTML only when executed

### Advantages

- solves the SSR artifact gap
- still local and CI-friendly
- avoids public preview URL requirements
- avoids most remote auth complexity
- captures actual rendered HTML users receive
- lower cost than remote crawl
- easier to debug than internet-facing crawl flows

### Weaknesses

- requires lifecycle management for the local server
- needs route discovery help
- still vulnerable to app-specific runtime failures
- some pages may return shell-heavy or incomplete HTML
- requires careful timeout and readiness handling

### Key insight

This is likely the most important compatibility layer for SSR frameworks.

### Recommendation

Seek.js should treat Local Render Fetch as a first-class extraction mode, not as an afterthought.

---

## 7. Strategy D — Local Headless Rendering

### Definition

Seek.js opens local routes in a headless browser, waits for content to render, then extracts from the final DOM.

### Best fit

- client-rendered SPAs
- pages that return empty or shell-only HTML from normal fetch
- advanced interactive sites with content revealed only after client execution

### Advantages

- captures the most complete rendered DOM
- can handle shell-only apps
- useful as a controlled local fallback
- avoids internet-facing crawl variability

### Weaknesses

- expensive
- slow
- operationally heavier
- more brittle than source/static/local-fetch modes
- increases CI and environment setup complexity

### Key insight

Headless mode is necessary for some apps, but dangerous as a default.

### Recommendation

Seek.js should keep this as a strict fallback mode, enabled only when lighter paths are insufficient.

---

## 8. Strategy E — Remote Crawling

### Definition

Seek.js or Seek SaaS crawls a live or preview URL remotely and extracts content over the network.

### Best fit

- sites not available in the local environment
- managed indexing workflows
- fallback for external or already-hosted sites
- SaaS-friendly indexing for teams that do not want local extraction

### Advantages

- broad compatibility
- can index already-deployed sites
- useful for managed services
- useful when local build integration is unavailable

### Weaknesses

- highest operational cost
- auth complexity
- preview instability
- cookies, consent banners, environment drift
- network latency
- risk of runaway crawl scope
- hardest mode to debug
- easiest way to accidentally turn indexing into an infrastructure business

### Key insight

Remote crawl is valuable but dangerous as a default architecture.

### Recommendation

Seek.js should support remote crawling, but clearly demote it to controlled fallback or premium managed capability.

---

## 9. Comparative Summary

### Content fidelity
Roughly:
- source adapters: very high
- local headless: very high
- local render fetch: high
- static artifact parse: high when artifacts are real
- remote crawl: variable

### Operational cost
Roughly:
- static artifact parse: low
- source adapters: low to medium
- local render fetch: medium
- local headless: high
- remote crawl: high to very high

### Universality
Roughly:
- remote crawl: high
- local render fetch: high for SSR
- static artifact parse: high for static sites
- local headless: high but expensive
- source adapters: medium, ecosystem-specific

### Recommended role
- source adapters: high-fidelity specialization
- static artifact parse: default fast path where artifacts exist
- local render fetch: default SSR path
- local headless: last-resort local fallback
- remote crawl: controlled remote fallback

---

## 10. Why a Single Strategy Fails

### Source-only fails because
- not all sites are MDX/Markdown-based
- not all systems expose useful source metadata
- non-docs landing sites often lack a content-native abstraction
- custom rendering may change the final page meaning

### Static-artifact-only fails because
- SSR frameworks often do not emit final HTML artifacts
- App Router and similar systems produce framework internals instead
- some builds only become meaningful at runtime

### Local-fetch-only fails because
- some apps return shell-only HTML
- client-only rendering still requires a browser runtime
- route discovery may still be incomplete

### Headless-only fails because
- too slow
- too heavy
- poor default DX
- expensive to scale in CI or SaaS

### Remote-crawl-only fails because
- infrastructure cost rises quickly
- auth gets messy
- preview URLs are unstable
- debugging is painful
- the product becomes defined by crawling operations

---

## 11. The Emerging Seek.js Position

The best extraction strategy is not a single mode.

The best strategy is:

### Local-first acquisition with mode escalation

1. use source adapters where available and useful
2. parse static artifacts when true HTML exists
3. fetch locally rendered SSR output when static artifacts are insufficient
4. escalate to local headless rendering only when shell detection requires it
5. use remote crawl only when local extraction paths are unavailable or explicitly desired

### Why this works

This preserves:
- portability
- affordability
- determinism
- citation fidelity
- adoption flexibility

while still acknowledging real framework diversity.

---

## 12. Relationship to the Seek Manifest

The multi-mode strategy only works if all acquisition modes emit the same normalized output.

That output is the Seek Manifest.

This is the key abstraction that makes the whole system coherent.

Without a shared manifest:
- each mode would become its own indexing system
- compiler behavior would drift by mode
- testing would become much harder
- SaaS and local flows would diverge

With a shared manifest:
- the compiler can stay stable
- retrieval quality becomes easier to compare
- parity testing becomes possible
- new modes can be added without rewriting the rest of the system

---

## 13. Implications for v1

Based on current research, a strong v1 should include:

### Must include
- static artifact parse mode
- local render fetch mode
- semantic HTML defaults
- remote crawl as a fallback
- normalized manifest output
- build-time package isolation
- parser/runtime portability

### High-value additions
- source adapter support for MDX/Markdown docs systems
- headless fallback for shell-only SPAs
- route discovery precedence rules
- shell detection heuristics

### Should avoid as a core identity
- framework lock-in
- deep bundler coupling
- remote crawling as the default path
- always-on browser rendering

---

## 14. Open Research Questions

The architecture direction is strong, but several questions remain open.

### 14.1 Source adapter fidelity
How much of the final user-visible meaning can source adapters preserve without requiring final HTML reconciliation?

### 14.2 Route discovery conflicts
How should Seek.js resolve disagreement between:
- sitemap
- source adapter route data
- internal link discovery
- canonical tags
- user overrides

### 14.3 Shell detection
How should Seek.js decide that locally fetched HTML is insufficient and should escalate to headless rendering?

### 14.4 Chunking boundary ownership
Should the extractor emit:
- normalized sections only
- or fully chunked units
- or both with hints

### 14.5 Large-site operational budgets
What throughput, memory, and timeout targets should define acceptable extraction performance across modes?

---

## 15. Preliminary Conclusion

The extraction strategy landscape strongly suggests that Seek.js should not be built as:

- a pure HTML parser
- a pure crawler
- a pure plugin ecosystem
- or a pure source-ingestion system

It should instead be built as:

> a local-first, multi-mode extraction system that chooses the lightest reliable acquisition strategy for a given project and normalizes all outputs into a stable manifest contract.

That is the most practical path for:
- framework coverage
- deployment portability
- good developer experience
- manageable SaaS costs
- long-term architectural flexibility

---

## 16. Suggested Follow-Up Documents

This research should directly feed into:

- `../../specs/extractor/01-hybrid-extraction-architecture.md`
- `../../specs/extractor/02-seek-manifest-schema.md`
- `../../specs/extractor/03-extractor-compiler-contract.md`
- `../../specs/extractor/04-probe-and-pivot-strategy.md`
- `../../specs/extractor/05-route-discovery-and-conflict-resolution.md`

---

## 17. Working Principle

> Extract from the best available local representation of what users actually read, and escalate only when necessary.