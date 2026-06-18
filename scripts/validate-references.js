#!/usr/bin/env node
// Release-time auditor for skill/agent reference packs. Zero dependencies.
//
// What it does (deterministic, CI-safe):
//   - discovers every reference pack under skills/*/references/ (and agents/*/references/ if any),
//   - cross-checks each against scripts/reference-sources.json,
//   - flags packs that are UNTRACKED (not classified), NEVER-VALIDATED, STALE
//     (lastValidated older than stalenessDays), or whose manifest file is MISSING,
//   - prints a re-grounding worklist and exits non-zero when the release gate trips.
//
// What it does NOT do: semantically fact-check the prose. Re-grounding is a maintainer step —
// fetch each pack's `sources` with the fetching-salesforce-docs skill, update the pack, and bump
// `lastValidated`. This script tells you WHICH packs need that and against WHICH sources.
//
// Usage:  node scripts/validate-references.js [--strict] [--today=YYYY-MM-DD]
//   --strict  treat warnings (untracked / never-validated / no-sources) as failures too.

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const manifestPath = path.join(root, 'scripts', 'reference-sources.json');

// Discover reference packs: skills/<name>/references/*.md and agents/<name>/references/*.md.
// Returns repo-relative POSIX paths so they match the manifest keys on every OS.
function discoverReferenceFiles(repoRoot) {
  const found = [];
  for (const top of ['skills', 'agents']) {
    const topDir = path.join(repoRoot, top);
    if (!fs.existsSync(topDir)) continue;
    for (const entry of fs.readdirSync(topDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const refsDir = path.join(topDir, entry.name, 'references');
      if (!fs.existsSync(refsDir)) continue;
      for (const f of fs.readdirSync(refsDir)) {
        if (f.endsWith('.md')) found.push(`${top}/${entry.name}/references/${f}`);
      }
    }
  }
  return found.sort();
}

function daysBetween(a, b) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

// Pure classifier — returns { errors, warnings, ok } given the manifest, the discovered files,
// and "today". Kept side-effect-free so it can be unit-tested.
function classify(manifest, files, today) {
  const errors = [];
  const warnings = [];
  const ok = [];
  const tracked = manifest.references || {};
  const staleDays = typeof manifest.stalenessDays === 'number' ? manifest.stalenessDays : 180;
  const fileSet = new Set(files);

  // Manifest entries whose file no longer exists.
  for (const key of Object.keys(tracked)) {
    if (!fileSet.has(key)) errors.push(`MISSING FILE: manifest tracks ${key} but it does not exist`);
  }

  for (const file of files) {
    const entry = tracked[file];
    if (!entry) {
      warnings.push(`UNTRACKED: ${file} — classify it in scripts/reference-sources.json (salesforce-docs | expertise)`);
      continue;
    }
    if (entry.basis === 'expertise') {
      ok.push(`${file} (expertise — no doc source tracked)`);
      continue;
    }
    if (entry.basis !== 'salesforce-docs') {
      errors.push(`BAD BASIS: ${file} — "basis" must be "salesforce-docs" or "expertise"`);
      continue;
    }
    const sources = Array.isArray(entry.sources) ? entry.sources : [];
    if (sources.length === 0) {
      warnings.push(`NO SOURCES: ${file} — add the official doc URLs it should be grounded against`);
    }
    if (!entry.lastValidated) {
      warnings.push(`NEVER VALIDATED: ${file} — re-ground against ${sourceList(sources)} then set lastValidated`);
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.lastValidated)) {
      errors.push(`BAD DATE: ${file} — lastValidated "${entry.lastValidated}" is not YYYY-MM-DD`);
      continue;
    }
    const when = new Date(entry.lastValidated + 'T00:00:00Z');
    if (Number.isNaN(when.getTime())) {
      errors.push(`BAD DATE: ${file} — lastValidated "${entry.lastValidated}" is not a real date`);
      continue;
    }
    const age = daysBetween(today, when);
    if (age > staleDays) {
      errors.push(`STALE (${age}d > ${staleDays}d): ${file} — re-ground against ${sourceList(sources)} then bump lastValidated`);
    } else {
      ok.push(`${file} (validated ${entry.lastValidated}, ${age}d ago)`);
    }
  }
  return { errors, warnings, ok };
}

function sourceList(sources) {
  return sources.length ? sources.map((s) => s.url).join(', ') : '(no sources listed)';
}

function loadManifest(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function main() {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const todayArg = (args.find((a) => a.startsWith('--today=')) || '').split('=')[1];
  const today = todayArg ? new Date(todayArg) : new Date();

  const manifest = loadManifest(manifestPath);
  const files = discoverReferenceFiles(root);
  const { errors, warnings, ok } = classify(manifest, files, today);

  for (const line of ok) console.log('  ok    ' + line);
  for (const line of warnings) console.log('  warn  ' + line);
  for (const line of errors) console.log('  FAIL  ' + line);

  console.log(
    `\nreference packs: ${files.length} | ok: ${ok.length} | warnings: ${warnings.length} | failures: ${errors.length}`
  );

  const failing = errors.length > 0 || (strict && warnings.length > 0);
  if (failing) {
    console.error(
      '\nRelease gate: re-ground the flagged packs with the fetching-salesforce-docs skill, ' +
        'update them, and bump lastValidated in scripts/reference-sources.json.'
    );
    process.exit(1);
  }
  console.log('\nAll tracked reference packs are current.');
}

if (require.main === module) main();

module.exports = { discoverReferenceFiles, classify, loadManifest, manifestPath };
