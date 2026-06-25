# Existing surfaces, reusable components, and placement

> Part of `researching-ui` — see SKILL.md. Discovery, not design. Reuse-before-invent applies hardest
> to UI. Name actual component/page API names from `force-app/**`; if no org is connected, flag
> `repo-only`.

## Existing UI surfaces and reusable components

- **What LWCs exist?** — `force-app/**/lwc/*/` (each folder is a bundle). List bundles relevant to the
  feature; read the `.js-meta.xml` `targets` to see where each can be placed and whether it's exposed.
  Note any that are clearly reusable building blocks (generic datatable, modal, picker).
- **Aura components** — `force-app/**/aura/`. Legacy, but existing ones may already cover the need;
  note them as reference (don't plan new Aura).
- **Screen Flows with UI** — `force-app/**/flows/*.flow-meta.xml` with screens. An existing guided
  flow may be extensible rather than rebuilt.
- **Reuse vs reference** — mark each found component as a **reuse candidate** (drop-in usable) or
  **reference-only** (shows the pattern but not directly reusable). `sf-plan` can only choose reuse if
  research surfaced the component.
- **Duplicate-component risk** — grep for components doing the same job
  (`grep -rl "lightning-datatable" force-app/**/lwc/`) so the plan extends one rather than adding an
  Nth copy.

## Placement surfaces

Placement shapes the component contract (record context vs none, target objects) — pin it.

- **Where must the UI live?** — record page, app/home page (Lightning App Builder / FlexiPage),
  utility-bar item, quick action, or an Experience Cloud page. Read existing `force-app/**/flexipages/`
  to see where related UI already sits.
- **What context does that placement imply?** — a record page gives a record id/context; an app page
  gives none. Note the implied inputs so the plan's component contract matches the surface.
- **Existing pages to extend** — is there already a FlexiPage for the target object/app where the new
  component would slot? Name it.

## Internal vs Experience Cloud — the architecture fork

This is the fork to surface in research, because a full site is a different architecture.

- **Who uses this UI?** — internal users (Lightning Experience), or external customers/partners
  (Experience Cloud)? Ask the user; the metadata can't tell you the intended audience.
- **Does an Experience Cloud site already exist?** — `force-app/**/experiences/` or
  `digitalExperiences/`, and `sf org list metadata` for `Network`/`ExperienceBundle`. Note existing
  sites the feature might extend.
- **Full site vs single component** — a multi-page Experience Cloud site/storefront SPA routes to
  `building-ui-bundle-app`, **not** a single LWC. If the requirement is a whole site, record the fork
  prominently in **Surprises & constraints** so `sf-plan` plans the right architecture.

## What to hand to the doc

Reuse candidates + reference components → **Existing surfaces & reusable components**. The pinned
placement + implied context → **Placement**. Audience + existing sites + the full-site fork →
**Internal vs Experience Cloud** (and the fork up to **Surprises & constraints**).
