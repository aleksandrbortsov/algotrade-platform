---
name: migrate-test-cases-extract-tc-agent
description: Extracts legacy test cases from sources into TestDesignPlan.yaml in the migration catalog shape.
---
# Extract Test Cases Agent

> Overlap: emits TDG catalog-shaped `TestDesignPlan.yaml`, but reads legacy Test Case sources instead of design models.

## Role

Convert retrieved Test Case sources into catalog-shaped migration records. Do not invent missing classification or E2E mapping.

## What this agent may write

- **Allowed:** `TestDesignPlan.yaml`.
- **Not allowed:** any other top-level run file, helper scripts, side reports (`ClassificationReport.yaml`, …), durable `knowledge/*`, `RunLog.md`, `EscalationReport.md`, `MigrationContext.yaml`.
- **Reference:** `artifact-contract.md` § Phase write allowlist, row `extract-tc`.

## Path resolution

Resolve skill, agent, and script paths per [`skill-path-resolution.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-runtime/references/skill-path-resolution.md) before reading Mandatory References or running migration scripts.

## RunLog

Use `migrate-test-cases-run-log.mjs` per `phase-agent-run-log.md`. Log sub-steps under prefix `extraction:tc:` (`:read-grid`, `:parse-markdown`, `:boundary-detect`). Use `level=debug` for detailed work; `level=info|warn|error` always visible. On run-log script failure return `scriptFailure`.

## Script Discipline

Read `migrate-test-cases-orchestrator/references/extraction-agent-discipline.md` and obey it.

**FORBIDDEN:** create, edit, or run ad-hoc Excel/CSV parsing scripts (`xlsx_parse.mjs`, `dump_sheet.mjs`, `extract.mjs`, `inspect_xlsx.py`, `xlsx_to_md.py`, or similar). **FORBIDDEN:** open `.xlsx` / `.csv` snapshots when `SourceInventory.json` provides `parsedGridPath`.

**REQUIRED:** for `sourceType: excel|csv`, read `{parsedGridPath}` workbook-grid JSON per `workbook-grid-schema.md` and apply semantic steps 4–10 from `excel.md`.

## Required CONTEXT

```yaml
runDir: <path>
sourceInventoryPath: <runDir>/SourceInventory.json
migrationConfigPath: .workplace/test-description-generation/migration-config.json
outputPath: <runDir>/TestDesignPlan.yaml
```

## Mandatory References

Use `extract-tc-rules.md` and format-specific references from `migrate-test-cases-source-formats`, including `excel.md`, `markdown.md`, `jira-tms.md`, `confluence.md`, `pdf.md`, and `export-json-yaml.md`. Use `run/normalized-test-case-schema.md`, `shared/evidence-schema.md`, and `shared/inline-ambiguities-schema.md` from `migrate-test-cases-output-contracts/references`.

## Extraction Algorithm

1. Read `extract-tc-rules.md`, `run/normalized-test-case-schema.md`, and format-specific references from `migrate-test-cases-source-formats`.
2. Process only inventory items with `role: test-case` and `status: retrieved`.
3. Identify Test Case boundaries using source-specific rules: workbook-grid JSON rows/sheets (`parsedGridPath`), Markdown headings/tables, Jira/TMS structured test entities or prose fields, Confluence normalized page prose, JSON/YAML entities, or PDF text blocks. Confluence, Jira/TMS prose, and PDF text MUST delegate prose extraction to `markdown.md`.
4. Preserve original id/title exactly in `sourceRef.originalId` and `sourceTitle`. This id is the primary cross-run match key for additive partial import (`incremental-migration.md`).
5. Extract preconditions, steps, expected results, data references, labels, priority, component/system, suite/folder, execution order, and explicit links. When Test Data on the same source row/section maps to an explicit `TD-*` item, add `testDataRefs[]` on the scenario; when only the row association is known, rely on `sourceRef.originalId` + post-extraction `migrate-test-cases-reconcile-test-data-links.mjs`.
6. Convert into hierarchy: sprint -> feature -> case -> scenario. Use stable fallback buckets like `noSprint` and `legacy-migration` only when source lacks hierarchy.
7. If source explicitly states level, scenario type, dependency, or E2E relation, copy it with `origin: migrated`.
8. Missing or unclear semantic fields remain `unknown` or absent and get an ambiguity if they block later phases.
9. Record evidence for every material field.

## Output Rules

`TestDesignPlan.yaml` is the single migrated TC artifact. It may include migrated entries without Markdown `path`, because migration does not create per-TC Markdown.

Each scenario must have `scenarioId`, `title`, `status`, `sourceRef`, `evidence[]`, `preconditions[]`, `steps[]`, and `expectedResults[]` when available.
