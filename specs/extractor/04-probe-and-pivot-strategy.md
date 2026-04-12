# Seek.js Probe-and-Pivot Strategy
## Extraction Mode Selection and Escalation Rules

**Status:** Draft  
**Decision Type:** Subsystem Specification  
**Applies To:** `@seekjs/extractor`, `@seekjs/compiler`, extractor CLI, local build flows, managed SaaS extraction triggers  
**Depends On:** `01-hybrid-extraction-architecture.md`  
**Audience:** SDK maintainers, extractor implementers, CLI implementers, infrastructure engineers

---

## Executive Summary

Seek.js supports multiple ways to acquire extractable content:

- source adapters
- static artifact parsing
- local render fetching
- local headless rendering
- remote crawling

The challenge is not only implementing these modes, but choosing the right one consistently and safely.

This document defines the **Probe-and-Pivot Strategy**: the decision system Seek.js uses to determine which extraction mode should run for a given project, when to escalate to a more expensive mode, and when to stop with a useful error instead of continuing into a bad or costly path.

The strategy is guided by these principles:

1. **Prefer local and deterministic modes before remote modes**
2. **Prefer lower-cost modes before higher-cost modes**
3. **Prefer semantically richer inputs before noisier inputs**
4. **Do not escalate silently into expensive or risky modes without guardrails**
5. **All successful modes must converge on the same Seek Manifest contract**

---

## 1. Purpose

The purpose of the Probe-and-Pivot Strategy is to answer these questions:

- Which extraction mode should Seek.js try first?
- How does Seek.js know when a mode is unsuitable?
- When should Seek.js escalate to another mode?
- When should Seek.js stop and report failure?
- How can Seek.js remain framework-agnostic without becoming operationally unpredictable?

Without a formal strategy, a multi-mode extractor becomes fragile:

- static sites may accidentally invoke headless mode
- SSR apps may fall back to remote crawl too early
- source adapters may be ignored even when they provide better fidelity
- expensive modes may activate when cheaper local modes would have worked
- users may not understand why Seek.js chose one path over another

This spec prevents those outcomes.

---

## 2. Design Principles

### 2.1 Local-First
Seek.js should prefer extraction paths that run entirely in the local build or CI environment.

Local paths are usually:

- faster
- cheaper
- easier to debug
- more deterministic
- more compatible with private or staging-only content

### 2.2 Lowest Sufficient Cost
Seek.js should prefer the cheapest mode that can meet extraction quality requirements.

Approximate cost ordering:

1. source adapter
2. static artifact parse
3. local render fetch
4. local headless render
5. remote crawl

### 2.3 Final User-Visible Content Matters Most
Even when source-level extraction is available, Seek.js must preserve compatibility with what users actually see and navigate.

This means:

- canonical URLs matter
- heading anchors matter
- locale/version routing matters
- final page identity matters

### 2.4 Explicit Escalation
Escalation from one mode to another must follow defined rules.

Seek.js should not drift upward into:
- headless mode
- remote crawl
- high-cost fallback paths

without clear signals that a cheaper mode is insufficient.

### 2.5 Manifest Stability
No matter which extraction mode is chosen, the output must normalize into the same Seek Manifest boundary.

Mode selection must not create incompatible downstream behavior.

---

## 3. Probe-and-Pivot Overview

The Probe-and-Pivot Strategy works in two stages:

### Stage A — Probe
Seek.js inspects the project and environment to detect which extraction inputs are available.

This includes questions like:

- Is a source adapter configured?
- Does the project emit parseable HTML artifacts?
- Can a local production server be started?
- Is fetched HTML content-rich or shell-only?
- Is headless mode allowed?
- Is remote crawl allowed?

### Stage B — Pivot
Based on the probe results, Seek.js selects the best available extraction mode and may escalate if the selected mode proves insufficient.

---

## 4. Supported Extraction Modes

This spec assumes the following modes are available, as defined in the extractor architecture RFC.

### Mode A — Source Adapter Mode
Use when a source/content-system adapter exists and can produce high-fidelity extraction records.

Examples:
- MDX docs systems
- Markdown content collections
- source-native docs frameworks

### Mode B — Static Artifact Parse Mode
Use when final built HTML files are available locally.

Examples:
- Astro
- VitePress
- Docusaurus
- static exports

### Mode C — Local Render Fetch Mode
Use when a local production server can be started and serves final HTML through local HTTP requests.

Examples:
- Next.js App Router
- Remix
- Nuxt SSR
- SvelteKit SSR

### Mode D — Local Headless Render Mode
Use only when local HTML fetches produce shell-only or insufficient content.

Examples:
- client-rendered SPAs
- shell-first landing sites

### Mode E — Remote Crawl Mode
Use only when local extraction paths are not available or a managed remote workflow is explicitly required.

Examples:
- SaaS-only indexing
- external site indexing
- hosted-only environments

---

## 5. Probe Order

Seek.js should probe modes in the following order:

1. source adapter availability
2. static artifact HTML availability
3. local production server start capability
4. HTML sufficiency from local render fetch
5. headless fallback eligibility
6. remote crawl eligibility

This order is intentional.

### Why this order?

#### 1. Source adapter first
A source adapter usually provides:
- the cleanest content
- the least layout noise
- the richest heading/frontmatter metadata

For source-native docs systems, this is often the best input available.

#### 2. Static HTML second
Static HTML is:
- deterministic
- fast
- local
- easy to validate
- free from server lifecycle complexity

#### 3. Local render fetch third
This solves the SSR artifact gap while remaining local and deterministic.

It is more operationally complex than static parsing because it requires:
- server startup
- readiness checks
- local HTTP fetching
- route discovery

But it is still significantly better than remote crawl.

#### 4. HTML sufficiency check before headless
A local render fetch may technically succeed while still returning:
- app shells
- placeholder content
- hydration stubs
- near-empty pages

Before escalating to headless, Seek.js must verify whether the fetched HTML is actually useful.

#### 5. Headless before remote crawl
If local HTML fetch is insufficient but the project can still render locally, headless mode should be preferred over remote crawl when allowed.

Why?
- still local
- still deterministic
- avoids preview auth and staging complexity
- cheaper than remote crawl in many environments

#### 6. Remote crawl last
Remote crawl is the highest-risk default path:
- slowest
- most variable
- least deterministic
- most expensive
- hardest to debug

So it must remain last.

---

## 6. Required Probe Inputs

The probe system may use any of the following signals.

### 6.1 User-Provided Config
User config has highest importance when present.

Examples:
- explicit extraction mode
- adapter configuration
- static output directory
- local start command
- readiness URL
- route list
- remote crawl enablement
- headless allow/deny setting

### 6.2 Repository/Project Signals
Examples:
- presence of MDX/Markdown content systems
- framework config files
- static output folders
- known build artifacts
- route manifests
- sitemap output
- package scripts

### 6.3 Runtime Signals
Examples:
- local server starts successfully
- local fetch returns 200
- local fetch returns meaningful HTML
- HTML has a content root
- extracted text density exceeds threshold

### 6.4 Mode Capability Signals
Examples:
- headless runtime available
- remote crawl credentials available
- SaaS remote mode allowed
- required environment variables present

---

## 7. Decision Rules

### 7.1 Explicit User Override Wins
If the user explicitly selects a mode, Seek.js should respect it unless:

- required prerequisites are missing
- the selected mode is disabled by policy
- the selected mode is incompatible with the execution environment

In such cases, Seek.js must fail with a clear explanation instead of silently choosing a different high-cost mode.

### 7.2 Automatic Selection Is Used Only When Mode Is Not Explicit
If no explicit mode is provided, Seek.js should run the probe order and select the first mode that is both:

- available
- sufficient

### 7.3 Sufficiency Matters as Much as Availability
A mode is not selected only because it exists.

Example:
- a local server may start successfully
- but if fetched routes return mostly shell HTML
- then Local Render Fetch is not sufficient
- and Seek.js may pivot to headless mode

### 7.4 Do Not Escalate Past Policy Boundaries
Seek.js must obey mode policy controls, such as:

- `allowHeadless: false`
- `allowRemoteCrawl: false`
- `mode: "static-artifact"`
- SaaS crawl disabled
- CI headless disallowed

If the next pivot step violates policy, Seek.js must stop and report failure.

### 7.5 Remote Crawl Requires Explicit Eligibility
Remote crawl should require one of:

- explicit user enablement
- SaaS-managed extraction mode
- a configuration profile that opts into remote fallback

It should not happen merely because local modes failed.

---

## 8. Decision Flow

### 8.1 High-Level Flow

1. Check for explicit user-selected mode
2. If explicit mode exists, validate prerequisites
3. If no explicit mode exists, probe in default order
4. Select the first available and sufficient local mode
5. If a chosen mode proves insufficient, pivot upward according to escalation rules
6. If no allowed mode succeeds, fail with the highest-quality actionable error

### 8.2 Canonical Selection Order

Default auto-selection order:

1. Source Adapter Mode
2. Static Artifact Parse Mode
3. Local Render Fetch Mode
4. Local Headless Render Mode
5. Remote Crawl Mode

---

## 9. Mode Entry Criteria

### 9.1 Enter Source Adapter Mode if:
- a supported adapter is configured or detected
- the adapter can emit manifest-compatible section data
- route and title metadata can be resolved or normalized

### 9.2 Enter Static Artifact Parse Mode if:
- parseable `.html` artifacts exist
- artifact directory is readable
- output is not obviously a shell-only client bundle
- route identity can be derived or mapped

### 9.3 Enter Local Render Fetch Mode if:
- no better local mode was sufficient
- a local start command exists or is configured
- the server becomes ready within timeout
- routes can be discovered
- local fetch returns HTML responses

### 9.4 Enter Local Headless Render Mode if:
- local fetch succeeded but HTML is insufficient
- headless execution is allowed
- headless runtime is available
- route list exists or can be discovered

### 9.5 Enter Remote Crawl Mode if:
- local modes failed or are unavailable
- remote crawl is explicitly allowed
- remote crawl credentials and constraints are available
- crawl budget and policy allow it

---

## 10. Mode Sufficiency Rules

Availability alone is not enough. Each mode must be judged for extraction sufficiency.

### 10.1 Source Adapter Sufficiency
A source adapter is sufficient if it can provide, directly or through normalization:

- stable page identity
- section boundaries
- headings or heading tree
- text content
- title
- route metadata or route mapping
- locale/version information when applicable

If the adapter cannot produce reliable route identity or content blocks, Seek.js may require a follow-up normalization pass or reject adapter-only extraction.

### 10.2 Static Artifact Sufficiency
Static artifact parsing is sufficient if:

- pages contain extractable semantic roots such as `main`, `article`, or configured selectors
- extracted visible text exceeds minimum content thresholds
- canonical identity can be resolved
- content is not dominated by chrome or shell markup

### 10.3 Local Render Fetch Sufficiency
Local render fetch is sufficient if:

- target routes return HTTP success
- returned HTML contains meaningful extractable content
- content roots can be identified
- text density crosses configured thresholds
- pages are not predominantly placeholders or shell containers

### 10.4 Local Headless Sufficiency
Local headless rendering is sufficient if:

- pages stabilize within timeout
- DOM content becomes materially richer than non-headless fetch output
- extractable content exceeds thresholds
- route identity remains stable

### 10.5 Remote Crawl Sufficiency
Remote crawl is sufficient if:

- route discovery stays within crawl budget
- fetched pages produce meaningful content
- extracted URLs remain within allowed domain and scope
- extraction quality is not dominated by cookie banners, auth walls, or noisy chrome

---

## 11. HTML Sufficiency Heuristics

Seek.js should use simple, explainable heuristics to determine whether fetched HTML is sufficient before escalating to headless or remote modes.

Possible heuristics include:

- minimum visible text length
- minimum paragraph/list count
- presence of semantic root (`main`, `article`, `[role="main"]`)
- ratio of content text to markup/chrome
- presence of headings
- repeated shell/container signatures
- absence of obvious client-only placeholders

### 11.1 Example Heuristic Signals
A page may be considered insufficient if multiple of the following are true:

- fewer than 2 meaningful paragraphs
- fewer than 1 heading and 1 paragraph group
- content root missing
- extracted visible text below minimum threshold
- root dominated by script containers or shell wrappers
- repeated identical shell across many routes

### 11.2 Important Rule
HTML sufficiency heuristics should be conservative and explainable.

They must not become opaque ranking systems.

If Seek.js escalates to a higher-cost mode, it should be able to explain why.

---

## 12. Pivot Rules

### 12.1 Pivot Up Only
The default pivot behavior is monotonic:
- source → static → local fetch → headless → remote

Seek.js should not pivot backward automatically in the same run.

### 12.2 Pivot Only on Meaningful Failure or Insufficiency
A pivot may happen when:

- prerequisites are missing
- mode startup fails
- route discovery fails
- extraction output is insufficient
- policy blocks the current mode
- mode-specific hard limits are exceeded

### 12.3 Pivot Must Preserve Context
When pivoting, Seek.js should carry forward:

- discovered routes
- canonical hints
- locale/version hints
- include/exclude selectors
- failure reasons from previous mode
- partial diagnostics

### 12.4 Pivot Must Be Logged
Seek.js should record:
- selected initial mode
- why it was selected
- why it failed or was insufficient
- which mode was chosen next
- whether the pivot was automatic or policy-driven

---

## 13. Failure Classes

Failures should be classified so that retries, escalation, and diagnostics are consistent.

### 13.1 Hard Failure
A condition that should immediately stop the current mode and possibly the run.

Examples:
- configured adapter missing
- local server command exits immediately
- invalid config
- unsupported mode forced explicitly by user

### 13.2 Soft Failure
A condition that may justify pivoting to another mode.

Examples:
- no parseable HTML artifacts found
- local fetch returns shell-only content
- headless unavailable but remote crawl allowed

### 13.3 Partial Failure
A condition where some routes extract successfully and others fail.

Examples:
- 90 routes succeed, 10 time out
- one locale fails
- one docs version is malformed

Partial failures may still produce a manifest, depending on policy and thresholds.

---

## 14. Conflict and Ambiguity Rules

### 14.1 Multiple Modes Available
If multiple modes are available, choose the first one in the default probe order unless:

- the user explicitly overrides
- a mode is known to be insufficient for this framework/profile
- policy configuration defines a preferred mode

### 14.2 Adapter and Static Artifacts Both Available
Prefer source adapter mode when:
- route identity is available
- heading/content fidelity is higher
- the site is source-native docs content

Prefer static artifact parse when:
- adapter output is incomplete
- final URLs are clearer in output artifacts
- source adapter support is partial or uncertain

### 14.3 Static Artifacts and Local Render Fetch Both Available
Prefer static artifact parse by default because it is cheaper and simpler.

However, prefer local render fetch if:
- artifacts are incomplete
- SSR framework output is opaque
- artifact content is shell-like
- user config marks SSR/local-fetch as preferred

### 14.4 Local Fetch and Headless Both Available
Prefer local fetch first.

Headless is only justified if:
- local fetch is insufficient
- local headless is allowed
- the page meaningfully improves after hydration/rendering

### 14.5 Local Modes and Remote Crawl Both Available
Prefer local modes first.

Remote crawl must not preempt successful local extraction unless:
- explicitly forced
- running in a managed SaaS mode that requires remote acquisition

---

## 15. Configuration Surface

The Probe-and-Pivot system should be controllable but not overwhelming.

Suggested configuration concepts:

- `mode`
- `preferredModes`
- `allowHeadless`
- `allowRemoteCrawl`
- `startCommand`
- `readyUrl`
- `routeSources`
- `contentThresholds`
- `maxPivotDepth`
- `failOnPartial`
- `maxRouteFailures`
- `logLevel`

### 15.1 Explicit Mode
If `mode` is set, Seek.js attempts only that mode unless the specification later allows a constrained fallback profile.

### 15.2 Preferred Modes
If `preferredModes` is set, Seek.js should honor that ordering within policy boundaries.

### 15.3 Fallback Safety
If `allowRemoteCrawl` is false, Seek.js must never pivot into remote crawl.

If `allowHeadless` is false, Seek.js must never pivot into headless mode.

---

## 16. Observability and User Feedback

Mode selection must be visible.

Seek.js should surface:

- detected framework profile
- chosen extraction mode
- why that mode was chosen
- why earlier modes were skipped
- why a pivot occurred
- route counts
- failure counts
- whether fallback modes were used

Example messages should be understandable to users, not only maintainers.

Good:
- "Static artifacts not found; switching to Local Render Fetch using configured start command."
- "Local fetch returned shell-like HTML on 83% of tested routes; headless mode recommended."

Bad:
- "Mode B insufficient, escalating."

---

## 17. Performance and Safety Boundaries

Probe-and-Pivot must remain cheap relative to full extraction.

### 17.1 Probe Budget
The probe phase should:
- inspect only enough routes to assess sufficiency
- avoid exhaustive crawling during selection
- use bounded concurrency
- avoid high-cost modes unless clearly necessary

### 17.2 Sample-Based Sufficiency
For local render fetch and headless eligibility checks, Seek.js may inspect a representative subset of routes before committing to full-run mode escalation.

### 17.3 Safety Rule
Probe logic must never accidentally become a crawl engine.

Its job is to select a mode, not to complete full indexing prematurely.

---

## 18. Relationship to Other Specs

This document does not define:

- the Seek Manifest schema
- extractor/compiler version negotiation
- exact route discovery conflict resolution
- exact chunk sizing rules
- remote crawl operational budgets
- exact timeout defaults
- testing fixtures or quality metrics

Those belong in follow-up specs, including:

- `02-seek-manifest-schema.md`
- `03-extractor-compiler-contract.md`
- `05-route-discovery-and-conflict-resolution.md`
- `06-failure-handling-and-recovery.md`
- `07-chunking-spec.md`
- `09-performance-targets.md`
- `10-testing-and-validation.md`

This spec only defines the mode selection and escalation strategy.

---

## 19. Recommended v1 Behavior

For `v1`, Seek.js should implement the following default behavior:

1. try source adapter mode when configured and compatible
2. otherwise try static artifact parse
3. if static artifacts are missing or unsuitable, try local render fetch
4. if local fetch returns shell-only or insufficient HTML, suggest or enter local headless mode only if allowed
5. only use remote crawl if explicitly allowed and local paths fail
6. always log the selected mode and any pivots clearly

This gives Seek.js:
- good support for docs systems
- strong support for static sites
- real compatibility with SSR frameworks
- a controlled path for SPAs
- safe fallback behavior without making remote crawl the identity of the product

---

## 20. Final Decision

Seek.js should implement a **local-first, cost-aware, explicit Probe-and-Pivot Strategy**.

### In one sentence

> Seek.js should probe for the highest-fidelity, lowest-cost local extraction mode first, pivot upward only when a mode is unavailable or insufficient, and reserve high-cost modes such as headless rendering and remote crawl for explicit, policy-constrained fallback paths.

### Why this is the right strategy

This approach:
- preserves framework agnosticism
- supports SSR realistically
- prevents premature remote crawl escalation
- keeps local extraction as the default philosophy
- improves debuggability
- aligns with cost and performance discipline
- keeps all modes compatible through the Seek Manifest boundary

This is the correct mode-selection foundation for the extractor subsystem.

---

## 21. Open Questions

These questions remain intentionally open for follow-up specs or implementation ADRs:

1. What are the exact minimum sufficiency thresholds for HTML content?
2. Should local headless mode require explicit opt-in in `v1`, or may it auto-run when allowed by policy?
3. How many sample routes should be used before deciding that local fetch is insufficient?
4. How should Seek.js score partial adapter completeness versus final HTML quality?
5. Should framework profiles provide mode hints by default, and if so, where should those hints live?

---

## 22. Implementation Guidance

A practical implementation should expose Probe-and-Pivot as:

- a reusable internal subsystem
- not just CLI branching logic
- not just a SaaS orchestration concern

Suggested internal shape:

- mode detectors
- sufficiency evaluators
- policy gate
- pivot controller
- structured diagnostics emitter

This will allow:
- CLI reuse
- local CI reuse
- SaaS orchestration reuse
- future framework adapters to plug into the same decision boundary

---

## 23. Maintainer Note

If future contributors want to add a new extraction mode, they must also define:

- where it sits in probe order
- what makes it available
- what makes it sufficient
- what causes pivot away from it
- what policy controls constrain it
- why it is better than the cheaper modes below it

No new mode should enter Seek.js without fitting into this strategy cleanly.