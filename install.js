#!/usr/bin/env node
"use strict";

// Runs automatically after `npm install -g git-sc`.
// Never throws — partial failures log warnings but don't break the install.

// Detect whether we're running inside npm's git-install "prepare" step.
// When installing from a github: URL, npm clones to a temp dir and runs
// `npm install` there to prepare the package; that triggers postinstall
// in a directory we do NOT want to act on.
function isNpmPrepareStep() {
  const cwd = process.cwd();
  // npm's cache temp paths contain these markers across platforms.
  if (/[\\/]_cacache[\\/]tmp[\\/]/.test(cwd)) return true;
  if (/[\\/]git-clone[^\\/]*$/i.test(cwd)) return true;
  // npm sets npm_command to 'install' during prepare but without _config_global=true.
  // When the user actually runs `npm install -g`, npm_config_global is "true".
  return false;
}

if (isNpmPrepareStep()) {
  // Silent skip — this isn't the real install, just npm prepping the package.
  process.exit(0);
}

// Skip when running as a project dependency, not a global install.
if (process.env.npm_config_global !== "true" && !process.env.GIT_SC_FORCE) {
  console.log("git-sc: skipping (not a global install). Use `npm install -g git-sc`.");
  process.exit(0);
}

// Try to load the core lib — if it's not there (e.g. weird prepare context
// we didn't detect), bail silently instead of crashing the install.
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
  setGitAliases,
  writeManagedBlock,
  posixRcFiles,
  powershellProfilePaths
} = core;

try {
  log("git-sc: installing...\n");

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
  log("  • `npm uninstall -g git-sc` reverses everything.");
} catch (e) {
  warn(`git-sc postinstall hit an error: ${e.message}`);
  warn("The package is still installed. You can investigate or `npm uninstall -g git-sc` to undo.");
  // Exit 0 regardless — we never want to fail the npm install itself.
}
process.exit(0);
