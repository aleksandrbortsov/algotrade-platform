
# Metadata Collection Module

This module handles Phase 2 of project initialization: collecting essential project metadata that defines the project's identity and purpose.

**Parent Workflow:** [Project Initialization Skill](../SKILL.md)

---

## Phase 2: Metadata Collection

**Purpose:** Gather core information about the project to personalize documentation and configuration.

### Information to Collect

1. **Project Name** - Technical identifier and display name
2. **Primary Goal** - What the project aims to achieve
3. **Target Audience** - Who will use the project
4. **Project Description** - Brief overview (2-3 sentences)

---

## For NEW_PROJECT

Ask questions **progressively (2-3 at a time)**:

### Pre-Question Reminder
Before starting the questions, briefly remind the user:
> "To get the best possible configuration and rules for your project, please answer these questions as honestly and detailed as possible."

### Round 1: Basic Identity

```
📋 Let's Define Your Project

1. What is your project name?
   (e.g., "my-awesome-app", "company-dashboard", "portfolio-site")

2. What is the primary goal of this project?
   (e.g., "E-commerce site", "Admin dashboard", "Marketing landing page", "Documentation site")
```

**Wait for response, validate, then proceed to Round 2.**

### Round 2: Audience & Description

```
3. Who is the target audience?
   (e.g., "Internal company users", "Public consumers", "Developers", "Enterprise clients", "Students")

4. Brief project description (2-3 sentences):
   (What does this project do? What problem does it solve?)
   
   Example: "A modern e-commerce platform for selling handmade crafts with real-time inventory management and social sharing features."
```

---

## For EXISTING_PROJECT

### Step 1: Extract from package.json

1. **Read package.json** if present:
   ```javascript
   const pkg = JSON.parse(readFile('package.json'));
   
   const metadata = {
     name: pkg.name,
     description: pkg.description,
     version: pkg.version
   };
   ```

2. **Read README.md** if present:
   ```javascript
   const readme = readFile('README.md');
   
   // Extract title (usually first # heading)
   const titleMatch = readme.match(/^#\s+(.+)$/m);
   const readmeTitle = titleMatch ? titleMatch[1] : null;
   
   // Extract description (usually first paragraph after title)
   const descMatch = readme.match(/^#.+\n\n(.+?)(\n\n|$)/s);
   const readmeDesc = descMatch ? descMatch[1] : null;
   ```

### Step 2: Accept Silently or Ask (no ritual confirmation)

> **Hard rule:** if `package.json` (or equivalent manifest) and README.md provide consistent, non-trivial metadata, **accept it silently** and **do NOT ask** "Is this information correct? 1/2". The user can correct values later by editing `.opencode/rules/project/metadata.json` directly.

Apply the following decision tree:

```
1. Read package.json (or equivalent: pyproject.toml, go.mod, pom.xml, Cargo.toml, ...).
2. Read README.md if present (extract H1 title and first paragraph).
3. Compare:
   a. names_consistent     = (pkg.name and readme.title resolve to the same identity, e.g.
                             after kebab/snake/space normalisation, OR readme has no title)
   b. description_present  = (pkg.description.length >= 20  OR  readme paragraph length >= 20)
   c. description_trivial  = (description matches /^(my\s+app|new\s+project|app|project|test|untitled)$/i
                             OR length < 20 and no domain hint extractable from folder names)

If names_consistent AND description_present AND NOT description_trivial:
   → Accept silently. Print a one-line summary, do not ask Y/N.
     Example print:
       "📦 Detected: name=acme-billing, description=B2B subscription billing platform.
        (Edit `.opencode/rules/project/metadata.json` to override.)"
   → Proceed to Step 3.

Else if names conflict (Special Case 1):
   → Ask the conflict-resolution question (Special Case 1 below).

Else if description is missing or trivial:
   → Ask ONE adaptive question (Step 2-Reflection below). Do not show generic 1/2 prompt.
```

#### Step 2-Reflection — adaptive metadata question

Only fired when description is trivial / missing / goal undeducible. The question MUST reference concrete signals discovered from the file system to feel useful, not generic.

**Signal sources for the adaptive question:**
- Top-level domain folders under `src/` (e.g., `billing/`, `notifications/`, `tenants/`, `pricing/`, `inventory/`)
- Notable SDK / library names found in `package.json` dependencies (e.g., `stripe`, `twilio`, `@aws-sdk/*`, `firebase-admin`)
- Repo / directory name (often more informative than `package.json.name`)

**Template:**

```
🔍 Phase 2 — Project identity is unclear

What I found:
- package.json name: {pkg.name or "—"}
- description: {pkg.description or "(empty / trivial)"}
- top business folders under src/: {detected list, e.g., billing/, notifications/, tenants/}
- key SDKs in dependencies: {e.g., stripe, twilio}

Question: this looks like a {best-guess based on folders+SDKs, e.g., "B2B SaaS billing platform with multi-tenant SMS notifications"}. Is that the intent?

  [A] Yes — describe in 1 sentence: ____________________________
  [B] Different domain — describe: ____________________________
  [C] Skip — record description as TBD and proceed (I'll fill it later)
```

If `[C]` is chosen, write the description placeholder `[TBD - confirm later]` into `.opencode/rules/project/metadata.json` (`project.description`) and continue. The reflection Q-block (including the answer `[C] Skip`) MUST be appended to `.opencode/project_init.md` → `## User Answers & Decision Log → ### Phase 2 — Project Metadata`, and the gap must be mirrored under `## Open Gaps`.

### Step 3: Integration goal (adaptive — at most one question, usually none)

> **Skip** when the pre-initialization conversation already states why the template is being adopted, or when Phase 2 accepted the metadata silently and the repository is an established codebase (EXISTING_PROJECT with ≥ 2 Phase 1 signals) — the goal is then "adopt the Workplace on an existing project" and needs no confirmation. Ask only when the purpose is genuinely unknown: NEW_PROJECT with a trivial description, or a user who mentioned pain points without naming them.

```
Integration goal (one answer — press Enter to skip)

What should the Workplace improve first here?
  [A] AI-assisted development workflow (default)
  [B] Project management with TaskMaster
  [C] Consistent coding standards across the team
  [D] Documentation and onboarding
  [E] Something else: __________
```

Record the answer as a Q-block (`Decision stored in: ledger only`) and use it to rank the optional packages offered in Phase 1.7-APM Pass A.5 and the domain order in Phase 6. It is not persisted into `metadata.json`.

---

## Validation Rules

### Project Name Validation

```javascript
function validateProjectName(name) {
  // Must be lowercase for package managers
  const errors = [];
  
  if (!name) {
    errors.push("Project name is required");
  }
  
  if (name !== name.toLowerCase()) {
    errors.push("Project name should be lowercase (npm/yarn requirement)");
  }
  
  if (name.includes(' ')) {
    errors.push("Project name cannot contain spaces (use hyphens instead)");
  }
  
  if (!/^[a-z0-9-_]+$/.test(name)) {
    errors.push("Project name can only contain lowercase letters, numbers, hyphens, and underscores");
  }
  
  if (name.startsWith('-') || name.startsWith('_')) {
    errors.push("Project name cannot start with hyphen or underscore");
  }
  
  return errors;
}
```

**Validation Examples:**

```
✅ Valid:
- my-awesome-app
- company-dashboard
- portfolio-2024
- my_project

❌ Invalid:
- My Awesome App (contains spaces and uppercase)
- -my-app (starts with hyphen)
- my@app (contains special character)
- MyApp (contains uppercase)
```

**If validation fails:**

```
⚠️ Invalid Project Name

The project name "[user-input]" has the following issues:
- [Issue 1]
- [Issue 2]

Suggestion: [corrected-name]

Would you like to use "[corrected-name]" instead?
1. Yes, use suggested name
2. No, I'll provide a different name

Your choice:
```

### Description Validation

```javascript
function validateDescription(description) {
  const warnings = [];
  
  if (!description || description.trim().length === 0) {
    warnings.push("Description is empty (recommended to provide one)");
  }
  
  if (description && description.length < 20) {
    warnings.push("Description is very short (consider adding more details)");
  }
  
  if (description && description.length > 500) {
    warnings.push("Description is very long (consider making it more concise)");
  }
  
  return warnings;
}
```

**Note:** Warnings don't block progress, but suggest improvements.

---

## Data Processing & Normalization

### Project Name Processing

```javascript
function processProjectName(name) {
  // Normalize to lowercase
  let processed = name.toLowerCase();
  
  // Replace spaces with hyphens
  processed = processed.replace(/\s+/g, '-');
  
  // Remove invalid characters
  processed = processed.replace(/[^a-z0-9-_]/g, '');
  
  // Remove leading/trailing hyphens or underscores
  processed = processed.replace(/^[-_]+|[-_]+$/g, '');
  
  // Collapse multiple hyphens
  processed = processed.replace(/-+/g, '-');
  
  return processed;
}
```

### Description Processing

```javascript
function processDescription(description) {
  // Trim whitespace
  let processed = description.trim();
  
  // Ensure it ends with a period
  if (processed && !processed.match(/[.!?]$/)) {
    processed += '.';
  }
  
  // Capitalize first letter
  if (processed) {
    processed = processed.charAt(0).toUpperCase() + processed.slice(1);
  }
  
  return processed;
}
```

---

## Derived Metadata

Based on collected information, derive additional metadata:

### Project Type

Infer from primary goal and selected roles:

```javascript
function deriveProjectType(primaryGoal, roles) {
  const goalLower = primaryGoal.toLowerCase();
  
  if (goalLower.includes('e-commerce') || goalLower.includes('shop')) {
    return 'E-commerce Application';
  }
  if (goalLower.includes('dashboard') || goalLower.includes('admin')) {
    return 'Dashboard/Admin Panel';
  }
  if (goalLower.includes('landing') || goalLower.includes('marketing')) {
    return 'Marketing/Landing Page';
  }
  if (goalLower.includes('documentation') || goalLower.includes('docs')) {
    return 'Documentation Site';
  }
  if (goalLower.includes('blog') || goalLower.includes('content')) {
    return 'Content/Blog Platform';
  }
  if (goalLower.includes('portfolio')) {
    return 'Portfolio Site';
  }
  if (goalLower.includes('api') || goalLower.includes('backend')) {
    return 'Backend API';
  }
  
  // Fallback to role-based inference
  if (roles.includes('Backend Developer')) {
    return 'Backend Application';
  }
  if (roles.includes('Frontend Developer') || roles.includes('UI/UX Designer')) {
    return 'Frontend Application';
  }
  if (roles.includes('Full-Stack Developer')) {
    return 'Full-Stack Application';
  }
  if (roles.includes('Mobile Developer')) {
    return 'Mobile Application';
  }
  
  return 'Web Application';
}
```

### Display Name

Create a user-friendly display name:

```javascript
function deriveDisplayName(technicalName) {
  // Convert kebab-case or snake_case to Title Case
  return technicalName
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
```

**Examples:**
- `my-awesome-app` → "My Awesome App"
- `company_dashboard` → "Company Dashboard"
- `portfolio-2024` → "Portfolio 2024"

---

## Documentation Impact

### Where Metadata is Used

> **Source-of-truth rule (v3.1.0+):** Project identity lives in `.opencode/rules/project/metadata.json`. README.md, AGENTS.md, and downstream consumers READ that file. `.opencode/project_init.md` only stores the audit trail under `User Answers & Decision Log → ### Phase 2 — Project Metadata` and updates the matching row in `Artifact Pointers`.

1. **`.opencode/rules/project/metadata.json` (authoritative):**
   ```json
   {
     "project": {
       "name": "[validated technical name]",
       "displayName": "[derived display name]",
       "description": "[processed description]",
       "type": "[derived project type]",
       "primaryGoal": "[primary goal]",
       "targetAudience": "[target audience]",
       "team": "[from Phase 2 or git remote]",
       "repository": "[from git remote]"
     }
   }
   ```
   > Phase 6.5 wraps this file with `environments`, `initialized`, and `template_version` sections — do not delete those when re-running Phase 2.

2. **README.md** (rendered by Phase 7 from the JSON):
   ```markdown
   # [project.displayName]

   > [project.description]

   [project.type] built for [project.targetAudience].
   ```

3. **AGENTS.md** (rendered by Phase 7 from the JSON):
   ```markdown
   ## Project Overview
   [project.displayName] — [project.description]

   **Type:** [project.type]
   **Target Audience:** [project.targetAudience]
   **Primary Goal:** [project.primaryGoal]
   ```

4. **package.json** (only if creating a new Node.js project from scratch):
   ```json
   {
     "name": "[project.name]",
     "description": "[project.description]",
     "version": "0.1.0"
   }
   ```

5. **`.opencode/project_init.md`** (audit only — DO NOT duplicate metadata content):
   ```markdown
   ### Phase 2 — Project Metadata

   #### Q1: Metadata source
   - What I found: pkg.name=..., readme.title=..., description present/trivial=...
   - Question asked: silent acceptance OR adaptive question (Step 2-Reflection)
   - User answer: ...
   - Decision stored in: `.opencode/rules/project/metadata.json`
   - Follow-up: none / TBD description
   ```

---

## MANDATORY: Phase Completion Actions

> **These actions are REQUIRED before Phase 2 can be considered complete.**
> **The agent MUST NOT proceed to Phase 3 without completing ALL of them.**

After collecting and validating metadata:

1. **Write `.opencode/rules/project/metadata.json`** — populate the `project.*` block with `name`, `displayName`, `description`, `type`, `primaryGoal`, `targetAudience`, and (when known) `team` / `repository`. If Phase 6.5 has not run yet, the file may exist with only this `project` block; that is fine. Use explicit `[TBD - confirm later]` strings for fields the user explicitly skipped.

2. **Update `.opencode/project_init.md` ledger:**
   - Set `Artifact Pointers → Project identity` to `populated` (or `partial — fields TBD: …`).
   - Tick `Phase 2` and `Phase 2 reflection completed` in `## Phase Checklist`.

3. **Append the audit trail** to `.opencode/project_init.md → ## User Answers & Decision Log → ### Phase 2 — Project Metadata` using the canonical Q-block format from `SKILL.md → Phase Reflection Checkpoint → Step 4`. Include at minimum:
   - One Q-block per question actually asked (silent acceptance ⇒ a single `Q1` block with `Question asked: none — silent acceptance`).
   - Reflection result (`Reflection: yes/no — all clear`).
   - `Decision stored in:` always points to `.opencode/rules/project/metadata.json` (not the ledger).

4. **Mirror open gaps** — if any field is `[TBD - confirm later]`, add a bullet to `## Open Gaps` with `gap`, `source phase = 2`, `owner`, `suggested follow-up`.

5. **Verify** — Re-read `.opencode/rules/project/metadata.json` and confirm the `project` block has real values (or explicit `[TBD - confirm later]` markers). The ledger MUST NOT contain a duplicated "Project Metadata" key=value block — only the Q-blocks under the Decision Log.

6. **Show progress:** `✅ Metadata collected (2/9 phases complete) — written to .opencode/rules/project/metadata.json`

---

## Special Cases

### Case 1: Conflicting Information

If package.json and README.md have different information:

```
⚠️ Conflicting Information Detected

package.json:
- Name: [pkg-name]
- Description: [pkg-description]

README.md:
- Title: [readme-title]
- Description: [readme-description]

Which is correct?
1. Use package.json information
2. Use README.md information
3. Combine both
4. Provide new information

Your choice:
```

### Case 2: Missing package.json in EXISTING_PROJECT

```
ℹ️  No package.json Found

This appears to be an existing project without a package.json file.

Is this:
1. A non-Node.js project (different technology stack)
2. A Node.js project missing package.json (we can create one)
3. Wrong directory selected

Your choice:
```

### Case 3: Generic/Template Names Detected

If project name is generic (e.g., "my-app", "new-project", "app", "project"):

```
⚠️ Generic Project Name Detected

The name "[detected-name]" appears to be a placeholder or template name.

Would you like to provide a more specific project name?

Examples:
- "acme-ecommerce-platform"
- "techcorp-admin-dashboard"
- "john-doe-portfolio"

New project name (or press Enter to keep current):
```

---

## Related Modules

- **Parent:** [Project Initialization Skill](../SKILL.md) - Main initialization orchestrator
- **Previous:** [user-roles-mcp.md](user-roles-mcp.md) - Phase 1.5: User role selection & MCP configuration
- **Next:** [stack-configuration.md](stack-configuration.md) - Phase 3: Technology stack selection

---

## Important Notes

1. **Ask progressively** - Never overwhelm with all questions at once
2. **Provide examples** - Help users understand what information to provide
3. **Validate immediately** - Catch issues early before they propagate
4. **Process and normalize** - Ensure consistency across all documentation
5. **Derive intelligently** - Infer additional metadata to reduce user burden
6. **Handle conflicts gracefully** - Existing projects may have inconsistent information

This module ensures high-quality project metadata that forms the foundation for all subsequent documentation and configuration.
