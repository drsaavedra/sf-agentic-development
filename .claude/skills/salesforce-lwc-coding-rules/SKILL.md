---
name: salesforce-lwc-coding-rules
description: Use when writing or reviewing Lightning Web Components or Aura components (lwc/**, aura/**) — Salesforce LWC coding standards covering component architecture, base components, accessibility, SLDS, data sources, wire adapters, async patterns, performance, and Jest testing.
---

# Salesforce LWC Coding Rules

- Decide the component architecture and data source before building. Compose small, single-responsibility components and keep the communication between them explicit and minimal.
- Prefer Lightning base components and SLDS utility classes for forms, modals, spinners, buttons, comboboxes, radio groups, file inputs, and checkout UI. Check the SLDS library first before going to vanilla HTML elements.
- Build accessible components. Use semantic SLDS markup and base components, provide labels and ARIA attributes where needed, and support full keyboard navigation. Do not ship custom UI that is less accessible than the base component it replaces.
- Do not hardcode colors, spacing, or fonts. Use SLDS styling hooks (CSS custom properties) so components inherit theming and support dark mode.
- Use public `@api` properties for Experience Builder configuration and parent-to-child Commerce context such as `effectiveAccountId`, `cartId`, `webstoreId`, `recordId`, labels, limits, and display toggles.
- Keep component state minimal and derived when possible. Use `@track` only where the current LWC runtime or nested mutation pattern requires it.
- Choose the data source deliberately. Use Lightning Data Service (`getRecord`/`getRecords`) or `lightning-record-form` and `lightning-record-edit-form` for single-record reads and simple CRUD; `@AuraEnabled(cacheable=true)` Apex for complex server queries or multi-object shaping; the GraphQL wire adapter for related or graph-shaped data with pagination; and Lightning Message Service for cross-DOM communication. Prefer LDS over Apex for plain record CRUD so the framework manages cache and FLS for you.
- Use `@wire` for reactive state and Salesforce data; use imperative calls for user-triggered mutations such as add to cart, update delivery method, address selection, checkout payment, file upload, or wishlist changes.
- Prefer `async`/`await` over chained `.then()` calls to control the sequence of asynchronous events and keep the flow readable, with `try/catch` for error handling. This matters most when calling imperative Apex methods, and in the uncommon case of calling an external API directly from JavaScript, where ordering and error control really show their value.
- Always handle both `data` and `error` branches for wire adapters and promises. Surface user-facing failures through `ShowToastEvent`, inline state, or existing modal patterns.
- Do not leave `console.log`, `debugger`, or noisy temporary diagnostics in committed LWC code.
- Use Custom Labels (when translations are needed) or a Custom Metadata driven approach for errors, button labels, modal text, and toast messages unless the component is explicitly builder-configured with text properties.
- Dispatch semantic custom events for parent workflows, using lowercase event names and clear `detail` payloads. Use `bubbles` and `composed` only when the event must cross component boundaries.
- Use Lightning Message Service only for cross-tree communication, such as checkout shipping method changes, where parent-child events are not sufficient.
- Keep `.js-meta.xml` builder properties aligned with the component API. Include meaningful labels, descriptions, defaults, and targets for Experience Builder usage.
- Keep in mind that LWC has a different lifecycle from React or other UI frameworks. Make sure wire usage follows the lifecycle accordingly: `constructor()`, `connectedCallback()`, `render()`, `renderedCallback()`, and the propagation of hooks from creation to render on the DOM.
- Protect render performance. Avoid reactive mutations inside `renderedCallback()` that trigger rerender loops, debounce expensive handlers such as search and keystroke input, and lazy-load heavy work or large lists.
- When loading data for a datatable, account for both backend retrieval time and frontend rendering cost. Show only what is needed first, then expand the table through pagination or infinite scroll.
- When a datatable's SOQL would exceed the 50,000-row transaction limit, consider `Database.Cursor`, but keep in mind there are documented limits on cursors and cursor rows per 24-hour window. Evaluate with the developer whether the business case genuinely warrants a cursor. Otherwise, use keyset pagination, ordering by `Id` or another ordered field and seeking past the last fetched value (for example `WHERE Id > :lastId ORDER BY Id LIMIT :pageSize`), since SOQL `OFFSET` caps at 2000 rows.
- For arrays that grow very large, use a JavaScript `Map` or `Set` to turn repeated lookups and membership checks into O(1) instead of O(n) array scans. This is case-specific: the structure costs O(n) to build plus extra memory, so it only pays off at large N where you do repeated lookups against the same collection.
- For Jest unit tests, mock `@wire` adapters and Apex imports, await DOM updates before asserting, cover the loading, data, and error states, and run via `npm run test:unit`.
- If asked to test LWC via Jest, use `npm run test:unit`.
- Treat Lightning Web Components as Salesforce LWC running in Lightning Web Security and Experience Cloud/LWR, not plain browser JavaScript.
