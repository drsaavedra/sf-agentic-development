#!/usr/bin/env node
// Renders CLAUDE.md, AGENTS.md, and .github/copilot-instructions.md from
// templates/baseline.md. Zero dependencies. Usage: node scripts/render-baselines.js
//
// Required directly → renders and writes the files. Required as a module (tests) →
// exposes the pure render helpers without writing anything, so a drift test can
// re-render in memory and compare against the committed files.

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const templatePath = path.join(root, 'templates', 'baseline.md');

const targets = [
  {
    id: 'claude',
    file: 'CLAUDE.md',
    assistantName: 'Claude Code',
    titleName: 'Claude',
    skillsDir: '.claude/skills',
    agentsDir: '.claude/agents',
    p2Verb: 'Invoke',
    skillRef: (name) => '`' + name + '`',
    companions: [
      'AGENTS.md                        (Codex)',
      '.github/copilot-instructions.md  (GitHub Copilot)',
    ],
  },
  {
    id: 'codex',
    file: 'AGENTS.md',
    assistantName: 'Codex',
    titleName: 'Codex',
    skillsDir: '.agents/skills',
    agentsDir: '.agents/agents',
    p2Verb: 'Invoke',
    skillRef: (name) => '`' + name + '`',
    companions: [
      'CLAUDE.md                        (Claude Code)',
      '.github/copilot-instructions.md  (GitHub Copilot)',
    ],
  },
  {
    id: 'copilot',
    file: path.join('.github', 'copilot-instructions.md'),
    assistantName: 'GitHub Copilot',
    titleName: 'GitHub Copilot',
    skillsDir: '.github/skills',
    agentsDir: '.github/agents',
    p2Verb: 'Use',
    skillRef: (name) => '`/skill ' + name + '`',
    companions: [
      'CLAUDE.md                        (Claude Code)',
      'AGENTS.md                        (Codex)',
    ],
  },
];

const BODY_MARKER = '<!-- BODY -->';

// Extract the renderable body — everything after the BODY marker. Throws if absent.
function extractBody(template) {
  const normalized = template.replace(/\r\n/g, '\n');
  const markerIdx = normalized.indexOf(BODY_MARKER);
  if (markerIdx === -1) {
    throw new Error('templates/baseline.md: missing ' + BODY_MARKER + ' marker');
  }
  return normalized.slice(markerIdx + BODY_MARKER.length).replace(/^\n/, '');
}

// Render one target's full file content (header + resolved body) from the body text.
// Throws on any unresolved template syntax so a typo can never reach a committed file.
function renderTarget(body, t) {
  // <!-- only:claude codex --> ... <!-- end:only --> — keep only for listed targets
  let out = body.replace(
    /<!-- only:([a-z ]+) -->\n([\s\S]*?)<!-- end:only -->\n/g,
    (match, ids, content) => (ids.trim().split(/\s+/).includes(t.id) ? content : '')
  );

  out = out
    .replace(/\{\{skill:([a-z0-9-]+)\}\}/g, (match, name) => t.skillRef(name))
    .replace(/\{\{ASSISTANT_NAME\}\}/g, t.assistantName)
    .replace(/\{\{TITLE_NAME\}\}/g, t.titleName)
    .replace(/\{\{SKILLS_DIR\}\}/g, t.skillsDir)
    .replace(/\{\{P2_VERB\}\}/g, t.p2Verb);

  const leftover = out.match(/\{\{[^}]+\}\}|<!-- (only|end):/);
  if (leftover) {
    throw new Error(t.file + ': unresolved template syntax: ' + leftover[0]);
  }

  const header = [
    '<!--',
    '  SALESFORCE PROJECT TEMPLATE — ' + t.assistantName + ' baseline',
    '  Rendered from: templates/baseline.md — DO NOT EDIT DIRECTLY.',
    '  Re-render with: node scripts/render-baselines.js',
    '  Companion files (same routing content, assistant-specific syntax):',
    '    ' + t.companions[0],
    '    ' + t.companions[1],
    '  Canonical skills:  skills/*/SKILL.md   (installed into ' + t.skillsDir + '/ at setup)',
    '  Canonical agents:  agents/*.md         (installed into ' + t.agentsDir + '/ at setup)',
    '-->',
    '',
    '',
  ].join('\n');

  return header + out;
}

// Render every target from a template string → { [file]: content }. No IO.
function renderAll(template) {
  const body = extractBody(template);
  const out = {};
  for (const t of targets) out[t.file] = renderTarget(body, t);
  return out;
}

function main() {
  const template = fs.readFileSync(templatePath, 'utf8');
  const rendered = renderAll(template);
  for (const t of targets) {
    fs.writeFileSync(path.join(root, t.file), rendered[t.file], 'utf8');
    console.log('rendered ' + t.file);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}

module.exports = { targets, extractBody, renderTarget, renderAll, templatePath, BODY_MARKER };
