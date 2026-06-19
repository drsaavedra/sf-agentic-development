---
name: sf-build
description: "Orchestrated Salesforce build-and-review pipeline. Reads the approved design contract at docs/CONTEXT.md (its work-item dispatch table) and the per-story docs/contracts/<slug>.md detail, dispatches config skills and the salesforce-developer agent per work item, then runs the reviewing-* battery as a deterministic gate. TRIGGER when: the user asks to build, implement, or execute an existing spec (docs/CONTEXT.md is present) — e.g. 'build the spec', 'implement the plan', 'let's build it'. DO NOT TRIGGER when: no spec exists yet (run /sf-plan first); immediately after /sf-plan unless the user signals to proceed (the spec is meant to be reviewed first); or for ad-hoc edits, fixes, single-artifact config, or review-only tasks (use the matching generating-* / reviewing-* skill). Deploys remain human-gated regardless."
allowed-tools: Agent, Skill, Read, Grep, Glob, Bash
---

# Salesforce Build Orchestrator (sf-build)

Build and review against the approved spec — the shared `docs/CONTEXT.md` (its work-item dispatch
table) plus the per-story detail in `docs/contracts/<slug>.md`. Run **inline** (this skill is never
forked) so the spec and conversation context stay available.

**Only run when the user has indicated they want to build.** The spec is meant to be reviewed first
(by the user, and developer/architect if they chose) — a manual step that happens **before** this
skill runs. If you're arriving straight from `/sf-plan`, confirm the user wants to proceed before
dispatching. This human checkpoint lives in the trigger conditions and this instruction, not a
frontmatter flag, so it holds across every assistant.

## Preconditions

- `docs/CONTEXT.md` exists and contains the work-item dispatch table. If it is missing or has no
  table, **stop** and tell the user to run `/sf-plan` first.
- Read `docs/CONTEXT.md` — the dispatch table, dependency order, and `Architect review` flag — in
  full before dispatching anything. Read each story's `docs/contracts/<slug>.md` for detail as you
  reach its rows; you don't need every contract loaded up front.

## Orchestration (in order)

1. **Parse the spec.** Read the work-item dispatch table in `docs/CONTEXT.md`; split it into
   **config rows** and **code rows**, and order the build by the table's **`Depends on`** column — a
   row builds only after the rows it depends on, config or code. For each row, open the detail in its
   story's `docs/contracts/<slug>.md` (the `Story` column points to it). Verify object/field API
   names against the org (read-only `sf sobject describe`) before acting on any row. Then **check
   each row against `force-app/**`: if its artifact already exists** (a revised spec, or a re-run),
   mark it for *additive modification*, not recreation — build greenfield only the rows with no
   existing artifact, and never clobber a row the change doesn't touch.
2. **Build config rows inline** with the matching `generating-*` skill — `generating-custom-object`,
   `generating-custom-field`, `generating-validation-rule`, `generating-permission-set`,
   `generating-flexipage`, `generating-list-view`, etc. These stay with the main agent; they are
   not dispatched to a subagent. **Integration config** — Named Credentials, External Credentials,
   External Services, Platform Events, CDC — is built with `building-sf-integrations` (a code row
   that also needs Apex callout logic goes to `salesforce-developer`, which applies the same skill).
   For a row whose metadata already exists, modify it additively rather than regenerating over local
   changes.
3. **Build code rows via `salesforce-developer`.** For each code row, cut a **work brief** from its
   story's `docs/contracts/<slug>.md` — Objective, Spec reference (the contract file, `§N` for the
   work item within it), Schema context, Test scenarios, Constraints, Dependencies, Expected
   outputs, Validation criteria — and dispatch the `salesforce-developer` agent with the `Agent`
   tool. Fold the relevant **Decisions & assumptions** — the story-specific ones from the contract
   file plus any cross-cutting ones from `docs/CONTEXT.md` — into the brief's *Constraints* so the
   build can't contradict a recorded decision. If the row's
   artifact already exists, brief the developer to **modify it additively**, preserving existing
   behavior. Run independent items in **parallel**; sequence a dependent chain in a **single** brief,
   or pin the integration contract up front and verify at one combined validate at the merge point.
4. **Review gate.** After the developer returns, run the `reviewing-*` battery over the produced
   artifacts via the `Skill` tool — every applicable one, so the gate is deterministic:
   - `reviewing-apex` for `.cls` / `.trigger`,
   - `reviewing-lwc` for `lwc/**`,
   - `reviewing-flow` for `*.flow-meta.xml`.
   Feed any findings back to `salesforce-developer` as a fix brief and re-review until clean.
5. **Architect build review — only when triggered, never by your own judgment.** Invoke the
   `architect` agent only if one of these holds; otherwise skip it and say so in the final report:
   - the **spec flags** `Architect review: recommended`,
   - the **user asked** for an architect or design review (now or during planning),
   - the **review gate (step 4) can't reach clean** after a fix round — escalate to the architect
     to adjudicate.
   A **BLOCKED** report re-briefs `salesforce-developer` with its Recommended Actions; re-review
   afterward.

## Rules

- **Deploys stay human-gated.** Validate is allowed — display the full command and confirm the
  first validate of a TDD loop (later iterations re-run automatically). **Never deploy** without
  explicit user approval.
- **Never run git** (commit, push, branch, or any variant) unless the user explicitly asked in the
  current request.
- Track progress through **build summaries**, not raw diffs. Subagents never run git.
- **Report at the end:** what was built, modified, or skipped as already-current (config + code),
  the review-gate results, and any BLOCKED items still open.
