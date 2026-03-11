### 🗄️ Data Retention / Lifecycle Change

**Scope of Change:**
- [ ] Purge logic (automated/manual, secure deletion, redaction workflows)
- [ ] Archival logic (cold storage, encryption, immutability, retrieval, legal hold)
- [ ] Retention duration (per data type, jurisdiction, environment, business case)

**Why:**  
e.g., GDPR/CCPA compliance, SOC 2 / ISO 27001 alignment, storage cost optimization, privacy by design, security risk reduction, system performance, customer trust

---

**Checklist:**

#### 📚 Legal & Compliance
- [ ] 📜 Legal review completed (GDPR, CCPA, HIPAA, PCI DSS, etc.)
- [ ] 🛑 Data minimization and purpose limitation enforced
- [ ] 🗂️ Data classification framework implemented and reviewed
- [ ] 📝 Records of Processing Activities (ROPA) updated
- [ ] 👤 Data subject rights validated (access, erasure, portability, correction)
- [ ] 🧾 DPA (Data Processing Agreements) with vendors reviewed
- [ ] ⚖️ Retention schedules aligned with regulatory and jurisdictional mandates
- [ ] 🔁 Retention policy versioning in place (for audit and rollback purposes)
- [ ] 🌍 Data residency confirmed (region/zone validation per law)
- [ ] 🧪 Data retention impact assessment (DPIA) completed if applicable

#### 🛠️ Technical Implementation
- [ ] ⚙️ End-to-end lifecycle implemented (create → use → archive → delete)
- [ ] ⏳ Retention metadata stored and enforced at schema/config level
- [ ] 📆 Automated jobs set (e.g., GCP lifecycle rules, Firestore TTLs, Argo workflows)
- [ ] 🗑️ Secure purge implemented (cryptographic erase, version overwrites, redaction)
- [ ] 💾 Archival logic includes encryption, cold storage, immutability, legal hold support
- [ ] 🔐 Archived data is read-only and access-restricted
- [ ] 🧯 Backup & disaster recovery updated to match lifecycle states
- [ ] 💣 Batch size and rate-limiting configured to prevent over-deletion
- [ ] 🧪 Lifecycle logic tested (unit, integration, staging)
- [ ] 🧱 IaC (Terraform, Helm, etc.) updated with retention and archival configurations
- [ ] 🔄 Feature flags for gradual rollout and rollback
- [ ] 🧩 Archived/purged data is excluded from analytics and user-visible features

#### 🔒 Security
- [ ] 🛡️ Role-based access enforced for archival/purge actions
- [ ] 📜 Deletion and archival actions logged (immutable audit trail)
- [ ] 🔑 Encryption key rotation validated for archived data
- [ ] 🔓 Archived/purged data inaccessible via stale tokens or cached access
- [ ] 📵 Public or unauthenticated access fully blocked
- [ ] 🔐 Secure token invalidation on user deletion
- [ ] 🎯 Differential access policies reviewed for archived data

#### 🔍 Data Inventory & Audit
- [ ] 📊 Full inventory completed (services, storage, regions, data classes)
- [ ] 🧹 Legacy data cleaned (stale, orphaned, test/debug)
- [ ] 🔎 Subprocessors reviewed for retention and deletion guarantees
- [ ] 🧾 Shadow or undocumented stores identified and remediated
- [ ] 🔁 Environments reviewed (dev/stage/prod) with appropriate retention configurations

#### 📈 Observability
- [ ] 📉 Retention job metrics exposed (purged, archived, failed, skipped)
- [ ] 🚨 Alerts configured for lifecycle violations, purge failures
- [ ] 📊 Dashboards include lifecycle indicators and logs
- [ ] 🔍 Distributed tracing added to data deletion/archival flows (e.g., OpenTelemetry)
- [ ] 📉 Anomaly detection configured for irregular deletion volumes

#### 🔌 Integrations & Product Impact
- [ ] 💳 Stripe data lifecycle verified (charges, disputes, receipts)
- [ ] 🪲 Sentry retention and deletion policies reviewed
- [ ] 📈 Umami analytics data retention verified
- [ ] 📱 iOS and Android apps conform to lifecycle (local storage, offline handling)
- [ ] 🌐 Svelte frontend updated to reflect lifecycle states (e.g., archived, purging soon)
- [ ] 🧩 API responses reflect data lifecycle status (410 Gone, archived flags)
- [ ] 🔄 Data sync tools and offline queues updated to avoid expired data
- [ ] 📡 Webhooks and downstream systems updated to react to lifecycle events

#### 📘 Policy & Documentation
- [ ] 📄 Internal retention policy documented, versioned, and published
- [ ] 📤 Export and deletion flows validated (user-initiated, admin-initiated)
- [ ] 🧑‍🏫 Engineering/onboarding docs updated with lifecycle info
- [ ] 💬 Communication plan ready for user-facing changes (if applicable)
- [ ] 🖥️ External privacy policy updated to reflect retention lifecycle

---

**Tools & Stack Context:**
- SaaS product
- TypeScript, bun, valibot, biome
- Svelte (frontend), iOS, Android (mobile)
- Stripe, Sentry, Umami, Cloudflare
- GCP (Storage, BigQuery, Firestore, IAM, Scheduler, KMS)
- Kubernetes (K8s), Argo Workflows, Terraform
- Docker (builds), CI/CD pipelines

---

**Owner:** _[Insert DRI or Team]_  
**Review Cycle:** _[e.g., Quarterly, Annual]_  
**Last Updated:** _[YYYY-MM-DD]_
