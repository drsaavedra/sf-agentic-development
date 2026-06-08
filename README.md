# sf-agentic-development

A living toolkit of Salesforce skills and agents for **Claude Code**, **GitHub Copilot**, and **Codex** — built around the idea that one person, paired with the right AI setup, can operate as a full Salesforce consulting team.

The skills encode hard-won quality rules (bulk safety, security, architecture patterns, anti-patterns). The agents act as team roles — functional consultant, solution architect, developer, QA engineer — each with a defined scope and output. Together they cover the delivery lifecycle from requirements through deployment.

This repo evolves continuously: new Salesforce releases, better agentic patterns, and improved practices get folded in over time.

---

## What's Inside

### Skills (authored)

| Skill | Covers |
|---|---|
| `salesforce-apex-quality` | Governor limits, trigger design, security, architecture, async, error handling, testing |
| `salesforce-lwc-quality` | Component architecture, data sourcing, directives, async/events, performance, Jest |
| `salesforce-flow-quality` | Fault handling, DML-in-loop, hardcoded IDs, recursion, complexity, naming |
| `salesforce-deployment` | Deployment safety rules and CI/CD patterns |
| `salesforce-commerce-b2b` | B2B Commerce domain rules |

### Agents

| Agent | Role |
|---|---|
| `functional-consultant` | Translates requirements into a configuration summary |
| `solution-architect` | Reviews architecture and produces a design report |
| `salesforce-developer` | Builds from a technical spec; produces a build summary |
| `qa-engineer` | Writes and runs test scripts; produces live test results |

### Baselines

`CLAUDE.md`, `AGENTS.md`, and `.github/copilot-instructions.md` are all rendered from `templates/baseline.md` — one source of truth for skill routing, safety rules, and the agent→doc map across all three assistants.

---

## Setup

### 1. Install the authored skills

```bash
# Claude Code
cp -r skills/* .claude/skills/

# GitHub Copilot
cp -r skills/* .github/skills/

# Codex
cp -r skills/* .agents/skills/
```

### 2. Install the community Salesforce skills

```bash
npx skills add forcedotcom/sf-skills
```

Installs 50+ official skills: `generating-apex`, `generating-lwc-components`, `deploying-metadata`, `querying-soql`, `running-apex-tests`, `generating-flow`, and more.

### 3. Install the Karpathy behavioral guidelines

```
/plugin marketplace add forrestchang/andrej-karpathy-skills
/plugin install andrej-karpathy-skills@karpathy-skills
```

### 4. Install the agents

```bash
# Claude Code
cp -r agents/* .claude/agents/

# GitHub Copilot
cp -r agents/* .github/agents/

# Codex
cp -r agents/* .agents/agents/
```

### 5. Add the baseline file

Copy the appropriate root file into your Salesforce project:

| Assistant | File |
|---|---|
| Claude Code | `CLAUDE.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Codex | `AGENTS.md` |

Then fill in the **Agent → Spec Doc Map** in Priority 5 with your project's document paths.

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
| Deployment / CI-CD | `salesforce-deployment-rules` · `deploying-metadata` |
| B2B/B2C Commerce | `salesforce-commerce-domain-rules` |

---

## Maintaining

Edit skills in `skills/<name>/SKILL.md` — not the installed copies in `.claude/skills/` or equivalent.

Edit baseline content in `templates/baseline.md`, then keep `CLAUDE.md`, `AGENTS.md`, and `.github/copilot-instructions.md` in sync.
