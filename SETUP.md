# Setup Guide — Salesforce Skills & Agents

This template provides Salesforce-specific skills, agents, and baseline instructions for
**Claude Code**, **GitHub Copilot** (VS Code), and **Codex**. One set of source files;
three assistant targets.

---

## Repository Layout

```
skills/<name>/SKILL.md      ← 5 authored Salesforce skills (canonical source)
agents/<name>.md            ← 2 Salesforce agents (canonical source)
templates/baseline.md       ← single-source template for the three root files below
CLAUDE.md                   ← Claude Code baseline (rendered from template)
AGENTS.md                   ← Codex baseline (rendered from template)
.github/copilot-instructions.md ← Copilot baseline (rendered from template)
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

```bash
/plugin marketplace add forrestchang/andrej-karpathy-skills
/plugin install andrej-karpathy-skills@karpathy-skills
```

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

Then fill in the **Agent → Spec Doc Map** in Priority 5 with your project's spec document paths.

### Step 6 (optional) — Superpowers

For brainstorming, plan-writing, TDD, debugging, and other workflow skills:

```
https://superpowers.ai
```

---

## Maintaining This Template

The five skills in `skills/` and two agents in `agents/` are the **only** source of truth.
Do not edit the `.claude/skills/`, `.github/skills/`, or `.agents/skills/` copies directly —
changes will be lost on the next install. Edit `skills/<name>/SKILL.md` and re-run Step 1.

The three root files (`CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`) are all
rendered from `templates/baseline.md`. If you change the baseline content, update all three
files and keep their Priority sections in sync.
