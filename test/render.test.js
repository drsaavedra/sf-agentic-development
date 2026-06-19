'use strict';

// Tier 1 release-validation tests for the baseline renderer — run on every release via `npm test`.
// Zero dependencies: Node's built-in test runner + assert. The contract under test:
//   1. The committed baselines match a fresh re-render (no drift). THE most important test.
//   2. No committed render leaks unresolved template syntax.
//   3. The renderer guards against unknown tokens / a missing BODY marker (fail loud, never silent).
//   4. The <!-- only: --> conditional-block mechanism keeps/drops by target id.
//   5. Every {{skill:NAME}} the template references resolves to a known skill name.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  targets,
  extractBody,
  renderTarget,
  renderAll,
  templatePath,
  BODY_MARKER,
} = require('../scripts/render-baselines.js');

const root = path.join(__dirname, '..');

// Read line endings out of the comparison so the test holds on a Windows checkout (CRLF on disk).
const lf = (s) => s.replace(/\r\n/g, '\n');

const template = fs.readFileSync(templatePath, 'utf8');

// The review skills authored IN this repo — they must exist as skills/<name>/SKILL.md.
const AUTHORED_SKILLS = ['reviewing-apex', 'reviewing-lwc', 'reviewing-flow'];

// Skills pulled from forcedotcom/sf-skills. Mirrors the routing table in templates/baseline.md —
// keep in sync if the table changes. Used to prove the template references no typo'd skill name.
const SF_SKILLS_ALLOWLIST = [
  'generating-apex',
  'generating-apex-test',
  'generating-lwc-components',
  'generating-flow',
  'running-apex-tests',
  'debugging-apex-logs',
  'generating-custom-object',
  'generating-custom-field',
  'generating-permission-set',
  'generating-flexipage',
  'generating-validation-rule',
  'generating-list-view',
  'deploying-metadata',
  'querying-soql',
  'handling-sf-data',
  'building-sf-integrations',
  'running-code-analyzer',
  'generating-lightning-app',
];

// --- drift: committed renders must match a fresh re-render --------------------------------------

test('every committed baseline is byte-identical to a fresh render', () => {
  const rendered = renderAll(template);
  for (const t of targets) {
    const committed = fs.readFileSync(path.join(root, t.file), 'utf8');
    assert.equal(
      lf(committed),
      lf(rendered[t.file]),
      t.file + ' is out of sync with templates/baseline.md — run `node scripts/render-baselines.js`'
    );
  }
});

// --- no unresolved template syntax in any committed render --------------------------------------

test('no committed render contains unresolved template syntax', () => {
  for (const t of targets) {
    const committed = fs.readFileSync(path.join(root, t.file), 'utf8');
    assert.ok(!committed.includes('{{'), t.file + ' contains an unresolved {{...}} token');
    assert.ok(!committed.includes('<!-- only:'), t.file + ' contains an unresolved <!-- only: block');
    assert.ok(!committed.includes('<!-- end:'), t.file + ' contains an unresolved <!-- end: marker');
  }
});

// --- guards: the renderer fails loud, never silent ----------------------------------------------

test('renderTarget throws on an unknown token', () => {
  assert.throws(() => renderTarget('hello {{NOPE}}', targets[0]));
});

test('extractBody throws when the BODY marker is absent', () => {
  assert.throws(() => extractBody('no marker here'));
});

// --- only-block mechanism: kept for the listed id, dropped for others ----------------------------

test('<!-- only:claude --> blocks resolve by target id', () => {
  const body = '<!-- only:claude -->\nKEEP\n<!-- end:only -->\n';
  const claude = targets.find((t) => t.id === 'claude');
  const codex = targets.find((t) => t.id === 'codex');
  assert.ok(claude && codex, 'expected both claude and codex targets to exist');

  assert.ok(renderTarget(body, claude).includes('KEEP'), 'claude target should keep its only-block');
  assert.ok(!renderTarget(body, codex).includes('KEEP'), 'codex target should drop the claude-only block');
});

// --- skill-reference integrity ------------------------------------------------------------------

test('every {{skill:NAME}} reference resolves to a known skill, and authored skills exist on disk', () => {
  const body = extractBody(template);

  // Pull every distinct skill name the template references.
  const referenced = new Set();
  for (const m of body.matchAll(/\{\{skill:([a-z0-9-]+)\}\}/g)) referenced.add(m[1]);
  assert.ok(referenced.size > 0, 'expected the template body to reference at least one skill');

  // Each authored skill is referenced by the template AND exists on disk as skills/<name>/SKILL.md.
  for (const name of AUTHORED_SKILLS) {
    assert.ok(referenced.has(name), 'template never references authored skill: ' + name);
    const skillPath = path.join(root, 'skills', name, 'SKILL.md');
    assert.ok(fs.existsSync(skillPath), 'missing authored skill file: skills/' + name + '/SKILL.md');
  }

  // Every referenced name must be a known skill — authored here or in the sf-skills allowlist.
  // A typo'd skill name in the template fails here.
  const known = new Set([...AUTHORED_SKILLS, ...SF_SKILLS_ALLOWLIST]);
  for (const name of referenced) {
    assert.ok(known.has(name), 'template references unknown skill name: ' + name);
  }
});
