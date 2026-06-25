---
name: sf-plan
description: "Salesforce design and planning — turns the reviewed research docs (docs/data-model.md, docs/automation.md, docs/ui-design.md, docs/integration-patterns.md, docs/security-model.md, written by the researching-* skills) into a verified, completeness-checked design contract before any build: docs/solution-design.md, a lean docs/CONTEXT.md (objective, story index, work-item dispatch table, doc pointers), and one docs/contracts/<slug>.md per story. Makes the solution-shape and declarative-vs-code calls from the decision packs; does not re-explore the org — research already did. TRIGGER when: planning a feature whose research docs exist, or revising a design before a build. DO NOT TRIGGER when: the feature's research docs don't exist yet (run the matching researching-* skill first), a spec already exists and the task is to build (use /sf-build), or a trivial one-line fix."
allowed-tools: Read, Grep, Glob, Bash, AskUserQuestion
---

# Salesforce Planning (sf-plan)

Produce a verified, completeness-checked design contract **before any build**, working from the
**research docs** the `researching-*` skills already wrote and a human reviewed (`docs/data-model.md`,
`docs/automation.md`, `docs/ui-design.md`, `docs/integration-patterns.md`, `docs/security-model.md`).
Output is `docs/solution-design.md` (the design), a lean `docs/CONTEXT.md`, and one
`docs/contracts/<slug>.md` per user story (see the Output contract below). This skill is **planning
only**: it does **not** re-explore the org or author any artifact (Apex, LWC, Flow, metadata) —
research gathered the current state, and the **build stage** builds. End by handing off to the build
stage — by default the user (or main agent) builds one story at a time from its contract; `/sf-build`
is an optional orchestrated mode for large multi-story builds.

## Prerequisite — the research docs must exist

Planning **consumes** the research stage's output; it does not rediscover the org. Before the phases:

1. **Determine the feature's domains** from the request — data model (almost always), automation
   (triggers / Flows / validation rules / roll-ups / async), UI, integration (an external system),
   and security / sharing / licensing.
2. **Require the matching research doc for each domain** — `docs/data-model.md`, `docs/automation.md`,
   `docs/ui-design.md`, `docs/integration-patterns.md`, `docs/security-model.md`.
3. **If a required doc is missing, stop.** Name the gap and tell the user to run the matching
   `researching-*` skill (and review its doc) first — do **not** substitute your own exploration.
   Planning on un-researched ground is the exact failure this split removed.
4. **Honor the docs' caveats.** A doc flagged `repo-only` or `LICENSING UNCONFIRMED` is a known risk —
   carry it into the design, don't silently resolve it by introspecting yourself.

Proceed to the phases only once every needed doc is present.

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
  name a decision hinges on isn't in the docs, that's a **research gap** — send it back to the
  matching `researching-*` skill rather than introspecting the org yourself, and carry any
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
   context doc the user points to) already exists; if so, work in **Revise mode** (below) — treat it
   as prior truth, not something to overwrite. Confirm the prerequisite research docs are present
   (above). Then **read the research docs** the feature touches — `docs/data-model.md`,
   `docs/automation.md`, `docs/ui-design.md`, `docs/integration-patterns.md`,
   `docs/security-model.md` — plus the artifacts the prompt names, and from their current-state
   picture form a **candidate solution map**: what likely needs to change, what to reuse, and the
   open decision points — *before* you ask anything. You do **not** re-run org introspection; the
   research stage did that. The map is what you grill against.
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
   and the per-story `docs/contracts/<slug>.md` files, per the Output contract below. Scale detail to
   complexity; do not pad a small change.
7. **Completeness self-review (the gate)** — refuse to finish if any of these fail; fix and
   re-check:
   - every requirement has a home (a work-item row),
   - every object/field/relationship API name is pinned from the research docs (not guessed); any
     research gap was sent back to the matching `researching-*` skill, not patched over,
   - every **code** item carries concrete given/when/then test scenarios,
   - security is addressed (permission set / FLS / sharing model — from the security decision pack),
   - the design is bulk-safe and scales as data grows (assume it will),
   - no placeholders, contradictions, or unresolved questions remain — a decision the user deferred
     ("you decide") is resolved by you with the recommended option and recorded as an explicit
     assumption, which counts as resolved.
8. **Hand off** — do this exactly:
   - **Settle checkpoint mode first — before the summary.** Detect whether the project folder is a
     git repo (`git rev-parse --is-inside-work-tree`):
     - **Git repo present** → **ask once whether to enable checkpoint commits** for the build, via
       the `AskUserQuestion` picker (Enabled / Disabled, recommended *Enabled* for long or multi-item
       builds): *"Should the build checkpoint-commit each work item as it passes review (on the
       current branch), so progress is captured and referenceable in a handover?"*
     - **No git repo** → offer to initialize one via the picker (*Initialize git* / *Skip*). If the
       user accepts, run `git init` in the project folder, then ask the checkpoint question above. If
       the user declines, skip checkpoint entirely — it needs a repo — and move on.
     - Record the outcome as the `Checkpoint commits: enabled | disabled` line in `docs/CONTEXT.md`
       (default *disabled* when declined, or when there's no repo and the user skipped init).
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

Keep it an **index, not a detail dump** — no schema dumps, test scenarios, or design rationale here;
those live in the contract files and `docs/solution-design.md`. It holds:

- **Objective** — the problem and the intended outcome, in a few lines.
- **User-story index** — one entry per story: its title, kebab-case slug, and a link to
  `docs/contracts/<slug>.md`, listed in build order.
- **Work-item dispatch table** — every work item across all stories. This is the build dispatch list
  and the global dependency graph — the main agent's work index by default, or `/sf-build`'s dispatch
  list in orchestrated mode:

  | # | Story | Work item | Metadata type | Config or code | Depends on | Commit |
  |---|---|---|---|---|---|---|

  - **Config rows** → built with the matching `generating-*` config skill.
  - **Code rows** → built by `salesforce-developer` (Apex via TDD; LWC/Flow via the validate loop).
  - `Story` links to the `docs/contracts/<slug>.md` that holds the row's full detail; `Depends on`
    orders the build — a row builds only after the rows it lists, config or code.
  - `Commit` — leave empty (`—`); the build fills the short commit hash here when the row passes
    review, but only if checkpoint commits are enabled (below).
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
- **`Checkpoint commits: enabled | disabled`** — one line recording the user's answer to the
  handoff checkpoint question (Phase 8). On `enabled`, the build commits each work item on the
  current branch as it passes review and fills the `Commit` column / contract Build log; on
  `disabled` (the default) it commits nothing. This is the recorded grant — see
  [`docs/ORCHESTRATION.md`](../../docs/ORCHESTRATION.md) **Checkpoint commits**.
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
- **Build log** — leave a stub heading; the build fills it (only when checkpoint commits are
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
