# Trigger Design

> Part of `salesforce-apex-quality` — see SKILL.md for the always-on Quick Reference and routing.

## Business logic in the trigger body

*Why it fails:* Trigger-body logic is not unit-testable in isolation, not reusable, and cannot be ordered or toggled.

```apex
// BAD
trigger AccountTrigger on Account (before insert) {
    for (Account acc : Trigger.new) { if (acc.Industry == 'Tech') { acc.Rating = 'Hot'; } }
}
```

```apex
// GOOD
trigger AccountTrigger on Account (before insert) { new AccountTriggerHandler().run(); }
```

*Fix:* Trigger does event routing only — all contexts through a single trigger into the handler. Rules belong in domain/service classes.

---

## More than one trigger per object

*Why it fails:* Execution order across multiple triggers is undefined — produces intermittent, unreproducible bugs.

*Fix:* One trigger per object. Managed-package triggers are the only accepted exception.

---

## No recursion control

*Why it fails:* An after-update trigger that updates its own object re-fires until it hits a limit or double-processes records.

```apex
// BAD — no guard; update inside handler re-enters
public void afterUpdate() { /* logic that issues DML on same object */ }
```

```apex
// GOOD — Set<Id> guard (not a bare boolean)
public class AccountTriggerHandler {
    private static Set<Id> processedIds = new Set<Id>();
    public void afterUpdate(List<Account> records) {
        List<Account> toProcess = new List<Account>();
        for (Account acc : records) {
            if (!processedIds.contains(acc.Id)) { processedIds.add(acc.Id); toProcess.add(acc); }
        }
        if (toProcess.isEmpty()) { return; }
        // ... logic on toProcess only
    }
}
```

*Fix:* A static `Set<Id>` of processed records — not a single `Boolean`. A bare `isFirstRun` boolean skips the second bulk batch entirely.

---

## Mixed automation on the same object

*Why it fails:* Apex triggers, record-triggered Flows, and legacy Workflow Rules on the same object create field-update races and recursive cross-firing with undefined ordering.

*Fix:* One automation strategy per object. If a division of labor is unavoidable, document it explicitly. Never silently add a Flow to an object an Apex trigger already owns.
