---
description: "Salesforce Apex coding standards, test rules, and class structure"
applyTo: "**/*.cls,**/*.trigger,**/*.apex"
---

# Salesforce Apex Coding Rules

## Project Conventions

This file uses placeholders for anything that is project-specific. Map each one to the active repository before applying a rule.

- `<Prefix>_` stands for the project or namespace prefix used on Apex classes and metadata (for example, a short org or package prefix).
- "Project utility class", "project selector", "project test factory", and "project setting metadata" mean whatever equivalents already exist in the repo.
- Before introducing any new class, helper, naming style, or abstraction, inspect the existing repository first and follow its established patterns. Discover the real names from the codebase rather than inventing them.

## File Parsing Behavior

- When parsing files, ad hoc shell string manipulation is the last priority. Always check first: (1) whether there is an API within the chosen model that can parse it, then (2) whether a skill or plugin can handle the parsing.

## Baseline Behavior

- Before starting development or deployment, retrieve the latest stable Salesforce documentation from an up-to-date source (for example, a documentation MCP such as Context7, if available) when the behavior, API, CLI command, metadata format, limits, or best practice could have changed.
- Treat Apex as Apex, not Java. Do not assume Java libraries, Java collection behavior, or Java language features exist in Apex.
- Prefer the patterns already present in the current repository before introducing a new framework, helper, naming style, or abstraction.
- Never deploy to any Salesforce org without explicit user approval, unless the user clearly instructs you to deploy. You can validate deployments anytime to support test driven development.
- If the user says, `Generate package.xml using sf git delta from {commit hash}`, run:
  `sf sgd source delta --from "{commit hash}" --output-dir "manifest" -a {api version}`
- If the user says, `Do a validate deploy to {target org} using {package xml path}`, run:
  `sf project deploy validate -o {target org} --verbose -x {package xml path} -l RunLocalTests`

## Apex Tests

- Prefer `Assert.areEqual`, `Assert.areNotEqual`, `Assert.isTrue`, `Assert.isFalse`, `Assert.isNull`, `Assert.isNotNull`, and `Assert.fail` over legacy `System.assert`, `System.assertEquals`, and `System.assertNotEquals` calls. (Retrieve the complete current list from up-to-date docs.)
- Prefer one Apex test class per in-scope production Apex class or automation entry point.
- One behavior per test method. Keep positive, negative, and bulk scenarios in separate methods, and do not combine distinct inputs such as null and empty in a single method.
- Always test negative and exception paths, not just the happy path. For expected exceptions, use a `try/catch` with `Assert.fail` after the call and assert on the caught type and message.
- Bulk test with 251 or more records to cross the 200-record trigger batch boundary. For Batch Apex, only one `execute()` runs in test context, so set the batch size at or above the record count when you need the full scope processed.
- For trigger handlers, test through real DML against the owning trigger and handler, and keep shared service-only behavior in the service test class.
- Wrap the code under test in `Test.startTest()` and `Test.stopTest()` to reset governor limits and force async work (Queueable, Batch, Scheduled) to run.
- Delegate all record creation in `@TestSetup` to a `TestDataFactory`. Do not build record lists inline. Never rely on org data (`SeeAllData=false`) and never hardcode IDs. Shared `@IsTest` test-data helpers are acceptable when they reduce setup duplication across focused test classes.
- Assert exact expected values derived from the test setup, with a failure message on every assertion. Do not use range or approximate-count assertions when the value is deterministic.
- Mock external boundaries. Use `HttpCalloutMock` for callouts (set before `Test.startTest()`), `Test.setFixedSearchResults` for SOSL, and constructor injection or DML mocks for database isolation.
- Coverage targets: 75 percent minimum to deploy, 90 percent or higher as the working target, and 100 percent on business-critical paths. Coverage is a floor, not the goal; the assertions are what matter.
- Avoid the common anti-patterns: SOQL or DML inside test loops, magic numbers in assertions, god test classes past roughly 500 lines, overlong test methods, and catching generic `Exception` instead of the specific expected type.

## Apex Rules

**Layering and structure**

- Follow Service-Selector-Domain layering and keep each layer to a single level of abstraction. Do not let responsibilities bleed across boundaries:
  - Trigger: event routing only. No business logic or orchestration.
  - Handler/Service: flow control and coordination. No inline SOQL, DML, HTTP, or parsing.
  - Domain: business rules, validation, and field derivation on in-memory records. No queries, callouts, or persistence.
  - Selector: all SOQL. One selector per SObject or query domain, using a shared field-list constant instead of inline duplication.
  - Data/Integration: SOQL, DML, and HTTP. No business decisions.
- Single responsibility per class. Split classes that grow past roughly 500 lines, and extract private helpers for methods past roughly 40 lines.
- Return early: validate preconditions at the top of a method and return or throw immediately.
- Use dependency injection through constructor or method parameters so logic is testable without org state.
- Add ApexDoc on the class header and on every `public` or `global` method.

**Sharing and security**

- Declare a sharing keyword on every class. Use `with sharing` or `inherited sharing` by default. Use `without sharing` only when a system-level requirement needs it: document the reason, isolate it in a dedicated helper called from a `with sharing` entry point, and gate it behind a Custom Permission check.
- Enforce CRUD and FLS with `WITH USER_MODE` in SOQL and `AccessLevel.USER_MODE` for `Database` DML rather than manual describe checks, unless the project standard differs.
- Validate all IDs and string inputs from LWCs or page state before use. Check object type when an ID can come from builder configuration. Validate dynamic field and operator names against an allowlist or `Schema.describe`.
- Use bind variables for all dynamic SOQL that includes user input to prevent injection.
- Use Named Credentials or supported Salesforce auth patterns for external callouts. Avoid manually assembling session-authenticated REST calls unless the existing project pattern requires it and tests cover the request.
- Never hardcode secrets, session IDs, or Record IDs. Source configurable values from Custom Metadata, Custom Labels, or describe calls. Never expose PII or internal error detail in debug logs, error messages, or API responses.

**@AuraEnabled and ConnectApi**

- `@AuraEnabled` methods must have narrow inputs and outputs. Prefer typed wrapper classes over raw JSON strings when returning structured data to LWC.
- Mark read-only `@AuraEnabled` methods as `cacheable=true` only when they do not perform DML, callouts, cart mutation, checkout mutation, or user/session-specific side effects.
- Catch exceptions in `@AuraEnabled` methods and rethrow as `AuraHandledException` with a user-friendly message, never internal detail.
- When using `ConnectApi` from Apex, isolate calls behind a small wrapper/service when possible. This keeps LWC controllers thin and gives tests a stable place to provide deterministic behavior when ConnectApi cannot run in data-siloed tests.

**Bulkification and queries**

- Bulkify Apex even when initially called from a single LWC. Keep SOQL, DML, and callouts out of loops.
- Use `Map<Id, SObject>` for ID lookups, `Map<Id, List<SObject>>` built in a single loop for parent-child grouping, `Set<Id>` for deduplication and membership checks, relationship subqueries to fetch parent and child together, and `AggregateResult` with `GROUP BY` for rollups instead of counting in Apex.
- DML only the records that actually changed; compare against `Trigger.oldMap` or prior state first. Prefer partial-success DML such as `Database.update(records, false)` in bulk flows and process `SaveResult` for errors.
- Query selectively against indexed fields, specify exact fields explicitly, and bound result sets with `LIMIT` and `ORDER BY`.
- For Custom Metadata Types (`__mdt`), use the built-in methods such as `getAll().values()` and `getInstance()` rather than SOQL.

**Async**

- Default to Queueable for async work, since it carries a job ID, supports chaining and non-primitive inputs, and can pair with `System.Finalizer` for cleanup. Use Batch Apex for very large datasets, Scheduled Flow or Schedulable for recurring schedules, and Continuation for long-running callouts.
- Never use `@future` in new code. It cannot chain, cannot be called from Batch, and cannot accept non-primitive types. Replace it with Queueable plus `System.Finalizer`.
- Add chain-depth guards on chained Queueables to prevent runaway chains.

**Error handling and null safety**

- Catch specific exceptions before any generic `Exception`, include context in the message, and preserve cause chains with `new CustomException('message', cause)` instead of flattening to concatenated strings.
- Wrap only code that can actually throw, such as DML, callouts, parsing, and casts. Do not defensively wrap simple assignments or arithmetic.
- Add guard clauses for null or empty inputs at the top of public methods. Return empty collections instead of `null`. Use `String.isBlank()`, safe navigation (`?.`), and null coalescing (`??`), and never dereference `map.get(key)` inline unless presence is guaranteed.

**Constants, naming, and logging**

- Prefer enums over string constants and extract repeated literals into `private static final` constants. Use Custom Labels for user-facing strings and Custom Metadata for configurable thresholds, mappings, and feature flags.
- Follow consistent naming: `{SObject}Service`, `{SObject}Selector`, `{SObject}Domain`, `{Descriptive}Batch`, `{Descriptive}Queueable`, `{Descriptive}Schedulable`, `{Descriptive}Util`, `I{Descriptive}` for interfaces, and `{Descriptive}Exception`. Methods start with a verb; maps read as `{value}By{key}` and lists as plural nouns.
- Avoid `System.debug()` in main code paths, since it evaluates and consumes CPU even when logging is off. Use a logging framework when runtime logging is required.

**Callout testing**

- Use `HttpCalloutMock` for callouts. Do not use `SeeAllData=true` unless the user explicitly approves and there is no viable alternative.
- For callout wrappers, assert endpoint shape, method, required headers, response handling, and error behavior in tests.
