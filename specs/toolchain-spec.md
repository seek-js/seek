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
- Standard package validation is delegated to publint + ATTW.
- Full tarball/install matrix validation is deferred to later hardening phases.

#### Implementation requirements

1. Define active package set and package role:
  - package role: `library`, `cli`, or `internal`
  - publish intent: `yes` or `no`
2. Standardize required manifest fields for active publish-intended packages.
3. Ensure all metadata paths point to built artifacts under `dist/`.
4. Add a root metadata validator command (`validate:metadata`).
5. Fail Phase 2 checks on any metadata contract mismatch.
6. Enforce package validation through `validate:package` (publint + ATTW).

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
2. Active package `name` matches expected contract value.
3. Publish payload policy includes `dist` in `files`.
4. For library packages, `exports["."].import`, `exports["."].types`, and root `types` are present and non-empty.
5. For CLI packages, `bin.seek` exists, resolves to a readable file, and contains the node shebang.
6. Package manifest read/parse failures are reported as package-scoped validation errors.

Output requirements:

- print package-scoped, actionable failures
- include missing key or broken path in each error
- exit `0` only when all active package contracts pass

#### Validation tool ownership

- `validate:metadata`: SeekJS smoke-policy checks (active package set and repo-specific policy)
- `validate:publint`: packaging contract and compatibility checks
- `validate:attw`: type/export resolution checks on packed library artifacts (`--pack`)
- `validate:package`: aggregate package validation (`publint` + ATTW)

Deep path resolution semantics (runtime/source path shape, boundary guarantees, resolver compatibility) are enforced through `validate:package` tooling, not duplicated in `validate:metadata`.

#### Required execution path (current stage)

1. `bun run build`
2. `bun run validate:metadata`
3. `bun run validate:package`

Optional local combined check:

- `bun run build && bun run validate:metadata && bun run validate:package`

#### Exit criteria to mark Phase 2 complete

- active package set and publish intent are explicitly documented
- all active publish-intended package manifests satisfy required contract fields
- `validate:metadata` passes from a clean build
- `validate:package` passes from a clean build
- no public metadata path references unresolved or source-only files
- CLI metadata contract passes (`bin` target + shebang)

#### Deferred to later phases

- tarball payload validation (`npm pack --dry-run` / packed file audits)
- clean-environment install/import smoke across package managers
- runtime compatibility matrix execution across Node/Bun/Deno

### Phase 3: Quality Gates

**Status:** **Complete** for Turbo-backed quality gates (local + CI via **`bun run check`**). Implementation details, operating model, and follow-ups are recorded in **`specs/turbo-spec.md`**; this is separate from **Phase 4: Runtime and Artifact Validation** below.

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
- `validate:package`

Aggregate root gate:

- `check` must execute the full required gate contract.

#### Turbo orchestration contract (as implemented)

- **`build`**, **`typecheck`**, **`test`:** root scripts use **`bunx turbo run <task>`**; `turbo.json` defines **`dependsOn`** for **`^build`** / **`^typecheck`** and outputs for **`dist/**`** and **`tsbuildinfo`** where applicable.
- **`lint`** / **`format:check`:** **`bun run check`** uses **`bunx turbo run lint`** and **`bunx turbo run format:check`**. Turborepo **Root Tasks** (**`//#lint`**, **`//#format:check`**) run **one** repo-root Biome pass; workspace packages use **stub** `lint` / `format:check` scripts so the graph stays uniform without duplicate Biome (see [Turborepo Biome guide](https://turbo.build/repo/docs/guides/tools/biome)).
- **`bun run lint`** / **`bun run format:check`** remain **direct** root Biome for ad-hoc runs; they are not required to match Turbo cache behavior.
- **`format:fix`:** root-direct Biome; **`//#format:fix`** with **`cache: false`** supports **`turbo run format:fix`** when needed.
- **Tests:** **`bun test`** is driven from each package’s **`test`** script under **`bunx turbo run test`**; suites live under **`packages/<name>/tests/`** where applicable.
- **Validators** (`validate:metadata`, `validate:package`): **root-direct** in this phase (not Turbo tasks).

#### Turbo migration plan (target-state contract)

Target state (aligned with implementation):

- Root **`build`**, **`typecheck`**, **`lint`**, **`format:check`**, **`test`** participate in Turbo for the aggregate gate; **`lint`/`format:check`** use Root Tasks + stubbed workspace scripts as above.
- `turbo.json` includes **`//#lint`**, **`//#format:check`**, **`//#format:fix`**, plus workspace task metadata for **`lint`**, **`format:check`**, **`test`**, **`build`**, **`typecheck`**.
- Dependency-aware ordering: **`build`** and **`typecheck`** use **`^`** dependencies as defined in `turbo.json`.
- Cache: artifact tasks declare **`outputs`**; **`test`** uses **`cache: false`**; **`//#format:fix`** is uncached.

Staged rollout (completed through Phase 3 on the migration branch):

1. Standardize package-level script **keys** across workspaces (real commands or stubs).
2. Define tasks in `turbo.json` including **Root Tasks** for Biome.
3. Switch root **`check`** internals to **`bunx turbo run`** for orchestrated quality tasks; keep validators root-direct.
4. Keep **`bun run check`** as the aggregate entrypoint for local + CI.

Validation:

- `bun run build`, `typecheck`, `test`, `check` (and optional direct `lint` / `format:check`) per **`specs/turbo-spec.md`** verification matrix.

Migration acceptance criteria:

- Turbo orchestrates **`build`**, **`typecheck`**, **`test`**, and **root Biome** via Root Tasks for **`lint`/`format:check`**.
- Package script **names** stay consistent; **lint/format** bodies are stubs except at repo root command for **`//`**.
- Root aggregate gate stays fail-closed and CI-parity aligned through **`bun run check`**.
- Details and closure recorded in **`specs/turbo-spec.md`**.

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
- `bun run validate:package`
- `bun run check`

#### Exit criteria to mark Phase 3 complete

- local and CI gate behavior are parity-aligned through `check`
- Biome config and scripts are valid for installed version
- Turbo pipeline covers **`build`**, **`typecheck`**, **`test`**, and **Root Tasks** for **`lint`** / **`format:check`** (plus optional **`//#format:fix`**)
- typecheck gate is stable (no structural config failures)
- pre-commit checks are active and fast
- **`specs/turbo-spec.md`** reflects implemented Turbo contract and operating guidance for this repo

### Phase 4: Runtime and Artifact Validation

**Note:** This roadmap phase is **runtime and artifact** validation only. It is separate from repo Turbo orchestration documented in **`specs/turbo-spec.md`**.

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