# Authoring

Claude authors all Salesforce artifacts directly — Apex classes/triggers/tests, LWC bundles,
Flows, SOQL, and declarative metadata (objects, fields, tabs, apps, permission sets, FlexiPages,
validation rules, list views, sharing rules) — without loading a per-artifact authoring skill.
One domain routes to a skill before building:

| Context | Skill |
|---|---|
| B2B/B2C Commerce storefront LWC — cart, checkout, PDP/PLP, search, quick order, account/order/quote/subscription, or any Experience-Builder commerce component (LWR storefront) | `generating-b2b-lwc` |

Authoring rules (always apply):

- `[tdd-for-apex]` **TDD for Apex** — author or extend the test class first, then implement the minimum to make it
  pass. Exceptions: metadata-only changes, trivial non-logic edits, and user-declared prototypes
  or spikes.
- `[objective-gates-not-vibes]` **Objective gates, not vibes** — verify with `sf project deploy validate
  --test-level RunSpecifiedTests --tests <tests>` (free to run any time) and `sf code-analyzer run`
  over changed files. A payload with no Apex cannot use `NoTestRun`; validate it with
  `--test-level RunRelevantTests` and report its 0/0 as "no tests ran". Fix what they surface
  before reporting done. `sf apex run test` runs the code
  already in the org, not your working tree, so it never proves an uncommitted change.
- `[knowledge-cutoff-guard]` **Knowledge-cutoff guard** — Salesforce ships three releases a year. If the work touches a
  platform feature, API version behavior, or limit that may post-date training — or you are not
  certain of the current syntax — fetch the official docs before authoring.
  developer.salesforce.com answers 403 to WebFetch; most of its guides are PDFs at
  `https://resources.docs.salesforce.com/latest/latest/en-us/sfdc/pdf/<guide>.pdf` (e.g. `api_meta`,
  `lightning`, `platform_events`, `salesforce_apex_developer_guide`) — download and convert to text.
  The LWC developer guide is not mirrored; use help.salesforce.com or WebSearch for it. Never guess at release-sensitive
  claims.
- `[schema-truth]` **Schema truth** — verify object/field/relationship API names against local metadata
  (`force-app/**`) first, then the org (`sf sobject describe`, read-only). Never invent API names.
  Describe, `FieldDefinition` and SOQL `INVALID_TYPE` all read through the running user's access, so
  "not found" proves nothing until a control the org must have reads cleanly. Read org feature
  toggles from Settings metadata, not from a describe.
- `[retrieve-permission-sets-by-name]` **Never retrieve `PermissionSet` or `Profile` by type from a
  scratch or shared org.** The retrieved file describes that org, so grants for classes or fields
  the org lacks are silently removed. Edit them in source, or retrieve one by name and diff the entry
  counts per element type in both directions before committing.
- `[ops-through-the-sf-cli]` **Ops through the sf CLI** — deploys, org introspection, SOQL, data loads, debug logs, and
  static analysis all run through `sf` commands directly; check `sf <command> --help` when unsure
  of current flags.
