# Async

> Part of `reviewing-apex` — see SKILL.md for the always-on Quick Reference and routing.

- **Reaching for `@future`** — cannot chain, cannot be called from Batch, cannot accept non-primitive types, returns no job ID. Legacy — must not appear in new code. Default to a `Queueable` (implementing `Database.AllowsCallouts` when it makes callouts) with a `System.Finalizer` attached for cleanup and recovery.
- **Hard `@future` restrictions that compile cleanly and only fail at runtime under load:** a `@future` method cannot call another `@future` method (throws `System.AsyncException`), and cannot be called from Batch Apex `execute()`/`finish()`. Queueable chaining is the replacement; from Batch `finish()`, publish a Platform Event or chain the next Batch/Queueable directly.
- **Async for everything** — adds queue latency, breaks transactional consistency, and complicates error handling. Go async only for genuine long-running work, callouts from a trigger context, or volumes exceeding synchronous limits.
- **Callouts cannot be made synchronously from a trigger context** — a synchronous callout in trigger execution throws `System.CalloutException`. The trigger must enqueue a Queueable that implements `Database.AllowsCallouts`.

| Tool | When |
|---|---|
| Queueable + Finalizer | Default; job ID, chaining, non-primitive inputs, recovery |
| Batch Apex | Very large datasets; `Database.getQueryLocator` in `start()` iterates up to 50M rows |
| Schedulable / Scheduled Flow | Recurring schedules |
| Continuation | Long-running callouts from LWC |

- **Queueable chaining is one child per execution.** From within a running Queueable's `execute()` only **one** child job may be enqueued — a second `System.enqueueJob()` throws `System.LimitException`.
- **Cap recursive chains with `AsyncOptions.MaximumQueueableStackDepth`** on the initial enqueue.
- **Runaway async chains** — a Queueable that re-enqueues itself with no stopping check runs forever, exhausting the daily async-job allocation or the 5-concurrent-batch limit. Every self-chaining job needs an explicit termination condition — a record counter, a processed-flag field, or a cursor — checked **before** re-enqueuing (query the remaining work; if empty, return without enqueuing).
- **Duplicate jobs** — guard idempotency platform-side with `QueueableDuplicateSignature` (built from `addId()`/`addString()`/`addInteger()`) set on `AsyncOptions.DuplicateSignature` (Winter '24): enqueuing a second job with the same signature throws `DuplicateMessageException` instead of double-processing. `AsyncOptions.MinimumQueueableDelayInMinutes` debounces bursty re-enqueues.
- **Batch failures must be observable.** A Batch class should implement `Database.RaisesPlatformEvents` so unhandled `execute()` failures publish `BatchApexErrorEvent` records a subscriber (trigger or logging framework) can persist — otherwise scope-level errors vanish into the job log.
- **Batch scope defaults to 200** — store the scope size in Custom Metadata so admins can tune it without a deployment.
