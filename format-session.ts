import * as fs from "node:fs";

const SESSIONS_DIR = `${process.env.HOME}/.claude/cc-edit-diff/sessions`;

let sessionFile: string | null = null;

// Try to use explicit session ID if provided
const sessionId = process.argv[2];
if (sessionId) {
  const candidateFile = `${SESSIONS_DIR}/${sessionId}.jsonl`;
  if (fs.existsSync(candidateFile) && fs.statSync(candidateFile).size > 0) {
    sessionFile = candidateFile;
  }
} else {
  // Find the most recent session
  if (fs.existsSync(SESSIONS_DIR)) {
    const files = fs
      .readdirSync(SESSIONS_DIR)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => ({ name: f, path: `${SESSIONS_DIR}/${f}`, time: fs.statSync(`${SESSIONS_DIR}/${f}`).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 0 && fs.statSync(files[0].path).size > 0) {
      sessionFile = files[0].path;
    }
  }
}

if (!sessionFile) {
  console.log("[edit-diff] No edits recorded yet.");
  process.exit(0);
}

const lines = fs.readFileSync(sessionFile, "utf-8").split("\n").filter(Boolean);
if (!lines.length) {
  console.log("[edit-diff] No edits recorded yet.");
  process.exit(0);
}

type Hunk = { line: number | undefined; removed: string; added: string };
const blocks = new Map<string, Hunk[]>();

for (const line of lines) {
  try {
    const raw = JSON.parse(line) as Record<string, unknown>;
    const toolName = raw.tool_name as string;
    if (toolName !== "Edit" && toolName !== "Write" && toolName !== "MultiEdit") continue;

    const input = raw.tool_input as Record<string, unknown> | undefined;
    if (!input) continue;

    if (toolName === "MultiEdit") {
      const ops = input.operations as Array<Record<string, unknown>> | undefined;
      if (ops) for (const op of ops) {
        const f = (op.file_path as string || "").trim();
        if (f && !blocks.has(f)) blocks.set(f, []);
      }
      continue;
    }

    const file = (input.file_path as string || "").trim();
    if (!file) continue;
    if (!blocks.has(file)) blocks.set(file, []);

    let lineNum: number | undefined;
    let removed = "";
    let added = "";

    if (toolName === "Edit") {
      const oldStr = input.old_string as string | undefined;
      const newStr = input.new_string as string | undefined;
      if (oldStr) {
        removed = oldStr;
        try {
          const content = fs.readFileSync(file, "utf-8");
          const firstLine = oldStr.split("\n")[0];
          if (firstLine) {
            const idx = content.indexOf(firstLine);
            if (idx !== -1) lineNum = content.substring(0, idx).split("\n").length;
          }
        } catch {}
      }
      if (newStr) added = newStr;
    } else if (toolName === "Write") {
      added = (input.content as string) ?? "";
    }

    blocks.get(file)!.push({ line: lineNum, removed, added });
  } catch {}
}

if (!blocks.size) {
  console.log("[edit-diff] No edits recorded yet.");
  process.exit(0);
}

console.log("[edit-diff]");

for (const [file, hunks] of blocks) {
  const line = hunks.find((h) => h.line)?.line;
  console.log(line ? `${file}:${line}` : file);

  for (const hunk of hunks) {
    for (const l of hunk.removed.split("\n")) {
      if (l) console.log(`- ${l}`);
    }
    for (const l of hunk.added.split("\n")) {
      if (l) console.log(`+ ${l}`);
    }
  }
  console.log("");
}
