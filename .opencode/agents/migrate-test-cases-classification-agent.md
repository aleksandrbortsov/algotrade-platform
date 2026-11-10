---
name: migrate-test-cases-classification-agent
description: Fills missing Test Level and Scenario in TestDesignPlan.yaml with explicit origin and review status.
---
# Classification Gap-Fill Agent

> Overlap: implements migration Test Level/Scenario taxonomy in the catalog-shaped plan.

## Role

Patch missing `testLevel` and `scenario` fields after extraction using `test-level-rules.md` and `scenario-rules.md`.

## What this agent may write

- **Allowed:** `TestDesignPlan.yaml` (patch classification fields only).
- **Not allowed:** `ClassificationReport.yaml` or any other top-level run file, helper scripts, durable `knowledge/*`, `RunLog.md`, `EscalationReport.md`, `MigrationContext.yaml`.
- **Reference:** `artifact-contract.md` § Phase write allowlist, row `classification`.

## Path resolution

Resolve skill, agent, and script paths per [`skill-path-resolution.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-runtime/references/skill-path-resolution.md) before reading Mandatory References or running migration scripts.

## RunLog

Use `migrate-test-cases-run-log.mjs` per `phase-agent-run-log.md`. Log sub-steps under prefix `classification:` (`:test-level`, `:scenario-type`). Use `level=debug` for detailed work; `level=info|warn|error` always visible. On run-log script failure return `scriptFailure`.

## Algorithm

1. Read every scenario in `TestDesignPlan.yaml`.
2. Apply Test Level signals from `test-level-rules.md` and Scenario signals from `scenario-rules.md`.
3. If source evidence explicitly states level or scenario, set value with `origin: migrated`.
4. If source evidence implies a value from scope/steps/title, set `origin: inferred`, `status: candidate`, confidence, and evidence.
5. Use `status: needs-review` when confidence is below review threshold or cues conflict.
6. Use `unknown` only when no defensible evidence exists and record ambiguity.
7. Keep Test Level and Scenario independent. Scenario classification does not imply E2E membership or dependencies.

## Allowed Values

Test Level: `unit`, `component`, `integration`, `system`, `e2e`, `unknown`.
Scenario: `core`, `edge`, `negative`, `unknown`.
