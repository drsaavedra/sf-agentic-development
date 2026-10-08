---
name: regrounding-references
description: "Use when re-grounding this repo's skill/agent reference packs against official Salesforce docs — at a release, when a new Salesforce version may change documented behavior, or when `npm run validate:refs` flags packs as STALE / NEVER-VALIDATED / UNTRACKED / MISSING. Covers fetching each pack's tracked sources, fact-checking and retiring deprecated claims, picking up new-release best practices, and bumping lastValidated. Maintainer-only tooling for this repo — not shipped to consumers. TRIGGER when: revalidating references, grounding packs, a Salesforce release audit, or clearing validate:refs flags. DO NOT TRIGGER when: authoring/reviewing Salesforce artifacts (use the reviewing-* skills) or fetching a single doc to answer a question (plain WebFetch/WebSearch)."
---

# Re-grounding Reference Packs

Maintainer runbook for keeping every skill/agent reference pack grounded in current official
Salesforce docs. **Maintainer-only — this skill lives under the repo's `.claude/skills/` and is not
copied by the installer, so consumers never see it.** The auditor
(`scripts/validate-references.js`) only does **bookkeeping** — it tells you *which* packs to reground
and against *which* sources. The actual fetch-fact-check-edit-retire work is this skill.
Re-runnable: start at Step 1 every release.

**The one rule that the gate cannot enforce — so you must.** `lastValidated` is on the honor
system: the script reads the date and trusts it. It cannot tell a genuine reground from a bare date
edit. **Never bump `lastValidated` for a pack you did not actually fetch and fact-check this run.**
Bumping a date you didn't earn silently ships stale guidance past a green gate.

## When to use

- A Salesforce release shipped (or is in preview) and may change documented behavior.
- `npm run validate:refs` reports `STALE`, `NEVER VALIDATED`, `UNTRACKED`, or `MISSING FILE`.
- You added, renamed, deleted, or rewrote a `references/*.md` or a `SKILL.md` body.
- Scheduled cadence (every `stalenessDays`, currently 180).

Not for: writing/reviewing Salesforce code (use the `reviewing-*` skills), or a one-off doc
lookup to answer a question (plain WebFetch/WebSearch).

## Checklist (re-runnable each release)

Create a todo per step.

- [ ] **1. Get the worklist.** `npm run validate:refs` (add `-- --strict` to surface warnings as
  failures, `--today=YYYY-MM-DD` to preview future staleness). Every flagged line names the file and
  its tracked `sources`. That list is your queue. Green with no flags → nothing to reground; stop.
- [ ] **2. For each flagged `salesforce-docs` pack, fetch its sources.** Read the entry's
  `sources[].url` + `anchors` in `scripts/reference-sources.json`, then retrieve each — routing per
  the table below. **`expertise` packs are skipped by the gate; never bump them on a doc cadence.**
- [ ] **3. Fact-check every claim in the pack against the live doc.** For each claim, exactly one
  outcome:
  - **Still accurate** → leave the prose; the date bump (Step 6) is all it needs.
  - **Changed / better practice in the new release** → rewrite the prose to match. If the claim is
    "removed/changed in vNN", the right tracked source is the **release-note** URL — add or repoint
    it. Otherwise prefer the canonical reference page over release notes or blogs.
  - **Deprecated / retired / no longer true** → **delete it.** Removing inaccurate or deprecated
    content is the point of the pass, not a side effect. Don't soften it to "legacy" — cut it.
- [ ] **4. Repair moved sources.** If a `url` now 404s or redirects, fix it in the manifest to the
  current canonical URL (the fetch in Step 2 surfaces the new location).
- [ ] **5. Handle structural changes** (retire / add packs) per the section below — file and manifest
  entry always move together.
- [ ] **6. Bump `lastValidated`** to today (`YYYY-MM-DD`) on every `salesforce-docs` entry you
  actually fetched and fact-checked this run — and only those.
- [ ] **7. Verify clean.** `npm run validate:refs` → `warnings: 0 | failures: 0`, and `npm test` →
  manifest shape + classifier still green. Both must pass before you commit.

## Where to fetch each source

Fetch with WebFetch/WebSearch; route by URL shape:

| Source URL | How to fetch |
|---|---|
| `developer.salesforce.com/docs/…` (any path — `platform/…` and `atlas.en-us.*` both answer 403 to WebFetch) | The guide's PDF at `https://resources.docs.salesforce.com/latest/latest/en-us/sfdc/pdf/<guide>.pdf` (e.g. `api_meta`, `api_ui`, `lightning`, `platform_events`, `salesforce_apex_developer_guide`), converted to text and grepped for the anchors; WebSearch for the LWC guide, which is not mirrored |
| `help.salesforce.com/s/articleView…` | WebFetch; if it returns a shell, WebSearch the article title for the indexed body |
| `lightningdesignsystem.com/…` | WebFetch |

## Manifest entry reference (`scripts/reference-sources.json`)

The auditor discovers every `skills/*/SKILL.md` and `skills/*/references/*.md` (and `agents/*`) and
cross-checks this manifest. (It does **not** scan `.claude/skills/`, so this runbook itself is never
tracked.) Each entry:

| Field | Meaning |
|---|---|
| `basis: "salesforce-docs"` | Grounded in platform facts. **Gated** — needs `sources` + `lastValidated`. |
| `basis: "expertise"` | Judgment / process / design-pattern content with no single normative page (e.g. `sf-plan`, `sf-build`, architecture packs). **Skipped** by the gate; no date. |
| `sources[]` | `{ url, anchors }` — the doc to reground against and the phrases to confirm on it. |
| `lastValidated` | `YYYY-MM-DD` of the last real reground, or `null` until first done. |
| `_note` | Human rationale; ignored by the script. |

Gate outcomes you're clearing: `UNTRACKED` (no entry), `NEVER VALIDATED` (null date),
`STALE` (`lastValidated` older than `stalenessDays`), `MISSING FILE` (entry but no file),
`BAD BASIS` / `BAD DATE` (malformed).

## Retiring and adding packs

- **Retire a whole pack:** delete the `.md` file **and** its manifest entry in the same change.
  File without entry → `UNTRACKED`; entry without file → `MISSING FILE`. They move together.
- **Retire a single claim:** just delete the prose (Step 3) and bump the date — no manifest change.
- **Add a pack from a new release:** create the `.md`, then add a manifest entry. Classify it:
  `salesforce-docs` (track `sources` + `anchors`, set `lastValidated` once grounded) or `expertise`
  (no source — workflow/judgment content). A new `salesforce-docs` pack left unfetched correctly
  shows `NEVER VALIDATED` until you ground it.

## Common mistakes

| Mistake | Why it's wrong |
|---|---|
| Bumping `lastValidated` without fetching | The gate trusts the date — this ships stale guidance past a green check. The whole point of the run defeated. |
| Direct-fetching any `developer.salesforce.com/docs` page | It answers 403. Use the PDF mirror, or WebSearch for the unmirrored LWC guide. |
| Softening a retired feature to "legacy" instead of deleting | Step 3 says cut deprecated claims. Stale guidance kept as prose still misleads. |
| Deleting a `.md` but leaving its manifest entry (or vice-versa) | Trips `MISSING FILE` / `UNTRACKED`. File and entry move together. |
| Bumping an `expertise` entry on the doc cadence | Expertise packs have no doc source and are skipped by the gate — there's nothing to reground. |
| Committing before `npm run validate:refs` and `npm test` are both green | The gate and the structural tests are the release contract. |
