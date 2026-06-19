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
Commerce, metadata, and Salesforce CLI projects. Its main job is to fire the right skill at the
right time. Each skill carries its own safety rules, quality gates, and domain knowledge, so this
baseline routes to them and adds only the cross-cutting deployment and git guardrails below.
Follow these rules unless the user explicitly overrides them.

> **Two entry paths.** For a planned feature, start with `/sf-plan` (it writes a design contract
> to `docs/tech-spec.md`) and build it with `/sf-build`. The routing below governs everything else
> — ad-hoc edits, fixes, reviews, audits, config, and ops.

---

## Skill Routing

Every authoring and config skill self-triggers from its own `description` on the relevant files —
GitHub Copilot loads `generating-apex`, `generating-lwc-components`, `generating-flow`,
`generating-custom-object`, and the rest without a routing rule here. This baseline adds only what
a single skill's description can't carry on its own: the **review pass**, the cross-domain
pairings, and a couple of sequencing rules.

### Authoring

- Apex, LWC, Flows, and config metadata (objects, fields, permission sets, FlexiPages, validation
  rules, list views): the matching `generating-*` skill activates on its own trigger — let it.
- **TDD for Apex** — author or extend the test class first (`/skill generating-apex-test`), then
  implement the minimum to make it pass (`/skill generating-apex`). Exceptions: metadata-only
  changes, trivial non-logic edits, and user-declared prototypes or spikes.
- **Deploying** metadata, generating a `package.xml` / manifest, validate / quick-deploy, or CI/CD
  → `/skill deploying-metadata`.

### Review

Review is a **discrete pass at the end of a build**, not a step chained onto every edit. Run the
skill matching the artifact under review — when a `code-reviewer` agent is dispatched, on an
explicit review/audit request, or as the quality gate once a feature is built. When an artifact
spans two domains, load both, in the order shown.

| Artifact under review | Skill(s) |
|---|---|
| Apex — classes, triggers, services, or test classes | `/skill reviewing-apex` |
| Apex exposing `@AuraEnabled` methods to LWC | `/skill reviewing-apex` · `/skill reviewing-lwc` |
| Lightning Web Components | `/skill reviewing-lwc` |
| LWC backed by an Apex controller | `/skill reviewing-lwc` · `/skill reviewing-apex` |
| Flows | `/skill reviewing-flow` |
| Flow calling an Apex invocable action | `/skill reviewing-flow` · `/skill reviewing-apex` |

For the deep code-quality gate after a build, dispatch the `code-reviewer` agent — it runs the
table above plus `/skill running-code-analyzer` over the delivered artifacts and reports defects
by severity. The `architect` agent is the separate governance gate (spec/scope completeness).

The authored skills in this repo — `/skill reviewing-apex`, `/skill reviewing-lwc`, and
`/skill reviewing-flow` — install into `.github/skills/` at setup (see the README). All other
skills referenced above come from `forcedotcom/sf-skills`
(install: `npx skills add forcedotcom/sf-skills`).

## Deployment & git safety

These guardrails are not optional and hold for every task, including work done by dispatched agents:

- **Never run `git commit`, `git push`, or any variant** (amend, force-push, rebase, tag push)
  unless the user explicitly asks for it in the current message — do not infer it from context or
  plan approval. The one exception is **checkpoint mode**: an explicit per-task grant (e.g.
  *"checkpoint as you go"*) under which the main agent commits at stable points on a dedicated
  `checkpoint/<task-slug>` branch. Plan approval alone is not a grant, and the grant expires when
  the task completes.
- **Never deploy to a Salesforce org without explicit user approval.** Confirm the target org alias
  and manifest path first, and if the deploy includes destructive members, show the affected
  components and get explicit confirmation. You may run `sf project deploy validate` freely to
  support test-driven development — only the actual deploy needs approval.
- **No secrets.** Never put org credentials, session IDs, access tokens, or real customer data in
  code, tests, logs, or generated files.
