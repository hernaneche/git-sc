# git-sc

Install a consistent set of git and shell shortcuts on any machine. No CLI, no config, no commands to remember.

```bash
npm install -g github:hernaneche/git-sc 
```

```bash
npm uninstall -g git-sc                
```

Works on macOS, Linux, WSL, and Windows (PowerShell 5.1 and 7+).

## What you get

| Shortcut | Runs |
|----------|------|
| `s`      | `git status` |
| `p`      | `git pull` |
| `gps`    | `git push` |
| `f`      | `git fetch` |
| `d`      | `git diff` |
| `ds`     | `git diff --staged` |
| `a`      | `git add` |
| `aa`     | `git add --all` |
| `gc`     | `git commit` |
| `cam`    | `git commit -am` |
| `ca`     | `git commit --amend` |
| `b`      | `git branch` |
| `sw`     | `git switch` |
| `co`     | `git checkout` |
| `gl`     | `git log --oneline --graph --decorate -20` |
| `gll`    | `git log` |
| `st`     | `git stash` |
| `stp`    | `git stash pop` |

The `g` prefix is kept only where the bare name would collide with a common command (`ps`, `c`/clear, `l`/ls, `ll`/ls -l).

Each shortcut is installed **two ways** so they work in every shell:

1. **Git alias** — `git s`, `git p`, etc. work immediately in any shell, no profile reload needed.
2. **Shell alias / PowerShell function** — bare `s`, `p`, etc. work after opening a new terminal.

## How it works

The package has no binary. It uses npm's lifecycle hooks:

- `postinstall` runs after `npm install -g` → sets up everything.
- `preuninstall` runs before `npm uninstall -g` → reverses everything.

You never call a command. Installing *is* the command.

## How it's safe

- **Idempotent.** Reinstalling doesn't duplicate entries — the managed block is rewritten in place.
- **Clean uninstall.** `npm uninstall -g git-sc` strips the managed block from your rc files and unsets the git aliases. Your own rc content is untouched.
- **Scoped.** All rc-file modifications live between sentinel markers:
  ```
  # >>> git-sc managed block >>>
  ...
  # <<< git-sc managed block <<<
  ```
- **Correct PowerShell paths.** Queries `$PROFILE` from PowerShell directly, so it handles OneDrive-redirected Documents folders and the PS 5.1 vs 7+ split correctly.
- **Touches what exists.** On POSIX systems, updates every rc file present (`.zshrc`, `.bashrc`, `.bash_profile`) rather than guessing which shell you use.
- **Fails gracefully.** If something goes wrong the install doesn't fail — it logs a warning so you can investigate.
- **Skips local installs.** Only runs on `npm install -g`; installing as a project dependency is a no-op.

## Files touched

| Platform | Files |
|----------|-------|
| macOS / Linux / WSL | `~/.zshrc`, `~/.bashrc`, `~/.bash_profile` (whichever exist) |
| Windows PowerShell 5.1 | `Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1` |
| PowerShell 7+ | `Documents/PowerShell/Microsoft.PowerShell_profile.ps1` |
| Git (global config) | `~/.gitconfig` — only the listed `alias.*` entries |

## Customizing

Edit the `ALIASES` object near the top of `lib/core.js`, commit, push, then on each machine:

```bash
npm install -g github:hernaneche/git-sc
```

Reinstalling always rewrites the managed block to match the current config.

## Requirements

- Node.js 14+
- git on PATH

## License

MIT
