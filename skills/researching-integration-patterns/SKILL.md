---
name: researching-integration-patterns
description: "Salesforce integration discovery — maps the external system(s) a feature talks to: directionality (in/out), the authentication the system actually supports, existing Named/External Credentials, data format & OpenAPI/WSDL availability, volume/frequency vs the limits, reliability needs (idempotency/retry), and event-vs-CDC fit — then writes a state-of-the-world docs/integration-patterns.md a human reviews before planning. Surfaces auth and limit surprises before sign-off, not mid-build. TRIGGER when: starting research on a feature that calls an external system, receives inbound calls, syncs data, or surfaces external data, or asked to inventory an org's integrations/Named Credentials before a design. DO NOT TRIGGER when: choosing the approach (use sf-plan) or building the plumbing (use building-sf-integrations / configuring-connected-apps)."
allowed-tools: Read, Grep, Glob, Bash, AskUserQuestion
---

# Salesforce Integration Research

Discover and document how a feature connects to systems outside the org — what the external system
is, which way data flows, what auth it supports, and what plumbing already exists — so planning
doesn't rebuild credentials or pick an approach the system can't support. This skill is discovery
only; it does **not** choose the approach (`sf-plan`'s job) or build the plumbing
(`building-sf-integrations`'s job). Its output is `docs/integration-patterns.md`, reviewed by a human
before `sf-plan` plans.

**Cross-domain:** the Salesforce-side data model the integration reads/writes belongs to
`researching-data-model`; the Apex/async pattern that runs the callout belongs to
`researching-automation`; OAuth/Connected-App config for inbound auth belongs to
`configuring-connected-apps` (note it here, configure it there).

## Operating rules

- **Scope from the request, not the org.** Derive the in-scope set — the external systems the feature
  talks to — from the prompt first, and inventory only those plus **one collision hop** (the
  credentials and events already wired to them). Don't census the org. If the request is too vague to
  scope, ask one scoping question rather than inventorying to compensate. (Whole-org documentation is
  a separate, opt-in mode — see below.)
- **Verify, never guess.** Inventory existing integration metadata in `force-app/**` (Named
  Credentials, External Credentials, External Services, remote site settings) and confirm against the
  org where possible. **If no org is connected, inventory the repo alone and flag the doc
  `repo-only`.** Don't assume an auth method or an OpenAPI spec exists — confirm it with the system
  owner via `AskUserQuestion` if the repo/org can't show it.
- **Inventory before recommend.** Existing Named/External Credentials are reuse candidates — don't
  rebuild plumbing the org already has. Record what's configured before naming a gap.
- **The external system's constraints are facts, not preferences.** What auth it supports, whether it
  publishes an OpenAPI/WSDL spec, and its rate limits are discovered (asked of the system owner if
  needed), not chosen.
- **Org-survey mode is opt-in.** Only when the user explicitly asks to document the whole org/domain
  (not a specific feature) do you drop the scope bound and inventory wholesale; the feature-scoped
  default above holds otherwise.

## Phases: Discover → Analyze → Document

1. **Discover.** **Set scope first** — from the feature request, list the external systems in scope;
   everything below is bounded to those + one collision hop, not an org-wide census. Then capture org
   context (reachable? else `repo-only`). Then work the two reference
   checklists: the external systems + auth they support + existing credentials, and the data
   format + limits + reliability needs. Read the integration metadata; ask the system owner only what
   the repo/org can't reveal.
2. **Analyze.** Identify reuse (existing Named/External Credentials), the **surprises that gate
   design** — an auth method Salesforce must match, no OpenAPI spec (rules out External Services),
   volume that blows the per-transaction or daily callout limits, a sync requirement that can't run
   from a trigger — and the event-vs-CDC fit. Resolve unknowns with `AskUserQuestion`.
3. **Document.** Write `docs/integration-patterns.md` from the output contract below, ending with the
   design-gating **Surprises & constraints**.

## Reference files (read the one matching what you're inventorying)

| Inventorying… | Read |
|---|---|
| External system(s), directionality, auth the system supports, existing Named/External Credentials, secrets / IP allowlisting / certificates | `references/systems-and-auth.md` |
| Data format & OpenAPI/WSDL availability, volume/frequency vs limits, sync vs async, idempotency/retry, Platform Events vs CDC, middleware, SLA/latency, PII/compliance | `references/format-and-limits.md` |

Read both — auth and limits both gate the approach `sf-plan` can choose.

## Output contract — `docs/integration-patterns.md`

Write these sections (omit one only if genuinely N/A). If no org was reachable, add a first line:
`> **Status: repo-only** — integration metadata verified against force-app/** only, not org-confirmed.`
Keep the doc **scoped to the feature** — a later feature appends its own in-scope findings, so this
is the union of what features have needed, not a complete org model.

- **Scope** — which external system(s) the feature integrates with, and the business reason.
- **External systems & directionality** — per system: name, outbound/inbound/bidirectional, what it
  does, sync-vs-async need.
- **Auth & credentials** — the auth the system supports (OAuth/JWT/API key/mTLS), existing Named/
  External Credentials to reuse (API name) or the gap, and where secrets/certs live.
- **Format & contract availability** — payload format (JSON/XML/SOAP) and whether an OpenAPI/WSDL
  spec exists (drives External Services vs Flow HTTP vs Apex).
- **Volume vs limits** — expected frequency/volume against the per-transaction (100 callouts) and
  daily API limits; real-time vs batch.
- **Reliability** — idempotency, retry, and failure-recovery expectations; transactional boundary
  (don't commit before remote success).
- **Events vs CDC** — if event-driven, whether Platform Events (business event) or CDC (record
  changed) fits.
- **Compliance** — SLA/latency, PII, data residency, Shield, IP allowlisting.
- **Surprises & constraints** — the design-gating findings: unsupported auth, missing spec, limit
  pressure, trigger-context callout constraint, middleware in the landscape.

## Cross-Skill Integration

| Need | Hand to |
|---|---|
| Choose the integration approach (External Services / Flow HTTP / Apex / Platform Event / CDC) | `sf-plan` (integration decision pack) — **consumes** this doc |
| Build the Named Credential / External Service / Platform Event / CDC plumbing | `building-sf-integrations` |
| Configure Connected App / OAuth for inbound auth | `configuring-connected-apps` |
| The Salesforce data model the integration reads/writes | `researching-data-model` |
| The Apex/async pattern that runs the callout | `researching-automation` |
