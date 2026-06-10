# Commerce API Usage

> Part of the flag-gated `salesforce-commerce-b2b` overlay — see SKILL.md for scope.
> For the current API surface, see the [B2B/B2C Commerce Developer Guide](https://developer.salesforce.com/docs/commerce/salesforce-commerce/guide/b2b-b2c-comm-dev-guide.html) or the `fetching-salesforce-docs` skill.

- `commerce/actionApi`: the centralized bundle for Storefront Actions on current LWR storefronts — factory methods for UI-driven operations (add to cart, etc.) that update related page-level components in coordinated sequence. Prefer it over hand-wiring the per-domain imperative APIs when it covers the interaction.
- `commerce/cartApi`: use for active cart state, cart item reads, add/update/delete cart items, coupons, processing state, and cart summary refreshes.
- `commerce/checkoutApi`: use for checkout state, delivery method updates, shipping address updates, payment authorization, purchase order payment, place order, restart checkout, and checkout polling.
- `commerce/productApi`: use for product detail, product collections, product search, category hierarchy/path, product pricing, recommendations, and promotion pricing where available.
- `commerce/wishlistApi`: use for wishlist create/update/delete and wishlist item add/remove flows when compatible with the project.
- `commerce/orderApi`: use for order history, order summary, reorder, order items, delivery groups, and guest order authorization when supported.
- `commerce/contextApi` and `commerce/effectiveAccountApi`: use to read or update app/session/effective account context instead of custom session storage.
- `commerce/myAccountApi`: use for account profile and address book management on the storefront.
- `commerce/promotionApi`: use to evaluate promotions and pricing adjustments instead of re-deriving promotion state.
- `commerce/activitiesApi`: use to record shopper activity (product view, add to cart, recommendation view/click) so Einstein Recommendations keep working behind custom UI.
- `experience/navigationMenuApi`: use for navigation menu reads instead of custom menu queries.
- CMS APIs — `experience/cmsDeliveryApi` for delivering CMS content and `experience/cmsEditorApi` for content editing flows: use for CMS-backed banners, media tiles, and content editing.
- When Storefront APIs are unavailable or insufficient, review Salesforce LWR Commerce reference patterns before implementing Apex. Useful reference repo: `https://github.com/forcedotcom/commerce-on-lightning-components`.
- `ConnectApi`: use for Apex-side Commerce search, cart creation/activation, batch add-to-cart, cart item reads, order summary creation, navigation menu reads, and other server-side Commerce operations that need buyer/webstore context.
- `CartExtension`: use only for Salesforce Commerce extension points such as shipping, pricing, tax, inventory, and validation calculators. Do not call calculator classes directly from LWCs.
- Payments: custom payment components use the `commerce/checkoutApi` payment functions such as `postAuthorizePayment`; server-side custom gateways implement the payment gateway adapter extension point (alongside the calculator extension points above).
- Never invoke Connect REST endpoints directly from the browser via `fetch()` or `XMLHttpRequest` — exercise them through the client-side Storefront APIs, which add CDN and browser caching.
