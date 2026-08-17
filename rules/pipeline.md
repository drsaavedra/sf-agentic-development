# Research → Plan → Build

> **Three stages for a planned feature — Research → Plan → Build, each human-gated.**
> **Research:** run `/sf-research` — one prompt-driven skill that reads which domains your prompt
> names and writes a state-of-the-world `docs/<domain>.md` per in-scope domain (reviewed before
> planning). **Plan:** `/sf-plan` turns those docs into a
> design contract — `docs/solution-design.md` + a lean `docs/CONTEXT.md` + per-story
> `docs/contracts/<slug>.md` (it stops and routes back to Research if a needed doc is missing).
> **Build:** by default, work one story at a time — open its `docs/contracts/<slug>.md` (with the
> research docs and `docs/solution-design.md` as context; a fresh session per story keeps context
> lean) and build it under the Authoring rules below. `/sf-build` is an **optional** orchestrated
> mode that dispatches subagents per work item — heavier on tokens, worth it only for large
> multi-story builds. The rules below govern the default build and everything else — ad-hoc
> edits, fixes, reviews, audits, config, and ops.

---

## Research Routing

Research is the **first stage of a planned feature** — discovery before design. A single
prompt-driven skill, **`/sf-research`**, reads which domains your prompt names and inventories only
those (scoped to the feature, not an org census), writing one `docs/<domain>.md` per in-scope domain
for a human to review before `/sf-plan`. The prompt is the optimizer — name the domains and what to
look at, and `sf-research` loads the matching domain checklists. When several domains are in scope it
researches them in **discovery order** — data-model → security → automation → ui → integration — so
each builds on the earlier findings (security is per-object, automation runs on those objects,
integration depends on the automation that drives it). Domain → doc, in that order:

| Domain (in scope when the prompt names it) | Writes |
|---|---|
| Objects, fields, relationships, record types, volumes, config storage, org-wide settings | `docs/data-model.md` |
| OWD, sharing rules, permission sets vs profiles, FLS, record-level access, and the user/feature **license** inventory | `docs/security-model.md` |
| Automation already firing on the target objects (Flows, triggers, validation rules, roll-ups, async) + the framework new automation plugs into | `docs/automation.md` |
| Existing LWC/Flow/page surfaces & reusable components, placement, internal-vs-Experience-Cloud, design/accessibility constraints | `docs/ui-design.md` |
| External systems, the auth they support, existing Named/External Credentials, data format & limits, events | `docs/integration-patterns.md` |

`sf-research` only ever writes these `docs/<domain>.md` files — never `docs/CONTEXT.md` (that is
`/sf-plan`'s, built from the objective you give `/sf-plan` directly). It can also run on a schedule to
keep the org docs in sync. The research docs are `/sf-plan`'s required input — it stops and routes
back here if one a feature needs is missing. `/sf-plan` then refines `docs/data-model.md` and
`docs/automation.md` in place.
