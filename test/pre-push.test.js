'use strict';

// Pins githooks/pre-push: any ref line that updates or deletes main refuses the push.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const hook = path.join(__dirname, '..', 'githooks', 'pre-push');
const Z = '0000000000000000000000000000000000000000';
const A = '1111111111111111111111111111111111111111';

function push(lines) {
  return spawnSync('bash', [hook, 'origin', 'url'], { input: lines.join('\n') + '\n' }).status;
}

test('a push to a feature branch passes', () => {
  assert.equal(push([`refs/heads/feature/x ${A} refs/heads/feature/x ${Z}`]), 0);
});

test('a push that updates main is refused', () => {
  assert.equal(push([`refs/heads/main ${A} refs/heads/main ${Z}`]), 1);
});

test('a push that deletes main is refused', () => {
  assert.equal(push([`(delete) ${Z} refs/heads/main ${A}`]), 1);
});

test('main among several refs refuses the whole push', () => {
  assert.equal(push([`refs/heads/feature/x ${A} refs/heads/feature/x ${Z}`, `refs/heads/main ${A} refs/heads/main ${Z}`]), 1);
});

test('a branch merely named like main passes', () => {
  assert.equal(push([`refs/heads/main-fix ${A} refs/heads/main-fix ${Z}`]), 0);
});
