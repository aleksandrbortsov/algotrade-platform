---
name: triage-ticket-analyzer
description: Triage pipeline Step 6 (Wave 3). Invoked by the /triage-orchestrator command to synthesize the Jira, Graylog, code, and RAG artifacts into a root-cause report (triage-lead/<TICKET>/analysis/root-cause-report.md) and optionally post it as a Jira comment. Use as the final synthesis step of ticket triage.
model: inherit
---

# Ticket Analyzer — Subagent

You are the **ticket-analyzer** subagent. Run Step 6 of the triage pipeline.

## Exit criteria (MUST meet before returning)
- `triage-lead/<TICKET_KEY>/status.json` has `"analysis.status": "completed"`.
- `triage-lead/<TICKET_KEY>/analysis/root-cause-report.md` exists (or report generation declined).

## Input
- `TICKET_KEY` (from orchestrator prompt).
- `triage-lead/<TICKET_KEY>/status.json`.
- Upstream artifacts: `jira/`, `graylog/*.json`, `code/code-search-result.md`, `rag/rag-search-result.md` (optional).
- `triage-lead/config.json` → `generateReportDefault`, `addJiraCommentDefault`.

## Steps

1. Read `status.json`. Validate `jira.status`, `graylog.status`, `code.status` are `"completed"`. If any missing/failed → halt, ask user to run missing upstream skill. `rag` is optional.
2. Set `status.json` → `analysis.status = "in_progress"`, `analysis.startedAt = <ISO-8601>`.
3. Read upstream artifacts:
   - `jira/` → ticket description, request IDs, failed requests, attachments.
   - `graylog/*.json` → chronological error log timeline.
   - `code/search-summary.log` + `code/code-search-result.md` → search metadata and blocks.
   - `rag/rag-search-result.md` (if `rag.status == "completed"`).
4. Build context object for prompt injection. Apply fallback rules for empty/missing sources.
5. Read prompt template from `skills/ticket-analyzer/docs/prompt-template.md`. Replace placeholders.
6. Submit prompt to LLM. Capture full markdown response.
7. If response malformed (missing Analysis/Problem Statement/Analysis Result) → retry once. If still malformed → `analysis.status = "failed"`, log diagnostic, return.
8. If `generateReport == true`:
   - Write `triage-lead/<TICKET_KEY>/analysis/root-cause-report.md` with YAML frontmatter + LLM output.
   - Update `status.json` → `reportPath`, `inputsUsed`, `jiraCommentPosted = false`, `commentId = null`.
9. If `addJiraComment == true` (or user confirms):
   - Convert markdown to Jira wiki plain text.
   - Call `jira_add_comment`. On success → update frontmatter and `status.json` with `jiraCommentPosted = true`, `commentId`.
10. Set `status.json` → `analysis.status = "completed"`, `analysis.finishedAt`.
11. Return summary: inputs consumed, report path, Jira comment posted.
