import * as fs from "node:fs";
import * as path from "node:path";

const POINTER = `${process.env.HOME}/.claude/cc-edit-diff/current-session`;

if (!fs.existsSync(POINTER)) {
  console.log("No edits recorded yet.");
  process.exit(0);
}

const sessionFile = fs.readFileSync(POINTER, "utf-8").trim();

if (!fs.existsSync(sessionFile)) {
  console.log("No edits recorded yet.");
  process.exit(0);
}

const lines = fs.readFileSync(sessionFile, "utf-8").split("\n").filter(Boolean);

type Edit = { file: string; line?: number | undefined };
const edits: Edit[] = [];

for (const line of lines) {
  try {
    const raw = JSON.parse(line) as Record<string, unknown>;

    const toolName = raw.tool_name as string | undefined;
    if (toolName === "Edit" || toolName === "Write" || toolName === "MultiEdit") {
      const input = raw.tool_input as Record<string, unknown> | undefined;
      const file = input?.file_path as string | undefined;
      if (!file) continue;

      let lineNum: number | undefined;

      // For Edit, find line number from old_string
      if (toolName === "Edit" && typeof input?.old_string === "string" && input.old_string) {
        try {
          const content = fs.readFileSync(file, "utf-8");
          const firstLine = (input.old_string as string).split("\n")[0];
          if (firstLine) {
            const idx = content.indexOf(firstLine);
            if (idx !== -1) {
              lineNum = content.substring(0, idx).split("\n").length;
            }
          }
        } catch {
          // file might not exist yet (Write), skip
        }
      }

      edits.push({ file, line: lineNum });
    }
  } catch {
    // skip invalid lines
  }
}

if (!edits.length) {
  console.log("No edits recorded yet.");
  process.exit(0);
}

// Deduplicate files, keep latest line per file
const fileMap = new Map<string, number | undefined>();
for (const edit of edits) {
  fileMap.set(edit.file, edit.line ?? fileMap.get(edit.file));
}

// Output formatted markdown with terminal hyperlinks
for (const [file, line] of fileMap) {
  const display = line ? `${file}:${line}` : file;
  const target = line ? `${file}:${line}` : file;
  // OSC 8 hyperlink: \e]8;;URI\e\\TEXT\e]8;;\e\\
  console.log(`\x1b]8;;file://${target}\x1b\\${display}\x1b]8;;\x1b\\`);
}
