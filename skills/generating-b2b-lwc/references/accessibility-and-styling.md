# Accessibility & Styling — light DOM, the a11y wiring, the `experience/styling` bridge, and testing setup

> Part of `generating-b2b-lwc` — see SKILL.md for the always-on Quick Reference and routing. This
> file owns **the accessibility idioms a storefront component must author itself, how builder design
> props reach CSS through the `experience/styling` bridge, and how to set up testing**. Where data
> comes from and how it writes back lives in `references/data-access.md`; bundle packaging, the
> container/`*Ui` split, and the `js-meta.xml` design-property surface that *feeds* the styling
> bridge live in `references/component-structure.md` (design-prop XML conventions are there — this
> file owns the JS side that consumes them); undefined-guard idioms, processing flags, and error
> normalization live in `references/events-state-errors.md`.

Accessibility in a storefront component is authored at the **custom-component level**, not delegated
to base components. A generated component is expected to wire its own ARIA, focus, and keyboard
behavior; the idioms below are consistent across cart, product, search, account, checkout, and the
order/quote/subscription surfaces, and they are the delta a commerce component needs on top of base
LWC a11y knowledge.

## Light DOM is a hard requirement where a11y wiring crosses components

Set `static renderMode = 'light';` on any component whose accessibility wiring reaches **across**
components — this is not a stylistic preference, it is load-bearing. The reason: cross-component ARIA
relays push state (`aria-expanded` / `aria-controls` / `aria-activedescendant`) from one component
onto another **by imperative `querySelector` + property assignment**, and a property assignment
**cannot cross a shadow boundary**. A non-light `renderMode` anywhere in such a chain silently breaks
the relay — no error, just an assistive-technology experience that stops updating.

The canonical case is search: the combobox/listbox relay (a top-level combobox pushing
`aria-activedescendant` down onto listbox option elements it locates by `querySelector`) works only
because every component in that chain renders in light DOM. Product, search, account, and promotion
components set `static renderMode = 'light'` as the default:

```js
export default class SearchCombobox extends LightningElement {
    static renderMode = 'light';
    // ...cross-component aria relay assigns aria-activedescendant onto located option elements
}
```

Default to light DOM for any component that participates in a combobox/listbox/menu relay, and never
introduce a shadow-DOM component into the middle of one.

## `aria-live` regions for async content and validation

Any component that swaps content asynchronously must announce the change through a visually-hidden
live region driven by the **same booleans** that drive the visible spinner or result count — so the
announcement and the visible state never drift.

- **Async content / result-count swaps** use `role="status" aria-live="polite" aria-atomic="true"` in
  a visually-hidden region:

```html
<span class="slds-assistive-text" role="status" aria-live="polite" aria-atomic="true">
    {statusMessage}
</span>
```

- **Errors and validation failures** announce assertively — `role="alert" aria-live="assertive"` (an
  SLDS scoped-notification primitive renders only when a `type` and text are both present). A
  component that shows both success and error states uses **assertive for errors, polite for
  success**.
- A **validated input** carries `aria-live="polite"` alongside `aria-invalid` on the visible input
  element, so a newly-surfaced validation message is spoken without moving focus.

Wire the same reactive flag that toggles the spinner/empty-state to the live region's text; do not
compute a second, independent "should I announce" flag.

## Focus management via the shared focus-trap primitive — never hand-rolled

Do **not** hand-roll a focus trap. There is a shared `commonFocusTrapManager` primitive that exposes
two imperative `@api` methods and handles Tab wraparound and Escape-to-deactivate internally:

```js
@api activateFocusTrap(triggerElement, focusElement, { deferFocus = false } = {}) { /* ... */ }
@api deactivateFocusTrap({ deferFocus = false } = {}) { /* ... */ }
```

`activateFocusTrap` records the trigger element (to restore focus to it on deactivate), moves focus to
`focusElement`, and starts listening for Tab/Escape; `deactivateFocusTrap` restores focus to the
trigger. Both are internally guarded with `!import.meta.env.SSR` so they no-op during server render.

Consumers **wrap the trappable content in the manager's tag** and toggle it reactively — a header
search drawer, a toast, a checkout fatal-error dialog (`role="dialog" aria-modal="true"`), and a
search filters panel all use it this way:

```html
<site-common-focus-trap-manager focus-trap-active={showFilters}>
    <!-- panel content -->
</site-common-focus-trap-manager>
```

Two rules that come with it:

- **Move focus in only after the reveal transition completes.** A panel that animates open moves focus
  in *after* the CSS transition finishes (`setTimeout(transitionDuration)`), never immediately onto a
  still-hidden element — focusing a `display:none`/`visibility:hidden` element is a no-op and drops
  the user's focus to `<body>`.
- **Let a container ask a field to focus its own first error.** For form validation, a container asks
  a child to focus its first `.slds-has-error` element after a failed validate, rather than the
  container reaching into the child's DOM.

## Keyboard contracts — author them explicitly

Menus, listboxes, and accordions get explicit keyboard handling; do not rely on native tabbing alone.

- **Roving focus over `role="menuitem"`** — the full ArrowUp/ArrowDown/Home/End/Enter/Space/Escape/Tab
  contract, implemented on menu components (cart-badge menu, account user-profile menu).
- **Combobox keydown is owned entirely by the top-level component** — the listbox option **leaves bind
  no keydown handlers**. The top-level combobox interprets every key and drives selection/highlight
  down to the options.
- **Select an option on `onmousedown`, not `onclick`.** A listbox option commits on `mousedown` so the
  selection fires **before** the input's blur-driven dismiss — binding `onclick` lets the blur close
  the listbox first and swallow the selection:

```html
<li role="option" onmousedown={handleOptionSelect}>{option.label}</li>
```

- **Accordion headers toggle on both click and Enter/Space**, carrying `aria-controls` and
  `aria-expanded` that reflect the open state.

## Imperative `@api focus()` handoffs

Expose an `@api focus()` (or a named focus method) so a parent can return focus after an async action
completes — e.g. a parent re-focuses an add-to-cart button after the add resolves, or a form focuses
its **first** `.slds-has-error` field (`.focus()` before reporting validity) after a failed submit.
This keeps focus management in the component that owns the element while letting the orchestrating
parent decide *when* to hand focus back.

## Assistive text for purely visual cues

Any information conveyed only visually gets a screen-reader equivalent:

- **Strikethrough / comparative pricing** is backed by a visually-hidden span that states the meaning
  in words ("was X, now Y"), and the price region itself announces with
  `aria-live="assertive" aria-atomic="true"` so a price change is spoken:

```html
<span class="slds-assistive-text">{Labels.strikethroughAssistiveText}</span>
```

- **Decorative icons** are hidden from assistive tech — `alternative-text=""` on a
  `lightning-icon`, or `aria-hidden="true"` on a custom sprite.
- **Toggle buttons** expose `aria-expanded` reflecting their state.
- **Checkbox facets** keep the native `lightning-input` label for screen readers (visually hidden) and
  render a **separate** truncatable `aria-hidden` span for sighted users — so the accessible name is
  the full value even when the visible text is clipped.
- **Derive an accessible name from rendered text** where a heading can be re-worded (a checkout
  accordion section derives its accessible name at render from the visible heading text), so the
  visible and accessible names never drift.

## Styling — `experience/styling` is the bridge from builder props to CSS

The single most-imported `experience/*` module is `experience/styling`, and its
`generateStyleProperties` is how a component's builder-exposed **Color/size design props** (declared in
the `js-meta.xml` — see `references/component-structure.md`) become CSS. It converts a map of
custom-property → value into an inline CSS-custom-property string you apply to a wrapper element's
`style`:

```js
import { generateStyleProperties, generateThemeTextSizeProperty } from 'experience/styling';

// Local helper: the generator returns the theme property NAME; wrap it in var() yourself.
function dxpTextSize(textSize) {
    const themeSize = generateThemeTextSizeProperty(`heading-${textSize}`);
    return themeSize ? `var(${themeSize}-font-size)` : 'initial';
}

get customStyles() {
    return generateStyleProperties({
        '--com-c-product-pricing-tax-info-label-color': this.taxLabelColor || 'initial',
        '--com-c-product-pricing-tax-info-label-size': dxpTextSize(this.taxLabelSize),
        '--com-c-product-pricing-negotiated-price-label-color': this.negotiatedPriceTextColor || 'initial'
    });
}
```

```html
<div style={customStyles}>
    <!-- pricing markup; .scoped.css consumes the --com-c-* properties -->
</div>
```

Fall each property back to a safe default (`|| 'initial'`) so an unset builder prop does not emit an
empty value. Never write inline colors/sizes directly onto elements or build the style string by hand —
route them through `generateStyleProperties`.

### Custom-property naming: `--com-c-<component>-<region>-<role>`

Name every emitted custom property `--com-c-<component>-<region>-<role>` — e.g.
`--com-c-product-pricing-tax-info-label-color`, `--com-c-cart-item-unit-price-font-color`,
`--com-c-search-input-border-radius`, `--com-c-my-profile-*`. The component's `.scoped.css` then
**overrides the standard SLDS/SDS hook one layer up** by pointing it at the `--com-c-*` property:

```css
.search-input {
    --sds-c-input-radius-border: var(--com-c-search-input-border-radius);
}
```

Use the **global DXP fallbacks** for theme-level defaults — `var(--dxp-g-root-contrast, transparent)`,
`var(--dxp-g-root)` — so a component inherits the site theme when a specific prop is unset.

**Anti-signal — `--ref-c-*` is reference-code leakage.** A `--ref-c-<component>-*` custom-property
prefix marks *reference/sample* code, not production storefront code; likewise a **static
`--dxp-s-text-heading-*` `Map`** resolving text size instead of the dynamic theme API. If you find
either in a component you are extending, treat it as sample-code leakage to correct — emit `--com-c-*`
properties and resolve text size through the theme API (below), not a hardcoded map.

### Typography and font-size indirection

Builder font-size choices resolve to a **`var(--dxp-s-*-font-size)` custom property through a
small/medium/large switch**, never a raw pixel value. `experience/styling` supplies the generators:
`generateThemeTextSizeProperty('heading-<size>')` returns the theme property **name**
(`--dxp-s-text-heading-<size>`), which the local helper shown above wraps as
`var(<name>-font-size)`; `generateTextFontSize(<size>)` covers body text and is used directly as a
property value:

```js
import { generateStyleProperties, generateTextFontSize } from 'experience/styling';
// ...
{ name: '--com-c-cart-item-price-font-size', value: generateTextFontSize(this.pricePerUnitFontSize) }
```

Button styling maps builder datasource strings to SLDS utility classes through the companion
generators — `generateButtonVariantClass` / `generateButtonSizeClass` /
`generateElementAlignmentClass` / `generatePaddingClass`. Prefer these over hand-written class strings
so a merchant's datasource choice drives a consistent SLDS class.

### `generateMatchingStyles` for threaded style bags

When one style bag is threaded through several nested components, each layer consumes only its
**prefixed slice** with `generateMatchingStyles(styles, '<prefix>-')` from `experience/styling` —
rather than each layer re-declaring the whole set:

```js
import { generateMatchingStyles } from 'experience/styling';
// ...
get styles() {
    return {
        ...generateMatchingStyles(this.customStyles, 'suggestions-'),
        ...generateMatchingStyles(this.customStyles, 'search-container-')
    };
}
```

## Icons

Standard icon states use `lightning-icon` with `utility:*` names. **Brand-specific / custom icons**
resolve through `getIconPath` from `experience/iconUtils`, which returns the sprite path — do not
hardcode a sprite URL:

```js
import { getIconPath } from 'experience/iconUtils';
// ...
const iconPath = getIconPath('utility:warning');
```

Where a component ships its **own** bundled sprite, the path is `BasePath`-relative
(`${BasePath}/assets/icons/<name>.svg#<name>`) — used for toast success/error/processing glyphs and
number-input add/dash controls. Decorative icons carry `alternative-text=""` / `aria-hidden="true"`
(see assistive-text section above).

## Responsive strategy — prefer CSS, branch in JS only when required

Prefer **CSS-driven responsiveness**:

- `@media` queries in `.scoped.css` that toggle the `--com-c-*` custom properties, so layout adapts
  without JS re-render;
- `<experience-responsive size="m-">` / `<experience-responsive size="s">` wrapping mutually-exclusive
  desktop/mobile subtrees:

```html
<experience-responsive size="m-">
    <!-- desktop markup -->
</experience-responsive>
<experience-responsive size="s">
    <!-- mobile markup -->
</experience-responsive>
```

Reach for **JS form-factor branching only when markup cannot express the difference** — use the
`getFormFactor` `@wire` from `experience/clientApi` (e.g. an inline-vs-modal filter panel), not a raw
`window.matchMedia` read.

## Testing setup

**No authored storefront unit test exists to copy.** The source component repos ship **zero** unit
test files — no `__tests__` directories, no `*.test.js` / `*.spec.js` under any LWC root, across every
family. There is no exemplary spec to dissect and no repo-proven "here is how a storefront LWC test is
written." Write tests from **base LWC Jest knowledge** (which this skill assumes you have) applied to
the component patterns in this skill's other references — and stand up the **infrastructure and
enforcement wiring** below, which *is* the teachable artifact.

The recommended wiring (a Jest + `@sa11y/jest` + pre-commit setup) is:

- **Jest config** — extend the `@salesforce/sfdx-lwc-jest` preset, and append a sa11y setup file to
  `setupFilesAfterEnv`:

```js
// jest.config.js
const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');

const setupFilesAfterEnv = jestConfig.setupFilesAfterEnv || [];
setupFilesAfterEnv.push('<rootDir>/jest-sa11y-setup.js');

module.exports = {
    ...jestConfig,
    passWithNoTests: true,
    moduleNameMapper: {},
    setupFilesAfterEnv,
};
```

  `passWithNoTests: true` lets the suite pass with no specs present — appropriate while you are
  building the test surface up from nothing.

- **sa11y setup** — register the accessibility matcher globally so `toBeAccessible()` is available in
  every spec (this is what makes the a11y idioms above assertable):

```js
// jest-sa11y-setup.js
import { registerSa11yMatcher } from '@sa11y/jest';

registerSa11yMatcher();
```

- **npm scripts** — wrap `sfdx-lwc-jest --skipApiVersionCheck` for the run/watch/debug/coverage
  variants:

```json
"scripts": {
    "test": "npm run test:unit",
    "test:unit": "sfdx-lwc-jest --skipApiVersionCheck",
    "test:unit:watch": "sfdx-lwc-jest --watch --skipApiVersionCheck",
    "test:unit:debug": "sfdx-lwc-jest --debug --skipApiVersionCheck",
    "test:unit:coverage": "sfdx-lwc-jest --coverage --skipApiVersionCheck"
}
```

- **Pre-commit enforcement** via `lint-staged` — run prettier + eslint on staged files, and a
  **related-tests-only, bail-on-first-failure** Jest gate on staged LWC files, so a commit that
  touches a component only runs (and must pass) that component's related tests:

```json
"lint-staged": {
    "**/*.{css,html,js,json,md,xml,yaml,yml}": ["prettier --write"],
    "**/lwc/**/*.js": ["eslint"],
    "**/lwc/**": ["sfdx-lwc-jest --skipApiVersionCheck -- --bail --findRelatedTests"]
}
```

- **Dev dependencies** — pin `@sa11y/jest` and `@salesforce/sfdx-lwc-jest`.

**In short:** adopt this config/enforcement pattern as the recommended setup, author each component's
spec from base LWC Jest technique against the patterns in the other references (assert the ARIA/live
regions and focus behavior with the sa11y matcher), and do **not** claim any repo demonstrates a
finished storefront LWC test — none exists to copy.
