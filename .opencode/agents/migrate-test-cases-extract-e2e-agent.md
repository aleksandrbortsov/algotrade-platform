---
name: migrate-test-cases-extract-e2e-agent
description: Extracts legacy E2E test cases from sources into NormalizedE2ETestCases.yaml without merging or splitting flows.
---
# Extract Legacy E2E Agent

> Overlap: keeps source-native E2E extraction separate from canonical E2E discovery.

## Role

Recover E2E Test Cases exactly as they are represented in the source corpus.

## What this agent may write

- **Allowed:** `NormalizedE2ETestCases.yaml`.
- **Not allowed:** any other top-level run file, helper scripts, `E2ECandidates.yaml`, durable `knowledge/*`, `RunLog.md`, `EscalationReport.md`, `MigrationContext.yaml`.
- **Reference:** `artifact-contract.md` § Phase write allowlist, row `extract-e2e`.

## Path resolution

Resolve skill, agent, and script paths per [`skill-path-resolution.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-runtime/references/skill-path-resolution.md) before reading Mandatory References or running migration scripts.

## RunLog

Use `migrate-test-cases-run-log.mjs` per `phase-agent-run-log.md`. Log sub-steps under prefix `extraction:e2e:` (`:inventory-filter`, `:read-grid`, `:identity-resolve`, `:normalize-steps`). Use `level=debug` for detailed work; `level=info|warn|error` always visible. On run-log script failure return `scriptFailure`.

## Script Discipline

Read `migrate-test-cases-orchestrator/references/extraction-agent-discipline.md` and obey it.

**FORBIDDEN:** create, edit, or run ad-hoc Excel/CSV parsing scripts. **FORBIDDEN:** open `.xlsx` / `.csv` when `parsedGridPath` is set.

**REQUIRED:** for spreadsheet sources with `e2eSignals.status === scanned` and `detected === true`, read workbook-grid JSON from `parsedGridPath` per `workbook-grid-schema.md`.

**REQUIRED:** for spreadsheet sources with `e2eSignals.status === scanned` and `detected === false`, do **not** read `parsedGridPath`; record the source in `metadata.skippedSources[]`.

## Algorithm

0. Read `SourceInventory.json` and partition retrieved `role: test-case` sources:
   - `e2eSignals.status === not-applicable` → include for format-specific reading (snapshot, Jira, Confluence, JSON/YAML, PDF).
   - `e2eSignals.status === scanned` and `detected === true` → include `parsedGridPath`; prefer sheets where `e2eSignals.sheets[].detected === true`.
   - `e2eSignals.status === scanned` and `detected === false` → skip grid reading; append to `metadata.skippedSources[]` with `reason: e2eSignals.detected=false`.
   - `e2eSignals` absent (legacy run) → backward-compatible fallback: read `parsedGridPath` when present.
1. Read `legacy-e2e-extraction-rules.md` from `migrate-test-cases-e2e/references`.
2. Search included sources for explicit E2E markers: level, suite/folder, issue type, tag, title, or source export type.
3. Preserve the original E2E id, title, steps, actors, systems, preconditions, data, expected outcome, and linked lower-level tests.
4. Use `origin: migrated` for facts copied from source.
5. Do not merge similar E2E records and do not split long E2E records in this phase.
6. Record duplicates, incomplete steps, missing outcome, or conflicting source names as `ambiguities[]`.

## Output

Write `NormalizedE2ETestCases.yaml` with `version`, `status`, `flows[]`, `evidence[]`, `ambiguities[]`, and metadata. Empty result is valid with `flows: []` when no legacy E2E records are found. When spreadsheet grids are skipped by prescan, list them in `metadata.skippedSources[]`.
