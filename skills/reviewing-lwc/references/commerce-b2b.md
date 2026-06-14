# B2B Commerce — Storefront LWC

> Optional Commerce domain pack for `reviewing-lwc`. Read it when the component under review
> is a B2B/B2C Commerce storefront artifact (LWR/Aura storefront, cart/checkout/PDP/PLP, quick order).
> Apply these rules *on top of* the base LWC quality rules. For the current API surface, see the
> [B2B/B2C Commerce Developer Guide](https://developer.salesforce.com/docs/commerce/salesforce-commerce/guide/b2b-b2c-comm-dev-guide.html)
> or the `fetching-salesforce-docs` skill — docs supplement these rules, never replace them.

## Component choice and data sourcing

- Before building a custom component, check whether a standard LWR Store Component (OOTB Experience
  Builder component) already covers the requirement — often a CSS override or builder properties on
  the OOTB component is enough. Do not reference components marked deprecated.
- Data hierarchy: Experience Builder data providers / LWR expressions bound to `@api` properties
  first (optimal retrieval, SSR-capable), then client-side Storefront APIs, then custom (BFF) Apex
  only when neither covers the requirement. Expression-bound properties arrive **undefined** on first
  render and re-fire as the data tree fills — check data is defined and correctly typed before
  dereferencing, and expect multiple re-renders.
- Avoid UI API wire adapters on storefronts — they target transactional apps, their results are not
  cached, and every use costs SOQL.
- Never invoke Connect REST endpoints directly from the browser via `fetch()` / `XMLHttpRequest` —
  exercise them through the client-side Storefront APIs, which add CDN and browser caching.

## Storefront APIs

Prefer these `commerce/*` and `experience/*` modules over hand-rolled Apex when they cover the need:

- `commerce/actionApi` — centralized Storefront Actions on current LWR storefronts: factory methods
  for UI-driven operations (add to cart, etc.) that update related page-level components in
  coordinated sequence. Prefer it over hand-wiring the per-domain imperative APIs when it fits.
- `commerce/cartApi` — active cart state, cart item reads, add/update/delete cart items, coupons,
  processing state, cart summary refreshes.
- `commerce/checkoutApi` — checkout state, delivery method updates, shipping address updates, payment
  authorization (`postAuthorizePayment`), purchase-order payment, place order, restart checkout,
  checkout polling.
- `commerce/productApi` — product detail, product collections, search, category hierarchy/path,
  pricing, recommendations, promotion pricing.
- `commerce/wishlistApi` — wishlist create/update/delete and item add/remove (when compatible).
- `commerce/orderApi` — order history, order summary, reorder, order items, delivery groups, guest
  order authorization.
- `commerce/contextApi` and `commerce/effectiveAccountApi` — read/update app/session/effective-account
  context (use `getSessionContext` for account context outside cart/checkout) instead of custom
  session storage, URL state, or browser storage.
- `commerce/myAccountApi` — account profile and address book management.
- `commerce/promotionApi` — evaluate promotions and pricing adjustments instead of re-deriving them.
- `commerce/activitiesApi` — record shopper activity (product view, add to cart, recommendation
  view/click). When custom components replace standard product/recommendation UI, keep this tracking
  so Einstein Recommendations keep working.
- `experience/navigationMenuApi`, `experience/cmsDeliveryApi`, `experience/cmsEditorApi` — navigation
  menu reads and CMS-backed banners/media/content editing, instead of custom queries.

## Commerce context

- Pass or derive `webstoreId`, `effectiveAccountId`, `cartId`, `productId`, `recordId`, and `siteId`
  explicitly and deliberately; never hard-code them.
- For components that appear on PDP, PLP, cart, checkout, and modal contexts, support both `recordId`
  and an explicitly passed `productId`/`cartId` when the existing project does so.
- Keep LWR and Aura/legacy implementations separate. Do not mix Aura controller assumptions into LWR
  components unless the existing component is Aura-based.

## Checkout components

- Listen to `CartSummaryAdapter` for `cartId`, `accountId`/`effectiveAccountId`, `webstoreId`, and
  currency; `CartItemsAdapter` for items; `CheckoutInformationAdapter` for checkout status, delivery
  groups, selected/available delivery methods, and shipping instructions. Wire these adapters rather
  than independently querying cart records.
- Custom child checkout components must implement the `useCheckoutComponent` mixin so the checkout
  engine can run form validation and synchronize external API validations; they slot in as children
  under checkout section components.
- Change delivery methods via `updateDeliveryMethod(methodId)`, then call `notifyAndPollCheckout` (or
  the matching refresh) so dependent components receive updated state.
- Execute cart/checkout mutations **sequentially** — concurrent requests that modify `WebCart` or
  related records cause Version Mismatch / Checkout Conflict errors. Await each `commerce/cartApi` /
  `commerce/checkoutApi` mutation before issuing the next.
- Do not update checkout UI optimistically without a rollback/error path; show loading state while
  operations process. Guard against adapters firing before shipping services or checkout calculations
  complete — check status and required nested fields before dereferencing delivery groups/methods.
- Keep delivery method names configurable/label-driven; don't hard-code `Standard`, `Dropship`,
  `Click & Collect` unless the project standard requires those exact values.
- For manual address entry, validate required fields client-side (server-side validation also applies)
  before mutating cart delivery group state.

## Product, search, and quick order

- Product listing/search components use Commerce product/search APIs or existing storefront data
  contracts before custom SOQL.
- Search result labels/fields should be builder-configurable: default line 1 to `Name`; line 2 to the
  project SKU/part field (`StockKeepingUnit`, `ProductCode`, or a custom part-number field); support a
  third line for an alternate/OEM part number when the project uses one.
- Quick order and CSV upload components must validate SKU, quantity, min/max quantity,
  increment/multiple rules, unavailable products, and partial failures. Add-to-cart flows must refresh
  cart state and surface **both** success and per-line failures — bulk add-to-cart reports which rows
  succeeded and which failed, never one aggregate status.
- Quantity components enforce minimum, maximum, disabled-cart, no-quantity, and increment-multiplier
  rules consistently.
- For OEM or region-specific behavior, derive the rule from account fields, custom metadata, or
  existing selector/controller output — do not branch on display text in the UI when a data flag
  exists.

## Storefront performance

- Annotate the storefront Apex you call as cacheable (see the Apex Commerce reference) and keep custom
  Apex calls under three per interaction. Avoid n+1 / sequentially dependent requests — parallelize and
  aggregate retrieval higher in the component tree; never fetch the same data twice through different
  service calls.
- Match image byte size to on-screen surface area; serve images through the platform image
  optimization service (dynamic resize, WebP/AVIF) via OOTB image components or `experience/picture`
  URLs (compose URLs with utilities like `createImageDataMap`). Prefer Salesforce CMS for delivery;
  if self-hosting, ensure CDN + browser caching with proper `cache-control` headers.
- Reduce asset origins; add `<link rel="preconnect">` for critical third-party origins; defer
  non-essential third-party scripts (`async`); limit third-party scripts/IFrames and prefer direct
  content embedding over IFrames. Remove references to unused resources.
- Check permissions with `@salesforce/userPermission` / `@salesforce/customPermission`; never
  implement permission logic client-side and never block page rendering on a permission check.

### Store configuration (review-time checklist)

When reviewing performance issues, check org/store settings before coding around them: Faster Add to
Cart, Reduce Entitlement Checks, and Secure Browser Caching enabled where appropriate; Displayable
Fields configured deliberately; inactive/unused promotions and stale data removed; remaining Aura
storefronts flagged for migration to LWR.

### Measuring

For performance work: measure before and after each change; track Core Web Vitals on a representative
mobile device over 4G; use Lighthouse/WebPageTest for synthetic tests, the Salesforce Page Optimizer
plugin for Lightning debugging, and RUM (or the CrUX dashboard) for production.
