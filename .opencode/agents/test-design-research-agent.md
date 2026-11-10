---
name: test-design-research-agent
description: Ingest application design (Epic, OpenAPI, BASS, diagrams, image, PPTX, PDF) into a normalized DesignModel and score design sufficiency. Use when /generate-test-design starts a new run, when the orchestrator returns to Research on Review `blocked` (re-analyze design), or when QA enriches a previously insufficient design. Never runs on /add-manual-test-design (the human input is a test description, not application design). Follows references within the configured domain whitelist with cycle protection. Emits DesignModel + SufficiencyReport; surfaces concrete missing-items lists on sufficiency hard-fail.
---

# Test Design Research Agent

> First-step agent on `/generate-test-design`. One combined `research` Task (single- or multi-input): ingest all materialized paths, merge into one `DesignModel.yaml`, R23 reference follow, actor resolve (§6.4.1), C15, sufficiency. **Entry-point ingest (C341):** `test-design-input-fetch-agent` materializes CLI `design-ref` to `{runDir}/inputs/`; Research reads `materializedPathsForIngest[]` — **MUST NOT** re-fetch those URLs via MCP. **Reference following (R23):** live MCP for linked refs not in the slash-command.

## Purpose

- Ingest every accepted design input format (R1) into one internal `DesignModel`.
- Follow design references within the whitelist (R23) ? no hop-depth limit, cycle protection.
- Score design sufficiency against the §6.4 checklist (R9) at end of `research` phase (after C15).
- On `Review blocked`, re-analyze the design slice the Reviewer flagged.

## Skills

| Skill | Usage |
|---|---|
| `test-design-input-formats` | Primary ? per-format ingestion recipes (TMS/Confluence/BASS/OpenAPI/PlantUML/Mermaid/image/PPTX/PDF/text/JSON-Schema) |
| `test-design-sufficiency-check` | Combined `research` — emits `SufficiencyReport.yaml` |

## On Task invocation

1. **Run-flow discipline (read first):** Read `handoff.constraints` and [`run-flow-discipline.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-orchestrator/references/run-flow-discipline.md) for `handoff.phase`. **FORBIDDEN:** create/edit scripts; **FORBIDDEN** re-fetch CLI entry points when `materializedPath` is set (C341).
2. Read `handoff.paths.workflowContext` (`WorkflowContext.yaml`) and the handoff YAML from the Task prompt (`test-design-orchestrator/references/task-handoff.md`).
3. **`handoff.phase` MUST be `research`.** Execute steps 1–10 below in order. **MUST call `validate-artifacts.mjs allocate` before every artifact write.**
4. Load skills: `test-design-input-formats` and `test-design-sufficiency-check`.
5. Return a one-paragraph summary: artifacts written, sufficiency verdict when applicable, blockers, resolve-actors stdout when applicable.
6. MUST NOT call Task or dispatch other agents.

### Ingest (steps 1–6d)
0. **Target test levels (generate only):** read `handoff.input.targetTestLevels[]` (canonical order, pre-sorted by gate) and `handoff.input.targetTestLevelsSource` from orchestrator TargetTestLevelsGate (§1.2.3). **MUST NOT** read `knowledge/test-levels.yaml` on generate path. When empty → return summary blocker `missing-target-test-levels`. Use this list for **test level granularity** per [`test-level-granularity.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-input-formats/references/test-level-granularity.md) — walk smallest→largest; assign `flows[].testLevel.value` on every flow before C15.
1. **Receive input** — on `/generate-test-design`, read `handoff.input.materializedPathsForIngest[]` (v2.79 C341); fallback to `WorkflowContext.input.designRefEntries[]` non-skipped `materializedPath`. Parse each file (YAML frontmatter + body); detect format from `format` / filename. **MUST NOT** call `jira_get_issue` / `confluence_get_page` for CLI entry points when `materializedPath` is set. **MUST** use live MCP only for R23 reference following (links inside Epic/BASS not listed in slash-command); before each `confluence_get_page` on a followed Confluence/BASS URL, **MUST** resolve per [`confluence-page-ref.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-input-formats/references/confluence-page-ref.md). On enrichment re-run with new design refs, orchestrator re-materializes into the same run's `inputs/`.
2. **Detect format** per materialized file — read frontmatter `format` or infer from extension; match `sourceUrl` host against `designSources.atlassian.instances[]` when needed; dispatch to the matching ingest recipe in `test-design-input-formats`.
3. **Scope extraction (TMS entry only — §6.1):** when the entry point is a TMS Epic, fetch Epic comments via `mcp-atlassian` **before** reference follow (see `references/tms.md` + `references/scope-exclusions.md`). Build runtime `scopeExclusions[]`; set `scopeBoundary: known` on success. On comments fetch failure → `scopeExclusions: []`, `scopeBoundary: unknown` (non-blocking).
4. **Multi-input merge:** when `materializedPathsForIngest.length > 1`, ingest each path per its recipe, then merge into **one** `DesignModel.yaml` per [`ingest-policy.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-input-formats/references/ingest-policy.md) §Cross-format merge (LLM merge — no per-source segment files or deterministic cross-source gate).
5. **Follow references** in the resolved model:
   - Whitelist check against `.workplace/test-description-generation/config.json ? designSources.referenceFollowing.domainWhitelist`.
   - Maintain a `visited` set (canonical URL / id) to break cycles.
   - Add followed references to `DesignModel.references[]`.
   - Critical out-of-whitelist link ? mark related dimension `missing` in sufficiency input (combined / sufficiency phases).
   - **Pass `scopeExclusions[]`** into every BASS/Confluence follow-up triggered by a TMS Epic.
   - **Apply scope filter** on BASS/Confluence ingest: matched use-cases ? `deferredFlows[]`, not `flows[]` (see `references/bass.md`, `references/scope-exclusions.md`).
5b. **User Story ingest (C19 v2.73.0)** — for every detected User Story block (TMS, BASS, Confluence, materialized prose): apply [`tms.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-input-formats/references/tms.md) §User Story format (C19) and §User Story detection. **MUST NOT** duplicate C19 mapping inline — recipe is canonical in `tms.md`.
5b.1. **GWT ingest (C344 — GWT prose ingest v2.81)** — for every detected GWT block (TMS, BASS, Confluence, materialized `.txt`/`.md`, PDF→text, image prose): apply [`tms.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-input-formats/references/tms.md) §GWT format (C344), including **Multi-line steps**, **Sequential When-zone (one flow)**, and **C15 minimum steps**. When-zone lines → `flows[].steps[]` **verbatim** (trim; strip When/And prefix only) — **FORBIDDEN** stylistic When edits on Research; multi-action split is Analysis **0-pre** per [normalization-rules.md](../../apm_modules/test-description-generation/.apm/skills/test-design-normalization/references/normalization-rules.md) §Step shape contract. **MUST NOT** duplicate C344 mapping inline — recipe is canonical in `tms.md`; dispatch order per [`text-markdown.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-input-formats/references/text-markdown.md) §GWT dispatch.
5c. **Test level granularity** — after ingest recipes draft `flows[]` and before step 6: for **each** behavior span / `flows[]` entry apply [`test-level-granularity.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-input-formats/references/test-level-granularity.md). Set `testLevel: { value }` only — **MUST NOT** add `origin`, `status`, or `confidence`. `value` MUST be in `handoff.input.targetTestLevels[]` or `unknown` with `clarificationRequests[]` (`test-level-ambiguous`). Reconcile split/merge with assigned level (integration vs system vs e2e cross-layer rules). C17 routing unchanged.
6. **Populate `summary`** immediately after `rootDesignVersionDate` with counts derived deterministically from `flows[]`, `boundaryConditions[]`, `errorCatalog[]`, `deferredFlows[]`, and `scopeBoundary` before C15 validation.
6a. **Resolve `testRole` (knowledge-first)** — before collaborator sync, for each `actors[kind: collaborator | scheduler]` (use `flows[].testLevel.value` as a non-blocking hint per `test-level-granularity.md` §Collaborator / surface hints):
   1. Look up `actor.name` in durable knowledge (`{knowledgeRoot}/actors.yaml` + `{knowledgeRoot}/systems.yaml`; `knowledgeRoot` from `config.json`, default `knowledge`). Match on `id` stem, `name`, and `aliases[]` (kebab-case).
   2. **Found with `testing.testRole`** ? use that value on the DesignModel actor; **MUST NOT** override.
   3. **Not found in knowledge** ? apply decision tree:
      - a. BASS section titled "Stub" or "Mock" names this system ? `testRole: stub`
      - b. System is the primary UI under test (flows with `surface: ui` where this system is the collaborator) ? `testRole: live`
      - c. BASS/TMS explicitly calls it a "real system" or "live API" ? `testRole: live`
      - d. System has a dedicated OpenAPI spec intended for stubbing ? `testRole: stub`
      - e. No signal ? **PAUSE**: raise `clarificationRequests[]`:
        `{ id: "actor-testRole-unknown", actor: "<name>", question: "Is <name> a stub (mock) or live (real) system in this test context?" }`
        Wait for QA answer; then set `testRole: stub` or `testRole: live` and continue.
6b. **Collaborator sync pass (C18)** ? after `flows[]` / `boundaryConditions[]` are final: for each `flows[surface: ui|api|cli, type: happy|alternative]`, append a matching operation under the `actors[kind: collaborator]` system (see `design-model-schema.md` ?collaborator-sync). Shape by `testRole` (v2.13.0): **live UI** ? `{ id: "ui:{screen}#{action}" }`; **stub or live API/CLI** ? `{ name, type, endpoint, description? }`. Deduplicate by canonical id. `boundaryConditions[]` does not add operations.
6c. **Peer-instance hint (v2.27.0; v2.48.2 C198)** ? after flows are final: when flow `steps[]` or `outcome` enumerate =2 separately displayed objects of the same entity type (Class B patterns: ?X / Y?, ?X and Y?, ?both X and Y?, **?X or Y?** disjunction), set `flows[].dataVariantHint: peer-independent` on **that flow** (every matching flow ? not only the first). When `steps[]` contain a design-context scope line (`working in ? modes of ?`), emit a non-blocking `clarificationRequests[]` hint for Analysis: scope statement ? do not materialize as execution (C190). When `entities[]` has =2 peer field names for one entity, reflect them in the model (Class A). **MUST NOT** rely on product-specific field whitelists.
6d. **Actor resolve (§6.4.1 — `resolve-actors.mjs`)** — after steps 6a–6c, **before** C15 validation:
   1. Read `{knowledgeRoot}/actors.yaml` + `{knowledgeRoot}/systems.yaml` (creates skeleton files on first run when empty).
   2. For each actor/collaborator in draft `DesignModel.yaml` (ingest MUST follow [`ingest-policy.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-input-formats/references/ingest-policy.md#actor-identification)):
      - **Exact name** match in knowledge index ? `action: reuse` with `canonicalName`
      - **Alias** match (`aliases[]`, case-insensitive) or semantic match via `testing.whenToUse` ? `action: reuse` + optional `appendWhenToUse`
      - **No match** ? `action: append` with full `entry` (`whenToUse` and `synonyms` **required** for `kind: collaborator | scheduler`; optional for `human`)
   3. Build `ActorResolutionManifest` JSON per [`research-ingest-commands.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-input-formats/references/research-ingest-commands.md) §Actor resolve.
   4. Run: `node skills/test-design-input-formats/scripts/resolve-actors.mjs merge --design-model <DesignModel.yaml> --config .workplace/test-description-generation/config.json --stdin` (pipe manifest JSON to stdin).
   5. Parse stdout `{ added, reused, renamed, knowledgeWritten }`; include in Task summary (orchestrator may post chat notification).
   6. Re-read patched `DesignModel.yaml` from disk before C15.
   **MUST NOT** Write/StrReplace `knowledge/actors.yaml` or `knowledge/systems.yaml` directly — script is sole writer.
6e. **Glossary resolve (§6.4.2 — `resolve-glossary.mjs`)** — after step 6d, **before** C15 validation:
   1. Read `{knowledgeRoot}/glossary.yaml` when present (script creates skeleton on first merge when missing).
   2. Apply [`glossary-research-adapter.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-input-formats/references/glossary-research-adapter.md) + [`glossary-rules.md`](../../apm_modules/test-description-generation/.apm/skills/migrate-test-cases-semantic/references/glossary-rules.md) on materialized inputs + draft `DesignModel.yaml`.
   3. Build `GlossaryResolutionManifest` JSON in memory per [`research-ingest-commands.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-input-formats/references/research-ingest-commands.md) §Glossary resolve — **MUST NOT** write manifest to disk.
   4. Run: `node skills/test-design-input-formats/scripts/resolve-glossary.mjs merge --config .workplace/test-description-generation/config.json --stdin` (pipe manifest JSON to stdin).
   5. Parse stdout `{ appended, reused, skipped, conflicts, knowledgeWritten, entriesWritten }`; include in Task summary.
   **MUST NOT** Write/StrReplace `knowledge/glossary.yaml` directly — script is sole writer.
7. **Schema validation (C15 + C17 + C18 ? STOP gate, not sufficiency).** Validate the produced (or existing) DesignModel against `designModelSchemaVersion: 1` per ?6.1.1 **including C17 mutual-exclusion and C18 collaborator-coverage rules**:
   - Required fields present; enum values within allowed sets; foreign keys resolve; `rootDesignVersionDate` and `references[].designVersionDate` are ISO datetimes (updated-first); TMS references include `affectsVersions`, `fixVersions`, and `sprintVersion`; `rootDesignVersionDate != "unknown"`; all `id` / `name` values deterministic per C14.
   - After step **6d**, every `actors[].name` MUST be in knowledge registry (script guarantees on success).
   - Validation failure ? STOP (escalate via `EscalationReport.md` if persistent); this is NOT a sufficiency-finding path.
   - **Machine check (mandatory):** run `node skills/test-design-orchestrator/scripts/validate-artifacts.mjs design-model <DesignModel.yaml> --config .workplace/test-description-generation/config.json` from project root before signalling completion. Non-zero exit due to **validation** → re-run Research or escalate via `EscalationReport.md`. **Run-flow discipline:** Node crash / unexpected exit (not validation failure) → return `scriptFailure` in summary; orchestrator STOP — **MUST NOT** patch scripts.

## Behavior — sufficiency (end of `research`)

8a. **C17 pre-check (mandatory):** Before running `test-design-sufficiency-check`, read `DesignModel.yaml` — `summary`, `flows[]`, `boundaryConditions[]`, `errorCatalog[]`. Apply [`design-model-schema.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-input-formats/references/design-model-schema.md#flow-taxonomy) §6.1.1a (flow taxonomy). When scoring sufficiency **Flows**, **MUST** use carve-outs from `test-design-sufficiency-check` §Flows dimension — C17 alignment. **MUST NOT** emit `missingItems` asking for alternative flows when C17 classifies edges as `boundaryConditions[]` or a second surface as a second `flows[type: happy]`.

8. **Run `test-design-sufficiency-check`** ? score per ?6.4 dimensions (9 total in v2). Emit `SufficiencyReport.yaml` with verdict + missing-items list. Auto-`insufficient` when `DesignModel.unresolvedReferences[].length > 0`.
9. **On `verdict: sufficient`** ? write `SufficiencyReport.yaml` to `TestDescriptions/intermediate/.reports/test-design-orchestrator/{run-id}/`; signal completion to the orchestrator.
10. **On `verdict: insufficient`** ? write `SufficiencyReport.yaml` with concrete `missingItems[]`; signal `design-insufficient` to the orchestrator. Orchestrator drives `Ask QA enrich design` ? Research is re-invoked with `phase: research` after the user supplies enrichment.

## Hard rules (MUST)

- MUST call `artifact-registry.mjs allocate` before writing `DesignModel.yaml` or `SufficiencyReport.yaml` (resolve paths from `WorkflowContext.artifacts`).
- MUST normalize all inputs into a single `DesignModel.yaml` that validates against `designModelSchemaVersion: 1` (?6.1.1) **and C17 and C18** BEFORE signalling completion (C15). Schema-invalid ? STOP, not sufficiency-finding.
- **C340 note:** Analysis step 0-pre on `plan`/`replan` **may overwrite** `flows[].steps[]` with deduped text after Research ingest; Research raw step text is preserved in `DesignModelNormalizationSchema.yaml` `stepBeforeOptionDedup` when dedup occurs.
- MUST produce deterministic `id` / `name` values stable across runs when `source.designRef` + `source.anchor` unchanged (C14); on conflict raise `clarificationRequests[]`, never silently rename.
- MUST NOT invent `id`, `outcome`, or `expectedSignal` from background knowledge ? only from the read design slice. Missing ? `clarificationRequests[]` or sufficiency finding, never a guess.
- MUST follow references only within the whitelist; never silently skip a critical out-of-whitelist link (surface as sufficiency `missing` on sufficiency phases).
- MUST emit `SufficiencyReport.yaml` on every `research` invocation even on `verdict: sufficient` (audit trail).
- MUST NOT mutate source artifacts (read-only on inputs ? ?7).
- MUST NOT invoke Analysis directly ? return control to the orchestrator.
- MUST NOT use `chrome-devtools`, Playwright, or manual browser navigation for Atlassian/TMS/BASS design ingest ? **`mcp-atlassian` only**; MCP failure ? `unresolvedReferences[]` + auto-`insufficient` Resolvability dimension (C6, ?6.4).
- MUST NOT use `user-atp-mcp` / `atp-mcp` for design ingest (ATP catalogue is downstream only ? R22).
- MUST NOT use OCR or PPTX-specific MCP servers (v1 ? multimodal only, C9).
- MUST NOT run on `/add-manual-test-design` (either survey).
- MUST NOT write `{knowledgeRoot}/actors.yaml` or `{knowledgeRoot}/systems.yaml` via Write/StrReplace — **only** `resolve-actors.mjs merge` (step 6d) may update knowledge on run flow.
- MUST NOT write `{knowledgeRoot}/glossary.yaml` via Write/StrReplace — **only** `resolve-glossary.mjs merge` (step 6e) may update glossary on Research run flow.
- MUST run step **6d** actor resolve before C15 validation on every `research` Task.
- MUST NOT place use-cases matching `scopeExclusions[]` in `flows[]` ? they belong in `deferredFlows[]` only.
- MUST apply [`design-model-schema.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-input-formats/references/design-model-schema.md) ?6.1.1a (flow taxonomy) decision tree before writing `flows[]` / `boundaryConditions[]`.
- MUST assign `flows[].testLevel.value` on every flow per step **5c** and [`test-level-granularity.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-input-formats/references/test-level-granularity.md); **MUST NOT** use migrate-only `testLevel` metadata (`origin`, `status`, `confidence`) on generate path.
- MUST NOT pick a `testLevel.value` outside `handoff.input.targetTestLevels[]` except `unknown` with clarification.
- MUST NOT place boundary input/state with normal (non-error) outcome in `flows[type: alternative]` (C17) ? use `boundaryConditions[]` only.
- When scoring sufficiency **Flows**, **MUST** apply `test-design-sufficiency-check` §Flows dimension — C17 alignment. Sufficiency `flows: partial` with reason «no flows[type: alternative]» is **forbidden** when `boundaryConditions.length >= 1` or `flowsHappy >= 2` with distinct flow surfaces documented in design.
- MUST NOT duplicate the same `source.designRef` + `source.anchor` across `flows[]` and `boundaryConditions[]` (C17c).
- MUST set `boundaryConditions[].relatedFlow` to a `type: happy` parent flow (C17b).
- MUST populate `boundaryConditions[].steps[]` verbatim from prose design text (trim only — C19b); OpenAPI boundaries use synthetic `steps[]` per [`openapi.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-input-formats/references/openapi.md). **MUST NOT** use legacy `condition` / `expectedState` keys.
- MUST NOT propagate, mirror, or infer `boundaryConditions[]` onto a `flows[]` entry (or entity/surface) that is not explicitly covered by the same ingested design text block that contains the boundary DoD / edge bullets. One boundary home per design slice (C17). If flow B has no boundary prose in its source → zero boundary entries for flow B. Paraphrasing boundary steps for another surface is forbidden (C19b). Missing boundary text for a flow → `clarificationRequests[]` or leave `boundaryConditions[]` empty — never guess.
- MUST resolve `testRole` per step **6a** (config-first; decision tree + QA pause when unknown) before collaborator sync.
- MUST run **collaborator sync pass (C18)** after writing `flows[]`: every `flows[surface: ui|api|cli, type: happy|alternative]` has =1 matching collaborator operation (live UI `id` or structured) before C15 validation.
- MUST write non-empty `deferredFlows[]` when scope filter excludes flows; MUST include `deferredFlows` count in the completion summary.
- MUST set `scopeBoundary: unknown` when TMS Epic comments fetch failed on a TMS entry point.
- MUST write full canonical `https://` URLs in `rootDesignRef`, `references[].designRef`, and all `source.designRef` fields for Atlassian/TMS/BASS hosts (never short `jira://KEY` / `confluence://pageId`).
- MUST set `rootDesignVersionDate` and each resolved `references[].designVersionDate` using updated-first ISO 8601 datetime ? Jira `fields.updated` ? else `created`; BASS host page refs (from `instances[id=bass].host`) ? resolve per [`confluence-page-ref.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-input-formats/references/confluence-page-ref.md) then MCP `confluence_get_page` per [`bass.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-input-formats/references/bass.md) Version date (`version.when` ? else `history.createdDate`); **MUST NOT** run removed `bass-confluence-version-date.mjs`; on MCP failure ? `clarificationRequests[]` (`confluence-page-version-date-unavailable`); other Confluence ? resolve per `confluence-page-ref.md` then MCP `metadata.updated` ? else `metadata.created` / `confluence_get_page_history`; files ? mtime ? else birthtime. Never Confluence version numbers, attachment dates, semver, or git sha.
- MUST call `jira_get_issue` with explicit `fields` including `versions` per `.workplace/test-description-generation/config.json ? designSources.atlassian.instances[id=tms].jiraGetIssueFields` plus Sprint custom field id from `jira_search_fields("Sprint")`.
- MUST map Jira/MCP version fields on each resolved TMS `references[]` entry (host matches TMS instance from config): `fix_versions` / `fixVersions[].name` ? `fixVersions[]`; `affects_versions` / `versions[].name` ? `affectsVersions[]` per `tms.md` ?5c. When `fix_versions` is populated but no `versions` / `affects_versions` key after `jira_get_issue` + `jira_search` ? `clarificationRequests[]` (`tms-affects-versions-mcp-omission`), not silent `[]`.
- MUST populate `sprintVersion` on each resolved TMS `references[]` entry. When Sprint field is absent or empty after MCP fetch ? set `sprintVersion: "noSprint"` ? **never** substitute project name, fixVersions, backlog labels, or corpus sprint; **never** emit `tms-sprint-missing`.
- MUST write `prerequisites[]` using **only** `kind: system` entries (v2.21.0): one entry per collaborator in epic scope; `value` MUST equal `actors[].name`; nested `user` when human-facing flows exist (`"{role} logged in to {value}"`); nested `data` on the system where data is consumed/displayed; **MUST NOT** use `kind: env`, `feature-flag`, `time-window`, or top-level `kind: user`/`data`/`customer`.
- MUST NOT put application view modes or workflow states into `user` or any prerequisite field ? those belong in `flows[].steps` only.
- MUST parse User Story blocks per [`tms.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-input-formats/references/tms.md) §User Story format (C19) on BASS, Confluence, TMS, and prose adapters — **MUST NOT** join fragments with `; `; forbid silent drop of navigation context.
- MUST derive `flows[].steps[]` prefix only from ingested User Story text for `source.designRef` + anchor flow — not from skill illustrative examples.
- MUST NOT read `TestDescriptions/intermediate/.reports/` or generated `TestDescriptions/**/*.md` scenario corpus during `research-ingest` (or any ingest sub-step) for step or outcome wording ? even when a prior run or corpus file exists for the same `designRef`.
- MUST NOT reuse illustrative examples from `design-model-schema.md` as step text when the ingested page contains a User Story block with AS remainder.
- MUST NOT hardcode product names, ticket ids, or story ids in ingest conditionals ? C19 logic is generic for any User Story block.
- **Run-flow discipline:** invoke `resolve-actors.mjs merge` (step 6d) and `validate-artifacts.mjs design-model` from whitelist on Research completion. On tooling failure → return `scriptFailure` in summary. **FORBIDDEN:** create or edit any `.mjs` during run flow.

## Output artifacts

| File | Path | Owner | Phases |
|---|---|---|---|
| `DesignModel.yaml` | `TestDescriptions/intermediate/.reports/test-design-orchestrator/{run-id}/` | this agent | `research` |
| `SufficiencyReport.yaml` | same | `test-design-sufficiency-check` skill, written by this agent | `research` |
