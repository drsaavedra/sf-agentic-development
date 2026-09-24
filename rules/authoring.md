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
- `[objective-gates-not-vibes]` **Objective gates, not vibes** — verify with `sf project deploy validate` (free to run any
  time), `sf apex run test`, and `sf code-analyzer run` over changed files. Fix what they surface
  before reporting done.
- `[knowledge-cutoff-guard]` **Knowledge-cutoff guard** — Salesforce ships three releases a year. If the work touches a
  platform feature, API version behavior, or limit that may post-date training — or you are not
  certain of the current syntax — fetch the official docs (developer.salesforce.com,
  help.salesforce.com) via WebFetch/WebSearch before authoring. Never guess at release-sensitive
  claims.
- `[schema-truth]` **Schema truth** — verify object/field/relationship API names against local metadata
  (`force-app/**`) first, then the org (`sf sobject describe`, read-only). Never invent API names.
- `[ops-through-the-sf-cli]` **Ops through the sf CLI** — deploys, org introspection, SOQL, data loads, debug logs, and
  static analysis all run through `sf` commands directly; check `sf <command> --help` when unsure
  of current flags.
