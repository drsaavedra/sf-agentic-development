'use strict';

// Tests for the installer's domain-pack filtering — run on every release via `npm test`.
// Zero dependencies: Node's built-in test runner + assert. The contract under test
// (applyDomainPacks mutates an already-copied skill dir in place):
//   1. UNSELECTED pack → its reference files are deleted and the marked SKILL.md rows
//      are dropped entirely.
//   2. SELECTED pack → the reference files are kept and the SKILL.md rows survive, but
//      the trailing marker comment is stripped so it never ships to the user.
//   3. Either way, no `<!-- domain: ... -->` marker is ever left behind.
// Every test works on a throwaway COPY of a real skill dir, never the repo source.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { applyDomainPacks, DOMAIN_PACKS } = require('../scripts/install.js');

const root = path.join(__dirname, '..');

// The commerce pack drives the marker/file names below so these tests track future
// changes to the pack definition rather than hardcoding strings.
const commerce = DOMAIN_PACKS.find((p) => p.key === 'commerce');
const commerceFile = commerce.files[0]; // 'commerce-b2b.md'
const commerceMarker = '<!-- ' + commerce.marker + ' -->'; // '<!-- domain:commerce -->'

// Skills that genuinely carry the commerce pack: a references/<file> AND a marked SKILL.md
// row. Verified against the repo before relying on it (deploying-sf-metadata does NOT).
const CARRIER_SKILLS = ['reviewing-apex', 'reviewing-lwc', 'reviewing-flow'];

// Copy a real skill dir into a fresh temp dir and hand both back. The caller owns
// cleanup of `tmp` (rm -rf in a finally).
function copySkill(skillName) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sfad-dp-'));
  const skillDir = path.join(tmp, skillName);
  fs.cpSync(path.join(root, 'skills', skillName), skillDir, { recursive: true });
  return { tmp, skillDir };
}

const readSkillMd = (skillDir) => fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const refPath = (skillDir, file) => path.join(skillDir, 'references', file);

// A carrier skill must start out actually carrying the pack, or the test below is vacuous.
function assertCarriesCommerce(skillName, skillDir) {
  assert.ok(
    fs.existsSync(refPath(skillDir, commerceFile)),
    skillName + ' should ship references/' + commerceFile + ' before filtering'
  );
  assert.ok(
    readSkillMd(skillDir).includes(commerceMarker),
    skillName + ' SKILL.md should carry the ' + commerceMarker + ' marker before filtering'
  );
}

// --- commerce UNSELECTED: files removed, marked rows dropped ----------------------------

test('unselected commerce pack: reference file and its SKILL.md row are removed', () => {
  const { tmp, skillDir } = copySkill('reviewing-apex');
  try {
    assertCarriesCommerce('reviewing-apex', skillDir);
    const before = readSkillMd(skillDir).split('\n');

    applyDomainPacks(skillDir, []); // nothing selected

    // the reference file is gone
    assert.ok(
      !fs.existsSync(refPath(skillDir, commerceFile)),
      'references/' + commerceFile + ' must be deleted when the pack is unselected'
    );

    const after = readSkillMd(skillDir);
    const afterLines = after.split('\n');
    // the marker string is gone entirely
    assert.ok(!after.includes(commerceMarker), 'marker comment must be gone');
    // the whole marked ROW is gone — no surviving line references it or the file
    assert.ok(
      !afterLines.some((l) => l.includes(commerce.marker)),
      'no line may still mention the marker'
    );
    assert.ok(
      !afterLines.some((l) => l.includes(commerceFile)),
      'the dropped row referenced ' + commerceFile + ' — that line must be gone too'
    );
    // a row was actually removed, not just emptied
    assert.ok(afterLines.length < before.length, 'SKILL.md should have fewer lines after dropping the row');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// --- commerce SELECTED: files kept, row kept, marker stripped --------------------------

test('selected commerce pack: reference file and row are kept, only the marker is stripped', () => {
  const { tmp, skillDir } = copySkill('reviewing-apex');
  try {
    assertCarriesCommerce('reviewing-apex', skillDir);

    applyDomainPacks(skillDir, ['commerce']); // selected

    // the reference file survives
    assert.ok(
      fs.existsSync(refPath(skillDir, commerceFile)),
      'references/' + commerceFile + ' must be kept when the pack is selected'
    );

    const after = readSkillMd(skillDir);
    // the human-readable row content survives (it still points at the reference file)
    assert.ok(
      after.includes(commerceFile),
      'the kept row should still reference ' + commerceFile
    );
    // but the trailing marker comment is stripped
    assert.ok(!after.includes(commerceMarker), 'the full marker comment must be stripped');
    assert.ok(!after.includes('<!-- domain:'), 'no raw domain marker may remain');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// --- invariant: a marker must never leak, selected or not ------------------------------

test('invariant: no <!-- domain: marker leaks for either selection', () => {
  for (const selectedKeys of [[], ['commerce']]) {
    const { tmp, skillDir } = copySkill('reviewing-apex');
    try {
      applyDomainPacks(skillDir, selectedKeys);
      const after = readSkillMd(skillDir);
      assert.ok(
        !after.includes('<!-- domain:'),
        'a domain marker leaked with selectedKeys=' + JSON.stringify(selectedKeys)
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
});

// --- applies across every carrier skill ------------------------------------------------

test('unselected commerce pack is filtered out of every carrier skill', () => {
  for (const skillName of CARRIER_SKILLS) {
    const { tmp, skillDir } = copySkill(skillName);
    try {
      // confirm it truly carries the pack first; otherwise the assertions below are vacuous
      assertCarriesCommerce(skillName, skillDir);

      applyDomainPacks(skillDir, []);

      assert.ok(
        !fs.existsSync(refPath(skillDir, commerceFile)),
        skillName + ': references/' + commerceFile + ' must be removed'
      );
      assert.ok(
        !readSkillMd(skillDir).includes('<!-- domain:'),
        skillName + ': no domain marker may remain in SKILL.md'
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
});

// --- DOMAIN_PACKS shape sanity (light) -------------------------------------------------

test('DOMAIN_PACKS defines the commerce pack with the expected marker and file', () => {
  assert.ok(commerce, 'a commerce pack must exist in DOMAIN_PACKS');
  assert.equal(commerce.marker, 'domain:commerce');
  assert.ok(
    commerce.files.includes('commerce-b2b.md'),
    'commerce pack files must include commerce-b2b.md'
  );
});
