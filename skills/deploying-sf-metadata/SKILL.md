---
name: deploying-sf-metadata
description: Use when deploying Salesforce metadata, generating package.xml or a git delta (sfdx-git-delta), running validate/quick-deploy, planning CI/CD promotion, or deploying reference data with SFDMU — deployment safety rules and deployment commands. TRIGGER when: deploying metadata, generating package.xml / a manifest, building a git delta (sfdx-git-delta) from a commit or range, running sf project deploy validate / quick-deploy, deploying reference data with SFDMU, or touching package.xml / manifest XML in a deploy context. DO NOT TRIGGER when: authoring the metadata itself (use the matching generating-* skill) or querying org data (use querying-soql / handling-sf-data).
---

# Salesforce Deployment Rules

## Security and Deployment Safety

- Never run `git commit`, `git push`, or any variant (amend, force-push, rebase, tag push) unless
  the user has explicitly asked for it in the current message — do not infer it from context or
  plan approval. Exception: **checkpoint mode**, an explicit per-task grant (e.g. *"checkpoint as
  you go"*) under which the main agent commits at stable points on a dedicated
  `checkpoint/<task-slug>` branch; plan approval alone is not a grant, and the grant expires when
  the task completes.
- Verify schema before generating metadata that touches it: never guess object, field, or
  relationship API names. Confirm them with read-only sf CLI commands — run these freely, no
  confirmation needed: `sf sobject list` / `sf sobject describe --sobject <Name>`, `sf data query
  --query "..."` (add `--use-tooling-api` where applicable), `sf api request rest '/services/...'`,
  `sf org list metadata --metadata-type <Type>`. Check local metadata (`force-app/**`) first, then
  the org; the org wins on divergence. Never ask the user to run Developer Console or anonymous
  Apex snippets for anything those commands can answer.
- Never install packages, libraries, CLIs, or software unless the user explicitly approves it.
- Never delete files, uninstall software, modify system files, or perform destructive git operations unless the user explicitly approves it.
- Before modifying generated manifests, inspect the diff that produced them.
- Before validating or deploying, confirm the target org alias and manifest path with the user.
- If the delta or manifest includes `destructiveChanges.xml` or destructive members, show the affected components and get explicit user confirmation before proceeding.
- Prefer validate deploys with `RunLocalTests` unless the user provides a different test level.
- Do not include secrets, session IDs, cookies, access tokens, org credentials, or real customer data in code, tests, logs, or generated files.
- Never deploy to any Salesforce org without explicit user approval, unless the user clearly instructs you to deploy. You can validate deployments anytime to support test driven development.
- After submitting a deploy or validate job, return the job ID only — do not poll for status unless the user explicitly asks.

## Delta Manifests with sfdx-git-delta (sgd)

- Generate deltas with `sf sgd source delta --from <ref> [--to <ref>] --output-dir <dir>`. When only a single ref is given (e.g. "from `<hash>`"), pass it as `--from <hash>` and omit `--to` — sgd defaults `--to` to `HEAD`. Only set `--to` explicitly when the user supplies an end ref.
- sgd produces two outputs: `package/package.xml` (additions/modifications) and `destructiveChanges/destructiveChanges.xml` (deletions). Add `--generate-delta` (`-d`) to also copy the changed source files for a source-dir deploy.
- **sgd is a pure git diff — it does not detect metadata dependencies.** A delta deploy can fail on components it didn't include (a new field's parent object, a referenced class). Review the generated manifest for missing dependencies, and fall back to a full deploy when dependency risk is high.
- **Check the generated `package.xml` has members before submitting** — an empty package can fail the deploy.
- **Flows cannot be deleted via `destructiveChanges.xml`** (platform limitation) — deactivate/handle through `FlowDefinition` instead, and exclude flow deletions from the destructive manifest.
- In CI, reference branches with the `origin/` prefix (e.g. `--from origin/main`) and ensure the pipeline fetches enough git history — shallow clones break the diff.
- Use `--ignore-file` / `--ignore-destructive-file` for permanent exclusions instead of hand-editing every generated manifest.
- sgd is community-maintained, not Salesforce-supported — always review generated manifests before deploying them.

## Validate, Quick Deploy, and Destructive Changes

- Use `sf project deploy validate` when validating; default to `RunLocalTests` unless the user specifies a different test level.
- **Prefer the validate → quick-deploy pattern for production:** `sf project deploy validate` returns a job ID; `sf project deploy quick --job-id <id>` deploys that validation within **10 days** without re-running tests. Tests must have run during validation — `NoTestRun` is incompatible with quick deploy. Record the validation job ID when validating so the quick deploy can reference it.
- **Pick the test level on purpose.** `RunLocalTests` (the production default) runs every test in the org **except managed-package tests**; `RunAllTestsInOrg` adds the managed-package tests; `RunSpecifiedTests` runs only named classes — and each Apex class in the deploy must still clear 75% coverage individually, so name the tests that exercise it. `NoTestRun` is sandbox-only and incompatible with quick deploy. Production requires **75% org-wide** coverage with every trigger covered.
- Deploy sgd's deletions in the same job as the additive package with `--post-destructive-changes destructiveChanges.xml` (or `--pre-destructive-changes` when deletes must precede the additions) on `sf project deploy start|validate` — destructive members still require the explicit user confirmation above.
- For non-delta manifests, generate with `sf project generate manifest` rather than writing `package.xml` by hand.
- **Every generated manifest ships with a complete, test-leveled deploy command — never a bare `--manifest`/`--target-org`.** When you produce a `package.xml` from a ticket or user story, end your response with the exact `sf project deploy start --manifest <path> --target-org <alias>` command and always append `--test-level`. Omit it and the org falls back to its own default (`NoTestRun` in a sandbox), which silently skips the coverage the change needs and will not satisfy a later production promotion.
- **Any package that deploys Apex must run tests — every Apex class in it has to be validated by a test run, so never emit it under `NoTestRun`.** The package's own contents decide which level: if it includes one or more Apex test classes, use `--test-level RunSpecifiedTests` and name each test class with `--tests`, repeating the flag once per class (the CLI does not accept a comma-separated list). If it contains Apex classes but no test class, use `--test-level RunLocalTests`. Reserve `NoTestRun` for throwaway sandbox iterations, never for production. Example — a package holding `AccountTriggerHandler` and its test `AccountTriggerHandlerTest`: `sf project deploy start --manifest manifest/US1-package.xml --target-org <alias> --test-level RunSpecifiedTests --tests AccountTriggerHandlerTest`.
- **`RunSpecifiedTests` is coverage-gated:** each class and trigger in the deploy must reach 75% coverage from the named tests, so include every test class that exercises the package's code. A production class deployed under `RunSpecifiedTests` without a covering specified test fails the deploy — when the covering tests are unclear or live outside the package, fall back to `--test-level RunLocalTests`.
- Fetch current SF CLI docs when command syntax or behavior may have changed.

## CI/CD Practices (sfdx-hardis-derived — apply even without the tool)

- **Delta for PR validation, full deploy as the baseline:** validate the sgd delta between the source and target branch on every PR; use full deploys for initial pipeline bring-up and whenever delta dependency risk is high.
- **Promotion model:** one org per major branch (integration → uat → production), promotion by merge — validate on PR, quick-deploy the stored validation job ID on merge.
- **Overwrite management:** maintain a no-overwrite list for metadata that admins own in the target org (reports, dashboards, list views) and exclude it from deployments unless overwriting is explicitly intended (sfdx-hardis: `packageNoOverwritePath`).
- **Bounded test skipping:** skip test execution only when the delta contains exclusively non-impacting metadata types — and never against production.

## Data Deployments with SFDMU

- Use SFDMU (`sf sfdmu run`) for reference/configuration data migrations — org-to-org or CSV — and version-control the `export.json` like code; review its diff like a manifest diff.
- **Upsert with external IDs, never blind inserts** that duplicate reference data. Any unique field works as the external ID — including formula and composite keys — so a dedicated External ID field is not required.
- **Production safety:** SFDMU refuses to modify a production org unless `--canmodify <instanceUrl>` is passed. Treat that flag exactly like a metadata deploy — explicit user approval required. Run a simulation first and review the planned insert/update/delete counts before the real run.
- When seeding sandboxes from production data, use SFDMU's built-in anonymization to mask sensitive fields — never copy production PII as-is.
- Prefer SFDMU's automatic relationship and circular-reference handling over hand-rolled CSV sequences when records reference each other.
