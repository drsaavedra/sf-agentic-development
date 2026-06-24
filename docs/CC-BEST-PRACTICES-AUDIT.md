# Claude Code Best-Practices Audit

A cross-session checklist for walking every tip in
[shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice#-tips-and-tricks-83)
against **this repo** and deciding, per tip: does it apply here, have we already done it, can we
still improve it.

This repo is a **skills/agents authoring repo** (`reviewing-*` / `sf-plan` / `sf-build` skills, three
agents, three assistant instruction files, a render/validate/test pipeline) — not an application. So
tips that audit a **repo artifact** are tracked below; tips that are **personal session habits**
(context budget, `/rewind`, `/voice`, worktrees-as-workflow) change no file here and are parked in
the [Excluded appendix](#excluded-session-habit-tips) with a reason, so all 85 are accounted for.

**Status legend:** ⬜ not-yet-assessed · ✅ already-satisfied · 🔧 gap → fixing · ✔ gap-fixed · ➖ not-applicable (recorded)

**Last updated:** 2026-06-24 — scaffold created; no tips assessed yet (all in-scope rows ⬜).

---

## How to use this across sessions

Any session can resume the audit with no handoff — this doc is the state.

1. **Pick the next category** below that still has `⬜` rows. Work **one category per session** so each PR stays single-concern.
2. For each tip: **open the actual artifact** named in its row, decide `✅ / 🔧 / ➖`, and write a one-line verdict with file evidence. No verdict without reading the file.
3. For each `🔧 gap`: implement the **minimum focused improvement**, then run `npm test` and `node scripts/validate-references.js` (and `npm run render` if a baseline is affected).
4. **Update this doc** (status + evidence + PR link + bump *Last updated*) and, **with the user's explicit go-ahead**, raise one focused PR in the repo's single-concern style.
5. Stop at the category boundary; the next session resumes from the first `⬜`.

**Guardrails (every session):** never `git commit` / `git push` without an explicit grant that
session (repo `CLAUDE.md` rule); no org deploys; keep each change single-concern.

---

## In-scope tips (53)

### CLAUDE.md + .claude/rules — audit `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`

| # | Tip | Status | Verdict / evidence | Action |
|---|---|---|---|---|
| 22 | CLAUDE.md file length (<200 lines, lean) | ⬜ | | |
| 23 | `.claude/rules/` auto-loading + `paths:` frontmatter lazy-load | ⬜ | | |
| 24 | `<important if="…">` tag wrappers for domain rules | ⬜ | | |
| 25 | Multiple CLAUDE.md for monorepos | ⬜ | | |
| 26 | Split oversized instructions across `.claude/rules/` | ⬜ | | |
| 27 | First-try execution ("run the tests" works on first attempt) | ⬜ | | |
| 28 | Clean codebase / no partial migrations | ⬜ | | |
| 29 | Sandbox configuration documented | ⬜ | | |

### Agents — audit `agents/salesforce-developer.md`, `agents/architect.md`, `agents/code-reviewer.md`, `docs/ORCHESTRATION.md`

| # | Tip | Status | Verdict / evidence | Action |
|---|---|---|---|---|
| 30 | Subagent handoffs retain context | ⬜ | | |
| 31 | Subagent for exploratory work | ⬜ | | |
| 32 | One subagent per responsibility | ⬜ | | |
| 33 | Agent invocation patterns (specific, not vague) | ⬜ | | |
| 34 | Parallel subagent teams | ⬜ | | |
| 35 | Subagent memory / independent checkpoints | ⬜ | | |
| 36 | Cross-team handoffs with explicit state summaries | ⬜ | | |
| 37 | Subagent isolation benefits | ⬜ | | |
| 38 | Integration testing via subagents | ⬜ | | |
| 39 | Code review subagents | ⬜ | | |
| 40 | Recursive subagent chains (architect → implementer → reviewer) | ⬜ | | |
| 41 | Status tracking in teams | ⬜ | | |

### Commands — does the repo ship `.claude/commands/`? (skills invoked as `/skill-name`)

| # | Tip | Status | Verdict / evidence | Action |
|---|---|---|---|---|
| 42 | Command naming clarity | ⬜ | | |
| 43 | Command parameterization | ⬜ | | |
| 44 | Command reusability | ⬜ | | |
| 45 | Command documentation (headers, usage examples) | ⬜ | | |
| 46 | Chaining commands | ⬜ | | |
| 47 | Command → skill integration | ⬜ | | |

### Skills — audit `skills/*/SKILL.md` and their `references/`

| # | Tip | Status | Verdict / evidence | Action |
|---|---|---|---|---|
| 48 | Skill modularity / single-responsibility | ⬜ | | |
| 49 | Skill documentation (inputs, outputs, error handling) | ⬜ | | |
| 50 | Skill composition over monolith | ⬜ | | |
| 51 | Error handling in skills | ⬜ | | |
| 52 | Skill versioning on breaking changes | ⬜ | | |
| 53 | Skill testing / test cases | ⬜ | | |
| 54 | Skill dependencies & prerequisites documented | ⬜ | | |
| 55 | Skill performance (avoid long-running ops) | ⬜ | | |
| 56 | Leverage bundled skills (`/code-review`, `/batch`) | ⬜ | | |

### Hooks — none shipped today; assess whether maintainer hooks would help

| # | Tip | Status | Verdict / evidence | Action |
|---|---|---|---|---|
| 57 | OnFileEdit hooks (format/lint/validate on change) | ⬜ | | |
| 58 | EnterWorktree/ExitWorktree hooks | ⬜ | | |
| 59 | WorktreeCreate/WorktreeRemove hooks | ⬜ | | |
| 60 | Hook error handling | ⬜ | | |

### Workflows — audit `docs/ORCHESTRATION.md`, `docs/PIPELINE.md`, `README.md`

| # | Tip | Status | Verdict / evidence | Action |
|---|---|---|---|---|
| 61 | Orchestration pattern (Command → Agent → Skill) | ⬜ | | |
| 62 | Phase-based workflows (Research→Plan→Execute→Review→Ship) | ⬜ | | |
| 63 | Vertical slice workflows | ⬜ | | |
| 64 | Workflow reusability across projects | ⬜ | | |
| 65 | Dynamic workflow selection (ultracode / `/effort`) | ⬜ | | |
| 66 | Workflow documentation (diagrams, decision trees) | ⬜ | | |

### Planning / review / CI tips that map to a repo artifact

| # | Tip | Status | Verdict / evidence | Action |
|---|---|---|---|---|
| 5 | Interview-based specs (AskUserQuestion) → `sf-plan` grilling | ⬜ | | |
| 6 | Phase-wise gated plans → `sf-build` + architect/code-reviewer gates | ⬜ | | |
| 7 | Vertical slices over horizontal phasing → `sf-plan`/`sf-build` work items | ⬜ | | |
| 8 | Secondary review with staff engineer → `architect` + `code-reviewer` | ⬜ | | |
| 9 | Detailed specs reduce ambiguity → `sf-plan` design contract | ⬜ | | |
| 15 | Subagent context management → `salesforce-developer` isolated context | ⬜ | | |
| 68 | Cross-model workflows → ships Copilot + Codex instruction files | ⬜ | | |
| 78 | Code review before merge → `code-reviewer` + `.github/workflows/test.yml` | ⬜ | | |

---

## Excluded (session-habit) tips (32)

Personal session-operation habits — they change no artifact in a skills/agents repo, so they are not
tracked as work. Listed here so the full 85 are provably considered.

| # | Tip | Why excluded |
|---|---|---|
| 1 | Challenge Claude ("grill me") | Session prompting habit — already embodied by `sf-plan`'s grilling pattern (cross-ref, not re-tracked) |
| 2 | Elegant solution after mediocre fix | Session prompting habit |
| 3 | Bug-fixing autonomy ("fix") | Session prompting habit |
| 4 | Start with plan mode | Session habit — repo's `sf-plan` is the planning path (cross-ref) |
| 10 | Prototype-driven development | Session working style |
| 11 | Context rot threshold | Personal context-budget management |
| 12 | Dumb zone prevention (<40%) | Personal context-budget management |
| 13 | Rewind strategy (`/rewind`) | Personal session navigation |
| 14 | Strategic compaction (`/compact`) | Personal session navigation |
| 16 | Decision points after each turn | Personal session navigation |
| 17 | New task = new session | Personal session discipline |
| 18 | Handoff summaries before rewinding | Personal session navigation |
| 19 | Compact vs. clear trade-offs | Personal session navigation |
| 20 | Recaps for long sessions | Personal session config |
| 21 | Session naming / multi-instance (`/rename`, `/resume`) | Personal session management |
| 67 | Multi-session coordination (`--bg`) | Personal multi-instance workflow |
| 69 | Ralph Wiggum loop | Personal self-correcting-loop workflow |
| 70 | Git worktrees for isolation | Personal workflow (not a repo artifact) |
| 71 | Scheduled tasks (`/loop`, `/schedule`, cron) | Personal automation workflow |
| 72 | Ultrareview task tracking (`/code-review ultra`) | Personal session tooling |
| 73 | Deep research workflows | Personal session tooling |
| 74 | Worktree-based development | Personal workflow |
| 75 | Worktree isolation rules (`.worktreeinclude`) | Personal workflow config |
| 76 | PR automation | Personal workflow (repo already follows single-concern PRs by hand) |
| 77 | Branch-specific environments (worktree hooks) | Personal workflow |
| 79 | Error message analysis | Session debugging habit |
| 80 | Minimized reproduction cases | Session debugging habit |
| 81 | Log-driven debugging | Session debugging habit |
| 82 | Iterative test refinement | Session debugging habit — TDD already enforced for repo's own tests / by `generating-apex-test` |
| 83 | Voice dictation (`/voice`) | Personal input method |
| 84 | Remote control (`/remote-control`) | Personal session tooling |
| 85 | No-flicker mode (`/tui fullscreen`) | Personal UI preference |

---

*Count check: 53 in-scope + 32 excluded = 85 source tips, each appearing exactly once.*
