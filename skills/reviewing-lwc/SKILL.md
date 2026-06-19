---
name: reviewing-lwc
description: "Use when reviewing or auditing Lightning Web Components — a review pass over existing or freshly built components, run as a discrete step at the end of a build or on demand, not chained onto every edit. Covers component architecture, LDS/Apex/GraphQL data sourcing, template directives, async/event patterns, performance, and Jest testing. Detailed rules live in references/ — read the file(s) matching the artifact's domains. If the component has an Apex controller, also load reviewing-apex. TRIGGER when: the task is to review or audit LWC, or to review a completed build before deploy. DO NOT TRIGGER as the authoring skill, and do not auto-fire after each generated file — for creating or editing LWC use generating-lwc-components."
---

# Salesforce LWC Quality

Invoke when reviewing or auditing LWC components — as the end-of-build quality pass or on demand. These are the patterns that work in a developer sandbox but fail in Lightning Web Security, Experience Cloud/LWR, or at scale.

**Cross-domain:** an `@AuraEnabled` Apex controller pairs with `reviewing-apex` — see Cross-Skill Integration below.

This skill complements `generating-lwc-components` (which covers how to produce a component) by specifying the quality bar it must meet.

**Schema truth:** flag any guessed object, field, or relationship API name (including `@salesforce/schema` imports). Verify names against local metadata (`force-app/**`) first, then the org — the org wins on divergence. Use read-only sf CLI commands (`sf sobject describe`, `sf data query`) to confirm; never rely on Developer Console snippets.

## Quick Reference (always apply)

Scan every artifact against this checklist.

| Anti-pattern | Fix |
|---|---|
| LWC: wrong data source | LDS for CRUD, Apex for complex, GraphQL for graph-shaped |
| LWC: hardcoded object/field strings | Import references from `@salesforce/schema` |
| LWC: layout / `getRecordUi` requests | `getRecord` with only the fields you need |
| LWC: same data fetched per component | Pass down via `@api` or a UI-less service component; filter/sort client-side |
| LWC: duplicated state fields | Single source of truth; derive the rest with getters |
| LWC: public `@api` Boolean initialized to `true` | Default it `false` (else `LWC1503`); invert the property name or derive the effective value with a getter |
| LWC: light DOM on sensitive data | Keep shadow DOM; light DOM only for styling/a11y-linking/analytics/SSR |
| LWC: `for:each` index key | Use a stable id (`key={item.Id}`), never the loop index |
| LWC: `if:true`/`if:false` | Superseded, slated for removal — use `lwc:if` / `lwc:elseif` / `lwc:else` |
| LWC: mutating wire data | Shallow-copy first (`{ ...data }`); wire data is frozen |
| LWC: `JSON.parse(JSON.stringify())` copy | Shallow-copy the level you edit; never JSON round-trip |
| LWC: `querySelector` for owned elements | `lwc:ref` + `this.refs` (not in `connectedCallback` or `for:each`) |
| LWC: DOM access in constructor | Move to `connectedCallback` or `renderedCallback` |
| LWC: connectedCallback fires twice | Guard with `if (this._initialized) return` |
| LWC: renderedCallback mutation | Gate with `if (this._hasRendered) return`; avoid reactive mutations there |
| LWC: `@api`/wire read too early | `@api` is `undefined` in the constructor; wire data arrives after connection — react in the wired function or a getter |
| LWC: no error boundary | `errorCallback(error, stack)` on the container; log and render fallback UI |
| LWC: no error branch | Handle both `data` and `error` on every wire / promise |
| LWC: raw error in UI | Normalize via `reduceErrors`-style util; shared error component |
| LWC: custom form validation UI | `reportValidity()` / `setCustomValidity()` on base components |
| LWC: stale UI after DML | `refreshApex` (wired Apex) / `notifyRecordUpdateAvailable` (LDS) / RefreshView API (cross-component) |
| LWC: bare `Event` / object in `detail` | `CustomEvent` with primitive payload; copy objects; pass record Id only |
| LWC: `window.location` navigation | `NavigationMixin` from `lightning/navigation` |
| LWC: LMS subscription leak | `unsubscribe(this._subscription)` in `disconnectedCallback` |
| LWC: window/document listener leak | `removeEventListener` in `disconnectedCallback` |
| LWC: cross-shadow DOM access | Communicate via `@api` methods and events |
| LWC: hardcoded SLDS tokens | Use SLDS 2 styling hooks (CSS custom properties) |
| LWC: bubbles+composed by default | Set only when the event must cross component namespace boundaries |
| LWC: unjustified `setTimeout`/`setInterval` | Lint-restricted; debounce/poll only, with cleanup in `disconnectedCallback` |
| LWC: heavy third-party library | Justify >30 KB min+gzip; modern JS first; ESM copy over `loadScript` |
| LWC test: asserting internal state | Black-box: assert DOM and events; never add `@api` for tests |
| LWC test: wire never emits | Append to `document.body` first; `await flushPromises()` |
| LWC test: stale state between tests | `document.body.removeChild(element)` in `afterEach` |
| LWC test: hand-rolled LDS mock | Derive from real UI API snapshot; use wire-service-jest-util |

## Detailed Rules (read the file matching the artifact)

Load a reference file when either applies:
- the artifact **contains** that domain (an `.html` template → templates-dom; `@wire`/`getRecord`/Apex imports or `.css` → architecture-data; `dispatchEvent`/LMS/imperative Apex → async-events-errors; lifecycle hooks or third-party libraries → lifecycle-performance; a `__tests__/` file → testing), or
- the Quick Reference scan **flags a suspected violation** and you need the detailed *why it fails* / *fix* to confirm and explain it.

| Artifact contains / suspicion | Read |
|---|---|
| Data sourcing (LDS / Apex / GraphQL), `@salesforce/schema`, state design, SLDS styling, accessibility, light DOM | `references/architecture-data.md` |
| `.html` templates — `for:each` keys, conditionals, wire-data copies, `lwc:ref` / `querySelector` | `references/templates-dom.md` |
| Imperative Apex, error handling, `CustomEvent` / LMS, navigation, cache refresh, `.js-meta.xml` | `references/async-events-errors.md` |
| Lifecycle hooks, `errorCallback`, timers, lazy loading, third-party libraries, large lists/datatables, lint baseline | `references/lifecycle-performance.md` |
| Jest tests (`__tests__/*.test.js`) | `references/testing.md` |
| B2B Commerce storefront LWC — Storefront APIs, checkout adapters, product/search/quick-order, storefront caching & performance | `references/commerce-b2b.md` | <!-- domain:commerce -->

A component usually spans several domains — read every file that applies before delivering the review.

## Cross-Skill Integration

This skill owns the LWC side of a review. Delegate the rest:

| Need | Delegate to |
|---|---|
| Component is backed by an `@AuraEnabled` Apex controller | `reviewing-apex` — load alongside; this skill reviews the consumer, `reviewing-apex` reviews the Apex contract |
| Author or edit the component under review | `generating-lwc-components` |
| Audit the component for SLDS compliance | `validating-slds` |
| Static analysis (ESLint, RetireJS) over the reviewed code | `running-code-analyzer` |
