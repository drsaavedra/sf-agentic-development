# Async

> Part of `reviewing-apex` — see SKILL.md for the always-on Quick Reference and routing.

- **Reaching for `@future`** — cannot chain, cannot be called from Batch, cannot accept non-primitive types, returns no job ID. Legacy — must not appear in new code. Default to a `Queueable` (implementing `Database.AllowsCallouts` when it makes callouts) with a `System.Finalizer` attached for cleanup and recovery.
- **Hard `@future` restrictions that compile cleanly and only fail at runtime under load:** a `@future` method cannot call another `@future` method (throws `System.AsyncException`), and cannot be called from Batch Apex `execute()`/`finish()`. Queueable chaining is the replacement; from Batch `finish()`, publish a Platform Event or chain the next Batch/Queueable directly.
- **Async for everything** — adds queue latency, breaks transactional consistency, and complicates error handling. Go async only for genuine long-running work, callouts from a trigger context, or volumes exceeding synchronous limits.
- **Callouts cannot be made synchronously from a trigger context** — a synchronous callout in trigger execution throws `System.CalloutException`. The trigger must enqueue a Queueable that implements `Database.AllowsCallouts`.
- **A callout after uncommitted DML throws `You have uncommitted work pending`.** Order the callout before the DML, or move the DML to a separate transaction (a follow-up call from the LWC, a Queueable, a Platform Event).
- **One `Http.send` is not one request.** Observed in production-like traffic: a callout answered `503` was resent about 1.3 s later from Salesforce's egress (`SFDC-Callout` user agent), and Apex received only the second answer. Any non-idempotent endpoint Apex calls must accept a client-computed dedupe key, or a 503 starts duplicate work.

| Tool | When |
|---|---|
| Queueable + Finalizer | Default; job ID, chaining, non-primitive inputs, recovery |
| Batch Apex | Very large datasets; `Database.getQueryLocator` in `start()` iterates up to 50M rows |
| Schedulable / Scheduled Flow | Recurring schedules |
| Continuation | Non-blocking callout from a UI action. UX only, not a limits fix: 120 s / 3 callouts, one in flight per client |

- **Queueable chaining is one child per execution.** From within a running Queueable's `execute()` only **one** child job may be enqueued — a second `System.enqueueJob()` throws `System.LimitException`.
- **Cap recursive chains with `AsyncOptions.MaximumQueueableStackDepth`** on the initial enqueue.
- **Runaway async chains** — a Queueable that re-enqueues itself with no stopping check runs forever, exhausting the daily async-job allocation or the 5-concurrent-batch limit. Every self-chaining job needs an explicit termination condition — a record counter, a processed-flag field, or a cursor — checked **before** re-enqueuing (query the remaining work; if empty, return without enqueuing).
- **Duplicate jobs** — guard idempotency platform-side with `QueueableDuplicateSignature` (built from `addId()`/`addString()`/`addInteger()`) set on `AsyncOptions.DuplicateSignature` (Winter '24): enqueuing a second job with the same signature throws `DuplicateMessageException` instead of double-processing. `AsyncOptions.MinimumQueueableDelayInMinutes` debounces bursty re-enqueues.
- **Batch failures must be observable.** A Batch class should implement `Database.RaisesPlatformEvents` so unhandled `execute()` failures publish `BatchApexErrorEvent` records a subscriber (trigger or logging framework) can persist — otherwise scope-level errors vanish into the job log.
- **Batch scope defaults to 200** — store the scope size in Custom Metadata so admins can tune it without a deployment.
- **Batch state resets every chunk unless the class implements `Database.Stateful`.** Instance fields (running totals, accumulated maps) revert to their initial values between `execute()` scopes; `Database.Stateful` retains **instance** members across transactions (statics never persist either way), at the cost of serializing the class after each chunk — so keep stateful fields small and persist large running data to a record instead. `finish()` then sees the accumulated state for end-of-job summaries.

## Concurrency across simultaneous transactions

> The rest of this skill reviews one transaction in isolation. These limits bite only when many
> requests run **at the same time** — the load-test / capacity lens, not per-transaction correctness.

- **Concurrent long-running synchronous Apex — 10 to 50 per org.** The cap scales with licenses (100 licenses : 1 concurrent transaction; min 10, max 50), not a flat 10. A synchronous request counts toward it **only once its wall-clock run time passes 5 seconds**; the next concurrent >5s request over the cap is rejected with `CONCURRENT_REQUESTS_LIMIT_EXCEEDED`. A transaction that finishes in under 5s never counts, no matter how many run at once — so the fix for concurrency pressure is to keep synchronous work fast (offload slow work to async), not to serialize callers. Async, Batch, `@future`, and Queueable executions do **not** count against this limit.
- **A slow synchronous path is a concurrency risk even when it passes every single-user test.** A trigger/@AuraEnabled path measured at ~2s is safe; one that drifts over 5s under real data turns the 10-request cap into a hard ceiling on simultaneous users. Flag any synchronous entry point doing heavy SOQL/rollup/sharing work whose run time could cross 5s at production volume — measure it, don't assume.
- **`EventBus.publish` draws on a per-transaction limit and an hourly allocation.** The per-transaction limit depends on the event's publish behaviour: for **Publish After Commit**, each call counts as one DML statement (150 per transaction, `Limits.getDMLStatements()`); for **Publish Immediately**, each call counts against a separate limit of 150 `EventBus.publish()` calls (`Limits.getPublishImmediateDML()`). Every publish method also draws on the org's **hourly** event publishing allocation (250,000 per hour on Enterprise and Unlimited, more with an add-on). A publish-per-record in a trigger path exhausts one or the other under load — aggregate and publish once per transaction.
- **`Messaging.sendEmail` is capped at 5,000 external-address emails per org per day.** Email fired from a create/update path fans out with user count; a per-record send in a bulk or concurrent flow can drain the daily allocation and start throwing. Batch recipients into one message and prefer async delivery.
