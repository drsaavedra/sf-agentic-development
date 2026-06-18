---
name: updating-sf-skills
description: "Use when bumping the pinned forcedotcom/sf-skills versions this repo depends on — a new sf-skills release, a periodic dependency refresh, or refreshing/repairing skills-lock.json. Covers updating with the skills CLI, reviewing which upstream skills changed, deciding which authored reviewing-* packs that change forces a re-ground, and committing the new pin. Maintainer-only tooling for this repo — not shipped to consumers. TRIGGER when: bumping sf-skills, updating skills-lock.json, or a forcedotcom/sf-skills release audit. DO NOT TRIGGER when: grounding reference-pack prose against Salesforce docs (use regrounding-references) or authoring/reviewing Salesforce artifacts (use the generating-*/reviewing-* skills)."
---

# Updating sf-skills

Maintainer runbook for moving this repo's pin on the upstream **`forcedotcom/sf-skills`** base skills
(`generating-apex`, `generating-lwc-components`, `deploying-metadata`, …). **Maintainer-only — lives
under the repo's `.claude/skills/` and is not copied by the installer.**

This is a **dependency bump**, not a content edit. You never edit sf-skills — Salesforce owns them.
The only thing this repo controls is the **pin**: `skills-lock.json` records each upstream skill by
`computedHash` of its `SKILL.md`, so everyone working in this repo resolves the same versions.

**Why this matters here:** this repo's authored `reviewing-*` packs are grounded against *specific
sf-skill behavior*. A sf-skills bump can change that behavior, which is the trigger to re-ground the
matching packs. That follow-up is the `regrounding-references` skill — this skill bumps the pin and
hands off to it.

## When to use

- A new `forcedotcom/sf-skills` release is out (or you want to check for one).
- Periodic dependency refresh at release time.
- `skills-lock.json` is missing entries, or a teammate's resolution drifted from the pin.

Not for: editing sf-skill content (you don't — Salesforce owns it), grounding *this repo's* pack
prose (use `regrounding-references`), or authoring/reviewing artifacts (`generating-*`/`reviewing-*`).

## The two lockfile operations (don't confuse them)

| Command | Does | Use when |
|---|---|---|
| `npx skills update -p` (alias `upgrade`) | Pulls **latest** upstream and **rewrites** `skills-lock.json` with new hashes | You intend to move the pin forward (this runbook) |
| `npx skills experimental_install` | **Restores** the versions already pinned in `skills-lock.json` (like `npm ci`) | You want to match the existing pin, not change it (clean checkout, drift repair) |

`-p`/`--project` scopes to this project's skills (all of which come from sf-skills here); add `-y` to
skip the scope prompt.

## Checklist (re-runnable)

Create a todo per step.

- [ ] **1. Bump.** `npx skills update -p -y`. This pulls the latest sf-skills and rewrites
  `skills-lock.json`. (To preview without committing to a scope, `npx skills list` shows what's
  installed first.)
- [ ] **2. Review what actually changed.** `git diff skills-lock.json`. Every changed `computedHash`
  is an upstream skill whose `SKILL.md` changed. Note the names — that list drives Step 3. No hash
  changes → nothing moved; you're done after committing (if even needed).
- [ ] **3. Map impact to authored packs.** For each changed upstream skill, check whether this repo
  authors a paired quality gate that was grounded against it:
  - `generating-apex` / `generating-apex-test` → `reviewing-apex`
  - `generating-lwc-components` → `reviewing-lwc`
  - `generating-flow` → `reviewing-flow`
  - `deploying-metadata` → `deploying-sf-metadata`

  Flag each matching `reviewing-*` / authored pack whose upstream pair changed.
- [ ] **4. Re-ground the flagged packs.** Run the `regrounding-references` skill on them: confirm the
  pack's guidance still matches both the live Salesforce docs **and** the new sf-skill behavior;
  update or retire prose as needed; bump `lastValidated`. A pure version bump with no behavioral
  change to a paired skill needs no re-ground.
- [ ] **5. Verify.** `npm test` (structural suite green) and `npm run validate:refs` (refs gate
  green). Optionally `npx skills experimental_install` on a clean tree to confirm it resolves to the
  new pin without drift.
- [ ] **6. Commit.** `skills-lock.json` (the new pin) plus any packs/manifest dates changed in
  Step 4, in one change. Note in the message which upstream skills moved.

## Common mistakes

| Mistake | Why it's wrong |
|---|---|
| Committing a lockfile bump without reading the diff | You miss which upstream skill changed behavior — and skip the re-ground it should have triggered (Step 3). |
| Treating the bump as a re-ground (or vice-versa) | Different artifacts: this skill moves `skills-lock.json`; `regrounding-references` edits `references/*.md` + the manifest. The bump *triggers* the re-ground; it doesn't replace it. |
| Editing sf-skill content to "fix" it | Salesforce owns sf-skills; your edits live nowhere and vanish on the next resolve. Only the pin is yours. |
| Running `update` when you meant to restore the pin | `update` moves the pin to latest. To match the existing pin (clean checkout / drift), use `experimental_install`. |
| Bumping right before publishing without re-grounding flagged packs | Ships authored packs that describe stale sf-skill behavior past a green gate. |
