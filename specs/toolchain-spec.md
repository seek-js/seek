# Seek.js Toolchain Spec

**Status:** Accepted  
**Audience:** SDK maintainers, release owners, infra contributors  
**Scope Type:** Ground truth (non-phased)

## Purpose

Define the authoritative toolchain contracts for the Seek.js monorepo so package build, validation, and release behavior stays deterministic, reviewable, and maintainable across Node, Bun, and Deno consumption contexts.

## In Scope

- workspace and package tooling standards
- TypeScript and build output contracts
- package metadata and publish-surface contracts
- quality and validation invariants
- release gating expectations

## Out of Scope

- extractor runtime/business logic behavior
- API design and product feature requirements
- implementation sequencing for rollout

## Normative Decisions

The following decisions are standard for this repository:

1. Workspace manager is **Bun workspaces**.
2. Language baseline is **TypeScript**.
3. Package bundler baseline is **tsdown**.
4. Linting and formatting baseline is **Biome**.
5. Task orchestration baseline is **Turbo**.
6. Shared TypeScript baseline config is provided through `**@seek/typescript-config`**.
7. Release versioning uses **Changesets** and CI publish flow uses `**bun publish`**.

Any deviation from these defaults requires a documented spec update and rationale.

## Determinism Contract

For unchanged source and unchanged configuration:

- the `dist/` output file set must remain stable
- `exports`-targeted entry paths must remain stable
- emitted JS and `.d.ts` files must not include random or time-varying data

Cross-platform byte-for-byte equality is not required unless a future spec explicitly adds it.

## Workspace and Package Contracts

### Workspace Contract

- root workspace must resolve all package links without manual patching
- root scripts must expose a consistent command surface for build and quality validation
- workspace config must support repeatable local and CI execution

### Build Contract

- each package must provide a `build` script using `tsdown`
- package builds must emit artifacts to package-local `dist/`
- declaration files (`.d.ts`) are required for published library surfaces
- ESM output is required; CJS is optional unless a package contract requires it

### Shared TypeScript Contract

- package TypeScript settings must extend a shared baseline via `@seek/typescript-config`
- strictness and module-resolution behavior must stay consistent across packages unless explicitly justified
- project references, when used, must remain coherent with workspace package boundaries

### Package Metadata Contract

For publish-intended library packages:

- required fields include `name`, `version`, `exports`, `types`, and publish payload boundaries (`files`)
- metadata paths must match built artifact paths

For publish-intended CLI packages:

- required fields include `name`, `version`, `bin`, and publish payload boundaries (`files`)
- CLI entry must remain executable after build

## Quality Contracts

The repository must maintain a fail-closed quality gate where required checks all pass before merge/release candidate acceptance:

- typecheck
- test
- lint
- formatting check
- build

Quality command parity between local development and CI should be preserved.

## Artifact and Runtime Validation Contracts

Publish-intended artifacts must be validated as installable and resolvable:

- package tarballs must reflect declared `files`, `exports`, and `types`
- clean-environment install/usage smoke checks must succeed for targeted runtimes
- CLI smoke behavior (for example, help command execution) must be functional from built artifacts

## Release Contracts

- releases are CI-driven and auditable
- version and changelog intent is driven by Changesets
- publish must be blocked when required quality/artifact/runtime evidence is missing for the release commit

## Current Implementation Status (Phase Snapshot)

This section tracks current repository progress against the original toolchain rollout phases for operational clarity.  
These are status checkpoints, not normative phased requirements.

### Phase 0: Workspace Bootstrap

**Status:** Complete

- Bun workspace root and package layout are present
- package manifests and starter source entries exist across core packages
- workspace install/link behavior is established

### Phase 1: Build System Setup

**Status:** Complete

- `tsdown` build scripts exist for packages
- package-local `dist/` output model is in use
- recursive workspace build path is functional (`bun run build`)

### Phase 2: Package Metadata Contract

**Status:** In progress

- active publish-surface metadata exists for key packages
- metadata and artifact-shape validation is partially established
- remaining work: fully codify and enforce metadata verification as a stable gate

### Phase 3: Quality Gates

**Status:** In progress

- quality tooling and scripts are present
- quality gate intent is established (typecheck/test/lint/format/build)
- remaining work: align local and CI gates, stabilize config/scripts, and ensure fail-closed behavior

### Phase 4: Runtime and Artifact Validation

**Status:** Not complete

- policy intent exists for runtime/artifact verification
- remaining work: implement and enforce repeatable multi-runtime and artifact validation checks

### Phase 5: Release Pipeline

**Status:** Not complete

- release contract direction is defined
- remaining work: complete CI release automation with changeset-driven versioning and evidence-gated publish

## Change Management

When toolchain behavior changes:

1. Update this spec first (or in the same change set).
2. Update related research notes when rationale changes.
3. Update scripts/config/workflows in the same change set as needed.
4. Re-run required quality and validation checks.
5. Include a short impact note in PR description describing changed contracts and verification evidence.

## Compliance Rule

This document is the single source of truth for toolchain contracts in `specs/`.
If implementation and this spec diverge, either implementation must be corrected or this spec must be formally updated in the same workstream.