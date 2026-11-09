# Documentation Index

> Central index of all project documentation and development rules

**Last Updated:** 2026-11-09 20:05

---

## 📋 Core Documentation

### Project Overview
- [README.md](../README.md) - Project overview, local setup, project structure and preserved legacy notes
- [.opencode/project_init.md](../.opencode/project_init.md) - Initialization ledger, artifact pointers, decision log and open gaps

### Development Guides
- [AGENTS.md](../AGENTS.md) - AI agent instructions and repository guardrails

### Additional Project Documentation
- [.opencode/rules/project/README.md](../.opencode/rules/project/README.md) - Project customization and identity model

---

## 🔧 Development Rules

### Initialization & Setup
- [project-initialization skill](../.opencode/skills/project-initialization/SKILL.md) - Complete initialization workflow
- [Quick Init reference](../.opencode/skills/project-initialization/references/quick-init.md) - Quick template setup workflow

### Core Development
- [development.md](../.opencode/rules/development.md) - Technology stack, architecture and architectural constraints
- [orchestrator.md](../.opencode/rules/orchestrator.md) - Agent selection, command routing, task complexity and behavioral principles
- [coding guidelines](../.opencode/skills/coding-standards-context/references/guidelines.md) - Java, Spring Boot, MapStruct, Lombok, TDD and naming rules
- [infrastructure guidelines](../.opencode/skills/infrastructure-context/references/guidelines.md) - Local runtime, configuration, monitoring, containers and secrets constraints
- [metadata.json](../.opencode/rules/project/metadata.json) - Project identity, roles and local environment facts

### Documentation & Quality
- [documentation-management skill](../.opencode/skills/documentation-management/SKILL.md) - Registry, synchronization and cross-reference rules
- [Markdown standards](../.opencode/skills/documentation-management/references/markdown-standards.md) - Documentation formatting standards
- [codebase-analysis skill](../.opencode/skills/codebase-analysis/SKILL.md) - Analysis methodology and subagent usage
- [Phase 4 analysis index](../.opencode/project/analysis/index.json) - Component inventory, coverage map and validation status

### TaskMaster Integration
- [dev_workflow.md](../.opencode/rules/taskmaster/dev_workflow.md) - TaskMaster development workflow
- [taskmaster.md](../.opencode/rules/taskmaster/taskmaster.md) - TaskMaster command reference

---

## 🔗 Quick Navigation

### Getting Started
1. [Initialize Project](../.opencode/project_init.md) → [Initialization Process](../.opencode/skills/project-initialization/SKILL.md)
2. [Read AGENTS.md](../AGENTS.md) → [Development Rules](../.opencode/rules/development.md)

### Development Workflow
1. [Development Standards](../.opencode/rules/development.md)
2. [Agent Orchestration](../.opencode/rules/orchestrator.md)
3. [Coding Guidelines](../.opencode/skills/coding-standards-context/references/guidelines.md)
4. [Infrastructure Guidelines](../.opencode/skills/infrastructure-context/references/guidelines.md)
5. [TaskMaster Workflow](../.opencode/rules/taskmaster/dev_workflow.md)

---

## 📝 How to Use This Index

### For New Team Members
1. Start with [README.md](../README.md) for project overview and manual startup prerequisites.
2. Read [AGENTS.md](../AGENTS.md) before making changes.
3. Review [development standards](../.opencode/rules/development.md).

### For Contributors
1. Use [AGENTS.md](../AGENTS.md) for command, safety and PR expectations.
2. Use [coding guidelines](../.opencode/skills/coding-standards-context/references/guidelines.md) for implementation patterns.
3. Use [infrastructure guidelines](../.opencode/skills/infrastructure-context/references/guidelines.md) for runtime, configuration and secret-handling rules.

### For AI Agents
1. Use this file as the complete documentation navigation hub.
2. Consult active context-skill guidelines before domain-specific work.
3. Check [Phase 4 analysis index](../.opencode/project/analysis/index.json) for module, endpoint, entity and runtime evidence.
4. Update this index when new project documentation is added.

---

## 🔄 Maintenance

This index was automatically generated during project initialization (Phase 7.5).

**Update triggers:**
- New major documentation is created
- Architecture or module responsibilities change
- New development rules or context guidelines are added

**To update this index:**
1. Add the new entry to the appropriate section above.
2. Add or update cross-references from the relevant documentation.
3. Run `node .opencode/skills/project-initialization/scripts/validate-doc-links.js`.

---

## Related Documentation
- [documentation-management/SKILL.md](../.opencode/skills/documentation-management/SKILL.md) - Complete registry system

---

*This index ensures all project documentation is discoverable and properly cross-referenced.*
