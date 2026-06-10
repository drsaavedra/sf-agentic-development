---
name: salesforce-flow-quality
description: Use when reviewing or auditing Salesforce Flows after generation, or when the task is explicitly a code review. Covers loop and collection optimization (Get Records in loop, Collection Filter/Sort, early exit), Send Email limits, fault handling, DML-in-loop prevention, hardcoded ID elimination, recursion guards, complexity limits, and naming conventions. If the Flow invokes Apex actions, also load salesforce-apex-quality. For creating new Flows, use generating-flow instead.
---

# Salesforce Flow Quality

Invoke after generating any `flow-meta.xml` file and when reviewing Flows. These are the patterns that work in a developer sandbox but fail in production with real data volumes, non-admin profiles, or after deployment to a different org.

**Cross-domain:** If this Flow calls an Apex action (`@InvocableMethod`), also load `salesforce-apex-quality` to apply Apex bulk safety, security, and testing rules to that action class.

This skill complements `generating-flow` (which covers how to build a Flow) by specifying the quality bar it must meet.

---

### 1. Get Records Inside a Flow Loop

*Why it fails:* A Get Records element inside a Loop issues one SOQL query per iteration — the Flow equivalent of SOQL in an Apex loop. The 100-query transaction limit is shared with every trigger, flow, and Apex action in the same transaction, so a record-triggered flow processing a bulk batch hits `Too many SOQL queries: 101` long before the loop finishes.

*Fix:*
- Fetch **all** needed records with a single Get Records element **before** the loop, then distribute them with Assignment elements inside the loop.
- When the records to fetch depend on values in the looped collection, build an Id (or value) collection first, then use the Get Records **In** / **Not In** operators (Winter '23+) to query them in one pass.
- If the per-iteration "query" is really just narrowing an already-fetched collection, use a Collection Filter element instead — it consumes no SOQL at all (see rule 2).

---

### 2. Loop Used Only to Filter a Collection

*Why it fails:* A Loop + Decision + Assignment chain built only to extract a subset of a collection executes several elements per item and burns transaction CPU time (the 10-second-per-transaction limit is the binding constraint since the 2,000-element interview limit was removed in Spring '23). It also clutters the canvas with plumbing that hides the flow's actual logic.

*Fix:*
- Use a **Collection Filter** element (Spring '22+): one element produces a new filtered collection from the original, consumes no SOQL, and leaves the source collection untouched.
- Prefer pushing the criteria into the Get Records filter itself when the criteria are known at query time; use Collection Filter when they only become known later (a Decision outcome, screen input) or when deriving several subsets from one query.
- Combine with Collection Sort when the subset also needs ordering or a top-N cut (see rule 5).

---

### 3. No Early Exit From the Loop

*Why it fails:* Looping an entire collection when the logic only needs the first match, or to confirm a fixed count (e.g., "stop once 5 are found"), wastes CPU time on every remaining iteration — on large collections this is the difference between finishing and hitting the CPU limit. Spotting this requires understanding what the loop is *for*, not just its structure.

*Fix:*
- For single-match or threshold logic, add a Decision inside the loop and route the matched/threshold-met outcome to the element **after** the loop — exiting early is supported; the remaining iterations are skipped. (A loop exited early cannot be re-entered — restructure rather than jumping back in.)
- For "first match" on orderable criteria, skip the loop entirely: Collection Sort + keep-first-item, or Collection Filter + get the first record of the result.
- For counts, increment a number variable in the loop and exit once it reaches the target.

---

### 4. Send Email Action Recipient Limit

*Why it fails:* The Send Email core action accepts at most **150 recipients** per invocation across its comma-separated recipient address lists (raised from 5 in Winter '25, which also added the CC and BCC Recipient Address Lists). A recipient list built dynamically from a Get Records result can silently grow past the cap and fault the flow at runtime — and blank or invalid addresses in the list fault it too.

*Fix:*
- Validate the assembled recipient list: non-empty, valid addresses, and ≤ 150 entries before the action runs.
- For larger audiences, chunk the recipient collection and invoke Send Email once per chunk of ≤ 150 — or hand the send to an Apex invocable using `Messaging.sendEmail` for full control.
- Org-wide daily external email limits still apply on top of the per-action cap; a fault connector on the Send Email action is mandatory either way (see rule 6).

---

### 5. Linear Search Loop Instead of Collection Sort

*Why it fails:* Looping a collection with compare-and-assign logic to find the newest record, the largest amount, or the top N is a hand-rolled search — several element executions per item, extra variables, and easy to get wrong on ties and empty collections.

*Fix:*
- Use a **Collection Sort** element: sort by the field (ascending/descending) and optionally keep only the first N items — min/max is "sort + keep 1", top-N is "sort + keep N", in a single element with no per-item executions.
- Sort first, then loop, when the loop's logic depends on order (e.g., processing newest-first or enabling an early exit once past a boundary value — see rule 3).
- Combine Collection Sort with Collection Filter to replace whole search loops: filter to the candidates, sort to rank them, keep N.

---

### 6. No Fault Handling

*Why it fails:* Any Get Records, Create/Update/Delete Records, or Apex Action element can fail. Without a fault connector the flow throws a generic unhandled error — no recovery, no context, no logging. The user sees "An internal error occurred" and the automation stops silently.

*Fix:*
- Every element that can fault must have a fault connector leading to a dedicated error path.
- On the fault path: capture `{!$Flow.FaultMessage}` into a Text variable, write it to a custom log object or Platform Event, then surface a descriptive error screen (Screen Flows) or re-throw via an Apex Action (Autolaunched Flows).
- Never leave a fault connector unconnected or wired to End without logging.

---

### 7. DML Inside a Flow Loop

*Why it fails:* A Loop element containing a Create/Update/Delete Records element issues one DML statement per iteration — the Flow equivalent of DML in an Apex loop. Hits the 150-DML limit and triggers cascading automation per record.

*Fix:*
- Collect records into a collection variable **inside** the loop using Assignment elements.
- Place the Create/Update/Delete Records element **outside and after** the loop, operating on the full collection.
- For Get Records inside a loop, see rule 1.

---

### 8. Hardcoded IDs and Values

*Why it fails:* Record Type IDs, Queue IDs, Profile IDs, and environment-specific picklist values differ between sandbox and production. Hardcoded 15/18-char IDs silently route to wrong records or skip branches post-deployment.

*Fix:*
- Never hardcode Salesforce IDs in flow element configurations.
- For Record Types: use a Get Records element to look up by `DeveloperName`, or reference a Custom Metadata record as a flow resource.
- For configurable thresholds and routing values: use a Custom Metadata Type as a flow resource — editable without a deployment.

---

### 9. Flow Recursion

*Why it fails:* A Record-Triggered Flow that updates the triggering record re-fires on that update, looping until governor limits stop it. Unlike Apex, there is no static variable available as a guard.

*Fix:*
- Use entry conditions with `ISCHANGED()` that evaluate to false on the re-triggered invocation (the field was already set to the target value).
- Structure the flow so the field it writes is not included in its own trigger condition.
- When declarative entry conditions are insufficient, route the update through an Apex invocable action that applies an Apex-level recursion guard (`Set<Id>` of processed records).

---

### 10. Flow Complexity → Move to Apex

*Why it fails:* Flows with deeply nested Decision elements, multiple loops, cross-object data fetches, or complex transformation logic are impossible to debug, maintain, or test reliably. The visual canvas obscures complexity that would be immediately obvious in code.

*Fix:*
- Keep flows declarative and simple: happy-path record operations, notification sends, and routing decisions with at most 2–3 decision branches.
- When a flow requires more branching, multiple loops, or significant data transformation, extract the logic into an `@InvocableMethod` Apex class and call it from a lean Flow Action element.
- On developer-owned objects where you control the full stack, prefer a trigger handler over a flow for any logic requiring bulk safety, error recovery, or complex orchestration.

**Flow-first vs Apex-first decision guide:**

| Default to a Record-Triggered Flow when… | Choose Apex when… |
|---|---|
| Simple field updates (use before-save to avoid an extra DML) | Bulk volume needs governor-aware handling beyond Flow's safe limits |
| Notifications, emails, creating related records | Complex multi-object orchestration or significant data transformation |
| Routing with a few decision branches | Error recovery with partial-success handling and retry |
| Calling an invocable Apex action | An Apex trigger already owns the object (stay additive — do not split the strategy) |

The recommended hybrid: a Record-Triggered Flow owns the entry criteria and orchestration; complex operations live in Invocable Apex it calls. Never add new Process Builder automation (being retired).

---

### 11. One Automation Strategy per Object

*Why it fails:* An object with both an Apex trigger and a Record-Triggered Flow has two pipelines that can race, double-update records, or re-trigger each other in undefined order — the same root cause as multiple triggers.

*Fix:* One automation strategy per object. If both a flow and a trigger are unavoidable, document the explicit division of labor (e.g., "flow handles notifications only; trigger owns data integrity") before building. Never silently add a flow to an object the Apex trigger already owns.

---

### 12. Naming and Versioning

- Name flows consistently: `<Object>_<Purpose>_<TriggerEvent>` (e.g., `Account_SetDefaults_BeforeInsert`, `Opportunity_NotifyOwner_AfterClosedWon`).
- Label every Decision outcome and every Loop element descriptively. "Outcome 1" is not a label.
- Deactivate and delete obsolete flow versions. Stale versions accumulate in deployments, complicate debugging, and make change sets unpredictable.
- Treat active flow changes as code changes: version-control the flow-meta.xml, review in a change set or source deploy, do not edit active flows directly in production.

---

## Quick Reference — Flows

| Anti-pattern | Fix |
|---|---|
| Flow: Get Records in loop | Fetch all before the loop (`In`/`Not In` operators); distribute with Assignment elements |
| Flow: loop only to filter a collection | Collection Filter element — no SOQL, no per-item element executions |
| Flow: no early exit from loop | Decision inside the loop routes out once the match/count is reached |
| Flow: Send Email recipient overflow | Validate and chunk to ≤ 150 recipients per action; fault connector on the action |
| Flow: linear search loop (min/max/top-N) | Collection Sort + keep first N; combine with Collection Filter |
| Flow: no fault connector | Fault connector on every faulting element; log `{!$Flow.FaultMessage}` |
| Flow: DML in loop | Collect in loop via Assignment, DML outside the loop |
| Flow: hardcoded IDs | Get Records by DeveloperName or Custom Metadata resource |
| Flow: recursion | `ISCHANGED()` entry condition or Apex invocable guard |
| Flow: complex branching | Extract logic to `@InvocableMethod` Apex action |
| Flow: mixed automation | One automation strategy per object; document division |
| Flow: stale versions | Deactivate and delete obsolete versions after deployment |
| Flow: unlabeled decision outcomes | Label every outcome and loop element descriptively |
| Flow: Process Builder | Do not extend — being retired; migrate to Record-Triggered Flow or Apex |
