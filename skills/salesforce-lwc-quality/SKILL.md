---
name: salesforce-lwc-quality
description: Use when reviewing or auditing Lightning Web Components after generation, or when the task is explicitly a code review. Covers component architecture, LDS/Apex/GraphQL data sourcing, template directives, async/event patterns, performance, and Jest testing. If the component has an Apex controller, also load salesforce-apex-quality. For creating or editing LWC, use generating-lwc-components instead.
---

# Salesforce LWC Quality

Invoke after generating any `lwc/**` or `aura/**` file and when reviewing LWC components. These are the patterns that work in a developer sandbox but fail in Lightning Web Security, Experience Cloud/LWR, or at scale.

**Cross-domain:** If this component has `@AuraEnabled` Apex methods backing it, also load `salesforce-apex-quality`. That skill covers the Apex side of the contract (§5 of `salesforce-apex-quality` covers `@AuraEnabled` rules); this skill covers the LWC consumer side.

This skill complements `generating-lwc-components` (which covers how to produce a component) by specifying the quality bar it must meet.

---

### 10. Component Architecture and Data Sources

- Decide component architecture and data source **before** building. Compose small, single-responsibility components with minimal, explicit communication between them.
- Prefer Lightning base components and SLDS utility classes for forms, modals, spinners, buttons, comboboxes, radio groups, file inputs, and checkout UI. Check the SLDS library before writing vanilla HTML.
- Build accessible components: semantic SLDS markup, labels and ARIA attributes, full keyboard navigation. Do not ship UI less accessible than the base component it replaces.
- No hardcoded colors, spacing, or fonts. Use SLDS styling hooks (CSS custom properties) for theming and dark mode support. As of Spring '25, SLDS 2 replaces the old static design tokens (`$color-brand`) with global styling hooks (e.g., `--slds-c-button-brand-color-background`); new components should use SLDS 2 hook names — verify against the SLDS 2 documentation.
- `@api` properties for Experience Builder configuration and Commerce context (`effectiveAccountId`, `cartId`, `webstoreId`, `recordId`, labels, limits, display toggles).
- Keep component state minimal and derived. Use `@track` only where the LWC runtime or nested mutation pattern requires it.

**Data source decision guide:**

| Use case | Source |
|---|---|
| Single-record read / simple CRUD | Lightning Data Service (`getRecord` / `lightning-record-form` / `lightning-record-edit-form`) |
| Complex server query or multi-object shaping | `@AuraEnabled(cacheable=true)` Apex |
| Related / graph-shaped data with pagination | GraphQL wire adapter |
| Cross-DOM communication | Lightning Message Service |

Prefer LDS over Apex for plain record CRUD — the framework manages cache and FLS for you.

---

### 11. Template Directives

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

**Wire-provisioned data is read-only (frozen).** Shallow-copy before editing — `this.editable = { ...this.record.data }` — and replace the object reference rather than mutating in place. Mutating the wire result directly throws under LWS and causes unpredictable re-renders.

---

### 12. Async, State, and Events

- `@wire` for reactive state and Salesforce data. Imperative calls for user-triggered mutations (add to cart, update delivery method, address selection, checkout payment, file upload, wishlist changes).
- Prefer `async`/`await` over chained `.then()` calls for imperative Apex. `try/catch` for error handling.
- Always handle both `data` and `error` branches for wire adapters and promises. Surface failures through `ShowToastEvent`, inline state, or existing modal patterns.
- No `console.log`, `debugger`, or temporary diagnostics in committed code.
- Custom Labels (when translations are needed) or Custom Metadata for button labels, modal text, errors, and toasts — unless the component has builder-configured text properties.
- Dispatch semantic custom events: lowercase event names, clear `detail` payloads. Use `bubbles` and `composed` only when the event must cross component boundaries — never as defaults. An event with both flags escapes the shadow DOM and can be intercepted by any ancestor, including components in other namespaces.
- Lightning Message Service only for cross-tree communication (e.g., checkout shipping method change) where parent-child events are insufficient. Always `unsubscribe(this._subscription)` in `disconnectedCallback` — an LMS subscription that is never torn down leaks memory and causes duplicate handling if the component reconnects. Keep payloads small (IDs, flags) and fetch full data separately.
- After an imperative DML call that changes data a `@wire` adapter returned, call `refreshApex(this._wiredResult)` to invalidate the cache and re-fetch. (Retain the full wired result from the adapter, not just its `.data`.)
- Keep `.js-meta.xml` aligned with the component API: meaningful labels, descriptions, defaults, and targets for Experience Builder.

---

### 13. Performance

- Understand the LWC lifecycle: `constructor` → `connectedCallback` → `render` → `renderedCallback`. Wire adapters propagate with the lifecycle.
- **No DOM manipulation in `constructor`** — the shadow DOM is not ready. `this.template.querySelector()` returns nothing there; move DOM access to `connectedCallback` or `renderedCallback`.
- **`connectedCallback` can fire more than once** (the element is moved in the DOM). Guard one-time init with a flag: `if (this._initialized) return; this._initialized = true;`.
- No reactive mutations inside `renderedCallback` — they trigger rerender loops. Gate any one-time DOM operation: `if (this._hasRendered) return; this._hasRendered = true;`.
- Debounce expensive handlers (search input, keystroke handlers).
- Lazy-load heavy work or large lists. Show only what is needed first, then expand through pagination or infinite scroll.
- For heavy or infrequently used modules, use dynamic import — `import('c/heavyLibrary').then(module => { ... })` — to keep them out of the initial bundle.
- Never reach into another component's internal DOM from outside its shadow root (e.g., `element.querySelector('c-child').template.querySelector(...)`). Cross-shadow-DOM access is blocked under both Locker and LWS; communicate via public `@api` methods and events instead.
- For datatables approaching the 50,000-row SOQL transaction limit, consider `Database.Cursor`. Otherwise use keyset pagination (`WHERE Id > :lastId ORDER BY Id LIMIT :pageSize`) — SOQL `OFFSET` caps at 2,000 rows.
- For large arrays with repeated lookups, use a JavaScript `Map` or `Set` for O(1) access.

---

### 14. LWC Testing (Jest)

- Mock `@wire` adapters and Apex imports. Await DOM updates before asserting. Cover loading, data, and error states for every wire-driven component.
- **Test the component in a connected state.** Wire adapters only provision data when the component is in the DOM — `document.body.appendChild(element)` *before* emitting wire mocks, or assertions silently pass against `undefined`.
- **Clean up in `afterEach` with `document.body.removeChild(element)`.** A component instance shared across tests lets state from one test corrupt the next.
- **Emit wire values via `@salesforce/wire-service-jest-util`**, not hand-rolled module mocks — the utility simulates the adapter lifecycle (data and error states) correctly.
- **Derive LDS mock JSON from a real UI API snapshot** (Workbench or developer console) for `getRecord`/related-list adapters. Hand-crafted mocks with the wrong shape cause silent failures. Store mock data under `__tests__/data/`.
- **`await flushPromises()` before asserting** after emitting a wire value — `Promise.resolve()` is insufficient to flush multi-tick async chains.
- Run via `npm run test:unit`.
- Treat LWC as running in Lightning Web Security and Experience Cloud/LWR — not plain browser JavaScript.

---

## Quick Reference — LWC

| Anti-pattern | Fix |
|---|---|
| LWC: wrong data source | LDS for CRUD, Apex for complex, GraphQL for graph-shaped |
| LWC: `for:each` index key | Use a stable id (`key={item.Id}`), never the loop index |
| LWC: `if:true`/`if:false` | Deprecated — use `lwc:if` / `lwc:elseif` / `lwc:else` |
| LWC: mutating wire data | Shallow-copy first (`{ ...data }`); wire data is frozen |
| LWC: DOM access in constructor | Move to `connectedCallback` or `renderedCallback` |
| LWC: connectedCallback fires twice | Guard with `if (this._initialized) return` |
| LWC: renderedCallback mutation | Gate with `if (this._hasRendered) return`; avoid reactive mutations there |
| LWC: no error branch | Handle both `data` and `error` on every wire / promise |
| LWC: stale UI after DML | `refreshApex` the wired result |
| LWC: LMS subscription leak | `unsubscribe(this._subscription)` in `disconnectedCallback` |
| LWC: cross-shadow DOM access | Communicate via `@api` methods and events |
| LWC: hardcoded SLDS tokens | Use SLDS 2 styling hooks (CSS custom properties) |
| LWC: bubbles+composed by default | Set only when the event must cross component namespace boundaries |
| LWC test: wire never emits | Append to `document.body` first; `await flushPromises()` |
| LWC test: stale state between tests | `document.body.removeChild(element)` in `afterEach` |
| LWC test: hand-rolled LDS mock | Derive from real UI API snapshot; use wire-service-jest-util |
