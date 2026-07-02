# Deep-read notes: account + promotion

> Evidence notes for the B2B Commerce research (spec:
> docs/superpowers/specs/2026-07-02-b2b-commerce-skills-design.md). Every claim carries an
> [os:bundle/file:line] or [col:bundle/file:line] citation. os wins conflicts; divergences are
> recorded, not resolved silently.

## Bundles covered

Census slices: `family==='account'` = 17 camelCase `myAccount*`/`selfRegister*` records, plus the 5
lowercase `myaccount*` records the census filed under `family==='other'` (regex casing gap; reclassified
to account by `notes/common.md`, mined here for the first time), plus `family==='promotion'` = 10 records.
This task's source root is os-only; no `col:` promotion or account bundles exist in this repo pairing, so
every citation is `os:`.

**Read in full (js + html-as-needed + js-meta.xml + helper files):**
myAccountSwitcherList (+managedAccountsUtils.js), myAccountSwitcherModal, myAccountSwitcherListRecord,
myAccountUserProfileMenu, myAccountUserProfileMenuUi, myAccountProfile, myAccountProfileEditor,
myAccountInputAddress, myAccountAddressDeleteConfirmationModal (+errorHandler.js), myAccountAddressFooter,
myAccountAddressCard, myAccountAddAddressButton, selfRegister, selfRegisterUi, myaccountMarketingconsentSettings,
myaccountNavigationMenuItems, myaccountNavigationMenu, myaccountAddress, myaccountAddressEmptystate,
promotionEvaluatePriceDiscount, promotionNameDisplayEvaluator, promotionAppliedDetailsPopover
(+transformPromotions.js), promotionSummaryUi, promotionDiscountsApproaching, promotionDiscountsApproachingUi.

**Skimmed (js + meta only, structural facts extracted):** myAccountProfileUi, myAccountProfileVerification,
myAccountAddressCardUi.

**Census-only (listed for completeness, no claims about internals):** promotionPopover,
promotionTermsConditionsPopover (both trivial `@api`-text popover wrappers per census — imports = lwc only
+ labels).

## Data access — how this family gets data without Apex

No Apex imports anywhere in either family — consistent with the census-wide zero-Apex finding. The account
family is the census's densest user of `commerce/*` mutation surfaces; the promotion family does no data
access at all (pure `@api`-fed display). Modules and exact exports:

- **`commerce/effectiveAccountApi` (B2B effective-account switching — the load-bearing B2B concept).** Three
  distinct exports used: the `ManagedAccountsAdapter` **wire** lists the accounts a user may act on
  [os:myAccountSwitcherList/myAccountSwitcherList.js:27]; the `loadEffectiveAccounts(options)` **imperative**
  call forces a reload [os:myAccountSwitcherList/myAccountSwitcherList.js:25]; and the `effectiveAccount`
  **singleton object** exposes `.accountId` for the currently-effective account
  [os:myAccountSwitcherList/myAccountSwitcherList.js:36] and a `.update(accountId, accountName)` **setter** that
  switches the effective account org-wide [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:145]. Both the
  managed-accounts request and the switch pass `{includeMyAccount: true}`
  [os:myAccountSwitcherList/myAccountSwitcherList.js:6].
- **`commerce/contextApi`** — two wires. `SessionContextAdapter` yields `data.isLoggedIn`, `data.effectiveAccountId`,
  `data.effectiveAccountName`, `data.profile.firstName` [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:91]
  and `data.isPreview` [os:myAccountAddressFooter/myAccountAddressFooter.js:25]. `AppContextAdapter` yields
  `data.logoutUrl` [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:111], and for the address form
  `data.shippingCountries`, `data.country`, `data.skipPhoneNumberValidationEnabled`
  [os:myAccountInputAddress/myAccountInputAddress.js:88].
- **`commerce/myAccountApi`** — one wire + three imperative mutations. `MyAccountAddressDetailAdapter` wire loads an
  address by id (`{addressId: '$addressId'}`) [os:myAccountInputAddress/myAccountInputAddress.js:74]; imperative
  `createMyAccountAddress(input)` [os:myAccountInputAddress/myAccountInputAddress.js:373],
  `updateMyAccountAddress({...input, addressId})` [os:myAccountInputAddress/myAccountInputAddress.js:382], and
  `deleteMyAccountAddress(addressId)` [os:myAccountAddressDeleteConfirmationModal/myAccountAddressDeleteConfirmationModal.js:26].
- **`commerce/actionApi` — enumerated dispatched action names (chases open-question #2).** All go through
  `dispatchAction(this, action, {onSuccess, onError})`. myAccountProfile dispatches
  `createMyAccountProfileOtpInitAction(payload)` [os:myAccountProfile/myAccountProfile.js:219],
  `createMyAccountProfileOtpVerifyAction(payload)` [os:myAccountProfile/myAccountProfile.js:297],
  `createMyAccountProfilePasswordResetAction(userName)` [os:myAccountProfile/myAccountProfile.js:357], and
  `createMyAccountProfileUpdateAction(payload)` [os:myAccountProfile/myAccountProfile.js:377].
  myaccountMarketingconsentSettings dispatches `createCommunicationSubscriptionsChangeAction(params)`
  [os:myaccountMarketingconsentSettings/myaccountMarketingconsentSettings.js:53].
- **`commerce/selfRegistrationApi`** — `selfRegister(params)` (imported aliased as `selfRegisterApex`) is the only
  registration call [os:selfRegister/selfRegister.js:4] [os:selfRegister/selfRegister.js:105].
- **`commerce/loginApi`** — `getSiteKey({registrationProcess})` fetches the reCAPTCHA site key for the profile OTP
  flow [os:myAccountProfile/myAccountProfile.js:87].
- **`commerce/dataEventApi`** — analytics-only, never data fetch: `createInteractionDataEvent('login')` +
  `dispatchDataEvent` on login click [os:myAccountUserProfileMenuUi/myAccountUserProfileMenuUi.js:198], and
  `createUserRegistrationInfoAddDataEvent(email,lastName,firstName,phone)` + `dispatchDataEvent` on register submit
  [os:selfRegisterUi/selfRegisterUi.js:190].
- **`experience/internationalizationApi`** — `getI18nCountries` wire supplies country/state option data
  [os:myAccountInputAddress/myAccountInputAddress.js:94] [os:myAccountProfileEditor/myAccountProfileEditor.js:51].
- **`experience/navigationMenuApi`** — `getNavigationMenu` wire drives the my-account side nav
  [os:myaccountNavigationMenuItems/myaccountNavigationMenuItems.js:18].
- **Expression-bound `@api` defaults (builder-fed data, no wire).** The account family's read-side data arrives
  through Experience-Builder expression defaults, not wires: `profile={!MyProfile.Details}`,
  `clientState={!MyProfile.ClientState}`, `errors={!MyProfile.errors}`
  [os:myAccountProfile/myAccountProfile.js-meta.xml:17] [os:myAccountProfile/myAccountProfile.js-meta.xml:18]
  [os:myAccountProfile/myAccountProfile.js-meta.xml:19]; `item={!MyAccountAddress}` and
  `rawInternationalizationData={!I18n.Countries}` on the address card
  [os:myAccountAddressCard/myAccountAddressCard.js-meta.xml:20] [os:myAccountAddressCard/myAccountAddressCard.js-meta.xml:19];
  `navigationMenuData={!NavMenu.MenuItems}` on the profile menu
  [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js-meta.xml:26]; `consentData={!Marketing.Subscriptions}` on
  both self-register and marketing-consent [os:selfRegister/selfRegister.js-meta.xml:33]
  [os:myaccountMarketingconsentSettings/myaccountMarketingconsentSettings.js-meta.xml:16].
- **Promotion family: zero data access.** Every promotion display component takes already-evaluated promotion data
  as an `@api` prop. The one expression binding is `discountsApproaching={!Cart.DiscountsApproaching}` — cart-derived
  data supplied by the platform [os:promotionDiscountsApproaching/promotionDiscountsApproaching.js-meta.xml:19]. See
  "Promotion evaluation vs re-derivation" below.

## Composition & structure

- **Container / `*Ui` split (data vs render).** myAccountProfile (wires actionApi, holds all state) delegates
  read-render to myAccountProfileUi and edit to myAccountProfileEditor and OTP entry to myAccountProfileVerification
  [os:myAccountProfile/myAccountProfile.js:16]. myAccountUserProfileMenu (container: wires session/app context,
  opens modal) → myAccountUserProfileMenuUi (pure render + keyboard/focus)
  [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:5]. myAccountAddressCard (getter-maps `item`) →
  myAccountAddressCardUi (pure render) per census. Promotion: promotionSummaryUi and promotionDiscountsApproachingUi
  are the `*Ui` inner render halves; promotionDiscountsApproaching is the thin builder-placed container that only
  forwards `discountsApproaching` down [os:promotionDiscountsApproaching/promotionDiscountsApproaching.js:4].
- **The `*Ui` inner components are `isExposed=true` but declare NO `<targets>`.** promotionSummaryUi's meta is
  `isExposed=true` with no `<targets>` block, so it is referenceable but not independently builder-placeable
  [os:promotionSummaryUi/promotionSummaryUi.js-meta.xml:4]. Same shape: myAccountSwitcherList is `isExposed=false`
  and target-less — a pure internal child [os:myAccountSwitcherList/myAccountSwitcherList.js-meta.xml:4].
- **Effective-account switcher is a 4-component cluster.** myAccountUserProfileMenu opens a
  `LightningModal.open({component: CommerceMyAccountSwitcherModal, listeners:{accountselect}})`
  [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:140]; myAccountSwitcherModal (extends `LightningModal`)
  hosts a `site-my-account-switcher-list` and calls its `@api reloadManagedAccounts()` on retry
  [os:myAccountSwitcherModal/myAccountSwitcherModal.js:37]; myAccountSwitcherList wires ManagedAccountsAdapter and
  renders one myAccountSwitcherListRecord per account; each record emits `accountswitchlistrecordclick`
  [os:myAccountSwitcherListRecord/myAccountSwitcherListRecord.js:33].
- **Modals extend `lightning/modal`'s `LightningModal` with a static `open()`.** myAccountSwitcherModal overrides
  `static open(props)` to inject `size:'medium'` + a description default before delegating to `super.open()`
  [os:myAccountSwitcherModal/myAccountSwitcherModal.js:12]; myAccountAddressDeleteConfirmationModal extends
  `LightningModal` and is opened via `MyAccountAddressDeleteConfirmationModal.open({addressId, isPreviewMode, size})`
  from the footer [os:myAccountAddressFooter/myAccountAddressFooter.js:29].
- **`renderMode = 'light'` is universal in both families** — every component read declares
  `static renderMode = 'light'` [os:myAccountInputAddress/myAccountInputAddress.js:26]
  [os:promotionSummaryUi/promotionSummaryUi.js:3]. No shadow-DOM component was seen.
- **Slots via `@slot` JSDoc.** myAccountProfile exposes header/personalDetailsHeaderLabel/changePasswordButton/
  emailHeaderLabel/phoneHeaderLabel slots [os:myAccountProfile/myAccountProfile.js:10]; myAccountInputAddress
  exposes an `actionButtons` slot [os:myAccountInputAddress/myAccountInputAddress.js:23]; the two static lowercase
  containers are slot shells only — myaccountAddress declares a `content` slot and has an empty class body
  [os:myaccountAddress/myaccountAddress.js:4], myaccountNavigationMenu declares welcomeMessage +
  navigationMenuItemList slots [os:myaccountNavigationMenu/myaccountNavigationMenu.js:2].
- **Per-bundle utils/labels barrels, not shared.** managedAccountsUtils.js
  [os:myAccountSwitcherList/managedAccountsUtils.js:1], errorHandler.js
  [os:myAccountAddressDeleteConfirmationModal/errorHandler.js:1], transformPromotions.js
  [os:promotionAppliedDetailsPopover/transformPromotions.js:2] are each local to one bundle.

## Events & communication

- **Effective-account switch handshake.** myAccountSwitcherListRecord → `accountswitchlistrecordclick`
  `{accountId, accountName}` [os:myAccountSwitcherListRecord/myAccountSwitcherListRecord.js:33]; the list re-emits it
  as `accountselect` carrying the same detail [os:myAccountSwitcherList/myAccountSwitcherList.js:55]; the modal
  re-emits `accountselect` then `closeModal('accountselected')`
  [os:myAccountSwitcherModal/myAccountSwitcherModal.js:24]; the menu's modal listener finally calls
  `effectiveAccount.update(...)` and hard-navigates home via `globalThis.location.assign(url)`
  [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:145].
- **Account-load status events.** myAccountSwitcherList fires `accountsloadsuccess` / `accountsloadfailure` (no
  detail) so the modal can toggle its retry actions
  [os:myAccountSwitcherList/myAccountSwitcherList.js:39] [os:myAccountSwitcherList/myAccountSwitcherList.js:41]
  [os:myAccountSwitcherModal/myAccountSwitcherModal.js:33].
- **Profile edit contract.** myAccountProfileEditor → `saveprofile` `{editMode, profile}` (bubbles, composed)
  [os:myAccountProfileEditor/myAccountProfileEditor.js:151] and `backtoprofile` (no detail)
  [os:myAccountProfileEditor/myAccountProfileEditor.js:161]; the container's `handleSaveProfile` reads
  `event.detail.profile` and dispatches the update action [os:myAccountProfile/myAccountProfile.js:375].
- **Address error propagation.** myAccountAddressDeleteConfirmationModal fires `addresserror`
  `{value: getErrorInfo(e, isPreviewMode)}` (bubbles, composed, cancelable:false) then always
  `this.close('success')` [os:myAccountAddressDeleteConfirmationModal/myAccountAddressDeleteConfirmationModal.js:29].
- **Address-form action buttons via slotted events.** myAccountInputAddress listens for `firstaction` (cancel) and
  `secondaction` (save) on itself, added in connectedCallback and removed in disconnectedCallback
  [os:myAccountInputAddress/myAccountInputAddress.js:57] [os:myAccountInputAddress/myAccountInputAddress.js:61].
- **Self-register submit.** selfRegisterUi → `submit` with a full registration detail payload (bubbles, cancelable)
  and `cancel` (no detail) [os:selfRegisterUi/selfRegisterUi.js:174] [os:selfRegisterUi/selfRegisterUi.js:194];
  container `selfRegister.handleSubmit` reads `event.detail` and calls the registration Apex-less API
  [os:selfRegister/selfRegister.js:120].
- **Profile menu nav events.** myAccountUserProfileMenuUi → `navigatetopage` `{id}`, `userlogin`, and `menutoggle`
  `{isMenuOpen}` (all bubbles/cancelable) [os:myAccountUserProfileMenuUi/myAccountUserProfileMenuUi.js:344]
  [os:myAccountUserProfileMenuUi/myAccountUserProfileMenuUi.js:200]
  [os:myAccountUserProfileMenuUi/myAccountUserProfileMenuUi.js:206].
- **Marketing consent toggle.** myaccountMarketingconsentSettings handles a child `consentupdated`-style event
  (`handleConsentOptionUpdated(event)` reading `event.detail.id`/`.value`) and dispatches the change action
  [os:myaccountMarketingconsentSettings/myaccountMarketingconsentSettings.js:41].
- **Promotion popovers open imperatively, not via events.** promotionAppliedDetailsPopover calls
  `this.refs.popupSource.open({alignment,autoFlip,size})` on click, guarded by `hasAppliedPromotions`
  [os:promotionAppliedDetailsPopover/promotionAppliedDetailsPopover.js:31]
  [os:promotionAppliedDetailsPopover/promotionAppliedDetailsPopover.js:41].

## Errors, loading, and processing state

- **Central error normalizer per bundle: `getErrorInfo(exception, isPreviewMode)`.** It short-circuits to a
  preview-mode message, passes through string errors, and otherwise maps the first platform error's `errorCode`
  through `convertErrorMessage` (INVALID_API_INPUT / ILLEGAL_QUERY_PARAMETER_VALUE → invalid-input label;
  INSUFFICIENT_ACCESS_OR_READONLY / INSUFFICIENT_ACCESS / ITEM_NOT_FOUND / INVALID_FIELD → insufficient-access label;
  default → generic) [os:myAccountAddressDeleteConfirmationModal/errorHandler.js:26]
  [os:myAccountAddressDeleteConfirmationModal/errorHandler.js:11]. It guards shape with `isPlatformError`
  (`'errorCode' in error && 'message' in error`) and `isPlatformErrorList`
  [os:myAccountAddressDeleteConfirmationModal/errorHandler.js:2]. myAccountInputAddress uses the same helper for
  wire and mutation failures [os:myAccountInputAddress/myAccountInputAddress.js:84]
  [os:myAccountInputAddress/myAccountInputAddress.js:375].
- **Profile: server error-code → localized message via a Map.** myAccountProfile builds a `_codeToMessageMap`
  (Map of ~25 status/error codes to labels) and `_getMessage(code)` falls back to a default label for unknown codes
  [os:myAccountProfile/myAccountProfile.js:191] [os:myAccountProfile/myAccountProfile.js:194]. Error codes come from
  `this.errors?.[0]?.code` (the builder-fed `errors` expression prop), not thrown exceptions
  [os:myAccountProfile/myAccountProfile.js:197].
- **Processing state during mutations is an explicit local boolean toggled in try/finally.**
  `_showPageSpinner` around create/update address [os:myAccountInputAddress/myAccountInputAddress.js:372]
  [os:myAccountInputAddress/myAccountInputAddress.js:377]; `_showPageSpinner` around delete
  [os:myAccountAddressDeleteConfirmationModal/myAccountAddressDeleteConfirmationModal.js:25]; `_showLoader` around
  each profile action, cleared in both onSuccess and onError [os:myAccountProfile/myAccountProfile.js:218]
  [os:myAccountProfile/myAccountProfile.js:221] [os:myAccountProfile/myAccountProfile.js:231];
  `_isUpdatingConsent` around the consent change [os:myaccountMarketingconsentSettings/myaccountMarketingconsentSettings.js:43];
  `_isLoading` around self-register submit [os:selfRegister/selfRegister.js:135].
- **Loading combines an adapter-provided flag with the local flag.** The switcher list reads the wire's own
  `loading` param and only emits success once `!loading` [os:myAccountSwitcherList/myAccountSwitcherList.js:40]; the
  profile's `_isLoading` getter ORs the builder-fed `clientState.isLoading` with local `_showLoader`
  [os:myAccountProfile/myAccountProfile.js:108].
- **Toasts for async success/failure surfacing.** myAccountProfile and myaccountMarketingconsentSettings both use
  `site/commonToast`'s `Toast.show({label, variant:'success'|'error'}, this)`
  [os:myAccountProfile/myAccountProfile.js:201] [os:myaccountMarketingconsentSettings/myaccountMarketingconsentSettings.js:65].
- **Resend/OTP timing state.** myAccountProfile runs a `setTimeout`-driven countdown (`_startResendTimer` /
  `_clearResendTimer`) formatting `m:ss` and toggling `_showResendCodeButton`
  [os:myAccountProfile/myAccountProfile.js:164] [os:myAccountProfile/myAccountProfile.js:183]. Verification errors
  split inline vs toast: invalid/expired/too-many-attempts codes render inline; anything else toasts
  [os:myAccountProfile/myAccountProfile.js:321].

## Guards

- **Guest vs authenticated (the account family's defining guard).** myAccountUserProfileMenu drives its whole
  logged-in/guest branch off `SessionContextAdapter` `data.isLoggedIn` (default false)
  [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:100]; the Ui half mirrors it with an `@api isLoggedIn =
  false` default so first render treats the user as a guest until context loads
  [os:myAccountUserProfileMenuUi/myAccountUserProfileMenuUi.js:51]. The login link's builder property is documented
  as guest-only and not previewed [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js-meta.xml:19]. Logout
  clears the effective account first (`effectiveAccount.update(null, null)`) then redirects to `logoutUrl`
  [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:129].
- **Preview/design-mode guards before any mutation.** myAccountProfile's `_preventActionInPreview()` toasts and
  bails when `isPreviewMode` (from `experience/clientApi`) is set, called at the top of every action handler
  [os:myAccountProfile/myAccountProfile.js:241] [os:myAccountProfile/myAccountProfile.js:254]; reCAPTCHA loading is
  skipped in SSR and preview [os:myAccountProfile/myAccountProfile.js:97]. The delete modal maps to a
  preview-specific message via `getErrorInfo(e, isPreviewMode)`
  [os:myAccountAddressDeleteConfirmationModal/errorHandler.js:27]; `isPreviewMode` comes from
  `SessionContextAdapter` `data.isPreview` [os:myAccountAddressFooter/myAccountAddressFooter.js:25]. Marketing
  consent uses `isDesignMode` to keep the component visible in Builder even with no subscriptions
  [os:myaccountMarketingconsentSettings/myaccountMarketingconsentSettings.js:22].
- **SSR guards around DOM-touching dispatch.** The switcher modal only dispatches `accountselect` when
  `!import.meta.env.SSR` [os:myAccountSwitcherModal/myAccountSwitcherModal.js:23]; the delete modal only dispatches
  `addresserror` outside SSR [os:myAccountAddressDeleteConfirmationModal/myAccountAddressDeleteConfirmationModal.js:28];
  selfRegisterUi's `getStartUrlFromCurrentUrl` returns `''` under SSR before touching `globalThis.location`
  [os:selfRegisterUi/selfRegisterUi.js:61].
- **`globalThis.*` optional-chaining instead of bare `window`/`document`.** Logout uses
  `globalThis.open?.(...)` [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:130]; effective-account switch
  uses `globalThis.location?.assign?.(url)` [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:147].
- **Undefined-on-first-render guards for expression-bound data.** Promotion components gate render on
  `Array.isArray(x) && x.length > 0` before mapping — promotionDiscountsApproachingUi
  [os:promotionDiscountsApproachingUi/promotionDiscountsApproachingUi.js:7], promotionAppliedDetailsPopover
  [os:promotionAppliedDetailsPopover/promotionAppliedDetailsPopover.js:18]. The address card reads everything through
  `this.item?.` optional chaining so a null `item` renders empty, not an error
  [os:myAccountAddressCard/myAccountAddressCard.js:16]. myAccountInputAddress's `country` setter ignores falsy
  writes [os:myAccountInputAddress/myAccountInputAddress.js:161].
- **Feature/capability guards.** Passwordless-login gating: `_isPasswordLessLoginEnabled` (derived from
  `profile.isPhoneVerified`/`isEmailVerified` not being null) decides whether an edit requires an OTP step-up vs a
  direct edit [os:myAccountProfile/myAccountProfile.js:154] [os:myAccountProfile/myAccountProfile.js:257].
  `skipPhoneNumberValidationEnabled` (from AppContext) switches phone-change handling
  [os:myAccountInputAddress/myAccountInputAddress.js:406].

## Labels & i18n

- **Placeholder interpolation is `String.replace('{token}', ...)`, never a templating lib.**
  myAccountAddressFooter builds aria labels replacing `{editLabel}`/`{addressName}` and `{deleteLabel}`/`{addressName}`
  [os:myAccountAddressFooter/myAccountAddressFooter.js:48]; myAccountProfile's verification descriptions replace
  `{0}` with the recipient [os:myAccountProfile/myAccountProfile.js:140]; promotionNameDisplayEvaluator replaces
  `{code}` then `{name}` [os:promotionNameDisplayEvaluator/promotionNameDisplayEvaluator.js:13].
- **Country/name internationalization is delegated to `site/checkoutInternationalization`.**
  `isLastNameFirstCountry(country)` decides field order and single-name assignment
  [os:myAccountInputAddress/myAccountInputAddress.js:281]; `getCustomLocale(country)` supplies the address locale
  [os:myAccountInputAddress/myAccountInputAddress.js:315]. The address card has a hardcoded
  `STATE_NAME_COUNTRIES` list (JP/CN/KR/TW/TH/VN/MY) that triggers looking up a localized state label from the
  `rawInternationalizationData` payload [os:myAccountAddressCard/myAccountAddressCard.js:4]
  [os:myAccountAddressCard/myAccountAddressCard.js:62].
- **Currency formatting delegated to `site/commonFormatterCurrency`'s `formatAsCurrency(currencyCode, amount)`.**
  transformPromotions only decorates each promotion with `formattedDiscountAmount` and returns the array unchanged
  when no currency code is present [os:promotionAppliedDetailsPopover/transformPromotions.js:9]
  [os:promotionAppliedDetailsPopover/transformPromotions.js:3].
- **Label sourcing is per-bundle** — either a `./labels` re-export barrel (myAccountSwitcherList, selfRegister,
  myAccountProfile) [os:myAccountProfile/myAccountProfile.js:8] or direct `@salesforce/label/site.<Bundle>.<key>`
  imports; every builder-exposed string property is marked `translatable="true"`
  [os:myAccountProfile/myAccountProfile.js-meta.xml:22].

## Accessibility

- **Full keyboard menu contract** in myAccountUserProfileMenuUi: Arrow up/down wraparound focus, Enter to
  activate/open, Escape and Tab to close and return focus to the trigger, with `preventDefault` only on handled keys
  [os:myAccountUserProfileMenuUi/myAccountUserProfileMenuUi.js:245]
  [os:myAccountUserProfileMenuUi/myAccountUserProfileMenuUi.js:305]. Focus is driven imperatively via a rendered
  flag: `renderedCallback` focuses the tracked `focusedMenuItem` only when `isMenuItemRenderingTrigger` is set
  [os:myAccountUserProfileMenuUi/myAccountUserProfileMenuUi.js:55].
- **Imperative `@api focus()` handoff between container and child.** myAccountProfileEditor exposes
  `@api focus()` that focuses its `refs.input` [os:myAccountProfileEditor/myAccountProfileEditor.js:27];
  myAccountAddressFooter exposes `@api focusCell()` focusing its edit button
  [os:myAccountAddressFooter/myAccountAddressFooter.js:53]; myAccountProfile drives post-transition focus through
  `_updateFocus` + `renderedCallback` and suppresses it on iOS (`isIOS()` UA sniff)
  [os:myAccountProfile/myAccountProfile.js:101] [os:myAccountProfile/myAccountProfile.js:161].
- **First-error focus on validation.** Both address and self-register forms find the first
  `.slds-has-error`/invalid element and `.focus()` it before reporting validity
  [os:myAccountInputAddress/myAccountInputAddress.js:413] [os:selfRegisterUi/selfRegisterUi.js:204].
- **aria/alt labels** are generated (`userProfileMenuAltLabelGenerator`)
  [os:myAccountUserProfileMenuUi/myAccountUserProfileMenuUi.js:101] and switcher record icons carry alt text
  [os:myAccountSwitcherListRecord/myAccountSwitcherListRecord.js:4].

## Styling

- **`experience/styling` generators.** myAccountUserProfileMenuUi builds login-link CSS custom properties via
  `generateStyleProperties([{name:'--com-c-my-account-user-profile-login-link-color', value}])`
  [os:myAccountUserProfileMenuUi/myAccountUserProfileMenuUi.js:171]; myaccountMarketingconsentSettings toggles
  `visibility:hidden` during updates through `generateStyleProperties`
  [os:myaccountMarketingconsentSettings/myaccountMarketingconsentSettings.js:27]; myaccountNavigationMenuItems uses
  `generatePaddingClass(spacing, 'vertical')` [os:myaccountNavigationMenuItems/myaccountNavigationMenuItems.js:47].
- **Builder-exposed style props → `--com-c-<component>-<property>` custom properties.** myAccountProfile maps
  `profileCardBorderColor`/`profileCardBorderRadius` into a `--com-c-my-profile-border-*` style string
  [os:myAccountProfile/myAccountProfile.js:413]; myAccountInputAddress maps `formWidth` into
  `--com-c-my-account-input-address-form-width` [os:myAccountInputAddress/myAccountInputAddress.js:311].
- **dxp fallback custom property.** myaccountNavigationMenu falls back to `var(--dxp-g-root)` when no
  `backgroundColor` is set [os:myaccountNavigationMenu/myaccountNavigationMenu.js:11].
- **`BasePath`-relative SVG sprite icons.** myAccountUserProfileMenuUi's trigger icon path is
  `${BasePath}/assets/icons/user-account.svg#user-account` (or company.svg)
  [os:myAccountUserProfileMenuUi/myAccountUserProfileMenuUi.js:111]; the switcher record's check icon is
  `${BasePath}/assets/icons/check-filled.svg#check-filled`
  [os:myAccountSwitcherListRecord/myAccountSwitcherListRecord.js:29].

## Promotion evaluation vs re-derivation

This is the promotion family's headline finding and directly answers the brief's focus item. **No promotion
component evaluates, re-derives, or recomputes a discount or promotion client-side.** Promotions are evaluated
server-side and delivered as already-computed data; the LWC layer only formats and displays it.

- Every promotion display component receives the promotion data as an `@api` prop with no wire and no imperative
  call: promotionSummaryUi (`appliedPromotions`) [os:promotionSummaryUi/promotionSummaryUi.js:4],
  promotionAppliedDetailsPopover (`appliedPromotions`, `currencyCode`)
  [os:promotionAppliedDetailsPopover/promotionAppliedDetailsPopover.js:11], promotionDiscountsApproaching
  (`discountsApproaching`) [os:promotionDiscountsApproaching/promotionDiscountsApproaching.js:4]. The data origin is
  a cart expression binding, not a component computation
  [os:promotionDiscountsApproaching/promotionDiscountsApproaching.js-meta.xml:19].
- **`promotionEvaluatePriceDiscount` is NOT a price/promotion evaluator despite its name** — it is a single pure
  display-gate function `displayDiscountPrice(showDiscountPrice, discountPrice)` that returns a boolean: true only
  when the caller opted in AND the passed discount string parses to a number < 0. It performs no pricing math and
  has zero imports [os:promotionEvaluatePriceDiscount/promotionEvaluatePriceDiscount.js:1]. Its bundle is
  `isExposed=true` with no `<targets>` and no component class/HTML in the folder — a utility module, not a
  placeable component [os:promotionEvaluatePriceDiscount/promotionEvaluatePriceDiscount.js-meta.xml:4].
- **`promotionNameDisplayEvaluator` is likewise display-only** — `generateDisplayablePromotionName(name, code)`
  chooses/formats a label string from an already-known name and coupon code, no derivation of promotion eligibility
  [os:promotionNameDisplayEvaluator/promotionNameDisplayEvaluator.js:2].
- **`transformPromotions` only adds a formatted-currency field** to each already-evaluated promotion; it does not
  compute `discountAmount`, it formats the server-provided one
  [os:promotionAppliedDetailsPopover/transformPromotions.js:9].

## Candidate generation rules

1. To read the currently-effective B2B account, import the `effectiveAccount` singleton from
   `commerce/effectiveAccountApi` and read `effectiveAccount.accountId`; to switch it, call
   `effectiveAccount.update(accountId, accountName)` — do not hand-roll account context
   [os:myAccountSwitcherList/myAccountSwitcherList.js:36] [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:145].
2. To list the accounts a buyer may act on, wire `ManagedAccountsAdapter` from `commerce/effectiveAccountApi` with
   `{includeMyAccount: true}`, and expose an `@api reloadManagedAccounts()` that calls `loadEffectiveAccounts(...)`
   so a parent modal can retry after a load failure
   [os:myAccountSwitcherList/myAccountSwitcherList.js:27] [os:myAccountSwitcherList/myAccountSwitcherList.js:24].
3. After switching the effective account, force a full page reload to the home page
   (`generateUrl(navContext, HOME_PAGE_REF)` + `globalThis.location.assign`) rather than relying on reactive
   re-render — effective-account change invalidates cart/catalog context
   [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:146].
4. Read logged-in state and effective-account identity from `commerce/contextApi`'s `SessionContextAdapter`
   (`data.isLoggedIn`, `data.effectiveAccountId`, `data.effectiveAccountName`) and default the local `isLoggedIn`
   flag to `false` so first render is guest-safe [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:98]
   [os:myAccountUserProfileMenuUi/myAccountUserProfileMenuUi.js:51].
5. Perform my-account address CRUD through `commerce/myAccountApi` imperatives
   (`createMyAccountAddress`/`updateMyAccountAddress`/`deleteMyAccountAddress`) and load a single address with the
   `MyAccountAddressDetailAdapter` wire keyed on `{addressId: '$addressId'}`
   [os:myAccountInputAddress/myAccountInputAddress.js:373] [os:myAccountInputAddress/myAccountInputAddress.js:74].
6. Wrap every mutation in `try/finally`, set a local `_showPageSpinner`/`_showLoader` before the call and clear it
   in `finally` (or in both `onSuccess` and `onError` for dispatchAction callbacks) — do not leave the spinner tied
   to a wire's own loading flag for imperative mutations [os:myAccountInputAddress/myAccountInputAddress.js:371]
   [os:myAccountProfile/myAccountProfile.js:218].
7. Dispatch my-account profile mutations through `commerce/actionApi`'s
   `dispatchAction(this, create<X>Action(payload), {onSuccess, onError})` with the domain action creators
   (`createMyAccountProfileOtpInitAction`, `...OtpVerifyAction`, `...PasswordResetAction`, `...UpdateAction`),
   not a bespoke fetch [os:myAccountProfile/myAccountProfile.js:219] [os:myAccountProfile/myAccountProfile.js:377].
8. Normalize server failures through a small per-bundle `getErrorInfo(exception, isPreviewMode)` helper that
   returns a preview-specific message in preview, passes string errors through, and maps
   `error[0].errorCode` to a localized label with a generic default — shape-check with
   `'errorCode' in error && 'message' in error` before reading
   [os:myAccountAddressDeleteConfirmationModal/errorHandler.js:26] [os:myAccountAddressDeleteConfirmationModal/errorHandler.js:11].
9. Gate every mutating action behind a preview/design check
   (`experience/clientApi` `isPreviewMode`/`isDesignMode`, or `SessionContextAdapter` `data.isPreview`) and
   short-circuit with a user-facing "disabled in preview" message so Builder previews never write data
   [os:myAccountProfile/myAccountProfile.js:241] [os:myAccountAddressFooter/myAccountAddressFooter.js:25].
10. Build modals by extending `LightningModal` from `lightning/modal`, overriding `static open(props)` to inject
    defaults (`size`, description) and delegating to `super.open()`; open them from the parent via the static
    `Modal.open({...})` API and resolve via `this.close(result)`
    [os:myAccountSwitcherModal/myAccountSwitcherModal.js:12] [os:myAccountAddressFooter/myAccountAddressFooter.js:29].
11. For builder-fed read data, bind `@api` props to Experience-Builder expressions in the `.js-meta.xml`
    (`{!MyProfile.Details}`, `{!MyAccountAddress}`, `{!Cart.DiscountsApproaching}`, `{!Marketing.Subscriptions}`)
    rather than wiring the same data — the container is expression-fed, its `*Ui` child is prop-fed
    [os:myAccountProfile/myAccountProfile.js-meta.xml:17] [os:promotionDiscountsApproaching/promotionDiscountsApproaching.js-meta.xml:19].
12. Promotion/discount display components must treat promotion data as pre-evaluated: accept it as an `@api` prop,
    guard with `Array.isArray(x) && x.length > 0`, and only format (currency/label) it — never recompute discount
    amounts or eligibility client-side [os:promotionAppliedDetailsPopover/promotionAppliedDetailsPopover.js:18]
    [os:promotionAppliedDetailsPopover/transformPromotions.js:9].
13. Emit and re-emit switch/select handshakes under stable event names as they bubble up a component chain
    (`accountswitchlistrecordclick` → `accountselect` → `accountselect`), enriching detail but keeping the contract,
    and pair load outcomes with `<x>loadsuccess`/`<x>loadfailure` events so a host can toggle retry UI
    [os:myAccountSwitcherListRecord/myAccountSwitcherListRecord.js:33] [os:myAccountSwitcherList/myAccountSwitcherList.js:39].
14. Guard SSR before any `dispatchEvent` or `globalThis.location`/`window` access
    (`if (!import.meta.env.SSR)`), and prefer `globalThis.open?.()` / `globalThis.location?.assign?.()`
    optional-chaining over bare `window`/`document` [os:myAccountSwitcherModal/myAccountSwitcherModal.js:23]
    [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:130].

## Candidate review rules / anti-patterns

1. Flag any component that recomputes promotion/discount amounts or eligibility client-side; in this codebase the
   correct pattern is display-only over server-evaluated data (`appliedPromotions`/`discountsApproaching` arrive as
   `@api` props, and even the "evaluate" bundle only gates a boolean)
   [os:promotionEvaluatePriceDiscount/promotionEvaluatePriceDiscount.js:1] [os:promotionSummaryUi/promotionSummaryUi.js:4].
2. Flag a bundle whose name implies evaluation/derivation but which is a plain util module —
   `promotionEvaluatePriceDiscount` exports one boolean-returning function and ships no component/HTML yet is
   `isExposed=true`; don't cite the name as evidence of a client-side pricing engine
   [os:promotionEvaluatePriceDiscount/promotionEvaluatePriceDiscount.js:1] [os:promotionEvaluatePriceDiscount/promotionEvaluatePriceDiscount.js-meta.xml:4].
3. Flag a mutating action handler that lacks a preview/design-mode guard — every myAccountProfile action calls
   `_preventActionInPreview()` first; a new write path without an equivalent `isPreviewMode`/`isDesignMode`/
   `data.isPreview` check will corrupt data during Builder preview
   [os:myAccountProfile/myAccountProfile.js:241] [os:myAccountAddressFooter/myAccountAddressFooter.js:25].
4. Flag account-context reads that bypass `commerce/effectiveAccountApi` — reading account id from a URL param,
   custom label, or ad-hoc wire instead of `effectiveAccount.accountId` / `SessionContextAdapter.effectiveAccountId`
   breaks B2B account switching [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:98]
   [os:myAccountSwitcherList/myAccountSwitcherList.js:36].
5. Flag an effective-account switch that does not force a page reload (or that mutates account then relies on
   reactive re-render) — the reference implementation hard-navigates after `effectiveAccount.update(...)`
   [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:145].
6. Flag logout paths that don't clear the effective account before redirect — the menu calls
   `effectiveAccount.update(null, null)` before opening `logoutUrl`
   [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:129].
7. Flag a spinner/processing flag not cleared on the error path — mutation spinners here are cleared in `finally`
   or in both dispatchAction `onSuccess` and `onError`; a spinner set only in the try body will hang on failure
   [os:myAccountInputAddress/myAccountInputAddress.js:376] [os:myAccountProfile/myAccountProfile.js:230].
8. Flag `dispatchEvent` or `globalThis.location`/`window`/`document` usage inside a component that isn't SSR-guarded
   — the switcher modal and delete modal both wrap dispatch in `!import.meta.env.SSR`
   [os:myAccountSwitcherModal/myAccountSwitcherModal.js:23]
   [os:myAccountAddressDeleteConfirmationModal/myAccountAddressDeleteConfirmationModal.js:28].
9. Flag a `console.error` string that hardcodes a different bundle's name than the file it lives in —
   `myaccountNavigationMenuItems.js` correctly logs `[myaccountNavigationMenuItems]`, but the sibling
   `commonDrilldownNavigation.js` (per notes/common.md) logs the same tag from the wrong file; verify the tag
   matches the file [os:myaccountNavigationMenuItems/myaccountNavigationMenuItems.js:28].
10. Flag an `@api` value setter that assigns unconditionally where a falsy write should be ignored —
    myAccountInputAddress's `country`/`province` setters guard `if (value)` so an undefined write doesn't blow away a
    defaulted value [os:myAccountInputAddress/myAccountInputAddress.js:161]
    [os:myAccountInputAddress/myAccountInputAddress.js:170].
11. Flag a display component that renders expression-bound array data without an `Array.isArray && length` guard —
    first render arrives before the expression resolves; the promotion components all guard
    [os:promotionDiscountsApproachingUi/promotionDiscountsApproachingUi.js:7]
    [os:promotionAppliedDetailsPopover/promotionAppliedDetailsPopover.js:18].
12. Flag a `*Ui`/inner render component that declares `<targets>` (builder-placeable) — the convention here is the
    container is placed and the `*Ui` is `isExposed` but target-less or `isExposed=false`
    [os:promotionSummaryUi/promotionSummaryUi.js-meta.xml:4] [os:myAccountSwitcherList/myAccountSwitcherList.js-meta.xml:4].
13. Flag server-error handling that surfaces raw platform error codes to users instead of mapping them through a
    localized label table — myAccountProfile maps ~25 codes via `_codeToMessageMap` with a default, and address
    flows map via `getErrorInfo` [os:myAccountProfile/myAccountProfile.js:191]
    [os:myAccountAddressDeleteConfirmationModal/errorHandler.js:11].

## Anomalies & divergences

1. **Open-question #8 resolved: the 5 lowercase `myaccount*` bundles are account-family, mixed maturity.**
   `myaccountAddress` and `myaccountAddressEmptystate` are static slot/layout shells with empty class bodies (no
   `@api`, no logic) [os:myaccountAddress/myaccountAddress.js:6] [os:myaccountAddressEmptystate/myaccountAddressEmptystate.js:2];
   `myaccountMarketingconsentSettings` (actionApi + toast) [os:myaccountMarketingconsentSettings/myaccountMarketingconsentSettings.js:53],
   `myaccountNavigationMenu` (style shell) [os:myaccountNavigationMenu/myaccountNavigationMenu.js:8], and
   `myaccountNavigationMenuItems` (navigation wire) [os:myaccountNavigationMenuItems/myaccountNavigationMenuItems.js:18]
   are fully-fledged. They are the same family as the camelCase `myAccount*` bundles — a casing inconsistency in
   the bundle names, not a distinct family. Confirmed against the census `other` classification.
2. **Open-question #2 closed for these families:** actionApi dispatches 5 distinct action creators, all enumerated
   in Data access (4 profile + 1 marketing-consent) [os:myAccountProfile/myAccountProfile.js:7]
   [os:myaccountMarketingconsentSettings/myaccountMarketingconsentSettings.js:2].
3. **Open-question #1 (zero Apex) holds but with an indirect reach.** `selfRegister` imports
   `commerce/selfRegistrationApi`'s `selfRegister` export aliased as `selfRegisterApex`
   [os:selfRegister/selfRegister.js:4] — the alias signals it wraps an Apex self-registration handler server-side,
   but no `@salesforce/apex/*` import exists; record as an indirect-Apex divergence, not a direct import.
4. **Name-vs-behavior mismatch (promotion).** `promotionEvaluatePriceDiscount` and `promotionNameDisplayEvaluator`
   are named as "evaluators" but perform display gating/formatting only, with no evaluation logic
   [os:promotionEvaluatePriceDiscount/promotionEvaluatePriceDiscount.js:1]
   [os:promotionNameDisplayEvaluator/promotionNameDisplayEvaluator.js:2]. Chased down per open-question #3
   (`site/promotionNameDisplayEvaluator` single-purpose): confirmed single-purpose util, not a missed call site.
5. **`isExposed=true` with no `<targets>` is a deliberate pattern here**, seen on promotionSummaryUi
   [os:promotionSummaryUi/promotionSummaryUi.js-meta.xml:4] and promotionEvaluatePriceDiscount
   [os:promotionEvaluatePriceDiscount/promotionEvaluatePriceDiscount.js-meta.xml:4] — the component is
   referenceable/renderable by siblings but not independently builder-placeable. Not a metadata error.
6. **UA sniffing for a focus workaround.** myAccountProfile suppresses programmatic focus on iOS via
   `/iPad|iPhone/.test(navigator.userAgent)` [os:myAccountProfile/myAccountProfile.js:161] — a fragile
   device-detection pattern worth flagging if replicated, though intentional here (iOS VoiceOver focus quirk).
7. **`cbVisibleIf="false"`/`cbVisibleIf="<prop>=false"` hides expression-only props from the Builder UI** — e.g.
   `discountsApproaching` [os:promotionDiscountsApproaching/promotionDiscountsApproaching.js-meta.xml:23] and
   self-register's `rawInternationalizationData`/`consentData` [os:selfRegister/selfRegister.js-meta.xml:51]; the
   property still binds its expression default but isn't shown as an editable field. A generation-time detail worth
   teaching, not a defect.
