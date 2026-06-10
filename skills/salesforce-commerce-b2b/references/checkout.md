# Checkout Patterns

> Part of the flag-gated `salesforce-commerce-b2b` overlay — see SKILL.md for scope.

- Checkout components should listen to `CartSummaryAdapter` for `cartId`, `accountId`/`effectiveAccountId`, `webstoreId`, and currency.
- Checkout components should listen to `CheckoutInformationAdapter` for checkout status, delivery groups, selected delivery method, available delivery methods, and shipping instructions.
- When changing delivery methods, update through `updateDeliveryMethod(methodId)` and then poll/notify checkout state.
- Custom child checkout components must implement the `useCheckoutComponent` mixin so the checkout engine can run form validation and synchronize external API validations; they slot in as children under checkout section components.
- Execute cart/checkout mutations sequentially — concurrent requests that modify `WebCart` or related records cause Version Mismatch Exceptions or Checkout Conflict errors. Await each `commerce/cartApi` / `commerce/checkoutApi` mutation before issuing the next.
- Set the billing address on the cart before placing the order (via the payment call or directly on `WebCart`); otherwise the `OrderSummary` is created without a billing contact.
- Do not update checkout UI optimistically without a rollback/error path. Show loading state while checkout operations are processing.
- Guard against adapters firing before shipping services or checkout calculations complete. Check status and required nested fields before dereferencing arrays such as delivery groups or delivery methods.
- Keep delivery method names configurable or label-driven. Do not hard-code names such as `Standard`, `Dropship`, or `Click & Collect` unless the current project standard requires those exact values.
- For manual address entry, validate required fields client-side and server-side before mutating cart delivery group state.
- For custom shipping calculators, clean prior shipping validation outputs, rebuild delivery group methods carefully, and handle carts with no delivery groups. Consider account type, region, export-user behavior, backorder state, click-and-collect eligibility, guest defaults from custom metadata, and delivery product prices.
- Do not hard-code guest account, warehouse, region, or delivery settings in Apex. Use the project setting custom metadata or the existing project setting source.
- **Cart scale has documented limits:** carts cap at 2,000 items (orgs can lower the limits). Components that build large carts (CSV upload, reorder, quick order) must handle the at-limit failure path, and heavy shipping/inventory/price/tax integration processing on large carts belongs on the **Async Cart API** — it queues the work and returns a `jobId` instead of blocking the interaction.
- **Guest context is a first-class path, not an afterthought.** Guest cart/checkout requires the guest buyer profile with cart and checkout access plus guest access to store media, content, and the public APIs the component calls — verify a custom component's data path works for guests before shipping it to a guest-enabled store. Guest carts must survive login (the platform preserves guest-added items when the guest authenticates); don't build custom merge logic that fights it, and never expose entitlement-bypassing data to a guest context.
