# B2B Commerce Research (Stages 1–2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce evidence-backed research findings (four docs) plus `research/b2b-commerce/plan.md` from an exhaustive census + guided deep reads of Salesforce's two B2B Commerce LWC repos, per the approved spec `docs/superpowers/specs/2026-07-02-b2b-commerce-skills-design.md`.

**Architecture:** A zero-dependency Node census script sweeps all ~410 LWC bundles in both repos and emits complete inventory tables (module imports, wire adapters, expression bindings, Apex usage, structure). Per-family deep-read tasks then write citation-backed notes into `research/b2b-commerce/notes/`. Four synthesis tasks turn census + notes into the findings docs, and a final task writes the Stage-3 `plan.md`. Gate 1 (user review) ends this plan.

**Tech Stack:** Node ≥ 18 (built-in `fs`/`path` only — repo convention is zero dependencies), Git Bash, ripgrep for spot checks.

## Global Constraints

Copied from the spec — every task inherits these:

- **No sf-skills references.** Nothing written into `research/` may present `generating-lwc-components`, `applying-slds`, or any sf-skills skill as a dependency or router target. `reviewing-lwc` is the only skill named as a quality gate.
- **Open-source repo is authoritative.** Where the two repos conflict, `b2b-commerce-open-source-components` wins; record the divergence in the notes/findings.
- **Every claim cites code.** Findings and notes cite sources as `[os:<bundle>/<file>:<line>]` or `[col:<bundle>/<file>:<line>]` (roots defined in Task 1). The citation checker must pass before any commit.
- **Census scripts are scratchpad-only** — never committed. Committed artifacts: `research/b2b-commerce/**` docs only.
- **Checkpoint commits are granted** (recorded in the spec): the main agent commits at the end of each task on `feature/commerce-b2b-open-source-patterns`. Subagents never commit — they leave changes in the working tree and the main agent commits after review. Never push. End every commit message with:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01BdyTxtzWvyiKWTHHjRXi1b`
- **Paths.** `SCRATCH` = the session scratchpad directory (`C:\Temp\claude\D--Documents-Claude-salesforce-skills-agents\c5be3fd9-2623-4e22-93f1-7c7e26c830b7\scratchpad` this session; if executing in a new session, use that session's scratchpad and re-create the scripts there — they are throwaways by design).
  - `OS_ROOT` = `D:\Documents\Claude\Salesforce-B2B-Repos\b2b-commerce-open-source-components-main\b2b-commerce-open-source-components-main\force-app\main\default\sfdc_cms__lwc`
  - `OS_LABELS` = same repo, `...\force-app\main\default\sfdc_cms__label`
  - `COL_ROOT` = `D:\Documents\Claude\Salesforce-B2B-Repos\commerce-on-lightning-components-release\commerce-on-lightning-components-release\force-app\main\default\lwc`
  - `COL_REPO` = `D:\Documents\Claude\Salesforce-B2B-Repos\commerce-on-lightning-components-release\commerce-on-lightning-components-release`

## Ground truth already verified (do not re-derive)

- `OS_ROOT` has **372** bundles; `COL_ROOT` has **38** (37 components + `jsconfig.json`).
- OS bundle anatomy: `<name>.js`, `<name>.html`, `<name>.js-meta.xml`, `content.json`, `_meta.json` (+ optional extra `.js` utils). **Expression bindings live in `js-meta.xml`**: `<property name="items" type="String" default="{!Cart.Items}">` — a `default` starting with `{!` is page-data binding; others are builder settings. `designLayout` sections group builder properties.
- OS repo has **zero** `__tests__` directories; COL repo has Jest + `jest-sa11y-setup.js`.
- Import style is standard ESM. Example from `cartItems.js`: `import { createCartItemDeleteAction, ..., dispatchAction } from 'commerce/actionApi';` and `import { generateStyleProperties, generateTextFontSize } from 'experience/styling';`.
- Family prefix counts (OS): product 56, checkout 54, common 48, order 42, cart 35, search 33, quote 26, myAccount 15, subscription 11, payment 10, promotion 8, layout+themelayout 10, legal 3, reorder 3, buyer 2, selfRegister 2, topSellers 2, splitShipment 1, multiCart 1, marketing 1, commerceErrors 1.

---

### Task 1: Census script, run, and `findings-api-census.md`

**Files:**
- Create: `SCRATCH/census.mjs` (throwaway, never committed)
- Create: `SCRATCH/check-citations.mjs` (throwaway, never committed)
- Create: `research/b2b-commerce/findings-api-census.md`
- Create: `research/b2b-commerce/notes/TEMPLATE.md`

**Interfaces:**
- Produces: `SCRATCH/census.json` (per-bundle records: `{repo, name, family, imports: {module: [names]}, wires: [{adapter, module}], apiProps: [..], metaProps: [{name, type, default, expression: bool}], hasUiPair, hasLabelBundle, hasTests, targets: [..]}`) and `SCRATCH/census.md` (raw tables) — consumed by every later task.
- Produces: `node SCRATCH/check-citations.mjs <file.md>` → exit 0 when every `[os:…]`/`[col:…]` citation resolves — used by every later task's verification step.
- Produces: `research/b2b-commerce/notes/TEMPLATE.md` — the notes skeleton every deep-read task fills in.

- [ ] **Step 1: Write the census script**

Write `SCRATCH/census.mjs` with exactly this content:

```js
import fs from 'node:fs';
import path from 'node:path';

const SCRATCH = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const OS_ROOT = String.raw`D:\Documents\Claude\Salesforce-B2B-Repos\b2b-commerce-open-source-components-main\b2b-commerce-open-source-components-main\force-app\main\default\sfdc_cms__lwc`;
const OS_LABELS = String.raw`D:\Documents\Claude\Salesforce-B2B-Repos\b2b-commerce-open-source-components-main\b2b-commerce-open-source-components-main\force-app\main\default\sfdc_cms__label`;
const COL_ROOT = String.raw`D:\Documents\Claude\Salesforce-B2B-Repos\commerce-on-lightning-components-release\commerce-on-lightning-components-release\force-app\main\default\lwc`;

const FAMILY_RULES = [
  ['cart', /^(cart|multiCart)/],
  ['checkout', /^(checkout|payment|legal|splitShipment)/],
  ['product', /^(product|topSellers|builderProduct)/],
  ['search', /^(search|builderSearch)/],
  ['order', /^(order|reorder)/],
  ['quote', /^quote/],
  ['subscription', /^subscription/],
  ['account', /^(myAccount|selfRegister)/],
  ['promotion', /^promotion/],
  ['common', /^(common|buyer|commerce|layout|themelayout|marketing)/],
];
const familyOf = (n) => (FAMILY_RULES.find(([, re]) => re.test(n)) ?? ['other'])[0];

function listBundles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
}

// Parse all import statements in a JS source. Returns [{module, names:[..], raw}].
function parseImports(src) {
  const out = [];
  // "import <clause> from '<module>'" (clause may span lines) and bare "import '<module>'"
  const re = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g;
  for (const m of src.matchAll(re)) {
    if (m[3]) { out.push({ module: m[3], names: [], raw: m[0] }); continue; }
    const clause = m[1];
    const names = [];
    const braced = clause.match(/\{([\s\S]*?)\}/);
    if (braced) {
      for (const part of braced[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop().trim();
        if (name) names.push(name);
      }
    }
    const def = clause.replace(/\{[\s\S]*?\}/, '').replace(/[,*\s]+as\s+\w+/, '').replace(/[,\s]/g, '');
    if (def) names.push(def);
    out.push({ module: m[2], names, raw: m[0] });
  }
  return out;
}

function parseMetaProps(xml) {
  const props = [];
  for (const m of xml.matchAll(/<property\s+([^>]*?)\/?>/g)) {
    const attrs = {};
    for (const a of m[1].matchAll(/(\w+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    if (!attrs.name) continue;
    props.push({ name: attrs.name, type: attrs.type ?? '', default: attrs.default ?? '', expression: (attrs.default ?? '').startsWith('{!') });
  }
  return props;
}

function scanBundle(repo, root, name, allNames) {
  const dir = path.join(root, name);
  const files = fs.readdirSync(dir);
  const rec = { repo, name, family: familyOf(name), imports: {}, wires: [], apiProps: [], metaProps: [], hasUiPair: allNames.has(name + 'Ui'), hasLabelBundle: repo === 'os' && fs.existsSync(path.join(OS_LABELS, name)), hasTests: fs.existsSync(path.join(dir, '__tests__')), targets: [] };
  const nameToModule = {};
  for (const f of files.filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const imp of parseImports(src)) {
      (rec.imports[imp.module] ??= []).push(...imp.names);
      for (const n of imp.names) nameToModule[n] = imp.module;
    }
    for (const m of src.matchAll(/@wire\(\s*([A-Za-z_$][\w$]*)/g)) rec.wires.push({ adapter: m[1], module: nameToModule[m[1]] ?? '?' });
    for (const m of src.matchAll(/@api\s+(?:get\s+)?([A-Za-z_$][\w$]*)/g)) rec.apiProps.push(m[1]);
  }
  const metaPath = path.join(dir, name + '.js-meta.xml');
  if (fs.existsSync(metaPath)) {
    const xml = fs.readFileSync(metaPath, 'utf8');
    rec.metaProps = parseMetaProps(xml);
    rec.targets = [...xml.matchAll(/<target>([^<]+)<\/target>/g)].map((m) => m[1]);
  }
  return rec;
}

const records = [];
for (const [repo, root] of [['os', OS_ROOT], ['col', COL_ROOT]]) {
  const names = listBundles(root);
  const nameSet = new Set(names);
  for (const n of names) records.push(scanBundle(repo, root, n, nameSet));
}
fs.writeFileSync(path.join(SCRATCH, 'census.json'), JSON.stringify(records, null, 1));

// ---- census.md ----
const lines = [];
const byRepo = (r) => records.filter((x) => x.repo === r);
lines.push('# B2B Commerce LWC census (generated)', '');
lines.push(`Bundles: os=${byRepo('os').length}, col=${byRepo('col').length}`, '');

lines.push('## Bundles per family', '', '| family | os | col |', '|---|---|---|');
const fams = [...new Set(records.map((r) => r.family))].sort();
for (const f of fams) lines.push(`| ${f} | ${byRepo('os').filter((r) => r.family === f).length} | ${byRepo('col').filter((r) => r.family === f).length} |`);

lines.push('', '## Module imports (all)', '', '| module | os bundles | col bundles | families |', '|---|---|---|---|');
const mods = {};
for (const r of records) for (const m of Object.keys(r.imports)) { (mods[m] ??= { os: new Set(), col: new Set(), fams: new Set() }); mods[m][r.repo].add(r.name); mods[m].fams.add(r.family); }
for (const [m, v] of Object.entries(mods).sort((a, b) => (b[1].os.size + b[1].col.size) - (a[1].os.size + a[1].col.size))) {
  if (m.startsWith('.')) continue; // relative imports are structure, not API surface
  lines.push(`| \`${m}\` | ${v.os.size} | ${v.col.size} | ${[...v.fams].sort().join(', ')} |`);
}

lines.push('', '## Wire adapters', '', '| adapter | module | uses | sample components |', '|---|---|---|---|');
const wires = {};
for (const r of records) for (const w of r.wires) { const k = `${w.adapter} ${w.module}`; (wires[k] ??= []).push(`${r.repo}:${r.name}`); }
for (const [k, users] of Object.entries(wires).sort((a, b) => b[1].length - a[1].length)) {
  const [adapter, module] = k.split(' ');
  lines.push(`| \`${adapter}\` | \`${module}\` | ${users.length} | ${users.slice(0, 5).join(', ')} |`);
}

lines.push('', '## Expression bindings (js-meta.xml property defaults starting with `{!`)', '', '| expression root | count | sample property (component) |', '|---|---|---|');
const exprs = {};
for (const r of records) for (const p of r.metaProps.filter((p) => p.expression)) {
  const root = p.default.match(/^\{!([\w]+)/)?.[1] ?? p.default;
  (exprs[root] ??= []).push(`\`${p.default}\` → ${p.name} (${r.repo}:${r.name})`);
}
for (const [root, list] of Object.entries(exprs).sort((a, b) => b[1].length - a[1].length)) lines.push(`| \`{!${root}…}\` | ${list.length} | ${list[0]} |`);
lines.push('', '### All expression-bound properties');
for (const r of records) for (const p of r.metaProps.filter((p) => p.expression)) lines.push(`- ${r.repo}:${r.name} — \`${p.name}\` = \`${p.default}\` (${p.type})`);

lines.push('', '## Apex imports (@salesforce/apex*)');
let apexCount = 0;
for (const r of records) for (const m of Object.keys(r.imports)) if (m.startsWith('@salesforce/apex')) { apexCount++; lines.push(`- ${r.repo}:${r.name} imports \`${m}\``); }
if (!apexCount) lines.push('- NONE — zero Apex imports across both repos');

lines.push('', '## Structure per family', '', '| repo | family | bundles | Ui pairs | label bundles | with tests |', '|---|---|---|---|---|---|');
for (const repo of ['os', 'col']) for (const f of fams) {
  const rs = byRepo(repo).filter((r) => r.family === f);
  if (rs.length) lines.push(`| ${repo} | ${f} | ${rs.length} | ${rs.filter((r) => r.hasUiPair).length} | ${rs.filter((r) => r.hasLabelBundle).length} | ${rs.filter((r) => r.hasTests).length} |`);
}

lines.push('', '## Anomalies', '', '### Rare modules (imported by ≤2 bundles)');
for (const [m, v] of Object.entries(mods)) {
  const total = v.os.size + v.col.size;
  if (!m.startsWith('.') && total <= 2) lines.push(`- \`${m}\` ← ${[...v.os].map((n) => 'os:' + n).concat([...v.col].map((n) => 'col:' + n)).join(', ')}`);
}
lines.push('', '### Bundles with no js-meta.xml properties (non-builder / internal components)');
for (const r of records) if (r.metaProps.length === 0) lines.push(`- ${r.repo}:${r.name}`);

fs.writeFileSync(path.join(SCRATCH, 'census.md'), lines.join('\n'));
console.log(`census: ${records.length} bundles (os=${byRepo('os').length}, col=${byRepo('col').length}); apex imports: ${apexCount}; wrote census.json + census.md`);
```

- [ ] **Step 2: Run the census**

Run: `node "SCRATCH/census.mjs"` (substitute the real scratchpad path)
Expected: `census: 409 bundles (os=372, col=37); apex imports: <n>; wrote census.json + census.md` — os MUST be 372. col is 37 or 38 depending on whether `jsconfig.json` is filtered by the directory check (it is a file, so 37 directories is correct; if the count differs, list `COL_ROOT` and reconcile before continuing).

- [ ] **Step 3: Spot-check the census against ripgrep (2 checks)**

Check A — `commerce/cartApi` os bundle count matches:
`rg -l "from 'commerce/cartApi'" "OS_ROOT" | sed -E 's|.*sfdc_cms__lwc[/\\]([^/\\]+).*|\1|' | sort -u | wc -l`
Expected: equals the `commerce/cartApi` os column in `census.md`.

Check B — Apex import count matches:
`rg -l "@salesforce/apex" "OS_ROOT" "COL_ROOT" | wc -l`
Expected: consistent with the Apex section of `census.md` (0 lines if the census says NONE).

If either check disagrees, fix the script (most likely the import regex) and re-run before continuing.

- [ ] **Step 4: Write the citation checker**

Write `SCRATCH/check-citations.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = {
  os: String.raw`D:\Documents\Claude\Salesforce-B2B-Repos\b2b-commerce-open-source-components-main\b2b-commerce-open-source-components-main\force-app\main\default\sfdc_cms__lwc`,
  col: String.raw`D:\Documents\Claude\Salesforce-B2B-Repos\commerce-on-lightning-components-release\commerce-on-lightning-components-release\force-app\main\default\lwc`,
};
const file = process.argv[2];
const text = fs.readFileSync(file, 'utf8');
let bad = 0, n = 0;
for (const m of text.matchAll(/\[(os|col):([^\]:]+?)(?::(\d+(?:-\d+)?))?\]/g)) {
  n++;
  if (!fs.existsSync(path.join(ROOTS[m[1]], m[2]))) { bad++; console.log('MISSING', m[0]); }
}
console.log(`${file}: ${n} citations, ${bad} missing`);
process.exitCode = bad ? 1 : 0;
```

Run: `node "SCRATCH/check-citations.mjs" "SCRATCH/census.md"` — trivially passes (0 citations); confirms the script runs.

- [ ] **Step 5: Create the notes template**

Write `research/b2b-commerce/notes/TEMPLATE.md`:

```markdown
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
```

- [ ] **Step 6: Curate `research/b2b-commerce/findings-api-census.md`**

Create the findings doc from `SCRATCH/census.md`. It is the raw census **plus curation** — keep all tables complete (this doc is the exhaustive inventory the spec promises), and add:
- A short intro: what was swept (409 bundles, both repos, script method in one paragraph), and the headline numbers: total bundles, count of distinct `commerce/*` modules, count of distinct `experience/*` modules, wire adapter count, expression-binding count, and the Apex import count (expected 0 — state it plainly either way).
- Group the module-import table into sections: `commerce/*`, `experience/*`, `lightning/*`, `@salesforce/*`, other — each sorted by usage.
- After each table, 2–5 bullet observations (e.g. which modules dominate, which families lean on expressions vs adapters vs imperative calls). Observations reference table rows, not new claims — deep-read tasks provide behavioral evidence later.
- A final section "Open questions for deep reads" listing every anomaly the deep-read tasks must chase (rare modules, meta-less bundles, any Apex imports).

- [ ] **Step 7: Verify and commit**

Run: `node "SCRATCH/check-citations.mjs" research/b2b-commerce/findings-api-census.md` → exit 0.
Run: `git status --short` → confirm ONLY `research/b2b-commerce/` files are staged-able; the scratchpad scripts must not appear.

```bash
git add research/b2b-commerce/
git commit -m "research(b2b): API census over both commerce LWC repos + notes template"
```
(with the two trailer lines from Global Constraints)

---

### Task 2: Deep read — cart family

**Files:**
- Create: `research/b2b-commerce/notes/cart.md`

**Interfaces:**
- Consumes: `research/b2b-commerce/notes/TEMPLATE.md` (structure), `SCRATCH/census.json` + `census.md` (Task 1).
- Produces: `notes/cart.md` — consumed by Tasks 10–13.

- [ ] **Step 1: Pull the family's census slice**

Run: `node -e "const r=require('SCRATCH/census.json').filter(x=>x.family==='cart');console.log(JSON.stringify(r.map(x=>({n:x.name,repo:x.repo,mods:Object.keys(x.imports).filter(m=>!m.startsWith('.')),expr:x.metaProps.filter(p=>p.expression).map(p=>p.default)}),null,1)))"`
Note which bundles use rare modules or unusual expression roots — add them to the read list.

- [ ] **Step 2: Read the archetypes (full read, all bundle files including js-meta.xml)**

From `OS_ROOT`: `cartItems` + `cartItemsUi` (container/leaf pair — the canonical expression-binding archetype: `{!Cart.Items}`, `{!Cart.Pagination}`), `cartContents`, `cartBadge` + `cartBadgeUi`, `cartApplyCoupon` + `cartApplyCouponUi`, `cartClearCartModal` (modal archetype), `cartFailedActionEvaluator` and `cartEvaluatePriceOriginal` (evaluator archetype — likely non-builder), `multiCartBadge`, plus every anomaly from Step 1.

- [ ] **Step 3: Write `notes/cart.md`** following TEMPLATE.md — every section filled, every claim cited `[os:cartItems/cartItems.js:42]`-style. Candidate generation/review rules numbered.

- [ ] **Step 4: Verify and commit**

Run: `node "SCRATCH/check-citations.mjs" research/b2b-commerce/notes/cart.md` → exit 0.

```bash
git add research/b2b-commerce/notes/cart.md
git commit -m "research(b2b): cart family deep-read notes"
```
(with trailers)

---

### Task 3: Deep read — checkout family (incl. payment, legal, split shipment)

**Files:**
- Create: `research/b2b-commerce/notes/checkout.md`

**Interfaces:**
- Consumes: TEMPLATE.md, census (Task 1). Produces: `notes/checkout.md` for Tasks 10–13.

- [ ] **Step 1: Census slice** — same command as Task 2 Step 1 with `family==='checkout'`.
- [ ] **Step 2: Read archetypes** from `OS_ROOT`: `checkoutDeliverymethod`, `checkoutDeliverymethodOptions`, `checkoutInputAddress`, `checkoutAddresses`, `checkoutPaymentSheet`, `checkoutSummary`, `checkoutErrorHandler`, `checkoutNotification`, `paymentByExpress`, `paymentProcessing`, `legalConsentOptions`, `splitShipmentLayout`, plus Step-1 anomalies. Pay specific attention to: mutation **sequencing** (await-chains around `commerce/checkoutApi`), polling/notify patterns, payment component isolation, and the checkout-component contract (how children integrate with the checkout engine).
- [ ] **Step 3: Write `notes/checkout.md`** per TEMPLATE.md with citations.
- [ ] **Step 4: Verify and commit** — citation checker → exit 0; `git add research/b2b-commerce/notes/checkout.md && git commit -m "research(b2b): checkout family deep-read notes"` (with trailers).

---

### Task 4: Deep read — product family

**Files:**
- Create: `research/b2b-commerce/notes/product.md`

**Interfaces:**
- Consumes: TEMPLATE.md, census. Produces: `notes/product.md` for Tasks 10–13.

- [ ] **Step 1: Census slice** — `family==='product'`.
- [ ] **Step 2: Read archetypes** from `OS_ROOT`: `productPricing`, `productAddToCartButton` + `productAddQuantity` + `productAddToCartUtils` (action dispatch archetype), `productMediaGallery`, `productBundle` + `productBundleItem` + `productBundleItemUi`, `productFieldsTable` + `productFieldsTableUi`, `productFrequentlyBoughtTogether` + `productFrequentlyBoughtTogetherUi`, `topSellers` + `topSellersUi`, plus anomalies. Attention: `{!Product.*}` expression roots, pricing display rules, quantity rules (min/max/increment), image handling (`experience/picture`-style utilities if present).
- [ ] **Step 3: Write `notes/product.md`** per TEMPLATE.md with citations.
- [ ] **Step 4: Verify and commit** — checker → exit 0; commit `"research(b2b): product family deep-read notes"` (with trailers).

---

### Task 5: Deep read — search family

**Files:**
- Create: `research/b2b-commerce/notes/search.md`

**Interfaces:**
- Consumes: TEMPLATE.md, census. Produces: `notes/search.md` for Tasks 10–13.

- [ ] **Step 1: Census slice** — `family==='search'`.
- [ ] **Step 2: Read archetypes** from `OS_ROOT`: `searchInput` + `searchInputUi` + `searchInputContainer` + `searchInputSuggestions`, `searchFilters` + `searchFiltersUi` + `searchFiltersPanel` + `searchFiltersPanelSection` + `searchFiltersCategoryList` + `searchFiltersSelected`, `searchFacet` + `searchFacetItem`, `searchCombobox`, `searchListBoxOption`, plus any `searchResults*`/`searchSort*` bundles found in the census slice and Step-1 anomalies. Attention: `{!Search.*}` expressions, facet state flow, combobox/listbox a11y.
- [ ] **Step 3: Write `notes/search.md`** per TEMPLATE.md with citations.
- [ ] **Step 4: Verify and commit** — checker → exit 0; commit `"research(b2b): search family deep-read notes"` (with trailers).

---

### Task 6: Deep read — order, quote, and subscription families

**Files:**
- Create: `research/b2b-commerce/notes/order-quote-subscription.md`

**Interfaces:**
- Consumes: TEMPLATE.md, census. Produces: `notes/order-quote-subscription.md` for Tasks 10–13.

- [ ] **Step 1: Census slices** — `family==='order'`, `'quote'`, `'subscription'`.
- [ ] **Step 2: Read archetypes** from `OS_ROOT`: order — `orderDetails`, `orderAmount` + `orderAmountUi`, `orderDeliveryGroup` + `orderDeliveryGroupContainer` + `orderDeliveryGroupUi`, `orderConfirmationItems`, `orderConfirmationTotalsSummary`, `orderConfirmationMessageError`, `reorderButton` + `reorderModal` + `reorderModalContents`; quote — `quoteAcceptandbuyButton`, `quoteList`, `quoteConfirmationItems`, `quoteCartModalUi`; subscription — `subscriptionCard`, `subscriptionCardList`, `subscriptionCardV2` (versioning divergence — note why V2 exists), `subscriptionAmendModal`, `subscriptionStatus`; plus anomalies. Attention: `{!Order.*}` expressions, confirmation-page data flow, B2B-specific surfaces (quotes, subscriptions) that the existing reviewing-lwc reference barely covers.
- [ ] **Step 3: Write `notes/order-quote-subscription.md`** per TEMPLATE.md with citations.
- [ ] **Step 4: Verify and commit** — checker → exit 0; commit `"research(b2b): order/quote/subscription deep-read notes"` (with trailers).

---

### Task 7: Deep read — account and promotion families

**Files:**
- Create: `research/b2b-commerce/notes/account-promotion.md`

**Interfaces:**
- Consumes: TEMPLATE.md, census. Produces: `notes/account-promotion.md` for Tasks 10–13.

- [ ] **Step 1: Census slices** — `family==='account'`, `'promotion'`.
- [ ] **Step 2: Read archetypes** from `OS_ROOT`: `myAccountProfile` + `myAccountProfileUi` + `myAccountProfileEditor` + `myAccountProfileVerification`, `myAccountAddressCard` + `myAccountAddressCardUi`, `myAccountInputAddress`, `myAccountSwitcherModal` + `myAccountSwitcherList` (effective-account switching — B2B-critical), `myAccountUserProfileMenu` + `myAccountUserProfileMenuUi`, `selfRegister` + `selfRegisterUi`, `promotionAppliedDetailsPopover`, `promotionDiscountsApproaching` + `promotionDiscountsApproachingUi`, `promotionSummaryUi`, `promotionEvaluatePriceDiscount`, plus anomalies. Attention: `commerce/effectiveAccountApi` / `commerce/contextApi` usage, `commerce/myAccountApi`, guest/auth guards, promotion evaluation vs re-derivation.
- [ ] **Step 3: Write `notes/account-promotion.md`** per TEMPLATE.md with citations.
- [ ] **Step 4: Verify and commit** — checker → exit 0; commit `"research(b2b): account/promotion deep-read notes"` (with trailers).

---

### Task 8: Deep read — common, layout, and error components

**Files:**
- Create: `research/b2b-commerce/notes/common.md`

**Interfaces:**
- Consumes: TEMPLATE.md, census. Produces: `notes/common.md` for Tasks 10–13.

- [ ] **Step 1: Census slice** — `family==='common'` and `family==='other'` (verify `other` is empty or classify what's in it).
- [ ] **Step 2: Read archetypes** from `OS_ROOT` (run `ls OS_ROOT | grep -E '^(common|layout|themelayout|buyer)'` first and adjust to what exists): `commonBreadcrumbs` + `commonBreadcrumbsUi`, `commonNumberInput`, `commonField`, `commonItemFields`, `commonLoginHandler`, `commonDrilldownNavigation*` set, `commonCountryPickerPanel`, `layoutHeader` + `layoutHeaderUi` + `layoutHeaderOne` + `layoutHeaderSimple`, `layoutFooter` + `layoutFooterUi`, `themelayoutSite`, `commerceErrors` (the shared error-normalization archetype — read fully), `marketingEmailsignup`, `buyerCurrencyFormatter`, `buyerFormattedPrice`, plus anomalies. Attention: shared error utilities, currency/locale formatting, navigation menu APIs, theme-layout structure.
- [ ] **Step 3: Write `notes/common.md`** per TEMPLATE.md with citations.
- [ ] **Step 4: Verify and commit** — checker → exit 0; commit `"research(b2b): common/layout/error deep-read notes"` (with trailers).

---

### Task 9: Deep read — commerce-on-lightning repo (contrast pass)

**Files:**
- Create: `research/b2b-commerce/notes/col-contrast.md`

**Interfaces:**
- Consumes: TEMPLATE.md, census, and the six OS notes files (Tasks 2–8) for divergence comparison.
- Produces: `notes/col-contrast.md` for Tasks 10–13.

- [ ] **Step 1: Census slice** — all `repo==='col'` records.
- [ ] **Step 2: Read** from `COL_ROOT`: `productPricing` (compare directly against os `productPricing` — same concern, different generation), `builderProductPricing` + one more `builder*` wrapper (the exposed-wrapper-around-internal-component pattern), `productQuantitySelector`, `searchFilters`, `commonModal`, `commonButton`. From `COL_REPO`: `jest.config.js`, `jest-sa11y-setup.js`, `force-app/main/default/lwc/jsconfig.json`, `package.json` (scripts), `README.md`. This is the only repo with tests — capture the Jest + sa11y testing patterns in full.
- [ ] **Step 3: Write `notes/col-contrast.md`** per TEMPLATE.md, plus a mandatory **Divergences** section: every place col differs from os patterns (data access, meta exposure, structure, testing), each with both citations and the explicit note that os wins for pattern extraction while col contributes testing/customization patterns os lacks.
- [ ] **Step 4: Verify and commit** — checker → exit 0; commit `"research(b2b): commerce-on-lightning contrast notes"` (with trailers).

---

### Task 10: Write `findings-data-access.md`

**Files:**
- Create: `research/b2b-commerce/findings-data-access.md`

**Interfaces:**
- Consumes: `findings-api-census.md`, all seven `notes/*.md` files.
- Produces: the no-Apex data-access model doc — the primary input for the `generating-b2b-lwc` data-access reference in Stage 3.

- [ ] **Step 1: Write the doc** with this exact structure:
  1. **The data-access ladder** — the decision order the repos demonstrate: (a) expression-bound `@api` properties from `js-meta.xml` defaults (`{!Cart.Items}`, `{!Product.…}`, …) with the undefined-on-first-render contract; (b) wire adapters (each adapter documented in the census); (c) imperative `commerce/*` calls and `commerce/actionApi` action dispatch for mutations; (d) Apex — state what the census found (expected: zero) and what that implies as the last-resort bar. Every rung cites real components.
  2. **Expression binding reference** — every expression root found (`{!Cart.*}`, `{!Product.*}`, …), what data tree it exposes, which property types carry it, worked `js-meta.xml` examples copied from real bundles with citations.
  3. **Per-module API usage** — for each `commerce/*` and `experience/*` module actually used: what the repos use it for, key exports observed, one cited usage example each.
  4. **Mutation patterns** — actionApi dispatch, sequencing/awaiting, processing state, refresh flow after mutations; cited.
  5. **What the repos never do** — pointer to `findings-anti-patterns.md` (no duplication).
- [ ] **Step 2: Verify** — `node "SCRATCH/check-citations.mjs" research/b2b-commerce/findings-data-access.md` → exit 0. Also confirm every `commerce/*` module named in `findings-api-census.md` with ≥3 uses appears in section 3 (grep each module name).
- [ ] **Step 3: Commit** — `git add research/b2b-commerce/findings-data-access.md && git commit -m "research(b2b): no-Apex data-access findings"` (with trailers).

---

### Task 11: Write `findings-component-patterns.md`

**Files:**
- Create: `research/b2b-commerce/findings-component-patterns.md`

**Interfaces:**
- Consumes: census + all `notes/*.md`.
- Produces: structure/composition findings — primary input for the Stage-3 component-structure reference.

- [ ] **Step 1: Write the doc** with sections: bundle anatomy (os `sfdc_cms__lwc` format incl. `content.json`/`_meta.json`, vs col classic format); container/`*Ui` split (when it appears, what each half owns — with the census Ui-pair stats); builder exposure conventions (`js-meta.xml` targets, `paletteSection`, `designLayout` sections, style-type properties); label bundle pairing and i18n interpolation; event/communication contracts; error/loading/guard idioms; a11y idioms; styling (`experience/styling`, custom-property patterns); testing (col-only Jest/sa11y patterns, and the plain statement that os ships without unit tests). Every claim cited.
- [ ] **Step 2: Verify** — citation checker → exit 0.
- [ ] **Step 3: Commit** — `"research(b2b): component structure & convention findings"` (with trailers).

---

### Task 12: Write `findings-anti-patterns.md`

**Files:**
- Create: `research/b2b-commerce/findings-anti-patterns.md`

**Interfaces:**
- Consumes: census + all `notes/*.md` + the current `skills/reviewing-lwc/references/commerce-b2b.md`.
- Produces: the anti-pattern catalog — primary input for the Stage-3 `reviewing-lwc` upgrade.

- [ ] **Step 1: Write the doc** with three sections:
  1. **Demonstrated avoidances** — things the repos systematically don't do, each stated as an anti-pattern + the observed alternative + citations (e.g. if the census shows zero Apex, zero direct `fetch()` to Connect REST, zero UI-API wires on storefront surfaces — each becomes a checkable rule).
  2. **Divergences** — os-vs-col conflicts from `notes/col-contrast.md`, resolved in os's favor, each with the review-time implication.
  3. **Existing reference audit** — go rule-by-rule through the current `commerce-b2b.md` (127 lines): mark each rule CONFIRMED (with new citation), REFINE (code shows something more specific — say what), or UNVERIFIED (no evidence found in either repo; keep only if official docs back it). This section is the concrete diff plan for the Stage-3 upgrade.
- [ ] **Step 2: Verify** — citation checker → exit 0; confirm every current commerce-b2b.md section heading appears in section 3 (grep).
- [ ] **Step 3: Commit** — `"research(b2b): anti-pattern catalog + commerce-b2b.md audit"` (with trailers).

---

### Task 13: Write `research/b2b-commerce/plan.md` (Stage-3 plan) and open Gate 1

**Files:**
- Create: `research/b2b-commerce/plan.md`

**Interfaces:**
- Consumes: all four findings docs + the spec.
- Produces: the plan that governs Stage 3 (skill authoring). Gate 1 = user reviews findings + this plan before any skill file is touched.

- [ ] **Step 1: Write `plan.md`** containing:
  1. **`generating-b2b-lwc` skill outline** — the SKILL.md skeleton (frontmatter description draft with TRIGGER/DO NOT TRIGGER wording, quick-reference table rows drawn from the candidate generation rules in `notes/*.md`, Cross-Skill Integration pointing at `reviewing-lwc` only) and the **final `references/` split** decided by where the findings' weight actually falls (provisional: `data-access.md`, `component-structure.md`, `cart-checkout.md`, `product-search.md` — merge or resplit per evidence volume, and say why). Standalone contract restated: no sf-skills references, no base-LWC re-teaching.
  2. **`reviewing-lwc/references/commerce-b2b.md` upgrade plan** — section-by-section edit list driven directly by the CONFIRMED/REFINE/UNVERIFIED audit in `findings-anti-patterns.md`, plus the new-rule additions with their findings sources.
  3. **Routing changes** — the exact new CLAUDE.md Authoring-table row (worded with zero sf-skills references) and the README update.
  4. **Verification steps for Stage 3** — `npm test` (frontmatter suite auto-covers the new SKILL.md; check `test/claude-md.test.js` and `test/domain-packs.test.js` for encoded skill lists needing updates), `npm run validate:refs` (add `scripts/reference-sources.json` entries for any cited doc URLs if that suite requires it), and the content rule: every skill rule traces to a findings citation or an official Salesforce doc.
  5. **Task breakdown** for Stage 3, bite-sized, each with its review gate.
- [ ] **Step 2: Verify** — citation checker → exit 0 on `plan.md`; grep `plan.md` and all findings docs for `sf-skills`, `generating-lwc-components`, `applying-slds` → the only permitted hits are statements of non-dependency (expected: zero hits in `plan.md` sections 1–3 except the standalone-contract restatement).
- [ ] **Step 3: Commit** — `git add research/b2b-commerce/plan.md && git commit -m "research(b2b): Stage-3 implementation plan for the two skill deliverables"` (with trailers).
- [ ] **Step 4: Open Gate 1 (main agent, not a subagent):** present to the user: the four findings docs, `plan.md`, and the headline numbers (bundle counts, Apex-import count, top modules, expression roots). Stage 3 does not start until the user approves. This ends the current plan.

---

## Self-Review (completed at write time)

- **Spec coverage:** census incl. all five census types (imports/adapters/bindings/apex/structure) → Task 1; deep reads per family incl. the spec's named behavioral patterns → Tasks 2–9 (quote/subscription/payment families discovered during recon are covered — they exceed the spec's illustrative family list, consistent with "full sweep"); four findings docs → Tasks 1, 10, 11, 12; plan.md + Gate 1 → Task 13; open-source-primary weighting → Global Constraints + Task 9; citations → checker in every task; checkpoint commits → every task; scripts-not-committed → Task 1 Step 7 guard.
- **Placeholder scan:** no TBDs; all steps carry real commands, code, or exact content requirements.
- **Type consistency:** `census.json` record shape defined once (Task 1 Interfaces) and consumed by the same field names in Tasks 2–9; citation format `[os:…]`/`[col:…]` identical in checker, template, and all tasks.
