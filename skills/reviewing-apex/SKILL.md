---
name: reviewing-apex
description: "Use when reviewing or auditing Apex code — a review pass over existing or freshly built Apex, run as a discrete step at the end of a build or on demand, not chained onto every edit. Covers governor limits, trigger design, security, architecture, async patterns, error handling, and test quality. Detailed rules live in references/ — read the file(s) matching the artifact's domains. If the Apex includes @AuraEnabled methods, also load reviewing-lwc. TRIGGER when: the task is to review or audit Apex (classes, triggers, services, or test classes), or to review a completed build before deploy. DO NOT TRIGGER as the authoring skill, and do not auto-fire after each generated file — authoring happens directly (base model + TDD); this skill is the quality gate afterward."
---

# Salesforce Apex Quality

Invoke when reviewing or auditing Apex — as the end-of-build quality pass or on demand. These are the patterns that compile and pass a single-record test but fail at scale, under a non-admin profile, or after deployment. When in doubt, prefer the strict form even for "just a quick" request.

**Cross-domain:** `@AuraEnabled` methods pair with `reviewing-lwc`, `@InvocableMethod` actions with `reviewing-flow` — see Cross-Skill Integration below.

Authoring is done directly by the base model; this skill specifies the quality bar every Apex artifact must meet, no matter who or what wrote it.

**Schema truth:** flag any guessed object, field, or relationship API name. Verify names against local metadata (`force-app/**`) first, then the org — the org wins on divergence. Use read-only sf CLI commands (`sf sobject describe`, `sf data query`) to confirm; never rely on Developer Console snippets.

## Quick Reference (always apply)

Scan every artifact against this checklist.

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
| Huge query into one `List` | SOQL `for` loop streams 200-record chunks within heap |
| Logic in trigger body | Trigger routes only; logic in handler / service |
| Multiple triggers per object | One trigger per object |
| Same-record field update in `after` | Set fields on `Trigger.new` in `before` — no DML |
| Throwing to block a save | `record.addError()` — per-record, bulk-safe |
| No recursion control | Static `Set<Id>` guard — not a bare boolean |
| Mixed automation on same object | One automation strategy per object |
| No CRUD/FLS | `WITH USER_MODE` + `AccessLevel.USER_MODE` (the default at API v67+; check the class API version) |
| `WITH SECURITY_ENFORCED` | Removed at API v67+ — migrate to `WITH USER_MODE` |
| `WITH USER_MODE` traversing a parent the persona can't read | Grant object Read on every traversed object — else `No such column` |
| `SYSTEM_MODE` write inside a `with sharing` class | Sharing still applies — private `without sharing` writer, outer class stays `with sharing` |
| `UserRecordAccess ... RecordId IN` / `OwnerId == UserInfo.getUserId()` | `UserRecordAccess.HasEditAccess` on the row query — no 200-id cap, honours sharing (not restriction rules) |
| Removing or renaming a shipped `@AuraEnabled` method | Keep it for a release — open tabs still call the old name |
| Callout after uncommitted DML | Callout first, or move the DML to another transaction |
| `bulk` / `from` as identifiers | Reserved words — the compile error points at a different token |
| Untyped `Object` / `Map<String,Object>` / `List<Object>` as an `@AuraEnabled` **inbound** param or wrapper field | Concrete types (`Map<String,String>`, typed DTO) — JS→Apex JSON can't deserialize `Object` (arg arrives `null`); assemble rich shapes server-side |
| Raw `SObject` returned from `@AuraEnabled` in a namespaced package | Typed DTO with unprefixed props — packaged custom fields serialize as `ns__Foo__c`, so the LWC reads `undefined` silently |
| New entry-point class absent from any permission set's `classAccesses` | Ship the grant as metadata in the same changeset — works for the admin, inert for every other persona; no gate catches it |
| Elevating `@InvocableMethod` guarded only by the calling Flow | Guard inside the Apex — invocables are reachable from any Flow and the Actions REST API |
| Setup-object DML mixed with regular DML | `MIXED_DML_OPERATION` at runtime — split the transaction (`System.runAs` in tests, Queueable in prod) |
| `global` on a member that is not subscriber-facing API | `public` — packaged `global` can never be renamed, narrowed, or removed |
| State-changing callout from LWC | Initiate from trigger / Platform Event, not a direct `@AuraEnabled` call |
| State-changing `@HttpGet` / page-load action | CSRF — GET handlers stay read-only; mutate via POST |
| SOQL injection | Bind variables / `Database.queryWithBinds`; allowlist dynamic names |
| Unescaped SOSL `FIND` term | Backslash-escape the SOSL reserved characters (listed in `references/security.md`); try/catch the call |
| External text into a capped `Text(n)` field | `truncate()` to a `*_MAX` constant matching `<length>` in field-meta.xml — `STRING_TOO_LONG` rolls back the whole save |
| Sync Apex reading `ContentVersion.VersionData` | Peak heap ≈ 2.33× file size vs 6 MB sync — check `ContentSize` first and cap |
| Hardcoded secrets | Named Credentials / protected CMDT |
| Hardcoded IDs | `Schema.describe` or CMDT / Custom Label |
| Magic strings/numbers | `private static final` constants / CMDT |
| Deep nesting (>3 levels) | Guard clauses, named booleans, extract helpers |
| Swallowed exceptions | Catch specific, preserve cause, rethrow with context |
| Multi-step DML, no rollback | `Database.setSavepoint()` / `rollback` in the `catch` |
| `System.debug` in prod | Remove; use a logging framework |
| `@future` | Queueable + `System.Finalizer` |
| `@future` from `@future`/Batch | Hard runtime block — chain via Queueable / Platform Event |
| Callout from trigger context | Enqueue a `Database.AllowsCallouts` Queueable |
| Runaway async chain | Termination condition + `MaximumQueueableStackDepth` |
| Duplicate async jobs | `QueueableDuplicateSignature` on `AsyncOptions` |
| Batch errors vanish | `Database.RaisesPlatformEvents` + `BatchApexErrorEvent` subscriber |
| Async for everything | Async only for callouts / volume / long-running |
| Sync path that may exceed 5s | Keep sync work <5s (10–50 concurrent-long-running cap, by license count); offload slow work to async |
| Publish/email per record | Aggregate — PE = 150 per transaction + hourly allocation, email = 5,000/day org cap |
| `SeeAllData=true` | `@TestSetup` + `TestDataFactory` |
| Coverage without assertions | Assert outcomes with `Assert` class |
| No bulk test | 201+ records for triggers and bulk-facing services |
| Test that passes with its code deleted | Revert the code once to watch it fail; delete the test if it stays green |
| Permission logic tested only as admin | `runAs` a Minimum Access user with just the permission set under test |
| Hand-rolled test doubles / `Test.isRunningTest()` | `System.StubProvider` + `Test.createStub()` |
| Golden Hammer | Smallest correct pattern: Selector / Domain / Service / Util |
| Mixed layers | One level of abstraction per method |

## Detailed Rules (read the file matching the artifact)

Load a reference file when either applies:
- the artifact **contains** that domain (a `.trigger` file → trigger-design; `@AuraEnabled` → aura-enabled; Queueable/Batch/Schedulable/`@future` → async; a test class → testing), or
- the Quick Reference scan **flags a suspected violation** and you need the detailed *why it fails* / *fix* to confirm and explain it.

| Artifact contains / suspicion | Read |
|---|---|
| SOQL, DML, callouts, loops, collections, query selectivity, describe calls | `references/data-access.md` |
| Trigger files, trigger handlers, recursion, mixed automation | `references/trigger-design.md` |
| CRUD/FLS, sharing keywords, dynamic SOQL, secrets, hardcoded IDs | `references/security.md` |
| Class layering (Service/Selector/Domain), naming, class/method size | `references/architecture.md` |
| `@AuraEnabled` or `ConnectApi` (also load `reviewing-lwc`) | `references/aura-enabled.md` |
| Queueable, Batch, Schedulable, `@future`, callouts from trigger context, concurrent-load / capacity review | `references/async.md` |
| try/catch, null safety, magic strings/numbers, debug logging, deep nesting | `references/error-handling-maintainability.md` |
| Test classes (`*Test.cls` / `*_Test.cls`) | `references/testing.md` |
| B2B Commerce storefront — ConnectApi, CartExtension calculators, cacheable storefront reads, Commerce-object SOQL, buyer/entitlement test data | `references/commerce-b2b.md` | <!-- domain:commerce -->

A class usually spans several domains — read every file that applies before delivering the review.

## Cross-Skill Integration

This skill owns the Apex side of a review. Delegate the rest:

| Need | Delegate to |
|---|---|
| Class exposes `@AuraEnabled` methods to a component | `reviewing-lwc` — load alongside; this skill reviews the Apex contract, `reviewing-lwc` reviews the consumer |
| Class exposes an `@InvocableMethod` action called by a Flow | `reviewing-flow` — load alongside to review the Flow that calls this action |
| Static analysis (PMD, SFGE) over the reviewed code | Code Analyzer CLI — `sf code-analyzer run --target <files>` |
