"use strict";

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const HOME = os.homedir();
const BLOCK_START = "# >>> git-sc managed block >>>";
const BLOCK_END = "# <<< git-sc managed block <<<";

// Edit this list to customize what gets installed.
// `g` prefix is kept only where the bare name collides with a common command.
const ALIASES = {
  // pull / push / fetch
  p: "pull",
  gps: "push",   // `ps` = process status
  f: "fetch",

  // status / diff
  s: "status",
  d: "diff",
  ds: "diff --staged",

  // add
  a: "add",
  aa: "add --all",

  // commit
  gc: "commit", // `c` often aliased to `clear`
  cam: "commit -am",
  ca: "commit --amend",

  // branch / switch / checkout
  b: "branch",
  sw: "switch",
  co: "checkout",

  // log
  gl: "log --oneline --graph --decorate -20", // `l` = ls
  gll: "log",                                  // `ll` = ls -l

  // stash
  st: "stash",
  stp: "stash pop"
};

function log(msg) { console.log(msg); }
function ok(msg) { console.log(`✔ ${msg}`); }
function warn(msg) { console.warn(`! ${msg}`); }
function err(msg) { console.error(`✖ ${msg}`); }

function commandExists(cmd) {
  const probe = process.platform === "win32"
    ? spawnSync("where", [cmd], { stdio: "ignore" })
    : spawnSync("which", [cmd], { stdio: "ignore" });
  return probe.status === 0;
}

function readFileSafe(file) {
  try { return fs.readFileSync(file, "utf8"); }
  catch { return ""; }
}

function ensureFile(file) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, "");
    return true;
  } catch (e) {
    warn(`Could not create ${file}: ${e.message}`);
    return false;
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripManagedBlock(content) {
  const pattern = new RegExp(
    `\\n?${escapeRegex(BLOCK_START)}[\\s\\S]*?${escapeRegex(BLOCK_END)}\\n?`,
    "g"
  );
  return content.replace(pattern, "");
}

function buildBlock(syntax) {
  const lines = [BLOCK_START, "# Managed by the git-sc npm package. `npm uninstall -g git-sc` removes it."];
  if (syntax === "posix") {
    for (const [name, cmd] of Object.entries(ALIASES)) {
      lines.push(`alias ${name}='git ${cmd}'`);
    }
  } else {
    // PowerShell: functions forward all args to git
    for (const [name, cmd] of Object.entries(ALIASES)) {
      lines.push(`function ${name} { git ${cmd} @args }`);
    }
  }
  lines.push(BLOCK_END);
  return lines.join("\n") + "\n";
}

function writeManagedBlock(file, syntax) {
  if (!ensureFile(file)) return false;
  const current = readFileSafe(file);
  const cleaned = stripManagedBlock(current);
  const sep = cleaned.length && !cleaned.endsWith("\n") ? "\n" : "";
  const next = cleaned + sep + "\n" + buildBlock(syntax);
  try {
    fs.writeFileSync(file, next);
    ok(`Updated ${file}`);
    return true;
  } catch (e) {
    warn(`Could not write ${file}: ${e.message}`);
    return false;
  }
}

function removeManagedBlock(file) {
  if (!fs.existsSync(file)) return;
  const current = readFileSafe(file);
  const cleaned = stripManagedBlock(current);
  if (cleaned !== current) {
    try {
      fs.writeFileSync(file, cleaned);
      ok(`Cleaned ${file}`);
    } catch (e) {
      warn(`Could not clean ${file}: ${e.message}`);
    }
  }
}

function setGitAliases() {
  if (!commandExists("git")) {
    err("git not found on PATH. Install git, then reinstall this package.");
    return false;
  }
  let count = 0;
  for (const [name, cmd] of Object.entries(ALIASES)) {
    try {
      execSync(`git config --global alias.${name} "${cmd}"`, { stdio: "ignore" });
      count++;
    } catch (e) {
      warn(`Failed to set git alias ${name}: ${e.message}`);
    }
  }
  ok(`Configured ${count} git aliases (use as \`git <alias>\`).`);
  return true;
}

function unsetGitAliases() {
  if (!commandExists("git")) return;
  for (const name of Object.keys(ALIASES)) {
    try {
      execSync(`git config --global --unset alias.${name}`, { stdio: "ignore" });
    } catch {
      // wasn't set; fine
    }
  }
  ok("Removed git aliases.");
}

function posixRcFiles() {
  const candidates = [
    path.join(HOME, ".zshrc"),
    path.join(HOME, ".bashrc"),
    path.join(HOME, ".bash_profile")
  ];
  const existing = candidates.filter(f => fs.existsSync(f));
  if (existing.length > 0) return existing;

  // Nothing exists — create one appropriate to the detected shell.
  const shell = process.env.SHELL || "";
  if (shell.includes("zsh")) return [path.join(HOME, ".zshrc")];
  return [path.join(HOME, ".bashrc")];
}

function powershellProfilePaths() {
  const results = new Set();

  const tryPwsh = (exe) => {
    try {
      const out = execSync(
        `${exe} -NoProfile -Command "$PROFILE.CurrentUserAllHosts; $PROFILE.CurrentUserCurrentHost"`,
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
      );
      out.split(/\r?\n/).map(s => s.trim()).filter(Boolean).forEach(p => results.add(p));
    } catch { /* not installed */ }
  };

  if (commandExists("pwsh")) tryPwsh("pwsh");
  if (commandExists("powershell")) tryPwsh("powershell");

  if (results.size === 0) {
    results.add(path.join(HOME, "Documents", "PowerShell", "Microsoft.PowerShell_profile.ps1"));
    results.add(path.join(HOME, "Documents", "WindowsPowerShell", "Microsoft.PowerShell_profile.ps1"));
  }
  return Array.from(results);
}

// ---------- cmd.exe support (Windows only) ----------
// cmd has no aliases; we use doskey macros defined in a .cmd file that's
// auto-run at every cmd startup via the HKCU AutoRun registry value.

const CMD_SCRIPT_DIR = path.join(HOME, ".git-sc");
const CMD_SCRIPT_PATH = path.join(CMD_SCRIPT_DIR, "aliases.cmd");
const CMD_AUTORUN_MARKER = `"${CMD_SCRIPT_PATH}"`; // quoted so spaces in HOME work
const CMD_REG_KEY = `HKCU\\Software\\Microsoft\\Command Processor`;
const CMD_REG_VALUE = "AutoRun";

function writeCmdAliasScript() {
  try {
    fs.mkdirSync(CMD_SCRIPT_DIR, { recursive: true });
    const lines = [
      "@echo off",
      "REM Managed by the git-sc npm package. `npm uninstall -g git-sc` removes it.",
    ];
    for (const [name, cmd] of Object.entries(ALIASES)) {
      // doskey: $* = all arguments passed to the macro
      lines.push(`doskey ${name}=git ${cmd} $*`);
    }
    fs.writeFileSync(CMD_SCRIPT_PATH, lines.join("\r\n") + "\r\n");
    ok(`Updated ${CMD_SCRIPT_PATH}`);
    return true;
  } catch (e) {
    warn(`Could not write cmd aliases script: ${e.message}`);
    return false;
  }
}

function removeCmdAliasScript() {
  try {
    if (fs.existsSync(CMD_SCRIPT_PATH)) {
      fs.unlinkSync(CMD_SCRIPT_PATH);
      ok(`Removed ${CMD_SCRIPT_PATH}`);
    }
    // Try to remove the directory if empty
    try { fs.rmdirSync(CMD_SCRIPT_DIR); } catch { /* not empty or missing; fine */ }
  } catch (e) {
    warn(`Could not remove cmd aliases script: ${e.message}`);
  }
}

function readCmdAutoRun() {
  // Returns the current HKCU AutoRun value, or "" if unset.
  try {
    const out = execSync(`reg query "${CMD_REG_KEY}" /v ${CMD_REG_VALUE}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    // Output looks like:
    //     AutoRun    REG_SZ    some-value
    const m = out.match(/AutoRun\s+REG_(?:SZ|EXPAND_SZ)\s+(.*)/);
    return m ? m[1].trim() : "";
  } catch {
    return ""; // value not set
  }
}

function addCmdAutoRunEntry() {
  try {
    const current = readCmdAutoRun();
    // Already points to our script — nothing to do.
    if (current.includes(CMD_AUTORUN_MARKER)) {
      ok("cmd.exe AutoRun already configured.");
      return true;
    }
    // Preserve any existing AutoRun entry by chaining with &.
    const combined = current
      ? `${current} & ${CMD_AUTORUN_MARKER}`
      : CMD_AUTORUN_MARKER;
    execSync(
      `reg add "${CMD_REG_KEY}" /v ${CMD_REG_VALUE} /t REG_EXPAND_SZ /d "${combined.replace(/"/g, '\\"')}" /f`,
      { stdio: "ignore" }
    );
    ok("Configured cmd.exe AutoRun.");
    return true;
  } catch (e) {
    warn(`Could not set cmd.exe AutoRun: ${e.message}`);
    return false;
  }
}

function removeCmdAutoRunEntry() {
  try {
    const current = readCmdAutoRun();
    if (!current) return; // nothing to clean
    if (!current.includes(CMD_AUTORUN_MARKER)) return; // not ours; don't touch

    // Remove our marker and any surrounding " & " glue; trim leftover whitespace.
    let cleaned = current
      .replace(new RegExp(`\\s*&\\s*${escapeRegex(CMD_AUTORUN_MARKER)}`), "")
      .replace(new RegExp(`${escapeRegex(CMD_AUTORUN_MARKER)}\\s*&\\s*`), "")
      .replace(CMD_AUTORUN_MARKER, "")
      .trim();

    if (cleaned === "") {
      // We were the only thing there — delete the value entirely.
      execSync(`reg delete "${CMD_REG_KEY}" /v ${CMD_REG_VALUE} /f`, { stdio: "ignore" });
      ok("Removed cmd.exe AutoRun entry.");
    } else {
      execSync(
        `reg add "${CMD_REG_KEY}" /v ${CMD_REG_VALUE} /t REG_EXPAND_SZ /d "${cleaned.replace(/"/g, '\\"')}" /f`,
        { stdio: "ignore" }
      );
      ok("Cleaned cmd.exe AutoRun entry.");
    }
  } catch (e) {
    warn(`Could not clean cmd.exe AutoRun: ${e.message}`);
  }
}

function installCmdSupport() {
  if (process.platform !== "win32") return;
  if (writeCmdAliasScript()) addCmdAutoRunEntry();
}

function uninstallCmdSupport() {
  if (process.platform !== "win32") return;
  removeCmdAutoRunEntry();
  removeCmdAliasScript();
}

module.exports = {
  ALIASES,
  log, ok, warn, err,
  commandExists,
  setGitAliases,
  unsetGitAliases,
  writeManagedBlock,
  removeManagedBlock,
  posixRcFiles,
  powershellProfilePaths,
  installCmdSupport,
  uninstallCmdSupport
};
