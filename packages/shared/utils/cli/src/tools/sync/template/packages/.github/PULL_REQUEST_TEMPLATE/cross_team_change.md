### 🤝 Cross-Team Change Request

**📌 Scope**  
Changes affect multiple team domains or workspaces.

**📣 Notified Teams**  
- [ ] Team A  
- [ ] Team B  
- [ ] Security/Compliance (if applicable)  
- [ ] Infra/DevOps (if applicable)  
- [ ] Mobile/Client (if applicable)

---

**🔗 Related PRs / Issues**  
(Include links here)

**🕒 Date Created:** YYYY-MM-DD  
**🔖 Version:** v1.0.0  
**👤 Author/Initiator:** @your-handle  

---

### ✅ Pre-Merge Checklist

#### 🔄 Alignment & Ownership
- [ ] Stakeholders aligned and approved  
- [ ] All impacted code owners have reviewed  
- [ ] DRI (Directly Responsible Individual) clearly identified  
- [ ] Release ownership and on-call coverage confirmed  
- [ ] Risk classification assessed (e.g. Low / Medium / High)

#### 🧪 Testing & QA
- [ ] Unit, integration, and E2E tests added or updated  
- [ ] Edge cases and regression paths covered  
- [ ] Manual QA (if required) completed  
- [ ] Mobile tested on supported OS versions/devices (if applicable)  
- [ ] Validated in staging / pre-production  
- [ ] Performance impact assessed and benchmarked (if relevant)  
- [ ] Fallback behavior defined and tested

#### 🛡️ Risk, Security & Compliance
- [ ] No ownership or domain boundary violations  
- [ ] Rollback strategy or hotfix plan documented  
- [ ] Security review complete (e.g., data, auth, rate limits)  
- [ ] Compliance/privacy impact reviewed (e.g., GDPR, CCPA, PCI)  
- [ ] Legal or terms-of-service impact reviewed (e.g., App Stores)  
- [ ] Data classification reviewed (e.g., PII, payment, health)  
- [ ] Rate-limiting, abuse-prevention, and access controls validated  
- [ ] Dependencies reviewed (SaaS, SDKs, APIs, system libraries)

#### 📊 Observability & Operations
- [ ] Logs, metrics, and alerts added or validated  
- [ ] Tracing and dashboards updated  
- [ ] Runbooks and playbooks updated (if needed)  
- [ ] Capacity or quota changes validated (e.g., GCP, K8s, Stripe)  
- [ ] Infrastructure/IaC reviewed (Terraform, Argo, Docker, etc.)  
- [ ] Disaster recovery or HA impact considered (if infra-related)

#### 📣 Communication & UX
- [ ] User-facing changes communicated (support, success, marketing)  
- [ ] Internal release notes created  
- [ ] External changelog/notes updated (if applicable)  
- [ ] UX/copy/design reviewed (if user-visible)  
- [ ] Accessibility verified (if applicable)  
- [ ] Translations updated or confirmed N/A  
- [ ] Third-party/partner impact assessed (if APIs or integrations)  

#### 📁 Data & Migrations
- [ ] Data model/schema changes reviewed  
- [ ] Migrations tested for forward/backward compatibility  
- [ ] Data backfill requirements documented or confirmed N/A  
- [ ] Cleanup tasks scheduled or tracked (e.g. old flags, obsolete data)

#### 🧯 Rollout & Safeguards
- [ ] Feature flag or config toggle in place (if needed)  
- [ ] Rollout plan documented  
- [ ] Canary/staged rollout strategy defined  
- [ ] Monitoring dashboards checked during rollout  
- [ ] Alert thresholds verified  
- [ ] Rollback tested in staging or dry-run  
- [ ] Cutover/launch window approved (if downtime or coordination needed)

---

### 🚀 Rollout Strategy
- [ ] Full rollout  
- [ ] Gradual rollout  
- [ ] Canary  
- [ ] Behind feature flag  
- [ ] Limited user segment / cohort  

---

**👀 Post-Merge Monitoring Owner:** @username  
**📆 Monitoring Window:** e.g. 24h / 48h post-deploy  
**📢 Escalation Contact:** @username / PagerDuty link  

---

**🧰 Tech Stack Involved**  
bun · TypeScript · valibot · GCP · Kubernetes · Stripe · Argo · Biome · Docker · Svelte · iOS · Android · App Stores · Umami · Observability Stack · Sentry · Cloudflare

---

> 🛑 Do not merge until all applicable items are complete and verified.  
> 🔍 Tag responsible leads and on-call engineers. Confirm rollback and alerting plans are operational.
