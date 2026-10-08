# Maintaining

How this repo is kept current. This is maintainer documentation — consumers who install the toolkit
don't need any of it.

- **Skills & agents** — `skills/` and `agents/` are the only source of truth. Edit them, then re-run the installer (or re-copy) into `.claude/`. Never edit the installed copies — they're lost on the next install.
- **CLAUDE.md** — the project instruction file is hand-maintained: edit `CLAUDE.md` directly. It is the canonical source the installer injects into a consuming project's `CLAUDE.md` as a managed block. There is no render step.
- **Maintainer runbooks (how I keep the repo current).** The recurring release chore below — re-grounding the reference packs — is captured as a committed, agent-runnable skill under `.claude/skills/`. These are **maintainer-only tooling**: the installer ships only the top-level `skills/` tree, so consumers never see them, and they're Claude Code-only (where I do this work). When maintaining the repo in Claude Code, invoke `regrounding-references` and follow the checklist; the prose in the bullet below is the same workflow written out for reading without an agent. Editing the skill is itself a maintenance act — keep it in step with the script/manifest it drives.
- **Reference packs** (skill: `regrounding-references`) — the skills' decision/quality reference packs are kept grounded in official Salesforce docs by the maintainer, so installs ship no runtime doc-fetch dependency. Each release, run `npm run validate:refs`: it audits `scripts/reference-sources.json` and flags packs that are stale, never-validated, or untracked, with the sources to re-check. Re-ground a flagged pack by fetching its sources, fact-checking each claim, **removing anything inaccurate or deprecated**, updating the pack, then bumping its `lastValidated` date in the manifest. Classify any new pack as `salesforce-docs` (track sources) or `expertise` (judgment/pattern content with no single normative page — skipped by the gate). The grounding playbook:
  - **Fetching sources.** `developer.salesforce.com` answers 403 to WebFetch, for the new
    `docs/platform/…` pages and the legacy `docs/atlas.en-us.*` pages alike (checked 2026-10-08).
    Most of its guides are published as PDFs at
    `https://resources.docs.salesforce.com/latest/latest/en-us/sfdc/pdf/<guide>.pdf` (e.g.
    `api_meta`, `api_ui`, `lightning`, `platform_events`): download, convert to text, and grep for
    the anchors. The Apex and LWC developer guides are not mirrored — use WebSearch for those (its
    indexed snippets carry the article body and the current canonical URL). `help.salesforce.com`
    articles generally fetch fine. Optional: a maintainer who wants a headless-browser
    extractor for stubborn pages can install the upstream `platform-docs-get` skill user-scoped
    (`~/.claude/skills`) — a per-machine convenience, never a repo dependency.
  - **Prefer the canonical reference page** over release notes or blogs as the tracked source, but
    release-note URLs are the right source for a "removed/changed in vNN" claim (e.g.
    `WITH SECURITY_ENFORCED` removal at API v67).

## Repository layout

```
skills/<name>/              ← authored Salesforce skills (canonical source: SKILL.md + references/)
agents/<name>.md            ← 3 Salesforce agents (canonical source)
scripts/install.js          ← the interactive installer (npx entry point)
CLAUDE.md                   ← Claude Code instruction file (canonical, hand-edited)
```

Claude Code reads each installed skill from `.claude/skills/<name>/SKILL.md`, using the `name` +
`description` frontmatter.
