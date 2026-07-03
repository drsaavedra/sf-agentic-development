# Stage-3 implementation plan — the two B2B Commerce skill deliverables

> Spec: `docs/superpowers/specs/2026-07-02-b2b-commerce-skills-design.md` (Stage 3). This plan
> governs the skill-authoring stage only; it is the required input to **Gate 1** (user reviews the
> four findings docs + this plan before any skill file is touched). It does **not** author, edit, or
> commit any skill, `CLAUDE.md`, `README.md`, or test file — it specifies exactly what those Stage-3
> edits will be. The controller opens Gate 1; this document is written by the planning task only.
>
> **Citation currency.** Rules cite the findings docs by name + section (e.g.
> `findings-data-access.md §4 Shape 3`) — that is the primary evidence pointer. A handful of direct
> repo locators use the verified bracket format `[os:<bundle>/<file>:<line>]`, copied verbatim from
> the findings docs (already evidence-checked). **os** (`b2b-commerce-open-source-components`, 372
> bundles) is authoritative; **col** (`commerce-on-lightning-components`, 37 bundles) is
> contrast/customization only.
>
> **The two deliverables, and their symmetry.** (1) a new **`generating-b2b-lwc`** standalone
> domain skill (authoring voice), and (2) an upgrade of this repo's existing
> **`skills/reviewing-lwc/references/commerce-b2b.md`** (reviewing voice). Both teach the *same*
> grounded patterns from the *same* findings; they differ only in voice. Every rule in either file
> traces to a findings citation or an official Salesforce doc — no unsourced rules (the Stage-3
> content rule, §4.3).

---

## 1. New skill — `skills/generating-b2b-lwc/`

The first authoring skill owned by this repo. House conventions throughout: a frontmatter
`description` with TRIGGER / DO NOT TRIGGER clauses, a lean SKILL.md carrying a Quick-Reference table
+ a `references/` routing table + a Cross-Skill Integration section, and concern-split reference
packs under `references/`.

### 1.1 Standalone contract (restated, binding)

`generating-b2b-lwc` is a **standalone domain skill**. It has **zero references to `sf-skills` or
any sf-skills skill** — specifically no mention of `generating-lwc-components` or `applying-slds`
anywhere in the skill body, references, or frontmatter. It does **not re-teach base LWC** (lifecycle,
wire mechanics, Jest basics, generic SLDS) — Claude's base model is assumed competent there. It
carries **only the B2B Commerce domain delta** the model can't reliably know: the no-Apex
data-access surface, expression bindings, `sfdc_cms__lwc` bundle conventions, and storefront
composition/idioms. Its single named quality gate is this repo's **`reviewing-lwc`** (not an
sf-skills skill). The skill must survive the user's separate removal of the sf-skills dependency
untouched — this contract is what guarantees that. *(This paragraph is the only place in §§1–3 that
names those skills, and only to state non-dependency.)*

### 1.2 Frontmatter description (draft)

```yaml
---
name: generating-b2b-lwc
description: "Use when authoring or editing B2B/B2C Commerce storefront Lightning Web Components for an Experience Cloud (LWR) store — cart, checkout, product detail/listing, search, quick order, account, order/quote/subscription, promotion, and other Experience-Builder commerce components. Carries the proprietary B2B Commerce delta that base LWC knowledge lacks: the no-Apex data-access ladder (expression-bound @api props, commerce/* and experience/* modules, actionApi and checkout-engine mutations), sfdc_cms__lwc bundle conventions, the container/*Ui split, and storefront event/error/accessibility idioms. TRIGGER when: creating or editing a storefront LWC in a commerce store, wiring a commerce/* or experience/* module, binding {!Cart.*}/{!Product.*}/{!Checkout.*}/{!Search.*}/{!Order.*} expression data, or building an Experience-Builder commerce component. DO NOT TRIGGER for generic (non-commerce) LWC, or to review/audit a storefront component — for review, use reviewing-lwc and its commerce-b2b reference pack."
---
```

Notes on the wording: names only families and mechanisms attested in the findings (families per
`findings-api-census.md` "Bundles per family"; mechanisms per `findings-data-access.md` §1–4). The
DO-NOT-TRIGGER routes review to `reviewing-lwc` (repo-owned, not sf-skills) and excludes generic LWC
by *describing* it, never by naming another authoring skill — preserving §1.1.

### 1.3 SKILL.md body outline

Structure mirrors `skills/reviewing-lwc/SKILL.md`: H1 title, a one-paragraph "invoke when" lead, a
**Quick Reference (always apply)** table, a **Detailed Rules (read the reference that matches)**
routing table, and a **Cross-Skill Integration** section.

**Quick Reference table rows** (each row = an always-apply generation rule; every rule sourced):

| Rule (always apply) | Source |
|---|---|
| Never import Apex (`@salesforce/apex/*`) — get every server need from a `commerce/*`/`experience/*` module or an expression binding | `findings-data-access.md` §1 rung (d); `findings-anti-patterns.md` §1.1 |
| Pick the data rung in order: expression-bound `@api` prop → `@wire` adapter → imperative `commerce/*` call; stop at the first that fits, never reach Apex | `findings-data-access.md` §1 rungs (a)–(d) |
| Expression-bound `@api` props arrive **`undefined`** on first render — treat as "not loaded yet", never "empty"/"error"; guard with optional chaining + a three-state check | `findings-data-access.md` §1 (undefined-on-first-render); `findings-anti-patterns.md` §1.6 |
| Ship the fixed `{!...}` default string verbatim (e.g. `{!Checkout.Details}`) — a typo silently leaves the prop `undefined` | `findings-data-access.md` §2; `findings-anti-patterns.md` §1.7 |
| Bind the expression **root** that matches where the component drops (`{!Cart.*}`/`{!Product.*}`/`{!Checkout.*}`/`{!Search.*}`/`{!Order.*}`…) — roots are not interchangeable | `findings-data-access.md` §2 (roots table) |
| Writes never go through a `@wire`; pick the mutation shape by context — `actionApi` dispatch (in a page-context tree) / direct imperative call (out-of-context) / checkout engine `dispatchUpdateAsync`→`dispatchCommit` / poll-and-push | `findings-data-access.md` §4 Shapes 1–4; `findings-anti-patterns.md` §1.4–1.5 |
| After an `actionApi` dispatch, do **not** re-fetch — the page provider re-resolves every sibling expression | `findings-data-access.md` §4 Shape 1; `findings-anti-patterns.md` §1.4 |
| Clear the processing/spinner flag on **both** success and error (callbacks or `finally`); disable the trigger for the async window | `findings-data-access.md` §4 (cross-cutting rules); `findings-component-patterns.md` §6; `findings-anti-patterns.md` §1.9 |
| Container owns data access + the `js-meta.xml` builder surface; the `*Ui` leaf is presentation-only — no `<targets>`, no `@wire`, no mutation | `findings-component-patterns.md` §2; `findings-anti-patterns.md` §1.15 |
| os bundle = CMS format: ship `content.json` + `_meta.json` beside the LWC files; col classic bundles ship neither — match the target packaging | `findings-component-patterns.md` §1 |
| Hide every expression-bound prop from the builder panel with a `designLayoutProperty cbVisibleIf="<prop>=false"` (or `"false"`); place these components under `paletteSection` "Open Code" | `findings-component-patterns.md` §3; `findings-data-access.md` §2 |
| Format currency/locale/date through the shared `site/commonFormatterCurrency` / `Intl` primitives — never hand-roll `Intl.NumberFormat` or concatenate a symbol | `findings-component-patterns.md` §4; `findings-anti-patterns.md` §1.8 |
| Never surface raw server error text/codes — map error code → pre-imported label with an explicit default | `findings-component-patterns.md` §6; `findings-anti-patterns.md` §1.10 |
| Never recompute pricing/promotions/discounts client-side — display server-evaluated values only | `findings-anti-patterns.md` §1.11 |
| Centralize the event name in a bundle-local `constants.js`; set `bubbles`/`composed` deliberately per event, not blanket | `findings-component-patterns.md` §5 |
| Use light DOM (`static renderMode = 'light'`) where a11y wiring reaches across components (combobox/listbox relays break across a shadow boundary) | `findings-component-patterns.md` §7 |
| In an SSR-capable component (`lightning__ServerRenderableWithHydration`), gate all DOM/browser work behind `!import.meta.env.SSR` and tear observers down in `disconnectedCallback` | `findings-component-patterns.md` §6; `findings-anti-patterns.md` §1.16 |
| Guard every mutation against Builder preview/design mode (`experience/clientApi` `isDesignMode`/`_preventActionInPreview`) | `findings-component-patterns.md` §6; `findings-anti-patterns.md` §1.17 |
| Read effective-account id from `effectiveAccount`/`SessionContextAdapter`, never from a URL param, label, or ad-hoc wire | `findings-data-access.md` §3; `findings-anti-patterns.md` §1.18 |

**Detailed Rules routing table** (points at the reference files fixed in §1.4):

| Working on… | Read |
|---|---|
| Where data comes from — the no-Apex ladder, `{!...}` expression bindings & roots, `commerce/*`/`experience/*` module surface, mutation & refresh shapes | `references/data-access.md` |
| Bundle shape — CMS vs classic packaging, container/`*Ui` split, Experience-Builder exposure meta, labels/i18n | `references/component-structure.md` |
| Behavior — custom events, processing/loading flags, undefined-first-render guards, error normalization, preview/SSR guards | `references/events-state-errors.md` |
| Accessibility, styling (the `experience/styling` bridge, `--com-c-*` naming), and the testing setup | `references/accessibility-and-styling.md` |

**Cross-Skill Integration** — one row only:

| Need | Delegate to |
|---|---|
| Review/audit the storefront component this skill produced | `reviewing-lwc` — the quality gate; its `references/commerce-b2b.md` pack carries the matching review rules |

No other cross-skill rows. Nothing points at sf-skills.

### 1.4 `references/` split — final decision and rationale

**Decision: four concern-cut reference files, replacing the provisional per-family split.**

1. `references/data-access.md`
2. `references/component-structure.md`
3. `references/events-state-errors.md`
4. `references/accessibility-and-styling.md`

**Why not the provisional `cart-checkout.md` / `product-search.md` per-family split.** The findings
deliberately synthesized **across** families by concern, not per family: the expression-root table
(`findings-data-access.md` §2) has one row per family but lives in a single table; the module surface
(§3) and the four mutation shapes (§4) are cross-family; the container/`*Ui` split, label, event,
guard, a11y and styling idioms (`findings-component-patterns.md` §2–8) are stated as
family-independent conventions. A per-family cut would fragment each of these across two files and
force duplication — and it would bury the skill's single highest-value decision (which *rung* / which
*root* / which *mutation shape*), which is inherently cross-family. Family-specificity is preserved
**inside** the concern files as table rows and sub-notes (e.g. the checkout-engine `dispatchUpdateAsync`
→ `dispatchCommit` contract as a mutation shape in `data-access.md`; search facet aggregation as an
event pattern in `events-state-errors.md`).

**Why this particular four-way cut.** It puts the evidence weight where it falls and mirrors the
sibling `reviewing-lwc` reference structure (which is itself concern-split:
architecture-data / templates-dom / async-events-errors / lifecycle-performance / testing), keeping
the two skills structurally symmetric:

- `data-access.md` is the spine and the heaviest file — it owns the whole of `findings-data-access.md`
  (ladder, ~18-root expression table + worked `js-meta.xml` examples, 28-module surface, four mutation
  shapes). This is the most proprietary, least-in-training-data content and the skill's reason to
  exist.
- `component-structure.md` owns `findings-component-patterns.md` §1–4 (bundle anatomy, container/`*Ui`
  split, Experience-Builder exposure, labels/i18n) — the "what a bundle looks like" half.
- `events-state-errors.md` owns `findings-component-patterns.md` §5–6 (event contracts, processing/
  loading state, undefined-first-render guards, error normalization, preview/SSR guards) — the
  runtime-behavior half; this concern is large enough (guards + errors are pervasive) to warrant its
  own file rather than crowding structure.
- `accessibility-and-styling.md` owns `findings-component-patterns.md` §7–9 (a11y idioms, the
  `experience/styling` → `--com-c-*` bridge, and the testing-setup note). Testing folds in here
  because it is thin by necessity: **both repos ship zero test files**; the only teachable artifact is
  col's Jest + sa11y + pre-commit wiring, and the skill must explicitly state that no authored
  storefront LWC test exists to copy (`findings-component-patterns.md` §9).

### 1.5 Per-reference content map (each bullet → its findings source)

- **`data-access.md`** — the four-rung ladder and "never reach Apex" bar (`findings-data-access.md`
  §1); the undefined-on-first-render contract (§1); the expression-root table + the verbatim worked
  `js-meta.xml` examples for cart/checkout/product/search/order/split-shipment/quote (§2); the
  per-module `commerce/*` (19) + `experience/*` (9) surface with the two naming traps —
  `checkoutApi` vs `checkoutCartApi`, and `CartStatusAdapter` exported by two modules (§3); the four
  mutation shapes and the "refresh matches the read rung" rule (§4). Worked component skeletons
  (container binding an expression + rendering one `*Ui`) modeled on real bundles.
- **`component-structure.md`** — CMS (`sfdc_cms__lwc` + `content.json`/`_meta.json`) vs classic
  packaging (§1); the container/`*Ui` split, what each half owns, and col's `builder*` wrapper as the
  advanced/customization alternative (§2); Experience-Builder exposure conventions — targets,
  `paletteSection` "Open Code", `designLayout`/`cbVisibleIf` expression-hiding, shared Java
  datasources, `translatable` (§3); per-bundle `labels.js` barrels, `String.replace` interpolation,
  and the deliberate os `site.` vs col `c.` label-namespace choice (§4).
- **`events-state-errors.md`** — event naming + bundle-local `constants.js`, deliberate (not blanket)
  `bubbles`/`composed`, container re-shaping of child events, aggregate-then-debounce chains, and
  modal contracts (`findings-component-patterns.md` §5); processing flag cleared on both paths,
  code→label error maps and shared normalizers (not `commerceErrors`, which is a static registry),
  display-layer error primitives, guest-vs-auth gating, and preview/SSR guards (§6). Mutation
  *mechanics* are cross-referenced to `data-access.md`, not re-derived.
- **`accessibility-and-styling.md`** — light-DOM requirement and why the search a11y relay needs it,
  `aria-live` regions, the shared focus-trap primitive, keyboard contracts, assistive text for visual
  cues (`findings-component-patterns.md` §7); the `experience/styling` `generateStyleProperties`
  bridge, `--com-c-<component>-<region>-<role>` naming (and the `--ref-c-*` reference-leak
  anti-signal), icon/responsive/font-size idioms (§8); the testing-setup note — zero authored tests
  in either repo, teach col's Jest + sa11y + pre-commit wiring as the recommended setup and say no
  storefront unit test exists to copy (§9).

---

## 2. Upgrade — `skills/reviewing-lwc/references/commerce-b2b.md`

Expanded in place; **no restructuring of the skill** and no change to the SKILL.md routing row (it
already exists). The upgrade is driven directly by the rule-by-rule audit in
`findings-anti-patterns.md` §3 (verdicts CONFIRMED / REFINE / UNVERIFIED), plus new review rules from
the demonstrated-avoidances catalog (§1) and the os-vs-col divergences (§2).

### 2.1 Editing principle

- **CONFIRMED** rules: keep the rule, attach the source-verified citation from the audit (and, where
  the audit says so, the "0 across 409 bundles" backing for absence claims).
- **REFINE** rules: rewrite to the sharper/corrected form the source shows. This includes the four
  **names-wrong** corrections in the Checkout section — the current reference names APIs that return
  **0 source hits** (`useCheckoutComponent`, `CartSummaryAdapter`, `CheckoutInformationAdapter`,
  `updateDeliveryMethod`, `notifyAndPollCheckout`); replace them with the real mechanisms
  (`CheckoutComponentBase`, `{!Checkout.Details}` expression binding, `dispatchUpdateAsync` →
  `dispatchCommit`).
- **UNVERIFIED** rules: keep **only** if an official Salesforce doc backs them, and mark them
  *not-attested-in-source* so a reader knows the repos gave no signal (these are mostly the
  performance/measuring/store-config items, plus a few architecture hints). Never delete a
  docs-backed rule just because the repos don't exercise it; never keep an unsourced one.

### 2.2 Section-by-section edit list

The current file has **eight** headings; every one appears below, mapped to its audit subsection.
Coverage mirrors `findings-anti-patterns.md` §3.1–3.8 (all eight).

- **"Component choice and data sourcing"** → audit **§3.1**. Keep OOTB-first as docs/architecture
  guidance (UNVERIFIED, mark not-repo-attested). Sharpen the deprecated-component clause to "scaffold
  from the non-deprecated sibling (`layoutHeaderOne`); a deprecated-but-*exposed* component is a real
  scaffolding trap." Keep the data-hierarchy rule as CONFIRMED and central, but sharpen the Apex rung
  to "in practice neither repo ever reaches Apex across 409 bundles — treat a custom BFF-Apex reach as
  a design smell, not a routine third option." Sharpen "avoid UI API" to "storefront domain data never
  comes through `lightning/uiRecordApi`/`uiObjectInfoApi`; the one exception is a generic record-field
  display utility." Keep the `fetch()`/`XMLHttpRequest` ban as CONFIRMED, add the "0 across 409
  bundles" backing.
- **"Storefront APIs"** → audit **§3.2**. Keep the framing (CONFIRMED). Correct module-by-module:
  `actionApi` = the page-context *write* path (not a general read API), absent from order/quote/
  subscription; split the cart list into **two** modules `commerce/cartApi` **and**
  `commerce/checkoutCartApi`, warning that `CartStatusAdapter` is exported by both; distinguish
  `commerce/checkoutApi` (in-container base class + `postAuthorizePayment`) from `checkoutCartApi`
  (container-less), and note "place order" is the tree-wide `dispatchFinalizeAsync()` walk; mark
  `commerce/productApi` adapters read-only + thin, and add that PDP data usually arrives via
  `{!Product.*}` binding; drop the "when compatible" qualifier on `wishlistApi`; rewrite `orderApi`
  (only `startReOrder` is attested — order *reads* are `{!Order.*}` expression-bound); fix
  `getSessionContext` → `SessionContextAdapter`; scope `promotionApi` to `PromotionApplicableAdapter`;
  keep `activitiesApi` (CONFIRMED). Split the `experience/*` line: `navigationMenuApi` CONFIRMED;
  `cmsDeliveryApi`/`cmsEditorApi` UNVERIFIED (0 imports) — keep only on docs backing, mark
  not-attested.
- **"Commerce context"** → audit **§3.3**. Sharpen "never hard-code" to "obtain each id from its
  provider channel (expression binding / context adapter / effective-account API), never a literal."
  Mark the dual `recordId`+`productId` acceptance and the LWR-vs-Aura separation as UNVERIFIED
  project-convention hints (not-repo-attested; both repos are 100% LWR).
- **"Checkout components"** → audit **§3.4** *(the heaviest rewrite; four names-wrong corrections)*.
  Replace the `CartSummaryAdapter`/`CartItemsAdapter`/`CheckoutInformationAdapter` listen-rule with
  the real channel: checkout leaves take `{!Checkout.Details}` **expression binding**; the one real
  adapter is `CheckoutDeliveryGroupCartItemsAdapter` from `commerce/cartApi`. Replace the
  `useCheckoutComponent` **mixin** with "extend **`CheckoutComponentBase`** from `commerce/checkoutApi`
  (12 os bundles); a component that doesn't extend it won't interoperate." Replace
  `updateDeliveryMethod` → `notifyAndPollCheckout` with the two-phase
  `await this.dispatchUpdateAsync({...}); this.dispatchCommit();`. Keep sequential-mutation
  (CONFIRMED), no-optimistic-UI + readiness-gate (CONFIRMED — add `checkoutStatusIsReady`/`202
  AsyncInProgress`), label-driven delivery methods (CONFIRMED by absence — `Dropship`/`Click & Collect`
  = 0 hits), and client-side address validation before mutate (CONFIRMED). Add the free-text 3000ms
  debounce-before-commit rule (`findings-anti-patterns.md` §1.13).
- **"Product, search, and quick order"** → audit **§3.5**. Keep "APIs/data contracts before custom
  SOQL" (CONFIRMED — no SOQL/Apex anywhere; search via `{!Search.Results}` + `ProductSearchAdapter`).
  Keep the builder-configurable search-fields rule but demote the specific line1/line2/line3 SKU/OEM
  scheme to a project default (UNVERIFIED, not-repo-mandated). Keep quantity-rule validation
  (CONFIRMED — single `quantityRule` object: min/max/increment) but mark the per-line partial-failure
  CSV contract UNVERIFIED. Generalize the OEM/region rule to "derive behavior from a data flag, not
  display text" (CONFIRMED in spirit), OEM as one example.
- **"Storefront performance"** → audit **§3.6**. Mark the Apex-cacheable / "under three Apex calls"
  items UNVERIFIED (0 Apex in 409 bundles) — keep on docs backing, note the repos sidestep it. Keep
  the image-optimization rule (CONFIRMED — `experience/resourceResolver.resolve()` then
  `experience/picture.createImageDataMap()`); add the resolver as a required precursor. Mark
  preconnect/defer-scripts UNVERIFIED (not-attested). **Important REFINE:** replace
  `@salesforce/userPermission`/`@salesforce/customPermission` (0 imports across os) with the attested
  gating channel — `SessionContextAdapter.isLoggedIn` checked at the point of interaction (redirect
  guests to Login); nuance "never client-side" since guest-vs-auth *is* checked client-side to
  redirect.
- **"Store configuration (review-time checklist)"** → audit **§3.7**. UNVERIFIED / out-of-repo-scope
  (org-admin settings). Keep on docs backing, mark not-repo-attested; note the closest repo touchpoint
  is that pricing/promotion display always defers to the server payload (§1.11), consistent with
  "configure, don't code around."
- **"Measuring"** → audit **§3.8**. UNVERIFIED / out-of-repo-scope (measurement tooling). Keep on docs
  backing, mark not-repo-attested.

### 2.3 New review rules to add (from `findings-anti-patterns.md` §1–2)

These are demonstrated avoidances the current reference does not cover — add each as a checkable
review rule with its source:

- Never `@wire` a mutation, and never re-fetch after a page-context dispatch — `actionApi` re-resolves
  siblings; out-of-context components issue an explicit refresh (§1.4).
- An expression-bound component must not call a cart/checkout mutation API directly — dispatch through
  `actionApi`; the one exception is cart *creation* (`cartCreate()`, no factory exists) (§1.5).
- Clear the processing flag on both success and error; disable the trigger for the async window (§1.9).
- Never surface raw server error codes/text — map code → label with an explicit default; note
  `commerceErrors` is a static registry, not a runtime normalizer (§1.10).
- Never hold payment-card values as component state — delegate to the opaque gateway element; only
  `paymentToken`/`billingDetails` cross back (§1.12).
- Never branch on raw numeric checkout-status literals — use the `CheckoutStatus` enum +
  `checkoutStatusIsReady()` (§1.14).
- A `*Ui` leaf must not declare `<targets>`, hold a `@wire`, or mutate — container owns data + the
  design surface (§1.15).
- SSR guard rule for `lightning__ServerRenderableWithHydration` components (§1.16); preview/design-mode
  mutation guard (§1.17); effective-account only from the effective-account surface (§1.18).
- Currency/locale never hand-rolled — shared formatter (§1.8); pricing/promotions never recomputed
  client-side (§1.11); the fixed `{!...}` default is shipped verbatim (§1.7).
- Divergence-sourced review flags (§2): flag a pricing component that shows price without checking for
  attached selling models (§2.2); flag `--ref-c-*` custom-property prefixes and static theme maps as
  reference-code leakage (§2.3); flag the malformed `xmlns="xmlns=..."` copied from a col internal meta
  (§2.6); do **not** flag a missing `builder*` wrapper or either label namespace as a defect (§2.1,
  §2.7).

---

## 3. Routing changes

### 3.1 `CLAUDE.md` — Authoring & Config Routing table

Add exactly one row to the "Authoring & Config Routing" table (the one whose header is
`| Context | Skill |`). No other CLAUDE.md change — the broader rescoping away from sf-skills is the
user's separate effort, and this row must survive it (zero sf-skills wording). Exact row:

```md
| B2B/B2C Commerce storefront LWC — cart, checkout, PDP/PLP, search, quick order, account/order/quote/subscription, or any Experience-Builder commerce component (LWR storefront) | `generating-b2b-lwc` |
```

Placement: directly under the existing Lightning Web Components authoring row (this is the commerce
specialization of LWC authoring), keeping the LWC rows adjacent. The row names no sf-skills skill.

**Test coupling (critical — see §4.1):** the string `` `generating-b2b-lwc` `` matches the
`SKILL_PREFIX` regex in `test/claude-md.test.js`, so this row makes the typo-guard test fail **unless**
`generating-b2b-lwc` is added to that test's `AUTHORED_SKILLS` array in the same change.

Optional companion edit (recommended, not required by the spec): the LWC↔SLDS bridge note in CLAUDE.md
currently pairs `generating-lwc-components` with `applying-slds`. `generating-b2b-lwc` is standalone and
does **not** join that bridge — no edit needed there, and deliberately so (naming it in the bridge
would imply an sf-skills dependency it must not have).

### 3.2 `README.md` updates

- **"What's Inside" → Skills.** Add `generating-b2b-lwc` to the authored-skills narrative. The README
  currently frames this repo as "reviewing-* skills + the research→plan→build pipeline"; add a short
  note that the repo now also owns one **authoring** domain skill, `generating-b2b-lwc` (standalone;
  gated by `reviewing-lwc`). Simplest placement: a one-line entry near the Review table or a new
  "Authoring (domain)" mention, describing it as B2B/B2C Commerce storefront LWC authoring.
- **"Skill Routing" → Authoring & Config table.** The README's representative table can gain a row (or
  a parenthetical on the LWC row) noting `generating-b2b-lwc` for commerce storefront LWC — keep it
  consistent with the CLAUDE.md wording, zero sf-skills references.
- **Domain-specific reference packs** section is unchanged (the new skill is a standalone skill, not a
  `reviewing-*` reference pack).

The two deliverables stay **symmetric**: `generating-b2b-lwc` (authoring voice) and
`reviewing-lwc/references/commerce-b2b.md` (reviewing voice) teach the same patterns.

---

## 4. Verification steps for Stage 3

### 4.1 `npm test` (`node --test`) — five suites; two need edits, three are automatic

- **`test/frontmatter.test.js` — automatic.** Discovers `skills/*/SKILL.md` dynamically; the new
  SKILL.md is covered with no edit, provided its frontmatter has non-empty `name` + `description` and
  balanced quotes. The draft in §1.2 uses a double-quoted `description` — keep it single-line and
  balanced (no stray unescaped `"` inside).
- **`test/claude-md.test.js` — REQUIRES a code edit.** Two coupled tests: the typo-guard iterates
  every skill-shaped backtick token in CLAUDE.md and asserts it is in `KNOWN`
  (`AUTHORED_SKILLS ∪ SF_SKILLS_ALLOWLIST`); and `AUTHORED_SKILLS` entries must be referenced in
  CLAUDE.md **and** exist as `skills/<name>/SKILL.md`. Because `generating-b2b-lwc` matches
  `SKILL_PREFIX` and is authored **in this repo**, add it to the **`AUTHORED_SKILLS`** array (not the
  sf-skills allowlist). This must land with the CLAUDE.md row and the SKILL.md file, or the suite goes
  red. *(This is the single biggest hidden Stage-3 coupling.)*
- **`test/domain-packs.test.js` — automatic / unaffected.** The commerce **pack** is a `reviewing-*`
  reference concern (`DOMAIN_PACKS` + marked SKILL.md rows). `generating-b2b-lwc` is a standalone
  always-on skill, not a pack carrier, so it needs no `DOMAIN_PACKS` change and this suite is untouched.
  (Confirm the installer copies whole `skills/*` dirs so the new skill ships — a quick check of
  `scripts/install.js`, not a test change.)
- **`test/reference-sources.test.js` — automatic, but see §4.2.** It asserts every *tracked* manifest
  entry is well-formed and its file exists; it does not fail on untracked files. So adding manifest
  entries is optional for `npm test` to pass — but if added, each must be well-formed and its file must
  exist in the same change.
- **`test/write-baseline.test.js` — unaffected** (installer managed-block logic only).

### 4.2 `npm run validate:refs` and `scripts/reference-sources.json`

`validate:refs` warns on **untracked** reference files (SKILL.md bodies and `references/*.md` are
discovered), so to keep the audit clean add manifest entries for the new skill, and repair the
existing commerce-b2b entry:

- **Add** `skills/generating-b2b-lwc/SKILL.md` and `skills/generating-b2b-lwc/references/data-access.md`
  as `basis: "salesforce-docs"`, grounded against the B2B/B2C Commerce **Display LWC APIs** guide
  (`.../guide/b2b-b2c-comm-display-lwc-apis.html`) with anchors reflecting the *real* surface
  (`commerce/cartApi`, `commerce/checkoutCartApi`, `commerce/checkoutApi`, `commerce/actionApi`,
  `CheckoutComponentBase`, `dispatchUpdateAsync`, expression binding). These two carry the
  release-sensitive API-name claims, so they get re-validated each release.
- **Add** `component-structure.md`, `events-state-errors.md`, `accessibility-and-styling.md` as
  `basis: "expertise"` (repo-convention–grounded, like `reviewing-apex/references/architecture.md`),
  each with a `_note` pointing at the findings docs as the grounding source.
- **Repair** the existing `skills/reviewing-lwc/references/commerce-b2b.md` entry: its current source
  anchor `useCheckoutComponent` is now known to name a nonexistent API (0 source hits). Update the
  anchors to the real mechanism (`CheckoutComponentBase`, `dispatchUpdateAsync`/`dispatchCommit`,
  expression binding), keep/verify the Display-LWC-APIs URL, and bump `lastValidated` to the Stage-3
  date. **Open item for the reviewer:** confirm against current official docs whether
  `useCheckoutComponent` is still a documented public API name or was superseded by
  `CheckoutComponentBase`; teach what the current platform actually exposes (source-proven
  `CheckoutComponentBase` is primary; note any doc discrepancy).

### 4.3 Content rule (carry into every task's acceptance criteria)

**Every rule in the new skill and the upgraded reference must trace to a findings citation (a
component path, via the findings docs) or an official Salesforce doc.** No unsourced rules. Where a
rule is docs-backed but the repos gave no signal, mark it *not-attested-in-source* (as the audit does
for the UNVERIFIED performance/measuring items). os is authoritative; teach os as default and record
any col divergence per `findings-anti-patterns.md` §2.

---

## 5. Stage-3 task breakdown

Bite-sized tasks, each with its own review gate, each sized to complete within a single subagent
session (the research stage lost agents to session limits — prefer more, smaller tasks). Each task's
acceptance criteria include the §4.3 content rule. Suggested order (T1–T3 = new skill scaffold + core;
T4–T6 = remaining references; T7 = reviewing upgrade; T8–T9 = routing + verification):

| # | Task | Deliverable | Gate |
|---|---|---|---|
| T1 | Scaffold `generating-b2b-lwc` | `skills/generating-b2b-lwc/SKILL.md` — frontmatter (§1.2), Quick Reference table (§1.3), Detailed-Rules routing table, Cross-Skill Integration (reviewing-lwc only). Standalone-contract check: grep the bundle for `sf-skills`/`generating-lwc-components`/`applying-slds` → 0 hits. | `reviewing-lwc` self-consistency + frontmatter test green |
| T2 | Write `references/data-access.md` | The ladder, expression-root table + worked `js-meta.xml`, module surface, four mutation shapes (§1.5). Heaviest file. | rule-by-rule citation check vs `findings-data-access.md` |
| T3 | Write `references/component-structure.md` | CMS-vs-classic packaging, container/`*Ui` split, Builder-exposure meta, labels/i18n (§1.5). | citation check vs `findings-component-patterns.md` §1–4 |
| T4 | Write `references/events-state-errors.md` | Events, processing/loading flags, undefined-first-render guards, error normalization, preview/SSR guards (§1.5). | citation check vs `findings-component-patterns.md` §5–6 + `findings-anti-patterns.md` §1 |
| T5 | Write `references/accessibility-and-styling.md` | A11y idioms, `experience/styling`→`--com-c-*` bridge, testing-setup note (zero authored tests) (§1.5). | citation check vs `findings-component-patterns.md` §7–9 |
| T6 | Upgrade `reviewing-lwc/references/commerce-b2b.md` | Section-by-section edits §2.2 (all 8 headings) + new rules §2.3. Verify the four names-wrong corrections landed (`useCheckoutComponent`/`CartSummaryAdapter`/`CheckoutInformationAdapter`/`updateDeliveryMethod`/`notifyAndPollCheckout` no longer taught as real APIs). | diff vs audit §3; reviewing voice preserved |
| T7 | Routing — CLAUDE.md + README | Add the CLAUDE.md Authoring row (§3.1) and README updates (§3.2), zero sf-skills wording. | `claude-md.test.js` structural checks |
| T8 | Test + manifest wiring | Add `generating-b2b-lwc` to `AUTHORED_SKILLS` in `test/claude-md.test.js`; add/repair `scripts/reference-sources.json` entries (§4.2). | `npm test` green; `npm run validate:refs` clean |
| T9 | Stage-3 verification pass + Gate 2 | Run `npm test` + `npm run validate:refs`; confirm the content rule across every new/edited file; symmetry check (authoring vs reviewing teach the same patterns). Present skill diffs for **Gate 2**. | Gate 2 (user) |

Tasks T2–T5 are independent of each other (parallelizable after T1). T6 is independent of T1–T5. T7
depends on T1 (the SKILL.md must exist for the `AUTHORED_SKILLS`/on-disk check). T8 depends on T1 + T7.
T9 is last.

Checkpoint commits are enabled (design approval): the main agent commits each task at its stable point
on `feature/commerce-b2b-open-source-patterns`; subagents never commit; no pushes.
