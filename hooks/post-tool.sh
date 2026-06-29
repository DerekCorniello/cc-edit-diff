#!/usr/bin/env bash

POINTER="$HOME/.claude/cc-edit-diff/current-session"

if [ ! -f "$POINTER" ]; then
  exit 0
fi

SESSION_FILE=$(cat "$POINTER")

if [ ! -f "$SESSION_FILE" ]; then
  exit 0
fi

cat >> "$SESSION_FILE"
echo "" >> "$SESSION_FILE"
