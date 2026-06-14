#!/usr/bin/env node
// Renders CLAUDE.md, AGENTS.md, and .github/copilot-instructions.md from
// templates/baseline.md. Zero dependencies. Usage: node scripts/render-baselines.js

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const templatePath = path.join(root, 'templates', 'baseline.md');
const template = fs.readFileSync(templatePath, 'utf8').replace(/\r\n/g, '\n');

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

const bodyMarker = '<!-- BODY -->';
const markerIdx = template.indexOf(bodyMarker);
if (markerIdx === -1) {
  console.error('templates/baseline.md: missing ' + bodyMarker + ' marker');
  process.exit(1);
}
const body = template.slice(markerIdx + bodyMarker.length).replace(/^\n/, '');

for (const t of targets) {
  let out = body;

  // <!-- only:claude codex --> ... <!-- end:only --> — keep only for listed targets
  out = out.replace(
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
    console.error(t.file + ': unresolved template syntax: ' + leftover[0]);
    process.exit(1);
  }

  const header = [
    '<!--',
    '  SALESFORCE PROJECT TEMPLATE — ' + t.assistantName + ' baseline',
    '  Rendered from: templates/baseline.md — DO NOT EDIT DIRECTLY.',
    '  Re-render with: node scripts/render-baselines.js',
    '  Companion files (same Priority content, assistant-specific syntax):',
    '    ' + t.companions[0],
    '    ' + t.companions[1],
    '  Canonical skills:  skills/*/SKILL.md   (installed into ' + t.skillsDir + '/ at setup)',
    '  Canonical agents:  agents/*.md         (installed into ' + t.agentsDir + '/ at setup)',
    '-->',
    '',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(root, t.file), header + out, 'utf8');
  console.log('rendered ' + t.file);
}
