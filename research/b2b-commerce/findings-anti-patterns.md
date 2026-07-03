# B2B Commerce storefront LWC — anti-pattern catalog & reference audit

> Spec: `docs/superpowers/specs/2026-07-02-b2b-commerce-skills-design.md`. The authoritative
> negative-space document for the B2B Commerce research set, and the concrete diff plan for the
> Stage-3 upgrade of this repo's own `skills/reviewing-lwc/references/commerce-b2b.md`.
> Three sections: **(1) Demonstrated avoidances** — things both repos systematically never do, each a
> checkable rule with the observed alternative; **(2) Divergences** — os-vs-col conflicts resolved in
> os's favour, with the review-time implication; **(3) Existing reference audit** — rule-by-rule
> through the current `commerce-b2b.md`, each verdict CONFIRMED / REFINE / UNVERIFIED.
>
> Sibling docs point here as the anti-pattern owner: `findings-data-access.md` §5 lists the
> data-access negative space it expects this doc to own; `findings-component-patterns.md` defers its
> structure/label/a11y/testing defects here. Every repo claim carries an `[os:bundle/file:line]` /
> `[col:bundle/file:line]` citation. **os** (`b2b-commerce-open-source-components`, 372 bundles) is
> authoritative for pattern extraction; **col** (`commerce-on-lightning-components`, 37 bundles) is
> the contrast source and wins nothing except where explicitly noted. Repo-root files outside the LWC
> roots are cited in prose (`col repo: <file>:<line>`), never in brackets. Census-level absence claims
> ("zero X across 409 bundles") were re-verified by `rg`/`grep` over both roots for this task; the
> adjacent bracket cites the positive alternative the repos use instead.

---

## 1. Demonstrated avoidances

Each entry is an **anti-pattern** the repos never commit, the **observed alternative** they use
instead, and the citation grounding the alternative. The absence itself was `grep`-verified across
both roots; the citation attests the positive pattern.

### 1.1 Never import Apex from a storefront component
**Anti-pattern:** a `@salesforce/apex/<Class>.<method>` import (a hand-rolled `@AuraEnabled` / BFF
controller) to fetch or mutate commerce data. **Verified absence:** `grep -rl "@salesforce/apex"` over
both roots returns **0 files** across all 409 bundles. **Alternative:** every server need flows through
a `commerce/*` / `experience/*` platform module or Experience-Builder expression binding; the single
indirect server reach is fully wrapped behind `commerce/selfRegistrationApi`'s `selfRegister` (imported
aliased `selfRegisterApex`, still not an Apex import) [os:selfRegister/selfRegister.js:4]. Rung (d) of
the data-access ladder is never reached (`findings-data-access.md` §1).

### 1.2 Never call Connect REST directly from the browser
**Anti-pattern:** `fetch()` / `XMLHttpRequest` against a Connect REST endpoint from component JS.
**Verified absence:** `fetch(` returns **0** in both os and col; `XMLHttpRequest` returns **0** in
both. **Alternative:** cart/checkout/product reads and writes go through the cached `commerce/*` client
APIs — e.g. `cartSummary` wires `CartStatusAdapter`/`CartContentsAdapter` from `commerce/checkoutCartApi`
rather than fetching [os:cartSummary/cartSummary.js:2]. The CDN/browser-caching rationale in the current
reference is docs-backed; the behavioural avoidance is source-proven.

### 1.3 Never fetch commerce data through UI API record adapters
**Anti-pattern:** `lightning/uiRecordApi` / `lightning/uiObjectInfoApi` (`getRecord`, `getObjectInfo`)
to source storefront data. **Verified absence:** UI API is imported by exactly **one** os bundle,
`commonRecordFieldValue` — a generic, non-placeable record-field display utility (`isExposed=true` with
**no** `<target>`) [os:commonRecordFieldValue/commonRecordFieldValue.js:2], and **zero** col bundles.
**Alternative:** domain data arrives via expression binding or `commerce/*` adapters; a storefront
component reaching for `getRecord` to read cart/product/order data is off-pattern.

### 1.4 Never write through a wire, and never re-fetch after a page-context dispatch
**Anti-pattern:** mutating via a `@wire` adapter (adapters are read-only), or manually re-querying a
`{!...}`-bound component after a write. **Alternative:** writes take one of four imperative shapes
(`findings-data-access.md` §4); a page-context mutation dispatches a typed action and lets the provider
re-resolve every sibling expression — `cartItems` deletes with `dispatchAction(this,
createCartItemDeleteAction(...))` and never re-queries [os:cartItems/cartItems.js:203]; out-of-context
components issue an explicit refresh call instead [os:reorderModal/reorderModal.js:51].

### 1.5 Never call a cart/checkout mutation API directly from an expression-bound component
**Anti-pattern:** a `{!Product.*}` / `{!Cart.*}`-bound component calling `commerce/checkoutCartApi`
(`cartItemAdd`) or `commerce/cartApi` directly from a click handler — it desyncs from sibling components
reading the same provider context. **Alternative:** dispatch through `commerce/actionApi` so the page
re-resolves all siblings [os:productPurchaseOptions/productPurchaseOptions.js:11]. The one accepted
direct-call exception is cart *creation* (`cartCreate()`), for which no `actionApi` factory exists
[os:cartCreateModal/cartCreateModal.js:4]; out-of-context cards (not PDP-bound) legitimately call
`cartItemAdd` directly [os:productCard/productCard.js:5].

### 1.6 Never treat an expression prop's first-render `undefined` as "empty" or "error"
**Anti-pattern:** `if (this.items.length === 0)` (or `if (this.prop)`) that collapses "not loaded yet"
into "empty", flashing an incorrect empty state on first paint. **Alternative:** the pervasive
three-state guard — `cartContents` treats `!this.items` as still-processing and flips to empty only once
`items` is a real array [os:cartContents/cartContents.js:60]; `searchResultsLayoutEmpty` shows "no
results" only when total is exactly `0` and not loading
[os:searchResultsLayoutEmpty/searchResultsLayoutEmpty.js:14].

### 1.7 Never hand-edit the fixed `{!...}` expression default
**Anti-pattern:** renaming or typo-editing the literal expression string in a `js-meta.xml` default —
the platform resolves the exact fixed text, so a typo silently leaves the property `undefined`.
**Alternative:** ship the literal verbatim; checkout's `checkoutDetails` default carries the in-metadata
warning "Do not change or delete" [os:checkoutDeliverymethod/checkoutDeliverymethod.js-meta.xml:16].

### 1.8 Never hand-roll currency/locale formatting
**Anti-pattern:** constructing `Intl.NumberFormat` ad hoc or concatenating a currency symbol.
**Alternative:** the shared, module-cached `site/commonFormatterCurrency` (an `Intl.NumberFormat` built
from `@salesforce/i18n/locale`), imported across cart/checkout/search/order/quote/account
[os:cartItem/cartItem.js:5], with a `@salesforce/i18n/currency` fallback when no payload
`currencyIsoCode` is present [os:cartItems/cartItems.js:24-26]. col uses base components instead
(`<lightning-formatted-number format-style="currency">`) [col:productPricing/productPricing.html:16-21].

### 1.9 Never leave a mutation's processing flag uncleared on the error path
**Anti-pattern:** a spinner-gating boolean set in the `try` body but cleared only on success — it hangs
forever on failure. **Alternative:** clear on **both** paths — `onSuccess`/`onError` for `actionApi`
dispatch [os:productPurchaseOptions/productPurchaseOptions.js:169], or `finally` for promise calls
[os:myAccountInputAddress/myAccountInputAddress.js:372]. The triggering control also disables for the
async window to block double-submit [os:cartApplyCoupon/cartApplyCoupon.js:43-45].

### 1.10 Never surface raw server error codes/text to users
**Anti-pattern:** toasting `error.message` or a numeric code straight from the server. **Alternative:**
a code-to-label map with an explicit default — `myAccountProfile`'s ~25-code `_codeToMessageMap`
[os:myAccountProfile/myAccountProfile.js:191], cart's layered coupon resolver
[os:cartApplyCoupon/cartApplyCoupon.js:118-136], or a shared normalizer like subscription's
`getARCToastMsg` [os:subscriptionAmendModal/subscriptionAmendModal.js:177]. Note: `commerceErrors` is a
static `{code,message}` registry, **not** a runtime normalizer — do not cite it as normalizer precedent
[os:commerceErrors/commerceErrors.js:1].

### 1.11 Never recompute promotions/pricing/discounts client-side
**Anti-pattern:** re-deriving discount amounts or promotion eligibility in the UI. **Alternative:**
display-only over server-evaluated data — `appliedPromotions`/`discountsApproaching` arrive as `@api`
props and even the "evaluate" bundle only gates a boolean [os:promotionSummaryUi/promotionSummaryUi.js:4]
[os:promotionEvaluatePriceDiscount/promotionEvaluatePriceDiscount.js:1].

### 1.12 Never hold payment card values as component state
**Anti-pattern:** reading/storing card/payment field values in a checkout leaf's own state.
**Alternative:** delegate to the opaque gateway element; only `paymentToken`/`billingDetails` cross back
through its event contract [os:checkoutPaymentSheet/checkoutPaymentSheet.js:35-90].

### 1.13 Never commit checkout mutations out of order or per-keystroke
**Anti-pattern:** `dispatchCommit()` without first awaiting `dispatchUpdateAsync()` (commit races the
update), or committing a free-text field on every keystroke. **Alternative:** the two-phase
await-then-commit chain [os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:172], and a
3000ms debounce on free-text before commit [os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:631].
Concurrent `WebCart` writes are avoided by awaiting each mutation before the next.

### 1.14 Never branch on raw numeric checkout-status literals
**Anti-pattern:** `if (status === 202)` against HTTP-style codes that are easy to invert (treating
202-async as an error). **Alternative:** the `CheckoutStatus` enum + `checkoutStatusIsReady()` helper
[os:checkoutNotification/utils.js:1-14].

### 1.15 Never give a `*Ui` leaf a builder surface, its own `@wire`, or a mutation
**Anti-pattern:** a `*Ui`/inner presentational component declaring `<targets>`/`<targetConfigs>`, or
holding a data wire or cart/wishlist mutation. **Alternative:** the container owns data access and the
design surface; the `*Ui` leaf is presentation-only with no `<targets>`
[os:cartItemsUi/cartItemsUi.js-meta.xml:1-7] [os:promotionSummaryUi/promotionSummaryUi.js-meta.xml:4].

### 1.16 Never do DOM/browser work in an SSR-capable component without an SSR guard
**Anti-pattern:** bare `document.addEventListener` / `window.innerWidth` / `IntersectionObserver` in a
component declaring `lightning__ServerRenderableWithHydration`. **Alternative:** gate DOM-only work
behind `!import.meta.env.SSR` (and tear observers down in `disconnectedCallback`)
[os:cartItemsUi/cartItemsUi.js:77-85], or `globalThis.document?.` optional chaining
[os:layoutHeaderOne/layoutHeaderOne.js:79-83]; col generates SSR-safe ids with `crypto?.randomUUID?.()`
plus a counter fallback [col:commonNumberInput/commonNumberInput.js:19-22].

### 1.17 Never mutate data during Builder preview / design mode
**Anti-pattern:** a write path with no preview guard, corrupting data on the Builder canvas.
**Alternative:** guard first — every `myAccountProfile` mutation calls `_preventActionInPreview()`
[os:myAccountProfile/myAccountProfile.js:241]; `cartContents` skips its spinner in design mode
[os:cartContents/cartContents.js:47].

### 1.18 Never read effective-account id from a URL param, label, or ad-hoc wire
**Anti-pattern:** sourcing account context outside the effective-account surface, breaking B2B account
switching. **Alternative:** `effectiveAccount.accountId` / `SessionContextAdapter.effectiveAccountId`
[os:myAccountSwitcherList/myAccountSwitcherList.js:36]
[os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:98]; a switch hard-navigates to reload rather
than relying on reactive re-render [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:145-147].

### 1.19 Never hard-code delivery-method or entitlement display strings for branching
**Anti-pattern:** branching UI on literal `Standard` / `Dropship` / `Click & Collect` text. **Verified
absence:** `Dropship` and `Click & Collect` return **0** matches across both roots. **Alternative:**
derive behaviour from data flags / label-driven config, consistent with the gate-on-a-boolean idiom
[os:promotionEvaluatePriceDiscount/promotionEvaluatePriceDiscount.js:1].

---

## 2. Divergences (os wins; review-time implication)

Every os-vs-col conflict from `notes/col-contrast.md` §Divergences, resolved in **os's favour** per the
project's os-authoritative rule, with the concrete implication for a reviewer. col is not "wrong" — it
is a customization/reference tree — but where the two disagree, the generator/reviewer teaches os. col
leads only on the three items explicitly marked below (testing infra, the builder-wrapper split,
documentation hygiene).

### 2.1 Component structure — flat/`*Ui` (os) vs split `builder*` wrapper (col)
os `productPricing` is a single `isExposed=true` component that does data access **and** presentation
[os:productPricing/productPricing.js-meta.xml:1]; col splits it into an exposed `builderProductPricing`
[col:builderProductPricing/builderProductPricing.js-meta.xml:3] wrapping an internal `productPricing`
(`isExposed=false`) [col:productPricing/productPricing.js-meta.xml:3]. os has **0** `builder*` bundles;
col has **10**. **Implication:** treat the os flat/container-`*Ui` shape as the default to author and
review against; do **not** flag a missing `builder*` wrapper as a defect. col leads on the *customization*
path only (the internal component is independently reusable and testable) — teach it as the advanced
option, not the baseline.

### 2.2 Business logic — `displayPricing` selling-models guard
os `productPricing.displayPricing` additionally requires `!this.product?.productSellingModels?.length`
[os:productPricing/productPricing.js:78-80]; col's `builderProductPricing.displayPricing` omits that
guard [col:builderProductPricing/builderProductPricing.js:213-220]. **Implication:** the col shape
renders negotiated/original pricing for subscription/selling-model products that os deliberately
suppresses in favour of the selling-model selector — a real behavioural bug class. Flag any pricing
component that shows price without checking for attached selling models.

### 2.3 Styling API — dynamic theme resolution (os) vs static map (col)
os resolves text size through the dynamic `generateThemeTextSizeProperty` theme API
[os:productPricing/productPricing.js:4-7]; col hardcodes a `--dxp-s-text-heading-*` `Map`
[col:builderProductPricing/builderProductPricing.js:12-16]. The CSS-var namespace also differs: os emits
the shipped-product `--com-c-product-pricing-*` [os:productPricing/productPricing.js:70-76], col the
reference/sample `--ref-c-product-pricing-*` [col:builderProductPricing/builderProductPricing.js:192-197].
**Implication:** review toward the dynamic theme API and the `--com-c-*` namespace; treat a static
size map or a `--ref-c-*` prefix as reference-code leakage, not a shippable pattern.

### 2.4 `commonButton` — merchant widget (os) vs internal control (col), same name
os `commonButton` is `isExposed=true` ("Action Button", SSR-capable), with a `text` `@api` and merchant
color/border props emitting `--com-c-button-*` [os:commonButton/commonButton.js-meta.xml:4-9]; col
`commonButton` is `isExposed=false`, slot-based, styled by utility-class generators, with a `focus()`
method for internal composition [col:commonButton/commonButton.js-meta.xml:3]
[col:commonButton/commonButton.js:55-67]. **They are different components sharing a name.**
**Implication:** do not assume a `commonButton` reference means the same contract across repos — verify
`isExposed` and whether it takes a `text` prop (os) or a slot (col) before citing it as precedent.

### 2.5 `commonModal` — same logic, different code hygiene (col leads on docs only)
Behaviour matches (cancelable action + `close(result)` escape hatch) [os:commonModal/commonModal.js:27-41]
[col:commonModal/commonModal.js:130-144], but col adds license headers, JSDoc, usage examples, and
`message` guards absent from the terse os source [col:commonModal/commonModal.js:1-102]
[os:commonModal/commonModal.js:1-3]. **Implication:** a tie on the actual contract — extract the modal
*logic* from either; col is the more legible teaching copy. Not a defect in either direction.

### 2.6 Meta hygiene — malformed `xmlns` in col internal components (real defect)
col's `isExposed=false` internal metas carry a malformed `xmlns="xmlns=http://soap.sforce.com/2006/04/metadata"`
[col:productPricing/productPricing.js-meta.xml:2] [col:searchFilters/searchFilters.js-meta.xml:2]
[col:commonButton/commonButton.js-meta.xml:2], while os [os:commonButton/commonButton.js-meta.xml:2] and
col's own exposed wrappers [col:builderProductPricing/builderProductPricing.js-meta.xml:2] use the
correct declaration. **Implication:** a genuine copy-paste defect — flag `xmlns="xmlns=..."` in any
generated `js-meta.xml`; do not replicate it from a col internal component used as a template.

### 2.7 Label namespace — packaging artifact, neither wins
os labels are site-scoped `sfdc_cms__label` under the reserved `site.` prefix; col labels are org-wide
`CustomLabels` under the default `c.` scope [col:productPricing/productPricing.js:8]
[col:jsconfig.json:9-12]. **Implication:** this is a **packaging** choice (os as an Experience Cloud site
bundle, col as an unnamespaced unmanaged package), not a quality difference — a generated skill must
**not** hardcode one namespace; pick per the target packaging model. Do not flag either prefix as wrong.

### 2.8 Testing infrastructure — col-only (col leads; the single biggest thing os lacks)
col ships jest.config.js, jest-sa11y-setup.js, test/coverage/watch npm scripts, a lint-staged pre-commit
test gate (col repo: jest.config.js:1-12; package.json:15-21, 55-64), and a Jest-typed jsconfig
[col:jsconfig.json:14-17]; os ships none of it. **Caveat:** col ships the wiring but **zero test files**
(`passWithNoTests: true`, col repo: jest.config.js:6). **Implication:** when a skill needs a testing
setup, extract col's config/enforcement pattern — but never claim either repo demonstrates how a
storefront LWC unit test is *written*; none exists to copy.

### 2.9 Source form — compiled/terse (os) vs prettier/JSDoc (col)
os sources are terse and compiled-looking (no license headers, no JSDoc) [os:productPricing/productPricing.js:1];
col is prettier-formatted, license-headed, JSDoc-rich [col:productPricing/productPricing.js:1]. col
internal metas pin apiVersion 58.0 [col:productPricing/productPricing.js-meta.xml:4] while col's exposed
wrapper meta uses a newer apiVersion [col:builderProductPricing/builderProductPricing.js-meta.xml:3].
**Implication:** for *pattern shape* os is authoritative; for *reading/learning* col is more legible.
Do not treat os's terseness (bare field decls, no comments) as a style to enforce, nor col's headers as
required — separate concern from correctness.

---

## 3. Existing reference audit — `skills/reviewing-lwc/references/commerce-b2b.md`

Rule-by-rule through the current 127-line reference. Each verdict is **CONFIRMED** (repos attest it —
new citation given), **REFINE** (the code shows something more specific — the sharper form is stated),
or **UNVERIFIED** (no evidence in either repo; keep only if official docs back it — flagged as such).
The subsection titles below reproduce the current file's headings verbatim so this section is the
complete diff plan. Verdict citations attest the evidence, not the current file's prose.

### 3.1 Heading: "Component choice and data sourcing"
- **OOTB-Store-Component-first / "do not reference deprecated components."** Split verdict. The
  OOTB-first guidance is **UNVERIFIED** — both repos *are* the custom components, so there is no source
  signal about checking for a standard component first (keep it; it is docs/architecture guidance, not
  a repo pattern). The deprecated-component clause is **CONFIRMED/REFINE**: `layoutHeader` ships
  fully builder-exposed while its own `<description>` says "Deprecated - use layoutHeaderOne instead"
  [os:layoutHeader/layoutHeader.js-meta.xml:6-8] — sharpen to "scaffold from the non-deprecated sibling
  (`layoutHeaderOne`), and treat a deprecated-but-exposed component as a real scaffolding trap."
- **Data hierarchy (expression-bound `@api` first, then client Storefront APIs, then custom BFF Apex);
  expression props arrive `undefined` and re-fire.** **CONFIRMED** and central — this is the
  data-access ladder [os:productPricing/productPricing.js-meta.xml:29] [os:cartContents/cartContents.js:60].
  **REFINE:** the "custom BFF Apex only when neither covers" rung is never actually reached in 409
  bundles — sharpen to "in practice neither repo ever reaches Apex; treat it as a design smell, not a
  routine third option" (the one indirect reach is wrapped [os:selfRegister/selfRegister.js:4]).
- **"Avoid UI API wire adapters on storefronts."** **REFINE.** The behavioural avoidance is
  source-proven (UI API appears in exactly one non-placeable utility bundle
  [os:commonRecordFieldValue/commonRecordFieldValue.js:2], zero elsewhere) — sharpen the rule from
  "avoid" to "storefront domain data never comes through `lightning/uiRecordApi`/`uiObjectInfoApi`; the
  one exception is a generic record-field display utility." The SOQL-cost rationale itself is
  docs-backed (UNVERIFIED from source), but the rule is CONFIRMED by absence.
- **"Never invoke Connect REST via `fetch()`/`XMLHttpRequest`."** **CONFIRMED.** Zero `fetch(` and zero
  `XMLHttpRequest` across both roots; the alternative (cached `commerce/*` client APIs) is universal
  [os:cartSummary/cartSummary.js:2]. Keep as-is; add the source-verified "0 across 409 bundles" backing.

### 3.2 Heading: "Storefront APIs"
The framing ("prefer `commerce/*` / `experience/*` modules over hand-rolled Apex when they cover the
need") is **CONFIRMED** — it is the core thesis (`findings-data-access.md` §3 documents each module's
real usage). Module-by-module against source:
- **`commerce/actionApi`** — **CONFIRMED**, refine to "the page-context *write* path" (dispatch that
  lets the provider re-resolve siblings), not a general read API [os:cartItems/cartItems.js:203]. Not
  imported by the order/quote/subscription families — those use direct imperative calls.
- **`commerce/cartApi`** — **REFINE.** The reference's cart-responsibility list actually spans **two
  distinct modules**: `commerce/cartApi` (`refreshCartSummary`, `addItemToCart`) [os:reorderModal/reorderModal.js:51]
  and the larger `commerce/checkoutCartApi` (container-less cart CRUD + `CartStatusAdapter`)
  [os:cartSummary/cartSummary.js:2]. Sharpen: name both, and warn that `CartStatusAdapter` is exported
  by *both* (same name, different module).
- **`commerce/checkoutApi`** — **REFINE.** Distinguish `commerce/checkoutApi` (in-container:
  `CheckoutComponentBase`, `postAuthorizePayment`) [os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:3]
  from `commerce/checkoutCartApi` (container-less). "Place order" is the tree-wide
  `dispatchFinalizeAsync()` walk, not a single `checkoutApi` call [os:checkoutPlaceOrder/checkoutPlaceOrder.js:91].
- **`commerce/productApi`** — **CONFIRMED/REFINE.** Read-only adapters, used thin (1–3 bundles each)
  [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:2]. Add: PDP data usually
  arrives via `{!Product.*}` expression binding, not these adapters.
- **`commerce/wishlistApi`** — **CONFIRMED** [os:cartMinicartpanel/cartMinicartpanel.js:11]. Drop the
  vague "when compatible" qualifier.
- **`commerce/orderApi`** — **REFINE (important).** Only `startReOrder` is attested
  [os:reorderModal/reorderModal.js:45]; order *reads* (history, summary, items, delivery groups) arrive
  through `{!Order.*}` expression binding [os:orderAmount/orderAmount.js-meta.xml:16], **not** `orderApi`.
  Rewrite the responsibility list — most of what it claims for `orderApi` is expression-bound.
- **`commerce/contextApi` / `commerce/effectiveAccountApi`** — **CONFIRMED/REFINE.** Real exports are
  `AppContextAdapter`/`SessionContextAdapter` (`@wire`) [os:productPricing/productPricing.js:18] and the
  `effectiveAccount` singleton + `ManagedAccountsAdapter` [os:myAccountSwitcherList/myAccountSwitcherList.js:2];
  fix "`getSessionContext`" to `SessionContextAdapter`.
- **`commerce/myAccountApi`** — **CONFIRMED** [os:myAccountInputAddress/myAccountInputAddress.js:373].
- **`commerce/promotionApi`** — **REFINE.** Attested as `PromotionApplicableAdapter` wired off a
  cart-preview payload to fetch would-be promo pricing [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:6],
  not a general "evaluate promotions" call.
- **`commerce/activitiesApi`** — **CONFIRMED** [os:searchInputContainer/searchInputContainer.js:5]; the
  Einstein-Recommendations rationale is docs-backed (keep).
- **`experience/navigationMenuApi`, `experience/cmsDeliveryApi`, `experience/cmsEditorApi`** — split.
  `navigationMenuApi` is **CONFIRMED** (`getNavigationMenu` `@wire`) [os:commonDrilldownNavigation/commonDrilldownNavigation.js:21].
  `cmsDeliveryApi` and `cmsEditorApi` are **UNVERIFIED** — zero imports of either in either repo; keep
  only on official-docs backing and mark as not-attested-in-source.

### 3.3 Heading: "Commerce context"
- **"Pass or derive `webstoreId`, `effectiveAccountId`, `cartId`, `productId`, `recordId`,
  `communityId`, `siteId` explicitly; never hard-code."** **REFINE.** The "never hard-code" spirit is
  **CONFIRMED**, but the repos rarely pass these as manual props — they arrive via expression binding
  (`{!recordId}` [os:reorderButton/reorderButton.js-meta.xml:16]), context adapters
  (`SessionContextAdapter.effectiveAccountId`), and the `effectiveAccount` singleton
  [os:myAccountSwitcherList/myAccountSwitcherList.js:36]. Sharpen to "obtain each id from its provider
  channel (expression/context adapter/effective-account API), never a literal."
- **"Support both `recordId` and explicitly passed `productId`/`cartId` when the existing project does
  so."** **UNVERIFIED.** No clean source pattern of dual `recordId`+`productId` acceptance; keep as a
  project-convention hint, flag as not-repo-attested.
- **"Keep LWR and Aura/legacy separate; do not mix Aura controller assumptions into LWR."**
  **UNVERIFIED.** Both repos are 100% LWR/LWC; there is no Aura in either to attest or refute this. Keep
  only on general-guidance grounds and mark not-attested.

### 3.4 Heading: "Checkout components"
- **"Listen to `CartSummaryAdapter` / `CartItemsAdapter` / `CheckoutInformationAdapter`; wire these
  rather than querying cart records."** **REFINE (names wrong).** Grep: `CartSummaryAdapter` = 0 hits,
  `CheckoutInformationAdapter` = 0 hits; the one `CartItemsAdapter`-shaped match is actually
  `CheckoutDeliveryGroupCartItemsAdapter` from `commerce/cartApi`
  [os:checkoutDeliverymethodGroup/checkoutDeliverymethodGroup.js:7]. Checkout leaves take
  `{!Checkout.Details}` **expression binding**, not those adapters
  [os:checkoutDeliverymethod/checkoutDeliverymethod.js-meta.xml:16]. Rewrite to the real channel
  (expression binding + the checkout-engine base class); the three named adapters are UNVERIFIED.
- **"Custom child checkout components must implement the `useCheckoutComponent` mixin."** **REFINE
  (name wrong).** Grep: `useCheckoutComponent` = 0 hits. The real mechanism is extending
  `CheckoutComponentBase` from `commerce/checkoutApi` (12 os bundles)
  [os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:3]. Replace the mixin name with the
  base class; a hand-rolled aspect-propagation component that does not extend it will not interoperate
  [os:checkoutSectionOnePage/checkoutSectionOnePage.js:35-79].
- **"Change delivery methods via `updateDeliveryMethod(methodId)`, then `notifyAndPollCheckout`."**
  **REFINE (names wrong).** Grep: both = 0 hits. The attested contract is the two-phase
  `await this.dispatchUpdateAsync({...}); this.dispatchCommit();`
  [os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:172]. Rewrite to
  dispatchUpdateAsync→dispatchCommit; the named helpers are UNVERIFIED.
- **"Execute cart/checkout mutations sequentially; await each before the next."** **CONFIRMED.**
  Await-then-commit / await-then-act is universal [os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:172]
  [os:reorderModal/reorderModal.js:51]. The specific "Version Mismatch / Checkout Conflict" error names
  are docs-backed; the sequencing rule is source-proven.
- **"No optimistic checkout UI without rollback; show loading; guard adapters firing before shipping /
  calculations complete."** **CONFIRMED.** undefined-first-render guarding plus the engine-readiness
  gate [os:checkoutDeliverymethod/checkoutDeliverymethod.js:31] [os:checkoutNotification/utils.js:1-14].
- **"Keep delivery method names configurable/label-driven; don't hard-code `Standard`/`Dropship`/
  `Click & Collect`."** **CONFIRMED (by absence).** `Dropship` and `Click & Collect` = 0 hits across
  both roots; behaviour is derived from data flags, not display text
  [os:promotionEvaluatePriceDiscount/promotionEvaluatePriceDiscount.js:1] (analogous gate-on-boolean).
- **"For manual address entry, validate required fields client-side before mutating cart delivery
  group state."** **CONFIRMED.** First-error focus + client validation before mutate
  [os:myAccountInputAddress/myAccountInputAddress.js:413] [os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:631].

### 3.5 Heading: "Product, search, and quick order"
- **"Product listing/search use Commerce product/search APIs or existing storefront data contracts
  before custom SOQL."** **CONFIRMED.** No SOQL/Apex anywhere; search reads via `{!Search.Results}`
  binding and `ProductSearchAdapter` [os:searchResults/searchResults.js-meta.xml:16].
- **"Search result labels builder-configurable: line 1 `Name`, line 2 SKU field, line 3 alternate/OEM
  part."** **REFINE / partly UNVERIFIED.** The general "search fields are builder-configurable" is
  CONFIRMED (search field/label props are builder-exposed and label-driven, per `notes/search.md`); the
  specific line1/line2/line3 `StockKeepingUnit`/OEM scheme is **UNVERIFIED** (project-specific, not a
  fixed repo convention). Keep the three-line scheme as a project default, mark it not-repo-mandated.
- **"Quick order / CSV upload validate SKU, quantity, min/max, increment, unavailable, partial
  failures; bulk add-to-cart reports per-line success/failure, not one aggregate."** **REFINE.**
  Quantity-rule validation (min/max/increment via a single `quantityRule` object) is **CONFIRMED**
  [os:productAddQuantity/productAddQuantity.js:47-61]; the per-line partial-failure reporting contract
  is **UNVERIFIED** in source (no bulk-CSV component read exposed it) — keep as a requirement, mark
  not-repo-attested.
- **"Quantity components enforce minimum, maximum, disabled-cart, no-quantity, increment-multiplier
  consistently."** **CONFIRMED.** [os:productAddQuantity/productAddQuantity.js:47-61]
  [col:productQuantitySelector/constants.js:13-18] (col's error-label map for the same rules).
- **"For OEM/region behavior, derive from account fields / custom metadata / selector output — don't
  branch on display text when a data flag exists."** **REFINE.** The "don't branch on display text,
  derive from a data flag" principle is **CONFIRMED** in spirit (promotion/pricing gate on booleans,
  not rendered text [os:promotionEvaluatePriceDiscount/promotionEvaluatePriceDiscount.js:1]); the
  OEM/region specificity is **UNVERIFIED** — generalize the rule and keep OEM as one example.

### 3.6 Heading: "Storefront performance"
- **"Annotate storefront Apex as cacheable; keep custom Apex under three per interaction; avoid n+1;
  parallelize/aggregate higher in the tree; never fetch the same data twice."** **UNVERIFIED (Apex
  parts).** With zero Apex in 409 bundles, "cacheable Apex" and "under three Apex calls per interaction"
  are unobservable here — keep only on the Apex-Commerce-reference/docs backing, and note the repos
  sidestep the question entirely by not calling Apex. The "aggregate retrieval higher in the tree /
  don't fetch twice" idea is loosely consistent with the container/`*Ui` split (container fetches once,
  `*Ui` receives props) [os:cartItems/cartItems.js:203] but is not a measured performance rule.
- **"Match image byte size; serve via platform image optimization (`experience/picture` /
  `createImageDataMap`); prefer CMS; CDN + `cache-control` if self-hosting."** **CONFIRMED.** Images go
  through `experience/resourceResolver.resolve()` then `experience/picture.createImageDataMap()`
  [os:productGalleryImage/productGalleryImage.js:2] [os:cartItem/cartItem.js:13]. Keep; add the resolver
  step as a required precursor.
- **"Reduce asset origins; `preconnect`; defer third-party scripts `async`; limit IFrames; remove
  unused resources."** **UNVERIFIED.** No `<link rel="preconnect">` or third-party-script deferral
  attested in either repo; the closest source touchpoint is the guarded `loadScript` idiom that
  presence-checks the SDK global before re-injecting [os:paymentProcessing/paymentProcessing.js:102-104].
  Keep as docs-backed perf guidance, mark not-repo-attested.
- **"Check permissions with `@salesforce/userPermission` / `@salesforce/customPermission`; never
  implement permission logic client-side; never block page rendering on a permission check."**
  **REFINE (important).** Grep: **zero** `@salesforce/userPermission` / `@salesforce/customPermission`
  imports across os. The repos gate feature access on `SessionContextAdapter.isLoggedIn` checked at the
  point of interaction (redirect guests to Login rather than render-disabled)
  [os:cartCreateButton/cartCreateButton.js:36-51]. Sharpen: the attested gating channel is the session
  context adapter, not the permission modules; note that guest-vs-auth *is* checked client-side to
  redirect (nuancing "never client-side"). The permission modules themselves are UNVERIFIED (docs-backed).

### 3.7 Heading: "Store configuration (review-time checklist)"

- **"Check org/store settings before coding around them: Faster Add to Cart, Reduce Entitlement
  Checks, Secure Browser Caching, Displayable Fields, stale promotions, Aura→LWR migration."**
  **UNVERIFIED (out of repo scope, keep).** These are org/store admin settings; component source cannot
  attest them and neither repo references them. No contradicting evidence either — the closest
  repo-side touchpoint is that promotion/pricing display always defers to the server-evaluated payload
  rather than client recomputation (§1.11), consistent with the checklist's "configure, don't code
  around" stance. Keep on docs backing, mark not-repo-attested.

### 3.8 Heading: "Measuring"

- **"Measure before/after; Core Web Vitals on representative mobile over 4G; Lighthouse/WebPageTest;
  Salesforce Page Optimizer; RUM/CrUX."** **UNVERIFIED (out of repo scope, keep).** Pure measurement
  tooling/process guidance; nothing in either repo attests or contradicts it (no perf-measurement code
  ships in the bundles). Keep on docs backing, mark not-repo-attested.
