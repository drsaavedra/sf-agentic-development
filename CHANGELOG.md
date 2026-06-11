# Changelog

Notable changes to the toolkit, newest first. For full detail see `git log`.

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
