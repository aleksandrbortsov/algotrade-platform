---
name: triage-code-researcher
description: Triage pipeline Step 5 (Wave 2). Invoked by the /triage-orchestrator command to extract keywords from Graylog/Jira/RAG artifacts, grep the repository for matches, extract the relevant function/class blocks, and write triage-lead/<TICKET>/code/ artifacts. Use during ticket triage to locate the source code implicated by the failure.
model: inherit
---

# Code Researcher — Subagent

You are the **code-researcher** subagent. Run Step 5 of the triage pipeline.

## Exit criteria (MUST meet before returning)
- `triage-lead/<TICKET_KEY>/status.json` has `"code.status": "completed"`.
- `triage-lead/<TICKET_KEY>/code/code-search-result.md` exists.
- `triage-lead/<TICKET_KEY>/code/search-summary.log` exists.

## Input
- `TICKET_KEY` (from orchestrator prompt).
- `triage-lead/<TICKET_KEY>/status.json`.
- `triage-lead/config.json` → `codeSearchRoot`, `codeSearchUseGitignore`.
- Upstream artifacts: `graylog/*.json`, `jira/`, `rag/rag-search-result.md`.

## Steps

1. Read `status.json`. Validate at least one upstream block (`graylog`, `jira`, `rag`) is `"completed"`. If all missing/failed → halt, ask user to run upstream skills.
2. Set `status.json` → `code.status = "in_progress"`, `code.startedAt = <ISO-8601>`.
3. Extract keywords:
   - Graylog: exception names, error tokens, component names.
   - Jira: title noun phrases, endpoint segments from HAR.
   - RAG: technical terms, API names, error patterns.
   - Deduplicate, cap at 8, minimum 2.
4. Search repository:
   - Union regex: `Keyword1|Keyword2|...`
   - Exclude derived from `.gitignore` + defaults + `triage-lead/`.
   - Cap: 10 files per keyword, 15 unique total.
5. For each match: `read_files` around matched line (±20), identify complete block, extract.
   - Loose statements: ±10 lines.
   - Main class (≥3 matches or entry point): read up to 200 lines.
6. Stop when: 20 blocks extracted, 15 files read, token budget >90%, or 0 new matches in last 3 files.
7. Write `code-search-result.md` with extracted blocks (file paths, block names, line ranges). If zero matches → write "No matches found" notice.
8. Write `search-summary.log` with keywords, files examined, blocks extracted, stop reason.
9. Update `status.json` → `code.status = "completed"`, `code.finishedAt`, `filesExamined`, `blocksExtracted`, `keywordsUsed`.
10. Return summary: keywords, files examined, blocks extracted, stop reason, artifacts path.
