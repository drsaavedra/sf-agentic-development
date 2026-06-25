---
name: researching-automation
description: "Salesforce automation discovery — inventories the declarative and programmatic automation already firing on the target objects (Flows, triggers, validation rules, roll-ups, async) plus the framework new automation must plug into (trigger handler pattern, logging & error framework, async strategy, UoW/DML, Flow conventions, test-data-factory & coverage), then writes a state-of-the-world docs/automation.md a human reviews before planning. Surfaces mixed-automation and order-of-execution conflicts before sign-off, not mid-build. TRIGGER when: starting research on a feature that adds or changes automation (Flow, trigger, validation rule, roll-up, async), or asked to inventory an org's automation or trigger framework before a design. DO NOT TRIGGER when: choosing the automation approach (use sf-plan) or building it (use generating-flow / generating-apex) or reviewing it (use reviewing-flow / reviewing-apex)."
allowed-tools: Read, Grep, Glob, Bash, AskUserQuestion
---

# Salesforce Automation Research

Discover and document the **existing** automation landscape — the Flows, triggers, validation rules,
roll-ups, and async already firing on the target objects, plus the framework new automation must plug
into — so planning rests on what the org actually does, not a guess. This skill is discovery only; it
does **not** choose the automation approach or design new automation (that is `sf-plan`'s job, using
the automation decision pack). Its output is `docs/automation.md`: a state-of-the-world picture a
human reviews before `sf-plan` plans against it.

**Cross-domain:** the data model the automation operates on belongs to `researching-data-model`;
external callouts and their async plumbing belong to `researching-integration-patterns`. The
*automation choice* (Flow vs Apex vs roll-up) stays with `sf-plan`; this skill only inventories what
already fires and the framework new automation slots into.

## Operating rules

- **Scope from the request, not the org.** Derive the in-scope set — the objects whose automation the
  feature touches — from the prompt first, and inventory only that set plus **one collision hop**
  (automation that shares those objects' save order, and the framework new automation plugs into).
  Don't census the org. If the request is too vague to scope, ask one scoping question rather than
  inventorying to compensate. (Whole-org documentation is a separate, opt-in mode — see below.)
- **Verify, never guess.** Read the actual Flows, triggers, classes, and validation rules under
  `force-app/**` first, then confirm against the org where it adds truth — **the org wins** on
  divergence. Read-only `sf` CLI introspection is free: `sf sobject describe --sobject <Name>` for
  trigger-bearing objects, `sf data query --query "..."` on Tooling for deployed classes/Flows. Never
  ask the user to run Developer Console or anonymous Apex for what these answer. **If no org is
  connected, inventory the repo alone and flag the doc `repo-only`.** Never assume a framework exists
  — find the file or record its absence.
- **Inventory before recommend.** Capture the patterns the codebase already uses — handler base class,
  logging entry point, async pattern, Flow conventions, test factory — before naming a gap. Work
  briefs say "reuse the existing logging framework"; research must *find* it (and its API) or state
  there is none.
- **Name the absence too.** "No trigger handler framework; triggers carry logic inline" is a finding
  that shapes the plan as much as "a `TriggerHandler` base is in use."
- **Org-survey mode is opt-in.** Only when the user explicitly asks to document the whole org/domain
  (not a specific feature) do you drop the scope bound and inventory wholesale; the feature-scoped
  default above holds otherwise.

## Phases: Discover → Analyze → Document

1. **Discover.** **Set scope first** — from the feature request, list the objects whose automation is
   in play; everything below is bounded to that set + one collision hop, not an org-wide census. Then
   capture org context — org type (prod/sandbox/scratch) and whether an org is
   reachable (`sf org display`); if not, the doc is `repo-only`. Then work the two reference
   checklists below: inventory the automation already firing on the in-scope objects (triggers, Flows,
   validation rules, roll-ups, legacy Process Builder/Workflow) and their order of execution, and the
   framework new automation plugs into (trigger handler pattern, logging, async, UoW/DML, Flow
   conventions, test factory, coverage). Read the source; grep for the patterns; run read-only
   introspection — don't ask what the repo shows.
2. **Analyze.** Identify the reusable patterns and their entry points (the handler base class to
   extend, the logger to call, the fault-handling Flow pattern to follow, the factory to use), the
   **greenfield-vs-established** verdict, and the **conflicts that gate design** — mixed automation on
   one object, an existing order of execution a new actor would disturb. Use `AskUserQuestion` only
   for intent the code can't reveal (e.g. "is this Flow owned by an admin team?").
3. **Document.** Write `docs/automation.md` from the output contract below, ending with the
   design-gating **Surprises & constraints**.

## Reference files (read the one matching what you're inventorying)

| Inventorying… | Read |
|---|---|
| Existing triggers/Flows/validation rules/roll-ups on the target objects and their order of execution | `references/automation-landscape.md` |
| The framework new automation plugs into — trigger handler pattern, logging & error framework, async strategy, UoW/DML, Flow conventions, test-data-factory & coverage | `references/automation-framework.md` |

Read both — the live automation and the framework it plugs into are both inputs to the plan.

## Output contract — `docs/automation.md`

Write these sections (omit one only if genuinely N/A; never pad). If no org was reachable, add a
first line: `> **Status: repo-only** — patterns verified against force-app/** only, not org-confirmed.`
Keep the doc **scoped to the feature** — a later feature appends its own in-scope findings, so this
is the union of what features have needed, not a complete org model.

- **Scope** — which objects this feature touches, and the automation areas inventoried.
- **Automation landscape (target objects)** — every trigger/Flow/validation rule/roll-up firing on
  each in-scope object, and the order of execution.
- **Trigger framework** — one-trigger-per-object? a handler base class (name + how to extend)? or
  inline logic? recursion-guard convention.
- **Logging & errors** — the logging framework and its entry point (the class/method to call), and
  the error-handling convention.
- **Async strategy** — Queueable/Batch/Schedulable/@future/Platform Events already in use, and the
  chaining pattern.
- **Flow conventions** — existing Flow naming, subflow usage, and the fault-handling / Custom Error
  pattern new Flows should follow.
- **Test factory & coverage** — the TestDataFactory pattern (name + usage) and the current coverage
  baseline.
- **Surprises & constraints** — greenfield-vs-established verdict, mixed-automation conflicts,
  order-of-execution risk, missing framework pieces a plan must account for.

## Cross-Skill Integration

| Need | Hand to |
|---|---|
| Choose the automation approach (Flow vs Apex vs roll-up), or design new automation | `sf-plan` (automation decision pack) — **consumes** this doc instead of re-exploring |
| Build the chosen automation once planned | `generating-flow`, `generating-apex`, `generating-apex-test` |
| Review the resulting automation | `reviewing-flow`, `reviewing-apex` |
| The data model the automation operates on | `researching-data-model` |
| External callouts / integration plumbing | `researching-integration-patterns` |
