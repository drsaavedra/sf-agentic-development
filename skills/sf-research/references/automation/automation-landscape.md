# Automation landscape on the target objects

> Part of `sf-research` (automation domain) — see SKILL.md. Discovery, not design. Before any automation is
> planned you must know what already fires on the target objects; the "one automation strategy per
> object" guardrail is unenforceable without this inventory. Discovery only — the Flow-vs-Apex
> *choice* stays with `sf-plan`. Bound the inventory to the in-scope objects plus one collision hop —
> related objects whose automation a change here would invoke.

## What already fires on each in-scope object

For every object the feature will touch, inventory all automation — declarative first, then code:

- **Record-triggered Flows** — `force-app/**/flows/*.flow-meta.xml` with `<start>`/`<triggerType>` on
  the object (`grep -rl "<object>Account</object>" force-app/**/flows/`, adapting the object). Note
  before-save vs after-save and entry conditions. These are the default automation surface — inventory
  them first.
- **Validation rules** — `force-app/**/objects/<Object>/validationRules/`. List active rules; they
  fire on save and can conflict with new automation.
- **Roll-up summary fields** — on master-detail parents; note them (they recompute on child DML).
- **Apex triggers** — `force-app/**/triggers/*.trigger` filtered to the object
  (`grep -rl "trigger .* on <Object>" force-app/**/triggers/`). Note the events (before/after
  insert/update/delete) each handles.
- **Process Builder / Workflow Rules** — legacy, retired Dec 31 2025, but may still exist in older
  orgs. Grep `workflows/` and any `flowDefinition`. Flag any found as migration debt.
- **Duplicate/matching rules, escalation, assignment rules** — note if present on the object; they
  also participate in the save.

## Order of execution

The save order is where new automation silently breaks existing behavior — capture it.

- **What runs, in what order?** — for each in-scope object, list the before-save automation, then
  after-save, then roll-ups, then post-commit (async/Platform Events). Salesforce's documented
  order-of-execution is the frame; record the *populated* slots for this object.
- **Conflict risk** — does the object already have a mix (e.g. a record-triggered Flow *and* an Apex
  trigger doing related-record updates)? That mix is exactly the "one automation strategy per object"
  smell — flag it so `sf-plan` decides where new logic belongs rather than adding a third actor.
- **Recursion / re-entrancy** — note existing recursion guards; new automation that updates the same
  object can re-trigger the chain.

## What to hand to the doc

A per-object list of every Flow/trigger/validation rule/roll-up that fires, plus the order of
execution and any mixed-strategy conflict. The conflicts and any legacy Process Builder/Workflow debt
go up to **Surprises & constraints** — they gate where new automation can safely live.
