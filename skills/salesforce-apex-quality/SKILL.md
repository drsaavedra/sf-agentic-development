---
name: salesforce-apex-quality
description: "Use when reviewing or auditing Apex code after generation, or when the task is explicitly a code review. Covers governor limits, trigger design, security, architecture, async patterns, error handling, and test quality. Detailed rules live in references/ — read the file(s) matching the artifact's domains. If the Apex includes @AuraEnabled methods, also load salesforce-lwc-quality. For writing or refactoring Apex, use generating-apex or generating-apex-test instead."
---

# Salesforce Apex Quality

Invoke after generating any `.cls` or `.trigger` file and when reviewing Apex. These are the patterns that compile and pass a single-record test but fail at scale, under a non-admin profile, or after deployment. When in doubt, prefer the strict form even for "just a quick" request.

**Cross-domain:** If this class exposes `@AuraEnabled` methods (`references/aura-enabled.md`), also load `salesforce-lwc-quality`. This skill covers the Apex side of that contract; `salesforce-lwc-quality` covers the LWC side.

This skill complements `generating-apex` and `generating-apex-test` (which cover how to produce an artifact) by specifying the quality bar those artifacts must meet.

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
| `WITH SECURITY_ENFORCED` | Removed at API v67 — migrate to `WITH USER_MODE` |
| State-changing callout from LWC | Initiate from trigger / Platform Event, not a direct `@AuraEnabled` call |
| State-changing `@HttpGet` / page-load action | CSRF — GET handlers stay read-only; mutate via POST |
| SOQL injection | Bind variables / `Database.queryWithBinds`; allowlist dynamic names |
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
| `SeeAllData=true` | `@TestSetup` + `TestDataFactory` |
| Coverage without assertions | Assert outcomes with `Assert` class |
| No bulk test | 201+ records for triggers and bulk-facing services |
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
| `@AuraEnabled` or `ConnectApi` (also load `salesforce-lwc-quality`) | `references/aura-enabled.md` |
| Queueable, Batch, Schedulable, `@future`, callouts from trigger context | `references/async.md` |
| try/catch, null safety, magic strings/numbers, debug logging, deep nesting | `references/error-handling-maintainability.md` |
| Test classes (`*Test.cls` / `*_Test.cls`) | `references/testing.md` |

A class usually spans several domains — read every file that applies before delivering the review.
