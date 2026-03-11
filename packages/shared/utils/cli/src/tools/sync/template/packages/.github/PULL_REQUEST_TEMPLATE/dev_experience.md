---
title: "🧰 Developer Experience Improvement"
description: "Enhancements to streamline onboarding, reduce build times, and unify tooling across the stack."
tags: ["developer-experience", "tooling", "ci", "infra", "mobile", "validation", "observability", "sentry", "cloudflare"]
created_at: "2025-06-04"
updated_at: "2025-06-04"
author: "dev-team"
version: "v1.0.0-dx"
---

# 🧰 Developer Experience Improvement

> **Status:** ✅ Stable & Live  
> **Scope:** Full-stack contributors, platform engineers, mobile teams  
> **Impacts:** Local setup, CI/CD, linting, validation, mobile release flow

## 🧭 Affected Areas

- `scripts/` for setup, rollback
- `tools/` for schema migration
- `.vscode/` for IDE task automation
- `infrastructure/` for ArgoCD
- `docker/` and `ci/` build assets
- `docs/` internal documentation
- `bin/` for debug tooling

---

## ✅ Problem Solved

- 🧩 Inconsistent onboarding flow across repos
- 🐢 Slow builds in CI, hard-to-debug failures
- 🧪 Runtime input validation split between formats/tools
- 🔕 Weak observability outside Sentry
- 🐘 Mobile app release manual and error-prone

---

## 🔧 Changes Made

### ⚙️ Setup & Tooling

- Introduced `bun`-based CLI setup:
  ```bash
  bun run scripts/setup.ts
  ```
  - Auto-installs dependencies
  - Validates `.env`
  - Warns on missing dev tools
  - **Requires:** `bun >= 1.1.0`

- Replaced all linters with [`biome`](https://biomejs.dev) (`v1.4.1`)
  - Unified formatting and linting
  - CI-integrated, fast, supports JSON/Markdown/TS

- Input validation fully migrated to [`valibot`](https://valibot.dev) (`v0.22`)
  - Lower bundle size
  - Code-first validation for mobile & API payloads

### 🧰 Editor Support

- `.vscode/tasks.json` added with:
  - `dev`
  - `test`
  - `lint`
  - `deploy`
- Tasks use unified `bun` scripts

### 📦 Docker & CI Enhancements

- Multi-stage Docker builds
- Layer caching
- Biome + unit tests integrated into pre-push hook and CI job

### 📊 Observability

- Sentry auto-instrumentation for JS, TS
- GCP logs and traces unified in Logging Explorer
- Umami script embedded in all prod builds
- `bin/cf-debug` added for quick Cloudflare issue checks

### 📱 Mobile Release Automation

- Fastlane workflows for both Android & iOS:
  - `build`
  - `testflight`
  - `deploy`
- Shared `version.json` for consistent versioning across builds

---

## 🧪 Quick Verification

### First-Time Developer Check

```bash
bun run scripts/setup.ts
bun run biome check .
bun run dev
```

- Ensure `.env` exists and is valid
- Visit `http://localhost:3000` (or native preview)
- Confirm logs appear in Sentry/Umami dashboards (if in staging)

---

## ⚠️ Known Issues / Warnings

- **Node < 18** is unsupported
- Biome auto-fix (`biome format`) not enabled by default — run manually
- Valibot is not API-compatible with Zod — avoid using both concurrently

---

## 🧯 Fallback Paths

- Rollback script: `scripts/rollback-setup.ts`
- Common errors FAQ: [`docs/troubleshooting.md`](docs/troubleshooting.md)
- File issues in [`#dev-tooling`](https://chat.company.dev) or GitHub

---

## 📚 Documentation

- 🔧 [Setup Guide](docs/setup.md)
- 🧪 [Validation Migration](docs/validation.md)
- 📊 [Observability](docs/monitoring.md)
- 🚀 [Mobile Deployment](docs/mobile-deploy.md)

---

## 📋 Checklist

- [x] Setup script verified on macOS, Linux, WSL
- [x] CI/CD integrated with Biome
- [x] Mobile builds tested via Fastlane
- [x] Sentry + Umami events verified
- [x] ArgoCD auto-sync observed
- [x] `.vscode` tasks live and usable
- [ ] Peer-reviewed by 2+ team members
- [ ] Rollback path confirmed
- [ ] Docs updated and published

---

## 🆚 Before vs After

| Area           | Before                              | After                                     |
|----------------|--------------------------------------|-------------------------------------------|
| Onboarding     | 45+ min, multiple setup scripts      | One `bun` command (~10 min)              |
| Linting        | ESLint + Prettier + MD lint          | Unified via Biome                        |
| Validation     | Zod, not enforced everywhere         | Valibot on all input flows               |
| Docker Build   | ~6 min CI step                       | ~2.5 min with caching                    |
| Mobile Release | Manual uploads                       | Automated via Fastlane + shared version  |
| Observability  | Sentry only                          | GCP Logs + Sentry + Umami + Cloudflare   |

---

_Contributed by the Dev Team. For bugs or regressions, open an issue or ping `#dev-tooling`._
