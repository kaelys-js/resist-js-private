### 🔄 CI/CD Update

**What Changed**
Refined all major workflows (`ci.yml`, `deploy.yml`, `mobile.yml`, `security.yml`, `preview-env.yml`) to align with modern DevOps, security, and compliance standards.

**Enhancements**

🧹 **Code Quality & Testing**
- Linting via `biome`, schema validation (`valibot`), type checks (`tsc`)
- Unit, integration, and E2E test execution using `bun`
- Test matrix over Node.js and bun versions
- Coverage upload, threshold enforcement, and PR diff reports

🚀 **Deployment Strategy**
- Preview environments (PR-based) with TTL cleanup
- Canary and blue/green rollout via ArgoCD
- Rollbacks gated by health checks and logs
- Feature-flag aware deploys (Cloudflare / LaunchDarkly-style)
- Manual approval gates for production stages

📦 **Artifacts & Provenance**
- Retain and sign Docker images, binaries, and source maps
- Sentry source map uploads with release tagging
- Git tag auto-generation and changelog automation
- SBOM generation (CycloneDX or SPDX)
- License scanning for compliance (web, mobile, backend)

🔐 **Security**
- GCP Workload Identity + Cloudflare secrets
- Container scans (Trivy), dependency audit, lockfile checks
- Secret scanning and misconfiguration detection
- OpenSSF Scorecard checks integrated in pipeline

📱 **Mobile CI/CD**
- Build and test for iOS/Android (pod/gradle caching)
- Crash analytics upload to Sentry
- App/Play Store deploy with metadata validation
- QR codes for preview builds on PRs
- Store track and version coordination with backend release

🧠 **Observability & Monitoring**
- Log, trace, and metric forwarding (Sentry, Umami, custom dashboards)
- Alerting on failure, latency, error spikes, and uptime drops
- Correlation IDs and structured logging support
- Budget/cost alerts for ephemeral and mobile builds

🧾 **Compliance & Governance**
- Deployment audit logs
- Software Bill of Materials (SBOM) and license compliance
- Infra-as-Code drift detection and OPA policy checks
- "Release freeze" toggle for coordinated app releases

💬 **Developer Feedback & Workflow UX**
- PR comments with test summaries, coverage diffs, and preview links
- Slack/Discord notifications on workflow completion
- QR preview links for mobile builds in PRs
- Version sync alerts for backend/mobile mismatch

**Why?**
- Speed up builds and deployment feedback loops
- Improve cross-platform coordination and governance
- Strengthen security and compliance posture
- Automate deploy previews and rollback strategies
- Support safer mobile and cloud delivery at scale

**Testing**
- [x] Validated in test branches across web, mobile, backend
- [x] Canary tested rollback and approval gating
- [x] Verified preview env auto-creation and TTL cleanup
- [x] SBOM and audit log integration validated
- [x] All workflows passing

**Affected Workflows**
- `ci.yml`: Full-stack test, lint, typecheck, matrix runs, artifact signing
- `deploy.yml`: ArgoCD deploys with feature flags, approval steps, observability
- `mobile.yml`: iOS/Android test + deploy, QR preview builds, store metadata check
- `security.yml`: Container scan, lockfile audit, SBOM generation
- `preview-env.yml`: Preview env lifecycle, Slack notifications, TTL expiry
- `governance.yml`: Git tag/changelog automation, audit log sync, freeze detection
