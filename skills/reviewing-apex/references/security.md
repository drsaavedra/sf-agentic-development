# Security

> Part of `reviewing-apex` — see SKILL.md for the always-on Quick Reference and routing.

## CRUD/FLS and sharing

- **No CRUD/FLS enforcement** — Apex historically runs in system context: code works for admins, throws `INSUFFICIENT_ACCESS` for standard users, or silently exposes fields they should not access. The most common security review failure. Enforce with `WITH USER_MODE` in SOQL and `AccessLevel.USER_MODE` in `Database` DML (GA Spring '23, API v57).
- **API version sets the security baseline — check it first.** As of API v67 (Summer '26): database operations (SOQL, SOSL, DML, `Database` methods) **default to user mode** (v66 and below defaulted to system mode); a class with **no sharing declaration defaults to `with sharing`** (previously implicit `without sharing`); and **triggers always run in system mode** (a deliberate, permanent exception — but the handler classes a trigger calls are *not* exempt, so an un-declared handler now inherits `with sharing`). When a v67+ operation genuinely needs system mode, opt out explicitly with `WITH SYSTEM_MODE` (SOQL/SOSL) or `AccessLevel.SYSTEM_MODE` (`Database` methods) — relying on the old implicit default no longer works. For classes below v67, none of these defaults apply — explicit `WITH USER_MODE` and an explicit sharing keyword are required. Explicit declarations remain preferred at every API version: they survive API bumps and state intent.
- **User mode failures are loud, not silent.** A user-mode operation on inaccessible fields throws (`QueryException` for SOQL); call `getInaccessibleFields()` on the exception to get **all** violating fields. The API that silently *removes* inaccessible fields instead of throwing is `Security.stripInaccessible()` — use it deliberately when partial results are acceptable, not as an accident.
- **`WITH SECURITY_ENFORCED` is removed at API v67 — it no longer compiles in a class pinned to v67 or later.** A class still on v66 or below compiles it, but treat it as deprecated and migrate on sight to `WITH USER_MODE`, which also handles polymorphic fields, checks the whole query (not just SELECT/FROM), and reports every access error instead of aborting on the first.
- **Legacy fallback (pre-API-57):** `Security.stripInaccessible(AccessType.READABLE, records)` before returning data, and `AccessType.CREATABLE` / `UPDATABLE` before DML. Document as a legacy path; prefer user mode on v57+.
- **`ApexCRUDViolation` is the #1 AppExchange security-review failure.** Pair with `running-code-analyzer`: elevate `ApexCRUDViolation` to Severity 1 in `code-analyzer.yml` and fail CI/CD on it.
- **Page layout is not FLS.** Layout controls display; FLS controls access. Always enforce FLS in Apex regardless of how the field is surfaced. Assign FLS via permission sets, not profiles.
- **`without sharing` must never sit on a general-purpose service.** Default every class to `with sharing`; isolate `without sharing` in a narrow, purpose-built helper, document the reason, and gate it behind a Custom Permission check called from a `with sharing` entry point.
- **`inherited sharing` is unsafe without mapping the full call chain.** Prefer `with sharing` when in doubt. (As an `@AuraEnabled` entry point with no parent context, it defaults to `with sharing`.)

## SOQL injection

- **Concatenating user input into a dynamic query** lets a caller alter the query and read data outside the intended scope. Bind all user input with `:variable` — in dynamic SOQL strings, use `Database.queryWithBinds(query, bindMap, accessLevel)` (API v57+) so every value resolves from a bind map instead of string concatenation.
- **`String.escapeSingleQuotes()` is a secondary measure only** — it escapes quote characters in string literals but does nothing for injection into the query's structure. Structural elements (field names, object names, operators, `ORDER BY` directions) cannot be bound — validate them against a `Set<String>` allowlist or `Schema.describe`, never escape them.
- **Treat every `@AuraEnabled` parameter as untrusted.** Validate all IDs and string inputs from LWCs or page state before use — an LWC wire parameter is user-controlled input.

## Hardcoded secrets and IDs

- **Secrets in source** are visible to anyone with read access to the code or repo. Use Named Credentials or protected Custom Metadata — never string literals.
- **Hardcoded Record Type / Profile / record IDs** differ between sandbox and production and silently break post-deployment. Resolve dynamically — e.g., `Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName().get('Business_Account').getRecordTypeId()` — or source from Custom Metadata / Custom Labels.
- **Never expose PII or internal error detail** in debug logs, error messages, or API responses.
