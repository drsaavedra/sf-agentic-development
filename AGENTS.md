<!--
  SALESFORCE PROJECT TEMPLATE — Codex baseline
  Rendered from: templates/baseline.md
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

## Priority 1: Behavioral Guidelines & Operational Safety

**Always-on, every task:** before any skill routing (Priority 2) and before generating any
artifact or response, invoke the `karpathy-guidelines` skill to load the latest behavioral
rules. This applies to every request — reviews, quick fixes, and questions included. Never
skip it because the task looks trivial.

> Install the plugin if not already active:
> ```
> /plugin marketplace add forrestchang/andrej-karpathy-skills
> /plugin install andrej-karpathy-skills@karpathy-skills
> ```

**Git safety**
- Never run `git commit`, `git push`, or any variant (amend, force-push, rebase, tag push)
  unless the user has explicitly asked for it in the current message. Do not infer intent from
  context or plan approval — wait for an explicit instruction each time.

**Deployment, install, and filesystem safety (always on, even when no skill fires)**
- Never deploy to any Salesforce org without explicit user approval. Validate anytime.
- Before running any `sf project deploy` or `sf project validate` command, display the full
  command and wait for explicit user confirmation. After submitting a deploy or validate job,
  return the job ID only — do not poll for status unless the user explicitly asks (or in a
  CI/CD / automation workflow).
- Never install packages, libraries, CLIs, or software without explicit user approval.
- Never delete files, perform destructive git operations, or modify system files without
  explicit approval.
- Never include secrets, session IDs, cookies, tokens, org credentials, or real customer
  data — and never expose PII or internal error detail — in code, tests, logs, error
  messages, or generated files.

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
| B2B Commerce work — **only when** the Priority 3 Commerce flag is set. When set, it applies to **all** Apex/LWC/Flow work: overlay `salesforce-commerce-b2b` during authoring (alongside the `generating-*` skill), then chain it as a Commerce-domain review pass after the matching `salesforce-*-quality` skill. It is **not** triggered by file content | `salesforce-commerce-b2b` **(overlay + review chain — add to the LWC/Apex/Flow skill, never replace it)** |

> **`salesforce-commerce-b2b` is an overlay + review chain, never a replacement.** When the Commerce
> flag (Priority 3) is set:
> - **Authoring** — co-fire it *alongside* the generating skill (e.g. `generating-apex` +
>   `salesforce-commerce-b2b`) so generated code is Commerce-aware from the start.
> - **Review** — after the matching quality skill runs (e.g. `salesforce-apex-quality`), chain
>   `salesforce-commerce-b2b` as a Commerce-domain review pass over the generated artifact.
>
> It adds Commerce domain rules on top of the base skill — it never substitutes for it. The chain is a
> routing instruction gated on the flag, not a trigger on file content.

Skills whose names begin with `salesforce-` are **authored skills** in `skills/` in this repo
(installed into `.agents/skills/` at setup — see `SETUP.md`).
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

---

## Priority 4: Agent → Spec Doc Map

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
