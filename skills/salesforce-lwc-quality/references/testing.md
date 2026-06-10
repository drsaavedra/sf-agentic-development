# LWC Testing (Jest)

> Part of `salesforce-lwc-quality` — see SKILL.md for the always-on Quick Reference and routing.

- Cover loading, data, and error states for every wire-driven component.
- **Test black-box: assert on rendered DOM and dispatched events, never on internal fields.** `expect(element.shadowRoot.querySelector('lightning-spinner'))` — not `expect(component.isLoading)`. Never add an `@api` property just to make state reachable from a test; that freezes implementation detail into the public contract.
- **Test the component in a connected state.** Wire adapters only provision data when the component is in the DOM — `document.body.appendChild(element)` *before* emitting wire mocks, or assertions silently pass against `undefined`.
- **Clean up in `afterEach` with `document.body.removeChild(element)`.** A component instance shared across tests lets state from one test corrupt the next.
- **Emit wire values via `@salesforce/wire-service-jest-util`**, not hand-rolled module mocks — the utility simulates the adapter lifecycle (data and error states) correctly.
- **Derive LDS mock JSON from a real UI API snapshot** (Workbench or developer console) for `getRecord`/related-list adapters. Hand-crafted mocks with the wrong shape cause silent failures. Store mock data under `__tests__/data/`.
- **`await flushPromises()` before asserting** after emitting a wire value — `Promise.resolve()` is insufficient to flush multi-tick async chains.
- Run via `npm run test:unit`.
