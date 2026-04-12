# Seek ↔ Website Sync Strategy
## Research Note on Repository Boundaries, Documentation Publishing, and Content Flow

**Status:** Draft  
**Type:** Research Note  
**Area:** `platform`  
**Related Repositories:**  
- Framework / SDK repo: `https://github.com/seek-js/seek`
- Landing website repo: `https://github.com/seek-js/seekjs-website`

---

## Executive Summary

Seek.js now has two distinct repository roles:

1. **`seek-js/seek`**
   - the framework / SDK / architecture / internal engineering repo

2. **`seek-js/seekjs-website`**
   - the public landing website and future public documentation experience

This split is healthy and should be preserved deliberately.

The key platform question is:

> How should Seek.js separate internal engineering material from public-facing documentation while still allowing the website to stay up to date with the framework repo?

The recommended answer is:

- keep **public-facing docs content** in the website repo or sync only the subset intended for publication
- keep **research and specs** in the framework repo
- use **CI-based sync or export workflows**, not git submodules, for cross-repo publishing
- treat the framework repo as the source of truth for:
  - architecture
  - engineering specs
  - internal research
  - package development
- treat the website repo as the source of truth for:
  - landing pages
  - product messaging
  - public guides
  - polished docs UX
  - docs navigation, theming, and presentation

In one sentence:

> `seek` should remain the engineering source of truth, while `seekjs-website` should remain the public presentation layer, with controlled sync between them rather than shared repo responsibilities.

---

## 1. Why This Research Note Exists

As the project grows, the repository boundary itself becomes an architectural decision.

Without clear boundaries, the two repos can drift into confusion:

- public docs may become mixed with internal RFCs
- website content may lag behind framework changes
- contributors may not know where new documents belong
- internal engineering notes may accidentally become public-facing content
- duplicated docs may diverge between repositories
- the website repo may become dependent on internal repo structure

This note exists to define a healthier model before that confusion hardens.

---

## 2. Repository Roles

## 2.1 `seek-js/seek`
This repository should be treated as the **engineering and framework repo**.

Its responsibilities include:

- SDK and package development
- internal architecture RFCs
- engineering specifications
- research notes
- implementation planning
- package-level docs for maintainers/contributors
- CI/build logic for the framework itself

This repo should optimize for:

- correctness
- engineering clarity
- contributor understanding
- implementation velocity
- architecture evolution

It should **not** be forced to optimize for:
- public docs presentation
- marketing copy
- polished website navigation
- visual docs experience
- docs-theme constraints

---

## 2.2 `seek-js/seekjs-website`
This repository should be treated as the **public website and docs presentation repo**.

Its responsibilities include:

- landing pages
- product positioning
- public documentation UX
- docs navigation and sidebar structure
- polished tutorials and guides
- release announcements or changelog presentation
- website theming and branding
- content formatting specific to the website stack

This repo should optimize for:

- public readability
- polished docs experience
- discoverability
- onboarding clarity
- presentation quality
- web performance and docs UX

It should **not** become the place where internal engineering truth is first defined.

---

## 3. Why the Repositories Should Stay Separate

Separating the framework repo and the website repo creates several benefits.

### 3.1 Cleaner engineering workflow
The framework repo can evolve architecture and specs without worrying that every internal doc is also a public-facing web page.

### 3.2 Cleaner public docs workflow
The website repo can organize content for users without inheriting internal implementation complexity.

### 3.3 Lower accidental coupling
If the website depends too directly on the internal engineering structure, simple repo refactors become painful.

### 3.4 Better contributor clarity
A simple mental model becomes possible:

- if the document is for **building Seek.js**, it belongs in `seek`
- if the document is for **using Seek.js**, it belongs in `seekjs-website`

### 3.5 Better review discipline
Research and specs can go through architecture review in the framework repo before any of that material becomes polished public docs.

---

## 4. What Should Live in Each Repo

## 4.1 Content that should live in `seek`
These categories should remain in the framework repo:

### Internal engineering documents
- RFCs
- specs
- schema definitions
- subsystem contracts
- failure-handling rules
- parser/runtime decisions
- performance targets
- test strategy

### Research documents
- technology comparisons
- ecosystem constraints
- architecture alternatives
- provider compatibility notes
- parser/crawler evaluation
- SSR extraction notes
- repository structure reasoning

### Maintainer-oriented documents
- contributor guidance for internal systems
- subsystem ownership notes
- implementation staging plans

### Package/source code
- packages
- build tools
- CLI logic
- test fixtures
- implementation experiments

---

## 4.2 Content that should live in `seekjs-website`
These categories should primarily live in the website repo:

### Public documentation
- installation guides
- getting started docs
- framework integration guides
- usage examples
- API guides
- migration guides
- tutorials
- FAQ

### Product-facing pages
- homepage
- features pages
- comparison pages
- pricing or SaaS positioning
- community pages

### Website-specific content
- sidebar structure
- docs navigation
- Fumadocs content organization
- website-specific MDX components
- theming decisions

### Polished docs content derived from internal material
Some public docs may begin from internal specs or research, but they should be rewritten for the public docs audience before publication.

---

## 5. What Should Not Be Synced Automatically

A crucial rule:

> Not everything in `seek` should flow into `seekjs-website`.

The following content should generally **not** be auto-published:

- internal RFCs
- draft specs
- architecture debates
- experimental research notes
- implementation-only contracts
- internal TODOs
- exploratory documents that are not stable
- contributor-only process notes

Why?

Because these documents optimize for internal correctness, not public clarity.

Publishing them automatically would:
- confuse users
- expose unstable design decisions as if they were official docs
- clutter the website
- create maintenance burden in public navigation
- weaken the distinction between engineering truth and user documentation

---

## 6. What Might Be Synced

The best candidates for sync are documents in `seek` that are:

- stable
- intentionally public
- formatted for external consumption
- useful to users, not only maintainers
- safe to expose without internal context

Possible sync candidates later may include:

- package API reference source files
- release notes
- changelog summaries
- generated docs reference content
- selected guides written for public use
- machine-generated schema/API docs if designed for external users

Important nuance:

These should be treated as **publishable artifacts**, not as “everything under `docs/` by default.”

---

## 7. Why CI Sync Is Better Than Git Submodules

The earlier docs note already suggested preferring CI sync over git submodules. That recommendation still stands, and the two-repo structure makes it even more justified.

## 7.1 Git submodule drawbacks

Submodules create friction for contributors:

- additional clone/update steps
- surprising repo state
- confusing nested Git behavior
- harder automation
- branch mismatch issues
- more painful onboarding

They also create conceptual coupling:
- the website repo becomes structurally dependent on the framework repo
- content updates become tied to submodule state instead of publication intent

For a public docs website, that is usually the wrong tradeoff.

---

## 7.2 CI sync advantages

A CI-based sync or export workflow is better because it gives Seek.js control over:

- **what** gets synced
- **when** it gets synced
- **how** it gets transformed
- **which branch/environment** receives it
- whether updates are:
  - direct commits
  - generated pull requests
  - release-triggered syncs
  - preview syncs

This is far more flexible and better aligned with a docs publishing workflow.

---

## 7.3 Better publication model

The correct model is closer to:

> publish selected content from `seek` into `seekjs-website`

rather than:

> mount the engineering repo inside the website repo

That distinction matters a lot.

---

## 8. Recommended Sync Strategy

The recommended long-term strategy is:

## 8.1 Internal truth stays in `seek`
Architecture, research, and engineering specs remain in the framework repo.

## 8.2 Public docs are authored or curated in `seekjs-website`
Public-facing docs should live there, even if they are informed by internal material.

## 8.3 Selected artifacts may be exported from `seek`
Examples:
- generated API reference
- package metadata
- changelog material
- release summaries
- intentionally public generated docs

## 8.4 Sync should happen through CI
When content is intended to move from `seek` to `seekjs-website`, it should happen through an explicit CI workflow.

### Possible CI patterns
- push selected generated docs into a content folder in `seekjs-website`
- open a PR automatically in `seekjs-website`
- sync only on tagged releases
- sync only from an allowlisted directory
- sync generated API docs but not internal prose docs

---

## 9. Recommended Content Boundary Model

A useful rule for the whole project is:

### `seek/docs/`
Reserved for material that is intended to become public-facing documentation eventually.

### `seek/research/`
Internal research and reasoning only.

### `seek/specs/`
Internal engineering implementation contracts only.

### `seekjs-website/`
Public docs, public guides, public product content, and public presentation.

This means:

- `research/` should never be auto-synced to the website
- `specs/` should almost never be auto-synced to the website
- `docs/` is the only candidate area for selective sync, and even then only through an explicit publish policy

That preserves repo hygiene.

---

## 10. How Sync Should Work in Practice

A practical sync pipeline should likely look like this:

### Step 1 — Authoring boundary
A document is written in the correct repo:
- internal engineering docs in `seek`
- public docs in `seekjs-website`

### Step 2 — Publication eligibility
If content in `seek` is meant to become public, it must live in a directory explicitly marked as publishable.

For example, later the repo may choose to designate:
- `seek/docs/public/`
or
- `seek/docs/reference/`

as exportable sources.

### Step 3 — CI validation
A CI workflow validates:
- allowed source directory
- formatting
- frontmatter if needed
- link hygiene
- publication metadata

### Step 4 — CI sync to website repo
The workflow copies/export-transforms the content into `seekjs-website`.

### Step 5 — Website repo owns presentation
Once synced, the website repo remains responsible for:
- layout
- nav
- category grouping
- website-specific MDX components
- theme integration

This separation prevents internal engineering layout from dictating public docs UX.

---

## 11. Why the Website Repo Should Own Presentation, Not the Framework Repo

This is an important philosophy decision.

If the framework repo owns both:
- engineering truth
- public docs presentation

then every internal documentation choice becomes coupled to the website stack.

That is risky.

For example:
- changing website theme could affect internal docs authoring
- engineering docs may get written for the website instead of for implementation clarity
- contributors may start optimizing internal docs for presentation rather than correctness
- repo structure may become shaped by docs tooling rather than engineering needs

Instead:

- `seek` should own **content truth** where appropriate
- `seekjs-website` should own **presentation truth**

That’s the cleaner long-term split.

---

## 12. What This Means for Contributors

The contributor rule should be simple.

### If you are documenting:
- architecture
- internal contracts
- implementation decisions
- experiments
- platform research

→ use `seek`

### If you are documenting:
- installation
- getting started
- usage
- API guides for users
- examples for end users
- landing page content

→ use `seekjs-website`

### If something starts in `seek` but should become public
Treat it as a publication workflow, not a shared authoring space.

---

## 13. Risks and Failure Modes

The current two-repo model is strong, but a few risks should be called out.

### Risk 1 — Public docs drift from internal implementation
If the website repo is too disconnected, docs may become outdated.

**Mitigation:**
- selective CI sync for publishable artifacts
- release-driven docs reviews
- public docs checklists tied to package changes

### Risk 2 — Internal docs accidentally become public
If sync rules are too broad, research/specs may leak into public docs.

**Mitigation:**
- explicit allowlist directories only
- never sync `research/` or `specs/`
- human review or PR-based sync for public docs changes

### Risk 3 — Duplicated content diverges
If the same content is hand-maintained in both repos, drift is likely.

**Mitigation:**
- define a clear source of truth per document
- prefer generated/exported sync where duplication would otherwise occur
- avoid parallel manual copies of the same material

### Risk 4 — Website repo becomes dependent on engineering repo internals
This creates brittle coupling.

**Mitigation:**
- sync artifacts, not repo structure
- sync transformed/public-ready docs, not raw internal folders
- keep the website repo stable even if `seek` is reorganized internally

---

## 14. Recommended Near-Term Policy

For the current stage of the project, the simplest good policy is:

### In `seek`
- keep `research/` and `specs/` internal only
- keep `docs/` lightweight and explicitly public-facing in intent
- do not publish internal architecture material through the website pipeline

### In `seekjs-website`
- own all landing content
- own all polished public docs
- receive only intentionally published content from `seek`

### Sync policy
- no git submodule
- use CI-based sync only when a document or generated artifact is explicitly meant for publication
- prefer PR-based sync over silent direct pushes, especially early on

This gives maximum control with minimum accidental coupling.

---

## 15. Long-Term Recommendation

As Seek.js matures, the strongest long-term model is:

### `seek`
- engineering repo
- internal truth
- package source
- research
- specs
- generated public-reference candidates

### `seekjs-website`
- public docs repo
- public website
- docs UX
- marketing/product pages
- curated/groomed docs content
- imported/generated public artifacts from `seek`

### Sync mechanism
- CI export/sync pipeline
- allowlist-based
- optionally release-triggered
- optionally PR-based

This model is scalable and contributor-friendly.

---

## 16. Research Conclusion

Using:
- `seek-js/seek` as the engineering source repo
- and `seek-js/seekjs-website` as the public website repo

is the correct structural decision.

The next important choice is not whether to merge them.  
It is whether to keep the boundary disciplined.

The best answer is:

- keep internal research/specs in `seek`
- keep public presentation in `seekjs-website`
- publish across repos through explicit CI sync
- never treat the website repo as a mirror of internal repo structure
- never treat internal engineering docs as default public docs content

In one sentence:

> `seek` should own engineering truth, `seekjs-website` should own public presentation, and CI-based selective sync should connect them without collapsing their responsibilities.

---

## 17. Suggested Follow-On Documents

This note should later inform:

- docs publishing workflow spec
- CI sync implementation plan
- public docs authoring guidelines
- release publishing process
- cross-repo ownership guidance

---

## 18. Working Principle

> Keep engineering truth and public presentation separate, then connect them intentionally.
