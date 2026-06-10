# Async

> Part of `salesforce-apex-quality` — see SKILL.md for the always-on Quick Reference and routing.

## Reaching for @future

*Why it fails:* Cannot chain, cannot be called from Batch, cannot accept non-primitive types, returns no job ID. Legacy — must not appear in new code.

```apex
// BAD
@future(callout=true)
public static void syncToExternal(Set<Id> recordIds) { /* ... */ }
```

```apex
// GOOD — Queueable with recovery hook
public class ExternalSyncQueueable implements Queueable, Database.AllowsCallouts {
    private final Set<Id> recordIds;
    public ExternalSyncQueueable(Set<Id> ids) { this.recordIds = ids; }
    public void execute(QueueableContext ctx) { /* callout and processing */ }
}
```

*Fix:* Default to Queueable + `System.Finalizer` for cleanup and recovery.

Hard `@future` restrictions that compile cleanly and only fail at runtime under load:
- **A `@future` method cannot call another `@future` method** — throws `System.AsyncException` at runtime. Queueable chaining is the replacement.
- **A `@future` method cannot be called from Batch Apex `execute()`/`finish()`** — same runtime block. From `finish()`, publish a Platform Event or chain the next Batch/Queueable directly.

---

## Async for everything

*Why it fails:* Adds queue latency, breaks transactional consistency, and complicates error handling.

*Fix:* Go async only for genuine long-running work, callouts from a trigger context, or volumes exceeding synchronous limits.

**Callouts cannot be made synchronously from a trigger context** — a synchronous callout in trigger execution throws `System.CalloutException`. The trigger must enqueue a Queueable that implements `Database.AllowsCallouts`.

| Tool | When |
|---|---|
| Queueable + Finalizer | Default; job ID, chaining, non-primitive inputs, recovery |
| Batch Apex | Very large datasets; `Database.getQueryLocator` in `start()` iterates up to 50M rows |
| Schedulable / Scheduled Flow | Recurring schedules |
| Continuation | Long-running callouts from LWC |

- **Queueable chaining is one child per execution.** From within a running Queueable's `execute()` only **one** child job may be enqueued — a second `System.enqueueJob()` throws `System.LimitException`.
- **Cap recursive chains with `AsyncOptions.MaximumQueueableStackDepth`** on the initial enqueue.
- **Batch scope defaults to 200** — store the scope size in Custom Metadata so admins can tune it without a deployment.

---

## Runaway async chains (no termination condition)

*Why it fails:* A Queueable that re-enqueues itself with no stopping check runs forever — exhausting the daily async-job allocation or the 5-concurrent-batch limit.

```apex
// BAD — unconditional self re-enqueue
public void execute(QueueableContext ctx) {
    process(recordIds);
    System.enqueueJob(new ExternalSyncQueueable(recordIds));
}
```

```apex
// GOOD — re-enqueue only while work remains
public void execute(QueueableContext ctx) {
    List<Account> batch = selector.selectUnprocessed(SCOPE);
    if (batch.isEmpty()) { return; }
    process(batch);
    System.enqueueJob(new ExternalSyncQueueable());
}
```

*Fix:* Every self-chaining async job needs an explicit termination condition — a record counter, a processed-flag field, or a cursor — checked before re-enqueuing.
