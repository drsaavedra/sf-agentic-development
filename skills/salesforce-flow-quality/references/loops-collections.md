# Loops and Collections

> Part of `salesforce-flow-quality` — see SKILL.md for the always-on Quick Reference and routing.

## Get Records inside a flow loop

*Why it fails:* A Get Records element inside a Loop issues one SOQL query per iteration — the Flow equivalent of SOQL in an Apex loop. The 100-query transaction limit is shared with every trigger, flow, and Apex action in the same transaction, so a record-triggered flow processing a bulk batch hits `Too many SOQL queries: 101` long before the loop finishes.

*Fix:*
- Fetch **all** needed records with a single Get Records element **before** the loop, then distribute them with Assignment elements inside the loop.
- When the records to fetch depend on values in the looped collection, build an Id (or value) collection first, then use the Get Records **In** / **Not In** operators (Winter '23+) to query them in one pass.
- If the per-iteration "query" is really just narrowing an already-fetched collection, use a Collection Filter element instead — it consumes no SOQL at all.

## Loop used only to filter a collection

*Why it fails:* A Loop + Decision + Assignment chain built only to extract a subset of a collection executes several elements per item and burns transaction CPU time (the 10-second-per-transaction limit is the binding constraint since the 2,000-element interview limit was removed in Spring '23 for flows running on API v57.0+ — older-API flows still enforce it). It also clutters the canvas with plumbing that hides the flow's actual logic.

*Fix:*
- Use a **Collection Filter** element (Spring '22+): one element produces a new filtered collection from the original, consumes no SOQL, and leaves the source collection untouched.
- Prefer pushing the criteria into the Get Records filter itself when the criteria are known at query time; use Collection Filter when they only become known later (a Decision outcome, screen input) or when deriving several subsets from one query.
- Combine with Collection Sort when the subset also needs ordering or a top-N cut.

## Loop used only to map or aggregate a collection

*Why it fails:* A Loop + Assignment chain that reshapes one collection into another (copying fields, building a target-object collection, counting, or summing) is hand-rolled data mapping — several element executions per item for work the platform now does in a single element.

*Fix:*
- Use a **Transform** element (GA Summer '24): map source collection fields to a target collection or single value in one element, including aggregations (count, sum) — no loop, no per-item executions. Since Spring '25 it can also merge multiple collections.
- Keep the Loop only when per-item logic genuinely branches (Decisions per item) or has side effects a Transform cannot express.

## No early exit from the loop

*Why it fails:* Looping an entire collection when the logic only needs the first match, or to confirm a fixed count (e.g., "stop once 5 are found"), wastes CPU time on every remaining iteration — on large collections this is the difference between finishing and hitting the CPU limit. Spotting this requires understanding what the loop is *for*, not just its structure.

*Fix:*
- For single-match or threshold logic, add a Decision inside the loop and route the matched/threshold-met outcome to the element **after** the loop — exiting early is supported; the remaining iterations are skipped. (A loop exited early cannot be re-entered — restructure rather than jumping back in.)
- For "first match" on orderable criteria, skip the loop entirely: Collection Sort + keep-first-item, or Collection Filter + get the first record of the result.
- For counts, increment a number variable in the loop and exit once it reaches the target.

## Linear search loop instead of Collection Sort

*Why it fails:* Looping a collection with compare-and-assign logic to find the newest record, the largest amount, or the top N is a hand-rolled search — several element executions per item, extra variables, and easy to get wrong on ties and empty collections.

*Fix:*
- Use a **Collection Sort** element: sort by the field (ascending/descending) and optionally keep only the first N items — min/max is "sort + keep 1", top-N is "sort + keep N", in a single element with no per-item executions.
- Sort first, then loop, when the loop's logic depends on order (e.g., processing newest-first or enabling an early exit once past a boundary value).
- Combine Collection Sort with Collection Filter to replace whole search loops: filter to the candidates, sort to rank them, keep N.

## DML inside a flow loop

*Why it fails:* A Loop element containing a Create/Update/Delete Records element issues one DML statement per iteration — the Flow equivalent of DML in an Apex loop. Hits the 150-DML limit and triggers cascading automation per record.

*Fix:*
- Collect records into a collection variable **inside** the loop using Assignment elements (or replace the whole mapping loop with a Transform element).
- Place the Create/Update/Delete Records element **outside and after** the loop, operating on the full collection.
