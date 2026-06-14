# Trigger Configuration, Entry Conditions, and Recursion

> Part of `reviewing-flow` — see SKILL.md for the always-on Quick Reference and routing.

## Logic runs on every record update

*Why it fails:* A create-or-update record-triggered flow with no entry-condition refinement executes its full element stack on **every save of every record** — burning shared transaction limits, re-running logic whose inputs haven't changed, and repeating side effects (notifications, DML, emails). **Flag any flow whose trigger includes updates and whose logic executes on every record update — surface it to the user.**

*Fix:*
- Separate inserts from updates: create a Boolean formula resource containing just `ISNEW()` and use it in entry conditions or an initial Decision to route the insert path. (`ISNEW()`, `ISCHANGED()`, and `PRIORVALUE()` are supported in record-triggered flow formulas since Summer '21.)
- Gate update logic on the specific fields it depends on: `ISCHANGED({!$Record.Field})` in a formula entry condition, or equivalent `$Record` vs `$RecordPrior` comparisons, so the flow fires only when those fields actually change.
- Set the trigger option **"Only when a record is updated to meet the condition requirements"** so the flow fires on the *transition into* the condition, not on every subsequent save that still satisfies it.

## Same-record updates in an after-save flow

*Why it fails:* An after-save flow that updates its own triggering record issues a second DML, which re-runs the entire save cycle (triggers, before-save flows, the works) — substantially slower (official guidance cites up to ~10×) and the root of most flow recursion.

*Fix:* Move same-record field updates to a **before-save** flow and assign directly to `$Record` — the in-flight save persists the change with no extra DML, no re-entry, and recursion is structurally impossible.

## Flow recursion

*Why it fails:* A record-triggered flow that updates the triggering record re-fires on that update, looping until governor limits stop it. Unlike Apex, there is no static variable available as a guard.

*Fix:*
- First choice: make it a before-save assignment (see previous rule) — no second save means nothing to re-fire.
- Otherwise, use entry conditions that evaluate false on the re-triggered invocation: `ISCHANGED()` / `$Record` vs `$RecordPrior` comparisons on the gating fields (the field was already set to the target value).
- Structure the flow so the field it writes is not included in its own trigger condition.
- When declarative entry conditions are insufficient, route the update through an Apex invocable action that applies an Apex-level recursion guard (`Set<Id>` of processed records).

## Mixed automation on the same object

*Why it fails:* An object with both an Apex trigger and a Record-Triggered Flow has two pipelines that can race, double-update records, or re-trigger each other in undefined order — the same root cause as multiple triggers.

*Fix:*
- One automation strategy per object. If both a flow and a trigger are unavoidable, document the explicit division of labor (e.g., "flow handles notifications only; trigger owns data integrity") before building. Never silently add a flow to an object the Apex trigger already owns.
- When multiple record-triggered flows must coexist on one object, set an explicit **trigger order** on each (Flow Trigger Explorer / the flow's advanced properties). Space the values — 10, 20, 30 — so a new flow slots in without renumbering the rest.
