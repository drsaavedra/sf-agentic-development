# Storefront Performance

> Part of the flag-gated `salesforce-commerce-b2b` overlay — see SKILL.md for scope.
> Source: [LWR Storefront Performance Best Practices](https://developer.salesforce.com/docs/commerce/salesforce-commerce/guide/b2b-b2c-comm-storefront-performance-best-practices.html) — consult it for current settings and tooling.

## Data Access and Caching

- Follow the data hierarchy: Experience Builder data providers / LWR expressions first (optimal retrieval, server-side-rendering capable), client-side Storefront APIs second (CDN + browser cached, extensible with custom fields), custom (BFF) Apex last — and tailor custom Apex to the specific pages that use it.
- Annotate storefront Apex reads with `@AuraEnabled(cacheable=true, scope='global')` to enable CDN and browser caching; use `cacheable=true` alone when CDN caching is inappropriate for the response.
- Limit custom Apex calls to fewer than three per interaction; aggregate or batch related data into a single call instead of making multiple requests.
- Avoid n+1 / sequentially dependent requests — parallelize and aggregate data retrieval at higher levels of the component tree, and do not fetch the same data twice through different service calls.
- Prefer Platform Cache over direct database access; minimize SOQL by batching requests.
- Avoid UI API wire adapters on storefronts — they are designed for transactional apps, their results are not cached, and every use costs SOQL.
- Third-party origin resources, static or dynamic, must carry appropriate cache headers.

## Permissions

- Check permissions with `@salesforce/userPermission` / `@salesforce/customPermission`; never implement permission logic client-side.
- If Apex permission checks are unavoidable, consolidate them into a single call, and never block page rendering on a permission check.

## Images and Resources

- Match image byte size to the surface area it occupies on screen; serve images through the platform's image optimization service (dynamic resize, WebP/AVIF) via OOTB image components or `experience/picture` URLs, composing URLs programmatically with utilities like `createImageDataMap`.
- Upload images to Salesforce CMS for optimized delivery; if self-hosting is unavoidable, ensure CDN and browser caching with proper `cache-control` headers.
- Remove references to unused resources; minimize the number and size of resources each page loads.

## Network and Third-Party Content

- Reduce the number of origins assets load from — host assets with Salesforce where possible; otherwise consolidate on a single origin that supports CDN/browser caching.
- Add `<link rel="preconnect">` to the head markup for critical third-party origins; defer non-essential third-party scripts (`async`) until after main content loads.
- Limit third-party scripts and IFrames; audit them regularly for necessity, and prefer direct content embedding over IFrames.

## Store Configuration (review-time checklist)

When reviewing performance issues, check org/store settings before coding around them:

- Faster Add to Cart, Reduce Entitlement Checks, and Secure Browser Caching settings enabled where appropriate; Displayable Fields configured deliberately.
- Inactive/unused promotions and duplicate or stale data removed.
- Remaining Aura storefronts: recommend migrating to LWR.

## Measuring

For performance testing or diagnosis tasks: measure before and after each change; track Core Web Vitals against a representative mobile device on a 4G connection; use Lighthouse and WebPageTest for synthetic tests, the Salesforce Page Optimizer plugin for Lightning debugging, and RUM (or the CrUX dashboard, given enough traffic) for production measurement.
