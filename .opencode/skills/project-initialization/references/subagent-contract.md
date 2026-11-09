# Subagent Contract (canonical)

> **Single source of truth for every subagent dispatched during initialization.** Phase 4 (codebase analysis), Phase 5 Part 1.5 (API analysis of user-specified locations), Phase 6 (API sub-analysis for domain skills) and `/quick-init` Step 10 all delegate through this contract. Where a phase reference doc describes *what* to analyse, this file describes *how* the delegation runs.

**Parent Workflow:** [Project Initialization Skill](../SKILL.md)

---

## Table of Contents

- [1. Why delegation is mandatory](#1-why-delegation-is-mandatory)
- [2. How OpenCode dispatches subagents](#2-how-opencode-dispatches-subagents)
- [3. Which subagent to use](#3-which-subagent-to-use)
- [4. The brief — seven mandatory blocks](#4-the-brief--seven-mandatory-blocks)
- [5. Budgets (hard caps)](#5-budgets-hard-caps)
- [6. Output contract — write to disk, return a summary](#6-output-contract--write-to-disk-return-a-summary)
- [7. Artifact layout](#7-artifact-layout)
- [8. Orchestrator duties after each wave](#8-orchestrator-duties-after-each-wave)
- [9. Failure, partial coverage and retry](#9-failure-partial-coverage-and-retry)
- [10. Forbidden patterns](#10-forbidden-patterns)

---

## 1. Why delegation is mandatory

Scanning a repository inline burns the orchestrator's context on intermediate output — file listings, dependency trees, grep hits — that has no downstream value. A subagent carries its own context window, so the scan happens somewhere the orchestrator never pays for.

But delegation alone is **not** enough. An OpenCode subagent returns *only the last text block of its final message* to the parent when it finishes, so an unbounded brief merely moves the cost one step later, into the orchestrator's context, at the moment the report comes back. That is why sections [5](#5-budgets-hard-caps) and [6](#6-output-contract--write-to-disk-return-a-summary) are as binding as the dispatch rule itself: **the report goes to a file; only a short summary crosses back into the orchestrator.**

---

## 2. How OpenCode dispatches subagents

OpenCode exposes subagents through the **`Task` tool**. Every dispatch names a `subagent_type`, a short `description` (3–5 words), and the `prompt` (the brief). Two optional parameters exist: `task_id` continues a previous subagent session (used for the single follow-up dispatch of §9), and `background` runs the dispatch asynchronously — never used in initialization (see below).

| Rule | Detail |
|---|---|
| **Parallel dispatch** | When several independent units of work exist (one per component), emit **all `Task` calls in a single tool-call message**. OpenCode then runs them in parallel. Sequential one-at-a-time dispatch wastes the entire benefit. |
| **Never background** | A `Task` call blocks the orchestrator until the subagent returns unless `background: true` is passed. Never pass it for an initialization dispatch: every wave's summaries must be in hand before the phase transition validation runs, and a gate cannot judge a result that has not arrived. |
| **No conversation access** | A subagent starts with a clean context and cannot see the orchestrator's conversation. Every fact it needs — workspace path, component path, prior findings, output paths — must be inside the brief. |
| **One research question per subagent** | A subagent is a focused researcher, not a second orchestrator. It must never be asked to run initialization phases, ask the user questions, or dispatch further subagents. |
| **Model** | Leave `model` unset so the subagent inherits the orchestrator's model, unless the user explicitly asked for a different one. |

> **Read-only is a permission, not a parameter.** The `Task` tool has no read-only parameter and needs none: `codebase-analyzer.md` carries a `permission` block that allows `edit` only under `.opencode/project/analysis/`, denies every other write, restricts `bash` to read-only commands and denies `webfetch` and nested `task` — OpenCode enforces it in the child session. The brief's CONSTRAINT block (block 7) restates the scope so the model never attempts a refused write. The built-in `explore` subagent is read-only by construction.

---

## 3. Which subagent to use

| Task | `subagent_type` | Why |
|---|---|---|
| Phase 4 component analysis, Phase 5 Part 1.5, Phase 6 API sub-analysis | `codebase-analyzer` | Project-owned writing subagent defined in [`.opencode/agents/codebase-analyzer.md`](../../../agents/codebase-analyzer.md). It writes the two report artifacts itself, so the findings never transit the orchestrator's context. |
| `/quick-init` Step 10 | `explore` | Quick Init consumes the findings immediately, in the same turn, to generate `AGENTS.md` — there is no later phase that would read an artifact, so writing one buys nothing. Blocks 1–4, 6 and 7 of the brief still apply; block 5 is replaced by "return the report in your reply, at most 150 lines". |
| Ordinary code search outside initialization ("where is X defined", "which files import Y") | `explore` | Built-in, tuned for fast parallel search. Returns findings in its reply — fine when the answer is a handful of paths. |

The built-in `explore` subagent is a read-only researcher, so **it must not be relied on to create the analysis artifacts**. The full-initialization phases dispatch `codebase-analyzer` precisely because its write permission is explicit.

### Fallback when artifact writing does not happen

If a `codebase-analyzer` dispatch returns without its two files on disk (write declined by the user's permission settings, or the subagent ignored the OUTPUT block), do **not** retry the same brief:

1. Re-dispatch that component once with the OUTPUT block changed to *"return the structured JSON inline inside your summary, prefixed by `---JSON---`"*, and raise the summary cap for that one dispatch to 120 lines.
2. The **orchestrator** writes `<component>.json` and `<component>.md` from that reply.
3. Record `"delegationMode": "inline-json"` for that component in `index.json` and tell the user once that the context saving is reduced for it.

This is an emergency path: it puts the full findings through the orchestrator's context, which is what the contract exists to avoid. Never make it the default.

### Sequential fallback (delegation unavailable entirely)

If subagent dispatch is unavailable in the session, the orchestrator analyses components **one at a time** and, after each component, **immediately writes the report artifacts and drops the raw findings from working memory** before starting the next. Same artifacts, same budgets, same validation — only the parallelism is lost. Never accumulate several components' raw findings before writing. Record `"delegationMode": "sequential-inline"` in `index.json`.

---

## 4. The brief — seven mandatory blocks

Every `prompt` passed to the `Task` tool MUST contain these blocks, in this order. Phase reference docs supply the *content* of blocks 3–5; this contract fixes the *frame*.

```
1. ROLE
   You are a codebase research agent working for project initialization. You write exactly
   two report files and change nothing else in the repository.

2. SCOPE
   Workspace root: <absolute path>
   Analyse: <component.path> and its subdirectories.
   Treat sibling directories as opaque — do not walk into them. Imports or API calls that
   cross out of your scope are recorded as "cross-component dependency" with the target path only.

3. RESEARCH QUESTIONS
   <the REQUIRED sections for this component kind — see the scoped prompt templates in
    codebase-analysis.md>

4. CONCRETENESS REQUIREMENT
   Return concrete names, paths and counts (module folders, entity names, endpoint patterns,
   dependency names). Generic phrasing ("uses a database", "standard error handling") is a
   failed result, not an acceptable one. If you cannot find a concrete name, say
   "not found" — never substitute a plausible-sounding generality.

5. OUTPUT
   Write TWO files, and nothing else:
     .opencode/project/analysis/<component>.json   — conforming to
        .opencode/skills/project-initialization/assets/analysis-report.schema.json
     .opencode/project/analysis/<component>.md     — the full human-readable report
   Then return a summary of at most 25 lines: artifact paths, coverage status, the counts
   (modules / entities / endpoint groups / integrations), and what you could not determine.
   Do NOT paste the report body into your reply. Write both files BEFORE the summary and make
   the summary the LAST text of your final message — only that last text block reaches the
   orchestrator.

6. BUDGET
   Read at most <N> files. Your .md report is at most 400 lines; your .json at most 30 KB.
   On reaching any limit: stop, write what you have with "coverage": "partial", list the
   unexplored areas in "gaps", and return. Do not continue past the budget.

7. CONSTRAINT
   Do not modify, create or delete any file except the two report files named above.
   Do not ask the user anything. Do not dispatch further subagents.
```

Block 7's last sentence is our own constraint, not a platform limit: a nested fan-out multiplies token spend with no orchestrator visibility into what the grandchildren did.

---

## 5. Budgets (hard caps)

Budgets exist to bound wall-clock time (a long-running subagent risks hitting an external limit mid-run) and to bound the report the orchestrator will later read.

| Dimension | Cap | Rationale |
|---|---|---|
| Files read per component | 60 (default); 100 for a `mixed` component that covers the whole repo | Beyond this, marginal findings drop sharply while time keeps growing |
| `<component>.md` | 400 lines | Human-readable; never enters the orchestrator's context wholesale |
| `<component>.json` | 30 KB | Read selectively by Phases 5 and 6 |
| Summary returned to the orchestrator | 25 lines | This is the only text that costs orchestrator context |
| Retries per component | 1 automatic, then surface to the user | Prevents silent retry loops |

Hitting a cap is a **normal outcome**, not an error: the artifact is written with `"coverage": "partial"` and a populated `gaps[]`. Section [9](#9-failure-partial-coverage-and-retry) covers what the orchestrator does next.

> **Parallel dispatch costs tokens linearly.** Five subagents in one message consume roughly five independent context windows. The budgets above are what keep a wide fan-out affordable — a fan-out of eight components with no per-component cap is more expensive than the inline scan it replaced.

---

## 6. Output contract — write to disk, return a summary

This is the rule that keeps the orchestrator's context flat across the whole phase run. OpenCode makes it mechanical: the parent receives only the last text block of the subagent's final message — tool outputs, file contents and intermediate text never cross back.

| | Goes to disk | Crosses back into the orchestrator |
|---|---|---|
| Full narrative report | `<component>.md` | never |
| Structured facts | `<component>.json` | only the slices a phase actually needs |
| Status, counts, coverage, gaps | `index.json` (merged by the orchestrator) | yes — this is the ≤ 25-line summary |

The orchestrator **must not** read `<component>.md` during initialization. It exists for the user, for `/docs-sync`, and for a later `/update-workplace` run. Phases 5 and 6 read the JSON, and only the fields they need.

---

## 7. Artifact layout

```
.opencode/project/analysis/
├── index.json              # component registry + status + coverage flags (orchestrator reads this)
├── <component>.json        # structured facts, schema-validated
└── <component>.md          # full report (never read back by the orchestrator)
```

`index.json` shape:

```json
{
  "schemaVersion": 1,
  "generatedAt": "<ISO-8601>",
  "delegationMode": "parallel-subagents",
  "components": [
    {
      "name": "frontend",
      "path": "ui-metrics-tool-frontend",
      "kind": "frontend",
      "languages": ["typescript"],
      "status": "completed",
      "coverage": "full",
      "startedAt": "<ISO-8601>",
      "finishedAt": "<ISO-8601>",
      "artifacts": { "json": "frontend.json", "md": "frontend.md" },
      "counts": { "modules": 7, "entities": 12, "endpointGroups": 0, "integrations": 3 },
      "gaps": []
    }
  ],
  "coverage": { "api": true, "database": true, "frontend": true, "infrastructure": false }
}
```

`delegationMode` is one of `parallel-subagents` (normal), `inline-json` (write fallback, §3) or `sequential-inline` (no delegation, §3).

The `coverage` map at the bottom is what makes later phases cheap: **Phase 6 does not re-dispatch API analysis when `coverage.api` is already `true` and the artifact is newer than the last source change.** That single flag removes the duplicated `backend-context` / `api-context` scan.

These artifacts are project-owned: they are committed, they are **not** listed in `coreFiles`, and `/update-workplace` never touches them.

---

## 8. Orchestrator duties after each wave

1. **Merge** every returned summary into `index.json` (status, counts, coverage, gaps, timestamps).
2. **Validate** the structured artifacts:

```bash
node .opencode/skills/project-initialization/scripts/validate-analysis.js
```

   This checks schema conformance, budget compliance, and shallowness heuristics (e.g. a `backend` component reporting zero entities and zero endpoint groups).
3. **Re-dispatch selectively** — only the components the validator flagged, only for the missing areas. Never re-run the whole fan-out.
4. **Record** the component list and the per-component outcome as Q-blocks in `.opencode/project_init.md → ## User Answers & Decision Log`, and point the `## Supplemental Source Manifest` rows at the artifact paths.

---

## 9. Failure, partial coverage and retry

| Situation | Orchestrator action |
|---|---|
| Subagent returned, `coverage: "partial"`, gaps listed | Dispatch **one** follow-up scoped to the gaps only. If it also returns partial, keep the result and record the residue under `## Open Gaps`. |
| Subagent returned but wrote no artifact | Take the write fallback in [§3](#fallback-when-artifact-writing-does-not-happen) — one re-dispatch with inline JSON, orchestrator writes the files. |
| Subagent produced nothing at all (died, timed out, external limit) | Re-dispatch that component alone, once. Still nothing → mark `status: "failed"` in `index.json`, continue with the remaining components, and surface the failure to the user at the phase boundary. |
| Validator flagged the report as shallow | Re-dispatch with a narrowed brief naming the specific missing facts ("list the exported types under `internal/domain/`"), not a repeat of the original broad question. |
| All components failed | Fall back to the sequential path in [§3](#sequential-fallback-delegation-unavailable-entirely) before escalating to the user. |

Because every component is an independent artifact, a failure never invalidates the work already on disk — which is what makes the phase resumable in a fresh session (see [`SKILL.md`](../SKILL.md) → Safe Stop Points).

---

## 10. Forbidden patterns

- Performing codebase analysis inline in the orchestrator when delegation is available.
- Dispatching components sequentially when they could go in one message.
- Inventing a `Task` parameter to make the analysis subagent read-only, or describing it as read-only *by parameter* — see [§2](#2-how-opencode-dispatches-subagents).
- Passing `background: true` on an initialization dispatch, or inventing any other `Task` parameter.
- Asking a subagent to return the full report in its reply instead of writing it to disk (outside the [§3](#fallback-when-artifact-writing-does-not-happen) fallback).
- Briefs without a scope restriction, a budget, or the no-modification constraint.
- Letting a subagent dispatch further subagents.
- Re-scanning in Phase 5 or Phase 6 what Phase 4 already recorded in `index.json` / `<component>.json`.

---

## Related Modules

- [codebase-analysis.md](codebase-analysis.md) - Phase 4: component detection, fan-out plan, research questions per component kind
- [requirements.md](requirements.md) - Phase 5: API analysis of user-specified locations (Part 1.5)
- [configuration-updates.md](configuration-updates.md) - Phase 6: API sub-analysis and the Part 3.5 gate
- [quick-init.md](quick-init.md) - `/quick-init` Step 10 delegation
- [SKILL.md](../SKILL.md) - Phase flow, safe stop points, validation gates
