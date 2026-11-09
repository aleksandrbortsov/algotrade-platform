---
description: Initialize TaskMaster (task-driven development, optional TDD workflow)
---

# Initialize TaskMaster

> **TaskMaster Integration Command** - Initialize TaskMaster MCP for AI-assisted task management and TDD workflow

## Overview

This command initializes TaskMaster in your project, setting up the necessary structure and configuration for task-driven development with optional TDD (Test-Driven Development) workflow.

## How to Use

Type `/taskmaster-init` in the OpenCode prompt to initialize TaskMaster.

## What This Command Does

1. **Check Current Status** - Verifies if TaskMaster is already initialized
2. **Initialize Project** - Sets up `.taskmaster/` directory structure
3. **Provide Next Steps** - Guides you on how to start using TaskMaster (manual task management, no API required)

## Agent Instructions

**When this command is triggered, the AI agent MUST:**

### Step 1: Check Existing Installation

```
Check for:
- .taskmaster/ directory exists
- .taskmaster/config.json exists
- .taskmaster/tasks/tasks.json exists

If all exist → TaskMaster is already initialized
If not → Proceed with initialization
```

### Step 2: Initialize TaskMaster

**Use MCP Tool (Preferred):**
```javascript
initialize_project({
  projectName: "[Project name from .opencode/project_init.md or package.json]",
  projectDescription: "[Brief description]",
  yes: true  // Skip prompts for automated setup
})
```

**Or use CLI (Fallback):**
```bash
npx task-master-ai init -y --name="[project-name]"
```

### Step 3: Verify Initialization

After initialization, check that these files exist:
- `.taskmaster/config.json` - Configuration file
- `.taskmaster/tasks/` - Tasks directory (will be populated after manual task creation or PRD parsing)
- `.taskmaster/docs/` - Documentation directory
- `.taskmaster/templates/` - Template files

### Step 4: Provide Next Steps

Present completion message:
```
✅ TaskMaster Initialized Successfully!

📁 Created Structure:
- .taskmaster/config.json
- .taskmaster/tasks/
- .taskmaster/docs/
- .taskmaster/templates/

🎯 Next Steps:

1. **Create tasks** — Use `add_subtask` MCP tool or `task-master add-subtask` to build your task hierarchy
2. **View tasks** — `task-master list` or `get_tasks` MCP tool
3. **Get next task** — `task-master next` or `next_task` MCP tool
4. **Track progress** — `task-master set-status --id=<id> --status=in-progress|done`

📚 Documentation:
- TaskMaster Workflow: .opencode/rules/taskmaster/dev_workflow.md
- TaskMaster Commands: .opencode/rules/taskmaster/taskmaster.md
```

**Do NOT mention** API keys, AI models, or PRD parsing during this step. Only if the user explicitly asks ("I want AI features", "add API key for TaskMaster", "parse PRD") — then provide instructions from the "Optional: Enable AI Features" section below.

## Prerequisites

- **Node.js** installed (for `task-master-ai` npm package)
- **Task Master MCP** present in `opencode.json` (added during `/quick-init` or `/initialize`)
- **OpenCode:** the `task-master-ai` server is active when its entry in `opencode.json → mcp` has `enabled: true`; verify with `opencode mcp list` after restarting OpenCode
- No API keys required for basic task management

## Optional: Enable AI Features (On User Request Only)

**Show this section only when the user explicitly asks** to enable AI features (PRD parsing, task expansion, research, etc.).

Add the requested API key(s) to the `task-master-ai` entry in `opencode.json` and optionally set `TASK_MASTER_TOOLS` to `"standard"` or `"all"`:

```json
"task-master-ai": {
  "type": "local",
  "command": [
    "npx",
    "-y",
    "task-master-ai"
  ],
  "enabled": true,
  "environment": {
    "TASK_MASTER_TOOLS": "all",
    "ANTHROPIC_API_KEY": "<user-provided-key>",
    "PERPLEXITY_API_KEY": "<user-provided-key>"
  }
}
```

Supported keys: `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `XAI_API_KEY`. See [taskmaster.md](.opencode/rules/taskmaster/taskmaster.md) — Environment Variables section.

## Troubleshooting

### Issue: "TaskMaster already initialized"

**What to do:**
- If reinitialization needed, the agent should ask if user wants to:
  - Keep existing configuration
  - Reconfigure models only
  - Full reinitialization (warning about data loss)

### Issue: "MCP connection failed"

**Solution:**
1. Try CLI fallback: `npx task-master-ai init`
2. Check Node.js installation: `node --version`
3. Verify package accessibility: `npx -y task-master-ai --help`

### Issue: "AI tool failed" / User wants AI features

**Solution:** User must explicitly request AI features. Then add API key(s) to `opencode.json` per "Optional: Enable AI Features" section above. restart OpenCode after updating MCP config.

### Issue: "Command not found: task-master"

**Solution:**
- Use full command: `npx task-master-ai` instead of `task-master`
- Or install globally: `npm install -g task-master-ai`

## Integration with TDD Workflow

TaskMaster initialization is **required** for TDD workflow because:

- **Task Planning:** TDD workflow uses TaskMaster tasks to track RED-GREEN-REFACTOR phases
- **Progress Logging:** Test results are logged in TaskMaster subtasks
- **Test Strategy:** TaskMaster tasks include `testStrategy` field for test planning
- **Iteration Tracking:** Each TDD iteration is documented in task details

After initializing TaskMaster, use the `/tdd-workflow` command (shipped by the `qa` APM package) to start test-driven development. If `/tdd-workflow` is not available, add the `qa` package (`git: <apmPackages.registryRepoUrl>`, `path: qa`, `ref: master`) to your `apm.yml` and run `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js` (see [`docs/core/APM_PACKAGES.md`](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md)).

## Related Commands

### Core Commands
- [@initialize](initialize.md) - Main project initialization

### Role-Pack Commands (`qa` pack)
The TDD commands ship in the `qa` APM package ([`qa/`](https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages/-/tree/master/qa)). Install via `/initialize` (selecting the `qa` role auto-activates the package in Phase 1.7-APM) or by adding the `qa` package (`git: <apmPackages.registryRepoUrl>`, `path: qa`, `ref: master`) to `apm.yml` and running `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`:
- `/tdd-workflow` - Start TDD workflow (requires TaskMaster)
- `/test-verify` - Verify and update existing tests

### TaskMaster Commands (CLI)
After initialization, these commands become available:
- `task-master list` - View all tasks
- `task-master next` - Get next task to work on
- `task-master parse-prd <file>` - Generate tasks from PRD
- `task-master expand --id=<id>` - Break task into subtasks

## Related Documentation

- [Task Master (claude-task-master)](https://github.com/eyaltoledano/claude-task-master) - Official repository, installation, CLI reference
- [.opencode/rules/taskmaster/dev_workflow.md](../rules/taskmaster/dev_workflow.md) - Development workflow
- [.opencode/rules/taskmaster/taskmaster.md](../rules/taskmaster/taskmaster.md) - Command reference
- [.opencode/skills/code-quality-standards/SKILL.md](../skills/code-quality-standards/SKILL.md) → "Test-Driven Development (TDD)" - Universal TDD discipline (replaces the former `tdd_workflow.md` rule)
- [.opencode/skills/coding-standards-context/references/guidelines.md](../skills/coding-standards-context/references/guidelines.md) → "TDD Policy" - Project-specific TDD policy

## Notes

- TaskMaster works in both MCP mode (OpenCode) and CLI mode
- MCP mode is **preferred** for better performance and structured data
- **No API keys required** for task management — create, list, organize, track tasks
- AI-powered operations (parse-prd, expand, add-task, research) require API keys — enable only when user asks
- Configuration is stored in `.taskmaster/config.json` (managed via commands)
- Tasks are stored in `.taskmaster/tasks/tasks.json` (auto-managed, don't edit manually)

---

*This is a Core command for TaskMaster integration. For project-specific workflows, create custom commands in `.opencode/commands/` with a `project-` prefix.*
