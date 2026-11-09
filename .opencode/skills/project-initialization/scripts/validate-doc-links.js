#!/usr/bin/env node
/**
 * Documentation link validator for the AI Workplace template.
 *
 * Enumerates every Markdown / HTML document — via `git ls-files` inside
 * a git work tree (tracked + untracked-but-not-gitignored; falls back to a
 * plain filesystem walk otherwise, or always with --all), extracts internal
 * links (relative paths), and verifies that both the
 * target file and — when present — the target heading anchor actually exist.
 *
 * Usage:  node .opencode/skills/project-initialization/scripts/validate-doc-links.js [--json] [--all] [--strict] [--quiet] [--scope=<s>]
 *   --scope=workplace|project|all
 *             Which documents' findings block. `workplace` = documents the
 *             template owns or generates (.opencode/, docs/core/, AGENTS.md,
 *             README.md, docs/INDEX.md, …); `project` = the team's own
 *             documents; `all` = both. Default: `workplace` in an initialized
 *             project, `all` in the template repo. Out-of-scope findings are
 *             still listed, just never blocking — an initialization should not
 *             end in a wall of errors about pre-existing docs it never touched.
 *   --all     Force a full filesystem walk instead of `git ls-files` (also
 *             picks up gitignored documents, e.g. docs/core/AI_WP_OVERVIEW.md
 *             or Old_Update_Flow/ in this template).
 *   --strict  Treat `generated-target` findings as errors (exit 1). Off by
 *             default — turning it on unconditionally would make the first
 *             run noisy on any project missing an optional APM package.
 *   --quiet   Suppress the informational `generated-target` section in
 *             template mode. Has no effect in project mode, where that
 *             section prints as an explicit warning unconditionally (see
 *             isProjectMode below).
 * Exit:   0 = no broken references (or only generated-target findings
 *             without --strict), 1 = at least one broken reference.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../../..');
// Other harness directories (.cursor, .claude, .cline, .clinerules) are skipped: real consumers migrate
// to this line with the previous harness still on disk, and its docs are not the Workplace's to validate.
const SKIP_DIRS = new Set(['.git', 'node_modules', '.backups', '.update-backup', 'apm_modules', 'plans', '.cursor', '.claude', '.cline', '.clinerules']);
const DOC_EXT = new Set(['.md', '.html']);

/**
 * Documents the Workplace template owns or generates. A broken link inside one of these is
 * the agent's problem and blocks; a broken link in a project's own pre-existing docs is the
 * team's backlog, reported but never blocking — otherwise every initialization ends with a
 * wall of findings about documentation the run never touched.
 */
const WORKPLACE_PREFIXES = ['.opencode/', '.agents/skills/', 'docs/core/'];
const WORKPLACE_FILES = new Set(['AGENTS.md', 'README.md', 'CHANGELOG.md', 'docs/INDEX.md', 'docs/ARCHITECTURE.md', 'docs/GETTING_STARTED.md', 'docs/PRESENTATION.md']);

function isWorkplaceDoc(relPath) {
  return WORKPLACE_FILES.has(relPath) || WORKPLACE_PREFIXES.some((p) => relPath.startsWith(p));
}

function isProjectMode() {
  try {
    const raw = fs.readFileSync(path.join(ROOT, '.opencode', 'rules', '.core-version.json'), 'utf-8').replace(/^\uFEFF/, '');
    return JSON.parse(raw).initializationStatus === 'active';
  } catch {
    return false; // template mode, or file absent/unreadable — same default as docs-sync-check.js
  }
}

function isInsideGitWorkTree() {
  try {
    return execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim() === 'true';
  } catch {
    return false;
  }
}

/** Tracked + untracked-but-not-gitignored files, NUL-delimited to survive any path. */
function listViaGit() {
  const out = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
    cwd: ROOT,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return out.split('\0').filter(Boolean).map((p) => path.join(ROOT, p));
}

function isSkipped(absPath) {
  const rel = path.relative(ROOT, absPath).replace(/\\/g, '/');
  return rel.split('/').some((seg) => SKIP_DIRS.has(seg) || seg.startsWith('.tmp-'));
}

/**
 * Targets that legitimately do not exist in the template repo because they are
 * produced during `/initialize` (or by `apm install`) in a consumer project.
 * Links to them are reported separately, not as errors.
 */
const GENERATED_TARGETS = [
  /(^|\/)AGENTS\.md$/,
  /(^|\/)docs\/INDEX\.md$/,
  /(^|\/)references\/guidelines\.md$/,
  /(^|\/)apm\.lock\.yaml$/,
  /(^|\/)docs\/project(\/|$)/,
  /(^|\/)apm_modules(\/|$)/,
  /(^|\/)\.workplace(\/|$)/,
  // Skills and agents that only exist after `apm install` deploys their package.
  /(^|\/)(frontend|backend|database|api|testing|performance|shopping-portal)-context(\/|$)/,
  /(^|\/)(tdd-workflow|quality-check|code-review|code-simplification|codegen-benchmark|codegen-scorer)(\/|$)/,
  /(^|\/)(frontend|backend|database|api|testing|performance)-specialist\.md$/,
];

const isGenerated = (relTarget) => GENERATED_TARGETS.some((re) => re.test(relTarget));

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || SKIP_DIRS.has(rel) || entry.name.startsWith('.tmp-')) continue;
      walk(full, out);
    } else if (DOC_EXT.has(path.extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

/** GitHub-flavoured heading slug. */
function slugify(heading) {
  return heading
    .trim()
    .replace(/`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> text
    // Emphasis markers disappear during rendering. `_` is kept: it is a word
    // character and survives in slugs (`project_init.md` -> `project_initmd`).
    .replace(/[*~]/g, '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    // GitHub/GitLab map each whitespace character to its own dash, so a heading
    // containing " — " yields a double dash once the em dash itself is stripped.
    .replace(/\s/g, '-');
}

const anchorCache = new Map();

function anchorsOf(file) {
  if (anchorCache.has(file)) return anchorCache.get(file);
  const set = new Set();
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    anchorCache.set(file, set);
    return set;
  }
  let inFence = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.*?)\s*$/.exec(line);
    if (m) {
      const base = slugify(m[2]);
      if (!base) continue;
      // GitHub disambiguates duplicates with -1, -2, ...
      let slug = base, n = 0;
      while (set.has(slug)) slug = `${base}-${++n}`;
      set.add(slug);
      set.add(base);
    }
    // explicit HTML anchors
    for (const a of line.matchAll(/<a\s+(?:name|id)="([^"]+)"/g)) set.add(a[1].toLowerCase());
    for (const a of line.matchAll(/\bid="([^"]+)"/g)) set.add(a[1].toLowerCase());
  }
  anchorCache.set(file, set);
  return set;
}

/** Strip fenced/inline code so we do not lint example links. */
function stripCode(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; out.push(''); continue; }
    out.push(inFence ? '' : line.replace(/`[^`]*`/g, ''));
  }
  return out;
}

const forceAll = process.argv.includes('--all');
const strict = process.argv.includes('--strict');
const projectMode = isProjectMode();

const scopeArg = (process.argv.find((a) => a.startsWith('--scope=')) || '').split('=')[1];
const SCOPES = ['workplace', 'project', 'all'];
if (scopeArg && !SCOPES.includes(scopeArg)) {
  console.error(`Unknown --scope "${scopeArg}". Use one of: ${SCOPES.join(', ')}.`);
  process.exit(2);
}
// In an initialized project the default narrows to Workplace-owned documents; in the
// template repo every document is Workplace-owned, so the default is the whole tree.
const scope = scopeArg || (projectMode ? 'workplace' : 'all');

let files;
let enumeratedVia;
if (!forceAll && isInsideGitWorkTree()) {
  try {
    // `git ls-files` reports tracked paths, including ones deleted in the working
    // tree but not yet staged — reading those would crash the whole run.
    files = listViaGit().filter((p) =>
      !isSkipped(p) && DOC_EXT.has(path.extname(p).toLowerCase()) && fs.existsSync(p));
    enumeratedVia = 'git';
  } catch {
    files = walk(ROOT);
    enumeratedVia = 'walk (git ls-files failed)';
  }
} else {
  files = walk(ROOT);
  enumeratedVia = forceAll ? 'walk (--all)' : 'walk (not a git work tree)';
}

const problems = [];

for (const file of files) {
  const relFile = path.relative(ROOT, file).replace(/\\/g, '/');
  const lines = stripCode(fs.readFileSync(file, 'utf8'));

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    for (const m of line.matchAll(/\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      let target = m[2].trim();
      if (!target || /^(https?:|mailto:|tel:|#!)/i.test(target)) continue;


      const [rawPath, rawAnchor] = target.split('#');
      const anchor = rawAnchor ? decodeURIComponent(rawAnchor).toLowerCase() : null;

      // Pure in-document anchor.
      if (!rawPath) {
        if (anchor && !anchorsOf(file).has(anchor)) {
          problems.push({ file: relFile, line: lineNo, link: m[2], kind: 'anchor', detail: `no heading "#${anchor}" in this document` });
        }
        continue;
      }

      const decoded = decodeURIComponent(rawPath);
      // Links are document-relative; many docs also write repo-root-relative
      // paths (".opencode/rules/x.md"), which render fine on GitLab/GitHub — accept both.
      const candidates = [path.resolve(path.dirname(file), decoded)];
      candidates.push(path.resolve(ROOT, decoded.replace(/^\.\//, '')));

      const resolved = candidates.find((c) => fs.existsSync(c));

      if (!resolved) {
        const shown = path.relative(ROOT, candidates[0]).replace(/\\/g, '/');
        // Classify against the *resolved* repo-relative path as well as the
        // authored string: `[idx](INDEX.md)` inside docs/ and
        // `[idx](../../docs/INDEX.md)` from a nested rule both denote the same
        // generated target, and only the resolved form matches the patterns.
        const bucket = isGenerated(decoded.replace(/^\.\//, '')) || isGenerated(shown)
          ? 'generated-target'
          : 'missing-file';
        problems.push({ file: relFile, line: lineNo, link: m[2], kind: bucket, detail: bucket === 'generated-target' ? `target is created during /initialize, absent from the template: ${decoded}` : `path does not exist: ${shown}` });
        continue;
      }
      if (anchor && DOC_EXT.has(path.extname(resolved).toLowerCase()) && fs.statSync(resolved).isFile()) {
        if (!anchorsOf(resolved).has(anchor)) {
          problems.push({ file: relFile, line: lineNo, link: m[2], kind: 'anchor', detail: `no heading "#${anchor}" in ${path.relative(ROOT, resolved).replace(/\\/g, '/')}` });
        }
      }
    }
  });
}

// Split by ownership first: only in-scope findings can block.
const inScope = (p) => {
  if (scope === 'all') return true;
  const owned = isWorkplaceDoc(p.file);
  return scope === 'workplace' ? owned : !owned;
};

const scoped = problems.filter(inScope);
const outOfScope = problems.filter((p) => !inScope(p));

const hardErrors = scoped.filter((p) => p.kind !== 'generated-target');
const generated = scoped.filter((p) => p.kind === 'generated-target');
// --strict escalates generated-target findings to real errors; the default-off
// posture avoids a noisy first run wherever an optional APM package/context
// skill is not installed and its guidelines.md/agent hasn't materialized yet.
const errors = strict ? [...hardErrors, ...generated] : hardErrors;

function report(title, items) {
  if (!items.length) return;
  const byFile = new Map();
  for (const p of items) {
    if (!byFile.has(p.file)) byFile.set(p.file, []);
    byFile.get(p.file).push(p);
  }
  console.log(`\n${title} — ${items.length} in ${byFile.size} file(s):\n`);
  for (const [f, list] of [...byFile].sort()) {
    console.log(f);
    for (const i of list) console.log(`  L${i.line}  [${i.kind}] ${i.link}\n         ${i.detail}`);
    console.log('');
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ errors: hardErrors, generated, outOfScope, scope, strict, projectMode, enumeratedVia, filesScanned: files.length }, null, 2));
} else {
  console.log(`Scanned ${files.length} documents (enumerated via: ${enumeratedVia}; scope: ${scope}).`);
  if (!hardErrors.length) console.log('OK - every internal link and anchor resolves in scope.');
  report('BROKEN REFERENCES', hardErrors);
  if (outOfScope.length && !process.argv.includes('--quiet')) {
    const label = scope === 'workplace'
      ? "NON-BLOCKING: findings in the project's own documents (outside the Workplace scope)"
      : 'NON-BLOCKING: findings in Workplace-owned documents (outside the selected scope)';
    report(label, outOfScope);
    console.log(`Re-run with --scope=all to treat these as errors.\n`);
  }
  if (projectMode) {
    // In an initialized project, a link to a "generated during /initialize"
    // target that still doesn't exist is more likely a real gap (a package
    // that was never installed, a guideline that was never rendered) than an
    // expected template-authoring artifact — surface it unconditionally.
    report('WARNING: links to files expected to exist in an initialized project but not found', generated);
  } else if (!process.argv.includes('--quiet')) {
    report('INFO: links to files generated during /initialize (expected in the template)', generated);
  }
}

process.exit(errors.length ? 1 : 0);
