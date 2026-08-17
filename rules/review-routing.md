---
paths:
  - "force-app/**"
  - "**/*.cls"
  - "**/*.trigger"
  - "**/lwc/**"
  - "**/aura/**"
  - "**/*.flow-meta.xml"
---

# Review Routing

Review is a **discrete pass at the end of a build**, not a step chained onto every edit. Run the
skill matching each artifact under review — when a `code-reviewer` agent is dispatched, on an
explicit review/audit request, or as the quality gate once a feature is built. A changeset that
spans domains loads each matching skill: an Apex class and an LWC fire both rows below on their own.
Each `reviewing-*` skill names its cross-domain partner under its own **Cross-Skill Integration**
(e.g. an LWC with an `@AuraEnabled` Apex controller pulls in `reviewing-apex` alongside).

**Quick fixes don't get a `reviewing-*` pass.** For a small ad-hoc edit to existing code, the
objective gates in Authoring are the full quality bar — `sf project deploy validate`, the affected
tests, and `sf code-analyzer run` over the changed files. Reserve the `reviewing-*` skills for new
artifacts, changes that touch triggers, sharing, or security, pre-deploy audits, and explicit
review requests.

| Artifact under review | Skill |
|---|---|
| Apex — classes, triggers, services, or test classes | `reviewing-apex` |
| Lightning Web Components | `reviewing-lwc` |
| Flows | `reviewing-flow` |

For the deep code-quality gate after a build, dispatch the `code-reviewer` agent — it runs the
table above plus the Code Analyzer CLI over the delivered artifacts and reports defects
by severity. The `architect` agent is the separate solution-design governance gate — it clears the
design before code and inspects the assembled build against the design contract (completeness, scope,
design conformance), not code quality.
