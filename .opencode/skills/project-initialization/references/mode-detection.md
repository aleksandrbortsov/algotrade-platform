
# Mode Detection Module

This module handles Phase 1 of project initialization: **automatically** detecting whether the user is starting a new project or integrating the template into an existing codebase.

**Parent Workflow:** [Project Initialization Skill](../SKILL.md)

---

## Phase 1: Mode Detection (Auto, no ritual confirmation)

**Purpose:** Determine the initialization mode to tailor the subsequent questions and analysis approach — **without** asking the user a redundant Y/N question when the answer is obvious from the file system.

> **Hard rule:** the agent MUST NOT ask "Is this a new or existing project?" except in the single ambiguous edge case (`signals == 1`). In every other case the mode is determined silently and the discovered indicators are logged in `project_init.md` Notes for transparency.

---

### Step 0 — Check `.core-version.json` first (highest-priority signal)

```
If .opencode/rules/.core-version.json exists:
  Read its `initializationStatus` field.

  → "active"            → already initialised. Do NOT run mode detection.
                          Delegate to Project Updater (`.opencode/agents/project-updater.md`).
  → "fresh" + all coreFiles hashes "pending" → continue to file-signal scan below.
  → field missing / file unreadable → continue to file-signal scan below.
```

The `"active"` status itself is conclusive proof of an existing initialised project; re-asking the user is forbidden.

---

### Step 1 — File-signal scan (silent)

Compute a `signals` integer by adding **+1** for each category that has at least one match. Each category is counted **at most once** even if it has multiple matches.

| # | Signal category | Match patterns |
|---|-----------------|----------------|
| 1 | Package manifest | `package.json`, `pyproject.toml`, `requirements.txt`, `Pipfile`, `go.mod`, `pom.xml`, `build.gradle`, `Cargo.toml`, `composer.json`, any `*.csproj`, `Gemfile` |
| 2 | Source directory with code | `src/`, `app/`, `lib/`, `backend/`, `frontend/`, `packages/*/src/` containing files with extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.vue`, `.svelte`, `.py`, `.go`, `.java`, `.kt`, `.rs`, `.rb`, `.cs`, `.php` |
| 3 | Lock file | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`, `poetry.lock`, `Pipfile.lock`, `go.sum`, `Cargo.lock`, `Gemfile.lock`, `composer.lock` |
| 4 | Build / framework config | `tsconfig.json`, `vite.config.*`, `webpack.config.*`, `next.config.*`, `nuxt.config.*`, `svelte.config.*`, `angular.json`, `tailwind.config.*`, `rollup.config.*`, `esbuild.config.*` |
| 5 | Git history beyond template seed | `.git/` directory exists **and** `git log --oneline` returns at least 2 commits **or** any commit not authored by the template (heuristic: any commit whose message does not start with `chore: init template` / `chore: initial template`) |

### Step 2 — Decide mode (silent)

```
signals >= 2  →  MODE = EXISTING_PROJECT     (no confirmation, log in Notes)
signals == 0  →  MODE = NEW_PROJECT          (no confirmation, log in Notes)
signals == 1  →  MODE = AMBIGUOUS            (one — and only one — confirmation question; see Step 3)
```

### Step 3 — Single-edge-case confirmation (only when `signals == 1`)

```
🔍 Project Mode — Single Indicator

I found exactly one signal: {signal name + path}
Other typical signs of an existing codebase are absent.

Which fits?
  [A] EXISTING_PROJECT — there is meaningful code already, the indicator is real
  [B] NEW_PROJECT — that file is leftover / scaffolded, treat as fresh start

Your choice:
```

This is the only user-facing question Phase 1 may produce. Skip it in all other cases.

---

## Detection Implementation (pseudocode)

```javascript
// Step 0
if (exists('.opencode/rules/.core-version.json')) {
  const v = readJson('.opencode/rules/.core-version.json');
  if (v.initializationStatus === 'active') return delegateToUpdater();
}

// Step 1 — file signals
let signals = 0;
const matched = [];

if (anyExists([
  'package.json','pyproject.toml','requirements.txt','Pipfile','go.mod',
  'pom.xml','build.gradle','Cargo.toml','composer.json','Gemfile'
]) || anyMatch('*.csproj')) { signals++; matched.push('package_manifest'); }

if (anyDirHasCode(
  ['src','app','lib','backend','frontend'],
  ['.ts','.tsx','.js','.jsx','.vue','.svelte','.py','.go','.java','.kt','.rs','.rb','.cs','.php']
)) { signals++; matched.push('source_dir_with_code'); }

if (anyExists([
  'package-lock.json','yarn.lock','pnpm-lock.yaml','bun.lockb',
  'poetry.lock','Pipfile.lock','go.sum','Cargo.lock','Gemfile.lock','composer.lock'
])) { signals++; matched.push('lock_file'); }

if (anyMatchAny([
  'tsconfig.json','vite.config.*','webpack.config.*','next.config.*',
  'nuxt.config.*','svelte.config.*','angular.json','tailwind.config.*',
  'rollup.config.*','esbuild.config.*'
])) { signals++; matched.push('framework_config'); }

if (gitHasNonTemplateCommits()) { signals++; matched.push('git_history'); }

// Step 2 — decide
const mode =
  signals >= 2 ? 'EXISTING_PROJECT' :
  signals === 0 ? 'NEW_PROJECT' :
  /* signals === 1 */ askSingleEdgeCase(matched[0]);
```

---

## What about a single confirmation prompt for clarity?

There used to be a "Yes / No, this is a [DETECTED_MODE]" confirmation step for every project. **It has been removed** in favour of silent auto-detection because:

- `.core-version.json` already proves whether the project is initialised.
- File-system signals are deterministic — when ≥2 are present the conclusion is not in doubt.
- Asking creates noise and trains the user to click `1` reflexively, defeating the purpose.

Transparency is preserved by **logging all detected indicators in `project_init.md` Notes** so the user can review and override later.

---

## Mode-Specific Implications

### NEW_PROJECT Mode Implications

When mode is set to NEW_PROJECT:

**Phase 2 (Metadata):**
- Ask about project vision and goals
- Request project name and description
- No existing code to analyze

**Phase 3 (Technology Stack):**
- Ask user to choose technologies
- Progressive questioning about preferences
- No automatic detection

**Phase 4 (Codebase Analysis):**
- **SKIP ENTIRELY** — no existing code to analyse

**Phase 5 (Requirements):**
- Ask about planned features and components
- No existing component inventory

**Phase 6 (Rule Updates):**
- Apply chosen stack templates from scratch
- No existing patterns to preserve

**Phase 7 (Documentation):**
- Generate all documentation as new
- No existing README to preserve

### EXISTING_PROJECT Mode Implications

When mode is set to EXISTING_PROJECT:

**Phase 2 (Metadata):**
- Extract name + description from `package.json` / equivalent and README
- Accept silently if data is consistent — no Y/N confirmation
- Ask only if metadata is conflicting or trivially short (`metadata-collection.md` Special Case 1 / Reflection)

**Phase 3 (Technology Stack):**
- **Automatic detection** from dependencies and config files
- Present findings for confirmation
- Allow manual correction if detection is wrong

**Phase 4 (Codebase Analysis):**
- **EXECUTE** — the codebase-analyzer wave must return business modules + top entities + top endpoints + named integrations (persisted to `.opencode/project/analysis/`)
- Generate comprehensive codebase report
- Reflection Checkpoint **mandatory** with name-referencing questions

**Phase 5 (Requirements):**
- Each round becomes **skip-by-default** if Phase 4 already provides the answer
- Ask only the missing items, not the whole round
- Pre-check compliance hints (Stripe → PCI DSS likely; HIPAA / GDPR detection from naming)

**Phase 6 (Rule Updates):**
- Per-domain Reflection Step 0 computes confidence and decides 0–3 questions
- Preserve existing patterns; reference concrete entities/modules from Phase 4

**Phase 7 (Documentation):**
- Preserve and enhance existing README
- Generate ARCHITECTURE.md based on analysis
- Document technical debt and migration paths

---

## Edge Cases & Special Handling

### Case 1: Monorepo Detection

If multiple `package.json` files detected:

```
🔍 Monorepo Detected

I found multiple package.json files in your project.

Which workspace would you like to initialize?
1. Root workspace (entire monorepo)
2. Specific workspace: [list detected workspaces]

Your choice:
```

Mode is still EXISTING_PROJECT in this case — the question is about *scope*, not *mode*.

### Case 2: Template Already Integrated

If `.opencode/rules/.core-version.json` shows `initializationStatus: "active"` (handled in Step 0 above) the agent must delegate to the Project Updater. Do not show a re-init menu — that decision is owned by `/update-workplace`.

If `.opencode/rules/` exists but `.core-version.json` does not (corrupted state):

```
⚠️ Template files present but version manifest is missing

The .opencode/ directory exists, but .opencode/rules/.core-version.json is absent or unreadable.

Options:
1. Treat as fresh initialization (will re-create version manifest)
2. Cancel and recover the manifest manually

Your choice:
```

### Case 3: Mixed Indicators (`signals == 1`)

This is the only edge case where the user is asked. See Step 3 above.

---

## Validation & Error Handling

### Validation Checks

Before proceeding with detected mode:

1. **Verify `.opencode/` directory exists** (template structure)
2. **Check `.opencode/project_init.md` is accessible**
3. **Ensure write permissions** for updating configuration
4. **Validate workspace path** is correct

### Error: Cannot Read Files

```
❌ Error: Unable to Scan Project Directory

I encountered an error while scanning for project files:
[Error message]

Options:
1. Retry automatic detection
2. Manually specify mode (NEW_PROJECT or EXISTING_PROJECT)
3. Check file permissions and try again

Your choice:
```

### Error: Conflicting Metadata Information (handled in Phase 2, not Phase 1)

Conflicts between `package.json` name and README title are surfaced in Phase 2 (`metadata-collection.md` Special Case 1), not here. Phase 1 only classifies the **mode**, not the **identity**.

---

## MANDATORY: Phase Completion Actions

> **These actions are REQUIRED before Phase 1 can be considered complete.**
> **The agent MUST NOT proceed to Phase 1.5 without completing ALL of them.**

After mode is auto-determined (or, in the single edge case, confirmed):

> **Source-of-truth rule (v3.1.0+):** the determined mode lives in `.opencode/project_init.md → ## Initialization State → Current Mode`. Detection signals and the optional edge-case answer live as Q-blocks under `## User Answers & Decision Log → ### Phase 1 — Mode Detection`. There is no separate "Initialization Mode" or "Notes & Additional Context" section in the v3.1.0 ledger.

1. **Update `## Initialization State`** — Set the `Current Mode` cell to `NEW_PROJECT` or `EXISTING_PROJECT` (replacing `[TO_BE_DETERMINED]`).

2. **Append Q-blocks to the Decision Log** — `.opencode/project_init.md → ## User Answers & Decision Log → ### Phase 1 — Mode Detection`, using the canonical format from `SKILL.md → Phase Reflection Checkpoint → Step 4`:

   ```markdown
   #### Q1: Mode auto-detection
   - Reflection: yes
   - What I found: signals={LIST e.g. package_manifest, source_dir_with_code, lock_file}; .core-version.json={fresh|active|missing}; signals count={N}
   - Question asked: none — silent auto-detection (or: edge-case confirmation when signals == 1)
   - User answer: detected={AUTO_DETECTED_MODE} → final={FINAL_MODE} (edge-case answer [A/B] when applicable)
   - Decision stored in: `.opencode/project_init.md → ## Initialization State → Current Mode`
   - Follow-up: none
   ```

   When extra clarification was asked, append additional Q-blocks (Q2…) following the same template.

3. **Tick checkboxes** — `Phase 1` AND `Phase 1 reflection completed` in `## Phase Checklist`.

4. **Verify** — Re-read `## Initialization State`; confirm `Current Mode` is no longer `[TO_BE_DETERMINED]`. Confirm Decision Log §1 has at least one Q-block.

5. **Show progress:** `✅ Mode detected (1/9 phases complete)`

---

## Related Modules

- **Parent:** [Project Initialization Skill](../SKILL.md) — Main initialization orchestrator
- **Previous:** [environment-setup.md](environment-setup.md) — Phase 0: Environment configuration
- **Next:** [user-roles-mcp.md](user-roles-mcp.md) — Phase 1.5: User role selection & MCP configuration

---

## Important Notes

1. **Auto-detect, don't ask** — confirmation is reserved for the single ambiguous case (`signals == 1`).
2. **Provide clear reasoning** — every detection records the matched signals in Notes.
3. **Allow override later** — users may correct the mode by editing `Current Mode` in `project_init.md` before Phase 2 starts.
4. **Document decision** — record signals + decision for audit trail.
5. **Set expectations** — explain what the chosen mode means for subsequent phases (only when actually printing the mode summary, not as a question).

This module ensures accurate, low-friction mode detection, which is critical for tailoring the rest of the initialization process appropriately.
