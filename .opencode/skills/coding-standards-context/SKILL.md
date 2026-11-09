---
name: coding-standards-context
description: Coding standards and conventions for the project. Use when establishing naming conventions, documentation patterns, code style rules, dependency management, or code organization standards for any programming language.
---

# Coding Standards Specialist Skill

> Provides coding standards context, language-specific patterns, and project-specific conventions.

## Activation

This skill activates when:
- Working with: ESLint/Prettier configs, editorconfig, style guides, documentation standards
- Tasks involve: naming conventions, code style enforcement, documentation patterns, dependency management, code organization
- Coding Standards agent is delegated standards-related tasks

## Typical Tasks

- Establishing and enforcing naming conventions (files, classes, functions, variables, constants)
- Defining documentation standards (JSDoc, TSDoc, Javadoc, docstrings, README patterns)
- Configuring linters and formatters (ESLint, Prettier, Checkstyle, Ruff, ktlint)
- Setting up code organization rules (import ordering, file structure, module boundaries)
- Defining dependency management patterns (DI, import conventions, barrel exports)
- Establishing error handling conventions (exception hierarchy, error types, Result patterns)
- Configuring type system strictness (TypeScript strict mode, Python type hints, null safety)
- Defining commit message and PR description conventions
- Setting up pre-commit hooks and CI quality gates
- Creating code review checklists and quality criteria

## How to Use

1. **Read `references/guidelines.md`** — project-specific rendered reference (primary source, generated during initialization Phase 6)
2. **Read `project-config.json`** for structured configuration data
3. If `references/guidelines.md` does not exist: fall back to `references/template.md` + `project-config.json`
4. If `project-config.json` has `"initialized": false` (or `guidelines.md` missing): warn that initialization hasn't configured this domain — apply universal patterns from `references/template.md` only and suggest re-running initialization

## Files

| File | Purpose |
|------|---------|
| `references/guidelines.md` | **Project-specific guidelines** — rendered from template during initialization Phase 6 (primary agent reference) |
| `references/template.md` | Universal coding standards patterns scaffold with `{{PLACEHOLDER}}` tokens for language customization (preserved for template updates) |
| `project-config.json` | Project-specific configuration (filled during initialization Phase 6) |

## Project Adaptation

During initialization Phase 6, the following project-specific details are collected and stored in `project-config.json`:

| Field | What It Captures | Example Values |
|-------|-----------------|----------------|
| `framework` | Primary framework | React, NestJS, Spring Boot, FastAPI |
| `version` | Framework version | 18.3, 10.3 |
| `language` | Primary language | TypeScript, Java, Python, Go, Kotlin, C# |
| `linter` | Linter configuration | ESLint + @typescript-eslint, Checkstyle, Ruff |
| `formatter` | Code formatter | Prettier, Black, google-java-format, gofmt |
| `namingConventions` | Naming rules | `{ files: "kebab-case", classes: "PascalCase", functions: "camelCase" }` |
| `documentationStandard` | Doc format | TSDoc, JSDoc, Javadoc, Google-style docstrings |
| `typeStrictness` | Type system config | strict mode, noImplicitAny, py.typed |
| `patterns` | Detected code patterns | Decorator-based, functional, builder pattern |
| `conventions` | Project conventions | Import ordering, barrel exports, enum patterns |
| `constraints` | Standards constraints | Legacy code compatibility, gradual migration |
| `testing.tddPolicy` | TDD policy strength | `mandatory`, `recommended`, `optional`, `not-used` |
| `testing.mandatoryCategories` | Categories where TDD is required | `["domain logic", "API endpoints", "regression bug fixes"]` |
| `testing.framework` | Primary unit/integration test framework | Vitest, Jest, pytest, JUnit 5, go test |
| `testing.e2eFramework` | End-to-end framework (if any) | Playwright, Cypress, Selenium |
| `testing.coverageTool` | Coverage tool | c8, Istanbul/nyc, coverage.py, JaCoCo |
| `testing.runCommand` | Run a single test file | `npx vitest run {file}` |
| `testing.runAllCommand` | Run the full suite | `npm test` |
| `testing.watchCommand` | Watch mode | `npx vitest watch` |
| `testing.fileNaming` | Test file naming convention | `*.test.ts` (unit), `*.spec.ts` (e2e) |
| `testing.fileLocation` | Where tests live | Co-located in `__tests__/`, or top-level `tests/` |
| `testing.coverageThresholds` | Coverage thresholds | `{ statements: 80, branches: 75, functions: 80, lines: 80 }` |
| `testing.outputDir` | Generated reports directory | `tests_output/` (must be in `.gitignore`) |
| `testing.taskmasterUsage` | Use TaskMaster for TDD subtasks | `complex-only`, `always`, `never` |
| `projectSpecificNotes` | Additional context | Existing style guide URL, team-specific rules |

> **TDD execution discipline (when to suggest, RED-GREEN-REFACTOR phases, framework detection, troubleshooting)** lives in the universal [Code Quality Standards](../code-quality-standards/SKILL.md) skill. The `testing.*` fields above project-specialize that universal discipline.

When applying patterns from `references/template.md`:
- If `project-config.json` has a value for a placeholder → use it
- If not → the placeholder represents a decision point to discuss with the user
