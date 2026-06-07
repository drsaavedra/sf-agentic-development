---
name: salesforce-flow-quality
description: Use when creating or reviewing Salesforce Flows (record-triggered, screen, autolaunched, or scheduled). Covers fault handling, DML-in-loop prevention, hardcoded ID elimination, recursion guards, complexity limits, and naming conventions. If the Flow invokes Apex actions, also load salesforce-apex-quality.
---

# Salesforce Flow Quality

Invoke after generating any `flow-meta.xml` file and when reviewing Flows. These are the patterns that work in a developer sandbox but fail in production with real data volumes, non-admin profiles, or after deployment to a different org.

**Cross-domain:** If this Flow calls an Apex action (`@InvocableMethod`), also load `salesforce-apex-quality` to apply Apex bulk safety, security, and testing rules to that action class.

This skill complements `generating-flow` (which covers how to build a Flow) by specifying the quality bar it must meet.

---

### 14. No Fault Handling

*Why it fails:* Any Get Records, Create/Update/Delete Records, or Apex Action element can fail. Without a fault connector the flow throws a generic unhandled error — no recovery, no context, no logging. The user sees "An internal error occurred" and the automation stops silently.

*Fix:*
- Every element that can fault must have a fault connector leading to a dedicated error path.
- On the fault path: capture `{!$Flow.FaultMessage}` into a Text variable, write it to a custom log object or Platform Event, then surface a descriptive error screen (Screen Flows) or re-throw via an Apex Action (Autolaunched Flows).
- Never leave a fault connector unconnected or wired to End without logging.

---

### 15. DML Inside a Flow Loop

*Why it fails:* A Loop element containing a Create/Update/Delete Records element issues one DML statement per iteration — the Flow equivalent of DML in an Apex loop. Hits the 150-DML limit and triggers cascading automation per record.

*Fix:*
- Collect records into a collection variable **inside** the loop using Assignment elements.
- Place the Create/Update/Delete Records element **outside and after** the loop, operating on the full collection.
- For Get Records inside a loop: restructure to fetch all records before the loop and use Assignment elements to distribute them.

---

### 16. Hardcoded IDs and Values

*Why it fails:* Record Type IDs, Queue IDs, Profile IDs, and environment-specific picklist values differ between sandbox and production. Hardcoded 15/18-char IDs silently route to wrong records or skip branches post-deployment.

*Fix:*
- Never hardcode Salesforce IDs in flow element configurations.
- For Record Types: use a Get Records element to look up by `DeveloperName`, or reference a Custom Metadata record as a flow resource.
- For configurable thresholds and routing values: use a Custom Metadata Type as a flow resource — editable without a deployment.

---

### 17. Flow Recursion

*Why it fails:* A Record-Triggered Flow that updates the triggering record re-fires on that update, looping until governor limits stop it. Unlike Apex, there is no static variable available as a guard.

*Fix:*
- Use entry conditions with `ISCHANGED()` that evaluate to false on the re-triggered invocation (the field was already set to the target value).
- Structure the flow so the field it writes is not included in its own trigger condition.
- When declarative entry conditions are insufficient, route the update through an Apex invocable action that applies an Apex-level recursion guard (`Set<Id>` of processed records).

---

### 18. Flow Complexity → Move to Apex

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

### 19. One Automation Strategy per Object

*Why it fails:* An object with both an Apex trigger and a Record-Triggered Flow has two pipelines that can race, double-update records, or re-trigger each other in undefined order — the same root cause as multiple triggers.

*Fix:* One automation strategy per object. If both a flow and a trigger are unavoidable, document the explicit division of labor (e.g., "flow handles notifications only; trigger owns data integrity") before building. Never silently add a flow to an object the Apex trigger already owns.

---

### 20. Naming and Versioning

- Name flows consistently: `<Object>_<Purpose>_<TriggerEvent>` (e.g., `Account_SetDefaults_BeforeInsert`, `Opportunity_NotifyOwner_AfterClosedWon`).
- Label every Decision outcome and every Loop element descriptively. "Outcome 1" is not a label.
- Deactivate and delete obsolete flow versions. Stale versions accumulate in deployments, complicate debugging, and make change sets unpredictable.
- Treat active flow changes as code changes: version-control the flow-meta.xml, review in a change set or source deploy, do not edit active flows directly in production.

---

## Quick Reference — Flows

| Anti-pattern | Fix |
|---|---|
| Flow: no fault connector | Fault connector on every faulting element; log `{!$Flow.FaultMessage}` |
| Flow: DML in loop | Collect in loop via Assignment, DML outside the loop |
| Flow: Get Records in loop | Fetch all before the loop; distribute with Assignment elements |
| Flow: hardcoded IDs | Get Records by DeveloperName or Custom Metadata resource |
| Flow: recursion | `ISCHANGED()` entry condition or Apex invocable guard |
| Flow: complex branching | Extract logic to `@InvocableMethod` Apex action |
| Flow: mixed automation | One automation strategy per object; document division |
| Flow: stale versions | Deactivate and delete obsolete versions after deployment |
| Flow: unlabeled decision outcomes | Label every outcome and loop element descriptively |
| Flow: Process Builder | Do not extend — being retired; migrate to Record-Triggered Flow or Apex |
