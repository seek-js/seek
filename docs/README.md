# Seek.js Documentation Boundary

This directory is reserved for **public-facing documentation** that may eventually power the Seek.js website or landing documentation experience.

At the current `init` stage of the repository, deeper engineering design work is intentionally organized outside this folder so that public docs and internal implementation material do not get mixed together.

This boundary is especially important now that the project has two distinct repository roles:

- `seek-js/seek`
  - the framework / SDK / engineering source repo
- `seek-js/seekjs-website`
  - the public landing website and future public docs presentation repo

The `docs/` directory in `seek-js/seek` should therefore be treated as a **candidate source of public documentation content**, not as a catch-all for internal architecture, specs, or research.

## Directory Intent

Use `docs/` for:

- product documentation
- user guides
- installation instructions
- framework integration guides
- tutorials
- API reference content intended for developers using Seek.js
- landing-site documentation content
- content that is intentionally written for eventual publication in `seek-js/seekjs-website`

Do **not** use `docs/` for:

- internal architecture RFCs
- implementation contracts
- schema drafts
- low-level engineering notes
- exploratory research documents
- temporary design debates

## Where Other Material Lives

### `specs/`
Implementation-ready engineering documents.

This is where the project should keep:
- architecture RFCs
- formal module contracts
- schema definitions
- extractor/compiler boundaries
- chunking rules
- failure-handling specs
- performance targets
- testing strategy

This material should stay in `seek-js/seek` and should not be treated as default website content.

### `research/`
Exploration, comparison, and reasoning documents.

This is where the project should keep:
- technology evaluations
- architecture tradeoff analysis
- framework compatibility notes
- deployment-provider research
- crawler/parser comparison notes
- early-stage design reasoning

This material should also remain in `seek-js/seek` and should not be auto-published to the website repo.

## Current Working Rule

If a document answers:

- **"How should users use Seek.js?"** → it belongs in `docs/`
- **"How should Seek.js be implemented?"** → it belongs in `specs/`
- **"Why are we choosing this direction?"** → it belongs in `research/`

## Status

This folder is intentionally lightweight right now.

As the repository matures, this directory should become the home for public-facing documentation content authored in `seek-js/seek`, while `specs/` and `research/` continue to hold the internal engineering and planning material.

That public-facing material may later be:
- synced selectively into `seek-js/seekjs-website`
- transformed into website-specific content
- curated further inside the website repo for navigation, theming, and presentation

## Related Repository Structure

Within `seek-js/seek`:

- `docs/` — public-facing documentation candidates
- `research/` — research-backed intent and architectural reasoning
- `specs/` — implementation-ready engineering specifications
- `README.md` — project vision, strategy, and high-level overview

At the repo boundary level:

- `seek-js/seek` — engineering truth, package development, research, and specs
- `seek-js/seekjs-website` — public website, landing pages, polished docs presentation, and docs UX