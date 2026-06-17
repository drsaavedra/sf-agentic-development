---
name: sf-build
description: "Orchestrated Salesforce build-and-review pipeline. Reads the approved design contract at docs/tech-spec.md, dispatches config skills and the salesforce-developer agent per work item, then runs the reviewing-* battery as a deterministic gate. TRIGGER when: the user asks to build, implement, or execute an existing spec (docs/tech-spec.md is present) — e.g. 'build the spec', 'implement the plan', 'let's build it'. DO NOT TRIGGER when: no spec exists yet (run /sf-plan first); immediately after /sf-plan unless the user signals to proceed (the spec is meant to be reviewed first); or for ad-hoc edits, fixes, single-artifact config, or review-only tasks (use the matching generating-* / reviewing-* skill). Deploys remain human-gated regardless."
allowed-tools: Agent, Skill, Read, Grep, Glob, Bash
---

# Salesforce Build Orchestrator (sf-build)

Build and review against the approved spec at `docs/tech-spec.md`. Run **inline** (this skill is
never forked) so the spec and conversation context stay available. This skill assumes the spec has
already been reviewed by the user (and developer/architect if they chose) — that review is a
manual step that happens **before** this skill is invoked.

**Only run when the user has indicated they want to build.** If you're arriving straight from
`/sf-plan`, confirm the user wants to proceed before dispatching — the spec is meant to be reviewed
first. This human checkpoint lives in the trigger conditions and this instruction, not in a
frontmatter flag, so it holds across every assistant.

## Preconditions

- `docs/tech-spec.md` exists and contains the work-item table. If it is missing or has no table,
  **stop** and tell the user to run `/sf-plan` first.
- Read the spec and its work-item table in full before dispatching anything.

## Orchestration (in order)

1. **Parse the spec.** Read `docs/tech-spec.md`; split the work-item table into **config rows**
   and **code rows**. Verify object/field API names against the org (read-only `sf sobject
   describe`) before acting on any row.
2. **Build config rows inline** with the matching `generating-*` skill — `generating-custom-object`,
   `generating-custom-field`, `generating-validation-rule`, `generating-permission-set`,
   `generating-flexipage`, `generating-list-view`, etc. These stay with the main agent; they are
   not dispatched to a subagent.
3. **Build code rows via `salesforce-developer`.** For each code row, cut a **work brief** from the
   spec — Objective, Spec reference `§N`, Schema context, Test scenarios, Constraints,
   Dependencies, Expected outputs, Validation criteria — and dispatch the `salesforce-developer`
   agent with the `Agent` tool. Run independent items in **parallel**; sequence a dependent chain
   in a **single** brief, or pin the integration contract up front and verify at one combined
   validate at the merge point.
4. **Review gate.** After the developer returns, run the `reviewing-*` battery over the produced
   artifacts via the `Skill` tool — every applicable one, so the gate is deterministic:
   - `reviewing-apex` for `.cls` / `.trigger`,
   - `reviewing-lwc` for `lwc/**`,
   - `reviewing-flow` for `*.flow-meta.xml`.
   Feed any findings back to `salesforce-developer` as a fix brief and re-review until clean.
5. **Architect build review (on demand).** Invoke the `architect` agent for an independent build
   review when the work warrants it (per the orchestration rules). A **BLOCKED** report re-briefs
   `salesforce-developer` with its Recommended Actions; re-review afterward.

## Rules

- **Deploys stay human-gated.** Validate is allowed — display the full command and confirm the
  first validate of a TDD loop (later iterations re-run automatically). **Never deploy** without
  explicit user approval.
- **Never run git** (commit, push, branch, or any variant) unless the user explicitly asked in the
  current request.
- Track progress through **build summaries**, not raw diffs. Subagents never run git.
- **Report at the end:** what was built (config + code), the review-gate results, and any BLOCKED
  items still open.
