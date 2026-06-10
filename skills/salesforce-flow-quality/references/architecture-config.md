# Architecture, Configuration, and Lifecycle

> Part of `salesforce-flow-quality` — see SKILL.md for the always-on Quick Reference and routing.

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

The recommended hybrid: a Record-Triggered Flow owns the entry criteria and orchestration; complex operations live in Invocable Apex it calls. Never add new Process Builder automation (being retired).

## No flow tests

*Why it fails:* A flow with no tests is verified only by manual clicks in a sandbox; regressions from later edits, new fields, or platform releases surface in production.

*Fix:*
- Create declarative **Flow Tests** for record-triggered flows covering each decision path — including the no-op path (entry conditions not met) and assertions on the records the flow should and should not change.
- Any `@InvocableMethod` the flow calls gets full Apex test coverage under `salesforce-apex-quality` rules (bulk, negative, and security paths).
- Flow tests do not cover scheduled paths or screen flows — for those, document the manual test script alongside the flow.

## Naming and versioning

- Name flows consistently: `<Object>_<Purpose>_<TriggerEvent>` (e.g., `Account_SetDefaults_BeforeInsert`, `Opportunity_NotifyOwner_AfterClosedWon`).
- Label every Decision outcome and every Loop element descriptively. "Outcome 1" is not a label.
- Deactivate and delete obsolete flow versions. Stale versions accumulate in deployments, complicate debugging, and make change sets unpredictable.
- Treat active flow changes as code changes: version-control the flow-meta.xml, review in a change set or source deploy, do not edit active flows directly in production.
