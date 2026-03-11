---
title: "🧹 Feature Flag Cleanup Log"
description: "Detailed changelog and checklist for deprecating and removing feature flags from the platform codebase."
created: "2025-06-04"
updated: "2025-06-04"
author: "Platform Engineering"
status: "complete"
tags:
  - feature-flags
  - deprecation
  - cleanup
  - configuration
  - observability
  - documentation
  - ci-cd
  - infrastructure
  - compliance
tools:
  - bun
  - typescript
  - valibot
  - GCP
  - K8s
  - Stripe
  - Argo
  - biome
  - docker
  - svelte
  - ios
  - android
  - app-stores
  - umami
  - observability
  - sentry
  - cloudflare
notUsed:
  - node
  - webpack
  - react
---

# 🧹 Feature Flag Cleanup

This document records the structured removal of feature flags from the platform. It ensures all dependencies, documentation, observability, and configuration references are properly removed and verified.

---

## 🏷️ Flag(s) Removed

- `enable_legacy_editor`

---

## 📌 Reason for Removal

- [x] Feature has reached General Availability (GA)
- [ ] No longer relevant to business or technical goals

---

## ✅ Removal Checklist

All items below were completed as part of this cleanup:

- [x] Code references purged and verified (`grep`, `biome`)
- [x] Flag removed from environment config, secrets, and schemas (`valibot`, `.env`)
- [x] Documentation updated (developer portal + changelogs)
- [x] CI/CD pipeline validation passed (Argo)
- [x] No runtime errors post-removal (Sentry confirms)
- [x] Observability dashboards updated (logs, metrics, traces)
- [x] Feature gate removed from mobile builds (iOS + Android)
- [x] Removed from `bun.config.ts` and other bundling entry points
- [x] Stripe and Cloudflare integrations tested with flag off
- [x] No legacy fallback paths found in `svelte` components or mobile views

---

## 🧾 Context

The `enable_legacy_editor` flag was introduced to support incremental rollout of the new WYSIWYG editor across platforms. With feature parity achieved and full usage confirmed via Umami and observability dashboards, the legacy path was deprecated.

Kubernetes manifests and GitOps pipelines were audited and updated to remove any trace of the flag. GCP-managed secrets and container builds have also been scrubbed and verified.

---

## 🧰 Tooling Used

| Domain             | Tools Used                                  |
|--------------------|----------------------------------------------|
| Build & Runtime    | `bun`, `typescript`, `valibot`               |
| Infrastructure     | `GCP`, `K8s`, `docker`, `Argo`              |
| Monitoring         | `sentry`, `umami`, observability stack       |
| Payments/Security  | `Stripe`, `cloudflare`                       |
| Frontend/Mobile    | `svelte`, `ios`, `android`, `app-stores`     |
| Formatting/Linting | `biome`                                      |

---

## 🔗 References

- [Feature Flag Governance Policy](../feature-flag-governance.md)
- [Editor Migration Rollout Summary](../editor-ga-summary.md)

