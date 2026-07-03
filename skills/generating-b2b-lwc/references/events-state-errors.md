# Events, State & Errors — custom-event contracts, loading/processing flags, undefined guards, error normalization, and preview/SSR guards

> Part of `generating-b2b-lwc` — see SKILL.md for the always-on Quick Reference and routing. This
> file owns the **runtime behavior** of a storefront component: how it names and shapes custom
> events, how it manages loading/processing state, how it guards the `undefined`-first-render frame,
> how it turns server errors into user-facing text, and how it short-circuits in preview and SSR.
> Mutation **mechanics** — the four write shapes and the refresh rules that pair with them — live in
> `references/data-access.md`; this file owns the flag/guard/error discipline *around* them and
> cross-references those mechanics rather than re-deriving them. Bundle anatomy and the container/`*Ui`
> split are in `references/component-structure.md`; a11y and styling in
> `references/accessibility-and-styling.md`.

## Custom-event contracts

### Name the event once, in a bundle-local `constants.js`

Custom events are **flat, all-lowercase, no dashes**, named as a custom-namespaced verb —
`deletecartitem`, `changequantity`, `facetvaluetoggle`, `saveprofile`, `accountselect`. The name
string is **centralized in a bundle-local `constants.js`** that both the dispatching leaf and the
listening container import; it is never inlined as a string literal in two places, where a typo in
one would silently break the relay.

```js
// constants.js
export const CHANGE_QUANTITY_EVENT = 'changequantity';
export const DELETE_CART_ITEM_EVENT = 'deletecartitem';
```

Both the leaf that does `this.dispatchEvent(new CustomEvent(CHANGE_QUANTITY_EVENT, {...}))` and the
container that does `<c-child onchangequantity={handleChangeQuantity}>` reference the same export.
Search's filter panel keeps its event names in the same shape — the aggregator imports its own event
constants rather than re-typing `facetvalueupdate` at each dispatch site.

### Set `bubbles` / `composed` deliberately per event — never blanket

Most cross-boundary mutation events set **both** `bubbles: true, composed: true` so they cross shadow
boundaries up to the container that converts them into a data mutation. But this is **not uniform,
and the variation is intentional, not noise.** Within a single cart bundle, a `changequantity` event
sets both flags while its siblings `deletecartitem` / `splitcartitem` / `changedeliverygroup` set
`bubbles` only. A quantity selector re-emits `valuechanged` / `validitychanged` as
bubbling-and-composed but emits `outofstock` **non-bubbling** because that signal is component-local.

Choose per event by asking *how far this signal must travel*:

- **`bubbles: true, composed: true`** — the event must reach a container across one or more shadow
  boundaries (the common case for a mutation event a leaf raises and an ancestor converts to a write).
- **`bubbles: true` only** — the event bubbles within the same shadow tree but is not meant to escape
  the component's own DOM boundary.
- **Neither** — a purely component-local signal (`outofstock`) handled by the immediate parent.

Do **not** assert a blanket composed/bubbles rule and stamp it on every event; decide each one.

### Containers re-shape child events under the same name

A recurring contract: a leaf fires a local event, the container **`stopPropagation()`s it and
re-dispatches an enriched detail under the *same* event name**, preserving the child's public
contract while adding context the child could not compute. A quantity-selector container receives the
`valuechanged` / `validitychanged` events from an inner number-input leaf, stops them, and
re-dispatches the same-named events with a computed localized `description` added to the detail:

```js
handleValueChanged(event) {
    event.stopPropagation();
    this.dispatchEvent(
        new CustomEvent('valuechanged', {
            detail: { ...event.detail, description: this.computeDescription(event.detail) },
            bubbles: true,
            composed: true,
        })
    );
}
```

The name stays `valuechanged` so any ancestor already listening for it keeps working; only the detail
grows. Intermediate `*Ui` layers that neither consume nor enrich the event let it **bubble through
untouched**.

### Aggregate-then-debounce chains

When many leaves each emit a small change but the server should see one coalesced update, insert a
single **aggregator** between the leaves and the mutation dispatch. Search filters are the reference
shape:

1. Leaf facet items fire `facetvaluetoggle` / `facetvaluepricefilter` on each interaction.
2. One aggregator maintains a facet map, updates it **optimistically** on each event, **debounces
   ~300ms**, and then re-dispatches a single `facetvalueupdate` carrying the coalesced
   `{ mruFacet, refinements, minPrice, maxPrice }`.
3. Intermediate `*Ui` layers let that event bubble through untouched.
4. Exactly **one** ancestor converts the aggregated DOM event into a `commerce/actionApi` dispatch
   (the mutation mechanics for that dispatch are in `references/data-access.md`).

Not every path debounces: a price-range **apply** bypasses the debounce and dispatches immediately,
because it is an explicit commit rather than a stream of toggles. Debounce the noisy streams; let
deliberate applies through at once. (`experience/utils` supplies `debounce` / `clearDebounceTimeout`
for this — see the module surface in `references/data-access.md`.)

### Two escape hatches to recognize (not to reach for first)

Some components dispatch on `document` / `window` rather than on `this`, bypassing normal bubbling —
a cart-create modal fires `cartupdated` / `reloadCartList` on `document`, and search result grids
**listen** on `window` for `filterchanged` / `morepagesavailable` whose dispatcher is platform code.
These are legitimate where the two endpoints have no DOM ancestry between them, but they are the
exception: prefer a named `CustomEvent` on `this` with deliberate `bubbles`/`composed` whenever the
listener is an ancestor. Also note that composition through markup tags (a parent embedding a child by
`<c-child>` tag with no JS import) carries events with no import to grep — the event contract is the
source of truth, not the import list.

### Modal contracts — both idioms

Modals ship **no `<targets>`** — they are only ever opened imperatively, never dropped from the
Builder palette. Two completion idioms coexist; match the one the modal you are opening (or
authoring) already uses.

**Idiom 1 — `lightning/modal` static `.open()` with config callbacks.** The caller imports the
modal bundle's default export and calls `Modal.open({...})`, passing initial state as plain config
keys **and** completion callbacks as `on<event>` keys in the *same* config object. The modal resolves
by calling `this.close(result)` with a short string sentinel the caller branches on:

```js
// caller — cross-bundle imports use the `site/` specifier in a CMS-workspace bundle
// (a classic `lwc/` bundle uses `c/` instead; see references/component-structure.md)
import CartCreateModal from 'site/cartCreateModal';

async handleClick() {
    const result = await CartCreateModal.open({
        size: 'small',
        cartName: this.defaultName,        // initial state as a plain config key
        onnamechange: (e) => this.track(e), // callback as an on<event> config key
    });
    if (result === 'success') {
        this.refreshList();
    }
}
```

```js
// inside the modal
this.close('success'); // short string sentinel the caller branches on
```

**Idiom 2 — the cancelable `<type>actionclick` + `detail.close(result)` contract.** A shared modal
shell fires a **cancelable** `primaryactionclick` / `secondaryactionclick` event whose detail carries
a `close(result)` escape hatch. If the listener does **not** call `preventDefault()`, the modal
self-closes with the button type as the result; if the listener needs to run async validation before
closing, it calls `preventDefault()` and later invokes `detail.close(result)` itself:

```js
// shell — fire cancelable, self-close only if not prevented
handlePrimary() {
    const event = new CustomEvent('primaryactionclick', {
        cancelable: true,
        detail: { close: (result) => this.close(result) },
    });
    this.dispatchEvent(event);
    if (!event.defaultPrevented) {
        this.close('primary');
    }
}
```

```js
// listener that needs to validate before closing
handlePrimaryActionClick(event) {
    event.preventDefault();               // take over the close
    this.validateAsync().then((ok) => {
        if (ok) event.detail.close('primary');
    });
}
```

Use Idiom 1 when the caller owns the whole modal lifecycle and just wants a resolved result; use
Idiom 2 when the modal shell is shared and each host wants to intercept the primary/secondary action
before it closes.

## Loading & processing state

### One local boolean, cleared on both paths

Processing/loading is a **component-owned boolean** (`isAddToCartInProgress`, `_showPageSpinner`,
`_isLoading`, `_applyingChanges`) set immediately before the async call and cleared in **both** the
success and the error branch — never only on success, where a failure would hang the spinner forever.
Clear it in the callback pair for a dispatched action, or in `finally` for a promise:

```js
// commerce/actionApi dispatch — clear in BOTH callbacks
this.isAddToCartInProgress = true;
dispatchAction(this, createCartItemAddAction(this.itemInput), {
    onSuccess: () => { this.isAddToCartInProgress = false; },
    onError:   () => { this.isAddToCartInProgress = false; /* + surface a mapped error */ },
});
```

```js
// promise-based imperative call — clear in finally
this._applyingChanges = true;
try {
    await updateMyAccountAddress(this.addressInput);
} catch (error) {
    this.errorLabel = this.getErrorInfo(error);
} finally {
    this._applyingChanges = false; // fires on success AND failure
}
```

(Which of these two shapes applies is governed by the mutation mechanics in
`references/data-access.md`: page-context `actionApi` dispatches use the callback pair; out-of-context
imperative calls use `try/finally`.)

### Disable the trigger for the async window

The control that started the work **disables for the duration** of the async call so a double-click
cannot fire a second mutation. Drive the trigger's `disabled` from the same processing flag:

```html
<button disabled={isAddToCartInProgress} onclick={handleAddToCart}>...</button>
```

### Fold a wire's own loading flag in — never trust it alone

When a `@wire` supplies its own `loading` boolean, **OR it with the local flag** rather than relying
on the wire alone — the component is often mid-mutation while its read wire reports "not loading":

```js
get showSpinner() {
    return this._applyingChanges || this.wiredData?.loading;
}
```

(Checkout is the exception: it has an engine readiness gate rather than a plain boolean —
`checkoutStatusIsReady`, where a `202 AsyncInProgress` means the engine is still recalculating. That
is checkout-engine mechanics, covered under the checkout mutation shape in
`references/data-access.md`.)

## Undefined-on-first-render guards

An expression-bound `@api` property is **`undefined` on the first render pass**, before the page
provider resolves it (the data-access basis for this is in `references/data-access.md`). Every
consumer must treat that `undefined` as **"not loaded yet" — never as "empty" or "error."** This file
owns the full guard treatment.

### The three-state gate

Distinguish three states, not two: **loading** (`undefined` / `null`), **loaded-and-empty** (a real,
empty array), and **loaded-with-results**. The empty-state UI must flip on only when the data has
actually resolved to an empty collection, never on a falsy check that also catches the pre-resolve
frame:

```js
get isLoading() {
    // undefined/null → still resolving, NOT empty
    return !Array.isArray(this.items);
}
get isEmpty() {
    // a real, resolved, empty array — the only true "empty"
    return Array.isArray(this.items) && this.items.length === 0;
}
get hasResults() {
    return Array.isArray(this.items) && this.items.length > 0;
}
```

Worked shapes seen across families: a cart-contents component treats `!this.items` (unresolved) as
still-processing and flips to empty only once `items` is a real array; a search empty-layout is an
explicit three-state gate (loader when `undefined`/loading, no-results only when the total is exactly
`0`, results when `> 0`); promotion components gate on `Array.isArray(x) && x.length > 0` before
mapping.

### Optional-chain every read into a bound property

Because the property starts `undefined`, optional-chain every access into it and provide nullish
defaults — `checkoutDetails?.deliveryGroups?.items`, `product?.pricing?.listPrice`. A bare
`this.checkoutDetails.deliveryGroups` throws on the first frame.

### Prefer a truthiness / explicit-`undefined` guard over `=== null`

A provider that emits `undefined` before it emits data falls **straight through** a `=== null` guard
into the display branch, rendering against undefined data. Prefer a truthiness guard (`!!value`) or an
explicit `undefined` check. Sibling components in the order/quote area diverge here — some guard
strictly on `=== null` (so `undefined` slips through to the success branch) while others use `!!` —
and the `!!` form is the safer default. When you see an `=== null` guard on an expression-bound prop,
treat it as suspect.

### `@api` setters reject bad input rather than propagate it

Numeric and value setters **validate type and silently no-op** on `undefined` / non-numeric writes,
so a bad or pre-resolve write cannot blow away a good default:

```js
// commonNumberInput-style value setter — accept only a real number
@api
get value() {
    return this._value;
}
set value(value) {
    if (typeof value === 'number' && !isNaN(value)) {
        this._value = value;
    }
    // else: silently ignore — do not propagate undefined/NaN into local state
}
```

The same discipline appears on address setters that guard `if (value)` around `country` / `province`
so an undefined write does not clear a merchant-set default. A setter that blindly assigns whatever it
receives is the defect this guards against.

## Error normalization & surfacing

**Never surface raw server error text or codes to a shopper.** Map an error to a pre-imported label
with an explicit default. Two shapes recur.

### Shape A — a code→label map with an explicit default

A small `getErrorInfo(code, labelMap)` / `_codeToMessageMap` switches an API error-type string to a
pre-imported label, always with a fallback for unknown codes:

```js
import { LABELS } from './labels';

const CODE_TO_LABEL = {
    LIMIT_EXCEEDED: LABELS.couponLimitExceeded,
    INVALID_COUPON: LABELS.couponInvalid,
    EXPIRED: LABELS.couponExpired,
};

function getErrorInfo(code) {
    return CODE_TO_LABEL[code] ?? LABELS.genericError; // explicit default, never a raw code
}
```

This shape appears as a coupon error-code evaluator, a product add-to-cart `AddToCartErrorType` map, a
delete-confirmation `getErrorInfo(exception, isPreviewMode)`, a quote-to-cart
`getQuoteToCartErrorMessage` switch, and a ~25-code profile map — each with the same "known code →
label, else default" contract.

### Shape B — a single shared normalizer reused across sibling modals

Where several sibling components need identical normalization, they import **one shared normalizer**
rather than each re-implementing the map. Subscriptions expose `getARCToastMsg(exception,
fallbackLabel)` — the Amend/Renew/Cancel normalizer — imported by every amend/renew/cancel modal:

```js
import { getARCToastMsg } from 'commerce/subscriptionApi';
// ...
catch (error) {
    Toast.show({ label: getARCToastMsg(error, LABELS.amendFailed), variant: 'error' }, this);
}
```

### Layered resolution before the map

Error payloads arrive in more than one shape, so resolution is commonly **layered**: try the LDS
array shape `error?.[0]?.message`, then the commerce shape `error?.errors?.[0]?.message`, then fall
through to the code map. Do not read a single fixed path and assume it is populated.

### `commerceErrors` is a static registry, not a runtime normalizer

`commerceErrors` is a **static error-code registry** — `{ code, message }` pairs — **not** a runtime
normalizer function. Do not model a normalizer on it or cite it as normalizer precedent. When you need
to turn a caught error into a label at runtime, use Shape A or Shape B; `commerceErrors` is a lookup
table, not the mechanism that resolves a live error.

### Display-layer error primitives — pick by scope

Errors surface through **separate, purpose-specific display components**, not one catch-all. Choose by
where the error belongs:

| Scope | Primitive | Behavior |
|---|---|---|
| Inline, beside a field | `commonError` | Renders a single field-level error message. |
| Whole page | `commonPageLevelErrorMessage` | Full-page error block for a page-fatal failure. |
| Scoped, in-context banner | `commonScopedNotification` | SLDS scoped notification; renders only when a `type` **and** text are present, with `role="alert"`. |
| Transient toast | `commonToast` | Extends the platform toast; forces `mode: 'dismissible'`. |

Async mutation failures route through the toast — `Toast.show({ label, variant: 'error' }, this)`
with a **mapped** label from Shape A/B, never the raw error. Match the primitive to the error's blast
radius: a single bad field is inline, a recalculation failure that invalidates the page is
page-level, an in-flow warning is a scoped notification, a transient async failure is a toast.

## Access, preview, and SSR guards

### Guest-vs-authenticated, checked at the point of interaction

Feature access is gated on `SessionContextAdapter.isLoggedIn`, checked **at the point of interaction**
— an unauthenticated shopper is **redirected** to a `Login` / `comm__namedPage` rather than shown the
feature rendered-but-disabled:

```js
handleCreateCart() {
    if (!this.isLoggedIn) {
        this.navigateToLogin();   // redirect, don't render a disabled control
        return;
    }
    // ...proceed with the authenticated action
}
```

A widely-copied special case sits on the mutation error path: after a caught error,
`toCommerceError(error).code === 'GUEST_INSUFFICIENT_ACCESS'` diverts a guest to login instead of
showing a toast:

```js
catch (error) {
    if (toCommerceError(error).code === 'GUEST_INSUFFICIENT_ACCESS') {
        this.navigateToLogin();
    } else {
        Toast.show({ label: getErrorInfo(error), variant: 'error' }, this);
    }
}
```

The `'GUEST_INSUFFICIENT_ACCESS'` sentinel is **redefined as a local string literal** in each mutation
path across the product area — that repetition is a typo risk. When you author this branch, define the
code once (a bundle constant) and reference it, rather than re-typing the literal at each site.

### Preview / design-mode guards — never mutate on the Builder canvas

Short-circuit builder-canvas behavior through `experience/clientApi`'s `isDesignMode` /
`isPreviewMode`. Two applications:

- **Suppress loading UI on the canvas** — a cart-contents component never renders a spinner in design
  mode, and a quote accept-and-buy button is always shown/enabled in design mode so the merchant can
  see it laid out.
- **Guard every mutation** — a write path must call a preview guard *first* so a preview render can
  never write data. Every profile mutation calls `_preventActionInPreview()` before touching data:

```js
async handleSave() {
    if (this._preventActionInPreview()) {
        return; // design/preview → do not write
    }
    // ...proceed with the mutation (see data-access.md for the mutation shape)
}
```

Every mutation the component can perform gets this guard; a write path with no preview guard corrupts
data on the Builder canvas.

### SSR guards for `lightning__ServerRenderableWithHydration`

A component declaring the `lightning__ServerRenderableWithHydration` capability renders on the server
where the DOM and browser globals do not exist. **Gate all DOM-only work** —
`IntersectionObserver` / `ResizeObserver` / `matchMedia` / sanitizers / `window` reads — behind
`!import.meta.env.SSR`, and **tear observers down in `disconnectedCallback`**:

```js
renderedCallback() {
    if (import.meta.env.SSR) {
        return; // server pass: no DOM, no observers
    }
    if (!this._observer) {
        this._observer = new IntersectionObserver(this.handleIntersect);
        this._observer.observe(this.refs.sentinel);
    }
}

disconnectedCallback() {
    this._observer?.disconnect(); // always tear down
}
```

A second, interchangeable idiom is `globalThis.document?.` / `globalThis.location?.` optional
chaining for one-off reads. Both are acceptable; a **bare, unguarded `document.addEventListener`** (or
`window.innerWidth`, or a raw `IntersectionObserver` construction) in an SSR-capable component is the
one unacceptable form — it throws during the server pass. For SSR-safe unique ids, a classic-package
variant generates them with `crypto?.randomUUID?.()` plus a counter fallback rather than a
DOM-derived id.

## What to never do (behavior negative space)

- **Never treat an expression-bound prop's first-render `undefined` as "empty" or "error"** — it
  means "not loaded yet"; use the three-state gate.
- **Never leave a processing flag uncleared on the error path** — clear it in both callbacks or in
  `finally`, and disable the trigger for the async window.
- **Never surface raw server error text or codes** — map code → pre-imported label with an explicit
  default (Shape A) or reuse a shared normalizer (Shape B); `commerceErrors` is a static registry, not
  a normalizer.
- **Never inline a custom-event name as a literal in two places** — centralize it in `constants.js`.
- **Never stamp `bubbles`/`composed` on every event blindly** — set them per event by how far the
  signal must travel.
- **Never mutate during Builder preview / design mode** — guard the write path first
  (`_preventActionInPreview()` / `isDesignMode`).
- **Never do bare DOM/browser work in an SSR-capable component** — gate it behind
  `!import.meta.env.SSR` and tear observers down in `disconnectedCallback`.
- **Never render an unauthenticated shopper a disabled feature** where the pattern is to redirect —
  gate on `SessionContextAdapter.isLoggedIn` at the point of interaction and navigate to login.
