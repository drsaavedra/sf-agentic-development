<!--
  SALESFORCE PROJECT — Claude Code instruction file.
  This file is hand-maintained — edit it directly. It is the canonical source the installer
  injects into a project's CLAUDE.md as a managed block.
  Canonical skills:  skills/*/SKILL.md   (installed into .claude/skills/ at setup)
  Canonical agents:  agents/*.md         (installed into .claude/agents/ at setup)
-->

# Salesforce Project — Claude Baseline

Rules for Claude Code working on Salesforce — Apex, LWC, Experience Cloud, B2B Commerce,
metadata, and Salesforce CLI projects. Claude's base model authors Salesforce code and metadata
directly from trained knowledge; the authored skills below add the two things the model can't be
trusted to carry alone — proprietary domain surfaces (`generating-b2b-lwc`) and this project's
quality bar (`reviewing-*`). Follow these rules unless the user explicitly overrides them.

> **Three stages for a planned feature — Research → Plan → Build, each human-gated.**
> **Research:** run `/sf-research` — one prompt-driven skill that reads which domains your prompt
> names and writes a state-of-the-world `docs/<domain>.md` per in-scope domain (reviewed before
> planning). **Plan:** `/sf-plan` turns those docs into a
> design contract — `docs/solution-design.md` + a lean `docs/CONTEXT.md` + per-story
> `docs/contracts/<slug>.md` (it stops and routes back to Research if a needed doc is missing).
> **Build:** by default, work one story at a time — open its `docs/contracts/<slug>.md` (with the
> research docs and `docs/solution-design.md` as context; a fresh session per story keeps context
> lean) and build it under the Authoring rules below. `/sf-build` is an **optional** orchestrated
> mode that dispatches subagents per work item — heavier on tokens, worth it only for large
> multi-story builds. The rules below govern the default build and everything else — ad-hoc
> edits, fixes, reviews, audits, config, and ops.

---

## Research Routing

Research is the **first stage of a planned feature** — discovery before design. A single
prompt-driven skill, **`/sf-research`**, reads which domains your prompt names and inventories only
those (scoped to the feature, not an org census), writing one `docs/<domain>.md` per in-scope domain
for a human to review before `/sf-plan`. The prompt is the optimizer — name the domains and what to
look at, and `sf-research` loads the matching domain checklists. When several domains are in scope it
researches them in **discovery order** — data-model → security → automation → ui → integration — so
each builds on the earlier findings (security is per-object, automation runs on those objects,
integration depends on the automation that drives it). Domain → doc, in that order:

| Domain (in scope when the prompt names it) | Writes |
|---|---|
| Objects, fields, relationships, record types, volumes, config storage, org-wide settings | `docs/data-model.md` |
| OWD, sharing rules, permission sets vs profiles, FLS, record-level access, and the user/feature **license** inventory | `docs/security-model.md` |
| Automation already firing on the target objects (Flows, triggers, validation rules, roll-ups, async) + the framework new automation plugs into | `docs/automation.md` |
| Existing LWC/Flow/page surfaces & reusable components, placement, internal-vs-Experience-Cloud, design/accessibility constraints | `docs/ui-design.md` |
| External systems, the auth they support, existing Named/External Credentials, data format & limits, events | `docs/integration-patterns.md` |

`sf-research` only ever writes these `docs/<domain>.md` files — never `docs/CONTEXT.md` (that is
`/sf-plan`'s, built from the objective you give `/sf-plan` directly). It can also run on a schedule to
keep the org docs in sync. The research docs are `/sf-plan`'s required input — it stops and routes
back here if one a feature needs is missing. `/sf-plan` then refines `docs/data-model.md` and
`docs/automation.md` in place.

## Authoring

Claude authors all Salesforce artifacts directly — Apex classes/triggers/tests, LWC bundles,
Flows, SOQL, and declarative metadata (objects, fields, tabs, apps, permission sets, FlexiPages,
validation rules, list views, sharing rules) — without loading a per-artifact authoring skill.
One domain routes to a skill before building:

| Context | Skill |
|---|---|
| B2B/B2C Commerce storefront LWC — cart, checkout, PDP/PLP, search, quick order, account/order/quote/subscription, or any Experience-Builder commerce component (LWR storefront) | `generating-b2b-lwc` |

Authoring rules (always apply):

- **TDD for Apex** — author or extend the test class first, then implement the minimum to make it
  pass. Exceptions: metadata-only changes, trivial non-logic edits, and user-declared prototypes
  or spikes.
- **Objective gates, not vibes** — verify with `sf project deploy validate` (free to run any
  time), `sf apex run test`, and `sf code-analyzer run` over changed files. Fix what they surface
  before reporting done.
- **Knowledge-cutoff guard** — Salesforce ships three releases a year. If the work touches a
  platform feature, API version behavior, or limit that may post-date training — or you are not
  certain of the current syntax — fetch the official docs (developer.salesforce.com,
  help.salesforce.com) via WebFetch/WebSearch before authoring. Never guess at release-sensitive
  claims.
- **Schema truth** — verify object/field/relationship API names against local metadata
  (`force-app/**`) first, then the org (`sf sobject describe`, read-only). Never invent API names.
- **Ops through the sf CLI** — deploys, org introspection, SOQL, data loads, debug logs, and
  static analysis all run through `sf` commands directly; check `sf <command> --help` when unsure
  of current flags.

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
table above plus the Code Analyzer CLI over the delivered artifacts and reports defects
by severity. The `architect` agent is the separate solution-design governance gate — it clears the
design before code and inspects the assembled build against the design contract (completeness, scope,
design conformance), not code quality.

All skills referenced in this file are authored in this repo and install into `.claude/skills/`
at setup (see the README). There are no external skill dependencies.

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
