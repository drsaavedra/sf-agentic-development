# Vision — Toward an Autonomous Salesforce Delivery Workflow

> Status: **direction-setting** (living document). Started 2026-06-14.
> This describes where the toolkit is going, not everything it does today. Where this doc and the
> current `README.md` / baseline `CLAUDE.md` disagree, the shipped behavior is what's installed —
> this is the target we are building toward.

---

## 1. The thesis

The output of the workflow is a reflection of the design it is given. A rigorous design produces a
rigorous solution; a vague one produces a confident, wrong one. So the leverage is not in making the
agents cleverer — it is in making the **design contract** so complete that an agent can build, test,
and ship from it without a human reading over its shoulder.

The goal we are building toward — not what ships today — is an agentic workflow that **builds, tests,
and deploys Salesforce solutions autonomously**, stopping only when it hits a genuine gap in the
design it cannot responsibly resolve.

## 2. The shift: the human moves up the stack

Today the toolkit is a productivity tool with a human **at the wheel**. Priority 1 of the baseline
gates every consequential action on explicit human confirmation — deploys, the first validate of a
loop, every commit, checkpoint mode, even reading test results back. That is the correct design for
a tool a person drives.

Autonomy does not *remove* the human. It **moves the human from operator to author**:

| | Operator (today) | Author (target) |
|---|---|---|
| Where the human spends effort | Approving each command, steering dispatch, reading results | Curating the design contract before the run |
| What catches a bad outcome | The human, watching live | The completeness gate + the escalation protocol |
| When the human is consulted | Constantly | Only at genuine design gaps, and at the production line |

The master — the developer/architect — does the thorough work **up front**, in the design. The
workflow is a faithful executor of that design. This is the whole bargain: **the more rigor you put
into the contract, the less the workflow has to ask.**

## 3. The danger zone (and why the contract comes first)

The risk in autonomy is not that the agent does the wrong thing on purpose. It is that an
underspecified design contains silent gaps, and an unattended agent **guesses instead of escalating**
— because the human who used to catch the guess is no longer watching.

Therefore the first thing we build is not the autonomy engine. It is the thing that makes autonomy
*safe to grant*: a design contract rigorous enough, and a gate strict enough, that the workflow
**knows when it does not know** — and stops.

## 4. Target operating model

A single autonomous run, end to end:

1. **Intake** — the master supplies the design contract (the CONTEXT / spec). Nothing else is needed
   from a human for the happy path.
2. **Completeness gate** — the workflow refuses to start until the contract is buildable
   unattended: every entry point, schema touchpoint, test scenario, acceptance criterion, and
   constraint is present and unambiguous. Missing or contradictory → escalate to the master *before*
   any code exists.
3. **Plan & dispatch** — the orchestrator derives the work shape from the contract's dependency
   structure (parallel where independent, sequenced where chained, contracts pinned at integration
   points) and records it in a durable ledger.
4. **Build · verify loop** — `salesforce-developer` builds via TDD; the loop runs validate, parses
   results itself, self-corrects within a retry budget, and exits only on a machine-checkable
   definition of done (all scenarios green, coverage target met, analyzer clean).
5. **Govern** — `architect` reviews against the contract. **BLOCKED** routes back into the build
   loop with concrete recommended actions, automatically.
6. **Promote** — deploy autonomously up the environment ladder. Production is the one line where a
   human still signs (§6).
7. **Account** — the run leaves an auditable trail: what was built, what was decided, what was
   deployed where, and every point it escalated.

The human appears in exactly two places on the happy path: **authoring the contract (step 1)** and
**signing the production promotion (step 6)**. Everywhere else, only on a genuine gap.

## 5. What "a genuine gap" means

"Stop only for questionable gaps" must become a **detector**, not a judgment call made live. A gap is
escalation-worthy when the workflow cannot resolve it from (a) the design contract, (b) the org as
source of truth via read-only introspection, or (c) an established repo pattern — *and* the choice
materially changes behavior. The escalation rubric — confidence thresholds, what counts as a safe
default vs. a behavior-changing fork, how a stuck build loop hands back — is itself part of what we
build. Until it exists, autonomy stays off.

## 6. Autonomy boundaries — what never gets delegated

Autonomy expands what the agent may do unattended. It does **not** dissolve the safety floor. These
survive intact from Priority 1, regardless of autonomy level:

- **The environment ladder.** Full autonomy through scratch orgs and CI sandboxes — build, validate,
  deploy, test there freely. **Production promotion keeps a human signature.** That is the one gate
  that does not convert from human- to machine-gated.
- **No secrets, credentials, session IDs, tokens, or PII** in code, tests, logs, or generated files —
  ever, attended or not.
- **Destructive and irreversible operations** (destructive deploys, data deletes, history rewrites)
  escalate, even inside an otherwise-autonomous run.
- **The org is the source of truth for schema.** No guessing API names; verify via read-only
  introspection before writing anything that touches the schema.

Autonomy changes *who confirms the routine* (machine-checkable gates replace human confirmation for
validate/build/sandbox-deploy). It does not change *who owns the irreversible* (still a human).

## 7. The capability roadmap

The gaps between today's tool and the target model, in build order. The first is the keystone — it is
what makes the rest safe to turn on.

1. **Design contract + completeness gate** *(keystone)* — a machine-checkable CONTEXT/spec schema
   and a gate that refuses to build an incomplete design. Makes autonomy safe to grant.
2. **Autonomy + escalation model** — convert Priority 1's human-confirmation gates to machine-gated
   conditions plus the §5 gap detector and §6 boundaries.
3. **Self-verifying build/deploy loop** — the validate→correct→re-validate loop closes itself:
   retry budget, machine-checkable "done," automatic BLOCKED→fix routing.
4. **Durable run state** — a persisted work-ledger (done / blocked / deployed-where) so a long run
   survives context compaction and is auditable, instead of living only in chat context.
5. **Environment ladder** — explicit promotion policy: total autonomy through sandbox, human
   signature at production.

## 8. Principles

- **The contract is the product.** Effort spent making the design rigorous beats effort spent making
  the agent clever. Garbage in is the failure mode autonomy can no longer catch.
- **Know when you don't know.** An autonomous workflow's most important behavior is stopping at a
  real gap rather than guessing past it.
- **Machine-gate the routine; human-gate the irreversible.** Convert confirmations into checkable
  conditions everywhere it is safe; keep a human on production and on anything that cannot be undone.
- **Leave a trail.** Every autonomous run must be auditable after the fact — what it built, decided,
  deployed, and escalated.
