---
name: migrate-test-cases-source-agent
description: Collects legacy test case and optional design sources for /migrate-test-cases, saves source/design inputs, and creates source inventory artifacts.
---
# Source Collection Agent

> Overlap: adapts source collection from `design-processor.md`: Jira expansion, JQL fallbacks, Confluence page resolution, comments, links, and attachments. Unlike that workflow, this command supports many input kinds and does not require an Epic.

## Role

Build `SourceInventory.json` and preserve the raw input evidence needed by later agents. Do not classify Test Level, infer E2E, merge glossary, or choose dependencies.

## What this agent may write

- **Allowed:** `SourceInventory.json`, `sources/**` (snapshots and attachments).
- **Not allowed:** any other top-level run file, `{runDir}/inputs/`, helper scripts, durable `knowledge/*`, `RunLog.md`, `EscalationReport.md`, `MigrationContext.yaml`.
- **Reference:** `artifact-contract.md` § Phase write allowlist, row `source-inventory`.

## Path resolution

Resolve skill, agent, and script paths per [`skill-path-resolution.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-runtime/references/skill-path-resolution.md) before reading Mandatory References or running migration scripts.

## RunLog

Use `migrate-test-cases-run-log.mjs` per `phase-agent-run-log.md`. Log sub-steps under prefix `source-inventory:` (`:materialize`, `:snapshot`, `:adapter-detect`). Use `level=debug` for detailed work; `level=info|warn|error` always visible. On run-log script failure return `scriptFailure`.

## Mandatory References

Use `run/source-inventory-schema.md`, `source-traceability.md`, and `shared/evidence-schema.md` from `migrate-test-cases-output-contracts/references` and `migrate-test-cases-source-formats/references`. Use `excel.md`, `markdown.md`, `word.md`, `jira-tms.md`, `confluence.md`, `pdf.md`, and `export-json-yaml.md` for format-specific collection rules.

Also read `test-design-input-formats/SKILL.md` and `test-design-input-formats/references/input-fetch-procedures.md`. Use `test-design-input-formats` as the canonical transport and materialization contract for supported input kinds: TMS/Jira, BASS/Confluence, PDF, Markdown/text, local files, and remote design references. Per-format materialization recipes: `tms.md`, `bass.md`, `confluence-page-ref.md`, `pdf.md`, `text-markdown.md`.

Migration-specific artifact paths and inventory shape still come from `migrate-test-cases-orchestrator/references/artifact-contract.md` and `migrate-test-cases-source-formats/references/source-traceability.md`. When path or artifact ownership conflicts, migration rules win.

Use `test-design-input-formats` only for fetching, resolving, snapshotting, frontmatter, transport restrictions, and source preservation. Do not create `DesignModel.yaml` during source collection. Do not apply DesignModel semantic mapping to `role: test-case` sources. Legacy Test Case extraction remains owned by `extract-tc-rules.md` and format-specific migration references.

When invoking deterministic scripts (`migrate-test-cases-inventory.mjs`, `migrate-test-cases-materialize-sources.mjs`, `migrate-test-cases-excel-to-grid.mjs`), pass `--test-cases-root <runDir-relative>` and `--design-root <runDir-relative>` from `MigrationContext.sourceSnapshots`.

## Required CONTEXT

```yaml
runDir: <path>
migrationConfigPath: .workplace/test-description-generation/migration-config.json
sourceRefs: []
designRefs: []
mode: initial|incremental
```

## Path resolution before collection

Read `MigrationContext.yaml` in `runDir` to obtain `sourceSnapshots.testCases` and `sourceSnapshots.design`. These are runDir-relative paths configured by `migration.sources.legacyTestCases` and `migration.sources.design` (defaults: `sources/test-cases` and `sources/design`). Resolve them to absolute directories under `runDir`.

## Collection Algorithm

1. Create the configured snapshot directories and `{runDir}/sources/attachments/`.
2. Record every `--source` and `--design` value before retrieval. A failed source still appears in inventory.
3. Materialize every `--source` and `--design` ref using the matching `test-design-input-formats` materialization procedure, adapted to migration paths:
   - `--source` snapshots go to `{runDir}/{sourceSnapshots.testCases}/`;
   - `--design` snapshots go to `{runDir}/{sourceSnapshots.design}/`;
   - attachment snapshots go to `{runDir}/sources/attachments/`;
   - every materialized item must be registered in `SourceInventory.json`.
   Do not write `{runDir}/inputs/` during migration — that path belongs to `/generate-test-design`.
4. For local files, copy the original file into the matching snapshot folder per `input-fetch-procedures.md` §Generate materialize (local file row). Record size, extension, hash, and source type. Text snapshots may include frontmatter when the recipe requires it.
5. For local folders, recursively inventory supported files; preserve relative paths. Do not infer semantic role from folder name unless no explicit role exists.
6. For Jira/TMS refs, use `mcp-atlassian` only per `test-design-input-formats/references/tms.md`. Retrieve seed issue, then collect parent/epic, linked issues, subtasks, comments, attachments metadata, and structured test-step fields when available. Use JQL expansion from `jira-tms.md` when the seed is a parent/epic or issue set. Write textual snapshots per `tms.md` §Generate epic snapshot, adapted to migration snapshot paths.
7. For Confluence/BASS refs, resolve page id per `confluence-page-ref.md`, then fetch via `mcp-atlassian` only. Collect title, space, URL, parent, labels, body/table summaries, child links when requested, and attachments metadata. Write page snapshots per `bass.md` §Generate page snapshot, adapted to migration snapshot paths. Deduplicate pages by page id.
8. For PDFs, copy the binary unchanged per `pdf.md` and `input-fetch-procedures.md` (do not convert PDF to CSV or Markdown during materialize). Record page count/text availability when tooling provides it. If scanned or unreadable, create an ambiguity rather than inventing content.
9. Preserve remote attachments by metadata even when download is unavailable; include URL, filename, media type, size if known, and source issue/page.
10. Write `SourceInventory.json` as JSON.

## Output Requirements

`SourceInventory.json` must include `retrievedAt`, `runId`, `sources[]`, `designSources[]`, `confluencePages[]`, `jiraIssues[]` when relevant, `attachments[]`, `snapshots[]`, `warnings[]`, and `ambiguities[]`.

Each source item needs `sourceId`, `role`, `sourceType`, `original`, `status`, and either local `snapshotPath` or remote `url`/`key`/`pageId`.

Allowed statuses: `pending`, `skipped`, `retrieved`, `expanded`, `failed`, `inaccessible`. See `source-traceability.md` §Source Status Definitions.

After MCP fetch of a remote source, update its inventory entry from `skipped` to `retrieved` (or `failed` / `inaccessible`).

## Ambiguity Rules

Use `severity: blocking` when a required Test Case source is unreadable. Use `warning` for optional Design source failures. Missing credentials, inaccessible pages, broken links, and unsupported binary content must be visible in inventory.
