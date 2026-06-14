# Template Directives and DOM Access

> Part of `reviewing-lwc` — see SKILL.md for the always-on Quick Reference and routing.

**`for:each` key must be a stable unique id from the data — never the loop index.** Using the index as the key breaks DOM reconciliation when the list is reordered or an item is removed.

```html
<!-- BAD — index key; reorder/delete corrupts the rendered rows -->
<template for:each={items} for:item="item" for:index="i">
    <li key={i}>{item.name}</li>
</template>

<!-- GOOD — stable id key -->
<template for:each={items} for:item="item">
    <li key={item.Id}>{item.name}</li>
</template>
```

**Use `lwc:if` / `lwc:elseif` / `lwc:else` for conditional rendering.** The old `if:true` / `if:false` directives are superseded (Spring '23) — Salesforce plans to deprecate and remove them, and they are less performant — so they must not appear in new components. Use `iterator:it` only when you actually need first/last metadata.

**Wire-provisioned data is read-only (frozen).** Shallow-copy before editing — `this.editable = { ...this.record.data }` — and replace the object reference rather than mutating in place. Mutating the wire result directly throws a `TypeError` (LWC modules run in strict mode, and wire-provisioned objects are read-only) and causes unpredictable re-renders. Never deep-copy with `JSON.parse(JSON.stringify(...))` — it blocks the main thread (>50 ms on large UI API objects) and doubles memory; a shallow copy of the level you edit is enough.

**Prefer `lwc:ref` + `this.refs` over `this.template.querySelector()`** for elements the component owns (LWC API v62.0+) — refs skip the DOM scan and avoid a documented `querySelector` memory-leak pitfall under Lightning Locker. Constraints: refs are available in `renderedCallback` but not `connectedCallback`, and `lwc:ref` inside `for:each` is a template compiler error. Reserve `querySelector` for the cases refs can't cover (iterated rows, dynamic selectors).
