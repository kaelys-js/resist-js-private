### 📊 Analytics / Telemetry Update

**Events Added/Updated**
- `user_signup_started`
- `checkout_failed`

**Purpose**
Enhancing visibility into high-impact user flows:
- `user_signup_started`: Captures when a user initiates the sign-up process across platforms to support funnel analysis, identify drop-off points, and optimize onboarding.
- `checkout_failed`: Logs failed transactions, including context from Stripe or client/network issues, to diagnose payment friction and improve recovery flows.

**Validation**
- [x] Schemas defined in versioned analytics spec (Valibot + TypeScript)
- [x] QA verified event firing on Svelte (web), iOS, and Android
- [x] Privacy review completed — no PII collected without consent; compliant with current policy

**Instrumentation**
- Follows naming convention: `snake_case`, action-oriented
- Payloads validated at runtime via Valibot; enforced in CI using Biome
- Schema diffs and regression tests run in Docker-based suite
- Lifecycle (add/update/deprecate) tracked in internal changelog

**Observability & Security**
- Monitored via Umami, Sentry, and GCP observability stack
- Stripe error payloads include type, code, and retryability flag (safely redacted)
- Sensitive data redacted at edge via Cloudflare Workers
- Routing secured via Argo; least-privilege K8s roles enforced

**Notes**
- Events are lightweight, non-blocking, and retry-safe
- Reflected in dashboards and developer portal for full transparency
