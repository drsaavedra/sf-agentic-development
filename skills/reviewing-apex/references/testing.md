# Testing

> Part of `reviewing-apex` — see SKILL.md for the always-on Quick Reference and routing.

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
- Mock class dependencies with the official Stub API — `System.StubProvider` + `Test.createStub()` — behind the dependency-injection seams, instead of hand-rolled fake subclasses or `Test.isRunningTest()` branches in production code.
- Verify sharing-sensitive entry points. For any class with `inherited sharing` or `without sharing`, add a `System.runAs` test as a restricted user that asserts records are filtered (or deliberately exposed) as intended.
- Make Custom Metadata-driven logic testable without org dependence. Inject in-memory `__mdt` instances via a `@TestVisible` setter or constructor so the assertion is deterministic.
- Coverage: 75% minimum to deploy; 90% working target; 100% on business-critical paths. Coverage is a floor, not the goal — assertions are what matter.

**Test anti-patterns to reject:** a test that runs the method but verifies nothing (coverage without assertions — every test must assert the actual outcome, e.g., `Assert.areEqual('Warm', acc.Rating, 'Rating should default to Warm')` after `Test.stopTest()`), SOQL or DML inside test loops, magic numbers in assertions, god test classes past ~500 lines, overlong test methods, catching generic `Exception` instead of the specific expected type.
