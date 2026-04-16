#!/usr/bin/env node
"use strict";

// Runs automatically after `npm install -g git-shortcuts`.
// Never throws — partial failures log warnings but don't break the install.

const {
  log, ok, warn,
  commandExists,
  setGitAliases,
  writeManagedBlock,
  posixRcFiles,
  powershellProfilePaths
} = require("../lib/core.js");

// Skip when running as a dependency of another project, not a global install.
// npm sets npm_config_global=true for global installs.
if (process.env.npm_config_global !== "true" && !process.env.GIT_SHORTCUTS_FORCE) {
  log("git-shortcuts: skipping postinstall (not a global install). Use `npm install -g git-shortcuts`.");
  process.exit(0);
}

try {
  log("git-shortcuts: installing...\n");

  setGitAliases();

  log("\nWriting shell aliases...");

  for (const f of posixRcFiles()) writeManagedBlock(f, "posix");

  if (process.platform === "win32" || commandExists("pwsh")) {
    for (const f of powershellProfilePaths()) writeManagedBlock(f, "powershell");
  }

  log("");
  ok("Done. Open a new terminal to activate shell aliases.");
  log("  • `git s`, `git p`, etc. work immediately in any shell.");
  log("  • Bare `s`, `p`, etc. work after opening a new terminal.");
  log("  • `npm uninstall -g git-shortcuts` reverses everything.");
} catch (e) {
  warn(`git-shortcuts postinstall hit an error: ${e.message}`);
  warn("The package is still installed. You can investigate or `npm uninstall -g git-shortcuts` to undo.");
  // Exit 0 regardless — we never want to fail the npm install itself.
}
process.exit(0);
