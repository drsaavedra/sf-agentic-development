# B2B Commerce — Storefront Apex

> Optional Commerce domain pack for `salesforce-apex-quality`. Read it when the Apex under review backs
> a B2B/B2C Commerce storefront — `ConnectApi` usage, `CartExtension` calculators, cacheable storefront
> controllers, or SOQL/DML against Commerce objects. Apply these rules *on top of* the base Apex
> quality rules. For the current API surface, see the
> [B2B/B2C Commerce Developer Guide](https://developer.salesforce.com/docs/commerce/salesforce-commerce/guide/b2b-b2c-comm-dev-guide.html)
> or the `fetching-salesforce-docs` skill.

## ConnectApi and extension points over raw SOQL/DML

- Prefer `ConnectApi` and Commerce extension points over raw SOQL/DML when they preserve buyer context,
  cart behavior, or checkout calculation behavior. Do not query or mutate Commerce data casually from
  Apex when a Storefront API provides entitlement-aware behavior — Storefront APIs apply buyer context,
  entitlement, pricing, cart state, and cache behavior that ad hoc SOQL often misses. Use Apex only
  when Storefront APIs do not expose the behavior, when server-side security/data shaping is required,
  or when custom objects/integration data are involved.
- `ConnectApi` covers Apex-side Commerce search, cart creation/activation, batch add-to-cart, cart item
  reads, order summary creation, navigation menu reads, and other server-side operations that need
  buyer/webstore context.
- For product search from Apex, preserve the existing pattern: build `ConnectApi.ProductSearchInput`,
  include prices and quantity rules when the UI needs them, pass both `webstoreId` and
  `effectiveAccountId`, and explicitly choose grouping behavior.
- For add-to-cart, quick order, order-again, and CSV upload Apex, use `ConnectApi.CartItemInput`,
  `ConnectApi.BatchInput`, and the existing cart utility methods. Return per-line success/failure
  results, not just one aggregate status.
- `CartExtension` calculators are extension points only (shipping, pricing, tax, inventory, validation)
  — never call calculator classes directly from LWCs. Existing calculators may require `without
  sharing` because Salesforce invokes them as extension points; do not change their sharing model
  without testing the calculator in checkout.
- Payments: server-side custom gateways implement the payment gateway adapter extension point
  (alongside the calculator extension points). Custom payment **components** use the
  `commerce/checkoutApi` payment functions on the LWC side.

## Caching and the Apex call budget

- Annotate storefront Apex reads with `@AuraEnabled(cacheable=true, scope='global')` to enable CDN and
  browser caching where the response is CDN-safe; use `cacheable=true` alone when CDN caching is
  inappropriate. Tailor custom (BFF) Apex to the specific pages that use it.
- Limit custom Apex calls to fewer than three per interaction; aggregate or batch related data into a
  single call rather than multiple requests. Prefer Platform Cache over direct database access and
  minimize SOQL by batching.
- If Apex permission checks are unavoidable, consolidate them into a single call and never block page
  rendering on one.

## ERP / pricing integrations

- For ERP or external pricing integrations, preserve the established pricebook and `PricebookEntry`
  update path. Do not silently add cart lines when the product has no valid price.
- For ERP/middleware staging models, preserve the staging pattern — objects that stage external data
  are integration boundaries, not storefront source-of-truth objects.
- For order, estimation, invoice, packing, and inventory flows, inspect selectors, processors, entity
  converters, batch classes, and purge/cleanup batches before changing data movement or status
  transitions.

## Commerce data model and entitlement (verify schema before coding)

- Use standard Commerce objects and relationships before creating custom objects:
  - Store/catalog: `WebStore`, `ProductCatalog`, `ProductCategory`, product-category associations.
  - Products/pricing: `Product2`, `Pricebook2`, `PricebookEntry`, attributes/variations, bundles,
    buyer-group entitlements.
  - Buyer access: `Account`, `Contact`, `BuyerAccount` (a separate record from `Account` — a buyer
    needs both), `BuyerGroup`, `BuyerGroupMember`, web store buyer group associations.
  - Entitlements: `CommerceEntitlementPolicy` joins buyer groups to products; its `CanViewProduct` and
    `CanViewPrice` fields gate **independently** — a buyer can be entitled to see a product but not its
    price. Handle the price-hidden case in product and pricing logic.
  - Cart/checkout: `WebCart`, `CartItem`, `CartDeliveryGroup`, `CartCheckoutSession`, cart adjustments,
    cart taxes, `PaymentGroup`, `PaymentMethod`.
  - Orders: `Order`, `OrderItem`, `OrderSummary`, `OrderItemSummary`, `OrderDeliveryGroupSummary`,
    payment and fulfillment summaries.
  - Addresses: `ContactPointAddress` for account/address-book data and delivery address selection.
- Project-specific Commerce data often extends these objects. Inspect fields on `Product2`, `Account`,
  `Order`, `OrderSummary`, `CartDeliveryGroup`, `ProductCategoryProduct`, and pricing objects before
  assuming standard fields are enough. Common product fields: `StockKeepingUnit`, `ProductCode`, plus
  project custom fields for part numbers, alternate/OEM part numbers, base price, dimensions,
  stock-location, stock-check method, shipping attributes — use the configured field API names rather
  than assuming names.
- Never bypass buyer entitlement, effective account, catalog, pricebook, or webstore context when
  loading products, pricing, search results, or recommendations. `Product2` visibility ≠ storefront
  visibility — check category assignment, catalog/webstore setup, buyer group access, pricebook
  entries, and active status.
- Treat `CartDeliveryGroup` and delivery-method state as checkout-owned; prefer checkout APIs for
  delivery method changes and use Apex only for custom address/delivery logic not supported by
  Storefront APIs. For inventory/stock availability, prefer the project's established Commerce/OCI
  integration pattern — do not invent direct inventory queries without confirming the data source.

## Testing Commerce Apex

- Reuse the existing project test data factories before creating one-off setup. Test data should
  include buyer account/contact, `BuyerGroup`, `BuyerGroupMember`, entitlement/policy records,
  products, pricebooks, `PricebookEntry`, webstore context, and cart/order records as the code under
  test requires.
- Test `CartExtension` calculators with the official mock-the-base-class seam: wrap the `super()` call
  in a `virtual` method on the (also `virtual`) extension class, then override that method in an inner
  mock class in the test — the Apex test framework cannot mock methods across namespaces, so the seam
  must live in your namespace. Wrap other `ConnectApi` calls behind an injectable service seam and stub
  it (`System.StubProvider` — see this skill's `testing.md`) rather than invoking Commerce `ConnectApi`
  directly in tests.
