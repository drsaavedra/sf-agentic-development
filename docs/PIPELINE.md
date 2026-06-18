# The Plan → Build Pipeline

> The summary lives in the [README](../README.md#planning-and-building-a-feature); this is the full
> detail — why a custom planning skill (not plan mode, not a generic brainstormer), the grilling
> pattern, the spec / work-item contract, and how it feeds the agents.

## Summary

A two-skill pipeline for planned feature work:

1. **`sf-plan`** — a Salesforce-native planning/brainstorming skill that interrogates the
   requirement, makes the declarative-vs-code decisions, verifies the schema, and writes a
   completeness-checked design contract to `docs/tech-spec.md`.
2. **`sf-build`** — an orchestrator that builds and reviews *against that spec* (dispatches
   `salesforce-developer` and `architect`, then runs the `reviewing-*` battery).

`sf-plan` replaces reliance on the CLI agent's native **plan mode**. `sf-build` is
model-invocable but gated by a tight TRIGGER / DO NOT TRIGGER description so it doesn't fire
before the spec is reviewed. The two are joined by a file on disk (`docs/tech-spec.md`), not by
conversation context.

---

## Background — why a custom planning skill?

`sf-plan` exists because neither obvious alternative fits: native **plan mode** is the wrong
*mechanism*, and a **generic brainstorming skill** is the wrong *shape* for Salesforce.

### Plan mode is the wrong mechanism

Plan mode is an enforced read-only permission gate — good at *safety*, but bad as the front of an
orchestrated build, for two reasons:

1. **"Accept plan and build" can't live in a slash command.** While plan mode is active the gate is
   closed; typing `/sf-build accept plan` does nothing useful. Approval is a dialog action, not
   prose, so it can't be folded into the build command.
2. **Approval can wipe context.** The exit dialog has an option that clears context on approval. If
   chosen, `/sf-build` wakes with no memory of the plan it is supposed to execute.

Both are symptoms of the same root causes: a *hard gate* plus *ephemeral context*. A planning
skill fixes both — it runs in normal mode (context preserved) and **persists the plan to a file**
(`docs/tech-spec.md`) instead of relying on the conversation. That persistence also feeds
infrastructure we already have: `salesforce-developer` reads a **Technical Specification**; the
**Agent → Spec Doc Map** reserves an input path for it; and the work briefs in
[`docs/ORCHESTRATION.md`](ORCHESTRATION.md) reference spec sections as `docs/tech-spec.md §N`. So
the plan's output is the input the agents were already built to consume.

### A generic brainstormer is the wrong shape

The *spine* of [superpowers' brainstorming](https://github.com/obra/superpowers) is sound (explore
→ questions one at a time → approaches → design doc → self-review → hand off), and we borrow it. But
a Salesforce build is a fundamentally different shape of problem:

| Generic brainstorming assumes | Salesforce reality | What `sf-plan` does instead |
|---|---|---|
| You design a data layer (DB, schema, migrations) | The platform owns the data layer; you pick a **standard object** or declare a **custom object/field** | A **declarative-first triage**: standard-before-custom, config-before-code |
| Security is something you design | FLS / CRUD / sharing are platform primitives | Security becomes a **permission-set + `with sharing`** decision, not an auth design |
| "What framework / stack?" | It's **Apex** (Java-*ish*, not Java) and **LWC** (its own framework) — non-negotiable | Skips stack questions; asks the Salesforce fork questions (Screen Flow vs LWC, Flow vs Apex, sync vs async) |
| Brainstorm → `writing-plans` → implement | Our `/sf-build` + work-brief template already do task decomposition | **Collapse** brainstorm + writing-plans into one skill; the output feeds `/sf-build` directly |
| You build integrations (auth, servers, API plumbing) | **Connected Apps**, **Named Credentials**, and **External Services** are platform primitives | Routes integration to Named Credential / External Service config (`building-sf-integrations`), not bespoke plumbing |
| You build and host an external-facing web app / SPA | **Experience Cloud** delivers external-facing sites on-platform | Routes a public/partner site to an **Experience site**, not a from-scratch web app |
| Unconstrained OOP / high-level paradigms | **Governor limits** cap SOQL / DML / CPU / heap per transaction — the same patterns don't carry over | Designs **bulk-safe by construction**: no per-record SOQL/DML, batch/async for volume |

The distinctive Salesforce move — the one a generic skill cannot have — is the **config-vs-code
gate**: for every requirement, ask whether a rollup field, validation rule, Flow, or standard
object can do it *before* any Apex is written. We do not stand up databases or build auth; we decide
what the platform already does declaratively, and write code only for what it can't. The same gate
runs for UI: **Screen Flow vs LWC** turns on complexity and use case — a guided, admin-maintainable
process leans Screen Flow, rich client-side interactivity leans LWC — and because Screen Flow's
reach grows each release (it now supports reactive screens and can embed LWCs), `sf-plan` makes the
call from the maintainer-grounded `ui-decision` pack, not stale assumptions about what Screen Flow
can't do. Two more Salesforce-native habits follow: schema is **verified against the org, not guessed**, and scale is
treated as a **constant** — every design is bulk-safe by construction, never sized per feature.

That is the whole answer: a Salesforce-native planning skill that persists a reviewable design
contract.

---

## The resulting pipeline

```
/sf-plan  →  docs/tech-spec.md  →  [spec reviewed]  →  [user signals "build it"]  →  dev agent ─┐
 (soft gate,    (the design          (dev/architect      (soft gate: description                → architect ─┤→ review battery
  context kept,  contract)            review first)        TRIGGER rules + body                              │
  no plan mode)                                            instruction)             reads spec ──────────────┘
```

**Output contract.** `docs/tech-spec.md` is written with numbered sections and a **work-item
table** so each row maps to a work brief (`docs/ORCHESTRATION.md` template fields: Objective,
Spec reference `§N`, Schema context, Test scenarios, Constraints, Dependencies, Expected outputs,
Validation criteria). The table tags each item **config vs code**:

- **config rows** → main agent runs the `generating-*` config skills,
- **code rows** → `/sf-build` cuts a work brief and dispatches `salesforce-developer`.

That table *is* the `/sf-build` dispatch list.

### Spec review and hand-off

The spec review is a **manual step between `/sf-plan` and `/sf-build`**, owned by the human — not
automated inside either skill. The flow at the end of `/sf-plan`:

1. `sf-plan` announces: *"Plan generated at `docs/tech-spec.md`."*
2. It prints a **high-level summary to the CLI** — objective, the config-vs-code work-item list,
   key design decisions, and risks — so the user can review without opening the file.
3. If the summary leaves the user doubtful, that is the cue to open `docs/tech-spec.md` for the
   full detail, and to have the developer/architect review the spec.
4. Only then does the build proceed — the user signals to build (by typing `/sf-build` or asking
   in prose). `sf-plan` never chains into a build itself, and `sf-build`'s `DO NOT TRIGGER` rules
   keep it from auto-firing straight out of planning, so the review checkpoint holds.

### Architect review — triggered by data, not judgment

There are two distinct architect touchpoints, and only the first is a free human choice:

- **Spec review** (pre-build) — a manual step the human may run between `/sf-plan` and `/sf-build`,
  as above.
- **Build review** (inside `/sf-build`) — *not* a judgment call the build agent makes. `sf-plan`
  records an **`Architect review: recommended | not needed`** flag in the spec, set from concrete
  complexity signals: a new or changed data model, cross-object automation, callouts / async
  (governor-limit risk), or a multi-domain / many-item build.

`/sf-build` then invokes the `architect` agent only when one of three checkable conditions holds —
the spec flag is `recommended`, the user asked for a review, or the review battery can't reach clean
after a fix round (auto-escalation) — and otherwise skips it and says so. This keeps the architect
on-demand without guesswork: the decision is made at planning time, recorded as data, with a
failure-driven safety net. The earlier vague "invoke when the work warrants it" is gone precisely
because the build agent had no checkable signal to act on.

---

## Connection to the roadmap

This is not just a plan-mode replacement. README roadmap item #1 (the keystone) is *"Design
contract + completeness gate — refuses to build an incomplete design."* `sf-plan`'s completeness
self-review **is** that gate, and `docs/tech-spec.md` is the design contract. `/sf-build` then
builds against a contract already checked for completeness — which is what makes the autonomous
direction safe to pursue.

---

## Settled names and defaults

- Planning skill: **`sf-plan`** (pairs naturally with `/sf-build`).
- Build skill: **`sf-build`**.
- Spec output path: **`docs/tech-spec.md`**.
- Questioning follows the **grill-me pattern**: explore the code/org first to build a candidate
  solution map, then confirm it one decision at a time **in prose** (not the picker tool), offering
  the deduced choices with a recommended answer, until shared understanding.
- Planning stays **pure design**; `/sf-build` owns all dispatch (config + code).
