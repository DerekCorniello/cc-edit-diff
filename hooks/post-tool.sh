#!/usr/bin/env bash

BASE="$HOME/.claude/cc-edit-diff/sessions"
mkdir -p "$BASE"

# Read all input
INPUT=$(cat)

# Try to extract session_id from the input (it might be in JSON metadata)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)

# Fallback: look for the most recent session directory if session_id not found
if [ -z "$SESSION_ID" ]; then
  SESSION_ID=$(ls -t "$BASE"/*.jsonl 2>/dev/null | head -1 | xargs -r basename | sed 's/\.jsonl$//')
fi

# If we still don't have a session_id, just output and exit
if [ -z "$SESSION_ID" ]; then
  echo "$INPUT"
  exit 0
fi

SESSION_FILE="$BASE/${SESSION_ID}.jsonl"

# Write the input to the session file
echo "$INPUT" >> "$SESSION_FILE"

# Try to extract tool metadata for display
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)

# Only show feedback for Edit/Write/MultiEdit
if [ "$TOOL_NAME" != "Edit" ] && [ "$TOOL_NAME" != "Write" ] && [ "$TOOL_NAME" != "MultiEdit" ]; then
  exit 0
fi

# Extract file path directly from tool_input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Find approximate line number
LINE_NUM=""
if [ "$TOOL_NAME" = "Edit" ]; then
  OLD_STR=$(echo "$INPUT" | jq -r '.tool_input.old_string // empty' 2>/dev/null)
  if [ -n "$OLD_STR" ] && [ -f "$FILE_PATH" ]; then
    FIRST_LINE=$(echo "$OLD_STR" | head -1)
    if [ -n "$FIRST_LINE" ]; then
      LINE_NUM=$(grep -n "$(printf '%s\n' "$FIRST_LINE" | sed 's/[[\.*^$/]/\\&/g')" "$FILE_PATH" 2>/dev/null | head -1 | cut -d: -f1)
    fi
  fi
fi

# Output formatted feedback with OSC 8 hyperlink
DISPLAY="${FILE_PATH}${LINE_NUM:+:$LINE_NUM}"
echo ""
echo "[edit-diff]"
printf "\x1b]8;;file://%s\x1b\\%s\x1b]8;;\x1b\\\n" "$DISPLAY" "$DISPLAY"
echo ""
