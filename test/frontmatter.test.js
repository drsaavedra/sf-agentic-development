'use strict';

// Release-validation tests for skill/agent YAML frontmatter — run on every PR via `npm test`.
// Zero dependencies: Node's built-in test runner + assert, with a small *structural* frontmatter
// reader (no YAML library, matching the rest of the suite). It deliberately checks structure, not
// full YAML semantics — it catches the breakage that has actually bitten this repo (a malformed or
// unclosed block, a missing name/description, an unbalanced quote — see PR #7), while staying
// lenient about nested / list values so a legitimate multi-line YAML frontmatter won't trip it.
//
// Contract under test, for every skills/<name>/SKILL.md and every agents/<name>.md:
//   1. The file opens with a `---` frontmatter block that is properly closed by a `---` line.
//   2. Every top-level line in that block is a `key: value` pair (indented / list lines are skipped).
//   3. Required keys `name` and `description` are present and non-empty.
//   4. Quoted values are balanced (a value that opens with " or ' also closes with the same quote).
// Targets are discovered dynamically, so any skill or agent added later is covered automatically.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

// Extract the text between the opening and closing `---` delimiters. Requires a body after the
// closing delimiter, which every SKILL.md / agent file has.
function extractBlock(content, label) {
  const norm = content.replace(/\r\n/g, '\n');
  const m = norm.match(/^---\n([\s\S]*?)\n---\s*\n/);
  assert.ok(m, label + ': must open with a --- frontmatter block that is closed by a --- line');
  return m[1];
}

// Parse the top-level `key: value` pairs. Indented lines (nested maps / YAML list items),
// blank lines, and comment lines are skipped, so a multi-line value never trips the check.
function topLevelFields(block, label) {
  const fields = {};
  for (const raw of block.split('\n')) {
    if (!raw.trim()) continue; // blank
    if (/^\s/.test(raw)) continue; // indented → belongs to the previous key
    if (raw.trimStart().startsWith('#')) continue; // comment
    const m = raw.match(/^([A-Za-z0-9_-]+):(.*)$/);
    assert.ok(m, label + ': unparseable top-level frontmatter line: ' + JSON.stringify(raw));
    const key = m[1];
    const val = m[2].trim();
    if (val.startsWith('"')) {
      assert.ok(val.length > 1 && val.endsWith('"'), label + ': unbalanced double-quote on key "' + key + '"');
    } else if (val.startsWith("'")) {
      assert.ok(val.length > 1 && val.endsWith("'"), label + ': unbalanced single-quote on key "' + key + '"');
    }
    fields[key] = val.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }
  return fields;
}

function assertRequiredKeys(fields, label) {
  for (const key of ['name', 'description']) {
    assert.ok(key in fields, label + ': frontmatter is missing required key "' + key + '"');
    assert.ok(
      fields[key] && fields[key].trim().length > 0,
      label + ': frontmatter key "' + key + '" must be non-empty'
    );
  }
}

const skillDirs = fs
  .readdirSync(path.join(root, 'skills'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const agentFiles = fs
  .readdirSync(path.join(root, 'agents'))
  .filter((f) => f.endsWith('.md'));

// --- skills --------------------------------------------------------------------------------------

test('every skills/*/SKILL.md has valid, complete frontmatter', () => {
  assert.ok(skillDirs.length > 0, 'expected at least one skill under skills/');
  for (const name of skillDirs) {
    const label = 'skills/' + name + '/SKILL.md';
    const file = path.join(root, 'skills', name, 'SKILL.md');
    assert.ok(fs.existsSync(file), label + ': missing SKILL.md');
    const fields = topLevelFields(extractBlock(fs.readFileSync(file, 'utf8'), label), label);
    assertRequiredKeys(fields, label);
  }
});

// --- agents --------------------------------------------------------------------------------------

test('every agents/*.md has valid, complete frontmatter', () => {
  assert.ok(agentFiles.length > 0, 'expected at least one agent under agents/');
  for (const file of agentFiles) {
    const label = 'agents/' + file;
    const fields = topLevelFields(extractBlock(fs.readFileSync(path.join(root, 'agents', file), 'utf8'), label), label);
    assertRequiredKeys(fields, label);
  }
});

// --- guard: the structural reader actually rejects broken frontmatter ----------------------------
// Proves the checks above can fail (so a future regression is caught, not silently passed).

test('the frontmatter reader rejects malformed input', () => {
  assert.throws(() => extractBlock('no frontmatter here\n', 'x'), /frontmatter block/);
  assert.throws(() => extractBlock('---\nname: x\n', 'x'), /frontmatter block/); // never closed
  assert.throws(
    () => assertRequiredKeys(topLevelFields('name: x\n', 'x'), 'x'),
    /missing required key "description"/
  );
  assert.throws(
    () => topLevelFields('description: "unterminated\n', 'x'),
    /unbalanced double-quote/
  );
});
