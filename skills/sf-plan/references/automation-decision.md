# Automation: choosing the right tool

> Part of `sf-plan` — see SKILL.md. Use this when triaging an automation requirement (config vs
> code). Pick the **highest rung** that fully meets the need; step down to code only when a
> concrete capability or limit forces it, and record the reason in the spec.

## The declarative-first ladder

1. **No automation — formula field or roll-up summary field.** Derived/calculated values, and
   parent rollups over a **master-detail** child. Nothing to maintain.
2. **Validation rule.** Enforce data integrity on save. Prefer over an Apex `addError` for
   single-record field checks.
3. **Record-triggered Flow.** The default for record automation — field updates, related-record
   changes, notifications, routing.
4. **Apex trigger (via a handler).** Only when Flow can't meet the requirement — see below.

## Roll-up: which tool

| Use… | When |
|---|---|
| Roll-up summary field | The relationship is **master-detail** and you need COUNT/SUM/MIN/MAX |
| Flow rollup | The relationship is a **lookup** (no RSF possible), or the rollup needs filtering RSF can't express, at modest volume |
| Apex rollup | High volume where bulk performance and recursion control matter, or many rollups need batching |

## Record-triggered Flow: before-save vs after-save

- **Before-save flow** — same-record field updates. Fastest path, no extra DML. Use for "set a
  field on the record being saved."
- **After-save flow** — related-record updates, email, creating records, calling invocable Apex.

## Flow vs Apex trigger

| Default to a record-triggered Flow when… | Choose an Apex trigger when… |
|---|---|
| Same-record or simple related-record updates | Complex multi-object orchestration or heavy data transformation |
| Notifications, emails, creating related records | Bulk volume needing governor-aware handling beyond Flow's comfort |
| Routing with a handful of decision branches | Partial-success / granular error handling and retry |
| An admin should own and maintain it | Recursion control, dynamic SOQL, or logic Flow can't express |
| Calling an invocable Apex action for the hard part | An Apex trigger already owns the object — stay additive, don't split the strategy |

**Hybrid (recommended for complex cases):** a record-triggered Flow owns entry criteria and
orchestration; invocable Apex does the heavy lifting it calls.

## Async and scheduled

| Need | Tool |
|---|---|
| Run later, single unit of work, chainable | Queueable Apex |
| Large data volumes, stateful chunking | Batch Apex |
| On a schedule, declarative | Scheduled Flow |
| On a schedule, complex / code | Schedulable Apex (often enqueues a Batch/Queueable) |
| Fire-and-forget, decoupled integration | Platform Event (see `building-sf-integrations`) |

## Guardrails

- **One automation strategy per object.** Don't run a record-triggered Flow and an Apex trigger
  doing overlapping work on the same object without a deliberate, documented ordering — they
  interleave per the save order of execution and become unpredictable.
- Never add new Process Builder or Workflow Rule automation — Salesforce ended support for both on Dec 31, 2025; build all new automation in Flow and migrate existing ones with the Migrate to Flow tool.
- Whatever you pick must be **bulk-safe by construction** (no per-record SOQL/DML/callout in a
  loop) — the build is reviewed against that bar (`reviewing-apex` / `reviewing-flow`).
