# Coding Standards

> **Component Rule:** This file contains language-specific coding standards for `{{LANGUAGE}}` / `{{FRAMEWORK}}`.
>
> **Related:** See [development.md](../../../rules/development.md) for high-level architecture overview.
> See [Code Quality Standards Skill](../../code-quality-standards/SKILL.md) for mandatory code reuse checks.

---

## Core Principles

1. **NEW code:** Follow best practices for {{LANGUAGE}} / {{FRAMEWORK}}
2. **EXISTING code:** Match the existing patterns (injection, documentation, style)
3. **Documentation:** Follow {{DOCUMENTATION_CONVENTION}}
4. **Code style:** Maintain consistency within the same package or module

---

## Language & Framework

- **Language:** {{LANGUAGE}}
- **Framework:** {{FRAMEWORK}}
- **Version:** {{FRAMEWORK_VERSION}}

---

## Dependency Management Patterns

### Preferred Pattern for New Code

{{DI_PATTERNS}}

### When Updating Existing Code

**Rule:** Match the existing pattern in the file — both dependency management AND documentation style.

1. Read the entire file before making changes
2. Identify the current dependency management approach
3. Add new dependencies following the same pattern
4. Do NOT mix patterns within a single file

---

## Documentation & Comment Patterns

### Per-Layer Documentation Rules

{{DOCUMENTATION_RULES_BY_LAYER}}

### When to Document

| Element | Documentation Required | Notes |
|---------|----------------------|-------|
| **Public interfaces / exported types** | Always | All public members |
| **Public classes / modules** | Always | Purpose and usage |
| **Public methods / functions** | Always | Unless trivially named getter/setter |
| **Protected / internal methods** | Always | For subclass or module implementers |
| **Private methods** | Optional | Only if complex logic |
| **Override / inherited methods** | Conditional | Only if behavior differs from parent |
| **Constants / configuration** | Sometimes | If not self-explanatory |

### Documentation Best Practices

- **Document WHY, not WHAT** — explain reasoning, not mechanics
- **Use structured format** — consistent doc comments across the project
- **Reference related code** — link to related classes, interfaces, or modules
- **Keep descriptions actionable** — state what the method does, not how it is called

---

## Naming Conventions

### General Patterns

{{NAMING_CONVENTIONS}}

### Layer-Specific Naming

{{METHOD_NAMING}}

---

## Code Style Consistency

### Declaration Order

{{FIELD_DECLARATION_ORDER}}

### Annotation / Decorator Order

{{ANNOTATION_ORDER}}

---

## Error Handling

{{ERROR_HANDLING_PATTERNS}}

---

## Test-Driven Development (TDD) Policy

> **Universal trigger logic, RED-GREEN-REFACTOR discipline, and best practices live in the [Code Quality Standards skill](../../code-quality-standards/SKILL.md) → "Test-Driven Development (TDD)" section. This section captures *project-specific* TDD policy that overrides or specializes the universal defaults.**

### Policy Level

- **TDD policy:** {{TDD_POLICY}}  <!-- one of: mandatory | recommended | optional | not-used -->
- **Categories where TDD is mandatory (if policy = recommended/optional):** {{TDD_MANDATORY_CATEGORIES}}
  <!-- e.g., "domain logic", "API endpoints", "regression bug fixes" — agent MUST treat these as STRONG triggers regardless of user preference -->

### Tooling

- **Primary test framework:** {{TEST_FRAMEWORK}}  <!-- e.g., Vitest, Jest, pytest, JUnit 5 -->
- **E2E framework (if any):** {{E2E_FRAMEWORK}}  <!-- e.g., Playwright, Cypress, Selenium -->
- **Coverage tool:** {{COVERAGE_TOOL}}  <!-- e.g., c8, Istanbul/nyc, coverage.py, JaCoCo -->
- **Run command (single file):** {{TEST_RUN_COMMAND}}  <!-- e.g., `npx vitest run path/to/file.test.ts` -->
- **Run command (full suite):** {{TEST_RUN_ALL_COMMAND}}  <!-- e.g., `npm test` -->
- **Watch command:** {{TEST_WATCH_COMMAND}}  <!-- e.g., `npx vitest watch` -->

### Conventions

- **Test file naming:** {{TEST_FILE_NAMING}}  <!-- e.g., `*.test.ts` for unit, `*.spec.ts` for e2e -->
- **Test file location:** {{TEST_FILE_LOCATION}}  <!-- e.g., co-located in `__tests__/` next to source -->
- **Test name style:** {{TEST_NAME_STYLE}}  <!-- e.g., behavior-oriented `it('should ...')` in BDD style -->
- **Mocking strategy:** {{MOCKING_STRATEGY}}  <!-- e.g., manual stubs preferred; `vi.mock` only for boundary modules -->

### Coverage Thresholds

- **Statements:** {{COVERAGE_STATEMENTS}}  <!-- e.g., 80% -->
- **Branches:** {{COVERAGE_BRANCHES}}  <!-- e.g., 75% -->
- **Functions:** {{COVERAGE_FUNCTIONS}}  <!-- e.g., 80% -->
- **Lines:** {{COVERAGE_LINES}}  <!-- e.g., 80% -->
- **Enforcement:** {{COVERAGE_ENFORCEMENT}}  <!-- e.g., CI fails if below threshold; PR blocked -->

### Test Output

- **Reports directory:** {{TEST_OUTPUT_DIR}}  <!-- default: `tests_output/`; MUST be in `.gitignore` -->
- **CI integration:** {{TEST_CI_INTEGRATION}}  <!-- e.g., GitHub Actions reuses `vitest --reporter=junit` for PR checks -->

### TaskMaster Integration

- **Use TaskMaster for TDD subtasks:** {{TDD_TASKMASTER_USAGE}}  <!-- e.g., yes for features ≥ Complex, no for simple fixes -->

### Project-Specific TDD Notes

{{TDD_NOTES}}

> When this section is rendered (during initialization Phase 6), the agent MUST apply the universal TDD discipline from the Code Quality Standards skill, but use the values above as the project's source of truth for framework, commands, naming, coverage, and policy strength.

---

## AI Agent Behavior

### Before Creating a New Class / Module

1. **Search for similar classes** in the same package or directory (see [Code Quality Standards Skill](../../code-quality-standards/SKILL.md))
2. **Read 2-3 similar files** to understand existing patterns:
   - Dependency management style
   - Documentation level and format
   - Method naming conventions
   - Comment density and style
3. **Match the dominant pattern** OR use best practices for greenfield code

### Before Adding a Method to an Existing File

1. **Read the entire file** to understand:
   - Current dependency management pattern
   - Documentation style used
   - Existing method signatures and naming
2. **Check neighboring methods:**
   - Do they have doc comments?
   - What is the format?
   - How detailed are the descriptions?
3. **Match the existing style** — the new method should be indistinguishable from existing ones

### Documentation Decision Tree

```
Is this an interface or exported type?
├─ Yes → Full documentation required
│   ├─ Class/module-level doc with purpose
│   └─ Every public member documented
│
└─ No → Is this an implementation?
    ├─ Service / business logic → Class doc + selective method docs
    ├─ Controller / handler → Framework-specific annotations (e.g., Swagger/OpenAPI)
    ├─ Task / workflow → Brief class doc + minimal method docs
    └─ Data access / repository → Minimal (focus on non-trivial queries)
```

---

## Examples

{{EXAMPLES}}

---

## Maintaining This Document

> **Update Policy:** This document MUST be updated when any of the following occur:

1. 📝 New naming convention established or existing one changed → update Naming Conventions
2. 📝 Dependency injection or module pattern changed → update Dependency Management Patterns
3. 📝 Documentation convention updated (e.g., switching from JSDoc to TSDoc) → update Documentation & Comment Patterns
4. 📝 Declaration or annotation order rules changed → update Code Style Consistency
5. 📝 New error handling pattern introduced → update Error Handling section
6. 📝 New language, framework, or version adopted → update Language & Framework
7. 📝 New representative code examples available → update Examples section
8. 📝 Ask user to confirm documentation updates before finalizing

### When User Asks About Coding Standards

1. 🔍 **FIRST** check this document for the answer
2. 🔍 If not found here, check existing code for the dominant pattern — then propose adding it to this document
3. ❌ **DO NOT** introduce inconsistent patterns — always resolve ambiguity by aligning with what's already established

---

## Related Rules

- [development.md](../../../rules/development.md) - Architecture overview
- [Code Quality Standards Skill](../../code-quality-standards/SKILL.md) - Code reuse checks **and universal TDD discipline (RED-GREEN-REFACTOR, triggers, framework detection, troubleshooting)**
- Domain context skills (deployed by APM only when the matching package is installed):
  - `.agents/skills/backend-context/SKILL.md` - Backend architecture patterns (from the `backend-developer` package)
  - `.agents/skills/frontend-context/SKILL.md` - Frontend component patterns (from the `frontend-developer` package)
  - `.agents/skills/api-context/SKILL.md` - API design patterns (from the `api` package)
  - `.agents/skills/testing-context/SKILL.md` - Testing patterns (from the `qa` package)

---

## Notes

{{ADDITIONAL_NOTES}}
