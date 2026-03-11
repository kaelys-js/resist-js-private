# 🐶 Git Hooks with Husky and Bun Runtime

This directory contains Git hooks managed by [Husky](https://typicode.github.io/husky/#/), configured to execute using the [Bun](https://bun.sh/) runtime. These hooks automate and enforce consistent development practices by integrating with Git’s lifecycle events.

---

## 📁 Directory Contents

```
.husky/
├── _/
│   └── husky.sh       # Initializes Husky environment for each hook
├── pre-commit         # Runs before each commit
├── commit-msg         # Runs on commit message input
└── pre-push           # Runs before pushing code to remote
```

Each hook script uses a shared `husky.sh` initialization file to set up the environment, and then runs project-specific commands using Bun.

---

## ⚙️ Setup

To install Husky and configure it with Bun:

```sh
bun add -D husky
bunx husky install
```

To add a hook:

```sh
bunx husky add .husky/pre-commit "bun run lint"
```

---

## 🔍 Hook Details

### `_/_husky.sh`

**When it runs:**  
Automatically sourced at the beginning of every hook.

**What it does / checks:**  
Initializes the environment needed for Husky to function correctly.

> ⚠️ **Do not edit manually.** This file is automatically managed by Husky.

---

### `pre-commit`

**When it runs:**  
Before `git commit`.

**What it does / checks:**  
Runs code quality checks to prevent committing code that doesn’t meet basic standards. Typically used for:

- Linting code
- Checking formatting
- Catching trivial errors early

**Example:**

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "Running pre-commit hook with Bun..."
bun run lint || exit 1
bun run format || exit 1
```

> 💡 Avoid putting slow or large processes in pre-commit hooks, and be careful with auto-formatting unless changes are auto-staged.

---

### `commit-msg`

**When it runs:**  
After the commit message is entered but before the commit is finalized.

**What it does / checks:**  
Validates the commit message format to enforce consistency, often following [Conventional Commits](https://www.conventionalcommits.org/).

**Example:**

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "Validating commit message..."
bunx commitlint --edit "$1"
```

> 📄 If you use a `commitlint.config.js`, be sure it's included and discoverable at the project root.

---

### `pre-push`

**When it runs:**  
Before pushing commits and tags to a remote repository.

**What it does / checks:**  
Runs tests or other validation to prevent pushing broken or unverified code to shared branches like `main` or `develop`.

**Example:**

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "Running pre-push hook with Bun..."
bun test || exit 1
```

> ✅ Use this as a final gate to catch issues before pushing to team-visible branches.

---

## 🧠 Why Use Bun in Hooks?

Using Bun in Husky hooks improves performance and consistency:

- ⚡ **Fast execution** compared to Node.js
- 🧰 **Unified tooling** if you’re already using Bun for development tasks
- 🔧 **Simplified scripts** via native tools like `bunx` for zero-install CLI tasks

---

## 🚫 What Not to Do

- ❌ Avoid placing long-running or heavy build steps in pre-commit — it slows everyone down.
- ❌ Don’t run commands that modify files (e.g., formatting) unless auto-staging and user consent are handled.
- ⚠️ **Do not rely solely on hooks for critical logic** — they can be skipped with:

  ```sh
  git commit --no-verify
  git push --no-verify
  ```

---

## 📦 CI Consideration

Git hooks are **local** and not enforced in CI/CD pipelines. Always duplicate key validation (e.g., linting, tests) in your CI workflows to ensure consistency across environments.

---

## ✅ Summary

This `.husky` directory encapsulates Git lifecycle automation using Bun for fast, modern development tooling. It enforces commit hygiene, prevents bad pushes, and helps maintain code quality — without compromising performance.
