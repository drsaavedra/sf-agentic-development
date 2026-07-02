# Deep-read notes: common (+ layout, theme-layout, error, buyer-formatting)

> Evidence notes for the B2B Commerce research (spec:
> docs/superpowers/specs/2026-07-02-b2b-commerce-skills-design.md). Every claim carries an
> [os:bundle/file:line] or [col:bundle/file:line] citation. os wins conflicts; divergences are
> recorded, not resolved silently.

## Bundles covered

Census slice: `family==='common'` = 66 records (61 unique os names + `commerceErrors`, plus 4
col-only duplicates: `commonButton`, `commonModal`, `commonNumberInput`, `commonLink`). All os
records for this task; col contributes no source of its own for this family in this repo pairing
(col's 4 records under these names were not present as separate col bundles to read — the census
duplicate flag only marks the *name* as shared, col-side content was not part of this deep read
since no `col:` source files exist for these names in the repo layout available).
`family==='other'` (5 records) — classified, not part of this notes file (see Anomalies).

**Read in full (js + html + js-meta.xml + helper files):**
commerceErrors (+product.js), commonError, commonPageLevelErrorMessage, commonScopedNotification,
commonToast (+constants.js), buyerCurrencyFormatter, buyerFormattedPrice, commonFormattedCurrency
(+Ui), commonFormattedPrice, commonFormatterCurrency, commonBreadcrumbs (+Ui), commonDrilldownNavigation
(+Ui, +BarUi, +ListUi, +transformation.js/constants.js/overflow.js/util.js), commonCountryPickerPanel,
layoutHeader (+Ui), layoutHeaderOne, layoutHeaderSimple, layoutFooter (+Ui), themelayoutSite,
themelayoutExternal, themelayoutMyaccount (html), themelayoutSiteSimple (html), commonLoginHandler
(+loginUtils.js/constants.js), commonNumberInput (+utils.js/locale.js), commonField (+fieldTypes.js),
commonItemFields (+transformField.js), marketingEmailsignup (+marketingEmailSignupUtils.js),
commonButton, commonModal, commonQuantitySelector, commonDropdown, commonConfig,
commonPasswordlessLoginModal, commonRichtextsanitizerUtils, commonFocusTrapManager,
commonCountryPicker, commonSidePanelManager, commonActionButtons, commonRecordLink, commonLinksList,
commonContainerSticky.

**Skimmed (js only, structural facts extracted, not exhaustively):** the above helper/constants
files where noted; `.js-meta.xml` was read for every archetype named in the brief.

**Census-only (not deep-read; listed for completeness, no claims made about internals):**
commonActionLink, commonButtonUi, commonCountryPickerButton, commonCountryPickerConfirmationModal,
commonCountryPickerGrid, commonCountryPickerUi, commonLinksListUi, commonLinksSocial, commonPanel,
commonPill, commonPrimitiveFocusTrapManager, commonQuantitySelectorPopover, commonRecordFieldValue,
commonTransactLayout, commonVideo.

## Data access — how this family gets data without Apex

No Apex imports anywhere in this family — consistent with the census-wide zero-Apex finding.
Data arrives through `commerce/*` and `experience/*` wires/imperative calls only:

- **`commerce/breadcrumbsApi`** — `BreadcrumbsAdapter` wire adapter feeds `commonBreadcrumbs`'s
  `_breadcrumbs` array directly; the component does not fetch pageReference URLs itself, it maps
  each breadcrumb through `generateUrl(navContext, breadcrumb.pageReference)`
  [os:commonBreadcrumbs/commonBreadcrumbs.js:40] [os:commonBreadcrumbs/commonBreadcrumbs.js:66].
- **`commerce/contextApi`** — `AppContextAdapter` wire is used by `layoutHeader`, `layoutHeaderOne`,
  and `commonFormattedCurrency` for different purposes: header components read
  `data.shopperCopilotUIEnabled` to conditionally show a copilot search shortcut
  [os:layoutHeader/layoutHeader.js:23] [os:layoutHeaderOne/layoutHeaderOne.js:24], while
  `commonFormattedCurrency` reads `data.defaultCurrency` as a fallback market currency only when no
  explicit `currencyCode` override is set [os:commonFormattedCurrency/commonFormattedCurrency.js:91].
- **`commerce/checkoutCartApi`** — `commonCountryPicker` (class `CountryPickerV2`) wires
  `CartAdapter` for `totalProductCount`, and imperatively calls `cartDelete()` before switching
  locale (wrapped in try/catch, failure only logged) [os:commonCountryPicker/commonCountryPicker.js:45]
  [os:commonCountryPicker/commonCountryPicker.js:65].
- **`commerce/actionApi`** — `marketingEmailsignup` is the only common-family bundle that dispatches
  a named action: `createCommunicationSubscriptionsChangeAction({contactPointValue,
  communicationSubscriptionConsentItemList})` via `dispatchAction(this, action, {onSuccess, onError})`
  [os:marketingEmailsignup/marketingEmailsignup.js:2] [os:marketingEmailsignup/marketingEmailsignup.js:161].
- **`commerce/loginApi`** — `commonLoginHandler`'s `loginUtils.js` imperatively calls `getSiteKey`,
  `initUser`, `registerBuyer`, `verifyUser` for the passwordless-login/reCAPTCHA flow
  [os:commonLoginHandler/loginUtils.js:1].
- **`experience/navigationMenuApi`** — `commonDrilldownNavigation` wires `getNavigationMenu` with
  `{menuItemTypesToSkip: ['Event','GlobalAction','MenuLabel','NavigationalTopic','SystemLink','Modal'],
  includeImageUrl: false, addHomeMenuItem: true}` — the single navigation-menu data source for this
  family [os:commonDrilldownNavigation/commonDrilldownNavigation.js:21].
- **`experience/clientApi`** — `getFormFactor` wire drives responsive layout branching in
  `layoutHeader`/`layoutHeaderOne` (debounced via `setTimeout` once connected, to avoid layout
  thrash on rapid resize) [os:layoutHeader/layoutHeader.js:32]
  [os:layoutHeader/layoutHeader.js:43]; `isDesignMode` gates `marketingEmailsignup`'s success-message
  and empty-subscriptions visibility in Experience Builder preview
  [os:marketingEmailsignup/marketingEmailsignup.js:19] [os:marketingEmailsignup/marketingEmailsignup.js:91].
- **Expression-bound `@api` property** — `marketingEmailsignup`'s `subscriptions` prop defaults to
  the Experience Builder expression `{!Marketing.Subscriptions.communications}` in its meta.xml
  (`expression: true` in the census), the family's one clear example of builder-expression-fed data
  rather than an imperative/wire call [os:marketingEmailsignup/marketingEmailsignup.js-meta.xml:23].
- **`commerce/appContextApi`/currency formatting is client-only** — `buyerCurrencyFormatter` and
  `commonFormatterCurrency` both build an `Intl.NumberFormat(LOCALE, {style:'currency', currency,
  currencyDisplay, maximumFractionDigits:20})` from `@salesforce/i18n/locale`, caching formatters in
  a module-level `Map` keyed by `${currency}-${currencyDisplay}` — no server call at all
  [os:buyerCurrencyFormatter/buyerCurrencyFormatter.js:1] [os:commonFormatterCurrency/commonFormatterCurrency.js:1].

## Composition & structure

**Container vs `*Ui` split is the dominant pattern in this family.** Of the 62 os bundles, 42 have
no `<targetConfigs>`/no Experience-Builder-exposed properties at all (per census `targets` field) —
these are internal child components consumed only by a sibling container, not builder-placeable on
their own. Confirmed pairs read in full:
- `commonBreadcrumbs` (builder-exposed, wires data) → `commonBreadcrumbsUi` (pure render, 10 `@api`
  props, no targets) [os:commonBreadcrumbs/commonBreadcrumbs.html:2] [os:commonBreadcrumbsUi/commonBreadcrumbsUi.js-meta.xml:1].
- `commonFormattedCurrency` (builder-exposed, wires `AppContextAdapter`) → `commonFormattedCurrencyUi`
  (pure render, heading-tag selection, no targets) [os:commonFormattedCurrency/commonFormattedCurrency.html:2].
- `commonDrilldownNavigation` (builder-exposed, wires nav menu) → `commonDrilldownNavigationUi`
  (responsive branch) → `commonDrilldownNavigationBarUi` (desktop, ResizeObserver overflow) /
  `commonDrilldownNavigationListUi` (mobile drill-down list) — a three-level container chain
  [os:commonDrilldownNavigation/commonDrilldownNavigation.html:2]
  [os:commonDrilldownNavigationUi/commonDrilldownNavigationUi.html:29-40].
- `layoutHeader` (deprecated container) / `layoutHeaderOne` (current container) both wire data and
  delegate to a `*Ui`/self-contained render; `layoutHeaderUi` picks between two whole precompiled
  HTML templates (`templateWithWishlistSlot` / `templateWithoutWishlistSlot`) based on
  `hideWishlistShortcut` rather than conditional markup inside one template
  [os:layoutHeaderUi/layoutHeaderUi.js:2] [os:layoutHeaderUi/layoutHeaderUi.js:32].
- `layoutFooter` → `layoutFooterUi` (single `backgroundColor` passthrough)
  [os:layoutFooter/layoutFooter.html:2].
- `commonCountryPickerPanel` composes `site-common-country-picker-grid` as a child (grid content not
  deep-read; census-only) [os:commonCountryPickerPanel/commonCountryPickerPanel.html:21].

**Theme-layout structure.** `themelayoutSite` defines three named regions via slots — `announcement`
(nested inside the `header` region), `header`, and `footer` — plus a default slot for page content;
each top-level region carries `data-layout-site-region` and `data-f6-region` attributes (skip-link/
accessibility landmark markers) [os:themelayoutSite/themelayoutSite.html:2-23]. `themelayoutSiteSimple`
wraps `<site-themelayout-site>` and simply re-slots header/content/footer through it — a thin
specialization, not a parallel implementation [os:themelayoutSiteSimple/themelayoutSiteSimple.html:2-12].
`themelayoutExternal` is a bare single-slot pass-through with no header/footer regions at all, for
guest/external (non-authenticated) pages [os:themelayoutExternal/themelayoutExternal.html:1-3].
`themelayoutMyaccount` adds a conditional `aside` navigation region gated by `_isLoggedIn`
[os:themelayoutMyaccount/themelayoutMyaccount.html:14-19] — note only the `.html` was read for this
bundle (its `.js` was not opened in this pass; the `_isLoggedIn` binding source is unverified).

**Label bundle pairing.** Most interactive components keep a sibling `labels.js` barrel
(`commonNumberInput`, `commonField`, `commonItemFields`, `commonLoginHandler`,
`commonDrilldownNavigationBarUi`/`ListUi`/`Ui`, `commonCountryPickerPanel`, `commonScopedNotification`,
`marketingEmailsignup`, `layoutHeaderOne`, `commonPasswordlessLoginModal`, `commonQuantitySelector`)
that re-exports `@salesforce/label/site.*` imports under short names
[os:commonNumberInput/commonNumberInput.js:3]. `commonBreadcrumbs` and `commonBreadcrumbsUi` instead
import `@salesforce/label/site.*` directly with no `labels.js` indirection
[os:commonBreadcrumbs/commonBreadcrumbs.js:3] [os:commonBreadcrumbsUi/commonBreadcrumbsUi.js:3] — both
patterns coexist in the same family.

**Utils/constants files** are per-bundle, not shared across bundles, with one documented exception
(the buyerCurrencyFormatter/commonFormatterCurrency duplicate — see Anomalies): `commonNumberInput`
(`utils.js`, `locale.js`), `commonItemFields` (`transformField.js`), `commonDrilldownNavigationUi`
(`transformation.js`, `constants.js`), `commonDrilldownNavigationBarUi` (`overflow.js`, `util.js`,
`constants.js`), `commonDrilldownNavigationListUi` (`utils.js`, `constants.js`),
`marketingEmailsignup` (`marketingEmailSignupUtils.js`), `commonLoginHandler` (`loginUtils.js`,
`constants.js`).

**Targets.** Builder-placeable components declare `<target>lightningCommunity__Page</target>` +
`<target>lightningCommunity__Default</target>` with `<paletteSection>Open Code</paletteSection>`
[os:commonBreadcrumbs/commonBreadcrumbs.js-meta.xml:8-14]; theme-layout components instead declare
`<target>lightningCommunity__Theme_Layout</target>` with no palette section
[os:themelayoutSite/themelayoutSite.js-meta.xml:8-10].

## Events & communication

- `commonPageLevelErrorMessage` → `erroractionclick` (no `detail`), fired from the single action
  button [os:commonPageLevelErrorMessage/commonPageLevelErrorMessage.js:18-20].
- `commonNumberInput` → `valuechanged` `{value, lastValue, isValid}` and `validitychanged`
  `{isValid, reason}`, emitted only when the value actually changed (SSR-guarded: `dispatch()` is a
  no-op under `import.meta.env.SSR`) [os:commonNumberInput/commonNumberInput.js:233-256].
- `commonQuantitySelector` re-dispatches the same `VALUE_CHANGED_EVT`/`VALIDITY_CHANGED_EVT` names
  it receives from its internal `commonNumberInput`, enriching `validitychanged` with a computed
  `description` (localized error text) before bubbling further
  [os:commonQuantitySelector/commonQuantitySelector.js:162-192].
- `commonDrilldownNavigationBarUi`/`commonDrilldownNavigationListUi` → `navigatetopage`
  (`NAVIGATE_EVENT` constant, value `'navigatetopage'` in both) with detail
  `{menuItemId, type, href, target, pageReference}`, bubbling/cancelable/composed
  [os:commonDrilldownNavigationBarUi/constants.js:15] [os:commonDrilldownNavigationListUi/constants.js:17]
  [os:commonDrilldownNavigationBarUi/commonDrilldownNavigationBarUi.js:217-234]. The container
  (`commonDrilldownNavigation`) listens via `onnavigatetopage` and translates it into
  `lightning/navigation`'s `navigate()` call, or an internal/external URL fallback
  [os:commonDrilldownNavigation/commonDrilldownNavigation.html:6]
  [os:commonDrilldownNavigation/commonDrilldownNavigation.js:39-67].
- `commonDrilldownNavigationListUi` also emits `closesubmenus` (detail `{parentItemId}` when
  collapsing back to a specific parent, no detail when closing entirely) and `levelchange`
  `{level}` for drill-down depth tracking
  [os:commonDrilldownNavigationListUi/commonDrilldownNavigationListUi.js:299-304]
  [os:commonDrilldownNavigationListUi/commonDrilldownNavigationListUi.js:386-400].
- `commonDrilldownNavigationBarUi` → `showapplauncher` (`SHOW_APP_LAUNCHER` constant) on app-launcher
  icon click [os:commonDrilldownNavigationBarUi/constants.js:16]
  [os:commonDrilldownNavigationBarUi/commonDrilldownNavigationBarUi.js:368-375].
- `commonCountryPickerPanel` → `closecountrypicker` (no detail), on close-button click or `Escape`
  keydown [os:commonCountryPickerPanel/commonCountryPickerPanel.js:31-38].
- `commonModal`/`commonPasswordlessLoginModal` both extend `lightning/modal`'s `LightningModal` and
  are opened via the static `.open()` API (seen invoked as
  `PasswordlessLoginModal.open({...})` from `commonLoginHandler`)
  [os:commonModal/commonModal.js:2-3] [os:commonLoginHandler/loginUtils.js:89].
  `commonModal.handleAction()` fires `${eventType}actionclick` (`primaryactionclick` /
  `secondaryactionclick`), cancelable, with a `detail.close(result)` callback; if the listener does
  not call `event.preventDefault()`, the modal self-closes with the button-type string as the result
  [os:commonModal/commonModal.js:27-40].
- `commonPasswordlessLoginModal` fires `submit` (`{otp, callback}`), `resend` (`{otp}`), and
  `emailswitch` (`{otp}`) — `commonLoginHandler` wires these to `verifyUserAndRedirect`,
  `reInitializeUser`, and a delivery-method switch respectively
  [os:commonPasswordlessLoginModal/commonPasswordlessLoginModal.js:48-63]
  [os:commonLoginHandler/loginUtils.js:94-104].
- `commonToast` extends `lightning/toast`'s `LightningToast`; its `static show()` forces
  `mode: 'dismissible'` onto every toast config before delegating to `super.show()`
  [os:commonToast/commonToast.js:16-22]. Both `commonLoginHandler` and `marketingEmailsignup` use
  `site/commonToast`'s `Toast.show({label, variant:'error'}, element)` for async-failure surfacing
  [os:commonLoginHandler/loginUtils.js:20-24] [os:marketingEmailsignup/marketingEmailSignupUtils.js:12-16].
- `commonActionButtons` → `firstaction`/`secondaction` (no detail), bubbling/cancelable/composed
  [os:commonActionButtons/commonActionButtons.js:28-41].
- `commonDropdown` → `dropdownselect` `{selected}` (array when `multiple`, single value otherwise)
  [os:commonDropdown/commonDropdown.js:91-98].

## Errors, loading, and processing state

`commerceErrors` is **not** a runtime error-normalization function — it is a static lookup table
(`ProductErrors`) of `{code, message}` pairs for product-related failure conditions (out of stock,
insufficient inventory, invalid variant, etc.), re-exported through a one-line barrel
[os:commerceErrors/commerceErrors.js:1] [os:commerceErrors/product.js:1-34]. No other bundle in this
family imports it, and it has no `<targets>` — it is a shared constants module, not a display
component, and not exposed to Experience Builder [os:commerceErrors/commerceErrors.js-meta.xml:2-7].
The family's actual display-layer error/notification primitives are separate, purpose-specific
components rather than one shared normalizer:

- `commonError` — inline field/form-level error: icon + text, `errorType` setter maps to
  `iconType`/`iconVariantClassName`/error-color text class (`'error'` → `slds-text-color_error`)
  [os:commonError/commonError.js:14-35].
- `commonPageLevelErrorMessage` — full-page/section error state: icon-or-slotted-icon, heading,
  rich-text description, optional action button
  [os:commonPageLevelErrorMessage/commonPageLevelErrorMessage.html:3-30].
- `commonScopedNotification` — SLDS scoped notification wrapping `type` (info/success/warning/error)
  into `slds-theme_${type}` and `utility:${type}` icon; only renders when both a `type` and
  (`headerText` or `bodyText`) are present (`showNotification` guard); `role="alert"
  aria-live="assertive"` [os:commonScopedNotification/commonScopedNotification.js:31-33]
  [os:commonScopedNotification/commonScopedNotification.html:3-6].
- `commonToast` — toast-level notification, custom SVG icons for `success`/`error`/`processing`
  variants (sprite-based, not `lightning-icon`) versus `lightning-icon` for `info`/`warning`
  [os:commonToast/constants.js:2-8] [os:commonToast/commonToast.html:19-33].

**Field/quantity-input validation** (not error-*display*, but the family's other error-state
pattern): `commonNumberInput` maintains a hidden native `<input type="number">` purely to drive
HTML5 `ValidityState` (`rangeOverflow`, `rangeUnderflow`, `stepMismatch`, `patternMismatch`) via
`validate()`, and surfaces the first failing reason as `_validationFailureReason`
[os:commonNumberInput/commonNumberInput.js:257-267]. `commonQuantitySelector` layers stock-awareness
on top: `determineOutOfStock()` compares `availableQuantity` against `minimum`/`step` and, when out
of stock, `hasError`/`notificationText` take priority over plain validation-error text
[os:commonQuantitySelector/commonQuantitySelector.js:109-129] [os:commonQuantitySelector/commonQuantitySelector.js:150-161].

**Processing/loading state:** `marketingEmailsignup.updateSubscriptions()` uses
`dispatchAction(this, action, {onSuccess, onError})` callback pairs rather than an explicit
in-flight/loading boolean — success clears the email field and resets subscriptions, failure shows a
toast and leaves `_showSuccessMessage` false [os:marketingEmailsignup/marketingEmailsignup.js:156-171].
`commonPasswordlessLoginModal` tracks `modalShowSpinner` explicitly during OTP verification, toggled
via a `callback(error, showSpinner)` passed in the `submit` event detail
[os:commonPasswordlessLoginModal/commonPasswordlessLoginModal.js:48-63]. No component in this family
was observed using a `commerce/*` wire's own `loading` flag for a spinner — the family's loading
signals are locally-managed booleans or callback-driven, not adapter-provided.

## Guards

- **SSR guards** appear repeatedly for anything touching `window`/`document`/DOM events:
  `commonNumberInput.dispatch()` [os:commonNumberInput/commonNumberInput.js:249],
  `commonBreadcrumbsUi`'s sanitize-on-render branch [os:commonBreadcrumbsUi/commonBreadcrumbsUi.js:36],
  `commonContainerSticky.connectedCallback()` before constructing an `IntersectionObserver`
  [os:commonContainerSticky/commonContainerSticky.js:11-19],
  `commonDrilldownNavigationBarUi.connectedCallback()` before constructing a `ResizeObserver`
  [os:commonDrilldownNavigationBarUi/commonDrilldownNavigationBarUi.js:185-188],
  `commonFocusTrapManager.activateFocusTrap()`/`deactivateFocusTrap()`
  [os:commonFocusTrapManager/commonFocusTrapManager.js:41] [os:commonFocusTrapManager/commonFocusTrapManager.js:63],
  and `commonRichtextsanitizerUtils.sanitizeValue()` returning the raw value unmodified under SSR
  [os:commonRichtextsanitizerUtils/commonRichtextsanitizerUtils.js:5-14].
- **`globalThis.document`/`globalThis.grecaptcha` optional-chaining guards** rather than bare
  `window`/`document` references: `commonDrilldownNavigationBarUi`'s outside-click listener
  [os:commonDrilldownNavigationBarUi/commonDrilldownNavigationBarUi.js:182-192],
  `layoutHeaderOne`'s outside-click listener [os:layoutHeaderOne/layoutHeaderOne.js:79-83],
  `commonLoginHandler`'s reCAPTCHA calls wrapped in try/catch with silent `''` token fallback on
  failure [os:commonLoginHandler/loginUtils.js:32-38].
- **Undefined-on-first-render guards for `@api` values:** `commonFormattedCurrency`/`buyerFormattedPrice`/
  `commonFormattedPrice` all gate their formatted-output getter on `value !== undefined &&
  currencyCode` before calling the formatter [os:buyerFormattedPrice/buyerFormattedPrice.js:11-15]
  [os:commonFormattedPrice/commonFormattedPrice.js:11-15]; `commonNumberInput.value` setter only
  accepts `typeof value === 'number' && !isNaN(value)`, silently ignoring `undefined`/non-numeric
  writes rather than throwing [os:commonNumberInput/commonNumberInput.js:100-108].
- **Guest vs authenticated:** `themelayoutMyaccount.html` conditionally renders its navigation
  `aside` region only `lwc:if={_isLoggedIn}` [os:themelayoutMyaccount/themelayoutMyaccount.html:14-19]
  (only the `.html` was read; the source of `_isLoggedIn` in the `.js` was not verified in this pass).
- **Feature/permission-style checks:** `layoutHeader`/`layoutHeaderOne` gate the "shopper Copilot"
  search shortcut on `AppContextAdapter`'s `shopperCopilotUIEnabled` flag
  [os:layoutHeader/layoutHeader.js:23-31] [os:layoutHeaderOne/layoutHeaderOne.js:24-29];
  `marketingEmailsignup.showEmailSignup` gates the entire form on `isDesignMode ||
  subscriptions.length > 0`, so an empty subscriptions array hides the component outside Builder
  preview [os:marketingEmailsignup/marketingEmailsignup.js:90-92].

## Labels & i18n

- **Placeholder interpolation** uses simple `String.replace()` on `{0}`/named tokens, not a
  templating library: `commonDrilldownNavigationUi`'s `transformation.js` builds
  `newTabLabel.replace('{0}', sanitizedLabel)` for the `NewWindow`-target aria-label
  [os:commonDrilldownNavigationUi/transformation.js:36]; `commonQuantitySelector.notificationText`
  chains three replacements — `{min}`, `{max}`, `{step}` — on one error-label string
  [os:commonQuantitySelector/commonQuantitySelector.js:148];
  `commonQuantitySelector`'s `minimumText`/`maximumText`/`stepText` getters each replace a `{0}`
  token [os:commonQuantitySelector/commonQuantitySelector.js:96-104];
  `commonLinksList`-adjacent `commonDrilldownNavigationListUi.allLabel` replaces `{categoryName}`
  [os:commonDrilldownNavigationListUi/commonDrilldownNavigationListUi.js:311-312].
- **Currency/locale formatting** is centralized in two byte-identical helper functions (see
  Anomalies) built on `Intl.NumberFormat(LOCALE, {style:'currency', currency, currencyDisplay,
  maximumFractionDigits: 20})`, `LOCALE` sourced from `@salesforce/i18n/locale`
  [os:buyerCurrencyFormatter/buyerCurrencyFormatter.js:1-16]. `commonNumberInput` separately reads
  `@salesforce/i18n/number.decimalSeparator` and `@salesforce/i18n/number.groupingSeparator` (not
  `Intl` directly) to build its input `pattern` regex and to parse typed values back into a plain
  number [os:commonNumberInput/locale.js:1-6] [os:commonNumberInput/commonNumberInput.js:129-131]
  [os:commonNumberInput/utils.js:13-27]. `commonField`'s `DATETIME`/`DATE` rendering delegates to
  `lightning-formatted-date-time` with `time-zone={timezone}` sourced from `@salesforce/i18n/timeZone`
  for `DATETIME` but a hardcoded `"UTC"` for plain `DATE`
  [os:commonField/commonField.js:14-16] [os:commonField/commonField.html:15-29].
- **Type-driven display component dispatch:** `commonField` normalizes an incoming `type` string to
  uppercase and looks it up in a `Map` (`fieldTypes.js`) that collapses synonyms (`DOUBLE`/`INTEGER`
  → `NUMBER`, `STRING`/`TEXTAREA` → `TEXT`, `DATE/TIME` → `DATETIME`, `CHECKBOX` → `BOOLEAN`) before
  choosing which `lightning-formatted-*` (or `site-common-formatted-price` for `CURRENCY`) to render
  [os:commonField/fieldTypes.js:1-3] [os:commonField/commonField.js:23-33]. Unknown/missing types
  fall back to the default rich-text display, not an error state
  [os:commonField/commonField.js:26-30].
- **Label sourcing is per-bundle**, either a `labels.js` re-export barrel or direct
  `@salesforce/label/site.<Bundle>.<key>` imports (see Composition section); no shared/family-wide
  label module was found.

## Accessibility

- **Focus management** is centralized in two focus-trap primitives — `commonFocusTrapManager` and
  `commonPrimitiveFocusTrapManager` (only the former deep-read) — exposing `@api
  activateFocusTrap(triggerElement, focusElement, {deferFocus})` and `@api deactivateFocusTrap(...)`,
  wraparound Tab-cycling, and `Escape`-to-deactivate; it requires a `focusId` and logs a
  `console.error` if missing [os:commonFocusTrapManager/commonFocusTrapManager.js:22-33]
  [os:commonFocusTrapManager/commonFocusTrapManager.js:94-109]. `layoutHeaderOne` wraps both its main
  header and its search drawer in `site-common-primitive-focus-trap-manager` instances, activating
  the drawer's trap on small form-factor + expanded search
  [os:layoutHeaderOne/layoutHeaderOne.html:2-6] [os:layoutHeaderOne/layoutHeaderOne.js:30-38].
  `commonToast` also wraps its content in a focus-trap manager
  [os:commonToast/commonToast.html:2-5].
- **Keyboard handling:** `commonDrilldownNavigationListUi` implements a full keyboard contract —
  `Enter`/`Space` activates leaf and parent items, `Escape` steps back one level or closes,
  `Backspace`-style not used but arrow/segment navigation is implemented in
  `commonPasswordlessLoginModal`'s OTP input (`Backspace` on empty segment focuses the previous
  segment, auto-advance on fill) [os:commonDrilldownNavigationListUi/commonDrilldownNavigationListUi.js:317-385]
  [os:commonPasswordlessLoginModal/commonPasswordlessLoginModal.js:99-123].
- **aria-live regions:** `commonScopedNotification` (`role="alert" aria-live="assertive"`)
  [os:commonScopedNotification/commonScopedNotification.html:3-6]; `commonNumberInput`'s visible
  input carries `aria-live="polite"` alongside `aria-invalid={isInvalid}`
  [os:commonNumberInput/commonNumberInput.html:28-41]; `marketingEmailsignup`'s error block uses
  `role="alert" aria-live="assertive" aria-atomic="true"` while its success message uses
  `aria-live="polite"` [os:marketingEmailsignup/marketingEmailsignup.html:25-32]
  [os:marketingEmailsignup/marketingEmailsignup.html:94-103].
- **Responsive form-factor via matchMedia**, not `experience/clientApi`'s `getFormFactor` wire, in
  `commonDrilldownNavigationUi` (`window.matchMedia` on three media-query constants, with
  `change`-event listeners registered in `connectedCallback`)
  [os:commonDrilldownNavigationUi/commonDrilldownNavigationUi.js:14-16]
  [os:commonDrilldownNavigationUi/commonDrilldownNavigationUi.js:77-91] — a second, independent
  responsive-detection mechanism from the wire-adapter approach used by `layoutHeader`/`layoutHeaderOne`
  (see Anomalies).

## Styling

- `experience/styling` is the pervasive styling-hook generator across this family:
  `generateStyleProperties` (CSS custom-property maps — `commonError`... actually not `commonError`;
  used by `commonFormattedCurrency`, `commonButton`, `layoutHeaderOne`, `layoutHeaderSimple`,
  `commonBreadcrumbsUi`, `commonCountryPickerPanel`, `commonNumberInput`)
  [os:commonFormattedCurrency/commonFormattedCurrency.js:71-89]
  [os:commonButton/commonButton.js:27-48]; `generateTextFormatStyles`/`generateThemeTextSizeProperty`/
  `generateThemeTextSizeClass` for typography-scale-driven text styling
  [os:commonFormattedCurrency/commonFormattedCurrency.js:69] [os:commonFormattedCurrencyUi/commonFormattedCurrencyUi.js:2];
  `generateButtonVariantClass`/`generateButtonSizeClass` in `commonActionButtons`
  [os:commonActionButtons/commonActionButtons.js:2]; `generatePaddingClass` in
  `commonFormattedCurrencyUi`/`commonLinksList` [os:commonFormattedCurrencyUi/commonFormattedCurrencyUi.js:21];
  `coerceAlignment` for left/center/right normalization in `commonDrilldownNavigationUi`/`BarUi`
  [os:commonDrilldownNavigationUi/commonDrilldownNavigationUi.js:4]; `generateConditionalStyles`
  (hover/active-state-aware style maps, `mappedStyles` constant) in
  `commonDrilldownNavigationBarUi`/`ListUi` [os:commonDrilldownNavigationBarUi/commonDrilldownNavigationBarUi.js:4].
- **dxp CSS custom properties**: `layoutFooterUi`'s default background falls back to
  `var(--dxp-g-root-contrast, transparent)` [os:layoutFooterUi/layoutFooterUi.js:2].
- **Builder-exposed style props** follow a consistent naming convention of paired color props
  (`headerIconsColor`/`headerIconsHoverColor` on both `layoutHeaderOne` and `layoutHeaderSimple`;
  `linkColor`/`linkHoverColor`/`textColor`/`dividerColor` on `commonBreadcrumbs`) mapped to
  `--com-c-<component>-<property>` custom properties
  [os:layoutHeaderOne/layoutHeaderOne.js:64-72] [os:commonBreadcrumbsUi/commonBreadcrumbsUi.js:61-68].
- `commonError`'s icon path is a special case: its `warning` variant loads a literal community-asset
  SVG sprite path (`${BasePath}/assets/icons/warning-filled.svg#warning-filled`) instead of going
  through `experience/iconUtils.getIconPath()` like every other icon type
  [os:commonError/commonError.js:18-23] — the same `BasePath`-relative-SVG-sprite pattern recurs in
  `commonToast` (success/error/processing icons) and `commonNumberInput` (add/dash icons)
  [os:commonToast/constants.js:5-8] [os:commonNumberInput/commonNumberInput.js:171-176].

## Candidate generation rules

1. When generating a currency-display component, delegate formatting to `Intl.NumberFormat` built
   from `@salesforce/i18n/locale` with `{style:'currency', currency, currencyDisplay,
   maximumFractionDigits: 20}` and cache the formatter instance per `${currency}-${currencyDisplay}`
   key — do not call `toLocaleString`/`Intl.NumberFormat` inline per render
   [os:buyerCurrencyFormatter/buyerCurrencyFormatter.js:1-16].
2. Guard any formatted-value getter on both the value and the unit/currency code being present
   (`value !== undefined && currencyCode`) before invoking the formatter, returning `undefined`
   otherwise, so the template naturally renders nothing rather than `"NaN"` or `"undefined"` on
   first render before data lands [os:buyerFormattedPrice/buyerFormattedPrice.js:11-16].
3. For a container/`*Ui` split, put all data access (wires, imperative calls, expression-bound
   `@api` defaults) in the container and zero data access in the `*Ui` component; the `*Ui`
   component should carry no `<targetConfigs>` at all so it cannot be builder-placed independently
   [os:commonBreadcrumbsUi/commonBreadcrumbsUi.js-meta.xml:1-4].
4. Any `@api` numeric/value setter that can receive non-numeric or `undefined` input should validate
   the type before assigning (`typeof value === 'number' && !isNaN(value)`), silently no-op on
   invalid input rather than propagating `NaN` into derived state
   [os:commonNumberInput/commonNumberInput.js:100-108].
5. Wrap any `IntersectionObserver`/`ResizeObserver`/`matchMedia` construction in an
   `!import.meta.env.SSR` guard inside `connectedCallback`, and always `disconnect()`/remove
   listeners in `disconnectedCallback` [os:commonContainerSticky/commonContainerSticky.js:11-27]
   [os:commonDrilldownNavigationBarUi/commonDrilldownNavigationBarUi.js:182-193].
6. Custom validation events should follow the `<subject>changed` naming convention
   (`valuechanged`, `validitychanged`, `levelchange`, `dropdownselect`) and only fire when the
   emitted value actually differs from the previous one — diff before dispatch, not on every
   keystroke/render [os:commonNumberInput/commonNumberInput.js:233-247].
7. When composing a lower-level input inside a higher-level one (e.g. quantity selector wrapping
   number input), re-dispatch the child's event under the *same* event name after enriching the
   detail, rather than inventing a new event name — preserves the child's public contract for
   consumers that only know the inner component [os:commonQuantitySelector/commonQuantitySelector.js:162-192].
8. Route both internal and external navigation-menu link clicks through a single handler that
   branches on `pageReference` (preferred, via `lightning/navigation` `navigate()`) →
   `InternalLink` with `basePath`-relative stripping → `ExternalLink` via
   `window.open(href, target, 'noopener,noreferrer')`, in that priority order
   [os:commonDrilldownNavigation/commonDrilldownNavigation.js:39-67].
9. Use `lightning/modal`'s `LightningModal` base class and its static `.open()` API for any
   dialog/modal component in this family rather than a hand-rolled overlay; fire a cancelable
   `<action>click` event with a `detail.close(result)` callback so a listener can veto the
   default auto-close [os:commonModal/commonModal.js:2-40].
10. Any component reading typed field data for generic display should normalize the type string to
    uppercase and dispatch through a `Map`-based type-alias table (collapsing `DOUBLE`/`INTEGER`,
    `STRING`/`TEXTAREA`, etc.), falling back to plain text display for unknown/blank types rather
    than throwing or rendering nothing [os:commonField/fieldTypes.js:1-3].
11. For toast/notification icon variants, prefer `lightning-icon` with `utility:*` icon names for
    standard states, but allow specific variants (`success`, `error`, `processing`) to substitute a
    `BasePath`-relative custom SVG sprite when brand-specific iconography is needed — keep the
    substitution list explicit (`CUSTOM_ICON_TOAST_VARIANTS`) rather than branching per-variant ad hoc
    [os:commonToast/constants.js:2-8].

## Candidate review rules / anti-patterns

1. Flag any new "shared error normalizer" that is actually a static error-code/message lookup table
   with no normalization function — `commerceErrors` in this codebase is exactly that (an object of
   `{code, message}` pairs, not a function that maps arbitrary errors to a common shape); don't cite
   it as precedent for a runtime normalizer [os:commerceErrors/commerceErrors.js:1]
   [os:commerceErrors/product.js:1-34].
2. Flag duplicate utility modules exported under two different `site/*` names with identical
   implementations (`buyerCurrencyFormatter` vs `commonFormatterCurrency` — byte-identical) as dead
   weight to consolidate, not a pattern to replicate
   [os:buyerCurrencyFormatter/buyerCurrencyFormatter.js:1-16]
   [os:commonFormatterCurrency/commonFormatterCurrency.js:1-16].
3. Flag `console.error`/`console.warn` strings that hardcode a *different* component's bundle name
   than the file they live in — `commonDrilldownNavigation.js`'s wire-error handler logs
   `[myaccountNavigationMenuItems] Wire error:`, which is almost certainly a copy/paste leftover and
   will mislead anyone debugging via console output
   [os:commonDrilldownNavigation/commonDrilldownNavigation.js:30].
4. Flag a component whose exported class name does not match its bundle/file name —
   `commonCountryPicker.js` exports `class CountryPickerV2`, not `CommonCountryPicker`; this is a
   real divergence in the reviewed source, not a typo introduced here
   [os:commonCountryPicker/commonCountryPicker.js:9].
5. Flag any `*Ui` (inner/child) component that declares `<targetConfigs>`/Experience-Builder-facing
   `<property>` entries — in this family the convention is strict: only the outer container is
   builder-placeable, inner `*Ui`/`BarUi`/`ListUi` components take all their data through `@api`
   props from the parent and expose no design-time surface
   [os:commonBreadcrumbsUi/commonBreadcrumbsUi.js-meta.xml:1-4].
6. Flag a component still shipped and exposed to Builder (`isExposed=true`, full `targetConfigs`)
   whose `js-meta.xml` `<description>` explicitly says "Deprecated - use X instead" —
   `layoutHeader` carries exactly this description pointing at `layoutHeaderOne`; new builds should
   not scaffold from the deprecated one [os:layoutHeader/layoutHeader.js-meta.xml:6-8].
7. Flag direct `window`/`document` references inside lifecycle hooks or event listeners that are not
   wrapped in an SSR guard (`!import.meta.env.SSR`) or accessed via `globalThis.document?.` optional
   chaining — both patterns exist side by side in this family (e.g.
   `commonContainerSticky.connectedCallback` guards with `import.meta.env.SSR`, while
   `commonDrilldownNavigationBarUi`/`layoutHeaderOne` use `globalThis.document?.addEventListener`) —
   either is acceptable but a bare `document.addEventListener` with no guard at all is not
   [os:commonContainerSticky/commonContainerSticky.js:11-19]
   [os:layoutHeaderOne/layoutHeaderOne.js:79-84].
8. Flag two independent "what viewport am I in" mechanisms used inconvertibly within the same
   family — `experience/clientApi`'s `getFormFactor` wire (used by `layoutHeader`/`layoutHeaderOne`)
   versus raw `window.matchMedia` + custom breakpoint constants (used by
   `commonDrilldownNavigationUi`). A new component should pick one deliberately, not default to
   `matchMedia` just because a nearby common-family sibling happens to use it
   [os:layoutHeader/layoutHeader.js:32] [os:commonDrilldownNavigationUi/commonDrilldownNavigationUi.js:14-16].
9. Flag reCAPTCHA/site-key calls that swallow failures into an empty-string token with only a bare
   `catch {}` (no logging) — `commonLoginHandler`'s `initializeUser`/`registerCheckoutUser` do this
   for `grecaptcha.execute()` failures; reviewers should confirm this silent-degrade is intentional
   (allow login to proceed without a token) rather than an oversight
   [os:commonLoginHandler/loginUtils.js:32-38] [os:commonLoginHandler/loginUtils.js:112-118].

## Anomalies & divergences

1. **`family==='other'` (5 bundles) reclassified.** `myaccountAddress`,
   `myaccountAddressEmptystate`, `myaccountMarketingconsentSettings`, `myaccountNavigationMenu`,
   `myaccountNavigationMenuItems` are all os-only and fell into `other` only because the census
   family regex expects camelCase `myAccount*` and these five use lowercase `myaccount*`. Per the
   findings doc's open question #8, these are account-family bundles by naming-convention
   inconsistency, not a genuinely distinct family — they belong in the account-family deep read, not
   here. No further investigation of their internals was performed in this task.
2. **`buyerCurrencyFormatter` and `commonFormatterCurrency` are byte-identical** implementations of
   the same `Intl.NumberFormat`-based currency formatter, exported under two different `site/*`
   module names and consumed by two otherwise-identical wrapper components
   (`buyerFormattedPrice`/`commonFormattedPrice`) [os:buyerCurrencyFormatter/buyerCurrencyFormatter.js:1-16]
   [os:commonFormatterCurrency/commonFormatterCurrency.js:1-16]
   [os:buyerFormattedPrice/buyerFormattedPrice.js:2] [os:commonFormattedPrice/commonFormattedPrice.js:2].
   No functional divergence found; this reads as accidental duplication (possibly from a `buyer*` →
   `common*` rename that didn't delete the old module) rather than two deliberately-different
   formatters.
3. **Copy/paste console message referencing the wrong component.**
   `commonDrilldownNavigation.js`'s `getNavigationMenu` wire error handler logs
   `console.error('[myaccountNavigationMenuItems] Wire error:', result.error)` — the bundle name in
   the log string does not match the file it's in [os:commonDrilldownNavigation/commonDrilldownNavigation.js:30].
4. **Class/file name mismatch.** `commonCountryPicker/commonCountryPicker.js` exports `class
   CountryPickerV2`, not a name matching the bundle (`CommonCountryPicker` would be the convention
   used everywhere else in this family) [os:commonCountryPicker/commonCountryPicker.js:9]. Possibly
   an in-place rewrite/rename ("V2") that kept the old bundle folder name.
5. **`commerceErrors` framed by the task brief as "the shared error-normalization archetype" reads,
   on inspection, as a static error-code registry with no normalization logic and no consumers within
   this family's deep-read set** — confirmed by reading both its files in full
   [os:commerceErrors/commerceErrors.js:1] [os:commerceErrors/product.js:1-34]. This notes file
   documents the family's actual error/notification components (`commonError`,
   `commonPageLevelErrorMessage`, `commonScopedNotification`, `commonToast`) as the load-bearing
   error UI patterns instead; a synthesis task should not treat `commerceErrors` as a normalizer to
   imitate.
6. **`layoutHeader` is explicitly deprecated** in favor of `layoutHeaderOne` per its own
   `js-meta.xml` description, yet both remain fully builder-exposed with `isExposed=true` and
   `targetConfigs` [os:layoutHeader/layoutHeader.js-meta.xml:6-8]. Generation guidance should default
   to `layoutHeaderOne` and only reference `layoutHeader` when explicitly asked to match legacy
   markup.
7. **Two independent responsive-layout detection mechanisms coexist**: `experience/clientApi`'s
   `getFormFactor` wire (`layoutHeader`, `layoutHeaderOne`) versus raw `window.matchMedia` with
   locally-defined breakpoint strings (`commonDrilldownNavigationUi`) — see review rule 8. Not
   resolved to one canonical approach in the source; both are legitimate om this repo.
8. **col-side duplicates not independently readable.** The census flags `commonButton`, `commonLink`,
   `commonModal`, `commonNumberInput` as having col-repo records under the `common` family, but no
   separate `col:`-prefixed source tree for these names was available under the OS_ROOT used for
   this task (per the brief, this task's source root is os-only: `b2b-commerce-open-source-
   components-main`). Any os-vs-col comparison for these four names is out of scope for this notes
   file and should be picked up by whichever task reads the col repo directly.
