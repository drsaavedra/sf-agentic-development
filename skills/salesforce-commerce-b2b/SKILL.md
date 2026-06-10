---
name: salesforce-commerce-b2b
description: "Overlay on the LWC/Apex/Flow skill — load it ALONGSIDE them (never instead of them), gated on project configuration rather than file content. Load this skill only when the project is configured as a Salesforce B2B Commerce org via the baseline Priority 4 Commerce flag. When that flag is set, apply it to all Apex/LWC/Flow work: overlay it during authoring and run it as a Commerce-domain review pass after the matching salesforce-*-quality skill. Covers Commerce architecture, Storefront APIs, ConnectApi, the Commerce data model, checkout, and product/search/quick-order patterns. Detailed rules live in references/ — read the file(s) matching the task domain. Do not auto-trigger on commerce/* imports or other code signals — if the flag is not set, skip this skill."
---

# Salesforce Commerce Domain Rules

> **Scope:** Overlay + review chain, gated on the baseline Priority 4 Commerce flag — never on file
> content. When the flag is set, apply these rules *on top of* the base LWC/Apex/Flow skill during
> authoring, then run them as a Commerce-domain review pass after the matching `salesforce-*-quality`
> skill. When the flag is not set, skip this skill — do not scan artifacts for Commerce signals.

## Core Rules (always apply)

- Data hierarchy: Experience Builder data providers / LWR expressions first, then client-side Storefront APIs, then custom (BFF) Apex only when neither covers the requirement.
- Pass or derive Commerce context (`webstoreId`, `effectiveAccountId`, `cartId`, `productId`, …) explicitly; never hard-code it.
- Never bypass buyer entitlement, effective account, catalog, pricebook, or webstore context.
- Backend: prefer `ConnectApi` and Commerce extension points over raw SOQL/DML.
- Make storefront Apex reads cacheable — `@AuraEnabled(cacheable=true, scope='global')` where CDN-safe, `cacheable=true` otherwise — and keep custom Apex calls under three per interaction.
- Reuse existing project Commerce utilities, resolvers, and test data factories before writing new ones.
- Cart/checkout adapters are the source of truth; notify/poll after imperative checkout updates.
- Keep LWR and Aura/legacy implementations separate.
- No hard-coded names or settings — use builder properties or custom metadata (SKU fields, delivery method names, guest/warehouse/region settings).
- Bulk cart operations report per-line success/failure, never one aggregate status.
- `CartExtension` calculators are extension points only — never call them from LWCs; don't change their sharing model without testing checkout.

## Detailed Rules (read the file matching the task)

| Task domain | Read |
|---|---|
| Storefront LWC vs Apex choice, ConnectApi patterns, Einstein/tracking, Commerce testing | `references/architecture.md` |
| Commerce objects, product/pricing/buyer/order data, SKU and address fields, integrations | `references/data-model.md` |
| Choosing a `commerce/*` Storefront API (incl. `actionApi`) or `ConnectApi`/`CartExtension` surface | `references/api-usage.md` |
| Cart, checkout, delivery methods, shipping calculators, addresses, guest carts, large-cart limits | `references/checkout.md` |
| Product listing/search, quick order, CSV upload, quantity rules, site publish | `references/product-search.md` |
| Caching, Apex call budget, permissions, images, third-party scripts, store perf settings, perf testing | `references/performance.md` |

Read the matching file(s) **before authoring** and again **during the Commerce review pass**. A task may
span several domains — read every file that applies.

## Current API Surface

For the up-to-date list of Storefront API modules, ConnectApi methods, and extension points, consult the
[B2B/B2C Commerce Developer Guide](https://developer.salesforce.com/docs/commerce/salesforce-commerce/guide/b2b-b2c-comm-dev-guide.html)
or the `fetching-salesforce-docs` skill / Salesforce MCP. Docs supplement the rules in `references/` —
they never replace them.
