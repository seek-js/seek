# Platform Research

## Purpose

This directory contains research related to the **platform realities** that shape how Seek.js should be built, deployed, and operated.

The goal of these documents is not to define final implementation contracts. Instead, this folder exists to capture the environment Seek.js must survive in:

- modern hosting providers
- CI/CD systems
- build-time constraints
- monorepos
- docs publishing workflows
- SaaS ingestion and hosting tradeoffs
- deployment ergonomics for end users

In short, this folder answers:

- What external platform constraints affect Seek.js?
- What assumptions are safe across deployment providers?
- What operational patterns create unnecessary friction?
- How can Seek.js stay broadly compatible without becoming provider-specific?

---

## Why Platform Research Matters

Seek.js is not just a library problem.

It is also a **build pipeline problem**, a **deployment problem**, and a **developer workflow problem**.

A technically elegant extractor or compiler is not enough if it only works under one narrow set of assumptions, such as:

- static-only output
- one bundler
- one deployment provider
- one CI environment
- one docs publishing workflow

Platform research exists to keep the architecture grounded in how projects are actually built and shipped.

That includes questions like:

- Can this run inside Vercel or Netlify build environments?
- What happens in Cloudflare Pages or GitHub Actions?
- How should docs be published to a landing site repo?
- When should Seek.js use local extraction versus managed SaaS?
- Where should internal specs live versus public docs?

---

## Scope

Platform research in this folder should cover topics such as:

### 1. Deployment Provider Constraints
How major deployment providers behave during:

- install
- build
- artifact generation
- output publishing
- static asset hosting

Examples:
- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages
- generic CI pipelines

### 2. Build and CI Workflow Compatibility
Research into how Seek.js should fit into:

- local developer workflows
- CI pipelines
- preview deployments
- production builds
- monorepo setups

### 3. Documentation Publishing Strategy
How internal repo content, public docs, and landing site content should be separated and synced.

This includes:
- whether to use git submodules or CI sync
- what belongs in `docs/`
- what belongs in `specs/`
- what belongs in `research/`

### 4. SaaS Operational Boundaries
Research into the correct boundary between:

- local extraction
- local compile
- SaaS compile
- SaaS hosting
- remote crawl fallback

### 5. Repository Structure and Information Architecture
How to organize the repo so that contributors can understand:

- product vision
- research-backed reasoning
- implementation specs
- public-facing docs

without mixing them together.

---

## Relationship to Other Directories

### `research/`
The parent `research/` folder contains exploratory work across the whole project.

### `research/platform/`
This folder focuses specifically on:
- deployment constraints
- docs publishing
- CI/CD behavior
- provider compatibility
- operational strategy

### `research/extractor/`
That folder focuses on:
- content acquisition
- SSR/static extraction tradeoffs
- parser/runtime evaluation
- extraction-mode decisions

### `specs/`
When platform conclusions become stable enough to guide implementation, they should influence or become formal specs.

### `docs/`
This is reserved for future public-facing documentation and should not become a catch-all for internal planning.

---

## Current Platform Assumptions

The current research-backed assumptions for Seek.js are:

### Assumption 1
**Seek.js must be build-time or CI-time compatible.**

Users should be able to integrate Seek.js into normal deployment workflows without needing a persistent indexing backend.

### Assumption 2
**Provider agnosticism is a feature, not a side effect.**

Seek.js should work across major deployment providers without making one provider's APIs mandatory.

### Assumption 3
**Static asset output is the compatibility layer.**

Whether compiled locally or via SaaS, the final search index should remain deployable as a static artifact.

### Assumption 4
**Remote crawl should not be the default ingestion story.**

It is too operationally expensive and too fragile to become the center of the product.

### Assumption 5
**Internal engineering material should be separated from public docs.**

This is important both for contributor clarity and for any future docs publishing pipeline.

---

## Current Documents in This Folder

### `01-deployment-provider-constraints.md`
Research on the build, artifact, and runtime constraints imposed by major deployment providers and CI environments.

This document explains why Seek.js should remain:
- build-time or CI-time compatible
- provider agnostic
- local-first before remote crawl
- static-artifact friendly at the final output layer

### `02-docs-publishing-strategy.md`
Initial note capturing the earliest docs publishing direction.

This file should be treated as a lightweight historical note rather than the canonical platform research document for repo boundaries.

### `03-seek-and-website-sync-strategy.md`
Canonical research note on how the two repositories should relate:

- framework / SDK repo: `seek-js/seek`
- landing website repo: `seek-js/seekjs-website`

This document explains:
- why engineering truth should remain in `seek`
- why public presentation should remain in `seekjs-website`
- why CI-based sync is preferable to git submodules
- why `docs/`, `research/`, and `specs/` should remain distinct
- what kinds of content should and should not be synced across repos

As more platform research is added, this folder may later include documents such as:

- CI build constraints
- SaaS ingestion boundaries
- repo information architecture
- monorepo deployment patterns

---

## How to Use This Folder

Use this folder when you need to understand **why** Seek.js is making certain platform-level decisions.

Examples:
- why the repo is organized a certain way
- why public docs are separated from internal specs
- why SaaS compile is favored over SaaS crawl
- why deployment-provider compatibility is a hard requirement
- why build-time integration is preferred over runtime-specific coupling

If you need exact implementation contracts, this folder is not the final source of truth. It should point toward specs, not replace them.

---

## Writing Guidance

A document belongs in `research/platform/` if it is primarily about:

- platform comparison
- deployment constraints
- operational tradeoffs
- repository organization
- workflow strategy
- ecosystem compatibility

A document should move into `specs/` only when it starts defining:

- exact interfaces
- exact operational rules
- exact retry/failure behavior
- exact supported workflows
- implementation commitments

---

## Long-Term Goal

This directory should help ensure that Seek.js remains:

- easy to adopt
- easy to deploy
- easy to reason about
- compatible across hosting environments
- structured in a way that scales with the project

Platform research exists so that Seek.js does not become accidentally locked to one workflow, one provider, or one contributor's local assumptions.

> Good platform research keeps the architecture honest.