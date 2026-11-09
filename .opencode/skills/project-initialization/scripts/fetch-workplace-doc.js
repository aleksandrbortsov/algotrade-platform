#!/usr/bin/env node
/**
 * Workplace documentation resolver for the AI Workplace template.
 *
 * The Workplace's own user-facing guides live under `docs/**` in the TEMPLATE
 * repository. They are `"optional": true` in `coreFiles`, `/initialize` never
 * writes them, and `/update-workplace` refreshes `docs/core/` only when the
 * project already has it — so in most initialized projects they are simply not
 * on disk. This script implements the resolution ladder documented in
 * `references/workplace-docs.md` section 2 so an agent never has to guess:
 *
 *   Tier 0  local workspace        <root>/docs/<path>
 *   Tier 1  local template clone   <root>/.opencode/.temp-update/docs/<path>
 *   Tier 2  HTTPS raw              {base}/-/raw/{branch}/docs/<path>
 *   Tier 3  authenticated git      shallow sparse clone (opt-in: --allow-clone)
 *   Tier 4  unresolved             print the BLOB URL and exit 3
 *
 * git.{bas_company}.com is a PRIVATE GitLab: an unauthenticated raw request
 * usually returns a sign-in page rather than the document. HTML, a redirect to
 * a sign-in URL, 401 or 403 are therefore treated as an auth wall — a reason to
 * escalate to Tier 3, never as "the document does not exist" and never as a
 * reason to retry.
 *
 * Usage:
 *   node .opencode/skills/project-initialization/scripts/fetch-workplace-doc.js <doc-path> [options]
 *
 *   <doc-path>        "core/ROLES.md", "docs/core/ROLES.md" and "ROLES.md" all resolve
 *   --url-only        print the RAW and BLOB URLs and exit; no local read, no network
 *   --anchor=<slug>   append #<slug> to the printed BLOB URL
 *   --json            machine-readable result object
 *   --out=<file>      write the resolved content to <file> instead of stdout
 *   --allow-clone     permit Tier 3 (creates and then removes .opencode/.tmp-docs-clone/)
 *   --no-network      Tiers 0-1 only
 *   --list            print the document map (add --json for JSON)
 *   --timeout=<ms>    per-request timeout, default 15000
 *
 * Exit: 0 = resolved, 2 = bad usage, 3 = unresolved (URLs printed; Tier 4 applies).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../../..');
const CORE_VERSION_PATH = path.join(ROOT, '.opencode', 'rules', '.core-version.json');
const TEMPLATE_CLONE = path.join(ROOT, '.opencode', '.temp-update');
const TMP_CLONE = path.join(ROOT, '.opencode', '.tmp-docs-clone');

const FALLBACK_BASE = 'https://{insert correct url}';
const FALLBACK_BRANCH = 'master';
const MAX_REDIRECTS = 5;

/**
 * The document map. Kept in sync with `references/workplace-docs.md` section 6 —
 * that file is the human-readable source of truth; this array exists so the
 * script can resolve a bare filename and answer `--list`.
 */
const DOC_MAP = [
  { path: 'GETTING_STARTED.md', answers: 'Quick start: OpenCode pre-configuration, /initialize vs /quick-init, verification checklist' },
  { path: 'ARCHITECTURE.md', answers: 'What the Workplace is: file structure, core concepts, key components, design principles' },
  { path: 'PRESENTATION.md', answers: 'Executive pitch: problem/solution, before-after evidence, business value, FAQ' },
  { path: 'core/INITIALIZATION.md', answers: 'Canonical user-facing spec of /initialize and /quick-init' },
  { path: 'core/ROLES.md', answers: 'The 9 roles, MCP server mapping, command mapping, changing roles later' },
  { path: 'core/APM_PACKAGES.md', answers: 'User-facing APM guide: types, catalogue, install, marketplace/SSL, troubleshooting, authoring' },
  { path: 'core/CUSTOMIZATION.md', answers: 'The three project-adaptation channels and what survives an update' },
  { path: 'core/DEVELOPMENT_WORKFLOW.md', answers: 'Daily practice: session patterns, context management, team collaboration' },
  { path: 'core/TDD_WORKFLOW.md', answers: 'Full TDD guide: when to use, RED-GREEN-REFACTOR, commands, TaskMaster, frameworks' },
  { path: 'core/MIGRATION_BACKUP.md', answers: 'User-facing /update-workplace guide: 3-step update, backups, rollback, migrations' },
  { path: 'core/AGENT_CONTEXT_AND_DOCS_SYNC.md', answers: 'Spec of the docs-sync plugin and the link validator' },
  { path: 'core/HOW_WORKPLACE_IMPROVES_AGENTS.html', answers: 'HTML explainer: agent quality, context, accuracy, token economics' },
];

// ---------------------------------------------------------------- arguments

function parseArgs(argv) {
  const opts = {
    doc: null, anchor: null, out: null, timeout: 15000,
    urlOnly: false, json: false, allowClone: false, network: true, list: false,
  };
  for (const arg of argv) {
    if (arg === '--url-only') opts.urlOnly = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--allow-clone') opts.allowClone = true;
    else if (arg === '--no-network') opts.network = false;
    else if (arg === '--list') opts.list = true;
    else if (arg.startsWith('--anchor=')) opts.anchor = arg.slice(9).replace(/^#/, '');
    else if (arg.startsWith('--out=')) opts.out = arg.slice(6);
    else if (arg.startsWith('--timeout=')) opts.timeout = Number(arg.slice(10)) || 15000;
    else if (arg.startsWith('--')) return { error: 'Unknown option "' + arg + '".' };
    else if (opts.doc === null) opts.doc = arg;
    else return { error: 'Unexpected extra argument "' + arg + '".' };
  }
  return opts;
}

// ------------------------------------------------------------ template source

function readTemplateSource() {
  const fallback = { base: FALLBACK_BASE, branch: FALLBACK_BRANCH, version: null, from: 'fallback' };
  try {
    const raw = fs.readFileSync(CORE_VERSION_PATH, 'utf-8').replace(/^﻿/, '');
    const json = JSON.parse(raw);
    const src = json.templateSource || {};
    if (!src.url) return Object.assign({}, fallback, { version: json.version || null });
    return {
      base: String(src.url).replace(/\.git$/, '').replace(/\/+$/, ''),
      branch: src.branch || FALLBACK_BRANCH,
      version: json.version || null,
      from: '.core-version.json',
    };
  } catch (err) {
    return fallback;
  }
}

/** "ROLES.md" | "core/ROLES.md" | "docs/core/ROLES.md" -> "core/ROLES.md" */
function normalizeDocPath(input) {
  let p = String(input).trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
  p = p.replace(/^docs\//i, '');
  const exact = DOC_MAP.find((d) => d.path.toLowerCase() === p.toLowerCase());
  if (exact) return exact.path;
  // Bare filename: resolve against the map, e.g. "ROLES.md" -> "core/ROLES.md".
  if (!p.includes('/')) {
    const hit = DOC_MAP.find((d) => path.posix.basename(d.path).toLowerCase() === p.toLowerCase());
    if (hit) return hit.path;
  }
  return p; // unknown but well-formed — still resolvable; the map is not a whitelist
}

const rawUrlFor = (src, docPath) => src.base + '/-/raw/' + src.branch + '/docs/' + docPath;
const blobUrlFor = (src, docPath, anchor) =>
  src.base + '/-/blob/' + src.branch + '/docs/' + docPath + (anchor ? '#' + anchor : '');

// -------------------------------------------------------------------- tiers

function readIfExists(file) {
  try {
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return fs.readFileSync(file, 'utf-8');
  } catch (err) { /* unreadable — fall through to the next tier */ }
  return null;
}

/** Follows redirects. Resolves to {status, contentType, body, finalUrl} — never rejects on HTTP status. */
function httpGet(url, timeout, redirectsLeft) {
  if (redirectsLeft === undefined) redirectsLeft = MAX_REDIRECTS;
  return new Promise((resolve, reject) => {
    const client = url.indexOf('http://') === 0 ? http : https;
    const headers = { 'User-Agent': 'ai-workplace-fetch-doc', Accept: 'text/plain, text/markdown, */*' };
    const req = client.get(url, { headers: headers }, (res) => {
      const status = res.statusCode || 0;
      const location = res.headers.location;
      if (status >= 300 && status < 400 && location && redirectsLeft > 0) {
        res.resume();
        return resolve(httpGet(new URL(location, url).toString(), timeout, redirectsLeft - 1));
      }
      let body = '';
      res.setEncoding('utf-8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({
        status: status,
        body: body,
        finalUrl: url,
        contentType: String(res.headers['content-type'] || ''),
      }));
    });
    req.setTimeout(timeout, () => { req.destroy(new Error('timed out after ' + timeout + ' ms')); });
    req.on('error', reject);
  });
}

/**
 * A private GitLab answers an unauthenticated raw request with a sign-in page,
 * not with the file. That is an auth wall — escalate, do not retry, and never
 * report it as "document not found".
 */
function authWallReason(res) {
  if (res.status === 401 || res.status === 403) return 'HTTP ' + res.status;
  if (/\/users\/sign_in/i.test(res.finalUrl)) return 'redirected to a sign-in page';
  if (/text\/html/i.test(res.contentType)) return 'server returned HTML instead of the raw document';
  return null;
}

function rmrf(target) {
  try { fs.rmSync(target, { recursive: true, force: true }); } catch (err) { /* best effort */ }
}

/** Tier 3: shallow sparse clone with the user's own git credentials. */
function fetchViaGit(src, docPath) {
  // stdio is piped, never inherited: git writes ordinary progress to stderr and
  // success is judged by the exit code alone (execFileSync throws on non-zero).
  const git = (args) => execFileSync('git', args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf-8' });
  rmrf(TMP_CLONE);
  try {
    const url = /\.git$/.test(src.base) ? src.base : src.base + '.git';
    git(['clone', '--depth', '1', '--filter=blob:none', '--sparse', '--branch', src.branch, url, TMP_CLONE]);
    git(['-C', TMP_CLONE, 'sparse-checkout', 'set', 'docs']);
    const content = readIfExists(path.join(TMP_CLONE, 'docs', docPath));
    if (content === null) throw new Error('clone succeeded but docs/' + docPath + ' is not in it');
    return { content: content, error: null };
  } catch (err) {
    return { content: null, error: String(err.message || err).split('\n')[0] };
  } finally {
    rmrf(TMP_CLONE);
  }
}

// --------------------------------------------------------------------- main

function printList(json) {
  const src = readTemplateSource();
  if (json) {
    process.stdout.write(JSON.stringify({
      base: src.base,
      branch: src.branch,
      version: src.version,
      documents: DOC_MAP.map((d) => ({
        path: d.path, answers: d.answers,
        rawUrl: rawUrlFor(src, d.path), blobUrl: blobUrlFor(src, d.path),
      })),
    }, null, 2) + '\n');
    return;
  }
  console.log('AI Workplace documents — ' + src.base + ' @ ' + src.branch + '\n');
  DOC_MAP.forEach((d) => { console.log('  docs/' + d.path + '\n      ' + d.answers); });
  console.log('\nFull map (when to read each, key anchors):');
  console.log('  .opencode/skills/project-initialization/references/workplace-docs.md');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.error) {
    console.error(opts.error);
    console.error('Options are documented in the header of this file.');
    process.exit(2);
  }
  if (opts.list) { printList(opts.json); process.exit(0); }
  if (!opts.doc) {
    console.error('Usage: node fetch-workplace-doc.js <doc-path> [--url-only] [--anchor=<slug>] [--json]');
    console.error('                                             [--out=<file>] [--allow-clone] [--no-network] [--list]');
    console.error('Example: node fetch-workplace-doc.js core/ROLES.md --url-only');
    process.exit(2);
  }

  const src = readTemplateSource();
  const docPath = normalizeDocPath(opts.doc);
  const rawUrl = rawUrlFor(src, docPath);
  const blobUrl = blobUrlFor(src, docPath, opts.anchor);
  const result = {
    ok: false, source: null, path: 'docs/' + docPath,
    rawUrl: rawUrl, blobUrl: blobUrl, bytes: 0, reason: null, versionNote: null,
  };
  if (src.version) {
    result.versionNote = 'Project template version ' + src.version + '; fetched content describes branch "' +
      src.branch + '" (tip). State any mismatch before quoting a procedure.';
  }

  if (opts.urlOnly) {
    if (opts.json) {
      process.stdout.write(JSON.stringify(Object.assign({}, result, { ok: true, source: 'url-only' }), null, 2) + '\n');
    } else {
      console.log('RAW   ' + rawUrl);
      console.log('BLOB  ' + blobUrl);
    }
    process.exit(0);
  }

  let content = null;
  const notes = [];

  // Tier 0 — local workspace.
  content = readIfExists(path.join(ROOT, 'docs', docPath));
  if (content !== null) result.source = 'local';

  // Tier 1 — the template clone /update-workplace leaves behind.
  if (content === null) {
    content = readIfExists(path.join(TEMPLATE_CLONE, 'docs', docPath));
    if (content !== null) result.source = 'template-clone';
  }

  // Tier 2 — HTTPS raw.
  if (content === null && opts.network) {
    try {
      const res = await httpGet(rawUrl, opts.timeout);
      const wall = authWallReason(res);
      if (wall) {
        notes.push('HTTPS raw: ' + wall + ' — private GitLab, an unauthenticated fetch has no credentials.');
      } else if (res.status === 200) {
        content = res.body;
        result.source = 'https-raw';
      } else if (res.status === 404) {
        notes.push('HTTPS raw: HTTP 404 — docs/' + docPath + ' does not exist on branch "' + src.branch + '".');
      } else {
        notes.push('HTTPS raw: HTTP ' + res.status + '.');
      }
    } catch (err) {
      notes.push('HTTPS raw: ' + String(err.message || err) + '.');
    }
  } else if (content === null && !opts.network) {
    notes.push('Network tiers skipped (--no-network).');
  }

  // Tier 3 — authenticated git, opt-in because it writes to disk.
  if (content === null && opts.network && opts.allowClone) {
    const cloned = fetchViaGit(src, docPath);
    if (cloned.content !== null) { content = cloned.content; result.source = 'git-clone'; }
    else notes.push('Authenticated git: ' + cloned.error + '.');
  } else if (content === null && opts.network && !opts.allowClone) {
    notes.push('Authenticated git not attempted — re-run with --allow-clone (it writes .opencode/.tmp-docs-clone/).');
  }

  // Tier 4 — unresolved. Print the URLs and the honest-degradation instruction.
  if (content === null) {
    result.reason = notes.join(' ');
    if (opts.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    } else {
      console.error('Could not resolve docs/' + docPath + '.');
      notes.forEach((n) => { console.error('  - ' + n); });
      console.error('');
      console.error('Open it manually:  ' + blobUrl);
      console.error('Answer from the .opencode/ references instead and say that is what you did.');
      console.error('Do NOT invent this document’s content. Inside /initialize, log an Open Gap.');
    }
    process.exit(3);
  }

  result.ok = true;
  result.bytes = Buffer.byteLength(content, 'utf-8');

  if (opts.out) {
    const outPath = path.resolve(ROOT, opts.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, content, 'utf-8');
  }

  if (opts.json) {
    const payload = opts.out
      ? Object.assign({}, result, { out: opts.out })
      : Object.assign({}, result, { content: content });
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  } else if (opts.out) {
    console.log('Resolved docs/' + docPath + ' via ' + result.source + ' (' + result.bytes + ' bytes) -> ' + opts.out);
  } else {
    process.stdout.write(content);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('fetch-workplace-doc: ' + String((err && err.message) || err));
  process.exit(3);
});
