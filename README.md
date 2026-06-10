# sf-agentic-development

A developer productivity toolkit for **Claude Code**, **GitHub Copilot**, and **Codex** — skills and agents that keep you in the driver's seat while AI handles the heavy lifting.

The skills encode hard-won Salesforce quality rules (bulk safety, security, architecture patterns, anti-patterns) that fire automatically based on what you're building. The agents provide on-demand specialisation: the main agent handles config planning and QA reasoning inline (it already has your conversation context); the `salesforce-developer` agent runs Apex work in an isolated context (parallelizable across several at once), drawing its quality rules from the skills rather than baked-in conventions; the `architect` agent gives you an independent technical review when you want one.

Agents are deliberately thin — the domain knowledge lives in the skills, which every agent shares. Project-specific constraints (e.g. additive-only, or reusing an existing logging framework) are passed in the work brief, not hardcoded into the agents.

This repo evolves continuously: new Salesforce releases, better agentic patterns, and improved practices get folded in over time.

---

## What's Inside

### Skills (authored)

| Skill | Covers |
|---|---|
| `salesforce-apex-quality` | Governor limits, trigger design, security, architecture, async, error handling, testing |
| `salesforce-lwc-quality` | Component architecture, data sourcing, directives, async/events, performance, Jest |
| `salesforce-flow-quality` | Fault handling, DML-in-loop, hardcoded IDs, recursion, complexity, naming |
| `salesforce-deployment` | Deployment safety rules, `package.xml` / git-delta generation, and CI/CD patterns |
| `salesforce-commerce-b2b` | B2B Commerce domain rules |

### Agents

| Agent | Role |
|---|---|
| `salesforce-developer` | Receives a brief from the main agent; builds Apex following TDD in an isolated, parallelizable context; quality rules and project constraints come from the skills and brief; produces a build summary |
| `architect` | On-demand independent review — pre-implementation, post-implementation, or both; flags project-specific constraint violations (e.g. additive-only) only when the spec/brief/ADRs impose them; produces a gap-analysis report |

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

### 6. (Commerce orgs only) Set the Commerce flag

If this is a Salesforce B2B Commerce project, paste this once into your agent. It edits the **Commerce project flag** in your baseline file so the setting persists across sessions:

```text
This is a Commerce project. Set the Priority 4 "Commerce project flag" to SET in my baseline
instructions file — CLAUDE.md (Claude Code), AGENTS.md (Codex), or
.github/copilot-instructions.md (Copilot) — so the salesforce-commerce-b2b skill applies to all
Apex/LWC/Flow work from now on.
```

One prompt covers all three assistants — each edits the baseline file it already auto-loads, so no per-agent variant is needed. After that, the agent loads `salesforce-commerce-b2b` on every Apex/LWC/Flow task — as an overlay during authoring and a review pass after the quality skills. Leave the flag unset for non-Commerce orgs. *(A future `npx` installer may offer this as a checkbox.)*

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

Edit skills in `skills/<name>/SKILL.md` — not the installed copies in `.claude/skills/` or equivalent.

Edit baseline content in `templates/baseline.md`, then keep `CLAUDE.md`, `AGENTS.md`, and `.github/copilot-instructions.md` in sync.
