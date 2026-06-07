---
name: salesforce-deployment-rules
description: Use when deploying Salesforce metadata, generating package.xml, or reviewing any metadata file (*-meta.xml, package.xml, sfdx-project.json) — deployment safety, security review checklist, deployment commands, and Commerce-specific deployment checks.
---

# Salesforce Deployment Rules

## Security and Deployment Safety

- Never install packages, libraries, CLIs, or software unless the user explicitly approves it.
- Never delete files, uninstall software, modify system files, or perform destructive git operations unless the user explicitly approves it.
- Before modifying generated manifests, inspect the diff that produced them.
- Before validating or deploying Commerce changes, confirm the target org alias and manifest path.
- Prefer validate deploys with `RunLocalTests` unless the user provides a different test level.
- Do not include secrets, session IDs, cookies, access tokens, org credentials, or real customer data in code, tests, logs, or generated files.
- Never deploy to any Salesforce org without explicit user approval, unless the user clearly instructs you to deploy. You can validate deployments anytime to support test driven development.

## Deployment Commands

- If the user says, `Generate package.xml using sf git delta from {commit hash}`, run:
  `sf sgd source delta --from "{commit hash}" --output-dir "manifest" -a {api version}`
- If the user says, `Do a validate deploy to {target org} using {package xml path}`, run:
  `sf project deploy validate -o {target org} --verbose -x {package xml path} -l RunLocalTests`
- Before starting development or deployment, retrieve the latest stable Salesforce documentation from an up-to-date source (for example, the `fetching-salesforce-docs` skill or a documentation MCP such as Context7, if available) when the behavior, API, CLI command, metadata format, limits, or best practice could have changed.

## Review Checklist

Before finalising any Salesforce change, verify all of the following:

- Apex sharing, FLS/CRUD expectations, input validation, bulk behavior, and tests are covered.
- LWC wires and promises handle errors and loading state.
- Builder properties, labels, targets, and component public APIs are consistent.
- Digital Experience package members are scoped correctly.

### Commerce projects only

Apply these additional checks when the project uses B2B/B2C Commerce:

- Storefront API considered before Apex.
- Effective account, webstore, cart, checkout, product, and community/site context handled explicitly.
- Buyer entitlement, pricing, catalog, and product visibility not bypassed.
- Cart and checkout mutations refresh or notify Commerce state.
