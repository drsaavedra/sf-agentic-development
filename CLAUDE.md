<!--
  SALESFORCE PROJECT — Claude Code instruction file.
  This file is hand-maintained — edit it directly. It is the canonical source the installer
  injects into a project's CLAUDE.md as a managed block.
  Canonical rules:   rules/*.md             (installed into .claude/rules/sf-agentic-development/)
  Canonical skills:  skills/*/SKILL.md      (installed into .claude/skills/ at setup)
  Canonical agents:  agents/*.md            (installed into .claude/agents/ at setup)
  Keep this file a pointer. Rules belong in rules/*.md so they compose with whatever else
  the project keeps in its own CLAUDE.md, and so each can be scoped with `paths:` frontmatter.
-->

# Salesforce Project — Claude Baseline

Rules for Claude Code working on Salesforce — Apex, LWC, Experience Cloud, B2B Commerce,
metadata, and Salesforce CLI projects. Claude's base model authors Salesforce code and metadata
directly from trained knowledge; the authored skills add the two things the model can't be
trusted to carry alone — proprietary domain surfaces (`generating-b2b-lwc`) and this project's
quality bar (`reviewing-*`). Follow these rules unless the user explicitly overrides them.

The rules themselves live in `.claude/rules/sf-agentic-development/`, one file per topic:

| Rule file | Covers | Loads |
|---|---|---|
| `pipeline.md` | The three human-gated stages — Research → Plan → Build — and the `/sf-research` domain → doc routing | every session |
| `authoring.md` | How Claude authors Apex, LWC, Flows and metadata: TDD, objective gates, knowledge-cutoff guard, schema truth, sf CLI | every session |
| `review-routing.md` | Which `reviewing-*` skill to run against which artifact, and when a change is too small to need one | when Claude opens a Salesforce artifact |
| `safety.md` | Deploy and git guardrails — scratch-org deploys run and report, every other deploy asks first; local commits run, push and merge ask; no secrets | every session |

`review-routing.md` carries `paths:` frontmatter so it loads only when Claude touches Salesforce
files. The other three are unconditional. `safety.md` must stay that way: a path-scoped guardrail
would be missing from precisely the sessions that never open a Salesforce file.

All skills referenced in these rules are authored in this repo and install into `.claude/skills/`
at setup (see the README). There are no external skill dependencies.
