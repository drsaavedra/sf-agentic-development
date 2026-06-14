<!--
  SALESFORCE PROJECT TEMPLATE — Codex baseline
  Rendered from: templates/baseline.md — DO NOT EDIT DIRECTLY.
  Re-render with: node scripts/render-baselines.js
  Companion files (same Priority content, assistant-specific syntax):
    CLAUDE.md                        (Claude Code)
    .github/copilot-instructions.md  (GitHub Copilot)
  Canonical skills:  skills/*/SKILL.md   (installed into .agents/skills/ at setup)
  Canonical agents:  agents/*.md         (installed into .agents/agents/ at setup)
-->

# Salesforce Project — Codex Baseline

Instructions for Codex working on Salesforce, Apex, LWC, Experience Cloud, Salesforce B2B
Commerce, Salesforce metadata, and Salesforce CLI projects. Follow these rules unless the user
explicitly overrides them.

---

## Priority 1: Operational Safety

These safety rules are always on, every task — before any skill routing (Priority 2) and
before generating any artifact or response. They apply to every request, reviews and quick
fixes included; never skip them because the task looks trivial.

**Git safety**
- Never run `git commit`, `git push`, or any variant (amend, force-push, rebase, tag push)
  unless the user has explicitly asked for it in the current message. Do not infer intent from
  context or plan approval — wait for an explicit instruction each time.
- Exception — **checkpoint mode** (per-task grant). When the user explicitly enables it for a
  task (e.g. *"checkpoint as you go"*, *"enable checkpoint commits"* — exact phrases are not
  required, any clearly explicit enablement counts, and a narrowed grant such as *"only
  checkpoint completed work items"* is honored as stated), commit automatically for that task
  only, under these constraints. Plan approval alone is **not** a grant, and never infer the
  grant — a long-running or multi-task run is not, by itself, permission to enable it.
  - At grant time, create a dedicated branch `checkpoint/<task-slug>` from the current HEAD and
    commit only there — never on the user's original branch. If the working tree is dirty at
    grant time, ask once whether to record a `checkpoint: baseline (pre-task state)` commit
    first; never silently fold pre-existing changes into a later checkpoint.
  - Commit only at stable points: a **green validate** (tests pass), a **completed work item**
    (include its build summary in the commit), or **immediately before a risky or hard-to-undo
    operation** (the message must say so).
  - Message convention: `checkpoint: <work item> — <state>`
    (e.g. `checkpoint: RollupService green — validate 0Af...`).
  - Only the main (orchestrating) agent commits; subagents never run git. With parallel
    developer instances, checkpoint only at merge points (after the combined validate) so a
    commit never captures another instance's partial work.
  - `git push`, amend, rebase, force-push, merging the checkpoint branch back, deleting it, and
    any rollback (`git reset --hard`, `git checkout <commit> -- .`) remain explicit-user-request
    actions — the grant covers checkpoint commits only.
  - The grant expires when the task completes. At task end, report the branch name and the list
    of checkpoints; merging, squashing, and cleanup are the user's call.

**Deployment, install, and filesystem safety (always on, even when no skill fires)**
- Never deploy to any Salesforce org without explicit user approval. Validate anytime.
- Before running any `sf project deploy` or `sf project validate` command, display the full
  command and wait for explicit user confirmation. Exception — a TDD validate loop (see
  Priority 2): confirm the first validate of the loop (org alias, test level); subsequent
  iterations in the same loop re-run automatically, each still displaying the full command.
  Deploys always require confirmation.
- After submitting a deploy or validate job, return the job ID only — do not poll for status
  unless the user explicitly asks, it is a CI/CD or automation workflow, or it is a TDD
  validate loop (where you wait for and read the test results).
- Never install packages, libraries, CLIs, or software without explicit user approval.
- Never delete files, perform destructive git operations, or modify system files without
  explicit approval.
- Never include secrets, session IDs, cookies, tokens, org credentials, or real customer
  data — and never expose PII or internal error detail — in code, tests, logs, error
  messages, or generated files.

**Org introspection & schema truth (always on, even when no skill fires)**
- Never guess object, field, or relationship API names. Before writing Apex, LWC, SOQL, or
  Flow metadata that touches the schema, verify the names — first against the local metadata
  in the repo (`force-app/**`) when present, then against the org. When they diverge, the org
  is the source of truth.
- Self-serve with **read-only** sf CLI commands — run these freely, no confirmation needed:
  - `sf sobject list` / `sf sobject describe --sobject <Name>` — object and field API names,
    types, relationships, picklist values
  - `sf data query --query "..."` (add `--use-tooling-api` where applicable) — verify SOQL
    shape and behavior against real data
  - `sf api request rest '/services/data/vXX.X/...'` — UI API, composite, and anything
    describe and query don't cover
  - `sf org list metadata --metadata-type <Type>` — what's actually deployed
- **Never ask the user to run snippets in the Developer Console or anonymous Apex** for
  anything the commands above can answer. If anonymous Apex is genuinely required (exercising
  behavior a query can't reach), run it yourself via `sf apex run`: display the full snippet
  first and wait for explicit confirmation (it executes code in the org), and keep it
  read-only unless the user approves writes.

---

## Priority 2: Skill Routing

Invoke the appropriate skill **before** generating any artifact. Use the skill that best matches
the active context.

> `generating-*` skills are for authoring — new files and edits including bug fixes.
> `salesforce-*-quality` skills are for review — invoke them after generation completes or when the task is explicitly a review.

| Context | Skill(s) to invoke first |
|---|---|
| Writing, editing, refactoring, or fixing Apex classes, triggers, services | `generating-apex` |
| Writing or editing Apex test classes | `generating-apex-test` |
| Reviewing Apex classes, triggers, services, or test classes | `salesforce-apex-quality` |
| Reviewing Apex that includes `@AuraEnabled` methods | `salesforce-apex-quality` · `salesforce-lwc-quality` |
| Running Apex tests / coverage | `running-apex-tests` |
| Debugging Apex logs | `debugging-apex-logs` |
| Creating / editing LWC components | `generating-lwc-components` |
| Reviewing LWC components | `salesforce-lwc-quality` |
| Reviewing LWC component backed by an Apex controller | `salesforce-lwc-quality` · `salesforce-apex-quality` |
| Creating custom objects | `generating-custom-object` |
| Creating custom fields | `generating-custom-field` |
| Creating permission sets | `generating-permission-set` |
| Creating Lightning pages (FlexiPages) | `generating-flexipage` |
| Creating validation rules | `generating-validation-rule` |
| Creating list views | `generating-list-view` |
| Deploying metadata, generating a `package.xml` / manifest, building a git delta (sgd) from a commit or range, deploying reference data (SFDMU), CI/CD | `salesforce-deployment` · `deploying-metadata` |
| Querying org data (SOQL) | `querying-soql` |
| Handling org data (import/export) | `handling-sf-data` |
| Named Credentials / External Services / callouts | `building-sf-integrations` |
| Creating or editing Flows | `generating-flow` |
| Reviewing Flows | `salesforce-flow-quality` |
| Reviewing Flow that calls an Apex invocable action | `salesforce-flow-quality` · `salesforce-apex-quality` |
| Running code analysis (PMD/CodeAnalyzer) | `running-code-analyzer` |
| Building a complete Lightning app | `generating-lightning-app` |
| B2B Commerce work — **only when** the Commerce flag in Project Conventions is set. When set, it applies to **all** Apex/LWC/Flow work: overlay `salesforce-commerce-b2b` during authoring (alongside the `generating-*` skill), then chain it as a Commerce-domain review pass after the matching `salesforce-*-quality` skill. It is **not** triggered by file content | `salesforce-commerce-b2b` **(overlay + review chain — add to the LWC/Apex/Flow skill, never replace it)** |

> **`salesforce-commerce-b2b` is an overlay + review chain, never a replacement.** When the Commerce
> flag (see Project Conventions) is set:
> - **Authoring** — co-fire it *alongside* the generating skill (e.g. `generating-apex` +
>   `salesforce-commerce-b2b`) so generated code is Commerce-aware from the start.
> - **Review** — after the matching quality skill runs (e.g. `salesforce-apex-quality`), chain
>   `salesforce-commerce-b2b` as a Commerce-domain review pass over the generated artifact.
>
> It adds Commerce domain rules on top of the base skill — it never substitutes for it. The chain is a
> routing instruction gated on the flag, not a trigger on file content.

**Test-Driven Development (sequencing rule — the *how* lives in the skills)**
- Before authoring tests, verify the schema the code touches (per the org introspection rule
  in Priority 1) so tests assert against real API names — not guessed ones.
- New Apex classes or logic changes: author or extend the test class first
  (`generating-apex-test`), then implement the minimum to make it pass
  (`generating-apex`).
- Verify red/green with a **validate deploy — never a real deploy**: include the test class and
  the implementation class in the payload and run
  `sf project deploy validate --test-level RunSpecifiedTests --tests <TestClass>`. Assuming the
  org already holds the required objects, fields, and access, the validate compiles both classes
  against real metadata and returns test results without changing the org. Wait for and read
  each validate's test results; iterate until green (confirmation per Priority 1: first validate
  of the loop confirmed, later iterations re-run automatically).
- LWC: after generating a component, spot-check it against `salesforce-lwc-quality`.
  Recommend a Jest spec (sfdx-lwc-jest) to the user and generate one only when the user asks —
  Jest tests are recommended, not required.
- Exceptions: metadata-only changes, trivial non-logic edits, and user-declared prototypes or
  spikes.

Skills whose names begin with `salesforce-` are **authored skills** in `skills/` in this repo
(installed into `.agents/skills/` at setup — see the README).
All other skills are from `forcedotcom/sf-skills`
(install: `npx skills add forcedotcom/sf-skills`).

---

## Priority 3: Project Conventions

These use placeholders because this is a reusable template. Map each one to the active repository
before applying any rule.

- `<Prefix>_` — the project or namespace prefix used on Apex classes and metadata.
- "Project utility class", "project selector", "project test factory", "project setting metadata" —
  the equivalents that already exist in the repo. Discover the real names from the codebase; do not
  invent them.
- Inspect the existing repository before introducing any new class, helper, naming style, or
  abstraction. Follow established patterns.
- **Commerce project flag** — this flag is the **trigger** for `salesforce-commerce-b2b`; the skill is
  gated on project configuration, never on file content. Set it when the repo is a Salesforce B2B
  Commerce storefront:
  - **Set:** state it plainly here, e.g. *"This **is** a Commerce org."* When set, `salesforce-commerce-b2b`
    applies to **every** Apex/LWC/Flow task: overlay it during authoring (alongside the `generating-*`
    skill) and chain it as a Commerce-domain review pass after the matching `salesforce-*-quality` skill
    (see Priority 2). To set the flag, a user can simply tell the agent *"This is a Commerce project"* and
    the agent updates this section.
  - **Unset (template default):** `salesforce-commerce-b2b` does **not** fire — it is not triggered by
    file content. Leave unset for non-Commerce orgs. For a mixed CRM+Commerce org, either set the flag
    and accept the overlay + review chain on all Apex/LWC/Flow work, or leave it unset and invoke
    `salesforce-commerce-b2b` manually on the Commerce pieces.
  - **Current setting:** unset — this is **not** a Commerce org. <!-- commerce-flag -->

---

## Priority 4: Agent Orchestration & Spec Doc Map

**Orchestration rules** (the workflow narrative and work-brief template live in the repo README's
"Agent Orchestration" section):

- **Dispatch threshold** — orchestrate only when complexity pays for the dispatch. A spawned
  agent re-reads context cold (a real token cost the user owns — in marginal cases, surface the
  trade-off and let the user decide), while long-running or complex work done inline crowds the
  main context window. Simple, single-artifact work and all config stays with the main agent;
  dispatch parallelizable independent or contract-pinned items, multi-artifact chains with long
  TDD/validate loops, or work the user wants to keep planning around while it builds.
- Dispatch dev work to `salesforce-developer` with a structured **work brief**: objective, spec
  reference, schema context, test scenarios, constraints, dependencies, expected outputs,
  validation criteria. Embed the schema and spec extracts the task needs in the brief — do not
  rely on bare path references.
- Run **parallel** developer instances only for independent work items; a dependent chain (e.g.
  service consumed by a trigger) goes to a **single** instance, sequenced in one brief — unless
  the main agent pins the integration **contract** (signatures, public APIs, schema) up front,
  embeds it in each brief, and verifies integration with one combined validate at the merge point.
- Track developer progress through the **build summary**, not raw diffs.
- `architect` reviews are on-demand. A **BLOCKED** report re-briefs `salesforce-developer` with
  the report's Recommended Actions; the architect then re-reviews and appends a new dated section.
- The user steers the dispatch shape in the prompt when they want to (e.g. *"run in parallel"*,
  *"pin the contracts first"*, *"one at a time"*, *"architect design review before any code"*,
  *"checkpoint as you go"*) — honor it. Absent explicit steering, derive the shape from the
  dependency structure of the work and invoke no architect review.
- When the user grants **checkpoint mode** (see Git safety, Priority 1), the main agent commits
  at stable points — green validate, completed work item — on the dedicated checkpoint branch.
  Developer and architect agents never commit.

### Agent → Spec Doc Map

> **Per-project setup:** Fill in the paths in the table below when you deploy this template to a
> real project repo. Config planning and QA scenario authoring are handled inline by the main
> agent — only the `salesforce-developer` and `architect` agents read this map. If a path is not
> set here, each agent will ask the user which document to use before proceeding.

| Agent | Document | Path (fill in per project) |
|---|---|---|
| salesforce-developer | Technical Specification (input) | *(set per project)* |
| architect | Solution Architecture doc (input) | *(set per project)* |
| salesforce-developer | Build summary (output) | `docs/dev-build-summary.md` |
| architect | SA review report (output) | `docs/sa-review-report.md` |
