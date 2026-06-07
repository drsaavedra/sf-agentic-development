---
name: salesforce-commerce-b2b
description: Use only when the active project uses Salesforce B2B/B2C Commerce — Commerce architecture, Storefront APIs (cartApi, checkoutApi, productApi), ConnectApi, Commerce data model, checkout patterns, product/search/quick-order patterns, and LWC Commerce coding rules.
---

# Salesforce Commerce Domain Rules

> **Scope:** Apply these rules only when the active project uses Salesforce B2B/B2C Commerce Cloud.
> If you are working on a non-Commerce Salesforce project, skip this file.

## Commerce Architecture

- For Commerce storefront LWCs, consider Storefront APIs first before writing Apex. Use `commerce/cartApi`, `commerce/checkoutApi`, `commerce/productApi`, `commerce/wishlistApi`, `commerce/orderApi`, `commerce/contextApi`, `commerce/effectiveAccountApi`, and CMS APIs when they cover the requirement. (Retrieve the complete current list from up-to-date docs.)
- Use Apex only when Storefront APIs do not expose the required behavior, when server-side security or data shaping is required, or when custom objects/integration data are involved.
- Keep Commerce context explicit. Pass or derive `webstoreId`, `effectiveAccountId`, `cartId`, `productId`, `recordId`, `communityId`, and `siteId` deliberately; do not hard-code them.
- Use existing Commerce utilities before creating a new resolver. Look for the project utility classes that resolve webstore, community, currency, pricebook, active cart, and buyer context before writing your own.
- For checkout flows, use the active cart and checkout state as the source of truth. Wire `CartSummaryAdapter`, `CartItemsAdapter`, and `CheckoutInformationAdapter` where possible instead of independently querying cart records.
- After imperative checkout updates such as `updateDeliveryMethod`, call `notifyAndPollCheckout` or the matching Storefront API refresh mechanism so dependent checkout/cart components receive updated state.
- Keep LWR and Aura/legacy implementations separate. Do not mix Aura controller assumptions into LWR components unless the existing component is Aura-based.
- For Commerce Einstein or recommendation components, preserve Commerce activity tracking. When custom components replace standard product or recommendation UI, use the relevant Commerce activity APIs such as product view, add-to-cart, recommendation view, and recommendation click tracking.
- For backend Commerce behavior, prefer `ConnectApi` and Commerce extension points over raw SOQL/DML when they preserve buyer context, cart behavior, or checkout calculation behavior. (This is a fallback only when Storefront APIs will not work.)
- Existing `CartExtension` calculator classes may require `without sharing` because Salesforce invokes them as extension points. Do not change their sharing model without testing the calculator in checkout.
- Do not query or mutate Commerce data casually from Apex if a Storefront API provides entitlement-aware behavior. Storefront APIs apply buyer context, entitlement, pricing, cart state, and cache behavior that ad hoc SOQL often misses.
- For product search from Apex, preserve the existing pattern: build `ConnectApi.ProductSearchInput`, include prices and quantity rules when the UI needs them, pass both `webstoreId` and `effectiveAccountId`, and explicitly choose grouping behavior.
- For add-to-cart, quick order, order-again, and CSV upload Apex, use `ConnectApi.CartItemInput`, `ConnectApi.BatchInput`, and the existing cart utility methods. Return per-line success/failure results, not just one aggregate status.
- For ERP or external pricing integrations, preserve the established pricebook and `PricebookEntry` update path. Do not silently add cart lines when the product has no valid price.
- Unit tests must use realistic Commerce-adjacent data where practical. Reuse the existing project test data factories before creating one-off setup.
- Test data for Commerce flows should include buyer account/contact, `BuyerGroup`, `BuyerGroupMember`, entitlement/policy records, products, pricebooks, `PricebookEntry`, webstore context, and cart/order records as required by the code under test.
- For LWR pages that need account context outside cart/checkout, use `getSessionContext` from `commerce/contextApi` or the current project equivalent instead of reading URL state or storage.
- For components that can appear on PDP, PLP, cart, checkout, and modal contexts, support both `recordId` and explicitly passed `productId`/`cartId` patterns when the existing project does so.

## Commerce Data Model

- Use standard Commerce objects and relationships before creating custom objects:
  - Store and catalog: `WebStore`, catalogs/categories, `ProductCategory`, product-category associations.
  - Products and pricing: `Product2`, `Pricebook2`, `PricebookEntry`, product attributes/variations, buyer-group entitlements.
  - Buyer access: `Account`, `Contact`, buyer accounts, buyer groups, web store buyer group associations.
  - Cart and checkout: `WebCart`, `CartItem`, `CartDeliveryGroup`, `CartCheckoutSession`, cart adjustments, cart taxes, `PaymentGroup`, `PaymentMethod`.
  - Orders: `Order`, `OrderItem`, `OrderSummary`, `OrderItemSummary`, `OrderDeliveryGroupSummary`, payment and fulfillment summaries.
  - Addresses: `ContactPointAddress` for account/address book data and delivery address selection.
  - Media/CMS: Salesforce CMS, Product Media, static resources, or approved external media storage according to the existing project.
- Project-specific Commerce data often extends these objects. Inspect fields on `Product2`, `Account`, `Order`, `OrderSummary`, `CartDeliveryGroup`, `ProductCategoryProduct`, and pricing objects before assuming standard fields are enough.
- Common product fields include `StockKeepingUnit`, `ProductCode`, and project-specific custom fields for part numbers, alternate or OEM part numbers, base price, dimensions, stock-location, stock-check method, and shipping attributes. Use the configured field API names from builder properties where available rather than assuming names.
- Do not bypass buyer entitlement, effective account, catalog, pricebook, or webstore context when loading products, pricing, search results, or recommendations.
- Do not assume `Product2` visibility equals storefront visibility. Check category assignment, catalog/webstore setup, buyer group access, pricebook entries, and active status.
- Use `StockKeepingUnit` as the default SKU field unless the project defines another SKU field. Make SKU field names builder-configurable for quick order and CSV upload components.
- For shipping and delivery work, treat `CartDeliveryGroup` and delivery method state as checkout-owned. Prefer checkout APIs for delivery method changes and use Apex only for custom address or delivery logic not supported by Storefront APIs.
- For address book and delivery selection, distinguish account addresses, drop-ship/manual addresses, warehouse/click-and-collect addresses, and cart delivery group address fields.
- For wishlist work, prefer `commerce/wishlistApi` where available. Use Apex only for project-specific wishlist rules, custom category metadata, or legacy compatibility.
- For inventory or stock availability, prefer the project's established Commerce/OCI integration pattern. Do not invent direct inventory queries without confirming the data source.
- For ERP or middleware staging models, preserve the staging pattern. Objects that stage external data are integration boundaries, not storefront source-of-truth objects.
- For order, estimation, invoice, packing, and inventory flows, inspect selectors, processors, entity converters, batch classes, and purge/cleanup batches before changing data movement or status transitions.

## Commerce API Usage

- `commerce/cartApi`: use for active cart state, cart item reads, add/update/delete cart items, coupons, processing state, and cart summary refreshes.
- `commerce/checkoutApi`: use for checkout state, delivery method updates, shipping address updates, payment authorization, purchase order payment, place order, restart checkout, and checkout polling.
- `commerce/productApi`: use for product detail, product collections, product search, category hierarchy/path, product pricing, recommendations, and promotion pricing where available.
- `commerce/wishlistApi`: use for wishlist create/update/delete and wishlist item add/remove flows when compatible with the project.
- `commerce/orderApi`: use for order history, order summary, reorder, order items, delivery groups, and guest order authorization when supported.
- `commerce/contextApi` and `commerce/effectiveAccountApi`: use to read or update app/session/effective account context instead of custom session storage.
- CMS APIs and `experience/cmsEditorApi`: use for CMS-backed banners, media tiles, and content editing flows.
- When Storefront APIs are unavailable or insufficient, review Salesforce LWR Commerce reference patterns before implementing Apex. Useful reference repo: `https://github.com/forcedotcom/commerce-on-lightning-components`.
- `ConnectApi`: use for Apex-side Commerce search, cart creation/activation, batch add-to-cart, cart item reads, order summary creation, navigation menu reads, and other server-side Commerce operations that need buyer/webstore context.
- `CartExtension`: use only for Salesforce Commerce extension points such as shipping, pricing, tax, inventory, and validation calculators. Do not call calculator classes directly from LWCs.

## Checkout Patterns

- Checkout components should listen to `CartSummaryAdapter` for `cartId`, `accountId`/`effectiveAccountId`, `webstoreId`, and currency.
- Checkout components should listen to `CheckoutInformationAdapter` for checkout status, delivery groups, selected delivery method, available delivery methods, and shipping instructions.
- When changing delivery methods, update through `updateDeliveryMethod(methodId)` and then poll/notify checkout state.
- Do not update checkout UI optimistically without a rollback/error path. Show loading state while checkout operations are processing.
- Guard against adapters firing before shipping services or checkout calculations complete. Check status and required nested fields before dereferencing arrays such as delivery groups or delivery methods.
- Keep delivery method names configurable or label-driven. Do not hard-code names such as `Standard`, `Dropship`, or `Click & Collect` unless the current project standard requires those exact values.
- For manual address entry, validate required fields client-side and server-side before mutating cart delivery group state.
- For custom shipping calculators, clean prior shipping validation outputs, rebuild delivery group methods carefully, and handle carts with no delivery groups. Consider account type, region, export-user behavior, backorder state, click-and-collect eligibility, guest defaults from custom metadata, and delivery product prices.
- Do not hard-code guest account, warehouse, region, or delivery settings in Apex. Use the project setting custom metadata or the existing project setting source.

## Product, Search, and Quick Order Patterns

- Product listing/search components should use Commerce product/search APIs or existing storefront data contracts before custom SOQL.
- Search result labels and fields should be builder-configurable. Default line 1 to `Name`; default line 2 to the project SKU/part field such as `StockKeepingUnit`, `ProductCode`, or a custom part-number field; support a third line when the project uses an alternate or OEM part number.
- Quick order and CSV upload components must validate SKU, quantity, min/max quantity, increment/multiple rules, unavailable products, and partial failures.
- Add-to-cart flows must refresh cart state and surface both success and per-line failures. Bulk add-to-cart should report which rows succeeded and which failed.
- Quantity components should enforce minimum, maximum, disabled-cart, no-quantity, and increment multiplier rules consistently.
- For OEM or region-specific product behavior, derive the rule from account fields, custom metadata, or existing selector/controller output. Do not branch on display text in the UI when a data flag exists.
- When asked to publish sites via API, use `sf community publish`.
