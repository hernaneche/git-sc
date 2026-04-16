#!/usr/bin/env node
"use strict";

// Runs automatically before `npm uninstall -g git-sc`.
// Strips everything we added; leaves the rest of each rc file untouched.

function isNpmPrepareStep() {
  const cwd = process.cwd();
  if (/[\\/]_cacache[\\/]tmp[\\/]/.test(cwd)) return true;
  if (/[\\/]git-clone[^\\/]*$/i.test(cwd)) return true;
  return false;
}

if (isNpmPrepareStep()) {
  process.exit(0);
}

if (process.env.npm_config_global !== "true" && !process.env.GIT_SC_FORCE) {
  process.exit(0);
}

let core;
try {
  core = require("../lib/core.js");
} catch (e) {
  console.warn(`git-sc: could not load core module (${e.message}); skipping.`);
  process.exit(0);
}

const {
  log, ok, warn,
  commandExists,
  unsetGitAliases,
  removeManagedBlock,
  posixRcFiles,
  powershellProfilePaths,
  uninstallCmdSupport
} = core;

try {
  log("git-sc: removing...\n");

  unsetGitAliases();

  for (const f of posixRcFiles()) removeManagedBlock(f);

  if (process.platform === "win32" || commandExists("pwsh")) {
    for (const f of powershellProfilePaths()) removeManagedBlock(f);
  }

  uninstallCmdSupport();

  log("");
  ok("Cleaned up. Open a new terminal for shell changes to take effect.");
} catch (e) {
  warn(`git-sc preuninstall hit an error: ${e.message}`);
  warn("You may need to clean up leftover entries in your rc files or gitconfig manually.");
}
process.exit(0);
