#!/usr/bin/env bash

BASE="$HOME/.claude/cc-edit-diff/sessions"
mkdir -p "$BASE"

SESSION_ID=$(jq -r '.session_id')
SESSION_FILE="$BASE/${SESSION_ID}.jsonl"

# Create the session file
touch "$SESSION_FILE"
