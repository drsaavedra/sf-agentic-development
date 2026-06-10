# Security

> Part of `salesforce-apex-quality` — see SKILL.md for the always-on Quick Reference and routing.

## No CRUD/FLS enforcement

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

## SOQL injection

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

## Hardcoded secrets and IDs

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
