---
name: code-quality-standards
description: Code reuse discovery, DRY enforcement, and Test-Driven Development (TDD) guidance. Use before creating any new class, module, or function to search for existing implementations that can be reused or extended, and to decide whether to apply the RED-GREEN-REFACTOR TDD cycle (with optional TaskMaster tracking) for the work at hand.
---

# Code Quality Standards

## Golden Rule

**Before creating ANY new class, module, or function, STOP and search first.**

---

## Mandatory Search Steps

| Step | Action | How |
|------|--------|-----|
| 1 | Search by name | `Grep` for the class/function/module name you intend to create |
| 2 | Search by functionality | `SemanticSearch` for similar purpose (e.g., "Where do we handle user validation?") |
| 3 | Check related directories | `Glob`/`Read` on relevant packages, modules, or directories |
| 4 | Look for base classes and shared utilities | `Grep` for `Abstract*`, `Base*`, `*Utils`, `*Helper`, `*Common` patterns |

---

## Implementation Plan Requirement

Every implementation plan for Complex tasks MUST include a **Code Reuse Check** section:

```
**Code Reuse Check:**
- Searched for: [class/method name or functionality]
- Found existing: [Yes/No — list if found]
- Decision: [Reuse existing / Create new because...]
- Reasoning: [Why this decision was made — what was considered, why alternatives were ruled out]
```

If the plan does not include this section, add it before proceeding.

---

## Common Reuse Patterns

| Creating... | First check... |
|-------------|----------------|
| New service / provider | Existing services in the same domain or layer |
| New utility function | Existing `*Utils`, `*Helper`, `*Common` modules |
| New mapper / converter | Existing transformation, mapping, or adapter code |
| New base / abstract class | Existing abstract or base classes in the hierarchy |
| New exception / error type | Existing error hierarchy or custom error classes |
| New repository / data access | Base repository classes or shared query methods |
| New middleware / interceptor | Existing middleware chain or cross-cutting concerns |
| New constant / enum | Existing constants files, enums, or configuration objects |

---

## DO NOT create new code if:

- Similar class or module exists — **extend or reuse it**
- Similar method or function exists — **call it instead**
- Abstract or base class exists — **extend it**
- A pattern exists elsewhere in the codebase — **follow it**
- A utility already handles the same concern — **import it**

---

## New Dependency Protocol

Before introducing any new external package or library (`npm install`, `pip install`, `go get`, etc.):

1. **Check existing dependencies first** — scan `package.json`, `requirements.txt`, `go.mod`, or equivalent to see if a currently installed package already covers the need (including transitive dependencies).
2. **Check if the need can be solved with stdlib or existing project utilities** — a short helper function is often preferable to a new dependency.
3. **If a new dependency is genuinely required, ask the user before installing.** Include in the question:
   - What the dependency does and which specific feature is needed
   - Why existing project dependencies cannot cover this need (cite what was checked)
   - Alternatives considered (other packages, or writing it manually)
   - Any size, security, or license concerns

Never run package install commands without explicit user confirmation.

---

## Reasoning Requirement

Every Code Reuse Check and every decision to create new code must be transparent:

- **When reusing:** State the file path(s) of the reused code and why it was chosen.
- **When creating new:** State what was searched (file names, semantic queries) and why nothing existing was suitable.
- **When adding a new dependency:** State what existing deps were checked and why they fall short.

This ensures the user understands the agent's reasoning and can correct it if the search was incomplete.

---

## Method-Level Reuse (DRY Principle)

| Trigger | Action |
|---------|--------|
| Same logic appears 2+ times in a file | Extract to a private function or method |
| Function exceeds ~30 lines | Consider splitting into smaller, reusable functions |
| Same logic appears in 3+ different files | Move to a shared utility module or helper class |
| Repeated null/validation checks | Extract to a validation helper function |

### Before Duplicating Code

- [ ] Can this logic be extracted to a private function?
- [ ] Does a similar private function already exist in this file?
- [ ] Would this function be useful elsewhere? (consider shared utils)

---

## Utility vs Service Decision

| Use Utility When | Use Service When |
|------------------|------------------|
| Logic is stateless and generic | Logic requires injected dependencies |
| Reusable across 3+ files | Business-specific to one entity or domain |
| Purely technical operations (string, date, math) | Needs transaction, session, or request context |
| No framework context needed | Requires DI container, middleware, or lifecycle hooks |

---

## Explore Subagent Integration

For Complex tasks that involve creating multiple new files:

1. **Delegate to Explore** before implementation to discover existing patterns, utilities, and services
2. Include the Explore findings in your Code Reuse Check
3. Only create new code after confirming nothing reusable exists

```
Task tool call:
  subagent_type: "explore"
  description: "Find reusable code for [feature]"
  prompt: "Search the codebase for existing implementations related to [feature].
    Look for: services, utilities, helpers, base classes, mappers, and patterns
    that can be reused or extended. Report all findings with file paths.
    Do not modify any file."
```

---

## Consistency Mandate

When creating new code that cannot reuse existing implementations:

1. **Read 2-3 similar files** in the same package or module to understand existing patterns
2. **Match the dominant style** — injection pattern, naming convention, documentation level, error handling approach
3. **Follow existing directory structure** — place new files where similar files live
4. **Use existing abstractions** — if the project uses a base class or factory pattern, extend it

---

---

## Test-Driven Development (TDD)

> **Why this lives here:** TDD is part of the project's quality bar — it prevents regressions, documents intent, and forces the **reuse-first** mindset described above (you cannot copy-paste duplicated logic into a green test suite without noticing). Project-specific TDD policy (mandatory / recommended / optional, framework, coverage thresholds, output dir) lives in the **Coding Standards Specialist** skill at `references/guidelines.md`. This section defines the universal trigger logic and execution discipline.

### When to Suggest TDD

The agent **MUST** proactively suggest TDD when any of these triggers fire:

| Trigger | Indicators | Strength |
|---------|------------|----------|
| **New feature implementation** | 3+ files to be created/modified, clear requirements | **STRONG** |
| **API endpoint creation** | REST/GraphQL/tRPC endpoints, request/response contracts | **STRONG** |
| **Complex business logic** | Algorithms, calculations, state machines, validation rules | **STRONG** |
| **Bug fix (regression)** | Fixing a defect that should have been caught by tests | **STRONG** — write the failing test first |
| **TaskMaster task with `testStrategy`** | The task already declares a test plan | **STRONG** |
| **User explicitly requests tests** | "write tests", "add tests", "test coverage" | **STRONG** |
| **Service / module creation** | New service classes or utility modules with clear interfaces | **MEDIUM** |
| **Refactoring** | Major restructuring of existing code | **MEDIUM** — tests guard the refactor |

The agent **MUST NOT** suggest TDD for:

- Trivial typo fixes or one-line changes
- Documentation-only updates
- UI styling adjustments (CSS/styles only) without behavior changes
- Configuration changes that don't affect runtime behavior
- Trivial getters/setters with no logic
- Prototype/spike code (unless the user explicitly wants TDD)

If the project's `coding-standards-context/references/guidelines.md` declares TDD as **mandatory** for a given category (e.g., "all new domain logic"), the suggestion becomes a **requirement**, not a recommendation.

### Suggestion Prompt Template

When a STRONG trigger fires, present:

```
This task involves [feature type] with [complexity indicators].

I recommend a TDD (Test-Driven Development) approach.

🔴 RED: I'll create failing tests based on requirements
🟢 GREEN: Implement until tests pass
🔵 REFACTOR: Optionally clean up while tests stay green

Project policy: [mandatory | recommended | optional] for this category
(see coding-standards-context/references/guidelines.md → "TDD Policy").

Proceed with TDD?
[Yes, use TDD] / [No, skip tests for now] / [Write tests after implementation]
```

If the user declines, respect the choice (unless project policy is `mandatory`, in which case explain that policy and re-prompt).

### RED → GREEN → REFACTOR Discipline

#### 🔴 Phase 1 — RED: Write failing tests

1. **Restate the contract** from the requirement / task: inputs, outputs, edge cases, error modes.
2. **Choose test type** based on the unit:
   - Pure function or class method → unit test
   - Component interaction or service composition → integration test
   - End-user flow → e2e test
3. **Create test files** following the project's convention (`references/guidelines.md` → "Testing"). Default fall-backs:
   - Co-located: `__tests__/` next to source or `*.test.{ts,js,py,...}`
   - Centralized: a top-level `tests/` tree
   - E2E: `*.spec.{ts,js}` with Playwright/Cypress
4. **Use behavior-oriented test names:**
   ```
   ✅  it('should reject user with invalid email', ...)
   ❌  it('test create function', ...)
   ```
5. **Run the suite — every new test MUST fail.** If a test passes before implementation exists, the test is invalid; rewrite it until it fails for the right reason.

#### 🟢 Phase 2 — GREEN: Make tests pass

1. **Implement the simplest thing that could possibly work** — one test case at a time, smallest test first.
2. **Run tests after every meaningful change.** Prefer watch mode for fast feedback.
3. **If a test fails, fix the IMPLEMENTATION — never the test.** The tests are the contract.
4. **Stop when all tests are green.** Do not add untested behavior in this phase.

#### 🔵 Phase 3 — REFACTOR: Improve while green

1. Offer refactoring only **after** all tests are green:
   ```
   All tests pass. Refactor for readability / DRY / performance / architecture?
   [Yes] / [No] / [Let me review first]
   ```
2. **One change at a time.** Run tests after each change. If anything goes red, **revert immediately** and try a smaller step.
3. Reuse the rules from "Method-Level Reuse (DRY Principle)" above — REFACTOR is the natural moment to extract duplication that surfaced during GREEN.

### Best Practices

✅ **DO**
- Suggest TDD proactively when triggers fire and project policy allows it.
- Verify that new tests actually fail in RED before implementing.
- Run tests frequently in GREEN; keep iterations small.
- Refactor in tiny, test-protected steps.
- Use behavior-oriented test names that read like a spec.
- Track multi-step TDD work in TaskMaster (see *TaskMaster Integration* below) when TaskMaster is initialized.

❌ **DON'T**
- Force TDD on a user who declines (unless project policy makes it mandatory).
- Suggest TDD for trivial changes covered by the "MUST NOT" list above.
- Modify a failing test to make it pass — fix the implementation instead.
- Skip the RED-fails-as-expected verification step.
- Refactor while any test is red.
- Test implementation details — tests should describe observable behavior.

### Test Framework Detection

When the project's `references/guidelines.md` does not pin a framework, detect from `package.json` / `pyproject.toml` / `pom.xml` / `go.mod`:

| Framework | Indicator (JS/TS) | Run command (default) |
|-----------|-------------------|------------------------|
| Vitest | `vitest` in devDependencies | `npx vitest run [file]` |
| Jest | `jest` in devDependencies | `npx jest [file]` |
| Playwright | `@playwright/test` in devDependencies | `npx playwright test [file]` |
| Cypress | `cypress` in devDependencies | `npx cypress run --spec "[file]"` |
| Custom | `scripts.test` in `package.json` | `npm test -- [file]` |

For Python: `pytest`, `unittest`. For JVM: JUnit 5, Spock, Kotest. For Go: built-in `go test ./...`. Always prefer the framework already used in neighboring tests over introducing a new one (DRY rule above).

### TaskMaster Integration (Optional, when TaskMaster is initialized)

If the project has TaskMaster initialized, mirror each phase as a subtask so progress is visible to the team:

```javascript
// Expand into TDD subtasks
expand_task({
  id: "[task-id]",
  prompt: `Break down into TDD workflow:
    1. RED Phase: Write failing tests (identify cases, create test files, verify all fail)
    2. GREEN Phase: Implement incrementally until all tests pass
    3. REFACTOR Phase (optional): Improve quality while staying green`
})

// During RED
update_subtask({ id: "[red]", prompt: "Tests created: [N]; all failing as expected ✓" })
set_task_status({ id: "[red]", status: "done" })

// During GREEN
update_subtask({ id: "[green]", prompt: "Passing: [N]/[total]; current: [test desc]" })
set_task_status({ id: "[green]", status: "done" })

// During REFACTOR
update_subtask({ id: "[refactor]", prompt: "Improvements: [...]; tests remain green ✓" })
set_task_status({ id: "[refactor]", status: "done" })
```

If TaskMaster is **not** initialized, skip this and just announce phase transitions inline. Do **not** force-run `/taskmaster-init` for the user.

### Test Output Convention

Place generated reports under `tests_output/` (gitignored) unless the project's guidelines override this:

```
tests_output/
├── test-results.json       # raw results
├── test-health-report.md   # from /test-verify (qa pack)
├── coverage/               # coverage reports (lcov/html)
└── tdd-session-[date].md   # optional session log
```

### Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Tests pass before implementation exists (RED) | Tests don't actually exercise the new behavior | Rewrite to assert observable behavior; ensure mocks/data force the new code path |
| Cannot make tests pass after several attempts (GREEN) | Requirements unclear or wrong implementation strategy | Review tests one-by-one; isolate via single-test runs; reconsider the contract with the user |
| Tests fail during refactoring (REFACTOR) | Behavior changed by accident | Revert immediately; take a smaller refactor step; re-run after each change |
| Suite is slow → can't run on every change | Tests touch I/O / network / DB unnecessarily | Move heavy tests to integration/e2e tier; keep unit tests pure and fast |

### Hand-off to Specialized Tooling

The `/tdd-workflow` and `/test-verify` slash commands (and the `tdd-workflow` agent skill) ship inside the **`qa` APM package** ([`qa/`](https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages/-/tree/master/qa)). They provide a step-by-step interactive runner over the discipline described above. The rules in this section apply **regardless** of whether those commands are installed — they are the universal quality bar. If the qa package is installed, prefer `/tdd-workflow` for guided execution; otherwise apply the discipline manually following this section.

To install the guided runners: re-run `/initialize` and select the `qa` role (auto-activates in Phase 1.7-APM), or add the `qa` package (`git: <apmPackages.registryRepoUrl>`, `path: qa`, `ref: master`) to your `apm.yml` and run `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`.

---

## Related

- [development.md](../../rules/development.md) - Architecture overview and available agents
- [Coding Standards Skill](../coding-standards-context/SKILL.md) - Stack-specific coding standards (project's TDD policy lives in its `references/guidelines.md`)
- [`qa/`](https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages/-/tree/master/qa) — `qa` APM package: ships `/tdd-workflow`, `/test-verify`, the `tdd-workflow` skill and the `testing-context` skill
- [taskmaster-init](../../commands/taskmaster-init.md) - Initialize TaskMaster when TDD work needs subtask tracking
- [taskmaster/dev_workflow.md](../../rules/taskmaster/dev_workflow.md) - TaskMaster development workflow
- [`TDD_WORKFLOW.md`](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/TDD_WORKFLOW.md) - Full upstream TDD guide ([when to use](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/TDD_WORKFLOW.md#when-to-use-tdd), [phases](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/TDD_WORKFLOW.md#tdd-workflow-phases), [framework support](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/TDD_WORKFLOW.md#testing-framework-support)) — useful when the `qa` pack’s `/tdd-workflow` is not installed. It ships in the template repo, not in the project: see [`workplace-docs.md`](../project-initialization/references/workplace-docs.md)
