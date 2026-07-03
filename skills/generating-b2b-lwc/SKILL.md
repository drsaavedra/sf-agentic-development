---
name: generating-b2b-lwc
description: "Use when authoring or editing B2B/B2C Commerce storefront Lightning Web Components for an Experience Cloud (LWR) store — cart, checkout, product detail/listing, search, quick order, account, order/quote/subscription, promotion, and other Experience-Builder commerce components. Carries the proprietary B2B Commerce delta that base LWC knowledge lacks: the no-Apex data-access ladder (expression-bound @api props, commerce/* and experience/* modules, actionApi and checkout-engine mutations), sfdc_cms__lwc bundle conventions, the container/*Ui split, and storefront event/error/accessibility idioms. TRIGGER when: creating or editing a storefront LWC in a commerce store, wiring a commerce/* or experience/* module, binding {!Cart.*}/{!Product.*}/{!Checkout.*}/{!Search.*}/{!Order.*} expression data, or building an Experience-Builder commerce component. DO NOT TRIGGER for generic (non-commerce) LWC, or to review/audit a storefront component — for review, use reviewing-lwc and its commerce-b2b reference pack."
---

# B2B Commerce Storefront LWC

Invoke when authoring or editing a Lightning Web Component that runs inside a B2B/B2C Commerce (LWR) storefront — cart, checkout, product detail/listing (PDP/PLP), search, quick order, account, order/quote/subscription, promotion, or any Experience-Builder commerce component. This skill carries only the **B2B Commerce delta** over base LWC: the no-Apex data-access ladder, `{!...}` expression bindings, `sfdc_cms__lwc` bundle conventions, the container/`*Ui` split, and storefront event/error/accessibility idioms. Base LWC mechanics (lifecycle, wire, Jest) are assumed competent — this skill adds only what a commerce storefront requires on top of them.

## Quick Reference (always apply)

Apply every row when generating or editing a storefront component. The Source column points at the reference file that carries the full rationale and worked examples.

| Rule (always apply) | Source |
|---|---|
| Never import Apex (`@salesforce/apex/*`) — get every server need from a `commerce/*`/`experience/*` module or an expression binding | `references/data-access.md` |
| Pick the data rung in order: expression-bound `@api` prop → `@wire` adapter → imperative `commerce/*` call; stop at the first that fits, never reach Apex | `references/data-access.md` |
| Expression-bound `@api` props arrive **`undefined`** on first render — treat as "not loaded yet", never "empty"/"error"; guard with optional chaining + a three-state check | `references/events-state-errors.md` |
| Ship the fixed `{!...}` default string verbatim (e.g. `{!Checkout.Details}`) — a typo silently leaves the prop `undefined` | `references/data-access.md` |
| Bind the expression **root** that matches where the component drops (`{!Cart.*}`/`{!Product.*}`/`{!Checkout.*}`/`{!Search.*}`/`{!Order.*}`…) — roots are not interchangeable | `references/data-access.md` |
| Writes never go through a `@wire`; pick the mutation shape by context — `actionApi` dispatch (in a page-context tree) / direct imperative call (out-of-context) / checkout engine `dispatchUpdateAsync`→`dispatchCommit` / poll-and-push | `references/data-access.md` |
| After an `actionApi` dispatch, do **not** re-fetch — the page provider re-resolves every sibling expression | `references/data-access.md` |
| Clear the processing/spinner flag on **both** success and error (callbacks or `finally`); disable the trigger for the async window | `references/events-state-errors.md` |
| Container owns data access + the `js-meta.xml` builder surface; the `*Ui` leaf is presentation-only — no `<targets>`, no `@wire`, no mutation | `references/component-structure.md` |
| CMS-workspace (`sfdc_cms__lwc`) bundles ship `content.json` + `_meta.json` beside the LWC files; classic `lwc/` bundles ship neither — match the target packaging | `references/component-structure.md` |
| Hide every expression-bound prop from the builder panel with a `designLayoutProperty cbVisibleIf="<prop>=false"` (or `"false"`); place these components under `paletteSection` "Open Code" | `references/component-structure.md` |
| Format currency/locale/date through the shared `site/commonFormatterCurrency` / `Intl` primitives — never hand-roll `Intl.NumberFormat` or concatenate a symbol | `references/component-structure.md` |
| Never surface raw server error text/codes — map error code → pre-imported label with an explicit default | `references/events-state-errors.md` |
| Never recompute pricing/promotions/discounts client-side — display server-evaluated values only | `references/data-access.md` |
| Centralize the event name in a bundle-local `constants.js`; set `bubbles`/`composed` deliberately per event, not blanket | `references/events-state-errors.md` |
| Use light DOM (`static renderMode = 'light'`) where a11y wiring reaches across components (combobox/listbox relays break across a shadow boundary) | `references/accessibility-and-styling.md` |
| In an SSR-capable component (`lightning__ServerRenderableWithHydration`), gate all DOM/browser work behind `!import.meta.env.SSR` and tear observers down in `disconnectedCallback` | `references/events-state-errors.md` |
| Guard every mutation against Builder preview/design mode (`experience/clientApi` `isDesignMode`/`_preventActionInPreview`) | `references/events-state-errors.md` |
| Read effective-account id from `effectiveAccount`/`SessionContextAdapter`, never from a URL param, label, or ad-hoc wire | `references/data-access.md` |

## Detailed Rules (read the reference that matches)

Open the reference file whose concern your current edit touches — the Quick Reference above is the index; each file below carries the ladder, worked skeletons, and the *why it fails* behind its rows.

| Working on… | Read |
|---|---|
| Where data comes from — the no-Apex ladder, `{!...}` expression bindings & roots, `commerce/*`/`experience/*` module surface, mutation & refresh shapes | `references/data-access.md` |
| Bundle shape — CMS vs classic packaging, container/`*Ui` split, Experience-Builder exposure meta, labels/i18n | `references/component-structure.md` |
| Behavior — custom events, processing/loading flags, undefined-first-render guards, error normalization, preview/SSR guards | `references/events-state-errors.md` |
| Accessibility, styling (the `experience/styling` bridge, `--com-c-*` naming), and the testing setup | `references/accessibility-and-styling.md` |

## Cross-Skill Integration

| Need | Delegate to |
|---|---|
| Review/audit the storefront component this skill produced | `reviewing-lwc` — the quality gate; its `references/commerce-b2b.md` pack carries the matching review rules |
