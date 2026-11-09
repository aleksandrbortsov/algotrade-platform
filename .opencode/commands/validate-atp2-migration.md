---
description: Validate a completed ATP2→ATP3 migration output against the ATP2 export
  (full step coverage + regeneration-readiness), write a gap analysis, and self-heal
  gaps by re-running the existing collectors. Run this AFTER /migrate-atp2 and BEFORE
  /generate-test.
---

# Validate ATP2 Migration

> **Coverage gate for a migration input package.** Diffs the generated self-contained descriptor against the **ATP2 export** to confirm every significant top-level scenario record is covered — as its own step, absorbed per the shared node taxonomy, or inside a `Repeat` range — and that the descriptor carries enough detail to regenerate the same ATP3 test. Gaps are written to a short analysis file and self-healed by re-running the existing collectors.

## Overview

`/migrate-atp2` produces the input package, and its gates take the coverage numbers from the builder's own return. This command re-derives them independently. It delegates a **read-only diagnosis** to `atp2-migration-validator` (one `atp_export_test_full` call, then a per-step classification as COVERED / PARTIAL / MISSING / NON-COLLECTABLE), then **heals** collectable gaps by re-running the existing migration phases — never with new collection logic. It is the middle step of the workflow:

```
1. new chat:  /migrate-atp2 <case>                 → produces the input package
2. same chat: /validate-atp2-migration [<case>]     → verifies coverage + self-heals gaps   ← this command
3. new chat:  /generate-test <descriptor path>      → generates the test from the fixed descriptor
```

## How to Use

```
/validate-atp2-migration [<ATP2 case URL | testCaseId | TC_NAME>]
```

With no argument, resolve the case from the most recent `MigrationCheckpoint.json` (or the migration just run in this chat). If more than one migration exists and none is implied by context, ask the user which case to validate.

## When to Use

- Immediately after a `/migrate-atp2` run, before handing the descriptor to `/generate-test`.
- Whenever you suspect a migrated descriptor is missing steps or detail (e.g. compound-heavy cases, node types no guide covers).

## Agent Instructions

**Mandatory reads (once, up front):**

| Read | Path |
|---|---|
| Migration orchestration skill | `.cursor/skills/atp2-migration/SKILL.md` |
| Launch templates + gate definitions | `.cursor/skills/atp2-migration/references/atp2-orchestration-protocol.md` |

**When this command is triggered, the AI agent MUST:**

1. **Orchestrator-only role.** Do NOT call `atp_*` MCP tools, do NOT write contracts/partials/the descriptor/env files, and do NOT write `MigrationValidation.md` inline. Diagnosis is delegated to `atp2-migration-validator`; collection and healing are delegated to `atp2-collector` and `atp2-descriptor-builder`. The orchestrator may only `Read`, `Grep`/`Test-Path` for gate checks, launch `Task`s, and write `MigrationCheckpoint.json`. Reuse the exact CONTEXT-only Launch Templates from `references/atp2-orchestration-protocol.md` — never copy an agent body into a prompt, never invent new collection logic.

2. **Resolve the case.** Read `MigrationCheckpoint.json` for the target case to get `caseRef`, `tcName`, `identifiers` (`projectId`), and `phaseResults.environment.envShort`. Derive `MIG = {rootFolder}/tests/Raw/Debug/ATP2_Migration/<TC_NAME>/`, `TC_CONTRACTS = {MIG}contracts/`, the descriptor path `{rootFolder}/tests/TestDesign/<tc_name>.md`, and `ENV_TEMPLATE = {ENV_DIR}/environment-configuration-template-<envShort>.json` (`ENV_DIR` per the protocol). If no checkpoint exists, ask the user for the case identifiers — a migration must have completed first.

3. **Diagnose** — launch `atp2-migration-validator` via the Task tool:
   - `subagent_type`: `"atp2-migration-validator"`
   - `description`: `"Validate migration coverage"`
   - `prompt` (CONTEXT only):
     ```
     Case URL (or testCaseId): <caseRef>
     projectId: <projectId>
     tcName: <TC_NAME>
     Descriptor path: {rootFolder}/tests/TestDesign/<tc_name>.md
     mcp-data-collection.md path: {MIG}mcp-data-collection.md
     Env template: {ENV_TEMPLATE}
     Checkpoint path: {MIG}MigrationCheckpoint.json
     Partials glob: {MIG}*-steps.partial.*.md
     Report output: {MIG}MigrationValidation.md
     ```
   - Verify on disk: `{MIG}MigrationValidation.md` exists; parse the single raw-JSON return.

4. **Decide.** If `regenerationReady === true` and every gap is NON-COLLECTABLE → skip healing, go to step 6. Otherwise heal (step 5), routing each finding by its kind:

   | Finding | Re-run |
   |---|---|
   | `gaps[]` with a non-null `remediation` | Phase 2, then Phase 3 |
   | `descriptorFindings[]`, `failedPlaceholders[]`, `invalidMarks[]`, coverage identity broken | Phase 3 only |

5. **Heal by re-running the existing pipeline (no new collection logic).** Re-run the phases with a corrective note that names exactly the findings, then re-verify:
   - **Re-run Phase 2 — Collection** (`subagent_type: "atp2-collector"`) using the Phase 2 Launch Template CONTEXT, appended with:
     ```
     Corrective focus: the following ATP2 steps were NOT covered by the previous pass and MUST be collected — {for each healable gap: name · stepId · contractKey · unitKind from its `remediation`}. Launch one atp2-unit-collector per node with that unitKind, and ensure each produces its artifact: a contract in {TC_CONTRACTS} plus a row in the `## Callchain contract map` for an API kind, a ui-steps.partial.* for a UI group, a unit-steps.partial.* otherwise. Re-collect the rest as usual (artifacts are per-migration, no reuse).
     ```
     Enforce the Phase 2 gate (see `references/atp2-orchestration-protocol.md`), now additionally requiring an artifact for each previously-missing node.
   - **Re-run Phase 3 — Descriptor build** (`subagent_type: "atp2-descriptor-builder"`) using the Phase 3 Launch Template CONTEXT, appended with the `failedPlaceholders`, `invalidMarks` and `descriptorFindings` rows to fix, so the step blocks and the inlined `## Call Contracts` are regenerated from the now-complete contract map. Enforce the Phase 3 gate.
   - **Conditional platform-merge** — if the Phase 3 return's `unmappedHosts[]` holds at least one row whose `mark` is exactly `unmapped`, run `atp2-env-merger` + the corrective descriptor re-run exactly as in the migration protocol. A row marked `atp2-internal`, `external`, `no-slot` or `unknown-origin` is terminal and is never sent to the merger.
   - **Re-diagnose** — re-launch `atp2-migration-validator` (step 3). Repeat heal→re-diagnose until `regenerationReady === true` or only NON-COLLECTABLE gaps remain, capped at **3** heal cycles (`execution.maxRetriesPerPhase`). If gaps that should be collectable still remain after the cap, STOP and escalate to the user with the validator's reasons — the collector likely needs a fix for a new pattern (do not silently accept the gap).

6. **Record + report.** Write a `validation` entry into `MigrationCheckpoint.json` `phaseResults` (`status`, coverage counts, `regenerationReady`, `reportFile`, real `startedAt`/`endedAt`, heal cycles run) — additive, do not remove existing phases. Then present the report below to the user.

## Completion report (mandatory, explicit — never silent)

Print a short summary:

```
Validation — <TC_NAME>
Expected steps from the export: <N> (absorbed <a>) · To represent: <G> · Descriptor blocks: <M>
COVERED <c> · PARTIAL <p> · MISSING <m> · NON-COLLECTABLE <x>
Regeneration-ready: <yes/no>

Healed this run:
- step 30 [SP][ITF Lite] Update TDM Table → collected via atp2-unit-collector (unitKind=api-compound), descriptor updated
- step 2 {{NDO.password}} → failed the env-template gate, rewritten as the run value with its mark

Covered through the generic guide (informational — the node type has no per-kind guide yet):
- step 12 Custom validation node

Remaining (user decision — NOT auto-fixable):
- step 21 [WA][SNMP] push trap → SNMP outbound, not reproducible as an HTTP step
```

Then state explicitly:
- If `regenerationReady` (no MISSING/PARTIAL, no descriptor finding): **"The descriptor now covers the ATP2 case and is ready for `/generate-test`."** — and give the descriptor path.
- If NON-COLLECTABLE items remain: warn that steps depending on them will be incomplete in generation until the user resolves them.
- The full analysis lives in `{MIG}MigrationValidation.md`.

## Generated Artifacts

| Artifact | Path | Written by |
|---|---|---|
| Gap analysis | `{MIG}MigrationValidation.md` | `atp2-migration-validator` |
| Updated descriptor (if healed) | `{rootFolder}/tests/TestDesign/<tc_name>.md` | `atp2-descriptor-builder` |
| New/updated unit artifacts (if healed; gitignored working files) | `{TC_CONTRACTS}/<key>__<slug>.md`, `{MIG}ui-steps.partial.*.md`, `{MIG}unit-steps.partial.*.md` | `atp2-unit-collector` |
| Checkpoint `validation` entry | `{MIG}MigrationCheckpoint.json` | this command |

## Related Documentation

- Migration command: `.cursor/commands/migrate-atp2.md`
- Migration orchestration skill: `.cursor/skills/atp2-migration/SKILL.md`
- Diagnostic subagent: `.cursor/agents/atp2-migration-validator.md`