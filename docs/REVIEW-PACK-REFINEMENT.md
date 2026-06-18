# Refining the reviewing-* packs: box-ticking and overfeeding

> **Status: proposal, not a change.** The `reviewing-apex`, `reviewing-lwc`, and `reviewing-flow`
> skills are unchanged by this document. It names a concern with how their reference material is
> structured and lays out concrete refinement steps for when we act on it. It is **complementary**
> to — not a replacement for — the two-phase `skill-improvement-workflow` (correctness + gaps) and
> is deliberately scoped **aside from the pending reference-currency audit** (`npm run validate:refs`,
> parked on `feature/reference-auditor`). That audit is about *facts and staleness*; this note is
> about *altitude, severity, and cognitive load*.

## How the review skills are structured today

Each review skill is two layers:

1. An **always-on "Quick Reference (always apply)"** table in `SKILL.md` — a flat
   `anti-pattern → fix` grid read on *every* review, regardless of what the artifact contains.
   Current sizes: **~40 rows** (`reviewing-apex`), **~35 rows** (`reviewing-lwc`), **~20 rows**
   (`reviewing-flow`).
2. An **on-demand routing table** that loads `references/*.md` files by domain (data-access,
   trigger-design, security, async, testing, …). The reference files are dense descriptive bullet
   lists — each bullet reads as an independent must-check.

Progressive disclosure is already in place for layer 2. The pressure point is **layer 1**: the
always-on table is large and flat, and it is the part that frames how every single review begins.

## The concern, named

**1. Mechanical box-ticking.** A long flat table invites line-by-line pattern matching and
coverage-reporting — "I scanned all N rows, here is what matched" — instead of reasoning about
*this* artifact's actual risk in its actual execution context. The current framing makes this worse:
every Quick Reference opens with *"Scan every artifact against this checklist,"* which literally
instructs enumeration. Enumeration rewards breadth over judgment, manufactures false positives
(flagging a pattern that is contextually fine), and buries the two findings that matter under thirty
that do not.

**2. Overfeeding / dilution.** The whole table is in context even when most of it is irrelevant —
the ~12 async/`@future`/Batch rows in `reviewing-apex` load against a class with no async code; the
test rows load against production code; the Jest rows load against a component with no tests. Two
costs follow:
- **Salience flattening.** With no severity ordering, `SOQL injection` and `Magic strings/numbers`
  sit at identical visual weight. A reviewer optimizing for "address every row" spends equal energy
  on a security hole and a naming nit.
- **Diluted signal.** The handful of rows that actually apply to the artifact compete for attention
  with dozens that never will.

Neither failure mode is about the rules being *wrong* — they are well-grounded. It is about the
*shape* of the material steering the reviewer toward a checklist ritual rather than risk reasoning.

## Scope boundary

This is distinct from the reference-currency audit. The audit answers *"is this rule still true, and
when was it last checked against official docs?"* This note answers *"does the structure make the
reviewer think, or just tick boxes?"* The two are orthogonal and can proceed independently.

## Refinement steps (prioritized)

**S1 — Tier the Quick Reference by severity.** Replace each flat table with three short bands:
**Blocking** (security/CRUD-FLS, governor-limit & bulk-safety, data loss / silent corruption),
**Should-fix** (architecture, error handling, maintainability), **Polish** (naming, cosmetics).
*Why:* the review then leads with risk and reasons in priority order instead of treating all rows as
peers. *How:* re-group existing rows; no rule content changes, only ordering and headers.

**S2 — Reframe "scan the checklist" → "reason, then recall."** Replace the *"Scan every artifact
against this checklist"* preamble with an instruction to first reason about the artifact's real
execution context (bulk volume, running user's profile/sharing, data growth, async boundaries), then
use the table as a **recall aid** for what that context puts at risk — not as a compliance form to
walk top to bottom. *Why:* directly counters the box-ticking instinct at its source. *How:* a 2–3
sentence preamble edit per skill.

**S3 — Shrink the always-on payload.** Move domain-gated rows out of the always-apply table and rely
on the existing routing table to pull them in only when the artifact contains that domain — e.g.
async rows → `references/async.md`, test rows → `references/testing.md`,
`@AuraEnabled` rows → `references/aura-enabled.md`, all `commerce` rows → the commerce pack. Keep the
always-on table to genuinely **cross-cutting, every-artifact** risks. *Why:* removes the irrelevant
bulk that causes dilution. *How:* relocate rows; verify the routing-table load criteria already
cover them (they do).

**S4 — Define a review output contract.** State what a good review *produces*: findings as
`file:line` + why-it-fails + fix, ordered by the S1 severity bands; **no "I checked all N items"
coverage summary**; **no finding without an evidence line** quoting the offending code; inapplicable
categories are silently skipped, not reported as "N/A." *Why:* caps noise and false positives, and
makes box-ticking output structurally impossible. *How:* a short "What to deliver" section in each
`SKILL.md`.

**S5 — Add false-positive guardrails to the references.** For patterns that have legitimate uses,
name the deliberate-exception contexts so valid code is not flagged. `security.md` already models
this (`stripInaccessible` — "use it deliberately when partial results are acceptable, not as an
accident"; `without sharing` isolated + documented + permission-gated). Generalize the pattern across
the reference files. *Why:* most false positives come from flagging a justified exception. *How:*
add an "Acceptable when…" clause to the high-false-positive rules.

**S6 — Prune and merge overlapping rows.** Collapse near-duplicate rows and push the long tail fully
into references, keeping the Quick Reference to high-frequency × high-severity items. *Why:* a
shorter always-on table is read, not skimmed. *How:* dedupe pass per skill, Quick-Reference ↔
reference sync preserved.

## How to validate a refinement (empirical, aside from the audit)

Propose a lightweight fixture check (future harness, not built here): for each review skill keep one
**known-good** and one **known-bad** sample artifact. After a refinement, the good artifact should
draw ~zero findings (a false-positive gauge) and the bad artifact should still catch every planted
issue (a recall gauge). This measures whether a structural change improved discipline without losing
coverage — something the prose rules and the currency audit cannot tell us on their own.

## What we deliberately keep

- The **descriptive rule format** (bold anti-pattern, why it fails, fix in prose — no BAD/GOOD code
  blocks).
- **Progressive disclosure**: lean `SKILL.md` + `references/` by domain.
- **Quick-Reference ↔ reference-file sync** so the two layers never drift.

All three are load-bearing conventions from `skill-improvement-workflow`; none of the steps above
disturb them.
