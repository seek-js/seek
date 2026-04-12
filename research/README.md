# Seek.js Research Index

This directory contains **research-backed documents** that inform Seek.js architecture, product direction, and implementation priorities.

The purpose of `research/` is different from `specs/`:

- `research/` captures **exploration, tradeoffs, ecosystem reality, and early reasoning**
- `specs/` captures **implementation-ready decisions, contracts, and engineering rules**

In short:

- if a document asks **"what should we do, and why?"**, it belongs in `research/`
- if a document asks **"how exactly must this work?"**, it belongs in `specs/`

---

## Why this directory exists

Seek.js is being designed for a difficult problem space:

- framework-agnostic AI search
- browser-side hybrid retrieval
- build-time or CI-time indexing
- support for static sites, SSR apps, and docs systems
- optional managed SaaS without forcing backend lock-in

That means architecture decisions cannot be made from abstraction alone. They need to be grounded in:

- how modern frameworks actually build and render pages
- how docs systems structure content
- how deployment providers behave
- where extraction breaks down in real-world projects
- what tradeoffs are acceptable for `v1`

This directory is where that reasoning lives.

---

## Current research areas

### `extractor/`
Research related to content discovery, route acquisition, HTML/source extraction, SSR handling, parser choices, and indexing tradeoffs.

Typical topics include:

- static artifact parsing vs local SSR fetching
- MDX/Markdown source adapters
- semantic HTML defaults
- headless rendering as fallback
- crawl-first vs local-first strategies
- parser/runtime portability

### `platform/`
Research related to deployment providers, CI/CD workflows, documentation publishing, repository structure, and managed service ergonomics.

Typical topics include:

- docs publishing strategy
- CI sync vs git submodules
- repository boundaries between `seek` and `seekjs-website`
- hosting-provider compatibility
- build-time constraints across platforms
- SaaS upload and hosting considerations

---

## Relationship to the rest of the repo

### `README.md`
The root README captures the product vision and high-level roadmap.

### `research/`
Research documents explain the reasoning behind architectural direction.

### `specs/`
Specifications convert that research into engineering-ready contracts and implementation rules.

### `docs/`
Reserved for future user-facing/public documentation that may be synced to the landing site.

---

## Current reading order

If you are new to the repo, this is the recommended order:

1. `../README.md`
   - product vision, business framing, and overall pipeline
2. `platform/01-deployment-provider-constraints.md`
   - deployment realities that shape Seek.js build, CI, and hosting compatibility
3. `platform/03-seek-and-website-sync-strategy.md`
   - canonical reasoning for how `seek-js/seek` and `seek-js/seekjs-website` should stay separate but connected
4. `platform/02-docs-publishing-strategy.md`
   - the original lightweight note that pointed toward the docs publishing direction
5. extractor research documents
   - framework/runtime/deployment realities that shape extraction
6. `../specs/extractor/01-hybrid-extraction-architecture.md`
   - the current architecture RFC that turns research into a concrete direction

---

## Document lifecycle

Research documents are expected to evolve quickly.

A typical lifecycle looks like this:

1. problem is explored in `research/`
2. tradeoffs and alternatives are written down
3. a concrete direction is selected
4. the selected direction is formalized in `specs/`
5. implementation follows the spec, not the research note

Because of this, research docs may contain:

- competing ideas
- rejected approaches
- early assumptions
- notes from architecture reviews
- ecosystem observations that later become specs

That is intentional.

---

## Writing guidance

A document belongs in `research/` if it is primarily:

- comparative
- exploratory
- evidence-oriented
- ecosystem-aware
- still shaping the final decision

A document should move into `specs/` when it becomes:

- prescriptive
- implementation-oriented
- contract-driven
- relied on by engineering as the source of truth

---

## Near-term priorities

The most important research streams right now are:

1. extraction strategies across static, SSR, and SPA frameworks
2. source-native extraction for MDX/Markdown docs systems
3. route discovery and canonical URL fidelity
4. deployment-provider constraints and CI compatibility
5. docs publishing and repository information architecture
6. managed SaaS ingestion without forcing remote crawl as the default

---

## Philosophy

Seek.js should be built from the reality of how websites are actually produced and deployed, not from assumptions about one framework or one hosting model.

Research exists to keep the project honest.

> Research should explain the intent.
> Specs should define the contract.