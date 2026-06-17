---
name: sf-plan
description: "Salesforce design and planning — produces a verified, completeness-checked design contract at docs/tech-spec.md BEFORE any build. Use at the start of a feature, before creating custom objects/fields, Apex, LWC, or Flows. Asks clarifying questions, makes the declarative-vs-code decisions, verifies the schema against the org, and writes a spec the /sf-build pipeline consumes. TRIGGER when: starting a new Salesforce feature or change and a design/plan does not yet exist. DO NOT TRIGGER when: a spec already exists and the task is to build (use /sf-build), or for a trivial one-line fix."
allowed-tools: Read, Grep, Glob, Bash
---

# Salesforce Planning (sf-plan)

Produce a verified, completeness-checked design contract at `docs/tech-spec.md` **before any
build**. This skill is planning only: do **not** author or edit any artifact (Apex, LWC, Flow, or
metadata) here. End by handing off to `/sf-build`.

## Operating rules

- **Grill toward shared understanding — explore first, then offer choices.** Read the relevant
  code and schema *before* asking, so you can deduce the likely solution and the real decision
  points rather than fish with open-ended questions. Ask **one question at a time, in prose**
  (never the multiple-choice picker tool); when you have enough context to deduce the options,
  present them as concrete choices with your **recommended answer and the reason**. Walk down each
  branch of the decision tree, resolving dependencies one-by-one, until you and the user share the
  same picture of the solution. Never ask what the code or org can tell you — investigate instead.
- **Verify, never guess.** Confirm every object, field, and relationship API name against the repo
  (`force-app/**`) first, then the org — the org wins on divergence. Use read-only sf CLI freely:
  `sf sobject list`, `sf sobject describe --sobject <Name>`, `sf data query --query "..."`. Never
  ask the user to run Developer Console or anonymous Apex for anything these answer.
- **Declarative-first, from the decision packs — not from memory.** Prefer standard objects and
  config — fields, roll-up summaries, validation rules, Flows, permission sets — over Apex; write
  code only for what the platform cannot do declaratively. Make each call from the matching pack in
  `references/` (see *Decision references* below), and record the decision and its reason. When a
  call is uncertain or hinges on a current platform capability or limit, ground it with the
  `fetching-salesforce-docs` skill before committing it to the spec.
- **Reuse before invent.** Follow the naming, utility, selector, and test-factory patterns already
  in the repo; do not introduce new abstractions the codebase doesn't already use.

## Phases

1. **Explore and map the solution** — read the artifacts the prompt names (e.g. an LWC bundle and
   its Apex controller) and `force-app/**` for existing objects, classes, patterns, and naming;
   run read-only sf introspection for the real schema. From this, form a **candidate solution
   map** — what likely needs to change and the open decision points — *before* you ask anything.
   The map is what you grill against; it also surfaces what to reuse instead of duplicate.
2. **Grill the map into shared understanding** — confirm the candidate solution one decision at a
   time, in prose, offering the deduced choices and your recommendation for each. Resolve the
   decision tree branch by branch — including purpose and success criteria — until nothing material
   is ambiguous. Don't re-ask what you already confirmed from the code or org.
3. **Declarative-vs-code triage** — for each capability decide config or code, working from the
   decision packs: `references/automation-decision.md` (roll-up → validation rule → record-triggered
   Flow → Apex trigger, plus async/scheduled choices) and `references/ui-decision.md` (page layout /
   Dynamic Forms → Screen Flow → LWC, and placement). Standard object before custom. Record each
   decision with its reason.
4. **Schema design (verified)** — pin the data model with real API names, working from
   `references/data-model-decision.md`: standard vs custom object, relationship type, where
   config/data lives, and large-data-volume design. This becomes each work item's *Schema context*.
5. **Approaches** — offer 2–3 options with Salesforce tradeoffs (Screen Flow vs LWC, Flow vs trigger, sync vs async) and recommend one.
6. **Write the spec** — to `docs/tech-spec.md`, per the Output contract below. Scale detail to
   complexity; do not pad a small change.
7. **Completeness self-review (the gate)** — refuse to finish if any of these fail; fix and
   re-check:
   - every requirement has a home (a work-item row),
   - every object/field/relationship API name is verified, not guessed,
   - every **code** item carries concrete given/when/then test scenarios,
   - security is addressed (permission set / FLS / sharing model),
   - the design is bulk-safe and scales as data grows (assume it will),
   - no placeholders, contradictions, or unresolved questions remain.
8. **Hand off** — do this exactly:
   - announce: *"Plan generated at `docs/tech-spec.md`."*
   - print a **high-level summary to the CLI**: objective, the config-vs-code work-item list, key
     design decisions, and risks — enough to review without opening the file.
   - tell the user: review the summary; open `docs/tech-spec.md` for full detail if doubtful; have
     the developer/architect review the spec (a manual step); then run `/sf-build` to build.
   - **do not invoke `/sf-build` or start building yourself** — stop here. The spec is meant to be
     reviewed before any build, so leave the decision to proceed with the user.

## Output contract — `docs/tech-spec.md`

Numbered sections (`§1`, `§2`, …) plus a **work-item table**, where each row maps to a work brief:

| # | Work item | Metadata type | Config or code | Owner | Schema touched | Test scenarios | Depends on |
|---|---|---|---|---|---|---|---|

- The `§`-number is each item's **Spec reference**.
- **Config rows** → built with the matching `generating-*` config skill.
- **Code rows** → built by `salesforce-developer` (Apex via TDD; LWC/Flow via the validate loop);
  each must carry concrete test scenarios and verified schema.

This table is the `/sf-build` dispatch list. Its columns align with the work-brief template in
[`docs/ORCHESTRATION.md`](../../docs/ORCHESTRATION.md): Objective, Spec reference, Schema context,
Test scenarios, Constraints, Dependencies, Expected outputs, Validation criteria. Write each
row complete enough that `/sf-build` can cut a brief from it without rediscovering anything.

Also record an **`Architect review: recommended | not needed`** line with a one-line reason, so
`/sf-build` knows whether to invoke the `architect` agent without having to judge it itself.
Recommend it when the design shows concrete complexity signals — a new or changed data model,
cross-object automation, callouts / async (governor-limit risk), or a multi-domain or many-item
build; otherwise mark it *not needed*.

## Decision references

Read the pack that matches the fork you're resolving — progressive disclosure, don't load all of
them up front:

- `references/automation-decision.md` — roll-up / validation rule / record-triggered Flow / Apex
  trigger, plus async and scheduled choices.
- `references/ui-decision.md` — page layout & Dynamic Forms / Screen Flow / LWC, and placement.
- `references/data-model-decision.md` — standard vs custom object, relationship type, where
  config/data lives (CMT / custom setting / Big Object / External Object), and large-data-volume design.

These are curated decision criteria, not a snapshot of the platform's current state. When a
decision is **uncertain or hinges on a current capability or limit** (e.g. whether today's Screen
Flow covers a given interaction), ground it against official documentation with the
`fetching-salesforce-docs` skill before committing the choice to the spec.
