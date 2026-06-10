# @AuraEnabled and ConnectApi

> Part of `salesforce-apex-quality` — see SKILL.md for the always-on Quick Reference and routing.

> **Cross-domain boundary.** This file defines the Apex side of the Apex→LWC contract. If you are also building the LWC component that calls these methods, load `salesforce-lwc-quality` for the component-side rules.

- Narrow inputs and outputs. Use typed wrapper classes — not raw JSON strings — for structured LWC responses.
- `cacheable=true` only when the method performs no DML, callouts, cart/checkout mutations, or session-specific side effects.
- Catch exceptions and rethrow as `AuraHandledException` with a user-friendly, sanitized message. Never expose internal detail.
- Isolate `ConnectApi` calls behind a wrapper/service to keep controllers thin and give tests a stable seam.
- **Do not let an LWC directly trigger a state-changing external callout through an `@AuraEnabled` method (CSRF risk).** State-changing external operations must originate from a verified internal event — a DML trigger, a Platform Event consumer, or a Flow — not a GET-accessible Apex entry point.
- Enforce CRUD/FLS (`WITH USER_MODE`) on every `@AuraEnabled` method, and keep the enclosing class `with sharing`. On Experience Cloud, never return PII or account data to a guest context.
