---
name: salesforce-apex-quality
description: Use when reviewing or auditing Apex code after generation, or when the task is explicitly a code review. Covers governor limits, trigger design, security, architecture, async patterns, error handling, and test quality. If the Apex includes @AuraEnabled methods, also load salesforce-lwc-quality. For writing or refactoring Apex, use generating-apex or generating-apex-test instead.
---

# Salesforce Apex Quality

Invoke after generating any `.cls` or `.trigger` file and when reviewing Apex. These are the patterns that compile and pass a single-record test but fail at scale, under a non-admin profile, or after deployment. When in doubt, prefer the GOOD form even for "just a quick" request.

**Cross-domain:** If this class exposes `@AuraEnabled` methods (§5), also load `salesforce-lwc-quality`. This skill covers the Apex side of that contract; `salesforce-lwc-quality` covers the LWC side.

This skill complements `generating-apex` and `generating-apex-test` (which cover how to produce an artifact) by specifying the quality bar those artifacts must meet.

---

### 1. Data Access and Governor Limits

**1.1 SOQL inside a loop**

*Why it fails:* Each iteration issues a query. At 200 records per trigger batch you cross the 100-query limit (`System.LimitException: Too many SOQL queries: 101`).

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

*Why it fails:* Data Loader, Flows, and integrations push in bulk. Processing only `accounts[0]` silently drops the rest.

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

*Why it fails:* Queries without an indexed `WHERE`, without a `LIMIT`, or over-fetching fields degrade as data grows.

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

*Why it fails:* Each callout counts against the 100-callout-per-transaction limit. 200 records means 200 sequential round trips, then `System.LimitException: Too many callouts: 101`.

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

*Fix:* Aggregate all inputs before the loop, make one batched callout, distribute the response back to records in memory. If the external API has no batch endpoint, move the work to a Queueable/Batch chunked within the callout limit. Callouts cannot be made synchronously from a trigger context — see §6.

---

**1.7 Repeated `Schema.describe` calls (performance)**

*Why it fails:* `Schema.getGlobalDescribe()` rebuilds the full metadata map on every call. Invoked inside a loop it causes `Apex CPU time limit exceeded`.

```apex
// BAD
for (String name : objectNames) {
    Schema.SObjectType t = Schema.getGlobalDescribe().get(name);
}
```

```apex
// GOOD — cache once per transaction
private static Map<String, Schema.SObjectType> describeCache;
private static Map<String, Schema.SObjectType> globalDescribe() {
    if (describeCache == null) { describeCache = Schema.getGlobalDescribe(); }
    return describeCache;
}
```

*Fix:* Cache describe results in a `private static Map` initialized once per transaction.

---

**1.8 String concatenation with `+=` in a loop (heap)**

*Why it fails:* Apex strings are immutable, so each `+=` allocates a new heap object — O(n²) heap growth, path to `Apex heap size too large`.

```apex
// BAD
String out = '';
for (String s : items) { out += s; }
```

```apex
// GOOD
List<String> parts = new List<String>();
for (String s : items) { parts.add(s); }
String out = String.join(parts, ',');
```

*Fix:* Accumulate values into a `List<String>` and call `String.join(list, separator)` after the loop.

---

### 2. Trigger Design

**2.1 Business logic in the trigger body**

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
- **`WITH SECURITY_ENFORCED` is deprecated — do not write it in new code; migrate it when you see it.** Replace with `WITH USER_MODE`. `WITH SECURITY_ENFORCED` throws on the *first* inaccessible field and aborts the whole query; `WITH USER_MODE` silently drops inaccessible fields and continues and also honors restriction and scoping rules.
- **Legacy fallback (pre-API-56):** `Security.stripInaccessible(AccessType.READABLE, records)` before returning data, and `AccessType.CREATABLE` / `UPDATABLE` before DML. Document as a legacy path; prefer `USER_MODE` on API 56+.
- **`ApexCRUDViolation` is the #1 AppExchange security-review failure.** Pair with `running-code-analyzer`: elevate `ApexCRUDViolation` to Severity 1 in `code-analyzer.yml` and fail CI/CD on it.
- **Page layout is not FLS.** Layout controls display; FLS controls access. Always enforce FLS in Apex regardless of how the field is surfaced. Assign FLS via permission sets, not profiles.
- **`without sharing` must never sit on a general-purpose service.** Isolate it to a narrow, purpose-built helper gated behind a Custom Permission check.
- **`inherited sharing` is unsafe without mapping the full call chain.** Prefer `with sharing` when in doubt. (As an `@AuraEnabled` entry point with no parent context, it defaults to `with sharing`.)

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

*Fix:* Bind all user input with `:variable`. When the input is a field or operator name that cannot be bound, validate against an allowlist or `Schema.describe`. `String.escapeSingleQuotes()` is a secondary measure only — it escapes quote characters in string literals but does nothing for injection into the query's structure. Structural elements must be validated against a `Set<String>` allowlist or `Schema.describe`, never escaped.

Also: validate all IDs and string inputs from LWCs or page state before use. An LWC wire parameter is user-controlled input — treat every `@AuraEnabled` parameter as untrusted.

---

**3.3 Hardcoded secrets and IDs**

*Why it fails:* Secrets in source are visible to anyone with read access. Hardcoded Record Type / Profile IDs differ between sandbox and production and silently break post-deployment.

```apex
// BAD
String apiKey = 'sk-live-abc123';
if (acc.RecordTypeId == '012500000009ABcAAM') { /* ... */ }
```

```apex
// GOOD
Id businessRtId = Schema.SObjectType.Account
    .getRecordTypeInfosByDeveloperName().get('Business_Account').getRecordTypeId();
if (acc.RecordTypeId == businessRtId) { /* ... */ }
```

*Fix:* Named Credentials or protected Custom Metadata for secrets. `Schema.describe`, Custom Metadata, or Custom Labels for configurable IDs and values. Never expose PII or internal error detail in debug logs, error messages, or API responses.

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
- Choose the smallest correct pattern: SOQL in a Selector, SObject behavior in a Domain, orchestration in a Service, pure helpers in a Utility.
- Design sharing deliberately. Default `with sharing`; treat `without sharing` as an architectural decision, not a quick fix.
- In Selector field lists, prefer compile-time field references (`Schema.Account.Name` or a `Schema.SObjectField` constant) over string literals — field deletion is then caught at deploy time instead of failing at runtime.
- Static analysis is part of the quality gate. Pair with `running-code-analyzer`: `ApexCRUDViolation`, `ApexSharingViolations`, `ExcessiveClassLength`, `ExcessivePublicCount`, and `ExcessiveNestedBlockDepth` should be in the enforced rule set.

---

### 5. @AuraEnabled and ConnectApi

> **Cross-domain boundary.** This section defines the Apex side of the Apex→LWC contract. If you are also building the LWC component that calls these methods, load `salesforce-lwc-quality` for the component-side rules.

- Narrow inputs and outputs. Use typed wrapper classes — not raw JSON strings — for structured LWC responses.
- `cacheable=true` only when the method performs no DML, callouts, cart/checkout mutations, or session-specific side effects.
- Catch exceptions and rethrow as `AuraHandledException` with a user-friendly, sanitized message. Never expose internal detail.
- Isolate `ConnectApi` calls behind a wrapper/service to keep controllers thin and give tests a stable seam.
- **Do not let an LWC directly trigger a state-changing external callout through an `@AuraEnabled` method (CSRF risk).** State-changing external operations must originate from a verified internal event — a DML trigger, a Platform Event consumer, or a Flow — not a GET-accessible Apex entry point.
- Enforce CRUD/FLS (`WITH USER_MODE`) on every `@AuraEnabled` method, and keep the enclosing class `with sharing`. On Experience Cloud, never return PII or account data to a guest context.

---

### 6. Async

**6.1 Reaching for @future**

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

**6.2 Async for everything**

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

**6.3 Runaway async chains (no termination condition)**

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

*Fix:* Catch the specific exception type (never generic `Exception` first). Preserve the cause chain with the `(message, cause)` constructor. In `@AuraEnabled` methods, rethrow as `AuraHandledException` with a sanitized message.

---

**7.2 Null and collection safety**

- Guard clauses for null or empty inputs at the top of public methods.
- Return empty collections instead of `null`.
- Use `String.isBlank()`, safe navigation (`?.`), and null coalescing (`??`).
- Never dereference `map.get(key)` inline unless presence is guaranteed.

---

### 8. Maintainability

**8.1 Magic strings and numbers**

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

*Why it fails:* `System.debug` evaluates its arguments even when no debug log is active, consuming CPU. Can leak sensitive data into logs.

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

*Why it fails:* Beyond ~3 levels of nesting, readability and branch coverage collapse. PMD rule: `ExcessiveNestedBlockDepth`.

```apex
// BAD — arrow code
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
- One behavior per test method. Separate positive, negative, and bulk scenarios into distinct methods.
- Always test negative and exception paths. For expected exceptions: `try/catch`, `Assert.fail` after the call, assert on the caught type and message.
- Bulk test with 201+ records to cross the 200-record trigger batch boundary. For Batch Apex set batch size ≥ record count so the full scope runs.
- For trigger handlers, test through real DML against the owning trigger; keep shared service-only behavior in the service test class.
- Wrap the code under test in `Test.startTest()` / `Test.stopTest()` to reset governor limits and flush async work.
- Delegate all record creation to a `TestDataFactory` inside `@TestSetup`. `SeeAllData=false` — no org data dependency, no hardcoded IDs.
- Assert exact expected values derived from test setup. Include a failure message on every assertion.
- Mock external boundaries: `HttpCalloutMock` for callouts (set before `Test.startTest()`), `Test.setFixedSearchResults` for SOSL.
- Verify sharing-sensitive entry points. For any class with `inherited sharing` or `without sharing`, add a `System.runAs` test as a restricted user that asserts records are filtered (or deliberately exposed) as intended.
- Make Custom Metadata-driven logic testable without org dependence. Inject in-memory `__mdt` instances via a `@TestVisible` setter or constructor so the assertion is deterministic.
- Coverage: 75% minimum to deploy; 90% working target; 100% on business-critical paths. Coverage is a floor, not the goal — assertions are what matter.

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

## Quick Reference — Apex

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
