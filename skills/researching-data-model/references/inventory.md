# Inventory: objects, fields, relationships, record types, picklists

> Part of `researching-data-model` — see SKILL.md. Discovery, not design. Verify against
> `force-app/**` first, then the org (org wins). Each question pairs with the read-only command that
> answers it — run it; don't ask the user.

## Objects in scope

Which objects does the feature touch? Inventory each before declaring any gap.

- **What objects exist?** — `sf sobject list --sobject all` (org) and the metadata tree under
  `force-app/main/default/objects/` (repo). Standard objects (Account, Contact, Case, Opportunity, …)
  before custom — note which standard objects already model the concept.
- **What does each look like?** — `sf sobject describe --sobject <Name>` returns fields, types,
  relationships, record types, and child relationships in one call. Read it before reading XML.
- **Custom objects already present** — `force-app/**/objects/*__c/` and the describe `custom` flag.
  An existing custom object that fits the entity is a reuse candidate.

## Fields

- **What fields already exist on the target object?** — from the describe `fields[]` (API name,
  `type`, `length`, `referenceTo`, `picklistValues`). List the ones relevant to the feature.
- **Duplicate-field risk** — does a field already capture what the feature wants to store? Grep field
  labels/API names (`grep -ri "<concept>" force-app/**/fields/`). Prefer an existing field over a new
  one; flag near-duplicates for `sf-plan` to resolve.
- **Field type fit** — note type/precision/length of existing fields the feature will read or write,
  so the plan doesn't assume an incompatible type.

## Relationship topology and the constraints that bite at planning time

Map every relationship in and out of the target objects (describe `fields[].referenceTo` for lookups
and master-details; `childRelationships[]` for the reverse). Then record the constraints that **gate
the design** — these are the surprises this skill exists to surface early:

| Relationship | What to record | Planning-time constraint |
|---|---|---|
| **Lookup** | parent object, required/optional | Independent sharing; no roll-up summary |
| **Master-detail** | parent, roll-up summary fields present | A **standard object can't be the detail side**; **max 2 per object**; child inherits parent sharing |
| **Junction** | the two master-detail parents | A custom object with two master-details (many-to-many) |
| **External lookup / indirect** | external object + Salesforce Connect | Relates to off-platform data |

Two constraints to flag explicitly when they apply:

- **You can't add a master-detail to an object that already has data** — it must be created as a
  lookup, then converted. If the target object has records (check the volume query), a planned
  master-detail is a multi-step migration, not a field add. Surface it.
- **Converting master-detail → lookup first requires removing any roll-up summary fields.** Note
  existing roll-up summaries that a re-parenting plan would have to unwind.

## Record types and picklists

Prefer extending these over spawning new objects for "type" variations.

- **Record types in use** — describe `recordTypeInfos[]`, or
  `force-app/**/objects/<Obj>/recordTypes/`. List active record types on the target objects.
- **Picklist values in use** — describe `fields[].picklistValues[]` for each picklist/multipicklist.
  A "type"/"category" variation often belongs as a picklist value or record type, not a new object —
  capture what already exists so `sf-plan` can choose reuse.

## What to hand to the doc

For each in-scope object: API name, custom/standard, relevant fields (API name + type), relationships
(with any blocking constraint), record types, and picklists — each marked *verified (org)* /
*verified (repo)* / *proposed gap*. Blocking constraints and duplicate-field risks go up to the
doc's **Surprises & constraints** section.
