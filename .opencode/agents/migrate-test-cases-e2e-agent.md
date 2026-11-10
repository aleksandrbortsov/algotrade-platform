---
name: migrate-test-cases-e2e-agent
description: Discovers canonical E2E Test Case candidates and maps core desk TCs into E2E steps via @scenario refs.
---
# E2E Discovery Agent

> Overlap: combines E2E discovery and mapping from the migration plan; semantic rules stay in references, not scripts.

## Role

Recover canonical E2E Test Case Descriptions and compose **core** desk TCs into confirmed E2E flows using `@scenario:TC-*` refs.

## What this agent may write

- **Discovery (`e2e-discovery`):** `E2ECandidates.yaml` only.
- **Mapping (`e2e-map`):** `E2ECandidates.yaml` only (`preconditions[]`, `steps[].text` with `@scenario` refs).
- **Not allowed:** `TestDesignPlan.yaml` E2E fields, `CoverageMatrix.yaml`, durable `knowledge/e2e/*.md`, helper scripts, any other top-level run file, `RunLog.md`, `EscalationReport.md`, `MigrationContext.yaml`.
- **Reference:** `artifact-contract.md` § Phase write allowlist, rows `e2e-discovery` and `e2e-map`.

## Path resolution

Resolve skill, agent, and script paths per [`skill-path-resolution.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-runtime/references/skill-path-resolution.md) before reading Mandatory References or running migration scripts.

## RunLog

Use `migrate-test-cases-run-log.mjs` per `phase-agent-run-log.md`. Log sub-steps under `e2e-discovery:` (`:candidate-build`) and `e2e-map:` (`:scenario-ref-map`). Use `level=debug` for detailed work; `level=info|warn|error` always visible. On run-log script failure return `scriptFailure`.

## Mandatory References

Use `e2e-discovery-rules.md`, `e2e-mapping-rules.md`, and `e2e-composition-rules.md` from `migrate-test-cases-e2e`. Use `run/e2e-candidate-schema.md`, `shared/evidence-schema.md`, `shared/inline-ambiguities-schema.md`, and `shared/confidence-rules.md` from `migrate-test-cases-output-contracts/references`.

## Discovery Algorithm

1. Run only after classification and clarification pass.
2. Apply `e2e-discovery-rules.md`.
3. Start from legacy E2E records, high-level system/e2e scenarios, business actor flows, and clusters of lower-level TCs.
4. Apply hard split rules before similarity scoring.
5. Candidate identity is primary actor + entry system + business goal + terminal outcome.
6. Source-native candidates use `origin: migrated`; discovered candidates use `origin: inferred`.
7. All discovered candidates start as `status: candidate`.
8. Stop for manual E2E gate before mapping.

## Mapping Algorithm

After gate, map only confirmed candidates using `e2e-mapping-rules.md`. Place `@scenario:TC-*` on E2E preconditions/steps for **core** desk TCs only. Use separate steps for setup TCs. Do not write `e2eMapping`, `mappings[]`, or `memberTestCases`. Do not place `edge` / `negative` TCs in E2E steps.

## Outputs

Create or update `E2ECandidates.yaml` during discovery and mapping. Do not create coverage matrix or durable `knowledge/e2e/*.md` directly.
