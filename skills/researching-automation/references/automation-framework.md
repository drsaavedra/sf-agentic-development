# The framework new automation plugs into

> Part of `researching-automation` — see SKILL.md. Discovery, not design. Find the pattern in
> `force-app/**` and name its entry point, or record its absence. Each question pairs with the grep
> that answers it.

## Trigger framework

- **One trigger per object?** — list `force-app/**/triggers/*.trigger`; flag any object with more than
  one trigger.
- **Handler base class?** — grep triggers for the handler call
  (`grep -rh "new .*Handler\|TriggerHandler\|\.run()" force-app/**/triggers/`). The repo commonly
  references a `TriggerHandler.cls` base. Record the base class name and **how a handler extends it**
  (the contract a new handler must follow) — or note that triggers carry logic inline.
- **Recursion control** — is there a static-guard convention? Note it so new automation matches.

## Logging & error-handling framework

This is load-bearing — work briefs say "reuse the existing logging framework"; find it.

- **What logger exists?** — grep for a logging entry point
  (`grep -rl "Logger\.\|Nebula\|Logger.getInstance\|log(" force-app/**/classes/`). Common: Nebula
  Logger, a home-grown `Logger`/`LogService`, or only `System.debug`. Record the **class + method to
  call** and how logs are persisted.
- **Error-handling convention** — custom exception types (`*Exception.cls`), a `try/catch` +
  `addError` pattern, savepoint/rollback usage. Note the convention new automation should follow.

## Async strategy

- **What async is already used?** — grep for `implements Queueable`, `Database.Batchable`,
  `Schedulable`, `@future`, and Platform Event publishes (`EventBus.publish`). Record the chaining
  pattern (e.g. Queueable + Finalizer) so new async matches it.

## Unit of Work / DML

- **Is DML centralized?** — fflib `fflib_SObjectUnitOfWork`, a custom UoW, or direct `insert`/`update`
  in handlers/services (`grep -rl "UnitOfWork\|fflib_SObjectUnitOfWork" force-app/**/classes/`). Note
  the pattern so new automation commits the same way.

## Flow conventions

- **Flow naming** — observe the naming pattern on `force-app/**/flows/*.flow-meta.xml` (object prefix,
  trigger-type suffix, before/after marker). Record the de-facto rule so a new Flow's API name fits.
- **Subflow usage** — grep for `<subflows>` / `<flowName>` references
  (`grep -rl "<subflows>" force-app/**/flows/`). Note whether shared logic is factored into autolaunched
  subflows new automation should call rather than duplicate.
- **Fault handling** — look for fault connectors and the Custom Error / screen-error pattern
  (`grep -rl "<faultConnector>\|customErrors\|RollbackOnError" force-app/**/flows/`). Record the
  fault-handling convention (fault paths, Custom Error elements, rollback) new Flows should follow.

## Test data factory & coverage baseline

- **TestDataFactory pattern** — find it (`grep -rl "TestDataFactory\|@IsTest" force-app/**/classes/`).
  Record the factory class name and how tests use it (the method to call for each SObject).
- **Mocking approach** — `Test.createStub` / `System.StubProvider`, dependency injection, or
  hand-rolled doubles. Note it.
- **Coverage baseline** — if an org is connected, `sf apex get test` history or the org's overall
  coverage; otherwise note "unknown (repo-only)". This is a baseline to record, not a gate.

## What to hand to the doc

Each pattern's name + entry point (or its documented absence) maps to the matching doc section.
Missing framework pieces and a greenfield-vs-established read go to **Surprises & constraints**.
