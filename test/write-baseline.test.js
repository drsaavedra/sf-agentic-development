'use strict';

// Tests for the installer's managed-block injection — run on every release via `npm test`.
// Zero dependencies: Node's built-in test runner + assert. The contract under test:
//   1. Absent file        → create it from the block alone               → 'created'.
//   2. Markers present    → replace only between them; equal → 'unchanged', else 'updated'.
//   3. No markers         → append the block, preserving user content    → 'appended'.
//   4. Lone/partial marker → warn, then append a fresh well-formed block  → 'appended'.
// In every case the user's own instructions outside the block survive verbatim.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { writeBaseline, BASELINE_BEGIN, BASELINE_END } = require('../scripts/install.js');

// Each test gets a throwaway dir and cleans it up; `dest` is a file path inside it.
function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfad-wb-'));
  try {
    return fn(dir, path.join(dir, 'CLAUDE.md'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// --- created: file absent ---------------------------------------------------------------

test('creates the file from the block alone when it does not exist', () => {
  withTempDir((dir, dest) => {
    assert.equal(fs.existsSync(dest), false);
    const action = writeBaseline(dest, 'ROUTING');
    assert.equal(action, 'created');
    assert.ok(fs.existsSync(dest));
    const out = fs.readFileSync(dest, 'utf8');
    assert.ok(out.includes(BASELINE_BEGIN));
    assert.ok(out.includes(BASELINE_END));
    // the rendered content sits between the two markers
    const between = out.slice(
      out.indexOf(BASELINE_BEGIN) + BASELINE_BEGIN.length,
      out.indexOf(BASELINE_END)
    );
    assert.ok(between.includes('ROUTING'));
  });
});

// --- unchanged: idempotent re-run -------------------------------------------------------

test('a second identical run returns unchanged and leaves the file byte-identical', () => {
  withTempDir((dir, dest) => {
    assert.equal(writeBaseline(dest, 'ROUTING'), 'created');
    const first = fs.readFileSync(dest, 'utf8');
    assert.equal(writeBaseline(dest, 'ROUTING'), 'unchanged');
    assert.equal(fs.readFileSync(dest, 'utf8'), first, 'file must be byte-identical');
  });
});

// --- updated: replace in place, preserve outside content --------------------------------

test('updates the block in place, preserving user text before and after verbatim', () => {
  withTempDir((dir, dest) => {
    const before = '# My project notes\nKeep this line above.\n\n';
    const after = '\n\n## Footer\nKeep this line below.\n';
    const initial = before + BASELINE_BEGIN + '\n\nOLD CONTENT\n\n' + BASELINE_END + after;
    fs.writeFileSync(dest, initial, 'utf8');

    const action = writeBaseline(dest, 'NEW CONTENT');
    assert.equal(action, 'updated');

    const out = fs.readFileSync(dest, 'utf8');
    // user content on both sides survives exactly
    assert.ok(out.startsWith(before), 'text before the block must be preserved verbatim');
    assert.ok(out.endsWith(after), 'text after the block must be preserved verbatim');
    // the block now carries the new content, and the old content is gone
    assert.ok(out.includes('NEW CONTENT'));
    assert.ok(!out.includes('OLD CONTENT'));
    // still exactly one well-formed block
    assert.ok(out.includes(BASELINE_BEGIN));
    assert.ok(out.includes(BASELINE_END));
  });
});

// --- appended: no markers ---------------------------------------------------------------

test('appends a fresh block when the file has no markers, keeping user content on top', () => {
  withTempDir((dir, dest) => {
    const userContent = '# My project notes\nstuff\n';
    fs.writeFileSync(dest, userContent, 'utf8');

    const action = writeBaseline(dest, 'ROUTING');
    assert.equal(action, 'appended');

    const out = fs.readFileSync(dest, 'utf8');
    // the user's original content is still present, at the top
    assert.ok(out.startsWith(userContent), 'user content must be preserved at the top');
    // a complete block was appended below it
    assert.ok(out.includes(BASELINE_BEGIN));
    assert.ok(out.includes(BASELINE_END));
    assert.ok(out.indexOf(BASELINE_BEGIN) > out.indexOf('stuff'), 'block comes after user content');
    const between = out.slice(
      out.indexOf(BASELINE_BEGIN) + BASELINE_BEGIN.length,
      out.indexOf(BASELINE_END)
    );
    assert.ok(between.includes('ROUTING'));
  });
});

// --- trim: surrounding whitespace stripped inside the markers ---------------------------

test('trims the rendered content so no blank lines pad it inside the markers', () => {
  withTempDir((dir, dest) => {
    assert.equal(writeBaseline(dest, '\n\n  ROUTING  \n\n'), 'created');
    const out = fs.readFileSync(dest, 'utf8');
    const between = out.slice(
      out.indexOf(BASELINE_BEGIN) + BASELINE_BEGIN.length,
      out.indexOf(BASELINE_END)
    );
    // the inner content is exactly rendered.trim(), wrapped by the block's own single
    // blank lines (\n\n on each side) — never the raw padded input.
    assert.equal(between, '\n\n' + '\n\n  ROUTING  \n\n'.trim() + '\n\n');
    assert.ok(!between.includes('  ROUTING  '), 'leading/trailing spaces must be trimmed');
  });
});

// --- partial marker: lone BEGIN → warn + append a fresh block ---------------------------

test('warns and appends a complete block when only a lone marker is present', () => {
  withTempDir((dir, dest) => {
    // a hand-edited file left only the BEGIN marker behind, no END
    fs.writeFileSync(dest, '# notes\n' + BASELINE_BEGIN + '\nleftover text\n', 'utf8');

    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));
    let action;
    try {
      action = writeBaseline(dest, 'ROUTING');
    } finally {
      console.warn = originalWarn;
    }

    assert.equal(action, 'appended');
    assert.ok(warnings.length > 0, 'a warning must be emitted for the partial marker');

    const out = fs.readFileSync(dest, 'utf8');
    // a complete, fresh block (both markers) now exists, with the rendered content
    assert.ok(out.includes(BASELINE_END), 'a fresh END marker must be appended');
    const lastBegin = out.lastIndexOf(BASELINE_BEGIN);
    const lastEnd = out.lastIndexOf(BASELINE_END);
    assert.ok(lastEnd > lastBegin, 'the appended block is well-formed (END after BEGIN)');
    const between = out.slice(lastBegin + BASELINE_BEGIN.length, lastEnd);
    assert.ok(between.includes('ROUTING'));
  });
});
