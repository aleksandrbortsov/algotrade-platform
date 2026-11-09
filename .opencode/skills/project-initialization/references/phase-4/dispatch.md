# Phase 4 - Dispatch

> **Step file.** Component detection, the fan-out plan, and how the analysis wave is launched and validated. Read this before any `Task` call in Phase 4.
>
> **Parent:** [codebase-analysis.md](../codebase-analysis.md) - Phase 4 router
> **Contract:** [subagent-contract.md](../subagent-contract.md) - brief structure, budgets, output contract, retry rules
> **Next step file:** [prompts.md](prompts.md) - the research questions each brief carries

---

## Phase 4: Codebase Analysis (EXISTING_PROJECT only)

**Purpose:** Understand the existing codebase structure, architecture patterns, dependencies, and code quality to provide tailored recommendations and configuration.

---

## Mandatory Subagent Delegation

> **CRITICAL:** Codebase analysis during initialization MUST ALWAYS be delegated to one or more `codebase-analyzer` subagents dispatched as blocking `Task` calls (never `background: true`). It is never performed inline in the main initialization agent.
>
> **How every dispatch runs — brief structure, budgets, output contract, retry rules — is defined once in [`subagent-contract.md`](../subagent-contract.md).** This page supplies *what* to analyse; that page supplies *how*. Read both before dispatching.

### Why delegation is mandatory

| Benefit | Description |
|---|---|
| **Context isolation** | All intermediate scanning output (file listings, dependency trees, code patterns) stays in the subagent's context window and does NOT consume the main initialization agent's context |
| **Parallel search** | Several components are dispatched in one message and analysed simultaneously, completing faster than sequential main-agent searches |
| **Cost efficiency** | Isolating token-heavy exploration work in bounded subagents reduces overall initialization cost — provided the per-component budgets from the contract are enforced |
| **Better results** | A focused, single-component brief produces concrete names and counts where one whole-repo pass produces generic bullets |

---

### Artifact model (where the findings live)

Findings do **not** come back as prose in the orchestrator's context. Each subagent persists them:

```
.opencode/project/analysis/
├── index.json              # component registry: status, counts, coverage, gaps, delegationMode
├── <component>.json        # structured facts, validated against assets/analysis-report.schema.json
└── <component>.md          # full narrative report — never read back during initialization
```

The orchestrator receives only a ≤ 25-line summary per component and merges it into `index.json`. Phases 5 and 6 read the JSON artifacts (only the fields they need), never the markdown. Artifacts are project-owned: committed, absent from `coreFiles`, untouched by `/update-workplace`, and ignored by the `docs-sync-check.js` hook so a re-analysis never triggers a documentation sync.

The `coverage` map in `index.json` is what makes later phases cheap — Phase 6 skips its API sub-analysis when `coverage.api` is already `true` and the artifact is newer than the last source change.

---

### Component Detection (run BEFORE choosing single vs fan-out)

Before launching any subagent, the main agent MUST first decompose the repository into **components**. A component is a self-contained subproject with its own dependency manifest, runtime, or deployment surface.

**Detection rules (apply all, then deduplicate):**

| Signal | Component declaration |
|---|---|
| `package.json` `workspaces:` field (npm/yarn/pnpm) | One component per workspace path |
| `pnpm-workspace.yaml` packages list | One component per matched directory |
| `lerna.json` `packages:` | One component per matched directory |
| `apps/<name>/`, `packages/<name>/`, `services/<name>/`, `modules/<name>/` with own `package.json` / `pyproject.toml` / `go.mod` / `pom.xml` / `Cargo.toml` / `*.csproj` | One component per directory |
| `frontend/`, `backend/`, `client/`, `server/`, `api/`, `web/`, `mobile/` directories with own dependency manifest | One component each |
| Top-level language manifests at repo root (e.g. `package.json` AND `go.mod` AND `pom.xml` side-by-side) | One component per language ecosystem |
| Infrastructure-only directories with no app code (`infra/`, `deploy/`, `k8s/`, `helm/`, `charts/`, `terraform/`) | One **infra component** (analysed by a dedicated infra prompt — see below) |
| Standalone IaC files at repo root (`Dockerfile`, `docker-compose.*`, `Chart.yaml`) without an app component | Folded into the closest app component, OR registered as the infra component if no app exists |

**Decision (single vs fan-out):**

- **Component count == 1** → run the **single-subagent path** (the standard 11-section prompt). Skip to [prompts.md → Analyzer Subagent Invocation](prompts.md#analyzer-subagent-invocation).
- **Component count >= 2** → run the **Per-Component Parallel Fan-Out** described next.

Record the detected component list as the first Q-block of `### Phase 4 — Codebase Analysis` in the Decision Log (before launching any subagent). Each component gets a name, path, kind (`frontend` / `backend` / `mobile` / `infra` / `library` / `mixed`), and detected dominant language(s) / framework(s).

---

### Per-Component Parallel Fan-Out (mandatory for component count >= 2)

> **Why fan-out.** A single subagent forced to cover Angular + Go + Node + Java + K8s in one pass produces shallow results: each section gets one or two bullets, and per-domain context skills (`frontend-context`, `api-context`, `backend-context`, `infrastructure-context`) end up with thin generic findings. Per-component fan-out gives every domain its own focused, deep analysis with the same total wall-clock time (parallel execution).

#### Step 0 — Seed the analysis index

Before the first dispatch, write `.opencode/project/analysis/index.json` with one `components[]` entry per detected component (`name`, `path`, `kind`, `languages`, `status: "pending"`, `artifacts`), `delegationMode` for the wave, and an empty `coverage` map. This is what makes the phase resumable: a session that dies mid-wave leaves a registry saying which components were already done. Create the directory if Phase 0.5 did not.

The component `name` is the artifact basename, so it must be filesystem-safe and unique (`services/billing` → `billing`; on a collision, prefix with the parent segment).

#### Step 1 — Build the dispatch plan

For each detected component, construct **one analysis task** with:

- `subagent_type: "codebase-analyzer"`
- `description`: short, e.g. `"Analyze frontend/ (Angular UI)"`
- `prompt`: the **scoped prompt template** matching the component kind (see "Scoped Prompt Templates" below), wrapped in the seven mandatory brief blocks from [`subagent-contract.md`](../subagent-contract.md)

If a component is `mixed` (e.g. a fullstack Next.js app inside one workspace), still emit a single task using the standard 11-section prompt restricted to that workspace's path.

#### Step 2 — Launch ALL component tasks in parallel

The main agent MUST batch every component's `Task` call **into a single tool-call message** so they execute in parallel. Sequential one-at-a-time invocations defeat the entire point of the fan-out and are forbidden.

Concretely (pseudocode):

```
# WRONG — sequential, slow:
Task(component_1)            # wait
Task(component_2)            # wait
Task(component_3)            # wait

# CORRECT — single message with N parallel Task calls:
[Task(component_1), Task(component_2), Task(component_3), ...]
```

All tasks are blocking calls — never pass `background: true` — so the main agent waits until the slowest one returns, then collects results in any order.

#### Step 3 — Merge summaries, then validate the artifacts

First fold every returned ≤ 25-line summary into `index.json`: per-component `status`, `coverage`, `counts`, `gaps`, timestamps, and the repository-level `coverage` map.

Then run the mechanical gate:

```bash
node .opencode/skills/project-initialization/scripts/validate-analysis.js
```

It checks three things the eye misses: structural conformance to `assets/analysis-report.schema.json` (the fields Phases 5 and 6 will read), budget compliance (JSON ≤ 30 KB, markdown ≤ 400 lines), and shallowness — a `backend` component reporting zero entities and zero endpoint groups, a module named `service` with no path, a `partial` coverage with an empty `gaps[]`. Structure and shallowness are blocking: exit code 1 lists exactly which components need a follow-up. A budget overrun prints a `warn` line and does **not** fail the run — the report is still usable and re-dispatching to shrink it costs more than it saves; treat it as the signal to split that component next time.

Dispatch **one narrowed follow-up per flagged component**, naming the specific missing facts ("list the exported types under `internal/domain/`"), never a repeat of the original broad question and never the whole fan-out. One automatic retry per component; if the second attempt is still flagged, keep the result, record the residue under `## Open Gaps`, and tell the user at the phase boundary.

Full failure matrix — no artifact written, subagent died, all components failed: [`subagent-contract.md`](../subagent-contract.md) §9.

#### Step 4 — Merge into a single repository view

The main agent merges the per-component **JSON artifacts** (never the `.md` reports) into the same 11-section structure used by the single-subagent path:

| Source section in component reports | Merged into |
|---|---|
| Frontend report §entities, §components | Repo §6 (code patterns), §9 (entities for UI-side stores), `frontend-context` |
| Frontend report §routes / page tree | `frontend-context.businessModules` |
| Backend report §endpoints, §domain entities, §integrations | Repo §10 endpoint groups, §9 entities, §11 integrations, `api-context` + `database-context` + `backend-context` |
| Backend report §framework / build / tests | Repo §4 dependencies, §5 code quality, `coding-standards-context` |
| Mobile report §entities, §screens, §native modules | Repo §6 patterns, `frontend-context` (or `mobile-context` if present) |
| Infra report §Dockerfiles, §helm charts, §CI pipelines, §deploy targets | `infrastructure-context` (entire) — does NOT pollute §10 endpoint groups |
| Library report §public exports, §consumers | Repo §6, `coding-standards-context.constraints` |

When two component reports disagree (e.g. backend reports `Tenant` entity in Postgres, frontend reports a different `Tenant` type), record both findings in the Decision Log, mark conflict as `## Open Gaps → tenant-model-divergence`, and surface a Smart Reflection Question.

#### Step 5 — Per-component persistence map

Each per-component report writes facts directly to its target context skill — this is the bridge to Phase 6:

| Component kind | Primary `project-config.json` target | Primary `references/guidelines.md` enrichment |
|---|---|---|
| `frontend` | `frontend-context/project-config.json` (entities, routes, design system, state mgmt) | `frontend-context/references/guidelines.md` is rendered in Phase 6 Part 3 from this config |
| `backend` (single language) | `backend-context/project-config.json` (services, business modules) + `api-context/project-config.json` (endpoints, externalIntegrations) + `database-context/project-config.json` (entities, relations, dataStores) | All three corresponding `guidelines.md` files |
| `mobile` | `frontend-context/project-config.json` (or dedicated `mobile-context` if installed) | matching `guidelines.md` |
| `infra` | `infrastructure-context/project-config.json` (deploy targets, container runtimes, CI pipelines, ingress strategy) | `infrastructure-context/references/guidelines.md` |
| `library` (shared) | `coding-standards-context/project-config.json.constraints` | `coding-standards-context/references/guidelines.md` |
| `mixed` | All four core context skills, like a single-component repo | All four `guidelines.md` files |

This split is what guarantees the per-domain skills receive **deep, component-specific** context instead of one generic blob. Phase 6 Part 3 then renders each `guidelines.md` from its now-rich `project-config.json` and the references it accumulated.

#### Step 6 — Single repository-level Reflection

After merge, run **one Phase 4 Reflection Checkpoint** (see below) over the merged view, not one per component. Smart Reflection Questions may still cite a specific component (e.g. `"In services/billing/ I found Stripe SDK ..."`).

---

## Special Cases

### Case 1: Monorepo

No question. The component detection above decomposes the repository and the fan-out analyses every component in parallel; the scope question (root vs a specific workspace) belongs to `mode-detection.md` Case 1 and was answered in Phase 1. Record the detected workspace list in the Phase 4 Q1 decomposition Q-block and dispatch.

### Case 2: Very Large Codebase

If codebase exceeds thresholds (e.g., >10,000 files):

```
📊 Large Codebase Detected

This codebase has [N] files, which may take time to analyze.

Analysis options:
1. Full analysis (comprehensive, may take 2-3 minutes)
2. Quick analysis (essential files only, ~30 seconds)
3. Skip analysis (proceed with user input)

Your choice:
```

### Case 3: Multiple Frameworks

If multiple frameworks detected (e.g., React + Vue in same project):

```
⚠️  Multiple Frameworks Detected

Found:
- React ([version]) in [path]
- Vue ([version]) in [path]

Is this:
1. Micro-frontend architecture
2. Migration in progress (React → Vue)
3. Migration in progress (Vue → React)
4. Hybrid approach (intentional)

Your choice:
```

### Case 4: No Clear Pattern

If architecture pattern is unclear:

```
❓ Architecture Pattern Unclear

I couldn't identify a clear architectural pattern.

The structure appears to be:
- Mixed organization
- Components scattered across directories
- No consistent naming convention

Would you like to:
1. Document current state as-is
2. Suggest reorganization plan
3. Skip architecture documentation

Your choice:
```

---

## Error Handling

### Error: Cannot Access Source Directory

```
❌ Error: Cannot Access Source Directory

Unable to read [directory]:
[Error message]

Options:
1. Specify different source directory
2. Check permissions and retry
3. Skip codebase analysis

Your choice:
```

### Error: Parsing Configuration Files

```
⚠️  Configuration Parse Error

Error parsing [config file]:
[Error message]

I'll continue analysis with remaining files.
Press Enter to continue...
```
