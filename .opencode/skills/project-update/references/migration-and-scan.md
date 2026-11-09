# Migration & Customization Scan (Phases 2-3)

> Run pending migrations and scan for project customizations to preserve.

## Phase 2: Migration

**Run this phase for every update type — Patch, Minor and Major — and let `pendingMigrations` decide.** Step 1 computes it as `migrations.available` (template) minus `migrations.applied` (project); when the difference is empty the phase completes immediately with "No migrations required".

> **Why not "major only".** Migrations are keyed to a *release*, not to a SemVer class: a patch or minor release may carry a structural change, and skipping the phase on those update types would leave the project half-migrated. The catalog itself is the source of truth (see below).

### Step 1: Check for Pending Migrations

```javascript
const templateSource = '.opencode/.temp-update/';
const templateVersion = JSON.parse(
  readFile(`${templateSource}.opencode/rules/.core-version.json`)
);
const currentVersion = JSON.parse(
  readFile('.opencode/rules/.core-version.json')
);

const appliedMigrations = currentVersion.migrations.applied.map(m =>
  typeof m === 'string' ? m : m.version
);

const availableMigrations = templateVersion.migrations?.available || [];
const pendingMigrations = availableMigrations.filter(
  m => !appliedMigrations.includes(typeof m === 'string' ? m : m.version)
);
```

### Step 2: Execute Pending Migrations

For each pending migration, execute the migration block below in catalog order and log the changes in the update report.

#### Migration catalog for this line

The OpenCode line starts its catalog at **5.0.0 with no migrations**: `migrations.available` in the template manifest is `[]`, and `migrations.applied` of every project initialized from this line holds the single `5.0.0` baseline entry. `pendingMigrations` is therefore empty until a later release needs a structural change, and this phase completes with "No migrations required".

Projects initialized from the Cursor line of the template are **not** upgraded by this flow: the harness directory, the rule format and the APM target differ, and no migration bridges them. Such a project starts over with `/initialize` on this line.

When a release adds a migration, it is documented here as one block per migration, in the order the updater applies them:

```markdown
#### Migration: `v<version>-<slug>`

**Trigger:** applies when `migrations.applied` lacks `<version>` (Step 1 computes this).
**Idempotency:** re-running on an already-migrated project changes nothing.

1. Precondition checks — what must exist; abort with a clear message otherwise.
2. The structural change, expressed as file operations the agent performs with its tools.
3. Verification — what to read back; which gate script to run.
4. Ledger note — append the migration id to `.opencode/project_init.md → ### Update History`
   together with the version transition.
```

The manifest entry (`migrations.available[]`) carries `version`, `description` and the trigger condition; the block here carries the procedure. The two are added in the same release.

### Phase 2 Output

```
✅ Migration complete (Phase 2)

[If migrations ran:]
Migrations applied:
- [migration name]: [description]

[If no migrations needed:]
No migrations required for this update type.

Proceeding to customization scan...
```

---

## Phase 3: User Customization Scan

### Step 1: Scan for Project-Owned Files

Inventory every project-owned file that must survive the Core copy. Ownership follows the Core boundary of this line (`docs/core/MIGRATION_BACKUP.md → What is preserved, what is overwritten`): only paths listed in `coreFiles` are ever overwritten; everything below is project- or package-owned and is only *verified* by later phases.

```bash
# Initialization output inside context skills — both skill roots
find .opencode/skills/ .agents/skills/ -name "project-config.json" 2>/dev/null
find .opencode/skills/ .agents/skills/ -path "*/references/guidelines.md" 2>/dev/null

# Project configuration layer and identity
test -f opencode.json && echo "opencode.json"          # root config: mcp, model, watcher, permissions, project instructions
test -f .opencode/rules/project/metadata.json && echo ".opencode/rules/project/metadata.json"
find .opencode/rules/project/ -name "*.md" ! -name "README.md" 2>/dev/null   # project instruction files, if the team added any
test -f .opencode/hooks/docs-sync-config.json && echo ".opencode/hooks/docs-sync-config.json"

# Initialization ledger and analysis artifacts
test -f .opencode/project_init.md && echo ".opencode/project_init.md"
find .opencode/project/ -type f 2>/dev/null

# Project-authored primitives (never listed in coreFiles)
find .opencode/agents/ .opencode/commands/ -name "project-*.md" 2>/dev/null

# APM package state — owned by APM, refreshed by Core Update Step 3.5, never by the Core copy
test -f apm.yml && echo "apm.yml"; test -f apm.lock.yaml && echo "apm.lock.yaml"
find .agents/skills/ -maxdepth 1 -mindepth 1 -type d 2>/dev/null
find .workplace/ -type f 2>/dev/null
find .apm/ -type f 2>/dev/null                        # the project's own APM overrides (Channel 1b)

# Documentation
test -f AGENTS.md && echo "AGENTS.md"
test -f docs/INDEX.md && echo "docs/INDEX.md"
find docs/project/ -name "*.md" 2>/dev/null
```

> Package-owned files under `.agents/skills/`, `.opencode/agents/<package-agent>.md` and `.opencode/commands/<package-command>.md` are identified by `apm.lock.yaml → deployed_files`, never by a name prefix. The Core copy does not touch them; Step 3.5 of Core Update redeploys them through the install wrapper, which restores the initialized `project-config.json` / `guidelines.md` afterwards.

### Step 2: Read Project Metadata

```javascript
if (fileExists('.opencode/rules/project/metadata.json')) {
  const metadata = JSON.parse(readFile('.opencode/rules/project/metadata.json'));
}
```

### Step 3: Create Preservation List

Build the inventory of files that must survive the update, grouped by owner. It is verified in Phase 5 after the Core copy and again after the APM refresh.

```json
{
  "projectConfig": ["opencode.json", ".opencode/hooks/docs-sync-config.json", ".opencode/rules/project/metadata.json"],
  "projectInstructions": [".opencode/rules/project/team-conventions.md"],
  "skillConfigs": [
    ".opencode/skills/coding-standards-context/project-config.json",
    ".opencode/skills/infrastructure-context/project-config.json",
    ".agents/skills/frontend-context/project-config.json",
    ".agents/skills/backend-context/project-config.json"
  ],
  "skillGuidelines": [
    ".opencode/skills/coding-standards-context/references/guidelines.md",
    ".opencode/skills/infrastructure-context/references/guidelines.md",
    ".agents/skills/frontend-context/references/guidelines.md"
  ],
  "ledger": ".opencode/project_init.md",
  "analysisArtifacts": [".opencode/project/analysis/index.json", ".opencode/project/analysis/web.json", ".opencode/project/analysis/web.md"],
  "projectPrimitives": [".opencode/commands/project-deploy-staging.md", ".opencode/agents/project-infra.md"],
  "apmState": ["apm.yml", "apm.lock.yaml", ".workplace/state.json"],
  "apmOverrides": [".apm/skills/frontend-context/project-config.json"],
  "agentsMd": "AGENTS.md",
  "docsIndex": "docs/INDEX.md",
  "customDocs": ["docs/project/ARCHITECTURE.md"]
}
```

Record, for every `skillConfigs` entry, whether it currently says `"initialized": true` — Phase 5 uses that to detect a package copy that replaced the initialized file.

Store this list — it will be verified in Phase 5 after the Core update.

### Step 4: Re-Sync APM Packages

Nothing to do here: package primitives are refreshed by Core Update **Step 3.5** (pre-refresh check → install wrapper → post-refresh gate), after the Core copy. Phase 6 Step 4 then re-checks `references/guidelines.md` of every active context skill against the possibly updated `references/template.md`.

### Phase 3 Output

```
✅ Customization scan complete (Phase 3)

Project-owned files inventoried:
- [N] context-skill configs (project-config.json; [M] initialized) across .opencode/skills/ and .agents/skills/
- [N] rendered guidelines (references/guidelines.md)
- root opencode.json: present/absent · docs-sync config: present/absent · metadata.json: present/absent
- [N] project-authored agents/commands (project-*.md)
- [N] analysis artifacts under .opencode/project/
- APM state: apm.yml / apm.lock.yaml / .workplace/ present: yes/no; .apm/ overrides: [N]
- AGENTS.md present: yes/no · docs/INDEX.md present: yes/no · [N] docs/project files

None of these is listed in coreFiles; the Core copy leaves them alone.
Proceeding to Core update...
```
