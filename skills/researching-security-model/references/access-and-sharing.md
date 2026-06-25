# Access and sharing inventory

> Part of `researching-security-model` — see SKILL.md. Discovery, not design. Inventory the existing
> sharing model and permission strategy before naming a gap. Verify against `force-app/**` then the
> org; if no org, flag `repo-only`.

## Org-wide defaults (OWD)

OWD is the floor the rest of the sharing model builds up from — capture it per in-scope object.

- **What's the OWD per object?** — object `<sharingModel>` in
  `force-app/**/objects/<Object>/<Object>.object-meta.xml` (Private, Read, ReadWrite,
  ControlledByParent), or the org's Sharing Settings. A Private OWD means the feature needs an
  explicit grant to reach records the user doesn't own — flag it if the requirement assumes broad
  visibility.
- **External OWD** — note the external (Experience Cloud) org-wide default separately if a community
  is involved.

## Role hierarchy and sharing rules

- **Relevant role-hierarchy branches** — `force-app/**/roles/` or the org's Role Hierarchy. Note the
  branches the target users sit in; hierarchy grants upward visibility.
- **Existing sharing rules** — `force-app/**/sharingRules/*.sharingRules-meta.xml`. List criteria-based
  and owner-based rules on the in-scope objects; an existing rule may already grant (or block) the
  access the feature needs.

## Permission sets vs profiles

- **What's the org's strategy?** — permission-set-led (modern) or profile-heavy? Count
  `force-app/**/permissionsets/` vs profile customization. Record the convention so the plan follows it.
- **Existing permission sets to reuse** — list permission sets granting access to the in-scope
  objects (`grep -rl "<object>Account</object>" force-app/**/permissionsets/`). An existing one is a
  reuse candidate; name it.
- **Permission set groups** — note any in use.

## Field-level security (FLS)

- **Which fields are sensitive?** — for fields the feature reads/writes, capture current FLS (visible/
  read-only/hidden per profile/permission set). Sensitive fields (PII, financial) need explicit FLS in
  the plan. Cross-reference the field inventory from `researching-data-model`.

## Record-level access strategy

Identify what the requirement actually needs so `sf-plan` designs the right mechanism:

- **Criteria-based sharing** — share by field values.
- **Owner-based sharing rules** — share by record owner's role/group.
- **Manual sharing** — ad-hoc, per record.
- **Apex managed sharing** — programmatic, for logic declarative rules can't express.
- **None** — OWD + hierarchy already suffice.

Record which the feature needs and whether existing rules cover it.

## Guest / community access

- **Is an Experience Cloud surface involved?** — if so, capture guest-user access needs (guest user
  profile, sharing sets, the tighter guest security model). Pair with `researching-ui`'s
  Experience-Cloud fork. Guest access is a frequent design-gating constraint — flag it.

## What to hand to the doc

OWD per object → **OWD & sharing**. Roles + sharing rules → **Roles & sharing rules**. Strategy +
reusable permission sets → **Permission sets vs profiles**. Sensitive-field FLS → **FLS**. The needed
mechanism → **Record-level access**. OWD blocks, missing sharing reach, and guest-access needs →
**Surprises & constraints**.
