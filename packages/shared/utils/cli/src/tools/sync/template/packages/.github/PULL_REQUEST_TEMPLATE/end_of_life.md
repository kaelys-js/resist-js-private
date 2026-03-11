```markdown
---
id: "sunset-plan"
title: "🪦 End of Life / Sunset Plan"
description: "Structured checklist and timeline for sunsetting features"
created: "2025-06-04"
last_updated: "2025-06-04"
updated_at_source: "2025-06-04"
review_due: "2025-12-31"
expires: "2026-12-31"
deprecated_since: "2025-05-01"
version: "1.0.0"
status: "draft"
status_note: "Scheduled for Q4 removal"
stage: "deprecated"
priority: "medium"
visibility: "private"
audience: "internal"
owner: "platform-team@example.com"
maintainers:
  - "platform-team@example.com"
  - "infra@example.com"
authors:
  - "engineering-team@example.com"
updated_by: "platform-team@example.com"
last_reviewed_by: "tech-lead@example.com"
reviewed: false
audited: false
workflow_status: "not_started"
category: "engineering/process"
section: "deprecation"
tags:
  - "deprecation"
  - "sunset"
  - "lifecycle"
  - "internal"
slug: "end-of-life-plan"
layout: "doc"
draft: true
requires_auth: true
is_archived: false
search_exclude: true
edit_url: "https://github.com/org/repo/edit/main/docs/sunset-plan.md"
product: "core-platform"
component: "feature-lifecycle"
region: "global"
platforms:
  - "web"
  - "mobile"
  - "backend"
license: "proprietary"
change_type: "deprecation"
aliases:
  - "/legacy/sunset-guide"
related_docs:
  - "/process/feature-flags"
  - "/infra/service-removal-guide"
toc: true
icon: "⚠️"
weight: 10
---

# 🪦 End of Life / Sunset Plan

## 📌 Feature Being Removed

**Name:**  
_e.g., Legacy chat dashboard_

---

## 🧑‍💼 Stakeholders

| Role         | Contact                  |
|--------------|--------------------------|
| PM Owner     | pm@example.com           |
| Tech Lead    | tech-lead@example.com    |
| Support Lead | support@example.com      |

---

## ❓ Reason for Deprecation

- [ ] Superseded by a new system or feature  
- [ ] Low adoption or usage  
- [ ] Ongoing maintenance or operational burden  

---

## 🗓️ Timeline

| Phase               | Status        | Target Date  | Notes                                         |
|---------------------|---------------|--------------|-----------------------------------------------|
| 🔔 Warning Issued   | [ ] Pending   | YYYY-MM-DD   | Communicated via changelog, email, in-app     |
| 🚩 Sunset Flag Live | [ ] Pending   | YYYY-MM-DD   | Controlled via feature flag                   |
| 🗑️ Full Removal     | [ ] Pending   | YYYY-MM-DD   | Code, infra, and docs cleaned up              |

---

## ✅ Checklist

### 🛣 Migration & Documentation

- [ ] Migration path documented  
- [ ] Feature flag behavior documented  
- [ ] Docs updated (internal and/or public)

---

### 📣 Communication

- [ ] In-app notice prepared and deployed  
- [ ] Email / changelog / blog post sent  
- [ ] FAQ created for GTM/support teams

---

### 📊 Observability & Analytics

- [ ] SLOs reviewed / updated  
- [ ] Alerts and monitors removed  
- [ ] Metrics cleaned from Umami/Sentry dashboards

---

### 🔧 Technical Cleanup

- [ ] Source code removed  
- [ ] Docker configs and K8s manifests deleted  
- [ ] Argo and GCP infra destroyed  
- [ ] Cloudflare and valibot updated  

---

### 💳 Billing & Plans

- [ ] Stripe plan/SKU reviewed  
- [ ] Billing UI and invoices updated  

---

### 📱 Mobile & App Store

- [ ] iOS and Android flags disabled  
- [ ] Store metadata reviewed  
- [ ] Mobile features/tests removed  

---

## 🗂️ Tracking

**📍 Internal Tracker:**  
https://internal.example.com/sunset/legacy-chat-dashboard

---

> ℹ️ **Reminder:** Track all actions in the lifecycle tracker. Review progress biweekly until full removal.
```
