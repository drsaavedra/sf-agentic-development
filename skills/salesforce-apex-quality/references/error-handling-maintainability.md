# Error Handling, Null Safety, and Maintainability

> Part of `salesforce-apex-quality` — see SKILL.md for the always-on Quick Reference and routing.

## Swallowed exceptions

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

## Null and collection safety

- Guard clauses for null or empty inputs at the top of public methods.
- Return empty collections instead of `null`.
- Use `String.isBlank()`, safe navigation (`?.`), and null coalescing (`??`).
- Never dereference `map.get(key)` inline unless presence is guaranteed.

---

## Magic strings and numbers

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

## System.debug in production code paths

*Why it fails:* `System.debug` evaluates its arguments even when no debug log is active, consuming CPU. Can leak sensitive data into logs.

*Fix:* Remove from main code paths. Use a logging framework (custom object or platform event) for production observability. Never log PII.

---

## Deep nesting and excessive cyclomatic complexity

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
