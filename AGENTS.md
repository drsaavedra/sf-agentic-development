<!--
  SALESFORCE PROJECT TEMPLATE — Codex baseline
  Rendered from: templates/baseline.md — DO NOT EDIT DIRECTLY.
  Re-render with: node scripts/render-baselines.js
  Companion files (same routing content, assistant-specific syntax):
    CLAUDE.md                        (Claude Code)
    .github/copilot-instructions.md  (GitHub Copilot)
  Canonical skills:  skills/*/SKILL.md   (installed into .agents/skills/ at setup)
  Canonical agents:  agents/*.md         (installed into .agents/agents/ at setup)
-->

# Salesforce Project — Codex Baseline

Routing rules for Codex working on Salesforce — Apex, LWC, Experience Cloud, B2B
Commerce, metadata, and Salesforce CLI projects. This file does one job: fire the right skill at
the right time. Each skill carries its own safety rules, quality gates, and domain knowledge, so
this baseline only routes to them. Follow these rules unless the user explicitly overrides them.

> **Two entry paths.** For a planned feature, start with `/sf-plan` (it writes a design contract
> to `docs/tech-spec.md`) and build it with `/sf-build`. The routing below governs everything else
> — ad-hoc edits, fixes, reviews, audits, config, and ops.

---

## Skill Routing

Invoke the appropriate skill **before** generating any artifact. Use the skill that best matches
the active context.

> `generating-*` skills are for authoring — new files and edits including bug fixes.
> `reviewing-*` skills are for review.

**Always chain authoring → review.** Whenever a `generating-*` skill authors or edits code, chain
the matching `reviewing-*` skill as a review pass over what you just produced — generation is not
done until the review skill has run. The pairs:
- `generating-apex` / `generating-apex-test` → `reviewing-apex`
- `generating-lwc-components` → `reviewing-lwc`
- `generating-flow` → `reviewing-flow`

For a review-only task (no authoring), invoke the `reviewing-*` skill on its own.

| Context | Skill(s) — invoke in order |
|---|---|
| Writing, editing, refactoring, or fixing Apex classes, triggers, services | `generating-apex` → then chain `reviewing-apex` |
| Writing or editing Apex test classes | `generating-apex-test` → then chain `reviewing-apex` |
| Reviewing Apex classes, triggers, services, or test classes (review-only) | `reviewing-apex` |
| Reviewing Apex that includes `@AuraEnabled` methods | `reviewing-apex` · `reviewing-lwc` |
| Running Apex tests / coverage | `running-apex-tests` |
| Debugging Apex logs | `debugging-apex-logs` |
| Creating / editing LWC components | `generating-lwc-components` → then chain `reviewing-lwc` |
| Reviewing LWC components (review-only) | `reviewing-lwc` |
| Reviewing LWC component backed by an Apex controller | `reviewing-lwc` · `reviewing-apex` |
| Creating or editing Flows | `generating-flow` → then chain `reviewing-flow` |
| Reviewing Flows (review-only) | `reviewing-flow` |
| Reviewing Flow that calls an Apex invocable action | `reviewing-flow` · `reviewing-apex` |
| Creating custom objects | `generating-custom-object` |
| Creating custom fields | `generating-custom-field` |
| Creating permission sets | `generating-permission-set` |
| Creating Lightning pages (FlexiPages) | `generating-flexipage` |
| Creating validation rules | `generating-validation-rule` |
| Creating list views | `generating-list-view` |
| Deploying metadata, generating a `package.xml` / manifest, building a git delta (sgd) from a commit or range, deploying reference data (SFDMU), CI/CD | `deploying-sf-metadata` · `deploying-metadata` |
| Querying org data (SOQL) | `querying-soql` |
| Handling org data (import/export) | `handling-sf-data` |
| Named Credentials / External Services / callouts | `building-sf-integrations` |
| Running code analysis (PMD/CodeAnalyzer) | `running-code-analyzer` |
| Building a complete Lightning app | `generating-lightning-app` |

**Test-Driven Development (skill sequencing)**
- New Apex classes or logic changes: author or extend the test class first
  (`generating-apex-test`), then implement the minimum to make it pass
  (`generating-apex`). The red/green validate mechanics live in those skills.
- LWC: after generating a component, spot-check it against `reviewing-lwc`. A Jest spec
  (sfdx-lwc-jest) is recommended, not required — generate one when the user asks.
- Exceptions: metadata-only changes, trivial non-logic edits, and user-declared prototypes or
  spikes.

The authored skills in this repo — `reviewing-apex`, `reviewing-lwc`,
`reviewing-flow`, and `deploying-sf-metadata` — install into `.agents/skills/` at
setup (see the README). All other skills above come from `forcedotcom/sf-skills`
(install: `npx skills add forcedotcom/sf-skills`).
