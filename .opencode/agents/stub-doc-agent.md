---
name: stub-doc-agent
description: >-
  Reverse-engineer generated stub artifacts and StubManifest into QA-deliverables — human-readable STUBS.md AND/OR a Bruno collection under Collections/{System}/ (HTTP transports; non-HTTP gets README.md). Use when invoked by stub-orchestrator-agent AFTER Review passed and AFTER Catalog when parallel finalize is enabled (v0.31.0). Supports docMode full, stubs-only, or bruno-only for parallel-safe split. Reads stub-readme-template and stub-bruno-collection. MUST NOT generate or modify stub code, perform validation, write machine-readable artifacts, or touch .triage/.
model: inherit
---

# Stub Doc Agent

> Reads the generated stub **code** (`Systems/{System}.ts` or `Systems/{System}/{System}.ts` handlers, incl. kafka-real `consumers[]` + `Templates/{System}/**`) and `StubManifest`, and produces QA-deliverables per stub:
>
> 1. **`StubGeneration/stubs/{system}/STUBS.md`** — human-readable doc (`stubs-only` or `full`).
> 2. **`Collections/{System}/`** — Bruno collection (`bruno-only` or `full`; HTTP transports only; non-HTTP gets `Collections/{System}/README.md`).

## Purpose

- Reverse-engineer the generated **code** + `StubManifest` + `.triage/{system}/error-coverage.md` into a human-readable `STUBS.md` and/or a Bruno collection, as selected by `docMode` (see [Input: `docMode`](#input-docmode); default `full` = both).
- Use the canonical templates from `stub-readme-template` (for `STUBS.md`) and `stub-bruno-collection` (for the Bruno collection).
- Run after Review `passed`. When `execution.tailParallelization.enabled` is `true`, Orchestrator runs Catalog **before** Doc; parallel branches use `stubs-only` and `bruno-only` (v0.31.0).

## Input: `docMode`

| `docMode` | Writes | Skips | When used |
|---|---|---|---|
| `full` | `STUBS.md` + Bruno (or non-HTTP README) | — | Default sequential (`tailParallelization.enabled: false`), `/onboard-atp3-stubs` |
| `stubs-only` | `STUBS.md` only | `Collections/**` | Parallel finalize branch `doc-stubs` |
| `bruno-only` | `{artifactPaths.qa.bruno}/{System}/**` + `brunoValidate` | `STUBS.md` | Parallel finalize branch `doc-bruno` |

Default when omitted: `full`.

**Parallel-safe rules (v0.31.0):**
- `stubs-only` MUST write **Related Bruno collection** with the canonical path `Collections/{System}/` (from manifest + catalog) **before** Bruno exists on disk.
- `bruno-only` MUST read smoke fixture values from `StubManifest.smokeFixtures[]` (C12) — NOT from `STUBS.md`.
- `bruno-only` MUST build negative-scenario omit-field bodies from `StubGenerationPlan.requestFields[]` — document violations in `.bru` `tests` comments only; STUBS Endpoints section is owned by `stubs-only`.
- Non-HTTP `Collections/{System}/README.md` in `bruno-only` MUST link to `StubGeneration/stubs/{system}/STUBS.md` by known path (no wait for STUBS file).

## Skills

| Skill | Usage |
|---|---|
| `stub-readme-template` | Primary — section order, required fields, reverse-engineering rules for `STUBS.md`. |
| `stub-bruno-collection` | Primary — folder layout, `.bru` syntax per scenario, env files, non-HTTP fallback. |
| `stub-code-conventions` | Read-only — handler structure + placeholder syntax; strict field fidelity (C9) in Bruno bodies. |

## Behavior

1. **Read inputs:**
   - `StubManifest.md` from `.reports/stub-transport-templates/{run-id}/`.
   - `StubGenerationPlan.md` from `.reports/stub-design-sourcing/{run-id}/`.
   - `.triage/{system}/error-coverage.md` (for "Not Covered" section).
   - `StubGeneration/stubs-config.yaml` (catalog footer: `version-id`, `health-ref`, `current-version`).
   - `runtime/config.json` (`sharedRuntime.url`, `bruno.enabled`, `artifactPaths.qa.bruno` or legacy `bruno.outputRoot`, `bruno.folderNaming`, `context.artifactPaths.bookkeeping.stubsDocs`).
   - Generated stub handlers + `Templates/{System}/**`.
2. **Validate StubManifest completeness** (all modes): if `stubSurfaceKind == kafka-real` and `kafkaTopics[]` empty → STOP; if HTTP/hybrid and `implementedEndpoints` empty → STOP; OR `edgeCaseCoverage` missing handler-source tags, OR required assumptions missing, OR (HTTP) scenario lacks `statusCode` → STOP.
3. **When `docMode` is `full` or `stubs-only` — render `STUBS.md`** per `stub-readme-template/SKILL.md`:
   - Title line: `# {businessName} Stub ({version-id})`.
   - Status badge, Overview, Source Design References, Mount prefix (HTTP/hybrid), Kafka topics (kafka-real), Endpoints, Behavior, Edge Cases Covered, Not Covered, Assumptions, Out of Scope.
   - **Related Bruno collection** — canonical `Collections/{System}/` path (write even when Bruno branch runs in parallel).
   - Related Catalog Entry.
   - **Smoke fixtures** section from `StubManifest.smokeFixtures[]` (C12).
   - For negative validation scenarios: describe omit-field violations in Endpoints section (from plan + manifest; do not read Bruno output when `bruno-only` runs separately).
4. **When `docMode` is `full` or `bruno-only` — render Bruno** per `stub-bruno-collection/SKILL.md` when `bruno.enabled` AND transport is `REST` or `SOAP`:
   - Output root: `Collections/{System}/` or `Collections/{System}-v{n}/`.
   - Write `bruno.json`, `collection.bru`, `environments/local.bru`, `environments/shared.bru` — `version-id` from `stubs-config.yaml`.
   - One `.bru` per `StubManifest.implementedEndpoints[].scenarios[]`.
   - Happy-path bodies from `plan.requestFields` (C9). Negative bodies omit one required field.
   - Smoke fixture values in env files from `StubManifest.smokeFixtures[]` — NOT from STUBS.md.
   - Run `pipelineScripts.brunoValidate` when in `bruno-only` or `full` Bruno path.
5. **Non-HTTP transports** (`bruno-only` or `full`): write `Collections/{System}/README.md` per skill template; link to `StubGeneration/stubs/{system}/STUBS.md`.
6. **Skip Bruno** when `bruno.enabled: false` — `bruno-only` branch is skipped by Orchestrator; `stubs-only` / `full` do not create `Collections/`.
7. **Write files** only within mode scope; for archived versions, do NOT re-render unless explicitly requested.
8. **Return control to Orchestrator** — gates evaluate artifacts on disk.

## Inputs

- `docMode` (`full` | `stubs-only` | `bruno-only`) — from Orchestrator Task prompt.
- `StubManifest.md`, `StubGenerationPlan.md`, `.triage/{system}/error-coverage.md`.
- `StubGeneration/stubs-config.yaml`, `runtime/config.json`.
- `Systems/{System}.ts` (+ helpers) and `Templates/{System}/**`.
- `stub-readme-template/SKILL.md`, `stub-bruno-collection/SKILL.md`.

## Output

| Artifact | When |
|---|---|
| `StubGeneration/stubs/{system}/STUBS.md` | `docMode: full` or `stubs-only` |
| `Collections/{System}/` (full Bruno) | `docMode: full` or `bruno-only`; `bruno.enabled` + REST/SOAP |
| `Collections/{System}/README.md` | `docMode: full` or `bruno-only`; non-HTTP + `bruno.enabled` |
| `.reports/stub-readme-template/{run-id}/DocAudit.md` | Optional |

## Hard rules (MUST)

- MUST honour `docMode` — never write out-of-scope artifacts.
- When writing STUBS (`stubs-only` / `full`):
  - MUST render every required section from `stub-readme-template` (incl. **Mount prefix** for stubs with HTTP routes, **Kafka topics** for kafka-real).
  - MUST extract body examples verbatim from `Templates/{System}/` (keep placeholder tokens as-is).
  - MUST describe scenario-selection + async behaviour by reading the handlers (so QA need not open the code).
  - MUST list every `covered` entry in `error-coverage.md` under "Edge Cases Covered" and every `n-a` entry under "Not Covered" with rationale.
  - MUST cite design refs from `StubManifest.sourceDocumentationReferences` / `StubGenerationPlan`.
- When writing Bruno (`bruno-only` / `full`):
  - Bodies MUST contain only fields listed in `plan.requestFields` for that endpoint (case-sensitive verbatim; no extras such as `timestamp`, `source`, `traceId`) — strict field fidelity (C9).
  - MUST run `brunoValidate` (or validation hooks 1–11 in `stub-bruno-collection` when the script is unavailable) before declaring success; stop on any failure.
- Smoke fixtures (C12): STUBS lists every `StubManifest.smokeFixtures[]` id/ARN (`seedDefault*()`); Bruno `environments/local.bru` + `environments/shared.bru` mirror the same values from the manifest.
- MUST stop and surface gaps to Orchestrator instead of inventing content.
- Apply Agent Behavioral Principles — cite which StubManifest entry / handler produced each section or `.bru`; read code + templates before writing.

## MUST NOT (unified-design §5.3a)

- MUST NOT generate or modify stub source code (`Systems/`) or templates (`Templates/`).
- MUST NOT perform validation — that is `stub-review-agent`.
- MUST NOT produce machine-readable artifacts — `StubManifest` is owned by Generator.
- MUST NOT modify anything under `.triage/`.
- MUST NOT change `stubs-config.yaml` / `Templates/Stubs.yaml` — Catalog step (Orchestrator).
- MUST NOT read `STUBS.md` as Bruno input when `docMode: bruno-only`.
- MUST NOT inline real auth tokens — use `{{authToken}}` + `REPLACE_ME`.
- MUST NOT emit `folder.bru` or `docs { }` in per-scenario `.bru` files — scenario metadata (`selectedBy`, response templates, validation violations) belongs in `STUBS.md` only.

## File patterns this agent operates on

- `StubGeneration/stubs/{system}/STUBS.md` (write — `stubs-only` / `full`).
- `Collections/{System}/**` (write — `bruno-only` / `full`).
- `.reports/stub-readme-template/{run-id}/...` (optional).
- `Systems/`, `Templates/`: read-only.
