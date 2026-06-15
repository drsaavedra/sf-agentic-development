# Changelog

Notable changes to the toolkit, newest first. For full detail see `git log`.

## 2026-06-15 (README slimmed; supporting docs moved into docs/)

The README's Agent Orchestration section was over two-thirds of the file. The full working guide —
lifecycle steps, the work-brief template, dispatch rules, checkpoint commits, prompting guidance,
and the four worked examples — moved to `docs/ORCHESTRATION.md`. The README keeps the summary intro
and the lifecycle diagram, with a pointer to the new doc; the two inbound links were repointed.

`VISION.md` also moved to `docs/VISION.md` (its README link repointed), and the **Recommended
companion skills** subsection moved out of Setup to its own top-level section between Roadmap and
Maintaining.

## 2026-06-14 (Authored skills renamed to verb-led names)

The four authored skills are renamed to match the gerund verb-led convention of the upstream
`forcedotcom/sf-skills` (`generating-apex`, `deploying-metadata`, …), so they read as actions rather
than categories. Directory names and each `SKILL.md` `name:` field changed; all cross-references in
the skills, references, agents, and README were updated to match. The installer enumerates skills from
the directory listing, so it needed no code change.

| Old | New |
|---|---|
| `salesforce-apex-quality` | `reviewing-apex` |
| `salesforce-lwc-quality` | `reviewing-lwc` |
| `salesforce-flow-quality` | `reviewing-flow` |
| `salesforce-deployment` | `deploying-sf-metadata` |

(`deploying-sf-metadata` keeps `sf` to stay distinct from the upstream `deploying-metadata`.) Earlier
entries below retain the old names as an accurate record of those releases.

## 2026-06-14 (Commerce folded into the quality skills; installer is domain-aware)

The standalone `salesforce-commerce-b2b` skill is dissolved into the three quality skills, and the
installer can now include or omit domain reference packs per the user's choice.

- **`salesforce-commerce-b2b` removed** — its rules are folded into a single
  `references/commerce-b2b.md` under each quality skill: Apex backend (`ConnectApi`,
  `CartExtension`, cacheable reads, Commerce-object SOQL, test data) in `salesforce-apex-quality`;
  storefront LWC (Storefront APIs, checkout adapters, product/search, performance) in
  `salesforce-lwc-quality`; and Commerce-object automation (buyer/entitlement/catalog/pricebook
  context, checkout-owned state) in `salesforce-flow-quality`. The data-model/entitlement rules are
  carried into both the Apex and Flow files, framed for each. Each quality skill's routing table now
  points at its `commerce-b2b.md` for Commerce storefront artifacts, so the Commerce review rides the
  skill's own trigger — no manual invoke.
- **Installer gained a domain-pack question** — `scripts/install.js` now asks which optional domain
  reference packs to include (currently **B2B Commerce**), offered only when a selected skill carries
  that pack. Unselected packs are stripped from the installed copy: matching `references/*.md` files
  are removed and their marker-tagged SKILL.md routing rows dropped; selected packs keep the row with
  the marker comment stripped. Driven by a `DOMAIN_PACKS` registry so future domains are config, not
  new logic.
- **README updated** — removed the standalone Commerce skill from the Skills table and Skill Routing;
  rewrote the Commerce projects section around the folded references and the installer pack question.

## 2026-06-14 (baseline removed — pure skills + agents toolkit)

Breaking change: the toolkit no longer ships or generates a baseline file. A `CLAUDE.md` /
`AGENTS.md` / `copilot-instructions.md` can't be forced onto a consumer's repo, so the skills
and agents now stand entirely on their own.

- **Baseline files and generation deleted** — `CLAUDE.md`, `AGENTS.md`,
  `.github/copilot-instructions.md`, `templates/baseline.md`, and `scripts/render-baselines.js`
  are gone, along with the `render` npm script. Verified the move is safe: skills auto-trigger
  from their own `SKILL.md` `description` frontmatter, not from the old Priority 2 routing
  table, so review-on-Apex/LWC/Flow and deploy-metadata behavior is unchanged.
- **Installer simplified** — `scripts/install.js` now asks two questions (assistant, then skills
  + agents) and copies the picks; the Commerce-flag question, baseline copy, and
  `<!-- commerce-flag -->` patching were removed.
- **Priority 1 safety rules folded into skills + agents** — the git-never-commit-unprompted
  rule (with the checkpoint-mode exception) and the org-introspection read-only sf-CLI rule moved
  into `salesforce-deployment`'s Security and Deployment Safety section; the introspection rule
  is also inlined in `salesforce-developer`. The three quality skills (`salesforce-apex-quality`,
  `salesforce-lwc-quality`, `salesforce-flow-quality`) gained a "Schema truth" note so reviews
  flag guessed API names.
- **`salesforce-commerce-b2b` switched to manual-invoke** — it was gated on the baseline's
  Commerce flag, which no longer exists. Its description and scope now say it's loaded on demand
  for Commerce work (overlay during authoring, review pass after the quality skill), never
  auto-triggered from file content.
- **Agents made self-contained** — `salesforce-developer` and `architect` no longer reference a
  repo-root baseline for the spec-doc map, routing, or introspection; they take spec/architecture
  paths from the work brief or invocation and ask the user when none is supplied.
- **README updated** — removed the Baselines section, the baseline-copy step from manual setup,
  and the Commerce-flag instructions; reframed Skill Routing as "each skill declares its own
  trigger"; repointed the Agent Orchestration safety/git references at the skills themselves.

## 2026-06-14 (Salesforce-only scope — behavioral skills demoted to optional)

- **Karpathy guidelines removed as a hard dependency** — the baselines' Priority 1 no longer
  mandates the `karpathy-guidelines` skill on every task. The toolkit now declares exactly one
  dependency, `forcedotcom/sf-skills` (Salesforce-maintained base generation), with the authored
  `salesforce-*` skills as the quality gates on top. General coding-behavior skills are a personal
  preference the template takes no opinion on. Priority 1 renamed **Behavioral Guidelines &
  Operational Safety → Operational Safety**; the `{{INVOKE_KARPATHY}}` template token and its
  per-assistant render values were dropped, and all three baselines re-rendered.
- **Installer no longer offers karpathy** — `scripts/install.js` detects and offers only
  `forcedotcom/sf-skills`; the karpathy detection, install offer, and per-assistant install
  copy were removed. Its closing note points users to the README's new "Recommended companion
  skills" section instead.
- **README adds "Recommended companion skills"** — both
  [andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) and
  [Superpowers](https://github.com/obra/superpowers) are listed there as optional, user-choice
  companions (install commands included), wired into nothing — they activate on their own
  triggers. The dependency description and "After the installer" steps were trimmed to the single
  sf-skills dependency.

## 2026-06-12 (example set curated + dispatch threshold)

- **Dispatch threshold added to the orchestration rules** (README dispatch rules + baselines'
  Priority 4) — orchestrate only when complexity pays for the dispatch. The decision map: a
  spawned agent re-reads context cold (a token cost the user owns — in marginal cases surface
  the trade-off, never silently spawn), while long-running or complex work done inline crowds
  the main context window. Simple single-artifact work and all config stays with the main
  agent; dispatch parallelizable items, multi-artifact chains with long TDD/validate loops,
  or work the user wants to keep planning around. Architect gates are orthogonal — on-demand
  at any size.
- **Worked examples cut from seven to four** — every survivor justifies its dispatch under the
  threshold. Removed: build summary as integration point and the repeated task loop (simple
  sequential dev work — the doctrine they taught lives on in the lifecycle and dispatch
  rules), and the self-contained-brief example (a basic single-instance spawn; its one unique
  insight — gather scattered org config into the brief because the isolated agent can't see
  the conversation — moved into the work-brief section). Survivors renumbered 1–4; index,
  prompting-a-pattern table, and steering-levers list updated to match.
- **Example 1 scenario corrected for platform credibility** — the won-Opportunity rollup was
  wrong as an Apex example: Account↔Opportunity is a standard exception where declarative
  Roll-Up Summary fields work despite the lookup, so coding it signals inexperience. Replaced
  with an open-case rollup (Case↔Account gets no such exception, and flows can't trigger on
  undelete), plus a "why Apex at all" note: when the platform gives the rollup away, take the
  field, not the trigger.

## 2026-06-12 (Flow worked example)

- **Example 7 added to the Agent Orchestration guide** — round-robin lead assignment: a
  record-triggered flow on Lead create calling an invocable Apex action, the routing table's
  "Flow + Apex invocable" cross-domain pair as a worked dispatch. Teaching points: a Flow brief
  is a developer dispatch like any other (same brief template, same quality gates, different
  skill chain), and a Flow that calls Apex is a dependent chain across artifact types — one
  instance, two sequenced work items, the contract inside the brief. Fills the one artifact-type
  gap in the example set now that `salesforce-developer` covers Flow work; index and
  prompting-a-pattern tables gained the matching row.

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
