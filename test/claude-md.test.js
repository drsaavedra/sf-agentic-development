'use strict';

// Release-validation tests for CLAUDE.md and rules/ — the hand-maintained Claude Code instruction
// files the installer ships into a project. Run on every PR via `npm test`.
// Zero dependencies: Node's built-in test runner + assert. CLAUDE.md is a pointer; the rules
// themselves live in rules/*.md and install into .claude/rules/sf-agentic-development/. The contract under test:
//   1. Every skill the routing references resolves to a skill authored in this repo (the typo
//      guard — the sf-skills dependency is gone).
//   2. The skills authored IN this repo are referenced AND exist on disk.
//   3. Each rule file carries an H1, and the pointer table in CLAUDE.md matches rules/ exactly.
//   4. `paths:` frontmatter appears only where it is safe — never on the safety guardrails.
//   5. No leftover template syntax survives from the old rendering pipeline.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const claudeMd = read(path.join(root, 'CLAUDE.md'));
const ruleNames = fs
  .readdirSync(path.join(root, 'rules'))
  .filter((f) => f.endsWith('.md'))
  .sort();
const rules = new Map(ruleNames.map((f) => [f, read(path.join(root, 'rules', f))]));
const allText = [claudeMd, ...rules.values()].join('\n');

// The skills authored IN this repo — the only skills the toolkit ships or references.
// (sf-research / sf-plan / sf-build are also authored here but don't match SKILL_PREFIX,
// so the typo guard doesn't need them in KNOWN; the on-disk check below covers them.)
const AUTHORED_SKILLS = ['reviewing-apex', 'reviewing-lwc', 'reviewing-flow', 'generating-b2b-lwc'];

const KNOWN = new Set(AUTHORED_SKILLS);

// A skill-shaped backtick token: every skill these tables route to begins with one of these verb
// prefixes. This deliberately excludes the agents (`code-reviewer`, `architect`), the workflow
// commands (`/sf-plan`, `/sf-build`), and file globs — while still catching a typo'd skill name
// (e.g. `reviewing-apx`), which keeps the prefix but won't be in KNOWN.
const SKILL_PREFIX = /^(generating|reviewing|running|debugging|querying|handling|building|deploying|applying|validating)-[a-z0-9-]+$/;

// Rules that must never be path-scoped. A `paths:` rule loads only once Claude reads a matching
// file, so scoping these would drop them from exactly the sessions that never open a Salesforce
// artifact — including the ones that deploy or commit.
const ALWAYS_UNCONDITIONAL = ['safety.md', 'pipeline.md', 'authoring.md'];

// --- typo guard: every skill-shaped reference resolves to a known skill -------------------------

test('every skill the routing references resolves to a known skill name', () => {
  const referenced = new Set();
  for (const m of allText.matchAll(/`([a-z][a-z0-9-]+)`/g)) {
    if (SKILL_PREFIX.test(m[1])) referenced.add(m[1]);
  }
  assert.ok(referenced.size > 0, 'expected the routing to reference at least one skill');
  for (const name of referenced) {
    assert.ok(KNOWN.has(name), 'routing references unknown skill name: ' + name);
  }
});

// --- authored skills are both referenced here and present on disk -------------------------------

test('every authored skill is referenced in the rules and exists on disk', () => {
  for (const name of AUTHORED_SKILLS) {
    assert.ok(allText.includes('`' + name + '`'), 'nothing references authored skill: ' + name);
    const skillPath = path.join(root, 'skills', name, 'SKILL.md');
    assert.ok(fs.existsSync(skillPath), 'missing authored skill file: skills/' + name + '/SKILL.md');
  }
});

// --- rules/ structure ---------------------------------------------------------------------------

test('rules/ holds the four routing and safety files, each with an H1', () => {
  assert.deepEqual(
    ruleNames,
    ['authoring.md', 'pipeline.md', 'review-routing.md', 'safety.md'],
    'rules/ does not hold the expected set of rule files'
  );
  for (const [name, text] of rules) {
    const body = text.replace(/^---\n[\s\S]*?\n---\n/, '');
    assert.match(body, /^\s*#\s+\S/, 'rules/' + name + ' does not start with an H1 heading');
  }
});

// CLAUDE.md is only useful as a pointer if it points at what is actually there.
test('the pointer table in CLAUDE.md matches rules/ exactly', () => {
  const listed = new Set();
  for (const m of claudeMd.matchAll(/`([a-z0-9-]+\.md)`/g)) listed.add(m[1]);
  assert.deepEqual(
    [...listed].sort(),
    ruleNames,
    'CLAUDE.md lists rule files that differ from the contents of rules/'
  );
});

// --- path scoping is applied only where it is safe ----------------------------------------------

test('guardrail rules carry no paths: frontmatter', () => {
  for (const name of ALWAYS_UNCONDITIONAL) {
    const text = rules.get(name);
    assert.ok(text, 'expected rules/' + name + ' to exist');
    assert.ok(
      !/^---\n[\s\S]*?\bpaths:/.test(text),
      'rules/' + name + ' must load unconditionally — remove its paths: frontmatter'
    );
  }
});

test('review-routing.md is path-scoped to Salesforce artifacts', () => {
  const text = rules.get('review-routing.md');
  assert.match(text, /^---\n[\s\S]*?\bpaths:/, 'rules/review-routing.md lost its paths: frontmatter');
  for (const glob of ['force-app/**', '**/*.cls', '**/lwc/**']) {
    assert.ok(text.includes('"' + glob + '"'), 'review-routing.md no longer matches ' + glob);
  }
});

// --- no leftover template syntax from the retired rendering pipeline -----------------------------

test('no unresolved template syntax survives in CLAUDE.md or rules/', () => {
  for (const [name, text] of [['CLAUDE.md', claudeMd], ...rules]) {
    assert.ok(!text.includes('{{'), name + ' contains an unresolved {{...}} token');
    assert.ok(!text.includes('<!-- only:'), name + ' contains an unresolved <!-- only: block');
    assert.ok(!text.includes('<!-- end:'), name + ' contains an unresolved <!-- end: marker');
  }
});
