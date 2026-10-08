# Deployment & git safety

<!-- Never give this file `paths:` frontmatter. A path-scoped rule loads only once Claude
     reads a matching file, so these guardrails would be absent from exactly the sessions
     that never open a Salesforce artifact — including the ones that deploy or commit. -->

These guardrails are not optional and hold for every task, including work done by dispatched agents:

- `[no-git-writes-without-a-grant]` **Never run `git commit`, `git push`, or any variant** (amend, force-push, rebase, tag push)
  unless commits are explicitly granted — do not infer from context or plan approval. The one
  exception is **checkpoint mode**, granted either in the current message (e.g. *"checkpoint as you
  go"*) or at planning time via `sf-plan`'s checkpoint question, recorded as
  `Checkpoint commits: enabled` in `docs/CONTEXT.md`. Under it the **main agent** commits at stable
  points — including each work item as it passes review, which land on the **current working branch**
  so a handover can reference them by hash; throwaway rollback checkpoints may instead use a
  dedicated `checkpoint/<task-slug>` branch (full rule: `docs/ORCHESTRATION.md`). Plan approval alone
  is **not** a grant (approving the plan ≠ answering the checkpoint question), **subagents never
  commit**, and the grant expires when the task completes.
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
