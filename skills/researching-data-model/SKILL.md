---
name: researching-data-model
description: "Salesforce data-model discovery — inventories what objects, fields, relationships, record types, picklists, record volumes, and config storage already exist, plus org-wide settings that reshape the model, and writes a state-of-the-world docs/data-model.md a human reviews before planning. Surfaces the constraints that bite at planning time (master-detail on a populated object, data skew, Person Accounts) before sign-off, not mid-build. TRIGGER when: starting research on a feature that stores or relates data, or asked to inventory/audit an org's data model, schema, relationships, or record volumes before a design. DO NOT TRIGGER when: choosing or building the model (use sf-plan to decide standard-vs-custom and relationships, then generating-custom-object / generating-custom-field to build), or for a trivial one-field add."
allowed-tools: Read, Grep, Glob, Bash, AskUserQuestion
---

# Salesforce Data Model Research

Discover and document the **current** data model so planning rests on what the org actually has, not
a guess. This skill is discovery only — it does **not** decide standard-vs-custom or design new
schema (that is `sf-plan`'s job, using the data-model decision pack). Its output is
`docs/data-model.md`: a state-of-the-world picture a human reviews before `sf-plan` plans against it.

**Cross-domain:** sharing/OWD and FLS belong to `researching-security-model`; existing
automation on these objects belongs to `researching-automation`. Note the boundary here, capture
it there.

## Operating rules

- **Scope from the request, not the org.** Derive the in-scope set — the objects and fields the
  feature stores or relates — from the prompt first, and inventory only that set plus **one collision
  hop** (directly related objects, and fields that could duplicate what you'd add). Don't census the
  org. If the request is too vague to scope, ask one scoping question rather than inventorying to
  compensate. (Whole-org documentation is a separate, opt-in mode — see below.)
- **Verify, never guess.** Confirm every object, field, and relationship API name against the repo
  (`force-app/**`) first, then the org — **the org wins** on divergence. Read-only `sf` CLI
  introspection is free: `sf sobject list`, `sf sobject describe --sobject <Name>`,
  `sf data query --query "..."`. Never ask the user to run Developer Console or anonymous Apex for
  what these answer. **If no org is connected, verify against `force-app/**` alone and flag the doc
  `repo-only`** — never silently assume an org-verified name.
- **Inventory before recommend.** Record what exists — objects, fields, relationships, record types,
  picklists, volumes, config stores — before naming any gap. Reuse-before-invent: an existing field
  or record type usually beats a new object, and `sf-plan` can only choose reuse if research found it.
- **Don't fabricate counts.** Record volumes come from a `COUNT()` query, not a guess. If the org
  can't be queried, write "unknown (repo-only)", not a number.
- **Org-survey mode is opt-in.** Only when the user explicitly asks to document the whole org/domain
  (not a specific feature) do you drop the scope bound and inventory wholesale; the feature-scoped
  default above holds otherwise.

## Phases: Discover → Analyze → Document

1. **Discover.** **Set scope first** — from the feature request, list the objects (and their fields)
   in scope; everything below is bounded to that set + one collision hop, not an org-wide census. Then
   capture org context — org type (prod/sandbox/scratch) and whether an org is
   reachable (`sf org display`); if not, the doc is `repo-only`. Then work the two reference
   checklists below: inventory objects/fields/relationships/record-types/picklists from
   `force-app/**` and `sf sobject describe`, and query record volumes + org-wide settings. Read the
   metadata; run the introspection commands; don't ask what the org can tell you.
2. **Analyze.** Turn the raw inventory into findings: reuse candidates (existing object/field/record
   type that fits), duplicate-field risk, and the **constraints that gate design** — a standard
   object can't be a detail side, you can't add a master-detail to a populated object, parent-child
   or ownership data skew, Person Accounts / multi-currency reshaping the model. Use
   `AskUserQuestion` only for what the org can't answer (e.g. expected growth rate).
3. **Document.** Write `docs/data-model.md` from the output contract below — sections filled from the
   inventory, ending with the design-gating **Surprises & constraints**.

## Reference files (read the one matching what you're inventorying)

| Inventorying… | Read |
|---|---|
| Objects, fields, relationship topology, master-detail constraints, record types, picklists, duplicate-field risk | `references/inventory.md` |
| Record volumes & data-skew risk, config storage (CMT vs custom settings), External Objects, org-wide settings (Person Accounts, multi-currency, state/country picklists) | `references/volumes-and-org-settings.md` |

Most features touch both — read both before writing the doc.

## Output contract — `docs/data-model.md`

Write these sections (omit one only if genuinely N/A; never pad). If no org was reachable, add a
first line: `> **Status: repo-only** — names verified against force-app/** only, not org-confirmed.`
Keep the doc **scoped to the feature** — a later feature appends its own in-scope findings, so this
is the union of what features have needed, not a complete org model.

- **Scope** — which objects this feature touches, and why they were inventoried.
- **Objects & fields** — per object: API name, custom/standard, the fields relevant to the feature
  (API name + type), each marked *verified (org)* / *verified (repo)* / *proposed gap*.
- **Relationships & constraints** — existing lookups/master-details/junctions; topology that limits
  the design (detail-side rules, populated-object conversion, max-2-master-detail).
- **Record types & picklists** — types and picklist values already in use on the target objects
  (candidates to extend before adding objects).
- **Volumes & skew** — current `COUNT()` per object, known growth, parent-child / ownership skew risk.
- **Config storage** — where configuration lives today (CMT, custom settings, custom objects) and
  whether new config should follow the existing pattern.
- **Org-wide settings** — Person Accounts, multi-currency, state/country picklists, anything that
  reshapes the model org-wide.
- **Surprises & constraints** — the design-gating findings a human must see before planning: missing
  reuse, blocking constraints, skew, license/feature dependencies (cross-ref `researching-security-model`).

## Cross-Skill Integration

| Need | Hand to |
|---|---|
| Decide standard-vs-custom, relationship type, where new config lives | `sf-plan` (data-model decision pack) — **consumes** this doc instead of re-exploring |
| Build the chosen objects/fields once planned | `generating-custom-object`, `generating-custom-field` |
| OWD / sharing model / FLS for these objects | `researching-security-model` |
| Existing triggers/Flows/validation rules on these objects | `researching-automation` |
