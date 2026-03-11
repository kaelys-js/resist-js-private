# TODO: need proper implementation of this file with templating support and matching reality

# .github Directory

This directory contains GitHub-specific configuration files that automate workflows, guide contributions, and help maintain repository health. It does **not** include general documentation like `CONTRIBUTING.md` or `SECURITY.md`, which should be placed in the root directory for visibility.

> _Last reviewed: June 2025_

---

## 📘 Purpose

The `.github/` folder centralizes GitHub-native configuration to streamline collaboration, standardize contributions, and automate maintenance tasks across the repository.

If this repository is part of a monorepo or shared across multiple services, templates and automations should remain **generic** and align with organization-wide practices.

---

## 📁 Directory Structure (Overview)

.github/
├── workflows/ # GitHub Actions
├── ISSUE_TEMPLATE/ # Issue templates and forms
├── PULL_REQUEST_TEMPLATE/ # PR templates
├── CODEOWNERS # Review assignment
├── dependabot.yml # Dependency updates
├── labeler.yml # Auto-labeling rules
└── stale.yml # Inactivity cleanup

yaml
Copy
Edit

---

## 📂 Contents Overview

### 🔄 Automation

#### [`workflows/`](./workflows/)
⚙️ Contains [GitHub Actions](https://docs.github.com/en/actions) workflows for CI/CD, testing, linting, deployments, and other tasks.

> You can check the status of these workflows under the [Actions tab](../../actions).

#### [`dependabot.yml`](./dependabot.yml)
📦 Configures [Dependabot](https://docs.github.com/en/code-security/dependabot) to monitor and automatically update dependencies such as `npm`, GitHub Actions, and Docker.

#### [`stale.yml`](./stale.yml)
⏳ Sets up the [stale bot](https://github.com/actions/stale) to flag and optionally close inactive issues and pull requests after a defined period of inactivity.

---

### 🤝 Collaboration & Contribution

#### [`ISSUE_TEMPLATE/`](./ISSUE_TEMPLATE/)
📝 Contains issue templates in Markdown and/or YAML via `config.yml`. These help users submit structured issues such as `bug report` or `feature request`.

#### [`PULL_REQUEST_TEMPLATE/`](./PULL_REQUEST_TEMPLATE/)
✅ Stores one or more pull request templates. Contributors may choose the appropriate one (such as `feature`, `bugfix`, or `chore`) when opening a pull request.

#### [`labeler.yml`](./labeler.yml)
🏷️ Uses [Labeler](https://github.com/actions/labeler) to automatically apply labels to issues and pull requests based on file paths or naming rules.

#### [`CODEOWNERS`](./CODEOWNERS)
👥 Assigns responsibility for reviewing specific files or directories. GitHub may automatically request reviews from listed code owners when related changes are proposed.

---

## ✅ Best Practices

- 📄 **Store contributor-facing docs in the root**: Files like `CONTRIBUTING.md`, `SECURITY.md`, and `CODE_OF_CONDUCT.md` should live in the project root to be properly surfaced by GitHub.
- 💬 **Keep configurations simple and well-commented**: Use inline comments to clarify non-obvious logic in `.yml` files.
- 🔁 **Review regularly**: Update stale timeouts, labels, templates, and ownership as workflows and teams evolve.
- 🛠️ **Favor GitHub-native tools**: Prefer built-in features unless external services provide essential functionality.
- 🔐 **Note on secrets and reusable workflows**: Some workflows may depend on organization-level secrets or shared reusable workflows. Coordinate with the DevOps or platform team before modifying.

---

## 🔧 Maintainers Note

When editing any of the configurations in this folder:

- Test changes in a fork or non-production branch first, if possible.
- Refer to the [GitHub Docs](https://docs.github.com/en) to confirm syntax and behavior for workflows, templates, and bots.
- GitHub may change how these files are interpreted. Revisit this folder periodically to ensure continued compatibility.

---

## 📚 Related Documentation

- [CONTRIBUTING.md](../CONTRIBUTING.md) – Guidelines for contributing to this project  
- [SECURITY.md](../SECURITY.md) – How to report vulnerabilities  
- [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) – Community standards and enforcement  
- [MAINTAINERS.md](../MAINTAINERS.md) _(if applicable)_ – Who to contact for reviews or repo-specific guidance

---

_This repository welcomes contributions in English. Please open issues in English where possible._