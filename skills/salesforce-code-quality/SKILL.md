---
name: salesforce-code-quality
description: Quality gate for Apex, LWC, and Flows — invoke after generating any .cls, .trigger, lwc/**, aura/**, or flow-meta.xml file. Covers bulk safety, security, trigger design, async, error handling, maintainability, testing, architecture, LWC component rules, and Flow quality rules, with BAD/GOOD examples throughout.
---

# Salesforce Code Quality

Invoke this skill after generating Apex, LWC, or Flow output and when reviewing any `.cls`, `.trigger`, `lwc/**`, `aura/**`, or `flow-meta.xml` file. These are the patterns that compile and pass a single-record test but fail at scale, under a non-admin profile, or after deployment to a different org. When in doubt, prefer the GOOD form even for "just a quick" request.

This skill complements `generating-apex`, `generating-apex-test`, `generating-lwc-components`, and `generating-flow` (which cover how to produce an artifact) by specifying the quality bar those artifacts must meet. For Apex test classes: `generating-apex-test` handles the mechanics; Section 9 of this skill defines the quality bar the test code must meet.

---

## Part 1 — Apex

### 1. Data Access and Governor Limits

**1.1 SOQL inside a loop**

*Why it fails:* Each iteration issues a query. At 200 records per trigger batch you cross the 100-query limit and the transaction rolls back (`System.LimitException: Too many SOQL queries: 101`).

```apex
// BAD
for (Account acc : Trigger.new) {
    List<Contact> contacts = [SELECT Id FROM Contact WHERE AccountId = :acc.Id];
}
```

```apex
// GOOD — query once, group in memory
Map<Id, List<Contact>> contactsByAccount = new Map<Id, List<Contact>>();
for (Contact c : [SELECT Id, AccountId FROM Contact WHERE AccountId IN :Trigger.newMap.keySet()]) {
    if (!contactsByAccount.containsKey(c.AccountId)) contactsByAccount.put(c.AccountId, new List<Contact>());
    contactsByAccount.get(c.AccountId).add(c);
}
for (Account acc : Trigger.new) {
    List<Contact> contacts = contactsByAccount.get(acc.Id);
}
```

*Fix:* Query once outside the loop with `IN :idSet`. Build a `Map` keyed by the relationship field. Use a relationship subquery when you need parent and child together.

---

**1.2 DML inside a loop**

*Why it fails:* 150-DML-statement limit. Also triggers cascading automation per statement.

```apex
// BAD
for (Account acc : accountsToUpdate) { acc.Status__c = 'Reviewed'; update acc; }
```

```apex
// GOOD
List<Account> toUpdate = new List<Account>();
for (Account acc : accountsToUpdate) { acc.Status__c = 'Reviewed'; toUpdate.add(acc); }
update toUpdate;
```

*Fix:* Accumulate into a `List`, one DML after the loop. DML only records that actually changed — compare against `Trigger.oldMap` first. In bulk/batch flows use `Database.update(toUpdate, false)` and process `SaveResult[]` for per-record errors.

---

**1.3 Single-record assumption**

*Why it fails:* Data Loader, Flows, and integrations push in bulk. Processing only `accounts[0]` silently drops the rest — missing updates rather than exceptions.

```apex
// BAD
public static void setDefaults(List<Account> accounts) { Account acc = accounts[0]; acc.Rating = 'Warm'; }
```

```apex
// GOOD
public static void setDefaults(List<Account> accounts) {
    for (Account acc : accounts) { acc.Rating = 'Warm'; }
}
```

*Fix:* Every public method accepts and processes collections. Always assume `Trigger.new` holds 200 records. Single-record overloads must delegate to the bulk method, never the reverse.

---

**1.4 Nested loops instead of a map join**

*Why it fails:* O(n×m) CPU — the most common cause of `Apex CPU time limit exceeded`, which cannot be raised.

```apex
// BAD — O(n×m)
for (Account acc : accounts) {
    for (Contact c : contacts) { if (c.AccountId == acc.Id) { /* ... */ } }
}
```

```apex
// GOOD — build map once, O(n) lookups
Map<Id, List<Contact>> contactsByAccount = new Map<Id, List<Contact>>();
for (Contact c : contacts) {
    if (!contactsByAccount.containsKey(c.AccountId)) contactsByAccount.put(c.AccountId, new List<Contact>());
    contactsByAccount.get(c.AccountId).add(c);
}
for (Account acc : accounts) { List<Contact> related = contactsByAccount.get(acc.Id); }
```

*Fix:* Replace the inner loop with a `Map` lookup built in a single pre-pass.

---

**1.5 Non-selective SOQL**

*Why it fails:* Queries without an indexed `WHERE`, without a `LIMIT`, or over-fetching fields degrade as data grows and trip non-selective-query blocks on large objects.

```apex
// BAD
List<Account> accounts = [SELECT FIELDS(ALL) FROM Account];
```

```apex
// GOOD
List<Account> accounts = [
    SELECT Id, Name, Industry
    FROM Account
    WHERE OwnerId = :UserInfo.getUserId()
    WITH USER_MODE
    ORDER BY Name
    LIMIT 200
];
```

*Fix:* Filter on indexed fields (`Id`, `Name`, `OwnerId`, lookups, external IDs, custom indexes). Select only needed fields. Add `LIMIT`, `ORDER BY`, and `WITH USER_MODE`. For Custom Metadata Types use `CustomMdt__mdt.getAll().values()` or `getInstance()` — never SOQL.

Additional collection patterns:
- `Map<Id, SObject>` for ID lookups; `Map<Id, List<SObject>>` built in one loop for parent-child grouping; `Set<Id>` for deduplication
- Relationship subqueries for parent + child in one round trip; `AggregateResult` with `GROUP BY` for rollups

---

**1.6 Callout inside a loop**

*Why it fails:* Each callout counts against the 100-callout-per-transaction limit and adds a full network round trip per record. 200 records means 200 sequential round trips, then `System.LimitException: Too many callouts: 101` — the same failure shape as SOQL/DML in a loop.

```apex
// BAD — one callout per record
for (Account acc : accountsToSync) {
    HttpRequest req = new HttpRequest();
    req.setEndpoint('callout:Billing_API/account/' + acc.Id);
    req.setMethod('POST');
    new Http().send(req);
}
```

```apex
// GOOD — aggregate inputs, one batched callout, distribute the response in memory
List<Map<String, Object>> payload = new List<Map<String, Object>>();
for (Account acc : accountsToSync) {
    payload.add(new Map<String, Object>{ 'id' => acc.Id, 'name' => acc.Name });
}
HttpRequest req = new HttpRequest();
req.setEndpoint('callout:Billing_API/accounts/batch');
req.setMethod('POST');
req.setBody(JSON.serialize(payload));
HttpResponse res = new Http().send(req);
// parse res once, map results back to records by Id
```

*Fix:* Aggregate all inputs into a collection before the loop, make one batched callout, distribute the response back to records in memory. If the external API has no batch endpoint, move the work to a Queueable/Batch chunked within the callout limit. Callouts cannot be made synchronously from a trigger context at all — see §6.

---

**1.7 Repeated `Schema.describe` calls (performance)**

*Why it fails:* `Schema.getGlobalDescribe()` and `describeSObjects()` rebuild the full metadata map on every call. Invoked inside a loop or a frequently-called helper, this is a leading cause of `Apex CPU time limit exceeded` — up to ~95% of CPU on describe-heavy code (Avenga benchmarks).

```apex
// BAD — rebuilds the global describe every iteration
for (String name : objectNames) {
    Schema.SObjectType t = Schema.getGlobalDescribe().get(name);
}
```

```apex
// GOOD — cache once per transaction, reuse the reference
private static Map<String, Schema.SObjectType> describeCache;
private static Map<String, Schema.SObjectType> globalDescribe() {
    if (describeCache == null) { describeCache = Schema.getGlobalDescribe(); }
    return describeCache;
}
```

*Fix:* Cache describe results in a `private static Map` initialized once per transaction and reuse the cached reference.

---

**1.8 String concatenation with `+=` in a loop (heap)**

*Why it fails:* Apex strings are immutable, so each `+=` allocates a new heap object. Across a large collection this is O(n²) heap growth and a path to `Apex heap size too large`.

```apex
// BAD — new String allocation every iteration
String out = '';
for (String s : items) { out += s; }
```

```apex
// GOOD — accumulate, then join once
List<String> parts = new List<String>();
for (String s : items) { parts.add(s); }
String out = String.join(parts, ',');
```

*Fix:* Accumulate values into a `List<String>` and call `String.join(list, separator)` after the loop.

---

### 2. Trigger Design

**2.1 Business logic in the trigger body**

*Why it fails:* Trigger-body logic is not unit-testable in isolation, not reusable, and cannot be ordered or toggled. Accumulates into a Big Ball of Mud.

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

*Fix:* Trigger does event routing only — all contexts (`before insert`, `after update`, etc.) through a single trigger into the handler. Rules belong in domain/service classes.

---

**2.2 More than one trigger per object**

*Why it fails:* Execution order across multiple triggers is undefined — produces intermittent, unreproducible bugs.

*Fix:* One trigger per object. Managed-package triggers are the only accepted exception.

---

**2.3 No recursion control**

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

**2.4 Mixed automation on the same object**

*Why it fails:* Apex triggers, record-triggered Flows, and legacy Workflow Rules on the same object create field-update races and recursive cross-firing with undefined ordering.

*Fix:* One automation strategy per object. If a division of labor is unavoidable, document it explicitly. Never silently add a Flow to an object an Apex trigger already owns.

---

### 3. Security

**3.1 No CRUD/FLS enforcement**

*Why it fails:* Apex runs in system context. Works for admins, throws `INSUFFICIENT_ACCESS` for standard users, or silently exposes fields they should not access. Most common security review failure.

```apex
// BAD
List<Account> accounts = [SELECT Id, AnnualRevenue FROM Account];
update accounts;
```

```apex
// GOOD
List<Account> accounts = [SELECT Id, AnnualRevenue FROM Account WITH USER_MODE];
Database.update(accounts, AccessLevel.USER_MODE);
```

*Fix:* `WITH USER_MODE` in SOQL and `AccessLevel.USER_MODE` in `Database` DML (API 56+). For older orgs fall back to `Security.stripInaccessible()`. Default every class to `with sharing`; isolate any `without sharing` in a dedicated helper, document the reason, and gate it behind a Custom Permission check called from a `with sharing` entry point.

Additional security rules:
- **`WITH SECURITY_ENFORCED` is deprecated — do not write it in new code; migrate it when you see it.** Replace with `WITH USER_MODE`. Beyond the deprecation, the behavior differs: `WITH SECURITY_ENFORCED` throws on the *first* inaccessible field and aborts the whole query (no partial result), while `WITH USER_MODE` silently drops inaccessible fields and continues — and `USER_MODE` also honors restriction and scoping rules, which `SECURITY_ENFORCED` does not.
- **Legacy fallback (pre-API-56):** `Security.stripInaccessible(AccessType.READABLE, records)` before returning data, and `AccessType.CREATABLE` / `UPDATABLE` before DML. Document it as a legacy path; prefer `USER_MODE` on API 56+.
- **`ApexCRUDViolation` is the #1 AppExchange security-review failure.** This skill prescribes the enforcement; the quality gate is not complete until static analysis confirms it. Pair with `running-code-analyzer`: elevate `ApexCRUDViolation` to Severity 1 in `code-analyzer.yml` and fail CI/CD on it. (Passing Code Analyzer is necessary but not sufficient — AppExchange also runs Checkmarx taint analysis.)
- **Page layout is not FLS.** Layout controls display; FLS controls access. Never rely on removing a field from a layout to protect it — always enforce FLS in Apex regardless of how the field is surfaced. Assign FLS via permission sets, not profiles.
- **`without sharing` must never sit on a general-purpose service.** Every caller of that service silently inherits elevated access. Isolate it to a narrow, purpose-built helper gated behind a Custom Permission check.
- **`inherited sharing` is unsafe without mapping the full call chain.** Invoked from anonymous Apex or a `without sharing` context, an `inherited sharing` class runs in system mode while the developer assumes user mode. Map every call path before choosing it; prefer `with sharing` when in doubt. (As an `@AuraEnabled` entry point with no parent context, it defaults to `with sharing`.)

---

**3.2 SOQL injection**

*Why it fails:* Concatenating user input into a dynamic query lets a caller alter it and read data outside the intended scope.

```apex
// BAD
String q = 'SELECT Id FROM Account WHERE Name = \'' + userInput + '\'';
List<Account> results = Database.query(q);
```

```apex
// GOOD
String q = 'SELECT Id FROM Account WHERE Name = :userInput';
List<Account> results = Database.query(q);
```

*Fix:* Bind all user input with `:variable`. When the input is a field or operator name that cannot be bound, validate against an allowlist or `Schema.describe`. `String.escapeSingleQuotes()` is a secondary measure only, never the primary defense — it escapes quote characters in *string literals* but does nothing for injection into the query's *structure* (a field name, operator, `LIKE`/`IN` clause, or `ORDER BY` direction supplied by the user). Structural elements must be validated against a `Set<String>` allowlist or `Schema.describe`, never escaped.

Also: validate all IDs and string inputs from LWCs or page state before use. An LWC wire parameter bound to a component property is user-controlled input — treat every `@AuraEnabled` parameter as untrusted even though LWC itself does no string interpolation. Check object type when an ID can come from builder configuration.

---

**3.3 Hardcoded secrets and IDs**

*Why it fails:* Secrets in source are visible to anyone with read access and get committed to version control. Hardcoded Record Type / Profile IDs differ between sandbox and production and silently break post-deployment.

```apex
// BAD
String apiKey = 'sk-live-abc123';
if (acc.RecordTypeId == '012500000009ABcAAM') { /* ... */ }
```

```apex
// GOOD
// Secrets → Named Credentials (callouts) or protected Custom Metadata
// IDs → resolve by developer name at runtime
Id businessRtId = Schema.SObjectType.Account
    .getRecordTypeInfosByDeveloperName().get('Business_Account').getRecordTypeId();
if (acc.RecordTypeId == businessRtId) { /* ... */ }
```

*Fix:* Named Credentials or protected Custom Metadata for secrets. `Schema.describe`, Custom Metadata, or Custom Labels for configurable IDs and values. Never expose PII or internal error detail in debug logs, error messages, or API responses. In a managed package, mark configuration CMDT (API keys, encryption parameters, feature flags) **Protected** so subscriber-org admins can neither view nor export it — the records still travel with the package and stay readable from Apex. (Not needed for project-internal CMDT.)

---

### 4. Layering and Architecture

Follow Service-Selector-Domain layering. One level of abstraction per method. No responsibilities crossing layer boundaries:

| Layer | Responsibility | Never contains |
|---|---|---|
| Trigger | Event routing only | Business logic, SOQL, DML |
| Handler / Service | Flow control and coordination | Inline SOQL, DML, HTTP, parsing |
| Domain | Business rules, validation, field derivation | Queries, callouts, persistence |
| Selector | All SOQL; shared field-list constants | Business decisions |
| Data / Integration | SOQL, DML, HTTP | Business decisions |

Additional rules:
- Single responsibility per class. Split at ~500 lines; extract helpers for methods past ~40 lines.
- Return early: validate preconditions at the top and return or throw immediately.
- Dependency injection via constructor or method parameters for testability without org state.
- ApexDoc on the class header and every `public` or `global` method.
- Choose the smallest correct pattern: SOQL in a Selector, SObject behavior in a Domain, orchestration in a Service, pure helpers in a Utility. Do not wrap a one-line describe call in a Service class.
- Design sharing deliberately. Default `with sharing`; treat `without sharing` as an architectural decision, not a quick fix.
- In Selector field lists, prefer compile-time field references (`Schema.Account.Name` or a `Schema.SObjectField` constant) over string literals — field deletion is then caught at deploy time instead of failing at runtime.
- Static analysis is part of the quality gate, not an optional extra. Pair this skill with `running-code-analyzer`: the PMD rules `ApexCRUDViolation`, `ApexSharingViolations`, `ExcessiveClassLength`, `ExcessivePublicCount`, and `ExcessiveNestedBlockDepth` should be in the enforced rule set and the build should fail on security findings at Severity 1–2.

---

### 5. @AuraEnabled and ConnectApi

- Narrow inputs and outputs. Use typed wrapper classes — not raw JSON strings — for structured LWC responses.
- `cacheable=true` only when the method performs no DML, callouts, cart/checkout mutations, or session-specific side effects.
- Catch exceptions and rethrow as `AuraHandledException` with a user-friendly, sanitized message. Never expose internal detail.
- Isolate `ConnectApi` calls behind a wrapper/service to keep controllers thin and give tests a stable seam.
- **Do not let an LWC directly trigger a state-changing external callout through an `@AuraEnabled` method (CSRF risk).** A method reachable by a simple forged request can have a victim's authenticated session fire an unintended write to an external system. State-changing external operations must originate from a verified internal event — a DML trigger (already user-authenticated), a Platform Event consumer, or a Flow — not a GET-accessible Apex entry point. Enforce CRUD/FLS (`WITH USER_MODE`) on every `@AuraEnabled` method, and keep the enclosing class `with sharing`; on Experience Cloud, never return PII or account data to a guest context.

---

### 6. Async

**6.1 Reaching for @future**

*Why it fails:* Cannot chain, cannot be called from Batch, cannot accept non-primitive types, returns no job ID, and is hard to test deterministically. Legacy — must not appear in new code.

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
// System.enqueueJob(new ExternalSyncQueueable(ids));
```

*Fix:* Default to Queueable + `System.Finalizer` for cleanup and recovery.

*Hard `@future` restrictions that compile cleanly and only fail at runtime under load:*
- **A `@future` method cannot call another `@future` method** — throws `System.AsyncException` ("Future method cannot be called from a future or batch method"). The compiler does not catch it; review every `@future` for a callsite that is itself async. Queueable chaining (enqueue the next job from `execute()`) is the replacement.
- **A `@future` method cannot be called from Batch Apex `execute()`/`finish()`** — same runtime block. From `finish()`, publish a Platform Event to trigger a Queueable consumer, or chain the next Batch/Queueable directly.

---

**6.2 Async for everything**

*Why it fails:* Adds queue latency, breaks transactional consistency (caller commits before async work runs), and complicates error handling and testing.

*Fix:* Go async only for genuine long-running work, callouts from a trigger context, or volumes exceeding synchronous limits.

**Callouts cannot be made synchronously from a trigger context** — a synchronous callout in trigger execution throws `System.CalloutException`. The trigger must enqueue a Queueable that implements `Database.AllowsCallouts` (preferred) or a legacy `@future(callout=true)`; the callout then runs in the async job's `execute()`, outside the trigger transaction.

Tool guide:

| Tool | When |
|---|---|
| Queueable + Finalizer | Default; job ID, chaining, non-primitive inputs, recovery |
| Batch Apex | Very large datasets; `Database.getQueryLocator` in `start()` iterates up to 50M rows without heap limits |
| Schedulable / Scheduled Flow | Recurring schedules |
| Continuation | Long-running callouts from LWC |

- **Queueable chaining is one child per execution.** You can enqueue up to ~50 Queueable jobs from a *synchronous* transaction, but from within a *running* Queueable's `execute()` only **one** child job may be enqueued — a second `System.enqueueJob()` throws `System.LimitException`. Design chains as one-job-per-step.
- **Cap recursive chains with `AsyncOptions.MaximumQueueableStackDepth`** on the initial enqueue, as a ceiling that backstops the termination condition below.
- **Batch scope defaults to 200** — the safe balance across most orgs. Store the scope size in Custom Metadata so admins can tune it without a deployment; do not hardcode above 200 without CPU/heap profiling.

---

**6.3 Runaway async chains (no termination condition)**

*Why it fails:* A Queueable that re-enqueues itself, or a `Batch.finish()` that starts a new Batch, with no stopping check, runs forever — exhausting the daily async-job allocation (Queueable) or the 5-concurrent-batch limit (Batch).

```apex
// BAD — unconditional self re-enqueue, never terminates
public void execute(QueueableContext ctx) {
    process(recordIds);
    System.enqueueJob(new ExternalSyncQueueable(recordIds)); // runs until limits stop it
}
```

```apex
// GOOD — re-enqueue only while work remains
public void execute(QueueableContext ctx) {
    List<Account> batch = selector.selectUnprocessed(SCOPE);
    if (batch.isEmpty()) { return; }            // termination condition
    process(batch);
    System.enqueueJob(new ExternalSyncQueueable()); // one child, only when more remains
}
```

*Fix:* Every self-chaining async job needs an explicit termination condition — a record counter, a processed-flag field, or a cursor — checked before re-enqueuing. For Batch, check the same condition in `finish()` before `Database.executeBatch`, or decouple via a Platform Event consumer instead of chaining directly.

---

### 7. Error Handling and Null Safety

**7.1 Swallowed exceptions**

*Why it fails:* Empty or log-only `catch` hides failures. The transaction appears to succeed while data is left half-written.

```apex
// BAD
try { update accounts; } catch (Exception e) { /* nothing, or System.debug(e) */ }
```

```apex
// GOOD — catch specific, preserve cause, rethrow with context
try {
    update accounts;
} catch (DmlException e) {
    throw new AccountServiceException('Failed to update accounts: ' + e.getMessage(), e);
}
```

*Fix:* Catch the specific exception type (never generic `Exception` first). Preserve the cause chain with the `(message, cause)` constructor. In `@AuraEnabled` methods, rethrow as `AuraHandledException` with a sanitized message. Wrap only code that can actually throw — not simple assignments or arithmetic.

---

**7.2 Null and collection safety**

- Guard clauses for null or empty inputs at the top of public methods.
- Return empty collections instead of `null`.
- Use `String.isBlank()`, safe navigation (`?.`), and null coalescing (`??`).
- Never dereference `map.get(key)` inline unless presence is guaranteed.

---

### 8. Maintainability

**8.1 Magic strings and numbers**

*Why it fails:* Repeated literals drift out of sync, hide intent, and make a threshold change a find-and-replace across many files.

```apex
// BAD
if (opp.StageName == 'Closed Won' && opp.Amount > 50000) { /* ... */ }
```

```apex
// GOOD
private static final String STAGE_CLOSED_WON = 'Closed Won';
private static final Decimal LARGE_DEAL_THRESHOLD = 50000;
if (opp.StageName == STAGE_CLOSED_WON && opp.Amount > LARGE_DEAL_THRESHOLD) { /* ... */ }
```

*Fix:* `private static final` constants or a constants class. Enums over string constants where possible. Custom Labels for user-facing text. Custom Metadata for thresholds, mappings, and feature flags admins may change without a deployment.

---

**8.2 System.debug in production code paths**

*Why it fails:* `System.debug` evaluates its arguments even when no debug log is active, consuming CPU on every execution. Can leak sensitive data into logs.

*Fix:* Remove from main code paths. Use a logging framework (custom object or platform event) for production observability. Never log PII.

---

**8.3 Naming conventions**

| Artifact | Pattern |
|---|---|
| Service | `{SObject}Service` |
| Selector | `{SObject}Selector` |
| Domain | `{SObject}Domain` |
| Batch | `{Descriptive}Batch` |
| Queueable | `{Descriptive}Queueable` |
| Schedulable | `{Descriptive}Schedulable` |
| Utility | `{Descriptive}Util` |
| Interface | `I{Descriptive}` |
| Custom exception | `{Descriptive}Exception` |
| Methods | Start with a verb |
| Maps | `{value}By{key}` (e.g., `accountById`) |
| Lists | Plural nouns |

---

**8.4 Deep nesting and excessive cyclomatic complexity**

*Why it fails:* Each added level of nested `if`/`for`/`try` multiplies the paths a reader and a test must track. Beyond ~3 levels, readability and branch coverage collapse and bugs hide in the rarely-exercised branches. PMD rule: `ExcessiveNestedBlockDepth` (flags past three levels).

```apex
// BAD — arrow code; logic buried four levels deep
for (Account acc : accounts) {
    if (acc.IsActive__c) {
        if (acc.AnnualRevenue != null) {
            if (acc.AnnualRevenue > THRESHOLD) { /* the actual work */ }
        }
    }
}
```

```apex
// GOOD — guard clauses flatten to one level
for (Account acc : accounts) {
    if (!acc.IsActive__c) { continue; }
    if (acc.AnnualRevenue == null || acc.AnnualRevenue <= THRESHOLD) { continue; }
    // the actual work, un-nested
}
```

*Fix:* Cap nesting at ~3 levels. Use guard clauses (early `return`/`continue`), hoist complex conditions into well-named `Boolean` variables, and extract deeply nested blocks into named helper methods.

---

### 9. Testing

**Required patterns — all must be present:**

- Use `Assert.areEqual`, `Assert.isTrue`, `Assert.isFalse`, `Assert.isNull`, `Assert.isNotNull`, `Assert.fail` — not legacy `System.assert*` calls.
- One test class per in-scope production class or automation entry point.
- One behavior per test method. Separate positive, negative, and bulk scenarios into distinct methods. Do not combine distinct inputs (e.g., null and empty) in a single method.
- Always test negative and exception paths. For expected exceptions: `try/catch`, `Assert.fail` after the call, assert on the caught type and message.
- Bulk test with 201+ records to cross the 200-record trigger batch boundary. For Batch Apex set batch size ≥ record count so the full scope runs.
- For trigger handlers, test through real DML against the owning trigger; keep shared service-only behavior in the service test class.
- Wrap the code under test in `Test.startTest()` / `Test.stopTest()` to reset governor limits and flush async work (Queueable, Batch, Scheduled).
- Delegate all record creation to a `TestDataFactory` inside `@TestSetup`. Never build record lists inline. `SeeAllData=false` — no org data dependency, no hardcoded IDs.
- Assert exact expected values derived from test setup. Include a failure message on every assertion. No range or approximate-count assertions when the value is deterministic.
- Mock external boundaries: `HttpCalloutMock` for callouts (set before `Test.startTest()`), `Test.setFixedSearchResults` for SOSL. For callout wrappers, assert endpoint shape, HTTP method, required headers, response handling, and error behavior.
- Verify sharing-sensitive entry points. For any class with a non-obvious sharing mode (`inherited sharing`, `without sharing`), add a `System.runAs` test as a restricted user that asserts records are filtered (or deliberately exposed) as intended. Coverage never proves sharing behavior — this is the runtime counterpart to the `WITH USER_MODE` enforcement in §3.
- Make Custom Metadata-driven logic testable without org dependence. `__mdt` records cannot be inserted via DML, so don't let a test silently run against whatever CMDT happens to exist in the org. Provide the config values the test needs through a test seam — inject in-memory `__mdt` instances via a `@TestVisible` setter or constructor (dependency injection) — so the assertion is deterministic.
- Coverage: 75% minimum to deploy; 90% working target; 100% on business-critical paths. Coverage is a floor, not the goal — assertions are what matter.

**BAD/GOOD — coverage without assertions:**

```apex
// BAD — runs the method, verifies nothing
@isTest static void testSetRating() { AccountService.setDefaults(accounts); }
```

```apex
// GOOD — asserts the actual outcome
@isTest static void testSetRating() {
    Test.startTest();
    AccountService.setDefaults(accounts);
    Test.stopTest();
    for (Account acc : accounts) {
        Assert.areEqual('Warm', acc.Rating, 'Rating should default to Warm');
    }
}
```

**Test anti-patterns to reject:** SOQL or DML inside test loops, magic numbers in assertions, god test classes past ~500 lines, overlong test methods, catching generic `Exception` instead of the specific expected type.

---

## Part 2 — LWC

### 10. Component Architecture and Data Sources

- Decide component architecture and data source **before** building. Compose small, single-responsibility components with minimal, explicit communication between them.
- Prefer Lightning base components and SLDS utility classes for forms, modals, spinners, buttons, comboboxes, radio groups, file inputs, and checkout UI. Check the SLDS library before writing vanilla HTML.
- Build accessible components: semantic SLDS markup, labels and ARIA attributes, full keyboard navigation. Do not ship UI less accessible than the base component it replaces.
- No hardcoded colors, spacing, or fonts. Use SLDS styling hooks (CSS custom properties) for theming and dark mode support. As of Spring '25, SLDS 2 replaces the old static design tokens (`$color-brand`) with global styling hooks (e.g., `--slds-c-button-brand-color-background`); new components should use SLDS 2 hook names — verify the current names against the SLDS 2 documentation, since they evolve.
- `@api` properties for Experience Builder configuration and Commerce context (`effectiveAccountId`, `cartId`, `webstoreId`, `recordId`, labels, limits, display toggles).
- Keep component state minimal and derived. Use `@track` only where the LWC runtime or nested mutation pattern requires it.

**Data source decision guide:**

| Use case | Source |
|---|---|
| Single-record read / simple CRUD | Lightning Data Service (`getRecord` / `lightning-record-form` / `lightning-record-edit-form`) |
| Complex server query or multi-object shaping | `@AuraEnabled(cacheable=true)` Apex |
| Related / graph-shaped data with pagination | GraphQL wire adapter |
| Cross-DOM communication | Lightning Message Service |

Prefer LDS over Apex for plain record CRUD — the framework manages cache and FLS for you.

**Template directives:**
- **`for:each` `key` must be a stable unique id from the data — never the loop index.** Using the index as the key breaks DOM reconciliation when the list is reordered or an item is removed: wrong focused element, stale input values, duplicated rows.

```html
<!-- BAD — index key; reorder/delete corrupts the rendered rows -->
<template for:each={items} for:item="item" for:index="i">
    <li key={i}>{item.name}</li>
</template>

<!-- GOOD — stable id key -->
<template for:each={items} for:item="item">
    <li key={item.Id}>{item.name}</li>
</template>
```

- **Use `lwc:if` / `lwc:elseif` / `lwc:else` for conditional rendering.** The old `if:true` / `if:false` directives are deprecated (Spring '23) and must not appear in new components. Use `iterator:it` only when you actually need first/last metadata.
- **Wire-provisioned data is read-only (frozen).** Shallow-copy before editing — `this.editable = { ...this.record.data }` — and replace the object reference rather than mutating in place. Mutating the wire result directly throws under LWS and causes unpredictable re-renders.

---

### 11. Async, State, and Events

- `@wire` for reactive state and Salesforce data. Imperative calls for user-triggered mutations (add to cart, update delivery method, address selection, checkout payment, file upload, wishlist changes).
- Prefer `async`/`await` over chained `.then()` calls for imperative Apex. `try/catch` for error handling.
- Always handle both `data` and `error` branches for wire adapters and promises. Surface failures through `ShowToastEvent`, inline state, or existing modal patterns.
- No `console.log`, `debugger`, or temporary diagnostics in committed code.
- Custom Labels (when translations are needed) or Custom Metadata for button labels, modal text, errors, and toasts — unless the component has builder-configured text properties.
- Dispatch semantic custom events: lowercase event names, clear `detail` payloads. Use `bubbles` and `composed` only when the event must cross component boundaries — never as defaults. An event with both flags escapes the shadow DOM and can be intercepted by any ancestor, including components in other namespaces, so default events to non-bubbling and scope cross-boundary events deliberately.
- Lightning Message Service only for cross-tree communication (e.g., checkout shipping method change) where parent-child events are insufficient. Always `unsubscribe(this._subscription)` in `disconnectedCallback` — an LMS subscription that is never torn down leaks memory and causes duplicate handling if the component reconnects. Keep payloads small (IDs, flags) and fetch full data separately.
- After an imperative DML call (save, update, delete) that changes data a `@wire` adapter returned, call `refreshApex(this._wiredResult)` to invalidate the cache and re-fetch — otherwise the UI shows stale data. (Retain the full wired result from the adapter, not just its `.data`.)
- Keep `.js-meta.xml` aligned with the component API: meaningful labels, descriptions, defaults, and targets for Experience Builder.

---

### 12. Performance

- Understand the LWC lifecycle: `constructor` → `connectedCallback` → `render` → `renderedCallback`. Wire adapters propagate with the lifecycle.
- **No DOM manipulation in `constructor`** — the shadow DOM is not ready. `this.template.querySelector()` returns nothing there; move DOM access to `connectedCallback` or `renderedCallback`.
- **`connectedCallback` can fire more than once** (the element is moved in the DOM). Guard one-time init with a flag: `if (this._initialized) return; this._initialized = true;`.
- No reactive mutations inside `renderedCallback` — they trigger rerender loops. For any one-time DOM operation there, gate it: `if (this._hasRendered) return; this._hasRendered = true;`.
- Debounce expensive handlers (search input, keystroke handlers).
- Lazy-load heavy work or large lists. Show only what is needed first, then expand through pagination or infinite scroll.
- For heavy or infrequently used modules, use dynamic import — `import('c/heavyLibrary').then(module => { ... })` — to keep them out of the initial bundle and defer loading until the feature is actually used.
- Never reach into another component's internal DOM from outside its shadow root (e.g., `element.querySelector('c-child').template.querySelector(...)`). Cross-shadow-DOM access is blocked under both Locker and LWS; communicate via public `@api` methods and events instead.
- For datatables approaching the 50,000-row SOQL transaction limit, consider `Database.Cursor` (documented per-day cursor limits apply). Otherwise use keyset pagination (`WHERE Id > :lastId ORDER BY Id LIMIT :pageSize`) — SOQL `OFFSET` caps at 2,000 rows.
- For large arrays with repeated lookups, use a JavaScript `Map` or `Set` for O(1) access. Build cost is O(n) + memory, so this only pays off at large N with repeated lookups against the same collection.

---

### 13. LWC Testing (Jest)

- Mock `@wire` adapters and Apex imports. Await DOM updates before asserting. Cover loading, data, and error states for every wire-driven component.
- **Test the component in a connected state.** Wire adapters only provision data when the component is in the DOM — `document.body.appendChild(element)` *before* emitting wire mocks, or assertions silently pass against `undefined`.
- **Clean up in `afterEach` with `document.body.removeChild(element)`.** A component instance shared across tests lets state from one test corrupt the next; each test gets a fresh instance.
- **Emit wire values via `@salesforce/wire-service-jest-util`**, not hand-rolled module mocks — the utility simulates the adapter lifecycle (data and error states) correctly.
- **Derive LDS mock JSON from a real UI API snapshot** (Workbench or developer console) for `getRecord`/related-list adapters. Hand-crafted mocks with the wrong shape cause silent failures. Store mock data under `__tests__/data/`.
- **`await flushPromises()` before asserting** after emitting a wire value — `Promise.resolve()` is insufficient to flush multi-tick async chains.
- Run via `npm run test:unit`.
- Treat LWC as running in Lightning Web Security and Experience Cloud/LWR — not plain browser JavaScript.

---

## Part 3 — Flows

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

**Flow-first vs Apex-first decision guide.** The choice is about automation density and record volume, not about whether you are an admin or a developer:

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

## Quick Reference

| Anti-pattern | Fix |
|---|---|
| SOQL in loop | Query once with `IN :ids`, map in memory |
| DML in loop | Collect into a `List`, one DML after the loop |
| Callout in loop | Aggregate inputs, one batched callout, distribute in memory |
| Repeated `Schema.describe` | Cache in a `private static Map` once per transaction |
| String `+=` in loop | Accumulate into `List<String>`, `String.join` after the loop |
| Single-record assumption | Process collections; assume 200 records |
| Nested loops | Build a `Map`, replace inner loop with O(1) lookup |
| Non-selective SOQL | Indexed `WHERE`, named fields, `LIMIT`, `WITH USER_MODE` |
| Logic in trigger body | Trigger routes only; logic in handler / service |
| Multiple triggers per object | One trigger per object |
| No recursion control | Static `Set<Id>` guard — not a bare boolean |
| Mixed automation on same object | One automation strategy per object |
| No CRUD/FLS | `WITH USER_MODE` + `AccessLevel.USER_MODE` |
| `WITH SECURITY_ENFORCED` | Deprecated — migrate to `WITH USER_MODE` |
| State-changing callout from LWC | Initiate from trigger / Platform Event, not GET-accessible `@AuraEnabled` (CSRF) |
| SOQL injection | Bind variables; allowlist dynamic names |
| Hardcoded secrets | Named Credentials / protected CMDT |
| Hardcoded IDs | `Schema.describe` or CMDT / Custom Label |
| Magic strings/numbers | `private static final` constants / CMDT |
| Deep nesting (>3 levels) | Guard clauses, named booleans, extract helpers |
| Swallowed exceptions | Catch specific, preserve cause, rethrow with context |
| `System.debug` in prod | Remove; use a logging framework |
| `@future` | Queueable + `System.Finalizer` |
| `@future` from `@future`/Batch | Hard runtime block — chain via Queueable / Platform Event |
| Callout from trigger context | Enqueue a `Database.AllowsCallouts` Queueable |
| Runaway async chain | Termination condition + `MaximumQueueableStackDepth` |
| Async for everything | Async only for callouts / volume / long-running |
| `SeeAllData=true` | `@TestSetup` + `TestDataFactory` |
| Coverage without assertions | Assert outcomes with `Assert` class |
| No bulk test | 201+ records for triggers and bulk-facing services |
| Golden Hammer | Smallest correct pattern: Selector / Domain / Service / Util |
| Mixed layers | One level of abstraction per method |
| LWC: wrong data source | LDS for CRUD, Apex for complex, GraphQL for graph-shaped |
| LWC: `for:each` index key | Use a stable id (`key={item.Id}`), never the loop index |
| LWC: `if:true`/`if:false` | Deprecated — use `lwc:if` / `lwc:elseif` / `lwc:else` |
| LWC: mutating wire data | Shallow-copy first (`{ ...data }`); wire data is frozen |
| LWC: renderedCallback mutation | Move reactive work out of `renderedCallback` |
| LWC: no error branch | Handle both `data` and `error` on every wire / promise |
| LWC: stale UI after DML | `refreshApex` the wired result; `unsubscribe` LMS in `disconnectedCallback` |
| LWC test: wire never emits | Append to `document.body` first; `await flushPromises()` |
| Flow: no fault connector | Fault connector on every faulting element; log `{!$Flow.FaultMessage}` |
| Flow: DML in loop | Collect in loop via Assignment, DML outside the loop |
| Flow: hardcoded IDs | Get Records by DeveloperName or Custom Metadata resource |
| Flow: recursion | `ISCHANGED()` entry condition or Apex invocable guard |
| Flow: complex branching | Extract logic to `@InvocableMethod` Apex action |
| Flow: mixed automation | One automation strategy per object; document division |
| Flow: stale versions | Deactivate and delete obsolete versions after deployment |
