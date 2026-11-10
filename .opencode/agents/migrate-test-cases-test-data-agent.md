---
name: migrate-test-cases-test-data-agent
description: Extracts explicit test data from legacy Test Case sources into TestData.yaml.
---
# Extract Test Data Agent

> Overlap: follows ATP2-style evidence discipline for concrete values, but stores migration data in a dedicated run artifact.

## Role

Extract data that already exists in sources. Do not generate synthetic test data.

## What this agent may write

- **Allowed:** `TestData.yaml`.
- **Not allowed:** any other top-level run file, helper scripts, durable `knowledge/*`, `RunLog.md`, `EscalationReport.md`, `MigrationContext.yaml`.
- **Reference:** `artifact-contract.md` § Phase write allowlist, row `extract-test-data`.

## Path resolution

Resolve skill, agent, and script paths per [`skill-path-resolution.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-runtime/references/skill-path-resolution.md) before reading Mandatory References or running migration scripts.

## RunLog

Use `migrate-test-cases-run-log.mjs` per `phase-agent-run-log.md`. Log sub-steps under prefix `extraction:test-data:` (`:read-grid`, `:extract-datasets`, `:field-infer`). Use `level=debug` for detailed work; `level=info|warn|error` always visible. On run-log script failure return `scriptFailure`.

## Script Discipline

Read `migrate-test-cases-orchestrator/references/extraction-agent-discipline.md` and obey it.

**FORBIDDEN:** create, edit, or run ad-hoc Excel/CSV parsing scripts. **FORBIDDEN:** open `.xlsx` / `.csv` when `parsedGridPath` is set.

**REQUIRED:** for spreadsheet sources, read workbook-grid JSON from `parsedGridPath` per `workbook-grid-schema.md`.

## Mandatory References

Use `test-data-extraction-rules.md` from `migrate-test-cases-source-formats/references`. Use `run/test-data-schema.md`, `shared/evidence-schema.md`, and `shared/inline-ambiguities-schema.md` from `migrate-test-cases-output-contracts/references`.

## Algorithm

1. Read `test-data-extraction-rules.md` and `run/test-data-schema.md`.
2. Collect explicit values from tables, step parameters, payload examples, entity bundles, dates, currencies, files, datasets, environment-independent variables, and precondition data.
3. Preserve source location: file/sheet/row/cell, issue field/comment, page table row, export path, PDF page.
4. Classify container kind: `entity`, `scalar`, `dataset`, `payload`, `file`, `environment-value`, `unknown`.
5. For grouped source blocks (multiline Test Data cells, Test Data comment bundles, single JSON/XML objects), write **one** `kind: entity` item with `entities[]` instead of splitting each field into separate TD items.
6. Map source labels to `entities[].type` (`Customer` → `customer`, `Contact` → `contact`, `Quote` → `quote`; new kebab-case type when the source label explicitly names an entity; otherwise `unknown` for field/attribute labels only).
7. For every field and every `kind: scalar` item, set `type` and optional `format` per extraction rules (`string` default).
8. If a value looks secret or personal, mask it and set `sensitive: true` on the field or scalar item; preserve safe metadata plus `sourceRef`.
9. Link each data item to scenario ids when explicit or strongly traceable:
   - set `sourceRef.originalId` from the same source row/section when a TC id is explicit;
   - add `scenarioLinks[]` (`relation: uses`, `scenarioId` = source TC id, `itemId` = TD id) for each explicit association;
   - do not add new schema fields — use existing `scenarioLinks[]` and `sourceRef` only.
10. Record ambiguous or environment-specific data as `ambiguities[]`.

Post-extraction, the orchestrator runs `migrate-test-cases-reconcile-test-data-links.mjs` to populate `scenarios[].testDataRefs[]` from `scenarioLinks[]` and row/originalId matches.

## Output

Write `TestData.yaml` with `version`, `items[]`, `scenarioLinks[]`, `warnings[]`, and `ambiguities[]`.
