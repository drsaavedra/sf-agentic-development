---
name: reviewing-flow
description: "Use when reviewing or auditing Salesforce Flows after generation, or when the task is explicitly a code review. Covers loop and collection optimization (Get Records in loop, Collection Filter/Sort, Transform, early exit), entry-condition discipline, Send Email limits, fault handling and Custom Error, DML-in-loop prevention, hardcoded ID elimination, recursion guards, async paths, complexity limits, flow tests, and naming conventions. Detailed rules live in references/ — read the file(s) matching the artifact's domains. If the Flow invokes Apex actions, also load reviewing-apex. For creating new Flows, use generating-flow instead."
---

# Salesforce Flow Quality

Invoke after generating any `flow-meta.xml` file and when reviewing Flows. These are the patterns that work in a developer sandbox but fail in production with real data volumes, non-admin profiles, or after deployment to a different org.

**Cross-domain:** If this Flow calls an Apex action (`@InvocableMethod`), also load `reviewing-apex` to apply Apex bulk safety, security, and testing rules to that action class.

This skill complements `generating-flow` (which covers how to build a Flow) by specifying the quality bar it must meet.

**Schema truth:** flag any guessed object, field, or relationship API name. Verify names against local metadata (`force-app/**`) first, then the org — the org wins on divergence. Use read-only sf CLI commands (`sf sobject describe`, `sf data query`) to confirm; never rely on Developer Console snippets.

## Quick Reference (always apply)

Scan every flow against this checklist.

| Anti-pattern | Fix |
|---|---|
| Flow: logic runs on every record update | Entry conditions: `ISNEW()` formula for inserts, `ISCHANGED()` for updates, "only when a record is updated to meet the condition requirements" — **flag this to the user** |
| Flow: Get Records in loop | Fetch all before the loop (`In`/`Not In` operators); distribute with Assignment elements |
| Flow: loop only to filter a collection | Collection Filter element — no SOQL, no per-item element executions |
| Flow: loop only to map/aggregate a collection | Transform element (GA Summer '24) — one element, no loop |
| Flow: no early exit from loop | Decision inside the loop routes out once the match/count is reached |
| Flow: linear search loop (min/max/top-N) | Collection Sort + keep first N; combine with Collection Filter |
| Flow: DML in loop | Collect in loop via Assignment, DML outside the loop |
| Flow: same-record update in after-save | Before-save flow — assign to `$Record`, no second save cycle |
| Flow: recursion | Before-save first; `ISCHANGED()` / `$RecordPrior` entry conditions; Apex invocable guard |
| Flow: Send Email recipient overflow | Validate and chunk to ≤ 150 recipients per action; fault connector on the action |
| Flow: no fault connector | Fault connector on every faulting element; log `{!$Flow.FaultMessage}` |
| Flow: blocking a save via generic fault | Custom Error element — inline/window message, rolls back the change |
| Flow: callout on the synchronous path | Run Asynchronously path (or scheduled path); fault handling on that path too |
| Flow: hardcoded IDs | Get Records by DeveloperName or Custom Metadata resource |
| Flow: complex branching | Subflows first, then `@InvocableMethod` Apex action |
| Flow: mixed automation | One automation strategy per object; document division; explicit trigger order for coexisting flows |
| Flow: no flow tests | Flow Tests per decision path; Apex tests for invocables |
| Flow: stale versions | Deactivate and delete obsolete versions after deployment |
| Flow: unlabeled decision outcomes | Label every outcome and loop element descriptively |
| Flow: Process Builder | Do not extend — being retired; migrate to Record-Triggered Flow or Apex |

## Detailed Rules (read the file matching the artifact)

Load a reference file when either applies:
- the flow **contains** that domain (a Loop element → loops-collections; a record-triggered flow → triggers-recursion; Send Email / callouts / fault paths → actions-faults; complexity, IDs, naming, tests → architecture-config), or
- the Quick Reference scan **flags a suspected violation** and you need the detailed *why it fails* / *fix* to confirm and explain it.

| Artifact contains / suspicion | Read |
|---|---|
| Loop elements, Get Records, Collection Filter/Sort, Transform, DML placement | `references/loops-collections.md` |
| Record-triggered flows — entry conditions, before/after-save choice, recursion, trigger order, mixed automation | `references/triggers-recursion.md` |
| Send Email, callouts/external services, fault connectors, Custom Error, async paths | `references/actions-faults.md` |
| Hardcoded IDs, complexity / subflow / Apex extraction, flow tests, naming, versioning | `references/architecture-config.md` |
| B2B Commerce automation — buyer entitlement / effective-account / catalog / pricebook context, Commerce-object record-triggered flows, checkout-owned state | `references/commerce-b2b.md` | <!-- domain:commerce -->

A flow usually spans several domains — read every file that applies before delivering the review.
