# Architecture, Configuration, and Lifecycle

> Part of `reviewing-flow` — see SKILL.md for the always-on Quick Reference and routing.

## Hardcoded IDs and values

*Why it fails:* Record Type IDs, Queue IDs, Profile IDs, and environment-specific picklist values differ between sandbox and production. Hardcoded 15/18-char IDs silently route to wrong records or skip branches post-deployment.

*Fix:*
- Never hardcode Salesforce IDs in flow element configurations.
- For Record Types: use a Get Records element to look up by `DeveloperName`, or reference a Custom Metadata record as a flow resource.
- For configurable thresholds and routing values: use a Custom Metadata Type as a flow resource — editable without a deployment.

## Flow complexity → subflows → Apex

*Why it fails:* Flows with deeply nested Decision elements, multiple loops, cross-object data fetches, or complex transformation logic are impossible to debug, maintain, or test reliably. The visual canvas obscures complexity that would be immediately obvious in code.

*Fix:*
- Keep flows declarative and simple: happy-path record operations, notification sends, and routing decisions with at most 2–3 decision branches.
- First decomposition step is declarative: extract repeated or self-contained sections into **subflows** — reusable, independently testable, and they keep the parent canvas readable.
- When the logic still requires heavy branching, multiple loops, or significant data transformation, extract it into an `@InvocableMethod` Apex class and call it from a lean Flow Action element.
- On developer-owned objects where you control the full stack, prefer a trigger handler over a flow for any logic requiring bulk safety, error recovery, or complex orchestration.

**Flow-first vs Apex-first decision guide:**

| Default to a Record-Triggered Flow when… | Choose Apex when… |
|---|---|
| Simple field updates (use before-save to avoid an extra DML) | Bulk volume needs governor-aware handling beyond Flow's safe limits |
| Notifications, emails, creating related records | Complex multi-object orchestration or significant data transformation |
| Routing with a few decision branches | Error recovery with partial-success handling and retry |
| Calling an invocable Apex action | An Apex trigger already owns the object (stay additive — do not split the strategy) |

The recommended hybrid: a Record-Triggered Flow owns the entry criteria and orchestration; complex operations live in Invocable Apex it calls. Never add new Process Builder automation — Salesforce ended Workflow Rules and Process Builder support on Dec 31, 2025.

## No flow tests

*Why it fails:* A flow with no tests is verified only by manual clicks in a sandbox; regressions from later edits, new fields, or platform releases surface in production.

*Fix:*
- Create declarative **Flow Tests** for record-triggered flows covering each decision path — including the no-op path (entry conditions not met) and assertions on the records the flow should and should not change.
- Any `@InvocableMethod` the flow calls gets full Apex test coverage under `reviewing-apex` rules (bulk, negative, and security paths).
- Flow tests do not cover scheduled paths or screen flows — for those, document the manual test script alongside the flow.

## Naming and versioning

- Name flows consistently: `<Object>_<Purpose>_<TriggerEvent>` (e.g., `Account_SetDefaults_BeforeInsert`, `Opportunity_NotifyOwner_AfterClosedWon`).
- Label every Decision outcome and every Loop element descriptively. "Outcome 1" is not a label.
- **Check `<status>` on every `.flow-meta.xml` in the changeset.** Flow Builder writes `Draft` into a retrieved file whenever the working version is not the active one, and `Draft` renders as **Inactive** in the UI — so deploying that file leaves the automation switched off with no deploy error. A flow intended to run must read `<status>Active</status>` in source; in production, activating on deploy additionally requires the **Deploy Processes and Flows as Active** preference (flows active in a sandbox deploy to production as inactive by default). "It worked yesterday" is not evidence: each deploy creates a new version and obsoletes the previous one, and `sf project retrieve -m Flow:Name` returns the org's **active** version, not the one you deployed.
- Deactivate and delete obsolete flow versions. Stale versions accumulate in deployments, complicate debugging, and make change sets unpredictable. An obsolete version still holds its metadata references, so deleting something an old version used (a custom permission, a field) fails with "referenced elsewhere … Flow Version" — purge the obsolete versions in an earlier deploy.
- Treat active flow changes as code changes: version-control the flow-meta.xml, review in a change set or source deploy, do not edit active flows directly in production.

## Formula and visibility traps

- **`$Permission` is rejected in a screen component's visibility rule** (a deploy error), although a Decision accepts it. Evaluate it in a Decision, store the result in a Boolean variable, and key visibility off that variable.
- **DateTime minus DateTime returns days.** Multiply by 24 for hours; dividing by 24, or rounding the result to a small scale, turns short durations into 0. Check the unit arithmetic in every formula field and flow formula resource that subtracts dates or times.
