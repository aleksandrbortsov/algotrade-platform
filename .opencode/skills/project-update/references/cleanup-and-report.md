# Cleanup & Report (Phase 8)

> Generate the update report, present summary, and clean up the temporary clone directory.

## Step 1: Generate Update Report

Create `update-report.md` in the backup directory:

```markdown
# Project Update Report

**Date:** [timestamp]
**Update Type:** [Patch/Minor/Major]
**From Version:** [old version]
**To Version:** [new version]
**Source:** [git URL]

## Summary

Successfully updated NC AI Workplace template from v[old] to v[new].
All project-owned files preserved (see Preserved Customizations below).

## Core Files Updated

[List of Core files that were updated]
- .opencode/agents/project-updater.md
- .opencode/skills/project-update/SKILL.md
- .opencode/rules/orchestrator.md
- .opencode/rules/development.md
- ...

## Preserved Customizations

### Custom Rules
- [list or "None"]

### Custom Commands
- [list or "None"]

### Custom Agents
- [list or "None"]

### Skill Configs
- [list or "None"]

### Project Metadata
- .opencode/rules/project/metadata.json

### Custom Documentation
- [list or "None"]

## Migrations Applied

[If Major update:]
- [migration version]: [description]

[If no migrations:]
No migrations required for this update.

## New Features

[Extract from template CHANGELOG or release notes if available]

## Breaking Changes

[If Major update — list breaking changes]
[If no breaking changes: None]

## Modified Core Files (User Changes)

[If any Core files were modified by user:]
The following Core files had user modifications:
- [file]: [Action taken — Reset/Moved to Project/Kept]

[If no modifications:]
No user modifications detected in Core files.

## Backup Location

Full backup at: `.opencode/.backups/backup-YYYY-MM-DD-HHmmss/`

To restore from backup:
\`\`\`bash
cp -r .opencode/.backups/backup-YYYY-MM-DD-HHmmss/rules/* .opencode/rules/
cp -r .opencode/.backups/backup-YYYY-MM-DD-HHmmss/skills/* .opencode/skills/
cp -r .opencode/.backups/backup-YYYY-MM-DD-HHmmss/commands/* .opencode/commands/
cp -r .opencode/.backups/backup-YYYY-MM-DD-HHmmss/agents/* .opencode/agents/
cp .opencode/.backups/backup-YYYY-MM-DD-HHmmss/project_init.md .opencode/
\`\`\`

## Validation Results

- [PASS/FAIL] File structure intact
- [PASS/FAIL] Version updated correctly
- [PASS/FAIL] All relative links valid
- [PASS/FAIL] No conflicts detected
- [PASS/FAIL] Custom rules preserved
- [PASS/FAIL] Custom commands preserved
- [PASS/FAIL] Skill configs preserved
- [PASS/FAIL] Project files preserved

## Guidelines Health (Phase 6 Step 4)

Active skills scanned: [N]

| Skill | Status | Action Taken |
|-------|--------|--------------|
| [skill] | ✅ OK | None |
| [skill] | 🔧 Auto-recovered | Re-rendered from template.md + project-config.json |
| [skill] | ⚠️ Needs config | project-config.json not initialized — manual action required |
| [skill] | ℹ️ No template | Skill does not use template/guidelines pattern |

[If no active skills:]
No initialized domain skills found — guidelines check skipped.

## Next Steps

1. Review this update report
2. Check that custom rules still work as expected
3. Review new template features in updated Core files
4. Update any custom rules that reference changed Core sections
5. [If any skills were auto-recovered] Review auto-recovered `references/guidelines.md` files — Core `template.md` files may have changed with this update; verify the rendered output is still accurate
6. [If any skills need config] Run `/initialize`, or add the relevant APM package(s) to `apm.yml` and run `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`, to configure missing domain skills

---

*This report documents the update process for audit and troubleshooting purposes.*
```

## Step 2: Present Summary to User

```
🎉 Update Complete!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Update Summary:

Updated: v[old] → v[new] ([Patch/Minor/Major])
Source: [git URL]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ What Changed:

Core Files Updated:
- [N] Core rules updated
- [N] agent definitions updated
- [N] skill files updated
- [N] commands updated
- [N] Core docs updated

Customizations Preserved:
- [N] custom rules
- [N] custom commands
- [N] custom agents
- [N] skill configs
- Project metadata intact

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Backup Created:

Location: .opencode/.backups/backup-YYYY-MM-DD-HHmmss/
See update-report.md in backup directory for details.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Validation: All checks passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Guidelines Health:

Active skills checked: [N]
✅ OK: [N]
🔧 Auto-recovered: [N] (re-rendered from updated template.md)
⚠️ Need config: [N] (run /initialize, or edit apm.yml + run `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`, to fix)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Next Steps:

1. Review update-report.md for details
2. Test custom rules and commands
3. Explore new template features
4. Update custom rules if needed
5. [If auto-recovered] Review guidelines.md files that were re-rendered
6. [If need config] Configure missing domain skills via /initialize

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 3: Clean Up Temporary Clone

Ask user for confirmation before deleting the temporary clone:

```
📦 Cleanup: Temporary Template Clone

The cloned template is at: .opencode/.temp-update/

This directory is no longer needed. Delete it?

Options:
1. Yes, delete (recommended — frees disk space)
2. No, keep for reference (can be manually deleted later)

Your choice:
```

### If User Confirms Deletion

```bash
rm -rf .opencode/.temp-update/
```

```
✅ Temporary clone deleted. Update workflow complete!
```

### If User Keeps It

```
ℹ️ Temporary clone kept at .opencode/.temp-update/

You can delete it manually later:
  rm -rf .opencode/.temp-update/

Update workflow complete!
```

## Error Handling: Rollback

If any phase (4-7) fails and rollback is needed, the report should document the failure:

```markdown
## Update Failed — Rolled Back

**Failure Phase:** [phase number and name]
**Error:** [error description]

**Rollback Actions:**
- Restored all files from backup
- Project returned to v[old]
- Temporary clone NOT deleted (kept at `.opencode/.temp-update/` for debugging)

**Recommendation:**
1. Check the error details above
2. Verify the template repository is valid
3. Try the update again after fixing the issue
```
