#!/usr/bin/env node
// Interactive installer for the sf-agentic-development skills, agents, and baselines.
// Zero dependencies. Run from the root of your Salesforce project:
//   npx github:drsaavedra/sf-agentic-development
// or, from a local clone:  node <clone>/scripts/install.js
//
// On a real terminal: arrow-key pickers, spacebar checkboxes, single-key y/N.
// On piped stdin (tests, CI): plain numbered prompts read line by line.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('node:readline');
const { spawnSync } = require('child_process');

const pkgRoot = path.join(__dirname, '..');
const target = process.cwd();
const isTTY = Boolean(process.stdin.isTTY && process.stdout.isTTY);

const assistants = [
  {
    name: 'Claude Code',
    skillsDir: '.claude/skills',
    agentsDir: '.claude/agents',
    baseline: 'CLAUDE.md',
  },
  {
    name: 'GitHub Copilot',
    skillsDir: '.github/skills',
    agentsDir: '.github/agents',
    baseline: path.join('.github', 'copilot-instructions.md'),
  },
  {
    name: 'Codex',
    skillsDir: '.agents/skills',
    agentsDir: '.agents/agents',
    baseline: 'AGENTS.md',
  },
];

const commerceSetLine =
  '  - **Current setting:** **This is a Commerce org.** `salesforce-commerce-b2b` overlays all Apex/LWC/Flow work. <!-- commerce-flag -->';

// ---------------------------------------------------------------------------
// TTY UI — raw-mode keypresses, no typed input
// ---------------------------------------------------------------------------

function readKey() {
  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', (buf) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve(buf.toString('utf8'));
    });
  });
}

function dieOnCtrlC(key) {
  if (key === '\x03') {
    process.stdout.write('\x1b[?25h\n');
    process.exit(130);
  }
}

async function ttyList(title, items, { multi }) {
  const hint = multi
    ? '(↑/↓ move, space toggle, a select all, enter confirm)'
    : '(↑/↓ move, enter select)';
  let cursor = 0;
  const checked = items.map(() => false);
  let drawn = 0;
  process.stdout.write('\x1b[?25l');
  const render = () => {
    if (drawn) process.stdout.write('\x1b[' + drawn + 'A');
    const out = [];
    out.push('\x1b[2K' + title + ' ' + hint);
    items.forEach((item, i) => {
      const pointer = i === cursor ? '>' : ' ';
      const box = multi ? (checked[i] ? '[x] ' : '[ ] ') : '';
      out.push('\x1b[2K  ' + pointer + ' ' + box + item);
    });
    process.stdout.write(out.join('\n') + '\n');
    drawn = items.length + 1;
  };
  render();
  for (;;) {
    const key = await readKey();
    dieOnCtrlC(key);
    if (key === '\x1b[A' || key === 'k') cursor = (cursor + items.length - 1) % items.length;
    else if (key === '\x1b[B' || key === 'j') cursor = (cursor + 1) % items.length;
    else if (multi && key === ' ') checked[cursor] = !checked[cursor];
    else if (multi && (key === 'a' || key === 'A')) {
      const allOn = checked.every(Boolean);
      checked.fill(!allOn);
    } else if (key === '\r' || key === '\n') break;
    render();
  }
  process.stdout.write('\x1b[?25h');
  return multi ? items.filter((_, i) => checked[i]) : cursor;
}

function ttyUI() {
  return {
    pickOne: (title, items) => ttyList(title, items, { multi: false }),
    pickMany: (title, items) => ttyList(title, items, { multi: true }),
    async confirm(prompt) {
      process.stdout.write(prompt + ' [y/N]: ');
      for (;;) {
        const key = await readKey();
        dieOnCtrlC(key);
        if (key === 'y' || key === 'Y') {
          process.stdout.write('y\n');
          return true;
        }
        if (key === 'n' || key === 'N' || key === '\r' || key === '\n') {
          process.stdout.write('n\n');
          return false;
        }
      }
    },
    close() {},
  };
}

// ---------------------------------------------------------------------------
// Line UI — fallback for piped stdin. rl.question drops lines that arrive
// between two question() calls (piped stdin delivers everything at once),
// so buffer 'line' events in a queue instead.
// ---------------------------------------------------------------------------

function lineUI() {
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
  const question = (prompt) => {
    process.stdout.write(prompt);
    if (lines.length) return Promise.resolve(lines.shift());
    if (closed) return Promise.resolve(null);
    return new Promise((resolve) => waiters.push(resolve));
  };
  const answerOrDie = (answer) => {
    if (answer === null) {
      console.error('\nInput ended before all questions were answered — nothing installed.');
      process.exit(1);
    }
    return answer;
  };
  return {
    async pickOne(title, items) {
      for (;;) {
        console.log(title);
        items.forEach((item, i) => console.log('  ' + (i + 1) + ') ' + item));
        const answer = answerOrDie(await question('Choice [1-' + items.length + ']: ')).trim();
        const n = Number(answer);
        if (Number.isInteger(n) && n >= 1 && n <= items.length) return n - 1;
        console.log('Please enter a number between 1 and ' + items.length + '.\n');
      }
    },
    async pickMany(title, items) {
      for (;;) {
        console.log(title);
        items.forEach((item, i) => console.log('  ' + (i + 1) + ') ' + item));
        const answer = answerOrDie(await question('Numbers, "all", or empty for none: '))
          .trim()
          .toLowerCase();
        if (answer === '' || answer === 'none') return [];
        if (answer === 'all') return items.slice();
        const nums = answer.split(/[,\s]+/).map(Number);
        if (nums.every((n) => Number.isInteger(n) && n >= 1 && n <= items.length)) {
          return [...new Set(nums)].map((n) => items[n - 1]);
        }
        console.log('Enter "all", "none", or numbers between 1 and ' + items.length + ' (e.g. 1,3).\n');
      }
    },
    async confirm(prompt) {
      const answer = answerOrDie(await question(prompt + ' [y/N]: ')).trim().toLowerCase();
      return answer === 'y' || answer === 'yes';
    },
    close() {
      rl.close();
    },
  };
}

// ---------------------------------------------------------------------------
// Dependency detection — skills installed by `npx skills add` are plain
// folders with a SKILL.md, in the project's or the user's skills directory.
// ---------------------------------------------------------------------------

function skillInstalled(skillName, assistant) {
  const home = os.homedir();
  const dirs = [
    path.join(target, assistant.skillsDir),
    path.join(target, '.claude', 'skills'),
    path.join(home, '.claude', 'skills'),
    path.join(home, '.agents', 'skills'),
    path.join(home, '.codex', 'skills'),
    path.join(home, '.github', 'skills'),
  ];
  return dirs.some((d) => fs.existsSync(path.join(d, skillName, 'SKILL.md')));
}

function sfSkillsInstalled(assistant) {
  return skillInstalled('generating-apex', assistant);
}

function runSkillsAdd(repo) {
  console.log('\nRunning: npx skills add ' + repo + '\n');
  const result = spawnSync('npx skills add ' + repo, { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.warn('npx skills add exited with status ' + result.status + ' — install it manually.');
  }
  return result.status === 0;
}

// ---------------------------------------------------------------------------

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

  const ui = isTTY ? ttyUI() : lineUI();
  try {
    console.log('sf-agentic-development installer');
    console.log('Installing into: ' + target + '\n');

    const assistant =
      assistants[await ui.pickOne('Which assistant do you use?', assistants.map((a) => a.name))];

    console.log('');
    const skills = await ui.pickMany('Which skills do you want to install?', skillNames);
    if (skills.length === 0) console.log('No skills selected — skipping skills.');

    console.log('');
    const agents = await ui.pickMany(
      'Which agents do you want to install?',
      agentFiles.map((f) => path.basename(f, '.md'))
    );
    if (agents.length === 0) console.log('No agents selected — skipping agents.');

    console.log('');
    const commerce = await ui.confirm(
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
      writeBaseline = await ui.confirm('\n' + assistant.baseline + ' already exists. Overwrite?');
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

    // Dependency — sf-skills is the toolkit's one required base; detect and offer it now
    let needSfSkills = !sfSkillsInstalled(assistant);

    if (needSfSkills) {
      const yes = await ui.confirm(
        '\nforcedotcom/sf-skills (the Salesforce-maintained base skills) not detected. Install now?'
      );
      if (yes && runSkillsAdd('forcedotcom/sf-skills')) needSfSkills = false;
    }

    console.log('\nDone.' + (needSfSkills ? ' Remaining steps:' : ''));
    if (needSfSkills) {
      console.log('  1. Install the Salesforce-maintained base skills:');
      console.log('       npx skills add forcedotcom/sf-skills');
    }
    console.log(
      '\nAgent notes: Fill in the "Agent → Spec Doc Map" section of ' +
        assistant.baseline +
        " with your project's spec document paths." +
        '\nOptional behavioral-guideline skills (karpathy-guidelines, superpowers) are listed' +
        '\nunder "Recommended companion skills" in the README — install whichever you prefer.'
    );
  } finally {
    ui.close();
  }
}

main().catch((err) => {
  process.stdout.write('\x1b[?25h');
  console.error(err.message || err);
  process.exit(1);
});
