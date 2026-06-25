# Design system, branding, accessibility, and states

> Part of `researching-ui` — see SKILL.md. Discovery, not design. Capture the constraints the UI must
> meet so `sf-plan` designs to the bar and `generating-lwc-components`/`applying-slds` build to it.

## SLDS, design system, and branding

- **Is SLDS the standard?** — check existing components for base Lightning components and SLDS classes
  vs hand-rolled markup (`grep -rl "slds-" force-app/**/lwc/`). Record the de-facto convention so new
  UI matches.
- **Design tokens / styling hooks** — are SLDS styling hooks or custom properties used for theming?
  Note the pattern.
- **Branding constraints** — for Experience Cloud or themed internal apps, capture brand colors,
  typography, and logo rules the UI must honor. Ask the user / check existing theme metadata; these
  are constraints, not preferences.
- **Base-component conventions** — which `lightning-*` base components the codebase favors. New UI
  should reach for the same ones before custom.

## Accessibility bar

- **What's the accessibility requirement?** — WCAG level, keyboard navigation, screen-reader support,
  color-contrast. Public Experience Cloud sites often carry a legal accessibility bar — confirm it.
- **Existing patterns** — note how current components handle labels/aria so new UI is consistent.

## Empty, loading, and error states

- **What states must the UI handle?** — every data-backed component needs empty/loading/error states;
  capture the expectation up front so they're planned, not bolted on. Note how existing components
  render these (spinner, illustration, inline error).

## Mobile and responsive

- **Does the UI run on mobile / Salesforce mobile app?** — affects layout, touch targets, and which
  components are viable. Note responsive expectations and any mobile-specific surface.

## What to hand to the doc

SLDS/branding/base-component conventions → **Design system & branding**. The accessibility bar →
**Accessibility**. Required states + responsive/mobile needs → **States & responsive**. Hard
constraints (brand rules, legal accessibility bar) that gate design → **Surprises & constraints**.
