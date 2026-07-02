# Design: B2B Commerce LWC skills from the open-source component repos

**Date:** 2026-07-02
**Branch:** `feature/commerce-b2b-open-source-patterns`
**Status:** Approved (brainstorming complete)
**Checkpoint commits:** enabled (granted at design approval)

## Goal

Learn the patterns and anti-patterns used by Salesforce's own B2B Commerce storefront LWC —
especially how they are built **without Apex** (which `commerce/*` / `experience/*` APIs and which
Experience Builder data bindings replace it) — from two locally downloaded repos, then:

1. Produce evidence-backed research findings plus an implementation `plan.md` in
   `research/b2b-commerce/`.
2. Author a new **`generating-b2b-lwc`** skill (domain overlay on `generating-lwc-components`).
3. Upgrade **`reviewing-lwc`**'s existing `references/commerce-b2b.md` with the same grounded
   patterns, in reviewing voice.

## Source material

Both repos are downloaded at `D:\Documents\Claude\Salesforce-B2B-Repos`:

| Repo | Size | Format | Role |
|---|---|---|---|
| `b2b-commerce-open-source-components-main` | 372 LWC bundles + paired `sfdc_cms__label` bundles | `force-app/main/default/sfdc_cms__lwc` | **Primary / authoritative** — the actual production LWR storefront code |
| `commerce-on-lightning-components-release` | 38 LWC bundles | classic `force-app/main/default/lwc` (+ Jest, jest-sa11y, jsconfig) | **Secondary / contrast** — older recipe-style customization examples (`builder*` wrappers) |

Where the two conflict, the open-source repo wins and the divergence is recorded in the findings.

## Decisions made during brainstorming

| Question | Decision |
|---|---|
| Shape of `generating-b2b-lwc` | **Domain overlay** — assumes `generating-lwc-components` owns base LWC quality and `applying-slds` owns styling; adds only the B2B Commerce layer. Mirrors the applying-slds pairing. |
| Research depth | **Full sweep by family** — exhaustive scripted census over all ~410 bundles + judgment-guided deep reads per family. |
| Findings/plan location | `research/b2b-commerce/` (subfolder of the repo's existing `research/` convention). |
| Repo weighting | Open-source repo primary; commerce-on-lightning secondary/contrast. |
| End state | One continuous effort: research → plan.md gate → skill authoring, all on this branch. |
| Execution model | Scripted census + guided deep reads (Approach 1). |
| Commits | Checkpoint commits granted — main agent commits at stable points on this branch. |

## Stage 1 — Research

### Census (exhaustive, scripted)

Throwaway scripts (scratchpad only, not committed) sweep both repos and emit inventories:

- **Module import census** — every `import` from `commerce/*`, `experience/*`, `lightning/*`,
  `@salesforce/*` across all bundles, with per-family counts. Answers *which APIs replace Apex*.
- **Wire adapter census** — every `@wire(...)` adapter and its source module.
- **Binding census** — every `@api` property cross-referenced with its Experience Builder exposure
  (`*.js-meta.xml` in the older repo; CMS component config in the open-source repo), identifying
  which properties receive expression-bound page data vs plain builder settings. Answers *which data
  bindings avoid Apex*.
- **Apex census** — count `@salesforce/apex` imports (expected ≈ 0); document any exceptions.
- **Structure census** — bundle counts per family, container/`*Ui` split, label bundle pairing,
  test presence, a11y setup.

The census is complete by construction — no component escapes it.

### Deep reads (judgment-guided)

Per family — cart, checkout, product, search, order, account/profile, common — read the archetypal
container + its `*Ui` leaf plus every census-flagged anomaly. Extract behavioral patterns: mutation
sequencing, error normalization, loading/processing state, guest-vs-authenticated guards,
SSR-safety guards, event contracts, label/i18n handling, a11y idioms. Read the older repo second,
for customization-oriented patterns (builder wrappers, jsconfig, jest-sa11y) and contrast.

### Findings output

```
research/b2b-commerce/
  findings-api-census.md         # exhaustive tables: modules, adapters, counts, per family
  findings-data-access.md        # the no-Apex data-access model: APIs + bindings + hierarchy, with code evidence
  findings-component-patterns.md # structure, composition, ui/data split, labels, events, a11y, testing
  findings-anti-patterns.md      # what the repos deliberately avoid + divergences between the two repos
  plan.md                        # implementation plan for both skills (written after findings)
```

Every findings claim cites the component(s) it came from (path, and line where useful).

## Stage 2 — plan.md and Gate 1

`plan.md` is the implementation plan for both skill deliverables, referencing findings by section.
It fixes the final `references/` split for the new skill based on where the findings' weight
actually falls. **Gate 1:** the user reviews findings + plan.md before any skill file is touched.

Two plans exist by design and do not overlap: the superpowers implementation plan (written next,
after this spec is approved) covers executing Stage 1 and Stage 2 — the census, deep reads,
findings docs, and producing `plan.md` itself. `research/b2b-commerce/plan.md` then governs
Stage 3 (the skill authoring), because its content depends on findings that don't exist yet.

## Stage 3 — Skill deliverables

### New: `skills/generating-b2b-lwc/`

First authoring skill owned by this repo. House conventions throughout: frontmatter description
with TRIGGER / DO NOT TRIGGER clauses, lean SKILL.md with a quick-reference table and a
`references/` routing table, Cross-Skill Integration section.

- **Contract:** overlay — `generating-lwc-components` owns base LWC quality, `applying-slds` owns
  styling; this skill adds only the B2B Commerce storefront layer.
- **Triggers:** building/editing storefront LWC (cart, checkout, PDP/PLP, search, quick order,
  Experience Builder commerce components). Does NOT trigger for generic LWC or for reviews
  (that is `reviewing-lwc`).
- **Core content** (from findings): the no-Apex data-access decision ladder (expression-bound
  `@api` properties → wire adapters → imperative `commerce/*` APIs → Apex only as documented last
  resort), per-family API guidance, composition conventions from the open-source repo
  (container/`*Ui` split, label pairing, event contracts, SSR-safe guards), worked skeletons
  modeled on real components.
- **`references/` (provisional, finalized in plan.md):** `data-access.md`,
  `component-structure.md`, `cart-checkout.md`, `product-search.md`.

### Upgrade: `skills/reviewing-lwc/references/commerce-b2b.md`

Expanded in place — no restructuring of the skill:

- Existing rules kept but grounded: corrected/sharpened where the actual component code shows
  something different or more specific.
- New review rules from findings: expression-binding checks (undefined-on-first-render handling as
  observed in real code), no-Apex enforcement checks, event contract conventions, label/i18n rules,
  SSR-safety, anti-pattern list sourced from `findings-anti-patterns.md`.
- The routing row in `reviewing-lwc/SKILL.md` already exists — unchanged. B2B-specific rules stay
  in the reference pack, not the always-apply Quick Reference table.

### Routing updates

- `CLAUDE.md` Authoring & Config table: new `generating-b2b-lwc` row (trigger: B2B/B2C Commerce
  storefront LWC).
- `CLAUDE.md` "LWC ↔ SLDS bridge" note: add the B2B overlay pairing.
- README authored-skills list updated.
- The two skills stay symmetric: same patterns, authoring voice vs reviewing voice.

## Sequencing and gates

1. Census scripts (scratchpad) → deep reads → four findings docs.
2. Write `plan.md`.
3. **Gate 1** — user reviews findings + plan.md.
4. Author `generating-b2b-lwc`; upgrade `commerce-b2b.md` (following `superpowers:writing-skills`
   conventions + house style).
5. Update `CLAUDE.md` + README.
6. **Gate 2** — final review of skill diffs.

## Verification

- `npm test` — frontmatter suite auto-covers the new SKILL.md; check whether `claude-md.test.js`
  and `domain-packs.test.js` encode skill/routing lists needing updates for the new skill and its
  references.
- `npm run validate:refs` — any doc URLs cited in new references get `scripts/reference-sources.json`
  entries if the suite requires it.
- Content rule: every rule in new/updated skill files traces to a findings citation (component
  path) or an official Salesforce doc — no unsourced rules.

## Git

Checkpoint commits are granted: the main agent commits at stable points (design doc, findings,
plan.md, each skill deliverable) on `feature/commerce-b2b-open-source-patterns`. No pushes.

## Out of scope

- Modifying upstream sf-skills (`generating-lwc-components` etc.) — the overlay only pairs with them.
- The `integrating-b2b-commerce-open-code-components` installed skill (copies components into a
  store) — unrelated to authoring/reviewing; no overlap, no changes.
- Deploying anything to a Salesforce org.
- Committing census scripts — they are scratchpad throwaways; the findings docs carry the results.
