---
name: salesforce-lwc-quality
description: Use when reviewing or auditing Lightning Web Components after generation, or when the task is explicitly a code review. Covers component architecture, LDS/Apex/GraphQL data sourcing, template directives, async/event patterns, performance, and Jest testing. If the component has an Apex controller, also load salesforce-apex-quality. For creating or editing LWC, use generating-lwc-components instead.
---

# Salesforce LWC Quality

Invoke after generating any `lwc/**` or `aura/**` file and when reviewing LWC components. These are the patterns that work in a developer sandbox but fail in Lightning Web Security, Experience Cloud/LWR, or at scale.

**Cross-domain:** If this component has `@AuraEnabled` Apex methods backing it, also load `salesforce-apex-quality`. That skill covers the Apex side of the contract (its `references/aura-enabled.md` covers `@AuraEnabled` rules); this skill covers the LWC consumer side.

This skill complements `generating-lwc-components` (which covers how to produce a component) by specifying the quality bar it must meet.

---

### 1. Component Architecture and Data Sources

- Decide component architecture and data source **before** building. Compose small, single-responsibility components with minimal, explicit communication between them.
- Prefer Lightning base components and SLDS utility classes for forms, modals, spinners, buttons, comboboxes, radio groups, file inputs, and checkout UI. Check the SLDS library before writing vanilla HTML.
- Build accessible components: semantic SLDS markup, labels and ARIA attributes, full keyboard navigation. Do not ship UI less accessible than the base component it replaces.
- No hardcoded colors, spacing, or fonts. Use SLDS styling hooks (CSS custom properties) for theming and dark mode support. As of Spring '25, SLDS 2 replaces the old static design tokens (`$color-brand`) with global styling hooks (e.g., `--slds-c-button-brand-color-background`); new components should use SLDS 2 hook names — verify against the SLDS 2 documentation.
- Externalize user-facing text and configuration — never hardcode literals: `@api` properties for Experience Builder configuration and Commerce context (`effectiveAccountId`, `cartId`, `webstoreId`, `recordId`, labels, limits, display toggles); Custom Labels for text needing translation; Custom Metadata for other configurable text (button labels, modal text, errors, toasts).
- **Import object and field references from `@salesforce/schema`** — never hardcoded strings like `fields: ["Account.Name"]`. Imported references get compile-time validation, deletion protection, rename cascade, and automatic inclusion in packages and change sets.
- Keep component state minimal and derived. Use `@track` only where the LWC runtime or nested mutation pattern requires it.
  - **Single source of truth:** never store two fields representing the same logical state (e.g., `value` and `isPositive`) — derive the second with a getter.
  - Group fields that change together into one object (e.g., `{ data, error, loading }`) so dependent state cannot desync.
  - Move business logic to module-level functions outside the class body — testable in isolation, liftable into shared modules.
  - Prefer `@api` properties over `@api` methods — properties are settable declaratively from a parent template; methods force the parent to query the DOM first.

**Data source decision guide:**

| Use case | Source |
|---|---|
| Single-record read / simple CRUD | Lightning Data Service (`getRecord` / `lightning-record-form` / `lightning-record-edit-form`) |
| Complex server query or multi-object shaping | `@AuraEnabled(cacheable=true)` Apex |
| Related / graph-shaped data with pagination | GraphQL wire adapter |
| Cross-DOM communication | Lightning Message Service |

Prefer LDS over Apex for plain record CRUD — the framework manages cache and FLS for you. Same rule for metadata: use UI API wire adapters (`getObjectInfo`, `getPicklistValues`, list-view adapters) instead of Apex describe calls.

**Fetch discipline:**

- Request only the fields you need with `getRecord` — never layout-based requests, and never `getRecordUi` (its metadata payload is 100–1000× the data payload).
- One fetch per page: when several components need the same data, pass it down via `@api` or distribute it from a UI-less service component that queries once — never let each component independently re-query.
- Filter and sort data you already hold client-side (`Array.filter`/`sort`) instead of another server round trip.

**Shadow vs light DOM:** keep the default shadow DOM unless there is a stated reason. Light DOM (`renderMode = 'light'`) is for global styling, cross-component `id`/`aria` linking, analytics instrumentation, or SSR — never on components surfacing sensitive data (it removes encapsulation and exposes the DOM to scraping). For deep trees (custom datatables), prefer one shadow root at the top with light DOM children rather than a shadow boundary per row.

---

### 2. Template Directives

**`for:each` key must be a stable unique id from the data — never the loop index.** Using the index as the key breaks DOM reconciliation when the list is reordered or an item is removed.

```html
<!-- BAD — index key; reorder/delete corrupts the rendered rows -->
<template for:each={items} for:item="item" for:index="i">
    <li key={i}>{item.name}</li>
</template>

<!-- GOOD — stable id key -->
<template for:each={items} for:item="item">
    <li key={item.Id}>{item.name}</li>
</template>
```

**Use `lwc:if` / `lwc:elseif` / `lwc:else` for conditional rendering.** The old `if:true` / `if:false` directives are deprecated (Spring '23) and must not appear in new components. Use `iterator:it` only when you actually need first/last metadata.

**Wire-provisioned data is read-only (frozen).** Shallow-copy before editing — `this.editable = { ...this.record.data }` — and replace the object reference rather than mutating in place. Mutating the wire result directly throws under LWS and causes unpredictable re-renders. Never deep-copy with `JSON.parse(JSON.stringify(...))` — it blocks the main thread (>50 ms on large UI API objects) and doubles memory; a shallow copy of the level you edit is enough.

**Prefer `lwc:ref` + `this.refs` over `this.template.querySelector()`** for elements the component owns — it's the documented recommendation and skips the DOM scan. Constraints: refs are available in `renderedCallback` but not `connectedCallback`, and `lwc:ref` cannot be used inside `for:each`. Reserve `querySelector` for the cases refs can't cover (iterated rows, dynamic selectors).

---

### 3. Async, State, and Events

- `@wire` for reactive state and Salesforce data. Imperative calls for user-triggered mutations (add to cart, update delivery method, address selection, checkout payment, file upload, wishlist changes).
- Handle every failure path: wire adapters handle both `data` and `error` branches; imperative Apex uses `async`/`await` (not chained `.then()`) wrapped in `try/catch`. Surface failures through `ShowToastEvent`, inline state, or existing modal patterns.
  - **Normalize errors before display.** Wire errors, imperative Apex errors, and JS errors all have different shapes — run them through a `reduceErrors`-style utility (LWC Recipes `ldsUtils`) rather than reading `error.body.message` ad hoc, and render them through a shared error component, not one-off markup.
  - Place the error where it happened: inline (`reportValidity()` / `setCustomValidity()` on base form components) for field validation; toast for button-click actions or multi-source failures. Messages must say what failed and what the user can do.
  - Inside a wired function, wrap data **transformation** in `try/catch` — a transform bug otherwise masquerades as a wire/data error.
- No `console.log`, `debugger`, or temporary diagnostics in committed code. The one acceptable console call is `console.error` in a handled failure path — it preserves the stack trace.
- **Component communication is a ladder — use the lowest rung that works; never skip to the DOM:**
  - Parent ↔ child: `@api` properties/methods down, semantic custom events up — lowercase event names, clear `detail` payloads. Dispatch `CustomEvent` (never bare `Event`), even with no payload. Keep `detail` primitive where possible; copy any object/array before dispatching (a reference leaks private internal state to whoever catches it); for records, pass only the record Id. Use `bubbles` and `composed` only when the event must cross component boundaries — never as defaults. An event with both flags escapes the shadow DOM and can be intercepted by any ancestor, including components in other namespaces.
  - For lists, delegate: one handler on the container, not one listener per row.
  - Cross-tree: Lightning Message Service only where parent-child events are insufficient (e.g., checkout shipping method change). Always `unsubscribe(this._subscription)` in `disconnectedCallback` — an LMS subscription that is never torn down leaks memory and causes duplicate handling if the component reconnects. Keep payloads small (IDs, flags) and fetch full data separately. The same teardown rule applies to **any** listener on `window`/`document` or other elements outside the component's lifecycle: `removeEventListener` in `disconnectedCallback`.
  - Never reach into another component's internal DOM from outside its shadow root (e.g., `element.querySelector('c-child').template.querySelector(...)`). Cross-shadow-DOM access is blocked under both Locker and LWS.
- Never navigate with `window.location` — use `NavigationMixin` (`lightning/navigation`), and `GenerateUrl` for plain links.
- **Three refresh mechanisms — match the one to the stale cache:**
  - `refreshApex(this._wiredResult)` — re-fetch a `@wire`d **Apex** result after an imperative DML changed its data. (Retain the full wired result from the adapter, not just its `.data`.)
  - `notifyRecordUpdateAvailable(recordIds)` (`lightning/uiRecordApi`) — after imperative Apex mutates records that **LDS** adapters (`getRecord`, record forms) hold in cache.
  - RefreshView API (`lightning/refresh`) — coordinated refresh across component boundaries, including Aura and third-party data; containers participate via the `RefreshEvent`.
- Keep `.js-meta.xml` aligned with the component API: meaningful labels, descriptions, defaults, and targets for Experience Builder.

---

### 4. Performance

- **Lifecycle ordering — `constructor` → `@api`/`@wire` provisioning → `connectedCallback` → `render` → `renderedCallback` — has two reviewable consequences:** `@api` values are `undefined` in the constructor (read them in `connectedCallback` or later), and `@wire` data arrives asynchronously *after* connection — reading `this.wiredX.data` in `connectedCallback` sees `undefined`; react in the wired function/property or a getter instead.
- **No DOM manipulation in `constructor`** — the shadow DOM is not ready. `this.template.querySelector()` returns nothing there; move DOM access to `connectedCallback` or `renderedCallback`.
- **`connectedCallback` can fire more than once** (the element is moved in the DOM). Guard one-time init with a flag: `if (this._initialized) return; this._initialized = true;`.
- No reactive mutations inside `renderedCallback` — they trigger rerender loops. Gate any one-time DOM operation: `if (this._hasRendered) return; this._hasRendered = true;`.
- **Implement `errorCallback(error, stack)` on container components as an error boundary.** An unhandled error thrown in a child's lifecycle or rendering blanks the whole component subtree with no feedback. The boundary should log the error and render fallback UI (an inline error state or empty-state markup) instead of the broken children. Note it does not catch errors from the container's own template, event handlers, or async callbacks — those still need `try/catch`.
- Debounce expensive handlers (search input, keystroke handlers).
- `setTimeout`/`setInterval` are lint-restricted (`no-async-operation`). The legitimate uses are debouncing and polling an external resource — each needs a justifying comment with its `eslint-disable-next-line`, and any interval/timeout must be cleared in `disconnectedCallback`.
- Defer heavy work: show only what is needed first and expand large lists through pagination or infinite scroll; keep heavy or infrequently used modules out of the initial bundle with dynamic import — `import('c/heavyLibrary').then(module => { ... })`. Prefer declarative laziness first: App Builder component visibility filters and `lightning-tabset` (tabs instantiate on first activation). Note `lwc:if` destroys and recreates the subtree — state is lost on toggle; a CSS-toggle keeps state but pays full up-front instantiation.
- **Third-party libraries are guilty until proven necessary.** Question anything over ~30 KB minified+gzip; modern JS replaces the jQuery/Lodash/Moment class of utility, and UI frameworks (React, Bootstrap) must never run inside a component. When a library earns its place, prefer copying its ES module into the bundle (the LWC compiler minifies and transpiles it) over `loadScript`; use static resources + `lightning/platformResourceLoader` only for UMD builds or mixed JS/CSS assets, always minified.
- Components must pass `eslint-config-lwc` "recommended". Review against its key rules even without the tooling: `no-inner-html` (XSS), `no-document-query` (document-level queries can't see into shadow DOM), `no-api-reassignments` (`@api` values are owner-controlled — never reassign internally), `no-async-operation`, `no-leaky-event-listeners`.
- For datatables approaching the 50,000-row SOQL transaction limit, consider `Database.Cursor`. Otherwise use keyset pagination (`WHERE Id > :lastId ORDER BY Id LIMIT :pageSize`) — SOQL `OFFSET` caps at 2,000 rows.
- For large arrays with repeated lookups, use a JavaScript `Map` or `Set` for O(1) access.

---

### 5. LWC Testing (Jest)

- Cover loading, data, and error states for every wire-driven component.
- **Test black-box: assert on rendered DOM and dispatched events, never on internal fields.** `expect(element.shadowRoot.querySelector('lightning-spinner'))` — not `expect(component.isLoading)`. Never add an `@api` property just to make state reachable from a test; that freezes implementation detail into the public contract.
- **Test the component in a connected state.** Wire adapters only provision data when the component is in the DOM — `document.body.appendChild(element)` *before* emitting wire mocks, or assertions silently pass against `undefined`.
- **Clean up in `afterEach` with `document.body.removeChild(element)`.** A component instance shared across tests lets state from one test corrupt the next.
- **Emit wire values via `@salesforce/wire-service-jest-util`**, not hand-rolled module mocks — the utility simulates the adapter lifecycle (data and error states) correctly.
- **Derive LDS mock JSON from a real UI API snapshot** (Workbench or developer console) for `getRecord`/related-list adapters. Hand-crafted mocks with the wrong shape cause silent failures. Store mock data under `__tests__/data/`.
- **`await flushPromises()` before asserting** after emitting a wire value — `Promise.resolve()` is insufficient to flush multi-tick async chains.
- Run via `npm run test:unit`.

---

## Quick Reference — LWC

| Anti-pattern | Fix |
|---|---|
| LWC: wrong data source | LDS for CRUD, Apex for complex, GraphQL for graph-shaped |
| LWC: hardcoded object/field strings | Import references from `@salesforce/schema` |
| LWC: layout / `getRecordUi` requests | `getRecord` with only the fields you need |
| LWC: same data fetched per component | Pass down via `@api` or a UI-less service component; filter/sort client-side |
| LWC: duplicated state fields | Single source of truth; derive the rest with getters |
| LWC: light DOM on sensitive data | Keep shadow DOM; light DOM only for styling/a11y-linking/analytics/SSR |
| LWC: `for:each` index key | Use a stable id (`key={item.Id}`), never the loop index |
| LWC: `if:true`/`if:false` | Deprecated — use `lwc:if` / `lwc:elseif` / `lwc:else` |
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
