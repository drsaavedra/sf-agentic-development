# Salesforce Project — Baseline Template

<!--
  Single source for the three assistant baseline files. Do not edit the renders by hand.

  Render with:  node scripts/render-baselines.js
  Outputs:
    CLAUDE.md                           (Claude Code)
    AGENTS.md                           (Codex / OpenAI Codex CLI)
    .github/copilot-instructions.md     (GitHub Copilot — VS Code, GitHub.com)

  Template syntax (resolved by the script):
    {{ASSISTANT_NAME}}    "Claude Code" | "Codex" | "GitHub Copilot"
    {{TITLE_NAME}}        "Claude" | "Codex" | "GitHub Copilot"
    {{SKILLS_DIR}}        ".claude/skills" | ".agents/skills" | ".github/skills"
    {{P2_VERB}}           "Invoke" | "Invoke" | "Use"
    {{skill:name}}        `name` | `name` | `/skill name`
    <!-/- only:claude codex copilot -/-> ... <!-/- end:only -/->   (without the slashes)
                          block kept only for the listed targets

  This baseline only routes to skills. Operational safety, project conventions, B2B Commerce
  rules, and agent orchestration live in the skills, their reference packs, the agents, and the
  README — not here.

  Everything below the BODY marker is rendered; everything above it is ignored.
-->

<!-- BODY -->
# Salesforce Project — {{TITLE_NAME}} Baseline

Routing rules for {{ASSISTANT_NAME}} working on Salesforce — Apex, LWC, Experience Cloud, B2B
Commerce, metadata, and Salesforce CLI projects. This file does one job: fire the right skill at
the right time. Each skill carries its own safety rules, quality gates, and domain knowledge, so
this baseline only routes to them. Follow these rules unless the user explicitly overrides them.

> **Two entry paths.** For a planned feature, start with `/sf-plan` (it writes a design contract
> to `docs/tech-spec.md`) and build it with `/sf-build`. The routing below governs everything else
> — ad-hoc edits, fixes, reviews, audits, config, and ops.

---

## Skill Routing

{{P2_VERB}} the appropriate skill **before** generating any artifact. Use the skill that best matches
the active context.

> `generating-*` skills are for authoring — new files and edits including bug fixes.
> `reviewing-*` skills are for review.

**Always chain authoring → review.** Whenever a `generating-*` skill authors or edits code, chain
the matching `reviewing-*` skill as a review pass over what you just produced — generation is not
done until the review skill has run. The pairs:
- {{skill:generating-apex}} / {{skill:generating-apex-test}} → {{skill:reviewing-apex}}
- {{skill:generating-lwc-components}} → {{skill:reviewing-lwc}}
- {{skill:generating-flow}} → {{skill:reviewing-flow}}

For a review-only task (no authoring), invoke the `reviewing-*` skill on its own.

| Context | Skill(s) — invoke in order |
|---|---|
| Writing, editing, refactoring, or fixing Apex classes, triggers, services | {{skill:generating-apex}} → then chain {{skill:reviewing-apex}} |
| Writing or editing Apex test classes | {{skill:generating-apex-test}} → then chain {{skill:reviewing-apex}} |
| Reviewing Apex classes, triggers, services, or test classes (review-only) | {{skill:reviewing-apex}} |
| Reviewing Apex that includes `@AuraEnabled` methods | {{skill:reviewing-apex}} · {{skill:reviewing-lwc}} |
| Running Apex tests / coverage | {{skill:running-apex-tests}} |
| Debugging Apex logs | {{skill:debugging-apex-logs}} |
| Creating / editing LWC components | {{skill:generating-lwc-components}} → then chain {{skill:reviewing-lwc}} |
| Reviewing LWC components (review-only) | {{skill:reviewing-lwc}} |
| Reviewing LWC component backed by an Apex controller | {{skill:reviewing-lwc}} · {{skill:reviewing-apex}} |
| Creating or editing Flows | {{skill:generating-flow}} → then chain {{skill:reviewing-flow}} |
| Reviewing Flows (review-only) | {{skill:reviewing-flow}} |
| Reviewing Flow that calls an Apex invocable action | {{skill:reviewing-flow}} · {{skill:reviewing-apex}} |
| Creating custom objects | {{skill:generating-custom-object}} |
| Creating custom fields | {{skill:generating-custom-field}} |
| Creating permission sets | {{skill:generating-permission-set}} |
| Creating Lightning pages (FlexiPages) | {{skill:generating-flexipage}} |
| Creating validation rules | {{skill:generating-validation-rule}} |
| Creating list views | {{skill:generating-list-view}} |
| Deploying metadata, generating a `package.xml` / manifest, building a git delta (sgd) from a commit or range, deploying reference data (SFDMU), CI/CD | {{skill:deploying-sf-metadata}} · {{skill:deploying-metadata}} |
| Querying org data (SOQL) | {{skill:querying-soql}} |
| Handling org data (import/export) | {{skill:handling-sf-data}} |
| Named Credentials / External Services / callouts | {{skill:building-sf-integrations}} |
| Running code analysis (PMD/CodeAnalyzer) | {{skill:running-code-analyzer}} |
| Building a complete Lightning app | {{skill:generating-lightning-app}} |

**Test-Driven Development (skill sequencing)**
- New Apex classes or logic changes: author or extend the test class first
  ({{skill:generating-apex-test}}), then implement the minimum to make it pass
  ({{skill:generating-apex}}). The red/green validate mechanics live in those skills.
- LWC: after generating a component, spot-check it against {{skill:reviewing-lwc}}. A Jest spec
  (sfdx-lwc-jest) is recommended, not required — generate one when the user asks.
- Exceptions: metadata-only changes, trivial non-logic edits, and user-declared prototypes or
  spikes.

The authored skills in this repo — {{skill:reviewing-apex}}, {{skill:reviewing-lwc}},
{{skill:reviewing-flow}}, and {{skill:deploying-sf-metadata}} — install into `{{SKILLS_DIR}}/` at
setup (see the README). All other skills above come from `forcedotcom/sf-skills`
(install: `npx skills add forcedotcom/sf-skills`).
