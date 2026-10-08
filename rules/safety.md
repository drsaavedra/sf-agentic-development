# Deployment & git safety

<!-- Never give this file `paths:` frontmatter. A path-scoped rule loads only once Claude
     reads a matching file, so these guardrails would be absent from exactly the sessions
     that never open a Salesforce artifact — including the ones that deploy or commit. -->

These guardrails are not optional and hold for every task, including work done by dispatched agents:

- `[commit-locally-ask-before-push]` **Commit locally without asking; ask before anything that leaves the
  machine or rewrites shared history.** The main agent commits on the current working branch at stable
  points (a work item that passed its review gate, a green validate before a risky step), one commit per
  work item with its tests in the same commit. Never commit on the default branch (`main`, `master`, or
  whatever `origin/HEAD` names): cut a working branch first. If the folder is not a git repo, say so
  once and commit nothing; never `git init` unasked. Ask first, naming the branch and the effect, for
  `git push`, opening or editing a PR, merging, rebasing or force-pushing a branch someone else has,
  deleting a branch, and pushing tags. Plan approval is not approval for any of these. Subagents never
  run git.
- `[no-deploy-without-approval]` **Deploy to a scratch org without asking; ask before every other deploy.**
  A scratch org is one that `sf org list --json` reports with `isScratch: true` — never decide by
  alias name — and you always pass `-o <alias>` explicitly. After a scratch deploy, report the alias,
  the deploy ID and the components, and read what landed back from the org. Ask first, naming the
  target alias, the manifest or source path and the effect, for a sandbox, production, an expired or
  unknown org, a deploy with no `-o`, `--metadata-dir`, or any destructive payload (show the
  destructive members). Also ask for a scratch org that someone else is using or that is a snapshot
  source: it is not yours to overwrite. A deploy step in a plan or handover is not approval; restate
  its target and effect and ask. Only the main agent deploys. `sf project deploy validate` stays free
  everywhere.
- `[no-secrets]` **No secrets.** Never put org credentials, session IDs, access tokens, or real customer data in
  code, tests, logs, or generated files.
