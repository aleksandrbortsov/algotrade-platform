# Version Detection & Backup (Phases 0-1)

> Determine update type, check for modifications, and create a full backup before any changes.

## Phase 0: Version Detection & Update Type

### Step 1: Read Current Version

```javascript
const currentVersion = JSON.parse(readFile('.opencode/rules/.core-version.json'));
const currentVer = currentVersion.version; // e.g., "2.0.0"

const templateSource = '.opencode/.temp-update/';
const templateVersion = JSON.parse(
  readFile(`${templateSource}.opencode/rules/.core-version.json`)
);
const newVer = templateVersion.version;
```

### Step 2: Determine Update Type

```
Parse versions as [major.minor.patch]:

- Patch (2.0.0 → 2.0.1): Bug fixes only, no structural changes, safe automatic update
- Minor (2.0.0 → 2.1.0): New features, backward compatible, may need config review
- Major (2.0.0 → 3.0.0): Breaking changes, structure modifications
- Same-version content update (2.0.0 → 2.0.0, different branch/commit):
    Version number unchanged but source differs (e.g. different branch or tag).
    Treat as Patch update — safe, automatic. Show an informational note.
```

> **The update type sets the tone of the confirmation, not whether Phase 2 runs.** Migrations are keyed to a release, so a patch or minor release can carry one (v4.5.1, v4.5.2 and v4.6.0 all do). Phase 2 always runs and decides from `pendingMigrations` — see [`migration-and-scan.md`](migration-and-scan.md).

### Step 3: Inform User

```
📊 Update Detection

Current Version: [currentVer]
Template Version: [newVer]
Branch:          [branch name, or "default" if none specified]
Update Type:     [Patch / Minor / Major / Same-version content update]

[If Major:]              ⚠️  This is a major update with breaking changes.
[If Minor:]              ℹ️   This update adds new features.
[If Patch:]              ✅  This is a bug fix update.
[If Same-version:]       ℹ️   Same version number — applying content changes from branch [branch].

What will be overwritten (Core):  [N] rules, [N] agents, [N] skills, [N] commands, [N] docs
What will be preserved (Project): rules/project/metadata.json, AGENTS.md Project Conventions,
                                  .apm/ overrides, docs/project/, guidelines.md renders,
                                  Core context-skill project-config.json, legacy project-* files,
                                  AND `.opencode/project_init.md` Decision Log + Open Gaps + Initialization Summary
                                  (Smart Merge — see preservation-and-validation.md)
Also redeployed by Step 3.5.b:    APM-owned primitives in .opencode/{agents,commands,skills}/ and
                                  role-pack *-context project-config.json (apm install, no per-file
                                  prompt — report its collision summary to the user)

What would you like to do?

  [Y] Proceed with update — back up and apply all changes above
  [N] Cancel — no changes will be made
  [D] Dry run — list every individual file that would be overwritten, then decide
```

**Response handling:**
- `Y`, `yes`, `1`, any affirmative → proceed to Phase 1 (Backup)
- `N`, `no`, `cancel` → cancel update, clean up `.opencode/.temp-update/`
- `D`, `dry`, `dry run` → execute Dry Run (see below), then re-show this prompt

### Dry Run Behavior

When the user selects `[D]`:

1. Read the file list from `.opencode/.temp-update/.opencode/rules/.core-version.json` (`coreFiles` section)
2. For each file in `coreFiles`, check if it exists in the project
3. Present a grouped list:

```
📋 Dry Run — Files That Would Be Overwritten

Rules (N files):
  .opencode/rules/orchestrator.md
  .opencode/rules/development.md
  ...

Agents (N files):
  .opencode/agents/initializer.md
  ...

Skills (N SKILL.md files + references):
  .opencode/skills/coding-standards-context/SKILL.md
  ...

Commands (N files):
  .opencode/commands/update-workplace.md
  ...

Documentation (N files):
  docs/core/MIGRATION_BACKUP.md
  ...

New files that would be added (not currently present):
  [list, or "None"]

Files NOT touched (your customizations):
  .opencode/rules/project/  (all contents)
  .opencode/skills/*/project-config.json  (all)
  .opencode/skills/*/references/guidelines.md  (all rendered guidelines)
  .opencode/agents/project-*.md
  .opencode/project_init.md  (Smart Merge — only template-owned headings are refreshed;
                            User Answers & Decision Log, Open Gaps, Initialization Summary,
                            Update History, and Supplemental Source Manifest values are preserved)
  ...

What would you like to do?

  [Y] Proceed with update
  [N] Cancel
```

### Step 4: Check for Pending Hashes

```javascript
const coreFiles = currentVersion.coreFiles;
const pendingHashes = [];

for (const [filePath, fileInfo] of Object.entries(coreFiles)) {
  if (fileInfo.hash === "pending") {
    pendingHashes.push(filePath);
  }
}
```

**If pending hashes found:**

```
⚠️ Incomplete Initialization Detected

The following Core files have "pending" hashes (initialization was not fully completed):
- [List of files]

Choose an option:

1. Calculate hashes now and continue (recommended)
   - Compute SHA-256 for all pending files, then proceed
2. Skip hash validation and continue
   - Treat all Core files as unmodified
3. Cancel update and re-run initialization

Your choice:
```

### Step 5: Scan Core Files for Modifications

```javascript
const modifiedFiles = [];

for (const [filePath, fileInfo] of Object.entries(coreFiles)) {
  if (fileInfo.hash === "pending") continue;
  // A coreFiles entry can point at a file the user deliberately deleted (e.g.
  // `.opencode/hooks/docs-sync-check.js` if they removed the plugin or the analysis script
  // entirely). Without this guard, calculateHash(readFile(...)) throws and
  // aborts the whole scan before Step 4.5 (core-update.md) gets a chance to
  // restore the file.
  if (!fileExists(filePath)) continue;
  const currentHash = calculateHash(readFile(filePath));
  if (currentHash !== fileInfo.hash) {
    modifiedFiles.push(filePath);
  }
}
```

**If Core files were modified:**

```
⚠️ Warning: Core Files Modified

The following Core files have been modified since last initialization:
[List of modified files]

Core files will be overwritten during update. Choose an option:

1. Reset to Core version (recommended)
   - Discard modifications, update to latest Core
2. Move to Project rules
   - Extract modifications to .opencode/rules/project/
   - Preserve your changes as custom rules
   - Update Core to latest
3. Cancel update

Your choice: [1/2/3]
```

---

## Phase 1: Backup Creation

### Step 1: Create Backup Directory

```bash
mkdir -p .opencode/.backups/backup-YYYY-MM-DD-HHmmss/
```

### Step 2: Backup All Core Areas

```bash
cp -r .opencode/rules/ .opencode/.backups/backup-YYYY-MM-DD-HHmmss/rules/
cp -r .opencode/skills/ .opencode/.backups/backup-YYYY-MM-DD-HHmmss/skills/
cp -r .opencode/commands/ .opencode/.backups/backup-YYYY-MM-DD-HHmmss/commands/
cp -r .opencode/agents/ .opencode/.backups/backup-YYYY-MM-DD-HHmmss/agents/
cp -r .opencode/plugins/ .opencode/.backups/backup-YYYY-MM-DD-HHmmss/plugins/
cp -r .opencode/hooks/ .opencode/.backups/backup-YYYY-MM-DD-HHmmss/hooks/
cp .opencode/opencode.json .opencode/.backups/backup-YYYY-MM-DD-HHmmss/opencode.json
cp .opencode/project_init.md .opencode/.backups/backup-YYYY-MM-DD-HHmmss/project_init.md

# Package skills: Step 3.5 of Core Update redeploys them; keep a copy of the initialized state too
if [ -d ".agents/skills" ]; then
  cp -r .agents/skills/ .opencode/.backups/backup-YYYY-MM-DD-HHmmss/agents-skills/
fi

if [ -d "docs/core" ]; then
  cp -r docs/core/ .opencode/.backups/backup-YYYY-MM-DD-HHmmss/docs-core/
fi
```

> **Critical:** the full `.opencode/project_init.md` (including the entire `## User Answers & Decision Log`, `## Open Gaps`, `## Supplemental Source Manifest`, `## Initialization Summary`, and `### Update History`) MUST be backed up verbatim BEFORE Smart Merge runs in Phase 3. The Decision Log is the project's audit trail of every initialization question and answer; if Smart Merge is ever rolled back, this backup is the only way to recover that audit data.

### Step 3: Create Backup Manifest

```json
{
  "timestamp": "[ISO timestamp]",
  "version": {
    "from": "[currentVer]",
    "to": "[newVer]"
  },
  "updateType": "[patch/minor/major]",
  "backedUpFiles": ["[list of backed up files]"],
  "modifiedCoreFiles": ["[list of user-modified Core files]"],
  "projectFiles": {
    "preserved": true,
    "location": "project-owned paths outside coreFiles (see the Phase 3 preservation list)"
  },
  "notes": "Automatic backup before template update"
}
```

### If Backup Fails

```
❌ Error: Backup creation failed

Unable to create backup at .opencode/.backups/
This is a safety precaution. Update cancelled.

Possible causes:
- Insufficient disk space
- Permission issues
- Path too long

Please resolve the issue and try again.
```

### Phase 1 Output

```
✅ Backup created (Phase 1 complete)

Backup location: .opencode/.backups/backup-YYYY-MM-DD-HHmmss/
Proceeding to migration check...
```
