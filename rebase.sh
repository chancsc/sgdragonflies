#!/usr/bin/env bash
# Rebase your local branch on top of the latest origin/main.
#
# Usage:
#   ./rebase.sh            # rebase current branch onto origin/main
#   ./rebase.sh develop    # rebase onto origin/develop instead
#
# Uncommitted changes are stashed automatically before the rebase and
# restored automatically after (git's --autostash), so it's safe to run
# with a dirty working tree.
set -euo pipefail

BASE_BRANCH="${1:-main}"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$CURRENT_BRANCH" = "HEAD" ]; then
    echo "You're in a detached HEAD state - check out a branch first." >&2
    exit 1
fi

echo "Fetching origin/$BASE_BRANCH..."
git fetch origin "$BASE_BRANCH"

echo "Rebasing $CURRENT_BRANCH onto origin/$BASE_BRANCH..."
if git rebase --autostash "origin/$BASE_BRANCH"; then
    echo "Done. $CURRENT_BRANCH is now up to date with origin/$BASE_BRANCH."
else
    echo
    echo "Rebase stopped with conflicts. Resolve them, then run:"
    echo "  git add <files>"
    echo "  git rebase --continue"
    echo "(or 'git rebase --abort' to back out)"
    exit 1
fi
