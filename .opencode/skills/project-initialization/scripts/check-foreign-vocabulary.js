#!/usr/bin/env node
/**
 * check-foreign-vocabulary.js — Core gate of the OpenCode line of the NC AI Workplace template.
 *
 * Fails when a tracked text file still carries the vocabulary of another agent harness
 * (Cursor, Cline, Claude Code) or structural damage left behind by a batch replacement
 * (doubled paths, empty code spans, stray extensions).
 *
 * Usage:
 *   node .opencode/skills/project-initialization/scripts/check-foreign-vocabulary.js [options]
 *     --stage <Cn>       Port stage being verified (C1 ... C10). Allowlist entries whose
 *                        "until" stage is earlier than <Cn> no longer apply.
 *     --allowlist <f>    Allowlist file (default: ../assets/foreign-vocabulary-allowlist.json)
 *     --json             Machine-readable output
 *     --quiet            Only print findings
 *     --list-pending     Print the pending allowlist entries and exit 0
 * Exit: 0 = clean, 1 = at least one finding, 2 = unusable invocation or allowlist.
 *
 * Allowlist format ({ "permanent": [...], "pending": [...] }); each entry:
 *   { "file": "<path, or prefix ending with />",
 *     "pattern": "<name|name|...>"   (optional: every pattern when absent),
 *     "lines": "<regex>"             (optional: only lines matching it are exempt),
 *     "until": "C5"                  (pending entries only),
 *     "reason": "..." }
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../../..');
const SELF = new Set([
  '.opencode/skills/project-initialization/scripts/check-foreign-vocabulary.js',
  '.opencode/skills/project-initialization/assets/foreign-vocabulary-allowlist.json',
]);
// Scanned extensions. Extension-less files (.gitignore, .gitattributes) are out of scope —
// an allowlist entry for one of them would never fire.
const TEXT = /\.(md|json|js|ps1|sh|yml|yaml|html)$/i;
const SKIP_DIRS = /^(node_modules|apm_modules|\.git|\.cursor|\.claude|\.cline|\.clinerules)\//;

// Lines on which the word "Cursor" is a fact about the Cursor harness / APM target, not a leftover.
const CURSOR_FACT = /--target cursor|targets?:\s*\[?\s*cursor|cursor_(hooks|agent|rules)|Cursor line|Cursor-line/;

const PATTERNS = [
  { name: 'cursor-path', re: /\.cursor(\/|\\|\b)/ },
  { name: 'cursorignore', re: /\.cursorignore/ },
  { name: 'mdc-ext', re: /\.mdc\b/ },
  { name: 'mdc-scheme', re: /\bmdc:/ },
  { name: 'alwaysApply', re: /alwaysApply/ },
  { name: 'hooks-json', re: /\bhooks\.json/ },
  { name: 'followup_message', re: /followup_message/ },
  { name: 'loop_limit', re: /loop_limit/ },
  { name: 'CURSOR_PROJECT_DIR', re: /CURSOR_PROJECT_DIR/ },
  { name: 'mcp-json', re: /\bmcp\.json/ },
  { name: 'APM_LEGACY_SKILL_PATHS', re: /APM_LEGACY_SKILL_PATHS/ },
  { name: 'readonly', re: /\breadonly\b/ },
  { name: 'foreground', re: /\bForeground\b|in the foreground|foreground dispatch|dispatched in foreground/ },
  { name: 'generalPurpose', re: /generalPurpose/ },
  { name: 'Cursor', re: /\bCursor\b/, exceptLine: CURSOR_FACT },
  { name: 'cursor-ui', re: /Ctrl\+Shift|Cursor Settings|Cursor chat|Agent mode|Codebase Indexing/ },
  { name: 'cursor-model-id', re: /composer-2|thinking-medium|model:\s*inherit/ },
  { name: 'apm-hooks-json', re: /apm-hooks\.json/ },
  { name: 'SessionStart', re: /SessionStart/ },
  { name: 'upstream-master-url', re: /nc-ai-workplace\/-\/(blob|raw)\/master\// },
  { name: 'cline', re: /use_subagents|\.cline\b|\.clinerules|TaskComplete\b/ },
];
const STRUCTURE = [
  { name: 'double-opencode', re: /\.opencode\/\.opencode/ },
  { name: 'md-md', re: /\.md\.md\b/ },
  { name: 'dot-dot-md', re: /[^.\s]\.\.md\b/ },
  { name: 'empty-code-span', re: /(^|[^`])``(?!`)/ },
];

function parseArgs(argv) {
  const o = {
    stage: null,
    allowlist: path.join(__dirname, '..', 'assets', 'foreign-vocabulary-allowlist.json'),
    json: false,
    quiet: false,
    listPending: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--stage') o.stage = argv[++i];
    else if (a === '--allowlist') o.allowlist = path.resolve(argv[++i]);
    else if (a === '--json') o.json = true;
    else if (a === '--quiet') o.quiet = true;
    else if (a === '--list-pending') o.listPending = true;
    else { console.error('Unknown option: ' + a); process.exit(2); }
  }
  if (o.stage && !/^C\d+$/.test(o.stage)) { console.error('--stage must look like C5, got ' + o.stage); process.exit(2); }
  return o;
}
const stageNum = (s) => (s ? Number(s.slice(1)) : Infinity);

function loadAllowlist(file, stage) {
  let raw;
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')); }
  catch (e) { console.error('Allowlist unusable: ' + file + ': ' + e.message); process.exit(2); }
  const entries = [];
  for (const kind of ['permanent', 'pending']) {
    for (const e of raw[kind] || []) {
      if (!e.file) { console.error('Allowlist entry without "file" in ' + kind); process.exit(2); }
      if (kind === 'pending' && !/^C\d+$/.test(e.until || '')) { console.error('Pending entry ' + e.file + ' needs "until": "Cn"'); process.exit(2); }
      if (kind === 'pending' && stage && stageNum(e.until) < stageNum(stage)) continue; // expired for this stage
      entries.push({
        kind,
        file: e.file,
        names: e.pattern ? new Set(e.pattern.split('|')) : null,
        lines: e.lines ? new RegExp(e.lines) : null,
        until: e.until || null,
        reason: e.reason || '',
      });
    }
  }
  return { entries, raw };
}
const fileMatches = (entryFile, file) => (entryFile.endsWith('/') ? file.startsWith(entryFile) : file === entryFile);

function allowed(entries, file, name, line) {
  return entries.some((e) => fileMatches(e.file, file) && (!e.names || e.names.has(name)) && (!e.lines || e.lines.test(line)));
}

function trackedFiles() {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' });
  return out.split('\0').filter((f) => f && TEXT.test(f) && !SKIP_DIRS.test(f) && !SELF.has(f));
}

function main() {
  const opt = parseArgs(process.argv.slice(2));
  const { entries, raw } = loadAllowlist(opt.allowlist, opt.stage);
  if (opt.listPending) {
    for (const e of raw.pending || []) console.log(e.until + '\t' + e.file + '\t' + (e.pattern || '*'));
    return 0;
  }
  const findings = [];
  for (const file of trackedFiles()) {
    const buf = fs.readFileSync(path.join(ROOT, file));
    if (buf.includes(0)) continue;
    const lines = buf.toString('utf8').split('\n');
    lines.forEach((line, i) => {
      for (const p of PATTERNS) {
        if (!p.re.test(line)) continue;
        if (p.exceptLine && p.exceptLine.test(line)) continue;
        if (allowed(entries, file, p.name, line)) continue;
        findings.push({ file, line: i + 1, name: p.name, text: line.trim().slice(0, 140) });
      }
      for (const p of STRUCTURE) {
        if (!p.re.test(line)) continue;
        if (allowed(entries, file, p.name, line)) continue;
        findings.push({ file, line: i + 1, name: p.name, text: line.trim().slice(0, 140) });
      }
    });
  }
  if (opt.json) {
    console.log(JSON.stringify({ stage: opt.stage, findings: findings.length, items: findings }, null, 2));
  } else {
    for (const f of findings) console.log(f.file + ':' + f.line + ': [' + f.name + '] ' + f.text);
    if (!opt.quiet) {
      const byName = {};
      for (const f of findings) byName[f.name] = (byName[f.name] || 0) + 1;
      const summary = Object.entries(byName).map(([k, v]) => k + '=' + v).join(', ');
      const where = opt.stage ? ' at stage ' + opt.stage : '';
      console.log(findings.length ? 'FAIL: ' + findings.length + ' finding(s)' + where + ' (' + summary + ')' : 'OK: no foreign vocabulary' + where);
    }
  }
  return findings.length ? 1 : 0;
}
process.exit(main());
