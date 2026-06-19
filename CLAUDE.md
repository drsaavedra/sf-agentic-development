<!--
  SALESFORCE PROJECT TEMPLATE — Claude Code baseline
  Rendered from: templates/baseline.md — DO NOT EDIT DIRECTLY.
  Re-render with: node scripts/render-baselines.js
  Companion files (same routing content, assistant-specific syntax):
    AGENTS.md                        (Codex)
    .github/copilot-instructions.md  (GitHub Copilot)
  Canonical skills:  skills/*/SKILL.md   (installed into .claude/skills/ at setup)
  Canonical agents:  agents/*.md         (installed into .claude/agents/ at setup)
-->

# Salesforce Project — Claude Baseline

Routing rules for Claude Code working on Salesforce — Apex, LWC, Experience Cloud, B2B
Commerce, metadata, and Salesforce CLI projects. Its main job is to fire the right skill at the
right time. Each skill carries its own safety rules, quality gates, and domain knowledge, so this
baseline routes to them and adds only the cross-cutting deployment and git guardrails below.
Follow these rules unless the user explicitly overrides them.

> **Two entry paths.** For a planned feature, start with `/sf-plan` (it writes a design contract
> to `docs/CONTEXT.md` + per-story `docs/contracts/<slug>.md`) and build it with `/sf-build`. The routing below governs everything else
> — ad-hoc edits, fixes, reviews, audits, config, and ops.

---

## Authoring & Config Routing

Match the active context to its skill and invoke it before building. This table is the fast routing
index; each skill also self-triggers from its own `description` on the relevant files, so the table
is the primary path, not the only one.

| Context | Skill |
|---|---|
| Apex — write/edit/refactor a class, trigger, service, selector, batch/queueable/schedulable, invocable, `@AuraEnabled` controller, or `@RestResource` endpoint | `generating-apex` |
| Apex **test** classes — TestDataFactory, bulk (251+), coverage, test-fix loops | `generating-apex-test` |
| Lightning Web Components — create/edit a bundle, wire service, Jest specs | `generating-lwc-components` |
| Styling UI to SLDS — blueprints, styling hooks, utility classes, icons; modals, forms, data tables, theming, dark mode | `applying-slds` |
| Flows — screen, record-triggered (before/after-save), scheduled, autolaunched; "when a record is created/updated", automation | `generating-flow` |
| Custom objects | `generating-custom-object` |
| Custom fields — formula, roll-up summary, lookup, master-detail, picklist | `generating-custom-field` |
| Custom tabs — object tabs, web tabs, Visualforce/Lightning component & page tabs; navigation for a custom object | `generating-custom-tab` |
| Custom applications — tab-based apps, App Launcher navigation, branding, action overrides | `generating-custom-application` |
| Permission sets — object/field permissions, FLS, tab visibility | `generating-permission-set` |
| Lightning pages (FlexiPages) — record/app/home pages | `generating-flexipage` |
| Validation rules | `generating-validation-rule` |
| List views | `generating-list-view` |
| A complete multi-component Lightning app from a description | `generating-lightning-app` |
| Run Apex tests / check coverage / fix failing tests | `running-apex-tests` |
| Analyze debug logs, governor limits, stack traces | `debugging-apex-logs` |
| Write or optimize SOQL/SOSL queries | `querying-soql` |
| Bulk data import/export, seed or clean org records, test data | `handling-sf-data` |
| Named Credentials, External Services, REST/SOAP callouts, Platform Events, CDC | `building-sf-integrations` |
| Static analysis / code scan (PMD, ESLint, Flow, SFGE, RetireJS) | `running-code-analyzer` |
| Deploy metadata, generate a `package.xml` / manifest, validate / quick-deploy, or CI/CD | `deploying-metadata` |

> **TDD for Apex** — author or extend the test class first (`generating-apex-test`), then
> implement the minimum to make it pass (`generating-apex`). Exceptions: metadata-only
> changes, trivial non-logic edits, and user-declared prototypes or spikes.
>
> **LWC ↔ SLDS bridge.** When building or restyling LWC UI, pair `generating-lwc-components`
> with `applying-slds` (SLDS blueprints, styling hooks, utility classes, icons) — the LWC
> skill covers SLDS conceptually but its own cross-skill delegation does **not** route to it. To
> audit an existing component for SLDS compliance (scorecard / production-readiness check), use
> `validating-slds`.

## Review Routing

Review is a **discrete pass at the end of a build**, not a step chained onto every edit. Run the
skill matching each artifact under review — when a `code-reviewer` agent is dispatched, on an
explicit review/audit request, or as the quality gate once a feature is built. A changeset that
spans domains loads each matching skill: an Apex class and an LWC fire both rows below on their own.
Each `reviewing-*` skill names its cross-domain partner under its own **Cross-Skill Integration**
(e.g. an LWC with an `@AuraEnabled` Apex controller pulls in `reviewing-apex` alongside).

| Artifact under review | Skill |
|---|---|
| Apex — classes, triggers, services, or test classes | `reviewing-apex` |
| Lightning Web Components | `reviewing-lwc` |
| Flows | `reviewing-flow` |

For the deep code-quality gate after a build, dispatch the `code-reviewer` agent — it runs the
table above plus `running-code-analyzer` over the delivered artifacts and reports defects
by severity. The `architect` agent is the separate governance gate (spec/scope completeness).

The authored skills in this repo — `reviewing-apex`, `reviewing-lwc`, and
`reviewing-flow` — install into `.claude/skills/` at setup (see the README). All other
skills referenced above come from `forcedotcom/sf-skills`
(install: `npx skills add forcedotcom/sf-skills`).

## Deployment & git safety

These guardrails are not optional and hold for every task, including work done by dispatched agents:

- **Never run `git commit`, `git push`, or any variant** (amend, force-push, rebase, tag push)
  unless commits are explicitly granted — do not infer from context or plan approval. The one
  exception is **checkpoint mode**, granted either in the current message (e.g. *"checkpoint as you
  go"*) or at planning time via `sf-plan`'s checkpoint question, recorded as
  `Checkpoint commits: enabled` in `docs/CONTEXT.md`. Under it the **main agent** commits at stable
  points — including each work item as it passes review, which land on the **current working branch**
  so a handover can reference them by hash; throwaway rollback checkpoints may instead use a
  dedicated `checkpoint/<task-slug>` branch (full rule: `docs/ORCHESTRATION.md`). Plan approval alone
  is **not** a grant (approving the plan ≠ answering the checkpoint question), **subagents never
  commit**, and the grant expires when the task completes.
- **Never deploy to a Salesforce org without explicit user approval.** Confirm the target org alias
  and manifest path first, and if the deploy includes destructive members, show the affected
  components and get explicit confirmation. You may run `sf project deploy validate` freely to
  support test-driven development — only the actual deploy needs approval.
- **No secrets.** Never put org credentials, session IDs, access tokens, or real customer data in
  code, tests, logs, or generated files.
