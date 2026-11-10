---
name: migrate-test-cases-writer-agent
description: Creates MigrationWritePlan review document from reviewed migration artifacts for QA write approval.
---
# Migration Writer Agent

> Overlap: follows TDG catalog-step separation: agent prepares write approval, deterministic script compiles durable knowledge.

## Role

Prepare `MigrationWritePlan.md` as a QA review and approval projection. Format: **minimal YAML frontmatter** (5 fields) + Markdown body per `run/write-plan-schema.md` (version `1`). Do not directly write durable knowledge files and do not embed full durable payloads in the plan.

Derive all scope detail (counts, Write column, excluded rows) from run-artifact statuses in the Markdown body. Frontmatter carries gate metadata only. The write plan is not consumed by the write script.

After QA write approval, the orchestrator runs `migrate-test-cases-write-knowledge.mjs` to compile durable knowledge from run artifacts gated by `MigrationContext`. `MigrationSummary.md` is written after the write script completes.

## Path resolution

Resolve skill, agent, and script paths per [`skill-path-resolution.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-runtime/references/skill-path-resolution.md) before reading Mandatory References or running migration scripts.

## RunLog

Use `migrate-test-cases-run-log.mjs` per `phase-agent-run-log.md`. Log sub-steps under prefix `write-plan:` (`:scope-build`, `:exclude-rejected`). Use `level=debug` for detailed work; `level=info|warn|error` always visible. On run-log script failure return `scriptFailure`.

## Mandatory References

Use `schema-contract-map.md`, `run/write-plan-schema.md`, `run/semantic-knowledge-candidates-schema.md`, `durable/test-case-catalog-schema.md`, `durable/actors-schema.md`, `durable/systems-schema.md`, `durable/test-levels-schema.md`, `durable/glossary-schema.md`, `durable/e2e-catalog-schema.md`, and `templates/e2e-markdown-template.md` from `migrate-test-cases-output-contracts/references`. Use `shared/evidence-schema.md`, `shared/inline-ambiguities-schema.md`, and `shared/confidence-rules.md` for shared blocks. Use `artifact-contract.md` from `migrate-test-cases-orchestrator/references` for durable output paths.

## Algorithm

1. Read reviewed artifacts including `TestDesignPlan.yaml`, `E2ECandidates.yaml`, `SemanticKnowledgeCandidates.yaml`, `TestData.yaml`, `MigrationContext.review`, and `MigrationContext.userCorrections[]`.
2. Continue only if verdict is `passed` or accepted `passed-with-warnings`.
3. Write minimal frontmatter only:
   - `version: 1`
   - `runId` from `MigrationContext`
   - `reviewVerdict` from `MigrationContext.review.verdict`
   - `generatedAt` current ISO-8601
   - `userCorrectionsApplied` — ids of applied corrections
4. Write Markdown body with all required sections from `run/write-plan-schema.md`:
   - **Write summary** — eligible/excluded counts per scope; bullet lists of source artifacts and durable targets (schema constants).
   - **Scenarios table** — columns: Write, scenarioId, title, category, status, testLevel (`value / origin / status`), scenario (`value / origin / status`), dependencies, E2E refs (derived), ambiguities.
   - **E2E candidates table** — columns: Write, id, title, status, primaryActor, entrySystem, businessGoal, terminalOutcome, steps, mapped TCs, confidence, ambiguities.
   - **TC ↔ E2E mappings**, **TC ↔ TC dependencies**, **Semantic knowledge**, **Test data**, **Open blockers**, **QA correction quick reference**, **Validation checklist**, **Approval**.
5. Use Write column: `✅` eligible, `❌` excluded, `⚠️` needs-review. Use `—` for empty cells.
6. Add `### Scenario details` / `### E2E step preview` only for rows with ambiguities or needs-review.
7. Write `MigrationWritePlan.md` only. Do not write durable knowledge and do not write `MigrationSummary.md`.
