#!/usr/bin/env node
// Interactive installer for the sf-agentic-development skills and agents.
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
  },
  {
    name: 'GitHub Copilot',
    skillsDir: '.github/skills',
    agentsDir: '.github/agents',
  },
  {
    name: 'Codex',
    skillsDir: '.agents/skills',
    agentsDir: '.agents/agents',
  },
];

// Optional domain reference packs. A skill's references/ may carry domain-specific
// files (e.g. references/commerce-b2b.md) plus SKILL.md routing rows tagged with the
// pack's `marker`. Unselected packs are filtered out of the installed copy:
// matching reference files are removed and marked SKILL.md lines are dropped. To add
// a future domain, append an entry here — no other installer logic changes.
const DOMAIN_PACKS = [
  { key: 'commerce', label: 'B2B Commerce', marker: 'domain:commerce', files: ['commerce-b2b.md'] },
];

// A pack applies to a skill if the skill's references/ contains any of the pack's files.
function packAppliesToSkill(pack, skillName) {
  return pack.files.some((f) =>
    fs.existsSync(path.join(pkgRoot, 'skills', skillName, 'references', f))
  );
}

// Post-process an installed skill copy for the chosen domain packs. For unselected
// packs: delete their reference files and drop SKILL.md lines carrying their marker.
// For selected packs: strip just the trailing marker comment so the file is clean.
function applyDomainPacks(skillDest, selectedKeys) {
  for (const pack of DOMAIN_PACKS) {
    const selected = selectedKeys.includes(pack.key);
    if (!selected) {
      for (const f of pack.files) {
        const refPath = path.join(skillDest, 'references', f);
        if (fs.existsSync(refPath)) fs.rmSync(refPath);
      }
    }
  }
  const skillMd = path.join(skillDest, 'SKILL.md');
  if (!fs.existsSync(skillMd)) return;
  const markerRe = (m) => new RegExp('<!--\\s*' + m + '\\s*-->');
  const kept = fs
    .readFileSync(skillMd, 'utf8')
    .split('\n')
    .filter((line) => {
      const pack = DOMAIN_PACKS.find((p) => markerRe(p.marker).test(line));
      if (!pack) return true;
      return selectedKeys.includes(pack.key); // drop the line if its pack was not selected
    })
    .map((line) => {
      // strip the trailing marker comment from any kept line
      for (const pack of DOMAIN_PACKS) {
        line = line.replace(new RegExp('\\s*<!--\\s*' + pack.marker + '\\s*-->\\s*$'), '');
      }
      return line;
    });
  fs.writeFileSync(skillMd, kept.join('\n'));
}

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

    // Domain reference packs — ask only about packs that apply to a selected skill.
    const offeredPacks = DOMAIN_PACKS.filter((pack) =>
      skills.some((s) => packAppliesToSkill(pack, s))
    );
    let selectedPackKeys = [];
    if (offeredPacks.length) {
      console.log('');
      const chosen = await ui.pickMany(
        'Which domain reference packs do you want to include?',
        offeredPacks.map((p) => p.label)
      );
      selectedPackKeys = offeredPacks.filter((p) => chosen.includes(p.label)).map((p) => p.key);
    }

    console.log('');
    const agents = await ui.pickMany(
      'Which agents do you want to install?',
      agentFiles.map((f) => path.basename(f, '.md'))
    );
    if (agents.length === 0) console.log('No agents selected — skipping agents.');

    // Copy skills and agents
    for (const name of skills) {
      const dest = path.join(target, assistant.skillsDir, name);
      fs.cpSync(path.join(pkgRoot, 'skills', name), dest, { recursive: true });
      applyDomainPacks(dest, selectedPackKeys);
      console.log('installed skill  ' + path.join(assistant.skillsDir, name));
    }
    for (const name of agents) {
      const dest = path.join(target, assistant.agentsDir, name + '.md');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(pkgRoot, 'agents', name + '.md'), dest);
      console.log('installed agent  ' + path.join(assistant.agentsDir, name + '.md'));
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
      '\nAgent notes: the salesforce-developer and architect agents ask for your spec/' +
        'architecture\ndocument paths at dispatch time — no project file to fill in up front.' +
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
