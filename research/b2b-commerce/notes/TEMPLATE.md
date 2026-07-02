# Deep-read notes: <family>

> Evidence notes for the B2B Commerce research (spec:
> docs/superpowers/specs/2026-07-02-b2b-commerce-skills-design.md). Every claim carries an
> [os:bundle/file:line] or [col:bundle/file:line] citation. os wins conflicts; divergences are
> recorded, not resolved silently.

## Bundles covered
<list read in full vs. skimmed vs. census-only>

## Data access — how this family gets data without Apex
<expression-bound @api properties (from js-meta.xml defaults), wire adapters used, imperative
commerce/* / experience/* calls, commerce/actionApi actions dispatched. Include exact module +
export names.>

## Composition & structure
<container vs *Ui split, slots, child components, label bundle pairing, utils files, targets.>

## Events & communication
<CustomEvent names + payload shapes, actionApi dispatch patterns, parent/child contracts.>

## Errors, loading, and processing state
<error normalization, loading guards, processing/disabled state during mutations, sequencing.>

## Guards
<undefined-on-first-render handling for expression-bound data, guest vs authenticated, SSR-safety
(window/document guards, lwc:if guards), feature/permission checks.>

## Labels & i18n
<label sourcing, placeholder interpolation ({0}, {amount}), currency/locale handling.>

## Accessibility
<focus management, aria usage, keyboard handling worth teaching.>

## Styling
<experience/styling usage, styling hooks, dxp CSS custom properties, builder-exposed style props.>

## Candidate generation rules
<numbered; each = one teachable authoring rule for generating-b2b-lwc, with citation(s).>

## Candidate review rules / anti-patterns
<numbered; each = one checkable review rule for reviewing-lwc commerce-b2b.md, with citation(s).>

## Anomalies & divergences
<census anomalies chased down; os-vs-col divergences with the os resolution.>
