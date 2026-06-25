# Volumes, data skew, config storage, and org-wide settings

> Part of `researching-data-model` — see SKILL.md. Discovery, not design. Counts come from queries,
> never assumptions. If the org can't be queried, record "unknown (repo-only)".

## Current record volumes and growth

Design changes with scale — query the counts, don't assume.

- **How many records does each target object hold today?** —
  `sf data query --query "SELECT COUNT() FROM <Object>"`. Record the actual number per in-scope
  object. (Use `--query "SELECT COUNT(Id) cnt FROM <Object>"` if a labelled count is easier to read.)
- **Growth rate** — the org can't tell you this; ask the user (`AskUserQuestion`) only when the number
  matters to the design (e.g. "is this object expected to grow by millions/year?").
- **Large-data-volume threshold** — roughly tens of millions of records, hundreds of GB, or tens of
  thousands of users. Flag any object near it so `sf-plan` designs for selective, indexed queries.

## Data-skew risk

Skew causes record-locking and sharing-recalculation pain at scale — surface it during research.

- **Parent-child skew** — does any one parent own a very large number of child records? Spot it via
  `SELECT <Parent>, COUNT(Id) FROM <Child> GROUP BY <Parent> ORDER BY COUNT(Id) DESC` (sample/limit).
- **Ownership skew** — does any single user or queue own more than ~10,000 records of the same
  object? `SELECT OwnerId, COUNT(Id) FROM <Object> GROUP BY OwnerId ORDER BY COUNT(Id) DESC`.
- Record the worst offenders, not a clean bill — "no skew found" is also a finding.

## Where configuration lives today

Inventory the existing config-storage pattern so new config follows it (or `sf-plan` knowingly
diverges). CMT is the modern preference for new app config.

- **Custom Metadata Types** — `force-app/**/customMetadata/` and `*__mdt` objects. App config/mappings
  that deploy with their records (package/upgrade-safe).
- **Custom Settings** — `force-app/**/objects/*__c/` with `<customSettingsType>`; hierarchy (org/
  profile/user defaults read at runtime) vs list (static reference data).
- **Custom objects used as config** — sometimes config lives in a plain custom object; note it.
- **Schema-aware CMT mappings** — if existing CMTs store object/field references, check whether they
  use `MetadataRelationship` fields (`referenceTo` `EntityDefinition`/`FieldDefinition`) vs text API
  names. Text-stored API names rot on rename — flag them.

## External data already in play

- **External Objects / Salesforce Connect** — `force-app/**/objects/*__x/` or describe objects ending
  `__x`. If present, data tiering is already in use — note it so the plan doesn't duplicate
  off-platform data on-platform.

## Org-wide settings that reshape the model

These change the model org-wide; check them before designing.

- **Person Accounts** — enabled? `sf sobject describe --sobject Account` shows
  `IsPersonAccount`/person fields, or query `SELECT IsPersonAccount FROM Account LIMIT 1`. Person
  Accounts merge Account+Contact and change relationship design.
- **Multi-currency** — `sf data query --query "SELECT IsoCode FROM CurrencyType"` (errors if not
  enabled). Adds `CurrencyIsoCode` to objects and affects roll-ups/reporting.
- **State/Country picklists** — affects address fields; note if enabled.

## What to hand to the doc

Per object: current `COUNT()`, known growth, and any parent-child/ownership skew → **Volumes & skew**.
Config-storage pattern → **Config storage**. Person Accounts / multi-currency / state-country and any
External Objects → **Org-wide settings**. Anything that blocks or reshapes the design → **Surprises &
constraints**.
