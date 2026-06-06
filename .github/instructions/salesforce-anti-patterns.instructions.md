---
description: "Salesforce Apex anti-patterns to avoid — BAD/GOOD code pairs with fixes"
applyTo: "**/*.cls,**/*.trigger,**/*.apex"
---

# Apex Anti-Patterns

A reference of the Salesforce development anti-patterns that recur most across the
architecture book canon (Fawcett, Appleman, Malmqvist) and Salesforce Well-Architected
(architect.salesforce.com). Each entry states why the pattern fails at scale, shows a
BAD / GOOD code pair, and gives the fix.

## How to use this file

Consult this file before authoring or reviewing any `.cls` or `.trigger`. These are the
mistakes a generator commits more often than a human, because the BAD form usually
compiles, passes a single-record test, and only fails under bulk load, in a non-admin
profile, or after a deployment to a different org. When in doubt, prefer the GOOD form
even if the request looks small. A request for "just a quick trigger" is still a request
for bulk-safe, secure, configurable code.

This file complements the `generating-apex` skill rather than repeating it. It is
deliberately worked examples, not a constraint list.

---

## 1. Data Access and Governor Limits

### 1.1 SOQL inside a loop

**Why it fails:** Each iteration issues a query. At 200 records per trigger invocation
you cross the 100-query limit and the whole transaction rolls back. This is the single
most common cause of `System.LimitException: Too many SOQL queries: 101` in production.

```apex
// BAD - one query per Account
for (Account acc : Trigger.new) {
    List<Contact> contacts = [SELECT Id FROM Contact WHERE AccountId = :acc.Id];
    // ...
}
```

```apex
// GOOD - one query for the whole set, grouped in memory
Map<Id, List<Contact>> contactsByAccountId = new Map<Id, List<Contact>>();
for (Contact c : [SELECT Id, AccountId FROM Contact WHERE AccountId IN :Trigger.newMap.keySet()]) {
    if (!contactsByAccountId.containsKey(c.AccountId)) {
        contactsByAccountId.put(c.AccountId, new List<Contact>());
    }
    contactsByAccountId.get(c.AccountId).add(c);
}
for (Account acc : Trigger.new) {
    List<Contact> contacts = contactsByAccountId.get(acc.Id);
    // ...
}
```

**Fix:** Query once outside the loop using `IN :idSet`, then build a `Map` keyed by the
relationship field and look it up inside the loop. Use a relationship subquery when you
need parent and child together.

---

### 1.2 DML inside a loop

**Why it fails:** Same shape as SOQL in loops but against the 150-DML-statement limit.
It also wastes CPU time and triggers cascading automation per statement.

```apex
// BAD - one update call per record
for (Account acc : accountsToUpdate) {
    acc.Status__c = 'Reviewed';
    update acc;
}
```

```apex
// GOOD - collect, then one DML on the collection
List<Account> toUpdate = new List<Account>();
for (Account acc : accountsToUpdate) {
    acc.Status__c = 'Reviewed';
    toUpdate.add(acc);
}
update toUpdate;
```

**Fix:** Accumulate changed records in a `List` and issue a single DML after the loop.
In bulk or batch flows prefer partial-success DML (`Database.update(toUpdate, false)`)
and process the `SaveResult[]` for per-record errors.

---

### 1.3 Single-record assumption (not bulkified)

**Why it fails:** Logic written for `Trigger.new[0]` or one input record silently
processes only the first of a 200-record batch. Data Loader, Flows, and integrations all
push records in bulk, so the bug surfaces as missing updates rather than an exception,
which is harder to catch.

```apex
// BAD - handles only the first record
public static void setDefaults(List<Account> accounts) {
    Account acc = accounts[0];
    acc.Rating = 'Warm';
}
```

```apex
// GOOD - process the whole collection
public static void setDefaults(List<Account> accounts) {
    for (Account acc : accounts) {
        acc.Rating = 'Warm';
    }
}
```

**Fix:** Every public method accepts and processes collections. Always assume
`Trigger.new` holds 200 records. Single-record overloads should delegate to the bulk
method, never the reverse.

---

### 1.4 Nested loops instead of a map join

**Why it fails:** Two nested loops over collections is O(n*m) CPU and a frequent cause of
`Apex CPU time limit exceeded`, which (unlike SOQL limits) cannot be raised and gives no
partial credit.

```apex
// BAD - O(n*m)
for (Account acc : accounts) {
    for (Contact c : contacts) {
        if (c.AccountId == acc.Id) { /* ... */ }
    }
}
```

```apex
// GOOD - build a map once, then O(n) lookups
Map<Id, List<Contact>> contactsByAccountId = new Map<Id, List<Contact>>();
for (Contact c : contacts) {
    if (!contactsByAccountId.containsKey(c.AccountId)) {
        contactsByAccountId.put(c.AccountId, new List<Contact>());
    }
    contactsByAccountId.get(c.AccountId).add(c);
}
for (Account acc : accounts) {
    List<Contact> related = contactsByAccountId.get(acc.Id);
    // ...
}
```

**Fix:** Replace the inner loop with a `Map` lookup. Build the map in a single pass first.

---

### 1.5 Non-selective SOQL

**Why it fails:** Queries without a `WHERE` on an indexed field, without a `LIMIT`, or
selecting fields you do not use degrade as data grows and trip non-selective-query errors
against large objects (the platform blocks queries that would scan too many rows). There
is no `SELECT *` in SOQL, so a generator that "selects everything to be safe" both leaks
fields and slows the query.

```apex
// BAD - unbounded, unfiltered, over-fetching
List<Account> accounts = [SELECT FIELDS(ALL) FROM Account];
```

```apex
// GOOD - selective filter on indexed field, bounded, only needed fields
List<Account> accounts = [
    SELECT Id, Name, Industry
    FROM Account
    WHERE OwnerId = :UserInfo.getUserId()
    WITH USER_MODE
    ORDER BY Name
    LIMIT 200
];
```

**Fix:** Filter on indexed fields (`Id`, `Name`, `OwnerId`, lookups, external IDs, custom
indexes), select only the fields you need, add `LIMIT` and `ORDER BY`, and add
`WITH USER_MODE`. For Custom Metadata Types do not use SOQL at all; use
`CustomMdt__mdt.getAll().values()`.

---

## 2. Trigger Design

### 2.1 Business logic in the trigger body

**Why it fails:** Logic in the `.trigger` file is not unit-testable in isolation, not
reusable, and cannot be ordered or toggled. As the object accumulates concerns, the
trigger becomes a Big Ball of Mud that no one can change safely.

```apex
// BAD - logic lives in the trigger
trigger AccountTrigger on Account (before insert) {
    for (Account acc : Trigger.new) {
        if (acc.Industry == 'Tech') { acc.Rating = 'Hot'; }
    }
}
```

```apex
// GOOD - trigger only routes; logic lives in a handler/service
trigger AccountTrigger on Account (before insert) {
    new AccountTriggerHandler().run();
}
```

**Fix:** The trigger does event routing only. Delegate to a handler framework (or Trigger
Actions Framework), and put rules in domain/service classes that can be tested directly.

---

### 2.2 More than one trigger per object

**Why it fails:** Execution order across multiple triggers on the same object is
undefined. You cannot guarantee which fires first, which produces intermittent,
unreproducible bugs.

**Fix:** One trigger per object, per the standard design pattern. Route all contexts
(`before insert`, `after update`, and so on) through that single trigger into the handler.
Managed-package triggers are the only accepted exception.

---

### 2.3 No recursion control

**Why it fails:** An after-update trigger that updates its own object re-fires the
trigger, which can loop until it hits a limit or double-processes records.

```apex
// BAD - no guard; an update inside the handler re-enters here
public void afterUpdate() {
    // ... logic that issues DML on the same object
}
```

```apex
// GOOD - guard re-entry, and guard it correctly for bulk
public class AccountTriggerHandler {
    private static Set<Id> processedIds = new Set<Id>();

    public void afterUpdate(List<Account> records) {
        List<Account> toProcess = new List<Account>();
        for (Account acc : records) {
            if (!processedIds.contains(acc.Id)) {
                processedIds.add(acc.Id);
                toProcess.add(acc);
            }
        }
        if (toProcess.isEmpty()) { return; }
        // ... logic on toProcess only
    }
}
```

**Fix:** Guard re-entry with static state. Prefer a `Set<Id>` of processed records over a
single static `Boolean`. A bare `isFirstRun` boolean is itself a bulk anti-pattern,
because the second batch of a multi-batch operation gets skipped entirely.

---

### 2.4 Mixing automation tools on the same object

**Why it fails:** Apex triggers, record-triggered Flows, and any legacy Workflow Rules or
Process Builders on the same object run in an order that is hard to reason about and
produces field-update races and recursive cross-firing.

**Fix:** Pick one automation strategy per object. For developer-owned objects, standardize
on the trigger handler and keep record-triggered automation out of it, or define a clear,
documented division of labor. Do not silently add a Flow to an object that an Apex trigger
already owns.

---

## 3. Security

### 3.1 No CRUD/FLS enforcement (running in system mode by default)

**Why it fails:** Apex runs in system context, so SOQL and DML ignore the running user's
object and field permissions unless you enforce them. Code that works for an admin throws
`INSUFFICIENT_ACCESS` for a standard user, or worse, silently exposes or writes fields the
user should never touch. This is the most common security review failure.

```apex
// BAD - ignores the running user's FLS/CRUD
List<Account> accounts = [SELECT Id, AnnualRevenue FROM Account];
update accounts;
```

```apex
// GOOD - enforce in both SOQL and DML
List<Account> accounts = [SELECT Id, AnnualRevenue FROM Account WITH USER_MODE];
Database.update(accounts, AccessLevel.USER_MODE);
```

**Fix:** Use `WITH USER_MODE` in SOQL and `AccessLevel.USER_MODE` in `Database` DML
(API 56+). For older orgs that cannot use user mode, fall back to
`Security.stripInaccessible()` on the records before returning or persisting them. Default
classes to `with sharing`; document any `without sharing` and gate it behind a Custom
Permission check, isolated in a dedicated helper.

---

### 3.2 SOQL injection via string concatenation

**Why it fails:** Concatenating user input into a dynamic query lets a caller alter the
query and read or exfiltrate data outside the intended scope.

```apex
// BAD - user input concatenated straight into the query
String q = 'SELECT Id FROM Account WHERE Name = \'' + userInput + '\'';
List<Account> results = Database.query(q);
```

```apex
// GOOD - bind variable
String q = 'SELECT Id FROM Account WHERE Name = :userInput';
List<Account> results = Database.query(q);
```

**Fix:** Bind all user input with `:variable`. When the input is a field or operator name
that cannot be bound, validate it against an allowlist or `Schema.describe` before use.
Use `String.escapeSingleQuotes()` only as a secondary measure, never as the primary
defense.

---

### 3.3 Hardcoded secrets

**Why it fails:** API keys, tokens, or passwords in Apex are visible to anyone with read
access to the code, get committed to version control, and cannot be rotated without a
deployment.

**Fix:** Store credentials in Named Credentials (for callouts) or protected Custom
Metadata / Custom Settings. Never place a secret in a string literal, a debug statement,
or an error message.

---

## 4. Maintainability and Configuration

### 4.1 Hardcoded record IDs

**Why it fails:** Record Type IDs, Profile IDs, and similar 15/18-char IDs differ between
sandbox and production and across orgs. Hardcoding them guarantees the logic fails after
deployment, often silently down a branch that no longer matches.

```apex
// BAD - this ID does not exist in production
if (acc.RecordTypeId == '012500000009ABcAAM') { /* ... */ }
```

```apex
// GOOD - resolve by developer name at runtime
Id businessRtId = Schema.SObjectType.Account
    .getRecordTypeInfosByDeveloperName()
    .get('Business_Account')
    .getRecordTypeId();
if (acc.RecordTypeId == businessRtId) { /* ... */ }
```

**Fix:** Resolve IDs dynamically via `Schema.describe`, or move the configurable value to
Custom Metadata or a Custom Label. The same rule covers environment-specific URLs and
queue or group references.

---

### 4.2 Magic strings and numbers

**Why it fails:** Repeated literals drift out of sync, hide intent, and make a status or
threshold change a find-and-replace exercise across many files.

```apex
// BAD - repeated literal, unclear intent
if (opp.StageName == 'Closed Won' && opp.Amount > 50000) { /* ... */ }
```

```apex
// GOOD - named constants (or Custom Metadata for configurable values)
private static final String STAGE_CLOSED_WON = 'Closed Won';
private static final Decimal LARGE_DEAL_THRESHOLD = 50000;
if (opp.StageName == STAGE_CLOSED_WON && opp.Amount > LARGE_DEAL_THRESHOLD) { /* ... */ }
```

**Fix:** Extract repeated literals into `private static final` constants or a constants
class. Use enums over string constants where possible. Use Custom Labels for user-facing
text and Custom Metadata for thresholds, mappings, and feature flags that admins may want
to change without a deployment.

---

### 4.3 Swallowed exceptions

**Why it fails:** An empty or log-only `catch` hides failures. The transaction appears to
succeed, data is left half-written, and there is no signal that anything went wrong.

```apex
// BAD - failure disappears
try {
    update accounts;
} catch (Exception e) {
    // nothing, or only System.debug(e)
}
```

```apex
// GOOD - handle, preserve cause, or rethrow with context
try {
    update accounts;
} catch (DmlException e) {
    throw new AccountServiceException('Failed to update accounts: ' + e.getMessage(), e);
}
```

**Fix:** Catch the specific exception, add context, and either recover, log through a real
logging framework, or rethrow. Preserve the cause chain with the `(message, cause)`
constructor rather than concatenating messages and losing the stack trace. In
`@AuraEnabled` methods, rethrow as `AuraHandledException` with a sanitized message so
internal details never reach the UI.

---

### 4.4 System.debug in production code paths

**Why it fails:** `System.debug` statements evaluate their arguments even when no debug
log is active, consuming CPU time on every execution, and can leak sensitive data into
logs.

**Fix:** Remove debug statements from main code paths. Use a logging framework that writes
to a custom object or platform event when you need production observability. Never log
PII.

---

## 5. Asynchronous Apex

### 5.1 Reaching for @future

**Why it fails:** `@future` cannot chain, cannot be called from Batch, cannot accept
non-primitive types, returns no job ID to monitor, and is hard to test deterministically.
It is legacy and should not appear in new code.

```apex
// BAD - legacy fire-and-forget
@future(callout=true)
public static void syncToExternal(Set<Id> recordIds) { /* ... */ }
```

```apex
// GOOD - Queueable, with callout support and a recovery hook
public class ExternalSyncQueueable implements Queueable, Database.AllowsCallouts {
    private final Set<Id> recordIds;
    public ExternalSyncQueueable(Set<Id> recordIds) { this.recordIds = recordIds; }
    public void execute(QueueableContext ctx) {
        // ... callout and processing
    }
}
// enqueue: System.enqueueJob(new ExternalSyncQueueable(ids));
```

**Fix:** Use Queueable with `System.Finalizer` for recovery. Reserve Batch Apex for very
large datasets and Scheduled Flow or Schedulable for recurring work. Match the async tool
to the job rather than defaulting to `@future`.

---

### 5.2 Async for everything

**Why it fails:** Moving logic async that did not need to be adds queue latency, breaks
transactional consistency (the caller's transaction commits before the async work runs),
and complicates error handling and testing. Well-Architected calls out forcing
async/event-based patterns onto processes that need tightly coupled logic for data
integrity.

**Fix:** Use async only for genuine long-running work, callouts from a trigger context, or
volumes that exceed synchronous limits. If the user must see the result in the same
request, or the operation must be atomic with the trigger, keep it synchronous and use
proper error handling instead.

---

## 6. Testing

### 6.1 SeeAllData=true

**Why it fails:** Tests that read org data are not isolated. They pass or fail depending on
what records happen to exist, break across orgs, and hide missing test setup.

**Fix:** Create your own test data with `@TestSetup` or a test data factory. Reserve
`SeeAllData=true` for the narrow cases that require it (for example some metadata or
pricebook scenarios).

---

### 6.2 Coverage without assertions

**Why it fails:** A test that exercises code but asserts nothing proves only that the code
did not throw. It locks in whatever behavior exists, including bugs, and gives false
confidence behind a green coverage number.

```apex
// BAD - runs the method, verifies nothing
@isTest static void testSetRating() {
    AccountService.setDefaults(accounts);
}
```

```apex
// GOOD - assert the actual outcome
@isTest static void testSetRating() {
    Test.startTest();
    AccountService.setDefaults(accounts);
    Test.stopTest();
    for (Account acc : accounts) {
        Assert.areEqual('Warm', acc.Rating, 'Rating should default to Warm');
    }
}
```

**Fix:** Assert behavior, not coverage. Use the modern `Assert` class
(`Assert.areEqual`, `Assert.isTrue`) rather than legacy `System.assertEquals`. Test
positive paths, negative paths, and the bulk case.

---

### 6.3 Not testing the bulk case

**Why it fails:** A test that inserts one record never exercises the governor limits the
code will hit in production. It passes while the code is unshippable.

**Fix:** Insert at least 200 records in tests for any trigger or bulk-facing service so the
test actually proves bulk safety. Wrap the operation in `Test.startTest()` /
`Test.stopTest()` to get a fresh set of limits and to flush async work.

---

## 7. Architecture and Design

These are the higher-level shapes the book canon names. They show up in generated code as
structural drift rather than a single bad line.

### 7.1 Golden Hammer (one pattern for everything)

**Why it fails:** Producing a Service class for every requirement, even when a Selector,
Domain, or simple utility is the right tool, bloats the codebase and scatters logic that
belongs together. Malmqvist lists this among the core anti-patterns; it is also exactly
what a generator does by default.

**Fix:** Choose the smallest correct pattern. SOQL belongs in a Selector, SObject behavior
and validation in a Domain, orchestration in a Service, pure helpers in a Utility. Do not
wrap a one-line describe call in a Service.

---

### 7.2 No separation of concerns (mixed layers)

**Why it fails:** A method that mixes orchestration, inline SOQL/DML, callouts, and parsing
cannot be tested, reused, or changed without risk. Well-Architected treats single-level
abstraction per method across layer boundaries as the dividing line between adaptable and
unmaintainable code.

**Fix:** Keep one level of abstraction per method. Triggers route, services coordinate,
domains hold rules, and the data layer owns SOQL/DML/HTTP. No business decisions in the
data layer; no inline queries in the service layer.

---

### 7.3 Spaghetti Sharing Model

**Why it fails:** Ad hoc sharing rules, public groups, and `without sharing` escapes
accreting over time produce a sharing model no one understands, where it becomes unclear
who can see what and accidental data exposure is hard to rule out.

**Fix:** Design sharing deliberately and keep it under governance. Default to
`with sharing`, isolate any elevated-access logic, and treat changes to the sharing model
as architectural decisions, not quick fixes.

---

### 7.4 Big Ball of Mud

**Why it fails:** A system with no discernible structure, where everything depends on
everything, is the end state of repeatedly taking the BAD option above under deadline. Each
change risks unrelated breakage.

**Fix:** Enforce the layering and naming conventions consistently from the start. The
day-to-day defense is the per-line discipline in sections 1 through 6; the Big Ball of Mud
is simply what their absence compounds into.

---

## Quick reference

| Anti-pattern | One-line fix |
| --- | --- |
| SOQL in loop | Query once with `IN :ids`, map in memory |
| DML in loop | Collect into a `List`, one DML after the loop |
| Single-record assumption | Process collections; assume 200 records |
| Nested loops | Build a `Map`, replace inner loop with lookup |
| Non-selective SOQL | Indexed `WHERE`, named fields, `LIMIT`, `WITH USER_MODE` |
| Logic in trigger body | Trigger routes only; logic in handler/service |
| Multiple triggers per object | One trigger per object |
| No recursion control | Static `Set<Id>` guard, not a bare boolean |
| Mixed automation tools | One automation strategy per object |
| No CRUD/FLS | `WITH USER_MODE` + `AccessLevel.USER_MODE` |
| SOQL injection | Bind variables; allowlist dynamic names |
| Hardcoded secrets | Named Credentials / protected CMDT |
| Hardcoded IDs | Resolve via `Schema.describe` or CMDT/Label |
| Magic strings/numbers | `private static final` constants / CMDT |
| Swallowed exceptions | Catch specific, preserve cause, rethrow with context |
| `System.debug` in prod | Remove; use a logging framework |
| `@future` | Queueable + Finalizer |
| Async for everything | Async only for real long-running/callout/volume needs |
| `SeeAllData=true` | `@TestSetup` / test data factory |
| Coverage without assertions | Assert outcomes with `Assert` class |
| No bulk test | Insert 200 records in tests |
| Golden Hammer | Smallest correct pattern, not Service for all |
| Mixed layers | One level of abstraction per method |
