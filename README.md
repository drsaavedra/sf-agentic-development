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

## Setup (quick start)

Full step-by-step instructions live in **[SETUP.md](SETUP.md)**. The short version:

1. Copy `skills/*` into your assistant's skills directory — `.claude/skills/` (Claude Code), `.github/skills/` (Copilot), or `.agents/skills/` (Codex).
2. Install the community Salesforce skills: `npx skills add forcedotcom/sf-skills`.
3. Install the Karpathy behavioral guidelines — Claude Code via the plugin (`/plugin marketplace add forrestchang/andrej-karpathy-skills`, then `/plugin install andrej-karpathy-skills@karpathy-skills`); Codex/Copilot as a skill (`npx skills add forrestchang/andrej-karpathy-skills`).
4. Copy `agents/*` into your assistant's agents directory — `.claude/agents/`, `.github/agents/`, or `.agents/agents/`.
5. Copy the matching baseline into your project root — `CLAUDE.md` (Claude Code), `AGENTS.md` (Codex), or `.github/copilot-instructions.md` (Copilot) — then fill in its **Agent → Spec Doc Map** section.
6. **Commerce orgs only:** set the **Commerce project flag** in the baseline's Project Conventions section — or just tell the agent *"This is a Commerce project"* and it updates the section for you (details in SETUP.md).

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

- **Skills** — edit `skills/<name>/` (the `SKILL.md` and its `references/`), then re-copy into the per-assistant directories. Never edit the installed copies.
- **Baselines** — edit `templates/baseline.md`, then run `node scripts/render-baselines.js` to regenerate the three renders. Never edit `CLAUDE.md`, `AGENTS.md`, or `.github/copilot-instructions.md` by hand.

## License

[MIT](LICENSE)
