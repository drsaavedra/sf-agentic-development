# Salesforce Project — Baseline Template

<!--
  Single source for the three assistant baseline files. Do not edit the renders by hand.

  Render with:  node scripts/render-baselines.js
  Outputs:
    CLAUDE.md                           (Claude Code)
    AGENTS.md                           (Codex / OpenAI Codex CLI)
    .github/copilot-instructions.md     (GitHub Copilot — VS Code, GitHub.com)

  Template syntax (resolved by the script):
    {{ASSISTANT_NAME}}    "Claude Code" | "Codex" | "GitHub Copilot"
    {{TITLE_NAME}}        "Claude" | "Codex" | "GitHub Copilot"
    {{SKILLS_DIR}}        ".claude/skills" | ".agents/skills" | ".github/skills"
    {{P2_VERB}}           "Invoke" | "Invoke" | "Use"
    {{skill:name}}        `name` | `name` | `/skill name`
    <!-/- only:claude codex copilot -/-> ... <!-/- end:only -/->   (without the slashes)
                          block kept only for the listed targets

  This baseline only routes to skills. Operational safety, project conventions, B2B Commerce
  rules, and agent orchestration live in the skills, their reference packs, the agents, and the
  README — not here.

  Everything below the BODY marker is rendered; everything above it is ignored.
-->

<!-- BODY -->
# Salesforce Project — {{TITLE_NAME}} Baseline

Routing rules for {{ASSISTANT_NAME}} working on Salesforce — Apex, LWC, Experience Cloud, B2B
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
| Apex — write/edit/refactor a class, trigger, service, selector, batch/queueable/schedulable, invocable, `@AuraEnabled` controller, or `@RestResource` endpoint | {{skill:generating-apex}} |
| Apex **test** classes — TestDataFactory, bulk (251+), coverage, test-fix loops | {{skill:generating-apex-test}} |
| Lightning Web Components — create/edit a bundle, wire service, Jest specs | {{skill:generating-lwc-components}} |
| Styling UI to SLDS — blueprints, styling hooks, utility classes, icons; modals, forms, data tables, theming, dark mode | {{skill:applying-slds}} |
| Flows — screen, record-triggered (before/after-save), scheduled, autolaunched; "when a record is created/updated", automation | {{skill:generating-flow}} |
| Custom objects | {{skill:generating-custom-object}} |
| Custom fields — formula, roll-up summary, lookup, master-detail, picklist | {{skill:generating-custom-field}} |
| Custom tabs — object tabs, web tabs, Visualforce/Lightning component & page tabs; navigation for a custom object | {{skill:generating-custom-tab}} |
| Custom applications — tab-based apps, App Launcher navigation, branding, action overrides | {{skill:generating-custom-application}} |
| Permission sets — object/field permissions, FLS, tab visibility | {{skill:generating-permission-set}} |
| Lightning pages (FlexiPages) — record/app/home pages | {{skill:generating-flexipage}} |
| Validation rules | {{skill:generating-validation-rule}} |
| List views | {{skill:generating-list-view}} |
| A complete multi-component Lightning app from a description | {{skill:generating-lightning-app}} |
| Run Apex tests / check coverage / fix failing tests | {{skill:running-apex-tests}} |
| Analyze debug logs, governor limits, stack traces | {{skill:debugging-apex-logs}} |
| Write or optimize SOQL/SOSL queries | {{skill:querying-soql}} |
| Bulk data import/export, seed or clean org records, test data | {{skill:handling-sf-data}} |
| Named Credentials, External Services, REST/SOAP callouts, Platform Events, CDC | {{skill:building-sf-integrations}} |
| Static analysis / code scan (PMD, ESLint, Flow, SFGE, RetireJS) | {{skill:running-code-analyzer}} |
| Deploy metadata, generate a `package.xml` / manifest, validate / quick-deploy, or CI/CD | {{skill:deploying-metadata}} |

> **TDD for Apex** — author or extend the test class first ({{skill:generating-apex-test}}), then
> implement the minimum to make it pass ({{skill:generating-apex}}). Exceptions: metadata-only
> changes, trivial non-logic edits, and user-declared prototypes or spikes.
>
> **LWC ↔ SLDS bridge.** When building or restyling LWC UI, pair {{skill:generating-lwc-components}}
> with {{skill:applying-slds}} (SLDS blueprints, styling hooks, utility classes, icons) — the LWC
> skill covers SLDS conceptually but its own cross-skill delegation does **not** route to it. To
> audit an existing component for SLDS compliance (scorecard / production-readiness check), use
> {{skill:validating-slds}}.

## Review Routing

Review is a **discrete pass at the end of a build**, not a step chained onto every edit. Run the
skill matching each artifact under review — when a `code-reviewer` agent is dispatched, on an
explicit review/audit request, or as the quality gate once a feature is built. A changeset that
spans domains loads each matching skill: an Apex class and an LWC fire both rows below on their own.
Each `reviewing-*` skill names its cross-domain partner under its own **Cross-Skill Integration**
(e.g. an LWC with an `@AuraEnabled` Apex controller pulls in `reviewing-apex` alongside).

| Artifact under review | Skill |
|---|---|
| Apex — classes, triggers, services, or test classes | {{skill:reviewing-apex}} |
| Lightning Web Components | {{skill:reviewing-lwc}} |
| Flows | {{skill:reviewing-flow}} |

For the deep code-quality gate after a build, dispatch the `code-reviewer` agent — it runs the
table above plus {{skill:running-code-analyzer}} over the delivered artifacts and reports defects
by severity. The `architect` agent is the separate solution-design governance gate — it clears the
design before code and inspects the assembled build against the design contract (completeness, scope,
design conformance), not code quality.

The authored skills in this repo — {{skill:reviewing-apex}}, {{skill:reviewing-lwc}}, and
{{skill:reviewing-flow}} — install into `{{SKILLS_DIR}}/` at setup (see the README). All other
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
