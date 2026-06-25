# External systems, directionality, and authentication

> Part of `sf-research` (integration domain) — see SKILL.md. Discovery, not design. Inventory
> existing plumbing before naming a gap; the external system's auth is a fact to discover, not a
> choice. If no org is connected, inventory the repo and flag `repo-only`. Bound the inventory to the
> in-scope external system(s) and the credentials/events already wired to them — don't catalog every
> integration in the org.

## The external system(s) and which way data flows

- **What system(s) does the feature talk to?** — name each, and what it does (CRM, ERP, payment,
  identity, etc.). The system owner is the source of truth for what it supports.
- **Directionality** — for each system, is it:
  - **Outbound** (Salesforce calls out — request/reply or fire-and-forget),
  - **Inbound** (the system calls into Salesforce — REST/SOAP/Bulk/Pub-Sub), or
  - **Bidirectional / sync** (data kept aligned both ways).
- **Sync vs async need** — does the user need the response *now* (synchronous), or is fire-and-forget
  acceptable? This shapes the limit and reliability analysis (see `format-and-limits.md`).

## Authentication the external system supports

This is the surprise to surface early — Salesforce must match what the system offers.

- **What auth does the system support?** — OAuth 2.0 (which grant?), JWT bearer, API key, mTLS/client
  certificate, basic. Ask the system owner; the repo can't tell you the remote side. The answer maps
  to the **External Credential** (authentication protocol) behind a **Named Credential**.
- **Per-user vs named-principal** — does each Salesforce user authenticate individually, or does the
  integration use one service principal? Affects the External Credential's principal type.
- For **inbound** (system → Salesforce), the auth is a Connected App / External Client App + OAuth —
  note it and hand the configuration to `configuring-connected-apps`.

## Existing credentials — don't rebuild plumbing

- **Named Credentials already configured** — search `force-app/**/namedCredentials/` (and
  `sf org list metadata --metadata-type NamedCredential`) for one whose endpoint points at an in-scope
  system; that's a reuse candidate. You're looking for the in-scope systems' plumbing, not a full list.
- **External Credentials** — `force-app/**/externalCredentials/`. Note the auth protocol/principals
  already set up.
- **Legacy named credentials** — distinguish the modern extensible Named Credentials (Winter '23+)
  from legacy ones; don't build new integrations on legacy. Flag if only legacy exists.
- **Remote site settings** — `force-app/**/remoteSiteSettings/` (pre-Named-Credential endpoints).
  Their presence signals integrations that predate Named Credentials.

## Secrets, certificates, allowlisting

- **Where do secrets live today?** — confirm they're in External Credentials / protected CMDT, never
  in Apex/source/plain custom settings. Flag any hardcoded endpoint or secret found
  (`grep -rniE "https?://|api[_-]?key|secret|token" force-app/**/classes/`).
- **Certificates** — `force-app/**/certs/` or `certificates/` for mTLS. Note what exists.
- **IP allowlisting** — does the remote system require Salesforce egress IPs to be allowlisted?
  Ask the system owner; record it as a deployment dependency.

## What to hand to the doc

Per system: directionality + sync/async → **External systems & directionality**. Supported auth +
existing Named/External Credentials (or the gap) + secret/cert location → **Auth & credentials**.
Unsupported-auth mismatches, legacy-only plumbing, and allowlisting dependencies → **Surprises &
constraints**.
