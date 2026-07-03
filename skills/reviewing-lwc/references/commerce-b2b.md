# B2B Commerce — Storefront LWC

> Optional Commerce domain pack for `reviewing-lwc`. Read it when the component under review
> is a B2B/B2C Commerce storefront artifact (LWR/Aura storefront, cart/checkout/PDP/PLP, quick order).
> Apply these rules *on top of* the base LWC quality rules. For the current API surface, see the
> [B2B/B2C Commerce Developer Guide](https://developer.salesforce.com/docs/commerce/salesforce-commerce/guide/b2b-b2c-comm-dev-guide.html)
> or the `fetching-salesforce-docs` skill — docs supplement these rules, never replace them.
> Where a rule says *source-attested* / "across 409 bundles", the evidence base is Salesforce's two
> public component repos: `forcedotcom/b2b-commerce-open-source-components` (372 bundles,
> authoritative) and `forcedotcom/commerce-on-lightning-components` (37 bundles, contrast); rules
> marked *(not attested in source)* rest on official docs alone.

## Component choice and data sourcing

- Before building a custom component, check whether a standard LWR Store Component (OOTB Experience
  Builder component) already covers the requirement — often a CSS override or builder properties on
  the OOTB component is enough. *(Not attested in source; docs-backed — both reference repos are
  the custom components, so there is no source signal for the OOTB-first check.)*
- Scaffold from the non-deprecated sibling, not from a deprecated component. A deprecated component
  can still ship fully builder-exposed (e.g. `layoutHeader` is exposed while its own `<description>`
  reads "Deprecated - use layoutHeaderOne instead") — a deprecated-but-exposed component is a real
  scaffolding trap. Flag a component derived from a deprecated source and point it at the current
  sibling (`layoutHeaderOne`).
- Data hierarchy (central): Experience Builder / LWR expression bindings resolved into `@api`
  properties first (optimal retrieval, SSR-capable), then client-side Storefront APIs. Custom (BFF)
  Apex is a design smell, not a routine third option — neither repo reaches Apex anywhere across 409
  bundles (`@salesforce/apex/*` = 0 imports), and the one indirect server reach is fully wrapped
  behind `commerce/selfRegistrationApi`. Challenge any custom `@AuraEnabled`/BFF reach for storefront
  data.
- Expression-bound properties arrive **`undefined`** on first render and re-fire as the data tree
  fills. Treat `undefined` as "not loaded yet", never "empty" or "error" — collapsing the two flashes
  an incorrect empty state on first paint. Require a three-state guard (loading / empty / populated)
  and optional chaining before dereferencing, and expect multiple re-renders.
- Ship the fixed `{!...}` expression default string verbatim. The platform resolves the exact literal
  text, so a hand-edit or typo silently leaves the property `undefined` (the checkout default even
  carries an in-metadata "Do not change or delete"). Flag any altered expression default.
- Storefront domain data never comes through `lightning/uiRecordApi` / `lightning/uiObjectInfoApi`
  (`getRecord`, `getObjectInfo`) — UI API appears in exactly one non-placeable record-field display
  utility across both repos and nowhere else. A storefront component reaching for `getRecord` to read
  cart/product/order data is off-pattern. *(The SOQL-cost rationale is docs-backed; the avoidance
  itself is source-proven — 0 elsewhere.)*
- Never invoke Connect REST endpoints directly from the browser via `fetch()` / `XMLHttpRequest`
  (both = 0 across 409 bundles) — reads and writes go through the cached `commerce/*` client APIs,
  which add CDN and browser caching.
- A `*Ui` / inner presentational leaf must not declare `<targets>`/`<targetConfigs>`, hold its own
  `@wire`, or run a mutation. The container owns data access and the Experience-Builder design
  surface; the leaf is presentation-only over `@api` props. Flag a `*Ui` leaf with a builder surface,
  a data wire, or a cart/wishlist write.
- In an SSR-capable component (`lightning__ServerRenderableWithHydration`), gate every DOM/browser
  call (`document`, `window`, `IntersectionObserver`) behind `!import.meta.env.SSR` (or
  `globalThis.document?.` optional chaining) and tear observers down in `disconnectedCallback`. Flag
  bare DOM access in an SSR-declared component.
- Guard every write path against Builder preview / design mode (e.g. a `_preventActionInPreview()`
  check, or skipping spinners in design mode) so the component never mutates data on the Builder
  canvas.
- Reference-code leakage (a component that looks scaffolded from a sample/reference tree): flag
  `--ref-c-*` custom-property prefixes and static theme `Map`s (the shippable form emits `--com-c-*`
  and resolves size through the dynamic theme API), and flag a malformed
  `xmlns="xmlns=http://soap.sforce.com/2006/04/metadata"` in a `js-meta.xml`. Do **not** flag a
  missing `builder*` wrapper (the flat container/`*Ui` shape is the default), nor either label
  namespace (`site.` vs `c.` is a packaging choice, not a defect).

## Storefront APIs

Prefer these `commerce/*` and `experience/*` modules over hand-rolled Apex. Each name below is the
real, source-attested export surface — verify a component imports these, not an invented adapter:

- `commerce/actionApi` — the **page-context write path**: dispatch a typed action
  (`dispatchAction(this, createCartItemDeleteAction(...))`) and let the page provider re-resolve every
  sibling expression. It is not a general read API, and it is **not** imported by the
  order/quote/subscription families (those use direct imperative calls).
- `commerce/cartApi` — cart operations (`refreshCartSummary`, `addItemToCart`) and
  `CheckoutDeliveryGroupCartItemsAdapter`. The cart surface spans **two** modules: this and
  `commerce/checkoutCartApi`. `CartStatusAdapter` is exported by **both** — same name, different
  module; check which one a component imports.
- `commerce/checkoutCartApi` — container-less cart CRUD (`cartItemAdd`) and cart-status adapters.
  Distinct from `commerce/checkoutApi`.
- `commerce/checkoutApi` — the in-container checkout surface: the `CheckoutComponentBase` base class
  and `postAuthorizePayment`. "Place order" is the tree-wide `dispatchFinalizeAsync()` walk across
  checkout components, not a single `checkoutApi` call.
- `commerce/productApi` — read-only, thin adapters (1–3 bundles each). PDP data usually arrives via
  `{!Product.*}` expression binding, not these adapters.
- `commerce/wishlistApi` — wishlist create/update/delete and item add/remove.
- `commerce/orderApi` — only `startReOrder` is attested. Order **reads** (history, summary, items,
  delivery groups) arrive through `{!Order.*}` expression binding, not `orderApi` — flag a component
  that routes order reads through `orderApi`.
- `commerce/contextApi` / `commerce/effectiveAccountApi` — real exports are `AppContextAdapter` /
  `SessionContextAdapter` (`@wire`) and the `effectiveAccount` singleton + `ManagedAccountsAdapter`.
  There is no `getSessionContext` — use `SessionContextAdapter`.
- `commerce/myAccountApi` — account profile and address book management.
- `commerce/promotionApi` — scoped to `PromotionApplicableAdapter` (wired off a cart-preview payload
  to fetch would-be promo pricing), not a general "evaluate promotions" call.
- `commerce/activitiesApi` — record shopper activity (product view, add to cart, recommendation
  view/click); keep it wired when custom components replace standard product/recommendation UI so
  Einstein Recommendations keep working.
- `experience/navigationMenuApi` — navigation menu reads (`getNavigationMenu` `@wire`).
- `experience/cmsDeliveryApi` / `experience/cmsEditorApi` — CMS-backed content reads/editing.
  *(Not attested in source; docs-backed — 0 imports of either across both repos; keep only on the
  official docs.)*

Cross-cutting on these APIs:

- Writes never go through a `@wire` (adapters are read-only), and never re-fetch after a page-context
  dispatch — `actionApi` re-resolves every sibling expression; only an **out-of-context** component
  (not `{!...}`-bound) issues an explicit refresh call (`refreshCartSummary`).
- An expression-bound component must **not** call a cart/checkout mutation API (`cartItemAdd`,
  `commerce/cartApi`) directly from a handler — it desyncs from siblings reading the same provider
  context; dispatch through `actionApi` instead. The one accepted direct-call exception is cart
  **creation** (`cartCreate()`), for which no `actionApi` factory exists.
- Never surface raw server error codes/text — map error code → a pre-imported label with an explicit
  default (the repos use per-component code maps and shared normalizers). Note `commerceErrors` is a
  static `{code, message}` registry, **not** a runtime normalizer — do not accept it as normalization
  precedent.
- Format currency/locale through the shared `site/commonFormatterCurrency` module (a cached
  `Intl.NumberFormat` from the locale) with an `@salesforce/i18n/currency` fallback — never hand-roll
  `Intl.NumberFormat` or concatenate a currency symbol.

## Commerce context

- Obtain each id (`webstoreId`, `effectiveAccountId`, `cartId`, `productId`, `recordId`,
  `communityId`, `siteId`) from its provider channel — expression binding (`{!recordId}`), a context
  adapter (`SessionContextAdapter.effectiveAccountId`), or the `effectiveAccount` singleton — never a
  literal. The repos rarely pass these as manual props; they arrive through those channels.
- Read the effective-account id only from the effective-account surface (`effectiveAccount.accountId`
  / `SessionContextAdapter.effectiveAccountId`), never from a URL param, label, or ad-hoc wire —
  sourcing it elsewhere breaks B2B account switching. An account switch hard-navigates to reload
  rather than relying on reactive re-render.
- Support both `recordId` and an explicitly passed `productId`/`cartId` only where the existing
  project already does so. *(Not attested in source; project-convention hint — no clean
  dual-acceptance pattern in either repo.)*
- Keep LWR and Aura/legacy implementations separate; do not mix Aura controller assumptions into LWR
  components. *(Not attested in source; both repos are 100% LWR — general guidance only.)*

## Checkout components

- Checkout leaves receive cart/checkout data through the `{!Checkout.Details}` **expression binding**;
  the one real cart adapter in this area is `CheckoutDeliveryGroupCartItemsAdapter` from
  `commerce/cartApi`. Do not wire ad-hoc cart-summary, cart-items, or checkout-information adapters to
  read cart/checkout state — those adapter names are not real API surface; bind the expression
  instead.
- A custom child checkout component must **extend `CheckoutComponentBase`** from `commerce/checkoutApi`
  (used by ~12 checkout bundles) so the checkout engine runs its form validation and aspect
  propagation. A component that does not extend it will not interoperate — there is no validation
  mixin to implement in its place.
- Change a delivery method (and other checkout mutations) with the two-phase
  **`await this.dispatchUpdateAsync({...}); this.dispatchCommit();`** chain. Commit must never race the
  update — `dispatchCommit()` issued without first awaiting `dispatchUpdateAsync()` is a defect.
- Execute cart/checkout mutations **sequentially** — await each mutation before the next; concurrent
  `WebCart` writes cause Version Mismatch / Checkout Conflict errors.
- Debounce free-text checkout fields (~3000ms) before committing; never commit a free-text field on
  every keystroke.
- Never branch on raw numeric checkout-status literals (e.g. `if (status === 202)`, easy to invert so
  a 202-async response reads as an error) — use the `CheckoutStatus` enum with the
  `checkoutStatusIsReady()` helper.
- No optimistic checkout UI without a rollback/error path; show loading while operations process. Gate
  against adapters firing before shipping/calculations complete — the engine-readiness gate
  (`checkoutStatusIsReady`, treating `202 AsyncInProgress` as "still working", not failure) plus
  undefined-first-render guarding before dereferencing delivery groups/methods.
- Clear a mutation's processing/spinner flag on **both** success and error (`onSuccess`/`onError` for
  an `actionApi` dispatch, `finally` for a promise call); an uncleared flag hangs the spinner forever
  on failure. Disable the triggering control for the async window to block double-submit.
- Never hold payment-card values as component state — delegate to the opaque gateway element; only
  `paymentToken` / `billingDetails` cross back through its event contract. Flag a checkout leaf that
  reads or stores card fields.
- Keep delivery-method names label-driven; don't branch on literal `Standard` / `Dropship` /
  `Click & Collect` text (`Dropship`, `Click & Collect` = 0 hits across both repos — behavior derives
  from data flags, not display strings).
- For manual address entry, validate required fields client-side (first-error focus; server-side
  validation also applies) before mutating cart delivery-group state.

## Product, search, and quick order

- Product listing/search use Commerce product/search APIs or existing storefront data contracts
  before any custom SOQL — there is no SOQL/Apex anywhere in either repo. Search reads via the
  `{!Search.Results}` expression binding and `ProductSearchAdapter`.
- Search result labels/fields should be builder-configurable and label-driven. A specific line 1 =
  `Name`, line 2 = SKU/part field (`StockKeepingUnit`, `ProductCode`, or a custom part-number field),
  line 3 = alternate/OEM part scheme is a reasonable project default. *(The three-line scheme is not
  attested in source; project default, not a repo-mandated convention.)*
- Quantity-rule validation — minimum, maximum, increment/multiplier — is driven by a single
  `quantityRule` object; enforce min/max/increment, disabled-cart, and no-quantity states
  consistently.
- Quick order / CSV upload should validate SKU, quantity, min/max, increment, and unavailable
  products, and refresh cart state, reporting per-line success/failure rather than one aggregate
  status. *(The per-line partial-failure CSV contract is not attested in source — keep as a
  requirement, not a repo-proven pattern.)*
- Derive OEM/region and similar behavior from a data flag (account field, custom metadata, selector
  output), not from display text — the repos gate on booleans, never on rendered strings. OEM/region
  is one example of the general rule.
- Display server-evaluated pricing/promotions only; never recompute discounts, promotion eligibility,
  or pricing client-side (the repos take `appliedPromotions` / `discountsApproaching` as `@api` props
  and only gate booleans). Flag a pricing component that renders a price without checking for attached
  selling models (`productSellingModels`) — showing negotiated/original price for a
  subscription/selling-model product is a real bug class.

## Storefront performance

- Annotate any storefront Apex you call as cacheable and keep custom Apex calls low per interaction;
  avoid n+1, aggregate retrieval higher in the tree, and never fetch the same data twice. *(Not
  attested in source; docs-backed — with 0 Apex across 409 bundles, "cacheable Apex" and "under three
  Apex calls per interaction" are unobservable here; the repos sidestep it by not calling Apex. The
  container-fetches-once / `*Ui`-receives-props split is loosely consistent.)*
- Serve images through platform image optimization: resolve the URL with
  `experience/resourceResolver.resolve()` first (a required precursor), then build the source map with
  `experience/picture.createImageDataMap()`. Match image byte size to on-screen area; prefer CMS
  delivery; if self-hosting, ensure CDN + browser caching with proper `cache-control` headers.
- Reduce asset origins; `preconnect` critical third-party origins; defer non-essential third-party
  scripts (`async`); limit IFrames and prefer direct embedding. *(Not attested in source; docs-backed
  — no preconnect / script-deferral in either repo; the closest touchpoint is the guarded `loadScript`
  idiom that presence-checks a global before re-injecting.)*
- Gate guest-vs-authenticated feature access on `SessionContextAdapter.isLoggedIn` checked at the
  point of interaction (redirect guests to Login rather than rendering a disabled control) — this is
  the attested gating channel, and guest/auth *is* checked client-side to drive the redirect. Never
  block page rendering on a permission check. `@salesforce/userPermission` /
  `@salesforce/customPermission` are **not** used (0 imports across the repos). *(permission modules:
  not attested in source; docs-backed only.)*

### Store configuration (review-time checklist)

When reviewing performance/behavior issues, check org/store settings before coding around them:
Faster Add to Cart, Reduce Entitlement Checks, and Secure Browser Caching enabled where appropriate;
Displayable Fields configured deliberately; inactive/unused promotions and stale data removed;
remaining Aura storefronts flagged for migration to LWR. *(Not attested in source; docs-backed —
these are org/store admin settings component source cannot attest. The closest repo touchpoint is that
pricing/promotion display always defers to the server-evaluated payload, consistent with "configure,
don't code around.")*

### Measuring

For performance work: measure before and after each change; track Core Web Vitals on a representative
mobile device over 4G; use Lighthouse/WebPageTest for synthetic tests, the Salesforce Page Optimizer
plugin for Lightning debugging, and RUM (or the CrUX dashboard) for production. *(Not attested in
source; docs-backed — pure measurement tooling; nothing in either repo attests or contradicts it.)*
