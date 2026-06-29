import * as fs from "node:fs";
import type { EditEvent, Session } from "./types.js";

const SESSIONS_DIR = `${process.env.HOME}/.claude/cc-edit-diff/sessions`;
const POINTER = `${process.env.HOME}/.claude/cc-edit-diff/current-session`;

function parseEdits(filePath: string): EditEvent[] {
  if (!fs.existsSync(filePath)) return [];

  return fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        const raw = JSON.parse(line) as Record<string, unknown>;
        const toolName = raw.tool_name as string | undefined;
        if (toolName === "Edit" || toolName === "Write" || toolName === "MultiEdit") {
          const input = raw.tool_input as Record<string, unknown> | undefined;
          const file = input?.file_path as string | undefined;
          if (file) {
            const timestamp = typeof raw.timestamp === "number" ? raw.timestamp : Date.now();
            return { file, timestamp };
          }
        }
      } catch {
        // skip
      }
      return null;
    })
    .filter((e): e is EditEvent => e !== null);
}

export function listSessions(): Session[] {
  if (!fs.existsSync(SESSIONS_DIR)) return [];

  return fs
    .readdirSync(SESSIONS_DIR)
    .filter((f) => f.endsWith(".jsonl"))
    .sort()
    .map((f) => {
      const edits = parseEdits(`${SESSIONS_DIR}/${f}`);
      return {
        id: f.replace(".jsonl", ""),
        start: edits[0]?.timestamp ?? 0,
        end: edits[edits.length - 1]?.timestamp ?? 0,
        edits,
      };
    });
}

export function getLatestSession(): Session | null {
  if (!fs.existsSync(POINTER)) return null;

  const sessionFile = fs.readFileSync(POINTER, "utf-8").trim();
  if (!fs.existsSync(sessionFile)) return null;

  const edits = parseEdits(sessionFile);
  return {
    id: sessionFile.split("/").pop()!.replace(".jsonl", ""),
    start: edits[0]?.timestamp ?? 0,
    end: edits[edits.length - 1]?.timestamp ?? 0,
    edits,
  };
}
