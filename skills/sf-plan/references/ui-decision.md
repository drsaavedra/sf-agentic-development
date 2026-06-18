# UI: choosing the right tool

> Part of `sf-plan` — see SKILL.md. Use this when a requirement needs a user interface. Prefer the
> **most declarative** option that delivers the required UX; reach for a custom component only when
> it genuinely can't. Record the reason in the spec.

## The UI ladder

1. **Page layout / Dynamic Forms.** Standard record view/edit — field placement, sections,
   visibility rules — no code. Start here for "show or edit fields on a record."
2. **Screen Flow.** Guided, multi-step processes — wizards, cross-object data capture, conditional
   branching, record collection. Admin-maintainable, no code. Screen Flows now support reactive
   components and can embed LWCs, so their reach is wider than many assume.
3. **Lightning Web Component (LWC).** Custom interactivity, performance-sensitive UI, reusable
   building blocks, custom rendering, and UX a Screen Flow can't deliver.

Aura and Visualforce are legacy — do not choose them for new work. Consider Aura only when LWC
lacks a specific documented capability (increasingly rare).

## Screen Flow vs LWC

| Default to a Screen Flow when… | Choose an LWC when… |
|---|---|
| A linear or branching wizard / guided process | Rich client-side interactivity (inline edit, live filter, drag) |
| Capturing or updating records step by step | Custom rendering — e.g. a datatable with row-level actions/buttons |
| An admin should own and edit the screens | Reusable across pages/apps, or embedded in another component |
| Standard input components are enough | Performance-sensitive views, or large/complex data on screen |
| Light logic, declarative routing | State/logic the Flow screen model can't express cleanly |

**Worked example:** "a datatable of Account records with a per-row button to show child contacts"
→ **LWC**. A custom datatable with row-level actions and conditional drill-in is exactly the
interactivity Screen Flow's standard components don't cover.

## Placement, and Experience Cloud

- Pin the **placement** during planning: a record page, an app/home page (Lightning App Builder /
  FlexiPage), a utility-bar item, a quick action, or an Experience Cloud page. Placement shapes the
  component contract — record context vs none, target objects.
- For a full **Experience Cloud site/storefront app** (multi-page SPA), that is a different
  architecture — route it to `building-ui-bundle-app`, not a single LWC.

## Guardrails

- LWCs are reviewed against `reviewing-lwc` (LDS / `@wire` data sourcing, performance,
  accessibility, Jest). Design to that bar: prefer LDS / `@wire` over imperative Apex where it
  fits, and plan the empty / loading / error states up front.
- Prefer base Lightning components and SLDS before hand-rolled markup.
