#!/usr/bin/env bash

set -e

echo "Installing cc-edit-diff..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE="$HOME/.claude/cc-edit-diff"
SETTINGS="$HOME/.claude/settings.json"

mkdir -p "$BASE"

# Install hooks
cp "$SCRIPT_DIR/hooks/session-start.sh" "$BASE/session-start.sh"
cp "$SCRIPT_DIR/hooks/post-tool.sh" "$BASE/post-tool.sh"
chmod +x "$BASE/session-start.sh" "$BASE/post-tool.sh"

# Install formatter
cp "$SCRIPT_DIR/format-session.ts" "$BASE/format-session.ts"

# Install skill
mkdir -p "$HOME/.claude/skills/edit-diff"
cp "$SCRIPT_DIR/skills/edit-diff/SKILL.md" "$HOME/.claude/skills/edit-diff/SKILL.md"

# Merge hooks into settings.json
if [ -f "$SETTINGS" ]; then
  # Check if jq is available
  if command -v jq &>/dev/null; then
    EXISTING=$(cat "$SETTINGS")
    UPDATED=$(echo "$EXISTING" | jq --arg base "$BASE" '
      .hooks.SessionStart = [{
        "hooks": [{
          "type": "command",
          "command": ("bash " + $base + "/session-start.sh")
        }]
      }] |
      .hooks.PostToolUse = [{
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [{
          "type": "command",
          "command": ("bash " + $base + "/post-tool.sh")
        }]
      }]
    ')
    echo "$UPDATED" > "$SETTINGS"
    echo "Updated $SETTINGS"
  else
    echo "WARNING: jq not found. Add hooks to $SETTINGS manually:"
    cat <<EOF
{
  "hooks": {
    "SessionStart": [{"hooks": [{"type": "command", "command": "bash $BASE/session-start.sh"}]}],
    "PostToolUse": [{"matcher": "Edit|Write|MultiEdit", "hooks": [{"type": "command", "command": "bash $BASE/post-tool.sh"}]}]
  }
}
EOF
  fi
else
  mkdir -p "$(dirname "$SETTINGS")"
  cat > "$SETTINGS" <<EOF
{
  "hooks": {
    "SessionStart": [{"hooks": [{"type": "command", "command": "bash $BASE/session-start.sh"}]}],
    "PostToolUse": [{"matcher": "Edit|Write|MultiEdit", "hooks": [{"type": "command", "command": "bash $BASE/post-tool.sh"}]}]
  }
}
EOF
  echo "Created $SETTINGS"
fi

echo ""
echo "Done. Restart Claude Code, then type /edit-diff to see your recent edits."
