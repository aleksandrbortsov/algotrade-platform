#!/usr/bin/env node
/**
 * apm-install-preserving.js — run `apm install` / `apm update` for an NC AI Workplace project
 * (OpenCode line) without losing what initialization wrote into the deployed package skills.
 *
 * Why: on the APM `opencode` target, package skills are deployed to `.agents/skills/<name>/`, and
 * every `apm install` / `apm update` redeploys the package copy of `project-config.json`
 * (`initialized: false`) over the one Phase 6 filled in (verified on APM 0.28.0). The rendered
 * `references/guidelines.md` survives only because packages never ship it. This wrapper snapshots
 * both files for every package skill before the install and restores the initialized ones
 * afterwards, logging each as `preserved:`.
 *
 * It also enforces two facts of the opencode target:
 *   - `apm.yml` must declare `targets: [opencode]` (target auto-detection is overridden by a
 *     user-level `apm config set target ...`, and a wrong target deploys into another harness's
 *     directories);
 *   - a package whose own manifest pins another target is skipped by APM entirely, yet its
 *     `.apm/instructions` still get compiled into AGENTS.md — every such package is reported so
 *     Phase 1.7-APM can record an Open Gap and remove it from `apm.yml` before `apm compile`.
 *
 * Usage:
 *   node .opencode/skills/project-initialization/scripts/apm-install-preserving.js [apm args...]
 *     (no args)            runs `apm install`
 *     --update [name]      runs `apm update [name]` (interactive plan + consent, as upstream)
 *     --frozen, --dry-run, --verbose, ...   passed through to `apm install`
 *     --no-targets-check   skip the apm.yml `targets:` gate
 *     --root <dir>         project directory (default: cwd)
 *     --json               machine-readable summary on stdout after apm's own output
 * Exit: apm's exit code; 2 when apm.yml lacks `targets: [opencode]` (unless --no-targets-check)
 *       or when `apm` cannot be started.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PRESERVED = ['project-config.json', path.join('references', 'guidelines.md')];
const SKIP_RE = /Package targets \[([^\]]*)\] do not overlap authorized active targets; skipping/;
const PKG_RE = /\[!\]\s*\[([^\]]+)\]\s*$/;

function parseArgs(argv) {
  const o = { root: process.cwd(), json: false, targetsCheck: true, update: false, apmArgs: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') o.root = path.resolve(argv[++i]);
    else if (a === '--json') o.json = true;
    else if (a === '--no-targets-check') o.targetsCheck = false;
    else if (a === '--update') o.update = true;
    else o.apmArgs.push(a);
  }
  return o;
}

function readText(file) {
  try { return fs.readFileSync(file, 'utf8').replace(/^﻿/, ''); } catch { return null; }
}

function manifestTargets(root) {
  const text = readText(path.join(root, 'apm.yml'));
  if (text === null) return { present: false, targets: [] };
  const m = text.match(/^targets:\s*(\[[^\]]*\])?\s*$([\s\S]*?)(?=^\S|\s*$(?![\r\n]))/m);
  if (!m) return { present: true, targets: [] };
  const targets = [];
  if (m[1]) for (const t of m[1].slice(1, -1).split(',')) if (t.trim()) targets.push(t.trim().replace(/^["']|["']$/g, ''));
  for (const line of (m[2] || '').split(/\r?\n/)) {
    const lm = line.match(/^\s*-\s*["']?([A-Za-z0-9_-]+)["']?\s*$/);
    if (lm) targets.push(lm[1]);
  }
  return { present: true, targets };
}

function packageSkillDirs(root) {
  const base = path.join(root, '.agents', 'skills');
  try {
    return fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(base, d.name));
  } catch { return []; }
}

function snapshot(root) {
  const snap = new Map(); // absolute path -> content
  for (const dir of packageSkillDirs(root)) {
    for (const rel of PRESERVED) {
      const file = path.join(dir, rel);
      const text = readText(file);
      if (text === null) continue;
      if (rel === 'project-config.json') {
        let initialized = false;
        try { initialized = JSON.parse(text).initialized === true; } catch { initialized = false; }
        if (!initialized) continue; // a pristine package copy — nothing initialization owns
      }
      snap.set(file, text);
    }
  }
  return snap;
}

function restore(snap, root) {
  const preserved = [];
  for (const [file, text] of snap) {
    const now = readText(file);
    if (now === text) continue;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    preserved.push(path.relative(root, file).split(path.sep).join('/'));
  }
  return preserved;
}

function runApm(args, root) {
  const cmd = process.platform === 'win32' ? 'apm.exe' : 'apm';
  const res = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'], shell: false, maxBuffer: 1 << 26 });
  if (res.error && res.error.code === 'ENOENT' && process.platform === 'win32') {
    // apm may be installed as apm.cmd / apm.bat — fall back to the shell resolution
    return spawnSync('apm', args, { cwd: root, encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'], shell: true, maxBuffer: 1 << 26 });
  }
  return res;
}

function main() {
  const opt = parseArgs(process.argv.slice(2));
  const root = opt.root;
  const summary = { root, command: null, exitCode: null, preserved: [], skippedPackages: [], targets: [] };

  const tm = manifestTargets(root);
  summary.targets = tm.targets;
  if (opt.targetsCheck) {
    if (!tm.present) { process.stderr.write(`[apm-install-preserving] apm.yml not found in ${root} — nothing to install.\n`); process.exit(2); }
    if (!tm.targets.includes('opencode')) {
      process.stderr.write('[apm-install-preserving] apm.yml does not declare `targets:` containing `opencode`. Add\n\n  targets:\n    - opencode\n\nat the top level of apm.yml (Phase 1.7-APM Step 4) so APM deploys into .opencode/ and .agents/skills/ regardless of machine defaults. Use --no-targets-check to bypass.\n');
      process.exit(2);
    }
  }

  const args = opt.update ? ['update', ...opt.apmArgs] : ['install', ...opt.apmArgs];
  summary.command = 'apm ' + args.join(' ');
  const snap = snapshot(root);
  process.stderr.write(`[apm-install-preserving] ${summary.command} (snapshotting ${snap.size} initialization-owned file(s) under .agents/skills/)\n`);

  const res = runApm(args, root);
  if (res.error) {
    process.stderr.write(`[apm-install-preserving] cannot start apm: ${res.error.message}\n`);
    process.exit(2);
  }
  const out = (res.stdout || '') + (res.stderr || '');
  process.stdout.write(res.stdout || '');
  process.stderr.write(res.stderr || '');
  summary.exitCode = res.status === null ? 1 : res.status;

  // Detect packages APM refused because their manifest pins another harness.
  const lines = out.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = SKIP_RE.exec(lines[i]);
    if (!m) continue;
    let pkg = null;
    for (let j = i; j >= Math.max(0, i - 3) && !pkg; j--) {
      const pm = PKG_RE.exec(lines[j]) || /\[([^\]\s]+\/[^\]\s]+)\]/.exec(lines[j]);
      if (pm) pkg = pm[1].split('/').pop();
    }
    summary.skippedPackages.push({ package: pkg || '(unknown)', targets: m[1] });
  }

  if (!opt.apmArgs.includes('--dry-run')) summary.preserved = restore(snap, root);

  for (const p of summary.preserved) process.stderr.write(`[apm-install-preserving] preserved: ${p} (initialization output restored after apm redeployed the package copy)\n`);
  for (const s of summary.skippedPackages) process.stderr.write(`[apm-install-preserving] WARN incompatible-target: ${s.package} (targets [${s.targets}]) was skipped by APM — its primitives are NOT installed; record an Open Gap and remove it from apm.yml before running apm compile, or its instructions still land in AGENTS.md.\n`);
  process.stderr.write(`[apm-install-preserving] done: apm exit ${summary.exitCode}, preserved ${summary.preserved.length}, skipped-by-target ${summary.skippedPackages.length}\n`);
  if (opt.json) process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  process.exit(summary.exitCode);
}

main();
