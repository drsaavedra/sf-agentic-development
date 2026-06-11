# sf-agentic-development

A developer productivity toolkit for **Claude Code**, **GitHub Copilot**, and **Codex** — skills and agents that keep you in the driver's seat while AI handles the heavy lifting.

The skills encode hard-won Salesforce quality rules — bulk safety, security, architecture patterns, anti-patterns — that fire automatically based on what you're building.

The agents provide on-demand specialisation. The main agent handles config planning and QA reasoning inline, since it already has your conversation context. The `salesforce-developer` agent runs Apex work in an isolated context, parallelizable across several instances at once. The `architect` agent gives you an independent technical review when you want one.

Agents are deliberately thin — the domain knowledge lives in the skills, which every agent shares. Project-specific constraints (e.g. additive-only, or reusing an existing logging framework) are passed in the work brief, not hardcoded into the agents.

This repo evolves continuously: new Salesforce releases, better agentic patterns, and improved practices get folded in over time. See [CHANGELOG.md](CHANGELOG.md) for what changed between pulls.

---

## What's Inside

### Skills (authored)

| Skill | Covers |
|---|---|
| `salesforce-apex-quality` | Governor limits, trigger design, security, architecture, async, error handling, testing |
| `salesforce-lwc-quality` | Component architecture, data sourcing, directives, async/events, performance, Jest |
| `salesforce-flow-quality` | Entry-condition discipline, loop/collection/Transform optimization, fault handling and Custom Error, async paths, recursion, hardcoded IDs, complexity, flow tests, naming |
| `salesforce-deployment` | Deployment safety rules, `package.xml` / git-delta (sgd) generation, validate → quick-deploy, CI/CD patterns, and SFDMU data deployments |
| `salesforce-commerce-b2b` | B2B Commerce domain rules |

### Agents

| Agent | Role |
|---|---|
| `salesforce-developer` | Receives a brief from the main agent; builds Apex following TDD in an isolated, parallelizable context; quality rules and project constraints come from the skills and brief; produces a build summary |
| `architect` | On-demand independent review — pre-implementation, post-implementation, or both; flags project-specific constraint violations (e.g. additive-only) only when the spec/brief/ADRs impose them; produces a gap-analysis report |

### Baselines

`CLAUDE.md`, `AGENTS.md`, and `.github/copilot-instructions.md` are rendered from `templates/baseline.md` by `scripts/render-baselines.js` — one source of truth for skill routing, safety rules, and the agent→doc map across all three assistants.

---

## Setup

### Install (interactive)

From the **root of your Salesforce project** (requires Node 18+):

```bash
npx github:drsaavedra/sf-agentic-development
```

The installer asks four questions — which assistant you use (Claude Code / GitHub Copilot /
Codex), which skills to install, which agents to install, and whether this is a B2B Commerce
project — then copies everything into the right per-assistant directories, drops the matching
baseline file (`CLAUDE.md`, `.github/copilot-instructions.md`, or `AGENTS.md`) into your
project root, and sets the Commerce flag in it if you said yes.

### After the installer

1. Install the community Salesforce skills — 50+ official skills (`generating-apex`,
   `generating-lwc-components`, `deploying-metadata`, `querying-soql`, and more):
   ```bash
   npx skills add forcedotcom/sf-skills
   ```
2. Install the Karpathy behavioral guidelines:
   - **Claude Code** (plugin — updates flow through automatically):
     ```
     /plugin marketplace add forrestchang/andrej-karpathy-skills
     /plugin install andrej-karpathy-skills@karpathy-skills
     ```
   - **Codex / Copilot** (no plugin support — install as a skill):
     ```bash
     npx skills add forrestchang/andrej-karpathy-skills
     ```
3. Fill in the baseline's **Agent → Spec Doc Map** section with your project's spec document paths.
4. *(Optional)* [Superpowers](https://superpowers.ai) for brainstorming, plan-writing, TDD, and
   debugging workflow skills.

### Commerce projects

`salesforce-commerce-b2b` is **gated on the Commerce flag in the baseline's Project Conventions
section**, never on file content. When set, it overlays the `generating-*` skill during
authoring (so generated Apex/LWC/Flow is Commerce-aware from the start) and chains after the
matching `salesforce-*-quality` skill as a Commerce-domain review pass.

Three ways to set it: answer **yes** to the installer's Commerce question, edit the **Current
setting** line in the baseline's **Commerce project flag** bullet, or simply tell the agent
*"This is a Commerce project"* and let it update the section. One-time setup — once set, the
routing applies on every Apex/LWC/Flow task, the same across all three assistants.

Leave the flag unset for non-Commerce orgs — the skill then never fires. For a mixed
CRM+Commerce org, either set the flag (and accept the overlay + review chain on all
Apex/LWC/Flow work) or leave it unset and invoke `salesforce-commerce-b2b` manually on the
Commerce pieces.

### Repository layout

```
skills/<name>/              ← 5 authored Salesforce skills (canonical source: SKILL.md + references/)
agents/<name>.md            ← 2 Salesforce agents (canonical source)
templates/baseline.md       ← single-source template for the three root files below
scripts/render-baselines.js ← regenerates the three renders from the template
scripts/install.js          ← the interactive installer (npx entry point)
CLAUDE.md                   ← Claude Code baseline (rendered — do not edit directly)
AGENTS.md                   ← Codex baseline (rendered — do not edit directly)
.github/copilot-instructions.md ← Copilot baseline (rendered — do not edit directly)
```

| Assistant | Reads SKILL.md from |
|---|---|
| Claude Code | `.claude/skills/<name>/SKILL.md` |
| Copilot (VS Code) | `.claude/skills/`, `.github/skills/`, or `.agents/skills/` — any one |
| Codex | `.agents/skills/<name>/SKILL.md` |

All three use the same `name` + `description` frontmatter format.

<details>
<summary><strong>Manual setup (no installer)</strong></summary>

1. Copy the skills into the assistant-specific directory of your project:
   ```bash
   cp -r skills/* .claude/skills/    # Claude Code (Copilot also reads this)
   cp -r skills/* .github/skills/    # GitHub Copilot
   cp -r skills/* .agents/skills/    # Codex
   ```
2. Copy the agents:
   ```bash
   cp -r agents/* .claude/agents/    # Claude Code
   cp -r agents/* .github/agents/    # GitHub Copilot
   cp -r agents/* .agents/agents/    # Codex
   ```
3. Copy the matching baseline into your project root:

   | Assistant | File to copy |
   |---|---|
   | Claude Code | `CLAUDE.md` |
   | GitHub Copilot | `.github/copilot-instructions.md` |
   | Codex | `AGENTS.md` |

4. Continue with [After the installer](#after-the-installer) above; for Commerce orgs, set the
   flag as described in [Commerce projects](#commerce-projects).

</details>

---

## Skill Routing

The baseline routes to the right skill automatically based on context. Cross-domain work (LWC + Apex controller, Flow + invocable Apex) loads both relevant skills:

| Context | Skills |
|---|---|
| Apex classes / triggers / services | `generating-apex` · `salesforce-apex-quality` |
| Apex test classes | `generating-apex-test` · `salesforce-apex-quality` |
| LWC components | `generating-lwc-components` · `salesforce-lwc-quality` |
| LWC + Apex controller | `salesforce-lwc-quality` · `salesforce-apex-quality` |
| Flows | `generating-flow` · `salesforce-flow-quality` |
| Flow + Apex invocable | `salesforce-flow-quality` · `salesforce-apex-quality` |
| Deployment / package.xml / CI-CD | `salesforce-deployment` · `deploying-metadata` |
| B2B Commerce *(when the Commerce flag is set)* | `salesforce-commerce-b2b` — overlay during authoring + review pass after the quality skill |

---

## Maintaining

- **Skills & agents** — `skills/` and `agents/` are the only source of truth. Edit `skills/<name>/` (the `SKILL.md` and its `references/`) or `agents/<name>.md`, then re-run the installer (or re-copy) into the per-assistant directories. Never edit the installed copies — changes are lost on the next install.
- **Baselines** — edit `templates/baseline.md` (its header comment documents the template token syntax), then run `node scripts/render-baselines.js` to regenerate the three renders. Never edit `CLAUDE.md`, `AGENTS.md`, or `.github/copilot-instructions.md` by hand.

## License

[MIT](LICENSE)
