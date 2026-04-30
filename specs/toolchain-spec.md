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
6. Shared TypeScript baseline config is provided through **`@seek/typescript-config`**.
7. Release versioning uses **Changesets** and CI publish flow uses **`bun publish`**.

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

#### Objective

Make publish-intended packages metadata-correct and artifact-aligned for the current setup stage, so packaging contracts are reliable before moving forward.

#### Scope for current stage

- Bun + tsdown workflow remains primary.
- Validation focuses on manifest correctness and built artifact alignment.
- Full tarball/install matrix validation is deferred to later hardening phases.

#### Implementation requirements

1. Define active package set and package role:
  - package role: `library`, `cli`, or `internal`
  - publish intent: `yes` or `no`
2. Standardize required manifest fields for active publish-intended packages.
3. Ensure all metadata paths point to built artifacts under `dist/`.
4. Add a root metadata validator command (`validate:metadata`).
5. Fail Phase 2 checks on any metadata contract mismatch.

#### Required manifest contract

For active publish-intended library packages:

- required keys: `name`, `version`, `type`, `exports`, `types`, `files`
- `exports`/`types` paths must resolve to built files
- runtime entries must not point to `src/`

For active publish-intended CLI packages:

- required keys: `name`, `version`, `type`, `bin`, `files`
- `bin.seek` must point to built CLI file in `dist/`
- CLI built entry must preserve shebang (`#!/usr/bin/env node`)

For non-publish/internal packages:

- minimal scaffold metadata is allowed
- they must not violate workspace build/typecheck assumptions

#### `validate:metadata` contract

`validate:metadata` must run as a deterministic script and produce non-zero exit on failure.

Checks performed:

1. Required keys exist by package type.
2. `exports`, `types`, and `bin` targets resolve to real files after build.
3. Referenced runtime/type paths stay within package boundary.
4. Public runtime entries do not resolve to source-only paths.
5. CLI entry contains node shebang.

Output requirements:

- print package-scoped, actionable failures
- include missing key or broken path in each error
- exit `0` only when all active package contracts pass

#### Required execution path (current stage)

1. `bun run build`
2. `bun run validate:metadata`

Optional local combined check:

- `bun run build && bun run validate:metadata`

#### Exit criteria to mark Phase 2 complete

- active package set and publish intent are explicitly documented
- all active publish-intended package manifests satisfy required contract fields
- `validate:metadata` passes from a clean build
- no public metadata path references unresolved or source-only files
- CLI metadata contract passes (`bin` target + shebang)

#### Deferred to later phases

- tarball payload validation (`npm pack --dry-run` / packed file audits)
- clean-environment install/import smoke across package managers
- runtime compatibility matrix execution across Node/Bun/Deno

### Phase 3: Quality Gates

**Status:** In progress

#### Objective

Establish fail-closed quality gates with local and CI parity so regressions are blocked before merge.

#### Required gate contract

The following root checks are required and must pass for a green quality gate:

- `typecheck`
- `test`
- `lint`
- `format:check`
- `build`
- `validate:metadata`

Aggregate root gate:

- `check` must execute the full required gate contract.

#### Turbo orchestration contract

Turbo is the execution and caching layer for workspace quality tasks.

- Workspace tasks (`build`, `typecheck`, `lint`, `test`, `format:check`) must be defined in `turbo.json`.
- Dependency-aware ordering must be preserved where required.
- Root quality scripts may call Turbo-backed commands, but gate semantics remain defined by this spec.

#### Typecheck stability contract

Typecheck gate must use deterministic TypeScript project references:

- root `tsconfig.json` references all workspace packages participating in checks
- package `tsconfig.json` files set `composite: true` and extend shared baseline
- incremental artifacts (`*.tsbuildinfo`) are ignored from version control

#### Pre-commit contract

Pre-commit checks must be fast and focused on staged changes.

- include staged-file lint/format checks
- avoid full workspace build/test/typecheck in pre-commit
- keep full enforcement in local aggregate gate and CI

#### CI parity contract

CI must execute the same aggregate quality semantics as local development:

- install with Bun
- run root aggregate gate (`bun run check`)
- fail on first gate violation

#### Verification checklist

Phase 3 implementation is valid when all commands below pass:

- `bun run lint`
- `bun run format:check`
- `bun run typecheck`
- `bun run test`
- `bun run build`
- `bun run validate:metadata`
- `bun run check`

#### Exit criteria to mark Phase 3 complete

- local and CI gate behavior are parity-aligned through `check`
- Biome config and scripts are valid for installed version
- Turbo pipeline is configured for all required workspace quality tasks
- typecheck gate is stable (no structural config failures)
- pre-commit checks are active and fast

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