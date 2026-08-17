# Error Handling, Null Safety, and Maintainability

> Part of `reviewing-apex` — see SKILL.md for the always-on Quick Reference and routing.

## Error handling

- **Swallowed exceptions** — an empty or log-only `catch` hides failures: the transaction appears to succeed while data is left half-written. Catch the specific exception type (`DmlException`, never generic `Exception` first), preserve the cause chain with the `(message, cause)` custom-exception constructor, and rethrow with context (e.g., `throw new AccountServiceException('Failed to update accounts: ' + e.getMessage(), e)`). In `@AuraEnabled` methods, rethrow as `AuraHandledException` with a sanitized message.
- **Multi-step DML without a rollback strategy** — when a later step fails, earlier DML persists and leaves partial state. Wrap multi-step writes in `Database.setSavepoint()` / `Database.rollback(sp)` inside the `catch`. Constraints: a callout after a savepoint (with pending uncommitted work) throws `CalloutException`, and rollback does not reset governor-limit consumption.

- **Externally-sourced text written into a length-capped field** — any write of text with unbounded provenance (AI/gateway extraction, callout response, parsed document, client DTO, rich-text value) into a `Text(n)` or `LongTextArea(n)` field. `STRING_TOO_LONG` is thrown at DML time; inside a savepoint-wrapped multi-record save it rolls the entire graph back and surfaces as a generic sanitized message that may name a field with no UI control, leaving the user unable to see or fix what failed. Route every free-text field on a save path through one `truncate()` helper bounded by a named `*_MAX` constant, and add the constant in the same edit that adds the field. **Verify each constant against `<length>` in `force-app/**/objects/<Obj>/fields/<Field>.field-meta.xml`** — the cap is in the repo, so a constant that has drifted from the metadata is itself a finding. Where truncation would store semantically wrong data (a year, an airport code, a currency ISO), validate and reject instead. Neither `sf apex run test` nor code reading exercises this; only real DML against the metadata does.
  ```apex
  // BAD  NotesFromOperator__c = payload.operatorNotes;
  // GOOD private static final Integer OPERATOR_NOTES_MAX = 32768;  // matches field-meta.xml <length>
  //      NotesFromOperator__c = truncate(payload.operatorNotes, OPERATOR_NOTES_MAX);
  ```

## Null and collection safety

- Guard clauses for null or empty inputs at the top of public methods.
- Return empty collections instead of `null`.
- Use `String.isBlank()`, safe navigation (`?.`), and null coalescing (`??`).
- Never dereference `map.get(key)` inline unless presence is guaranteed.

## Maintainability

- **Magic strings and numbers** — inline literals (`'Closed Won'`, `50000`) duplicate silently and drift. Use `private static final` constants or a constants class; Enums over string constants where possible; Custom Labels for user-facing text; Custom Metadata for thresholds, mappings, and feature flags admins may change without a deployment.
- **`System.debug` in production code paths** — evaluates its arguments even when no debug log is active, consuming CPU, and can leak sensitive data into logs. Remove from main code paths; use a logging framework (custom object or platform event) for production observability. Never log PII.
- **Deep nesting and excessive cyclomatic complexity** — beyond ~3 levels of nesting ("arrow code"), readability and branch coverage collapse (PMD: `ExcessiveNestedBlockDepth`). Flatten with guard clauses (early `return`/`continue`), hoist complex conditions into well-named `Boolean` variables, and extract deeply nested blocks into named helper methods.
