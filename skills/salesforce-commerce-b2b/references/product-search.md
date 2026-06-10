# Product, Search, and Quick Order Patterns

> Part of the flag-gated `salesforce-commerce-b2b` overlay — see SKILL.md for scope.

- Product listing/search components should use Commerce product/search APIs or existing storefront data contracts before custom SOQL.
- Search result labels and fields should be builder-configurable. Default line 1 to `Name`; default line 2 to the project SKU/part field such as `StockKeepingUnit`, `ProductCode`, or a custom part-number field; support a third line when the project uses an alternate or OEM part number.
- Quick order and CSV upload components must validate SKU, quantity, min/max quantity, increment/multiple rules, unavailable products, and partial failures.
- Add-to-cart flows must refresh cart state and surface both success and per-line failures. Bulk add-to-cart should report which rows succeeded and which failed.
- Quantity components should enforce minimum, maximum, disabled-cart, no-quantity, and increment multiplier rules consistently.
- For OEM or region-specific product behavior, derive the rule from account fields, custom metadata, or existing selector/controller output. Do not branch on display text in the UI when a data flag exists.
- When asked to publish sites via API, use `sf community publish`.
