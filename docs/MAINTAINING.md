# Maintaining

How this repo is kept current. This is maintainer documentation — consumers who install the toolkit
don't need any of it.

- **Skills & agents** — `skills/` and `agents/` are the only source of truth. Edit them, then re-run the installer (or re-copy) into `.claude/`. Never edit the installed copies — they're lost on the next install.
- **CLAUDE.md** — the project instruction file is hand-maintained: edit `CLAUDE.md` directly. It is the canonical source the installer injects into a consuming project's `CLAUDE.md` as a managed block. There is no render step.
- **Maintainer runbooks (how I keep the repo current).** The two recurring release chores below — re-grounding the reference packs and bumping the upstream sf-skills pin — are each captured as a committed, agent-runnable skill under `.claude/skills/`. These are **maintainer-only tooling**: the installer ships only the top-level `skills/` tree, so consumers never see them, and they're Claude Code-only (where I do this work). When maintaining the repo in Claude Code, invoke `regrounding-references` or `updating-sf-skills` and follow the checklist; the prose in the two bullets below is the same workflow written out for reading without an agent. Editing either skill is itself a maintenance act — keep it in step with the script/manifest it drives.
- **Reference packs** (skill: `regrounding-references`) — the skills' decision/quality reference packs are kept grounded in official Salesforce docs by the maintainer, so installs ship no runtime doc-fetch dependency. Each release, run `npm run validate:refs`: it audits `scripts/reference-sources.json` and flags packs that are stale, never-validated, or untracked, with the sources to re-check. Re-ground a flagged pack by fetching its sources, fact-checking each claim, **removing anything inaccurate or deprecated**, updating the pack, then bumping its `lastValidated` date in the manifest. Classify any new pack as `salesforce-docs` (track sources) or `expertise` (judgment/pattern content with no single normative page — skipped by the gate). The grounding playbook:
  - **Retrieval runtime (one-time).** The optional [`fetching-salesforce-docs`](https://github.com/forcedotcom/sf-skills) extractor needs an isolated Python runtime at `~/.claude/.fetching-salesforce-docs-runtime/` (created by that skill's installer, or manually: `python -m venv`, then `pip install playwright playwright-stealth`, then `playwright install chromium` with `PLAYWRIGHT_BROWSERS_PATH` pointed at `…/ms-playwright`). On Windows invoke the extractor with that runtime's Python **directly** (set `SF_DOCS_RUNTIME_ACTIVE=1`) — the `os.execve` re-exec segfaults under Git Bash.
  - **What extracts cleanly vs. not.** New-format `developer.salesforce.com/docs/platform/…` pages (LWC, etc.) and `help.salesforce.com` articles render and extract well. **Legacy `developer.salesforce.com/docs/atlas.en-us.*` pages (most Apex docs) do not** — they return only the cookie-consent shell in headless Chromium, even with `--stealth`. For those, ground via **WebSearch / WebFetch against developer.salesforce.com** (its indexed snippets carry the article body and the current canonical URL) rather than the extractor.
  - **Prefer the canonical reference page** over release notes or blogs as the tracked source, but release-note URLs are the right source for a "removed/changed in vNN" claim (e.g. `WITH SECURITY_ENFORCED` removal at API v67).
- **sf-skills version pin** (skill: `updating-sf-skills`) — the authored `reviewing-*` packs are grounded against specific `forcedotcom/sf-skills` behavior, so the upstream version is pinned in `skills-lock.json` (a `computedHash` per skill). To take an upstream update, I bump the pin with the skills CLI — `npx skills update -p` moves it to latest and rewrites the lockfile; `npx skills experimental_install` restores the existing pin (e.g. on a clean checkout). After a bump, read `git diff skills-lock.json` to see **which** upstream skills changed, then re-ground the authored packs paired with them (`generating-apex` → `reviewing-apex`, `generating-lwc-components` → `reviewing-lwc`, `generating-flow` → `reviewing-flow`) via the Reference-packs workflow above. Commit the updated `skills-lock.json` with any re-grounded packs.

## Repository layout

```
skills/<name>/              ← authored Salesforce skills (canonical source: SKILL.md + references/)
agents/<name>.md            ← 3 Salesforce agents (canonical source)
scripts/install.js          ← the interactive installer (npx entry point)
CLAUDE.md                   ← Claude Code instruction file (canonical, hand-edited)
```

Claude Code reads each installed skill from `.claude/skills/<name>/SKILL.md`, using the `name` +
`description` frontmatter.
