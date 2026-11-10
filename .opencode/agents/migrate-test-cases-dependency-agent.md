---
name: migrate-test-cases-dependency-agent
description: Discovers Test Case dependencies, duplicates, complements, and conflicts for migration.
---
# Dependency Discovery Agent

> Overlap: implements the dependency graph from the migration plan with deterministic graph checks separated into script.

## Role

Discover relations between Test Cases and between Test Cases and E2E candidates using `dependency-relation-rules.md` and `dependency-discovery-rules.md`.

## What this agent may write

- **Allowed:** `TestDesignPlan.yaml` (dependencies and `dependencyEvidence` only).
- **Not allowed:** `DependencyReport.yaml` or any other top-level run file, helper scripts, durable `knowledge/*`, `RunLog.md`, `EscalationReport.md`, `MigrationContext.yaml`, `{runDir}/code-scout-results/`, `ClarificationFindings.yaml` (reads).
- **Reference:** `artifact-contract.md` § Phase write allowlist, row `dependencies`.

## Path resolution

Resolve skill, agent, and script paths per [`skill-path-resolution.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-runtime/references/skill-path-resolution.md) before reading Mandatory References or running migration scripts.

## RunLog

Use `migrate-test-cases-run-log.mjs` per `phase-agent-run-log.md`. Log sub-steps under prefix `dependencies:` (`:graph-check`, `:fix-attempt-N`). Use `level=warn` for graph fix retries. Use `level=debug` for detailed work; `level=info|error` always visible. On run-log script failure return `scriptFailure`.

## Algorithm

### Prepare

1. Read `TestDesignPlan.yaml`, optional `TestData.yaml`, confirmed E2E sections of `E2ECandidates.yaml`, durable `paths.catalogPath`, and batch scenario YAML corpus when needed for `@scenario` refs. Do **not** read `{runDir}/code-scout-results/` or `ClarificationFindings.yaml` — per `dependency-discovery-rules.md` Inputs.
2. Reconcile TC ↔ Test Data links per `dependency-discovery-rules.md` (step 5): keep `scenarioLinks[]` and `scenarios[].testDataRefs[]` consistent using existing fields only.
3. Copy explicit legacy source relations with `origin: migrated` and `status: confirmed`.

All outgoing relations are written **only on batch scenarios** in the current plan. Durable-catalog scenarios are valid **targets** only — do not scan catalog scenarios as sources. See `dependency-discovery-rules.md` § Inline `@scenario` scope and § Semantic relation discovery.

### Track A — Syntactic (`@scenario`)

4. Run inline-ref pre-step:

```bash
node skills/migrate-test-cases-dependencies/scripts/migrate-test-cases-extract-scenario-refs.mjs \
  --plan {runDir}/TestDesignPlan.yaml \
  --candidates {runDir}/E2ECandidates.yaml \
  --catalog {paths.catalogPath} \
  --config-source migration
```

5. Write direct `@scenario` relations from script output plus any refs found in batch corpus YAML when plan steps still use legacy wording. Map to `depends_on` or `part_of` per `dependency-relation-rules.md` § Inline `@scenario` References. Use `origin: migrated`, `status: confirmed`. Do not expand transitive catalog `dependencies[]`.
6. For `@scenario` targets missing from plan and catalog, or `rejected` / `retired` in catalog: record ambiguity only; do not write compact `dependencies`.

### Track B — Semantic (pairwise analysis)

7. For each active batch scenario, compare against other batch scenarios, active durable-catalog scenarios, and E2E mapping context per `dependency-discovery-rules.md` § Semantic relation discovery and `dependency-relation-rules.md` § Semantic comparison.
8. Infer `depends_on`, `precedes`, `duplicates`, `conflicts_with`, `complements`, and non-`@scenario` `part_of` when Test Case evidence supports them (steps, validations, prerequisites, required data, classification, legacy metadata). Use shared `TestData.yaml` items as supporting evidence for TC↔TC `depends_on`; cite `itemId` in `dependencyEvidence` — TD ids are not graph endpoints.
9. Apply relation semantics: `depends_on` requires real prerequisite/state/data dependency; simple sequence uses `precedes`; `part_of` is composite desk scenario membership only in run artifacts (durable `test-descriptions-catalog.yaml` mirrors E2E membership as `part_of: E2E-TC-*` during knowledge write); E2E composes core desk TCs via `@scenario:TC-*` on `E2ECandidates.yaml` only.
10. Write semantic inferences as `status: candidate` or `needs-review` unless legacy source explicitly confirms them. Do not write compact edges on weak signals (title/folder/actor/system/Scenario/tags alone). When relation type is unclear (`duplicates` vs `complements` vs `depends_on`), record inline ambiguity with `candidates[]`.
11. Record every relation with `origin`, `status`, `evidence`, and confidence per `dependency-discovery-rules.md`.

### Validate

12. Run graph consistency check:

```bash
node skills/migrate-test-cases-dependencies/scripts/migrate-test-cases-graph.mjs \
  --plan TestDesignPlan.yaml \
  --candidates E2ECandidates.yaml \
  --catalog {paths.catalogPath}
```

### Graph check retry and STOP

Read `migration-config.json` → `execution.maxGraphFixRetries` (default `3`; also available on `MigrationContext.yaml.execution`).

After writing or updating relations:

1. Run `migrate-test-cases-graph.mjs` with `--catalog`.
2. If `verdict: ok` — finish dependency discovery; return phase summary with `nextGateReadiness: ready`, `fixAttemptsExhausted: false`.
3. If `verdict: fail` and fix attempts remain:
   - patch `TestDesignPlan.yaml` (compact `dependencies`, `dependencyEvidence`, related ambiguities);
   - fix deterministic graph errors only (endpoints, self-links, duplicates, rejected/undecided E2E, cycles, rejected-in-active);
   - record each auto-fix in `dependencyEvidence[]` using `rationale` and/or `notes` (see `dependency-discovery-rules.md` § Graph fix audit);
   - re-run the graph script;
   - increment an internal fix-attempt counter.
4. If `verdict: fail` after `maxGraphFixRetries` attempts:
   - return phase summary with `nextGateReadiness: blocked`, `fixAttemptsExhausted: true`, `fixAttempts`, `maxGraphFixRetries`, `blockingIssues[]`, and `graphErrors[]` (last graph script `errors[]`);
   - do **not** write `EscalationReport.md` or patch `MigrationContext.yaml` — orchestrator owns STOP escalation.

`warnings` from the graph script are not blocking; record them in the phase summary for review when `verdict: ok`.

Do not ask QA during dependency discovery.
