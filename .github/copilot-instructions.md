---
description: "Always-on baseline: behavioral rules, skill routing, and Salesforce project conventions"
---

# Salesforce Project — Copilot Instructions

## Priority 1: Behavioral Guidelines

These rules govern **how** the agent interacts and generates code. They override all other stylistic preferences.

Invoke the `karpathy-guidelines` skill to load the latest behavioral rules from the repository:

```
/skill karpathy-guidelines
```

> Install the plugin if not already active:
> ```
> /plugin marketplace add forrestchang/andrej-karpathy-skills
> /plugin install andrej-karpathy-skills@karpathy-skills
> ```

---

## Priority 2: Skill Routing

Invoke the appropriate skill **before** generating any artifact. Use the skill that best matches the active context.

| Context | Skill to invoke first |
|---|---|
| Writing / reviewing Apex classes, triggers, services | `generating-apex` |
| Writing Apex test classes | `generating-apex-test` |
| Running Apex tests / coverage | `running-apex-tests` |
| Debugging Apex logs | `debugging-apex-logs` |
| Creating / editing LWC components | `generating-lwc-components` |
| Creating custom objects | `generating-custom-object` |
| Creating custom fields | `generating-custom-field` |
| Creating permission sets | `generating-permission-set` |
| Creating Lightning pages (FlexiPages) | `generating-flexipage` |
| Creating validation rules | `generating-validation-rule` |
| Creating list views | `generating-list-view` |
| Deploying metadata / CI-CD | `deploying-metadata` |
| Querying org data (SOQL) | `querying-soql` |
| Handling org data (import/export) | `handling-sf-data` |
| Named Credentials / External Services / callouts | `building-sf-integrations` |
| Creating Flows | `generating-flow` |
| Running code analysis (PMD/CodeAnalyzer) | `running-code-analyzer` |
| Building a complete Lightning app | `generating-lightning-app` |

---

## Priority 3: Instruction File Routing

These files are applied automatically by GitHub Copilot based on the active file type (`applyTo:` front matter). This table is for human reference.

| When working on… | Instruction file |
|---|---|
| Apex classes, triggers (`.cls`, `.trigger`) | `salesforce-apex-coding-rules.instructions.md` |
| Apex classes, triggers (`.cls`, `.trigger`) | `salesforce-anti-patterns.instructions.md` |
| LWC / Aura components (`lwc/**`, `aura/**`) | `salesforce-lwc-coding-rules.instructions.md` |
| Commerce storefront (`.cls`, `.trigger`, `lwc/**`, `aura/**`) | `salesforce-commerce-domain-rules.instructions.md` |
| Metadata / deployment (`*-meta.xml`, `package.xml`) | `salesforce-deployment-rules.instructions.md` |

---

## Priority 4: Project Conventions

These apply across all file types in all Salesforce repositories.

- `<Prefix>_` stands for the project or namespace prefix used on Apex classes and metadata. Map it to the active repository before applying any rule.
- "Project utility class", "project selector", "project test factory", and "project setting metadata" refer to whatever equivalents already exist in the repo. Discover the real names from the codebase before inventing new ones.
- Before introducing any new class, helper, naming style, or abstraction, inspect the existing repository first and follow its established patterns.
- When parsing files, ad hoc shell string manipulation is the last priority. Always check first: (1) whether there is an API within the chosen model that can parse it, then (2) whether a skill or plugin can handle the parsing.

---

## Priority 5: Baseline Behavior

- Before starting development or deployment, retrieve the latest stable Salesforce documentation from an up-to-date source (for example, a documentation MCP such as Context7, if available).
- Treat Apex as Apex, not Java. Do not assume Java libraries or Java language features exist in Apex.
- Treat LWC as Salesforce LWC running in Lightning Web Security and Experience Cloud/LWR, not plain browser JavaScript.
- Never deploy to any Salesforce org without explicit user approval. You can validate deployments anytime.
- Never install packages, libraries, CLIs, or software unless the user explicitly approves it.
- Never delete files, perform destructive git operations, or modify system files without explicit approval.
- Do not include secrets, session IDs, credentials, or real customer data in code, tests, logs, or generated files.
