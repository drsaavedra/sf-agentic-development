<!--
  SALESFORCE PROJECT TEMPLATE — GitHub Copilot baseline
  Rendered from: templates/baseline.md — DO NOT EDIT DIRECTLY.
  Re-render with: node scripts/render-baselines.js
  Companion files (same routing content, assistant-specific syntax):
    CLAUDE.md                        (Claude Code)
    AGENTS.md                        (Codex)
  Canonical skills:  skills/*/SKILL.md   (installed into .github/skills/ at setup)
  Canonical agents:  agents/*.md         (installed into .github/agents/ at setup)
-->

# Salesforce Project — GitHub Copilot Baseline

Routing rules for GitHub Copilot working on Salesforce — Apex, LWC, Experience Cloud, B2B
Commerce, metadata, and Salesforce CLI projects. This file does one job: fire the right skill at
the right time. Each skill carries its own safety rules, quality gates, and domain knowledge, so
this baseline only routes to them. Follow these rules unless the user explicitly overrides them.

---

## Skill Routing

Use the appropriate skill **before** generating any artifact. Use the skill that best matches
the active context.

> `generating-*` skills are for authoring — new files and edits including bug fixes.
> `reviewing-*` skills are for review.

**Always chain authoring → review.** Whenever a `generating-*` skill authors or edits code, chain
the matching `reviewing-*` skill as a review pass over what you just produced — generation is not
done until the review skill has run. The pairs:
- `/skill generating-apex` / `/skill generating-apex-test` → `/skill reviewing-apex`
- `/skill generating-lwc-components` → `/skill reviewing-lwc`
- `/skill generating-flow` → `/skill reviewing-flow`

For a review-only task (no authoring), invoke the `reviewing-*` skill on its own.

| Context | Skill(s) — invoke in order |
|---|---|
| Writing, editing, refactoring, or fixing Apex classes, triggers, services | `/skill generating-apex` → then chain `/skill reviewing-apex` |
| Writing or editing Apex test classes | `/skill generating-apex-test` → then chain `/skill reviewing-apex` |
| Reviewing Apex classes, triggers, services, or test classes (review-only) | `/skill reviewing-apex` |
| Reviewing Apex that includes `@AuraEnabled` methods | `/skill reviewing-apex` · `/skill reviewing-lwc` |
| Running Apex tests / coverage | `/skill running-apex-tests` |
| Debugging Apex logs | `/skill debugging-apex-logs` |
| Creating / editing LWC components | `/skill generating-lwc-components` → then chain `/skill reviewing-lwc` |
| Reviewing LWC components (review-only) | `/skill reviewing-lwc` |
| Reviewing LWC component backed by an Apex controller | `/skill reviewing-lwc` · `/skill reviewing-apex` |
| Creating or editing Flows | `/skill generating-flow` → then chain `/skill reviewing-flow` |
| Reviewing Flows (review-only) | `/skill reviewing-flow` |
| Reviewing Flow that calls an Apex invocable action | `/skill reviewing-flow` · `/skill reviewing-apex` |
| Creating custom objects | `/skill generating-custom-object` |
| Creating custom fields | `/skill generating-custom-field` |
| Creating permission sets | `/skill generating-permission-set` |
| Creating Lightning pages (FlexiPages) | `/skill generating-flexipage` |
| Creating validation rules | `/skill generating-validation-rule` |
| Creating list views | `/skill generating-list-view` |
| Deploying metadata, generating a `package.xml` / manifest, building a git delta (sgd) from a commit or range, deploying reference data (SFDMU), CI/CD | `/skill deploying-sf-metadata` · `/skill deploying-metadata` |
| Querying org data (SOQL) | `/skill querying-soql` |
| Handling org data (import/export) | `/skill handling-sf-data` |
| Named Credentials / External Services / callouts | `/skill building-sf-integrations` |
| Running code analysis (PMD/CodeAnalyzer) | `/skill running-code-analyzer` |
| Building a complete Lightning app | `/skill generating-lightning-app` |

**Test-Driven Development (skill sequencing)**
- New Apex classes or logic changes: author or extend the test class first
  (`/skill generating-apex-test`), then implement the minimum to make it pass
  (`/skill generating-apex`). The red/green validate mechanics live in those skills.
- LWC: after generating a component, spot-check it against `/skill reviewing-lwc`. A Jest spec
  (sfdx-lwc-jest) is recommended, not required — generate one when the user asks.
- Exceptions: metadata-only changes, trivial non-logic edits, and user-declared prototypes or
  spikes.

The authored skills in this repo — `/skill reviewing-apex`, `/skill reviewing-lwc`,
`/skill reviewing-flow`, and `/skill deploying-sf-metadata` — install into `.github/skills/` at
setup (see the README). All other skills above come from `forcedotcom/sf-skills`
(install: `npx skills add forcedotcom/sf-skills`).
