---
description: Generate layered Playwright test automation code from a natural-language
  test description file using the AI orchestration pipeline (reusability, research,
  generation, validation).
---

# Generate Test

> **Generate layered Playwright test automation code** from a test description file using AI-driven orchestration

## Overview

This command orchestrates end-to-end test code generation from a natural-language test description. It analyzes existing code for reusability, researches live application pages for locators, generates layered test code (Page Objects, Business Workflows, Test Scenarios) with TypeScript self-check (Phase 3-4), and validates runtime behavior with Playwright execution (Phase 5).

## How to Use

Type `/generate-test` in Cursor chat, providing a path to the test description file:

```
/generate-test path/to/test-description.md
```

If no path is provided, the agent will prompt for one.

## When to Use

- When you have a test description document and want to generate executable Playwright tests
- When adding new test scenarios to an existing test automation project
- When extending test coverage with AI-assisted code generation

## Prerequisites

- Playwright project with `@playwright/test` installed
- SharedRuntime base classes (AIPage, AIElement, TestLogger, etc.) resolvable from the active module’s **`importBasePath`** in `.workplace/test-generation/config.json` (e.g. `TestGeneration/SharedRuntime` when `rootFolder` is `TestGeneration`) — do not assume a fixed `tests/SharedRuntime` path
- Test description file written in markdown with step-by-step test flow

## Agent Instructions

**When this command is triggered, the AI agent MUST:**

1. Read the test generation orchestrator skill:
   ```
   Read: .cursor/skills/test-generation-orchestrator/SKILL.md
   ```

2. Follow all steps defined in the skill's **Skill Workflow** section, including the **Delegation Mandate**.

3. **CRITICAL — Orchestrator-Only Role:**
   The main agent acts as **ORCHESTRATOR ONLY**. It MUST NOT generate test code, write investigation logs, interact with Playwright MCP, or produce any phase artifact directly. ALL phase work MUST be delegated to subagents via the Task tool as specified in the skill. If the agent begins performing phase work inline instead of launching a subagent, it is **violating the orchestration protocol** and MUST stop and delegate.

4. The orchestrator MUST launch 4 subagents in sequence via the **Task tool**:
   - **Phase 0** — Reusability Agent (`subagent_type: "reusability-agent"`) — Analyze existing code for reusable components
   - **Phase 1-2** — Test Research Agent (`subagent_type: "browser-use"`) — Investigate live pages via Playwright MCP
   - **Phase 3-4** — Test Gen Agent (`subagent_type: "test-gen-agent"`) — Generate layered test code and run `tsc` self-validation
   - **Phase 5** — Test Validation Agent (`subagent_type: "test-validation-agent"`) — Execute Playwright tests and manage fix cycles

5. Present a summary to the user after each phase completes.

## Generated Artifacts

Paths in the **Location** column are **relative to `config.rootFolder`** from the module config (not necessarily the repository root). Example: `rootFolder` = `TestGeneration` → Page Objects live under `TestGeneration/tests/Functional/`.

| Artifact | Location | Description |
|----------|----------|-------------|
| Page Objects | `tests/Functional/` | UI interaction classes using AIElement |
| Business Workflows | `tests/Business/` | Domain logic orchestration classes |
| Test Scenarios | `tests/TestScenario/` | Test files with TagHelper integration |
| Data Generators | `tests/TestData/` | Random test data generation |
| Locator Cache | `tests/Utils/locator_cache.json` | Centralized element locators |
| Tag Mapping | `tests/Utils/TestTagsMapping.json` | Test ID to tag mapping |
| Debug Output | `tests/Raw/Debug/` | Investigation logs, `ElementsCollected.ts`, reusability analysis |
| Reports | `tests/Raw/Report/` | Test execution results and HTML reports |

## Related Documentation

- Module config: `.workplace/test-generation/config.json` — Path configuration and execution parameters