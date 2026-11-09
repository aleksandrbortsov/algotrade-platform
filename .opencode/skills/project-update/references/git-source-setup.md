# Git Source Setup (Pre-Phase)

> Clone the fresh Workplace template from a user-provided git URL before running the update.

## Overview

The update process requires a source of the new template version. Instead of relying on a vague `[template]` placeholder, we clone the latest template into a temporary directory at `.opencode/.temp-update/`.

## Step 0: Check for Saved Template Source

Before asking the user, check if a previous update already saved the template URL:

```javascript
const coreVersion = JSON.parse(readFile('.opencode/rules/.core-version.json'));
const savedSource = coreVersion.templateSource || null;
// savedSource may contain: { url: "https://...", branch: "main" }
```

If `savedSource` exists, pre-fill the prompt in Step 1.

## Step 1: Ask for Git URL and Branch

Present the user with a prompt. If `savedSource` is available, show pre-filled values:

```
📦 Workplace Update — Git Source Setup

To update your AI Workplace, I need the git URL of the template repository
containing the new version.

[If savedSource exists:]
Previous template source detected:
  URL:    https://{insert correct url}.git
  Branch: WP_New_Era (or "default" if none was saved)

Press Enter to reuse, or provide new values below.

Please provide:
1. Git URL (HTTPS or SSH): _____________
   Example: https://github.com/your-org/agentCodeTemplate.git

2. Branch or tag (optional, leave blank for default branch): _____________
   Example: WP_New_Era, v2.1.0, main

Options:
- [A] Use saved source (pre-filled above)   ← only shown if savedSource exists
- [B] Provide new URL / branch
- [C] Cancel update
```

**If user specifies a branch inline in the command** (e.g. `/update-workplace from "WP_New_Era" branch`):
- Extract the branch name from the user's message automatically
- Pre-fill the branch field — do not ask again
- Still ask for the URL (or use saved URL if available)

### URL Validation

- Must be a valid git URL (HTTPS `https://...` or SSH `git@...`)
- Must be accessible from the current machine
- Branch/tag is optional — if omitted, the repository's default branch is used

## Step 2: Clone to Temp Directory

Clone the repository into the temp directory at `.opencode/.temp-update/`:

```bash
# Without branch (use default):
git clone --depth 1 <url> .opencode/.temp-update/

# With branch or tag:
git clone --depth 1 --branch <branch> <url> .opencode/.temp-update/
```

**Flags:**
- `--depth 1` — shallow clone, only latest commit (faster, less disk usage)
- `--branch <branch>` — checkout specific branch or tag; omit if not specified

### If Clone Fails

```
❌ Git Clone Failed

Unable to clone: [error message]

Possible causes:
- Invalid URL
- No network access
- Authentication required (private repository)
- Repository doesn't exist
- Branch/tag not found in repository

Options:
1. Provide a different URL or branch
2. Cancel update

Your choice:
```

### If Authentication Required

```
🔐 Authentication Required

The repository requires authentication.

Options:
1. Use HTTPS with credentials (git will prompt)
2. Use SSH key (ensure key is configured)
3. Provide a different URL
4. Cancel update

Your choice:
```

## Step 3: Validate Cloned Template

After cloning, validate that the cloned directory is a valid Workplace template:

```javascript
const tempPath = '.opencode/.temp-update/';

// Required files that must exist in a valid template
const requiredFiles = [
  `${tempPath}.opencode/rules/.core-version.json`,
  `${tempPath}.opencode/rules/orchestrator.md`,
  `${tempPath}.opencode/rules/development.md`,
  `${tempPath}.opencode/agents/initializer.md`,
  `${tempPath}.opencode/skills/project-initialization/SKILL.md`,
  `${tempPath}.opencode/opencode.json`,                 // Core config layer (this line)
  `${tempPath}.opencode/plugins/docs-sync.js`,          // docs-sync plugin
  `${tempPath}.opencode/hooks/docs-sync-check.js`,      // its analysis library
  `${tempPath}.opencode/skills/project-initialization/scripts/apm-install-preserving.js`
];

// A clone that carries another harness directory but no `.opencode/opencode.json` is a different line of the
// template (another agent harness), not an older release. Stop with: "This URL/branch serves another
// harness line; the OpenCode line lives on branch OpenCodeWP."

for (const file of requiredFiles) {
  if (!fileExists(file)) {
    ERROR: `Not a valid Workplace template — missing ${file}`;
  }
}

// Read template version
const templateVersion = JSON.parse(
  readFile(`${tempPath}.opencode/rules/.core-version.json`)
);
const newVersion = templateVersion.version;
```

### If Validation Fails

```
❌ Invalid Template Repository

The cloned repository doesn't appear to be a valid NC AI Workplace template.

Missing required files:
- [list of missing files]

This could mean:
1. Wrong repository URL
2. Repository is not a Workplace template
3. Template structure has changed
4. Wrong branch specified

Cleaning up temporary files...

Options:
1. Provide a different URL or branch
2. Cancel update

Your choice:
```

Clean up on failure:
```bash
rm -rf .opencode/.temp-update/
```

## Step 4: Set Template Source Variable

After successful clone and validation, the template source path is established:

```
templateSource = ".opencode/.temp-update/"
```

Also record the URL and branch used, so they can be saved after a successful update:

```javascript
const usedUrl    = "<url provided by user>";
const usedBranch = "<branch provided by user, or null if default>";
```

All subsequent phases use `templateSource` as the source for new Core files.

## Output

After this phase completes:

```
✅ Git Source Setup Complete (Pre-phase)

Template repository cloned successfully.
Source:   [git URL]
Branch:   [branch name, or "default branch" if none specified]
Version:  [version from cloned .core-version.json]
Location: .opencode/.temp-update/

Proceeding to version detection...
```
