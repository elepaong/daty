#!/usr/bin/env node
// Stop hook: reminds the agent (never blocks) when the turn ends with uncommitted or unpushed work.
// Mirrors the git check the Claude Code cloud sessions ran at the end of each turn.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}");
  if (input.stop_hook_active) process.exit(0); // already reminded once in this turn
} catch {
  // ignore malformed input
}

const git = (...args) => {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
};

if (git("rev-parse", "--is-inside-work-tree") !== "true") process.exit(0);
const notes = [];
const dirty = git("status", "--porcelain");
if (dirty) notes.push(`uncommitted changes:\n${dirty}`);
const ahead = git("rev-list", "--count", "@{upstream}..HEAD");
if (ahead && ahead !== "0") notes.push(`${ahead} commit(s) not pushed`);
if (git("rev-parse", "--abbrev-ref", "HEAD") === "main" && dirty) notes.push("you are on main: create a branch before committing");
if (notes.length) process.stderr.write(`[daty] Before you finish: ${notes.join("; ")}\n`);
process.exit(0);
