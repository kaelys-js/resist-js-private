### 💥 Breaking Change

**What Will Break**
- **API**
  - `/api/v1/users` — request and response schema updated
  - `/api/v1/payments/checkout` — now requires an `Authorization` header
- **Validation**
  - Migration from `valibot@1.x` to `valibot@2.x`; deprecated constructs removed
- **Mobile**
  - iOS and Android components using outdated shared types will no longer compile
- **Observability**
  - Metric keys renamed or removed; affects dashboards, alerts, and log ingestion
- **Stripe**
  - Webhook signature verification logic updated; legacy method removed
- **Tooling**
  - Deprecated Docker tags and Biome configurations no longer supported

**Migration Guide**
1. **API Consumers**
   - Align request and response payloads with updated schema (`/docs/api-changes.md`)
   - Add `Authorization` headers to all protected endpoints
2. **Validation**
   - Upgrade to `valibot@2.x`
   - Refactor schema definitions to remove deprecated constructs
3. **Mobile**
   - Sync updated types from the shared schema package
   - Refactor affected components
   - Rebuild and resubmit apps following QA
4. **Observability**
   - Update dashboards, alerts, and log pipelines with new metric keys
   - Confirm compatibility across Sentry, Umami, and Cloudflare
5. **Stripe**
   - Use `@core/stripe-utils` for webhook verification
   - Rotate webhook secrets if statically configured
6. **CI/CD**
   - Run `biome format && bun check` before deployment
   - Deploy to staging via ArgoCD
   - Validate edge propagation and fallback via Cloudflare

**Versioning Impact**
✅ **Yes** — this release introduces breaking changes across public APIs, clients, and infrastructure. A **major version bump** is required.

**Checklist**
- [x] Changelog updated  
- [x] Affected teams notified via #dev-announcements and tracking tickets  
- [x] Migration steps added to `MIGRATIONS.md`  
- [x] Staging environment verified  
- [x] Dashboards and alerts updated
