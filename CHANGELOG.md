# Changelog

Notable changes to the toolkit, newest first. For full detail see `git log`.

## 2026-06-12 — v1.0.0

First tagged release of the toolkit. Release housekeeping:

- **Versioning aligned** — `package.json` now tracks **toolkit** releases and is set to
  `1.0.0`. Its previous `1.1.0` versioned the installer only (the "installer v1.1" entry
  below); the package was never published to npm, so nothing depended on the old number.
  From here, the package version, the git tag, and the changelog release heading move together.
- **"Agent → Spec Doc Map" is now a real heading** — the baselines' Priority 4 doc-map table
  sits under its own `### Agent → Spec Doc Map` subsection, so every cross-reference to it
  (both agents, the README setup steps, the installer's closing note) resolves to an exact
  section name, per the repo's name-based cross-reference rule.
- **`.gitignore` covers `.claude/settings.local.json`** — per-machine assistant settings no
  longer show up as untracked noise for contributors without a global git ignore.
- **Superpowers link fixed** — the README pointed at `superpowers.ai`, which is a parked
  domain for sale; it now points at the actual project,
  [github.com/obra/superpowers](https://github.com/obra/superpowers).

## 2026-06-12 (developer agent scope)

- **`salesforce-developer` broadened to all automation** — the agent now covers Apex, LWC, and
  Flow briefs (it was Apex-scoped on paper while the orchestration guide already dispatched it
  an LWC brief). Per-domain skill routing added (`generating-lwc-components` /
  `salesforce-lwc-quality`, `generating-flow` / `salesforce-flow-quality`, cross-domain pairs
  for Apex controllers and invocables), and the workflow split by domain: Apex via TDD, LWC via
  quality spot-check with Jest recommended-on-request, Flow via quality pass + validate loop.
  Output artifacts and the build summary now cover `lwc/` and `flows/` alongside classes and
  triggers.
- **Example 2 restructured around the pinned contract** — the Apex ‖ LWC parallel dispatch is
  now the headline: both phase-1 briefs are written out in full (the LWC brief was previously a
  blockquote summary), contract pinning is called out as the step that makes the parallel
  dispatch legal, the phase-2 wrappers are compressed to a paragraph, and a closing note
  generalizes the shape to any LWC + Apex controller pair (quick actions, record-page panels,
  screen-flow components).

- **"Org introspection & schema truth" rule added to Priority 1** — always-on: never guess
  object/field/relationship API names; verify against local metadata first, then the org (the
  org wins on divergence) using read-only sf CLI commands the agent runs freely without
  confirmation (`sf sobject list/describe`, `sf data query` incl. Tooling API,
  `sf api request rest`, `sf org list metadata`). The agent must **never ask the user to run
  Developer Console / anonymous Apex snippets** for anything those commands can answer; when
  anonymous Apex is genuinely required, the agent runs it itself via `sf apex run` after
  showing the snippet and getting explicit confirmation, read-only unless writes are approved.
- **TDD sequencing updated** — verify the schema the code touches (per the new rule) before
  authoring tests, so tests assert against real API names.
- **`salesforce-developer` fallback** — when a work brief's schema context is missing,
  incomplete, or contradicts the org, the developer self-serves with the read-only
  introspection commands instead of asking the user to run console snippets; the README's
  work-brief table now says schema context is gathered verified (describe/query), not guessed.

## 2026-06-11 (checkpoint mode)

- **Checkpoint mode added to the Git safety rule** — an opt-in, per-task exception to the
  "never commit without an explicit request" rule, modeled on the TDD validate-loop exception
  (one explicit grant, then automatic iteration). When the user grants it (*"checkpoint as you
  go"*), the main agent commits on a dedicated `checkpoint/<task-slug>` branch at stable points
  only — green validate, completed work item (with its build summary), or just before a
  risky/hard-to-undo step — so long multi-brief runs always have a known-good state to roll
  back to. Push, merge-back, rollback, and branch cleanup stay explicit-request-only; the grant
  expires when the task ends. The user's original branch is never committed to.
- **Orchestration updated to match** — Priority 4 names the main agent as the only committer
  (parallel dispatches checkpoint only at merge points); *"checkpoint as you go"* joins the
  steering phrases; the README's Agent Orchestration guide gained a "Checkpoint commits
  (opt-in)" subsection; `salesforce-developer` role boundaries now state it never runs git.

## 2026-06-11 (agent orchestration)

- **Agent Orchestration guide added to the README** — full lifecycle for the main agent +
  `salesforce-developer` + `architect` trio: a structured **work-brief template** (objective,
  spec reference, embedded schema context, test scenarios, constraints, dependencies, expected
  outputs, validation criteria), parallel-vs-sequential dispatch rules (including a
  contract-first variant for parallelizing dependent artifacts), the build-summary-as-
  integration-point rule, and the BLOCKED → fix-brief → re-review loop. Patterns adapted from
  [Agentic Project Management](https://github.com/sdi2200262/agentic-project-management); its
  message bus, handoffs, and Planner agent were deliberately not adopted.
- **"Prompting a pattern" subsection** — what the user actually types to get each dispatch
  shape: a per-pattern example-prompt table, the three steering levers (work scoping,
  parallelism/contract pinning, architect gates), and a kickoff prompt opening every worked
  example. Baselines gained the matching rule: honor explicit steering in the prompt,
  otherwise derive the shape from the dependency structure and skip the architect.
- **Six collapsed worked examples, one per pattern** — all standard-object builds the community
  demonstrably does a lot (tutorial sources linked in each): Opportunity rollup (dependent
  chain + fix loop), CMDT-driven reusable datatable for Account/Contact/Opportunity
  (contract-first parallel dispatch), Case SLA escalation (the self-contained brief), Lead
  auto-conversion (build summary as integration point), Case/Task data-hygiene batches (the
  task loop repeated), and an Account address-verification callout (design gate + build gate).
- **Baselines: Priority 4 renamed to "Agent Orchestration & Spec Doc Map"** — now carries the
  enforceable subset of the orchestration rules (structured brief with embedded context,
  dispatch rules, build-summary tracking, review loop) above the existing doc map.
- **Agents updated** — `salesforce-developer` lists the work-brief fields it expects and asks
  (rather than inventing requirements) when test scenarios or validation criteria are missing;
  `architect` gained an "After the review" section making the report append-only and its
  Recommended Actions the seed of the fix brief.

## 2026-06-11 (installer v1.1)

- **Keyboard-driven prompts** — assistant choice is an arrow-key picker; skill and agent
  selection are spacebar checkboxes with `a` = select all (empty selection = install none);
  confirms are single-key y/N. Piped stdin (tests, CI) falls back to the numbered line
  prompts, where empty input now means *none* instead of *all*.
- **Dependency detection + offer** — after copying, the installer checks project and
  user-level skill directories (and the Claude Code plugin cache) for `forcedotcom/sf-skills`
  and the Karpathy guidelines, and offers to run `npx skills add` for anything missing. The
  Claude Code Karpathy plugin can't be installed from a script, so its `/plugin` commands are
  printed instead. The final "next steps" list only what is still missing.

## 2026-06-11 (later)

- **Interactive installer shipped** — `npx github:drsaavedra/sf-agentic-development`, run from
  the target project root. Prompts for assistant (Claude Code / Copilot / Codex), skills,
  agents, and the Commerce flag; copies everything into the per-assistant directories, drops
  the matching baseline, and patches the baseline's new `<!-- commerce-flag -->` sentinel line
  when Commerce is selected. Zero dependencies (`scripts/install.js` + `package.json` bin).
- **SETUP.md folded into README.md** — the installer replaced the manual walkthrough as the
  headline path; manual copy steps survive in a collapsed *Manual setup* block. One document
  instead of two.

## 2026-06-11

- **TDD sequencing rule added to the baselines** — Apex: test class first
  (`generating-apex-test`), then implement (`generating-apex`); red/green verified via
  **validate deploy** (`sf project deploy validate --test-level RunSpecifiedTests`) so tests
  compile and run against real org metadata without changing the org. First validate of a loop
  is confirmed by the user; later iterations re-run automatically and the agent reads the test
  results. LWC: generated components get a quality spot-check; Jest specs (sfdx-lwc-jest) are
  recommended to the user, generated only on request.
- **Baselines restructured** — the Always-On Safety Floor's operational rules (deploy/install/delete
  approval, deploy-command confirmation, job-ID-only polling, no secrets/PII in output) moved into
  Priority 1, now "Behavioral Guidelines & Operational Safety"; the code-quality floor was dropped
  (covered by `generating-apex` / `salesforce-apex-quality`). Remaining sections renumbered.
- **Karpathy guidelines made always-on, per assistant** — the invocation is now a mandatory
  every-task step; install is the plugin for Claude Code and a skill
  (`npx skills add forrestchang/andrej-karpathy-skills`) for Codex/Copilot, since the `/plugin`
  commands are Claude Code-only.
- **Render script added** — `scripts/render-baselines.js` regenerates `CLAUDE.md`, `AGENTS.md`,
  and `.github/copilot-instructions.md` from `templates/baseline.md`; the renders are no longer
  edited by hand.
- **Setup docs consolidated** — `claude-setup.txt` and `github-cli-setup.txt` removed (their
  content had drifted); `SETUP.md` is the single setup source, with a quick-start in the README.
- **Agents generalized** — leaked project-specific wording removed from `architect`; baseline
  references in both agents now name all three assistants; `model:` keys annotated as
  Claude Code-only.
- **Cross-references made name-based** — docs now reference "Project Conventions" and
  "Agent → Spec Doc Map" by section name instead of priority number, so renumbering can't
  silently break them.
- **Housekeeping** — added MIT `LICENSE`, `.gitattributes` (LF normalization), and this changelog.
