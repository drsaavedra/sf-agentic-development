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

**Prefer `lwc:ref` + `this.refs` over `this.template.querySelector()`** for elements the component owns (LWC API v57.0+) — refs skip the DOM scan and avoid a documented `querySelector` memory-leak pitfall under Lightning Locker. Constraints: refs are available in `renderedCallback` but not `connectedCallback`, and `lwc:ref` inside `for:each` is a template compiler error. Reserve `querySelector` for the cases refs can't cover (iterated rows, dynamic selectors).

**Removing an object from an array by identity fails on copies.** After the shallow copy above, `arr.splice(arr.indexOf(obj), 1)` deletes the *last* element whenever `indexOf` misses (it becomes `splice(-1, 1)`), and an `includes(obj)` duplicate guard lets every duplicate through. Match on a stable key and guard the miss:

```js
// BAD  this.items.splice(this.items.indexOf(item), 1);
// GOOD const i = this.items.findIndex(o => o.id === item.id); if (i !== -1) this.items.splice(i, 1);
```

**Keep the child shape of a `for:each` container identical on every render.** LWC's keyed diff breaks on reorder or shrink, leaving orphaned rows or throwing `removeChild` engine errors that freeze rendering, when (a) a sibling under `lwc:if` sits beside the keyed items (e.g. a "results truncated" `<li>`), or (b) one iteration renders two keyed siblings with one under `lwc:if`. Render the sibling unconditionally and make only its content conditional; wrap each iteration in one keyed element (e.g. `<tbody key={row.id}>`). Re-keying alone does not fix it. When a defect appears at a round number that is also a configured constant, test one below it before believing it is about size.

**`checked={false}` cannot clear a box the user ticked.** The binding is `false` before and after, so the diff changes nothing; reset `input.checked` imperatively. A re-keyed list also reuses elements with the same key, so their ticked state carries over.

**Every `on*` binding must resolve to a defined method.** `onmouseleave={handleLeave}` pointing at a method that does not exist raises no error at compile, deploy, or runtime — the handler is simply never called.
