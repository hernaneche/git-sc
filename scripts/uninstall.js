#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const LOG_PATH = path.join(os.homedir(), ".git-sc-install.log");

function diag(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(LOG_PATH, line); } catch {}
  try { process.stdout.write(`git-sc: ${msg}\n`); } catch {}
}

diag(`=== preuninstall start ===`);
diag(`cwd=${process.cwd()} platform=${process.platform}`);

const cwd = process.cwd();
if (/[\\/]_cacache[\\/]tmp[\\/]/.test(cwd) || /[\\/]git-clone[^\\/]*$/i.test(cwd)) {
  diag("detected npm prepare step; skipping.");
  process.exit(0);
}

let core;
try {
  core = require(require("path").join(__dirname, "..", "lib", "core.js"));
} catch (e) {
  diag(`could not load core: ${e.message}`);
  process.exit(0);
}

const {
  ok, warn,
  commandExists,
  unsetGitAliases,
  removeManagedBlock,
  posixRcFiles,
  powershellProfilePaths,
  uninstallCmdSupport
} = core;

try {
  diag("running uninstall");

  unsetGitAliases();

  for (const f of posixRcFiles()) removeManagedBlock(f);

  if (process.platform === "win32" || commandExists("pwsh")) {
    for (const f of powershellProfilePaths()) removeManagedBlock(f);
  }

  if (process.platform === "win32") {
    uninstallCmdSupport();
  }

  diag("=== uninstall completed ===");
  ok("git-sc removed. Open a new terminal.");
} catch (e) {
  diag(`FATAL: ${e.stack || e.message}`);
  warn(`git-sc uninstall failed: ${e.message}`);
}

process.exit(0);
