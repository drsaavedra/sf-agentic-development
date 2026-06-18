# Data model: choosing the right structure

> Part of `sf-plan` — see SKILL.md. Use this when a feature stores or relates data. Standard before
> custom; model for fast retrieval and large data volumes from day one (assume the data grows).
> Record each choice and its reason in the spec, and verify names against the org first.

## Standard vs custom object

- Use a **standard object** when one fits the concept (Account, Contact, Case, Opportunity, …) and
  extend it with custom fields before creating a parallel custom object.
- Create a **custom object** only when no standard object represents the entity, or when reusing a
  standard one would distort its semantics, reporting, or sharing.
- Don't duplicate a standard object's purpose, and prefer **picklists + record types** over spawning
  new objects for "type" variations.

## Relationships

| Use… | When | Notes |
|---|---|---|
| **Lookup** | Loosely related; the child can exist without the parent | Independent sharing; optional or required; no roll-up summary |
| **Master-detail** | Tightly owned; the child can't exist without the parent | Child inherits parent sharing/ownership; enables roll-up summary fields; cascade delete; **max 2 per object** |
| **Junction object** | Many-to-many | A custom object with two master-detail relationships |
| **External lookup / indirect lookup** | Relate to data in an external object | Used with Salesforce Connect |

Prefer **lookup** unless you specifically need master-detail's ownership, roll-up, or cascade —
master-detail is harder to change later. Constraints that bite at planning time: a **standard
object can't be the detail side**, you **can't add a master-detail relationship to an object that
already has data** (create it as a lookup, then convert), and converting master-detail → lookup
first requires removing any roll-up summary fields.

## Where data and configuration live

| Store in… | For… |
|---|---|
| **Custom object** | Transactional/business records users create, relate, and report on |
| **Custom Metadata Type** | App configuration and mappings that deploy **with their records** (package/upgrade-safe), read-cached, managed by release/admin — not written per-user at runtime |
| **Custom Setting (hierarchy)** | Org/profile/user-level defaults read at runtime, cached |
| **Custom Setting (list)** | Static reusable reference data, cached — though **CMT is the modern preference** for new work |
| **Platform Cache** | Transient, short-lived computed/session data — never a system of record |
| **Big Object** | Very high volume, append-mostly history (queried by index via SOQL or Async SOQL); no standard triggers/sharing |
| **External Object** | Data that stays **off-platform**, surfaced on demand via Salesforce Connect (data tiering) |

Rule of thumb: app config that ships with the release → **CMT**; runtime org/user defaults →
**hierarchy custom setting**; high-volume history → **Big Object** or tier off-platform via
**External Objects**; everything users transact on → **custom object**.

## Design for large data volumes from the start (Well-Architected)

You have **large data volumes** at roughly tens of thousands of users, tens of millions of records,
or hundreds of GB of storage — design for it before you reach it.

- Assume every object grows and every automation may run against large data volumes — design for
  **selective, indexed queries** and bulk-safe processing.
- **Keep volumes low:** archive or hard-delete data the business doesn't need.
- **Data tiering:** keep large datasets the org doesn't use day-to-day off-platform (External
  Objects / callouts / mashups), surfacing them on demand.
- For reporting over history, populate **aggregation/summary custom objects** with batch Apex
  rather than reporting across raw high-volume data.
- Avoid **data skew**: no parent should have a very large number of child records (parent-child
  skew), and no single user or queue should own more than ~10,000 records of the same object
  (ownership skew) — both cause record-locking and sharing-recalculation pain at scale.

## Guardrails

- **Verify against the org first** (sf-plan's schema rule): confirm standard objects/fields and any
  existing custom objects before declaring new ones; the data model feeds each work item's
  *Schema context* with real API names.
- These criteria are maintained against official Salesforce docs; if a choice hinges on a limit or
  capability that looks like it may have changed, flag it for the maintainer rather than guessing.
