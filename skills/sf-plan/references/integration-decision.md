# Integration: choosing the right approach

> Part of `sf-plan` — see SKILL.md. Use this when a feature talks to a system outside the Salesforce
> org — a call **out**, a call **in**, data **sync**, or surfacing **external data**. Pick the most
> declarative option that meets the requirement; reach for Apex only when config can't express it.
> Authentication always goes through a **Named Credential** — never hardcode endpoints or secrets.
> Record each choice and its reason in the spec.

## Foundation — auth via Named Credentials (always)

- Every authenticated callout uses a **Named Credential** (endpoint URL + auth) backed by an
  **External Credential** (the authentication protocol). One definition, referenced from Apex, Flow,
  or External Services — keeping endpoints and secrets out of code and metadata.
- Use the **extensible, customizable Named Credentials** (Winter '23+). Legacy named credentials are
  no longer enhanced — don't build new integrations on them.
- Grant access with a **permission set**. Never put endpoints, tokens, or secrets in Apex, source, or
  plain-text custom settings.

## The declarative-first ladder (outbound)

1. **External Services — no code.** Register the external API's **OpenAPI 2.0/3.0** schema; its
   operations become invocable actions in Flow and callable from Apex. Start here for outbound REST
   when an OpenAPI spec is available.
2. **HTTP Callout action in Flow.** Declarative synchronous outbound REST when no full OpenAPI spec
   exists.
3. **Apex callout (via Named Credential).** Custom request/response logic, SOAP (consume the WSDL →
   generated proxy class), or anything the declarative options can't express.

## Pattern selection

Pick the pattern by the integration scenario, then implement it with the ladder above. (From
Salesforce's *Integration Patterns and Practices*.)

| Scenario | Pattern | Typical implementation |
|---|---|---|
| Outbound; you need the response now (synchronous) | Remote Process Invocation — **Request and Reply** | External Services / Flow HTTP Callout / Apex callout. From a UI action, an Apex **Continuation** keeps the UI responsive but raises no limit (see below) |
| Outbound; you don't wait for completion | Remote Process Invocation — **Fire and Forget** | **Platform Event** (preferred) or async Apex callout |
| An external system creates/reads/updates/deletes Salesforce data | **Remote Call-In** | Inbound REST / SOAP / Bulk / Pub-Sub API |
| Keep data aligned both directions, in bulk | **Batch Data Synchronization** | Bulk API / ETL / middleware on a schedule (off-platform) |
| The Salesforce UI must update when data changes | **UI Update Based on Data Changes** | **Platform Events / CDC** streamed over the Pub/Sub API (`empApi` in LWC) |
| Show external data without storing it | **Data Virtualization** | **Salesforce Connect + External Objects** |

**A Continuation is a UX choice, not a limits fix.** Since Winter '20 every callout is excluded from
the long-running-request limit, so a Continuation gains nothing there; Salesforce still recommends it
for responsiveness. It caps at 120 s and 3 callouts, and only one can be in progress per client. Work
longer than ~2 minutes must leave the request: return the result by Platform Event or a polled record.

**Callouts can't run in a trigger's synchronous context.** A fire-and-forget reaction to a data
change goes through a **Platform Event** or async Apex (Queueable), never a direct callout in the
trigger.

## Event-driven — Platform Events vs Change Data Capture

- **Platform Events** — custom-defined event messages for real-time integration between Salesforce
  and external systems; publish and subscribe via Apex, Flow, processes, or the **Pub/Sub API**. Use
  when *you* model the event payload (a decoupled, app-to-app business event).
- **Change Data Capture (CDC)** — auto-generated change events for record create/update/delete/
  undelete, delivered on the **same Pub/Sub event bus**. Use to keep an external system in step with
  Salesforce **record changes** without defining custom events.
- Both decouple producer from consumer. Choose **CDC** when the trigger is "a record changed";
  choose **Platform Events** when it's "a business event you define."
- **Neither respects record sharing.** CDC "ignores sharing settings and sends change events for all
  records of a Salesforce object", and its subscriber needs View All Records on the object (View All
  Data or View All Users for some objects). Every platform-event subscriber with Read on the event
  receives every message, so a correlation id in the payload is not authorization: never put data in
  an event that some subscriber may not see.
- **Delivery is counted per subscriber, not per event.** For `empApi` the delivery allocation is "per
  channel and per unique browser session", and each logged-in `empApi` user counts as one concurrent
  client. Size by concurrent users × channels.
- **Publish Immediately (the default) publishes even if the transaction rolls back**, so a subscriber
  can act on data that never committed. Choose Publish After Commit when the subscriber needs the
  committed record.
- **Publishing over REST, SOAP or Bulk API also spends daily API requests**; publishing from Pub/Sub
  API, Apex or Flow does not.
- **An LWC subscriber hears events only while a browser has it loaded.** A result that must land when
  nobody is watching needs a server-side subscriber (an Apex trigger on the event).

## Where it meets the rest of the design

- **External data on demand** — **Salesforce Connect + External Objects** map to external tables and
  read in real time; use it when you have a large volume you don't want to copy, need only small
  amounts at a time, and want the latest data (no stale copies). This is the data-model pack's
  **data-tiering / External Object** option seen from the integration side.
- **Bulk / batch loads** — for large one-off or scheduled data movement use the **Bulk API** or a
  tool (e.g. SFDMU), never row-by-row callouts.
- **Complex multi-system orchestration** belongs in **middleware** (e.g. MuleSoft) off-platform, not
  in Apex.

## Guardrails

- **Never hardcode** endpoints, tokens, or secrets — Named Credential + External Credential, always.
- **No callout in a loop, and none in a trigger's sync context** — aggregate and call once; react to
  data changes asynchronously (Platform Event / Queueable). Bulk-safe by construction (reviewed by
  `reviewing-apex`).
- **Design for failure** — idempotency (safe re-invocation), error handling, and retry/recovery;
  don't commit Salesforce changes until the remote success is confirmed. Assume at-least-once
  delivery: a callout answered `503` has been observed resent from Salesforce's egress, so give every
  non-idempotent endpoint a client-computed dedupe key.
- **Grant External Credential principal access** in the same permission set as the entry point; without
  it the callout fails for every non-admin. Post-install scripts run without it. The token a Named
  Credential mints never reaches Apex, so no design can forward it to browser code or another service.
- The integration **build** — the Named Credential / External Credential, External Service,
  Platform Event, or CDC plumbing plus any callout Apex — is authored directly at build time;
  this pack picks the *approach*.
- These criteria are maintained against official Salesforce docs; if a limit or capability looks like
  it may have changed, flag it for the maintainer rather than guessing.
