#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const LOG_PATH = path.join(os.homedir(), ".git-sc-install.log");

// Write to stderr (npm passes stderr through more reliably than stdout during postinstall)
// and the log file. One of them will reach the user.
function say(msg) {
  const line = `git-sc: ${msg}`;
  try { process.stderr.write(line + "\n"); } catch {}
  try { fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${msg}\n`); } catch {}
}

say("==================== INSTALL START ====================");
say(`platform=${process.platform} node=${process.version}`);
say(`home=${os.homedir()}`);
say(`cwd=${process.cwd()}`);
say(`npm_config_global=${process.env.npm_config_global}`);
say(`log file: ${LOG_PATH}`);

// Skip if we're clearly inside npm's git-clone prepare step (not the real install).
const cwd = process.cwd();
if (/[\\/]_cacache[\\/]tmp[\\/]/.test(cwd) || /[\\/]git-clone[^\\/]*$/i.test(cwd)) {
  say("detected npm prepare step — this is NOT the real install, skipping.");
  say("(the real install will run next.)");
  process.exit(0);
}

let core;
try {
  core = require(require("path").join(__dirname, "..", "lib", "core.js"));
  say("loaded lib/core.js");
} catch (e) {
  say(`ERROR loading lib/core.js: ${e.message}`);
  process.exit(0);
}

const {
  commandExists,
  setGitAliases,
  writeManagedBlock,
  posixRcFiles,
  powershellProfilePaths,
  installCmdSupport
} = core;

try {
  say("--- git aliases ---");
  const gitResult = setGitAliases();
  say(`git aliases: ${gitResult ? "OK" : "FAILED"}`);

  say("--- posix shell profiles ---");
  const posixTargets = posixRcFiles();
  say(`targets: ${JSON.stringify(posixTargets)}`);
  for (const f of posixTargets) {
    const r = writeManagedBlock(f, "posix");
    say(`  ${f}: ${r ? "OK" : "FAILED"}`);
  }

  if (process.platform === "win32" || commandExists("pwsh")) {
    say("--- PowerShell profiles ---");
    const psTargets = powershellProfilePaths();
    say(`targets: ${JSON.stringify(psTargets)}`);
    for (const f of psTargets) {
      const r = writeManagedBlock(f, "powershell");
      say(`  ${f}: ${r ? "OK" : "FAILED"}`);
    }
  }

  if (process.platform === "win32") {
    say("--- cmd.exe (doskey + AutoRun) ---");
    installCmdSupport();
  }

  say("==================== INSTALL DONE ====================");
  say("Open a NEW terminal window to use the aliases.");
  say(`Full log: ${LOG_PATH}`);
} catch (e) {
  say(`FATAL: ${e.stack || e.message}`);
}

process.exit(0);
