
# Environment Setup Module

This module handles Phase 0 of project initialization: setting up the development environment with proper file exclusions and workflow commands.

**Parent Workflow:** [Project Initialization Skill](../SKILL.md)

---

## Phase 0: Environment Setup

Before starting the initialization process, ensure the project has:
1. A project-level `opencode.json` with watcher exclusions and read denials (OpenCode has no ignore file; see Part 1)
2. `.opencode/commands/` directory present and inventoried (read-only — Phase 0 never creates or templates command files; the Workplace template ships Core commands, and Phase 1.7-APM adds APM-package commands by running `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`, which deploys files verbatim from `<id>/.apm/commands/` in the Workplace-Agent-Packages repo)
3. Core/Project directory structure

### Running the Workplace `.ps1` scripts (read before the first script call)

Every `.ps1` under `.opencode/skills/*/scripts/` runs unmodified under both PowerShell editions, but the **executable name differs by platform** and neither name exists everywhere. This template is cross-platform, so the documented commands are written in the Windows form and the rule below is what makes them portable.

> **Canonical invocation rule.** Use `pwsh -File <script>.ps1 [args]` when `pwsh` resolves; otherwise `powershell -ExecutionPolicy Bypass -File <script>.ps1 [args]`.
>
> Every `powershell -ExecutionPolicy Bypass -File …` command printed anywhere in this template means exactly that rule — it is written in the Windows form because that is where the trap is, not because the macOS/Linux branch is unsupported.

```powershell
# Windows (Windows PowerShell 5.1, present on every machine)
powershell -ExecutionPolicy Bypass -File <script>.ps1 [args]

# macOS / Linux, or any host with PowerShell 7+ installed
pwsh -File <script>.ps1 [args]
```

Why both halves matter:

- **On Windows,** `pwsh` (PowerShell 7+) is a separate optional install and is absent on most machines — `pwsh <script>` fails with "pwsh is not recognized" and costs a round-trip every time. `-ExecutionPolicy Bypass` is required there because the default machine policy blocks unsigned local scripts.
- **On macOS and Linux,** `pwsh` is the *only* PowerShell binary that exists — `powershell` is not a command, and `-ExecutionPolicy` is meaningless. Never rewrite a working `pwsh` invocation into `powershell` on these hosts.
- **If neither resolves** (a bare Linux box with no PowerShell at all), a `.ps1` gate cannot be evaluated. Do not improvise past it and do not declare it passed: record the gate as an Open Gap with the reason, and tell the user which check went unrun.

Two 5.1-specific traps the Workplace scripts already work around, worth knowing when writing new ones:

- **`2>&1` on a native executable** (git, node, apm) wraps each stderr line in an `ErrorRecord`; with `$ErrorActionPreference = 'Stop'` the first line of ordinary progress output aborts the script. Redirect stderr to a file and judge the run by `$LASTEXITCODE` instead — this is what `prepare-apm-packages.ps1` does around `git clone`.
- **`Get-Content` decodes UTF-8 as ANSI** in the console, so correct files display as mojibake (`â€"` for an em dash). Verify encoding with a byte-level check, not with terminal output. Likewise, never round-trip `.core-version.json` through `Get-Content | ConvertFrom-Json | ConvertTo-Json | Set-Content` — that is what corrupts it and adds a BOM.

Also note that Windows PowerShell 5.1 does not support the `&&` / `||` chaining operators. Issue dependent commands as separate calls.

---

## Part 1: Project `opencode.json` — Watcher Exclusions and Read Denials — MANDATORY

> **HARD RULE — applies to BOTH `NEW_PROJECT` and `EXISTING_PROJECT` modes.**
>
> After Phase 0.5 finishes, a root-level `opencode.json` MUST exist, MUST parse as JSON, and MUST carry the base `watcher.ignore` entries below.
> The ONLY case in which the agent does not write to `opencode.json` is when the file already exists AND already contains every base entry (nothing to merge). Even then the file is re-read and verified.
>
> **Never skip this part because the project "looks already configured".** A missing or invalid `opencode.json` after Phase 0.5 = Phase 0.5 incomplete (see the Verification Step below and `SKILL.md → Phase Transition Validation`).

OpenCode has no ignore file of its own. Three mechanisms replace what an ignore file used to do, and Phase 0.5 owns two of them:

| Concern | Mechanism | Owner |
|---|---|---|
| Keep dependencies, build outputs and caches out of search results (`grep`, `glob`, `list`) | `.gitignore` — OpenCode's search tools respect it automatically | Part 1.5 (Workplace entries) + the project's own `.gitignore` |
| Keep the file watcher off large or noisy directories | `watcher.ignore` in the **project-level** `opencode.json` | **This Part** |
| Keep secrets out of the agent's context even when they are not gitignored | `permission.read` deny rules | Core layer `.opencode/opencode.json` (`*.env`, `*.env.*`) + project-specific additions in the root `opencode.json` (**this Part**) |

The root `opencode.json` is **project-owned**: it is committed, `/update-workplace` never overwrites it, and Phase 1.5 later adds the `mcp` block to the same file. The Core layer `.opencode/opencode.json` (always-on instructions, subagent depth, secret-file denials) ships with the template and is never edited by initialization. OpenCode concatenates the `instructions` arrays and deep-merges the objects of both files (project layer first, Core layer last), so a project can add its own `instructions`, MCP servers and watcher patterns without touching Core.

### Steps

1. **Check if `opencode.json` exists** in the project root:
   ```
   If file exists:
     - Parse it as JSON (invalid JSON → treat as "encoding-broken", see the Verification Step)
     - Identify base entries missing from watcher.ignore (create the watcher object if absent)
     - If at least one entry is missing → add only the missing entries, keep every other key untouched → opencodeConfigStatus: "updated"
     - If every base entry is present → make no changes → opencodeConfigStatus: "retained"
     - Either way: proceed to the Verification Step (5) — the file MUST be re-read and confirmed valid

   If file does NOT exist:
     - MUST create it with the base template below
     - opencodeConfigStatus: "created"
     - This step is NOT optional and does NOT depend on project mode (NEW_PROJECT vs EXISTING_PROJECT)
   ```

2. **Base `opencode.json` template** (always ensure these entries exist):
   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "watcher": {
       "ignore": [
         "node_modules/**", "vendor/**",
         "dist/**", "build/**", "out/**", ".next/**", ".nuxt/**", "coverage/**",
         ".git/**", "logs/**", "tmp/**", "temp/**", ".cache/**",
         ".vscode/**", ".idea/**",
         ".taskmaster/tasks/**",
         "apm_modules/**", ".workplace/activated/**"
       ]
     },
     "permission": {
       "read": {}
     }
   }
   ```

   `permission.read` starts empty on purpose: `.env`, `.env.local` and every other `*.env*` file are already denied by the Core layer (`.opencode/opencode.json`), and `.env.example` is allowed there. Add project-specific secret locations here only when Phase 3 or the user names them (for example `"secrets/**": "deny"`, `"*.pem": "deny"`). Never put a catch-all `"*": "allow"` into a read block — OpenCode evaluates the **last** matching rule, so a catch-all cancels every deny rule written before it.

   > **Note (v4.0.0+):** the APM-managed paths are handled here and in Part 1.5:
   >
   > - `apm_modules/` — APM's local package cache, large and regenerable. **Watcher-ignored AND gitignored.**
   > - `.workplace/activated/` — per-package activation markers regenerated on first session. **Watcher-ignored AND gitignored.**
   > - `.workplace/state.json` — local activation status (regenerable). **Gitignored.**
   >
   > Commit-required files (do NOT gitignore, do NOT deny):
   >
   > - `apm.yml` — project's APM manifest.
   > - `apm.lock.yaml` — exact pinned package versions.
   > - `.opencode/rules/packages-index.json` — offline registry snapshot.
   > - `opencode.json` — the project-level configuration written by this Part and by Phase 1.5.
   > - `.agents/skills/` — package skills deployed by APM; they carry the initialized `project-config.json` and rendered `guidelines.md`.

3. **Smart Entry Detection**:
   - When merging into an existing file, compare `watcher.ignore` entries after normalisation (trailing `/` vs `/**`, leading `./`) and skip duplicates
   - Preserve key order and every key you did not touch (`mcp`, `model`, `instructions`, `agent`, `permission`, …)
   - Do not "fix" unknown keys — OpenCode rejects unknown **top-level** keys itself (`ConfigInvalidError` at startup); report them to the user instead of deleting them

4. **After Phase 3 (Stack Configuration)**, merge stack-specific `watcher.ignore` entries (same dedupe rules):

   | Stack | Additional `watcher.ignore` entries |
   |---|---|
   | React / Next.js | `.next/**`, `.vercel/**`, `.eslintcache` |
   | Vue / Nuxt | `.nuxt/**`, `.output/**`, `.vuepress/dist/**` |
   | Python | `__pycache__/**`, `*.py[cod]`, `venv/**`, `env/**`, `ENV/**`, `.venv/**` |
   | Java | `target/**`, `*.class`, `*.jar`, `*.war` |
   | .NET | `bin/**`, `obj/**`, `*.suo`, `*.user` |
   | Go | `*.exe`, `*.test`, `*.out`, `vendor/**` |

5. **Verification Step (MANDATORY — runs in ALL three branches: created / updated / retained)**:
   Phase 0.5 MUST NOT be marked complete unless this verification passes.
   ```
   a. Read opencode.json from disk (do NOT rely on in-memory state)
   b. Check that the file exists and parses as JSON:
        node -e "JSON.parse(require('fs').readFileSync('opencode.json','utf8'))"
   c. Check that the first byte is not a BOM (OpenCode reads the file with a strict JSON parser)
   d. Check that watcher.ignore contains at least "node_modules/**" and ".git/**"
   e. If ANY check fails:
      - Log error: "⚠️ opencode.json verification failed: <which check failed>"
      - If file is missing → fall back to the "create" branch from Step 1 and write the full base template
      - If file is invalid JSON / has a BOM → rewrite it from the parsed content (or from the base template when it cannot be parsed) as UTF-8 without BOM
      - If retry still fails → do NOT mark Phase 0.5 complete, surface a hard error to the user
   ```

   > **Reminder:** an "already configured" project is NOT a valid reason to skip verification. The most common failure mode is the agent reading "never overwrite project files" as "never touch `opencode.json`" — merging missing entries is not overwriting.

   **Windows-specific note**: never write `opencode.json` with `Set-Content -Encoding utf8` or `Out-File -Encoding utf8` — on Windows PowerShell 5.1 both prepend a BOM that OpenCode's parser rejects. Use the Write tool, or:
   ```powershell
   $utf8NoBom = New-Object System.Text.UTF8Encoding $false
   [System.IO.File]::WriteAllText((Join-Path (Get-Location) "opencode.json"), $json, $utf8NoBom)
   ```

   **Preferred approach**: Use the Write tool directly instead of shell commands, as it handles encoding correctly across platforms.

6. **Update Action** (only after successful verification):
   - Hold the result for the consolidated Phase 0 ledger update (see "MANDATORY: Phase Completion Actions" below). Do NOT update `project_init.md` from this step.
   - Store status in memory: `opencodeConfigStatus: "created"`, `"updated"`, or `"retained"`; verification note: "`opencode.json` verified: [N] watcher entries present".
   - The Phase 0.5 row of the Initialization Summary table (rendered at the end of `/initialize`) MUST mention `opencode.json` explicitly with its status.
   - **Restart reminder:** OpenCode reads `opencode.json` once at startup. Tell the user at the end of Phase 0.5 that the new watcher and permission rules take effect at the next `opencode` start; initialization itself does not depend on them.

---

## Part 1.5: .gitignore — Workplace Internal Files

Ensure that Workplace-generated runtime files are excluded from git.

### Steps

1. **Check if `.gitignore` exists** in the project root:
   ```
   If file exists:
     - Read current content
     - Check for missing Workplace entries (see list below)
     - Append only entries that are NOT already present
   
   If file does NOT exist:
     - Do NOT create .gitignore automatically (project may use a different VCS strategy)
     - Log: "⚠️ No .gitignore found — skipping Workplace exclusions. 
       Consider adding .opencode/hooks/.docs-sync-state.json to your VCS ignore file."
   ```

2. **Required Workplace entries** (append under `# AI Workplace` section if missing):
   ```
   # AI Workplace — internal runtime state (do not commit)
   .opencode/hooks/.docs-sync-state.json
   .opencode/.backups/
   .opencode/.update-backup/
   .opencode/.temp-update/
   .opencode/.temp-apm-selection.json

   # APM (Agent Package Manager) artifacts
   apm_modules/
   .workplace/activated/
   .workplace/state.json
   ```

   > `apm.yml`, `apm.lock.yaml`, `.opencode/rules/packages-index.json`, and **`.opencode/hooks/docs-sync-config.json`** MUST stay committed — do NOT add any of them to `.gitignore`. `docs-sync-config.json` is project-owned but intentionally tracked (it is a shared, per-project extension of the docs-sync hook's category/pattern rules — see [Configurable categories](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/AGENT_CONTEXT_AND_DOCS_SYNC.md#configurable-categories-docs-sync-configjson)), unlike the local-only `.docs-sync-state.json` above.

3. **Smart duplicate detection:**
   - Before appending, check if the exact entry already exists in the file
   - If present — skip silently
   - If absent — append with section comment (only if section comment is also missing)

4. **Verification:**
   - Read `.gitignore` back and confirm the entry is present
   - Log result: "`.gitignore` updated with Workplace exclusions" or "`.gitignore` already contains Workplace exclusions"

---

## Part 1.7: Docs Auto-Sync Plugin Configuration

> **Goal:** Let the user decide whether the automatic documentation sync recommendation fires after agent sessions, or whether docs sync should only be triggered manually via `/docs-sync`.

The Workplace template ships the docs-sync plugin (`.opencode/plugins/docs-sync.js`; analysis logic in `.opencode/hooks/docs-sync-check.js`). OpenCode loads every file under `.opencode/plugins/` at startup. After a session goes idle the plugin inspects the git state and, when the change set is significant, submits a `/docs-sync` recommendation as the next user-role message of that session. It is enabled by default. The switch is the project-owned `.opencode/hooks/docs-sync-config.json` (`"enabled": true|false`) — the same file Phase 3 later extends with stack-specific detection patterns; the plugin re-reads it at every idle, so no restart is needed to toggle it.

### Steps

1. **Present the choice to the user:**

   ```
   📄 Documentation Sync Plugin

   After an agent session goes idle, the docs-sync plugin can analyze your changes
   and recommend running /docs-sync when significant files are modified
   (3+ source files, new dependencies, or architectural changes).

   The /docs-sync command remains available regardless of this setting.

   [A] Enable automatic checks (default — the plugin recommends /docs-sync when needed)
   [B] Disable automatic checks (run /docs-sync manually only — the plugin stays installed but silent)

   Your choice (default: A):
   ```

2. **Apply the selected configuration to `.opencode/hooks/docs-sync-config.json`:**

   **If [A] Enable (default)** — no file is required. If the file exists and carries `"enabled": false`, set it to `true` (or remove the key); keep every other key untouched.

   **If [B] Disable** — create the file if absent, or merge the key into the existing one, keeping every other key:
   ```json
   {
     "enabled": false
   }
   ```
   The plugin and the analysis script stay in place, so the recommendation can be re-enabled at any time by setting `"enabled": true`.

3. **Confirm the applied setting:**
   - [A] chosen: "✅ Docs auto-sync plugin **enabled** — it will recommend `/docs-sync` after significant changes."
   - [B] chosen: "✅ Docs auto-sync plugin **disabled** (`docs-sync-config.json → enabled: false`). Use `/docs-sync` to sync documentation manually."

4. **Hold the choice for the Phase 0 ledger update** — record `docsSyncPlugin: "enabled"` or `docsSyncPlugin: "disabled"` in memory. The consolidated Phase Completion Actions (below) append a Q-block to `## User Answers & Decision Log → ### Phase 0 — Environment Setup` with `Decision stored in: .opencode/hooks/docs-sync-config.json` (or `defaults (no file)` when [A] was chosen and no file exists).

> **Re-enabling later:** set `"enabled": true` in `.opencode/hooks/docs-sync-config.json` (or delete the key); the plugin picks it up at the next idle. Only a changed **plugin file** needs an OpenCode restart.

> **Stack-specific tuning happens later, in Phase 3.** The plugin's category/dependency/build-config patterns are generic (JS/TS-oriented plus a handful of cross-language manifests) until Phase 3 (Stack Configuration) generates the pattern extensions in the same `docs-sync-config.json` — see `stack-configuration.md → Generate docs-sync-config.json`.

---

## Part 2: Commands Directory Preparation

Ensure the `.opencode/commands/` directory exists. **Phase 0 does not create or template any command files.**

> **Changed in v3.0.0; v4.0.0 update:** the previous Phase 0 → Phase 1.5 hand-off promised that "missing standard commands will be created in Phase 1.5". That was the synthetic-generation path for `review.md`, `bugfix.md`, `onboard.md`, `feature.md`, `refactor.md`, and `test.md`. **It has been removed.** No initialization phase generates command files inline. The only mechanisms that put `.md` files in `.opencode/commands/` are:
>
> 1. The Workplace template itself (which ships Core commands like `initialize`, `quick-init`, `package-new`, `update-workplace`, `taskmaster-init`, `docs-sync`).
> 2. Phase 1.7-APM (APM deploys commands from each installed APM package's `<id>/.apm/commands/` (in the Workplace-Agent-Packages repo) into `.opencode/commands/`).
> 3. Standalone `apm install` after the user adds the package (`git: <apmPackages.registryRepoUrl>`, `path: <id>`, `ref: master`) to `apm.yml`.
> 4. `/update-workplace` (restoring Core commands from the upstream template; APM-installed commands are refreshed by re-running `apm install` in `core-update.md` Step 3.5.b).

### Steps

1. **Check if `.opencode/commands/` directory exists**:
   ```
   If directory does NOT exist:
     - Create .opencode/commands/ directory (empty)
     - Log: "Created .opencode/commands/ directory (was missing — Core commands need to be restored via /update-workplace)"
   
   If directory exists:
     - Log: "Directory .opencode/commands/ already exists"
     - Proceed to inventory
   ```

2. **Inventory Core commands (informational only — read-only)**:
   
   The Workplace template ships six Core commands. Inspect their presence as part of the Phase 0 environment report:
   ```
   Core Commands (shipped by the Workplace template — never generated here):
   - [ ] initialize.md
   - [ ] quick-init.md
   - [ ] package-new.md
   - [ ] update-workplace.md
   - [ ] taskmaster-init.md
   - [ ] docs-sync.md
   
   Status: [N]/6 Core commands present.
   Missing Core commands are recoverable via /update-workplace — they are NOT created in Phase 1.5 or Phase 1.6.
   ```

   **Hard rule:** Do NOT create, copy, edit, or template any `.md` file in `.opencode/commands/` during Phase 0. This is a read-only inventory step.

3. **Track status**:
   - Note directory status: "created (empty)" or "existed"
   - Note Core command inventory: "[N]/6 Core commands present" + list of missing files (if any) for the Phase 1.6 / 1.7 summary

---

## Part 3: Project Identity Directory

Create the minimal `.opencode/rules/project/` directory that holds project identity. The full `metadata.json` is written in Phase 6.5; here we only ensure the directory and a stub README exist.

> **Changed in v3.0.0:** the parallel `project-*` customization system was removed. We no longer create `.templates/` for custom rules, custom command templates, or `docs/project/.templates/`. Project adaptation happens via role-pack artifact edits, the `Project Conventions` section in `AGENTS.md` (seeded in Phase 7), and per-skill `project-config.json` + `references/guidelines.md`.
>
> **Changed in v3.0.0 (APM-based since v4.0.0):** `.opencode/commands/.templates/` is no longer created — synthetic command generation has been replaced by APM-package installation (Phase 1.7-APM, `apm install`).

### Steps

1. **Create directory:**
   ```bash
   mkdir -p .opencode/rules/project
   ```

2. **Create README:** `.opencode/rules/project/README.md` (stub explaining that the directory only holds `metadata.json` and pointing to `docs/core/CUSTOMIZATION.md` for the project adaptation model).

3. **Track status:** Note that the project identity directory was created. `metadata.json` itself is created in Phase 6.5.

---

## Part 3.5: Analysis Artifact Directory

Create `.opencode/project/analysis/` — the destination for the Phase 4 analysis artifacts (`index.json` plus a `<component>.json` / `<component>.md` pair per component). Creating it here rather than in Phase 4 means the analysis subagents never have to create a directory outside their two named output files.

### Steps

1. **Create directory:**
   ```bash
   mkdir -p .opencode/project/analysis
   ```

2. **Do not seed `index.json`.** Phase 4 writes it just before the first dispatch (`codebase-analysis.md` → Step 0); an empty registry created here would be indistinguishable from an interrupted wave during a resume.

3. **NEW_PROJECT mode:** create the directory anyway and leave it empty. Phase 4 is skipped, so nothing lands in it until a later `/docs-sync` or re-analysis.

> These artifacts are **project-owned**: committed to the repository, absent from `coreFiles`, never touched by `/update-workplace`, and matched by an `IGNORED_PATTERNS` entry in `.opencode/hooks/docs-sync-check.js` so refreshing them does not trigger a documentation-sync recommendation. Contract: [`subagent-contract.md`](subagent-contract.md) §7.

---

## MANDATORY: Phase Completion Actions

> **These actions are REQUIRED before Phase 0 can be considered complete.**
> **The agent MUST NOT proceed to Phase 1 without completing ALL of them.**

After completing Phase 0:

> **Source-of-truth rule (v3.1.0+):** Phase 0 produces real files (`opencode.json`, `.gitignore`, `.opencode/hooks/docs-sync-config.json` when [B] was chosen, `.opencode/commands/`, `.opencode/rules/project/`). Those files ARE the authoritative artifacts. The ledger (`.opencode/project_init.md`) only records the audit Q-block(s) and ticks the phase checkbox. Most users do NOT deviate from defaults — silent acceptances must still get a Q-block per the ledger schema.

1. **Append the audit trail** to `.opencode/project_init.md → ## User Answers & Decision Log → ### Phase 0 — Environment Setup` using the canonical Q-block format from `SKILL.md → Phase Reflection Checkpoint → Step 4`. Include one Q-block per user choice or notable deviation; silent acceptance = single Q-block with `Question asked: none — silent acceptance`. Examples to log:
   - `opencode.json` outcome (`Decision stored in: opencode.json`).
   - `.gitignore` outcome (`Decision stored in: .gitignore`, or `User answer: skipped — no .gitignore present`).
   - docs-sync plugin choice from Part 1.7 (`Decision stored in: .opencode/hooks/docs-sync-config.json`, or `defaults (no file)` when [A] was chosen and no file exists).
   - Commands directory status (`Decision stored in: .opencode/commands/`; `User answer: existed` / `created (empty)`; missing Core commands listed under `Follow-up:` for `/update-workplace`).
   - Project identity directory created (`Decision stored in: .opencode/rules/project/`).
   - Analysis artifact directory created (`Decision stored in: .opencode/project/analysis/`).

2. **Tick `Phase 0`** in `.opencode/project_init.md → ## Phase Checklist`. (Phase 0 has no reflection sub-checkbox per `SKILL.md → Phase Transition Validation`.)

3. **Update `Artifact Pointers`** — set the `MCP configuration`, `apm.yml`, `apm.lock.yaml`, and `.workplace/state.json` rows only when the files exist (they will appear in Phase 1.5/1.7-APM); for now Phase 0 only confirms `.opencode/commands/` and `.opencode/rules/project/` exist and records that under the relevant Q-blocks.

4. **Mirror open gaps** — missing Core commands (recoverable via `/update-workplace`) get a bullet under `## Open Gaps` with `gap`, `source phase = 0`, `owner = user`, `suggested follow-up = run /update-workplace`.

5. **Verify artifacts** — Re-read `opencode.json` to confirm it parses and carries the base watcher entries; if `.gitignore` exists, confirm Workplace exclusions are present; confirm `.opencode/commands/`, `.opencode/rules/project/` and `.opencode/project/analysis/` exist; confirm `.opencode/hooks/docs-sync-config.json` carries the chosen `enabled` value.

6. **Show progress:** "✅ Environment setup (0/9 phases complete)"

**Note:** No command creation happens during initialization. Phase 1.6 only inspects `.opencode/commands/` (read-only inventory of Core commands shipped with the Workplace template). Phase 1.7-APM ([phase-1-7-apm.md](phase-1-7-apm.md)) is the only mechanism that adds new files to `.opencode/commands/`, exclusively via `apm install` from APM packages under `<id>/.apm/commands/` in the Workplace-Agent-Packages repo.

---

## Related Modules

- **Parent:** [Project Initialization Skill](../SKILL.md) - Main initialization orchestrator
- **Next:** [mode-detection.md](mode-detection.md) - Phase 1: Mode detection

---

## Important Notes

1. **Never overwrite existing configurations** — Always check for file/directory existence before writing. **This does NOT mean "skip creating a missing file."** If `opencode.json` is absent, you MUST create it (see Part 1, Step 1, "If file does NOT exist" branch). The non-overwrite rule only protects user-authored entries inside files that already exist.
2. **Smart duplicate detection** - Avoid adding `watcher.ignore` entries that already exist in `opencode.json`
3. **Stack-specific patterns** - Added after Phase 3 when framework is known
4. **No commands are generated by the initializer.** Phase 1.6 only inspects `.opencode/commands/` (read-only). Phase 1.7-APM deploys commands from APM packages under `<id>/.apm/commands/` (in the Workplace-Agent-Packages repo) via `apm install`. See [phase-1-7-apm.md](phase-1-7-apm.md) and [apm-workflow.md](apm-workflow.md).
5. **Preserve user customizations** - Existing `.opencode/commands/` and `opencode.json` never modified
6. **CRITICAL: Verify before marking complete** - Always read back and verify file contents before checking completion checkboxes
7. **Use Write tool for file operations** - Prefer the Write tool over shell commands for file creation to avoid encoding issues

## Common Failure Modes & Solutions

### Problem: `opencode.json` is missing after initialization

**Symptoms:**
- `/initialize` finished and the Initialization Summary's Phase 0.5 row mentions only `.gitignore` and the docs-sync plugin, with no entry for `opencode.json`.
- `ls opencode.json` in the project root returns no such file, and OpenCode's file watcher indexes `node_modules/`.

**Root Cause:**
The agent treated the project as "already configured" (typically in `EXISTING_PROJECT` mode) and skipped Part 1 of Phase 0.5 entirely, often by misreading the "Never overwrite existing configurations" guidance as "never touch `opencode.json`".

**Solution:**
1. Re-run Phase 0.5 Part 1 manually: create `opencode.json` from the base template above (plus any stack-specific `watcher.ignore` entries from Step 4 that match the detected framework).
2. Run the Verification Step (5) to confirm the file exists, parses, and carries the base entries.
3. Append a Q-block to `.opencode/project_init.md → ### Phase 0 — Environment Setup` with `Decision stored in: opencode.json`, `User answer: created (recovered after initial run skipped it)`.
4. To prevent recurrence, treat Part 1 as MANDATORY for both modes — the "create" branch runs whenever the file is absent, regardless of how mature the project looks.

---

### Problem: `opencode.json` exists but OpenCode refuses to start (`ConfigInvalidError`)

**Symptoms:**
- Phase 0 checkbox is marked complete
- `opencode` exits at startup with `ConfigInvalidError`, or the file has 0 bytes

**Root Causes:**
1. The file was written with `Set-Content -Encoding utf8` / `Out-File` on Windows PowerShell 5.1 — a BOM precedes the opening brace
2. A trailing comma, a comment in a `.json` file, or an unknown top-level key (OpenCode validates its config strictly)
3. File write operation failed silently, or the agent marked the checkbox before the actual write

**Solution:**
1. Use the Write tool directly (not shell echo/cat commands); if a shell must write, use `[System.IO.File]::WriteAllText(..., UTF8Encoding($false))`
2. Validate with `node -e "JSON.parse(require('fs').readFileSync('opencode.json','utf8'))"` and compare unknown keys against https://opencode.ai/config.json
3. Only mark the checkbox AFTER successful verification
4. Escape hatch while fixing: `OPENCODE_DISABLE_PROJECT_CONFIG=1 opencode` starts without the project file

### Problem: Checkbox marked but action not completed

**Prevention:**
```
ALWAYS follow this order:
1. Perform the action (create file, write content)
2. Verify the action succeeded (read back, check content)
3. ONLY THEN mark the checkbox as complete
```

This module ensures a clean, optimized development environment while preserving any existing configurations.
