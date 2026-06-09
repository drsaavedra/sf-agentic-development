# Salesforce Project — Baseline Template

<!--
  This is the single-source template for all three assistant baseline files.
  Edit this file, then re-render the three outputs:

    CLAUDE.md                           (Claude Code)
    AGENTS.md                           (Codex / OpenAI Codex CLI)
    .github/copilot-instructions.md     (GitHub Copilot — VS Code, GitHub.com)

  Substitution tokens:
    {{ASSISTANT_NAME}}   → "Claude Code" | "GitHub Copilot" | "Codex"
    {{ROOT_FILE}}        → "CLAUDE.md" | ".github/copilot-instructions.md" | "AGENTS.md"
    {{SKILL_INVOKE}}     → "invoke the `X` skill" | "use `/skill X`" | "invoke the `X` skill"
    {{SKILLS_DIR}}       → ".claude/skills" | ".github/skills" | ".agents/skills"
    {{SKILL_INSTALL}}    → "npx skills add" (same for all three)

  When rendering:
  - Replace all tokens for the target assistant.
  - Remove this comment block.
  - Add the assistant-specific header comment (see each rendered file for format).
  - Keep all Priority sections and the Agent map in sync across all three renders.
-->

---

## Priority 1: Behavioral Guidelines

Before responding, invoke the `karpathy-guidelines` skill to load the latest behavioral rules.

> Install the plugin if not already active:
> ```
> /plugin marketplace add forrestchang/andrej-karpathy-skills
> /plugin install andrej-karpathy-skills@karpathy-skills
> ```

**Git safety**
- Never run `git commit`, `git push`, or any variant (amend, force-push, rebase, tag push)
  unless the user has explicitly asked for it in the current message. Do not infer intent from
  context or plan approval — wait for an explicit instruction each time.

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
| Deploying metadata / CI-CD | `salesforce-deployment-rules` · `deploying-metadata` |
| Querying org data (SOQL) | `querying-soql` |
| Handling org data (import/export) | `handling-sf-data` |
| Named Credentials / External Services / callouts | `building-sf-integrations` |
| Creating or editing Flows | `generating-flow` |
| Reviewing Flows | `salesforce-flow-quality` |
| Reviewing Flow that calls an Apex invocable action | `salesforce-flow-quality` · `salesforce-apex-quality` |
| Running code analysis (PMD/CodeAnalyzer) | `running-code-analyzer` |
| Building a complete Lightning app | `generating-lightning-app` |
| B2B/B2C Commerce work (any file type) | `salesforce-commerce-b2b` |

Skills whose names begin with `salesforce-` are **authored skills** in `skills/` in this repo
(installed into `{{SKILLS_DIR}}` at setup time).
All other skills are from `forcedotcom/sf-skills`
(install: `{{SKILL_INSTALL}} forcedotcom/sf-skills`).

---

## Priority 3: Always-On Safety Floor

These rules apply to every request, whether or not a skill fires.

**Secrets and hardcoding**
- Never hardcode Record IDs, Record Type IDs, or Profile IDs. Resolve dynamically via
  `Schema.describe` or source from Custom Metadata / Custom Labels.
- Never hardcode secrets, credentials, session IDs, or tokens. Use Named Credentials or protected
  Custom Metadata for all external authentication.
- Never expose PII or internal error detail in debug logs, error messages, or API responses.

**Bulk and security floor**
- Bulkify all Apex: never put SOQL, DML, or callouts inside loops; assume `Trigger.new` holds 200
  records. Collect IDs/fields first, then run one query/DML outside the loop.
- Default every Apex class to `with sharing`; isolate any `without sharing` in a dedicated helper.
- Enforce CRUD/FLS: `WITH USER_MODE` in SOQL and `AccessLevel.USER_MODE` in `Database` DML (API 56+).
- Treat Apex as Apex (not Java) and LWC as Salesforce LWC under Lightning Web Security (not plain
  browser JavaScript).

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

**Salesforce deployment commands**
- Before running any `sf project deploy` or `sf project validate` command, display the full
  command and wait for explicit user confirmation.
- After submitting a deploy or validate job, return the job ID only — do not poll for status.
  The user monitors progress in the org. Only poll when the user explicitly requests it (e.g.,
  "wait for completion", "monitor the deploy", or for a CI/CD or automation workflow).

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
> real project repo. Config planning and QA scenario authoring are handled inline by the main
> agent — only the `salesforce-developer` and `architect` agents read this map. If a path is not
> set here, each agent will ask the user which document to use before proceeding.

| Agent | Document | Path (fill in per project) |
|---|---|---|
| salesforce-developer | Technical Specification (input) | *(set per project)* |
| architect | Solution Architecture doc (input) | *(set per project)* |
| salesforce-developer | Build summary (output) | `docs/dev-build-summary.md` |
| architect | SA review report (output) | `docs/sa-review-report.md` |
