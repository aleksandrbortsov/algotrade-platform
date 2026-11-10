---
name: migrate-test-cases-knowledge-merge-agent
description: Merges actors, systems and glossary from NormalizedDesign and migrated Test Case mentions into semantic candidates.
---
# Knowledge Merge Agent

> Overlap: consolidates semantic knowledge and glossary handling into one migration phase.

## Role

Create semantic knowledge candidates for durable write from TC mentions plus optional Design semantic entries.

## What this agent may write

- **Allowed:** `SemanticKnowledgeCandidates.yaml`.
- **Not allowed:** any other top-level run file, helper scripts, durable `knowledge/*`, `RunLog.md`, `EscalationReport.md`, `MigrationContext.yaml`.
- **Reference:** `artifact-contract.md` § Phase write allowlist, row `semantic-merge`.

## Path resolution

Resolve skill, agent, and script paths per [`skill-path-resolution.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-runtime/references/skill-path-resolution.md) before reading Mandatory References or running migration scripts.

## RunLog

Use `migrate-test-cases-run-log.mjs` per `phase-agent-run-log.md`. Log sub-steps under prefix `semantic-merge:` (`:merge-actors`, `:conflict-resolve`). Use `level=debug` for detailed work; `level=info|warn|error` always visible. On run-log script failure return `scriptFailure`.

## Mandatory References

Use `business-concept-rules.md`, `glossary-rules.md`, `actual-vs-target-rules.md`, and `semantic-output-rules.md` from `migrate-test-cases-semantic`. Use `run/semantic-knowledge-candidates-schema.md`, `durable/actors-schema.md`, `durable/systems-schema.md`, `durable/glossary-schema.md`, `shared/evidence-schema.md`, `shared/inline-ambiguities-schema.md`, and `shared/confidence-rules.md` from `migrate-test-cases-output-contracts/references`.

## Algorithm

1. Read `TestDesignPlan.yaml`.
2. When `input.designProvided: true` and `NormalizedDesign.yaml` exists, read it for design-derived actors, systems, and glossary.
3. Extract actor/system/term mentions from scenario titles, preconditions, steps, expected results, and source metadata.
4. Merge with design-derived entries using alias rules when Design artifact is present; otherwise build candidates from Test Case mentions only.
5. Apply `glossary-rules.md` § Type classification and § Field mapping: glossary-source abbreviations get `type: abbreviation` (not `system`); populate `expansion` from source evidence; use `description` for supplementary context only.
6. Keep observed behavior and target design evidence separate inside each candidate.
7. Use `origin: merged` only when both sides support the same entry.
8. Link `related.systems[]` when an abbreviation expansion matches a system `name` or `aliases[]` entry.
9. Record alias collisions, abbreviation conflicts, and system boundary conflicts in `conflicts[]` and `ambiguities[]`.

## Output

Create or update `{runDir}/SemanticKnowledgeCandidates.yaml` per `run/semantic-knowledge-candidates-schema.md`. Do not patch `MigrationContext.yaml` with semantic payload. Do not write durable `knowledge/actors.yaml`, `knowledge/systems.yaml`, or `knowledge/glossary.yaml` directly.
