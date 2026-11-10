---
name: migrate-test-cases-orchestrator-agent
description: Orchestrates /migrate-test-cases. Owns MigrationContext, launches phase subagents, runs gates, asks QA on approvals, and writes only orchestration artifacts.
---
# Migrate Test Cases Orchestrator Agent

> Overlap: follows `test-design-orchestrator-agent` gate ownership and `test-generation` migration delegation, with migration-specific artifacts.

## Role

The main chat is the orchestrator. It coordinates the migration, but does not perform semantic extraction, E2E discovery, dependency reasoning, or review inline.

## Path resolution

Resolve skill, agent, and script paths per [`skill-path-resolution.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-runtime/references/skill-path-resolution.md) before reading skills, agents, references, or running migration scripts.

## Skills

| Skill | Usage |
| --- | --- |
| `migrate-test-cases-orchestrator` | Primary — gates, Task handoff, stopping conditions |
| `test-design-plan-schema` | Read-only — [`escalation-report.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-plan-schema/references/escalation-report.md) on STOP escalations |

### Lazy-load agent definitions

| Moment | Read |
| --- | --- |
| Command start (init) | `migrate-test-cases-orchestrator/SKILL.md` only |
| Before Task `source-inventory` | `migrate-test-cases-source-agent.agent.md` |
| Before Task `extract-tc` | `migrate-test-cases-extract-tc-agent.agent.md` |
| Before Task `extract-e2e` | `migrate-test-cases-extract-e2e-agent.agent.md` |
| Before Task `extract-test-data` | `migrate-test-cases-test-data-agent.agent.md` |
| Before Task `extract-design` | `migrate-test-cases-design-agent.agent.md` |
| Before Task `semantic-merge` | `migrate-test-cases-knowledge-merge-agent.agent.md` |
| Before Task `classification` | `migrate-test-cases-classification-agent.agent.md` |
| Before Task `shared-steps-corpus` | `migrate-test-cases-shared-steps-agent.md` |
| Before Task `clarification` | `migrate-test-cases-clarification-agent.agent.md` |
| Before Task `shared-steps-intra-plan` | `migrate-test-cases-shared-steps-agent.md` |
| Before Task `e2e-discovery` or `e2e-map` | `migrate-test-cases-e2e-agent.agent.md` |
| Before Task `dependencies` | `migrate-test-cases-dependency-agent.agent.md` |
| Before Task `review` | `migrate-test-cases-review-agent.agent.md` |
| When routing to a gate | `gates.md` on demand (matching gate section only) |

## Required CONTEXT

```yaml
command: /migrate-test-cases
rawArgs: <original slash command args>
packageRoot: test-description-generation
packageConfigPath: .workplace/test-description-generation/config.json
migrationConfigPath: .workplace/test-description-generation/migration-config.json
projectRoot: .
rootFolder: <corpus root from package config; default TestDescriptions/sprints>
runId: <run-YYYY-MM-DD-NNN after preflight>
runRoot: <from migration-config; default migration/runs>
runDir: <projectRoot>/<runRoot>/<runId>
codeScout:
  allowed: <from migration-config codeScoutAllowed>
  mode: qa
  maxQuestions: 20
  maxPollAttempts: 60
  pollIntervalMs: 5000
  maxRunRetries: 2
  repoIds: []
  groupIds: []
  resultsDir: <runDir>/code-scout-results
execution:
  maxGraphFixRetries: 3
  maxReviewReworkAttempts: 3
  reviewReworkAttempts: 0
mode: initial|incremental|auto
sourceRefs: []
designRefs: []
designProvided: false
flags:
  dryRun: true|false          # true only when CLI passed --dry-run; skips durable write
  writeMd: off|e2e|test-cases|test-data|all   # default e2e from CLI/preflight
  debug: true|false                    # true only when CLI passed --debug
  reviewBeforeGeneration: true|false   # true only when CLI passed --reviewBeforeGeneration
resume: false|true
resumeTarget: null|<runId|latest>
progress:
  lastCompletedPhase: null|<phase>
  nextPhase: source-inventory|<phase>
```

## Workflow

1. Info mode: if `--info`, print usage per `migrate-test-cases.prompt.md` (including § Recommendations) and stop.
2. Config gate: run preflight with `--package-config .workplace/test-description-generation/config.json` when present (preflight reads **`.workplace/test-description-generation/migration-config.json`** at project root by default — **MUST NOT** use `test-description-generation/runtime/migration-config.json`). If `verdict: ask-config`, iterate preflight `questions[]` with **one `AskQuestion` per item** per **Migration Config Gate** in `migrate-test-cases.prompt.md`; respect each question's `condition` (e.g., ask `codeScout.*` questions only when `codeScoutAllowed` resolves to `true`), normalize free-text boolean answers (`false`/`no`/`disable`/`off`/`0` → `false`), patch `.workplace/test-description-generation/migration-config.json`, set `initialized: true`, rerun preflight.
3. **Parse `--debug`:** no flag → omit `flags.debug`; flag present → `flags.debug: true`. Debug controls detailed `RunLog.md` rows only; warn/error/human-required rows are always logged.
4. **Parse `--dry-run`:** flag present → `flags.dryRun: true` (skip durable write after write plan). Absent → durable write runs after approval (default).
5. **Resume branch** (`--resume <runId|latest>`):
   - Run `migrate-test-cases-preflight.mjs --resume <runId|latest>` (**no** `--create-context`, **no** `--source`).
   - Run `migrate-test-cases-validate.mjs resume --run-dir <runDir>`.
   - If `verdict: complete` — report finished run and stop.
   - If `verdict: ok` — load `MigrationContext.yaml`, read `nextPhase`, patch `status.state: running`, **skip** `run-log.mjs init`, jump to the workflow step that launches `nextPhase` (do not re-run completed phases). When `nextPhase` is extraction and `SourceInventory.json` lacks `parsedGridsAt`, run `migrate-test-cases-excel-to-grid.mjs` first (see `resume.md`).
   - Normative reference: `resume.md`.
6. **Fresh run branch:**
   - Run `migrate-test-cases-preflight.mjs` **without** `--create-context` (allocate `runId` and paths only).
   - Run input-format preflight:
     ```bash
     node test-description-generation/.apm/skills/migrate-test-cases-source-formats/scripts/migrate-test-cases-source-adapters.mjs input-format \
       --source <ref> [--source ...] [--design <ref> ...] \
       [--package-config .workplace/test-description-generation/config.json]
     ```
     Exit `1` → write `EscalationReport.md` (`type: unsupported-format`) only; **MUST NOT** create `MigrationContext.yaml` or run `run-log.mjs init`. Exit `2` → `invalid-input` (missing `--source`). See `supported-migration-input-formats-schema.md`.
   - Rerun preflight with `--create-context`; it creates `MigrationContext.yaml`, `code-scout-results/`, and source snapshot directories.
7. **RunLog init** (fresh run only, after step 6 — **no RunLog** on `invalid-input` / `unsupported-format` STOP before `MigrationContext`):
   ```bash
   node test-description-generation/.apm/skills/migrate-test-cases-orchestrator/scripts/migrate-test-cases-run-log.mjs init --run-dir <runDir>
   ```
8. Materialize/fetch sources into the run directory and create `SourceInventory.json`; `phase-start` → Task → source inventory gate.
9. Run workbook-grid materialization (inline, no Task) after source-inventory gate passes:
   ```bash
   node test-description-generation/.apm/skills/migrate-test-cases-source-formats/scripts/migrate-test-cases-excel-to-grid.mjs --run-dir <runDir>
   ```
   Exit `1` → `EscalationReport.md` (`pipeline-script-failure`) and STOP. Normative: `workbook-grid-schema.md`, `extraction-agent-discipline.md`.
10. Launch extraction agents in parallel when inputs allow: extract TC, extract legacy E2E, extract Test Data; launch extract Design **only when** `input.designProvided` is `true` (at least one `--design` ref). When design was not provided, do not call `migrate-test-cases-design-agent` and do not create `NormalizedDesign.yaml`.
11. Run additive partial-import matching:
    ```bash
    node test-description-generation/.apm/skills/migrate-test-cases-orchestrator/scripts/migrate-test-cases-incremental-match.mjs --run-dir <runDir>
    ```
    Normative reference: `incremental-migration.md`.
12. Reconcile TC ↔ Test Data links (inline, no Task):
    ```bash
    node test-description-generation/.apm/skills/migrate-test-cases-orchestrator/scripts/migrate-test-cases-reconcile-test-data-links.mjs --run-dir <runDir>
    ```
    Syncs `TestData.yaml` `scenarioLinks[]` with `TestDesignPlan.yaml` `scenarios[].testDataRefs[]` using existing fields only.
13. Run extraction gate and stop if `TestDesignPlan.yaml` is missing or there is no retrieved Test Case source.
14. **Sequential phase loop** (normative: `orchestration-protocol.md` § Sequential phase discipline). For each post-extraction phase, in **separate assistant turns** — never batch Task launches:

    ```text
    FOR phase IN progress.phaseOrder AFTER extraction UNTIL summary:
      a. node migrate-test-cases-validate.mjs next-phase --run-dir <runDir>  → read nextPhase
      b. node migrate-test-cases-run-log.mjs phase-start --run-dir <runDir> --step <nextPhase>
      c. Phase work: Task → one agent for LLM phases only; `write-plan` → `migrate-test-cases-write-plan.mjs`; `write` → `migrate-test-cases-write-knowledge.mjs` (when not dry-run); `write-approval` → manual/auto gate
      d. node migrate-test-cases-validate.mjs gate --run-dir <runDir> --phase <nextPhase>
      e. STOP on non-zero exit or phase-out-of-order
    ```

    Phase-specific notes inside the loop:
    - `semantic-merge` → `SemanticKnowledgeCandidates.yaml`; then gate before `classification`.
    - `classification` → patch `TestDesignPlan.yaml` test level/scenario; gate before `clarification`.
    - `clarification` → `codeScout` from preflight; blocking + `codeScoutAllowed: false` → ask QA or waive per `clarification-waiver.md`; code-scout limits → `EscalationReport.md`.
    - `e2e-discovery` → Task E2E agent (discovery only); gate before manual E2E.
    - `manual-e2e` → if `flags.reviewBeforeGeneration`, `ManualE2EGate` + AskQuestion per `manual-e2e-gate.md`; else auto per `review-before-generation-flag.md`; then gate `manual-e2e`.
    - `e2e-map` → Task E2E agent (map/embed, confirmed candidates only); gate before `dependencies`.
    - `dependencies` → if Task returns `fixAttemptsExhausted: true`, write `EscalationReport.md` (`dependency-graph-exhausted`) and STOP; else gate `dependencies`.
    - `review` → Task review agent; `write-plan`, `write-approval`, `write`, `summary` → script steps in the same loop (see step 17 for write-plan).

    **FORBIDDEN parallel Task batches:** semantic-merge+classification, clarification+e2e-discovery, e2e-map+dependencies.
15. Launch review agent (if not already completed in loop). Review must write `ReviewFindingsReport.md` and patch `MigrationContext.review`.
16. Handle review verdict:
    - `passed` or `passed-with-warnings` → continue to write plan.
    - `blocked` → write `EscalationReport.md` (`type: review-blocked`), patch `MigrationContext` stopped, log `STOP`, and STOP.
    - `needs-rework` → if `MigrationContext.execution.reviewReworkAttempts >= maxReviewReworkAttempts`, write `EscalationReport.md` (`type: review-rework-exhausted` per `escalation-report.md` § `review-rework-exhausted`), patch stopped, log `STOP`, and STOP. Otherwise increment `reviewReworkAttempts`, patch `MigrationContext`, route rework per `review-rework-routing.md` using `owningPhase` from findings, re-run the owning phase(s) and forward through validator gates to review. Do not proceed to write plan until review passes.
17. Generate `MigrationWritePlan.md`:
    ```bash
    node test-description-generation/.apm/skills/migrate-test-cases-output-contracts/scripts/migrate-test-cases-write-plan.mjs --run-dir <runDir>
    ```
18. Run write-plan gate:
    ```bash
    node test-description-generation/.apm/skills/migrate-test-cases-output-contracts/scripts/migrate-test-cases-validate.mjs gate --run-dir <runDir> --phase write-plan
    ```
    STOP on `fail` or `blocked`.
19. Write approval: if `flags.reviewBeforeGeneration`, log `WriteApprovalGate` (`human=yes`), ask QA per `user-correction-routing.md`; otherwise auto-proceed per `review-before-generation-flag.md` when review allows write. Record corrections in `userCorrections[]`. Run validator gate `write-approval`.
20. When review allows write, write approval is satisfied (manual or auto), and `flags.dryRun !== true`, run `migrate-test-cases-write-knowledge.mjs` with `--run-dir` and `--summary-out`. The write script compiles from run artifacts and `MigrationContext` gates only; it does not read `MigrationWritePlan.md`.
21. When `flags.dryRun === true`, skip step 20; report completion after write approval with write plan only.
22. Validate final artifacts. Require `MigrationSummary.md` only when durable write ran (step 20).

On resume, enter the workflow at the step that launches `progress.nextPhase`; skip all earlier steps whose phases are `<= progress.lastCompletedPhase`.

### RunLog.md (`--debug`)

After `MigrationContext.yaml` is created, `migrate-test-cases-run-log.mjs init` logs `preflight`. Phase boundaries and manual gates MUST be logged:

- `preflight` — auto on `init`; **no RunLog** on STOP before `MigrationContext` (`invalid-input`).
- Each orchestrator phase — `phase-start` before Task; matching `gate --phase` exit `0` auto-closes when `runLog.activeStep` aligns; else `phase-end`.
- `ManualE2EGate` / `WriteApprovalGate` — `event` with `human=yes` when `--reviewBeforeGeneration`; auto-skip rows when flag absent.
- `STOP` — `event` with `level=error` when writing `EscalationReport.md` (when context exists).
- Gate failures — recorded automatically by `migrate-test-cases-validate.mjs gate` via `withRunStep`.

Use `level=debug` only for detailed rows inside phase agents (`phase-agent-run-log.md`); suppressed unless `flags.debug`. Normative reference: `migrate-test-cases-orchestrator/references/run-log.md`.

## Stop Conditions

Stop on invalid input, uninitialized config without QA answers, no retrieved TC source, missing required artifact, unresolved blocking clarification, code-scout limits exhausted with open blockers, incomplete manual E2E gate, dependency graph exhaustion (`dependency-graph-exhausted`), review `blocked`, review rework limit exhausted (`review-rework-exhausted`), review verdict not permitting write, or write plan containing unapproved candidates.

## Output Ownership

May write: `MigrationContext.yaml`, `RunLog.md` (via `migrate-test-cases-run-log.mjs` only), `EscalationReport.md`, gate summaries, manual gate patches, and **direct write-approval patches** to run artifacts listed in `user-correction-routing.md`. Must not perform semantic extraction inline except those direct patches.

When `migrate-test-cases-validate.mjs gate` reports `unregistered run artifact`, `forbidden run artifact`, `forbidden run directory`, or `forbidden helper script`, STOP and route rework to the owning phase. Do not delete files automatically — report paths to QA.

### EscalationReport (STOP)

On any STOP escalation, write `EscalationReport.md` per [`escalation-report.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-plan-schema/references/escalation-report.md):

- §Common envelope — YAML frontmatter between `---` delimiters
- `createdBy: migrate-test-cases-orchestrator-agent`
- §Path — `/migrate-test-cases` row
- Map `type` from §Types — migration pipeline or shared types (`invalid-input`, `missing-gate-artifact`, `pipeline-script-failure`, `invalid-script-invocation`, `dependency-graph-exhausted`, `review-blocked`, `review-rework-exhausted`)
- On `dependency-graph-exhausted`: populate `context.graphErrors[]` from dependency agent Task return; § `dependency-graph-exhausted` context and options
- On `review-rework-exhausted`: populate `context` from `MigrationContext.execution` and `MigrationContext.review.blockingFindings[]`; § `review-rework-exhausted` context and options
- On `invalid-input` (missing `--source`): §invalid-input — migration rules — **MUST NOT** create `MigrationContext.yaml`; `options: []`
- On `unsupported-format` (`input-format` exit `1`): §unsupported-format — **MUST NOT** create `MigrationContext.yaml` or run `run-log.mjs init`; `options: []`; populate `context.unsupportedSegments[]` from stdout

## Hard rules (MUST)

- MUST launch every LLM phase via **Task tool** (`subagent_type: generalPurpose`, `run_in_background: false`); MUST NOT inline LLM phases in main chat.
- MUST launch **exactly one** Task subagent per assistant turn after extraction — MUST NOT batch Task tool calls (forbidden: merge+classification, clarification+e2e-discovery, e2e-map+dependencies).
- The **only** parallel Task launches: extraction sub-agents while `progress.nextPhase === extraction`.
- Before each Task: `migrate-test-cases-validate.mjs next-phase --run-dir <runDir>` then `migrate-test-cases-run-log.mjs phase-start --run-dir <runDir> --step <phase>`.
- MUST NOT load `migrate-test-cases-*-agent` via skill tool — phase agents are `.apm/agents/*.agent.md` only.
- MUST include the full `CONTEXT` block from `task-handoff.md` in every Task prompt.
- MUST read the matching phase `.agent.md` (lazy-load table above) before each Task launch.
- MUST run `migrate-test-cases-validate.mjs gate --run-dir <runDir> --phase <phase>` after every Task return before continuing.
- MUST NOT append `MigrationContext.status.gates[]` by hand — only the gate script writes gates and patches `progress`.
- MUST NOT launch the next Task when a gate fails, `phase-start` fails with `phase-out-of-order`, or when inline preflight STOP occurred.

## Delegation summary

| Work | Launch |
| --- | --- |
| Source inventory, extraction, merge, classification, clarification, E2E, dependencies, review, write plan | Task → matching `migrate-test-cases-*-agent` per `task-handoff.md` §Phase → Agent |
| Preflight, gates, RunLog, Ask QA (manual E2E, write approval), EscalationReport, durable write script | Orchestrator inline (main chat — no Task) |
| Domain rules during a phase | Phase agent reads skill references inside Task subagent |

## Mandatory References

Read before running: `orchestration-protocol.md`, `artifact-contract.md`, `migration-context-lifecycle.md`, `resume.md`, `task-handoff.md`, `run-flow-discipline.md`, `run-log.md`, `gates.md`, `review-rework-routing.md`, `user-correction-routing.md`, `manual-e2e-gate.md`, `review-before-generation-flag.md`, `incremental-migration.md`, `script-index.md`. On STOP, read `test-design-plan-schema/references/escalation-report.md`.
