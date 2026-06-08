<!--
  SALESFORCE PROJECT TEMPLATE — GitHub Copilot baseline
  Rendered from: templates/baseline.md
  Companion files (same Priority content, assistant-specific syntax):
    CLAUDE.md                        (Claude Code)
    AGENTS.md                        (Codex)
  Canonical skills:  skills/*/SKILL.md   (installed into .github/skills/ at setup)
  Canonical agents:  agents/*.md         (installed into .github/agents/ at setup)
-->

# Salesforce Project — GitHub Copilot Baseline

Instructions for GitHub Copilot working on Salesforce, Apex, LWC, Experience Cloud, Salesforce B2B/B2C
Commerce, Salesforce metadata, and Salesforce CLI projects. Follow these rules unless the user
explicitly overrides them.

---

## Priority 1: Behavioral Guidelines

Before responding, use `/skill karpathy-guidelines` to load the latest behavioral rules.

> Install the plugin if not already active:
> ```
> /plugin marketplace add forrestchang/andrej-karpathy-skills
> /plugin install andrej-karpathy-skills@karpathy-skills
> ```

---

## Priority 2: Skill Routing

Use the appropriate skill **before** generating any artifact. Use the skill that best matches
the active context.

| Context | Skill(s) to invoke first |
|---|---|
| Writing / reviewing Apex classes, triggers, services | `/skill generating-apex` · `/skill salesforce-apex-quality` |
| Writing Apex test classes | `/skill generating-apex-test` · `/skill salesforce-apex-quality` |
| Running Apex tests / coverage | `/skill running-apex-tests` |
| Debugging Apex logs | `/skill debugging-apex-logs` |
| Creating / editing LWC components | `/skill generating-lwc-components` · `/skill salesforce-lwc-quality` |
| LWC component with Apex controller | `/skill salesforce-lwc-quality` · `/skill salesforce-apex-quality` |
| Creating custom objects | `/skill generating-custom-object` |
| Creating custom fields | `/skill generating-custom-field` |
| Creating permission sets | `/skill generating-permission-set` |
| Creating Lightning pages (FlexiPages) | `/skill generating-flexipage` |
| Creating validation rules | `/skill generating-validation-rule` |
| Creating list views | `/skill generating-list-view` |
| Deploying metadata / CI-CD | `/skill salesforce-deployment-rules` · `/skill deploying-metadata` |
| Querying org data (SOQL) | `/skill querying-soql` |
| Handling org data (import/export) | `/skill handling-sf-data` |
| Named Credentials / External Services / callouts | `/skill building-sf-integrations` |
| Creating / reviewing Flows | `/skill generating-flow` · `/skill salesforce-flow-quality` |
| Flow with Apex invocable actions | `/skill salesforce-flow-quality` · `/skill salesforce-apex-quality` |
| Running code analysis (PMD/CodeAnalyzer) | `/skill running-code-analyzer` |
| Building a complete Lightning app | `/skill generating-lightning-app` |
| B2B/B2C Commerce work (any file type) | `/skill salesforce-commerce-b2b` |
| Reviewing Apex for quality / anti-patterns | `/skill salesforce-apex-quality` |
| Reviewing LWC for quality / anti-patterns | `/skill salesforce-lwc-quality` |
| Reviewing Flows for quality / anti-patterns | `/skill salesforce-flow-quality` |

Skills whose names begin with `salesforce-` are **authored skills** in `skills/` in this repo
(installed into `.github/skills/` at setup — see `SETUP.md`).
All other skills are from `forcedotcom/sf-skills`
(install: `npx skills add forcedotcom/sf-skills`).

---

## Priority 3: Always-On Safety Floor

These rules apply to every request, whether or not a skill fires.

**Apex and LWC identity**
- Treat Apex as Apex, not Java. Do not assume Java libraries, Java collection behaviour, or Java
  language features exist in Apex.
- Treat Lightning Web Components as Salesforce LWC running in Lightning Web Security and Experience
  Cloud/LWR, not plain browser JavaScript.

**Bulk safety**
- Bulkify all Apex. Never place SOQL, DML, or callouts inside loops.
- Always assume `Trigger.new` holds 200 records. Collect IDs/fields before any query or DML, then
  issue one query/DML operation outside the loop.

**Security**
- Default every Apex class to `with sharing`. Document and isolate any `without sharing` in a
  dedicated helper gated behind a Custom Permission check.
- Enforce CRUD and FLS: `WITH USER_MODE` in SOQL, `AccessLevel.USER_MODE` in `Database` DML (API 56+).
- Never hardcode Record IDs, Record Type IDs, or Profile IDs. Resolve dynamically via
  `Schema.describe` or source from Custom Metadata / Custom Labels.
- Never hardcode secrets, credentials, session IDs, or tokens. Use Named Credentials or protected
  Custom Metadata for all external authentication.
- Never expose PII or internal error detail in debug logs, error messages, or API responses.

**Trigger design**
- One trigger per SObject (managed-package triggers are the only accepted exception).
- Trigger body = event routing only. Zero business logic. Delegates to its own Handler — never
  directly to a service class.

**Deployment and filesystem safety**
- Never deploy to any Salesforce org without explicit user approval. Validate deployments anytime.
- Never install packages, libraries, CLIs, or software without explicit user approval.
- Never delete files, perform destructive git operations, or modify system files without explicit
  approval.
- Do not include secrets, session IDs, cookies, access tokens, org credentials, or real customer
  data in code, tests, logs, or generated files.

**Documentation and parsing**
- Before starting development or deployment, retrieve the latest stable Salesforce documentation
  from an up-to-date source (the `fetching-salesforce-docs` skill, or a docs MCP such as Context7)
  when the behaviour, API, CLI command, metadata format, limits, or best practice could have changed.
- When parsing files, prefer (1) a model API, then (2) a skill or plugin. Fall back to ad-hoc shell
  string manipulation only as a last resort.

---

## Priority 4: Project Conventions

These use placeholders because this is a reusable template. Map each one to the active repository
before applying any rule.

- `<Prefix>_` — the project or namespace prefix used on Apex classes and metadata.
- "Project utility class", "project selector", "project test factory", "project setting metadata" —
  the equivalents that already exist in the repo. Discover the real names from the codebase; do not
  invent them.
- Inspect the existing repository before introducing any new class, helper, naming style, or
  abstraction. Follow established patterns.

---

## Priority 5: Agent → Spec Doc Map

> **Per-project setup:** Fill in the paths in the table below when you deploy this template to a
> real project repo. The four agents (`functional-consultant`, `qa-engineer`,
> `salesforce-developer`, `architect`) read this map to locate the specification and
> summary documents they depend on. If a path is not set here, each agent will ask the user which
> document to use before proceeding.

| Agent | Document | Path (fill in per project) |
|---|---|---|
| functional-consultant | Functional Specification (input) | *(set per project)* |
| qa-engineer | QA Specification (input) | *(set per project)* |
| salesforce-developer | Technical Specification (input) | *(set per project)* |
| architect | Solution Architecture doc (input) | *(set per project)* |
| functional-consultant | FC config summary (output) | `docs/fc-config-summary.md` |
| qa-engineer | QA test scripts (output / Dev TDD input) | `docs/qa-test-scripts.md` |
| qa-engineer | QA live test results (output) | `docs/qa-live-test-results.md` |
| salesforce-developer | Build summary (output) | `docs/dev-build-summary.md` |
| architect | SA review report (output) | `docs/sa-review-report.md` |
