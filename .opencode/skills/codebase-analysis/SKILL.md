---
name: codebase-analysis
description: Codebase analysis patterns for subagent delegation - codebase-analyzer for initialization artifacts, explore for ad-hoc search. Use when performing deep architecture analysis, dependency audits, refactoring impact assessment, or understanding unfamiliar codebase areas.
---

# Codebase Analyzer

This rule provides systematic analysis strategies for existing projects being integrated with the NC AI Workplace template, as well as for any complex codebase analysis task after initialization.

## When to Use

This analyzer is triggered when:
- Project initialization mode is set to `EXISTING_PROJECT`
- User has an existing codebase with application code
- Deep analysis is needed to understand project structure and adapt rules
- **Any complex post-initialization task** requires codebase understanding (architecture analysis, refactoring planning, dependency audit, etc.)

---

## Mandatory Subagent Delegation

> **CRITICAL RULE:** ALL complex codebase analysis tasks MUST be delegated to a subagent. The main agent MUST NOT perform deep codebase analysis directly in its own context window.

### Which subagent

Two subagent types, chosen by **what the caller needs back**:

| Subagent | Type | Returns | Use for |
|---|---|---|---|
| **`codebase-analyzer`** | custom, `.opencode/agents/codebase-analyzer.md`, **write-capable** | Two artifacts on disk (`.opencode/project/analysis/<component>.json` + `.md`) plus a ≤ 25-line summary | Every dispatch whose output a **later phase reads back** |
| **`explore`** | built-in | Its findings in the reply only — it writes nothing | Ad-hoc search where the answer is consumed immediately, in this conversation |

Getting this wrong is silent: dispatch `explore` for Phase 4 and the analysis artifacts are never written, so `validate-analysis.js` reports "Analysis directory not found", the Phase 6 `coverage.api` short-circuit can never fire, and the full report lands in the orchestrator's context — the exact cost the artifact model removes.

The canonical dispatch contract (seven mandatory brief blocks, budgets, retry, fallbacks) is [`project-initialization/references/subagent-contract.md`](../project-initialization/references/subagent-contract.md). This skill supplies the analysis *patterns*; the contract supplies the *mechanics*.

### When to Delegate

| Scenario | Delegation Required | Subagent | Mode |
|---|---|---|---|
| **Phase 4 initialization** (EXISTING_PROJECT) | **ALWAYS** | `codebase-analyzer` | Blocking, one per component |
| **Phase 5 Part 1.5: API discovery** | **ALWAYS** (when the artifacts do not already cover it) | `codebase-analyzer` | Blocking, very thorough |
| **Phase 6: API domain skill configuration** | **ALWAYS** (when API domain selected **and** `index.json → coverage.api` is absent or stale) | `codebase-analyzer` | Blocking, very thorough |
| **Quick Init: Pre-AGENTS.md codebase analysis** | **ALWAYS** | `explore` | Blocking, thorough |
| **Complex task: architecture analysis** | **ALWAYS** | `explore` | Blocking, very thorough |
| **Complex task: dependency audit** | **ALWAYS** | `explore` | Blocking, medium |
| **Complex task: refactoring impact analysis** | **ALWAYS** | `explore` | Blocking, very thorough |
| **Complex task: migration planning** | **ALWAYS** | `explore` | Blocking, very thorough |
| **Complex task: code quality assessment** | **ALWAYS** | `explore` | Blocking, medium |
| **Complex task: understanding unfamiliar codebase area** | **ALWAYS** | `explore` | Blocking, medium |
| **Simple: find a specific file/class/function** | No (use Grep/Glob directly) | — | N/A |
| **Simple: read 1-3 known files** | No (use Read directly) | — | N/A |

`/quick-init` Step 10 deliberately uses `explore`: nothing downstream reads an artifact, so the reply *is* the deliverable and writing two files would cost the step its 3–5 minute budget.

### Thoroughness Levels

| Level | When to Use | Examples |
|-------|-------------|---------|
| **very thorough** | Architecture-impacting analysis, full codebase understanding | Architecture analysis, refactoring impact, migration planning |
| **thorough** | Broad analysis with specific focus | Pre-AGENTS.md codebase analysis (Quick Init) |
| **medium** | Focused investigation of specific areas | Dependency audit, code quality assessment, unfamiliar codebase area |
| **quick** | Narrow question about known area | Single module review, specific pattern search |

Do NOT delegate for simple tasks — use Grep/Glob/Read tools directly:
- Finding a specific file, class, or function
- Reading 1-3 known files
- Simple keyword search

### Why Delegation is Mandatory

1. **Context window preservation** — Codebase exploration generates large intermediate output (file listings, dependency trees, code pattern scans) that would bloat the main agent's context. A subagent isolates all this noise and returns only a focused summary.
2. **Parallel search capability** — Several subagents dispatched in one message run concurrently, completing analysis faster than sequential main-agent searches.
3. **Cost efficiency** — Isolating token-heavy exploration work in a subagent reduces overall cost.
4. **Better quality** — A purpose-built analysis subagent produces more structured and comprehensive results.

Delegation alone does not save context: a subagent returns a message to its parent, so an unbounded brief simply moves the cost to the moment the report comes back. The budgets in `subagent-contract.md` are what make the fan-out affordable.

### How to Delegate

Use the `Task` tool:

```
Task tool call:
  subagent_type: "codebase-analyzer"   # or "explore" — see the table above
  description: "[3-5 word description of analysis task]"
  prompt: "[Detailed analysis prompt with all context needed]"
```

**Key rules:**
- **Blocking** — a `Task` call blocks the main agent until the subagent completes unless `background: true` is passed. Never pass it for an initialization dispatch: a phase gate cannot judge a result that has not arrived.
- **Parallel dispatch** — to run several analyzers at once, send all their `Task` calls **in a single message**. Sequential messages serialise them.
- **Include all necessary context** in the prompt — the subagent starts with a clean context and no access to the parent conversation.
- **Specify thoroughness level** in the prompt: "quick", "medium", or "very thorough".
- **Write scope is a permission** — the `Task` tool has no read-only parameter; `codebase-analyzer.md` allows edits only under `.opencode/project/analysis/`, and the built-in `explore` cannot write at all. State the scope in the brief as well so the model never attempts a refused write.

### Post-Initialization Usage

After project initialization is complete, the main agent MUST delegate to Explore subagent whenever a user task requires complex codebase analysis. Examples:

- "How is authentication implemented in this project?"
- "Analyze the impact of upgrading React from v17 to v18"
- "Map all API endpoints and their handlers"
- "Find all components that use deprecated patterns"
- "Understand the data flow in the payment module"
- "Audit all third-party dependencies for security issues"

**Prompt template for post-initialization analysis:**

```
Perform a [thoroughness] analysis of the codebase at [WORKSPACE_PATH].

Task: [User's analysis request]

Context from project initialization:
- Framework: [from development.md]
- Architecture: [from development.md]
- Key dependencies: [from development.md]

Specific areas to investigate:
1. [Area 1]
2. [Area 2]
3. [Area 3]

Return a structured report with:
- Findings organized by area
- Code examples where relevant
- Specific file paths and line numbers
- Actionable recommendations
```

---

## Analysis Workflow

The analysis follows a structured approach to understand the codebase without changing application code. **All steps are executed by the dispatched subagent**, not the main agent.

```
[Subagent - blocking]
1. Configuration Scan → 2. Dependency Analysis → 3. Structure Mapping →
4. Architecture Detection → 5. Quality Assessment → 6. Report Generation
                                    ↓
   codebase-analyzer → writes .opencode/project/analysis/<component>.{json,md},
                       returns a <= 25-line summary
   explore           → returns the structured report in its reply
```

---

## Step 1: Configuration File Scanning

### Primary Configuration Files

**Package Management:**
```javascript
Files to check:
- package.json (Node.js/npm/yarn/pnpm)
- package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb
- composer.json (PHP)
- requirements.txt, setup.py, pyproject.toml (Python)
- Gemfile (Ruby)
- go.mod (Go)
```

**Build Tools:**
```javascript
Files to check:
- vite.config.js|ts|mjs
- webpack.config.js|ts
- rollup.config.js|ts
- next.config.js|ts|mjs
- nuxt.config.js|ts
- svelte.config.js
- angular.json
- tsup.config.ts
- esbuild.config.js
```

**TypeScript:**
```javascript
Files to check:
- tsconfig.json
- tsconfig.*.json (tsconfig.app.json, tsconfig.node.json, etc.)
```

**Linting & Formatting:**
```javascript
Files to check:
- .eslintrc.js|json|yaml|yml
- eslint.config.js|mjs
- .prettierrc.js|json|yaml|yml
- .editorconfig
- biome.json
```

**Testing:**
```javascript
Files to check:
- vitest.config.js|ts
- jest.config.js|ts
- playwright.config.js|ts
- cypress.config.js|ts
- karma.conf.js
```

**Styling:**
```javascript
Files to check:
- tailwind.config.js|ts
- postcss.config.js
- .sassrc, .scssrc
```

### Extraction Strategy

For each configuration file found:

1. **Read and parse** the file
2. **Extract key information:**
   - Dependencies and versions
   - Scripts and commands
   - Build configurations
   - Plugin usage
   - Environment settings
3. **Flag important details:**
   - Custom configurations that should be preserved
   - Non-standard setups
   - Potential conflicts with template

---

## Step 2: Dependency Analysis

### Package.json Analysis

```javascript
Extract and categorize:

1. Framework Detection:
   - react, react-dom → React
   - vue → Vue
   - @angular/core → Angular
   - svelte → Svelte
   - next → Next.js
   - nuxt → Nuxt
   - solid-js → Solid.js
   - preact → Preact

2. Build Tool:
   - vite → Vite
   - webpack, webpack-cli → Webpack
   - @vercel/nxt (turbopack) → Turbopack
   - rollup → Rollup
   - esbuild → esbuild
   - parcel → Parcel

3. State Management:
   - @reduxjs/toolkit, react-redux → Redux Toolkit
   - zustand → Zustand
   - jotai → Jotai
   - recoil → Recoil
   - mobx, mobx-react-lite → MobX
   - @tanstack/react-query → TanStack Query
   - swr → SWR
   - pinia → Pinia (Vue)
   - @ngrx/store → NgRx (Angular)

4. Styling Solutions:
   - tailwindcss → Tailwind CSS
   - styled-components → Styled Components
   - @emotion/react, @emotion/styled → Emotion
   - sass, node-sass, sass-loader → Sass/SCSS
   - less, less-loader → Less
   - *.module.css → CSS Modules (check imports)

5. Routing:
   - react-router-dom → React Router
   - @tanstack/react-router → TanStack Router
   - vue-router → Vue Router
   - @angular/router → Angular Router
   - @sveltejs/kit → SvelteKit routing

6. UI Libraries:
   - @mui/material → Material-UI
   - antd → Ant Design
   - @chakra-ui/react → Chakra UI
   - @radix-ui → Radix UI
   - @headlessui/react → Headless UI
   - primereact, primevue → PrimeReact/PrimeVue
   - @mantine/core → Mantine

7. Testing Frameworks:
   - vitest → Vitest
   - jest → Jest
   - @playwright/test → Playwright
   - cypress → Cypress
   - @testing-library/react → React Testing Library
   - @testing-library/vue → Vue Testing Library

8. Form Management:
   - react-hook-form → React Hook Form
   - formik → Formik
   - @tanstack/react-form → TanStack Form
   - vee-validate → VeeValidate (Vue)

9. Data Fetching:
   - axios → Axios
   - @tanstack/react-query → React Query
   - swr → SWR
   - apollo-client → Apollo Client (GraphQL)
   - @trpc/client → tRPC

10. Utilities:
    - lodash → Lodash
    - ramda → Ramda
    - date-fns → date-fns
    - dayjs → Day.js
    - uuid → UUID
    - zod → Zod (validation)
    - yup → Yup (validation)
```

### Version Analysis

```javascript
For each major dependency:
1. Note current version
2. Check against latest stable (via package registry or context)
3. Flag if:
   - Major versions behind (e.g., React 16 when 18 is stable)
   - Using deprecated packages (e.g., create-react-app)
   - Security vulnerabilities known
   - Breaking changes in newer versions
```

### Dependency Health Report

Generate summary:
```
Dependency Analysis:

Core Technologies:
- Framework: React 18.2.0 (Latest)
- Build Tool: Vite 5.0.0 (Latest)
- TypeScript: 5.3.3 (Latest)

State & Data:
- State: Zustand 4.4.7
- Data Fetching: TanStack Query 5.17.0

UI & Styling:
- UI Library: Material-UI 5.15.0
- Styling: Tailwind CSS 3.4.0

Testing:
- Unit: Vitest 1.1.0
- E2E: Playwright 1.40.0
- Coverage: ~65%

Potential Updates:
- react-router-dom: 6.8.0 → 6.21.0 (13 versions behind)
- axios: 0.27.2 → 1.6.5 (major version update available)

Recommendations:
1. Update react-router-dom (breaking changes minimal)
2. Consider migrating axios to v1 (breaking changes documented)
3. Overall health: Good
```

---

## Step 3: Project Structure Mapping

### Directory Scanning Strategy

```javascript
Scan root directory and src/ (or app/) recursively:

1. Identify key directories:
   - src/, app/, lib/, packages/ (source code)
   - components/, pages/, views/, routes/ (UI structure)
   - features/, modules/ (feature organization)
   - services/, api/, utils/, helpers/, lib/ (utilities)
   - hooks/, composables/, directives/ (framework-specific)
   - store/, state/, redux/, context/ (state management)
   - styles/, css/, sass/, assets/ (styling)
   - tests/, __tests__/, spec/, e2e/ (testing)
   - public/, static/, assets/ (static files)
   - config/, scripts/ (configuration)

2. Count files by type:
   - .tsx, .ts, .jsx, .js files
   - .vue, .svelte files
   - .test.*, .spec.* files
   - .css, .scss, .sass, .less files
   - .json, .yaml, .yml files

3. Identify entry points:
   - index.html
   - main.tsx, main.ts, index.tsx, index.ts
   - App.tsx, App.vue, App.svelte
   - _app.tsx, _document.tsx (Next.js)
   - +page.svelte, +layout.svelte (SvelteKit)
```

### Structure Classification

Based on directory patterns, classify as:

**Feature-Sliced Design:**
```
src/
├── app/           (app initialization)
├── processes/     (complex scenarios)
├── pages/         (application pages)
├── widgets/       (large UI blocks)
├── features/      (user scenarios)
├── entities/      (business entities)
├── shared/        (reusable code)
```

**Atomic Design:**
```
src/
├── atoms/         (basic building blocks)
├── molecules/     (simple components)
├── organisms/     (complex components)
├── templates/     (page templates)
├── pages/         (actual pages)
```

**Feature-Based:**
```
src/
├── features/
│   ├── auth/      (authentication feature)
│   ├── products/  (products feature)
│   └── cart/      (cart feature)
├── shared/        (shared utilities)
```

**Modular:**
```
src/
├── modules/
│   ├── user/      (user module)
│   ├── admin/     (admin module)
│   └── public/    (public module)
```

**Page/Route-Based:**
```
src/
├── pages/         (routes/pages)
├── components/    (shared components)
├── utils/         (utilities)
```

**Flat/Monolithic:**
```
src/
├── (mixed files without clear organization)
```

### Structure Report

```markdown
Project Structure Analysis:

**Root Directory:** [workspace-path]

**Main Entry Points:**
- public/index.html
- src/main.tsx
- src/App.tsx

**Architecture Pattern:** Feature-Sliced Design

**Directory Breakdown:**
```
src/
├── app/              (3 files) - App initialization, providers
├── pages/            (12 files) - Application pages/routes
├── features/         (8 features)
│   ├── auth/         (15 files) - Authentication
│   ├── products/     (23 files) - Product management
│   ├── cart/         (8 files) - Shopping cart
│   └── ...
├── shared/
│   ├── components/   (45 files) - Reusable UI components
│   ├── hooks/        (12 files) - Custom React hooks
│   ├── utils/        (18 files) - Utility functions
│   └── api/          (6 files) - API client
├── styles/           (8 files) - Global styles
└── tests/            (34 files) - Test files
```

**File Statistics:**
- Total TypeScript files: 187
- Component files (.tsx): 98
- Test files: 34
- Style files: 23
- Configuration files: 8

**Test Coverage:**
- Test files: 34
- Components tested: ~35% (34/98)
- Overall coverage: Medium
```

---

## Step 4: Architecture Pattern Detection

### Code Pattern Analysis

Scan actual code files to detect:

**State Management Patterns:**
```javascript
Check imports in component files:

- Redux Toolkit:
  import { useSelector, useDispatch } from 'react-redux'
  import { createSlice } from '@reduxjs/toolkit'

- Zustand:
  import create from 'zustand'
  const useStore = create(...)

- Context API:
  import { createContext, useContext } from 'react'
  const MyContext = createContext(...)

- Jotai:
  import { atom, useAtom } from 'jotai'

- TanStack Query:
  import { useQuery, useMutation } from '@tanstack/react-query'
```

**Component Patterns:**
```javascript
Check for:

- Functional components with hooks (modern React)
- Class components (legacy React)
- Higher-Order Components (HOC pattern)
- Render props pattern
- Compound components
- Custom hooks usage
- Composition vs inheritance
```

**API Integration Patterns:**
```javascript
Identify:

- REST API clients (axios, fetch)
- GraphQL clients (Apollo, urql)
- tRPC usage
- WebSocket connections
- Server-Sent Events (SSE)
- API route handlers (Next.js, SvelteKit)
```

**Routing Patterns:**
```javascript
Detect:

- File-based routing (Next.js, Nuxt, SvelteKit)
- Component-based routing (React Router, Vue Router)
- Nested routing
- Dynamic routes
- Route guards/middleware
- Lazy loading/code splitting
```

### Architecture Summary

```markdown
Architecture Analysis:

**Primary Patterns:**
- Component Architecture: Functional components with hooks
- State Management: Zustand (lightweight) + React Query (server state)
- API Integration: REST via TanStack Query
- Routing: React Router v6 (component-based)
- Code Splitting: React.lazy() + Suspense

**Data Flow:**
```
User Action → Component → React Query (API) → Zustand (Client State) → UI Update
```

**Strengths:**
- Modern React patterns (hooks, suspense)
- Clear separation of server/client state
- Type-safe with TypeScript
- Good code splitting strategy

**Areas for Improvement:**
- Inconsistent error handling across API calls
- Some components exceed 300 lines (refactor candidates)
- Limited use of React.memo for performance optimization
```

---

## Step 5: Code Quality Assessment

### Linting & Formatting

```javascript
Check for:

1. ESLint Configuration:
   - File exists: .eslintrc.* or eslint.config.*
   - TypeScript support: @typescript-eslint/*
   - React rules: eslint-plugin-react
   - Hooks rules: eslint-plugin-react-hooks
   - a11y rules: eslint-plugin-jsx-a11y
   - Custom rules or overrides

2. Prettier Configuration:
   - File exists: .prettierrc.* or prettier.config.*
   - Integration with ESLint
   - Consistent formatting rules

3. EditorConfig:
   - File exists: .editorconfig
   - Indent style, line endings, etc.
```

### Testing Assessment

```javascript
Analyze:

1. Test Coverage:
   - Count test files vs source files
   - Calculate approximate coverage percentage
   - Identify untested critical paths

2. Testing Strategy:
   - Unit tests: Component testing
   - Integration tests: Feature testing
   - E2E tests: User flow testing
   - Snapshot tests: UI regression

3. Testing Tools:
   - Test runner: Vitest, Jest
   - Testing library: @testing-library
   - E2E framework: Playwright, Cypress
   - Mock tools: MSW, vitest.mock
```

### Documentation Check

```javascript
Evaluate:

1. README.md:
   - Exists and up-to-date
   - Installation instructions
   - Development setup
   - Deployment guide
   - Architecture overview

2. Inline Documentation:
   - JSDoc comments in complex functions
   - Component prop documentation
   - TypeScript type definitions
   - TODO/FIXME comments (technical debt)

3. Additional Docs:
   - CONTRIBUTING.md
   - ARCHITECTURE.md
   - API documentation
   - Storybook/component documentation
```

### TypeScript Quality

```javascript
If TypeScript is used:

1. Configuration:
   - Strict mode enabled
   - Target ES version
   - Module resolution
   - Path aliases

2. Type Safety:
   - 'any' usage (should be minimal)
   - Type assertions usage
   - Type coverage (aim for >90%)
   - Generic types usage

3. Declaration Files:
   - .d.ts files for untyped libraries
   - Global type definitions
   - Module augmentation
```

### Quality Report

```markdown
Code Quality Assessment:

**Linting & Formatting:**
- ESLint: Configured with TypeScript, React, a11y plugins
- Prettier: Configured and integrated with ESLint
- EditorConfig: Present

**Testing:**
- Framework: Vitest + Testing Library + Playwright
- Unit Tests: 34 files (35% component coverage)
- E2E Tests: 8 scenarios
- Overall Coverage: ~45%
- Recommendation: Increase unit test coverage to >70%

**Documentation:**
- README: Comprehensive with setup instructions
- Inline Docs: Sparse JSDoc comments (needs improvement)
- Architecture Docs: Missing (should create ARCHITECTURE.md)
- API Docs: Limited documentation

**TypeScript:**
- Strict Mode: Enabled
- Type Coverage: ~92%
- 'any' Usage: Low (12 occurrences)
- Path Aliases: Configured (@/, @components/, etc.)

**Overall Grade: B+ (Good with room for improvement)**

**Priority Improvements:**
1. Increase test coverage (target 70%+)
2. Add JSDoc comments to public APIs
3. Create ARCHITECTURE.md documentation
4. Review and refactor large components (>300 lines)
```

---

## Step 6: Report Generation & Integration

### Consolidate Findings

Compile all analysis data into structured format for `.opencode/project_init.md`:

```markdown
## Existing Project Analysis

**Analysis Date:** [timestamp]

### Codebase Overview
- **Location:** [workspace-root]
- **Primary Language:** TypeScript
- **Framework:** React 18.2.0
- **Build Tool:** Vite 5.0.0
- **Total Files:** 187 TypeScript files

### Main Entry Points
- public/index.html
- src/main.tsx (application entry)
- src/App.tsx (root component)

### Technology Stack (Detected)
- **Framework:** React 18.2.0
- **Build Tool:** Vite 5.0.0
- **State Management:** Zustand 4.4.7 + TanStack Query 5.17.0
- **Routing:** React Router 6.8.0
- **UI Library:** Material-UI 5.15.0
- **Styling:** Tailwind CSS 3.4.0
- **Testing:** Vitest 1.1.0, Playwright 1.40.0
- **TypeScript:** 5.3.3 (strict mode)
- **Package Manager:** pnpm

### Architecture Pattern
**Feature-Sliced Design** with clear separation of concerns

### Key Dependencies (Top 15)
1. react: 18.2.0
2. react-dom: 18.2.0
3. @tanstack/react-query: 5.17.0
4. zustand: 4.4.7
5. react-router-dom: 6.8.0
6. @mui/material: 5.15.0
7. tailwindcss: 3.4.0
8. axios: 0.27.2
9. zod: 3.22.4
10. date-fns: 3.0.6
... (continued)

### Code Quality Metrics
- **Linting:** ESLint + Prettier configured
- **Testing:** 45% coverage (needs improvement)
- **Documentation:** README good, inline docs sparse
- **TypeScript:** 92% type coverage, strict mode
- **Overall Grade:** B+

### Recommendations
1. **Testing:** Increase unit test coverage from 45% to 70%+
2. **Dependencies:** Update react-router-dom (13 versions behind)
3. **Documentation:** Add JSDoc comments to public APIs, create ARCHITECTURE.md
4. **Performance:** Review large components (>300 lines) for refactoring opportunities
5. **Code Quality:** Add more integration tests for critical user flows

### Integration Notes
- Template rules should preserve existing ESLint/Prettier configurations
- Build process (Vite) is modern and doesn't need changes
- Consider integrating TaskMaster for better project management
- Existing TypeScript setup is solid, maintain strict mode
```

### Update .opencode/project_init.md

Automatically populate the "Existing Project Analysis" section with the generated report.

---

## Step 7: Customization Inventory

> **Scope:** Executed by the dispatched subagent — `codebase-analyzer` as part of Phase 4 analysis, `explore` for any post-initialization architecture review. Adds a "Project Customizations" section to the analysis report.

### What to Scan

Check for existing project-specific customizations (files NOT listed in `.opencode/rules/.core-version.json`):

```
.opencode/rules/project/          ← project-specific rules (*.md)
.opencode/agents/project-*.md     ← custom agents
.opencode/commands/project-*.md   ← custom slash commands
.opencode/skills/project-*/       ← custom skill directories
.opencode/skills/*/project-config.json  ← domain skill configurations
.opencode/rules/project/metadata.json   ← project identity
.opencode/rules/project/routing.md     ← custom agent routing
```

### Validation Checks

For each discovered file, verify naming conventions:

| File type | Expected pattern | Violation example |
|-----------|-----------------|-------------------|
| Custom rules | `.opencode/rules/project/*.md` | `.opencode/rules/my-rule.md` (outside `project/`) |
| Custom agents | `.opencode/agents/project-*.md` | `.opencode/agents/devops.md` (missing `project-` prefix) |
| Custom commands | `.opencode/commands/project-*.md` | `.opencode/commands/deploy.md` (missing `project-` prefix) |
| Custom skills | `.opencode/skills/project-*/SKILL.md` | `.opencode/skills/my-skill/SKILL.md` (missing `project-` prefix) |

### Routing Completeness Check

If custom agents exist (`project-*.md`), verify routing is configured:

- `.opencode/rules/project/routing.md` exists → routing configured
- File missing → warn: "Custom agents found but no routing.md — agents may not be invoked automatically"

### Customization Inventory Report

Include in the analysis report:

```markdown
### Project Customizations Inventory

**Custom Rules:** [count] found
[list each file with brief description from frontmatter]

**Custom Agents:** [count] found
[list each with name and purpose]

**Custom Commands:** [count] found
[list each with command name]

**Custom Skills:** [count] found
[list each directory with description]

**Domain Skill Configs (project-config.json):** [count] found
[list which domains are configured: frontend, backend, api, etc.]

**Routing:** [Configured / Missing / Not needed]

**Convention Violations:** [count]
[list any files that don't follow naming conventions with suggested fix]

**Gaps:**
[Missing customizations that would benefit this project, e.g.:]
- No custom routing defined despite [N] custom agents
- Domain skills not configured (project-config.json missing in: frontend, api)
- No project metadata (`.opencode/rules/project/metadata.json` missing)
```

---

## Error Handling

### If File Read Fails

```
Unable to read [filename]: [error]

Options:
1. Retry with elevated permissions
2. Skip this file and continue
3. Ask user for file contents

Choose an option or provide missing information manually.
```

### If Analysis Is Incomplete

```
Could not complete full analysis due to:
- [reason 1]
- [reason 2]

Partial analysis results available. Would you like to:
1. Continue with partial results
2. Provide missing information manually
3. Skip codebase analysis (use NEW_PROJECT flow)
```

### If Technology Detection Fails

```
Unable to automatically detect [framework/tool].

Please specify:
- Which [technology] are you using?
- Version number (if known)

Or skip this detection and configure manually later.
```

---

## Best Practices

1. **Always delegate** — Never perform complex codebase analysis in the main agent's context. Pick the subagent by what the caller needs back: `codebase-analyzer` when a later phase reads an artifact, `explore` when the reply is the deliverable
2. **Non-Invasive:** Bound the write scope in the prompt — "do not modify, create or delete any file" for `explore`; "write exactly the two report files and nothing else" for `codebase-analyzer`. The `Task` tool has no read-only parameter; the analyzer's `permission` block enforces its write scope
3. **Respectful:** Skip node_modules, .git, dist, build directories
4. **Transparent:** Inform the user that analysis is being delegated, and to which subagent
5. **Accurate:** Validate subagent findings before presenting to user — for `codebase-analyzer` waves that means running `validate-analysis.js`
6. **Helpful:** Provide actionable recommendations, not just observations
7. **Efficient:** Send several `Task` calls in one message so the subagents run concurrently
8. **Safe:** Handle errors gracefully; if a subagent fails, retry once with a more specific prompt
9. **Context-aware:** Include relevant project metadata in the prompt — the subagent starts with a clean context

---

## Integration Points

This analyzer integrates with:

- **project-initialization skill** - Called during Phase 4 (Codebase Analysis) and Phase 6 (domain skill configuration) via `codebase-analyzer` subagents
- **project-initialization/references/subagent-contract.md** - the canonical dispatch contract: brief blocks, budgets, retry, fallbacks
- **references/codebase-analysis.md** → `references/phase-4/` - Phase 4 reference with the analyzer brief template
- **references/configuration-updates.md** → `references/phase-6/api-analysis.md` - Phase 6 reference; the API sub-analysis is conditional on `analysis/index.json → coverage.api`
- **project-initialization/references/quick-init.md** - Quick Init workflow; `explore` subagent for codebase analysis before AGENTS.md generation (step 10)
- **.opencode/project_init.md** - Results written to "Existing Project Analysis" section
- **development.md** - Findings inform rule updates; its release banner records the subagent-dispatch model this skill implements (`codebase-analyzer` fan-out, artifacts on disk, permission-enforced write scope instead of a read-only `Task` parameter)
- **Stack templates** - Detected framework determines which template to activate
- **project_customizations.md** - Step 7 validates discovered customizations against the conventions defined in this rule

### Subagent Reference

- **Custom subagent:** `codebase-analyzer` — [`.opencode/agents/codebase-analyzer.md`](../../agents/codebase-analyzer.md). The only subagent in this template permitted to write files; its write scope is enforced by the `permission` block of its agent file, not by a read-only parameter. Used for every initialization dispatch whose output a later phase reads back.
- **Built-in subagent:** `explore` (built into OpenCode, no configuration needed). Used for ad-hoc analysis and `/quick-init` Step 10.
- **Documentation:** [OpenCode Agents](https://opencode.ai/docs/agents/)
- **Mode:** blocking (never `background: true`; only the final text returns to the caller)

The analysis output guides all subsequent configuration decisions, ensuring the template adapts to the existing project rather than forcing changes. By delegating, the main agent's context window remains clean for decision-making and user interaction.
