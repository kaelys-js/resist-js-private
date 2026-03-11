### 🔧 Maintenance / Chore

**Description**  
Routine maintenance: dependency updates, configuration cleanup, and infrastructure validation.

**Reason**  
Ensure stability, security, and alignment with latest tooling. Prevent drift and reduce technical debt.

**Checklist**
- [x] No functional changes
- [x] CI/CD passes (build, lint, test)
- [x] Dependencies updated (Bun, Biome, Valibot, Svelte, etc.)
- [x] Docker base images reviewed and updated
- [x] Kubernetes manifests validated (GKE-compliant)
- [x] Observability stack verified (Sentry, Umami, metrics, logs)
- [x] GCP and Cloudflare configurations audited
- [x] Stripe API/version reviewed
- [x] Argo workflows validated
- [x] App Store metadata/configs reviewed (iOS/Android)
- [x] Formatting and linting enforced (Biome, TS strict mode)
- [x] No breaking changes introduced
