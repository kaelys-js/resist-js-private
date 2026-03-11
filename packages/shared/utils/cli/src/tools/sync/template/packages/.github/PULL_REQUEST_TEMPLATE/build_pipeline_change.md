### 🛠 Build System Update

**What Changed:**
- [x] Streamlined Vite configuration
- [x] Replaced transpiler with `bun build`
- [x] Consolidated dev and build scripts
- [x] Removed obsolete polyfills and unused plugins

**Reason:**
- Accelerates CI and local builds using Bun
- Ensures consistent behavior across macOS and Linux
- Reduces cold starts and simplifies build process
- Produces smaller, deterministic bundles

**Checklist:**
- [x] Validated in dev and CI environments
- [x] Reproducible builds across platforms
- [x] Bundle size tracked (Umami, Sentry)

**Technical Notes:**
- Type safety ensured via `bunx tsc`
- Code formatting and linting enforced with Biome
- Docker build cache optimized for GCP/K8s
- ArgoCD deployment pipeline verified
- Stripe webhook mocks included in build step
- Observability hooks integrated (Sentry, Umami)
