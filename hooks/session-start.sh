#!/usr/bin/env bash

BASE="$HOME/.claude/cc-edit-diff/sessions"
mkdir -p "$BASE"

SESSION_ID=$(jq -r '.session_id')
SESSION_FILE="$BASE/${SESSION_ID}.jsonl"

# Write pointer for formatter
echo "$SESSION_FILE" > "$HOME/.claude/cc-edit-diff/current-session"
