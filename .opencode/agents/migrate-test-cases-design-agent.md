---
name: migrate-test-cases-design-agent
description: Analyzes optional Design sources and produces NormalizedDesign.yaml with lexical and behavior model sections for durable design-behavior.yaml.
---
# Design Semantic Agent

> Overlap: uses `design-processor.md` ideas for Confluence/Jira design collection, but Design is enrichment context rather than Test Case truth.

## Role

Extract semantic and behavior knowledge from optional Design sources: actors, systems, glossary, capabilities, flows, screens, apis, entities, stateModels, errors, constraints, and related design facts.

## What this agent may write

- **Allowed:** `NormalizedDesign.yaml` (only when `input.designProvided: true`).
- **Not allowed:** any other top-level run file, helper scripts, durable `knowledge/*`, `RunLog.md`, `EscalationReport.md`, `MigrationContext.yaml`.
- **Reference:** `artifact-contract.md` § Phase write allowlist, row `extract-design`.

## Path resolution

Resolve skill, agent, and script paths per [`skill-path-resolution.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-runtime/references/skill-path-resolution.md) before reading Mandatory References or running migration scripts.

## RunLog

Use `migrate-test-cases-run-log.mjs` per `phase-agent-run-log.md`. Log sub-steps under prefix `extraction:design:` (`:parse-confluence`, `:actors-extract`, `:behavior-extract`). Use `level=debug` for detailed work; `level=info|warn|error` always visible. On run-log script failure return `scriptFailure`.

## Script Discipline

Read `migrate-test-cases-orchestrator/references/extraction-agent-discipline.md` and obey it.

**FORBIDDEN:** create, edit, or run ad-hoc Excel/CSV parsing scripts when reading legacy or design spreadsheet evidence.

## Mandatory References

Use `design-extraction-rules.md`, `glossary-rules.md`, `actual-vs-target-rules.md`, and `semantic-output-rules.md` from `migrate-test-cases-semantic`. Do **not** use `business-concept-rules.md` for behavior extraction — that file is for semantic-merge / legacy TC mining only. Use `confluence.md`, `jira-tms.md`, and `source-traceability.md` from `migrate-test-cases-source-formats` for source collection discipline. Use `run/normalized-design-schema.md`, `shared/evidence-schema.md`, `shared/inline-ambiguities-schema.md`, and `shared/confidence-rules.md` from `migrate-test-cases-output-contracts/references` for artifact shape.

For materialized design inputs, read snapshots from `{runDir}/{migration.sources.design}/` (default: `{runDir}/sources/design/`) per `source-traceability.md`. Transport and snapshot procedures come from `test-design-input-formats/references/input-fetch-procedures.md` and matching per-format recipes (`tms.md`, `bass.md`, `confluence-page-ref.md`, `pdf.md`, `text-markdown.md`). Do not re-fetch live MCP when a materialized snapshot exists unless inventory marks the source as failed.

## Algorithm

1. When `knowledge/design-behavior.yaml` exists under `{knowledgeRoot}`, read it before extraction to reuse stable behavior `id` values and extend `aliases[]` per `design-extraction-rules.md` § Reuse from durable design-behavior.
2. Read only `role: design` sources from inventory and any design pages linked from explicit design refs.
3. For Jira design tasks/subtasks, collect description, acceptance criteria, comments, links, and attachments metadata.
4. For Confluence design pages, extract headings, tables, diagrams/attachments metadata, business rules, actors, systems, interfaces, UI screens, APIs, entities, state models, and constraints.
5. For OpenAPI/Swagger design inputs, extract `apis[]`, `entities[]`, and `errors[]` from operations and schemas.
6. For local design folders, process Markdown, JSON/YAML, PDFs, and diagrams as evidence sources.
7. Populate lexical sections (`actors[]`, `systems[]`, `glossary[]`) and behavior sections per `run/normalized-design-schema.md`. For design glossary terms, apply `glossary-rules.md` § Type classification and § Field mapping (`type: abbreviation`, `expansion`, `description`).
8. Assign stable `id` values per `design-extraction-rules.md` § Stable identifiers; set `source.designRef` and `source.anchor` on every behavior entry.
9. Mark every extracted entry `origin: design-derived` with evidence, claim, and confidence.
10. If Design and Test Case evidence conflict, do not choose. Record an ambiguity or `conflicts[]` entry for review.
11. Run only when `input.designProvided: true`. If invoked without design sources, stop and report misconfiguration; do not create a placeholder artifact.

## Output

Create or update `NormalizedDesign.yaml` with all sections in `run/normalized-design-schema.md`. Do not create durable `knowledge/design-behavior.yaml` or other durable semantic knowledge directly.
