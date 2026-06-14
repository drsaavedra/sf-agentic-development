# Layering and Architecture

> Part of `reviewing-apex` — see SKILL.md for the always-on Quick Reference and routing.

Follow Service-Selector-Domain layering. One level of abstraction per method. No responsibilities crossing layer boundaries:

| Layer | Responsibility | Never contains |
|---|---|---|
| Trigger | Event routing only | Business logic, SOQL, DML |
| Handler / Service | Flow control and coordination | Inline SOQL, DML, HTTP, parsing |
| Domain | Business rules, validation, field derivation | Queries, callouts, persistence |
| Selector | All SOQL; shared field-list constants | Business decisions |
| Data / Integration | SOQL, DML, HTTP | Business decisions |

Additional rules:
- Single responsibility per class. Split at ~500 lines; extract helpers for methods past ~40 lines.
- Return early: validate preconditions at the top and return or throw immediately.
- Dependency injection via constructor or method parameters for testability without org state.
- ApexDoc on the class header and every `public` or `global` method.
- Choose the smallest correct pattern: SOQL in a Selector, SObject behavior in a Domain, orchestration in a Service, pure helpers in a Utility.
- Design sharing deliberately. Default `with sharing`; treat `without sharing` as an architectural decision, not a quick fix. Declare sharing explicitly even though API v67+ classes without a declaration default to `with sharing` — an explicit keyword survives API bumps and states intent (see `references/security.md` for the v67 baseline).
- In Selector field lists, prefer compile-time field references (`Schema.Account.Name` or a `Schema.SObjectField` constant) over string literals — field deletion is then caught at deploy time instead of failing at runtime.
- Static analysis is part of the quality gate. Pair with `running-code-analyzer`: `ApexCRUDViolation`, `ApexSharingViolations`, `ExcessiveClassLength`, `ExcessivePublicCount`, and `ExcessiveNestedBlockDepth` should be in the enforced rule set.

## Naming conventions

| Artifact | Pattern |
|---|---|
| Service | `{SObject}Service` |
| Selector | `{SObject}Selector` |
| Domain | `{SObject}Domain` |
| Batch | `{Descriptive}Batch` |
| Queueable | `{Descriptive}Queueable` |
| Schedulable | `{Descriptive}Schedulable` |
| Utility | `{Descriptive}Util` |
| Interface | `I{Descriptive}` |
| Custom exception | `{Descriptive}Exception` |
| Methods | Start with a verb |
| Maps | `{value}By{key}` (e.g., `accountById`) |
| Lists | Plural nouns |
