'use strict';

// Release-validation tests for the reference-pack source manifest and its auditor — run on every
// PR via `npm test`. These assert STRUCTURAL consistency only (manifest shape, files exist,
// classifier logic on fixtures). The date-based staleness gate lives in the CLI
// (`npm run validate:refs`) and is intentionally NOT asserted here, so the suite can't time-bomb
// in CI as packs naturally age.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { discoverReferenceFiles, classify, loadManifest, manifestPath } = require('../scripts/validate-references.js');

const root = path.join(__dirname, '..');
const manifest = loadManifest(manifestPath);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// --- manifest shape -----------------------------------------------------------------------------

test('manifest parses and declares a positive stalenessDays', () => {
  assert.equal(typeof manifest.stalenessDays, 'number');
  assert.ok(manifest.stalenessDays > 0, 'stalenessDays must be positive');
  assert.equal(typeof manifest.references, 'object');
});

test('every manifest entry is well-formed and its file exists', () => {
  for (const [key, entry] of Object.entries(manifest.references)) {
    assert.ok(
      ['salesforce-docs', 'expertise'].includes(entry.basis),
      key + ': basis must be "salesforce-docs" or "expertise"'
    );
    assert.ok(fs.existsSync(path.join(root, key)), key + ': manifest tracks a file that does not exist');

    if (entry.basis === 'salesforce-docs') {
      assert.ok(Array.isArray(entry.sources), key + ': salesforce-docs entry needs a sources array');
      for (const s of entry.sources) {
        assert.ok(typeof s.url === 'string' && s.url.startsWith('http'), key + ': each source needs a url');
        assert.ok(Array.isArray(s.anchors), key + ': each source needs an anchors array');
      }
      assert.ok(
        entry.lastValidated === null || DATE_RE.test(entry.lastValidated),
        key + ': lastValidated must be null or YYYY-MM-DD'
      );
    }
  }
});

// --- discovery ----------------------------------------------------------------------------------

test('discovery finds the sf-plan decision packs', () => {
  const files = discoverReferenceFiles(root);
  for (const f of [
    'skills/sf-plan/references/automation-decision.md',
    'skills/sf-plan/references/ui-decision.md',
    'skills/sf-plan/references/data-model-decision.md',
  ]) {
    assert.ok(files.includes(f), 'expected discovery to include ' + f);
  }
});

// --- classifier logic (fixtures, fixed clock — never time-bombs) --------------------------------

test('classify flags stale, untracked, missing, never-validated, and passes fresh/expertise', () => {
  const today = new Date('2026-06-17');
  const m = {
    stalenessDays: 180,
    references: {
      'skills/a/references/fresh.md': { basis: 'salesforce-docs', lastValidated: '2026-06-01', sources: [{ url: 'https://x', anchors: ['y'] }] },
      'skills/a/references/stale.md': { basis: 'salesforce-docs', lastValidated: '2025-01-01', sources: [{ url: 'https://x', anchors: ['y'] }] },
      'skills/a/references/new.md': { basis: 'salesforce-docs', lastValidated: null, sources: [{ url: 'https://x', anchors: ['y'] }] },
      'skills/a/references/rules.md': { basis: 'expertise' },
      'skills/a/references/gone.md': { basis: 'expertise' },
    },
  };
  const files = [
    'skills/a/references/fresh.md',
    'skills/a/references/stale.md',
    'skills/a/references/new.md',
    'skills/a/references/rules.md',
    'skills/a/references/untracked.md',
  ];
  const { errors, warnings, ok } = classify(m, files, today);

  assert.ok(errors.some((e) => e.includes('STALE') && e.includes('stale.md')), 'stale pack should error');
  assert.ok(errors.some((e) => e.includes('MISSING FILE') && e.includes('gone.md')), 'missing file should error');
  assert.ok(warnings.some((w) => w.includes('UNTRACKED') && w.includes('untracked.md')), 'untracked should warn');
  assert.ok(warnings.some((w) => w.includes('NEVER VALIDATED') && w.includes('new.md')), 'null date should warn');
  assert.ok(ok.some((o) => o.includes('fresh.md')), 'fresh pack should pass');
  assert.ok(ok.some((o) => o.includes('rules.md')), 'expertise pack should pass');
});

test('classify rejects a malformed lastValidated date', () => {
  const { errors } = classify(
    { stalenessDays: 180, references: { 'skills/a/references/b.md': { basis: 'salesforce-docs', lastValidated: 'June 2026', sources: [] } } },
    ['skills/a/references/b.md'],
    new Date('2026-06-17')
  );
  assert.ok(errors.some((e) => e.includes('BAD DATE')), 'a non-ISO date should error');
});
