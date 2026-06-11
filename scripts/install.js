#!/usr/bin/env node
// Interactive installer for the sf-agentic-development skills, agents, and baselines.
// Zero dependencies. Run from the root of your Salesforce project:
//   npx github:drsaavedra/sf-agentic-development
// or, from a local clone:  node <clone>/scripts/install.js

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('node:readline');

const pkgRoot = path.join(__dirname, '..');
const target = process.cwd();

const assistants = [
  {
    name: 'Claude Code',
    skillsDir: '.claude/skills',
    agentsDir: '.claude/agents',
    baseline: 'CLAUDE.md',
    karpathy: [
      'Install the Karpathy behavioral guidelines plugin (inside Claude Code):',
      '    /plugin marketplace add forrestchang/andrej-karpathy-skills',
      '    /plugin install andrej-karpathy-skills@karpathy-skills',
    ],
  },
  {
    name: 'GitHub Copilot',
    skillsDir: '.github/skills',
    agentsDir: '.github/agents',
    baseline: path.join('.github', 'copilot-instructions.md'),
    karpathy: [
      'Install the Karpathy behavioral guidelines as a skill:',
      '    npx skills add forrestchang/andrej-karpathy-skills',
    ],
  },
  {
    name: 'Codex',
    skillsDir: '.agents/skills',
    agentsDir: '.agents/agents',
    baseline: 'AGENTS.md',
    karpathy: [
      'Install the Karpathy behavioral guidelines as a skill:',
      '    npx skills add forrestchang/andrej-karpathy-skills',
    ],
  },
];

const commerceSetLine =
  '  - **Current setting:** **This is a Commerce org.** `salesforce-commerce-b2b` overlays all Apex/LWC/Flow work. <!-- commerce-flag -->';

// rl.question drops lines that arrive between two question() calls (piped stdin
// delivers everything at once), so buffer 'line' events in a queue instead.
function makePrompter() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const lines = [];
  const waiters = [];
  let closed = false;
  rl.on('line', (line) => {
    // strip a leading BOM (PowerShell-piped stdin prepends one)
    const clean = line.charCodeAt(0) === 0xfeff ? line.slice(1) : line;
    const waiter = waiters.shift();
    if (waiter) waiter(clean);
    else lines.push(clean);
  });
  rl.on('close', () => {
    closed = true;
    while (waiters.length) waiters.shift()(null);
  });
  return {
    question(prompt) {
      process.stdout.write(prompt);
      if (lines.length) return Promise.resolve(lines.shift());
      if (closed) return Promise.resolve(null);
      return new Promise((resolve) => waiters.push(resolve));
    },
    close() {
      rl.close();
    },
  };
}

function answerOrDie(answer) {
  if (answer === null) {
    console.error('\nInput ended before all questions were answered — nothing installed.');
    process.exit(1);
  }
  return answer;
}

async function pickOne(rl, prompt, items) {
  for (;;) {
    items.forEach((item, i) => console.log('  ' + (i + 1) + ') ' + item));
    const answer = answerOrDie(await rl.question(prompt + ' [1-' + items.length + ']: ')).trim();
    const n = Number(answer);
    if (Number.isInteger(n) && n >= 1 && n <= items.length) return n - 1;
    console.log('Please enter a number between 1 and ' + items.length + '.\n');
  }
}

async function pickMany(rl, prompt, items) {
  for (;;) {
    items.forEach((item, i) => console.log('  ' + (i + 1) + ') ' + item));
    const answer = answerOrDie(await rl.question(prompt + ' [all]: ')).trim().toLowerCase();
    if (answer === '' || answer === 'all') return items.slice();
    const nums = answer.split(/[,\s]+/).map(Number);
    if (nums.every((n) => Number.isInteger(n) && n >= 1 && n <= items.length)) {
      return [...new Set(nums)].map((n) => items[n - 1]);
    }
    console.log('Enter "all" or numbers between 1 and ' + items.length + ' (e.g. 1,3).\n');
  }
}

async function confirm(rl, prompt) {
  const answer = answerOrDie(await rl.question(prompt + ' [y/N]: ')).trim().toLowerCase();
  return answer === 'y' || answer === 'yes';
}

async function main() {
  if (path.resolve(pkgRoot) === path.resolve(target)) {
    console.error(
      'Run this installer from the root of your Salesforce project, not from the\n' +
        'sf-agentic-development repo itself (it would install the toolkit into its own source).'
    );
    process.exit(1);
  }

  const skillNames = fs
    .readdirSync(path.join(pkgRoot, 'skills'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const agentFiles = fs
    .readdirSync(path.join(pkgRoot, 'agents'))
    .filter((f) => f.endsWith('.md'));

  const rl = makePrompter();
  try {
    console.log('sf-agentic-development installer');
    console.log('Installing into: ' + target + '\n');

    console.log('Which assistant do you use?');
    const assistant = assistants[await pickOne(rl, 'Assistant', assistants.map((a) => a.name))];

    console.log('\nWhich skills do you want to install?');
    const skills = await pickMany(rl, 'Skills (comma-separated numbers or "all")', skillNames);

    console.log('\nWhich agents do you want to install?');
    const agents = await pickMany(
      rl,
      'Agents (comma-separated numbers or "all")',
      agentFiles.map((f) => path.basename(f, '.md'))
    );

    console.log('');
    const commerce = await confirm(
      rl,
      'Is this a Salesforce B2B Commerce project? (sets the Commerce flag in the baseline)'
    );

    // Copy skills and agents
    for (const name of skills) {
      const dest = path.join(target, assistant.skillsDir, name);
      fs.cpSync(path.join(pkgRoot, 'skills', name), dest, { recursive: true });
      console.log('installed skill  ' + path.join(assistant.skillsDir, name));
    }
    for (const name of agents) {
      const dest = path.join(target, assistant.agentsDir, name + '.md');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(pkgRoot, 'agents', name + '.md'), dest);
      console.log('installed agent  ' + path.join(assistant.agentsDir, name + '.md'));
    }

    // Copy the baseline (CLAUDE.md / AGENTS.md / .github/copilot-instructions.md)
    const baselineDest = path.join(target, assistant.baseline);
    let writeBaseline = true;
    if (fs.existsSync(baselineDest)) {
      writeBaseline = await confirm(rl, '\n' + assistant.baseline + ' already exists. Overwrite?');
    }
    if (writeBaseline) {
      let content = fs.readFileSync(path.join(pkgRoot, assistant.baseline), 'utf8');
      if (commerce) {
        const lines = content.split('\n');
        const idx = lines.findIndex((l) => l.includes('<!-- commerce-flag -->'));
        if (idx === -1) {
          console.warn('warning: commerce-flag sentinel not found in ' + assistant.baseline);
        } else {
          lines[idx] = commerceSetLine;
          content = lines.join('\n');
        }
      }
      fs.mkdirSync(path.dirname(baselineDest), { recursive: true });
      fs.writeFileSync(baselineDest, content, 'utf8');
      console.log(
        'installed baseline ' + assistant.baseline + (commerce ? ' (Commerce flag set)' : '')
      );
    } else {
      console.log('kept existing ' + assistant.baseline + ' (Commerce flag not changed)');
    }

    console.log('\nDone. Next steps:');
    console.log('  1. Install the community Salesforce skills:');
    console.log('       npx skills add forcedotcom/sf-skills');
    console.log('  2. ' + assistant.karpathy[0]);
    for (const line of assistant.karpathy.slice(1)) console.log('   ' + line);
    console.log(
      '  3. Fill in the "Agent → Spec Doc Map" section of ' +
        assistant.baseline +
        ' with your project\'s spec document paths.'
    );
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
