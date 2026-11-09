
# Technology Stack Configuration Module

This module handles Phase 3 of project initialization: determining the technology stack through user selection (NEW_PROJECT) or automatic detection (EXISTING_PROJECT).

**Parent Workflow:** [Project Initialization Skill](../SKILL.md)

---

## Phase 3: Technology Stack Configuration

**Purpose:** Establish the complete technology stack to enable framework-specific rules and optimizations.

### Stack Components to Determine

1. **Framework** - Core frontend/backend framework
2. **Build Tool** - Build system and bundler
3. **Styling** - CSS approach and tooling
4. **State Management** - State management solution
5. **Testing** - Testing frameworks
6. **Package Manager** - npm, yarn, pnpm, or bun
7. **TypeScript** - TypeScript usage and configuration

---

## BA-Only Role Gate

Before proceeding with stack configuration, check if the user selected **only** the BA role (no developer roles combined):

```
If ALL selected roles are `ba` (no developer roles like frontend, backend, fullstack, etc.):

  For EXISTING_PROJECT:
    - Run the same automatic detection logic (package.json, config files)
      using Steps 1-2 below (detectStack + scanConfigFiles)
    - Write results into `.opencode/rules/development.md` (the only stack record)
    - Do NOT present findings to the user for confirmation (skip Step 3)
    - Do NOT ask correction questions (skip Step 4)
    - Skip compatibility validation (irrelevant for BA)
    - Append a single Q-block to .opencode/project_init.md → User Answers & Decision Log → ### Phase 3 — Technology Stack:
      "Q1: Stack source
       - What I found: [auto-detected stack summary]
       - Question asked: none — silent acceptance (BA mode)
       - User answer: accepted
       - Decision stored in: `.opencode/rules/development.md`
       - Follow-up: none"
    - Update Artifact Pointers row "Stack + architecture (always-applied)" to `populated`
    - Proceed directly to Phase 4

  For NEW_PROJECT:
    - Ask ONE simplified question:

      "⚙️ Technology Stack (BA Mode)

       What is the main technology/framework used by your development team?
       (e.g., 'React + Node.js', 'Angular + Java Spring', 'Vue + Python', 'not sure')

       This helps me understand code structure during impact analysis."

    - If user answers with identifiable technologies:
      - Map to the closest stack components (Framework, Build Tool, etc.) in `development.md`
      - Leave unidentifiable components as "Unknown"
    - If user answers "not sure" or equivalent:
      - Set all stack components to "Unknown (BA mode)" in `development.md`
    - Skip all detailed stack-component prompts
    - Skip compatibility validation
    - Append a single Q-block to .opencode/project_init.md → User Answers & Decision Log → ### Phase 3 — Technology Stack:
      "Q1: Stack source (BA mode)
       - What I found: BA-only project, no auto-detection signals
       - Question asked: 'What is the main technology/framework used by your development team?'
       - User answer: [user's answer]
       - Decision stored in: `.opencode/rules/development.md`
       - Follow-up: none"
    - Proceed directly to Phase 4
```

If BA is combined with developer roles (e.g., "Backend Developer, BA"), skip this gate and proceed with the standard flow below.

---

## For NEW_PROJECT

> **Adaptive flow.** No fixed rounds. The agent runs the four-step adaptive pattern from [SKILL.md → Adaptive Question Principle](../SKILL.md#adaptive-question-principle-project-wide-rule) and asks **only what cannot be inferred** from the project signals already collected (project name, role, target audience, BA-Only mode flag, primary goal).

### Step 1 — Inventory what is already known

Read everything Phases 0–2 produced:

- Selected role(s) from `metadata.json → project.roles`
- Project description, audience, primary goal from `metadata.json → project.description / audience / goals`
- BA-Only mode flag (if every selected role is `ba` → see BA-Only Role Gate above; this whole section is skipped)
- Any user-supplied repo URLs, reference projects, or "we use X" mentions in the metadata answers

### Step 2 — Default reasoning (BEFORE asking anything)

Apply role × audience × goal heuristics to derive a candidate stack with HIGH/MED/LOW confidence per component. The agent thinks like a tech lead doing a kickoff: a `frontend` web app for B2B SaaS targeting modern browsers strongly implies React/Vue/Angular + Vite + TypeScript + Tailwind (or CSS Modules) + a modern state library. A `backend` REST service for fintech strongly implies a typed language + ORM + PostgreSQL + a testing framework. Use general industry knowledge — do not encode lookup tables here.

The output of Step 2 is a draft stack proposal with per-component confidence — **NOT** a list of questions yet.

### Step 3 — Generate ONLY the questions needed

For each stack component (framework, build tool, styling, state management, testing, package manager, TypeScript level):

| Confidence after Step 2 | Action |
|---|---|
| **HIGH** (one obvious answer given role + goal) | Pre-fill silently; no question. Note in Decision Log: `auto-detected from role+goals: <choice>`. |
| **MEDIUM** (2–3 plausible options) | Generate **one** question with 2–4 named options + `[Skip — let me decide later]`, citing why these specific options were shortlisted. |
| **LOW** (truly underdetermined) | Generate **one** open-ended question with 4–5 industry-standard options + `[Skip — TBD]`, citing what was unclear. |

**Hard limits.**
- Maximum **3 questions** per Phase 3 round across all components — even if multiple are MEDIUM, batch the highest-impact ones first.
- If every component scores HIGH → ask **zero** questions. Present the proposal as a single confirmation: "I'm proposing <stack>. Press Enter to confirm or list components to override (comma-separated)."
- Never ask about a component whose value is already implied unambiguously by the framework choice (e.g. don't ask about build tool when Next.js was chosen — Turbopack/Next default is implied).

### Step 4 — Present the adaptive prompt

Format must match this template (concrete example for a B2B SaaS frontend role with no ambiguity beyond styling and state management):

```
⚙️  Technology Stack — Proposal

Based on role=frontend, audience=B2B SaaS, modern browsers, the following stack
is the strongest fit. I auto-detected items I have HIGH confidence on; please
answer only the items where I had to guess.

  ✓ Framework        : React (HIGH — most common for B2B SaaS frontends)
  ✓ Build tool       : Vite (HIGH — implied by React + modern browsers)
  ✓ TypeScript       : Yes, strict mode (HIGH — B2B SaaS standard)
  ✓ Package manager  : pnpm (HIGH — efficient default for new repos)
  ?  Styling         : Tailwind CSS or CSS Modules — both common at this scale
  ?  State management: Zustand, Jotai, or Redux Toolkit — depends on your team's preference
  ✓ Testing          : Vitest + Playwright (HIGH — Vite-native + E2E baseline)

Answer the items marked "?" (or press Enter to accept my recommendation in the
parentheses below):

  Styling          [recommended: Tailwind CSS]:
  State management [recommended: Zustand]:
```

Items with confidence HIGH are NEVER turned into questions. Items with confidence MEDIUM/LOW become inline gap questions, batched into a single user interaction.

If the agent's reasoning produces zero ambiguous items, the prompt collapses to a one-line confirmation:

```
⚙️  Technology Stack — Proposal

I'm proposing <stack one-liner>. Press Enter to confirm, or type the components
to override (e.g. "framework=Vue, styling=Sass"):
```

### Step 5 — Persist + Decision Log

Write the resolved stack to `.opencode/rules/development.md` and append one Q-block per **decision** to the Decision Log (silent acceptance + per-component overrides each get their own Q-block, per the rule already in `### 2. Append the audit trail`).

---

## For EXISTING_PROJECT

### Step 1: Analyze package.json

```javascript
function detectStack(packageJson) {
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  const stack = {
    framework: detectFramework(dependencies),
    buildTool: detectBuildTool(dependencies, packageJson.scripts),
    styling: detectStyling(dependencies),
    stateManagement: detectStateManagement(dependencies),
    testing: detectTesting(dependencies),
    packageManager: detectPackageManager(),
    typescript: detectTypeScript(dependencies)
  };
  
  return stack;
}
```

#### Framework Detection

```javascript
function detectFramework(deps) {
  if (deps['next']) return { name: 'Next.js', version: deps['next'] };
  if (deps['nuxt']) return { name: 'Nuxt', version: deps['nuxt'] };
  if (deps['@sveltejs/kit']) return { name: 'SvelteKit', version: deps['@sveltejs/kit'] };
  if (deps['react']) return { name: 'React', version: deps['react'] };
  if (deps['vue']) return { name: 'Vue', version: deps['vue'] };
  if (deps['@angular/core']) return { name: 'Angular', version: deps['@angular/core'] };
  if (deps['svelte']) return { name: 'Svelte', version: deps['svelte'] };
  if (deps['solid-js']) return { name: 'Solid', version: deps['solid-js'] };
  
  return { name: 'Unknown', version: null };
}
```

#### Build Tool Detection

```javascript
function detectBuildTool(deps, scripts) {
  // Check scripts first (more reliable)
  const scriptStr = JSON.stringify(scripts);
  
  if (scriptStr.includes('vite')) return 'Vite';
  if (scriptStr.includes('next')) return 'Next.js (built-in)';
  if (scriptStr.includes('turbo')) return 'Turbopack';
  if (scriptStr.includes('webpack')) return 'Webpack';
  if (scriptStr.includes('rollup')) return 'Rollup';
  if (scriptStr.includes('esbuild')) return 'esbuild';
  
  // Fallback to dependencies
  if (deps['vite']) return 'Vite';
  if (deps['webpack']) return 'Webpack';
  if (deps['rollup']) return 'Rollup';
  if (deps['esbuild']) return 'esbuild';
  
  return 'Unknown';
}
```

#### Styling Detection

```javascript
function detectStyling(deps) {
  const styles = [];
  
  if (deps['tailwindcss']) styles.push('Tailwind CSS');
  if (deps['styled-components']) styles.push('Styled Components');
  if (deps['@emotion/react']) styles.push('Emotion');
  if (deps['sass'] || deps['node-sass']) styles.push('Sass/SCSS');
  
  // Check for CSS Modules (scan for *.module.css files)
  const hasCSSModules = findFiles('**/*.module.css').length > 0;
  if (hasCSSModules) styles.push('CSS Modules');
  
  return styles.length > 0 ? styles : ['Vanilla CSS'];
}
```

#### State Management Detection

```javascript
function detectStateManagement(deps) {
  if (deps['@reduxjs/toolkit'] || deps['redux']) return 'Redux Toolkit';
  if (deps['zustand']) return 'Zustand';
  if (deps['jotai']) return 'Jotai';
  if (deps['recoil']) return 'Recoil';
  if (deps['mobx']) return 'MobX';
  if (deps['react'] && !Object.keys(deps).some(d => 
    ['redux', 'zustand', 'jotai', 'recoil', 'mobx'].includes(d)
  )) return 'Context API (likely)';
  
  return 'None detected';
}
```

#### Testing Detection

```javascript
function detectTesting(deps) {
  const testing = [];
  
  if (deps['vitest']) testing.push('Vitest');
  if (deps['jest']) testing.push('Jest');
  if (deps['@playwright/test']) testing.push('Playwright');
  if (deps['cypress']) testing.push('Cypress');
  if (deps['@testing-library/react'] || deps['@testing-library/vue']) {
    testing.push('Testing Library');
  }
  
  return testing.length > 0 ? testing : ['Not configured'];
}
```

#### Package Manager Detection

```javascript
function detectPackageManager() {
  if (fileExists('bun.lockb')) return 'bun';
  if (fileExists('pnpm-lock.yaml')) return 'pnpm';
  if (fileExists('yarn.lock')) return 'yarn';
  if (fileExists('package-lock.json')) return 'npm';
  
  return 'npm (default)';
}
```

#### TypeScript Detection

```javascript
function detectTypeScript(deps) {
  if (!deps['typescript']) return 'No';
  
  // Check tsconfig.json for strict mode
  if (fileExists('tsconfig.json')) {
    const tsconfig = JSON.parse(readFile('tsconfig.json'));
    if (tsconfig.compilerOptions?.strict === true) {
      return 'Yes - strict mode';
    }
  }
  
  return 'Yes - standard mode';
}
```

### Step 2: Scan Configuration Files

Additional detection from config files:

```javascript
function scanConfigFiles() {
  const configs = {};
  
  // Vite
  if (findFiles('vite.config.*').length > 0) {
    configs.buildTool = 'Vite';
  }
  
  // Webpack
  if (findFiles('webpack.config.*').length > 0) {
    configs.buildTool = 'Webpack';
  }
  
  // Next.js
  if (findFiles('next.config.*').length > 0) {
    configs.framework = 'Next.js';
    configs.buildTool = 'Next.js (built-in)';
  }
  
  // Tailwind
  if (findFiles('tailwind.config.*').length > 0) {
    configs.styling = 'Tailwind CSS';
  }
  
  // TypeScript
  if (fileExists('tsconfig.json')) {
    configs.typescript = true;
  }
  
  return configs;
}
```

### Step 3: Present Findings

```
📊 Detected Technology Stack

Core Technologies:
- Framework: [detected framework] [version] ✅
- Build Tool: [detected build tool] ✅
- Styling: [detected styling] ✅
- State Management: [detected state mgmt] ✅
- Testing: [detected testing frameworks] ✅
- Package Manager: [detected package manager] ✅
- TypeScript: [Yes - strict/Yes - standard/No] ✅

Key Dependencies:
- [dependency1]@[version]
- [dependency2]@[version]
- [dependency3]@[version]
- [etc... top 5-10]

Development Tools:
- [ESLint, Prettier, Husky, etc.]

Press Enter to accept, or list the components to correct
(e.g. "styling=Sass, testing=Jest"):
```

### Step 4: Handle Corrections

For each component the user named, ask one specific question for that component only — 2–4 options drawn from the detected signals plus `Custom` — and re-run the compatibility validation. Never re-present the whole list or a "which component?" menu: the user already named it.

---

## Validation

### Compatibility Checks

```javascript
function validateStackCompatibility(stack) {
  const warnings = [];
  const errors = [];
  
  // Check framework + build tool compatibility
  if (stack.framework === 'Angular' && stack.buildTool === 'Vite') {
    warnings.push('Angular typically uses its own CLI, not Vite. Are you sure?');
  }
  
  if (stack.framework === 'Next.js' && stack.buildTool !== 'Next.js (built-in)') {
    errors.push('Next.js has its own built-in build tool. Cannot use external bundler.');
  }
  
  // Check state management + framework compatibility
  if (stack.framework === 'Vue' && stack.stateManagement === 'Redux Toolkit') {
    warnings.push('Redux is typically used with React. Consider Pinia for Vue.');
  }
  
  // Check TypeScript + framework versions
  if (stack.typescript && stack.framework === 'React' && !stack.framework.version.startsWith('18')) {
    warnings.push('Consider upgrading React to v18+ for better TypeScript support.');
  }
  
  return { warnings, errors };
}
```

**If errors found:**

```
❌ Stack Configuration Errors

The following issues were detected:
- [Error 1]
- [Error 2]

Please resolve these issues before proceeding.
```

**If warnings found:**

```
⚠️  Stack Configuration Warnings

The following potential issues were detected:
- [Warning 1]
- [Warning 2]

Do you want to:
1. Proceed anyway (I know what I'm doing)
2. Review and correct the configuration

Your choice:
```

---

## Update Action

> **Single source of truth (v3.1.0+):** The full technology stack lives in **`.opencode/rules/development.md`** only. `.opencode/project_init.md` no longer carries a "Technology Stack" key=value block — it carries one Q-block per decision in the Decision Log plus an `Artifact Pointers` row update.

### 1. PRIMARY: Update `.opencode/rules/development.md`

This is the **single source of truth** that agents will always have in context (always-on instruction via `.opencode/opencode.json → instructions`):

```markdown
## Project Technology Stack

> **⭐ Single Source of Truth for Technology Stack**
>
> Populated during Phase 3. All other files (README.md, AGENTS.md, documentation) reference this section.

## Core Technologies

- **Framework:** [framework name] [version]
- **Build Tool:** [build tool]
- **Styling:** [styling solution]
- **State Management:** [state management]
- **Testing:** [testing frameworks]
- **Package Manager:** [package manager]
- **TypeScript:** [Yes - strict/Yes - standard/No]

## Stack Details

- **Framework Version:** [full version]
- **Key Dependencies:** [top 5-10 critical packages with versions]
- **Development Tools:** [ESLint, Prettier, Husky, etc.]

## Stack Configuration Notes

[Any important notes about stack choices, version constraints, or migration plans]
```

### 2. Append the audit trail to `.opencode/project_init.md`

Add one Q-block per decision under `## User Answers & Decision Log → ### Phase 3 — Technology Stack`. Use the canonical format from `SKILL.md → Phase Reflection Checkpoint → Step 4`. Examples:

```markdown
#### Q1: Framework
- What I found: react@18.2.0 + react-dom@18.2.0 in package.json; no Next.js / Remix detected
- Question asked: none — auto-detected (EXISTING_PROJECT)
- User answer: accepted
- Decision stored in: `.opencode/rules/development.md` (Core Technologies → Framework)
- Follow-up: none

#### Q2: TypeScript strictness
- What I found: tsconfig.json present, `"strict": false`
- Question asked: 'Detected TypeScript without strict mode — keep as-is or enable strict?'
- User answer: keep as-is (legacy code)
- Decision stored in: `.opencode/rules/development.md` (Core Technologies → TypeScript)
- Follow-up: TBD migration to strict mode (logged under Open Gaps)
```

For NEW_PROJECT, log one Q-block per round-question. For silent acceptance in EXISTING_PROJECT, a single Q-block per detected component group is sufficient — but every user-corrected component MUST get its own Q-block.

### 3. Append Stack-Specific Watcher Patterns to `opencode.json`

See [environment-setup.md](environment-setup.md) → Part 1, Step 4 for the `watcher.ignore` entries to merge based on the framework. Record the change as a Decision Log line:

```markdown
#### Q{n}: watcher.ignore patterns
- What I found: framework={framework}, no framework-specific patterns yet
- Question asked: none — automatic
- User answer: accepted
- Decision stored in: `opencode.json` (`watcher.ignore`)
- Follow-up: none
```

### 4. Update `Artifact Pointers`

Set the row for `Stack + architecture (always-applied)` to `populated`. Do NOT add a parallel "Technology Stack" section to the ledger.

### 5. MANDATORY: Verify and Complete

> **These steps are REQUIRED before Phase 3 can be considered complete.**
> **The agent MUST NOT proceed to Phase 4 without completing ALL of them.**

1. **Tick checkbox** — `Phase 3` in `## Phase Checklist`.
2. **Verify `development.md`** — Re-read the Technology Stack section; confirm no `[TO_BE_FILLED]` remains.
3. **Verify Decision Log** — `### Phase 3 — Technology Stack` has at least one Q-block; the `Decision stored in:` field always points to `.opencode/rules/development.md` (or `opencode.json` for watcher patterns), never to the ledger itself.
4. **Mirror open gaps** — any TBD (e.g., strict-mode migration) is added to `## Open Gaps`.
5. **Show progress:** `✅ Stack configured (3/9 phases complete) — written to .opencode/rules/development.md`

---

## Part: Generate `.opencode/hooks/docs-sync-config.json`

**Purpose:** Extend the docs-sync plugin's built-in detection (`docs-sync-check.js`) (JS/TS-centric by default: `package.json`, `tsconfig`, `.tsx`, `webpack`, etc.) with patterns for the stack just determined above. The hook's hardcoded defaults are a safe baseline for any project; this file only **adds** to them — it can never remove or override a default category, dependency file, build-config file, or ignore pattern. An absent or empty file reproduces default-only behavior with zero regression risk.

**When:** End of Phase 3, immediately after the stack is written to `development.md` (NEW_PROJECT) or confirmed (EXISTING_PROJECT) — this is the earliest point where the stack is actually known; Phase 0.5/Part 1.7 (where the hook itself is enabled/disabled) runs too early. **Skip entirely in BA-Only mode** — no source-code categories are relevant when no developer role was selected.

### Step 1 — Map the resolved stack to pattern additions

Consult the table below for every signal that matches the resolved stack (from Steps 1–4 above for NEW_PROJECT, or Step 1–2 detection for EXISTING_PROJECT) **and** any repo markers already observed during detection. Only include a row if the corresponding built-in default in `docs-sync-check.js` does not already cover it — e.g. do NOT add `package.json` to `dependencyFiles`, it is already a default.

| Stack signal | `dependencyFiles` additions | `buildConfigFiles` additions | `categories` additions | Notes |
|---|---|---|---|---|
| .NET / C# (`*.csproj`, `*.sln`) | `\.csproj$`, `\.sln$` | — | — | `pom.xml`/`build.gradle*`/`go.mod` etc. are already defaults |
| Bazel (`MODULE.bazel`, `WORKSPACE`, `BUILD.bazel`) | `MODULE\.bazel$`, `WORKSPACE(\.bazel)?$`, `BUILD\.bazel$` | `\.bazelrc$` | — | {bas_company} Cloud NRM/BSS backends commonly use Bazel |
| Helm / Kubernetes manifests (`helm/`, `charts/`, `k8s/`) | — | — | `infra`: `(?:^\|/)helm/`, `(?:^\|/)charts/`, `(?:^\|/)k8s/`, `values\.ya?ml$` | Default `infra` only covers `Dockerfile`/`docker-compose`/`.tf$`/CI dirs |
| GitLab CI (`.gitlab-ci.yml`) | — | — | `infra`: `\.gitlab-ci\.yml$` | Default only covers `.github/` and `ci/` |
| Jenkins (`Jenkinsfile`) | — | — | `infra`: `Jenkinsfile$` | |
| Raw-SQL-heavy backend (`*.sql` files present, no ORM/migration tool detected) | — | — | `database`: `\.sql$` | Default `database` covers `migration`/`schema`/`model`/`.prisma$` but not bare `.sql` |
| OpenAPI/Swagger spec present (`openapi*.yaml`, `swagger*.json`) | — | — | `api`: `openapi.*\.ya?ml$`, `openapi.*\.json$`, `swagger` | |
| Python + pytest convention (`test_*.py`, `*_test.py`) | — | — | `tests`: `(?:^\|/)test_[^/]*\.py$`, `_test\.py$` | Default `tests` only matches `.spec.`/`.test.`/`.e2e.` (JS/TS convention) |
| Go (`go.mod`, `cmd/`, `internal/`, `pkg/`) | — | — | `backend`: `\.go$`, `(?:^\|/)(cmd\|internal\|pkg)/`; `api`: `(?:^\|/)handlers?/`, `_handler\.go$` | Default `backend` matches only `service` / `middleware` / `handler` / `server/`, so Go code under `internal/` otherwise falls through to the `coding-standards-context` fallback |
| Java / Kotlin (Maven or Gradle, `src/main/java`) | — | — | `backend`: `src/main/(java\|kotlin)/`, `\.java$`, `\.kt$`; `database`: `src/main/resources/db/`, `\.sql$` | Spring `*Controller.java` already matches the default `controller` pattern; entities, repositories and Flyway / Liquibase scripts do not |
| Python service (`pyproject.toml`, `src/<pkg>/`) | — | — | `backend`: `\.py$`; `api`: `(?:^\|/)(routers?\|views)/` | Combine with the pytest row above |
| Any stack with a genuinely new domain not in the hook's built-in categories (`api`, `frontend`, `backend`, `database`, `tests`, `infra`, `docs`, `workspace`) | — | — | new `categories.<name>` block | Only set `categorySkills.<name>` if the matching `*-context` skill was actually activated in Phase 1.7-APM/Phase 6 — otherwise the hook's own skill-existence filter hides it anyway, so omitting is safe and preferred when unsure |

This table is illustrative, not exhaustive — apply the same reasoning (what does this stack produce that the JS/TS-centric defaults would miss?) to stacks not listed here.

### Step 2 — Write the file

Always create `.opencode/hooks/docs-sync-config.json` (creating the `.opencode/hooks/` directory first if `/initialize` hasn't already), even when Step 1 produced no additions for a pure JS/TS npm stack — an empty-but-present file documents that the defaults were reviewed and found sufficient, and gives the user a discoverable place to extend later. Skeleton:

```json
{
  "_comment": "Additive extensions to .opencode/hooks/docs-sync-check.js built-in defaults. Generated for stack: <one-line stack summary>. Safe to hand-edit; this file is never overwritten by /update-workplace.",
  "categories": {
    "infra": { "patterns": ["(?:^|/)helm/", "values\\.ya?ml$"] }
  },
  "dependencyFiles": ["\\.csproj$"],
  "buildConfigFiles": [],
  "ignoredPatterns": [],
  "categorySkills": {},
  "thresholds": {}
}
```

Use the same UTF-8-without-BOM writing discipline as `.core-version.json` (see [SKILL.md → Phase 8](../SKILL.md#windows-shell-compatibility)) — a BOM makes the hook's `JSON.parse` throw and silently fall back to defaults-only. On Windows, prefer `[System.IO.File]::WriteAllText($path, $json, (New-Object System.Text.UTF8Encoding $false))` over `Set-Content`/`Out-File`.

This file is **project-owned**: it is not added to `coreFiles` in `.core-version.json` and not `.gitignore`d — it must be committed, exactly like a domain skill's `project-config.json`.

### Step 3 — Decision Log + Artifact Pointers

- Append one Q-block to `.opencode/project_init.md → User Answers & Decision Log → ### Phase 3 — Technology Stack` documenting what stack signals drove the additions (or that none were needed):

  ```markdown
  #### Q{n}: docs-sync hook category config
  - What I found: {stack summary + repo markers, e.g., "Bazel (MODULE.bazel) + Helm charts under helm/"}
  - Question asked: none — automatic, derived from the resolved stack
  - User answer: accepted
  - Decision stored in: `.opencode/hooks/docs-sync-config.json`
  - Follow-up: none
  ```

- Update the `Artifact Pointers` row for `.opencode/hooks/docs-sync-config.json` (added in the ledger's Artifact Pointers table) from `[TO_BE_FILLED]` to `populated` (or `populated — empty, defaults sufficient` for the pure-JS/TS case).

---

## Related Modules

- **Parent:** [Project Initialization Skill](../SKILL.md) - Main initialization orchestrator
- **Previous:** [metadata-collection.md](metadata-collection.md) - Phase 2: Project metadata
- **Next:** [codebase-analysis.md](codebase-analysis.md) - Phase 4: Codebase analysis (EXISTING_PROJECT only)
- **See also:** [environment-setup.md](environment-setup.md) - Stack-specific `watcher.ignore` patterns

---

## Important Notes

1. **Ask only gaps** - Phase 3 is a proposal confirmed with Enter; questions exist only for MEDIUM/LOW components (NEW_PROJECT) or for components the user names (EXISTING_PROJECT)
2. **Provide context** - Explain why each technology matters
3. **Validate compatibility** - Catch incompatible combinations early
4. **Single source of truth** - `.opencode/rules/development.md` is the only stack record. The ledger only stores Q-blocks under the Decision Log.
5. **Audit every correction** - For EXISTING_PROJECT, every user-corrected component MUST become a separate Q-block in the Decision Log, even when the bulk of the stack was accepted silently.
6. **Handle existing projects carefully** - Detection might not be perfect: show the detected stack once with an Enter-to-accept confirmation, never a Y/N menu

This module ensures accurate technology stack configuration that forms the basis for all framework-specific rules and optimizations.
