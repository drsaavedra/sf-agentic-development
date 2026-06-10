# Commerce Data Model

> Part of the flag-gated `salesforce-commerce-b2b` overlay — see SKILL.md for scope.

- Use standard Commerce objects and relationships before creating custom objects:
  - Store and catalog: `WebStore`, `ProductCatalog`, `ProductCategory`, product-category associations.
  - Products and pricing: `Product2`, `Pricebook2`, `PricebookEntry`, product attributes/variations, bundles, buyer-group entitlements.
  - Buyer access: `Account`, `Contact`, `BuyerAccount` (a separate record from `Account` — a storefront buyer needs both), `BuyerGroup`, `BuyerGroupMember`, web store buyer group associations.
  - Entitlements: `CommerceEntitlementPolicy` joins buyer groups to products; its `CanViewProduct` and `CanViewPrice` fields gate independently — a buyer can be entitled to see a product but not its price. Handle the price-hidden case in product and pricing components.
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
