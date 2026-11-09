
# User Role Selection, MCP & Role-Pack Activation Module

This module handles Phase 1.5 of project initialization:

- **Phase 1.5** — Determining user's developer role(s) and configuring appropriate MCP servers
- **Phase 1.6** — **Verifying** the `.opencode/commands/` directory exists and listing the Core commands that ship with the Workplace template. **No commands are generated, copied, or templated here** — the directory is only inspected.

> **Phase 1.7-APM has moved.** Since Workplace template v4.0.0 the canonical procedure lives in [`phase-1-7-apm.md`](phase-1-7-apm.md) and the conceptual APM reference in [`apm-workflow.md`](apm-workflow.md). The "Phase 1.7: Role-Pack & Module Activation" section in the lower half of this file is preserved for historical context only; treat the new docs as authoritative. The `module-activation` skill, `/moduleActivate` command, `.opencode/rules/role-packs-state.json` file, `Modules_Registry/role-packs/` registry, and `prepare-role-packs.ps1` script have all been removed.

### MCP merge contract (`opencode.json → mcp`) — APM compatibility note

Phase 1.5 writes the `mcp` block of the project-level `opencode.json` with the base + role MCP servers (Context7, Atlassian, TaskMaster, Chrome DevTools). Phase 1.7-APM's `apm install` step **also** writes to the same block for any package that declares `dependencies.mcp` in its manifest: APM merges into an existing `opencode.json` and preserves every other key (verified with APM 0.28.0 and the `opencode` target). The contract is therefore additive in both directions — never rewrite the whole file, never remove a server you did not add, never move the block to another file, and re-read the file before every write because APM may have changed it since Phase 1.5.

**Parent Workflow:** [Project Initialization Skill](../SKILL.md)  
**Role → APM Package Mapping & Policy:** [role-commands-template.md](role-commands-template.md)  
**APM Workflow Reference:** [`apm-workflow.md`](apm-workflow.md) (canonical) + [`phase-1-7-apm.md`](phase-1-7-apm.md) (phase-specific procedure)  
**APM Authoring Skill:** [`../../apm-packaging/SKILL.md`](../../apm-packaging/SKILL.md)

> **Hard rule:** the initializer NEVER synthesises commands or agents from templates — neither generic workflow commands (formerly `review`/`bugfix`/`onboard`/`feature`/`refactor`/`test`) nor role-specific ones. The only commands present in a fresh project are:
>
> 1. **Core commands** that ship with the Workplace template under `.opencode/commands/` (e.g. `initialize`, `quick-init`, `package-new`, `update-workplace`, `taskmaster-init`, `docs-sync`).
> 2. **APM-deployed commands** written by `apm install` (Phase 1.7-APM) from `<id>/.apm/commands/` in the Workplace-Agent-Packages repo into `.opencode/commands/`.
>
> If a role needs a new generic workflow command, package it as a file inside the appropriate APM package under `<id>/.apm/commands/` in the Workplace-Agent-Packages repo (or as a Core command in the Workplace template) — never generate it inline at init time. Stack variability lives **inside** the command file (which reads `project-config.json` of the relevant context skill at runtime).

---

## Project-Level vs User-Level MCP

MCP servers in OpenCode are configured at two levels, both as the `mcp` object of an `opencode.json`:

| Level | File | Scope |
|-------|------|-------|
| **User (global)** | `~/.config/opencode/opencode.json` (macOS/Linux) or `%USERPROFILE%\.config\opencode\opencode.json` (Windows) | All projects for this user |
| **Project** | `opencode.json` in the repository root | This project only, committed to git |

**What the initializer writes:** Only the project-level `opencode.json` (its `mcp` block; the `watcher`/`permission` keys written in Phase 0.5 stay untouched). The user-level file lives outside the workspace — do not read it, ask the user instead (see the deduplication check below). After the next OpenCode start, `opencode mcp list` shows every configured server with its connection status.

**Duplication risk:** If a user already has servers like Context7 or Atlassian configured globally, adding them again at the project level causes both instances to run simultaneously.

**Secrets:** never write a token into the committed file. OpenCode substitutes `{env:VAR_NAME}` when it loads the config, so the snippets below reference environment variables for every token or API key and the user exports the value in the shell (or sets it in the user-level config). An unset variable resolves to an empty string — the server then starts without credentials rather than failing at config load.

---

## Phase 1.5: User Role Selection

### Role Recommendation (Pre-selection Analysis)

> **Mandatory.** Before presenting the role selection prompt, the agent MUST analyse available project signals and produce a ranked recommendation. This step is silent (no intermediate output) and takes under 5 seconds. The recommendation is always shown — even for NEW_PROJECT (fewer signals available) or when no strong signals exist.

#### Step 1 — Collect context from previous phases

Gather the raw observations already produced by Phase 0 and Phase 1 — do **not** re-run scans. Read:

- The matched file-signal categories recorded in `project_init.md → ## Initialization State`
- Any concrete filenames, directory names, technology names, and dependency names that were mentioned during Phase 1 mode detection

This is your sole input for Step 2. The goal is a concise mental picture of what kind of product this is and who builds it.

#### Step 2 — Reason about roles (no lookup table)

Think like a senior engineer reviewing the project for the first time:

> *"Given what I observed — the technologies, the repo structure, the tooling — what type(s) of developer would actually work on this codebase day-to-day? What is the primary concern of the person sitting in front of this repo?"*

Use your general knowledge of the software industry to answer that question. Do **not** apply a fixed signal→role mapping. Instead:

1. Form a brief mental model of the project (e.g. "this is a microservices backend written in Go and Java, deployed on Kubernetes, with no UI code").
2. Ask: which of the nine available roles (`frontend`, `backend`, `fullstack`, `mobile`, `designer`, `performance`, `qa`, `ba`, `upgrade`) describes the primary day-to-day work on a project like this?
3. Ask: are there secondary roles that are clearly relevant given the tooling or structure? (e.g. dedicated test harness → `qa`, Lighthouse config → `performance`)
4. Assign a confidence level to each candidate role:
   - **HIGH** — the role is unambiguous given what was observed; hard to imagine otherwise
   - **MEDIUM** — the role fits well but alternatives are plausible
   - **LOW** — a reasonable guess but thin evidence; mention as a note, not a recommendation
5. If observations are sparse (e.g. a brand-new repo with almost no files), state that explicitly: "No strong signals yet — recommend based on your planned work."

**The output of this reasoning is a short ranked list (1–3 roles), not a table.** Trust your understanding of the domain — the same way a developer reading a repo for 30 seconds can tell whether it is a React SPA, a Go microservice, or a data-science notebook project.

#### Step 3 — Format and display the recommendation

Show the recommendation block **immediately before** the role selection question. The format must match this template:

```
🔍 Project Analysis — Role Recommendation

The initializer detected: <one-line summary of what was found, citing actual files/frameworks>.
It recommends: <role key(s)>.

  ✅ <Role Name> (<confidence>)  — <1-line reason citing actual signal>
  ✅ <Role Name> (<confidence>)  — <1-line reason citing actual signal>
  [ℹ️ <Role Name> (low confidence)  — <signal> — mentioned for awareness]
```

**Example output (matches the screenshot pattern):**

```
🔍 Project Analysis — Role Recommendation

The initializer detected a polyglot multi-module repo (Angular frontend + Go service +
Node service + Java/Maven + K8s/Helm deployments).
It recommends: fullstack, performance.

  ✅ Full-Stack Developer (high)  — Angular UI in /frontend + Go/Java/Node backends in separate modules
  ✅ Performance Engineer (medium) — K8s/Helm deployments suggest CWV/metric tracking is relevant
  [ℹ️ QA Engineer (low)  — no dedicated test config found yet; add if automation is planned]
```

**Rules for the summary line:**
- Cite **actual file names or directory names** found (never generic "a frontend framework was detected").
- Keep it to 1–2 lines max.
- Role names must come from your Step 2 reasoning — never copy-pasted from a template.

#### Step 4 — Append to the role selection prompt

After the recommendation block, immediately show the standard role selection prompt (unchanged). Pre-mark the recommended roles visually so the user can confirm or override:

```
🎯 What is your primary role in this project?

You can select multiple roles (comma-separated).
Recommended based on analysis: <role names in bold>

  A  Frontend Developer        - React, Vue, UI/UX, styling
  B  Backend Developer         - APIs, databases, server architecture
  C  Full-Stack Developer      - End-to-end application development  ← recommended
  D  Performance Engineer      - Performance optimization, metrics    ← recommended
  E  Mobile Developer          - React Native, Flutter, mobile-first
  F  UI/UX Designer            - Design systems, prototyping
  G  QA Engineer               - Testing, quality assurance
  H  Business Analyst          - Requirements, design docs, Jira workflows
  I  Product Upgrade Engineer  - Existing-project upgrades, migration pipelines

Confirm recommended (press Enter), or type your choice(s):
```

If the user presses Enter without typing anything, accept the recommended roles. If the user types roles, use those instead.

> **Decision Log:** record the recommendation + the user's final choice as a Q-block under `### Phase 1.5 — Roles & MCP` with fields: `What I found` (signals), `Question asked` (shown recommendation), `User answer` (accepted / overridden with: <typed roles>), `Decision stored in: .opencode/rules/project/metadata.json (project.roles)`.

---

### Role Selection Prompt

```
🎯 What is your primary role in this project?

You can select multiple roles (comma-separated):

🎨 Frontend Developer    - React, Vue, UI/UX, styling
⚙️ Backend Developer     - APIs, databases, server architecture
🔄 Full-Stack Developer  - End-to-end application development
📱 Mobile Developer      - React Native, Flutter, mobile-first
🎨 UI/UX Designer        - Design systems, prototyping
⚡ Performance Engineer  - Performance optimization, metrics
🧪 QA Engineer           - Testing, quality assurance
📋 Business Analyst       - Requirements, design docs, impact analysis, Jira workflows
⬆️ Product Upgrade Engineer - Existing-project upgrades, BE/FE/CIP migration pipelines

Examples: "Frontend Developer", "Backend Developer, Performance Engineer"

Your role(s):
```

### Role Normalization

| User Input | Normalized Key |
|------------|----------------|
| Frontend Developer, Frontend | `frontend` |
| Backend Developer, Backend | `backend` |
| Full-Stack Developer, Fullstack | `fullstack` |
| Mobile Developer, Mobile | `mobile` |
| UI/UX Designer, Designer | `designer` |
| Web-Performance Engineer, Performance | `performance` |
| QA/Test Automation Engineer, QA | `qa` |
| Business Analyst, BA | `ba` |
| Product Upgrade Engineer, Upgrade Engineer, Product Upgrade, Upgrade | `upgrade` |

### User-Level Deduplication Check

After role selection, **before generating the MCP config**, ask the user:

```
⚠️ MCP Servers — Project vs User Level

MCP servers will be configured at the project level in opencode.json.

If any of the following servers are already configured globally
in your `opencode mcp add` (or the `mcp` block of `opencode.json`), you don't need to add them again.

Base servers (planned for everyone):
- context7 (Context7 MCP)
- mcp-atlassian (Atlassian Jira/Confluence)
- task-master-ai (TaskMaster)
- chrome-devtools (Chrome DevTools MCP)

Role-specific servers (based on your selected role):
[list servers for the selected role(s)]

Which of these servers do you already have in your global OpenCode config (`~/.config/opencode/opencode.json`)?
(Enter names separated by commas, or "none" if none)

You can check this in: `opencode mcp add` (or the `mcp` block of `opencode.json`)
```

**After the user responds:**
- Servers mentioned by the user → **skip** (do not add to `opencode.json`)
- All others → add to `opencode.json` as normal
- In the summary display: `⏭️ Skipped (already in user-level MCP): [list]`

This step is **optional** — if the user answers "none" or skips the question, all servers are added to the project-level `opencode.json`.

### BA Role: Custom MCP Prompt

If normalized roles include `ba`, after the standard deduplication check, ask:

```
🔌 Additional MCP Servers for BA Workflow

Do you want to add any additional MCP servers for your BA workflow?
You can provide git repository links to MCP server packages.

Examples:
- https://github.com/user/custom-mcp-server
- none (skip)

Additional MCP server(s):
```

For each git link provided:
1. Inspect the repository to determine the MCP server configuration (`command`, `args`, `env`)
2. Add the server entry to `opencode.json`
3. Ask for any required environment variables (API keys, URLs)

### BA Role: Adaptive Initialization Questions

If normalized roles include `ba`, the agent applies the project-wide [Adaptive Question Principle](../SKILL.md#adaptive-question-principle-project-wide-rule) to four BA-specific fields and surfaces **only the ones that cannot be inferred** from existing signals:

| Field | Auto-detection signals (HIGH confidence skip) | Default if no signal | Persistence target |
|---|---|---|---|
| **Document types** | `docs/`, `confluence/`, `requirements/` filenames matching `DDS|FDS|BRD|SRS|UseCase|UserStory` (any 2+ → set those); README mentions of standard doc types | `DDS, FDS, BRD, SRS, Use Cases, User Stories` | `ba-task-generation/project-config.json.documentTypes` |
| **Project glossary / abbreviations** | `GLOSSARY.md`, `glossary.md`, `docs/terminology*`, README "Terms" / "Glossary" sections | empty (no glossary) | `ba-task-generation/project-config.json.glossary` |
| **Jira task structure (components, labels, tech-stack rule)** | Existing Jira data via `mcp-atlassian` if accessible; `.github/ISSUE_TEMPLATE/` files; `CONTRIBUTING.md` references to component naming | `[TBD — configure later]` | `ba-task-generation/project-config.json.jiraConventions` |
| **UML diagram preferences (types, format, auto-publish)** | `*.puml` files, `*.drawio` files, Confluence pages with `gliffy` / `drawio` macros found via MCP | empty (no UML) | `ba-uml-modeling/project-config.json.{diagramTypes, confluenceDiagramMacro, publishToConfluence}` |

**Rules:**
- For each field, if the auto-detection signal is HIGH → fill silently, no question.
- If MEDIUM → present the candidate inline ("I see `docs/dds-*.md` files; document types = `DDS, FDS, BRD`. Press Enter to accept or list overrides:").
- If LOW → ask one batched question covering only the LOW fields, with `[Skip — configure later]` always available. Skipped fields keep their `project-config.json` with `"initialized": false`.
- Maximum **2 batched questions** for the BA round (one for ba-task-generation, one for ba-uml-modeling) — never four separate prompts.

The agent MUST NOT present hardcoded text "What are the standard document types on your project?" when those types are already visible in `docs/` filenames. Surface a question only when the inventory truly leaves a gap.

### Upgrade Role: Adaptive MCP Question

If normalized roles include `upgrade`, the agent decides whether to surface the Postman/Sentry MCP question based on signals — not as a fixed prompt:

| Signal observed before asking | Action |
|---|---|
| `postman/`, `*.postman_collection.json`, or `POSTMAN_API_KEY` in any `.env*` / CI config → user already uses Postman | Add `postman` MCP **silently** (HIGH confidence), no question |
| `sentry.properties`, `@sentry/*` in `package.json`, or `SENTRY_*` env vars → user already uses Sentry | Add `sentry` MCP **silently**, no question |
| Neither signal present | Surface a single batched yes/no for both servers as a MEDIUM/LOW gap, with `[Skip — neither]` default |

If the user opts out (or the silent-add path applied to none of them), do NOT add `postman` / `sentry` entries to `opencode.json` for this role.

**Important — no Workplace-level config file is created for this role.** Product scope, version transitions, guide packs, and migration state are all owned by the [`product-migration` APM package](https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages/-/tree/master/product-migration) (its `.apm/scripts/activate.{sh,ps1}` relocates the runtime `ProductMigration/` folder to the project root; configuration lives in `.workplace/product-migration/config.json`). The first `/migrate-pipeline` invocation collects any missing parameters via the package's own prompts.

**Phase 1.5 behavior for `upgrade`:**
1. Configure base MCPs + opt-in Postman / Sentry (above)
2. **Skip command generation entirely** — do not create any `.opencode/commands/upgrade-*.md` files
3. The `product-migration` APM package is offered during Phase 1.7-APM (its `x-workplace.targetRoles` includes `upgrade`); on accept, `apm install` deploys `/migrate-pipeline`, `/migrate-step`, `/migrate-validate`, `/migrate-status`, `/migrate-add-guide`, `/productMigration-module-init` into `.opencode/commands/`, and Phase 1.7-APM step 5.2 runs its `scripts/activate.*` directly to relocate the runtime (the opencode target deploys no hooks).

If new upgrade-related commands are ever needed, they MUST be added to the `product-migration` APM package (under `product-migration/.apm/commands/` in the Workplace-Agent-Packages repo), never as Workplace-template commands.

---

## Role Configuration Matrix

### MCP Servers by Role

| Role | MCP Servers | API Keys Required |
|------|-------------|-------------------|
| **Frontend** | Figma, Playwright, Storybook | None (Figma local, Playwright/Storybook local) |
| **Backend** | Postman, Sentry | POSTMAN_API_KEY, SENTRY_AUTH_TOKEN |
| **Full-Stack** | Figma, Postman, Playwright, Sentry | POSTMAN_API_KEY, SENTRY_AUTH_TOKEN |
| **Mobile** | Expo, Postman | POSTMAN_API_KEY (Expo uses SSE, no key) |
| **Designer** | Figma | None |
| **Performance** | Lighthouse, Playwright | None (local tools) |
| **QA** | Playwright, Postman, Sentry | POSTMAN_API_KEY, SENTRY_AUTH_TOKEN |
| **BA** | Figma | None (Figma uses remote MCP) |
| **Upgrade** | Postman *(optional)*, Sentry *(optional)* | POSTMAN_API_KEY, SENTRY_AUTH_TOKEN (only if user opts in) |

### Role → APM Package Mapping

The initializer NEVER generates role-specific commands synthetically. Instead, the matching APM package(s) are deployed during Phase 1.7-APM (`apm install`), and their pre-built primitives land in `.opencode/agents/`, `.opencode/commands/` and `.agents/skills/<id>/` byte-for-byte.

| Role | Auto-installed APM packages | Offered full-module packages |
|------|-----------------------------|------------------------------|
| **Frontend** | `frontend-developer`, `api` | — |
| **Backend** | `backend-developer`, `api` | — |
| **Full-Stack** | `frontend-developer`, `backend-developer`, `api`, `performance` | — |
| **Mobile** | — (no package yet; see "Roles Without a Package" below) | — |
| **Designer** | — (Figma MCP only) | — |
| **Performance** | `performance` | — |
| **QA** | `qa` | `test-generation` |
| **BA** | `business-analyst` | — |
| **Upgrade** | — | `product-migration` |

For the full package contents (which agents/commands/skills get deployed), browse the package's `<id>/.apm/` tree in the [Workplace-Agent-Packages](https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages) repo or read each package's `apm.yml` `assets:` block. For the installation flow, see [`phase-1-7-apm.md`](phase-1-7-apm.md) and the canonical [`apm-workflow.md`](apm-workflow.md).

#### Optional, role-agnostic packages (NOT auto-installed by role)

These packages ship cross-cutting tooling that is intentionally **not** tied to any role. They are flagged `x-workplace.optional: true, x-workplace.standaloneOnly: true` and are installed only after the user adds the package (`git: <apmPackages.registryRepoUrl>`, `path: <id>`, `ref: master`) to `apm.yml` and runs `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`:

| Optional package | Init behavior | What it adds |
|---|---|---|
| `project-scorecard` | Standalone only (`apm install` after editing `apm.yml`) | `coding-standards` agent, `/quality-check` command, `quality-check` skill |
| `llm-codegen-bench` | Standalone only (`apm install`) | `/codegen-benchmark` command, `codegen-benchmark` + `codegen-scorer` skills |
| `jira-defect-analysis` | Standalone only (`apm install`) | `/assess-ticket` command, `jira-defect-analysis` skill |

The agent MUST NOT add any of these packages to Phase 1.7-APM's auto-install set even when the user's role would intuitively benefit from them.

#### Roles Without a Package

`mobile` and `designer` do not yet have APM packages. Selecting them still:

- Configures their MCP servers (Expo + Postman / Figma)
- Surfaces their setup instructions in the post-init summary

But no role-specific agents/commands/skills are deployed for them. If a project adds new mobile/designer artifacts, scaffold a new APM package via `/package-new` and add it to `apm.yml`.

---

## MCP Server Configurations

### Base Configuration (Always Included)

Four servers are included for all roles. TaskMaster runs in **task-manager-only mode** by default (no API keys required).

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "context7": {
      "type": "local",
      "command": [
        "npx",
        "-y",
        "@upstash/context7-mcp"
      ],
      "enabled": true
    },
    "mcp-atlassian": {
      "type": "local",
      "command": [
        "uvx",
        "mcp-atlassian"
      ],
      "enabled": true,
      "environment": {
        "JIRA_URL": "<YOUR_JIRA_URL>",
        "JIRA_USERNAME": "<YOUR_JIRA_USERNAME>",
        "JIRA_API_TOKEN": "{env:JIRA_API_TOKEN}",
        "CONFLUENCE_URL": "<YOUR_CONFLUENCE_URL>",
        "CONFLUENCE_USERNAME": "<YOUR_CONFLUENCE_USERNAME>",
        "CONFLUENCE_API_TOKEN": "{env:CONFLUENCE_API_TOKEN}"
      }
    },
    "task-master-ai": {
      "type": "local",
      "command": [
        "npx",
        "-y",
        "task-master-ai"
      ],
      "enabled": true,
      "environment": {
        "TASK_MASTER_TOOLS": "initialize_project,get_tasks,next_task,get_task,set_task_status,add_subtask,remove_task,remove_subtask,clear_subtasks,move_task,add_dependency,remove_dependency,validate_dependencies,fix_dependencies,generate,complexity_report,list_tags,add_tag,delete_tag,use_tag,rename_tag,copy_tag"
      }
    },
    "chrome-devtools": {
      "type": "local",
      "command": [
        "npx",
        "-y",
        "chrome-devtools-mcp@latest"
      ],
      "enabled": true
    }
  }
}
```

**Important:** Do NOT mention API keys or AI features during initialization. TaskMaster works out of the box as a task manager. Chrome DevTools requires no API keys.

### Optional: TaskMaster AI Features (On User Request Only)

When the user **explicitly asks** to enable AI features for TaskMaster (e.g., "add API key for TaskMaster", "enable AI for TaskMaster", "I want to use parse-prd/expand/research"):

1. Update the `task-master-ai` entry in `opencode.json` to add the requested API key(s) to the `environment` section
2. Optionally change `TASK_MASTER_TOOLS` to `"standard"` or `"all"` to load AI-powered tools
3. Reference [taskmaster.md](../../../rules/taskmaster/taskmaster.md) — "No-API Task Manager Configuration" and "Environment Variables" sections for the full list of supported keys

**Example expanded config (only when user requests):**
```json
"task-master-ai": {
  "type": "local",
  "command": [
    "npx",
    "-y",
    "task-master-ai"
  ],
  "enabled": true,
  "environment": {
    "TASK_MASTER_TOOLS": "all",
    "ANTHROPIC_API_KEY": "<USER_PROVIDED_KEY>"
  }
}
```

### Role-Specific Server Snippets

**Figma** (Frontend, Designer, Full-Stack, BA):
```json
"figma": {
  "type": "remote",
  "url": "https://mcp.figma.com/mcp",
  "enabled": true
}
```

**Playwright** (Frontend, Full-Stack, Performance, QA):
```json
"playwright": {
  "type": "local",
  "command": [
    "npx",
    "-y",
    "@playwright/mcp@latest"
  ],
  "enabled": true
}
```

**Storybook** (Frontend):
```json
"storybook": {
  "type": "local",
  "command": [
    "npx",
    "-y",
    "storybook-mcp@latest"
  ],
  "enabled": true,
  "environment": {
    "STORYBOOK_URL": "<YOUR_STORYBOOK_URL>"
  }
}
```

**Postman** (Backend, Full-Stack, Mobile, QA):
```json
"postman": {
  "type": "local",
  "command": [
    "npx",
    "-y",
    "@postman/mcp-server"
  ],
  "enabled": true,
  "environment": {
    "POSTMAN_API_KEY": "{env:POSTMAN_API_KEY}"
  }
}
```

**Sentry** (Backend, Full-Stack, QA):
```json
"sentry": {
  "type": "local",
  "command": [
    "npx",
    "-y",
    "@sentry/mcp-server"
  ],
  "enabled": true,
  "environment": {
    "SENTRY_AUTH_TOKEN": "{env:SENTRY_AUTH_TOKEN}"
  }
}
```

**Expo** (Mobile):
```json
"expo": {
  "type": "remote",
  "url": "https://mcp.expo.dev/sse",
  "enabled": true
}
```

**Lighthouse** (Performance):
```json
"lighthouse": {
  "type": "local",
  "command": [
    "npx",
    "-y",
    "@anthropic/lighthouse-mcp-server"
  ],
  "enabled": true
}
```

---

## Phase 1.6: Commands Directory Verification (No Generation)

> **Changed in v3.0.0:** the previous "create the 7 standard commands" step was removed. The initializer no longer synthesises `review.md`, `bugfix.md`, `onboard.md`, `feature.md`, `refactor.md`, or `test.md` from in-template snippets. Those generic workflow files were duplicating responsibilities already covered by role-pack commands (e.g. `quality-check`, `tdd-workflow`, `test-verify`), domain context skills (`coding-standards-context`, `testing-context`), and the `code-quality-standards` skill — and they cluttered every project regardless of whether the user actually used them.

This phase performs **only** verification:

1. Make sure `.opencode/commands/` exists.
2. Inspect the Core commands shipped with the Workplace template.
3. Hand off to Phase 1.7-APM, which is the **only** way new commands enter the project (via `apm install` deploying commands from APM packages).

**Final command set after Phase 1.7-APM:**

```
Total = (Core commands shipped in template)
      + (commands deployed by apm install from every installed APM package's
         <id>/.apm/commands/)
```

The initializer creates **zero** new command files in this phase.

---

### Step 1: Ensure Commands Directory Exists

```
If .opencode/commands/ does NOT exist:
  → Create directory (empty)
  → Log: "Created .opencode/commands/ directory"

If directory exists:
  → Proceed to Step 2
```

---

### Step 2: Inspect Core Commands

The Workplace template ships a fixed set of Core commands inside `.opencode/commands/`. They are part of the template itself — they are present from the moment the user clones / copies the template, and the initializer never creates or overwrites them.

**Reference list of Core commands** (the actual contents of the template — confirm by listing `.opencode/commands/*.md`):

| Command file | Purpose |
|---|---|
| `initialize.md` | Trigger full project initialization (`/initialize`) |
| `quick-init.md` | Trigger Quick Init (`/quick-init`) |
| `package-new.md` | Scaffold a new APM package from an existing module / single skill / blank template (`/package-new`) |
| `update-workplace.md` | Safe Workplace template update (`/update-workplace`) |
| `taskmaster-init.md` | Initialize TaskMaster (`/taskmaster-init`) |
| `docs-sync.md` | Documentation registry sync (`/docs-sync`) |

If any Core command is **missing** (e.g. user deleted it):

- Do NOT recreate it from an inline template here.
- Instead, ask the user whether to restore it via `/update-workplace` (which is the canonical way to recover Core artifacts from the upstream template).

---

### Step 3: Verification

After Step 1 and Step 2, the agent confirms:

```
Commands directory:
  ✅ .opencode/commands/ exists

Core commands present (informational):
  ✅ initialize.md / ❌ missing — recoverable via /update-workplace
  ✅ quick-init.md / ❌ missing — recoverable via /update-workplace
  ✅ package-new.md / ❌ missing — recoverable via /update-workplace
  ✅ update-workplace.md / ❌ missing — recoverable via /update-workplace
  ✅ taskmaster-init.md / ❌ missing — recoverable via /update-workplace
  ✅ docs-sync.md / ❌ missing — recoverable via /update-workplace

Synthetic generation status: ❌ DISABLED (by design)
  No review/bugfix/onboard/feature/refactor/test files are generated here.
  All non-Core commands enter .opencode/commands/ only via Phase 1.7-APM
  (apm install deploys APM package primitives from <id>/.apm/commands/).
```

> **DO NOT** create any command files (generic OR role-specific) in this phase.
>
> - If you find yourself about to template a `review.md`, `bugfix.md`, `onboard.md`, `feature.md`, `refactor.md`, `test.md`, `design-review.md`, `api-test.md`, `deploy.md`, etc. — **STOP**.
> - Generic workflow commands belong inside an APM package at `<id>/.apm/commands/` in the Workplace-Agent-Packages repo (or as a Core command in the Workplace template if they are universal). Role-specific commands belong only inside their package.
> - Stack-aware behaviour belongs **inside** the command file (read the relevant `*-context` skill's `references/guidelines.md` at runtime, e.g. how `/quality-check` reads `coding-standards-context/references/guidelines.md`).

---

## Role-Specific Question Adaptation

After role selection, customize questions in later phases:

| Phase | Role-Specific Focus |
|-------|---------------------|
| **Phase 2** (Metadata) | Frontend → UI framework; Backend → API architecture; Mobile → platform targets |
| **Phase 3** (Stack) | Frontend → framework details; Backend → DB/ORM; Mobile → native modules |
| **Phase 5** (Requirements) | Performance → CWV targets; QA → coverage goals; BA → document types, terms |

---

## Phase 1.7-APM: APM Package Activation

> **Authoritative procedure has moved.** Since Workplace template v4.0.0, Phase 1.7-APM is defined in [`phase-1-7-apm.md`](phase-1-7-apm.md) (orchestration script) and [`apm-workflow.md`](apm-workflow.md) (conceptual APM reference: CLI, packages, registry sources, install/activate contracts, troubleshooting). The text below was the v3.x three-pass spec (Pass A / A.5 / B with `module-activation` skill, `Modules_Registry/role-packs/`, `/moduleActivate`, `role-packs-state.json`, `prepare-role-packs.ps1`) — all of those artifacts were removed. **Do not follow the v3 procedure.** Read `phase-1-7-apm.md` instead.

### High-level summary (current behaviour)

After Phase 1.5 (role + MCP) and Phase 1.6 (commands directory verification — see above; **no synthetic command generation**), Phase 1.7-APM runs the following sequence (full detail in [`phase-1-7-apm.md`](phase-1-7-apm.md)):

1. **Registry source** — ask the user where to read `index.json` from: (a) the Workplace-Agent-Packages repo (default), (b) a user-supplied Git URL, or (c) both (merged by `id`).
2. **Filter & validate** — `prepare-apm-packages.ps1 -Roles <selectedRoles>` fetches index(es), validates against the registry's `_schema/index.schema.json`, filters to `optional !== true && targetRoles ∩ selectedRoles ≠ ∅`, writes `.opencode/.temp-apm-selection.json`.
3. **Confirm optional packages** — single batched yes/no prompt for eligible optional packages (`optional: true && !standaloneOnly`).
4. **Compose `apm.yml`** — one `dependencies.apm:` entry per selected package using object-form dict references (`git: <apmPackages.registryRepoUrl>`, `path: <id>`, `ref: master`).
5. **Install** — `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`; APM resolves, writes `apm.lock.yaml`, deploys primitives to `.opencode/...`, merges hooks/MCP additively. `AGENTS.md` is co-owned via `compilation.agents_md.mode: managed_section` — `apm compile` populates only the `<!-- apm:start -->` / `<!-- apm:end -->` region.
6. **Activate** — the opencode target deploys no hooks, so run each package's `scripts/activate.{sh,ps1}` directly (idempotent; updates `.workplace/state.json`) and verify the relocated payload with `verify-apm-activation.ps1` (Phase 1.7-APM step 5.2).

Standalone-only packages (`optional: true && standaloneOnly: true` — currently `project-scorecard`, `llm-codegen-bench`, `jira-defect-analysis`, `ticket-triage`, `shopping-portal`) are **never** offered during initialization. Install them later by editing `apm.yml` and re-running `apm install`.

### Hand-off to Phase 6 Gate

```
requiredContextSkills =
    coreContextSkills                                  # always: coding-standards-context, infrastructure-context
  ∪ ⋃ pkg.xWorkplace.contextSkills for each APM package installed in Phase 1.7-APM
```

Phase 6 Part 3.5 (mandatory `guidelines.md` verification) runs against this set. Package statuses in `.workplace/state.json` flip to `"active"` only after the gate passes (see `configuration-updates.md` Part 3.5).

<details>
<summary>v3.x historical Phase 1.7 spec (informational; superseded by phase-1-7-apm.md)</summary>

### Pass A — Role-Pack Auto-Activation

#### Pass A.0 — Ensure Role-Pack Registry Is Accessible (deterministic, no A/B/C question)

> **Hard rule:** the agent MUST NOT ask the user "skip / install manually later / clone" when `Modules_Registry/role-packs/` is missing locally. The fallback is **always** auto-clone. The only question that may surface is the one-time URL prompt described below — and only when `templateSource` is missing from `.core-version.json`.

Before scanning for matched packs, use the prepared helper script. Do **not** assemble one-off PowerShell pipelines in chat.

```powershell
.opencode/skills/project-initialization/scripts/prepare-role-packs.ps1 -Roles backend,fullstack
```

Pass the normalized roles from Phase 1.5 as a comma-separated list. The script writes `.opencode/.temp-rolepacks-selection.json`; read that file and use its `registryRoot`, `matchedPacks`, `optionalPacks`, `standaloneOnlyPacks`, and `requiredContextSkills` fields for the rest of Pass A.

The helper script implements the registry resolution algorithm from `module-activation/SKILL.md` → Concepts → "Role-pack registry root" (skill removed in v4.0.0):

1. **Local-first.** If `Modules_Registry/role-packs/` exists in the project root and contains at least one `*/role-pack.json` → `registryRoot = Modules_Registry/role-packs/`. Skip to scan.
2. **Auto-clone fallback** (no user choice — this branch always runs when local registry is absent):
   1. Read `templateSource.url` and `templateSource.branch` from `.opencode/rules/.core-version.json`.
   2. **Confirm template source with the user (once per activation session):**
      Show the pre-configured values and ask for confirmation:

      ```
      🔗 Template Source
      Repository URL : {templateSource.url}
      Branch         : {templateSource.branch}

      [Enter] Confirm and continue
      [C]     Change to a different URL/branch

      Your choice (default: Enter):
      ```

      If the user presses Enter, proceed with the stored values without re-persisting them.
      If the user chooses [C], prompt for a new URL and branch, persist the new values into
      `.core-version.json.templateSource`, then proceed with the clone.
      If `templateSource` is missing entirely (should not happen with current template defaults),
      show the same prompt pre-filled with canonical defaults:
      URL = `https://{insert correct url}.git`, branch = `master`.
      On confirmation persist the chosen values into `.core-version.json.templateSource`.
   3. Always start from a clean folder: if `.opencode/.temp-rolepacks-clone/` already exists → delete it.
   4. Shallow-clone:
      ```bash
      git clone --depth 1 --branch {branch} {url} .opencode/.temp-rolepacks-clone
      ```
      (omit `--branch` if no branch was provided)
   5. Verify `.opencode/.temp-rolepacks-clone/Modules_Registry/role-packs/` exists and is non-empty. If not → stop Phase 1.7 with a clear error ("the Workplace template at {url}#{branch} does not ship role-packs; check branch or update template") and clean up the temp folder.
   6. `registryRoot = .opencode/.temp-rolepacks-clone/Modules_Registry/role-packs/`. The script records `usedTempClone = true` so Pass A.Z can clean it up.

If the clone fails (network/auth/URL invalid), surface the same guidance as [`../../project-update/references/git-source-setup.md`](../../project-update/references/git-source-setup.md) (credentials, VPN, URL validity) and stop initialization. **Do not** offer skip/manual install.

#### Pass A.1 — Scan Matched Packs

```
selection = JSON from .opencode/.temp-rolepacks-selection.json
selectedRoles = selection.selectedRoles
registryRoot = selection.registryRoot
matchedPacks = selection.matchedPacks
optionalPacks = selection.optionalPacks
standaloneOnlyPacks = selection.standaloneOnlyPacks
```

> **Optional packs are NEVER auto-activated** even if their pack id, name, or content seems related to the selected role. Their `targetRoles` MUST be `[]` per the role-pack format spec (removed in v4.0.0). Eligible optional packs are presented separately in Pass A.5; `standaloneOnly: true` packs are not presented during initialization.

For each matched pack, **activate inline without prompting the user** by following the Role-Pack Activation Workflow (RP-1 → RP-5) in `module-activation/SKILL.md` (removed in v4.0.0), passing `registryRoot` as the source root:

1. Validate `role-pack.json` (`type` = `"role-pack"`, valid manifest, valid `contextSkills`).
2. Plan & conflict check (auto-overwrite with logged warning during init).
3. Copy artifacts byte-for-byte from `{registryRoot}/{id}/` to `.opencode/agents/`, `.opencode/commands/`, `.opencode/skills/`.
4. Verify every target (existence, non-empty, content hash, recursive skill verification).
5. Mark `status = "activating"` in `.opencode/rules/role-packs-state.json`.
6. Add `pack.contextSkills` to the global `requiredContextSkills` set.

Display a summary line per pack:

```
✅ Activated role-pack: frontend-developer (2 agents, 2 commands, 4 skills)
✅ Activated role-pack: api (1 agent, 0 commands, 1 skill)
```

If any pack fails validation or copy: report the error, set `status = "failed"`, and **block initialization from advancing past Phase 1.7** until the user resolves the issue (or chooses to skip the offending pack).

#### Pass A.5 — Optional Role-Pack Offer (role-agnostic, opt-in)

> Runs after Pass A.1 (matched packs auto-activated) and **before** Pass A.Z cleanup. Uses the same `registryRoot`. Eligible optional packs are role-independent — they are listed for every project regardless of which role(s) the user picked in Phase 1.5. Packs with `standaloneOnly: true` are skipped here and can only be activated through `/moduleActivate {id}`.

If `optionalPacks` (collected in Pass A.1) is empty, **skip this pass silently** and proceed to Pass A.Z.

Otherwise, present a single batched prompt:

```
🧰 Optional, role-agnostic role packs

The following packs are not tied to any specific role and ship cross-cutting
tooling. Activation is opt-in — pick any subset (or none).

| # | Pack id              | What it adds                                                  |
|---|----------------------|---------------------------------------------------------------|
| 1 | {eligible-pack-id}   | {short description of copied agents/commands/skills}          |
| ... | ...                | ...                                                           |

Which would you like to activate now?
  - Numbers (e.g. "1,2") — activate the listed packs
  - "all"                — activate every optional pack
  - "none" / Enter       — skip all (you can still run /moduleActivate {id} later)

Your choice:
```

For each accepted pack, run **RP-1 → RP-5** from `module-activation/SKILL.md` (removed in v4.0.0) inline (the same procedure used for matched packs in Pass A.1, with auto-overwrite on conflicts). Append `pack.contextSkills` to `requiredContextSkills` for the Phase 6 gate.

For each declined pack, log a single line in the summary:

```
⏭️ Optional pack skipped: {id} — run /moduleActivate {id} later if needed.
```

Do **not** block initialization on optional packs. If the user picks none, that is a valid outcome and Pass A.5 succeeds.

#### Pass A.Z — Cleanup Temp Clone

After all matched packs (Pass A.1) **and** all opted-in optional packs (Pass A.5) have been processed (whether successfully activated, marked `activating`, or marked `failed`), and **before** Pass B begins:

- Run the preparation script cleanup:
  ```powershell
  .opencode/skills/project-initialization/scripts/prepare-role-packs.ps1 -Cleanup
  ```
- Cleanup must run even if pack activation failed in Pass A.1 or Pass A.5 — temp clones are never persisted across phases.
- The local `Modules_Registry/role-packs/` directory in the project root is **not** created by this phase. Pack artifacts now live in `.opencode/{agents,commands,skills}/` and are project-owned.

### Pass B — Full-Module Offer

After role-packs are activated, scan full modules in `.opencode/modules/`:

```
For each subdirectory in .opencode/modules/:
  Read module-config.json
  If targetRoles ∩ selectedRoles ≠ ∅ AND status is "inactive":
    Append to offerList
```

If `offerList` is non-empty, present the prompt:

```
🧩 AI Workplace Full Modules

The following full modules are available for your role(s):

| Module | Description |
|--------|-------------|
| Test Generation | AI-driven test generation for layered Playwright automation |
| Product Migration | Generic product migration pipeline (CIP/BE/FE) |

Would you like to activate any of these modules now?
1. Yes — activate now (will clone the module repository and integrate)
2. Later — skip for now (you can run /moduleActivate at any time)

Your choice:
```

**Behavior:**

- **No matching full modules:** skip this prompt silently.
- **"later" / "2":** skip activation. Log in the summary.
- **"yes" / "1":** for each selected full module, execute Steps 1–7 of the **Full-Module Workflow** in `module-activation/SKILL.md` (removed in v4.0.0) inline. If the module's `module-config.json` declares `contextSkills`, add them to `requiredContextSkills` and defer setting `status = "active"` until the Phase 6 gate passes.

### Hand-off to Phase 6 Gate

At end of Phase 1.7, the initializer carries forward to Phase 6 Parts 2/3/3.5:

```
requiredContextSkills =
    coreContextSkills                          # always: coding-standards-context, infrastructure-context
  ∪ ⋃ pack.contextSkills for each activated role-pack (Pass A.1 + Pass A.5)
  ∪ ⋃ module.contextSkills for each activated full module that declares any
```

Phase 6 Part 3.5 (mandatory `guidelines.md` verification) runs against this set. Role-pack/full-module statuses are finalised only after the gate passes — see RP-6 and full-module Step 7 in the activation skill.

### Summary Block

```
**Role Packs (Pass A.1 — auto-activated by role):**
✅ Auto-activated: [frontend-developer, api]
❌ Failed: [list, if any] — initialization blocked pending fix

**Optional Role Packs (Pass A.5 — user opt-in):**
✅ Activated: [list of opted-in optional packs, if any]
⏭️ Skipped: [list of declined optional packs] — run /moduleActivate {id} later

**Full Modules:**
✅ Activated: [Test Generation]
⏭️ Available (not activated): [Product Migration]
   Run /moduleActivate {name} to activate later.

**Context skills awaiting Phase 6 guidelines:**
- frontend-context (from frontend-developer)
- api-context (from api)
- coding-standards-context (core)
- infrastructure-context (core)
```

</details>

---

## Re-initialization Handling

### Scenario 1: Existing Roles Detected

```
✅ Existing Role Configuration Detected

Current roles: [roles]

Options:
1. Keep existing roles (no changes)
2. Change to different roles (replace)
3. Add additional roles (supplement)

Your choice:
```

If changing: Warn about MCP and role-pack updates (added/removed packs may add/remove agents, commands, and skills via byte-for-byte copy or removal). No synthetic command generation occurs.

### Scenario 2: No Roles (Old Version)

```
🆕 Role-Based Configuration Available

This project was initialized without role configuration.
Selecting roles will add MCP servers and activate matching role packs
(which copy in their pre-built agents, commands, and skills).

Would you like to select roles now? (yes/no)
```

### Scenario 3: Fresh Project

Proceed with normal role selection flow.

---

## MANDATORY: Phase Completion Actions

> **These actions are REQUIRED before Phase 1.5 can be considered complete.**
> **The agent MUST NOT proceed to Phase 2 without completing ALL of them.**

After role selection, execute these steps:

> **Source-of-truth rule (v4.0.0+):** Selected roles live in `.opencode/rules/project/metadata.json` (`project.roles`). MCP config lives in `opencode.json`. APM package state lives in `apm.lock.yaml` (root) + `.workplace/state.json`. The ledger only carries Q-blocks under `## User Answers & Decision Log → ### Phase 1.5 — Roles & MCP` and `### Phase 1.7-APM — Package Activation`.

1. **Update `## Initialization State → Selected Role(s)`** in `.opencode/project_init.md` with the comma-separated normalized role keys (e.g. `frontend, performance`) AND persist the same roles to `.opencode/rules/project/metadata.json` (`project.roles`).
2. **Run Phase 1.6 (read-only inventory)** — verify `.opencode/commands/` exists; record which Core commands are present / missing. **Do NOT create, copy, edit, or template any command file** (neither generic workflow files like `review`/`bugfix`/`onboard`/`feature`/`refactor`/`test` nor role-specific ones).
3. **Prepare MCP config** — write `opencode.json` with base + role-specific servers (after the user-level deduplication check above). APM's `apm install` step later **adds to** this file (additive merge) for any installed package that declares `dependencies.mcp:`.
4. **Set flags** for role-specific questions used by later phases.
5. **Run Phase 1.7-APM** — follow [`phase-1-7-apm.md`](phase-1-7-apm.md): pick the registry source (built-in / external / both), run `prepare-apm-packages.ps1 -Roles <selectedRoles>`, prompt for optional packages, write `apm.yml`, run `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`. **This is the only init step that adds new files to `.opencode/commands/` (beyond Core commands).**
6. **Collect `requiredContextSkills`** = coreContextSkills ∪ ⋃ `pkg.xWorkplace.contextSkills` for each APM package installed in Phase 1.7-APM. This set is consumed by Phase 6 Part 3.5.
7. **Append Q-blocks to the Decision Log** — using the canonical format from `SKILL.md → Phase Reflection Checkpoint → Step 4`:
   - `### Phase 1.5 — Roles & MCP`: one Q-block for the **role recommendation** (signals found → roles recommended → user accepted/overrode; `Decision stored in: .opencode/rules/project/metadata.json (project.roles)`); one for MCP config (`Decision stored in: opencode.json`); one for the user-level dedup answer.
   - `### Phase 1.7-APM — Package Activation`: one Q-block for the registry-source choice; one for auto-installed packages (`Decision stored in: apm.yml + apm.lock.yaml`); one for optional packages offered (acceptances + declines); one for skipped standalone-only packages (with `Follow-up: add the <id> package (git: <apmPackages.registryRepoUrl>, path: <id>, ref: master) to apm.yml later`).
   - Each Q-block must record what was offered, what was accepted, what was declined, and any failures (with the matching `pendingGuidelines` follow-up).
8. **Update `Artifact Pointers`** — set `MCP configuration` → `populated`, `apm.yml` → `populated`, `apm.lock.yaml` → `populated`, `.workplace/state.json` → `populated`.
9. **Tick `Phase 1.5` and `Phase 1.7-APM`** in `## Phase Checklist` (neither has a reflection sub-checkbox per `SKILL.md → Phase Transition Validation`). Record the operational checks below as Decision Log fields, not as ledger checkboxes:
    - User roles selected ✓
    - Commands directory verified (Phase 1.6 — no files generated) ✓
    - APM CLI confirmed available (Phase 0 already ran) ✓
    - Registry source picked (built-in / external / both) ✓
    - APM packages auto-installed for matching roles ✓
    - Eligible optional packages offered with batched prompt — user choice recorded ✓
    - Standalone-only packages skipped during init — available via `apm install` after editing `apm.yml` ✓
    - `requiredContextSkills` collected for the Phase 6 gate ✓
10. **Verify** — Re-read `## Initialization State → Selected Role(s)`; confirm it is no longer `[TO_BE_FILLED]`. Re-read `opencode.json`, `apm.yml`, and `apm.lock.yaml`; confirm all three exist and reflect the recorded decisions.
11. **Display summary** (see the Phase 1.7-APM section above for the full template). At minimum:
    ```
    📝 Phase 1.5 + 1.7-APM Summary:

    Role(s): [Selected Roles]

    **Registry source:** [Workplace-Agent-Packages index.json OR user URL OR both — merged]

    **Core Commands present:** [N]/6 (initialize, quick-init, package-new, update-workplace,
                                  taskmaster-init, docs-sync)
    ⚠️ Missing Core commands (recoverable via /update-workplace): [list, if any]

    **APM packages auto-installed:** [list of role-matched package ids — primitives deployed
                                       byte-for-byte from the Workplace-Agent-Packages repo (path: <id>)]
    **Optional packages installed:** [list of opted-in package ids]
    **Optional packages skipped:** [list of declined package ids — add to apm.yml later if needed]
    **Standalone-only packages (info only):** [project-scorecard, llm-codegen-bench, jira-defect-analysis, ticket-triage, shopping-portal]

    **Synthetic command generation:** ❌ DISABLED (by design)

    **MCP Servers:**
    ✅ Added to opencode.json: [list]
    ⏭️ Skipped (already in user-level MCP): [list]

    **Pending Phase 6 guidelines.md:** [list of context skills]
    ```
12. **Show progress**: "✅ User roles configured (1.5/9 phases complete)"

---

## Post-Generation Instructions

Display role-specific setup guidance:

| Role | Setup Instructions |
|------|-------------------|
| **Frontend/Designer** | Enable Figma Dev Mode MCP Server in Figma Preferences. Playwright and Storybook run locally — no keys needed. Set `STORYBOOK_URL` in `opencode.json` to your Storybook instance URL. |
| **Backend** | Get API keys: [postman.com/settings/me/api-keys](https://postman.com/settings/me/api-keys), [sentry.io/settings/account/api/auth-tokens](https://sentry.io/settings/account/api/auth-tokens) |
| **Full-Stack** | Get POSTMAN_API_KEY and SENTRY_AUTH_TOKEN (see Backend row). Figma and Playwright require no keys. |
| **Mobile** | Get POSTMAN_API_KEY at postman.com/settings/me/api-keys. Expo MCP connects via SSE — no key required. |
| **Performance** | Lighthouse and Playwright run locally — no API keys required. |
| **QA** | Get POSTMAN_API_KEY and SENTRY_AUTH_TOKEN. Playwright runs locally. |
| **BA** | Figma: Enable Figma Dev Mode MCP Server in Figma Preferences. BASS/Confluence MCP is already configured via base `mcp-atlassian`. BASS setup guide: https://bass.{bas_company}.com/pages/viewpage.action?pageId=2253152477. UML: Replace `.opencode/skills/ba-uml-modeling/references/uml-knowledge.md` and `uml-conventions.md` stubs with your project's UML documentation and rules. |
| **Upgrade** | No commands are generated for this role at the Workplace level. Postman and Sentry are optional — set `POSTMAN_API_KEY` / `SENTRY_AUTH_TOKEN` in `opencode.json` only if you opted in. The [`product-migration` APM package](https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages/-/tree/master/product-migration) is offered during Phase 1.7-APM (its `x-workplace.targetRoles` includes `upgrade`); on accept, `apm install` deploys `/migrate-pipeline`, `/migrate-step`, `/migrate-validate`, `/migrate-status`, `/migrate-add-guide`, `/productMigration-module-init` into `.opencode/commands/`, and running its `scripts/activate.{sh,ps1}` directly relocates the runtime `ProductMigration/` folder + `config.json` to project root / `.workplace/product-migration/` (the opencode target deploys no hooks — see `apm-workflow.md` Section 6). Place per-product guide packs under `ProductMigration/guides/`. Any future upgrade-related command should be added to `product-migration/.apm/commands/` in the Workplace-Agent-Packages repo, not to Workplace `.opencode/commands/`. |
| **All roles (base)** | Atlassian: set JIRA_URL, JIRA_USERNAME, CONFLUENCE_URL, CONFLUENCE_USERNAME in `opencode.json` and export JIRA_API_TOKEN / CONFLUENCE_API_TOKEN as environment variables (the config references them as `{env:...}`). Get Jira API token at id.atlassian.com/manage-profile/security/api-tokens. |

Remind users to add keys directly in `opencode.json` or via `opencode mcp add` (or the `mcp` block of `opencode.json`).

---

## Related Modules

- **Parent:** [Project Initialization Skill](../SKILL.md) - Main initialization orchestrator
- **Previous:** [mode-detection.md](mode-detection.md) - Phase 1
- **Next:** [metadata-collection.md](metadata-collection.md) - Phase 2
- **Phase 1.7-APM (orchestration):** [phase-1-7-apm.md](phase-1-7-apm.md)
- **APM workflow reference (CLI, registry, install, hooks):** [apm-workflow.md](apm-workflow.md)
- **APM CLI bootstrap (Phase 0):** [apm-bootstrap.md](apm-bootstrap.md)
- **Role → APM package mapping:** [role-commands-template.md](role-commands-template.md)
- **APM authoring skill:** [`../../apm-packaging/SKILL.md`](../../apm-packaging/SKILL.md)
- **Phase 6 guidelines.md gate:** [configuration-updates.md](configuration-updates.md) (Part 3.5)

---

## Important Notes

- API key placeholders: `<YOUR_[SERVICE]_API_KEY>`
- Deduplicate servers when multiple roles share the same tool (e.g., Playwright for Frontend + QA)
- Role selection is optional (can be added later)
- Project-level `opencode.json` is committed to git — do not hardcode real API keys; use placeholders
- Apply the user-level deduplication check before writing `opencode.json` to avoid duplicate server instances
