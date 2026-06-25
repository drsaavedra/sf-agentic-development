---
name: sf-research
description: "Salesforce state-of-the-world discovery — one prompt-driven skill that inventories the current org/repo across five domains (data model, automation, integration, UI, security & licensing) and writes a reviewable docs/<domain>.md per in-scope domain. The request names which domains to look at; only those run. Single-purpose: it researches and writes/refreshes the docs only — it never writes docs/CONTEXT.md (sf-plan owns that, taking the objective straight from its own prompt). Safe to run unattended on a schedule to keep the org docs in sync. Surfaces the constraints that bite at planning time — master-detail on a populated object, order-of-execution conflicts, unsupported auth, the missing license — before sign-off, not mid-build. TRIGGER when: starting research/discovery before a design, or asked to inventory, map, audit, refresh, or persist an org's data model, automation, integrations, UI surfaces, sharing model, or license entitlements. DO NOT TRIGGER when: choosing an approach or designing (use sf-plan); building (generating-* / building-sf-integrations / applying-slds); or reviewing (reviewing-*)."
allowed-tools: Read, Grep, Glob, Bash, AskUserQuestion
---

# Salesforce Research

Discover and document the **current** state of an org so planning rests on what exists, not a guess.
This skill is **discovery only** — it does not choose approaches or design solutions (that is
`sf-plan`'s job, using its decision packs). It surfaces the constraints that gate design, and writes
one reviewable `docs/<domain>.md` per domain the request touches.

One skill, five domains, prompt-driven: **the request names which domains to research, and only those
run.** A feature touching data model, sharing, and automation researches those three and skips UI and
integration — the prompt never named them.

**It only ever writes `docs/<domain>.md`.** It does **not** write `docs/CONTEXT.md` or any handoff
file — planning gets its objective straight from the `/sf-plan` prompt, and `sf-plan` owns CONTEXT.md.
Two ways it gets invoked, both producing the same output (just the domain docs):

- **Before a design** — the prompt names a feature's domains; research those, scoped to the feature,
  so a human can review the docs before `/sf-plan`.
- **As a scheduled / unattended refresh** — run with no specific feature to **keep the org docs in
  sync** (e.g. a weekend job). This is the org-survey/refresh use: update the existing `docs/*`
  broadly across the in-scope domains. (See *Org-survey mode is opt-in* below.)

## Domain selection (prompt-driven)

Parse the request, pick the in-scope domains, and load **only** their references. Run only the
domains the prompt names — do **not** run all five by default.

The table is in **discovery order** (see *Discovery order* below) — run in-scope domains top-to-bottom.

| # | Domain | In scope when the prompt mentions… | References | Writes |
|---|---|---|---|---|
| 1 | data-model | objects, fields, relationships, record types, picklists, volumes, config storage, schema, org-wide settings | `references/data-model/*` | `docs/data-model.md` |
| 2 | security | OWD, sharing rules, role hierarchy, permission sets vs profiles, FLS, record-level access, licenses | `references/security/*` | `docs/security-model.md` |
| 3 | automation | triggers, Flows, validation rules, roll-ups, async, "what fires", order of execution, recursion | `references/automation/*` | `docs/automation.md` |
| 4 | ui | LWC/Aura/Flow/page surfaces, reusable components, placement, Experience Cloud, SLDS/branding/accessibility | `references/ui/*` | `docs/ui-design.md` |
| 5 | integration | external systems, callouts, auth, Named/External Credentials, data format/limits, events/CDC | `references/integration/*` | `docs/integration-patterns.md` |

If the prompt is genuinely ambiguous about which domains it covers, confirm the domain set with one
`AskUserQuestion` picker — otherwise infer silently and proceed. Each domain reads **both** of its
reference files before writing its doc.

### Discovery order

When more than one domain is in scope, research them in the order above —
**data-model → security → automation → ui → integration** — because each later domain builds on the
earlier ones, and researching out of order wastes effort:

- **Data model is the foundation** — objects, fields, and relationships are the substrate every other
  domain refers to. Inventory them first so the rest names real schema, not guesses.
- **Security** rests on the objects: OWD, sharing, and FLS are *per-object*, so the data model must be
  known before the sharing slice means anything.
- **Automation** operates on those objects and within that access model — what fires on a record, and
  the recursion/order-of-execution risk, only make sense once the data model (and the sharing that
  governs the records it touches) is mapped.
- **UI** sits on top: it reads/writes the data, respects the access model, and triggers the
  automation already inventoried, so its surfaces and placement land last among the on-platform
  domains.
- **Integration** comes last: the external contract, volume-vs-limits, and event-vs-CDC fit all
  depend on the data model it moves and the automation/async pattern that runs the callout — research
  it before those and the effort is wasted.

This ordering is the default for a multi-domain (and especially a whole-org) research run. A
single-domain request just runs that one domain.

## Operating rules

These hold for every in-scope domain:

- **Scope from the request, not the org.** Derive the in-scope set — the objects, components,
  systems, or user populations the feature touches — from the prompt first, and inventory only that
  set plus **one collision hop** (directly related objects, components they import, credentials/events
  already wired, perm sets granting those objects). Don't census the org. If the request is too vague
  to scope, ask one scoping question rather than inventorying to compensate.
- **Verify, never guess.** Confirm every API name against the repo (`force-app/**`) first, then the
  org — **the org wins** on divergence. Read-only `sf` CLI introspection is free (`sf org display`,
  `sf sobject list`, `sf sobject describe --sobject <Name>`, `sf data query --query "..."`). Never ask
  the user to run Developer Console or anonymous Apex for what these answer. **If no org is connected,
  verify against `force-app/**` alone and flag the doc `repo-only`** — never silently assume an
  org-verified name. **Licenses especially must be org-confirmed** — the repo can't show what the org
  is entitled to; with no org, flag licensing `UNCONFIRMED`.
- **Inventory before recommend.** Record what exists — objects, fields, components, credentials,
  permission sets, framework patterns — before naming any gap. Reuse-before-invent throughout: an
  existing field, component, or credential usually beats a new one, and `sf-plan` can only choose
  reuse if research found it.
- **Name the absence too.** "No trigger handler framework; triggers carry logic inline" or "no
  OpenAPI spec" is a finding that shapes the plan as much as a found pattern. Don't fabricate counts —
  record volumes come from a `COUNT()` query; with no org, write "unknown (repo-only)", not a number.
- **Discovery only.** This skill does not choose the automation/UI/integration approach, decide
  standard-vs-custom, or design the sharing model — all of that is `sf-plan`. Surface the constraints
  that gate those decisions; don't make them.
- **Org-survey mode is opt-in.** Only when the user explicitly asks to document the whole org/domain
  (not a specific feature) — or when this is a scheduled/unattended refresh run to keep the docs in
  sync — do you drop the scope bound and inventory wholesale, refreshing the existing `docs/*`; the
  feature-scoped default above holds otherwise.

## Phases: Discover → Analyze → Document

Run this loop for each in-scope domain, taking the domains in the **discovery order** above
(data-model → security → automation → ui → integration) so each builds on the findings of the ones
before it.

1. **Discover.** **Set scope first** — from the request, list the in-scope set for the domain;
   everything below is bounded to that set + one collision hop, not an org-wide census. Capture org
   context — org type (prod/sandbox/scratch) and whether an org is reachable (`sf org display`); if
   not, the doc is `repo-only`. Then work the domain's two reference checklists: read the metadata
   under `force-app/**`, run the read-only introspection commands, grep for the patterns — don't ask
   what the repo/org can tell you.
2. **Analyze.** Turn the raw inventory into findings: reuse candidates, the **constraints that gate
   design** (a standard object can't be a detail side; mixed automation on one object; an auth method
   Salesforce must match; the missing user/feature license; the Experience-Cloud architecture fork),
   and the greenfield-vs-established verdict. Use `AskUserQuestion` **only** for intent the code/org
   can't reveal (expected growth rate, internal-vs-customer audience, whether a Flow is admin-owned).
3. **Document.** Write each in-scope domain's `docs/<domain>.md` from its output contract below,
   ending with the design-gating **Surprises & constraints** — and nothing else (no `docs/CONTEXT.md`).
   Keep each doc **scoped to the feature** by default — a later feature appends its own in-scope
   findings, so each doc is the union of what features have needed; a scheduled refresh run instead
   updates them broadly (org-survey mode).

## Per-domain output contracts

Write the sections for each in-scope domain (omit one only if genuinely N/A; never pad). Each doc
ends with **Surprises & constraints** — the design-gating findings a human must see before planning.

**Status line** — if no org was reachable, add it as the doc's first line:
`> **Status: repo-only** — <domain> verified against force-app/** only, not org-confirmed.`
For **security** with no org, instead use:
`> **Status: repo-only** — sharing verified against force-app/** only; LICENSING UNCONFIRMED (no org).`

### `docs/data-model.md`
- **Scope** — which objects this feature touches, and why they were inventoried.
- **Objects & fields** — per object: API name, custom/standard, the fields relevant to the feature
  (API name + type), each marked *verified (org)* / *verified (repo)* / *proposed gap*.
- **Relationships & constraints** — existing lookups/master-details/junctions; topology that limits
  the design (detail-side rules, populated-object conversion, max-2-master-detail).
- **Record types & picklists** — types and picklist values already in use on the target objects.
- **Volumes & skew** — current `COUNT()` per object, known growth, parent-child / ownership skew risk.
- **Config storage** — where configuration lives today (CMT, custom settings, custom objects) and
  whether new config should follow the existing pattern.
- **Org-wide settings** — Person Accounts, multi-currency, state/country picklists — anything that
  reshapes the model org-wide.
- **Surprises & constraints** — missing reuse, blocking constraints, skew, license/feature
  dependencies (cross-ref the security domain).

### `docs/security-model.md`
- **Scope** — which objects/users the feature's access touches.
- **OWD & sharing** — org-wide default per in-scope object, and how it constrains visibility.
- **Roles & sharing rules** — relevant role-hierarchy branches and existing sharing rules.
- **Permission sets vs profiles** — the org's strategy and existing permission sets to reuse (API
  name) or the gap.
- **FLS** — field-level security requirements per sensitive field.
- **Record-level access** — the strategy the feature needs: criteria/owner-based sharing, manual,
  Apex managed sharing, or none.
- **License & feature inventory** — which user licenses the target population holds, which feature
  licenses/permission-set licenses the org has, and whether they cover the feature. Mark each
  *confirmed (org)* or *UNCONFIRMED (repo-only)*.
- **Compliance** — Shield/encryption, guest/community access, data-residency constraints.
- **Surprises & constraints** — the design-gating findings, **licensing gaps first** (the core
  surprise), then OWD/sharing blocks and guest-access needs.

### `docs/automation.md`
- **Scope** — which objects this feature touches, and the automation areas inventoried.
- **Automation landscape (target objects)** — every trigger/Flow/validation rule/roll-up firing on
  each in-scope object, and the order of execution.
- **Trigger framework** — one-trigger-per-object? a handler base class (name + how to extend)? or
  inline logic? recursion-guard convention.
- **Logging & errors** — the logging framework and its entry point (class/method to call), and the
  error-handling convention.
- **Async strategy** — Queueable/Batch/Schedulable/@future/Platform Events already in use, and the
  chaining pattern.
- **Flow conventions** — existing Flow naming, subflow usage, and the fault-handling / Custom Error
  pattern new Flows should follow.
- **Test factory & coverage** — the TestDataFactory pattern (name + usage) and the coverage baseline.
- **Surprises & constraints** — greenfield-vs-established verdict, mixed-automation conflicts,
  order-of-execution risk, missing framework pieces.

### `docs/ui-design.md`
- **Scope** — what UI the feature needs, and for whom.
- **Existing surfaces & reusable components** — relevant LWC/Aura/Flow/page API names already present,
  marked reuse-candidate or reference-only.
- **Placement** — where the UI must live (record page, app/home page, utility bar, quick action,
  Experience Cloud page) and the record/context that placement implies.
- **Internal vs Experience Cloud** — internal Lightning Experience, or a public/partner Experience
  Cloud site? If a full site, note the architecture fork to `building-ui-bundle-app`.
- **Design system & branding** — SLDS usage, design tokens/branding constraints, base-component
  conventions.
- **Accessibility** — the accessibility bar the feature must meet.
- **States & responsive** — required empty/loading/error states and mobile/responsive needs.
- **Surprises & constraints** — the Experience-Cloud fork, branding constraints, accessibility
  requirements, missing reusable building blocks.

### `docs/integration-patterns.md`
- **Scope** — which external system(s) the feature integrates with, and the business reason.
- **External systems & directionality** — per system: name, outbound/inbound/bidirectional, what it
  does, sync-vs-async need.
- **Auth & credentials** — the auth the system supports (OAuth/JWT/API key/mTLS), existing
  Named/External Credentials to reuse (API name) or the gap, where secrets/certs live.
- **Format & contract availability** — payload format (JSON/XML/SOAP) and whether an OpenAPI/WSDL
  spec exists (drives External Services vs Flow HTTP vs Apex).
- **Volume vs limits** — expected frequency/volume against the per-transaction (100 callouts) and
  daily API limits; real-time vs batch.
- **Reliability** — idempotency, retry, failure-recovery expectations; transactional boundary (don't
  commit before remote success).
- **Events vs CDC** — if event-driven, whether Platform Events (business event) or CDC (record
  changed) fits.
- **Compliance** — SLA/latency, PII, data residency, Shield, IP allowlisting.
- **Surprises & constraints** — unsupported auth, missing spec, limit pressure, trigger-context
  callout constraint, middleware in the landscape.

## Cross-Skill Integration

| Need | Hand to |
|---|---|
| Choose the solution shape, automation/UI/integration approach, standard-vs-custom, sharing design | `sf-plan` — **consumes** these docs instead of re-exploring the org |
| Build objects/fields | `generating-custom-object`, `generating-custom-field` |
| Build automation | `generating-flow`, `generating-apex`, `generating-apex-test` |
| Build UI / styling | `generating-lwc-components`, `generating-flow`, `applying-slds` |
| Build a full Experience Cloud site/app | `building-ui-bundle-app` |
| Build integration plumbing / configure inbound auth | `building-sf-integrations`, `configuring-connected-apps` |
| Build permission sets / FLS | `generating-permission-set` |
| Review the resulting artifacts | `reviewing-apex`, `reviewing-lwc`, `reviewing-flow` |
