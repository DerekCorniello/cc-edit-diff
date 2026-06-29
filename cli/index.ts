import * as fs from "node:fs";

const LOG = process.env.HOME + "/.cc-edit-diff/edits.jsonl";

function parseLine(line: string) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function link(file: string, line?: number) {
  const target = line
    ? `file://${process.cwd()}/${file}#${line}`
    : `file://${process.cwd()}/${file}`;

  return `\x1b]8;;${target}\x07🟢 open\x1b]8;;\x07`;
}

function main() {
  if (!fs.existsSync(LOG)) {
    console.log("No edits yet.");
    return;
  }

  const lines = fs.readFileSync(LOG, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map(parseLine)
    .filter(Boolean);

  console.log("\nRecent Claude Edits\n");

  for (const e of lines.slice(-15)) {
    if (!e.file) continue;

    console.log(`${link(e.file, e.line)}  ${e.file}:${e.line ?? "?"}`);
  }
}

main();
