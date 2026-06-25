# Data format, limits, reliability, and event fit

> Part of `researching-integration-patterns` — see SKILL.md. Discovery, not design. The contract
> availability and the volume-vs-limits picture decide which approaches are even possible — capture
> them so `sf-plan` chooses from a real set. Everything here is about the in-scope integration(s) —
> no org-wide inventory.

## Data format and contract availability

This drives the whole declarative-vs-code ladder — discover it first.

- **Payload format** — JSON, XML, SOAP, CSV? Ask the system owner / read sample payloads.
- **Is there an OpenAPI 2.0/3.0 spec?** — if yes, **External Services** (no code) is on the table.
  Get the spec URL/file from the system owner.
- **Is there a WSDL?** — SOAP with a WSDL means a generated Apex proxy; note it.
- **No spec at all** — then the realistic options are Flow HTTP Callout or Apex. Record the absence;
  it's a design-gating fact.

## Volume and frequency vs the limits

Limits turn a clean design into a redesign mid-build — quantify them in research.

- **How often, how much?** — per-transaction count, peak/day, payload size. Ask the system owner and
  estimate from the data volumes (`researching-data-model`).
- **Against the limits** — flag pressure on: **100 callouts per transaction**, the **daily API
  request limit**, callout timeout (120s), and heap. A per-record callout over a bulk operation is a
  classic blow-up — note it.
- **Real-time vs batch** — large or scheduled movement points at **Bulk API / ETL / middleware**, not
  row-by-row callouts. Record which regime the volume implies.

## Reliability — idempotency, retry, recovery

- **Idempotency** — can the remote call be safely re-invoked without double-effect? Note whether the
  system supports an idempotency key.
- **Retry & failure recovery** — what happens on timeout/failure? Capture the expected behavior
  (retry, dead-letter, manual replay).
- **Transactional boundary** — the rule is *don't commit Salesforce changes until remote success is
  confirmed*. Note any existing pattern (e.g. staging records, status fields) the design should follow.

## Event-driven fit — Platform Events vs CDC

If the integration reacts to changes or pushes events:

- **Change Data Capture (CDC)** — when the trigger is "a record changed" and an external system must
  stay in step. Check existing CDC channels (`force-app/**` platform event/CDC config).
- **Platform Events** — when it's "a business event you define" (decoupled app-to-app). Check
  existing `*__e` events (`force-app/**/objects/*__e/`).
- Record which fits and whether the channel already exists.

## Middleware, SLA, and compliance

- **Middleware in the landscape** — is there a MuleSoft / iPaaS layer that should own complex
  multi-system orchestration rather than Apex? Ask; record it.
- **SLA / latency** — the response-time expectation; feeds the sync-vs-async call.
- **PII & compliance** — does the payload carry PII? Note Shield/encryption needs and data-residency
  constraints (where data may travel).

## What to hand to the doc

Format + spec availability → **Format & contract availability**. Volume/frequency vs limits →
**Volume vs limits**. Idempotency/retry/boundary → **Reliability**. Event fit → **Events vs CDC**.
SLA/PII/residency → **Compliance**. Missing spec, limit pressure, and middleware-owned orchestration
→ **Surprises & constraints**.
