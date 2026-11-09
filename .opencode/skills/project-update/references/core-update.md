# Core Update (Phase 4)

> Copy Core files from the cloned template to the project, replacing old Core versions.

## Template Source

All files are copied from the cloned template directory:

```
templateSource = ".opencode/.temp-update/"
```

## Step 1: Update Core Rules

```bash
# Overwrite Core rule files with template versions
cp ${templateSource}.opencode/rules/*.md .opencode/rules/
cp -r ${templateSource}.opencode/rules/taskmaster/ .opencode/rules/taskmaster/

# If template has additional rule subdirectories, copy them
# (but NEVER touch .opencode/rules/project/ — that's user-owned)
```

**Critical:** Do NOT copy anything into `.opencode/rules/project/`. That directory is entirely user-owned.

## Step 1.5: Update the Core Config Layer

```bash
# The Core configuration layer is a Core file (always-on instructions, subagent depth, Core read denials).
# The root opencode.json is project-owned (MCP servers, model, watcher, permissions, project instructions)
# and is NEVER touched by the update.
cp ${templateSource}.opencode/opencode.json .opencode/opencode.json
```

**Restart note:** OpenCode reads configuration once at startup — a refreshed Core layer takes effect at the next `opencode` start; say so in the update report.

## Step 2: Update Agents

```bash
# Overwrite Core agent definitions
# Copy only files that are NOT prefixed with "project-"
for file in ${templateSource}.opencode/agents/*.md; do
  basename=$(basename "$file")
  if [[ "$basename" != project-* ]]; then
    cp "$file" .opencode/agents/
  fi
done
```

> **Scope.** The Core template ships only cross-functional agents (`initializer`, `documentation-sync`, `infra-specialist`, `project-updater`, `codebase-analyzer`). All role-specific agents — including `security-auditor` since v4.4.0 (now shipped by the `nc-code-security-audit` APM package) — are deployed by APM from each package's `<id>/.apm/agents/` (in the Workplace-Agent-Packages repo) into `.opencode/agents/` and are refreshed in **Step 3.5** below — not from this `cp` step. APM-deployed agents are project-owned (not in `coreFiles`) and survive Core copies.

## Step 3: Update Skills

```bash
# For each Core skill directory in the template. Only .opencode/skills/ is touched here:
# .agents/skills/ holds package skills, refreshed by Step 3.5 and never by this loop.
for dir in ${templateSource}.opencode/skills/*/; do
  dirname=$(basename "$dir")
  # Skip project-prefixed skill directories
  if [[ "$dirname" == project-* ]]; then
    continue
  fi
  # Copy SKILL.md and references/ from template
  cp "${dir}SKILL.md" ".opencode/skills/${dirname}/SKILL.md"
  if [ -d "${dir}references/" ]; then
    cp -r "${dir}references/" ".opencode/skills/${dirname}/references/"
  fi
  if [ -d "${dir}assets/" ]; then
    cp -r "${dir}assets/" ".opencode/skills/${dirname}/assets/"
  fi
  if [ -d "${dir}scripts/" ]; then
    cp -r "${dir}scripts/" ".opencode/skills/${dirname}/scripts/"
  fi
  # NEVER overwrite project-config.json — it's user-owned
done
```

**Critical:** Never overwrite `project-config.json` files inside skill directories. Also never overwrite `references/guidelines.md` — that file is project-specific and protected like `project-config.json`.

> **`scripts/` must be copied.** Every Core gate an initialization or a migration shells out to — `compute-hashes.ps1`, `prepare-apm-packages.ps1`, `validate-apm-install.ps1`, `verify-apm-activation.ps1`, `check-guidelines-specificity.js`, `validate-analysis.js`, `validate-doc-links.js` — lives in `.opencode/skills/project-initialization/scripts/`. Without this branch an updated project keeps the previous release's scripts (or lacks the new ones entirely) while the migrations registered in Phase 2 invoke them by path, so the update reports success and every gate it just promised silently fails to run.

> **Scope of that guarantee.** It binds *this* step (the Core copy) only. The APM refresh in Step 3.5.b below re-runs `apm install` through the install wrapper: APM redeploys everything its packages own — including the `project-config.json` of every role-pack `*-context` skill, because that file ships inside the package (e.g. `frontend-developer/.apm/skills/frontend-context/project-config.json`) — and the wrapper then restores the initialized `project-config.json` and rendered `references/guidelines.md` from its pre-install snapshot (each logged as `preserved:`).

> **Scope.** Only Core context skills (`coding-standards-context`, `infrastructure-context`) and Core utility skills (`project-initialization`, `project-update`, `apm-packaging`, `documentation-management`, `codebase-analysis`, `code-quality-standards`) are written by this step. APM-installed skills (e.g., `frontend-context`, `testing-context`, `tdd-workflow`, `quality-check`, `security-compliance`, …) live in each package's `<id>/.apm/skills/` (in the Workplace-Agent-Packages repo) and are deployed into `.agents/skills/<id>/` by `apm install` — refreshed in **Step 3.5** below.

## Step 3.5: Refresh APM-Installed Packages

> Packages are APM packages living as `<id>/` at the root of the standalone **Workplace-Agent-Packages** repo; the project's `apm.yml` (written by Phase 1.7-APM) lists them as dict-form git dependencies and pins `targets: [opencode]`. This step re-runs the install so that package primitives (`.opencode/agents/`, `.opencode/commands/`, `.agents/skills/`) follow the refreshed Core, **without** losing what initialization wrote into the package skills. Skip the whole step with a notice when the project has no `apm.yml` (Quick Init without accepted packages, or Phase 1.7-APM skipped).

### Step 3.5.a — Pre-refresh check

```powershell
powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/validate-apm-install.ps1 -PreInstall
```

Exit 1 means a poisoned `apm.lock.yaml` entry (`package_type: invalid`, empty-input hash) or an empty `apm_modules/` tree. Apply the printed remediation **before** refreshing: an install over a poisoned entry exits 0, restores nothing and deletes the package's deployed files as stale (verified on APM 0.28.0).

### Step 3.5.b — Refresh APM primitives (every update)

```bash
# The wrapper runs `apm install` and:
#   - refuses to start unless apm.yml declares `targets: [opencode]` (otherwise a
#     machine default could redirect the deploy into another harness's tree);
#   - snapshots every initialized .agents/skills/<name>/project-config.json and
#     rendered references/guidelines.md and restores them after the install —
#     a plain `apm install` overwrites the initialized config with the package copy
#     (verified on APM 0.28.0); every restored file is logged as `preserved:`;
#   - reports packages APM skipped for target incompatibility.
#
# APM has NO interactive per-file conflict prompt. Collisions are reported in a
# grouped diagnostic summary at the END of the run; --force (never used here) would
# overwrite locally-authored files outright. The agent MUST surface that summary to
# the user verbatim, together with the wrapper's `preserved:` lines, so the user can
# re-apply any other lost hand-edit. Durable customizations belong in the project's
# own .apm/ directory — see docs/core/CUSTOMIZATION.md Channel 1b.
node .opencode/skills/project-initialization/scripts/apm-install-preserving.js
```

Then the post-refresh health gate:

```powershell
powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/validate-apm-install.ps1
```

Exit 1 means a required context skill is missing or empty after the refresh (package skipped for target incompatibility, or removed from the catalogue) — apply the printed remediation before continuing with Step 4. Then re-run Phase 6 Part 3.5 for every `*-context` skill listed in `apm.lock.yaml` (`x-workplace.contextSkills`) plus the two `coreContextSkills`: an updated package may ship a new `references/template.md`, and the rendered `guidelines.md` must still cite the project's concrete names.

**Restart note:** OpenCode loads package agents, commands and skills at startup — after this step, tell the user to restart OpenCode.

## Step 4: Update Commands

```bash
# Copy Core commands (non-project-prefixed)
for file in ${templateSource}.opencode/commands/*.md; do
  basename=$(basename "$file")
  if [[ "$basename" != project-* ]]; then
    cp "$file" .opencode/commands/
  fi
done

# NOTE: there is no `.opencode/commands/.templates/` and no synthetic command
# generation on this line. Role-specific commands ship inside APM
# packages (each package's `<id>/.apm/commands/` in the Workplace-Agent-Packages
# repo) and are deployed into `.opencode/commands/` by `apm install` (re-run in
# Step 3.5.b above). This `cp` loop refreshes ONLY Core commands shipped by the
# Workplace template itself.
```

## Step 4.5: Update the Docs-Sync Plugin and Analysis Script

> `.opencode/plugins/docs-sync.js` (the plugin OpenCode loads at startup) and `.opencode/hooks/docs-sync-check.js` (the analysis library it imports — also the `--check` / `--record-state` CLI) are Core-owned files listed in `coreFiles` and are delivered by this step on every update. There is no hook registration file to patch: OpenCode auto-discovers every file under `.opencode/plugins/`.

### Step 4.5.a — Copy the plugin and the analysis script

```bash
# Create the directories if the user deleted them entirely
mkdir -p .opencode/hooks/ .opencode/plugins/

# Copy only the Core-owned scripts — never .docs-sync-state.json (runtime state)
# or docs-sync-config.json (project-owned: the user's `enabled` choice from
# Phase 0.5 plus the additive detection patterns from Phase 3)
cp "${templateSource}.opencode/hooks/docs-sync-check.js" .opencode/hooks/
cp "${templateSource}.opencode/plugins/docs-sync.js" .opencode/plugins/
```

**Critical:** Do NOT copy `.docs-sync-state.json` or `docs-sync-config.json` even if they happen to exist under `${templateSource}.opencode/hooks/` — the former is runtime state, the latter is project-owned. Do NOT remove other files under `.opencode/plugins/` — a project may ship plugins of its own there.

### Step 4.5.b — Respect the user's `enabled` flag

`docs-sync-config.json → "enabled": false` is the recognized idiom for "[B] Disable" chosen in Phase 0.5 Part 1.7. Never flip it during an update. When the file is absent the plugin is enabled by default — do not create the file.

### Step 4.5.c — Guard against a stale `coreFiles` entry

Both scripts are listed in `coreFiles` (`hash: "pending"` in the seed manifest). On a project initialized from an older 5.x release, [`detection-and-backup.md` Step 5](detection-and-backup.md) may report the plugin as missing — treat that as "restore in this step", not as a failed integrity check.

**Restart note:** OpenCode loads plugins at startup — a refreshed plugin file takes effect at the next `opencode` start; tell the user in the update report.

## Step 5: Update Core Documentation

```bash
# Core docs
if [ -d "${templateSource}docs/core/" ]; then
  cp ${templateSource}docs/core/*.md docs/core/
  cp ${templateSource}docs/core/*.html docs/core/ 2>/dev/null || true
fi

# Root-level Core docs (under docs/)
for file in GETTING_STARTED.md ARCHITECTURE.md PRESENTATION.md; do
  if [ -f "${templateSource}docs/${file}" ]; then
    cp "${templateSource}docs/${file}" docs/
  fi
done

# Changelog at project root
if [ -f "${templateSource}CHANGELOG.md" ]; then
  cp "${templateSource}CHANGELOG.md" .
fi
```

## Step 6: Update Project Templates

```bash
# Update templates (these are starter templates, not user content)
if [ -d "${templateSource}.opencode/rules/project/.templates/" ]; then
  cp -r ${templateSource}.opencode/rules/project/.templates/ .opencode/rules/project/.templates/
fi
```

## Step 7: Smart Merge for `project_init.md`

`.opencode/project_init.md` contains both Core and Project sections (the section names below are the ledger's actual headings). Apply a smart merge:

### Section Classification

```markdown
## How This Works (CORE)                    → Replace with template version
## Source-of-Truth Map (CORE)               → Replace with template version
## Initialization State (PROJECT)           → Preserve current content
## Artifact Pointers (PROJECT)              → Preserve current content
## Phase Checklist (PROJECT)                → Preserve ticks; adopt new phase lines from the template only if a phase was added
## Supplemental Source Manifest (PROJECT)   → Preserve current rows
## User Answers & Decision Log (PROJECT)    → Preserve current content verbatim
## Open Gaps (PROJECT)                      → Preserve current content
## Initialization Summary (PROJECT)         → Preserve; append one line to ### Update History
```

### Merge Logic

1. **Read current file** — extract all PROJECT-marked sections
2. **Read template file** — get updated CORE sections
3. **Merge:** CORE sections from template + PROJECT sections from current
4. **Append to Notes:** `"Updated to template version [X.Y.Z] on [date]"`

## Step 8: Update Version File

Update `.opencode/rules/.core-version.json` with new version data from the template:

```javascript
const newCoreVersion = JSON.parse(
  readFile(`${templateSource}.opencode/rules/.core-version.json`)
);

// Keep initialization status as "active" (project is initialized)
newCoreVersion.initializationStatus = "active";
newCoreVersion.lastUpdate = new Date().toISOString();

// Recalculate hashes for all Core files
for (const [filePath, fileInfo] of Object.entries(newCoreVersion.coreFiles)) {
  if (fileExists(filePath)) {
    fileInfo.hash = calculateHash(readFile(filePath));
    fileInfo.lastModified = new Date().toISOString();
  }
}

// Preserve applied migrations from current, add any new ones
const currentMigrations = currentVersion.migrations.applied;
newCoreVersion.migrations.applied = [
  ...currentMigrations,
  ...newlyAppliedMigrations
];

// Persist template source so next update can pre-fill URL and branch
newCoreVersion.templateSource = {
  url: usedUrl,                       // set in git-source-setup.md Step 4
  branch: usedBranch || null          // null if default branch was used
};

writeFile('.opencode/rules/.core-version.json', JSON.stringify(newCoreVersion, null, 2));
```

**Encoding requirement (CRITICAL):** `.core-version.json` MUST be written as **UTF-8 without BOM**. Use the `Write` tool or Node `fs.writeFileSync(..., 'utf-8')`. Do **NOT** use PowerShell `Set-Content -Encoding utf8` / `Out-File -Encoding utf8` on Windows PowerShell 5.1 — they prepend `EF BB BF`, and PowerShell's default `Get-Content` can corrupt UTF-8 text during a JSON round trip. The docs stop-hook tolerates a leading BOM, but producers must still avoid creating one. Portable BOM-free PS form when shell write is unavoidable:

```powershell
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($absolutePath, $json, $utf8NoBom)
# PowerShell 7+ only: Set-Content -Encoding utf8NoBOM ...
```

## Phase 4 Output

```
✅ Core files updated (Phase 4 complete)

Updated:
- Core config layer (.opencode/opencode.json)
- [N] Core rules
- [N] agent definitions
- [N] skill files
- [N] commands
- docs-sync plugin + analysis library
- [N] documentation files
- Version file updated to [newVer]

Proceeding to preservation verification...
```
