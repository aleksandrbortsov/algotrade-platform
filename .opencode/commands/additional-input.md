---
description: Apply a user-directed correction or extension to an in-progress test
  generation session, routed through the orchestration pipeline.
---

# Additional Input

> **Apply a user-directed change to an in-progress test generation session** using the same orchestration pipeline

## Overview

This command lets you intervene at any point during test generation to correct a problem or extend the test. The orchestrator interprets your instruction, routes it to the correct subagent(s), and resumes the generation pipeline from the appropriate phase.

## How to Use

Type `/additional-input` in Cursor chat and describe what needs to change:

```
/additional-input The DOB picker fix is wrong — the problem is in ResidentialCustomerAccountFormPage.
The year dropdown is being selected before the picker popup is fully open.
```

```
/additional-input After step 8 (open billing account), the test needs to verify the account status
is "Active" before proceeding to the payment instrument step.
```

No rigid format is required. Write in plain language. The orchestrator will ask for clarification if the intent is ambiguous.

## When to Use

- You see that a fix cycle is targeting the wrong component or solving the wrong problem
- You notice a missing step or incorrect step in the generated test
- You want to add new steps that were omitted from the test description
- You want to redirect the fix agent to a specific file or method

## Prerequisites

- An active `GenerationCheckpoint.json` must exist — this command requires an in-progress or recently failed generation session
- The test description file referenced in the checkpoint must still be on disk

## Agent Instructions

**When this command is triggered, the AI agent MUST:**

1. Read the test generation orchestrator skill:
   ```
   Read: .cursor/skills/test-generation-orchestrator/SKILL.md
   ```

2. Read the Human Intervention Protocol section from the skill and follow it exactly.

3. **CRITICAL — Orchestrator-Only Role:**
   The main agent acts as **ORCHESTRATOR ONLY**. Classification, clarification dialogue, and FixContext construction are orchestrator tasks. Actual code changes, locator research, and test execution belong to subagents. The orchestrator MUST NOT modify any file under `tests/` directly.

4. The orchestrator MUST NOT start executing changes until:
   - The user instruction is unambiguously classified
   - For test updates: the test description file is confirmed updated and all required information is available
   - `confirmBeforeContinue` approval is obtained (if enabled in config)

## What Happens After

After the intervention subagent(s) complete, the orchestrator:
- Records the intervention in `GenerationCheckpoint.json` under `user-intervention-{N}`
- Resumes Phase 5 (or the appropriate phase determined during classification)
- Continues the normal generation pipeline from that point