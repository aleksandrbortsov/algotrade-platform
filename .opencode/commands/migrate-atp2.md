---
description: Prepare a /generate-test input package (self-contained descriptor and
  environment artifacts) from an ATP2 legacy test case; does not run generation.
---

# Migrate ATP2

> **Prepare a migration input package from an ATP2 (legacy) test case** — collects HTTP truth + environment from ATP2 and produces a self-contained test descriptor plus environment config artifacts, ready to be consumed downstream.

## Overview

`/migrate-atp2` orchestrates the ATP2 → ATP3 migration as a linear, gated pipeline of narrow subagents. The orchestrator never collects data or writes artifacts inline — every phase is delegated via the Task tool. The final output is an input package: a self-contained descriptor plus an environment template and values file.

## How to Use

```
/migrate-atp2 <ATP2 case URL or testCaseId> [projectId] [testRunId] [executionRequestId] [slice scope]
```

Minimum required: a case URL or `testCaseId`. `projectId`, a PASSED `testRunId`, and `executionRequestId` are needed for execution collection + environment export. If any required identifier is missing, the orchestrator asks the user before starting.

## When to Use

- Migrating an existing ATP2 test case (API, UI, or mixed) into an ATP3 test descriptor.
- Re-running collection for a case after the ATP2 data changed.

## Agent Instructions

**Mandatory reads (once, up front, before any phase):**

| Read | Path |
|---|---|
| Migration orchestration skill | `.cursor/skills/atp2-migration/SKILL.md` (points to its own orchestration references) |

**When this command is triggered, the AI agent MUST:**

1. Follow all steps in the skill's **Workflow** section.

2. **Orchestrator-only role.** The orchestrator MUST NOT call `atp_*` MCP tools, collect HTTP, export environments, write specs, or write the descriptor inline. ALL phase work is delegated to `atp2-*` subagents via the Task tool. If the orchestrator begins phase work inline, it is violating the protocol and MUST stop and delegate.

3. **Launch the phase subagents in sequence** via the Task tool, using the CONTEXT-only Launch Templates from `references/atp2-orchestration-protocol.md`:
   - **Phase 1** — Environment export (`subagent_type: "atp2-env-exporter"`) — its env template is passed to both later phases
   - **Phase 2** — Collection (`subagent_type: "atp2-collector"`) — base collection + one `atp2-unit-collector` per classified unit (contract files, UI partials, unit partials)
   - **Phase 3** — Descriptor build + host reconciliation (`subagent_type: "atp2-descriptor-builder"`)
   - **Conditional** — Platform-systems merge (`subagent_type: "atp2-env-merger"`) followed by a CORRECTIVE re-run of `atp2-descriptor-builder` — only if the Phase 3 return has an `unmappedHosts` row whose `mark` is `unmapped`

4. Verify each Phase Gate on disk, write `MigrationCheckpoint.json` after each pass, and present a short summary to the user after each phase.

## Generated Artifacts

Let `MIG = TestGeneration/tests/Raw/Debug/ATP2_Migration/<TC_NAME>/`.

| Phase | subagent_type | Output |
|---|---|---|
| 1 Environment | `atp2-env-exporter` | template.json + `env-<env>.yaml` + `{MIG}env-mapping.md` |
| 2 Collection | `atp2-collector` (fans out one `atp2-unit-collector` per unit, in batches of ≤5) | `{MIG}mcp-data-collection.md` (incl. unit inventory, nodes without a guide, system reconciliation, contract map, authorization, glossary, patterns) + contract partials in `{MIG}contracts/` + `{MIG}ui-steps.partial.*.md` + `{MIG}unit-steps.partial.*.md` + `{MIG}screenshots/` |
| 3 Descriptor | `atp2-descriptor-builder` (reconciles hosts) | `TestGeneration/tests/TestDesign/<tc_name>.md` — the self-contained descriptor: `### Step N` blocks + a `## Call Contracts` section with the HTTP inlined from the partials |
| Conditional merge | `atp2-env-merger` → corrective re-run of `atp2-descriptor-builder` | platform systems appended to env config + env-mapping.md; descriptor steps filled |

Everything under `{MIG}` — including the contract partials — is a gitignored working file. The descriptor is the **only** committed artifact of the migration and references nothing outside itself.

Input package produced:
- Descriptor: `TestGeneration/tests/TestDesign/<tc_name>.md`
- Env template: `{ENV_DIR}/environment-configuration-template-<env>.json`
- Env values (gitignored): `{ENV_LOCAL}/env-<env>.yaml`

`ENV_LOCAL` is the folder containing `{rootFolder}/{paths.envConfig}`, `ENV_DIR` is its parent — concretely `TestGeneration/environment-configuration/local-environment-configuration/` and `TestGeneration/environment-configuration/`.

## Completion

When the Phase 3 gate passes (after any conditional merge + corrective re-run), update `MigrationCheckpoint.json` and report the input-package paths above.

### Final report (mandatory, explicit — never silent)

The orchestrator MUST print these blocks, one line per row. A block whose source array is empty prints its "empty" line instead.

| Block | Source | Empty line |
|---|---|---|
| Merged into the env config | the merger return's `platformSystemsAdded` | "no host marked `unmapped` — the env config was not extended" |
| Left resolved, with their mark | the Phase 3 `unmappedHosts` rows marked `atp2-internal`, `external`, `no-slot` or `unknown-origin` | "every resolved host mapped onto the env config" |
| Failed the env-template gate | the Phase 3 `failedPlaceholders` | "every `{{X.y}}` resolved against the env template" |
| Steps with no observable result | the Phase 3 `stepsWithoutObservableResult` count, with the step numbers found by `Grep`ping the descriptor for an `Expected Result` of `UNKNOWN (` | "every step states an observable result" |
| Nodes without a guide | the Phase 2 `nodesWithoutGuide`, all six columns | none — an empty array needs no report |
| Callchain systems differing from their directive | the Phase 2 `systemMismatches` | "every callchain agreed with its directive" |

```
Merged into the env config from the run:
1) itf-executor → https://atp-itf-executor-prod.atpkub.managed.{bas_company}.cloud (step 30.3) — added

Left resolved in the descriptor, with their mark:
A) http://atp-tdm:8080 (mark: atp2-internal) — steps 1, 4 — ATP2 infrastructure, no env slot exists

Failed the env-template gate, written as the run value instead:
B) {{NDO.password}} — step 2 — no key NDO in the env template

Steps with no observable result (2) — a human must state one before generation:
steps 12, 19

Nodes collected without a per-kind guide:
| type | typeAction | template | unit | stepId | artifact |
|---|---|---|---|---|---|
| SQL | {bas_company}-atp-executor-actions-qdl | Execute query "query" on "dbName" | Custom validation node | 8f2... | unit-steps.partial.custom-validation-node.md |

Callchain systems differing from their directive (informational — the alias stays the directive's):
- [BS] Create City: directive public-gateway, callchain umbrella-ui
```

A merged row has its durable home in `env-mapping.md`, written by the merger; a marked value has its durable home inside its own descriptor step. The last two blocks are what earns a recurring node type its own guide in the `atp2-unit-collection` skill, and what surfaces a mis-set directive; neither blocks the migration.

Then explicitly tell the user: **the input package is ready.** Every step is executable, because a value with no proven placeholder carries the run's own value and a mark — name the marks a human still has to act on.

## Related Documentation

- Migration orchestration skill: `.cursor/skills/atp2-migration/SKILL.md`