### 📝 Summary

Clearly explain what this PR changes and why. Include the motivation, relevant context (e.g. user story, system behavior), and whether it's part of a larger initiative or sprint. Mention affected systems (e.g. API, mobile, infra).

---

### 🔧 Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Performance improvement
- [ ] Infrastructure / CI/CD
- [ ] Documentation
- [ ] Test coverage
- [ ] Security patch
- [ ] Observability/logging
- [ ] Other (please describe):

---

### ✅ Checklist
- [ ] Related issue(s) linked
- [ ] Code follows project and style guidelines
- [ ] Code reviewed and approved internally
- [ ] All tests passing (unit, integration, E2E)
- [ ] Lint, format, and type-check pass (e.g. biome, tsc)
- [ ] Documentation updated (or marked as not needed)
- [ ] UI/UX changes reviewed (if applicable)
- [ ] Observability configured (logs, metrics, traces, dashboards)
- [ ] No known security risks introduced
- [ ] No breaking changes (or listed below)
- [ ] Manual QA completed or not needed
- [ ] Verified in staging/pre-production
- [ ] Ready for merge

---

### 🔗 Linked Issues / RFC / Docs
Closes #[issue-number]  
RFC: [link-to-rfc]  
Design Doc: [link-to-design-doc]  
Other context: [Notion, Linear, Jira, etc.]

---

### 🧪 How to Test
Describe exact steps to test this PR. Include command-line instructions, environment setup, browser flows, or API requests.

```sh
# Example CLI flow:
bun install
bun dev
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/example

# Example UI flow:
1. Go to /settings on Svelte frontend
2. Update billing info (Stripe test card)
3. Check logs/Sentry for events
```

---

### 📸 Screenshots / Logs / Visual Diffs
Add screenshots (for UI), CLI output, log traces, diffs, or videos to aid the reviewer.

---

### ⚠️ Breaking Changes
- [ ] Yes  
If yes, explain:
```text
e.g., Replaced `/v1/user` with `/v2/user`; mobile clients must update.
```

---

### 🚀 Deployment Notes
Call out infra changes, rollout steps, secrets, scripts, manual tasks, or specific deployment instructions.

- [ ] DB migration required
- [ ] ArgoCD / Helm sync required
- [ ] GCP IAM or service config update
- [ ] Manual feature flag change
- [ ] New env vars / secrets added
- [ ] A/B rollout or canary strategy
- [ ] Post-deploy smoke tests
- [ ] Rollback plan described

---

### 📱 Mobile Considerations
- [ ] Requires iOS/Android release
- [ ] Includes native UI/UX changes
- [ ] Tested on emulators and physical devices
- [ ] App store metadata or permissions changed

---

### ⚡ Performance Considerations
- [ ] Client bundle size change reviewed
- [ ] API/DB performance optimized
- [ ] Load test run and results acceptable
- [ ] Added memoization or caching
- [ ] Cloudflare/CDN config adjusted

---

### 🛡️ Security Considerations
- [ ] Validations updated (valibot or custom)
- [ ] Role-based access control changes
- [ ] Sensitive data encrypted or redacted
- [ ] Dependency or supply chain risks reviewed
- [ ] No exposed internal APIs or debug endpoints

---

### 📊 Observability
- [ ] Sentry error logging updated
- [ ] Metrics added to GCP / Prometheus
- [ ] Cloudflare edge logging verified
- [ ] Umami / tracking tags added
- [ ] Alerts and dashboards configured

---

### 🧩 Tooling Notes
- Built and tested with `bun`
- Validated with `valibot`
- Biome used for lint/format
- Stripe used for payments
- GCP + Kubernetes via ArgoCD
- Dockerized deployment validated
- Frontend: Svelte
- Mobile: iOS & Android

---

### 📌 Additional Notes
Add anything that doesn't fit above but is useful to reviewers or future maintainers. Examples:
- Known limitations or tech debt
- Feature toggles in place
- Things to monitor post-deploy
- Edge cases that were considered
