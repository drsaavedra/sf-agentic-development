# Setup Guide — Salesforce Skills & Agents

This template provides Salesforce-specific skills, agents, and baseline instructions for
**Claude Code**, **GitHub Copilot** (VS Code), and **Codex**. One set of source files;
three assistant targets.

---

## Repository Layout

```
skills/<name>/              ← 5 authored Salesforce skills (canonical source: SKILL.md + references/)
agents/<name>.md            ← 2 Salesforce agents (canonical source)
templates/baseline.md       ← single-source template for the three root files below
scripts/render-baselines.js ← regenerates the three renders from the template
CLAUDE.md                   ← Claude Code baseline (rendered — do not edit directly)
AGENTS.md                   ← Codex baseline (rendered — do not edit directly)
.github/copilot-instructions.md ← Copilot baseline (rendered — do not edit directly)
```

**How assistants discover skills**

| Assistant | Reads SKILL.md from |
|---|---|
| Claude Code | `.claude/skills/<name>/SKILL.md` |
| Copilot (VS Code) | `.claude/skills/`, `.github/skills/`, or `.agents/skills/` — any one |
| Codex | `.agents/skills/<name>/SKILL.md` |

All three use the same `name` + `description` frontmatter format. Install once into the
right directory per assistant (see below).

---

## Planned Installer (coming soon)

> **Future:** `npx skills-agents add drsaavedra/sf-agentic-development`
>
> An interactive CLI that will:
> 1. Show the skill list — pick which ones to install (or install all).
> 2. Show the agent list (`salesforce-developer`, `architect`) — pick which ones to install (or install all).
> 3. Ask which assistant you use: Claude Code / Copilot / Codex.
> 4. Copy skills and agents into the correct per-assistant directories.
> 5. Generate the appropriate root baseline file
>    (`CLAUDE.md`, `AGENTS.md`, or `.github/copilot-instructions.md`).
>
> Until this ships, follow the manual steps below.

---

## Manual Setup

### Step 1 — Install the authored Salesforce skills

Copy the `skills/` folder into the assistant-specific directory for your project:

```bash
# Claude Code
cp -r skills/* .claude/skills/

# GitHub Copilot (VS Code)  — choose one location; Copilot reads all three
cp -r skills/* .github/skills/
# or
cp -r skills/* .claude/skills/   # Copilot also reads .claude/skills/

# Codex
cp -r skills/* .agents/skills/
```

### Step 2 — Install the community Salesforce skills

```bash
npx skills add forcedotcom/sf-skills
```

This installs 50+ official Salesforce skills (`generating-apex`, `generating-apex-test`,
`generating-lwc-components`, `deploying-metadata`, `querying-soql`, `running-apex-tests`,
`running-code-analyzer`, `handling-sf-data`, `building-sf-integrations`, `generating-flow`,
`fetching-salesforce-docs`, and more).

### Step 3 — Install the Karpathy behavioral guidelines

**Claude Code** (plugin — updates flow through automatically):

```
/plugin marketplace add forrestchang/andrej-karpathy-skills
/plugin install andrej-karpathy-skills@karpathy-skills
```

**Codex / Copilot** (no plugin support — install as a skill):

```bash
npx skills add forrestchang/andrej-karpathy-skills
```

(or copy `skills/karpathy-guidelines/` from that repo into `.agents/skills/` for Codex,
`.github/skills/` for Copilot)

### Step 4 — Install the agents

Copy the `agents/` folder into the assistant-specific directory for your project:

```bash
# Claude Code
cp -r agents/* .claude/agents/

# GitHub Copilot (VS Code)
cp -r agents/* .github/agents/

# Codex
cp -r agents/* .agents/agents/
```

### Step 5 — Add the baseline file

Copy the appropriate root file from this repo into the root of your Salesforce project:

| Assistant | File to copy |
|---|---|
| Claude Code | `CLAUDE.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Codex | `AGENTS.md` |

Then fill in the baseline's **Agent → Spec Doc Map** section with your project's spec document paths.

If this project is a Commerce org, also set the **Commerce project flag** in the baseline's
**Project Conventions** section (see the next step).

### Step 5a (optional) — Commerce projects (set the Commerce flag)

`salesforce-commerce-b2b` is **gated on the Commerce flag in the baseline's Project Conventions
section**, never on file content. Setting
the flag turns the skill on for the whole project, in two ways:

- **Authoring** — it overlays the `generating-*` skill so generated Apex/LWC/Flow is Commerce-aware from
  the start.
- **Review** — it chains after the matching `salesforce-*-quality` skill as a Commerce-domain review
  pass over the generated artifact.

**To set the flag**, either edit the **Commerce project flag** bullet in the **Project Conventions**
section of your baseline file
(`CLAUDE.md` / `AGENTS.md` / `.github/copilot-instructions.md`) to declare *"This **is** a Commerce
org."*, or simply tell the agent **"This is a Commerce project"** and let it update that section for you.
This is a one-time setup — once the flag is set, the routing applies on every Apex/LWC/Flow task.

> The flag is a routing instruction the agent follows; it works the same across Claude Code, Codex, and
> Copilot — no hooks or per-assistant configuration required. (A future `npx` installer may offer this as
> a setup checkbox.)

Leave the flag unset for non-Commerce orgs — `salesforce-commerce-b2b` then never fires. For a mixed
CRM+Commerce org, either set the flag (and accept the overlay + review chain on all Apex/LWC/Flow work)
or leave it unset and invoke `salesforce-commerce-b2b` manually on the Commerce pieces.

### Step 6 (optional) — Superpowers

For brainstorming, plan-writing, TDD, debugging, and other workflow skills:

```
https://superpowers.ai
```

---

## Maintaining This Template

The five skills in `skills/` and two agents in `agents/` are the **only** source of truth.
Do not edit the `.claude/skills/`, `.github/skills/`, or `.agents/skills/` copies directly —
changes will be lost on the next install. Edit the skill folder under `skills/<name>/` (the
`SKILL.md` and any `references/` files it contains) and re-run Step 1.

The three root files (`CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`) are all
rendered from `templates/baseline.md` — never edit them by hand. Edit the template, then
regenerate all three:

```bash
node scripts/render-baselines.js
```
