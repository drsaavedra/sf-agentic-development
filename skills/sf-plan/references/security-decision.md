# Security & sharing: choosing the access model

> Part of `sf-plan` — see SKILL.md. Use this when a feature changes **who can see or do what** — a new
> object's visibility, record-level access for a role or community, field exposure, or programmatic
> sharing. Lock the baseline down with **org-wide defaults**, then widen access with the most
> declarative tool that meets the requirement; reach for Apex sharing only when config can't express
> it. Grant permissions with **permission sets**, never by editing profiles. Record each choice and
> its reason in the spec.

## Foundation — permissions via permission sets (always)

- **Object (CRUD) and field (FLS) permissions** come from **permission sets** and **permission set
  groups**, not profiles. A user has **one profile but many permission sets**; the permission-set
  model is Salesforce's recommended way to grant access, and field-level security on permission sets
  is GA.
- Keep **profiles minimal** — use them only for the defaults a user can hold one of (default app,
  record types, page layouts, login hours/IP). Move every functional grant to a permission set so
  access is composable and auditable.
- **Permissions grant, never deny.** Profiles, permission sets, and permission set groups can only
  *add* access — you can't subtract a permission with one. To *narrow* what sharing already granted,
  use a **restriction rule** (below).

## The record-access ladder — lock down, then widen

Object permissions say *whether* a user can touch an object; **record-level access** says *which
rows*. Start at the most restrictive OWD and add access outward — never the reverse.

1. **Org-wide defaults (OWD)** — the per-object baseline. Set the most restrictive level the feature
   can tolerate (**Private** when records must be siloed), then widen. Options: Private · Public Read
   Only · Public Read/Write · (Public Read/Write/Transfer for Leads and Cases) · **Controlled by
   Parent** (a master-detail child inherits the parent's sharing — see the data-model pack).
2. **Role hierarchy** — automatically grants users access to records owned by their subordinates.
   Comes with the hierarchy; design roles before reaching for rules.
3. **Sharing rules** — the standing exception to OWD, granting access to **public groups / roles** by
   **record owner** (owner-based) or **field values** (criteria-based). Declarative, and the default
   way to open access to a group. (Criteria-based rules are capped per object.)
4. **Manual sharing** — one-off, owner-granted Read/Edit on a single record; not automated. For
   genuine exceptions only, not a design mechanism.
5. **Apex managed sharing** — programmatic `__Share` rows for access rules the declarative tools can't
   express (computed, multi-criteria, cross-object). The last rung — reach here only when role
   hierarchy + sharing rules can't model the requirement. Build owned by `generating-apex`.

**To narrow, not widen:** a **restriction rule** scopes a user's existing read access *down* to records
matching its criteria (supported on custom and external objects, contracts, events, tasks, and time
sheets). Don't confuse it with a **scoping rule**, which only changes the *default* set of records a
user sees — it filters the view, it does **not** enforce security.

## Experience Cloud / guest access (only when the feature has a public or community surface)

- **Guest (unauthenticated) users** — the **only** way to grant them record access is a **guest user
  sharing rule** (a criteria-based rule that grants **Read Only** and counts against the per-object
  criteria-sharing limit). Secure guest user access is on in every org and can't be disabled.
- **Authenticated site users** — use **sharing sets** to grant access to records tied to the user's
  own account/contact, and **share groups** to share high-volume community users' records with
  internal users.
- This rung pairs with the `researching-ui` internal-vs-Experience-Cloud fork — a public surface
  changes the security design, not just the UI.

## Where it meets the rest of the design

- **Reparenting / ownership change recomputes sharing.** Moving a record to a new parent or owner
  triggers sharing recalculation — costly at volume and a correctness risk (access can shift). Flag it
  when the feature reparents or mass-transfers records (see the data-model pack's ownership-skew and
  large-data-volume notes).
- **Field exposure** — a new field holding sensitive data needs an FLS decision per permission set;
  removing it from a page layout is **not** a security control.
- **Encryption & compliance** — Shield Platform Encryption (a licensed add-on) and any compliance
  constraints come from the security-model research doc; decide them there, not from memory.
- **Apex runs in system mode by default** — `with sharing` / `WITH USER_MODE` enforcement is the build
  concern of `generating-apex` / `reviewing-apex`. This pack picks the *sharing model*; those enforce
  it in code.

## Guardrails

- **Most-restrictive OWD first, then widen.** Never open with Public and try to claw access back —
  tightening OWD later forces a sharing recalculation and can break existing access.
- **Permission sets over profiles**, always; never grant new functional access by editing a profile.
- **Apex managed sharing is the last rung** — exhaust role hierarchy + sharing rules first; it's code
  to maintain and test.
- **License gate first.** Whether the target users even *hold* the license or feature the access needs
  is the named surprise the security-model research doc exists to catch — confirm it there before
  designing access.
- These criteria are maintained against official Salesforce docs; if a limit or capability looks like
  it may have changed, flag it for the maintainer rather than guessing.
