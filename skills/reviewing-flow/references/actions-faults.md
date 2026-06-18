# Actions, Faults, and Validation

> Part of `reviewing-flow` — see SKILL.md for the always-on Quick Reference and routing.

## No fault handling

*Why it fails:* Any Get Records, Create/Update/Delete Records, or Apex Action element can fail. Without a fault connector the flow throws a generic unhandled error — no recovery, no context, no logging. The user sees "An internal error occurred" and the automation stops silently.

*Fix:*
- Every element that can fault must have a fault connector leading to a dedicated error path.
- On the fault path: capture `{!$Flow.FaultMessage}` into a Text variable, write it to a custom log object or Platform Event, then surface a descriptive error screen (Screen Flows) or re-throw via an Apex Action (Autolaunched Flows).
- Never leave a fault connector unconnected or wired to End without logging.

## Blocking a save with a generic fault instead of Custom Error

*Why it fails:* Failing validation by letting an element fault (or faulting deliberately) gives the user an unactionable generic error, and the record change may already be half-applied in the transaction.

*Fix:* Use the **Custom Error** element (Winter '24) in record-triggered flows — before-save or after-save — to block the save declaratively: it rolls back the record change and shows the message in a window or inline on a specific field, the Flow equivalent of `addError()`. Reserve fault paths for unexpected failures, not business validation.

## Send Email action recipient limit

*Why it fails:* The Send Email core action accepts at most **150 recipients per invocation, counted across the Recipient, CC, BCC, and Recipient ID fields combined** (Winter '25 added the CC and BCC Recipient Address Lists). A recipient list built dynamically from a Get Records result can silently grow past the combined cap and fault the flow at runtime — and blank or invalid addresses in the list fault it too.

*Fix:*
- Validate the assembled recipient list: non-empty, valid addresses, and ≤ 150 entries before the action runs.
- For larger audiences, chunk the recipient collection and invoke Send Email once per chunk of ≤ 150 — or hand the send to an Apex invocable using `Messaging.sendEmail` for full control.
- Org-wide daily external email limits still apply on top of the per-action cap; a fault connector on the Send Email action is mandatory either way.

## Callout or external-system action on the synchronous path

*Why it fails:* Integration work (HTTP callouts, External Services, long-running actions) on a record-triggered flow's synchronous path delays the save transaction it shares — and Salesforce requires integration messaging to run asynchronously from record-triggered flows.

*Fix:* Put callouts and external-system actions on the **Run Asynchronously** path (or a scheduled path when timing matters). The async path runs outside the triggering transaction — it doesn't delay or abort the save, gets fresh governor limits, and retries on failure. Wire fault handling on the async path too: its failure does not roll back the original save.
