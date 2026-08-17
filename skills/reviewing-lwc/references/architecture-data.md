# Component Architecture and Data Sources

> Part of `reviewing-lwc` — see SKILL.md for the always-on Quick Reference and routing.

- Decide component architecture and data source **before** building. Compose small, single-responsibility components with minimal, explicit communication between them.
- Prefer Lightning base components and SLDS utility classes for forms, modals, spinners, buttons, comboboxes, radio groups, file inputs, and checkout UI. Check the SLDS library before writing vanilla HTML.
- Build accessible components: semantic SLDS markup, labels and ARIA attributes, full keyboard navigation. Do not ship UI less accessible than the base component it replaces.
- No hardcoded colors, spacing, or fonts. Use SLDS styling hooks (CSS custom properties) for theming and dark mode support. As of Spring '25, SLDS 2 replaces the old static design tokens (`$color-brand`) with **global** styling hooks (`--slds-g-*`, e.g., `--slds-g-color-accent-1`). Component-level `--slds-c-*` hooks are not currently supported under SLDS 2 themes — flag them in components targeting SLDS 2/Cosmos orgs and verify hook names against the SLDS 2 documentation.
- Externalize user-facing text and configuration — never hardcode literals: `@api` properties for Experience Builder configuration and Commerce context (`effectiveAccountId`, `cartId`, `webstoreId`, `recordId`, labels, limits, display toggles); Custom Labels for text needing translation; Custom Metadata for other configurable text (button labels, modal text, errors, toasts).
- **Import object and field references from `@salesforce/schema`** — never hardcoded strings like `fields: ["Account.Name"]`. Imported references get compile-time validation, deletion protection, rename cascade, and automatic inclusion in packages and change sets.
  - **A `@salesforce/schema` module id must not carry your own package's namespace.** For the package's *own* objects and fields, write the id without the prefix, matching the `objects/<Obj>/fields/<Field>` source path — the namespace is applied at package-version-creation time, and writing it explicitly is a hard compile error: `LWC1504: Invalid module id "ns__Trip__c.ns__Account__c" for type "schema". Explicit use of namespace "ns" is prohibited. Use default namespace "c" instead.` The prefix belongs only on objects owned by a *different* installed package. **Flag the inverse in the same pass:** string identifiers handed to the UI API from the client (`getRecord`/`getRecords` `fields`, `objectApiName`, GraphQL wire queries, `lightning/navigation` object names) are real API names and *do* carry the prefix in a packaged org, so a bare name there is a silent `undefined` at runtime. Do not extend either rule to Apex SOQL, where names resolve unprefixed inside the package's own namespace.
    ```js
    // BAD  import F from '@salesforce/schema/ns__Trip__c.ns__Account__c';
    // GOOD import F from '@salesforce/schema/Trip__c.Account__c';
    // GOOD getRecord field string in the packaged org: 'ns__FlightQuote__c.ns__isConfirmedFx__c'
    ```
- Keep component state minimal and derived. Use `@track` only where the LWC runtime or nested mutation pattern requires it.
  - **Single source of truth:** never store two fields representing the same logical state (e.g., `value` and `isPositive`) — derive the second with a getter.
  - Group fields that change together into one object (e.g., `{ data, error, loading }`) so dependent state cannot desync.
  - Move business logic to module-level functions outside the class body — testable in isolation, liftable into shared modules.
  - Prefer `@api` properties over `@api` methods — properties are settable declaratively from a parent template; methods force the parent to query the DOM first.
  - **A public (`@api`) Boolean must default to `false` — initializing one to `true` fails compilation with `LWC1503`.** Public Booleans follow HTML boolean-attribute semantics: an absent attribute means `false`, and markup cannot statically set `false` (`prop="false"` evaluates to `true`), so a `true` default is unreachable from a parent and the compiler rejects it. When the intended default is "on", invert the property so its `false` default expresses the intent — expose the negative case (e.g. `hideFooter` defaulting `false` instead of `showFooter` defaulting `true`) — or keep the public property `false`/undefined and derive the effective value with a private getter. This applies only to `@api` Booleans; private reactive fields may default to either value.

**Data source decision guide:**

| Use case | Source |
|---|---|
| Single-record read / simple CRUD | Lightning Data Service (`getRecord` / `lightning-record-form` / `lightning-record-edit-form`) |
| Complex server query or multi-object shaping | `@AuraEnabled(cacheable=true)` Apex |
| Related / graph-shaped data with pagination | GraphQL wire adapter |
| Cross-DOM communication | Lightning Message Service |

Prefer LDS over Apex for plain record CRUD — the framework manages cache and FLS for you. Same rule for metadata: use UI API wire adapters (`getObjectInfo`, `getPicklistValues`, list-view adapters) instead of Apex describe calls.

**`@wire` needs a `cacheable=true` method; mutations go imperative.** Wiring to Apex only works when the method is cacheable, and cacheable methods must be read-only (no DML/callouts). Never `@wire` a save — call mutating, non-cacheable Apex imperatively from an event handler, then refresh the wired data (`refreshApex` / `notifyRecordUpdateAvailable`). Reaching for `@wire` on a method that writes is the tell.

**Fetch discipline:**

- **In a namespaced package, data from an `@AuraEnabled` call carries the namespace on custom-field keys.** A raw `SObject` returned from packaged Apex arrives as `ns__Foo__c`, so `record.Foo__c` reads `undefined` with no error and downstream `.filter()`/`.map()` chains render nothing. Require the Apex side to return a typed DTO with unprefixed property names (see `reviewing-apex/references/aura-enabled.md`); flag any `record.Foo__c` in JS where `record` came from an `@AuraEnabled` method. This is the opposite of the `@salesforce/schema` rule above, where the module id must *not* carry the namespace.

- Request only the fields you need with `getRecord` — never layout-based requests, and never `getRecordUi` (its metadata payload is often orders of magnitude larger than the data you need).
- One fetch per page: when several components need the same data, pass it down via `@api` or distribute it from a UI-less service component that queries once — never let each component independently re-query.
- Filter and sort data you already hold client-side (`Array.filter`/`sort`) instead of another server round trip.

**Shadow vs light DOM:** keep the default shadow DOM unless there is a stated reason. Light DOM (`renderMode = 'light'`) is for global styling, cross-component `id`/`aria` linking, analytics instrumentation, or SSR — never on components surfacing sensitive data (it removes encapsulation and exposes the DOM to scraping). For deep trees (custom datatables), prefer one shadow root at the top with light DOM children rather than a shadow boundary per row.
