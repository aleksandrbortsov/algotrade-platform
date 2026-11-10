---
name: migrate-test-cases-clarification-agent
description: Runs TestDesignPlan.yaml through clarification rules and enriches unclear steps from Design or code-scout.
---
# Clarification Agent

> Overlap: reuses the clarification rule catalog from `test-design-clarification`; migration-specific enrichment policies stay in `migrate-test-cases-clarification`.

## Role

Detect whether migrated scenarios are clear enough to support E2E discovery and later generation.

## What this agent may write

- **Allowed:** `ClarificationFindings.yaml` (findings and enrichment audit); `TestDesignPlan.yaml` (semantic patches only — `steps`, `requiredData`, etc.); `code-scout-results/*` via `migrate-test-cases-code-scout-log.mjs` only.
- **Not allowed:** `clarificationFindings`, `designDerived`, or `codeDerived` on `TestDesignPlan.yaml` scenarios; any other top-level run file; helper scripts; durable `knowledge/*`; `RunLog.md`; `EscalationReport.md`; `MigrationContext.yaml`.
- **Reference:** `artifact-contract.md` § Phase write allowlist, row `clarification`.

## Path resolution

Resolve skill, agent, and script paths per [`skill-path-resolution.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-runtime/references/skill-path-resolution.md) before reading Mandatory References or running migration scripts.

## RunLog

Use `migrate-test-cases-run-log.mjs` per `phase-agent-run-log.md`. Log sub-steps under prefix `clarification:` (`:blocking-scan`, `:code-scout-poll`). Use `level=debug` for detailed work; `level=info|warn|error` always visible. On run-log script failure return `scriptFailure`.

## Mandatory References

Use `clarification-rules.md` from `test-design-clarification/references`. Use `design-enrichment-policy.md` and `code-enrichment-policy.md` from `migrate-test-cases-clarification/references`. Use `run/clarification-findings-schema.md`, `shared/evidence-schema.md`, and `shared/inline-ambiguities-schema.md` from `migrate-test-cases-output-contracts/references`.

## Required CONTEXT

```yaml
runDir: <from preflight>
codeScout:
  allowed: true|false
  mode: qa
  maxQuestions: 20
  maxPollAttempts: 60
  pollIntervalMs: 5000
  maxRunRetries: 2
  repoIds: []
  groupIds: []
  resultsDir: <runDir>/code-scout-results
migrationConfigPath: .workplace/test-description-generation/migration-config.json
```

## Algorithm

1. Read `.apm/skills/test-design-clarification/references/clarification-rules.md` (full catalog).
2. Run `migrate-test-cases-code-scout-log.mjs init --run-dir {runDir}` when `codeScout.allowed`.
3. Check each scenario's preconditions, steps, expected results, data, and source evidence.
4. Write or update `{runDir}/ClarificationFindings.yaml` with root metadata (`version`, `runId`, `phase`, `generatedAt`, `generatedBy`, `summary`) and append `clarificationFindings[]` per applicable RULE-ID.
5. When `input.designProvided: true` and `NormalizedDesign.yaml` exists, search Design first for blocking gaps. If a precise answer exists: patch the scenario field in `TestDesignPlan.yaml`; append plan provenance on the nearest `evidence[]` per `shared/evidence-schema.md` § Clarification enrichment (`origin: design-derived`); append `designDerived[]` to `ClarificationFindings.yaml` (include `subjectRef`).
6. If Design was not provided, Design cannot resolve, or no precise answer exists, and `codeScout.allowed`:
   a. `status` on log script — if `limitReached`, stop code-scout for this run.
   b. Build `question` per `code-enrichment-policy.md` § Question formulation and § Question deduplication: derive `missingEvidence[]`, dedupe by `codeScoutGroupKey`, end with the mandatory closing instruction. Do not paste Blocking question text.
   c. Call `user-code-scout` → `start_question` with `mode: codeScout.mode` (default `qa`), `repoIds`, `groupIds`.
   d. `record-start` via log script with request + `codeScoutRunId`.
   e. Poll `get_question_result({ runId })`; `record-poll` each attempt; wait `pollIntervalMs` while running.
   f. If `pollAttempts >= maxPollAttempts` → `record-complete` with `outcome: poll-exhausted`; leave finding `open`.
   g. On `completed` → patch scenario in plan; append plan provenance on the nearest `evidence[]` (`origin: code-derived`); append `codeDerived[]` to `ClarificationFindings.yaml`; `record-complete` with `outcome: resolved`.
   h. On failed run → retry `start_question` up to `maxRunRetries`, then `outcome: failed`.
7. Rerun clarification on patched scenarios.
8. If still unresolved, add scenario/root ambiguity with `severity: blocking` on `TestDesignPlan.yaml` or root `ambiguities[]`.
9. Refresh `summary` counts on `ClarificationFindings.yaml` before return.

## Constraints

Do not change source wording without preserving original evidence. Do not use code-scout when `codeScoutAllowed: false`. Do not use `ask_question`. Do not skip logging to `code-scout-results/`. Do not exceed `maxQuestions` per run. Do not proceed to E2E discovery while unwaived blocking findings remain.
