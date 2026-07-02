# B2B Commerce LWC — API census (both repos)

> Spec: `docs/superpowers/specs/2026-07-02-b2b-commerce-skills-design.md`. This is Task 1 of the
> B2B Commerce research effort — a mechanical inventory over every LWC bundle in both open-source
> repos, curated with grouping and observations. It is the starting point for every deep-read task
> that follows; those tasks read actual source and attach `[os:bundle/file:line]` / `[col:bundle/file:line]`
> citations to specific behavioral claims. This document does not carry file/line citations of its own —
> its rows are aggregate counts, not single-source claims, and `os:name` / `col:name` markers point at
> bundles the same way the raw census does. `SCRATCH/census.json` (not committed) remains the
> full-fidelity source data if a count here needs to be re-derived.

## How this was swept

A zero-dependency Node script (`census.mjs`) walked every top-level directory under each repo's LWC
root — `sfdc_cms__lwc` for the open-source (`os`) repo, `lwc` for commerce-on-lightning-components
(`col`) — treating each directory as one bundle. For every non-test `.js` file in a bundle it regex-parsed
`import` statements (module + imported names), `@wire(Adapter)` usages (resolved back to the module the
adapter was imported from), and `@api` property declarations. For the bundle's `<name>.js-meta.xml` it
parsed every `<property>` element (name, type, default, and whether the default is an expression binding
starting with `{!`) and every `<target>`. A bundle was flagged as having a paired `*Ui` sibling, an `os`
label bundle under `sfdc_cms__label`, or a `__tests__` directory. No source was semantically parsed —
this is regex-level structure, not control flow; deep-read tasks verify behavior against real source.

**Headline numbers:**

- **409 bundles** total — **os = 372**, **col = 37**
- **19 distinct `commerce/*` modules**
- **9 distinct `experience/*` modules**
- **36 distinct wire adapter+module pairs** (243 total `@wire` usages across both repos)
- **196 expression-bound `js-meta.xml` properties** (defaults starting with `{!`) across 26 distinct expression roots
- **Apex imports: 0** — zero `@salesforce/apex*` imports in either repo; both repos get all server data through the `commerce/*` / `experience/*` module surface, never generated Apex controllers

## Bundles per family

Family is assigned by a regex over the bundle name (see `census.mjs` `FAMILY_RULES`); `other` is the
catch-all for anything unmatched.

| family | os | col |
|---|---|---|
| account | 17 | 0 |
| cart | 36 | 0 |
| checkout | 68 | 0 |
| common | 62 | 4 |
| order | 45 | 0 |
| other | 5 | 0 |
| product | 58 | 14 |
| promotion | 8 | 0 |
| quote | 26 | 0 |
| search | 33 | 19 |
| subscription | 14 | 0 |

**Observations:**
- `checkout` (68) and `product` (58 os + 14 col = 72) are the two largest families in os; col ships
  only `common`, `product`, and `search` — a deliberately narrow slice (product browsing/search widgets),
  not a full storefront.
- col has zero bundles in `cart`, `checkout`, `order`, `quote`, `subscription`, `account`, or `promotion` —
  those flows are os-only in this dataset.
- `other` (5, os-only) is the family-rule catch-all; see Anomalies for which bundles land there.

## Module imports, grouped

The raw census (`census.md`) lists every imported module as one flat table sorted by usage; this section
groups the same rows into `commerce/*`, `experience/*`, `lightning/*`, `@salesforce/*`, and everything
else, each still sorted by usage (os + col bundle count) descending. Every module counted by the census
script appears exactly once, in exactly one group below — the total row count across all five tables
equals 1103, the number of distinct non-relative modules imported across both repos.

### `commerce/*`

| module | os bundles | col bundles | families |
|---|---|---|---|
| `commerce/contextApi` | 56 | 5 | account, cart, checkout, common, order, product, quote, search, subscription |
| `commerce/actionApi` | 27 | 7 | account, cart, checkout, common, other, product, search |
| `commerce/dataEventApi` | 25 | 0 | account, cart, checkout, order, product, search |
| `commerce/checkoutCartApi` | 24 | 0 | cart, checkout, common, order, product, quote |
| `commerce/checkoutApi` | 17 | 0 | checkout |
| `commerce/productApi` | 10 | 1 | cart, order, product, search |
| `commerce/cartApi` | 4 | 2 | checkout, order, product, search |
| `commerce/subscriptionApi` | 6 | 0 | subscription |
| `commerce/quoteApi` | 5 | 0 | quote |
| `commerce/myAccountApi` | 4 | 0 | account, checkout |
| `commerce/effectiveAccountApi` | 4 | 0 | account, order, quote |
| `commerce/wishlistApi` | 2 | 0 | cart, product |
| `commerce/promotionApi` | 2 | 0 | cart, product |
| `commerce/loginApi` | 2 | 0 | account, common |
| `commerce/orderApi` | 2 | 0 | order |
| `commerce/activitiesApi` | 2 | 0 | search |
| `commerce/breadcrumbsApi` | 1 | 0 | common |
| `commerce/consentApi` | 1 | 0 | checkout |
| `commerce/selfRegistrationApi` | 1 | 0 | account |

**Observations:**
- `commerce/contextApi` (56 os / 5 col) and `commerce/checkoutCartApi` (24 os / 0 col) are the two most
  broadly-used commerce modules — context (app/session state) reaches almost every family, cart/checkout
  API is os-only since col ships no cart or checkout surface.
- `commerce/cartApi` (4 os / 2 col) is the only `commerce/*` module col imports outside `contextApi` and
  `actionApi`/`productApi` — col's product-purchase-options builder component reads cart status without
  the full checkout cart API os components use.
- `commerce/actionApi` (27 os / 7 col) is the shared imperative-action surface across both repos — see
  the Anomalies/Open-questions section for exact action names, which this census does not resolve (it
  captures the module import, not the specific exported action invoked).

### `experience/*`

| module | os bundles | col bundles | families |
|---|---|---|---|
| `experience/styling` | 73 | 9 | account, cart, checkout, common, order, other, product, quote, search, subscription |
| `experience/clientApi` | 32 | 1 | account, cart, checkout, common, order, other, product, quote, search |
| `experience/resourceResolver` | 19 | 2 | cart, order, product, quote, search, subscription |
| `experience/picture` | 12 | 1 | cart, order, product, quote, search |
| `experience/internationalizationApi` | 13 | 0 | account, cart, checkout, order |
| `experience/utils` | 9 | 1 | cart, checkout, product, search |
| `experience/navigationMenuApi` | 2 | 0 | common, other |
| `experience/iconUtils` | 2 | 0 | common, product |
| `experience/paymentApi` | 2 | 0 | checkout |

**Observations:**
- `experience/styling` (73 os / 9 col) is the single most-imported `experience/*` module in either repo —
  styling hooks/utility access is nearly universal.
- `experience/clientApi` (32 os / 1 col) and `experience/resourceResolver` (19 os / 2 col) are the next
  most common — client context (form factor, etc.) and static resource resolution.
- `experience/paymentApi` and `experience/navigationMenuApi` are rare (2 bundles each, os-only) — both
  are single-purpose (payment method CRUD, nav menu data) and only used by the components that own that
  feature.

### `lightning/*`

| module | os bundles | col bundles | families |
|---|---|---|---|
| `lightning/navigation` | 71 | 5 | account, cart, checkout, common, order, other, product, quote, search, subscription |
| `lightning/modal` | 25 | 2 | account, cart, checkout, common, order, product, quote, search, subscription |
| `lightning/platformResourceLoader` | 3 | 0 | account, checkout, common |
| `lightning/uiRecordApi` | 1 | 0 | common |
| `lightning/toast` | 1 | 0 | common |
| `lightning/platformShowToastEvent` | 0 | 1 | product |

**Observations:**
- `lightning/navigation` (71 os / 5 col) is the dominant base-module import outside `commerce/*` /
  `experience/*` — navigation is handled with the standard `NavigationMixin`/`NavigationContext`
  surface, not a commerce-specific wrapper.
- `lightning/modal` (25 os / 2 col) is the second most common — most modal usage goes through the base
  `LightningModal` component, not a custom overlay library.
- `lightning/uiRecordApi`, `lightning/toast`, and `lightning/platformShowToastEvent` each appear in only
  1–2 bundles — most toast/notification handling instead routes through `site/commonToast` (os) or
  `c/commonModal`/local patterns (col); see Anomalies.

### `@salesforce/*`

`@salesforce/*` splits into 9 non-label platform modules and
991 `@salesforce/label/*` imports — one distinct module per label key, since every
label is its own ES module. Both subsets are listed in full below; the label subset is long by
construction (each is imported by exactly the 1 bundle that owns that label, occasionally 2 when col
mirrors an os label key) and is grouped by owning bundle for readability rather than left in raw import
order.

**Non-label platform modules:**

| module | os bundles | col bundles | families |
|---|---|---|---|
| `@salesforce/community/basePath` | 44 | 0 | account, cart, checkout, common, order, product, quote, search, subscription |
| `@salesforce/i18n/locale` | 16 | 1 | cart, checkout, common, order, subscription |
| `@salesforce/i18n/currency` | 10 | 0 | cart, checkout, order, quote |
| `@salesforce/i18n/timeZone` | 5 | 0 | cart, checkout, common, order, subscription |
| `@salesforce/i18n/number.decimalSeparator` | 1 | 1 | common |
| `@salesforce/i18n/number.groupingSeparator` | 1 | 1 | common |
| `@salesforce/site/activeLanguages` | 1 | 0 | common |
| `@salesforce/i18n/lang` | 1 | 0 | common |
| `@salesforce/client/formFactor` | 1 | 0 | order |

**Observations:**
- `@salesforce/community/basePath` (44 os / 0 col) is the most-used non-label platform module — os
  resolves in-community links locally; col does not build any navigation/link surface.
- `@salesforce/i18n/*` (locale, currency, timeZone, lang, number.decimalSeparator/groupingSeparator) covers
  locale-aware formatting; `col` only imports the two `number.*` separator modules (shared with os in
  `commonNumberInput`), not the broader locale/currency/timeZone set — col has no currency-formatting
  component of its own.
- `@salesforce/client/formFactor` appears in exactly 1 os bundle (`orderQuickOrder`) — everywhere else
  form-factor detection goes through `experience/clientApi`'s `getFormFactor` wire adapter instead.

**`@salesforce/label/*` imports (991 distinct label modules), grouped by owning bundle:**

| bundle | label count | label modules |
|---|---|---|
| os:myAccountProfile | 41 | `site.myAccountProfile.verifyEmailHeaderLabel`, `site.myAccountProfile.verifyPhoneHeaderLabel`, `site.myAccountProfile.verifyEmailDescriptionLabel`, `site.myAccountProfile.verifyPhoneDescriptionLabel`, `site.myAccountProfile.verifyEmailSuccessfulMessage`, `site.myAccountProfile.verifyPhoneSuccessfulMessage`, `site.myAccountProfile.invalidIdentifierErrorMessage`, `site.myAccountProfile.backActionLabel`, `site.myAccountProfile.invalidCodeErrorMessage`, `site.myAccountProfile.expiredCodeErrorMessage`, `site.myAccountProfile.tooManyAttemptsErrorMessage`, `site.myAccountProfile.defaultErrorMessage`, `site.myAccountProfile.actionDisabledInPreviewMessage`, `site.myAccountProfile.changePasswordSuccessfulMessage`, `site.myAccountProfile.otpGenerationErrorMessage`, `site.myAccountProfile.reCaptchaGenerationErrorMessage`, `site.myAccountProfile.personalDetailsUpdatedSuccessMessage`, `site.myAccountProfile.emailUpdatedSuccessMessage`, `site.myAccountProfile.phoneUpdatedSuccessMessage`, `site.myAccountProfile.emailInitOtpSuccessMessage`, `site.myAccountProfile.phoneInitOtpSuccessMessage`, `site.myAccountProfile.editPersonalDetailsHeaderLabel`, `site.myAccountProfile.editEmailHeaderLabel`, `site.myAccountProfile.editPhoneHeaderLabel`, `site.myAccountProfile.addPhoneHeaderLabel`, `site.myAccountProfile.editEmailDescriptionLabel`, `site.myAccountProfile.editPhoneDescriptionLabel`, `site.myAccountProfile.editFirstNameLabel`, `site.myAccountProfile.editLastNameLabel`, `site.myAccountProfile.editEmailLabel`, `site.myAccountProfile.editPhoneLabel`, `site.myAccountProfile.authenticateHeaderLabel`, `site.myAccountProfile.authenticateEmailDescriptionLabel`, `site.myAccountProfile.authenticatePhoneDescriptionLabel`, `site.myAccountProfile.authenticateViaEmailButtonLabel`, `site.myAccountProfile.authenticateViaMobileButtonLabel`, `site.myAccountProfile.authenticateSuccessfulMessage`, `site.myAccountProfile.addMobileErrorMessageIfEmailNotVerified`, `site.myAccountProfile.ProfileWithEmailUpdatedSuccess`, `site.myAccountProfile.ProfileUpdatedFailed`, `site.myAccountProfile.loaderAssistiveText` |
| os:subscriptionCardV2 | 39 | `site.subscriptionCardV2.cancelStatusInProgressText`, `site.subscriptionCardV2.cancelStatusSuccessMainText`, `site.subscriptionCardV2.cancelStatusSuccessSupportText`, `site.subscriptionCardV2.cancelStatusFailedMainText`, `site.subscriptionCardV2.cancelStatusFailedSupportText`, `site.subscriptionCardV2.cancelSuccessBannerMainText`, `site.subscriptionCardV2.amendmentStatusInProgressText`, `site.subscriptionCardV2.amendmentStatusSuccessMainText`, `site.subscriptionCardV2.amendmentStatusFailedMainText`, `site.subscriptionCardV2.amendmentStatusFailedSupportText`, `site.subscriptionCardV2.amendmentStatusSuccessSupportText`, `site.subscriptionCardV2.positiveAmendmentSuccessBannerMainText`, `site.subscriptionCardV2.negativeAmendmentSuccessBannerMainText`, `site.subscriptionCardV2.renewalSuccessBannerMainText`, `site.subscriptionCardV2.expiresOnDateText`, `site.subscriptionCardV2.expiringInNDaysPillText`, `site.subscriptionCardV2.expiringIn1DayPillText`, `site.subscriptionCardV2.expiringTodayPillText`, `site.subscriptionCardV2.month`, `site.subscriptionCardV2.year`, `site.subscriptionCardV2.perBillingTermUnit`, `site.subscriptionCardV2.paymentMethodsLoadError`, `site.subscriptionCardV2.paymentMethodAddNew`, `site.subscriptionCardV2.updatePaymentText`, `site.subscriptionCardV2.savedPaymentMethodDeletedText`, `site.subscriptionCardV2.paymentFailureText`, `site.subscriptionCardV2.amendSubscriptionCardAmendButtonLabel`, `site.subscriptionCardV2.amendSubscriptionCardMoreButtonLabel`, `site.subscriptionCardV2.viewHistoryButtonLabel`, `site.subscriptionCardV2.renewButton`, `site.subscriptionCardV2.renewSectionDescriptionLabel`, `site.subscriptionCardV2.renewSectionHeadingLabel`, `site.subscriptionCardV2.renewalStatusInProgressText`, `site.subscriptionCardV2.renewalStatusSuccessMainText`, `site.subscriptionCardV2.renewalStatusFailedMainText`, `site.subscriptionCardV2.subscriptionBundleExpandedLabel`, `site.subscriptionCardV2.childSubscriptionsLoadError`, `site.subscriptionCardV2.childSubscriptionQuantityLabel`, `site.subscriptionCardV2.cancelSubscriptionButtonLabel` |
| os:cartItem | 24 | `site.cartItem.pricePerItem`, `site.cartItem.pricePerItemAssistiveText`, `site.cartItem.removeButtonText`, `site.cartItem.removeItemAssistiveText`, `site.cartItem.itemNameQuantityText`, `site.cartItem.evergreenMonthlySubscriptionTypeText`, `site.cartItem.evergreenAnnualSubscriptionTypeText`, `site.cartItem.termDefinedMonthlySubscriptionTypeText`, `site.cartItem.termDefinedAnnualSubscriptionTypeText`, `site.cartItem.originalPriceAssistiveText`, `site.cartItem.originalPricePerMonthSubscriptionText`, `site.cartItem.originalPricePerYearSubscriptionText`, `site.cartItem.originalPricePerMonthSubscriptionAssistiveText`, `site.cartItem.originalPricePerYearSubscriptionAssistiveText`, `site.cartItem.actualPriceAssistiveText`, `site.cartItem.actualPricePerMonthSubscriptionText`, `site.cartItem.actualPricePerYearSubscriptionText`, `site.cartItem.actualPricePerMonthSubscriptionAssistiveText`, `site.cartItem.actualPricePerYearSubscriptionAssistiveText`, `site.cartItem.bundleChildProductCount`, `site.cartItem.modifyButtonText`, `site.cartItem.modifyItemAssistiveText`, `site.cartItem.ConfiguredText`, `site.cartItem.seeConfigButtonText` |
| os:cartOptions | 23 | `site.cartOptions.optionsMenuLabel`, `site.cartOptions.editCart`, `site.cartOptions.clearCart`, `site.cartOptions.deleteCart`, `site.cartOptions.setAsDefault`, `site.cartOptions.clearCartConfirmMessage`, `site.cartOptions.clearCartConfirmButton`, `site.cartOptions.clearCartSuccessMessage`, `site.cartOptions.clearCartErrorMessage`, `site.cartOptions.clearCartSpinnerHelpText`, `site.cartOptions.deleteCartConfirmTitle`, `site.cartOptions.deleteCartConfirmMessage`, `site.cartOptions.deleteCartConfirmButton`, `site.cartOptions.cancelButton`, `site.cartOptions.deleteCartSuccessMessage`, `site.cartOptions.deleteCartErrorMessage`, `site.cartOptions.setAsDefaultTitle`, `site.cartOptions.setAsDefaultConfirmMessage`, `site.cartOptions.setAsDefaultConfirmButton`, `site.cartOptions.setAsDefaultSuccessMessage`, `site.cartOptions.setAsDefaultErrorMessage`, `site.cartOptions.deleteCartSpinnerHelpText`, `site.cartOptions.setAsDefaultSpinnerHelpText` |
| os:myAccountInputAddress | 19 | `site.myAccountInputAddress.defaultErrorMessage`, `site.myAccountInputAddress.insufficientAccessMessage`, `site.myAccountInputAddress.invalidApiInputMessage`, `site.myAccountInputAddress.opInvalidInPreviewMode`, `site.myAccountInputAddress.firstNameLabel`, `site.myAccountInputAddress.lastNameLabel`, `site.myAccountInputAddress.addressTypeLabel`, `site.myAccountInputAddress.companyNameLabel`, `site.myAccountInputAddress.addressLineOneLabel`, `site.myAccountInputAddress.addressLineTwoLabel`, `site.myAccountInputAddress.cityLabel`, `site.myAccountInputAddress.postalCodeLabel`, `site.myAccountInputAddress.provinceLabel`, `site.myAccountInputAddress.countryLabel`, `site.myAccountInputAddress.addressTypePlaceHolderLabel`, `site.myAccountInputAddress.shippingLabel`, `site.myAccountInputAddress.billingLabel`, `site.myAccountInputAddress.saveLabel`, `site.myAccountInputAddress.phoneNumberLabel` |
| os:orderQuickOrder | 19 | `site.orderQuickOrder.defaultErrorMessage`, `site.orderQuickOrder.successfullyAddedItemsToCart`, `site.orderQuickOrder.successfullyAddedToCartPopupMessage`, `site.orderQuickOrder.productNameAndSkuText`, `site.orderQuickOrder.productNameAndSkuTextWithCommaSeperator`, `site.orderQuickOrder.productNameText`, `site.orderQuickOrder.productNameTextWithCommaSeperator`, `site.orderQuickOrder.partiallyAddedItemsToastNotificationHeaderText`, `site.orderQuickOrder.partiallyAddedItemsToastNotificationBodyText`, `site.orderQuickOrder.partiallyAddedItemToastNotificationBodyText`, `site.orderQuickOrder.failedItemsToastNotificationHeaderText`, `site.orderQuickOrder.failedItemsToastNotificationBodyText`, `site.orderQuickOrder.failedItemToastNotificationBodyText`, `site.orderQuickOrder.webstoreNotFoundErrorMessage`, `site.orderQuickOrder.effectiveAccountNotFoundErrorMessage`, `site.orderQuickOrder.invalidInputErrorMessage`, `site.orderQuickOrder.insufficientAccessErrorMessage`, `site.orderQuickOrder.tooManyRecordsLimitErrorMessage`, `site.orderQuickOrder.notFoundErrorMessage` |
| os:subscriptionCard | 19 | `site.subscriptionCard.cancelStatusInProgressText`, `site.subscriptionCard.cancelStatusSuccessMainText`, `site.subscriptionCard.cancelStatusSuccessSupportText`, `site.subscriptionCard.cancelStatusFailedMainText`, `site.subscriptionCard.cancelStatusFailedSupportText`, `site.subscriptionCard.expiringInNDaysPillText`, `site.subscriptionCard.expiringIn1DayPillText`, `site.subscriptionCard.expiringTodayPillText`, `site.subscriptionCard.month`, `site.subscriptionCard.year`, `site.subscriptionCard.perBillingTermUnit`, `site.subscriptionCard.paymentMethodsLoadError`, `site.subscriptionCard.paymentMethodAddNew`, `site.subscriptionCard.updatePaymentText`, `site.subscriptionCard.savedPaymentMethodDeletedText`, `site.subscriptionCard.paymentFailureText`, `site.subscriptionCard.subscriptionBundleExpandedLabel`, `site.subscriptionCard.childSubscriptionsLoadError`, `site.subscriptionCard.childSubscriptionQuantityLabel` |
| os:cartCreateModal | 18 | `site.cartCreateModal.createNewCartHeader`, `site.cartCreateModal.editCartConfirmTitle`, `site.cartCreateModal.cartNameLabel`, `site.cartCreateModal.cartDescription`, `site.cartCreateModal.createCartSaveButton`, `site.cartCreateModal.editCartConfirmButton`, `site.cartCreateModal.createCartCancelButtonLabel`, `site.cartCreateModal.cartNameMaxLengthErrMsg`, `site.cartCreateModal.cartDescriptionMaxLengthErrMsg`, `site.cartCreateModal.createCartApiFailureMessage`, `site.cartCreateModal.createCartApiSuccessMessage`, `site.cartCreateModal.editCartSuccessMessage`, `site.cartCreateModal.editCartErrorMessage`, `site.cartCreateModal.spinnerHelpText`, `site.cartCreateModal.editCartSpinnerHelpText`, `site.cartCreateModal.cartNameMandatoryErrorMessage`, `site.cartCreateModal.cartNameInvalidCharactersErrMsg`, `site.cartCreateModal.cartDescInvalidCharactersErrMsg` |
| os:subscriptionActionHistoryCard | 18 | `site.subscriptionActionHistoryCard.subscriptionAmendQtyIncreaseInProgress`, `site.subscriptionActionHistoryCard.subscriptionAmendQtyDecreaseInProgress`, `site.subscriptionActionHistoryCard.subscriptionAmendQtyIncreaseSuccessful`, `site.subscriptionActionHistoryCard.subscriptionAmendQtyDecreaseSuccessful`, `site.subscriptionActionHistoryCard.subscriptionAmendQtyIncreaseFailed`, `site.subscriptionActionHistoryCard.subscriptionAmendQtyDecreaseFailed`, `site.subscriptionActionHistoryCard.subscriptionCancelInProgress`, `site.subscriptionActionHistoryCard.subscriptionCancelSuccessful`, `site.subscriptionActionHistoryCard.subscriptionCancelFailed`, `site.subscriptionActionHistoryCard.subscriptionRenewInProgress`, `site.subscriptionActionHistoryCard.subscriptionRenewSuccessful`, `site.subscriptionActionHistoryCard.subscriptionRenewFailed`, `site.subscriptionActionHistoryCard.subscriptionQtyAmendFrom`, `site.subscriptionActionHistoryCard.subscriptionQtyAmendTo`, `site.subscriptionActionHistoryCard.subscriptionRenewFrom`, `site.subscriptionActionHistoryCard.subscriptionRenewTo`, `site.subscriptionActionHistoryCard.subscriptionHistoryInitiatedDateLabel`, `site.subscriptionActionHistoryCard.subscriptionHistoryEffectiveDateLabel` |
| os:checkoutAddressModal | 16 | `site.checkoutAddressModal.firstNameLabel`, `site.checkoutAddressModal.lastNameLabel`, `site.checkoutAddressModal.companyNameLabel`, `site.checkoutAddressModal.streetLabel`, `site.checkoutAddressModal.cityLabel`, `site.checkoutAddressModal.postalCodeLabel`, `site.checkoutAddressModal.provinceLabel`, `site.checkoutAddressModal.countryLabel`, `site.checkoutAddressModal.newAddressLabel`, `site.checkoutAddressModal.editAddressLabel`, `site.checkoutAddressModal.makeDefaultAddressLabel`, `site.checkoutAddressModal.phoneNumberLabel`, `site.checkoutAddressModal.componentHeaderEditAddressLabel`, `site.checkoutAddressModal.cancelActionLabel`, `site.checkoutAddressModal.headerLabel`, `site.checkoutAddressModal.saveAddressLabel` |
| os:subscriptionAmendModal | 16 | `site.subscriptionAmendModal.headerText`, `site.subscriptionAmendModal.amendBodyHeader`, `site.subscriptionAmendModal.amendBodyDesc`, `site.subscriptionAmendModal.amendSubscriptionQtyLabel`, `site.subscriptionAmendModal.amendSubscriptionDateLabel`, `site.subscriptionAmendModal.amendCloseButtonLabel`, `site.subscriptionAmendModal.amendSubscriptionButtonLabel`, `site.subscriptionAmendModal.negativeAmendSubscriptionDateLabel`, `site.subscriptionAmendModal.negativeAmendSubscriptionWarningText`, `site.subscriptionAmendModal.amendSubscriptionWarningMsg`, `site.subscriptionAmendModal.amendSubscriptionSuccessMsg`, `site.subscriptionAmendModal.amendSubscriptionErrorMsg`, `site.subscriptionAmendModal.spinnerHelpText`, `site.subscriptionAmendModal.month`, `site.subscriptionAmendModal.year`, `site.subscriptionAmendModal.perBillingTermUnit` |
| os:checkoutPaymentByExpressWrapper | 14 | `site.checkoutPaymentByExpressWrapper.paymentProcessing`, `site.checkoutPaymentByExpressWrapper.paymentCancelMessage`, `site.checkoutPaymentByExpressWrapper.productAmountTitle`, `site.checkoutPaymentByExpressWrapper.taxTitle`, `site.checkoutPaymentByExpressWrapper.shippingTitle`, `site.checkoutPaymentByExpressWrapper.missingPaymentMethodSetKeyTitle`, `site.checkoutPaymentByExpressWrapper.missingPaymentMethodSetKeyDescription`, `site.checkoutPaymentByExpressWrapper.salesforcePaymentsNotLicensedTitle`, `site.checkoutPaymentByExpressWrapper.salesforcePaymentsNotLicensedDescription`, `site.checkoutPaymentByExpressWrapper.defaultComponentErrorTitle`, `site.checkoutPaymentByExpressWrapper.defaultComponentErrorDescription`, `site.checkoutPaymentByExpressWrapper.expressButtonsTitle`, `site.checkoutPaymentByExpressWrapper.shippingMethodsMessage`, `site.checkoutPaymentByExpressWrapper.finalAmountTitle` |
| col:builderProductPurchaseOptions | 13 | `c.Product_PurchaseOptions_modalCartTitleSuccess`, `c.Product_PurchaseOptions_modalCartActionView`, `c.Product_PurchaseOptions_modalCartActionContinue`, `c.Shared_error`, `c.Shared_success`, `c.Product_PurchaseOptions_toastWishlistError`, `c.Product_PurchaseOptions_toastWishlistSuccess`, `c.Product_PurchaseOptions_errorAccessInsufficient`, `c.Product_PurchaseOptions_errorLimitMinimum`, `c.Product_PurchaseOptions_errorLimitMaximum`, `c.Product_PurchaseOptions_errorLimitIncrement`, `c.Product_PurchaseOptions_errorLimitExceeded`, `c.Product_PurchaseOptions_errorDefault` |
| os:cartBadgeUi | 13 | `site.cartBadgeUi.itemsInCart`, `site.cartBadgeUi.itemInCart`, `site.cartBadgeUi.productTypesInCart`, `site.cartBadgeUi.productTypeInCart`, `site.cartBadgeUi.emptyCart`, `site.cartBadgeUi.preserveGuestCartErrorTitle`, `site.cartBadgeUi.preserveGuestCartErrorMessage`, `site.cartBadgeUi.viewAllCartsLabel`, `site.cartBadgeUi.itemsLabel`, `site.cartBadgeUi.defaultCartTypePillLabel`, `site.cartBadgeUi.loadingCarts`, `site.cartBadgeUi.fetchSecondaryCartsErrorLine1`, `site.cartBadgeUi.fetchSecondaryCartsErrorLine2` |
| os:checkoutDeliverymethod | 13 | `site.checkoutDeliverymethod.deliveryOptionsAssistiveTextLabel`, `site.checkoutDeliverymethod.noDeliveryMethodsErrorLabel`, `site.checkoutDeliverymethod.validityValueMissing`, `site.checkoutDeliverymethod.deliveryEstimateText`, `site.checkoutDeliverymethod.dateRangeDeliveryEstimateText`, `site.checkoutDeliverymethod.sameDayDeliveryEstimateText`, `site.checkoutDeliverymethod.exactDayDeliveryEstimateText`, `site.checkoutDeliverymethod.nextDayDeliveryEstimateText`, `site.checkoutDeliverymethod.optionsSeparator`, `site.checkoutDeliverymethod.emptyMessage`, `site.checkoutDeliverymethod.splitShipmentScopeNotificationLabel`, `site.checkoutDeliverymethod.dateRangeDeliverySummaryEstimateText`, `site.checkoutDeliverymethod.multipleShippingMethodsLabel` |
| os:paymentSavedMethodsActionModal | 13 | `site.paymentSavedMethodsActionModal.cancelLabel`, `site.paymentSavedMethodsActionModal.deleteLabel`, `site.paymentSavedMethodsActionModal.deleteHeaderText`, `site.paymentSavedMethodsActionModal.deleteText`, `site.paymentSavedMethodsActionModal.defaultLabel`, `site.paymentSavedMethodsActionModal.defaultHeaderText`, `site.paymentSavedMethodsActionModal.defaultText`, `site.paymentSavedMethodsActionModal.shareLabel`, `site.paymentSavedMethodsActionModal.unshareLabel`, `site.paymentSavedMethodsActionModal.shareModalHeaderText`, `site.paymentSavedMethodsActionModal.unshareModalHeaderText`, `site.paymentSavedMethodsActionModal.shareButtonLabel`, `site.paymentSavedMethodsActionModal.unShareButtonLabel` |
| os:subscriptionRenewModal | 13 | `site.subscriptionRenewModal.headerText`, `site.subscriptionRenewModal.renewBodyHeader`, `site.subscriptionRenewModal.renewBodyDesc`, `site.subscriptionRenewModal.amendSubscriptionQtyLabel`, `site.subscriptionRenewModal.renewCloseButtonLabel`, `site.subscriptionRenewModal.renewSubscriptionButtonLabel`, `site.subscriptionRenewModal.subscriptionTerm`, `site.subscriptionRenewModal.renewSubscriptionErrorMessage`, `site.subscriptionRenewModal.renewSubscriptionSuccessMessage`, `site.subscriptionRenewModal.subscriptionDuration`, `site.subscriptionRenewModal.spinnerHelpText`, `site.subscriptionRenewModal.month`, `site.subscriptionRenewModal.year` |
| os:checkoutErrorHandler | 12 | `site.checkoutErrorHandler.genericErrorHeader`, `site.checkoutErrorHandler.unknownErrorBody`, `site.checkoutErrorHandler.noDeliveryAddressesBody`, `site.checkoutErrorHandler.noDeliveryMethodsErrorLabel`, `site.checkoutErrorHandler.insufficientInventoryBody`, `site.checkoutErrorHandler.insufficientInventoryHeader`, `site.checkoutErrorHandler.invalidContactPhoneBody`, `site.checkoutErrorHandler.fatalErrorBody`, `site.checkoutErrorHandler.returnToCart`, `site.checkoutErrorHandler.returnToCheckout`, `site.checkoutErrorHandler.paymentErrorBody`, `site.checkoutErrorHandler.paymentErrorHeader` |
| os:paymentSavedMethodsGrid | 12 | `site.paymentSavedMethodsGrid.DeleteActionFailed`, `site.paymentSavedMethodsGrid.DeleteActionSucceed`, `site.paymentSavedMethodsGrid.DefaultActionFailed`, `site.paymentSavedMethodsGrid.DefaultActionSucceed`, `site.paymentSavedMethodsGrid.shareActionSucceed`, `site.paymentSavedMethodsGrid.unshareActionSucceed`, `site.paymentSavedMethodsGrid.shareActionFailed`, `site.paymentSavedMethodsGrid.unshareActionFailed`, `site.paymentSavedMethodsGrid.missingPaymentMethodSetKeyTitle`, `site.paymentSavedMethodsGrid.missingPaymentMethodSetKeyDescription`, `site.paymentSavedMethodsGrid.defaultComponentErrorTitle`, `site.paymentSavedMethodsGrid.defaultComponentErrorDescription` |
| os:productSubscriptionSelector | 12 | `site.productSubscriptionSelector.monthly`, `site.productSubscriptionSelector.yearly`, `site.productSubscriptionSelector.month`, `site.productSubscriptionSelector.year`, `site.productSubscriptionSelector.months`, `site.productSubscriptionSelector.years`, `site.productSubscriptionSelector.evergreen`, `site.productSubscriptionSelector.subscriptionDetailOptionLabel`, `site.productSubscriptionSelector.termDefinedSubscriptionTypeOptionLabel`, `site.productSubscriptionSelector.termDefinedSubscriptionDetailOptionLabel`, `site.productSubscriptionSelector.subscriptionType`, `site.productSubscriptionSelector.subscriptionDetail` |
| os:checkoutGiftOptions | 11 | `site.checkoutGiftOptions.noGiftOptionsLabel`, `site.checkoutGiftOptions.giftMessageLabel`, `site.checkoutGiftOptions.giftWrapLabel`, `site.checkoutGiftOptions.giftMessageAndWrapLabel`, `site.checkoutGiftOptions.orderIsAGiftLabel`, `site.checkoutGiftOptions.giftMessageCheckboxLabel`, `site.checkoutGiftOptions.giftMessageTextAreaPlaceholderTextLabel`, `site.checkoutGiftOptions.giftMessageRemainingCharactersLabel`, `site.checkoutGiftOptions.orderAsGiftCheckBoxLabel`, `site.checkoutGiftOptions.addGiftWrapLabel`, `site.checkoutGiftOptions.defaultDeliveryGroupMessage` |
| os:cartApplyCoupon | 10 | `site.cartApplyCoupon.applyCouponAlreadyAppliedErrorMessage`, `site.cartApplyCoupon.applyCouponBlockedExclusiveErrorMessage`, `site.cartApplyCoupon.defaultErrorMessage`, `site.cartApplyCoupon.applyCouponEffectiveAccountNotFoundErrorMessage`, `site.cartApplyCoupon.applyCouponInsufficientAccessErrorMessage`, `site.cartApplyCoupon.applyCouponMaxLimitExceededErrorMessage`, `site.cartApplyCoupon.applyCouponMaxItemLimitExceededErrorMessage`, `site.cartApplyCoupon.applyCouponInvalidInputErrorMessage`, `site.cartApplyCoupon.applyCouponUnqualifiedCartErrorMessage`, `site.cartApplyCoupon.webstoreNotFoundErrorMessage` |
| os:checkoutDeliverymethodOptions | 10 | `site.checkoutDeliverymethodOptions.deliveryOptionsAssistiveTextLabel`, `site.checkoutDeliverymethodOptions.noDeliveryMethodsErrorLabel`, `site.checkoutDeliverymethodOptions.validityValueMissing`, `site.checkoutDeliverymethodOptions.deliveryEstimateText`, `site.checkoutDeliverymethodOptions.dateRangeDeliveryEstimateText`, `site.checkoutDeliverymethodOptions.sameDayDeliveryEstimateText`, `site.checkoutDeliverymethodOptions.exactDayDeliveryEstimateText`, `site.checkoutDeliverymethodOptions.nextDayDeliveryEstimateText`, `site.checkoutDeliverymethodOptions.optionsSeparator`, `site.checkoutDeliverymethodOptions.emptyMessage` |
| os:reorderModalContents | 10 | `site.reorderModalContents.itemsAddedItemsNotAvailableInStoreHelpText`, `site.reorderModalContents.itemAddedItemsNotAvailableInStoreHelpText`, `site.reorderModalContents.itemsAddedItemNotAvailableInStoreHelpText`, `site.reorderModalContents.itemAddedItemNotAvailableInStoreHelpText`, `site.reorderModalContents.noItemsAvailableHelpText`, `site.reorderModalContents.unavailableItems`, `site.reorderModalContents.spinnerScreenHelpText`, `site.reorderModalContents.successfullyAddedToCart`, `site.reorderModalContents.errorScreenSubHeaderText`, `site.reorderModalContents.AddDynamicBundlesToCartException` |
| os:subscriptionCancelModal | 10 | `site.subscriptionCancelModal.headerText`, `site.subscriptionCancelModal.confirmationHeading`, `site.subscriptionCancelModal.confirmationDescription`, `site.subscriptionCancelModal.spinnerHelpText`, `site.subscriptionCancelModal.closeButtonLabel`, `site.subscriptionCancelModal.cancelSubscriptionButtonLabel`, `site.subscriptionCancelModal.cancellationInitiationSuccessToastLabel`, `site.subscriptionCancelModal.cancellationInitiationFailedToastLabel`, `site.subscriptionCancelModal.cancellationInitiationFailedToastMessage`, `site.subscriptionCancelModal.cancelConfirmationMsg` |
| os:cartItemDropdown | 9 | `site.cartItemDropdown.addressSingleLineBreak`, `site.cartItemDropdown.newShipmentButtonText`, `site.cartItemDropdown.deliveryGroupSelectorLabel`, `site.cartItemDropdown.deliveryAddressSelectorLabel`, `site.cartItemDropdown.createNewAddressLabel`, `site.cartItemDropdown.defaultDropdownTextForShipmentModal`, `site.cartItemDropdown.dropdownDisplayValue`, `site.cartItemDropdown.deliveryGroupDataLoading`, `site.cartItemDropdown.deliveryGroupDataLoadingAssistiveTextLabel` |
| os:checkoutInputAddress | 9 | `site.checkoutInputAddress.firstNameLabel`, `site.checkoutInputAddress.lastNameLabel`, `site.checkoutInputAddress.companyNameLabel`, `site.checkoutInputAddress.addressLineOneLabel`, `site.checkoutInputAddress.addressLineTwoLabel`, `site.checkoutInputAddress.cityLabel`, `site.checkoutInputAddress.postalCodeLabel`, `site.checkoutInputAddress.provinceLabel`, `site.checkoutInputAddress.countryLabel` |
| os:myAccountProfileEditor | 9 | `site.myAccountProfileEditor.ConfirmEmailMismatchError`, `site.myAccountProfileEditor.ConfirmPhoneMismatchError`, `site.myAccountProfileEditor.ExistingEmailError`, `site.myAccountProfileEditor.ExistingPhoneError`, `site.myAccountProfileEditor.ConfirmEmailLabel`, `site.myAccountProfileEditor.ConfirmPhoneLabel`, `site.myAccountProfileEditor.CancelActionLabel`, `site.myAccountProfileEditor.SaveActionLabel`, `site.myAccountProfileEditor.SaveAndVerifyActionLabel` |
| os:quoteCartModalUi | 9 | `site.quoteCartModalUi.cartAlreadyContainsQuoteItemsErrorMessage`, `site.quoteCartModalUi.subscriptionProductsNotSupportedErrorMessage`, `site.quoteCartModalUi.subscriptionProductCheckFailedErrorMessage`, `site.quoteCartModalUi.duplicateToCartWithInactiveProductFailed`, `site.quoteCartModalUi.acceptAndBuyOperationErrorMessage`, `site.quoteCartModalUi.duplicateCartOperationErrorMessage`, `site.quoteCartModalUi.duplicateProductInCartErrorMessage`, `site.quoteCartModalUi.cartCreationFailedErrorMessage`, `site.quoteCartModalUi.outOfStockError` |
| os:quoteTocartModal | 9 | `site.quoteTocartModal.cartAlreadyContainsQuoteItemsErrorMessage`, `site.quoteTocartModal.subscriptionProductsNotSupportedErrorMessage`, `site.quoteTocartModal.subscriptionProductCheckFailedErrorMessage`, `site.quoteTocartModal.duplicateToCartWithInactiveProductFailed`, `site.quoteTocartModal.acceptAndBuyOperationErrorMessage`, `site.quoteTocartModal.duplicateCartOperationErrorMessage`, `site.quoteTocartModal.duplicateProductInCartErrorMessage`, `site.quoteTocartModal.cartCreationFailedErrorMessage`, `site.quoteTocartModal.outOfStockError` |
| os:searchInputContainer | 9 | `site.searchInputContainer.ariaClearButtonLabel`, `site.searchInputContainer.ariaSearchInputLabel`, `site.searchInputContainer.ariaSearchIconLabel`, `site.searchInputContainer.clearButtonLabel`, `site.searchInputContainer.seeAllResultsLabel`, `site.searchInputContainer.alternativeSearchInputSpinnerText`, `site.searchInputContainer.recentSearchDefaultText`, `site.searchInputContainer.bestSellerDefaultText`, `site.searchInputContainer.productSuggestionsDefaultText` |
| os:splitShipmentLayout | 9 | `site.splitShipmentLayout.summaryText`, `site.splitShipmentLayout.originalPrice`, `site.splitShipmentLayout.promotions`, `site.splitShipmentLayout.shipping`, `site.splitShipmentLayout.subtotal`, `site.splitShipmentLayout.taxIncluded`, `site.splitShipmentLayout.tax`, `site.splitShipmentLayout.total`, `site.splitShipmentLayout.headerText` |
| col:searchFiltersModalPanel | 8 | `c.Search_Facets_backActionAssistiveText`, `c.Search_Facets_clearButton`, `c.Search_Results_oneResultSearchHeaderShort`, `c.Search_Results_multipleResultSearchHeaderShort`, `c.Search_Results_oneCategoryHeader`, `c.Search_Results_multipleCategoryHeader`, `c.Search_Facets_cancelButton`, `c.Search_Results_allCategoriesName` |
| os:cartAddToSecondaryCart | 8 | `site.cartAddToSecondaryCart.addToSecondaryCart`, `site.cartAddToSecondaryCart.itemsLabel`, `site.cartAddToSecondaryCart.addToSecondaryCartSuccessToast`, `site.cartAddToSecondaryCart.addToSecondaryCartFailureToast`, `site.cartAddToSecondaryCart.fetchSecondaryCartsNoResult`, `site.cartAddToSecondaryCart.fetchSecondaryCartsErrorLine1`, `site.cartAddToSecondaryCart.fetchSecondaryCartsErrorLine2`, `site.cartAddToSecondaryCart.fetchSecondaryCartsLoading` |
| os:myAccountAddressDeleteConfirmationModal | 8 | `site.myAccountAddressDeleteConfirmationModal.defaultErrorMessage`, `site.myAccountAddressDeleteConfirmationModal.insufficientAccessMessage`, `site.myAccountAddressDeleteConfirmationModal.invalidApiInputMessage`, `site.myAccountAddressDeleteConfirmationModal.opInvalidInPreviewMode`, `site.myAccountAddressDeleteConfirmationModal.deleteLabel`, `site.myAccountAddressDeleteConfirmationModal.cancelLabel`, `site.myAccountAddressDeleteConfirmationModal.deleteAddressHeaderText`, `site.myAccountAddressDeleteConfirmationModal.deleteAddressText` |
| os:orderAmount | 8 | `site.orderAmount.TotalProductAmount`, `site.orderAmount.TotalAdjustedDeliveryAmount`, `site.orderAmount.TotalTaxAmount`, `site.orderAmount.GrandTotalAmount`, `site.orderAmount.TotalProductAmountWithTax`, `site.orderAmount.TotalAdjDeliveryAmtWithTax`, `site.orderAmount.TotalProductPromotionDistAmount`, `site.orderAmount.TotalProductPromotionDiscount` |
| os:paymentSavedMethodsCardFooter | 8 | `site.paymentSavedMethodsCardFooter.deleteLabel`, `site.paymentSavedMethodsCardFooter.cancelLabel`, `site.paymentSavedMethodsCardFooter.deleteHeaderText`, `site.paymentSavedMethodsCardFooter.deleteText`, `site.paymentSavedMethodsCardFooter.defaultLabel`, `site.paymentSavedMethodsCardFooter.shareCheckboxLabel`, `site.paymentSavedMethodsCardFooter.defaultHeaderText`, `site.paymentSavedMethodsCardFooter.defaultText` |
| os:searchFiltersPanel | 8 | `site.searchFiltersPanel.filterHeader`, `site.searchFiltersPanel.clearFiltersButton`, `site.searchFiltersPanel.clearButtonAriaLabel`, `site.searchFiltersPanel.closeLabel`, `site.searchFiltersPanel.oneSeeItemsButton`, `site.searchFiltersPanel.multipleSeeItemsButton`, `site.searchFiltersPanel.loading`, `site.searchFiltersPanel.sortAndFilters` |
| os:subscriptionTermDetailsPill | 8 | `site.subscriptionTermDetailsPill.termDefinedEveryMonthPillText`, `site.subscriptionTermDetailsPill.termDefinedEveryNMonthsPillText`, `site.subscriptionTermDetailsPill.termDefinedEveryYearPillText`, `site.subscriptionTermDetailsPill.termDefinedEveryNYearsPillText`, `site.subscriptionTermDetailsPill.evergreenEveryMonthPillText`, `site.subscriptionTermDetailsPill.evergreenEveryNMonthsPillText`, `site.subscriptionTermDetailsPill.evergreenEveryYearPillText`, `site.subscriptionTermDetailsPill.evergreenEveryNYearsPillText` |
| os:commonCountryPickerConfirmationModal | 7 | `site.commonCountryPickerConfirmationModal.continueChangeCountryText`, `site.commonCountryPickerConfirmationModal.cancelChangeCountryText`, `site.commonCountryPickerConfirmationModal.continueChangeCountryAriaLabel`, `site.commonCountryPickerConfirmationModal.cancelChangeCountryTextAriaLabel`, `site.commonCountryPickerConfirmationModal.modalHeadingLabel`, `site.commonCountryPickerConfirmationModal.confirmationModalText1`, `site.commonCountryPickerConfirmationModal.confirmationModalText2` |
| os:commonPasswordlessLoginModal | 7 | `site.commonPasswordlessLoginModal.modalHeader`, `site.commonPasswordlessLoginModal.otpDescriptionEmail`, `site.commonPasswordlessLoginModal.otpDescriptionPhone`, `site.commonPasswordlessLoginModal.resendButton`, `site.commonPasswordlessLoginModal.guestCheckout`, `site.commonPasswordlessLoginModal.resendTooltip`, `site.commonPasswordlessLoginModal.switchEmailButton` |
| os:paymentByExpress | 7 | `site.paymentByExpress.paymentProcessing`, `site.paymentByExpress.paymentCancelMessage`, `site.paymentByExpress.productAmountTitle`, `site.paymentByExpress.taxTitle`, `site.paymentByExpress.shippingTitle`, `site.paymentByExpress.paymentErrorTitle`, `site.paymentByExpress.paymentErrorMessage` |
| os:productAddToCartUtils | 7 | `site.productAddToCartUtils.insufficientAccessErrorMessage`, `site.productAddToCartUtils.addItemToCartIncrementalPurchaseQuantityLimitErrorMessage`, `site.productAddToCartUtils.addItemToCartMaximumPurchaseQuantityLimitErrorMessage`, `site.productAddToCartUtils.addItemToCartMaximumCartSizeErrorMessage`, `site.productAddToCartUtils.addItemToCartMinimumPurchaseQuantityLimitErrorMessage`, `site.productAddToCartUtils.genericAddToCartErrorMessage`, `site.productAddToCartUtils.externalServiceExceptionErrorMessage` |
| os:reorderModal | 7 | `site.reorderModal.noItemAvailableInStoreHeaderText`, `site.reorderModal.itemsNotAvailableInStoreHeaderText`, `site.reorderModal.viewCartButtonLabel`, `site.reorderModal.continueShoppingButton`, `site.reorderModal.errorScreenHeaderText`, `site.reorderModal.defaultHeaderText`, `site.reorderModal.closeButtonLabel` |
| os:searchPriceRangeFacet | 7 | `site.searchPriceRangeFacet.priceRangeMinLimit`, `site.searchPriceRangeFacet.priceRangeMaxLimit`, `site.searchPriceRangeFacet.priceRangeMinLimitError`, `site.searchPriceRangeFacet.priceRangeMaxLimitError`, `site.searchPriceRangeFacet.priceRangeMinPriceError`, `site.searchPriceRangeFacet.priceRangeMaxPriceError`, `site.searchPriceRangeFacet.priceRangeApplyButtonText` |
| os:subscriptionPaymentMethodModal | 7 | `site.subscriptionPaymentMethodModal.headerText`, `site.subscriptionPaymentMethodModal.confirmationDescription`, `site.subscriptionPaymentMethodModal.spinnerHelpText`, `site.subscriptionPaymentMethodModal.closeButtonLabel`, `site.subscriptionPaymentMethodModal.updateSavedPaymentMethodButtonLabel`, `site.subscriptionPaymentMethodModal.updateSavedPaymentMethodSuccessToastLabel`, `site.subscriptionPaymentMethodModal.updateSavedPaymentMethodFailedToastLabel` |
| os:cartBadge | 6 | `site.cartBadge.maximumCount`, `site.cartBadge.successfullyAddedToCartPopupMessage`, `site.cartBadge.headerText`, `site.cartBadge.checkoutButtonText`, `site.cartBadge.continueShoppingButtonText`, `site.cartBadge.viewCartButtonText` |
| os:cartHeader | 6 | `site.cartHeader.nameAZ`, `site.cartHeader.nameZA`, `site.cartHeader.dateAddedNew`, `site.cartHeader.dateAddedOld`, `site.cartHeader.labelText`, `site.cartHeader.confirmClearCart` |
| os:cartSplitshipmentContents | 6 | `site.cartSplitshipmentContents.addressModalDescriptionLabel`, `site.cartSplitshipmentContents.genericApiErrorMessage`, `site.cartSplitshipmentContents.shipmentModalDescriptionLabel`, `site.cartSplitshipmentContents.newDeliveryGroupName`, `site.cartSplitshipmentContents.headerLabel`, `site.cartSplitshipmentContents.saveNewShipmentLabel` |
| os:cartSplitshipmentHeader | 6 | `site.cartSplitshipmentHeader.genericApiErrorMessage`, `site.cartSplitshipmentHeader.emptyDefaultDeliveryGroupErrorMessage`, `site.cartSplitshipmentHeader.shipToOneAddressModalMessage`, `site.cartSplitshipmentHeader.cancelMergeShipments`, `site.cartSplitshipmentHeader.shipToOneAddress`, `site.cartSplitshipmentHeader.shipToOneAddressModalTitle` |
| os:checkoutDeliveryAddress | 6 | `site.checkoutDeliveryAddress.addressModalDescriptionLabel`, `site.checkoutDeliveryAddress.shippingMultipleLocationsSummaryLabel`, `site.checkoutDeliveryAddress.phoneNumberLabel`, `site.checkoutDeliveryAddress.requiredShippingPhoneMissing`, `site.checkoutDeliveryAddress.shipToMultipleLocationsNoAddressLabel`, `site.checkoutDeliveryAddress.shipmentWithSubscriptionLabel` |
| os:myAccountProfileUi | 6 | `site.myAccountProfileUi.NoDataLabel`, `site.myAccountProfileUi.EditActionLabel`, `site.myAccountProfileUi.VerifyActionLabel`, `site.myAccountProfileUi.AddActionLabel`, `site.myAccountProfileUi.VerifiedLabel`, `site.myAccountProfileUi.UnVerifiedLabel` |
| os:orderQuickOrderItem | 6 | `site.orderQuickOrderItem.searchInputAriaLabel`, `site.orderQuickOrderItem.removeButtonAssistiveTextWithNoEntry`, `site.orderQuickOrderItem.removeButtonAssistiveTextWithValidEntry`, `site.orderQuickOrderItem.defaultSearchErrorMessage`, `site.orderQuickOrderItem.skuIsUnavailableInlineErrorMessage`, `site.orderQuickOrderItem.subscriptionProductSkuIsNotAvailableInlineErrorMessage` |
| os:productBundleItemUi | 6 | `site.productBundleItemUi.childIsRequiredText`, `site.productBundleItemUi.childIsIncludedAddOnText`, `site.productBundleItemUi.childIsOptionalAddOnText`, `site.productBundleItemUi.noExtraCostText`, `site.productBundleItemUi.childCostsExtraText`, `site.productBundleItemUi.childCostsExtraTextWithNoPriceAvailableText` |
| os:subscriptionCardList | 6 | `site.subscriptionCardList.quantityPrefixText`, `site.subscriptionCardList.taxLabel`, `site.subscriptionCardList.singleSubscriptionWarningTitle`, `site.subscriptionCardList.multipleSubscriptionsWarningTitle`, `site.subscriptionCardList.warningDescription`, `site.subscriptionCardList.warningAction` |
| col:productQuantitySelector | 5 | `c.Product_QuantitySelector_rangeOverflow`, `c.Product_QuantitySelector_rangeUnderflow`, `c.Product_QuantitySelector_stepMismatch`, `c.Product_QuantitySelector_patternMismatch`, `c.Product_QuantitySelector_outOfStock` |
| os:cartSummary | 5 | `site.cartSummary.defaultErrorMessage`, `site.cartSummary.getCartItemsEffectiveAccountNotFoundErrorMessage`, `site.cartSummary.getCartItemsInsufficientAccessErrorMessage`, `site.cartSummary.getCartItemsInvalidInputErrorMessage`, `site.cartSummary.webstoreNotFoundErrorMessage` |
| os:checkoutDeliverymethodGroup | 5 | `site.checkoutDeliverymethodGroup.deliveryGroupCartItemsSubTotalTextLabel`, `site.checkoutDeliverymethodGroup.itemsTextLabel`, `site.checkoutDeliverymethodGroup.showMoreItemsLabel`, `site.checkoutDeliverymethodGroup.nameAddressSingleLineBreak`, `site.checkoutDeliverymethodGroup.deliveryEmailPrompt` |
| os:checkoutEmptyshipmentModal | 5 | `site.checkoutEmptyshipmentModal.cancelActionLabel`, `site.checkoutEmptyshipmentModal.removeShipmentButtonText`, `site.checkoutEmptyshipmentModal.removeLastItemMessage`, `site.checkoutEmptyshipmentModal.removeShipmentModalDescriptionLabel`, `site.checkoutEmptyshipmentModal.headerLabel` |
| os:commonQuantitySelector | 5 | `site.commonQuantitySelector.rangeOverflow`, `site.commonQuantitySelector.rangeUnderflow`, `site.commonQuantitySelector.stepMismatch`, `site.commonQuantitySelector.patternMismatch`, `site.commonQuantitySelector.outOfStock` |
| os:myAccountProfileVerification | 5 | `site.myAccountProfileVerification.ResendCodeButtonLabel`, `site.myAccountProfileVerification.ReCaptchaDisclaimer`, `site.myAccountProfileVerification.ResendWaitMessage`, `site.myAccountProfileVerification.OtpInputAriaLabel`, `site.myAccountProfileVerification.LoaderAssistiveText` |
| os:paymentAddPaymentMethodsUi | 5 | `site.paymentAddPaymentMethodsUi.addPaymentMethodHeader`, `site.paymentAddPaymentMethodsUi.billingAddressSubHeader`, `site.paymentAddPaymentMethodsUi.paymentMethodSubHeader`, `site.paymentAddPaymentMethodsUi.CancelLabel`, `site.paymentAddPaymentMethodsUi.saveLabel` |
| os:searchInputFacet | 5 | `site.searchInputFacet.showMore`, `site.searchInputFacet.showLess`, `site.searchInputFacet.showMoreAriaLabel`, `site.searchInputFacet.showLessAriaLabel`, `site.searchInputFacet.moreButtonText` |
| os:searchResultsUi | 5 | `site.searchResultsUi.loading`, `site.searchResultsUi.noResultsFound`, `site.searchResultsUi.resultsLoaded`, `site.searchResultsUi.resultsLoadedPartial`, `site.searchResultsUi.variationAttribute` |
| os:subscriptionHistoryPanel | 5 | `site.subscriptionHistoryPanel.viewHistoryPanelLabel`, `site.subscriptionHistoryPanel.subscriptionHistoryEmptyHeader`, `site.subscriptionHistoryPanel.subscriptionHistoryEmptyMessage`, `site.subscriptionHistoryPanel.subscriptionHistoryLoadError`, `site.subscriptionHistoryPanel.subscriptionHistoryTryAgainButtonLabel` |
| col:searchInputFacet | 4 | `c.Search_Facets_showMore`, `c.Search_Facets_showLess`, `c.Search_Facets_showMoreAriaLabel`, `c.Search_Facets_showLessAriaLabel` |
| col:searchProductCard | 4 | `c.Search_ProductCard_variationAttribute`, `c.Search_ProductCard_addToCartAriaLabel`, `c.Search_ProductCard_viewOptionsAriaLabel`, `c.Search_ProductCard_subscriptionOptions` |
| os:cartMinicartpanel | 4 | `site.cartMinicartpanel.emptyMiniCart`, `site.cartMinicartpanel.defaultErrorMessageForMiniCart`, `site.cartMinicartpanel.addError`, `site.cartMinicartpanel.removeError` |
| os:commonDrilldownNavigationListUi | 4 | `site.commonDrilldownNavigationListUi.closeNavigationMenu`, `site.commonDrilldownNavigationListUi.All`, `site.commonDrilldownNavigationListUi.Back`, `site.commonDrilldownNavigationListUi.component_name` |
| os:commonItemFields | 4 | `site.commonItemFields.keyValueSeparatorWithSpace`, `site.commonItemFields.adjustmentsPopupHeaderText`, `site.commonItemFields.closeButtonAssistiveText`, `site.commonItemFields.infoBubbleAssistiveText` |
| os:commonScopedNotification | 4 | `site.commonScopedNotification.infoIconAltText`, `site.commonScopedNotification.warningIconAltText`, `site.commonScopedNotification.errorIconAltText`, `site.commonScopedNotification.successIconAltText` |
| os:myAccountSwitcherList | 4 | `site.myAccountSwitcherList.errorActionLabel`, `site.myAccountSwitcherList.errorDescription`, `site.myAccountSwitcherList.errorHeading`, `site.myAccountSwitcherList.spinnerAltText` |
| os:myAccountSwitcherModal | 4 | `site.myAccountSwitcherModal.description`, `site.myAccountSwitcherModal.headerLabel`, `site.myAccountSwitcherModal.cancelActionLabel`, `site.myAccountSwitcherModal.tryAgainActionLabel` |
| os:orderDetails | 4 | `site.orderDetails.OrderedDate`, `site.orderDetails.Account`, `site.orderDetails.owner_name`, `site.orderDetails.Status` |
| os:orderDetailsDisplay | 4 | `site.orderDetailsDisplay.spinnerText`, `site.orderDetailsDisplay.noDataAvailableText`, `site.orderDetailsDisplay.keyValueSeparatorWithSpace`, `site.orderDetailsDisplay.genericErrorMessage` |
| os:orderListDateFilterUi | 4 | `site.orderListDateFilterUi.allTime`, `site.orderListDateFilterUi.past6Month`, `site.orderListDateFilterUi.pastYear`, `site.orderListDateFilterUi.filterText` |
| os:orderSummary | 4 | `site.orderSummary.Name`, `site.orderSummary.OrderedDate`, `site.orderSummary.Status`, `site.orderSummary.GrandTotalAmount` |
| os:productCard | 4 | `site.productCard.addToCartSuccess`, `site.productCard.addToCartError`, `site.productCard.removeError`, `site.productCard.productQuickViewButtonLabel` |
| os:quoteListDatefilterUi | 4 | `site.quoteListDatefilterUi.allTime`, `site.quoteListDatefilterUi.past6Month`, `site.quoteListDatefilterUi.pastYear`, `site.quoteListDatefilterUi.filterText` |
| os:quoteRequestButton | 4 | `site.quoteRequestButton.quoteRequestError`, `site.quoteRequestButton.bundleRequestError`, `site.quoteRequestButton.subscriptionRequestError`, `site.quoteRequestButton.secondaryCartQuoteError` |
| os:searchInputSuggestions | 4 | `site.searchInput.clear`, `site.searchInput.loading`, `site.searchInput.search`, `site.searchInput.searchInputAriaDescribedby` |
| os:searchProductCard | 4 | `site.searchProductCard.addToCartAriaLabel`, `site.searchProductCard.viewOptionsAriaLabel`, `site.searchProductCard.variationAttribute`, `site.searchProductCard.configurableLabel` |
| os:searchResults | 4 | `site.searchResults.viewCart`, `site.searchResults.continueShopping`, `site.searchResults.successfullyAddedToCartPopupMessage`, `site.searchResults.unexpectedAddToCartError` |
| col:builderSearchResults | 3 | `c.Product_ModalAddToCart_actionViewCart`, `c.Product_ModalAddToCart_actionContinueShopping`, `c.Product_ModalAddToCart_messageSuccessfullyAddedToCart` |
| col:commonNumberInput | 3 | `c.Common_NumberInput_decrementAltText`, `c.Common_NumberInput_incrementAltText`, `c.Common_NumberInput_inputAriaLabel` |
| col:searchPagingControl | 3 | `c.Search_Results_previous`, `c.Search_Results_next`, `c.Search_Results_resultsLimitHitText` |
| os:cartClearCartModal | 3 | `site.cartClearCartModal.clearCartConfirmationHeader`, `site.cartClearCartModal.cancelClearCart`, `site.cartClearCartModal.confirmClearCart` |
| os:cartDeliverygroupItem | 3 | `site.cartDeliverygroupItem.removeShipmentButtonText`, `site.cartDeliverygroupItem.additionalAddressSplitItemText`, `site.cartDeliverygroupItem.increaseQuantitySplitShipText` |
| os:cartDetailsCard | 3 | `site.cartDetailsCard.itemsLabel`, `site.cartDetailsCard.optionsMenuLabel`, `site.cartDetailsCard.defaultCartTypePillLabel` |
| os:cartSplitshipmentItemUi | 3 | `site.cartSplitshipmentItemUi.imageDefaultAssistiveText`, `site.cartSplitshipmentItemUi.pricePerItem`, `site.cartSplitshipmentItemUi.pricePerItemAssistiveText` |
| os:checkoutAddressVisualPicker | 3 | `site.checkoutAddressVisualPicker.badgeLabel`, `site.checkoutAddressVisualPicker.editButtonAriaLabel`, `site.checkoutAddressVisualPicker.validityValueMissing` |
| os:checkoutNewshipmentModal | 3 | `site.checkoutNewshipmentModal.headerLabel`, `site.checkoutNewshipmentModal.cancelActionLabel`, `site.checkoutNewshipmentModal.saveNewShipmentLabel` |
| os:commonDrilldownNavigationBarUi | 3 | `site.commonDrilldownNavigationBarUi.titleLabel`, `site.commonDrilldownNavigationBarUi.OverflowMenuItemLabel`, `site.commonDrilldownNavigationBarUi.component_name` |
| os:commonLoginHandler | 3 | `site.commonLoginHandler.internalError`, `site.commonLoginHandler.tooManyAttemptsError`, `site.commonLoginHandler.incorrectCodeError` |
| os:commonNumberInput | 3 | `site.commonNumberInput.decrementAltText`, `site.commonNumberInput.incrementAltText`, `site.commonNumberInput.inputAriaLabel` |
| os:marketingEmailsignup | 3 | `site.marketingEmailsignup.emailErrorMessage`, `site.marketingEmailsignup.checkboxErrorMessage`, `site.marketingEmailsignup.systemErrorMessage` |
| os:myaccountMarketingconsentSettings | 3 | `site.myaccountMarketingconsentSettings.successToastMessage`, `site.myaccountMarketingconsentSettings.errorToastMessage`, `site.myaccountMarketingconsentSettings.updatingStencilAssistiveText` |
| os:orderConfirmationDeliverygroup | 3 | `site.orderConfirmationDeliverygroup.hours`, `site.orderConfirmationDeliverygroup.days`, `site.orderConfirmationDeliverygroup.weeks` |
| os:orderDeliveryGroupDisplay | 3 | `site.orderDeliveryGroupDisplay.showMore`, `site.orderDeliveryGroupDisplay.keyValueSeparatorWithSpace`, `site.orderDeliveryGroupDisplay.spinnerText` |
| os:orderItemInfo | 3 | `site.orderItemInfo.withProduct`, `site.orderItemInfo.subscriptionPriceMonthlyLabel`, `site.orderItemInfo.subscriptionPriceYearlyLabel` |
| os:orderSummaryUi | 3 | `site.orderSummaryUi.detailsAssistiveText`, `site.orderSummaryUi.keyValueSeparatorWithSpace`, `site.orderSummaryUi.startReorderAssistiveText` |
| os:paymentSavedMethodsGridUi | 3 | `site.paymentSavedMethodsGridUi.NoAccess`, `site.paymentSavedMethodsGridUi.mySPMTabLabel`, `site.paymentSavedMethodsGridUi.sharedSPMTabLabel` |
| os:productFbtItem | 3 | `site.productFbtItem.strikethroughAssistiveText`, `site.productFbtItem.mainProduct`, `site.productFbtItem.units` |
| os:productFrequentlyBoughtTogetherUi | 3 | `site.productFrequentlyBoughtTogetherUi.totalPrice`, `site.productFrequentlyBoughtTogetherUi.addIconText`, `site.productFrequentlyBoughtTogetherUi.equalIconText` |
| os:productListPurchased | 3 | `site.productListPurchased.alternativeSpinnerText`, `site.productListPurchased.errorHeading`, `site.productListPurchased.errorDescription` |
| os:productListPurchasedFilterange | 3 | `site.productListPurchasedFilterange.pastMonth`, `site.productListPurchasedFilterange.past6Month`, `site.productListPurchasedFilterange.pastYear` |
| os:productMediaGallery | 3 | `site.productMediaGallery.previousAssistiveText`, `site.productMediaGallery.nextAssistiveText`, `site.productMediaGallery.noProductImageText` |
| os:productPricingDetailsUi | 3 | `site.productPricingDetailsUi.subscriptionPrice`, `site.productPricingDetailsUi.combinedPromotionText`, `site.productPricingDetailsUi.previousPriceAssistiveText` |
| os:productVariantSelectorUi | 3 | `site.productVariantSelectorUi.required`, `site.productVariantSelectorUi.productVariantSelectorPlaceholderText`, `site.productVariantSelectorUi.productVariantDefaultOutOfStockText` |
| os:productWishlist | 3 | `site.productWishlist.alternativeSpinnerText`, `site.productWishlist.addToCartError`, `site.productWishlist.removeError` |
| os:quoteConfirmationItems | 3 | `site.quoteConfirmationItems.StockKeepingUnit`, `site.quoteConfirmationItems.totalPrice`, `site.quoteConfirmationItems.productBundleDetailsModalHeaderTitle` |
| os:quoteSummaryUi | 3 | `site.quoteSummaryUi.detailsAssistiveText`, `site.quoteSummaryUi.keyValueSeparatorWithSpace`, `site.quoteSummaryUi.startReorderAssistiveText` |
| os:searchFiltersCategoryList | 3 | `site.searchFiltersCategoryList.categoriesHeader`, `site.searchFiltersCategoryList.backActionAssistiveText`, `site.searchFiltersCategoryList.searchResults` |
| col:productQuantitySelectorPopover | 2 | `c.Product_QuantitySelectorPopover_quantityHelp`, `c.Shared_closeButtonAssistiveText` |
| col:productVariantSelector | 2 | `c.Shared_required`, `c.Product_Variant_Selector_productVariantSelectorPlaceholderText` |
| col:searchCategoryTree | 2 | `c.Search_Facets_backActionAssistiveText`, `c.Search_Facets_categoryHeader` |
| col:searchFacet | 2 | `c.Search_Facets_toggleFilterExpandedAssistiveText`, `c.Search_Facets_toggleFilterCollapsedAssistiveText` |
| col:searchFiltersPanel | 2 | `c.Search_Facets_filtersHeader`, `c.Search_Facets_clearButton` |
| os:cartApplyCouponUi | 2 | `site.cartApplyCouponUi.applyCouponInputAriaLabel`, `site.cartApplyCouponUi.couponCodeInputPlaceHolderText` |
| os:cartItemsUi | 2 | `site.cartItems.skipToBottomLinkText`, `site.cartItems.skipToTopLinkText` |
| os:checkoutContactInfo | 2 | `site.checkoutContactInfo.emailMessageWhenPatternMismatch`, `site.checkoutContactInfo.reCaptchaDisclaimer` |
| os:checkoutMultiCountryPhoneField | 2 | `site.checkoutMultiCountryPhoneField.phonePrefixLabel`, `site.checkoutMultiCountryPhoneField.PhoneMessageWhenPatternMismatchLabel` |
| os:checkoutPaymentSheet | 2 | `site.checkoutPaymentSheet.requiredFieldError`, `site.checkoutPaymentSheet.duplicateUserError` |
| os:checkoutSummary | 2 | `site.checkoutSummary.expandableCartItemsTitle`, `site.checkoutSummary.expandableSummaryHeading` |
| os:commonDrilldownNavigationUi | 2 | `site.commonDrilldownNavigationUi.MobileTrigger`, `site.commonDrilldownNavigationUi.OpensInNewTab` |
| os:commonField | 2 | `site.commonField.yesAssistiveText`, `site.commonField.noAssistiveText` |
| os:commonQuantitySelectorPopover | 2 | `site.commonQuantitySelectorPopover.quantityHelp`, `site.commonQuantitySelectorPopover.closeButtonAssistiveText` |
| os:myAccountAddressCardUi | 2 | `site.myAccountAddressCardUi.addressLabel`, `site.myAccountAddressCardUi.phoneNumberLabel` |
| os:myAccountAddressFooter | 2 | `site.myAccountAddressFooter.editLabel`, `site.myAccountAddressFooter.deleteLabel` |
| os:myaccountNavigationMenuItems | 2 | `site.myaccountNavigationMenuItems.desktopNavMenuAriaLabel`, `site.myaccountNavigationMenuItems.mobileDropdownLabel` |
| os:myAccountSwitcherListRecord | 2 | `site.myAccountSwitcherListRecord.accountIconAltText`, `site.myAccountSwitcherListRecord.checkIconAltText` |
| os:myAccountUserProfileMenuUi | 2 | `site.myAccountUserProfileMenuUi.AlternativeText`, `site.myAccountUserProfileMenuUi.AlternativeTextWithCompany` |
| os:orderConfirmationItems | 2 | `site.orderConfirmationItems.StockKeepingUnit`, `site.orderConfirmationItems.productBundleDetailsModalHeaderTitle` |
| os:orderDeliveryGroup | 2 | `site.orderDeliveryGroup.Name`, `site.orderDeliveryGroup.TotalLineAmount` |
| os:orderLineitem | 2 | `site.orderLineitem.StockKeepingUnit`, `site.orderLineitem.Quantity` |
| os:orderList | 2 | `site.orderList.errorHeading`, `site.orderList.errorDescription` |
| os:orderQuickOrderDisplay | 2 | `site.orderQuickOrderDisplay.addEntryButtonAriaLabel`, `site.orderQuickOrderDisplay.addToCartButtonAriaLabel` |
| os:orderTotals | 2 | `site.orderTotals.spinnerText`, `site.orderTotals.noDataAvailableText` |
| os:paymentAddPaymentMethods | 2 | `site.paymentAddPaymentMethods.missingPaymentMethodSetKeyTitle`, `site.paymentAddPaymentMethods.missingPaymentMethodSetKeyDescription` |
| os:paymentSavedPaymentMethodsCard | 2 | `site.paymentSavedPaymentMethodsCard.cardTypeIconTitle`, `site.paymentSavedPaymentMethodsCard.cardExpiredDateLabel` |
| os:productBundleDetailsModal | 2 | `site.productBundleDetailsModal.bundleExpandCollapseLabelSingular`, `site.productBundleDetailsModal.bundleExpandCollapseLabelPlural` |
| os:productBundleItem | 2 | `site.productBundleItem.variantAttributeFieldWithCommaSeparator`, `site.productBundleItem.attributeNameWithColonSeparator` |
| os:productDynamicAttrAccordion | 2 | `site.productDynamicAttrAccordion.dynamicAttributeAccordionTitlePlural`, `site.productDynamicAttrAccordion.dynamicAttributeAccordionTitleSingular` |
| os:productSetItem | 2 | `site.productSetItem.addToCartButtonText`, `site.productSetItem.quantitySelectorText` |
| os:productSubscriptions | 2 | `site.productSubscriptions.errorHeading`, `site.productSubscriptions.errorDescription` |
| os:productVariantAttributesDisplay | 2 | `site.productVariantAttributesDisplay.nameValueWithSeparator`, `site.productVariantAttributesDisplay.attributeSeparator` |
| os:productWishlistUtil | 2 | `site.productWishlistUtil.addToWishlistSuccessToastMessage`, `site.productWishlistUtil.addToWishlistErrorToastMessage` |
| os:promotionTermsConditionsPopover | 2 | `site.promotionTermsConditionsPopover.termsAndConditionsInfoBubbleAltText`, `site.promotionTermsConditionsPopover.termsAndConditionsClosePopupAltText` |
| os:quoteAcceptandbuyButton | 2 | `site.quoteAcceptandbuyButton.buyButtonLabel`, `site.quoteAcceptandbuyButton.acceptAndBuyButtonLabel` |
| os:quoteDeclineRenegotiateModalUi | 2 | `site.quoteDeclineRenegotiateModalUi.declineOperationFailedMessage`, `site.quoteDeclineRenegotiateModalUi.renegotiateOperationFailedMessage` |
| os:quoteList | 2 | `site.quoteList.errorHeading`, `site.quoteList.errorDescription` |
| os:quoteNotesThreadUi | 2 | `site.quoteNotesThreadUi.title`, `site.quoteNotesThreadUi.emptyState` |
| os:quoteSummary | 2 | `site.quoteSummary.LastModified`, `site.quoteSummary.TotalPrice` |
| os:searchCombobox | 2 | `site.commonCombobox.search`, `site.commonCombobox.searchFor` |
| os:searchFiltersPanelSection | 2 | `site.searchFiltersPanelSection.toggleFilterExpandedAssistiveText`, `site.searchFiltersPanelSection.toggleFilterCollapsedAssistiveText` |
| os:searchPagingControl | 2 | `site.searchPagingControl.previous`, `site.searchPagingControl.next` |
| os:searchSortMenu | 2 | `site.searchSortMenu.sortAndFilter`, `site.searchSortMenu.sortAndFilterPanelAriaLabel` |
| os:searchSortMenuUi | 2 | `site.searchSortMenuUi.sort`, `site.searchSortMenuUi.sortByAltText` |
| col:builderSearchFilters | 1 | `c.Commerce_Search_Facets_modalLabel` |
| col:productPricing | 1 | `c.Product_Pricing_strikethroughAssistiveText` |
| col:searchFilters | 1 | `c.Search_Facets_filtersHeader` |
| col:searchProductGrid | 1 | `c.Search_Results_searchResults` |
| col:searchResults | 1 | `c.Search_ProductCard_variationAttribute` |
| os:cartContents | 1 | `site.cartContents.alternativeSpinnerText` |
| os:cartCreateButton | 1 | `site.cartCreateButton.newCartButton` |
| os:cartPromotionAppliedUi | 1 | `site.cartPromotionAppliedUi.popoverCloseAssistiveText` |
| os:cartSplitshipmentItemsUi | 1 | `site.cartSplitshipmentItemsUi.digitalGoodsScopedNotificationLabel` |
| os:checkoutAddresses | 1 | `site.checkoutAddresses.addressSingleLineBreak` |
| os:checkoutBillingInfo | 1 | `site.checkoutBillingInfo.a11yBillingAddressLabel` |
| os:checkoutDualPayment | 1 | `site.checkoutDualPayment.billingAddressText` |
| os:checkoutNotification | 1 | `site.checkoutNotification.alternativeSpinnerText` |
| os:checkoutPaymentSheetWithPO | 1 | `site.checkoutPaymentSheetWithPO.billingAddressText` |
| os:checkoutShippingInstructions | 1 | `site.checkoutShippingInstructions.deliveryInstructions` |
| os:commonBreadcrumbs | 1 | `site.commonBreadcrumbs.homelabel` |
| os:commonBreadcrumbsUi | 1 | `site.commonBreadcrumbsUi.component_name` |
| os:commonCountryPickerPanel | 1 | `site.commonCountryPickerPanel.closeButtonAssistiveText` |
| os:commonPanel | 1 | `site.commonPanel.closeButtonAriaLabel` |
| os:commonPill | 1 | `site.commonPill.removePillAssistiveText` |
| os:layoutHeaderOne | 1 | `site.layoutHeaderOne.ariaCloseButtonLabel` |
| os:legalConsentBlanket | 1 | `site.legalConsentBlanket.closeButtonAssistiveText` |
| os:legalTermsandconditionsModal | 1 | `site.legalTermsandconditionsModal.termsAndConditionsModalCloseButtonText` |
| os:orderAmountUi | 1 | `site.orderAmountUi.genericErrorMessage` |
| os:orderConfirmationMessageError | 1 | `site.orderConfirmationMessageError.defaultButtonLabel` |
| os:orderDeliveryGroupUi | 1 | `site.orderDeliveryGroupUi.keyValueSeparatorWithSpace` |
| os:orderDetailsUi | 1 | `site.orderDetailsUi.genericErrorMessage` |
| os:orderSummaryContentlayout | 1 | `site.orderSummaryContentlayout.spinnerAltText` |
| os:orderSummaryProductMedia | 1 | `site.orderSummaryProductMedia.lastTileText` |
| os:orderTotalsWithFields | 1 | `site.orderTotalsWithFields.fieldLabel` |
| os:productHeadingUi | 1 | `site.productHeadingUi.keyValueSeparator` |
| os:productPricingUi | 1 | `site.productPricingUi.strikethroughAssistiveText` |
| os:productSetUi | 1 | `site.productSetUi.addAllToCartButtonText` |
| os:productTitle | 1 | `site.productTitle.productNameWithUnavailableMessage` |
| os:productVariantPill | 1 | `site.productVariantPill.productVariantDefaultAssistiveOutOfStockText` |
| os:productVariantPillcontainer | 1 | `site.productVariantPillcontainer.keyValueSeparator` |
| os:productVariantSwatchcontainer | 1 | `site.productVariantSwatchcontainer.keyValueSeparator` |
| os:productVariantSwatchitem | 1 | `site.productVariantSwatchitem.productVariantDefaultAssistiveOutOfStockText` |
| os:productWishlistShortcutUi | 1 | `site.productWishlistShortcutUi.wishlistPageAssistiveText` |
| os:promotionNameDisplayEvaluator | 1 | `site.promotionNameDisplayEvaluator.couponCodeValueWithPromotionNameSeparator` |
| os:quoteConfirmationErrorMessage | 1 | `site.quoteConfirmationErrorMessage.defaultButtonLabel` |
| os:quoteDuplicateToCartButton | 1 | `site.quoteDuplicateToCartButton.duplicateToCartButtonLabel` |
| os:quoteRequestButtonProduct | 1 | `site.quoteRequestButtonProduct.quoteRequestError` |
| os:quoteSummaryContentLayout | 1 | `site.quoteSummaryContentLayout.spinnerAltText` |
| os:quoteSummaryProductMedia | 1 | `site.quoteSummaryProductMedia.lastTileText` |
| os:searchFiltersSelected | 1 | `site.searchFiltersSelected.appliedFiltersSectionTitle` |
| os:searchFiltersUi | 1 | `site.searchFiltersUi.filtersHeader` |
| os:searchProductGrid | 1 | `site.searchProductGrid.searchResults` |
| os:searchResultsGrid | 1 | `site.searchResultsGrid.loading` |
| os:searchResultsList | 1 | `site.searchResultsList.loading` |
| os:selfRegister | 1 | `site.selfRegister.genericError` |
| os:selfRegisterUi | 1 | `site.selfRegisterUi.passwordMismatchLabel` |
| os:subscriptionHistoryDetailsPanel | 1 | `site.subscriptionHistoryDetailsPanel.closeButtonAriaLabel` |

**Observations:**
- Every label module resolves to exactly one owning component file (LWC labels are always bundle-local
  imports) — the count of label modules per bundle is a reasonable proxy for that component's user-facing
  string surface. `cartOptions`, `checkoutGiftOptions`, `checkoutDeliverymethod(Options)`, and the
  `myAccount*` profile/verification components own the largest label counts.
- col ships label imports only for `search` family components (`Search_Facets_*`, `Search_ProductCard_*`)
  under the `c.*` label namespace rather than `site.*` — a different label namespace convention from os
  entirely (see Anomalies).

### Other

Bare `lwc` (the framework itself) plus every `site/*` (os-only internal shared-component API) and `c/*`
(col-only local component reference) import.

| module | os bundles | col bundles | families |
|---|---|---|---|
| `lwc` | 348 | 36 | account, cart, checkout, common, order, other, product, promotion, quote, search, subscription |
| `site/commonToast` | 29 | 0 | account, cart, checkout, common, order, other, product, quote, search, subscription |
| `site/checkoutInternationalization` | 15 | 0 | account, cart, checkout |
| `site/commonFormatterCurrency` | 13 | 0 | cart, checkout, common, order, product, promotion, search |
| `site/commonRichtextsanitizerUtils` | 11 | 0 | cart, checkout, common, product, search |
| `site/checkoutAddresses` | 6 | 0 | cart, checkout |
| `site/checkoutStencil` | 6 | 0 | checkout |
| `site/productAddToCartUtils` | 5 | 0 | cart, product |
| `site/checkoutErrorHandler` | 4 | 0 | checkout |
| `site/checkoutSection` | 4 | 0 | checkout |
| `site/checkoutData` | 3 | 0 | account, cart, checkout |
| `site/promotionEvaluatePriceDiscount` | 3 | 0 | cart, order |
| `site/cartEvaluatePriceOriginal` | 3 | 0 | cart, order |
| `site/subscriptionAmendModal` | 3 | 0 | subscription |
| `site/cartFailedActionEvaluator` | 2 | 0 | cart, order |
| `site/cartCreateModal` | 2 | 0 | cart |
| `site/cartItemDropdown` | 2 | 0 | cart, checkout |
| `site/checkoutPaymentByExpress` | 2 | 0 | cart, checkout |
| `site/checkoutAddressModal` | 2 | 0 | cart, checkout |
| `site/commonLoginHandler` | 2 | 0 | checkout |
| `site/checkoutEkg` | 2 | 0 | checkout |
| `site/checkoutDeliveryestimates` | 2 | 0 | checkout |
| `site/paymentAuthorizationError` | 2 | 0 | checkout |
| `site/reorderModal` | 2 | 0 | order |
| `site/productWishlistUtil` | 2 | 0 | product |
| `site/productVariantSelectorUi` | 2 | 0 | product |
| `site/quoteRequestModal` | 2 | 0 | quote |
| `site/commonQuantitySelector` | 2 | 0 | quote, subscription |
| `site/subscriptionCardV2` | 2 | 0 | subscription |
| `c/commonModal` | 0 | 2 | product, search |
| `site/buyerCurrencyFormatter` | 1 | 0 | common |
| `site/cartContents` | 1 | 0 | cart |
| `site/cartMinicartpanel` | 1 | 0 | cart |
| `site/cartAddToSecondaryCart` | 1 | 0 | cart |
| `site/commonConfig` | 1 | 0 | cart |
| `site/cartClearCartModal` | 1 | 0 | cart |
| `site/checkoutStencilUnified` | 1 | 0 | cart |
| `site/cartOptionsConfirmationModal` | 1 | 0 | cart |
| `site/legalTermsandconditionsModal` | 1 | 0 | cart |
| `site/checkoutNewshipmentModal` | 1 | 0 | cart |
| `site/checkoutEmptyshipmentModal` | 1 | 0 | cart |
| `site/commonModal` | 1 | 0 | cart |
| `site/cartItem` | 1 | 0 | cart |
| `site/checkoutLayoutAccordion` | 1 | 0 | checkout |
| `site/checkoutLayoutOnepage` | 1 | 0 | checkout |
| `site/commonCountryPickerConfirmationModal` | 1 | 0 | common |
| `site/commonPasswordlessLoginModal` | 1 | 0 | common |
| `site/commonNumberInput` | 1 | 0 | common |
| `site/myAccountAddressDeleteConfirmationModal` | 1 | 0 | account |
| `site/myAccountUserProfileMenuUi` | 1 | 0 | account |
| `site/myAccountSwitcherModal` | 1 | 0 | account |
| `site/productBundleDetailsModal` | 1 | 0 | order |
| `site/orderDeliveryGroupContainer` | 1 | 0 | order |
| `site/promotionNameDisplayEvaluator` | 1 | 0 | order |
| `site/paymentSavedMethodsActionModal` | 1 | 0 | checkout |
| `site/productSubscriptionSelector` | 1 | 0 | product |
| `site/commerceErrors` | 1 | 0 | product |
| `site/productPricingDetails` | 1 | 0 | product |
| `site/quoteTocartModal` | 1 | 0 | quote |
| `site/quoteDeclineRenegotiateModalUi` | 1 | 0 | quote |
| `site/quoteCartModalUi` | 1 | 0 | quote |
| `site/subscriptionCancelModal` | 1 | 0 | subscription |
| `site/subscriptionRenewModal` | 1 | 0 | subscription |
| `site/subscriptionPaymentMethodModal` | 1 | 0 | subscription |
| `site/subscriptionHistoryPanel` | 1 | 0 | subscription |
| `c/productVariantSelector` | 0 | 1 | product |
| `c/searchFiltersModal` | 0 | 1 | search |
| `c/commonNumberInput` | 0 | 1 | product |
| `c/productGalleryUtils` | 0 | 1 | search |

**Observations:**
- `lwc` (348 os / 36 col) is imported by nearly every bundle in both repos — the ~24 os bundles and 1 col
  bundle without it are pure-config or label-only bundles with no `.js` controller logic worth a base
  import beyond what the census counted.
- `site/commonToast` (29 os / 0 col) is os's de-facto toast/notification wrapper, used instead of the raw
  `lightning/platformShowToastEvent`/`lightning/toast` base modules almost everywhere.
- `site/*` is a substantial internal shared-component/utility layer unique to os (currency formatting,
  internationalization, checkout stencils, modals) — col has no equivalent internal layer and instead
  reuses its own bundles directly via `c/*` (`c/commonModal`, `c/commonNumberInput`,
  `c/productVariantSelector`, `c/productGalleryUtils`, `c/searchFiltersModal`).

## Wire adapters

| adapter | module | uses | sample components |
|---|---|---|---|
| `NavigationContext` | `lightning/navigation` | 70 | os:cartAddToSecondaryCart, os:cartBadgeUi, os:cartCreateButton, os:cartItem, os:cartItems |
| `AppContextAdapter` | `commerce/contextApi` | 42 | os:cartBadge, os:cartBadgeUi, os:cartMinicartpanel, os:cartSplitshipmentContents, os:cartSummary |
| `SessionContextAdapter` | `commerce/contextApi` | 39 | os:cartAddToSecondaryCart, os:cartBadge, os:cartCreateButton, os:cartMinicartpanel, os:cartSplitshipmentContents |
| `CurrentPageReference` | `lightning/navigation` | 19 | os:cartMinicartpanel, os:checkoutPlaceOrder, os:commonCountryPicker, os:legalConsentBlanket, os:myAccountInputAddress |
| `getI18nCountries` | `experience/internationalizationApi` | 13 | os:cartSplitshipmentContents, os:checkoutBillingInfo, os:checkoutContactInfo, os:checkoutDeliveryAddress, os:checkoutDeliverymethod |
| `CartStatusAdapter` | `commerce/checkoutCartApi` | 8 | os:cartBadgeUi, os:cartContents, os:cartMinicartpanel, os:cartSummary, os:checkoutButton |
| `CartContentsAdapter` | `commerce/checkoutCartApi` | 5 | os:cartMinicartpanel, os:cartSummary, os:checkoutButton, os:checkoutContactInfo, os:quoteRequestButton |
| `getFormFactor` | `experience/clientApi` | 5 | os:cartSplitshipmentContents, os:checkoutDeliveryAddress, os:layoutHeader, os:layoutHeaderOne, col:searchFilters |
| `ProductSearchAdapter` | `commerce/productApi` | 3 | os:orderQuickOrderItem, os:topSellers, col:searchFiltersModalPanel |
| `CartStatusAdapter` | `commerce/cartApi` | 3 | os:searchProductCard, col:builderProductPurchaseOptions, col:searchProductCard |
| `CartAdapter` | `commerce/checkoutCartApi` | 2 | os:cartBadge, os:commonCountryPicker |
| `WishlistsAdapter` | `commerce/wishlistApi` | 2 | os:cartMinicartpanel, os:productCard |
| `getNavigationMenu` | `experience/navigationMenuApi` | 2 | os:commonDrilldownNavigation, os:myaccountNavigationMenuItems |
| `MyAccountProfileAdapter` | `commerce/myAccountApi` | 2 | os:paymentAddPaymentMethods, os:paymentSavedMethodsGrid |
| `MyAccountAddressesAdapter` | `commerce/myAccountApi` | 2 | os:paymentAddPaymentMethods, os:paymentSavedMethodsGrid |
| `getPaymentMethodSet` | `experience/paymentApi` | 2 | os:paymentAddPaymentMethods, os:paymentSavedMethodsGrid |
| `ProductAdapter` | `commerce/productApi` | 2 | os:productFrequentlyBoughtTogether, os:productVariantSelector |
| `ProductPricingAdapter` | `commerce/productApi` | 2 | os:productFrequentlyBoughtTogether, os:productSetItemContainer |
| `ProductInventoryLevelsAdapter` | `commerce/productApi` | 2 | os:productFrequentlyBoughtTogether, os:productSet |
| `ProductSearchSuggestionAdapter` | `commerce/productApi` | 2 | os:searchInput, os:searchInputContainer |
| `CheckoutDeliveryGroupCartItemsAdapter` | `commerce/cartApi` | 1 | os:checkoutDeliverymethodGroup |
| `BreadcrumbsAdapter` | `commerce/breadcrumbsApi` | 1 | os:commonBreadcrumbs |
| `getRecord` | `lightning/uiRecordApi` | 1 | os:commonRecordFieldValue |
| `MyAccountAddressDetailAdapter` | `commerce/myAccountApi` | 1 | os:myAccountInputAddress |
| `ManagedAccountsAdapter` | `commerce/effectiveAccountApi` | 1 | os:myAccountSwitcherList |
| `CheckoutAdapter` | `commerce/checkoutCartApi` | 1 | os:paymentByExpress |
| `getSavedPaymentMethodDependents` | `experience/paymentApi` | 1 | os:paymentSavedMethodsGrid |
| `getSavedPaymentMethods` | `experience/paymentApi` | 1 | os:paymentSavedMethodsGrid |
| `ProductRecommendationsAdapter` | `commerce/productApi` | 1 | os:productFrequentlyBoughtTogether |
| `PromotionApplicableAdapter` | `commerce/promotionApi` | 1 | os:productFrequentlyBoughtTogether |
| `ProductChildrenAdapter` | `commerce/productApi` | 1 | os:productSet |
| `ProductTaxAdapter` | `commerce/productApi` | 1 | os:productSetItemContainer |
| `ChildSubscriptionsAdapter` | `commerce/subscriptionApi` | 1 | os:subscriptionCardBuilder |
| `SubscriptionActionHistoryAdapter` | `commerce/subscriptionApi` | 1 | os:subscriptionHistoryPanel |
| `ProductPricingCollectionAdapter` | `commerce/productApi` | 1 | os:topSellers |
| `ProductCategoryPathAdapter` | `commerce/productApi` | 1 | col:searchFiltersModalPanel |

**Observations:**
- `NavigationContext` (70), `AppContextAdapter` (42), and `SessionContextAdapter` (39) dominate — nearly
  every component that needs navigation or app/session context reaches for these three.
- Every `commerce/productApi` adapter (`ProductAdapter`, `ProductPricingAdapter`,
  `ProductInventoryLevelsAdapter`, `ProductSearchSuggestionAdapter`, `ProductRecommendationsAdapter`,
  `ProductChildrenAdapter`, `ProductTaxAdapter`, `ProductPricingCollectionAdapter`,
  `ProductCategoryPathAdapter`, `ProductSearchAdapter`) is used by 1–3 bundles — product data wiring is
  spread thin across many narrow adapters rather than concentrated in a couple of general-purpose ones.
- col reuses two os wire adapters directly — `CartStatusAdapter` (`commerce/cartApi`, shared with
  `os:searchProductCard`) and `ProductSearchAdapter`/`ProductCategoryPathAdapter` — confirming `col`
  builds on the same `commerce/*` LDS-style adapter surface as `os`, just a narrower slice of it.

## Expression bindings (js-meta.xml property defaults starting with `{!`)

| expression root | count | sample property (component) |
|---|---|---|
| `{!Product…}` | 45 | `{!Product.Details}` → product (os:productAttachments) |
| `{!Search…}` | 32 | `{!Search.Name}` → searchResultsFields (os:productCard) |
| `{!Checkout…}` | 31 | `{!Checkout.Details}` → checkoutDetails (os:checkoutBillingInfo) |
| `{!QuoteDetail…}` | 18 | `{!QuoteDetail.id}` → quoteId (os:quoteAcceptandbuyButton) |
| `{!Order…}` | 14 | `{!Order.Details}` → orderSummaryDetails (os:orderAmount) |
| `{!Cart…}` | 11 | `{!Cart.Items}` → items (os:cartB2bCartContents) |
| `{!SplitShipment…}` | 5 | `{!SplitShipment.Cart.items}` → products (os:cartSplitshipmentContents) |
| `{!Item…}` | 5 | `{!Item.data}` → item (os:productBundleItem) |
| `{!Promotion…}` | 4 | `{!Promotion.name}` → name (os:cartPromotionApplied) |
| `{!DeliveryGroup…}` | 4 | `{!DeliveryGroup}` → deliveryGroup (os:orderConfirmationDeliverygroup) |
| `{!Markets…}` | 3 | `{!Markets.Items}` → markets (os:commonCountryPicker) |
| `{!NavMenu…}` | 3 | `{!NavMenu.MenuItems}` → navigationMenuData (os:commonLinksList) |
| `{!Marketing…}` | 3 | `{!Marketing.Subscriptions.communications}` → subscriptions (os:marketingEmailsignup) |
| `{!MyProfile…}` | 3 | `{!MyProfile.Details}` → profile (os:myAccountProfile) |
| `{!Route…}` | 3 | `{!Route.recordId}` → productId (os:productFrequentlyBoughtTogether) |
| `{!I18n…}` | 2 | `{!I18n.Countries}` → rawInternationalizationData (os:myAccountAddressCard) |
| `{!ShopperAgentContext…}` | 1 | `{!ShopperAgentContext.Details}` → shopperAgentContextData (os:commonSidePanelManager) |
| `{!MyAccountAddress…}` | 1 | `{!MyAccountAddress}` → item (os:myAccountAddressCard) |
| `{!BillingDetails…}` | 1 | `{!BillingDetails}` → billingDetails (os:orderConfirmationDetailsBilling) |
| `{!OrderDeliveryGroup…}` | 1 | `{!OrderDeliveryGroup}` → orderDeliveryGroup (os:orderDeliveryGroup) |
| `{!OrderLineItem…}` | 1 | `{!OrderLineItem}` → orderItem (os:orderLineitem) |
| `{!OrderSummary…}` | 1 | `{!OrderSummary}` → order (os:orderSummary) |
| `{!Wishlists…}` | 1 | `{!Wishlists}` → wishlistsData (os:productWishlist) |
| `{!QuoteSummary…}` | 1 | `{!QuoteSummary}` → quote (os:quoteSummary) |
| `{!recordId…}` | 1 | `{!recordId}` → orderSummaryId (os:reorderButton) |
| `{!Subscription…}` | 1 | `{!Subscription}` → item (os:subscriptionCardBuilder) |

**Observations:**
- `{!Product…}` (45), `{!Search…}` (32), and `{!Checkout…}` (31) are the three dominant expression roots —
  product detail, search result, and checkout context data are overwhelmingly delivered to builder
  components via CMS/Experience Builder expression binding rather than `@wire`.
- All 196 expression-bound properties are os-only — col has zero `{!` expression defaults in its
  js-meta.xml files, consistent with col shipping builder-facing product/search components that take
  configuration properties (labels, target flags) rather than CMS page-context data.
- `{!recordId…}` (1, `os:reorderButton`) is the only expression root that is not a commerce-domain object
  path — it reads the standard record-page context variable directly.

### All expression-bound properties

- os:cartB2bCartContents — `items` = `{!Cart.Items}` (string)
- os:cartB2bCartContents — `messages` = `{!Cart.Messages}` (string)
- os:cartItems — `items` = `{!Cart.Items}` (String)
- os:cartItems — `pagination` = `{!Cart.Pagination}` (String)
- os:cartItems — `hasNextPageItems` = `{!Cart.Pagination.hasNextPage}` (String)
- os:cartItems — `currencyIsoCode` = `{!Cart.Details.currencyIsoCode}` (String)
- os:cartPromotionApplied — `name` = `{!Promotion.name}` (String)
- os:cartPromotionApplied — `couponId` = `{!Promotion.couponId}` (String)
- os:cartPromotionApplied — `termsAndConditions` = `{!Promotion.termsAndConditions}` (String)
- os:cartPromotionApplied — `couponCode` = `{!Promotion.couponCode}` (String)
- os:cartPromotions — `cartDetails` = `{!Cart.Details}` (String)
- os:cartPromotions — `cartPromotions` = `{!Cart.Promotions}` (String)
- os:cartSplitshipmentContents — `products` = `{!SplitShipment.Cart.items}` (string)
- os:cartSplitshipmentContents — `deliveryGroupCartProps` = `{!SplitShipment.DeliveryGroupCartProps}` (string)
- os:cartSplitshipmentContents — `splitShipPagination` = `{!SplitShipment.Cart.pagination}` (String)
- os:cartSplitshipmentContents — `deliveryGroups` = `{!SplitShipment.DeliveryGroups.items}` (string)
- os:cartSplitshipmentContents — `addresses` = `{!SplitShipment.Addresses.items}` (string)
- os:checkoutBillingInfo — `checkoutDetails` = `{!Checkout.Details}` (String)
- os:checkoutContactInfo — `checkoutDetails` = `{!Checkout.Details}` (String)
- os:checkoutDeliveryAddress — `checkoutAddresses` = `{!Checkout.Addresses}` (String)
- os:checkoutDeliveryAddress — `checkoutDetails` = `{!Checkout.Details}` (String)
- os:checkoutDeliveryAddress — `cartDetails` = `{!Checkout.CartDetails}` (String)
- os:checkoutDeliverymethod — `checkoutDetails` = `{!Checkout.Details}` (String)
- os:checkoutDualPayment — `checkoutDetails` = `{!Checkout.Details}` (String)
- os:checkoutGiftOptions — `items` = `{!Cart.Items}` (String)
- os:checkoutGiftOptions — `checkoutDetails` = `{!Checkout.Details}` (String)
- os:checkoutGiftOptions — `giftWraps` = `{!Checkout.GiftWraps}` (String)
- os:checkoutHeading — `cartDetails` = `{!Checkout.CartDetails}` (String)
- os:checkoutHeading — `cartTotals` = `{!Checkout.CartTotals}` (String)
- os:checkoutNotification — `checkoutDetails` = `{!Checkout.Details}` (String)
- os:checkoutNotification — `checkoutSessionError` = `{!Checkout.SessionError}` (String)
- os:checkoutNotification — `checkoutPaymentLink` = `{!Checkout.PaymentLink}` (String)
- os:checkoutPayment — `checkoutDetails` = `{!Checkout.Details}` (String)
- os:checkoutPaymentSheet — `checkoutDetails` = `{!Checkout.Details}` (String)
- os:checkoutPaymentSheet — `cartDetails` = `{!Checkout.CartDetails}` (String)
- os:checkoutPaymentSheet — `cartTotals` = `{!Checkout.CartTotals}` (String)
- os:checkoutPaymentSheetWithPO — `checkoutDetails` = `{!Checkout.Details}` (String)
- os:checkoutPaymentSheetWithPO — `cartDetails` = `{!Checkout.CartDetails}` (String)
- os:checkoutPaymentSheetWithPO — `cartTotals` = `{!Checkout.CartTotals}` (String)
- os:checkoutPlaceOrder — `checkoutDetails` = `{!Checkout.Details}` (String)
- os:checkoutPurchaseOrder — `checkoutDetails` = `{!Checkout.Details}` (String)
- os:checkoutShippingAddressEditButton — `checkoutDetails` = `{!Checkout.Details}` (String)
- os:checkoutShippingInstructions — `checkoutDetails` = `{!Checkout.Details}` (String)
- os:checkoutSubscriptionPolicyDisclaimer — `cartDetails` = `{!Checkout.CartDetails}` (String)
- os:checkoutSummary — `cartDetails` = `{!Checkout.CartDetails}` (String)
- os:checkoutSummary — `checkoutDetails` = `{!Checkout.Details}` (String)
- os:commonCountryPicker — `markets` = `{!Markets.Items}` (String)
- os:commonCountryPicker — `languages` = `{!Markets.Languages}` (String)
- os:commonCountryPicker — `countries` = `{!Markets.Countries}` (String)
- os:commonLinksList — `navigationMenuData` = `{!NavMenu.MenuItems}` (String)
- os:commonLinksSocial — `navigationMenuData` = `{!NavMenu.MenuItems}` (String)
- os:commonSidePanelManager — `shopperAgentContextData` = `{!ShopperAgentContext.Details}` (String)
- os:marketingEmailsignup — `subscriptions` = `{!Marketing.Subscriptions.communications}` (String)
- os:myAccountAddressCard — `rawInternationalizationData` = `{!I18n.Countries}` (String)
- os:myAccountAddressCard — `item` = `{!MyAccountAddress}` (String)
- os:myaccountMarketingconsentSettings — `consentData` = `{!Marketing.Subscriptions}` (String)
- os:myAccountProfile — `profile` = `{!MyProfile.Details}` (String)
- os:myAccountProfile — `clientState` = `{!MyProfile.ClientState}` (String)
- os:myAccountProfile — `errors` = `{!MyProfile.errors}` (String)
- os:myAccountUserProfileMenu — `navigationMenuData` = `{!NavMenu.MenuItems}` (String)
- os:orderAmount — `orderSummaryDetails` = `{!Order.Details}` (String)
- os:orderAmount — `orderDiscounts` = `{!Order.Adjustments}` (String)
- os:orderConfirmationDeliverygroup — `deliveryGroup` = `{!DeliveryGroup}` (String)
- os:orderConfirmationDeliverygroup — `ownerInfo` = `{!Order.Owner}` (String)
- os:orderConfirmationDetailsBilling — `billingDetails` = `{!BillingDetails}` (String)
- os:orderConfirmationDetailsBilling — `ownerInfo` = `{!Order.Owner}` (String)
- os:orderConfirmationItems — `items` = `{!DeliveryGroup.lineItems}` (String)
- os:orderConfirmationItems — `currencyIsoCode` = `{!DeliveryGroup.currencyIsoCode}` (String)
- os:orderConfirmationItems — `deliveryGroupId` = `{!DeliveryGroup.id}` (String)
- os:orderConfirmationLayoutContent — `clientState` = `{!Order.ClientState}` (String)
- os:orderConfirmationTotalsSummary — `summary` = `{!Order.Details}` (String)
- os:orderDeliveryGroup — `orderDeliveryGroup` = `{!OrderDeliveryGroup}` (String)
- os:orderDetails — `orderSummaryDetails` = `{!Order.Details}` (String)
- os:orderLineitem — `orderItem` = `{!OrderLineItem}` (String)
- os:orderProducts — `orderDeliveryGroups` = `{!Order.DeliveryGroups}` (String)
- os:orderPromotions — `appliedPromotions` = `{!Order.Adjustments}` (String)
- os:orderPromotionsApplied — `orderPromotionDetails` = `{!Order.Adjustments}` (String)
- os:orderShipmentTracker — `orderStatus` = `{!Order.Details.status}` (String)
- os:orderSummary — `order` = `{!OrderSummary}` (String)
- os:orderSummaryContentlayout — `orderSummaryDetails` = `{!Order.Details}` (String)
- os:orderSummaryContentlayout — `clientState` = `{!Order.ClientState}` (String)
- os:orderSummaryContentlayout — `errors` = `{!Order.Errors}` (String)
- os:productAttachments — `product` = `{!Product.Details}` (String)
- os:productBundleItem — `item` = `{!Item.data}` (String)
- os:productCard — `item` = `{!Item}` (String)
- os:productCard — `quantityMinimum` = `{!Item.purchaseQuantityRule.minimum}` (String)
- os:productCard — `quantityMaximum` = `{!Item.purchaseQuantityRule.maximum}` (String)
- os:productCard — `quantityStep` = `{!Item.purchaseQuantityRule.increment}` (String)
- os:productCard — `searchResultsFields` = `{!Search.Name}` (String)
- os:productFieldsTable — `product` = `{!Product.Details}` (String)
- os:productFrequentlyBoughtTogether — `productId` = `{!Route.recordId}` (String)
- os:productHeading — `product` = `{!Product.Details}` (String)
- os:productMediaGallery — `productMediaGroups` = `{!Product.Details.mediaGroups}` (String)
- os:productPricing — `product` = `{!Product.Details}` (String)
- os:productPricing — `productPricing` = `{!Product.Pricing}` (String)
- os:productPricing — `productTax` = `{!Product.Tax}` (String)
- os:productPricing — `productVariant` = `{!Product.SelectedVariant}` (String)
- os:productPricingDetails — `product` = `{!Product.Details}` (String)
- os:productPricingDetails — `productPricing` = `{!Product.Pricing}` (String)
- os:productPricingDetails — `productTax` = `{!Product.Tax}` (String)
- os:productPricingDetails — `productVariant` = `{!Product.SelectedVariant}` (String)
- os:productPricingDetails — `promotionalPricing` = `{!Product.PromotionalPricing}` (String)
- os:productPricingDetails — `selectedProductSellingModel` = `{!Product.SelectedProductSellingModel}` (String)
- os:productPricingTiers — `productPricing` = `{!Product.Pricing}` (String)
- os:productPricingTiers — `product` = `{!Product.Details}` (String)
- os:productPricingTiers — `productVariant` = `{!Product.SelectedVariant}` (String)
- os:productPurchaseOptions — `product` = `{!Product.Details}` (String)
- os:productPurchaseOptions — `productVariant` = `{!Product.SelectedVariant}` (String)
- os:productPurchaseOptions — `productInventory` = `{!Product.Inventory}` (String)
- os:productPurchaseOptions — `selectedProductSellingModel` = `{!Product.SelectedProductSellingModel}` (String)
- os:productPurchaseOptions — `productPricing` = `{!Product.Pricing}` (String)
- os:productPurchaseOptions — `errors` = `{!Product.errors}` (String)
- os:productSellingmodelSelector — `productPricing` = `{!Product.Pricing}` (String)
- os:productSellingmodelSelector — `product` = `{!Product.Details}` (String)
- os:productSellingmodelSelector — `selectedProductSellingModel` = `{!Product.SelectedProductSellingModel}` (String)
- os:productSellingmodelSelector — `productVariant` = `{!Product.SelectedVariant}` (String)
- os:productSet — `productId` = `{!Route.recordId}` (String)
- os:productSet — `product` = `{!Product.Details}` (String)
- os:productSet — `currencyIsoCode` = `{!Product.Pricing.currencyIsoCode}` (String)
- os:productVariantSelector — `product` = `{!Product.Details}` (String)
- os:productWishlist — `wishlistsData` = `{!Wishlists}` (string)
- os:productWishlistButtonAdd — `product` = `{!Product.Details}` (String)
- os:promotionDiscountsApproaching — `discountsApproaching` = `{!Cart.DiscountsApproaching}` (String)
- os:quoteAcceptandbuyButton — `quoteId` = `{!QuoteDetail.id}` (String)
- os:quoteAcceptandbuyButton — `quoteStatus` = `{!QuoteDetail.status}` (String)
- os:quoteAcceptandbuyButton — `orderId` = `{!QuoteDetail.orderId}` (String)
- os:quoteAcceptandbuyButton — `hasLineItems` = `{!QuoteDetail.hasLineItems}` (String)
- os:quoteConfirmationItems — `items` = `{!QuoteDetail.LineItems}` (String)
- os:quoteConfirmationItems — `currencyIsoCode` = `{!QuoteDetail.fields.CurrencyIsoCode.text}` (String)
- os:quoteConfirmationItems — `totalPrice` = `{!QuoteDetail.fields.TotalPrice.text}` (String)
- os:quoteConfirmationLayoutContent — `clientState` = `{!QuoteDetail.ClientState}` (String)
- os:quoteDeclineRenegotiateButton — `quoteId` = `{!QuoteDetail.id}` (String)
- os:quoteDeclineRenegotiateButton — `quoteStatus` = `{!QuoteDetail.status}` (String)
- os:quoteDuplicateToCartButton — `quoteId` = `{!QuoteDetail.id}` (String)
- os:quoteDuplicateToCartButton — `quoteStatus` = `{!QuoteDetail.status}` (String)
- os:quoteDuplicateToCartButton — `orderId` = `{!QuoteDetail.orderId}` (String)
- os:quoteDuplicateToCartButton — `hasLineItems` = `{!QuoteDetail.hasLineItems}` (String)
- os:quoteNotesThread — `notesData` = `{!QuoteDetail.Notes}` (String)
- os:quoteRequestButton — `cartId` = `{!Cart.Details.cartId}` (String)
- os:quoteRequestButtonProduct — `product` = `{!Product.Details}` (String)
- os:quoteRequestButtonProduct — `productInventory` = `{!Product.Inventory}` (String)
- os:quoteStatusTracker — `quoteStatus` = `{!QuoteDetail.status}` (String)
- os:quoteSummary — `quote` = `{!QuoteSummary}` (String)
- os:quoteSummaryContentLayout — `quoteSummaryDetails` = `{!QuoteDetail}` (String)
- os:quoteSummaryContentLayout — `clientState` = `{!QuoteDetail.ClientState}` (String)
- os:reorderButton — `orderSummaryId` = `{!recordId}` (String)
- os:searchFilters — `searchResults` = `{!Search.Results}` (String)
- os:searchFilters — `searchTerm` = `{!Route.term}` (String)
- os:searchFilters — `showFilters` = `{!Search.ClientState.showFilters}` (String)
- os:searchFilters — `sortRules` = `{!Search.SortRules.rules}` (String)
- os:searchFilters — `sortRuleId` = `{!Search.SortRules.currentSortRuleId}` (String)
- os:searchResults — `searchResults` = `{!Search.Results}` (String)
- os:searchResults — `searchResultsFields` = `{!Search.Name}` (String)
- os:searchResults — `searchResultsLoading` = `{!Search.ClientState.loading}` (String)
- os:searchResults — `currentPage` = `{!Search.Pagination.currentPage}` (String)
- os:searchResultsGrid — `searchResults` = `{!Search.Results}` (String)
- os:searchResultsGrid — `total` = `{!Search.Results.total}` (String)
- os:searchResultsGrid — `pageSize` = `{!Search.Results.pageSize}` (String)
- os:searchResultsGrid — `currentPage` = `{!Search.Pagination.currentPage}` (String)
- os:searchResultsGrid — `searchResultsLoading` = `{!Search.ClientState.loading}` (String)
- os:searchResultsLayoutEmpty — `searchResultsTotal` = `{!Search.Results.productLoadedCount}` (String)
- os:searchResultsLayoutEmpty — `searchResultsLoading` = `{!Search.ClientState.loading}` (String)
- os:searchResultsList — `searchResults` = `{!Search.Results}` (String)
- os:searchResultsList — `total` = `{!Search.Results.total}` (String)
- os:searchResultsList — `pageSize` = `{!Search.Results.pageSize}` (String)
- os:searchResultsList — `currentPage` = `{!Search.Pagination.currentPage}` (String)
- os:searchResultsList — `searchResultsLoading` = `{!Search.ClientState.loading}` (String)
- os:searchSortMenu — `sortRules` = `{!Search.SortRules.rules}` (String)
- os:searchSortMenu — `sortRuleId` = `{!Search.SortRules.currentSortRuleId}` (String)
- os:selfRegister — `rawInternationalizationData` = `{!I18n.Countries}` (String)
- os:selfRegister — `consentData` = `{!Marketing.Subscriptions}` (String)
- os:splitShipmentLayout — `checkoutDetails` = `{!Checkout.Details}` (String)
- os:splitShipmentLayout — `cartDetails` = `{!Checkout.CartDetails}` (String)
- os:splitShipmentLayout — `cartTotals` = `{!Checkout.CartTotals}` (String)
- os:subscriptionCardBuilder — `item` = `{!Subscription}` (String)
- col:builderProductAttachments — `product` = `{!Product.Details}` (String)
- col:builderProductPricing — `product` = `{!Product.Details}` (String)
- col:builderProductPricing — `productPricing` = `{!Product.Pricing}` (String)
- col:builderProductPricing — `productTax` = `{!Product.Tax}` (String)
- col:builderProductPricing — `productVariant` = `{!Product.SelectedVariant}` (String)
- col:builderProductPricingTiers — `productPricing` = `{!Product.Pricing}` (String)
- col:builderProductPricingTiers — `product` = `{!Product.Details}` (String)
- col:builderProductPricingTiers — `productVariant` = `{!Product.SelectedVariant}` (String)
- col:builderProductPurchaseOptions — `product` = `{!Product.Details}` (String)
- col:builderProductPurchaseOptions — `productVariant` = `{!Product.SelectedVariant}` (String)
- col:builderProductPurchaseOptions — `productInventory` = `{!Product.Inventory}` (String)
- col:builderProductVariantSelector — `product` = `{!Product.Details}` (String)
- col:builderSearchFilters — `searchResults` = `{!Search.Results}` (String)
- col:builderSearchPagingControl — `currentPageNumber` = `{!Search.Pagination.currentPage}` (String)
- col:builderSearchPagingControl — `pageSize` = `{!Search.Results.pageSize}` (String)
- col:builderSearchPagingControl — `totalItemCount` = `{!Search.Results.total}` (String)
- col:builderSearchResults — `searchResults` = `{!Search.Results}` (String)
- col:builderSearchResults — `searchResultsFields` = `{!Search.Name}` (String)
- col:builderSearchResults — `currentPage` = `{!Search.Pagination.currentPage}` (String)
- col:builderSearchSortMenu — `sortRules` = `{!Search.SortRules.rules}` (String)
- col:builderSearchSortMenu — `sortRuleId` = `{!Search.SortRules.currentSortRuleId}` (String)

## Apex imports (@salesforce/apex*)

**NONE — zero `@salesforce/apex*` imports across both repos.**

**Observation:**
- Confirmed independently with `rg -l "@salesforce/apex" OS_ROOT COL_ROOT` (0 matches) — every data need in
  both repos, including reads that read like they would want a custom Apex controller, goes through the
  `commerce/*` / `experience/*` module surface (wire adapters or imperative calls) or CMS expression
  binding. This is a hard architectural rule worth teaching as a generation constraint.

## Structure per family

| repo | family | bundles | Ui pairs | label bundles | with tests |
|---|---|---|---|---|---|
| os | account | 17 | 4 | 14 | 0 |
| os | cart | 36 | 6 | 23 | 0 |
| os | checkout | 68 | 4 | 33 | 0 |
| os | common | 62 | 8 | 19 | 0 |
| os | order | 45 | 9 | 23 | 0 |
| os | other | 5 | 0 | 2 | 0 |
| os | product | 58 | 14 | 28 | 0 |
| os | promotion | 8 | 1 | 2 | 0 |
| os | quote | 26 | 5 | 16 | 0 |
| os | search | 33 | 4 | 19 | 0 |
| os | subscription | 14 | 0 | 11 | 0 |
| col | common | 4 | 0 | 0 | 0 |
| col | product | 14 | 0 | 0 | 0 |
| col | search | 19 | 0 | 0 | 0 |

**Observations:**
- **`with tests` is 0 for every row in both repos.** Verified independently — no `__tests__` directory and
  no `*.test.js` file exists anywhere under either repo's LWC root. Neither open-source repo ships Jest
  specs; this is a real property of the source, not a census bug (see Open questions).
- `*Ui` container/presentation pairing is heaviest in os `product` (14), `order` (9), `common` (8), and
  `cart` (6) — col has zero `*Ui`-paired bundles, consistent with col's components being flatter/simpler
  (no separate os-style container-vs-presentation split observed in this census).
- Label-bundle pairing (os only, by definition) is heaviest in `checkout` (33 of 68) and `product` (28 of
  58) — the two largest families also carry the most bundle-local label sets, consistent with the
  `@salesforce/label/*` counts above.

## Anomalies

### Rare modules (imported by ≤2 bundles) — 1065 total, split by kind

991 of these are `@salesforce/label/*` imports — expected and non-anomalous (each label
is bundle-scoped by construction, so nearly every label module is "rare" under this metric; see the
grouped label table above rather than repeating all of them here).

The remaining **74 non-label rare modules** are the actually interesting signal —
single- or double-purpose internal APIs, one-off adapters, and col's local `c/*` references:

- `@salesforce/client/formFactor` ← os:orderQuickOrder
- `@salesforce/i18n/lang` ← os:commonCountryPicker
- `@salesforce/i18n/number.decimalSeparator` ← os:commonNumberInput, col:commonNumberInput
- `@salesforce/i18n/number.groupingSeparator` ← os:commonNumberInput, col:commonNumberInput
- `@salesforce/site/activeLanguages` ← os:commonCountryPicker
- `c/commonModal` ← col:builderProductPurchaseOptions, col:builderSearchResults
- `c/commonNumberInput` ← col:productQuantitySelector
- `c/productGalleryUtils` ← col:searchProductCard
- `c/productVariantSelector` ← col:builderProductVariantSelector
- `c/searchFiltersModal` ← col:builderSearchFilters
- `commerce/activitiesApi` ← os:searchInputContainer, os:searchResults
- `commerce/breadcrumbsApi` ← os:commonBreadcrumbs
- `commerce/consentApi` ← os:legalConsentBlanket
- `commerce/loginApi` ← os:commonLoginHandler, os:myAccountProfile
- `commerce/orderApi` ← os:orderLookup, os:reorderModal
- `commerce/promotionApi` ← os:cartMinicartpanel, os:productFrequentlyBoughtTogether
- `commerce/selfRegistrationApi` ← os:selfRegister
- `commerce/wishlistApi` ← os:cartMinicartpanel, os:productCard
- `experience/iconUtils` ← os:commonError, os:productWishlistShortcutUi
- `experience/navigationMenuApi` ← os:commonDrilldownNavigation, os:myaccountNavigationMenuItems
- `experience/paymentApi` ← os:paymentAddPaymentMethods, os:paymentSavedMethodsGrid
- `lightning/platformShowToastEvent` ← col:builderProductPurchaseOptions
- `lightning/toast` ← os:commonToast
- `lightning/uiRecordApi` ← os:commonRecordFieldValue
- `site/buyerCurrencyFormatter` ← os:buyerFormattedPrice
- `site/cartAddToSecondaryCart` ← os:cartBadgeUi
- `site/cartClearCartModal` ← os:cartHeader
- `site/cartContents` ← os:cartB2bCartContents
- `site/cartCreateModal` ← os:cartCreateButton, os:cartOptions
- `site/cartFailedActionEvaluator` ← os:cartApplyCoupon, os:orderQuickOrder
- `site/cartItem` ← os:cartSplitshipmentItemUi
- `site/cartItemDropdown` ← os:cartDeliverygroupItem, os:checkoutNewshipmentModal
- `site/cartMinicartpanel` ← os:cartBadge
- `site/cartOptionsConfirmationModal` ← os:cartOptions
- `site/checkoutAddressModal` ← os:cartSplitshipmentContents, os:checkoutDeliveryAddress
- `site/checkoutDeliveryestimates` ← os:checkoutDeliverymethod, os:checkoutDeliverymethodOptions
- `site/checkoutEkg` ← os:checkoutDeliveryAddress, os:checkoutNotification
- `site/checkoutEmptyshipmentModal` ← os:cartSplitshipmentContents
- `site/checkoutLayoutAccordion` ← os:checkoutLayoutAccordionDual
- `site/checkoutLayoutOnepage` ← os:checkoutLayoutOnepageDual
- `site/checkoutNewshipmentModal` ← os:cartSplitshipmentContents
- `site/checkoutPaymentByExpress` ← os:cartMinicartpanel, os:checkoutPaymentByExpressWrapper
- `site/checkoutStencilUnified` ← os:cartMinicartpanel
- `site/commerceErrors` ← os:productPurchaseOptions
- `site/commonConfig` ← os:cartHeader
- `site/commonCountryPickerConfirmationModal` ← os:commonCountryPickerUi
- `site/commonLoginHandler` ← os:checkoutContactInfo, os:checkoutPaymentSheet
- `site/commonModal` ← os:cartSplitshipmentHeader
- `site/commonNumberInput` ← os:commonQuantitySelector
- `site/commonPasswordlessLoginModal` ← os:commonLoginHandler
- `site/commonQuantitySelector` ← os:quoteRequestModal, os:subscriptionAmendModal
- `site/legalTermsandconditionsModal` ← os:cartPromotionAppliedUi
- `site/myAccountAddressDeleteConfirmationModal` ← os:myAccountAddressFooter
- `site/myAccountSwitcherModal` ← os:myAccountUserProfileMenu
- `site/myAccountUserProfileMenuUi` ← os:myAccountUserProfileMenu
- `site/orderDeliveryGroupContainer` ← os:orderLineitem
- `site/paymentAuthorizationError` ← os:checkoutErrorHandler, os:checkoutPaymentSheet
- `site/paymentSavedMethodsActionModal` ← os:paymentSavedMethodsCardFooter
- `site/productBundleDetailsModal` ← os:orderConfirmationItems
- `site/productPricingDetails` ← os:productSetItem
- `site/productSubscriptionSelector` ← os:productPricingDetailsUi
- `site/productVariantSelectorUi` ← os:productSetItem, os:productVariantSelector
- `site/productWishlistUtil` ← os:productPurchaseOptions, os:productWishlistButtonAdd
- `site/promotionNameDisplayEvaluator` ← os:orderPromotionsAppliedUi
- `site/quoteCartModalUi` ← os:quoteDuplicateToCartButton
- `site/quoteDeclineRenegotiateModalUi` ← os:quoteDeclineRenegotiateButton
- `site/quoteRequestModal` ← os:quoteRequestButton, os:quoteRequestButtonProduct
- `site/quoteTocartModal` ← os:quoteAcceptandbuyButton
- `site/reorderModal` ← os:orderSummary, os:reorderButton
- `site/subscriptionCancelModal` ← os:subscriptionCardBuilder
- `site/subscriptionCardV2` ← os:subscriptionActionHistoryCard, os:subscriptionDetailsCard
- `site/subscriptionHistoryPanel` ← os:subscriptionCardBuilder
- `site/subscriptionPaymentMethodModal` ← os:subscriptionCardBuilder
- `site/subscriptionRenewModal` ← os:subscriptionCardBuilder

### Bundles with no js-meta.xml properties (non-builder / internal components) — 271 total (os=244, col=27)

Every one of these bundles has a `js-meta.xml` file (none are missing the file entirely) but zero
`<property>` elements — i.e. they are internal/child components with no Experience Builder-exposed
configuration surface, not malformed bundles. Full list (grouped by repo) kept for deep-read triage:

<details><summary>os (244)</summary>

- os:buyerCurrencyFormatter
- os:buyerFormattedPrice
- os:cartApplyCouponButtonUi
- os:cartApplyCouponUi
- os:cartBadgeUi
- os:cartClearCartModal
- os:cartContents
- os:cartCreateButton
- os:cartCreateModal
- os:cartDeliverygroupItem
- os:cartDetailsCard
- os:cartEvaluatePriceOriginal
- os:cartFailedActionEvaluator
- os:cartFooter
- os:cartHeader
- os:cartItem
- os:cartItemDropdown
- os:cartItemsUi
- os:cartManagedContents
- os:cartMinicartpanel
- os:cartOptions
- os:cartOptionsConfirmationModal
- os:cartPromotionAppliedUi
- os:cartSplitshipmentHeader
- os:cartSplitshipmentHeaderUi
- os:cartSplitshipmentItemsUi
- os:cartSplitshipmentItemUi
- os:cartSummaryUi
- os:checkoutAddresses
- os:checkoutAddressModal
- os:checkoutAddressVisualPicker
- os:checkoutBillingAddressCombo
- os:checkoutButtonUi
- os:checkoutData
- os:checkoutDeliveryestimates
- os:checkoutDeliverymethodGroup
- os:checkoutDeliverymethodOptions
- os:checkoutDualPayRow
- os:checkoutEkg
- os:checkoutEmptyshipmentModal
- os:checkoutErrorHandler
- os:checkoutGiftMessage
- os:checkoutGiftOptionsUi
- os:checkoutGiftWrap
- os:checkoutInputAddress
- os:checkoutInternationalization
- os:checkoutLayoutAccordionDual
- os:checkoutLayoutOnepageDual
- os:checkoutMultiCountryPhoneField
- os:checkoutNewshipmentModal
- os:checkoutPaymentByExpress
- os:checkoutPaymentByExpressWrapper
- os:checkoutProcessingindicator
- os:checkoutSectionAccordion
- os:checkoutSectionOnePage
- os:checkoutStencil
- os:checkoutStencilUnified
- os:commerceErrors
- os:commonActionLink
- os:commonBreadcrumbsUi
- os:commonButtonUi
- os:commonConfig
- os:commonCountryPickerButton
- os:commonCountryPickerConfirmationModal
- os:commonCountryPickerGrid
- os:commonCountryPickerPanel
- os:commonCountryPickerUi
- os:commonDrilldownNavigationBarUi
- os:commonDrilldownNavigationListUi
- os:commonDrilldownNavigationUi
- os:commonDropdown
- os:commonError
- os:commonField
- os:commonFocusTrapManager
- os:commonFormattedCurrencyUi
- os:commonFormattedPrice
- os:commonFormatterCurrency
- os:commonItemFields
- os:commonLinksListUi
- os:commonLoginHandler
- os:commonModal
- os:commonNumberInput
- os:commonPageLevelErrorMessage
- os:commonPanel
- os:commonPasswordlessLoginModal
- os:commonPill
- os:commonPrimitiveFocusTrapManager
- os:commonQuantitySelector
- os:commonQuantitySelectorPopover
- os:commonRecordFieldValue
- os:commonRecordLink
- os:commonRichtextsanitizerUtils
- os:commonScopedNotification
- os:commonToast
- os:commonTransactLayout
- os:layoutFooterUi
- os:layoutHeaderUi
- os:legalConsentOptions
- os:legalTermsandconditionsModal
- os:myaccountAddress
- os:myAccountAddressCardUi
- os:myAccountAddressDeleteConfirmationModal
- os:myaccountAddressEmptystate
- os:myAccountAddressFooter
- os:myAccountProfileEditor
- os:myAccountProfileUi
- os:myAccountProfileVerification
- os:myAccountSwitcherList
- os:myAccountSwitcherListRecord
- os:myAccountSwitcherModal
- os:myAccountUserProfileMenuUi
- os:orderAmountUi
- os:orderConfirmationFieldtable
- os:orderConfirmationMessageSuccess
- os:orderDeliveryGroupContainer
- os:orderDeliveryGroupDisplay
- os:orderDeliveryGroupUi
- os:orderDetailsDisplay
- os:orderDetailsUi
- os:orderDiscounts
- os:orderItemInfo
- os:orderList
- os:orderListDateFilter
- os:orderListDateFilterUi
- os:orderListUi
- os:orderLookupUi
- os:orderPromotionsAppliedUi
- os:orderQuickOrderDisplay
- os:orderQuickOrderItem
- os:orderShipmentTrackerUi
- os:orderSummaryProductMedia
- os:orderSummaryUi
- os:orderTotals
- os:orderTotalsWithFields
- os:paymentAddPaymentMethodsUi
- os:paymentAuthorizationError
- os:paymentProcessing
- os:paymentSavedMethodsActionModal
- os:paymentSavedMethodsCardFooter
- os:paymentSavedMethodsGridUi
- os:paymentSavedPaymentMethodsCard
- os:productAddQuantity
- os:productAddToCartButton
- os:productAddToCartUtils
- os:productAttachmentsUi
- os:productBundleDetailsModal
- os:productBundleItemUi
- os:productDynamicAttrAccordion
- os:productFbtItem
- os:productFieldsTableUi
- os:productFrequentlyBoughtTogetherUi
- os:productGalleryImage
- os:productHeadingUi
- os:productListPurchasedFilterange
- os:productMediaSlider
- os:productPricingDetailsUi
- os:productPricingTiersUi
- os:productPricingUi
- os:productSellingmodelSelectorUi
- os:productSetItem
- os:productSetItemContainer
- os:productSetUi
- os:productStencil
- os:productSubscriptionItem
- os:productSubscriptions
- os:productSubscriptionSelector
- os:productThumbnailGallery
- os:productTitle
- os:productVariantAttributesDisplay
- os:productVariantPill
- os:productVariantPillcontainer
- os:productVariantSelectorUi
- os:productVariantSwatchcontainer
- os:productVariantSwatchitem
- os:productWishlistShortcutUi
- os:productWishlistUi
- os:productWishlistUtil
- os:promotionAppliedDetailsPopover
- os:promotionDiscountsApproachingUi
- os:promotionEvaluatePriceDiscount
- os:promotionNameDisplayEvaluator
- os:promotionPopover
- os:promotionSummaryUi
- os:promotionTermsConditionsPopover
- os:quoteCartModalUi
- os:quoteConfirmationSuccessMessage
- os:quoteDeclineRenegotiateModalUi
- os:quoteList
- os:quoteListDatefilter
- os:quoteListDatefilterUi
- os:quoteListUi
- os:quoteNotesThreadUi
- os:quoteRequestModal
- os:quoteStatusTrackerUi
- os:quoteSummaryErrorMessage
- os:quoteSummaryProductMedia
- os:quoteSummaryUi
- os:quoteTocartModal
- os:reorderModal
- os:reorderModalContents
- os:searchCombobox
- os:searchFacet
- os:searchFacetItem
- os:searchFiltersCategoryList
- os:searchFiltersPanel
- os:searchFiltersPanelSection
- os:searchFiltersSelected
- os:searchFiltersUi
- os:searchInputFacet
- os:searchInputSuggestions
- os:searchInputUi
- os:searchListbox
- os:searchListBoxOption
- os:searchListBoxOptionInline
- os:searchPagingControl
- os:searchPriceRangeFacet
- os:searchProductCard
- os:searchProductField
- os:searchProductGrid
- os:searchProductSuggestionCardUi
- os:searchProductSuggestionsGridUi
- os:searchResultsLayout
- os:searchResultsUi
- os:searchSortMenuUi
- os:searchSuggestionsUi
- os:selfRegisterUi
- os:subscriptionActionHistoryCard
- os:subscriptionAmendModal
- os:subscriptionCancelModal
- os:subscriptionCard
- os:subscriptionCardList
- os:subscriptionCardV2
- os:subscriptionDetailsCard
- os:subscriptionHistoryDetailsPanel
- os:subscriptionHistoryPanel
- os:subscriptionPaymentMethodModal
- os:subscriptionRenewModal
- os:subscriptionStatus
- os:subscriptionTermDetailsPill
- os:themelayoutExternal
- os:themelayoutMyaccount
- os:themelayoutSite
- os:themelayoutSiteSimple
- os:topSellersUi

</details>

<details><summary>col (27)</summary>

- col:commonButton
- col:commonLink
- col:commonModal
- col:commonNumberInput
- col:productAttachments
- col:productGalleryUtils
- col:productPricing
- col:productPricingTiers
- col:productQuantityAdd
- col:productQuantitySelector
- col:productQuantitySelectorPopover
- col:productVariantSelector
- col:searchCategoryTree
- col:searchFacet
- col:searchFacetItem
- col:searchFilters
- col:searchFiltersModal
- col:searchFiltersModalPanel
- col:searchFiltersPanel
- col:searchInputFacet
- col:searchPagingControl
- col:searchProductCard
- col:searchProductField
- col:searchProductGrid
- col:searchResults
- col:searchSliderFacet
- col:searchSortMenu

</details>

## Open questions for deep reads

Every anomaly a later deep-read task should chase down, resolve, or explicitly rule out:

1. **Apex imports (0 across both repos)** — confirm this holds at the source level for every family's
   deep read (not just import-statement absence); if a family turns out to reach Apex indirectly (e.g.
   through an `experience/*` or `commerce/*` module that itself calls Apex server-side), note it as a
   divergence from "no Apex" rather than silently upholding the census finding.
2. **`commerce/actionApi` (27 os / 7 col)** — the census counts the module import, not which exported
   action names are dispatched through it; deep reads must enumerate the actual action name strings per
   family (this is exactly the "commerce/actionApi actions dispatched" line item TEMPLATE.md asks for).
3. **74 non-label rare modules** (listed above) — several are one-off `site/*` internal modal/utility
   wrappers used by exactly 1–2 bundles (e.g. `site/cartFailedActionEvaluator`,
   `site/checkoutDeliveryestimates`, `site/promotionNameDisplayEvaluator`); confirm whether these are
   genuinely single-purpose or whether the regex import parser missed additional call sites (e.g. dynamic
   `import()`, which `parseImports` does not handle).
4. **271 meta-less bundles (os=244, col=27)** — confirm during deep reads that these really are internal/
   child components (no Experience Builder surface) and not container components that expose properties
   through a mechanism the regex parser (`<property .../>` only) missed, e.g. a self-closing tag variant
   or `<property>` spanning multiple lines with attributes the regex did not anchor correctly.
5. **Zero test coverage in either repo** — verified independently (no `__tests__`, no `*.test.js`
   anywhere); note this plainly in any generated skill guidance rather than assuming Jest specs exist to
   learn testing patterns from.
6. **col's label namespace is `c.*`, not `site.*`** — `@salesforce/label/c.Search_Facets_*` and
   `@salesforce/label/c.Search_ProductCard_*` are the only labels col imports; confirm during the search
   family deep read whether this is a deliberate namespace separation (col ships as an unmanaged package
   under `c`) or an artifact of how the repo was extracted from a larger org.
7. **col shares two `commerce/productApi`/`commerce/cartApi` wire adapters with os**:
   `CartStatusAdapter` (`commerce/cartApi`) is used by `os:searchProductCard` and both
   `col:builderProductPurchaseOptions`/`col:searchProductCard`; `ProductSearchAdapter`
   (`commerce/productApi`) is used by `os:orderQuickOrderItem`/`os:topSellers` and
   `col:searchFiltersModalPanel`. `ProductCategoryPathAdapter` is col-only (only
   `col:searchFiltersModalPanel`, not shared with any os bundle in this census). Confirm whether col
   genuinely composes on the same `commerce/*` adapter surface/contract as os for the shared two, or
   whether this is coincidental adapter-name reuse with different underlying contracts.
8. **`other` family (5 bundles, os-only): `myaccountAddress`, `myaccountAddressEmptystate`,
   `myaccountMarketingconsentSettings`, `myaccountNavigationMenu`, `myaccountNavigationMenuItems`** — all
   five are lowercase-`myaccount*` bundle names, which the `account` family regex (`^(myAccount|
   selfRegister)`, case-sensitive) does not match because the census script's family rule expects
   camelCase `myAccount*`. This looks like a naming-convention split within the account family (these 5
   bundles use a different casing than the other 17 `myAccount*` bundles), not a genuinely distinct
   family — confirm during the account deep read and consider re-running the census with a
   case-insensitive rule if the distinction turns out not to matter.
