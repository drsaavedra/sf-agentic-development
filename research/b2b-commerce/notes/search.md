# Deep-read notes: search

> Evidence notes for the B2B Commerce research (spec:
> docs/superpowers/specs/2026-07-02-b2b-commerce-skills-design.md). Every claim carries an
> [os:bundle/file:line] or [col:bundle/file:line] citation. os wins conflicts; divergences are
> recorded, not resolved silently.

## Bundles covered

Census slice: `family==='search'` → 33 `os` bundles + 19 `col` bundles (some names, e.g.
`searchFacet`, `searchFilters`, exist in both repos with different implementations — see
Anomalies).

**Read in full (JS + HTML + js-meta.xml, os unless noted):**
`searchInput`, `searchInputUi`, `searchInputContainer` (+ `.scoped.css`), `searchInputSuggestions`,
`searchCombobox`, `searchListbox`, `searchListBoxOption`, `searchListBoxOptionInline`,
`searchSuggestionsUi`, `searchFacet`, `searchFacetItem`, `searchInputFacet`,
`searchPriceRangeFacet`, `searchFilters`, `searchFiltersUi`, `searchFiltersPanel`,
`searchFiltersPanelSection`, `searchFiltersCategoryList`, `searchFiltersSelected`, `searchResults`,
`searchResultsUi`, `searchResultsGrid`, `searchResultsList`, `searchResultsLayout`,
`searchResultsLayoutEmpty`, `searchSortMenu`, `searchSortMenuUi`.
col: `searchFiltersModalPanel` (full — key divergence), `searchFilters` (full — form-factor
divergence).

**Skimmed (census `imports`/`apiProps`/`metaProps` only, not source-read — product-card-shaped
components that overlap with the product family, out of this brief's named archetype list):**
`searchProductCard`, `searchProductField`, `searchProductGrid`, `searchProductSuggestionCardUi`,
`searchProductSuggestionsGridUi`, `searchPagingControl` (js-meta only), and all `col:` bundles not
listed above (`builderSearchFilters`, `builderSearchPagingControl`, `builderSearchResults`,
`builderSearchSortMenu`, `searchCategoryTree`, `searchFacet`, `searchFacetItem`, `searchFiltersModal`,
`searchFiltersPanel`, `searchInputFacet`, `searchPagingControl`, `searchProductCard`,
`searchProductField`, `searchProductGrid`, `searchResults`, `searchSliderFacet`, `searchSortMenu`).

**Census-only (name + apiProps/metaProps, no file read):** none beyond the skimmed set above.

## Data access — how this family gets data without Apex

The `search` family is driven almost entirely by **CMS-page expression bindings** into `@api`
properties, not wire adapters, for the "results/filters/sort" half of the family:

- `{!Search.Results}` → `searchResults` on `os:searchFilters`
  [os:searchFilters/searchFilters.js-meta.xml:19], `os:searchResults`
  [os:searchResults/searchResults.js-meta.xml:16], `os:searchResultsGrid`
  [os:searchResultsGrid/searchResultsGrid.js-meta.xml:24], `os:searchResultsList`
  [os:searchResultsList/searchResultsList.js-meta.xml:21] (also on `col:builderSearchFilters` and
  `col:builderSearchResults` per census metaProps).
- `{!Search.Name}` → `searchResultsFields` on `os:searchResults`
  [os:searchResults/searchResults.js-meta.xml:17] (also `col:builderSearchResults` per census
  metaProps).
- `{!Search.ClientState.loading}` → `searchResultsLoading` on `os:searchResults`
  [os:searchResults/searchResults.js-meta.xml:18], `os:searchResultsGrid`
  [os:searchResultsGrid/searchResultsGrid.js-meta.xml:28], `os:searchResultsList`
  [os:searchResultsList/searchResultsList.js-meta.xml:25], `os:searchResultsLayoutEmpty`
  [os:searchResultsLayoutEmpty/searchResultsLayoutEmpty.js-meta.xml:20].
- `{!Search.ClientState.showFilters}` → `showFilters` on `os:searchFilters`
  [os:searchFilters/searchFilters.js-meta.xml:22].
- `{!Search.Pagination.currentPage}` → `currentPage` on `os:searchResults`
  [os:searchResults/searchResults.js-meta.xml:23], `os:searchResultsGrid`
  [os:searchResultsGrid/searchResultsGrid.js-meta.xml:27], `os:searchResultsList`
  [os:searchResultsList/searchResultsList.js-meta.xml:24] (also `col:builderSearchPagingControl`
  and `col:builderSearchResults` per census metaProps).
- `{!Search.Results.total}` / `{!Search.Results.pageSize}` → `total` / `pageSize` on
  `os:searchResultsGrid` [os:searchResultsGrid/searchResultsGrid.js-meta.xml:25-26],
  `os:searchResultsList` [os:searchResultsList/searchResultsList.js-meta.xml:22-23] (also
  `col:builderSearchPagingControl` per census metaProps).
- `{!Search.Results.productLoadedCount}` → `searchResultsTotal` on `os:searchResultsLayoutEmpty`
  [os:searchResultsLayoutEmpty/searchResultsLayoutEmpty.js-meta.xml:19].
- `{!Search.SortRules.rules}` / `{!Search.SortRules.currentSortRuleId}` → `sortRules` /
  `sortRuleId` on `os:searchFilters`, `os:searchSortMenu`
  [os:searchSortMenu/searchSortMenu.js-meta.xml:19-20] (also `col:builderSearchSortMenu` per
  census metaProps).
- `{!Route.term}` → `searchTerm` on `os:searchFilters`
  [os:searchFilters/searchFilters.js-meta.xml:21].

These CMS-page-injected props are then threaded down through plain `@api` prop passing
(`searchResults` → `searchFilters.filterData` getter
[os:searchFilters/searchFilters.js:136-138] → `<site-search-filters-ui search-results={filterData}>`
[os:searchFilters/searchFilters.html:5] → `<site-search-filters-panel display-data={searchResults}>`
[os:searchFiltersUi/searchFiltersUi.html:10]) — no component below `searchFilters`/`searchResults`
re-wires the data itself.

**Wire adapters used directly by `search` components:**
- `commerce/productApi` `ProductSearchSuggestionAdapter` — `os:searchInput`
  [os:searchInput/searchInput.js:3,108-111] and `os:searchInputContainer`
  [os:searchInputContainer/searchInputContainer.js:7,84-89], both keyed on a debounced
  `$searchSuggestionsWiredTerm` reactive param that is deliberately set to `null` to suppress the
  call (see Guards).
- `lightning/navigation` `NavigationContext` / `CurrentPageReference` — used across the family to
  read the current route (`term`, `page`) and to `navigate()` to `standard__search`
  [os:searchInput/searchInput.js:169-179], [os:searchInputContainer/searchInputContainer.js:336-350].
- `experience/clientApi` `getFormFactor` — `col:searchFilters` only
  [col:searchFilters/searchFilters.js:34-38], used to decide desktop-panel vs. mobile-modal
  rendering. **The `os:searchFilters` has no form-factor wire** — the os panel is a single
  responsive slide-over driven by CSS breakpoints and the `showFilters` expression, not a
  server/client form-factor branch (divergence, see Anomalies).
- `commerce/productApi` `ProductSearchAdapter` + `ProductCategoryPathAdapter` — `col:searchFiltersModalPanel`
  only [col:searchFiltersModalPanel/searchFiltersModalPanel.js:190-209]. This is a self-contained
  mobile filter modal that re-fetches facets/categories itself from a locally-built
  `_searchQuery` object, rather than receiving `{!Search.Results}` from the page. **No `os`
  equivalent wires `ProductSearchAdapter` directly inside the filters panel tree** — os always
  receives search results via `@api searchResults` from the CMS page (divergence).

**Actions dispatched (`commerce/actionApi`)** — this is how facet/sort/paging/category state
changes get back to the platform's search state (see Events & communication for the full chain):
`createSearchFiltersUpdateAction`, `createSearchFiltersClearAction`,
`createSearchCategoryClearAction`, `createSearchSortUpdateAction`,
`createSearchOpenFilterPanelAction`, `createSearchFilterPanelUpdateAction`,
`createCartItemAddAction`, `createLoadMoreAction`, `createLoadPreviousAction`, all dispatched via
`dispatchAction(this, action)` [os:searchFilters/searchFilters.js:2,179-219].

**Other imperative APIs:** `commerce/activitiesApi` (`trackViewSearchSuggestion`,
`trackClickCategory`, `trackClickSearch`) and `commerce/dataEventApi`
(`dispatchDataEvent`/`createSearchDataEvent`/`createSearchSuggestionDataEvent`/
`createProductRecommendationDataEvent`/`updateSearchCorrelationId`) for analytics/telemetry, fired
alongside — not instead of — the navigation/action calls
[os:searchInputContainer/searchInputContainer.js:5-6,166-172,336-349],
[os:searchResults/searchResults.js:6-7,134-153].

## Composition & structure

Two parallel, mostly-independent sub-trees inside `search`:

1. **Search box / suggestions — two independent implementations, not container/presentation
   halves of one component:**
   - Implementation A: `searchInput` (expression/CMS-page facing, thin wrapper) →
     `searchInputUi` (style-prop-only, no logic) → `searchCombobox` (a11y/state orchestrator,
     class name `CommonCombobox`) → `searchInputSuggestions` (visual input) + `searchListbox` →
     `searchListBoxOption` → `searchListBoxOptionInline` (leaf render)
     [os:searchInput/searchInput.html:2], [os:searchInputUi/searchInputUi.html:2],
     [os:searchCombobox/searchCombobox.html:5,17], [os:searchListbox/searchListbox.html:16].
   - Implementation B: `searchInputContainer` (also expression/CMS-page facing, `isExposed: true`
     with its own builder `targetConfigs`) renders `<site-search-suggestions-ui>` directly with 4
     named slots (`header`, `resultItemStart`, `resultItemEnd`, `categoryEnd`)
     [os:searchInputContainer/searchInputContainer.html:47-112], driving its own debounced
     suggestions/product-suggestions wire logic — confirmed no import of `searchCombobox` or
     `searchInput` in `searchInputContainer.js`.
   Treat these as two distinct, non-interchangeable CMS-placeable search boxes with different
   feature sets (`searchInputContainer` supports best-seller/product suggestions and a
   recent-search header; `searchInput`/`searchCombobox` supports an advanced-search item and
   highlightning), not as different views of the same component — see Anomalies.
2. **Filters / results / sort**: `searchFilters` (CMS-page facing, style-token computation only) →
   `searchFiltersUi` (visibility/modal chrome) → `searchFiltersPanel` (state owner: MRU facet
   tracking, facet-map diffing, debounce) → `searchFiltersCategoryList`, `searchFiltersSelected`,
   `searchFacet` (× N, one per facet) → `searchFacetItem` / `searchInputFacet` /
   `searchPriceRangeFacet` (leaf inputs), plus `searchSortMenuUi` embedded inside the same panel
   [os:searchFiltersPanel/searchFiltersPanel.html:20-33,51-117].
   `searchFacet` wraps every value list in a shared accordion primitive,
   `searchFiltersPanelSection`, via named slots `header`/`body`
   [os:searchFacet/searchFacet.html:2-67], [os:searchFiltersPanelSection/searchFiltersPanelSection.html:11,23].
   `searchResults` (CMS-page facing) → `searchResultsUi` (layout/config computation) →
   `searchProductGrid` + `searchPagingControl`
   [os:searchResultsUi/searchResultsUi.html:13-29]. `searchResultsGrid` and `searchResultsList` are
   **alternative, self-contained** results renderers (own load-more/load-previous/paging state) not
   composed under `searchResults`/`searchResultsUi` — they are separate CMS-placeable components with
   their own `{!Search.*}` bindings (see Anomalies: three parallel results renderers).
   `searchResultsLayout` (slot-only shell: `categoryHeader`/`searchFilters`/`searchHeader`/
   `sortingMenu`/`searchResult`) and `searchResultsLayoutEmpty` (slot-only:
   `resultsLayout`/`noResults`/`loaderPlaceholder`) are pure composition primitives with no data
   fetching — they gate which slotted content renders based on `@api` booleans
   [os:searchResultsLayout/searchResultsLayout.js:1-11],
   [os:searchResultsLayoutEmpty/searchResultsLayoutEmpty.js:1-22].

**Container-vs-Ui split** is consistent: every CMS-page-facing component with `hasUiPair: true` in
the census (`searchInput`/`searchInputUi`, `searchFilters`/`searchFiltersUi`,
`searchResults`(→`searchResultsUi`), `searchSortMenu`/`searchSortMenuUi`) puts *style-token
computation and CMS property normalization* in the outer (page-facing) component and *rendering +
event re-dispatch* in the `*Ui` component. The outer component is never itself placed twice in a
tree; the `*Ui` component is the one composed further down by other outer components (e.g.
`searchFiltersPanel` composes `site-search-sort-menu-ui` directly, not `site-search-sort-menu`
[os:searchFiltersPanel/searchFiltersPanel.html:20]).

`searchListBoxOption`/`searchListBoxOptionInline`/`searchListbox`/`searchCombobox` are all
`isExposed: false` or `isExposed: true` **without** `<targets>`
[os:searchListBoxOption/searchListBoxOption.js-meta.xml:3],
[os:searchListbox/searchListbox.js-meta.xml:3],
[os:searchCombobox/searchCombobox.js-meta.xml:4] — i.e. internal composition primitives, never
builder-placeable on their own.

Label bundle pairing: every component with user-facing text has a sibling `labels.js` (or
`constants.js` + `labels.js`) re-exporting `@salesforce/label/site.<Bundle>.<key>` imports, e.g.
`os:searchFiltersPanel/labels.js` aggregates 8 labels used across the panel
[os:searchFiltersPanel/searchFiltersPanel.js:2] (see census "Expression bindings" table for the
full `@salesforce/label/site.search*` list — 60+ label imports across the family).

## Events & communication

**Facet/sort/paging → action dispatch chain** (the "facet state flow" the brief calls out):
1. Leaf input fires a local event: `searchFacetItem` fires `facetvaluetoggle`
   [os:searchFacetItem/searchFacetItem.js:3,48-59]; `searchPriceRangeFacet` fires
   `facetvaluepricefilter` [os:searchPriceRangeFacet/searchPriceRangeFacet.js:4,156-169];
   `searchFiltersCategoryList` fires `categoryupdate`/`backtosearchupdate`
   [os:searchFiltersCategoryList/searchFiltersCategoryList.js:5-6,62-75].
2. `searchFiltersPanel` is the **sole aggregator**: it listens for `facetvaluetoggle` on every
   `searchFacet` child [os:searchFiltersPanel/searchFiltersPanel.html:115], maintains a local
   `_facetsMap` (facetId → `{searchFacet, valuesCheckMap}`)
   [os:searchFiltersPanel/searchFiltersPanel.js:26,216-223], updates the map optimistically on
   toggle [os:searchFiltersPanel/searchFiltersPanel.js:205-215], then **debounces 300ms**
   [os:searchFiltersPanel/searchFiltersPanel.js:224] before re-deriving `refinements` via
   `refinementsFromFacetsMap` and re-dispatching a single `facetvalueupdate` CustomEvent carrying
   `{mruFacet, refinements, minPrice, maxPrice}` [os:searchFiltersPanel/searchFiltersPanel.js:240-251].
   Price-range applies bypass the debounce (`handleFacetValuePriceFilter` dispatches immediately)
   [os:searchFiltersPanel/searchFiltersPanel.js:260-273].
3. `searchFiltersUi` re-listens for `closefilterpanel` only and otherwise lets
   `facetvalueupdate`/`categoryupdate`/`clearallfilters`/`backtosearchupdate` bubble through
   untouched (no `on*` handlers bound on `site-search-filters-panel` for those events in
   `searchFiltersUi.html` — they bubble past it to `searchFilters`)
   [os:searchFiltersUi/searchFiltersUi.html:9-40].
4. `searchFilters` is the **only** place that converts these DOM events into `commerce/actionApi`
   calls: `onfacetvalueupdate` → `createSearchFiltersUpdateAction({page:1, refinements, mruFacet,
   minPrice, maxPrice, shouldClearUnitPrice})`
   [os:searchFilters/searchFilters.js:185-203]; `onclearallfilters` →
   `createSearchFiltersClearAction(true)` [os:searchFilters/searchFilters.js:204-207];
   `oncategoryupdate` → `createSearchFiltersUpdateAction({page:1, categoryId})`
   [os:searchFilters/searchFilters.js:172-180]; `onbacktosearchupdate` →
   `createSearchCategoryClearAction()` [os:searchFilters/searchFilters.js:181-184];
   `onsearchsort` (from `searchSortMenuUi` inside the panel) →
   `createSearchSortUpdateAction(sortRuleId)` [os:searchFilters/searchFilters.js:208-212];
   `onclosefilterpanel` → `createSearchOpenFilterPanelAction(false)`
   [os:searchFilters/searchFilters.js:213-215]; `onfiltersectionupdate` (accordion expand/collapse)
   → `createSearchFilterPanelUpdateAction(detail)` [os:searchFilters/searchFilters.js:216-220].
   After `dispatchAction`, re-render is driven by the platform re-evaluating the
   `{!Search.*}` expressions on the CMS page — **no component in this family calls a wire refetch
   or sets local state to reflect the new results**; the whole subtree is expression-driven from
   above.
5. `searchSortMenu`/`searchSortMenuUi` follow the same one-hop pattern independently:
   `searchSortMenuUi` fires `EVENT_SORT_ORDER_CHANGED` (`sortorderchanged`)
   [os:searchSortMenuUi/searchSortMenuUi.js:2,80-89]; `searchSortMenu` (the CMS-facing standalone
   sort widget) dispatches `createSearchSortUpdateAction` directly on that event
   [os:searchSortMenu/searchSortMenu.js:3,16-20] and also dispatches
   `createSearchOpenFilterPanelAction(true)` on its own "sort and filter" trigger click
   [os:searchSortMenu/searchSortMenu.js:21-23].
6. Paging: `searchResults`/`searchResultsUi` dispatch `updatecurrentpage` up to `searchResults`,
   which calls `createSearchFiltersUpdateAction({page: newPageNumber})`
   [os:searchResults/searchResults.js:160-165], [os:searchResultsUi/searchResultsUi.js:263-270].
   The two **alternative** results renderers dispatch the action **themselves** instead of
   bubbling to a parent: `searchResultsGrid` and `searchResultsList` each call
   `dispatchAction(this, createSearchFiltersUpdateAction({page}))` directly in their prev/next/goto
   handlers [os:searchResultsGrid/searchResultsGrid.js:176-199],
   [os:searchResultsList/searchResultsList.js:128-144], and call
   `createLoadMoreAction`/`createLoadPreviousAction` for `loadMore` navigation mode
   [os:searchResultsGrid/searchResultsGrid.js:200-209],
   [os:searchResultsList/searchResultsList.js:145-153].

**Search-box event contract**: `searchCombobox` re-emits `searchtermchange` (debounced 300ms via
`experience/utils` `debounce`) [os:searchCombobox/searchCombobox.js:4,101-110],
`searchrequest` (Enter with no highlighted option, or explicit search button/icon)
[os:searchCombobox/searchCombobox.js:127-129,192-208], and `searchoptionselection` (Enter with a
highlighted option, or a listbox click) [os:searchCombobox/searchCombobox.js:111-161]. `searchInput`
(the CMS-facing wrapper) listens for all three plus `blur` and turns a selection/search into
`navigate(navContext, {type:'standard__search', state:{term}})`
[os:searchInput/searchInput.js:151-180].

**Product suggestions focus-escape contract**: `searchSuggestionsUi` dispatches
`suggestionsfocusoutstart`/`suggestionsfocusoutend` when arrow-key navigation runs off the ends of
its item list [os:searchSuggestionsUi/searchSuggestionsUi.js:134-149], and the parent
(`searchInputContainer` or `searchCombobox`'s consumer) is responsible for routing focus back to
the input or to a "see all results" affordance
[os:searchInputContainer/searchInputContainer.js:205-214],
[os:searchCombobox/searchCombobox.html:53-54,97-99].

**Cross-component `window` events without a found dispatcher** — `searchResultsGrid` and
`searchResultsList` both `window.addEventListener('filterchanged', ...)` and
`window.addEventListener('morepagesavailable', ...)`
[os:searchResultsGrid/searchResultsGrid.js:7-8,57-58],
[os:searchResultsList/searchResultsList.js:6-7,44-45], guarded by `!import.meta.env.SSR`, but no
`dispatchEvent(new CustomEvent('filterchanged'|'morepagesavailable', ...))` on `window` exists
anywhere in the `search` family source. These are almost certainly dispatched by the surrounding
platform/runtime (outside this component library) rather than by another LWC in this repo — see
Anomalies.

## Errors, loading, and processing state

- `searchResultsUi` treats `searchResultsLoading` (expression-bound, may start `undefined`) and its
  own `_latestResultsLoaded` flag together: `searchResultsLoaded` is only true once loading is
  falsy **and** results have actually arrived at least once
  [os:searchResultsUi/searchResultsUi.js:112-114], and it resets `_latestResultsLoaded = false`
  immediately on any paging click so a stale "N results loaded" announcement doesn't linger
  [os:searchResultsUi/searchResultsUi.js:247,253,259].
- `searchResultsLayoutEmpty` is a **three-state gate** purely from two expression-bound props:
  `showLoaderPlaceholder` when total is `undefined`/`null`/still loading; `showNoResults` when
  total is exactly `0` and not loading; `showResults` when total is defined and `> 0`
  [os:searchResultsLayoutEmpty/searchResultsLayoutEmpty.js:14-22] — this is the canonical guard
  pattern for `{!Search.Results.productLoadedCount}` / `{!Search.ClientState.loading}` consumers.
- `searchPriceRangeFacet` does inline field-level validation (min/max vs. limits and vs. each
  other) on blur, clears errors on every keystroke, and disables the Apply button while any error
  is set [os:searchPriceRangeFacet/searchPriceRangeFacet.js:67-155,160-168] — no server round trip
  for validation.
- `searchInputContainer`/`searchCombobox` track `isLoadingSearchSuggestions` /
  `showActivityIndicator` from the `loading` flag of `ProductSearchSuggestionAdapter`
  [os:searchInputContainer/searchInputContainer.js:90-95] and render a
  `lightning-spinner` in the input while suggestions are in flight
  [os:searchInputSuggestions/searchInputSuggestions.html:32-42].
- `searchResults`'s `handleAddToCart` passes an `onError` callback to `dispatchAction` that shows an
  error `Toast` rather than throwing [os:searchResults/searchResults.js:89-103] — the only
  place in this family that surfaces an action-dispatch failure to the user.
- Debounce is used in three independent places with three different implementations: `experience/utils`
  `debounce` in `searchCombobox` [os:searchCombobox/searchCombobox.js:4,101],
  `experience/utils` `debounce` again in `searchFiltersPanel` (300ms, local `debounce` wraps the
  facet-map flush) [os:searchFiltersPanel/searchFiltersPanel.js:3,224], and a **local**
  `debounce`/`utils.js` implementation reused by `searchInput`/`searchInputContainer` (not the
  `experience/utils` one) for the suggestions term
  [os:searchInputContainer/searchInputContainer.js:9,62]. Treat `experience/utils` `debounce` as
  the default; only reach for a local copy if you need `clearDebounceTimeout` cleanup semantics
  that differ, as `searchCombobox` does in `disconnectedCallback`
  [os:searchCombobox/searchCombobox.js:68-70].

## Guards

- **Undefined-on-first-render for `{!Search.*}` expressions** is handled with optional chaining +
  nullish defaults at every consumption point, never with a truthiness check that would also
  reject `0`/`false`/empty-string legitimate values: `this.searchResults?.filtersPanel`
  [os:searchFilters/searchFilters.js:136-138], `this.searchResults?.total ?? 0`
  [os:searchResultsUi/searchResultsUi.js:223-225], `this._rawFilterData?.facets ?? []`
  [os:searchFiltersPanel/searchFiltersPanel.js:88-90]. `searchResultsLayoutEmpty` is the one
  component that treats `undefined` as a distinct third state instead of coalescing it away (see
  Errors/loading above) — that is the correct pattern when the UI must distinguish "not loaded
  yet" from "loaded, zero results."
- **Suppressing a wire call until real input exists**: both `ProductSearchSuggestionAdapter`
  consumers gate the reactive param to `null` unless preconditions hold —
  `searchSuggestionsWiredTerm` returns `null` unless `showSearchSuggestionsSetup && hasAdapterLoaded`
  [os:searchInput/searchInput.js:128-130], and returns `null` unless suggestions/products are
  enabled **and** `this._term !== null` (i.e. the box has been focused at least once)
  [os:searchInputContainer/searchInputContainer.js:131-134]. A wire adapter with a `null`
  parameter does not fire — this is the mechanism, not a side effect.
- **SSR guards**: `!import.meta.env.SSR` gates all `window.addEventListener`/`removeEventListener`
  calls [os:searchResultsGrid/searchResultsGrid.js:56,62],
  [os:searchResultsList/searchResultsList.js:43,49], and `urlPageValue`/`getPageValue` short-circuit
  to page `1` under SSR rather than touching `window.location`
  [os:searchResultsList/searchResultsList.js:121-127],
  [os:searchResultsGrid/searchResultsGrid.js:168-175] (the grid variant checks
  `typeof window !== 'undefined'` instead of `import.meta.env.SSR` for the same purpose — two
  different idioms for the same guard, treat both as valid).
- **`static renderMode = 'light'`** is set on every single component in this family with no
  exception across both repos — light DOM is a hard requirement here, driven by the imperative
  `querySelector`-based a11y wiring in `searchCombobox`/`searchListbox`/`searchInputSuggestions`
  (see Accessibility) which would not be able to reach across a shadow boundary.
- **Guarding `renderedCallback` DOM writes to run once**: `searchInputSuggestions` uses an
  `_initialRender` flag so its `id`/`for` attribute wiring only runs on the first render, not every
  re-render [os:searchInputSuggestions/searchInputSuggestions.js:262-271].

## Labels & i18n

- Labels are sourced from `@salesforce/label/site.<BundleName>.<key>` for `os` components and
  `@salesforce/label/c.<Namespace>_<key>` for `col` components — a hard repo-level naming
  convention, not just style (compare `os:searchFiltersPanel` sourcing its heading text from a
  `site.searchFiltersPanel.*`-labeled `./labels` module [os:searchFiltersPanel/searchFiltersPanel.js:2]
  vs. `col:searchFiltersPanel` sourcing the same heading from a `c.Search_Facets_filtersHeader`-labeled
  `./labels` module [col:searchFiltersPanel/searchFiltersPanel.js:9]).
- Placeholder interpolation uses `{0}`/`{count}`/named tokens with `.replace()`, not a formatting
  library: `labels.multipleSeeItemsButton.replace('{count}', countText)`
  [os:searchFiltersPanel/searchFiltersPanel.js:105], `labels.appliedFiltersSectionTitle.replace('{count}', ...)`
  [os:searchFiltersSelected/searchFiltersSelected.js:38-39],
  `labels.priceRangeMinLimit?.replace('{0}', ...)` [os:searchPriceRangeFacet/searchPriceRangeFacet.js:49].
- `searchInputContainer.seeAllResultsLabelParts` splits a label on a literal `{0}` token to build a
  three-part (`prefix`/highlighted-term/`suffix`) array for independent styling of the search term
  inside a sentence [os:searchInputContainer/searchInputContainer.js:118-130] — a more elaborate
  pattern than plain `.replace()`, used specifically because the middle segment needs its own CSS
  class (`term-highlight`).
- Currency formatting goes through `site/commonFormatterCurrency` everywhere money is shown:
  facet price-range labels [os:searchPriceRangeFacet/searchPriceRangeFacet.js:2,108,146], the
  facet name suffix for the Price facet [os:searchFacet/searchFacet.js:2,46-47], and the selected
  filter chip label for a Range facet [os:searchFiltersPanel/searchFiltersPanel.js:6,68-73] — none
  of these components format currency manually.
- `resultsLoadedLabel` on `searchResultsUi` builds three distinct sentence shapes (`noResultsFound`,
  full `resultsLoaded`, partial `resultsLoadedPartial` with computed start/end indices) purely from
  label tokens plus arithmetic, and is only ever read by assistive tech via `aria-live`
  [os:searchResultsUi/searchResultsUi.js:98-111] (see Accessibility).

## Accessibility

This is the deepest evidence in the family — the brief's combobox/listbox focus area.

- **The `role="combobox"` input never owns `aria-expanded`/`aria-controls`/`aria-activedescendant`
  itself.** `searchCombobox` computes `_listBoxId`/`_listBoxExpanded`/`_activeOptionId` from its
  `_displayItems` state in `syncA11y()` (called from `renderedCallback`) and pushes them onto the
  child input/listbox as **imperative property assignment via `querySelector`**, not template
  binding: `input.listBoxId = this._listBoxId; input.listBoxExpanded = this._listBoxExpanded;
  input.activeOptionId = this._activeOptionId;` and `listBox.listBoxId = this._listBoxId;`
  [os:searchCombobox/searchCombobox.js:65-67,209-231]. `searchInputSuggestions` then reflects those
  three properties onto real DOM attributes in its own `syncA11y()`, called from every setter:
  `aria-controls`, `aria-activedescendant`, `aria-expanded`
  [os:searchInputSuggestions/searchInputSuggestions.js:9-32,249-261]. `searchListbox` reflects its
  `listBoxId` onto the rendered `<ul id>` and stamps every `<li id>` from `data-id` in its own
  `syncA11y()` [os:searchListbox/searchListbox.js:38-40,62-71]. This three-hop
  property-then-attribute relay only works because every component in the chain is
  `renderMode: 'light'` (see Guards) — `querySelector` cannot cross a shadow boundary.
- **Keyboard model**: `searchCombobox.handleKeyDown` handles `ArrowDown`/`ArrowUp` (advance/retreat
  highlighted index, wrapping) and `Enter` (`isComposing`/`keyCode === 229` IME guard, then either
  select the highlighted item or submit the raw term)
  [os:searchCombobox/searchCombobox.js:71-86,111-130]. `searchListbox`/`searchListBoxOption` do
  **not** bind `keydown` at all — keyboard selection is entirely owned by the top-level combobox,
  and mouse selection on an option is bound to **`onmousedown`, not `onclick`**
  [os:searchListBoxOption/searchListBoxOption.js:32-40],
  [os:searchListBoxOption/searchListBoxOption.html:3] — `mousedown` fires before the input's
  `blur`, so selecting an option with the mouse doesn't get preempted by the input's blur-driven
  suggestion-dismiss handler.
- **`aria-selected` on `<li role="option">` is driven by `item.highlight`, not by any "checked"
  concept** [os:searchListbox/searchListbox.html:12] — `highlight` is the same boolean that drives
  keyboard-arrow highlighting (`setItemHighlight` in `./utils`), so keyboard and visual/ARIA
  highlight state are guaranteed to be the same value, never two separately-tracked booleans.
- **Focus escape at the edges of a list**: `searchSuggestionsUi.focusByDelta` walks
  `querySelectorAll('li.result-item')` against `document.activeElement`, and when the delta runs
  past either end it fires `suggestionsfocusoutend`/`suggestionsfocusoutstart` instead of wrapping
  [os:searchSuggestionsUi/searchSuggestionsUi.js:134-149] — the parent is responsible for deciding
  where focus goes next (`searchInputContainer` sends it back to the input or to the "see all
  results" link) [os:searchInputContainer/searchInputContainer.js:205-214,247-249]. The same
  end-of-list handoff exists in `searchCombobox`'s slotted category-end template, wired via
  `onkeydown`/`ArrowDown`→focus input, `ArrowUp`→`focusLastItem()`
  [os:searchInputContainer/searchInputContainer.js:229-246].
- **Loading/result-count announcements use a visually-hidden `aria-live="polite"` region**, not a
  toast or visible text change alone: `<div class="slds-assistive-text" role="status"
  aria-live="polite" aria-atomic="true">` wraps `resultsLoadedLabel`/`loadingLabel` in
  `searchResultsUi` [os:searchResultsUi/searchResultsUi.html:2-9] — this is the pattern to reuse
  for any future async-content-swap component in this family.
  `searchInputSuggestions`'s inline spinner also carries its own `role="status"` +
  `slds-assistive-text` [os:searchInputSuggestions/searchInputSuggestions.html:35-37].
  `searchFiltersUi` similarly sets `aria-modal`/`role="dialog"` only while the panel is actually
  shown (`this._showFilters ? 'dialog' : null`) rather than leaving `role="dialog"` present and
  toggling visibility with CSS alone [os:searchFiltersUi/searchFiltersUi.js:65-67,97-99].
- **Focus is explicitly moved when a modal-like panel opens**: `searchFiltersPanel`'s `showFilters`
  setter, on becoming true, waits out the CSS transition (`FILTERS_PANEL_TRANSITION_DURATION` =
  350ms) via `setTimeout` and then calls `.focus()` on the close button
  [os:searchFiltersPanel/searchFiltersPanel.js:18,274-284] — and the whole panel is wrapped in a
  `site-common-focus-trap-manager` with `focus-trap-active={showFilters}`
  [os:searchFiltersPanel/searchFiltersPanel.html:2-6], i.e. focus trapping is delegated to a shared
  primitive, not hand-rolled per component.
- **Accordion sections use `aria-controls`/`aria-expanded` on the header and `role="group"` on the
  body**, toggled by both click and `Enter`/`Space` keydown
  [os:searchFiltersPanelSection/searchFiltersPanelSection.html:4-10,83-88].
- **Checkbox facets keep the native `lightning-input` label for screen readers but visually hide it
  and render a separate truncatable `<span aria-hidden="true">` for sighted users**, with an
  explicit code comment explaining why (`lightning-input` label doesn't truncate inside its
  container) [os:searchFacetItem/searchFacetItem.html:2-27]. `SearchFacetItem` also disables
  (rather than hides) any checkbox whose `productCount === 0`
  [os:searchFacetItem/searchFacetItem.js:34-37] and supports `focusOnInit` for the "show more"
  reveal (see below).
- **"Show more" facet values move focus to the first newly-revealed item**, not to the toggle
  button: `searchInputFacet.displayedValues` stamps `focusOnInit: index ===
  NUM_FACETVALUES_ALWAYS_DISPLAYED` onto exactly the first item past the always-shown cutoff when
  expanded [os:searchInputFacet/searchInputFacet.js:18-29], consumed by `searchFacetItem`'s
  `renderedCallback` guard (`hasRenderedAtLeastOnce`/`hasInitiallyFocused`, so it only autofocuses
  once) [os:searchFacetItem/searchFacetItem.js:26-38].

## Styling

- `experience/styling`'s `generateStyleProperties([{name, value, suffix?}])` /
  `generateStyleProperties({...})` is the universal way custom-CSS-property strings are built from
  `@api Color`/`String` builder properties, used in nearly every leaf component
  (`searchFacetItem` swatch [os:searchFacetItem/searchFacetItem.js:2,21-24], `searchListbox` item
  border [os:searchListbox/searchListbox.js:2,18-24], `searchInputSuggestions` input/button/icon
  styles [os:searchInputSuggestions/searchInputSuggestions.js:3,112-153], `searchResultsUi`'s large
  `customCssProperties` block [os:searchResultsUi/searchResultsUi.js:2,194-219]).
- Custom property naming is namespaced per rendered surface: `--com-c-search-input-*` for the
  search box [os:searchInputContainer/searchInputContainer.js:375-394],
  `--com-c-search-filters-*` for the filters heading
  [os:searchFiltersPanel/searchFiltersPanel.js:154-164], `--com-c-product-*` for result cards/grid
  [os:searchResultsUi/searchResultsUi.js:196-218] — and these override standard SLDS/SDS hooks one
  layer up in `.scoped.css`, e.g. `--sds-c-input-radius-border: var(--com-c-search-input-border-radius)`
  [os:searchInputContainer/searchInputContainer.scoped.css:35].
- `generateMatchingStyles(styles, prefix)` filters a flat custom-styles object down to only the
  keys matching a given prefix, used by `searchCombobox` to hand the listbox only the
  `suggestions-`/`search-container-`-prefixed subset of the styles it received
  [os:searchCombobox/searchCombobox.js:6,57-63] — the mechanism for passing a single `customStyles`
  bag through several component layers while letting each layer consume only its slice.
  `experience/styling`'s `generateTextFormatStyles`, `generatePaddingClass`,
  `generateThemeTextSizeProperty` compute heading/link weight-style-decoration and DXP theme text
  size classes from builder JSON blobs (`headingTextDecoration`, `textDisplayInfo`) at the
  `searchFilters`/`searchFiltersPanel` layer [os:searchFilters/searchFilters.js:4,33-134].
- Mobile/desktop is handled by `@media` queries inside `.scoped.css` toggling CSS custom properties
  (`--show-icon`/`--show-input`) rather than JS form-factor branching in `os`
  [os:searchInputContainer/searchInputContainer.scoped.css:1-14] — consistent with the
  `os:searchFilters` vs `col:searchFilters` divergence noted above (CSS-only responsive vs.
  `getFormFactor` wire).

## Candidate generation rules

1. When a CMS-page-facing `search` component needs live results/filter/sort state, bind it via a
   `{!Search.*}` `js-meta.xml` default expression on a `String`-typed `@api` property, not a wire
   adapter — `{!Search.Results}`, `{!Search.Results.total}`, `{!Search.Results.pageSize}`,
   `{!Search.ClientState.loading}`, `{!Search.ClientState.showFilters}`,
   `{!Search.Pagination.currentPage}`, `{!Search.SortRules.rules}`,
   `{!Search.SortRules.currentSortRuleId}`, `{!Search.Results.productLoadedCount}`,
   `{!Search.Name}`, `{!Route.term}` are all attested expressions in this family
   [os:searchResults/searchResults.js-meta.xml:16-23], [os:searchFilters/searchFilters.js-meta.xml:19-24],
   [os:searchResultsLayoutEmpty/searchResultsLayoutEmpty.js-meta.xml:19-20]. Wire adapters (`ProductSearchSuggestionAdapter`,
   `ProductSearchAdapter`) are reserved for components that are **not** page-injected — e.g. a
   standalone search box needing live suggestions, or a self-contained modal that must fetch its
   own facets (see rule 8 for the tradeoff).
2. Never gate rendering on a `{!Search.*}`-bound prop with a plain truthiness check
   (`if (this.searchResultsTotal)`); it will misrender while the value is `undefined` on first
   paint. Use the explicit three-state pattern from `searchResultsLayoutEmpty`: loader while
   `undefined`/`null`/loading, "no results" only when the value is exactly `0` and not loading,
   results otherwise [os:searchResultsLayoutEmpty/searchResultsLayoutEmpty.js:14-22].
3. Facet/sort/category/paging changes must flow as a bubbling, composed `CustomEvent` from the leaf
   input up to the single CMS-page-facing ancestor (`searchFilters`/`searchSortMenu`/`searchResults`)
   that owns the `commerce/actionApi` `dispatchAction` call — do not call `dispatchAction` from a
   leaf component. Follow the four-hop chain: leaf event → `searchFiltersPanel` aggregates/debounces
   → bubbles through `searchFiltersUi` untouched → `searchFilters` calls
   `createSearchFiltersUpdateAction`/`createSearchFiltersClearAction`/etc.
   [os:searchFiltersPanel/searchFiltersPanel.js:205-273], [os:searchFilters/searchFilters.js:172-220].
4. Debounce rapid facet-toggle bursts (checkbox spam) before dispatching an action, but dispatch
   price-range applies and single discrete actions (clear all, sort change, page change)
   immediately — copy `searchFiltersPanel`'s 300ms `debounce` around the map-flush, not around
   every individual toggle handler [os:searchFiltersPanel/searchFiltersPanel.js:224-252].
5. For a `role="combobox"` input backed by a `role="listbox"`, drive `aria-expanded`,
   `aria-controls`, and `aria-activedescendant` from a single owning component's state and push
   them down as `@api` properties (not template `aria-*` bindings computed independently in each
   child) — replicate `searchCombobox`'s `syncA11y()`/property-relay pattern
   [os:searchCombobox/searchCombobox.js:209-231], and keep every component in that chain
   `static renderMode = 'light'` since the relay uses `querySelector`.
6. Bind option selection on `onmousedown`, not `onclick`, for any listbox option that lives next to
   an input with an `onblur` handler — `mousedown` fires before `blur`, so the option's own
   selection handler runs before the input's blur-driven "close the list" handler would otherwise
   swallow the click [os:searchListBoxOption/searchListBoxOption.js:32-40].
7. Announce async result-count/loading changes through a visually-hidden `role="status"
   aria-live="polite" aria-atomic="true"` region that mirrors the same loading/loaded booleans
   driving the visible spinner — do not rely on a toast or on sighted-only text changes for this
   [os:searchResultsUi/searchResultsUi.html:2-9].
8. Choose the results-renderer shape deliberately, not by habit: `searchResults`/`searchResultsUi`
   (parent owns paging, dispatches `updatecurrentpage` up) is the composable default; only reach
   for the self-contained `searchResultsGrid`/`searchResultsList` (own paging state, own
   `dispatchAction` calls, `loadMore`/`loadPrevious` support, `window` event listeners) when the
   page needs a standalone results block with "load more" behavior that
   `searchResults`/`searchResultsUi` doesn't offer
   [os:searchResultsGrid/searchResultsGrid.js:1-9,200-209].
9. When auto-focusing a newly revealed item (e.g. "show N more" in a facet list), stamp
   `focusOnInit` on exactly the first new item and guard the actual `.focus()` call in
   `renderedCallback` with a "have I already focused once" flag so re-renders don't repeatedly
   steal focus — copy `searchInputFacet`/`searchFacetItem`'s
   `focusOnInit`/`hasInitiallyFocused`/`hasRenderedAtLeastOnce` trio
   [os:searchInputFacet/searchInputFacet.js:18-29], [os:searchFacetItem/searchFacetItem.js:26-33,37].
10. When a filter/modal panel opens, move focus into it after the CSS transition completes (not
    immediately, or it will be a no-op on a still-hidden element) and wrap it in a shared focus-trap
    primitive rather than hand-rolling tab-trapping — copy
    `searchFiltersPanel`'s `setTimeout(FILTERS_PANEL_TRANSITION_DURATION)` +
    `site-common-focus-trap-manager` pattern [os:searchFiltersPanel/searchFiltersPanel.js:274-284],
    [os:searchFiltersPanel/searchFiltersPanel.html:2-6].
11. Suppress a suggestions/search wire adapter by feeding it a `null` reactive parameter rather than
    branching in the callback — gate `searchTerm` behind a getter that returns `null` until the
    relevant "enabled" flag and "has been interacted with" conditions are both true, matching
    `searchSuggestionsWiredTerm` in both `searchInput` and `searchInputContainer`
    [os:searchInput/searchInput.js:128-130], [os:searchInputContainer/searchInputContainer.js:131-134].
12. Route currency-formatted facet/price text through `site/commonFormatterCurrency`, never through
    manual `Intl.NumberFormat`/string concatenation — used consistently for facet range labels,
    the Price facet name suffix, and selected-filter chip labels
    [os:searchPriceRangeFacet/searchPriceRangeFacet.js:2], [os:searchFacet/searchFacet.js:2,45-49],
    [os:searchFiltersPanel/searchFiltersPanel.js:6,68-73].

## Candidate review rules / anti-patterns

1. Flag any `search`-family component that reads a `{!Search.*}`-bound `@api` prop with `if
   (this.prop)` / `this.prop &&` instead of explicit `undefined`/`null` handling — it will treat
   "not yet loaded" the same as "loaded, empty," which is a real user-visible bug class this family
   guards against everywhere it matters (`searchResultsLayoutEmpty`
   [os:searchResultsLayoutEmpty/searchResultsLayoutEmpty.js:14-22]).
2. Flag a leaf facet/filter input that calls `commerce/actionApi` `dispatchAction` directly instead
   of dispatching a local `CustomEvent` for an ancestor to translate — this family's contract
   is a single dispatch point per state slice (`searchFilters` for filters/category/sort/panel-open,
   `searchResults`/`searchResultsGrid`/`searchResultsList` for paging). A second dispatch point
   invites out-of-order/duplicate actions [os:searchFilters/searchFilters.js:172-220].
3. Flag a `role="listbox"`/`role="option"` pairing where `aria-selected`/`aria-activedescendant` is
   computed independently in the option component from local state, rather than being pushed down
   from the single component that owns keyboard-highlight state — divergent state between
   "keyboard highlighted index" and "aria-selected" is exactly what
   `searchListbox.html`'s single `item.highlight` boolean prevents
   [os:searchListbox/searchListbox.html:12].
4. Flag any `renderMode` other than `'light'` anywhere in a `searchCombobox`/`searchListbox`/
   `searchInputSuggestions`-style a11y-relay chain — the whole imperative `querySelector` +
   property-then-attribute pattern silently breaks (throws or no-ops) across a shadow boundary,
   and there is zero precedent for shadow DOM anywhere in this family (33/33 `os` search bundles
   inspected use light DOM).
5. Flag a click-to-select handler on a listbox option (`onclick`) placed next to an input with an
   `onblur`/`onfocusout` handler that hides the list — this is a documented race in this codebase
   (blur fires before click) that the family avoids everywhere via `onmousedown`
   [os:searchListBoxOption/searchListBoxOption.html:3]. An `onclick`-based option selector paired
   with a naive `onblur` list-hide is a functional bug (the list disappears before the click
   registers), not just a style nit.
6. Flag debounce durations hard-coded inline instead of as a named constant, and flag *any*
   individual-facet-toggle handler that dispatches on every keystroke/click without debouncing —
   this family standardizes on ~300ms (`INPUT_DEBOUNCE_DELAY` in `searchCombobox`'s `./constants`,
   `300` literal in `searchFiltersPanel`, `SUGGESTIONS_DEBOUNCE_TIME = 300` in
   `searchInputContainer`) [os:searchFiltersPanel/searchFiltersPanel.js:252],
   [os:searchInputContainer/searchInputContainer.js:11]; an un-debounced facet checkbox list will
   flood `dispatchAction` calls on rapid toggling.
7. Flag a loading/result-count UI update that only changes visible text/spinner state without a
   paired `aria-live` region — screen reader users get no signal that a search re-ran. Every
   loading/count surface in this family pairs a visible spinner with a `role="status"
   aria-live="polite"` announcement [os:searchResultsUi/searchResultsUi.html:2-9],
   [os:searchInputSuggestions/searchInputSuggestions.html:35-37].
8. Flag a facet/filter panel that appears/disappears via CSS visibility alone without moving focus
   into it and without a focus trap — `searchFiltersPanel` is the canonical counter-example
   (explicit `.focus()` on close after the transition, wrapped in
   `site-common-focus-trap-manager`) [os:searchFiltersPanel/searchFiltersPanel.js:274-284].
9. Flag any `commerce/productApi` wire adapter (`ProductSearchSuggestionAdapter`,
   `ProductSearchAdapter`) invoked with a reactive parameter that is *always* truthy/non-null —
   every legitimate use in this family gates the parameter to `null` under some condition to
   suppress unwanted calls (empty term, suggestions disabled, not yet focused); an always-on wire
   param is very likely firing more requests than intended
   [os:searchInput/searchInput.js:128-130], [os:searchInputContainer/searchInputContainer.js:131-134].
10. Flag `window.addEventListener` usage for component-to-component communication within this
    family without a corresponding, discoverable `dispatchEvent` on `window` somewhere in the same
    codebase — `filterchanged`/`morepagesavailable` in `searchResultsGrid`/`searchResultsList` are
    the one place this pattern appears and its dispatcher was **not** found in the `search` family
    source (see Anomalies); treat new instances of this pattern as needing an explicit source-of-truth
    check before reuse, since it bypasses the LWC event/prop data flow entirely.
11. Flag `lightning-formatted-rich-text` (or any HTML-string-producing getter) fed a raw,
    unsanitized `@api` string interpolated directly into markup, e.g. building `<span
    style="...">${text}</span>` by template literal — `searchListBoxOptionInline._displayText`
    does this with `this._item.text` and relies entirely on `lightning-formatted-rich-text`'s own
    sanitization rather than pre-sanitizing [os:searchListBoxOptionInline/searchListBoxOptionInline.js:23-31];
    acceptable only because the consuming component sanitizes, but flag any new call site that
    does the same string-building without confirming the consumer sanitizes.

## Anomalies & divergences

- **"Open questions for deep reads" — chased against the authoritative curated census**: the
  scratchpad `census.md` this note was drafted against has no such section, but the curated,
  checked-in census this repo treats as authoritative — `research/b2b-commerce/findings-api-census.md`
  — does have one (`## Open questions for deep reads`, 8 numbered chase-items). Closing out the
  items relevant to `search`:
  - **Item 2** (`commerce/actionApi` — which action names are actually dispatched, not just the
    module import count) is already answered in full by this note's Data access section: the 9
    action creators `createSearchFiltersUpdateAction`, `createSearchFiltersClearAction`,
    `createSearchCategoryClearAction`, `createSearchSortUpdateAction`,
    `createSearchOpenFilterPanelAction`, `createSearchFilterPanelUpdateAction`,
    `createCartItemAddAction`, `createLoadMoreAction`, `createLoadPreviousAction`, all dispatched
    via `dispatchAction(this, action)` [os:searchFilters/searchFilters.js:2,179-219] (see also the
    call-site breakdown in Events & communication step 4).
  - **Items 3 & 4** (rare-module imports / meta-less bundles possibly missed by the census's regex
    parser) are already cross-referenced against the actual source in this note: no `search` bundle
    appears in the census's "rare modules" list, and the census's "no js-meta.xml properties" list
    (both `os` and `col`) matches the internal/composition-primitive components already identified
    by reading the source in Composition & structure (`searchCombobox`, `searchFacet`,
    `searchFacetItem`, `searchFiltersUi`, `searchInputFacet`, `searchInputSuggestions`,
    `searchListbox`, `searchListBoxOption`, `searchListBoxOptionInline`, `searchPagingControl`,
    `searchPriceRangeFacet`, `searchProductCard`, `searchProductField`, `searchProductGrid`,
    `searchProductSuggestionCardUi`, `searchProductSuggestionsGridUi`, `searchResultsLayout`,
    `searchResultsUi`, `searchSortMenuUi`, `searchSuggestionsUi` for `os`; `col:searchCategoryTree`,
    `col:searchFacet`, `col:searchFacetItem`, `col:searchFilters`, `col:searchFiltersModal`,
    `col:searchFiltersModalPanel`, `col:searchFiltersPanel`, `col:searchInputFacet`,
    `col:searchPagingControl`, `col:searchProductCard`, `col:searchProductField`,
    `col:searchProductGrid`, `col:searchResults`, `col:searchSliderFacet`, `col:searchSortMenu`) —
    no new information beyond what the source read already surfaced; ruled out, not still open.
  - **Item 6** (is `col`'s `c.*` label namespace vs. `os`'s `site.*` a deliberate separation or an
    extraction artifact?) is resolvable, not undecidable: the two prefixes come from two
    structurally different Salesforce label metadata types, not from two different values of the
    same namespace setting. `os` labels are `sfdc_cms__label` (DigitalExperienceBundle
    site-scoped labels, embedded per-site) — `site.` is that metadata type's fixed reserved
    prefix, e.g. `os:searchFiltersPanel` sourcing `site.searchFiltersPanel.*`
    [os:searchFiltersPanel/searchFiltersPanel.js:2]. `col` labels are org-wide `CustomLabels`
    metadata (`force-app/main/default/labels/*.labels-meta.xml`, outside this note's `col` source
    root) with no package namespace declared in `col`'s `sfdx-project.json`
    (`"namespace": ""`), so label references default to the standard unnamespaced `c.` scope, e.g.
    `col:searchFiltersPanel` sourcing `c.Search_Facets_filtersHeader`
    [col:searchFiltersPanel/searchFiltersPanel.js:9]. Conclusion: **deliberate**, in the sense that
    each repo's authors picked the label mechanism appropriate to how that repo packages/deploys
    (`os` as an Experience Cloud site bundle, `col` as an unnamespaced unmanaged package) — it is
    not evidence of a labels-only extraction artifact.
  - **Item 7** (is `col:searchProductCard`'s adapter usage contract-equivalent to `os`'s?) — closed
    for `search`: `searchProductCard` in both repos wires only `commerce/cartApi`
    `CartStatusAdapter` (neither uses `ProductSearchAdapter` — that adapter appears only on
    `col:searchFiltersModalPanel`, already covered above under "Wire adapters used directly by
    `search` components"), and both derive the same `isCartProcessing` boolean from the same wired
    shape: `os:searchProductCard.isCartProcessing` returns
    `!!this._cartStatus?.data?.isProcessing || !!this._cartStatus?.loading`
    [os:searchProductCard/searchProductCard.js:6,30-36,275-277] and
    `col:searchProductCard.isCartProcessing` returns
    `!!this.cartStatus?.data?.isProcessing || !!this.cartStatus?.loading`
    [col:searchProductCard/searchProductCard.js:14,272-273,711-713] — same module, same wired
    property path, same derived boolean. Contract-equivalent for this pair.
  - **Item 5** (zero test coverage) — see the standalone bullet below; it holds for `search` too.
- **Zero test coverage (census open-question item 5) holds for `search` too**: no `__tests__`
  directory and no `*.test.js` file exists anywhere under either repo's `search`-family bundles
  (all 33 `os` + 19 `col` bundles read/skimmed for this note) — Jest specs are not available to
  learn testing patterns from for this family.
- **`searchInputFacet` is not paired 1:1 across repos**: `os:searchInputFacet` accepts a
  `showFacetCounts` prop [os:searchInputFacet/searchInputFacet.js:9-10] that flows into
  `displayLabel` on `searchFacetItem` [os:searchFacetItem/searchFacetItem.js:14-17], while
  `col:searchInputFacet` has no `showFacetCounts` prop at all (census apiProps: `values, type,
  facetName` only) — the `col` facet-count display toggle does not exist; counts, if shown, are
  unconditional in `col`.
- **Three parallel, non-composed results renderers** (`searchResults`/`searchResultsUi`,
  `searchResultsGrid`, `searchResultsList`) each independently re-implement paging/load-more state
  and each independently bind `{!Search.Results}`/`{!Search.Results.total}`/
  `{!Search.Results.pageSize}`/`{!Search.Pagination.currentPage}`/`{!Search.ClientState.loading}`.
  This is not a bug, but it means "the search results component" is ambiguous inside this family —
  any consuming skill/guidance must ask which of the three shapes (paginated grid/list toggle,
  standalone infinite grid, standalone infinite list) is wanted before generating code.
- **`os` vs `col` filters-panel architecture diverges completely, not just in labels**: `os`'s
  filters flow is entirely receive-`{!Search.Results}`-from-page / no direct data fetch anywhere in
  the panel tree, with a single CSS-responsive slide-over panel
  [os:searchFiltersUi/searchFiltersUi.js:1-112]. `col`'s flow branches on `getFormFactor` at the
  top (`col:searchFilters`) [col:searchFilters/searchFilters.js:34-38] into either an inline panel
  or a `lightning/modal`-based `searchFiltersModal` wrapping `searchFiltersModalPanel`, and
  `searchFiltersModalPanel` **wires `ProductSearchAdapter`/`ProductCategoryPathAdapter` itself** to
  fetch facets/categories independently of whatever `{!Search.Results}` the page injected
  [col:searchFiltersModalPanel/searchFiltersModalPanel.js:190-209]. Per the citation-precedence
  rule, `os` is the current pattern to teach; the `col` self-fetching-modal shape is a documented
  alternative for mobile-specific filter UX, not the default.
- **`window`-scoped `filterchanged`/`morepagesavailable` events have listeners but no in-family
  dispatcher** (see Events & communication and review rule 10) — `searchResultsGrid`/
  `searchResultsList` are wired to react to events this repo's `search` family never fires; the
  dispatcher is presumably platform/runtime code outside `sfdc_cms__lwc`/`lwc`, but that could not
  be confirmed from this family's source alone.
- **`searchInputContainer` is architecturally independent of `searchInput`/`searchCombobox`**, not
  a variant built on top of it — it directly renders `site-search-suggestions-ui` with its own
  slotted markup and its own debounce/wire logic
  [os:searchInputContainer/searchInputContainer.js:1-396], while `searchInput` composes
  `searchInputUi` → `searchCombobox` → `searchInputSuggestions`. Both are `isExposed: true` with
  builder `targetConfigs` (two independently CMS-placeable search boxes with different feature
  sets: `searchInputContainer` supports best-seller/product suggestions and recent-search headers;
  `searchInput`/`searchCombobox` supports advanced-search-item / highlightning and a differently
  themed suggestions dropdown). Treat them as two distinct, non-interchangeable search-box
  components, not as container/presentation halves of one component.
