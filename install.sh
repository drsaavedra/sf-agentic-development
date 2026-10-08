#!/usr/bin/env bash
# Points your Claude config dir at this repo's skills and agents, and (with --project) a
# Salesforce project's .claude/rules/ at this repo's rules. Idempotent. Never deletes.
#
#   install.sh                        link skills + agents into the config dir
#   install.sh --check                report only; exit 1 if any link is wrong
#   install.sh --pull                 copy a clobbered real file back over the repo copy
#   install.sh --project <path>       also link rules/ into <path>/.claude/rules/sf-agentic-development
#   install.sh --check --project <p>  check the rules link too
#
# Skills and agents link per item rather than as whole directories: <config>/skills
# also holds skills from other sources, so linking the directory would orphan them.
#
# Rules link per project, not into <config>/rules. User-level rules load in every
# project, and Salesforce routing has no business firing in a non-Salesforce repo. The
# per-project directory symlink is the form documented for sharing rules across projects.
set -uo pipefail

REPO="$(cd -P "$(dirname "$0")" && pwd)"
# Config dir: $CLAUDE_STACK if set, else Claude Code's own $CLAUDE_CONFIG_DIR, else ~/.claude.
STACK="${CLAUDE_STACK:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}"
RULES_LINK_NAME="sf-agentic-development"

MODE=install
PROJECT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --check|--pull)
      MODE="$1"
      ;;
    --project)
      shift
      PROJECT="${1:-}"
      [ -n "$PROJECT" ] || { echo "--project needs a path"; exit 2; }
      ;;
    *)
      echo "usage: install.sh [--check|--pull] [--project <path>]"; exit 2
      ;;
  esac
  shift
done

# Parallel arrays of what gets linked, built fresh each run so a new skill or agent
# needs no edit here.
LABELS=(); SRCS=(); DSTS=()
add() { LABELS+=("$1"); SRCS+=("$2"); DSTS+=("$3"); }

for dir in "$REPO"/skills/*/; do
  [ -d "$dir" ] || continue
  name="$(basename "$dir")"
  add "skill/$name" "$REPO/skills/$name" "$STACK/skills/$name"
done

for file in "$REPO"/agents/*.md; do
  [ -e "$file" ] || continue
  name="$(basename "$file")"
  add "agent/$name" "$REPO/agents/$name" "$STACK/agents/$name"
done

if [ -n "$PROJECT" ]; then
  ABS_PROJECT="$(cd "$PROJECT" 2>/dev/null && pwd)" ||
    { echo "--project: no such directory: $PROJECT"; exit 2; }
  add "rules" "$REPO/rules" "$ABS_PROJECT/.claude/rules/$RULES_LINK_NAME"
fi

if [ "${#LABELS[@]}" -eq 0 ]; then
  echo "nothing to link — no skills/ or agents/ found in $REPO"; exit 1
fi

RC=0
note() { printf '%-26s %s\n' "$1" "$2"; }

for i in "${!LABELS[@]}"; do
  NAME="${LABELS[$i]}"; SRC="${SRCS[$i]}"; DST="${DSTS[$i]}"

  if [ ! -e "$SRC" ]; then
    note "$NAME" "MISSING in repo — refusing to link ($SRC)"; RC=1; continue
  fi

  case "$MODE" in
    --check)
      if [ ! -e "$DST" ] && [ ! -L "$DST" ]; then
        note "$NAME" "missing"; RC=1
      elif [ ! -L "$DST" ]; then
        note "$NAME" "NOT A SYMLINK — real file at $DST"; RC=1
      elif [ "$(readlink "$DST")" != "$SRC" ]; then
        note "$NAME" "wrong target — $(readlink "$DST")"; RC=1
      else
        note "$NAME" "ok"
      fi
      ;;
    --pull)
      if [ -e "$DST" ] && [ ! -L "$DST" ]; then
        # Dirs: copy DST's contents into SRC (trailing /.) so it doesn't nest inside it.
        if [ -d "$DST" ]; then
          COPY_CMD=(cp -R "$DST/." "$SRC/")
        else
          COPY_CMD=(cp -R "$DST" "$SRC")
        fi
        if "${COPY_CMD[@]}"; then
          note "$NAME" "pulled live copy into the repo"
        else
          note "$NAME" "pull FAILED"; RC=1
        fi
      else
        note "$NAME" "no pull needed"
      fi
      ;;
    install)
      if [ -L "$DST" ] && [ "$(readlink "$DST")" = "$SRC" ]; then
        note "$NAME" "ok"; continue
      fi
      mkdir -p "$(dirname "$DST")"
      if [ -e "$DST" ] || [ -L "$DST" ]; then
        BACKUP="$REPO/.install-backup/$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP"
        # Flatten the label (skill/foo -> skill-foo) so a skill and an agent that share
        # a basename cannot collide inside one timestamped backup directory.
        SAVED="${NAME//\//-}"
        mv "$DST" "$BACKUP/$SAVED" ||
          { note "$NAME" "backup FAILED"; RC=1; continue; }
        note "$NAME" "backed up to ${BACKUP#"$REPO"/}/$SAVED"
      fi
      ln -s "$SRC" "$DST" && note "$NAME" "linked" ||
        { note "$NAME" "link FAILED"; RC=1; }
      ;;
  esac
done

if [ -z "$PROJECT" ] && [ "$MODE" != "--pull" ]; then
  echo
  echo "rules/ not linked — pass --project <path> to link it into a Salesforce project."
fi

exit $RC
