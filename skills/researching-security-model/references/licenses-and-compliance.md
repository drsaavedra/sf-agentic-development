# License and feature inventory, and compliance

> Part of `researching-security-model` — see SKILL.md. This is the surprise the whole research stage
> is named for: "we don't have that license" must surface here, not mid-build. Licensing can only be
> confirmed against the org — if no org is connected, mark every license **UNCONFIRMED (repo-only)**.

## Why this gates the design

Licensing gates *features*, not just object access. A feature can be perfectly designed and still be
unbuildable because the target users hold Platform licenses (no standard CRM objects), or the org
lacks the Experience Cloud / CPQ / Field Service entitlement the feature assumes. Catch it in research.

## User licenses the target population holds

- **What user licenses exist, and who has which?** — query the org:
  - `sf data query --query "SELECT Name, TotalLicenses, UsedLicenses FROM UserLicense"` — what the org
    is provisioned for.
  - `sf data query --query "SELECT Profile.UserLicense.Name, COUNT(Id) FROM User WHERE IsActive = true GROUP BY Profile.UserLicense.Name"`
    — what the active users actually hold.
- **Does the target population's license support the feature?** — e.g. a **Salesforce Platform**
  license can't access standard CRM objects (Opportunity, Case, etc.); a feature touching those needs
  full licenses. Ask the user which population the feature targets, then check their license covers it.

## Feature & permission-set licenses

- **What feature licenses does the org hold?** —
  `sf data query --query "SELECT MasterLabel, Status FROM PermissionSetLicense"` and the org's
  Company Information / feature settings. Confirm entitlement for anything the feature assumes:
  Experience Cloud, CPQ/Revenue Cloud, Field Service, Sales/Service Cloud add-ons, CMS, etc.
- **Are the seats available?** — a license existing but fully consumed (UsedLicenses = TotalLicenses)
  is still a blocker; note utilization.
- **Add-on / managed-package licenses** — if the feature depends on a managed package (e.g. CPQ),
  confirm the package is installed and licensed.

## Compliance and encryption

- **Shield Platform Encryption** — is it enabled, and would the feature's fields need encryption?
  Encrypted fields carry query/automation constraints — flag them.
- **Data residency** — any requirement that data stay in a region; relevant for integrations
  (cross-ref `researching-integration-patterns`) and storage choices.
- **Audit / compliance regime** — note any HIPAA/GDPR/FINRA-style constraint that shapes access and
  retention.

## What to hand to the doc

User-license holdings + feature/permission-set-license entitlement, each marked *confirmed (org)* or
*UNCONFIRMED (repo-only)* → **License & feature inventory**. Shield/residency/audit → **Compliance**.
**Any license gap is the first entry in Surprises & constraints** — it can invalidate the approach,
so it leads the human review.
