# Deployment Provider Constraints Research
## Build, Artifact, and Runtime Constraints That Shape Seek.js Compatibility

**Status:** Draft  
**Type:** Research Note  
**Applies To:** Seek.js extraction, compilation, hosting, CI/CD integration  
**Related Areas:** `specs/extractor/`, Seek.js SaaS ingestion model, docs publishing strategy

---

## Executive Summary

If Seek.js wants to support the broadest possible range of developers, it cannot be designed around one framework, one bundler, or one hosting provider.

The real compatibility surface is not:

- "Does Seek.js support Next.js?"
- "Does Seek.js support Vite?"
- "Does Seek.js support Astro?"

The real compatibility surface is:

- Can Seek.js run inside a provider's build environment?
- Can Seek.js extract user-visible content without requiring privileged infrastructure?
- Can Seek.js emit deployable static artifacts?
- Can Seek.js avoid forcing users into provider-specific APIs?
- Can Seek.js maintain the same mental model across Vercel, Netlify, Cloudflare Pages, GitHub Pages, and generic CI pipelines?

This research note captures the constraints that deployment providers impose on Seek.js design and explains why the extraction architecture must remain:

- local-first
- build-adjacent
- static-artifact friendly
- provider agnostic
- runtime portable
- conservative about remote crawling

The conclusion is straightforward:

> Seek.js should be designed as a build-time or CI-time content extraction and compilation system that emits static search artifacts and optionally uploads normalized manifests or compiled indexes to the Seek SaaS.

That model is the one most likely to survive across providers as the ecosystem evolves.

---

## 1. Why Deployment Providers Matter So Much

Seek.js is not just a local library problem.

It is also a deployment-shape problem.

Even if the extractor is architecturally clean, the product still fails if users cannot run it reliably in the environments where websites are actually built:

- local development machines
- GitHub Actions
- Vercel builds
- Netlify builds
- Cloudflare Pages builds
- custom CI runners
- monorepo pipelines
- self-hosted build servers

The deployment provider determines:

- what build command runs
- what environment variables are available
- which output directories get deployed
- whether a local server can be started during CI
- whether build logs and failures are easy to debug
- how artifacts are uploaded
- whether build environments have strict time or memory limits
- whether the user can customize the pipeline enough to insert Seek.js

This means Seek.js cannot be designed only for technical elegance. It has to fit the operational habits of these platforms.

---

## 2. The Core Constraint: Build Step Insertion

The most important common denominator across major providers is that they all support some notion of:

- install dependencies
- run a build command
- deploy an output directory or generated artifact

This is the compatibility foundation Seek.js should optimize for.

### Practical interpretation

Seek.js should work when inserted into one of these shapes:

- before the main app build
- after the main app build
- during a custom CI step
- during a provider build command
- during a post-build script
- during a local predeploy step

### What this means architecturally

Seek.js should be usable as:

- a CLI
- a scriptable build tool
- a CI-friendly extractor/compiler
- an optional upload client for Seek SaaS

It should not require:

- a persistent daemon
- a provider-owned runtime hook
- privileged post-deploy access
- long-lived backend infrastructure
- a provider-specific plugin as the only way to function

---

## 3. The Universal Deployment Pattern Seek.js Should Target

Across major deployment providers, the most portable workflow looks like this:

1. project dependencies install
2. site/app build runs
3. Seek.js extracts content using the best available local mode
4. Seek.js emits:
   - Seek Manifest
   - compiled `.msp` index locally, or
   - uploads manifest to Seek SaaS for compile/hosting
5. final static assets are deployed

This pattern is stable because providers already understand:

- custom build commands
- output directories
- static assets
- CI artifacts
- environment variables

It avoids requiring the provider to understand Seek.js at all.

That is a feature, not a limitation.

---

## 4. Major Provider Constraint Themes

Even though providers differ in implementation, they tend to converge on a few recurring constraints.

### 4.1 Build commands are customizable, but bounded

Providers usually allow custom build commands, but not unlimited control.

Seek.js should assume:

- commands may run in clean environments
- processes should terminate on their own
- build failures must be understandable from logs
- dependency installation should be predictable
- native compilation may be fragile in hosted environments

This strongly favors:

- scriptable CLI usage
- deterministic runtime behavior
- low install friction
- avoiding platform-specific native packaging where possible

### 4.2 Output directories are explicit or configurable

Providers generally deploy one or more output directories.

That means Seek.js should be able to:

- read from configurable input directories
- write to configurable output directories
- place generated `.msp` files into known static asset paths
- avoid assuming one universal folder layout

### 4.3 Monorepos complicate path assumptions

Many teams deploy from monorepos.

This introduces complexity around:

- root directory vs app directory
- package manager workspace behavior
- build cache behavior
- relative output paths
- environment scoping

Seek.js should therefore avoid hardcoded assumptions like:

- "the project root is the deployed app root"
- "the build output is always `dist/`"
- "the docs site is the only app in the repo"

### 4.4 Environment limits matter

Hosted providers often impose practical limits around:

- total build time
- memory usage
- CPU concurrency
- process counts
- network access reliability

That means extraction must remain conservative about:

- starting many concurrent browser instances
- full remote recrawls
- heavyweight native build steps
- unnecessary duplication of work

### 4.5 Static assets are the most portable artifact type

Providers are extremely good at deploying static files.

This is why Seek.js should strongly prefer producing:

- `.msp`
- optional metadata sidecars
- manifest outputs for debugging or validation

Static outputs are easy to:
- cache
- host
- inspect
- move between environments
- deploy on any CDN or edge storage platform

This portability is one of Seek.js's strongest architectural advantages.

---

## 5. Provider-Specific Patterns and What They Imply

This section summarizes the practical meaning of major provider behavior for Seek.js design.

---

## 5.1 Vercel

### Typical model
Vercel runs a build step, often auto-detecting frameworks, and deploys either:

- static outputs
- serverless outputs
- framework-managed app artifacts

### Relevant constraints for Seek.js
- users usually control the build command and output directory
- framework auto-detection is convenient but can hide complexity
- monorepos are common
- SSR frameworks like Next.js are deeply represented
- local build output may not be parseable HTML in App Router workflows

### Implication
Seek.js must not assume that Vercel deployments always expose direct static HTML artifacts locally.

This makes the following especially important:
- Local Render Fetch Mode
- source adapters for MDX/Markdown docs systems
- static artifact parsing only when valid
- SaaS compile as optional, not mandatory

### Design takeaway
Vercel compatibility is not about supporting a Vercel API.  
It is about fitting inside the build step while handling SSR-heavy framework realities.

---

## 5.2 Netlify

### Typical model
Netlify supports build commands and publish directories and has a strong tradition of static sites plus framework adapters.

### Relevant constraints for Seek.js
- build and publish directory behavior is explicit
- monorepo configuration is common
- many users are static-site or JAMstack oriented
- builds may still include SSR or edge-ish patterns depending on framework

### Implication
Netlify is a strong fit for:
- static artifact parsing
- local compile
- manifest upload to SaaS
- deterministic build-time indexing

### Design takeaway
Seek.js should align with Netlify by behaving like a build artifact generator, not a hosting-coupled product.

---

## 5.3 Cloudflare Pages

### Typical model
Cloudflare Pages supports build commands and output directories, with strong support for static deployment plus framework presets.

### Relevant constraints for Seek.js
- output directories are explicit
- some framework integrations produce non-traditional output layouts
- serverless/edge-first mental models are common
- Cloudflare users may be interested in Seek SaaS-like edge deployment patterns

### Implication
Seek.js should integrate well with:
- standard build command insertion
- configurable output paths
- static asset deployment
- optional edge-hosted `.msp` delivery

### Design takeaway
Cloudflare Pages reinforces the value of:
- provider-agnostic output generation
- static asset emission
- clean separation between extraction and runtime hosting

---

## 5.4 GitHub Pages

### Typical model
GitHub Pages works best with either:
- direct branch/folder publishing
- or GitHub Actions artifact-based publishing

### Relevant constraints for Seek.js
- GitHub Actions may be the real build environment even if GitHub Pages is the final host
- there is often no special runtime beyond static hosting
- static assets are the main compatible deployment target

### Implication
Seek.js must be able to:
- run cleanly in generic CI
- emit static artifacts
- avoid depending on provider-specific runtime features

### Design takeaway
GitHub Pages is an important reminder that Seek.js cannot assume sophisticated hosting features. Static compatibility must remain first-class.

---

## 5.5 Generic CI + Self Hosting

### Typical model
Many teams will not use the "big default" providers. They may use:

- self-hosted runners
- enterprise CI
- Docker-based pipelines
- custom CDNs
- object storage + reverse proxies

### Relevant constraints for Seek.js
- path layouts vary wildly
- output placement is fully custom
- teams may want strict control over build and artifact flow
- they may reject provider-specific assumptions or hosted-only models

### Implication
Seek.js must remain:
- CLI friendly
- config driven
- output path configurable
- capable of local compile and self-hosting
- not dependent on a proprietary deployment flow

### Design takeaway
Generic CI is the baseline compatibility test.  
If Seek.js only feels smooth on one managed provider, the architecture is too narrow.

---

## 6. Why Provider Constraints Reinforce Local-First Extraction

Provider realities strongly support the current extraction direction:

- Source Adapter Mode
- Static Artifact Parse Mode
- Local Render Fetch Mode
- Local Headless Render Mode as fallback
- Remote Crawl Mode only when needed

### Why this matters

If Seek.js pushes users toward remote crawling too quickly, provider constraints become much worse:

- preview deployment access must be managed
- auth and staging policies become relevant
- network instability affects extraction
- cost and latency increase
- provider-agnostic local workflows become weaker

By contrast, local-first extraction:

- keeps content acquisition inside the build environment
- avoids public preview requirements
- works better with CI
- reduces SaaS cost
- simplifies debugging
- respects provider boundaries instead of fighting them

This is one of the strongest architecture decisions in the project.

---

## 7. Why Provider Constraints Also Reinforce Static Artifact Outputs

Even when content acquisition differs by framework, the final emitted output should remain simple.

The provider-facing artifact should still ideally be:

- a compiled `.msp`
- optionally a manifest or metadata sidecar for debugging
- stored in a normal static asset path

This is powerful because it decouples:
- how Seek.js found the content
from
- how the host serves the resulting search index

That is exactly the kind of decoupling required for broad provider compatibility.

---

## 8. Deployment Provider Design Guardrails for Seek.js

These are the core design guardrails that emerge from the research.

### 8.1 Seek.js must be CLI-first
A command-line oriented build tool is the most portable model across providers.

### 8.2 Seek.js must be local-first before remote
If extraction can happen locally, it should.

### 8.3 Seek.js must emit portable artifacts
Static artifact outputs are the universal deployment surface.

### 8.4 Seek.js must avoid requiring provider APIs
Provider-specific integrations can improve DX, but must not be required.

### 8.5 Seek.js must separate extraction from hosting
Extraction and compilation can happen locally or in SaaS, but hosting should remain flexible.

### 8.6 Seek.js must support configurable input and output paths
Monorepos and framework variety require this.

### 8.7 Seek.js must avoid native-install friction when possible
Hosted build environments magnify native dependency problems.

### 8.8 Seek.js must keep browser/client bundles separate from build-only tooling
Provider compatibility is helped, not hurt, when build-only packages remain isolated.

---

## 9. Deployment Failure Modes Seek.js Must Respect

Provider compatibility is not only about happy paths. Seek.js should anticipate failure cases that are common in hosted builds.

### 9.1 Build command timeouts
If extraction is too slow, the entire deploy may fail.

### 9.2 Memory spikes
Headless browsers or large crawls may exceed provider memory limits.

### 9.3 Path misconfiguration
Wrong input/output assumptions can silently produce empty indexes or missing assets.

### 9.4 Local server startup failure
Local Render Fetch Mode depends on reliable startup, health checks, and teardown.

### 9.5 Environment drift
A build may succeed locally but fail in hosted CI because of runtime, dependency, or environment differences.

### 9.6 Upload/API failure in SaaS mode
If manifest upload or remote compile fails, Seek.js needs a clear failure or fallback behavior.

These failure modes should be handled explicitly in specs, not left to ad hoc implementation.

---

## 10. What This Means for Seek.js SaaS

Provider research also shapes the managed product.

### 10.1 Best managed experience
The best SaaS workflow is likely:

1. local extraction in the user's build environment
2. normalized manifest upload
3. Seek SaaS compile and optional hosting
4. client runtime fetches hosted `.msp`

### Why this is strong
- preserves provider compatibility
- avoids remote crawl as default
- minimizes provider-specific auth complexity
- keeps the managed value in compilation, hosting, analytics, and AI layers

### 10.2 What should remain secondary
Remote crawling should remain a fallback or premium path for:
- inaccessible local builds
- legacy workflows
- externally hosted content
- managed enterprise crawling scenarios

The more Seek.js relies on manifest upload and local extraction, the stronger its provider compatibility story becomes.

---

## 11. Research-Backed Recommendations

Based on provider constraints, Seek.js should adopt the following stance.

### Recommendation 1
Treat deployment providers as build-step orchestrators, not as product dependencies.

### Recommendation 2
Design Seek.js so that all major providers can run the same conceptual pipeline:
- build
- extract
- compile
- deploy static artifacts

### Recommendation 3
Optimize for local extraction modes before remote crawl.

### Recommendation 4
Keep `.msp` and related outputs static-asset friendly.

### Recommendation 5
Keep path and command configuration explicit and flexible.

### Recommendation 6
Keep native build complexity out of the default adoption path where possible.

### Recommendation 7
Make SaaS compile/hosting the primary managed value, not remote crawling.

---

## 12. Open Questions

This research note identifies a few follow-up questions that should later become implementation specs or experiments.

### 12.1 How should Seek.js model build-time timeouts and performance budgets across modes?
This belongs in a performance targets spec.

### 12.2 How should Seek.js configure Local Render Fetch startup and readiness probes?
This belongs in the extractor operational contract.

### 12.3 How should SaaS compile failure behave inside CI?
This belongs in failure handling and escalation specs.

### 12.4 How should Seek.js place generated `.msp` assets into framework-specific output layouts?
This belongs in the compile/hosting integration layer.

### 12.5 How much provider-specific DX optimization is worth supporting before it becomes lock-in?
This likely needs later product and maintenance guidance.

---

## 13. Suggested Follow-On Specs

This research note should eventually feed into:

- `specs/extractor/04-probe-and-pivot-strategy.md`
- `specs/extractor/06-failure-handling-and-recovery.md`
- `specs/extractor/09-performance-targets.md`
- future compile/hosting specs
- future CI/deployment integration guidance

---

## 14. Final Conclusion

Deployment providers do not require Seek.js to become provider-specific.

They require Seek.js to become disciplined.

The deployment-compatible version of Seek.js is one that:

- runs as a build-time or CI-time tool
- chooses the best available local extraction mode
- emits portable static artifacts
- optionally uploads normalized manifests for managed compile/hosting
- avoids forcing users into remote crawling or provider APIs unless absolutely necessary

That is the version of Seek.js most likely to scale across:

- frameworks
- runtimes
- monorepos
- hosting providers
- open-source users
- managed SaaS customers

> The more Seek.js behaves like a portable build artifact system, the more universally deployable it becomes.