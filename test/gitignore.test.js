'use strict';

// Tests for the installer's .gitignore behavior — run on every release via `npm test`.
// Zero dependencies: Node's built-in test runner + assert. The contract under test:
//   1. We ignore ONLY the exact skill/agent paths a run installs, never a whole dir.
//   2. The change is strictly additive — existing entries are never touched.
//   3. The baseline file (CLAUDE.md / AGENTS.md / copilot-instructions.md) is never ignored.
//   4. It is idempotent and respects what the user already ignores.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  assistants,
  gitignoreEntriesFor,
  planGitignore,
  updateGitignore,
  GITIGNORE_HEADER,
} = require('../scripts/install.js');

const claude = assistants.find((a) => a.name === 'Claude Code');
const codex = assistants.find((a) => a.name === 'Codex');
const copilot = assistants.find((a) => a.name === 'GitHub Copilot');

const baselineFiles = assistants.map((a) => a.baseline);

// --- gitignoreEntriesFor: scoping ------------------------------------------------------

test('ignores only the specific installed skill path, not the whole assistant dir', () => {
  const entries = gitignoreEntriesFor(claude, ['deploying-sf-metadata'], []);
  assert.deepEqual(entries, ['.claude/skills/deploying-sf-metadata/']);
  // crucially NOT the broad directory
  assert.ok(!entries.includes('.claude/'));
  assert.ok(!entries.includes('.claude/skills/'));
});

test('one entry per installed skill and agent, forward-slashed', () => {
  const entries = gitignoreEntriesFor(
    claude,
    ['reviewing-apex', 'reviewing-lwc'],
    ['salesforce-developer', 'architect']
  );
  assert.deepEqual(entries, [
    '.claude/skills/reviewing-apex/',
    '.claude/skills/reviewing-lwc/',
    '.claude/agents/salesforce-developer.md',
    '.claude/agents/architect.md',
  ]);
  for (const e of entries) assert.ok(!e.includes('\\'), 'entry must use forward slashes: ' + e);
});

test('scopes correctly for every assistant', () => {
  assert.deepEqual(gitignoreEntriesFor(codex, ['querying-soql'], ['architect']), [
    '.agents/skills/querying-soql/',
    '.agents/agents/architect.md',
  ]);
  assert.deepEqual(gitignoreEntriesFor(copilot, ['querying-soql'], []), [
    '.github/skills/querying-soql/',
  ]);
});

test('the baseline file is never among the ignore entries', () => {
  for (const a of assistants) {
    const entries = gitignoreEntriesFor(a, ['generating-apex'], ['salesforce-developer']);
    for (const e of entries) {
      assert.ok(
        !baselineFiles.some((b) => e === b || e.replace(/\/$/, '') === b),
        a.name + ' must not ignore its baseline file: ' + e
      );
    }
  }
});

test('installing nothing yields no entries', () => {
  assert.deepEqual(gitignoreEntriesFor(claude, [], []), []);
});

// --- planGitignore: additive, idempotent, coverage-aware -------------------------------

test('creates the block with a header when .gitignore is empty', () => {
  const entries = gitignoreEntriesFor(claude, ['deploying-sf-metadata'], []);
  const { content, added } = planGitignore('', entries);
  assert.deepEqual(added, entries);
  assert.equal(content, GITIGNORE_HEADER + '\n.claude/skills/deploying-sf-metadata/\n');
});

test('appends to an existing .gitignore without modifying prior lines', () => {
  const existing = 'node_modules/\n.env\n*.log\n';
  const entries = gitignoreEntriesFor(claude, ['reviewing-apex'], []);
  const { content, added } = planGitignore(existing, entries);
  assert.deepEqual(added, entries);
  // the user's original lines are still there, untouched and in order, at the top
  assert.ok(content.startsWith(existing));
  assert.ok(content.includes(GITIGNORE_HEADER));
  assert.ok(content.includes('.claude/skills/reviewing-apex/'));
});

test('is idempotent — a second identical run adds nothing', () => {
  const entries = gitignoreEntriesFor(claude, ['reviewing-apex', 'reviewing-lwc'], ['architect']);
  const first = planGitignore('node_modules/\n', entries);
  const second = planGitignore(first.content, entries);
  assert.deepEqual(second.added, []);
  assert.equal(second.content, first.content);
});

test('a later run adds only the newly installed skill', () => {
  const first = planGitignore('', gitignoreEntriesFor(claude, ['reviewing-apex'], []));
  const second = planGitignore(
    first.content,
    gitignoreEntriesFor(claude, ['reviewing-apex', 'reviewing-lwc'], [])
  );
  assert.deepEqual(second.added, ['.claude/skills/reviewing-lwc/']);
});

test('respects a broad dir the user already ignores (ancestor coverage)', () => {
  // user already ignores the whole .claude/ — we must not re-add anything beneath it
  const { added, content } = planGitignore(
    '.claude/\n',
    gitignoreEntriesFor(claude, ['deploying-sf-metadata'], ['architect'])
  );
  assert.deepEqual(added, []);
  assert.equal(content, '.claude/\n');
});

test('treats slash variants of an existing entry as already present', () => {
  const { added } = planGitignore(
    '/.claude/skills/reviewing-apex/\n',
    ['.claude/skills/reviewing-apex/']
  );
  assert.deepEqual(added, []);
});

test('never duplicates within a single batch', () => {
  const { added } = planGitignore('', [
    '.claude/skills/reviewing-apex/',
    '.claude/skills/reviewing-apex/',
  ]);
  assert.deepEqual(added, ['.claude/skills/reviewing-apex/']);
});

// --- updateGitignore: end-to-end against a real temp file ------------------------------

test('updateGitignore writes the scoped entries to a real .gitignore', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfad-gi-'));
  try {
    const entries = gitignoreEntriesFor(claude, ['deploying-sf-metadata'], ['salesforce-developer']);
    updateGitignore(entries, dir);
    const gi = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');
    assert.ok(gi.includes('.claude/skills/deploying-sf-metadata/'));
    assert.ok(gi.includes('.claude/agents/salesforce-developer.md'));
    assert.ok(!/^\.claude\/\s*$/m.test(gi), 'must not ignore the whole .claude/ dir');
    for (const b of baselineFiles) {
      assert.ok(!new RegExp('^' + b.replace(/[.\\]/g, '\\$&') + '\\s*$', 'm').test(gi));
    }

    // re-run is a no-op on disk
    const before = gi;
    updateGitignore(entries, dir);
    assert.equal(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8'), before);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('updateGitignore preserves a pre-existing .gitignore', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfad-gi-'));
  try {
    const original = 'node_modules/\nbuild/\n';
    fs.writeFileSync(path.join(dir, '.gitignore'), original, 'utf8');
    updateGitignore(gitignoreEntriesFor(claude, ['reviewing-apex'], []), dir);
    const gi = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');
    assert.ok(gi.startsWith(original), 'user content must be preserved verbatim at the top');
    assert.ok(gi.includes('.claude/skills/reviewing-apex/'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
