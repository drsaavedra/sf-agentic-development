# Error Handling, Null Safety, and Maintainability

> Part of `reviewing-apex` — see SKILL.md for the always-on Quick Reference and routing.

## Error handling

- **Swallowed exceptions** — an empty or log-only `catch` hides failures: the transaction appears to succeed while data is left half-written. Catch the specific exception type (`DmlException`, never generic `Exception` first), preserve the cause chain with the `(message, cause)` custom-exception constructor, and rethrow with context (e.g., `throw new AccountServiceException('Failed to update accounts: ' + e.getMessage(), e)`). In `@AuraEnabled` methods, rethrow as `AuraHandledException` with a sanitized message.
- **Multi-step DML without a rollback strategy** — when a later step fails, earlier DML persists and leaves partial state. Wrap multi-step writes in `Database.setSavepoint()` / `Database.rollback(sp)` inside the `catch`. Constraints: a callout after a savepoint (with pending uncommitted work) throws `CalloutException`, and rollback does not reset governor-limit consumption.

## Null and collection safety

- Guard clauses for null or empty inputs at the top of public methods.
- Return empty collections instead of `null`.
- Use `String.isBlank()`, safe navigation (`?.`), and null coalescing (`??`).
- Never dereference `map.get(key)` inline unless presence is guaranteed.

## Maintainability

- **Magic strings and numbers** — inline literals (`'Closed Won'`, `50000`) duplicate silently and drift. Use `private static final` constants or a constants class; Enums over string constants where possible; Custom Labels for user-facing text; Custom Metadata for thresholds, mappings, and feature flags admins may change without a deployment.
- **`System.debug` in production code paths** — evaluates its arguments even when no debug log is active, consuming CPU, and can leak sensitive data into logs. Remove from main code paths; use a logging framework (custom object or platform event) for production observability. Never log PII.
- **Deep nesting and excessive cyclomatic complexity** — beyond ~3 levels of nesting ("arrow code"), readability and branch coverage collapse (PMD: `ExcessiveNestedBlockDepth`). Flatten with guard clauses (early `return`/`continue`), hoist complex conditions into well-named `Boolean` variables, and extract deeply nested blocks into named helper methods.
