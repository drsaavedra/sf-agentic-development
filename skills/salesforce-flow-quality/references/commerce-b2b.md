# B2B Commerce — Flow automation

> Optional Commerce domain pack for `salesforce-flow-quality`. Read it when the Flow under review
> automates B2B/B2C Commerce objects — record-triggered flows on `WebCart`, `CartItem`,
> `CartDeliveryGroup`, `Order`/`OrderSummary`, pricing, or entitlement records, or flows that resolve
> buyer/catalog/pricebook context. Apply these rules *on top of* the base Flow quality rules. For the
> Commerce data model, see the
> [B2B/B2C Commerce Developer Guide](https://developer.salesforce.com/docs/commerce/salesforce-commerce/guide/b2b-b2c-comm-dev-guide.html)
> or the `fetching-salesforce-docs` skill.

## Entitlement and context — never bypass it

- Never bypass buyer entitlement, effective account, catalog, pricebook, or webstore context when a
  flow reads or writes products, pricing, search results, or recommendations. A flow running in system
  context can silently cross entitlement boundaries the storefront enforces — resolve and respect
  buyer/effective-account/catalog/pricebook/webstore context explicitly.
- Entitlement is governed by `CommerceEntitlementPolicy`, whose `CanViewProduct` and `CanViewPrice`
  fields gate **independently** — a buyer may be entitled to a product but not its price. Do not assume
  visibility implies price access in any flow that surfaces or copies pricing.
- `Product2` visibility ≠ storefront visibility — category assignment, catalog/webstore setup, buyer
  group access (`BuyerGroup`, `BuyerGroupMember`), pricebook entries, and active status all gate it.
  Don't treat an active `Product2` as buyer-visible in flow logic.

## Commerce objects — verify schema, don't guess

- Know the standard objects a Commerce flow touches before automating them: store/catalog (`WebStore`,
  `ProductCatalog`, `ProductCategory`), products/pricing (`Product2`, `Pricebook2`, `PricebookEntry`),
  buyer access (`Account`, `Contact`, `BuyerAccount`, `BuyerGroup`, `BuyerGroupMember`), cart/checkout
  (`WebCart`, `CartItem`, `CartDeliveryGroup`, `CartCheckoutSession`, `PaymentGroup`, `PaymentMethod`),
  orders (`Order`, `OrderItem`, `OrderSummary`, `OrderItemSummary`, `OrderDeliveryGroupSummary`), and
  addresses (`ContactPointAddress`).
- Project-specific Commerce data often extends these objects. Verify the actual field API names
  (`StockKeepingUnit`, `ProductCode`, part-number/OEM, price, stock-location, shipping fields, etc.)
  against the org before referencing them in a Get/Update — use the configured field, not an assumed
  name. SKU defaults to `StockKeepingUnit` unless the project defines another field.

## Checkout-owned state

- Treat `CartDeliveryGroup` and delivery-method state as **checkout-owned**. The checkout engine and
  Storefront/Connect APIs are the source of truth for delivery method changes and cart mutations —
  prefer them over a record-triggered flow that writes those fields directly, which can collide with
  checkout calculations (Version Mismatch / Checkout Conflict). Use a flow only for custom address or
  delivery logic the checkout path does not support.
- Keep delivery method names configurable/label-driven; don't hard-code `Standard`, `Dropship`, or
  `Click & Collect` in flow decisions unless the project standard requires those exact values. Source
  guest/warehouse/region/delivery settings from custom metadata or the project setting source, not
  hard-coded values in the flow.
- For ERP/middleware staging models, preserve the staging pattern — objects that stage external data
  are integration boundaries, not storefront source-of-truth objects. Don't repoint a flow's data
  movement or status transitions without inspecting the existing selectors, processors, and batches.
