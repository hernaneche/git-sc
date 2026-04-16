#!/usr/bin/env node
"use strict";

// Runs automatically before `npm uninstall -g git-sc`.
// Strips everything we added; leaves the rest of each rc file untouched.

const {
  log, ok, warn,
  commandExists,
  unsetGitAliases,
  removeManagedBlock,
  posixRcFiles,
  powershellProfilePaths
} = require("../lib/core.js");

if (process.env.npm_config_global !== "true" && !process.env.GIT_SC_FORCE) {
  // Nothing to undo on local uninstall because postinstall didn't run.
  process.exit(0);
}

try {
  log("git-sc: removing...\n");

  unsetGitAliases();

  for (const f of posixRcFiles()) removeManagedBlock(f);

  if (process.platform === "win32" || commandExists("pwsh")) {
    for (const f of powershellProfilePaths()) removeManagedBlock(f);
  }

  log("");
  ok("Cleaned up. Open a new terminal for shell changes to take effect.");
} catch (e) {
  warn(`git-sc preuninstall hit an error: ${e.message}`);
  warn("You may need to clean up leftover entries in your rc files or gitconfig manually.");
}
process.exit(0);
