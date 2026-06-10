# Async, State, Events, and Error Handling

> Part of `salesforce-lwc-quality` — see SKILL.md for the always-on Quick Reference and routing.

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
