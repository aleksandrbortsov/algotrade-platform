# Preservation & Validation (Phases 5-7)

> Verify all project customizations survived the update, reconcile configs, and validate integrity.

## Phase 5: Preservation Verification

Verify every file from the preservation list (created in Phase 3) still exists.

### Step 1: Verify Project Configuration and Instructions

```bash
for file in [projectConfig list] + [projectInstructions list]:
  if ! fileExists(file):
    ERROR: "Project file lost during update: ${file}"
```

### Step 2: Verify Custom Commands

```bash
for file in [customCommands list]:
  if ! fileExists(file):
    ERROR: "Custom command lost during update: ${file}"
```

### Step 3: Verify Custom Agents

```bash
for file in [customAgents list]:
  if ! fileExists(file):
    ERROR: "Custom agent lost during update: ${file}"
```

### Step 4: Verify Skill Configs

```bash
for file in [skillConfigs list]:
  if ! fileExists(file):
    ERROR: "Skill config lost during update: ${file}"
```

### Step 4b: Verify Initialized Package Skill State (after Core Update Step 3.5)

```javascript
// The APM refresh redeploys package copies; the install wrapper restores the initialized files.
// A config that was "initialized": true in the Phase 3 inventory and is false now means the
// wrapper did not run (bare `apm install`) — restore the file from the backup and re-run Step 3.5.
for (const file of preservationList.skillConfigs) {
  const wasInitialized = preservationList.initializedBefore[file];
  const cfg = JSON.parse(readFile(file));
  if (wasInitialized && cfg.initialized !== true) {
    ERROR: `Initialized package config reverted to the package copy: ${file}`;
  }
}
```

### Step 5: Verify Project Metadata

```bash
if ! fileExists('.opencode/rules/project/metadata.json'):
  ERROR: "Project metadata lost during update!"
```

### Step 6: Verify Custom Documentation

```bash
for file in [customDocs list]:
  if ! fileExists(file):
    ERROR: "Custom documentation lost during update: ${file}"
```

### Step 7: Verify `.opencode/project_init.md` Ledger Preservation (HARD GATE)

Smart Merge in Phase 3 refreshes only template-owned scaffolding in the ledger (e.g., `## How This Works`, `## Source-of-Truth Map`, `## Phase Checklist` template, `## Supplemental Source Manifest` row labels). Project-owned sections MUST remain byte-identical to the pre-merge backup. After Phase 3 completes, run:

```javascript
const backupLedger = readFile('.opencode/.backups/backup-YYYY-MM-DD-HHmmss/project_init.md');
const currentLedger = readFile('.opencode/project_init.md');

const protectedSections = [
  '## User Answers & Decision Log',
  '## Open Gaps',
  '## Initialization Summary',
  '### Update History',
];

for (const heading of protectedSections) {
  const before = extractSection(backupLedger, heading);
  const after  = extractSection(currentLedger, heading);
  if (before !== null && before !== after) {
    ERROR: `Ledger section "${heading}" changed during Smart Merge — project audit data is at risk!`;
  }
}

// `## Supplemental Source Manifest` table rows: row LABELS are template-owned and may
// change, but the VALUES in the "Pointer" column are project-owned and must be preserved
// for every row whose label still exists. Verify with a row-by-row Pointer comparison
// keyed on the row label (case-insensitive).
verifySupplementalManifestPointers(backupLedger, currentLedger);

// `## Initialization State` and `## Artifact Pointers` are mostly project-owned VALUES
// in template-owned tables. Compare each row's value cells to the backup; any value
// change without a matching template structural change is a Smart Merge bug.
verifyInitializationStateValues(backupLedger, currentLedger);
verifyArtifactPointersValues(backupLedger, currentLedger);
```

If any verification call fails: **block the update** and fall through to the missing-files restore flow below (the entire ledger is restored from the Phase 1 backup, and the user is asked to re-run the update after the Smart Merge bug is reported).

### If Any File Is Missing

```
❌ Critical Error: Custom files missing after update

The following custom files are missing:
[List of missing files]

Actions taken:
- Immediately restoring from backup...
- Project returned to previous state
- Update cancelled

Your customizations have been restored from backup.
This is a bug — please report with details.
```

Restore from backup:
```bash
cp -r .opencode/.backups/backup-YYYY-MM-DD-HHmmss/rules/* .opencode/rules/
cp -r .opencode/.backups/backup-YYYY-MM-DD-HHmmss/skills/* .opencode/skills/
cp -r .opencode/.backups/backup-YYYY-MM-DD-HHmmss/commands/* .opencode/commands/
cp -r .opencode/.backups/backup-YYYY-MM-DD-HHmmss/agents/* .opencode/agents/
cp .opencode/.backups/backup-YYYY-MM-DD-HHmmss/project_init.md .opencode/
```

### Phase 5 Output

```
✅ All customizations preserved (Phase 5 complete)

Verified:
- [N] custom rules intact
- [N] custom commands intact
- [N] custom agents intact
- [N] skill configs intact
- Project metadata intact
- [N] custom docs intact
- `.opencode/project_init.md` Decision Log + Open Gaps + Supplemental Source Manifest pointers
  + Artifact Pointers + Initialization State values: byte-identical to pre-merge backup
```

---

## Phase 6: Configuration Reconciliation

> **Phase 6 includes four steps:**
> - Step 1 — Verify Skill Config Compatibility
> - Step 2 — Update Project Metadata
> - Step 3 — Verify Custom Rule Compatibility
> - **Step 4 — Guidelines Health Check** ← checks/auto-recovers `references/guidelines.md` for all active skills

### Step 1: Verify Skill Config Compatibility

Domain skill `project-config.json` files should still be valid after SKILL.md was updated:

```javascript
const skillDirs = [...listDirectories('.opencode/skills/'), ...listDirectories('.agents/skills/')]; // both skill roots
for (const dir of skillDirs) {
  const configPath = `${dir}/project-config.json`;
  if (fileExists(configPath)) {
    const config = JSON.parse(readFile(configPath));
    if (config.initialized) {
      // Config preserved successfully
    }
  }
}
```

### Step 2: Update Project Metadata

```javascript
if (fileExists('.opencode/rules/project/metadata.json')) {
  const metadata = JSON.parse(
    readFile('.opencode/rules/project/metadata.json')
  );

  if (!metadata.customizations) {
    metadata.customizations = { notes: [] };
  }
  metadata.customizations.lastModified = new Date().toISOString();
  metadata.customizations.notes.push(
    `Updated to template version ${newVersion} on ${new Date().toISOString().split('T')[0]}`
  );
  metadata.template_version = newVersion;

  writeFile('.opencode/rules/project/metadata.json', JSON.stringify(metadata, null, 2));
}
```

### Step 3: Verify Custom Rule Compatibility

Check that project rules still reference valid Core files via relative links:

```javascript
const projectRules = listFiles('.opencode/rules/project/', '*.md');
for (const rule of projectRules) {
  const content = readFile(rule);
  const relativeLinks = extractRelativeLinks(content);
  for (const link of relativeLinks) {
    if (!fileExists(resolveLink(link))) {
      WARN: "Rule ${rule} references ${link} which no longer exists after update"
    }
  }
}
```

**If broken links found:**

```
⚠️ Broken References Detected

The following custom rules reference Core files that were removed or renamed:

- [rule file] → references [broken link]
  Suggested fix: update to [new path] or remove reference

Would you like me to fix these references? [Yes/No/Skip]
```

### Step 4: Guidelines Health Check for Active Skills

After Core files are updated (including `SKILL.md` and `references/template.md`), the rendered `references/guidelines.md` files for active skills may have become stale, contain unresolved `{{PLACEHOLDER}}` tokens, or be missing entirely. This step detects and auto-recovers these cases.

#### 4a. Collect active skills

Scan `.opencode/skills/*/project-config.json`. For each file that exists and has `"initialized": true`, add the parent skill directory to the active-skills list.

Also read `.workplace/state.json` (APM activation state) — for each entry with `"status": "active"`, add its `contextSkills` (from the matching package's `apm.yml` → `x-workplace.contextSkills` in the Workplace-Agent-Packages repo, or from the installed `apm.lock.yaml`) to the active-skills list (deduplicated). For v3.x projects that have not yet been migrated by `migration_v4_0_apm_migration`, fall back to reading the legacy `.opencode/rules/role-packs-state.json` and `pack.contextSkills`.

#### 4b. Classify each active skill

For each skill directory `{skill}` in the active-skills list:

```
1. template_exists = fileExists('.opencode/skills/{skill}/references/template.md')
2. guidelines_path = '.opencode/skills/{skill}/references/guidelines.md'
3. guidelines_exists = fileExists(guidelines_path)
4. has_placeholders = guidelines_exists AND content contains '{{' token

Classify:
  ✅ OK          — guidelines_exists AND NOT has_placeholders
  ⚠️ MISSING     — NOT guidelines_exists AND template_exists
  ⚠️ STALE       — guidelines_exists AND has_placeholders
  ℹ️ NO_TEMPLATE  — NOT template_exists (skill uses no template/guidelines pattern — skip silently)
```

#### 4c. Auto-recover MISSING and STALE cases

For each skill classified as ⚠️ MISSING or ⚠️ STALE:

1. Read `.opencode/skills/{skill}/references/template.md`
2. Read `.opencode/skills/{skill}/project-config.json`
3. Apply the same placeholder-substitution rules as initialization Phase 6 Part 3 (see [`project-initialization/references/configuration-updates.md`](../../project-initialization/references/configuration-updates.md), "Part 3: Guidelines Document Generation"):
   - Replace every `{{PLACEHOLDER}}` token using values from `project-config.json`
   - For any `{{PLACEHOLDER}}` with no mapped value: substitute `_Not configured — update when defined_`
   - **Never leave raw `{{PLACEHOLDER}}` tokens in the output file**
4. Write the rendered result to `.opencode/skills/{skill}/references/guidelines.md`
5. Record the skill as **auto-recovered** in the phase output

If `project-config.json` is initialized but `template.md` does not exist: log a warning and skip auto-recovery for this skill (the skill does not use the template/guidelines pattern). Record as ℹ️ NO_TEMPLATE.

#### 4d. Handle NOT_CONFIGURED cases (missing or uninitialized project-config.json)

If a skill is in the active-skills list via an installed APM package (or legacy v3 role-pack) but its `project-config.json` is missing or has `"initialized": false`:

```
⚠️  Skill '{skill}' is required by APM package '{package-id}' but has no initialized project-config.json.
    The guidelines.md cannot be auto-generated.
    Run /initialize to configure this skill, or (re)install the package via `apm install` after editing apm.yml.
```

Record as **NEEDS_CONFIGURATION** in the phase output. Do NOT block the update — only warn.

#### 4e. Report results

```
=== Guidelines Health Check ===

Active skills scanned: {N}

✅ OK:               {list or "None"}
🔧 Auto-recovered:   {list or "None"}
ℹ️  No template:      {list or "None"} (template/guidelines pattern not used)
⚠️  Needs config:     {list or "None"} (project-config.json not initialized)

[If any auto-recovered:]
  Auto-recovered guidelines were re-rendered from template.md + project-config.json.
  Review if needed — Core template.md files may have changed in this update.

[If any NEEDS_CONFIGURATION:]
  ⚠️  Warning: {N} skill(s) could not be auto-recovered because project-config.json
  is not initialized. These skills will not provide project-specific context to agents.
  To fix: run /initialize, or add the relevant APM package to apm.yml and run `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`.
```

---

### Phase 6 Output

```
✅ Configuration reconciled (Phase 6 complete)

- Skill configs verified compatible
- Project metadata updated
- [N] custom rule references checked ([N] valid, [N] warnings)
- Guidelines health: [N] OK, [N] auto-recovered, [N] need config (warnings only)
```

---

## Phase 7: Validation

### Step 1: Validate File Structure

```
Check that all expected files and directories exist:
- .opencode/opencode.json             (Core config layer)
- .opencode/rules/                    (Core rules)
- .opencode/rules/project/            (project identity; project instruction files if any)
- .opencode/rules/project/metadata.json
- .opencode/agents/                   (Core + package + project-* agents)
- .opencode/commands/                 (Core + package + project-* commands)
- .opencode/skills/                   (8 Core skills)
- .agents/skills/                     (package skills — only when apm.lock.yaml lists deployed skills)
- .opencode/plugins/docs-sync.js      (Core plugin)
- .opencode/hooks/docs-sync-check.js  (Core analysis library)
- .opencode/project/analysis/         (EXISTING_PROJECT: analysis artifacts)
- opencode.json                       (root project config)
- docs/core/                          (if present)
- docs/project/                       (if present)
```

### Step 2: Validate Core Version

```javascript
const versionFile = JSON.parse(readFile('.opencode/rules/.core-version.json'));

if (versionFile.version !== expectedVersion) {
  ERROR: "Version mismatch after update! Expected ${expectedVersion}, got ${versionFile.version}"
}

if (versionFile.initializationStatus !== "active") {
  ERROR: "Initialization status should be 'active' after update"
}
```

### Step 3: Validate Links

Run the Core link validator in project mode — it checks every Markdown file the Workplace owns or generated (`.opencode/**`, `.agents/skills/**`, `docs/core/**`, `AGENTS.md`, `README.md`, `docs/INDEX.md`) and reports links in the project's own documentation without blocking:

```bash
node .opencode/skills/project-initialization/scripts/validate-doc-links.js
```

Exit 1 means a broken link inside Workplace-owned documentation — fix it before the report (usually a Core doc renamed by the update that a project file still points at).

### Step 4: Check for Conflicts

```
- No duplicate rule names between Core and Project
- No conflicting routing overrides
- No circular link references
```

### If Validation Fails

```
❌ Error: Validation failed after update

Issues detected:
[List of validation errors]

Actions taken:
- Restoring from backup...
- Project returned to previous state
- Update cancelled

Please report this issue with the error details above.
```

### Phase 7 Output

```
✅ Validation complete (Phase 7)

- File structure intact
- Version correct: [newVer]
- All relative links valid
- No conflicts detected
```
