'use strict';

// Release-validation tests for CLAUDE.md — the hand-maintained Claude Code instruction file that
// the installer injects into a project as a managed block. Run on every PR via `npm test`.
// Zero dependencies: Node's built-in test runner + assert. CLAUDE.md is no longer rendered from a
// template, so this reads it directly. The contract under test:
//   1. Every skill the routing references resolves to a known skill name (the typo guard).
//   2. The three skills authored IN this repo are referenced AND exist on disk.
//   3. The structural anchors a router relies on are present (the two routing-table headings + the
//      git-safety section).
//   4. No leftover template syntax survives from the old rendering pipeline.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const claudeMd = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8').replace(/\r\n/g, '\n');

// The review skills authored IN this repo — they must exist as skills/<name>/SKILL.md.
const AUTHORED_SKILLS = ['reviewing-apex', 'reviewing-lwc', 'reviewing-flow'];

// Skills pulled from forcedotcom/sf-skills that the routing tables reference. Keep in sync with the
// routing tables in CLAUDE.md. Used to prove the file references no typo'd skill name.
const SF_SKILLS_ALLOWLIST = [
  'generating-apex',
  'generating-apex-test',
  'generating-lwc-components',
  'generating-flow',
  'running-apex-tests',
  'debugging-apex-logs',
  'generating-custom-object',
  'generating-custom-field',
  'generating-custom-tab',
  'generating-custom-application',
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
  'applying-slds',
  'validating-slds',
];

const KNOWN = new Set([...AUTHORED_SKILLS, ...SF_SKILLS_ALLOWLIST]);

// A skill-shaped backtick token: every skill these tables route to begins with one of these verb
// prefixes. This deliberately excludes the agents (`code-reviewer`, `architect`), the workflow
// commands (`/sf-plan`, `/sf-build`), and file globs — while still catching a typo'd skill name
// (e.g. `reviewing-apx`), which keeps the prefix but won't be in KNOWN.
const SKILL_PREFIX = /^(generating|reviewing|running|debugging|querying|handling|building|deploying|applying|validating)-[a-z0-9-]+$/;

// --- typo guard: every skill-shaped reference resolves to a known skill -------------------------

test('every skill the routing references resolves to a known skill name', () => {
  const referenced = new Set();
  for (const m of claudeMd.matchAll(/`([a-z][a-z0-9-]+)`/g)) {
    if (SKILL_PREFIX.test(m[1])) referenced.add(m[1]);
  }
  assert.ok(referenced.size > 0, 'expected CLAUDE.md to reference at least one skill');
  for (const name of referenced) {
    assert.ok(KNOWN.has(name), 'CLAUDE.md references unknown skill name: ' + name);
  }
});

// --- authored skills are both referenced here and present on disk -------------------------------

test('every authored skill is referenced in CLAUDE.md and exists on disk', () => {
  for (const name of AUTHORED_SKILLS) {
    assert.ok(claudeMd.includes('`' + name + '`'), 'CLAUDE.md never references authored skill: ' + name);
    const skillPath = path.join(root, 'skills', name, 'SKILL.md');
    assert.ok(fs.existsSync(skillPath), 'missing authored skill file: skills/' + name + '/SKILL.md');
  }
});

// --- structural anchors a router relies on ------------------------------------------------------

test('CLAUDE.md contains the routing and safety section headings', () => {
  for (const heading of [
    '## Authoring & Config Routing',
    '## Review Routing',
    '## Deployment & git safety',
  ]) {
    assert.ok(claudeMd.includes(heading), 'CLAUDE.md is missing required section: ' + heading);
  }
});

// --- no leftover template syntax from the retired rendering pipeline -----------------------------

test('CLAUDE.md contains no unresolved template syntax', () => {
  assert.ok(!claudeMd.includes('{{'), 'CLAUDE.md contains an unresolved {{...}} token');
  assert.ok(!claudeMd.includes('<!-- only:'), 'CLAUDE.md contains an unresolved <!-- only: block');
  assert.ok(!claudeMd.includes('<!-- end:'), 'CLAUDE.md contains an unresolved <!-- end: marker');
});
