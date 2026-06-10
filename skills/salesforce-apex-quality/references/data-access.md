# Data Access and Governor Limits

> Part of `salesforce-apex-quality` — see SKILL.md for the always-on Quick Reference and routing.

## SOQL inside a loop

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

## DML inside a loop

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

## Single-record assumption

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

## Nested loops instead of a map join

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

## Non-selective SOQL

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

## Callout inside a loop

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

*Fix:* Aggregate all inputs before the loop, make one batched callout, distribute the response back to records in memory. If the external API has no batch endpoint, move the work to a Queueable/Batch chunked within the callout limit. Callouts cannot be made synchronously from a trigger context — see `references/async.md`.

---

## Repeated `Schema.describe` calls (performance)

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

## String concatenation with `+=` in a loop (heap)

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
