### 🛡️ Access Review / Change Request

**Type of Change**  
- [ ] New role added  
- [ ] Permission modified  
- [ ] Access revoked  
- [ ] Audit log updated  

---

**Scope of Impact**  
*List affected users, service accounts, teams, or systems.*  
Examples:  
- **Users:** `@jane.doe`, `@john.smith`  
- **Teams:** `devops`, `support-engineering`  
- **Resources/Services:** `ci-runner`, `stripe-webhook`, `gcp-billing-export`  

---

**Justification**  
*Briefly explain the reason for the change. Include links if applicable.*  
- Reference: [SEC-XXXX](https://link-to-ticket)  
- Reason: _(e.g., onboarding, role refinement, incident follow-up)_  
- Compliance note: _(e.g., SOC 2, ISO 27001, least-privilege enforcement)_

---

**Risk Assessment**  
- [ ] Reviewed by `@security-team`  
- [ ] Scoped to non-production environments  
- [ ] Rollback plan documented (see below)  
- [ ] Logging and monitoring confirmed  

---

**Rollback Plan**  
*Describe exact steps to undo the change if needed.*  
- Revert role via IAM or infrastructure as code  
- Redeploy previous config/state from version control  
- Notify `@infra-admins` and `@security-team` of rollback  

---

**Change Context**  
- **Environments:** `development`, `staging`, `production`  
- **Tooling/Stack:** `bun`, `typescript`, `valibot`, `GCP`, `K8s`, `Stripe`, `ArgoCD`, `biome`, `docker`, `svelte`, `iOS`, `Android`, `App Stores`, `Umami`, `Sentry`, `Cloudflare`  
- **Observability:** Confirmed via audit logs and monitoring tools  

---

**Reviewers**  
- **Required:** `@security-team`, `@infra-admins`  
- **Optional:** `@dev-leads`, `@compliance-officer`  

---

**Effective Date**  
- *Specify date or write “Immediately upon approval”*  
  Example: `2025-06-03`
