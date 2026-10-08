---
name: sf-plan
description: "Salesforce design and planning. Turns sf-research's output into a verified, completeness-checked design contract before any build: docs/solution-design.md, docs/CONTEXT.md (objective, story index, dispatch table) and one docs/contracts/<slug>.md per story, or, given task-dir:, a dated plan and one goal file per story in that task folder. Makes the solution-shape and declarative-vs-code calls from its decision packs and runs sf-research first when research is missing; never re-explores the org itself and never starts the build. TRIGGER when: a feature or change needs more than one work item and has no live plan (the agent may invoke it on its own), or revising a design before a build. DO NOT TRIGGER when: a live plan exists and the task is to build (build from it, or /sf-build); a single-artifact change or one-line fix (author directly); or a question that needs no design."
allowed-tools: Read, Grep, Glob, Bash, AskUserQuestion, Skill
---

# Salesforce Planning (sf-plan)

Produce a verified, completeness-checked design contract **before any build**, working from the
**research docs** `sf-research` wrote (`docs/data-model.md`,
`docs/automation.md`, `docs/ui-design.md`, `docs/integration-patterns.md`, `docs/security-model.md`).
Output is `docs/solution-design.md` (the design), a lean `docs/CONTEXT.md`, and one
`docs/contracts/<slug>.md` per user story (see the Output contract below). This skill is **planning
only**: it does **not** re-explore the org or author any artifact (Apex, LWC, Flow, metadata) —
research gathered the current state, and the **build stage** builds. End by handing off to the build
stage — by default the user (or main agent) builds one story at a time from its contract; `/sf-build`
is an optional orchestrated mode for large multi-story builds.

## Task-folder mode — `task-dir: <path>`

When the invocation carries `task-dir: <absolute path>` (a task folder a workflow's `/task-init`
created), the plan lands in that folder and the story contract **is** the goal file, so no story is
tracked in two places. Without it, everything below about `docs/` holds unchanged. Never guess a
task folder; only an explicit `task-dir:` turns this mode on. Four things change:

1. **Inputs.** The objective is the live spec, `<task-dir>/specs/spec-*.md` with `status: live`:
   its **REQUIREMENTS > Committed** lines are the requirements. A *Not committed* line never becomes
   a story; list it in the plan under **Out of scope**. Its **OPEN QUESTIONS** are decision points
   to grill or to resolve as recorded assumptions. Read every `docs/<domain>.md` this skill names as
   that domain's latest `<task-dir>/findings/finding-*-research-<domain>.md`; if one is missing,
   run `sf-research` with the same `task-dir:`.
2. **Write nothing under the project's `docs/`.** Where this skill says to refine
   `docs/data-model.md` or `docs/automation.md` in place, record the settled name in the plan's
   schema section instead; findings are immutable.
3. **Outputs.** In place of the three `docs/` tiers:
   - **The plan** — `<task-dir>/plans/plan-YYYY-MM-DD-<slug>.md`. It holds everything
     `docs/solution-design.md` would, plus the `Architect review` line, an **Out of scope** list,
     and the dispatch table with columns `# | Goal | Work item | Metadata type | Config or code |
     Depends on` (`Goal` is the goal file's slug). There is no `Commit` column; the build records
     hashes in `built.md`. Frontmatter:

     ```markdown
     ---
     status: live
     source: specs/<spec file>
     research: [findings/<file>, ...]
     ---
     ```
   - **One goal per story** — `<task-dir>/goals/<story-slug>.md`. It carries everything a
     `docs/contracts/<slug>.md` would, so the build cuts its brief from it alone. The first goal in
     build order is `active`, the rest `next`. `ticket:` is the spec's `source:` when that is a key,
     otherwise the task folder's name:

     ```markdown
     ---
     status: next
     opened: YYYY-MM-DD
     ticket: XX-0001
     plan: plans/plan-YYYY-MM-DD-<slug>.md
     depends-on: [<goal slugs>]
     ---
     # <the story as a one-line outcome>

     ## OUTCOME
     <1-3 sentences: what is true when the story is done>

     ## ACCEPTANCE
     - [ ] <one checkable box per acceptance or validation criterion>

     ## STEPS
     1. [ ] §1 <work item> (<metadata type>, config|code)

     ## NOTES
     ### §1 <work item>
     Schema context, Test scenarios (given/when/then for every code item), Constraints, Expected
     outputs. Then the story-local decisions, each with its reason.
     ```
   - **Ledger lines** — one per cross-cutting decision in `<task-dir>/decided.md`
     (`- <decision> — because <one clause> → plans/<file>`) and one per losing alternative in
     `<task-dir>/ruled-out.md` (`- <alternative>: <why it lost> → plans/<file>`), inserted under
     each file's header paragraph, newest first. Never edit an existing line. The reasoning stays in
     the plan.
   - **Never** `docs/CONTEXT.md`, `handover.md` or anything under `docs/`.
4. **Revise mode.** With a live plan already in `plans/`, write a **new** dated plan and set the old
   one's frontmatter to `status: superseded-by plans/<new file>`, the only edit a plan ever takes.
   Update affected goals in place (goals are mutable), never unticking a box the build ticked; add a
   goal for a new story; give a goal for a dropped story a NOTES line naming the plan that dropped
   it, and never delete it.

The hand-off is the same: announce the plan and goal paths, print the summary, and stop before any
build.

## Prerequisite — the research docs must exist

Planning **consumes** the research stage's output; it does not rediscover the org. Before the phases:

1. **Take the objective from the `/sf-plan` prompt** and **determine the feature's domains** from the
   request — data model (almost always), automation (triggers / Flows / validation rules / roll-ups /
   async), UI, integration (an external system), and security / sharing / licensing. (`sf-research`
   does not hand off an objective; you state it to `/sf-plan` directly.)
2. **Require the matching research doc for each in-scope domain** — `docs/data-model.md`,
   `docs/automation.md`, `docs/ui-design.md`, `docs/integration-patterns.md`,
   `docs/security-model.md`.
3. **If a required research doc is missing, run `sf-research` for the missing domains first**
   (via the `Skill` tool), then continue — do **not** substitute your own ad-hoc exploration.
   Planning on un-researched ground is the exact failure this split removed. The research docs are the
   hard gate; `docs/CONTEXT.md` is your output, not a prerequisite (a *prior* CONTEXT.md from an
   earlier `/sf-plan` run triggers Revise mode — see Phase 1).
4. **Honor the docs' caveats.** A doc flagged `repo-only` or `LICENSING UNCONFIRMED` is a known risk —
   carry it into the design, don't silently resolve it by introspecting yourself.

Proceed to the phases only once every needed research doc is present.

## Operating rules

- **Grill toward shared understanding — read the research docs first, then offer choices.** Read the
  relevant `docs/*.md` research set *before* asking, so you can deduce the likely solution and the
  real decision points rather than fish with open-ended questions. Ask **one decision at a time** via the
  **`AskUserQuestion` picker** — precede each with a **brief prose framing** line that states why the
  fork matters (just enough to orient, not a wall of text), then offer the deduced choices in the
  picker: **2–4 options**, the **recommended one first with `(Recommended)` appended to its label**,
  and each option's `description` carrying the tradeoff/reason from the matching decision pack.
  Collapse a pack with more rows than will fit to the 2–4 that actually fit this feature, and lean on
  the auto-provided **"Other"** for anything outside that set. Use **`multiSelect: true`** when the
  decision is naturally multi-valued (e.g. which fields need FLS, which child relationships to
  reparent). Walk down each branch of the decision tree, resolving dependencies one-by-one across
  subsequent picker calls as branches open and close, until you and the user share the same picture
  of the solution. **Grill only what changes a work item, its schema, or a config-vs-code call** —
  don't ask preferences the spec doesn't depend on. Never ask what the research docs already answer —
  read them instead.
- **Verify from the research docs, don't re-introspect.** Every object, field, and relationship API
  name comes from the research docs, which already verified them against the org (or flagged
  `repo-only`). Pin the final names from there into each work item's *Schema context*, and refine
  `docs/data-model.md` / `docs/automation.md` in place when planning settles a name or detail. If a
  name a decision hinges on isn't in the docs, that's a **research gap** — send it back to
  `sf-research` rather than introspecting the org yourself, and carry any
  `repo-only` / `LICENSING UNCONFIRMED` caveat forward into the design.
- **Declarative-first, from the decision packs — not from memory.** Prefer standard objects and
  config — fields, roll-up summaries, validation rules, Flows, permission sets — over Apex; write
  code only for what the platform cannot do declaratively. Make each call from the matching pack
  (see *Decision references* below), and record the decision and its reason.
- **Reuse before invent.** Follow the naming, framework, selector, and test-factory patterns the
  research docs captured (`docs/automation.md`) and that already exist in the repo; do not introduce
  new abstractions the codebase doesn't already use.

## Phases

1. **Read the research docs and map the solution** — first check whether `docs/CONTEXT.md` (or a
   context doc the user points to) already exists. If an **already-structured spec** is present (a
   `docs/CONTEXT.md` that carries the work-item dispatch table, from a prior `/sf-plan` run), work in
   **Revise mode** (below) — treat it as prior truth, not something to overwrite. Otherwise you'll
   write `docs/CONTEXT.md` fresh. Confirm the prerequisite research docs are present (above). Then
   **read the research docs** the feature touches — `docs/data-model.md`,
   `docs/automation.md`, `docs/ui-design.md`, `docs/integration-patterns.md`,
   `docs/security-model.md` — plus the artifacts the prompt names, and from their current-state
   picture form a **candidate solution map**: what likely needs to change, what to reuse, and the
   open decision points — *before* you ask anything. You do **not** re-run org introspection; the
   research stage did that. The map is what you grill against. Size it to the whole surface: a
   requirement names the instance someone saw, and often the mechanism they expect to fix it. Check
   what else that mechanism reaches and how much of the problem the named mechanism actually covers;
   if it covers only part, say so in your first question.
2. **Grill the map into shared understanding** — confirm the candidate solution one decision at a
   time, each as a **brief framing line + `AskUserQuestion` picker** (recommended option first,
   tradeoffs in the option descriptions). Resolve the decision tree branch by branch — including
   purpose and success criteria — until nothing material is ambiguous. Don't re-ask what the research
   docs already answer.
3. **Solution shape (only when there's a real architectural fork)** — when the requirement admits
   genuinely different *whole-solution* architectures, present 2–3 shapes as a **single-select
   `AskUserQuestion` picker** (recommended shape first with `(Recommended)`, each shape's
   cross-cutting Salesforce tradeoff in its `description`); use the picker's optional **`preview`**
   field to sketch a shape side-by-side when a visual helps. These
   are architecture-level forks that span work items — e.g. extend a standard object vs introduce a
   new custom-object model; declarative orchestration (record-triggered Flow + invocable Apex) vs an
   Apex-trigger-owned domain; configure an existing feature/managed package vs build custom;
   real-time vs event-driven/async as the overall style. The chosen shape frames the triage and
   schema below. Skip this phase when one shape is obviously right — don't manufacture alternatives.
   Every "why not X" must name a property the recommended shape has and X lacks; a weakness both
   share is not a reason to reject X.
4. **Declarative-vs-code triage (per capability)** — within the chosen shape, decide config or code
   for each capability, working from the automation, UI, integration, and security decision packs (see
   *Decision references*). This is the per-piece tool choice (e.g. this rollup → roll-up summary
   field; this UI → Screen Flow or LWC; this callout → External Service / Named Credential; this
   record-access rule → sharing rule vs Apex managed sharing), not the whole-solution fork above.
   Standard object before custom. Record each decision with its reason.
5. **Schema design (from the data-model doc)** — pin the data model with the real API names **from
   `docs/data-model.md`** (already org-verified), applying the data-model decision pack (see *Decision
   references*) to any standard-vs-custom, relationship-type, config/data-storage, or large-data-volume
   choice the research surfaced as still open. Refine `docs/data-model.md` in place when a choice
   settles a name or relationship. This becomes each work item's *Schema context*.
6. **Write the spec** — `docs/solution-design.md` (the design narrative), a lean `docs/CONTEXT.md`,
   and the per-story `docs/contracts/<slug>.md` files, per the Output contract below (in task-folder
   mode, the plan, the goals and the ledger lines instead). Scale detail to
   complexity; do not pad a small change.
7. **Completeness self-review (the gate)** — refuse to finish if any of these fail; fix and
   re-check:
   - every requirement has a home (a work-item row),
   - every object/field/relationship API name is pinned from the research docs (not guessed); any
     research gap was sent back to `sf-research`, not patched over,
   - every claim about existing behaviour ("unused, safe to delete", "nothing else writes this
     field") cites the grep or query that proves it — a premise carried in from the request is not
     evidence,
   - every **code** item carries concrete given/when/then test scenarios,
   - security is addressed (permission set / FLS / sharing model — from the security decision pack),
   - the design is bulk-safe and scales as data grows (assume it will),
   - no placeholders, contradictions, or unresolved questions remain — a decision the user deferred
     ("you decide") is resolved by you with the recommended option and recorded as an explicit
     assumption, which counts as resolved.
8. **Hand off** — do this exactly:
   - announce: *"Plan generated at `docs/solution-design.md` + `docs/CONTEXT.md`."*
   - print a **high-level summary to the CLI**: objective, the config-vs-code work-item list, key
     design decisions, and risks — enough to review without opening the file.
   - tell the user: review the summary; open `docs/solution-design.md` and `docs/CONTEXT.md` (and the
     relevant `docs/contracts/<slug>.md`) for full detail if doubtful; have the developer/architect
     review the spec (a manual step); then build — by default one story at a time from its contract
     (a fresh session per story keeps context lean), or via `/sf-build` for an orchestrated build.
   - **do not start building yourself or invoke `/sf-build`** — stop here. The spec is meant to be
     reviewed before any build, so leave the decision to proceed with the user.

## Output contract — `docs/solution-design.md` + `docs/CONTEXT.md` + `docs/contracts/<slug>.md`

Write the plan in **three tiers** so each agent reads only what its work needs, not the whole design:
the design narrative (`docs/solution-design.md`, the reasoning the architect reviews), a small shared
master (`docs/CONTEXT.md`, the lean index every agent reads), and one detailed contract file per user
story (`docs/contracts/<slug>.md`) an agent scopes to when it's assigned that work. The research docs
(`docs/data-model.md`, `docs/automation.md`, …) remain the current-state reference all three cite.

### `docs/solution-design.md` — the design (the architect reviews this)

The planning narrative — *what* we'll build and *why*, given the research picture. Keep it the
reasoning, not a restatement of the dispatch table. It holds:

- **Solution shape** — the chosen architecture (Phase 3) and why, with the alternatives considered
  and the reason they lost.
- **Declarative-vs-code triage** — the per-capability config-or-code decisions (Phase 4), each with
  its reason and the decision pack it came from.
- **Schema design summary** — what the design adds or changes in the data model; the full inventory
  stays in `docs/data-model.md` (refined in place), not here.
- **Cross-cutting decisions & assumptions** — material decisions that span stories, each with its
  reason; any decision the user deferred, resolved with the recommended option and marked
  **assumption**; in Revise mode, reversals with a short rationale (what changed and why).
- **Research caveats carried forward** — any `repo-only` / `LICENSING UNCONFIRMED` flags from the
  research docs that remain live risks the build and review must respect.

### `docs/CONTEXT.md` — the shared master (every agent reads this)

`sf-plan` **owns this file** and writes its full structure from scratch (taking the objective from the
`/sf-plan` prompt). `sf-research` never writes it. When a prior structured spec already exists, revise
it in place rather than overwriting (Revise mode).

Keep it an **index, not a detail dump** — no schema dumps, test scenarios, or design rationale here;
those live in the contract files and `docs/solution-design.md`. It holds:

- **Objective** — the problem and the intended outcome, in a few lines (from the `/sf-plan` prompt).
- **User-story index** — one entry per story: its title, kebab-case slug, and a link to
  `docs/contracts/<slug>.md`, listed in build order.
- **Work-item dispatch table** — every work item across all stories. This is the build dispatch list
  and the global dependency graph — the main agent's work index by default, or `/sf-build`'s dispatch
  list in orchestrated mode:

  | # | Story | Work item | Metadata type | Config or code | Depends on | Commit |
  |---|---|---|---|---|---|---|

  - **Config rows** → authored directly by the main agent (declarative metadata, inline).
  - **Code rows** → built by `salesforce-developer` (Apex via TDD; LWC/Flow via the validate loop).
  - `Story` links to the `docs/contracts/<slug>.md` that holds the row's full detail; `Depends on`
    orders the build — a row builds only after the rows it lists, config or code.
  - `Commit` — leave empty (`—`); the build fills the short commit hash here when the row passes
    review.
- **Doc pointers** — links to the research docs the stories build on (`docs/data-model.md`,
  `docs/automation.md`, `docs/ui-design.md`, `docs/integration-patterns.md`, `docs/security-model.md`
  — those that apply) and to `docs/solution-design.md`. The dispatch table and contracts cite these
  rather than repeating their content.
- **`Architect review: recommended | not needed`** — one line with a one-line reason, so the build
  knows whether to invoke the `architect` agent (the solution-design gate — design review and the
  end-of-sprint whole-build inspection against the design contract) without having to judge it
  itself. Recommend it when the design shows concrete complexity signals — a new or changed data
  model, cross-object automation, callouts / async (governor-limit risk), or a multi-domain or
  many-item build; otherwise mark it *not needed*.
- **Design rationale** — the chosen solution shape, cross-cutting decisions, and assumptions live in
  `docs/solution-design.md`, not here; story-local decisions live in each contract file. CONTEXT
  stays the index.

### `docs/contracts/<slug>.md` — one per user story (the scoped contract)

Each file must be **self-contained enough that the build can cut a work brief from it without
opening any other story** — whether the main agent works the story directly (the default, a fresh
session per contract) or `/sf-build` dispatches it. Use the same kebab-case `<slug>` as the index
entry. It holds:

- **Story** — title, objective, and acceptance criteria.
- **Work items in detail** — for each item the story owns (matching its rows in the dispatch table),
  numbered `§1`, `§2`, …: **Schema context** (the object/field/relationship API names, pinned from
  `docs/data-model.md`),
  **Test scenarios** (concrete given/when/then — required for every code item), **Constraints**
  (project-specific rules), **Expected outputs** (artifacts to produce), **Validation criteria**
  (exit conditions). Write each complete enough that the build rediscovers nothing.
- **Decisions & assumptions (story-specific)** — decisions local to this story, each with its reason.
- **Build log** — leave a stub heading; the build fills it, one line per work item: `§N <work item> — <short hash> · review passed · <date>`. This
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
  alongside `docs/solution-design.md` and `docs/contracts/*.md`), e.g. from a prior `/sf-plan`
  session → **revise it in place** via the rules below.
- **A context doc not yet in this structure** — a hand-written brief, a doc from another tool, or a
  free-form `CONTEXT.md` with no dispatch table and no contract files → **adopt and structure it**:
  read its content as authoritative requirements and decisions, grill the gaps it leaves (schema,
  config-vs-code calls, test scenarios) like a fresh plan, then write the three-tier Output contract
  *from* it — `docs/solution-design.md` (design), `docs/CONTEXT.md` (index + dispatch table), and the
  `docs/contracts/<slug>.md` files — preserving its decisions and terminology rather than discarding
  or contradicting them.

When revising an already-structured spec:

- **Read it as prior truth.** The master's index/decisions and the existing `docs/contracts/*.md`
  are the established baseline. Reconcile the new requirement's language against both the existing
  spec **and** the research docs — challenge a term on sight when they conflict ("the spec calls this
  *Order Line*; you said *cart item* — same object?").
- **Grill the new requirement against it.** Surface where the new ask contradicts a prior decision
  or shifts a shared assumption, and resolve it with the user before writing.
- **Revise in place, at the right tier.** Amend the affected story's `docs/contracts/<slug>.md` and
  update its rows in the `docs/CONTEXT.md` dispatch table and index; reflect any cross-cutting change
  in `docs/solution-design.md`; add a **new** `docs/contracts/<slug>.md` (plus its index entry and
  rows) for a new story. Leave untouched what the change doesn't affect, and leave no stale rows or
  orphaned contract files behind.
- **Record reversals.** When the change reverses a prior decision, note what changed and why in the
  matching Decisions & assumptions section (cross-cutting in `docs/solution-design.md`, story-local in
  the contract file) — don't silently flip a documented choice.
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
- `references/security-decision.md` — the access model: org-wide default, the record-access ladder
  (role hierarchy / sharing rules / manual / Apex managed sharing), restriction rules, permission
  sets vs profiles, FLS, and Experience Cloud / guest access.

These are curated decision criteria, kept current against official Salesforce documentation by the
repo maintainer (re-validated each release). Decide from them; if a pack looks out of date or
conflicts with what the research docs show, say so and flag it — don't fetch docs at runtime.
