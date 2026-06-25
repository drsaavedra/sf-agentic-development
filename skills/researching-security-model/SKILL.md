---
name: researching-security-model
description: "Salesforce security & licensing discovery — inventories org-wide defaults, role hierarchy, sharing rules, permission-sets-vs-profiles, FLS, record-level access strategy, and — the surprise this exists for — which user and feature licenses the org actually holds and whether the target users have them, then writes a state-of-the-world docs/security-model.md a human reviews before planning. Surfaces 'we don't have that license' and 'the sharing model won't allow this' before sign-off, not mid-build. TRIGGER when: starting research on a feature with access/sharing/visibility implications, or asked to inventory an org's sharing model, permissions, or license entitlements before a design. DO NOT TRIGGER when: building permission sets (use generating-permission-set) or configuring OAuth/Connected Apps (use configuring-connected-apps)."
allowed-tools: Read, Grep, Glob, Bash, AskUserQuestion
---

# Salesforce Security Model Research

Discover and document the org's access, sharing, and **licensing** reality so planning doesn't design
a feature the sharing model can't express or the org isn't licensed to run. Licensing is the precise
surprise this skill exists for — it gates *features* (Experience Cloud, CPQ, Platform vs full user
licenses), not just object access. This skill is discovery only; it does **not** build permission sets
(`generating-permission-set`) or design the sharing model (`sf-plan`). Its output is
`docs/security-model.md`, reviewed by a human before `sf-plan` plans.

**Cross-domain:** the objects whose access you're inventorying come from `researching-data-model`
(this skill owns their *sharing slice*); guest/community access pairs with `researching-ui`'s
Experience-Cloud fork.

## Operating rules

- **Scope from the request, not the org.** Derive the in-scope set — the objects and user populations
  whose access the feature touches — from the prompt first, and inventory only those plus **one
  collision hop** (the perm sets/profiles granting those objects, and the licenses the target users
  hold). Don't census the org. If the request is too vague to scope, ask one scoping question rather
  than inventorying to compensate. (Whole-org documentation is a separate, opt-in mode — see below.)
- **Verify, never guess.** Inventory sharing/permission metadata in `force-app/**` (`sharingRules/`,
  `profiles/`, `permissionsets/`, object `<sharingModel>`) and confirm against the org. **Licenses
  especially must be confirmed against the org** (`sf data query` on `UserLicense`/`PermissionSetLicense`)
  — the repo can't show what the org is entitled to. **If no org is connected, inventory the repo
  alone and flag the doc `repo-only`, and flag licensing as UNCONFIRMED** — never assume a license
  exists.
- **Inventory before recommend.** Existing permission sets and sharing rules are reuse candidates;
  record OWD and the role hierarchy before naming a gap.
- **Licensing absence is a finding, not a footnote.** "Target users hold Platform licenses; the
  feature needs full Sales Cloud" must surface in research — it can invalidate the whole approach.
- **Org-survey mode is opt-in.** Only when the user explicitly asks to document the whole org/domain
  (not a specific feature) do you drop the scope bound and inventory wholesale; the feature-scoped
  default above holds otherwise.

## Phases: Discover → Analyze → Document

1. **Discover.** **Set scope first** — from the feature request, list the objects and user populations
   in scope; everything below is bounded to those + one collision hop, not an org-wide census. Then
   capture org context (reachable? else `repo-only`). Then work the two reference
   checklists: access & sharing (OWD, roles, sharing rules, perm-sets-vs-profiles, FLS, record-level
   strategy), and licenses & compliance. Query the org for license entitlement; read the sharing
   metadata; ask the user only for intent (e.g. which user population this targets).
2. **Analyze.** Identify the record-level access strategy the requirement needs, reuse candidates
   (existing permission sets), and the **surprises that gate design** — a missing user/feature
   license, an OWD that blocks the intended visibility, a sharing model that can't reach the target
   records, guest access for an Experience Cloud surface. Resolve unknowns with `AskUserQuestion`.
3. **Document.** Write `docs/security-model.md` from the output contract below, ending with the
   design-gating **Surprises & constraints**.

## Reference files (read the one matching what you're inventorying)

| Inventorying… | Read |
|---|---|
| OWD, role hierarchy, sharing rules, permission-sets-vs-profiles, FLS, record-level access strategy, guest/community access | `references/access-and-sharing.md` |
| User & feature license inventory and whether target users have them, Shield/encryption, compliance | `references/licenses-and-compliance.md` |

Read both — the sharing model and the license entitlement both gate what `sf-plan` can design.

## Output contract — `docs/security-model.md`

Write these sections (omit one only if genuinely N/A). If no org was reachable, add a first line:
`> **Status: repo-only** — sharing verified against force-app/** only; LICENSING UNCONFIRMED (no org).`
Keep the doc **scoped to the feature** — a later feature appends its own in-scope findings, so this
is the union of what features have needed, not a complete org model.

- **Scope** — which objects/users the feature's access touches.
- **OWD & sharing** — org-wide default per in-scope object, and how it constrains visibility.
- **Roles & sharing rules** — relevant role-hierarchy branches and existing sharing rules.
- **Permission sets vs profiles** — the org's strategy and existing permission sets to reuse (API
  name) or the gap.
- **FLS** — field-level security requirements per sensitive field.
- **Record-level access** — the strategy the feature needs: criteria/owner-based sharing, manual,
  Apex managed sharing, or none.
- **License & feature inventory** — which user licenses the target population holds, which feature
  licenses/permission-set licenses the org has, and whether they cover the feature. Mark each
  *confirmed (org)* or *UNCONFIRMED (repo-only)*.
- **Compliance** — Shield/encryption, guest/community access, data-residency constraints.
- **Surprises & constraints** — the design-gating findings, **licensing gaps first** (the core
  surprise), then OWD/sharing blocks and guest-access needs.

## Cross-Skill Integration

| Need | Hand to |
|---|---|
| Design the sharing model / decide perm-set-vs-profile | `sf-plan` — **consumes** this doc |
| Build the permission set / FLS | `generating-permission-set` |
| Configure OAuth / Connected App for external access | `configuring-connected-apps` |
| The objects whose access is inventoried | `researching-data-model` |
| Guest access for an Experience Cloud surface | `researching-ui` |
