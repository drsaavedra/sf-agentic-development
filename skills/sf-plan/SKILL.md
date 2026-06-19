---
name: sf-plan
description: "Salesforce design and planning — produces a verified, completeness-checked design contract BEFORE any build: a shared docs/CONTEXT.md (objective, user-story index, work-item dispatch table) plus one docs/contracts/<slug>.md per user story. Use at the start of a feature, before creating custom objects/fields, Apex, LWC, or Flows. Asks clarifying questions, makes the declarative-vs-code decisions, verifies the schema against the org, and writes or revises the spec the /sf-build pipeline consumes. TRIGGER when: starting a new Salesforce feature or change, or revising an existing design when requirements change before a build. DO NOT TRIGGER when: a spec already exists and the task is to build (use /sf-build), or for a trivial one-line fix."
allowed-tools: Read, Grep, Glob, Bash
---

# Salesforce Planning (sf-plan)

Produce a verified, completeness-checked design contract **before any build** — a shared
`docs/CONTEXT.md` plus one `docs/contracts/<slug>.md` per user story (see the Output contract
below). This skill is planning only: do **not** author or edit any artifact (Apex, LWC, Flow, or
metadata) here. End by handing off to `/sf-build`.

## Operating rules

- **Grill toward shared understanding — explore first, then offer choices.** Read the relevant
  code and schema *before* asking, so you can deduce the likely solution and the real decision
  points rather than fish with open-ended questions. Ask **one question at a time, in prose**
  (never the multiple-choice picker tool); when you have enough context to deduce the options,
  present them as concrete choices with your **recommended answer and the reason**. Walk down each
  branch of the decision tree, resolving dependencies one-by-one, until you and the user share the
  same picture of the solution. **Grill only what changes a work item, its schema, or a
  config-vs-code call** — don't ask preferences the spec doesn't depend on. Never ask what the code
  or org can tell you — investigate instead.
- **Verify, never guess.** Confirm every object, field, and relationship API name against the repo
  (`force-app/**`) first, then the org — the org wins on divergence. Use read-only sf CLI freely:
  `sf sobject list`, `sf sobject describe --sobject <Name>`, `sf data query --query "..."`. Never
  ask the user to run Developer Console or anonymous Apex for anything these answer. If no org is
  connected, verify against `force-app/**` alone and flag in the spec that names are repo-only, not
  org-verified — never silently assume.
- **Declarative-first, from the decision packs — not from memory.** Prefer standard objects and
  config — fields, roll-up summaries, validation rules, Flows, permission sets — over Apex; write
  code only for what the platform cannot do declaratively. Make each call from the matching pack
  (see *Decision references* below), and record the decision and its reason.
- **Reuse before invent.** Follow the naming, utility, selector, and test-factory patterns already
  in the repo; do not introduce new abstractions the codebase doesn't already use.

## Phases

1. **Explore and map the solution** — first check whether `docs/CONTEXT.md` (or a context doc the
   user points to) already exists; if so, work in **Revise mode** (below) — treat it as prior truth,
   not something to overwrite. Then read the artifacts the prompt names (e.g. an LWC bundle and its
   Apex controller) and `force-app/**` for existing objects, classes, patterns, and naming;
   run read-only sf introspection for the real schema. From this, form a **candidate solution
   map** — what likely needs to change and the open decision points — *before* you ask anything.
   The map is what you grill against; it also surfaces what to reuse instead of duplicate.
2. **Grill the map into shared understanding** — confirm the candidate solution one decision at a
   time, in prose, offering the deduced choices and your recommendation for each. Resolve the
   decision tree branch by branch — including purpose and success criteria — until nothing material
   is ambiguous. Don't re-ask what you already confirmed from the code or org.
3. **Solution shape (only when there's a real architectural fork)** — when the requirement admits
   genuinely different *whole-solution* architectures, present 2–3 shapes with their cross-cutting
   Salesforce tradeoffs and recommend one, using the same grill discipline (options + reason). These
   are architecture-level forks that span work items — e.g. extend a standard object vs introduce a
   new custom-object model; declarative orchestration (record-triggered Flow + invocable Apex) vs an
   Apex-trigger-owned domain; configure an existing feature/managed package vs build custom;
   real-time vs event-driven/async as the overall style. The chosen shape frames the triage and
   schema below. Skip this phase when one shape is obviously right — don't manufacture alternatives.
4. **Declarative-vs-code triage (per capability)** — within the chosen shape, decide config or code
   for each capability, working from the automation, UI, and integration decision packs (see
   *Decision references*). This is the per-piece tool choice (e.g. this rollup → roll-up summary
   field; this UI → Screen Flow or LWC; this callout → External Service / Named Credential), not the
   whole-solution fork above. Standard object before custom. Record each decision with its reason.
5. **Schema design (verified)** — pin the data model with real API names, working from the
   data-model decision pack (see *Decision references*): standard vs custom object, relationship
   type, where config/data lives, and large-data-volume design. This becomes each work item's
   *Schema context*.
6. **Write the spec** — to `docs/CONTEXT.md` and the per-story `docs/contracts/<slug>.md` files, per
   the Output contract below. Scale detail to complexity; do not pad a small change.
7. **Completeness self-review (the gate)** — refuse to finish if any of these fail; fix and
   re-check:
   - every requirement has a home (a work-item row),
   - every object/field/relationship API name is verified, not guessed,
   - every **code** item carries concrete given/when/then test scenarios,
   - security is addressed (permission set / FLS / sharing model),
   - the design is bulk-safe and scales as data grows (assume it will),
   - no placeholders, contradictions, or unresolved questions remain — a decision the user deferred
     ("you decide") is resolved by you with the recommended option and recorded as an explicit
     assumption, which counts as resolved.
8. **Hand off** — do this exactly:
   - announce: *"Plan generated at `docs/CONTEXT.md`."*
   - print a **high-level summary to the CLI**: objective, the config-vs-code work-item list, key
     design decisions, and risks — enough to review without opening the file.
   - **ask once whether to enable checkpoint commits** for the build — *"Should `/sf-build`
     checkpoint-commit each work item as it passes review (on the current branch), so progress is
     captured and referenceable in a handover? Recommended for long or multi-item builds."* — and
     record the answer as the `Checkpoint commits: enabled | disabled` line in `docs/CONTEXT.md`
     (default *disabled* if declined).
   - tell the user: review the summary; open `docs/CONTEXT.md` (and the relevant
     `docs/contracts/<slug>.md`) for full detail if doubtful; have the developer/architect review
     the spec (a manual step); then run `/sf-build` to build.
   - **do not invoke `/sf-build` or start building yourself** — stop here. The spec is meant to be
     reviewed before any build, so leave the decision to proceed with the user.

## Output contract — `docs/CONTEXT.md` + `docs/contracts/<slug>.md`

Write the plan as **two tiers** so each agent reads only what its work needs, not the whole design:
a small shared master (`docs/CONTEXT.md`) every agent reads, and one detailed contract file per user
story (`docs/contracts/<slug>.md`) an agent scopes to when it's assigned that work.

### `docs/CONTEXT.md` — the shared master (every agent reads this)

Keep it an **index, not a detail dump** — no schema dumps or test scenarios here; those live in the
contract files. It holds:

- **Objective** — the problem and the intended outcome, in a few lines.
- **User-story index** — one entry per story: its title, kebab-case slug, and a link to
  `docs/contracts/<slug>.md`, listed in build order.
- **Work-item dispatch table** — every work item across all stories. This is the `/sf-build`
  dispatch list and the global dependency graph:

  | # | Story | Work item | Metadata type | Config or code | Depends on | Commit |
  |---|---|---|---|---|---|---|

  - **Config rows** → built with the matching `generating-*` config skill.
  - **Code rows** → built by `salesforce-developer` (Apex via TDD; LWC/Flow via the validate loop).
  - `Story` links to the `docs/contracts/<slug>.md` that holds the row's full detail; `Depends on`
    orders the build — a row builds only after the rows it lists, config or code.
  - `Commit` — leave empty (`—`); `/sf-build` fills the short commit hash here when the row passes
    review, but only if checkpoint commits are enabled (below).
- **`Architect review: recommended | not needed`** — one line with a one-line reason, so `/sf-build`
  knows whether to invoke the `architect` agent without having to judge it itself. Recommend it when
  the design shows concrete complexity signals — a new or changed data model, cross-object
  automation, callouts / async (governor-limit risk), or a multi-domain or many-item build;
  otherwise mark it *not needed*.
- **`Checkpoint commits: enabled | disabled`** — one line recording the user's answer to the
  handoff checkpoint question (Phase 8). On `enabled`, `/sf-build` commits each work item on the
  current branch as it passes review and fills the `Commit` column / contract Build log; on
  `disabled` (the default) it commits nothing. This is the recorded grant — see
  [`docs/ORCHESTRATION.md`](../../docs/ORCHESTRATION.md) **Checkpoint commits**.
- **Decisions & assumptions (cross-cutting)** — material decisions that span stories, each with its
  reason; any decision the user deferred, resolved with the recommended option and marked
  **assumption**; and — in Revise mode — for any reversal of a prior decision, a short rationale
  (what changed and why) when it was hard to reverse, surprising, or a real trade-off. Decisions
  local to one story live in that story's contract file.

### `docs/contracts/<slug>.md` — one per user story (the scoped contract)

Each file must be **self-contained enough that `/sf-build` can cut a work brief from it without
opening any other story**. Use the same kebab-case `<slug>` as the index entry. It holds:

- **Story** — title, objective, and acceptance criteria.
- **Work items in detail** — for each item the story owns (matching its rows in the dispatch table),
  numbered `§1`, `§2`, …: **Schema context** (verified object/field/relationship API names),
  **Test scenarios** (concrete given/when/then — required for every code item), **Constraints**
  (project-specific rules), **Expected outputs** (artifacts to produce), **Validation criteria**
  (exit conditions). Write each complete enough that `/sf-build` rediscovers nothing.
- **Decisions & assumptions (story-specific)** — decisions local to this story, each with its reason.
- **Build log** — leave a stub heading; `/sf-build` fills it (only when checkpoint commits are
  enabled), one line per work item: `§N <work item> — <short hash> · review passed · <date>`. This
  is the per-story handover record; the dispatch table's `Commit` column is its index.

A work brief's **Spec reference** is the story's `docs/contracts/<slug>.md` (with optional in-file
`§N` for a work item within it). These fields align with the work-brief template in
[`docs/ORCHESTRATION.md`](../../docs/ORCHESTRATION.md): Objective, Spec reference, Schema context,
Test scenarios, Constraints, Dependencies, Expected outputs, Validation criteria.

## Revise mode — when a context already exists

When `docs/CONTEXT.md` (or a context doc the user names) is already present, treat it as **prior
truth** and build on it — never overwrite it blind. First classify what you're starting from, then
proceed:

- **An already-structured spec** — a `docs/CONTEXT.md` with the work-item dispatch table (usually
  alongside `docs/contracts/*.md`), e.g. from a prior `/sf-plan` session → **revise it in place**
  via the rules below.
- **A context doc not yet in this structure** — a hand-written brief, a doc from another tool, or a
  free-form `CONTEXT.md` with no dispatch table and no contract files → **adopt and structure it**:
  read its content as authoritative requirements and decisions, grill the gaps it leaves (schema,
  config-vs-code calls, test scenarios) like a fresh plan, then write the two-tier Output contract
  *from* it — `docs/CONTEXT.md` (index + dispatch table) and the `docs/contracts/<slug>.md` files —
  preserving its decisions and terminology rather than discarding or contradicting them.

When revising an already-structured spec:

- **Read it as prior truth.** The master's index/decisions and the existing `docs/contracts/*.md`
  are the established baseline. Reconcile the new requirement's language against both the existing
  spec **and** the org schema — challenge a term on sight when they conflict ("the spec calls this
  *Order Line*; you said *cart item* — same object?").
- **Grill the new requirement against it.** Surface where the new ask contradicts a prior decision
  or shifts a shared assumption, and resolve it with the user before writing.
- **Revise in place, at the right tier.** Amend the affected story's `docs/contracts/<slug>.md` and
  update its rows in the `docs/CONTEXT.md` dispatch table and index; add a **new**
  `docs/contracts/<slug>.md` (plus its index entry and rows) for a new story. Leave untouched what
  the change doesn't affect, and leave no stale rows or orphaned contract files behind.
- **Record reversals.** When the change reverses a prior decision, note what changed and why in the
  matching Decisions & assumptions section (cross-cutting in `CONTEXT.md`, story-local in the
  contract file) — don't silently flip a documented choice.
- The completeness gate then runs over the **merged** spec.

## Decision references

Read the pack that matches the fork you're resolving — progressive disclosure, don't load all of
them up front:

- `references/automation-decision.md` — roll-up / validation rule / record-triggered Flow / Apex
  trigger, plus async and scheduled choices.
- `references/ui-decision.md` — page layout & Dynamic Forms / Screen Flow / LWC, and placement.
- `references/data-model-decision.md` — standard vs custom object, relationship type, where
  config/data lives (CMT / custom setting / Big Object / External Object), and large-data-volume design.
- `references/integration-decision.md` — talking to an external system: Named Credential auth, the
  External Services / Flow callout / Apex ladder, pattern selection, Platform Events vs CDC, and
  Salesforce Connect for external data.

These are curated decision criteria, kept current against official Salesforce documentation by the
repo maintainer (re-validated each release). Decide from them; if a pack looks out of date or
conflicts with what the org shows, say so and flag it — don't fetch docs at runtime.
