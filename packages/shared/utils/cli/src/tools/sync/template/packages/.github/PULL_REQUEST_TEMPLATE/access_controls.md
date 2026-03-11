### 🔐 Access Control Change Request

**Summary**  
Modify IAM role bindings to enforce least privilege and enable observability integrations.  
- **Add**:  
  - `roles/viewer` to `observability-agent@project-id.iam.gserviceaccount.com`  
  - `roles/logging.viewer` to `observability-agent@project-id.iam.gserviceaccount.com`  
- **Remove**:  
  - `roles/editor` from `ci-cd@project-id.iam.gserviceaccount.com` (deprecated service account)

**Scope**  
- **Environments**: `staging`, `production`  
- **Affected Identities**:  
  - `observability-agent@project-id.iam.gserviceaccount.com`  
  - `ci-cd@project-id.iam.gserviceaccount.com`

**Justification**  
- 🔐 **Security**: Remove over-privileged access from legacy CI/CD identity to reduce risk exposure  
- 📊 **Observability**: Grant scoped read-only access for log ingestion and monitoring tools (e.g., Sentry, Umami, internal dashboards)  
- 📋 **Compliance**: Aligns with internal policy and audit control requirements  
- 📁 **Auditability**: Tracked via GitOps (Argo CD), validated with `valibot`, and deployed using `bun` workflows

**Reviewers Required**  
- [ ] Security Lead  
- [ ] DevOps Lead  
- Optional: [ ] Platform Engineering

**Change Reference**  
GitOps path: `infra/access/changes/2025-06-02-obs-ci-update.yaml`
