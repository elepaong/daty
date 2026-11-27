#!/usr/bin/env node
// PreToolUse hook for shell commands (Codex and Claude Code both send JSON on stdin with tool_input.command).
// Blocks commands that the project rules forbid. Exit code 2 = block, message on stderr goes back to the agent.
// Uses only Node (the project already needs Node 22), so it runs the same on macOS, Linux and CI.
import { readFileSync } from "node:fs";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0); // not our format: let it through
}
const raw = input?.tool_input?.command;
const command = Array.isArray(raw) ? raw.join(" ") : String(raw ?? "");
if (!command) process.exit(0);

const rules = [
  [/\bprisma\s+db\s+push\b/, "`prisma db push` is not used in this project. Create a migration with `npm run db:migrate` (local dev DB only)."],
  [/\bprisma\s+migrate\s+reset\b/, "`prisma migrate reset` wipes a database. Use `npx prisma db seed -- --reset` on the local dev DB instead."],
  [/\bgit\s+push\b.*(\s--force\b|\s-f\b|\s--force-with-lease\b)/, "Force pushes are not allowed. Push a new commit or ask the user."],
  [/\bgit\s+push\b[^|;&]*\s(origin\s+)?(HEAD:)?main\b/, "Do not push to main. Work on a branch and open a PR."],
  [/\bgit\s+add\b[^|;&]*(\s|\/)\.env(\s|$)/, "`.env` holds secrets and must never be committed."],
];

for (const [pattern, reason] of rules) {
  if (pattern.test(command)) {
    process.stderr.write(`Blocked by .codex/hooks/guard-bash.mjs: ${reason}\n`);
    process.exit(2);
  }
}
process.exit(0);
