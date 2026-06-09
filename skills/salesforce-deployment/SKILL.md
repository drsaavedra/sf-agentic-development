---
name: salesforce-deployment
description: Use when deploying Salesforce metadata or generating package.xml — deployment safety rules and deployment commands.
---

# Salesforce Deployment Rules

## Security and Deployment Safety

- Never install packages, libraries, CLIs, or software unless the user explicitly approves it.
- Never delete files, uninstall software, modify system files, or perform destructive git operations unless the user explicitly approves it.
- Before modifying generated manifests, inspect the diff that produced them.
- Before validating or deploying, confirm the target org alias and manifest path with the user.
- If the delta or manifest includes `destructiveChanges.xml` or destructive members, show the affected components and get explicit user confirmation before proceeding.
- Prefer validate deploys with `RunLocalTests` unless the user provides a different test level.
- Do not include secrets, session IDs, cookies, access tokens, org credentials, or real customer data in code, tests, logs, or generated files.
- Never deploy to any Salesforce org without explicit user approval, unless the user clearly instructs you to deploy. You can validate deployments anytime to support test driven development.
- After submitting a deploy or validate job, return the job ID only — do not poll for status unless the user explicitly asks.

## Deployment Commands

- Use `sf sgd` (sfdx-git-delta) to generate `package.xml` from a git delta when the user provides a commit hash or range. When only a single ref is given (e.g. "from `<hash>`"), pass it as `--from <hash>` and omit `--to` — sfdx-git-delta defaults `--to` to `HEAD`. Only set `--to` explicitly when the user supplies an end ref.
- Use `sf project deploy validate` when validating; default to `RunLocalTests` unless the user specifies a different test level.
- Fetch current SF CLI docs when command syntax or behavior may have changed.
