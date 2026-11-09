# Quick Init Workflow

# Template Setup Workflow

## Agent-Driven Initialization Modes

### Mode Detection

I will determine which initialization mode to use based on:

- **Check if `.opencode/project_init.md` is in chat context**
- **Check prompt keywords and commands:**
  - "Initialize my project" → **Full Project Initialization** (see [Project Initialization Skill](../SKILL.md))
  - `/quick-init` command → **Quick Template Setup** (this workflow); see [quick-init.md](../../../commands/quick-init.md)

### Step 0 — APM CLI Bootstrap (graceful)

> Runs at the very start of Quick Init, before Update Detection. Follows [apm-bootstrap.md](apm-bootstrap.md) **verbatim** (install commands character-for-character, consent flow, PATH-refresh ladder) with exactly one behavioral override.

Execute [apm-bootstrap.md](apm-bootstrap.md) Steps 1–4:

1. Run `apm --version`. On miss, offer the consent-gated auto-install via the Shell tool (Windows: `irm https://aka.ms/apm-windows | iex`; macOS/Linux: `curl -sSL https://aka.ms/apm-unix | sh`), with the manual fallback (brew / pip / new terminal) on decline or failure. Re-detect using the PATH-refresh ladder from apm-bootstrap.md Step 3.
2. On success: persist `apmVersion` + `apmVersionCheckedAt` to `.opencode/rules/.core-version.json` (UTF-8 **without** BOM — same encoding rules as apm-bootstrap.md Step 4) and run the major-version drift check against `apmVersionExpected`. If an existing install is outdated, prefer `apm self-update`.
3. **Graceful override (Quick Init only):** if the CLI is missing and installation fails or is declined — or the user declines to continue on the drift warning — do **NOT** abort (this overrides apm-bootstrap.md's abort rule, which still applies to `/initialize`). Record `apmAvailable=false` for this run, print a one-line notice ("APM CLI unavailable — Quick Init continues without the package offer (Step 4.5); run `/initialize` later to install packages"), and continue. A missing APM CLI never blocks Quick Init.

### Update Detection (auto, no NEW/EXISTING question)

> **Hard rule:** Quick Init does NOT ask the user "is this a new or existing project?" — that question was removed in v3.0.0. Mode is inferred from `.opencode/rules/.core-version.json` and file-system signals using the same algorithm as the full initializer (see [`mode-detection.md`](mode-detection.md) Step 0 + Step 1). Quick Init only branches on **fresh-vs-already-active**, not on NEW vs EXISTING.

1. **Check for `.opencode/rules/.core-version.json`:**
   ```
   If file does NOT exist:
     → This is FRESH SETUP (first time ever)
     → Continue with Quick Template Setup below
   
   If file EXISTS:
     → Proceed to Step 2 for detailed analysis
   ```

2. **Analyze Version File State:**

   Read the file and check TWO indicators:
   
   **Indicator A: `initializationStatus` field**
   - `"fresh"` → Template was copied but never initialized
   - `"active"` → Project was previously initialized
   
   **Indicator B: `coreFiles` hash values**
   - All hashes are `"pending"` → Never finalized (fresh template)
   - Any hash has actual SHA-256 value → Previously initialized
   
   **Decision Matrix:**
   
   | initializationStatus | Hash Values | Action |
   |---------------------|-------------|--------|
   | `"fresh"` | All `"pending"` | → **FRESH SETUP** (proceed) |
   | `"active"` | Any calculated | → **UPDATE** (redirect) |
   | Missing field | Any | → **UPDATE** (legacy file) |
   
   **If UPDATE detected:**
   ```
   📊 Update Detected

   This project is already initialized (version [X.Y.Z] detected).

   To safely update your template while preserving customizations,
   the system will automatically use the safe update workflow.

   Simply run: "Initialize my project" to proceed with safe update.
   ```
   → Redirect to Project Updater agent (read `agents/project-updater.md`)

3. **Optional NEW vs EXISTING signal logging (silent):**
   For its own logs only, Quick Init MAY run the lightweight file-signal scan from [`mode-detection.md`](mode-detection.md) Step 1 and write the inferred mode to its setup summary (e.g., "Detected EXISTING_PROJECT signals: package.json, src/, lock file"). This is informational — Quick Init never asks the user to confirm.

4. **For first-time setup:**
   - Create project customization structure during setup
   - Update `.opencode/rules/.core-version.json`: set `initializationStatus` to `"active"` and calculate hashes
   - This ensures future updates use the update workflow

### Quick Template Setup

When the `/quick-init` command is triggered, I will **ONLY** handle template setup (do NOT include TaskMaster or PRD work). **Do NOT ask about developer roles.** **Do NOT generate component rules** (frontend.md, backend.md, etc.). **Do NOT add role-specific MCP servers.**

1. **Detect and confirm project name** (metadata phase):
   - Read `package.json` "name" field (if present); fallback: workspace directory name
   - Print `Project name: {{name}} (from package.json) — press Enter to keep, or type another name`; ask an open question only when neither `package.json` nor the directory name yields a usable, non-generic name
   - Use confirmed name for README and any project references in subsequent steps

2. **Generate or update the project-level `opencode.json`** in the project root — **MANDATORY, never skip** (rationale in `environment-setup.md → Part 1`: OpenCode has no ignore file — `.gitignore` drives search exclusions, `watcher.ignore` keeps the file watcher off heavy directories, `permission.read` keeps secrets out of the context):
   - **If file does NOT exist**: MUST create it with the base template below. This is non-optional regardless of whether the project looks mature or already configured.
   - **If file exists**: parse it, add only the missing `watcher.ignore` entries (dedupe after normalising `dir/` vs `dir/**`), keep every other key untouched. If everything is already present → leave the file as it is.
   - **After writing/inspecting:** re-read the file from disk, confirm it parses as JSON, starts without a BOM and contains at least `node_modules/**` and `.git/**` under `watcher.ignore`. If the file is still missing after this step, Quick Init MUST stop and report the failure.
   - **Base template**:
     ```json
     {
       "$schema": "https://opencode.ai/config.json",
       "watcher": {
         "ignore": [
           "node_modules/**", "vendor/**",
           "dist/**", "build/**", "out/**", "coverage/**",
           ".git/**", "logs/**", "tmp/**", "temp/**", ".cache/**",
           ".vscode/**", ".idea/**",
           ".taskmaster/tasks/**"
         ]
       },
       "permission": { "read": {} }
     }
     ```
   - `.env*` files are already denied by the Core layer `.opencode/opencode.json`; add project-specific secret paths to `permission.read` only when the user names them, and never a catch-all `"*": "allow"`
   - **Track status**: note whether the file was created, updated or retained for the summary message

2.5. **Configure the Docs Auto-Sync Plugin** (`.opencode/hooks/docs-sync-config.json → enabled`):

   The template ships the docs-sync plugin (`.opencode/plugins/docs-sync.js`), loaded by OpenCode at startup; after a session goes idle it recommends `/docs-sync` when the change set is significant. Present the following choice to the user:

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

   **If [A] Enable (default)** — nothing to write. If `.opencode/hooks/docs-sync-config.json` exists with `"enabled": false`, set it to `true` (keep every other key).

   **If [B] Disable** — create or merge the flag into `.opencode/hooks/docs-sync-config.json` (keep every other key):
   ```json
   {
     "enabled": false
   }
   ```

   Confirm the result:
   - [A] chosen: "✅ Docs auto-sync plugin **enabled**."
   - [B] chosen: "✅ Docs auto-sync plugin **disabled** — use `/docs-sync` to sync documentation manually."

3. **Verify the commands directory** `.opencode/commands/` (read-only — **no synthetic generation**):
   > **Changed in v3.0.0:** Quick Init no longer synthesises generic workflow commands (`review.md`, `bugfix.md`, `onboard.md`, `feature.md`, `refactor.md`, `test.md`). Those files are not part of the Workplace template and never get created here. Quick Init activates **no role packs and no full modules** (role-*driven* pack selection remains exclusive to `/initialize`; Step 4.5 may still install a package on detection evidence or acceptance), so the **Core commands** that ship inside `.opencode/commands/` of the template itself are the only guaranteed ones — additional commands appear only when the user accepts role-agnostic packages in Step 4.5 (deployed by `apm install` from those packages).
   - **If directory does NOT exist**: create the empty directory. Log: "Created `.opencode/commands/` (was missing — Core commands need to be restored via `/update-workplace`)".
   - **If directory exists**: list its contents (read-only). Do NOT create, copy, edit, or template any `.md` file.
   - **Reference list of Core commands shipped with the Workplace template** (used only for the inventory report — never written from inline templates here):
     - `initialize.md` — `/initialize` (full project initialization)
     - `quick-init.md` — `/quick-init` (this command)
     - `package-new.md` — `/package-new` (scaffold a new APM package from an existing module / single skill / blank template)
     - `update-workplace.md` — `/update-workplace` (safe Core template update)
     - `taskmaster-init.md` — `/taskmaster-init`
     - `docs-sync.md` — `/docs-sync`
   - **Inventory logic:**
     ```
     For each Core command file:
       If file exists and is non-empty → mark as ✅ present
       If file is missing or empty   → mark as ⚠️ missing (recoverable via /update-workplace)
     NEVER write or modify any file in this step.
     ```
   - **Track status**:
     - If directory created: "✅ Created empty `.opencode/commands/`. Run `/update-workplace` to restore Core commands."
     - Inventory line: "ℹ️ `.opencode/commands/`: [N]/6 Core commands present. Missing: [list, if any] — run `/update-workplace`."
   - **Hard rule:** Quick Init never synthesises commands. New commands enter the project only via `apm install` (which deploys commands shipped by APM packages from `<id>/.apm/commands/` in the Workplace-Agent-Packages repo) or via the next `/update-workplace` (which restores Core commands from the upstream template).

4. **Add the base `mcp` block to `opencode.json`** (only if the block does not exist yet):
   - **Do NOT add role-specific MCP servers** (Figma, Postman, etc.). Base servers only.
   - **Check whether `opencode.json` (created in Step 2) already has an `mcp` block:**
     - If the block exists → skip, preserve the existing servers
     - If the block is absent → merge the `mcp` object below into the existing file; do not touch other keys
   - **Base MCP server configuration template:**
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
   - If created: Do NOT mention API keys. TaskMaster works as a task manager without keys. Only when the user explicitly asks to enable AI features, add API key(s) per the "Optional: TaskMaster AI Features" section in [user-roles-mcp.md](user-roles-mcp.md).

4.5. **Role-agnostic APM packages (optional offer)** — skipped with a one-line notice when `apmAvailable=false` (Step 0):

   > **Dynamic catalogue, never a hardcoded list.** The offered set is computed at runtime from the freshly resolved registry index by a single predicate: `xWorkplace.targetRoles` is empty/absent. The script, this document, and every downstream doc describe the predicate only — package names may appear solely as dated examples. Packages added, removed, or re-classified (changed `targetRoles` / `optional` / `standaloneOnly` / `type`) in the catalogue are reflected automatically, with no template changes.

   a. **Resolve the catalogue:** run
      ```powershell
      powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/prepare-apm-packages.ps1 -RoleAgnosticOnly -Mode builtin [-AllowGitFallback]
      ```
      - Pass `-AllowGitFallback` when `apmPackages.registryRepoUrl` in `.opencode/rules/.core-version.json` is a private host (same pre-detection rule as [phase-1-7-apm.md](phase-1-7-apm.md) Step 1). Quick Init does **NOT** ask for a registry source — built-in only; record `sources[0].resolvedVia` for the summary.
      - Script failure (no index via HTTPS, git, or the offline snapshot) → print a notice and skip this step (graceful, same principle as Step 0).

   b. **Read the offer:** load `roleAgnosticPackages` from `.opencode/.temp-apm-selection.json`; if empty → skip. If `sources[0].resolvedVia` is `offline-snapshot`, warn the user: the list comes from the offline snapshot dated `sources[0].generatedAt` and may be stale, and installation still needs network access to fetch the packages themselves.

   b.1. **Add the packages the detected stack needs.** Quick Init is role-less, so the role filter offers nothing for the technologies actually in the repository — without this sub-step a React + Postgres + Jest project finishes Quick Init with only the two Core context skills, and on this line every other `*-context` skill arrives from APM and from nowhere else.

   Run the detection table in [`phase-6/part-3-5-verification.md` → detection → owning package](phase-6/part-3-5-verification.md) over the stack scan from step 1. For each signal that fires, look up the owning package and add it to the same batched multi-select as a **separate, clearly-labelled group** ("detected in your project"), each row carrying the evidence that triggered it (e.g. "`prisma/schema.prisma` found → `backend-developer` (ships `database-context`)").

   Rules that keep this cheap and non-blocking:
   - The offer stays **one** multi-select — do not add a second round trip.
   - Default = nothing selected, exactly as in (c). Declining is always acceptable.
   - A declined package is recorded as a gap in the Quick Init summary, never a gate — Quick Init has no hard gate and must keep its 3–5 minute budget.
   - Rendering `guidelines.md` for anything installed here remains `/initialize` Phase 6 work, per (d)(5).

   c. **Offer (one batched multi-select):** present every resolved package as a checkbox option (`name`, `version`, one-line `description` from the index). Default = nothing selected; declining everything is the fast path and always acceptable.

   d. **On selection (1+ packages):**
      1. Write or merge `apm.yml` at the project root per [phase-1-7-apm.md](phase-1-7-apm.md) Step 4 — `targets: [opencode]` plus dict-form entries (`git: <apmPackages.registryRepoUrl>`, `path: <package-id>`, `ref: <apmPackages.registryBranch>`, `alias: <package-id>`); merge by `alias`, never rewrite hand-edited entries, preserve third-party dependencies.
      2. Credential pre-flight per [phase-1-7-apm.md](phase-1-7-apm.md) Step 5.0 / 5.0a (mandatory for private hosts). Option C there is reworded here to "Skip package installation and continue Quick Init" — no downstream gate depends on these packages.
      3. Run `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js` — it pins `targets: [opencode]`, restores initialization-owned files after the redeploy and reports packages skipped for target incompatibility (each one is a logged gap).
      4. Verify `apm.lock.yaml` exists and lists every accepted package; spot-check one package's primitives under `.opencode/{agents,commands}/` and `.agents/skills/`.
      5. Context skills shipped by accepted packages (whatever `contextSkills` the current index declares for them) are **NOT** configured by Quick Init — no `guidelines.md` rendering. Tell the user to run `/initialize` (Phase 6) later to configure them.

   e. **Cleanup (always, regardless of outcome):**
      ```powershell
      powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/prepare-apm-packages.ps1 -Cleanup
      ```

   **Why this step exists:** standalone-only and other role-agnostic packages previously had no install path except manual `apm.yml` editing — they are never offered during `/initialize` Phase 1.7-APM, which is role-driven. Quick Init is role-less, so it is the natural place to offer them. Role-*driven* selection (auto-matching packs to a chosen role, Pass A.5) remains exclusive to `/initialize`; sub-step b.1 is different in kind — it offers a package because the repository demonstrably contains its domain, with the evidence printed on the row.

5. **Customize project files**:
   - **Update `README.md`** - Replace "NC AI-Assisted Engineer Workplace" with the confirmed project name from step 1 in the title and description
   - **Preserve `docs/GETTING_STARTED.md`** - Keep as-is, it contains universal template documentation
   - Remove or update any hardcoded paths in configuration files

   **Environment File Distinction:**
   - **Template `.env.example`**: May contain optional TaskMaster CLI configuration for AI features (keys only needed if user enables them)
   - **Project `.env`**: Will contain application-specific configuration (database URLs, app API keys, etc.)
   - **Never mix these**: TaskMaster configuration is separate from project application configuration

6. **Enable Issues** (if GitHub repository):
   ```bash
   gh api repos/OWNER/REPO --method PATCH --field has_issues=true
   ```

7. **Set Branch Protection Rules** (if GitHub repository):
   ```bash
   gh api repos/OWNER/REPO/branches/main/protection \
     --method PUT \
     --field required_status_checks='{"strict":true,"contexts":[],"checks":[]}' \
     --field required_pull_request_reviews='{"dismiss_stale_reviews":false,"require_code_owner_reviews":false,"require_last_push_approval":false,"required_approving_review_count":1}' \
     --field required_signatures='{"enabled":false}' \
     --field enforce_admins='{"enabled":false}' \
     --field required_linear_history='{"enabled":false}' \
     --field allow_force_pushes='{"enabled":true}' \
     --field allow_deletions='{"enabled":false}' \
     --field block_creations='{"enabled":false}' \
     --field required_conversation_resolution='{"enabled":false}' \
     --field lock_branch='{"enabled":false}' \
     --field allow_fork_syncing='{"enabled":false}'
   ```

   **Branch Protection Rules Summary:**
   - **Pull Request Reviews**: 1 approval required
   - **Status Checks**: Strict mode enabled
   - **Force Pushes**: Allowed
   - **Branch Deletions**: Disabled
   - **Admin Enforcement**: Disabled (admins can bypass)

   **Manual Setup Alternative:**
   If CLI commands fail, manually configure in GitHub:
   1. Go to repository Settings → Branches
   2. Add rule for `main` branch
   3. Enable "Require a pull request before merging" (1 approval)
   4. Enable "Require status checks to pass before merging" (strict mode)

8. **Notify user about configuration files status**:
   - **`opencode.json`:**
     - If created: "✅ Created `opencode.json` with the base watcher exclusions"
     - If updated: "✅ Updated `opencode.json`: added [N] missing watcher entries (your other settings were preserved)"
   - **`.opencode/commands/`:**
     - If directory was missing and was just created (empty): "✅ Created empty `.opencode/commands/`. Run `/update-workplace` to restore Core commands."
     - Otherwise (inventory only — no files written by Quick Init): "ℹ️ `.opencode/commands/`: [N]/6 Core commands present (initialize, quick-init, package-new, update-workplace, taskmaster-init, docs-sync). Missing: [list, if any] — run `/update-workplace`."
     - **Synthetic generation is disabled by design.** New non-Core commands enter the project only via `apm install` — either by accepting role-agnostic packages in Step 4.5, or later by adding a package (`git: <apmPackages.registryRepoUrl>`, `path: <id>`, `ref: master`) to `apm.yml` manually.
   - **`opencode.json`:**
     - If added: "✅ Added the base MCP servers to `opencode.json` (Context7, Atlassian, TaskMaster, Chrome DevTools). TaskMaster works as a task manager without API keys. If you need AI features (PRD parsing, task expansion), ask to enable them."
     - If skipped: "ℹ️  Existing `mcp` block in `opencode.json` was preserved (not modified)"

9. **Create project identity structure** (enables safe future updates):

   a. **Create project identity directory:**
   ```bash
   mkdir -p .opencode/rules/project
   ```

   b. **Create README:** `.opencode/rules/project/README.md` — short stub explaining the directory holds only `metadata.json` and pointing to `docs/core/CUSTOMIZATION.md` for the project adaptation model.

   c. **Create configuration file:**
   - `.opencode/rules/project/metadata.json` — Project metadata (name, repository, environments, template_version).

   d. **DO NOT create** `.opencode/rules/project/.templates/`, `docs/project/.templates/`, or `.opencode/commands/.templates/`. Removed in v3.0.0. Project adaptation is done via:
   - editing APM-installed primitives in place under `.opencode/agents/`, `.opencode/commands/`, `.agents/skills/<id>/` (project-owned, survive `/update-workplace`),
   - the `Project Conventions` section of root `AGENTS.md`,
   - per-skill `project-config.json` + `references/guidelines.md`.

   Custom commands, when truly needed, are added directly under `.opencode/commands/` (no `project-` prefix), shipped inside an APM package's `<id>/.apm/commands/` (in the Workplace-Agent-Packages repo), or scaffolded with `/package-new` for a brand-new package.

   e. **Finalize `.opencode/rules/.core-version.json`:**
   
   **If file already exists** (template was copied with version file):
   - Run the Phase 8 hash script instead of calculating hashes manually:
     ```powershell
     powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/compute-hashes.ps1 -Apply
     ```
   - If the script reports missing files, inspect each path. Only when every missing file is expected/optional, rerun with:
     ```powershell
     powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/compute-hashes.ps1 -Apply -AllowMissing
     ```
   - The script updates `initializationStatus` from `"fresh"` to `"active"`, updates `lastUpdate`, and computes SHA-256 hashes for all files listed in `coreFiles`
   
   **If file doesn't exist** (legacy scenario):
   Create the file with full structure:
   
   ```json
   {
     "version": "1.5.0",
     "initializationStatus": "active",
     "templateName": "NC AI Workplace",
     "lastUpdate": "[Current ISO timestamp]",
     "description": "Core template version tracker - DO NOT MODIFY MANUALLY",
     "coreFiles": {
       ".opencode/skills/project-initialization/SKILL.md": {
         "hash": "[calculated SHA-256]",
         "lastModified": "[Current ISO timestamp]"
       },
       ".opencode/rules/development.md": {
         "hash": "[calculated SHA-256]",
         "lastModified": "[Current ISO timestamp]"
       }
       // ... all other Core files with calculated hashes
     },
     "migrations": {
       "applied": [],
       "available": []
     },
     "notes": "This file tracks Core template version and file integrity. Used during project updates to detect modifications."
   }
   ```
   
   **Hash Calculation:** For each file in `coreFiles`, use the Phase 8 script output. Hashes use the existing manifest format: lower-case 64-character hex (no `sha256-` prefix). Optional files that are absent may be recorded as `"missing"` only after explicit `-AllowMissing`.
   
   **Encoding requirement (CRITICAL):** `.core-version.json` MUST be written as **UTF-8 without BOM**. Use the `Write` tool (preferred) or Node `fs.writeFileSync(..., 'utf-8')`. Do **NOT** use PowerShell `Set-Content -Encoding utf8` or `Out-File -Encoding utf8` on Windows PowerShell 5.1 — they prepend `EF BB BF`, and PowerShell's default `Get-Content` can corrupt UTF-8 text during a JSON round trip. The docs stop-hook tolerates a leading BOM, but producers must still avoid creating one. If a PowerShell write is unavoidable, use the BOM-free form:

   ```powershell
   $utf8NoBom = New-Object System.Text.UTF8Encoding $false
   [System.IO.File]::WriteAllText($absolutePath, $json, $utf8NoBom)
   # On PowerShell 7+ only: Set-Content -Encoding utf8NoBOM ...
   ```

   **VALIDATION:** After updating `.core-version.json`, verify:
   - [ ] `initializationStatus` is `"active"` (not `"fresh"`)
   - [ ] ALL entries in `coreFiles` have lower-case 64-character hex hash values, or `"missing"` for absent optional files (no `"pending"` values)
   - [ ] `lastUpdate` has current ISO timestamp
   - [ ] File is UTF-8 **without** BOM — check first byte is `{` (0x7B), not `EF BB BF`. Quick check:
     ```powershell
     $b = [System.IO.File]::ReadAllBytes('.opencode/rules/.core-version.json')[0..2]
     if ($b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) {
       Write-Error 'core-version.json has a BOM — rewrite as UTF-8 without BOM.'
     }
     ```

   If any hash remains `"pending"`, the update workflow will not function correctly. Retry hash calculation for failed files.
   
   g. **Track status:** Note that Core/Project structure was created and version file finalized

9.5. **Core Context Skill Setup (UNCONDITIONAL HARD GATE)**

   Quick Init does NOT activate any role pack and does NOT configure role-specific context skills, BUT it MUST set up the two universal core context skills that ship with the Workplace Core. This step runs even if no language/framework is detected and even if `coding-standards-context/` or `infrastructure-context/` already exist.

   For each entry in `coreContextSkills`:

   | Core skill | Path |
   |---|---|
   | `coding-standards-context` | `.opencode/skills/coding-standards-context/` |
   | `infrastructure-context` | `.opencode/skills/infrastructure-context/` |

   Steps for each:

   1. If `project-config.json` exists with `"initialized": true`: skip configuration, jump to verification (step 4 below).
   2. Run Reflection Step 0 for the skill ([`phase-6/part-2-domain-skills.md`](phase-6/part-2-domain-skills.md)): derive every field from the stack scan and the explore report, write defaults as `auto-filled — default`, and ask at most the TDD-policy question for `coding-standards-context` ([`phase-6/part-3-guidelines.md`](phase-6/part-3-guidelines.md) → TDD policy fields). The agent MUST NOT skip the skill entirely.
   3. Generate `references/guidelines.md` from `references/template.md` + the just-filled `project-config.json` (Part 3 rendering).
   4. Verify (Part 3.5) — full procedure in [`configuration-updates.md`](configuration-updates.md) Part 3.5, including **English-only** checks:
      - `project-config.json` `initialized: true`
      - `references/guidelines.md` exists, non-empty, and contains zero `{{PLACEHOLDER}}` tokens
      - All human-readable strings in both files are **English** (translate user answers when persisting; keep paths, URLs, identifiers literal)
   5. **Hard gate:** if verification fails, abort Quick Init at this step. Do NOT proceed to step 10 (codebase analysis) or step 11 (AGENTS.md generation). Report the failed skill, its `project-config.json` status, and how to retry.

   This guarantees that even projects bootstrapped via Quick Init have the two universal context guidelines ready for AI agents to read at runtime.

10. **Codebase Analysis via Explore Subagent** (Mandatory before AGENTS.md generation):

   > **CRITICAL:** Before generating AGENTS.md, the agent MUST launch the built-in **`explore` subagent** as a blocking `Task` call (never `background: true`) to analyze the project codebase. This ensures AGENTS.md contains the most comprehensive and accurate project information.

   **Why this is mandatory:**
   - Quick Init does NOT perform full Phase 3-5 analysis (stack detection, requirements gathering, codebase analysis)
   - Without deep analysis, AGENTS.md would rely only on shallow auto-detection (package.json, lock files, directory names)
   - The Explore subagent can discover architecture patterns, API endpoints, key conventions, testing patterns, and project structure that significantly improve AGENTS.md quality
   - Context isolation: all intermediate scanning output stays in the Explore subagent's context, keeping the main agent's context clean for AGENTS.md generation

   **Explore Subagent Invocation:**

   ```
   Task tool call:
     subagent_type: "explore"
     description: "Codebase analysis for AGENTS.md generation"
     prompt: [Detailed analysis prompt - see template below]
   ```

   Blocking call — `AGENTS.md` generation happens in the same turn. `explore` is read-only by construction; the prompt template below carries the no-modification constraint instead. Quick Init is the one delegation that returns its report **in the reply** rather than writing artifacts — see [`subagent-contract.md`](subagent-contract.md) §3.

   **Explore Prompt Template for Quick Init:**

   ```
   Perform a thorough codebase analysis of the project at [WORKSPACE_PATH] to gather information for generating comprehensive AGENTS.md file(s).

   Analyze and return a structured report covering:

   ## 1. Project Overview
   - Read package.json: name, description, version, scripts, dependencies, devDependencies
   - Read README.md: project description, setup instructions, architecture notes
   - Detect package manager from lock files (pnpm-lock.yaml, yarn.lock, bun.lockb, package-lock.json)
   - Identify project type: frontend, backend, full-stack, library, monorepo, CLI tool

   ## 2. Technology Stack
   Categorize all dependencies:
   - Framework (React, Vue, Angular, Svelte, Next, Nuxt, Express, NestJS, FastAPI, etc.)
   - Build tool (Vite, Webpack, Rollup, esbuild, etc.)
   - State management (Redux, Zustand, Pinia, MobX, etc.)
   - Styling (Tailwind, Styled Components, Sass, CSS Modules, etc.)
   - Testing (Vitest, Jest, Playwright, Cypress, etc.)
   - Data fetching (Axios, React Query, SWR, Apollo, tRPC, etc.)
   - UI libraries (MUI, Ant Design, Radix, Shadcn, etc.)
   - Key utilities and their purpose

   ## 3. Project Structure & Architecture
   - Map folder structure with file counts per directory
   - Classify architecture pattern (feature-sliced, atomic, modular, page-based, flat)
   - Identify entry points (index.html, main.tsx, server.ts, App.tsx, etc.)
   - Detect monorepo structure (packages/, apps/, workspaces)
   - Map important directories: components, pages, services, hooks, utils, api, store, types, tests, assets

   ## 4. Code Patterns & Conventions
   - Component patterns (functional vs class, hooks, composition API)
   - Naming conventions (PascalCase components, camelCase utils, etc.)
   - File organization (co-located tests, barrel exports, index re-exports)
   - Error handling patterns
   - Linting/formatting config (.eslintrc, .prettierrc, biome.json, .editorconfig)
   - TypeScript config (strict mode, path aliases, etc.)
   - Commit conventions (commitlint, .commitlintrc, conventional commits)

   ## 5. API & Integrations
   - Internal API endpoints (route definitions, controllers, API handlers)
   - External API integrations (SDK imports, HTTP client usage, third-party services)
   - API specifications (OpenAPI, GraphQL schemas, Protobuf)
   - Authentication patterns (JWT, OAuth, session, API keys)
   - Environment variables from .env.example or .env.sample

   ## 6. Testing Approach
   - Test framework and runner detected
   - Test file patterns and locations
   - Approximate test-to-source ratio
   - E2E test setup (if any)
   - Test utilities and helpers
   - Coverage configuration

   ## 7. Development Workflow
   - Available npm/package scripts and their purpose
   - CI/CD configuration (.github/workflows, gitlab-ci, etc.)
   - Docker setup (Dockerfile, docker-compose)
   - Development server configuration
   - Build and deployment setup

   ## 8. Key Files & Important Patterns
   - Configuration files that affect development (tsconfig, eslint, vite config, etc.)
   - Key business logic locations
   - Shared utilities and helpers
   - Constants and type definitions
   - Files that developers frequently need to understand

   Return a structured report with all findings organized by section, at most 150 lines.
   Include specific file paths where possible. Return concrete names and counts — generic
   phrasing ("uses a database", "standard error handling") is a failed result; where you
   cannot find a concrete name, say "not found".
   Focus on information that would be most useful for an AI coding agent to understand
   the project conventions, patterns, and structure.

   CONSTRAINT: do not modify, create or delete any file. Do not ask the user anything.
   Do not dispatch further subagents.
   ```

   **Processing Explore Results:**

   After receiving the Explore subagent's report:
   1. **Extract key project information** — technology stack, architecture, conventions, API details
   2. **Prepare enriched context** for AGENTS.md generation dialogue
   3. **Pre-populate detection data** with Explore findings instead of relying only on shallow auto-detection
   4. **Include architecture insights** in the AGENTS.md Project Structure section
   5. **Include API information** in the AGENTS.md API Docs section
   6. **Include testing patterns** in the AGENTS.md Testing section
   7. **Include coding conventions** detected from actual code patterns in Do/Don't sections
   8. **Present enriched detection** to user during the dialogue (so user can confirm/override)

11. **Generate AGENTS.md files** (Dynamic Generation with the adaptive 7-field Root Dialogue, Enriched by Explore Analysis):
   
   **Template Reference:** Use [agents-template.md](agents-template.md) — read its **Brevity Principle**, **Mandatory Dialogue Mechanics**, and **Phase 1 Dialogue Questions Catalog (7 fields, 0–5 surfaced)** before starting.
   
   a. **Enriched Auto-Detection Phase** (no user interaction): Use the Explore subagent analysis from step 10 as the primary data source for *every* detection field, including the new ones — architecture pattern (folder layout + entrypoints + monorepo signals) and constraints (`engines`, `browserslist`, `Dockerfile` base image, `tsconfig.target`, security configs). Supplement with: package manager (lock files), dev commands (package.json scripts), project description (package.json/README), component detection (monorepo, frontend, backend, API, shared).
   
   b. **Root AGENTS.md Dialogue — 7 fields, 0–5 surfaced prompts** (Explore-enriched defaults; a field is never dropped silently):
      1. **Project description** (≤ 240 chars) — Explore default; Enter to keep or override.
      2. **Architecture style** — label + 1 line per major layer (Explore default from architecture map).
      3. **Do's** — 3-7 short bullets (Explore default from deps/configs/code patterns).
      4. **Don'ts** — 3-7 short bullets (Explore default from detected anti-patterns).
      5. **Constraints & Non-Goals** — 3-7 bullets (perf budgets, runtime/browser support, compliance, dep allowlist, legacy systems, out-of-scope). MUST be non-empty; if Explore default is `[?]`, the user must supply a value or explicit `skip: <reason>`.
      6. **Code style + commit format** — 1-2 lines (Explore default from `.eslintrc`/`.prettierrc`/commitlint).
      7. **Project structure pointers** — 5-10 key paths (Explore default from architecture analysis).
      
      All 7 fields must be resolved: HIGH-confidence defaults are written silently (recorded as `auto-accepted from <source>`), MEDIUM ones are shown inline for Enter-to-accept, LOW ones are asked — at most 5 prompts, batched into one interaction (agents-template.md → Adaptive dialogue mechanics). Only Q3 and Q5 accept `skip: <one-line reason>` (recorded in `Project Conventions`). Package manager, dev commands, build/test scripts are auto-detected — never asked.
   
   c. **Apply the 5-line spillover rule** for every answer (see agents-template.md → Brevity Principle): if any answer renders longer than its hard limit, place a 1-3 line summary in AGENTS.md and append the full content to an **already-present** canonical channel (Quick Init never creates `docs/project/*.md` files):
      - Architecture detail → `Project Conventions → ### Architecture` subheading inside the same AGENTS.md (seeded empty by step e below; always present).
      - Coding rules → `.opencode/skills/coding-standards-context/references/guidelines.md` (rendered in step 9.5; always present after Quick Init).
      - Infra / runtime / deployment rules → `.opencode/skills/infrastructure-context/references/guidelines.md` (rendered in step 9.5; always present after Quick Init).
      - Constraints / non-goals → `Project Conventions → ### Constraints` subheading; domain-specific limits go to the matching core-context guideline above.
      - Domain rules that need a domain context skill from an APM package (frontend/backend/api/db/testing/performance) → leave a `TODO: install <package> via apm install (or re-run /initialize with the matching role) to move this rule to <skill>/guidelines.md` line in `Project Conventions`. Quick Init installs only packages accepted in Step 4.5 (role-agnostic, or detection-driven per b.1) and never renders `*-context/guidelines.md` for package-shipped context skills — that remains `/initialize` Phase 6 territory.
      - **`docs/project/ARCHITECTURE.md` / `docs/project/STACK.md` / `docs/project/CONTRIBUTING.md` are NEVER created by Quick Init.** They are optional Phase 7 Part 3 outputs of full `/initialize` only. Do not write them, do not link to them.
   
   d. **Nested Components Dialogue** (if components detected by Explore): Offer to create nested AGENTS.md for each; for each selected, resolve purpose, key patterns and extra setup from the Explore report and prompt only for fields with no usable signal, all components in one batched prompt.
   
   e. **Generation:** Load template from agents-template.md; populate Do, Don't, **Architecture (TL;DR)**, **Constraints & Non-Goals**, Commands, Safety and Permissions, Project Structure (≤ 10 lines, full map → `docs/INDEX.md`), Good and Bad Examples, API Docs, PR Checklist, When Stuck, Testing; include security section for root, backend, and api components; write files to detected locations. If Step 4.5 installed packages, the generated `AGENTS.md` must include the `<!-- apm:start -->` / `<!-- apm:end -->` managed-section pair (from `agents-template.md`) and `apm.yml` must carry `compilation.agents_md.mode: managed_section` — `apm compile` owns only the region between the markers; edit only Workplace-managed sections outside them (same rule as `/initialize` Phase 7).
   
   f. **Mandatory `Project Resource Map` block** — when populating the root AGENTS.md, the agent MUST emit the `Project Resource Map (read first)` block from [agents-template.md](agents-template.md) verbatim, immediately after the `> See https://agents.md` blockquote. The block forward-references `docs/INDEX.md` (created in step 11.5 below). Skipping the block invalidates Quick Init.
   
   g. **Mandatory `Additional Resources` first bullet** — must be `docs/INDEX.md` with label "Central documentation index — start here".
   
   h. **Brevity audit before write:** count lines per section in the rendered AGENTS.md against the Brevity Principle hard-limit table. If any section is over the limit, run another spillover pass before writing the file.
   
   i. **Track status:** List created AGENTS.md files (root and any nested), confirm that no `docs/project/*.md` files were created (Quick Init must not), and report any `skip:` reasons recorded in `Project Conventions` along with the `Project Conventions` subheadings populated by spillover (e.g., `### Architecture`, `### Constraints`).

11.5. **Generate minimal `docs/INDEX.md` (UNCONDITIONAL HARD GATE)**
   
   Even though Quick Init does not run Phase 7.5, it MUST materialize a minimal `docs/INDEX.md` so the `Project Resource Map` link in AGENTS.md resolves immediately.
   
   **Inventory (only what Quick Init produces or preserves):**
   - `README.md`
   - `AGENTS.md` (just generated)
   - `opencode.json`
   - `opencode.json`
   - `.opencode/rules/.core-version.json`
   - `.opencode/rules/development.md` (if shipped/present)
   - `.opencode/skills/coding-standards-context/references/guidelines.md` (rendered in step 9.5)
   - `.opencode/skills/infrastructure-context/references/guidelines.md` (rendered in step 9.5)
   - any pre-existing `docs/*.md` files discovered by listing
   
   **Format:** Use the same INDEX.md layout as [`documentation.md` Step 2](documentation.md), but with a header note:
   
   ```
   > Minimal index generated by /quick-init.
   > Run /initialize to regenerate the full discovery-based index (Phase 7.5).
   ```
   
   **Hard gate (link integrity):**
   - `docs/INDEX.md` exists on disk after this step.
   - Root `AGENTS.md` contains the literal `docs/INDEX.md` at least **twice** (Resource Map block + Additional Resources). If the count is < 2, fix AGENTS.md before completing Quick Init.

11.6. **Record the docs-sync baseline (last write of the run)**

   Step 9.e set `initializationStatus` to `active`, and everything Quick Init wrote afterwards is uncommitted — exactly the state in which the docs-sync plugin recommends `/docs-sync` on the first idle. Run via the Shell tool, after every other file write:

   ```bash
   node .opencode/hooks/docs-sync-check.js --record-state
   ```

   This records the generated files (and their blob hashes) plus the current `HEAD` as the plugin's baseline; only changes made after Quick Init can trigger a recommendation.

12. **Remove from Context Window** - Quick Init workflow complete — no rule frontmatter changes needed in the new skill-based architecture

### Full Project Initialization

For comprehensive project setup with technology stack configuration and domain skill configuration, see [Project Initialization Skill](../SKILL.md).

**Trigger:** "Initialize my project" with `.opencode/project_init.md` in context

**Features:**
- Interactive Q&A for project metadata and technology stack
- Codebase analysis for existing projects
- Dynamic rule updates based on chosen technologies
- MCP configuration
- Documentation generation

---

## What NOT to Include in Quick Template Setup

- **Do NOT ask about developer roles** — No role selection; use Full Initialization for that
- **Do NOT offer role-bound packages *by role*** — Phase 1.7-APM (role-matched packs, Pass A.5) is skipped entirely; no role-specific agents/commands/skills are deployed into `.opencode/` on the strength of a role, because Quick Init never asks for one. Step 4.5 may offer exactly two things: role-agnostic packages (empty `targetRoles`, resolved live from the catalogue) and, per Step 4.5.b.1, the package owning a domain the **stack scan actually detected**, labelled with its evidence. Detection is not role selection: it offers what the repository demonstrably contains. If the user declines the whole Step 4.5 offer, the project's `apm.yml` is **not** created by Quick Init; the user runs full `/initialize` later to add packages.
- **Do NOT add role-specific MCP servers** — Only base MCP (Context7, Atlassian, TaskMaster, Chrome DevTools)
- **Do NOT create `.opencode/commands/.templates/`** — Synthetic command generation has been removed
- **Do NOT configure role-specific context skills** — Only the two core context skills (`coding-standards-context`, `infrastructure-context`) are configured in step 9.5
- **Do NOT set up TaskMaster** — This is a separate workflow that requires explicit user request
- **Do NOT create PRDs** — Project Requirements Documents are separate from template setup
- **Do NOT copy `.env.example` to `.env`** — Only do this if user specifically requests TaskMaster CLI setup
- **Do NOT initialize git repository** — Template initialization is separate from git setup
- **Do NOT create tasks or project management files** — Focus only on template structure

## What QUICK INIT MUST Do (Hard Requirements)

- ✅ Configure and verify both `coreContextSkills` (`coding-standards-context`, `infrastructure-context`) — step 9.5 — **even if no relevant tech is detected**
- ✅ Block completion if either core `guidelines.md` is missing or contains `{{PLACEHOLDER}}` tokens, or if either core context file has **non-English** explanatory text (see `configuration-updates.md` Part 3.5)
- ✅ Resolve **all 7 AGENTS.md fields** (step 11.b) — each auto-accepted with a recorded source, answered, or `skip: <reason>` (Q3 Do's and Q5 Constraints only); at most 5 prompts, never a silently dropped field
- ✅ Root AGENTS.md must contain non-empty `Architecture (TL;DR)` and `Constraints & Non-Goals` sections (3-7 lines/bullets each)
- ✅ Apply the 5-line spillover rule for every answer (step 11.c) — long answers MUST move to an **already-present** canonical channel (`Project Conventions` subheading or one of the two core-context `guidelines.md`) with a link left in AGENTS.md. Quick Init MUST NOT create `docs/project/*.md` files.
- ✅ Brevity audit (step 11.h) — no AGENTS.md section may exceed its Brevity Principle hard limit
- ✅ Emit the `Project Resource Map (read first)` block at the top of root AGENTS.md (step 11.f)
- ✅ First bullet of `Additional Resources` in root AGENTS.md must be `docs/INDEX.md` (step 11.g)
- ✅ Generate minimal `docs/INDEX.md` so the AGENTS.md → INDEX.md forward link resolves (step 11.5)
- ✅ Block completion if root AGENTS.md does not contain the literal `docs/INDEX.md` at least twice, or if `docs/INDEX.md` is missing
- ✅ Record the docs-sync baseline (step 11.6) as the last write of the run — the first idle after Quick Init must not recommend `/docs-sync` for the files Quick Init generated
- ✅ Attempt Phase 0 (APM CLI bootstrap, Step 0) first — a graceful skip with a printed notice and `apmAvailable=false` is allowed; silently omitting the step is not
- ✅ IF the user accepted packages in Step 4.5: `apm.lock.yaml` must exist and list every accepted package before completion is reported; the temp selection file (`.opencode/.temp-apm-selection.json`) must be removed regardless of the outcome (accepted, declined, or fetch failed)
