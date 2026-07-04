# Component Structure — bundle packaging, the container/`*Ui` split, Builder exposure, and labels/i18n

> Part of `generating-b2b-lwc` — see SKILL.md for the always-on Quick Reference and routing. This
> file owns **how a storefront bundle is shaped and packaged**: CMS-workspace vs classic bundle
> layout, the container/`*Ui` composition split (what each half owns and when to add a third tier),
> the Experience-Builder `js-meta.xml` exposure surface, and the per-bundle label/i18n conventions
> including currency/locale formatting. Where data comes from and how it writes back —  expression
> roots, the `commerce/*`/`experience/*` module surface, and the four mutation shapes — lives in
> `references/data-access.md` and is **not** re-derived here; that file also carries a minimal
> container/`*Ui` worked skeleton, whereas this file is the authoritative deep treatment of the
> split. Undefined-guard idioms, processing flags, event contracts, and error normalization live in
> `references/events-state-errors.md`; a11y and the styling bridge in
> `references/accessibility-and-styling.md`.

## Bundle packaging — CMS-workspace vs classic, pick by where it deploys

A storefront LWC ships in one of **two physically different container formats**, and this is the
first thing to settle before authoring: the `.js`/`.html`/`.js-meta.xml` core is identical between
them, but the surrounding packaging files are not, and getting them wrong means the component either
fails to register as content or carries dead metadata.

**CMS-workspace bundles** (the default for a component packaged as managed CMS content inside a
DigitalExperienceBundle). The bundle lives under a `sfdc_cms__lwc/<bundle>/` workspace path and
carries, **in addition to** the ordinary LWC files, two CMS-workspace wrapper files that a classic
bundle never has: `_meta.json` and `content.json`. Ship **both** — they are how the component
registers as CMS content, not an optional extra.

`_meta.json` records the content's `apiName`, the fixed `"type": "sfdc_cms__lwc"`, and a `path`:

```json
{
    "apiName": "cartItems",
    "type": "sfdc_cms__lwc",
    "path": ""
}
```

`content.json` records the same `type`, a `title` (the bundle name), an empty `contentBody`, and a
**lowercased** `urlName`:

```json
{
    "type": "sfdc_cms__lwc",
    "title": "cartItems",
    "contentBody": {},
    "urlName": "cartitems"
}
```

A styled CMS-workspace bundle additionally ships a scoped-style `.scoped.css` and, where it needs a
bundled icon sprite, a `.svg` alongside these.

**Classic `lwc/` bundles** (a conventional unmanaged-package source tree). The bundle lives under
`lwc/<bundle>/` and contains **only** the ordinary LWC files — `<name>.js`, `<name>.html`,
`<name>.js-meta.xml`, optional helper `.js`, `labels.js`, `.scoped.css`. It ships **no**
`content.json` and **no** `_meta.json`. Its namespace/packaging story is carried at the repo root by
a `jsconfig.json` (mapping `c/*` → `*`) and `package.json`, not by per-bundle CMS metadata.

**The rule:** match the packaging to the deploy target. A CMS-workspace bundle **must** include the
`_meta.json`/`content.json` pair or it will not register as CMS content; a classic bundle **must
not** include them. This is purely a packaging/deployment layer on top of otherwise-standard LWC —
everything else in this file applies to both formats.

## The container / `*Ui` split — the default composition shape

The default composition shape is a **two-part container/presentation split**: a builder-facing
**container** owns all data access and the design surface, and renders exactly one **`*Ui` leaf**
that owns markup and presentation. Reach for this split whenever a component has both a data channel
and non-trivial presentation — it is the dominant shape across cart, common, product, order, quote,
checkout, and search, and it is stated as a hard convention in the families that have it.

**What the container owns** — and nothing below this line belongs in the leaf:

- the `{!...}` expression-bound `@api` defaults (see `references/data-access.md` for the roots and
  worked bindings);
- `@wire` / imperative `commerce/*` data access and the `commerce/actionApi` dispatch;
- the `js-meta.xml` `<targets>` / `<targetConfigs>` design surface (Builder exposure, below);
- CSS-custom-property computation from builder-exposed design props (the styling bridge —
  `references/accessibility-and-styling.md`).

**What the `*Ui` leaf owns** — and nothing above this line belongs in it:

- markup and `lwc:ref` DOM handles;
- keyboard / focus / presentation logic;
- re-dispatching child events upward.

Everything the leaf needs arrives through **plain** (non-expression) `@api` props passed by the
container. The leaf declares **no `<targets>`** — it is either `isExposed="true"` but non-placeable
(no `<targets>` block) or `isExposed="false"`, so a merchant can never drop it on a page
independently. A `*Ui` that holds its own `@wire` or mutates data is a **defect**, not a shortcut:
the whole point of the split is that the leaf is pure presentation and independently testable.

A worked container skeleton (setter parse + undefined guard + pass-down) is in
`references/data-access.md`; do not duplicate it — the deep points here are ownership, meta
conventions per half, and when to add tiers.

### When to add a third tier

Add a third presentational tier when a leaf itself decomposes into a reusable sub-presentation
piece — the split chains, it does not flatten. Attested three-level chains: a coupon container →
its `*Ui` → a shared button `*Ui`; a drilldown-navigation container → its `*Ui` → one of two
render-shape leaves (a bar variant or a list variant). Each added tier still obeys the same rule:
only the top container carries `<targets>` and data access; every tier below is meta-less
presentation taking plain `@api` props.

### When the split does not apply

Two shapes legitimately skip it, and recognizing them prevents forcing a split where it adds no
value:

- **A near-pure pass-through** wrapper (three `@api` props, no logic) still keeps the container/leaf
  split for builder-placeability, but the container is almost empty — that is expected, not a smell.
- **A genuinely monolithic** component — a large product-card-style bundle with wiring, mutation,
  and presentation in one file, or a complex bundle with no `*Ui` pair — exists in source. Treat it
  as the exception, not the template: prefer the split, and only collapse to one file when the
  component has no meaningful presentation/data seam to cut along.

Page-facing wrappers in the order/quote/subscription area sometimes name the leaf `*Display` instead
of `*Ui` (e.g. an order-details container rendering a `*-display` child); the naming varies but the
ownership rule is identical — the wrapper is a thin pass-through, the child carries all derivation
and declares no `<targets>`.

### The builder-wrapper alternative (advanced / reuse-oriented)

There is a second, customization-oriented way to cut the same concern — the **`builder*` wrapper**
split. Instead of a data-owning container rendering a presentation leaf, it inverts to an **exposed
wrapper** around an **internal presentational component**:

- a `builder*` bundle is the **exposed** surface (`isExposed="true"`, declares its `<targets>`,
  does the expression/data binding and `commerce/actionApi` dispatch);
- it wraps an **internal** component (`isExposed="false"`, primitive `@api` props, no data imports)
  whose template is a single tag fed derived primitives.

For example, a single exposed pricing component that does both data access and presentation can be
refactored into a `builderProductPricing` wrapper (exposed, two targets) around an internal
`productPricing` (`isExposed="false"`) whose template is one `<c-product-pricing>` fed derived
values.

**Teach the container/`*Ui` split as the default; reach for the `builder*` wrapper only when the
internal presentational component needs to be independently reusable and testable** across more than
one exposed surface. The wrapper split's payoff is exactly that reusable, data-free inner
component — it is an advanced/customization path, not the everyday shape.

## Experience-Builder exposure — treat the `js-meta.xml` as a template

Builder-placeable storefront components share a tight, repeated `js-meta.xml` shape. Treat it as a
template; do not reinvent the exposure surface per component.

### Targets

A page-placeable component declares **both** the page target and the default target:

```xml
<targets>
    <target>lightningCommunity__Page</target>
    <target>lightningCommunity__Default</target>
</targets>
```

A theme-layout component instead declares the single theme-layout target and carries **no** palette
section:

```xml
<target>lightningCommunity__Theme_Layout</target>
```

An internal or leaf component — every `*Ui`, evaluator, or utility module — ships a `js-meta.xml`
with **no `<targets>` block at all**. It is `isExposed="true"` (or `"false"`) but deliberately not
builder-placeable. A large share of storefront bundles are meta-less in exactly this way, and every
one is genuinely internal — do not add a `<targets>` block to a leaf to "make it show up."

### `paletteSection` "Open Code"

Group these storefront components in the Builder palette under a dedicated `paletteSection`, declared
on the `lightningCommunity__Page` targetConfig:

```xml
<targetConfig targets="lightningCommunity__Page">
    <property .../>
    ...
    <paletteSection>Open Code</paletteSection>
</targetConfig>
```

This is the marker that separates storefront components from standard Lightning components in the
palette — apply it to every page-placeable component you generate.

### Hide every expression-bound prop from the property panel

Expression-bound data props (the `{!...}` defaults — see `references/data-access.md`) must be
**hidden from the Builder property panel**, so a merchant cannot accidentally overwrite the
page-provider binding. The mechanism is a `<designLayout>`/`<designSection>` block whose
`<designLayoutProperty>` entries carry a `cbVisibleIf` expression:

- `cbVisibleIf="<prop>=false"` — show the prop **only** when it is unbound (the standard form; pair
  one with each expression-bound prop). For example, cart-context props each gate on their own name:

```xml
<designLayoutProperty name="items" cbVisibleIf="items=false"></designLayoutProperty>
<designLayoutProperty name="pagination" cbVisibleIf="pagination=false"></designLayoutProperty>
<designLayoutProperty name="hasNextPageItems" cbVisibleIf="hasNextPageItems=false"></designLayoutProperty>
<designLayoutProperty name="currencyIsoCode" cbVisibleIf="currencyIsoCode=false"></designLayoutProperty>
```

- `cbVisibleIf="false"` — hide an expression-only prop **unconditionally** (the simpler variant,
  used where the prop is never merchant-editable, e.g. an approaching-discounts payload or raw
  internationalization/consent data).

**Every expression-bound prop pairs with such a design-layout entry.** Ship a bound `@api` prop
without its `cbVisibleIf` hide, and the merchant sees an editable text field that silently breaks the
provider binding when touched.

### Configurable design properties — reuse shared datasources, mark translatable

Merchant-configurable design properties follow consistent conventions:

- **Color and size** are exposed as typed `<property>` entries that map to CSS custom properties at
  render (the styling bridge — `references/accessibility-and-styling.md`), e.g. paired color props
  like `linkColor`/`linkHoverColor`/`textColor`/`dividerColor`.
- **Picklist-style properties reuse shared Java datasources** rather than inline enumerations, so the
  Builder dropdown stays consistent across the storefront. Reference the datasource by its
  `java://...` specifier — for text size:

```xml
<property name="textSize" type="String" datasource="java://siteforce.customComponent.datasource.SLDSFontSizeDataSource" default="medium"></property>
```

  Other shared datasources reused across families include `DxpImageSizeDataSource`,
  `ButtonSizeDataSource`, `B2BCartCountDataSource`, and `CartItemsPaginationOptionsDataSource`.
  Prefer an existing shared datasource over an inline `<datasource>value1,value2</datasource>` list.

- **Merchant-translatable text** properties are marked `translatable="true"`:

```xml
<property name="emptyCartLabel" type="String" default="Your cart is empty" translatable="true"></property>
```

### Two exposure traps to avoid

- **Scaffold from the current component, not the deprecated one.** A deprecated component can remain
  fully builder-exposed (`isExposed="true"`, full `targetConfigs`) even though its own
  `<description>` says it is deprecated — the canonical case being a `layoutHeader` whose description
  reads "Deprecated - use layoutHeaderOne instead" while it stays exposed. **Scaffold from
  `layoutHeaderOne`, never from `layoutHeader`.** Do not copy a bundle's meta just because it is
  exposed; confirm it is not deprecated first.
- **Non-visual utility bundles** (no `.html`) still declare `isExposed="true"` plus a
  `lightning__ServerRenderable*` capability as boilerplate — they exist to be imported by a `site/...`
  specifier, not rendered. That is expected; do not add a `<targets>` block to make them placeable.
- **Never emit a malformed namespace.** The `js-meta.xml` root must carry the correct namespace
  attribute — `xmlns="http://soap.sforce.com/2006/04/metadata"`. A real defect in the wild is a
  doubled, malformed `xmlns="xmlns=http://..."` on internal (`isExposed="false"`) bundles; the
  exposed wrappers get it right. Copy the correct namespace verbatim onto **every** bundle, exposed
  or internal:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>62.0</apiVersion>
    <isExposed>true</isExposed>
    ...
</LightningComponentBundle>
```

## Labels and i18n

### Per-bundle label barrels

Keep user-facing text in a **sibling `labels.js` barrel** that re-exports the bundle's
`@salesforce/label/...` imports under short names, and import from `./labels` — do not reference raw
label modules inline throughout the component. Labels are strictly **per-bundle**; there is no
shared, family-wide label module, so each bundle owns its own barrel.

```js
// labels.js
import strikethroughAssistiveText from '@salesforce/label/c.Product_Pricing_strikethroughAssistiveText';
import negotiatedPriceAssistiveText from '@salesforce/label/c.Product_Pricing_negotiatedPriceAssistiveText';

export const Labels = {
    strikethroughAssistiveText,
    negotiatedPriceAssistiveText
};
```

```js
// productPricing.js
import { Labels } from './labels';
// ...use Labels.strikethroughAssistiveText
```

A minority of bundles skip the barrel and import `@salesforce/label/...` directly, and both patterns
coexist even within one family — but **prefer the barrel**: it keeps the label surface in one place
and the component body readable.

### The `site.` vs `c.` namespace is a packaging choice — do not hardcode

The label namespace differs by how the component is **packaged**, and you must match it to the target,
not default to one:

- **`site.`-scoped labels (Experience Cloud site packaging).** When the component ships as an
  Experience Cloud site bundle, its labels are site-scoped content whose fixed reserved prefix is
  `site.` — e.g. `@salesforce/label/site.searchFiltersPanel.<key>`.
- **`c.`-scoped CustomLabels (org packaging).** When the component ships as an unnamespaced package,
  its labels are org-wide CustomLabels under the default `c.` scope — e.g.
  `@salesforce/label/c.Product_Pricing_strikethroughAssistiveText`, resolved by the repo-root
  `jsconfig.json` `c/*` → `*` map.

This is a **packaging choice, not a style choice** — do not hardcode one namespace over the other.
Generate `site.`-scoped labels for a site bundle and `c.`-scoped labels for an org package.

### Interpolate with `String.prototype.replace`, never a formatting library

Interpolate label placeholders with chained `.replace()` on literal tokens. Do **not** pull in a
formatting library for this. The token vocabulary is **not** standardized — different components use
different tokens, so read the label's own placeholder rather than assuming a convention:

- `{0}` positional is the most common form:

```js
// label text: "Showing {0} results"
const text = Labels.resultsCount.replace('{0}', String(count));
```

- named tokens appear per feature — `{min}`/`{max}`/`{step}` in quantity error text,
  `{amount}`/`{code}`/`{cartName}`/`{maxLength}` across cart, `{nextBillingDate}` on a subscription
  cancel, `{count}` in a search filter header:

```js
// label text: "Enter a quantity between {min} and {max}"
const text = Labels.quantityRange.replace('{min}', String(min)).replace('{max}', String(max));
```

A more elaborate variant splits a label on `{0}` into a prefix/term/suffix array so the middle
segment can be styled independently — use it only when the interpolated value needs its own markup.

### Format currency, locale, and dates through platform primitives — never hand-roll

Currency, locale, and date formatting go through the shared platform formatter, **never** a
hand-rolled `Intl.NumberFormat`, a concatenated currency symbol, or a bespoke date string.

- **Currency** is centralized in a shared `site/commonFormatterCurrency` module — an
  `Intl.NumberFormat` built from `@salesforce/i18n/locale`, module-cached per
  `${currency}-${currencyDisplay}` key — imported by cart, checkout, search, order, quote, and
  account. Import and call it; do not construct your own formatter:

```js
import currencyFormatter from 'site/commonFormatterCurrency';
// ...
const display = currencyFormatter(currencyIsoCode, amount); // (currency, value, currencyDisplay = 'symbol')
```

  When the payload carries no `currencyIsoCode`, fall back to `@salesforce/i18n/currency` for the
  active locale's currency — do not invent a default.

- **Dates** format through `Intl.DateTimeFormat(locale, { dateStyle, timeZone })` fed by
  `@salesforce/i18n/locale` and `@salesforce/i18n/timeZone` — again via a shared date utility, not a
  per-component `new Date(...).toLocaleString()`.

In a classic-bundle context that does not have the shared formatter available, the equivalent is a
base component — `<lightning-formatted-number format-style="currency" ...>` — rather than a
hand-rolled formatter. Either way: **never** concatenate a symbol or compute a formatted amount by
hand. (Currency values themselves arrive pre-evaluated from the server — the "never recompute
pricing" rule lives in `references/data-access.md`; this section is about **formatting** an
already-computed value for display.)
