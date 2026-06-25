---
name: researching-ui
description: "Salesforce UI discovery — inventories the existing LWC/Flow/page surfaces and reusable components a feature could reuse, the placement surfaces available (record/app/home page, utility bar, quick action, Experience Cloud), the internal-vs-Experience-Cloud fork, and the SLDS/branding/accessibility/state constraints, then writes a state-of-the-world docs/ui-design.md a human reviews before planning. Surfaces the Experience-Cloud architecture fork during research, not mid-build. TRIGGER when: starting research on a feature with a user interface, or asked to inventory an org's components, pages, or UI surfaces before a design. DO NOT TRIGGER when: choosing the UI approach (use sf-plan) or building UI (use generating-lwc-components / generating-flow / applying-slds / building-ui-bundle-app)."
allowed-tools: Read, Grep, Glob, Bash, AskUserQuestion
---

# Salesforce UI Research

Discover and document the existing UI landscape so a feature reuses components and lands on the right
surface, and so the **internal-vs-Experience-Cloud** fork is decided in research rather than mid-build.
This skill is discovery only; it does **not** choose Screen-Flow-vs-LWC (`sf-plan`'s job) or build UI.
Its output is `docs/ui-design.md`, reviewed by a human before `sf-plan` plans.

**Cross-domain:** the data the UI reads/writes belongs to `researching-data-model`; an Apex
controller behind a component is a build-time concern (`generating-apex` / `reviewing-apex`), not a research domain; any automation the UI triggers belongs to `researching-automation`; if the surface is a full
Experience Cloud site, the build is a different architecture (`building-ui-bundle-app`) — flag the
fork here.

## Operating rules

- **Verify, never guess.** Inventory real components and pages under `force-app/**` (`lwc/`, `aura/`,
  `flows/`, `flexipages/`) and confirm against the org where it helps. **If no org is connected,
  inventory the repo alone and flag the doc `repo-only`.** Name actual component/page API names —
  don't invent a component that "probably exists".
- **Inventory before recommend.** An existing LWC or reusable component is a reuse candidate; record
  what's there before naming a gap. Reuse-before-invent applies hardest to UI, where copy-pasted
  components proliferate.
- **The placement and the Experience-Cloud question are discovery, not preference.** Where the UI must
  live, and whether it's internal or a public site, follow from the requirement and the org's setup —
  capture them, don't default them.

## Phases: Discover → Analyze → Document

1. **Discover.** Capture org context (reachable? else `repo-only`). Then work the two reference
   checklists: existing surfaces + reusable components + placement + the internal/Experience-Cloud
   fork, and the design-system/branding/accessibility/state constraints. Read the bundles and pages;
   ask the user only for intent the metadata can't show (e.g. "is this for internal users or
   customers?").
2. **Analyze.** Identify reuse candidates, the right placement surface, the **Experience-Cloud
   architecture fork** (a full site routes to `building-ui-bundle-app`), and the constraints that gate
   design — branding/design-system rules, accessibility bar, required empty/loading/error states,
   mobile. Resolve unknowns with `AskUserQuestion`.
3. **Document.** Write `docs/ui-design.md` from the output contract below, ending with the
   design-gating **Surprises & constraints**.

## Reference files (read the one matching what you're inventorying)

| Inventorying… | Read |
|---|---|
| Existing LWC/Aura/Flow/page surfaces, reusable components, placement surfaces, internal-vs-Experience-Cloud fork | `references/surfaces-and-reuse.md` |
| SLDS/design-system & branding, accessibility bar, empty/loading/error states, mobile/responsive | `references/design-constraints.md` |

Read both — what exists and the constraints both shape the component contract `sf-plan` plans.

## Output contract — `docs/ui-design.md`

Write these sections (omit one only if genuinely N/A). If no org was reachable, add a first line:
`> **Status: repo-only** — components/pages verified against force-app/** only, not org-confirmed.`

- **Scope** — what UI the feature needs, and for whom.
- **Existing surfaces & reusable components** — relevant LWC/Aura/Flow/page API names already present,
  marked reuse-candidate or reference-only.
- **Placement** — where the UI must live (record page, app/home page, utility bar, quick action,
  Experience Cloud page) and the record/context that placement implies.
- **Internal vs Experience Cloud** — internal Lightning Experience, or a public/partner Experience
  Cloud site? If a full site, note the architecture fork to `building-ui-bundle-app`.
- **Design system & branding** — SLDS usage, design tokens/branding constraints, base-component
  conventions in the existing components.
- **Accessibility** — the accessibility bar the feature must meet.
- **States & responsive** — required empty/loading/error states and mobile/responsive needs.
- **Surprises & constraints** — the design-gating findings: the Experience-Cloud fork, branding
  constraints, accessibility requirements, missing reusable building blocks.

## Cross-Skill Integration

| Need | Hand to |
|---|---|
| Choose Screen Flow vs LWC, pin the component contract | `sf-plan` (UI decision pack) — **consumes** this doc |
| Build the component / flow / styling | `generating-lwc-components`, `generating-flow`, `applying-slds` |
| Build a full Experience Cloud site/app | `building-ui-bundle-app` |
| The data the UI reads/writes | `researching-data-model` |
| The Apex controller behind a component (build-time) | `generating-apex` / `reviewing-apex` |
| Automation the UI triggers (e.g. a record-triggered Flow) | `researching-automation` |
