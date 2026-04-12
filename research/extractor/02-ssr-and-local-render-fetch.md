# SSR and Local Render Fetch Research
## Why SSR-Safe Local Extraction Is Essential for Seek.js

**Status:** Research  
**Area:** Extractor  
**Related Specs:** `../../specs/extractor/01-hybrid-extraction-architecture.md`

---

## Summary

One of the most important findings in the extraction research is that **static artifact parsing alone is not enough** for Seek.js.

Many modern frameworks do not emit a clean directory of final HTML pages after build. Instead, they emit:

- server bundles
- route manifests
- React Server Component payloads
- framework-specific runtime artifacts
- application shells that only become meaningful when the app is actually served

This is especially true for:

- Next.js App Router
- Remix
- Nuxt SSR
- SvelteKit SSR
- SSR-capable landing pages built with React ecosystems

If Seek.js assumes that extraction should happen only from `dist/`, `build/`, or `out/`, then a large share of the target market immediately falls out of the fast local path and into remote crawling or browser automation.

That is not acceptable for a framework-agnostic indexing system that wants to remain:

- low-friction
- CI-friendly
- provider-agnostic
- operationally efficient
- compatible with modern SSR frameworks

The strongest answer to this problem is a **Local Render Fetch** strategy.

---

## Core Insight

Seek.js should not define "artifact" too narrowly.

For some projects, the build artifact is:

- a folder full of static `.html` files

For others, the build artifact is:

- a production server bundle that must be started before final HTML can be observed

In both cases, the important thing is the same:

> Seek.js needs access to the final user-visible HTML, not just the internal compiler output.

This means that local extraction should support two closely related ideas:

1. **Static Artifact Parse**
   - read `.html` files directly from disk

2. **Local Render Fetch**
   - start the app locally and fetch the rendered HTML over local HTTP

These are both local extraction paths.
They differ in acquisition method, not in the overall philosophy.

---

## Why This Matters for Seek.js

Seek.js is being designed as a system that can support:

- docs sites
- landing pages
- static sites
- SSR applications
- MDX-driven content systems
- browser-side search with static search assets
- optional managed SaaS without forcing backend-first complexity

That means the extractor has to be compatible with the way real apps are built in practice.

A static-only assumption would create several problems:

### 1. It would exclude too much of the modern web
Many of the most popular frameworks in the docs and product-site ecosystem support or default to SSR.

### 2. It would push too many users into remote crawling
If local extraction cannot handle SSR, users are forced into:
- remote preview crawling
- auth complexity
- staging coordination
- slower feedback loops
- higher SaaS cost

### 3. It would weaken the product story
Seek.js should be able to say:

> "If your app can render locally in production mode, Seek.js can extract it locally."

That is a much stronger and more credible compatibility story than:

> "If your framework does not emit static HTML, use remote crawl."

---

## The Next.js App Router Reality

The clearest example of this problem is **Next.js App Router**.

### Why it is a problem
In many App Router setups:

- final pages are not emitted as plain HTML files in a way that can be scanned generically
- the build output is shaped around server execution
- RSC and framework internals make raw build directories difficult to treat as canonical extraction inputs
- dynamic or mixed rendering patterns mean final HTML is best observed by running the app

### What this means for Seek.js
A Next.js user may have a perfectly extractable public docs site, but the extractor will not see usable page content by simply scanning the build folder.

Without Local Render Fetch, Seek.js risks making Next.js users feel like second-class citizens unless they:
- force `output: 'export'`
- abandon SSR features
- rely on remote crawling
- or accept reduced compatibility

That would be the wrong tradeoff.

---

## What Local Render Fetch Means

Local Render Fetch is a local-only SSR-safe extraction mode.

### High-level flow

1. the user builds their application
2. Seek.js starts the local production server
3. Seek.js waits until the app is ready
4. Seek.js discovers routes through sitemap, config, manifests, or explicit input
5. Seek.js performs local `fetch()` requests against the running app
6. the returned HTML is parsed and normalized into the Seek Manifest

### Important framing

This is **not** the same thing as generic web crawling.

A generic web crawler:
- explores a website over a public or preview network boundary
- may require auth handling
- may fight redirects, rate limits, or banners
- is subject to environment variance

Local Render Fetch:
- runs against a local process
- stays inside the build/CI environment
- avoids public network dependencies
- extracts the same HTML the app would return in production mode

That makes it far more deterministic.

---

## Why Local Render Fetch Is Better Than Remote Crawl for SSR

### 1. Lower operational complexity
No public preview URL is required.
No staging environment coordination is required.
No preview auth exceptions are required in the common case.

### 2. Lower latency
Fetching from `localhost` is dramatically faster than crawling over the internet.

### 3. Better reproducibility
The extraction environment is tightly coupled to the same build and runtime environment that produced the app.

### 4. Better CI ergonomics
The entire extraction step can happen inside one job:
- build
- start
- fetch
- extract
- compile

### 5. Better product ergonomics
This keeps SSR compatibility in the local/open-source story instead of forcing it into the managed SaaS story.

---

## Why Not Just Use Remote Crawl?

Remote crawl still matters, but it should not be the default answer for SSR.

### Problems with remote crawl as the primary SSR path

- public preview URLs may not exist
- preview URLs may require authentication
- environment-specific content may leak into the index
- cookies, consent banners, or A/B tests may pollute extraction
- crawl timing can become unstable
- cost can scale badly for large sites
- debugging is harder because the extractor is no longer close to the build environment

For Seek.js, remote crawl is most valuable as:

- a fallback path
- a managed service convenience
- a compatibility escape hatch
- an enterprise workflow feature

It should not be the only realistic answer to SSR.

---

## Why Not Use Headless Rendering First?

Headless rendering is powerful, but it is too heavy to be the first SSR solution.

If a server-rendered app already returns meaningful HTML via normal local HTTP requests, using a browser is unnecessary overhead.

### Headless rendering costs more in:
- startup time
- memory
- concurrency management
- flake surface area
- CI complexity

That means the preferred order should be:

1. source adapter if available
2. static artifact parsing if available
3. local render fetch if a production server can run
4. headless rendering only if fetched HTML is insufficient
5. remote crawl only if local paths are not available or suitable

This keeps the system both powerful and disciplined.

---

## Framework Classes and Their Best Local Extraction Path

A useful way to reason about this is by classifying projects by what local representation is easiest and most trustworthy.

### A. Static site generators
Examples:
- VitePress
- Docusaurus
- static Astro builds
- exported docs sites

Best local path:
- Static Artifact Parse

### B. Source-native docs systems
Examples:
- Fumadocs
- Nextra
- Astro Starlight
- MDX/Markdown content stacks

Best local path:
- Source Adapter
- possibly enriched by final HTML metadata later

### C. SSR frameworks
Examples:
- Next.js App Router
- Remix
- Nuxt SSR
- SvelteKit SSR

Best local path:
- Local Render Fetch

### D. Shell-only SPAs
Examples:
- client-only React apps
- client-only Vue apps
- apps whose first HTML response is nearly empty

Best local path:
- Local Headless Render, but only as fallback

This classification strengthens the case that Local Render Fetch is not a niche feature.
It is a core compatibility layer.

---

## Route Discovery in Local Render Fetch

One concern with any fetch-based extraction mode is route discovery.

Seek.js should not rely on blind link exploration as the first discovery mechanism for local SSR extraction.

### Better discovery inputs, in order of preference
- explicit user route list
- sitemap
- framework/source adapter route hints
- project configuration
- internal link discovery
- framework manifests, if stable and useful

### Why this matters
A local render fetcher should behave like a controlled acquisition system, not a wandering crawler.

The goal is to:
- fetch the routes that matter
- preserve canonical behavior
- avoid accidental expansion into irrelevant pages
- stay deterministic in CI

---

## What Counts as "HTML Sufficient?"

Local Render Fetch is only useful if the fetched HTML actually contains meaningful content.

Seek.js will need a notion of **HTML sufficiency**.

### Signals that fetched HTML is probably sufficient
- there is a visible content root such as `main` or `article`
- extracted text length exceeds a minimum threshold
- heading structure is present
- canonical metadata exists or can be inferred
- the page is not just a shell plus scripts

### Signals that fetched HTML is probably insufficient
- extremely low text density
- no meaningful content root
- no headings
- mostly scripts and mounting containers
- known shell-only SPA behavior

If HTML is insufficient, the system should escalate to:
- Local Headless Render Mode

This is the right place for headless, not earlier.

---

## Configuration Questions the CLI Will Need to Solve

If Local Render Fetch becomes a first-class mode, the extractor CLI will eventually need to support concepts like:

- local start command
- readiness probe URL
- startup timeout
- route source preference
- fetch concurrency
- per-route timeout
- include/exclude route patterns
- fallback to headless on insufficiency
- port selection strategy

This is a spec concern later, but it is useful to recognize here that Local Render Fetch is not just an idea — it is an operational mode with real lifecycle needs.

---

## Risks of Local Render Fetch

This mode is strong, but not free of tradeoffs.

### 1. Server lifecycle management
Seek.js needs to:
- start the server
- detect readiness
- stop it cleanly
- surface failures clearly

### 2. Environment assumptions
If the app requires special environment variables or external services, local rendering may still fail.

### 3. Route instability
Some routes may be valid only under certain runtime assumptions.

### 4. Streaming SSR complexity
Some frameworks stream HTML progressively. Seek.js needs to ensure it observes the completed HTML response or a sufficiently stable representation.

### 5. Extraction consistency
The HTML returned from local render must still go through the same normalization pipeline as other HTML-based modes.

These are manageable risks, but they must be acknowledged.

---

## Why This Still Fits the Contract-First Hybrid Model

Local Render Fetch does not replace the Hybrid model.
It actually strengthens it.

The Hybrid model says:
- use the best local representation available
- normalize everything into the Seek Manifest
- do not overfit to one framework or one acquisition path

Local Render Fetch fits that perfectly.

It is simply the correct local representation for many SSR frameworks.

### The key principle remains:
> final user-visible content is the source of truth

The only question is how Seek.js obtains that content:
- source
- static file
- local HTTP render
- local browser render
- remote crawl

---

## Research Conclusion

The research strongly supports Local Render Fetch as a **first-class extraction mode**.

### Final position

Seek.js should not treat SSR support as a remote crawl problem.

It should treat SSR support as a **local rendered-output acquisition problem** first.

That leads to a better architecture because it:
- preserves provider independence
- keeps extraction local-first
- avoids unnecessary SaaS dependence
- keeps SSR frameworks in the mainline compatibility story
- aligns with the idea that Seek.js should extract from what users actually read

### Recommendation

The extraction architecture should explicitly support:

1. Source Adapter Mode
2. Static Artifact Parse Mode
3. Local Render Fetch Mode
4. Local Headless Render Mode
5. Remote Crawl Mode

And the probe logic should prefer local render fetch for SSR frameworks before remote crawling.

---

## Open Questions for Later Specs

This research note does not answer the implementation details, but it does identify the questions that later specs should define.

### Questions to formalize
- how the local server command is configured
- how readiness is detected
- how route discovery conflicts are resolved
- how HTML sufficiency is measured
- how fallback to headless is triggered
- what timeout and retry rules apply
- what partial failure behavior is acceptable
- how much of this should be automatic vs explicit user config

These belong in:
- extractor architecture specs
- probe-and-pivot spec
- failure handling spec
- performance targets spec

---

## One-Sentence Takeaway

> Local Render Fetch is the missing compatibility layer that allows Seek.js to support modern SSR frameworks locally, without collapsing into remote crawl as the default answer.