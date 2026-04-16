#!/usr/bin/env node
"use strict";

// Runs automatically after `npm install -g git-sc`.
// Never throws — partial failures log warnings but don't break the install.

const fs = require("fs");
const os = require("os");
const path = require("path");

// Always write a diagnostic log so failures can be debugged after the fact.
const LOG_PATH = path.join(os.tmpdir(), "git-sc-postinstall.log");
function diag(msg) {
  try {
    fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${msg}\n`);
  } catch { /* nothing we can do */ }
}

diag(`postinstall start. cwd=${process.cwd()} platform=${process.platform} node=${process.version}`);
diag(`env: npm_config_global=${process.env.npm_config_global} npm_command=${process.env.npm_command} INIT_CWD=${process.env.INIT_CWD}`);

// Only skip if this is clearly NOT a user-initiated global install.
// We use a positive signal: npm_config_global must be "true".
// (Empty/undefined = running as a transitive dep or in a weird context.)
if (process.env.npm_config_global !== "true" && !process.env.GIT_SC_FORCE) {
  console.log("git-sc: not a global install, skipping. (Use `npm install -g git-sc`.)");
  diag("skipped: npm_config_global is not 'true'");
  process.exit(0);
}

// Try to load the core lib — if it's not there (e.g. weird prepare context),
// bail silently instead of crashing the install.
let core;
try {
  core = require("../lib/core.js");
} catch (e) {
  console.warn(`git-sc: could not load core module (${e.message}); skipping.`);
  diag(`skipped: core load failed — ${e.message}`);
  process.exit(0);
}

const {
  log, ok, warn,
  commandExists,
  setGitAliases,
  writeManagedBlock,
  posixRcFiles,
  powershellProfilePaths,
  installCmdSupport
} = core;

try {
  log("git-sc: installing...\n");
  diag("running full install");

  setGitAliases();

  log("\nWriting shell aliases...");

  const posixTargets = posixRcFiles();
  diag(`posix targets: ${JSON.stringify(posixTargets)}`);
  for (const f of posixTargets) writeManagedBlock(f, "posix");

  if (process.platform === "win32" || commandExists("pwsh")) {
    const psTargets = powershellProfilePaths();
    diag(`powershell targets: ${JSON.stringify(psTargets)}`);
    for (const f of psTargets) writeManagedBlock(f, "powershell");
  }

  // cmd.exe support via doskey + AutoRun registry entry
  installCmdSupport();

  log("");
  ok("Done. Open a new terminal to activate shell aliases.");
  log("  • `git s`, `git p`, etc. work immediately in any shell.");
  log("  • Bare `s`, `p`, etc. work in PowerShell, bash, zsh, and cmd.exe after a new terminal.");
  log("  • `npm uninstall -g git-sc` reverses everything.");
  log(`  • Diagnostic log: ${LOG_PATH}`);
  diag("install completed successfully");
} catch (e) {
  warn(`git-sc postinstall hit an error: ${e.message}`);
  warn("The package is still installed. You can investigate or `npm uninstall -g git-sc` to undo.");
  diag(`install failed: ${e.stack || e.message}`);
}
process.exit(0);
