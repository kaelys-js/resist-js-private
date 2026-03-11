### 🔑 Auth / Identity Change

**What’s Changed:**
- [ ] Login or SSO flow added or updated
- [ ] OAuth scopes introduced or modified
- [ ] MFA enforced, added, or updated

---

**✅ Security & Compatibility**
- [ ] Tokens encrypted at rest and over TLS
- [ ] Short-lived access tokens with refresh flow enabled
- [ ] Token rotation and revocation flows verified
- [ ] Session timeouts (idle and absolute) enforced
- [ ] MFA fallback and recovery paths validated
- [ ] Backward compatibility confirmed on web, iOS, and Android
- [ ] Input and response validation applied (e.g. valibot)

---

**🔒 Infrastructure & Secrets**
- [ ] OAuth client secrets stored in GCP Secret Manager (or equivalent)
- [ ] Auth secrets excluded from logs and builds
- [ ] Docker images rebuilt and validated for auth changes
- [ ] K8s secrets mounted securely
- [ ] ArgoCD rollout with rollback strategy tested

---

**📈 Monitoring & Observability**
- [ ] Auth events logged (Sentry, GCP logs, etc.)
- [ ] Auth flows tracked via analytics (e.g. Umami)
- [ ] Alerts in place for suspicious auth activity
- [ ] Rate limiting, CAPTCHA, and abuse protection active (e.g. Cloudflare)

---

**🧪 Testing & CI**
- [ ] Unit and integration tests cover auth logic
- [ ] E2E tests pass across platforms (web, iOS, Android)
- [ ] CI pipelines (bun, biome) green post-change
- [ ] App Store / Play Store builds validated

---

**📚 Documentation**
- [ ] Provider setup and integration docs updated
- [ ] Dev and platform guides reflect changes
- [ ] Onboarding and recovery documentation updated
