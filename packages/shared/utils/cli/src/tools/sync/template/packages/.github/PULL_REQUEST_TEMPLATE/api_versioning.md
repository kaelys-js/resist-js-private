### 🔁 API Versioning & Deprecation Notice

**APIs Affected:**  
- `GET /v1/users` _(Deprecated)_  
- `GET /v2/products` _(New Stable Version)_

---

**Summary of Changes:**  
- ✅ Introduced: `/v2/products`  
- ✅ Deprecated: `/v1/users` (to be sunset)

---

**Client Migration Plan:**  
To maintain compatibility and receive full support, migrate to `/v2/...` endpoints before the deprecation deadline.

1. **Review the Updated API Specification**  
   - See the [API Documentation](https://yourdomain.com/docs) for schema changes, parameters, and validation rules (`valibot`-based).

2. **Update Integrations**  
   - Refactor API calls from `/v1/users` to corresponding `/v2/...` endpoints.  
   - Adjust data handling for any structural changes.

3. **Test in Staging**  
   - Use sandbox or staging environments to validate changes.  
   - Monitor logs via GCP tools, Sentry, and Umami for errors and performance metrics.

4. **Roll Out in Production**  
   - Deploy using CI/CD pipelines (Argo), with gradual rollout strategies via feature flags and Kubernetes.  
   - Continuously monitor observability dashboards.

5. **Fallback & Support Policy**  
   - `/v1/users` will remain accessible until the sunset date but is frozen (no updates or fixes).  
   - Critical issues will receive best-effort support during the deprecation window.

---

**Deprecation Timeline (ISO Format):**

| Phase              | Date         | Description                                      |
|--------------------|--------------|--------------------------------------------------|
| Announcement       | 2025-06-01   | Clients notified, docs updated                   |
| Deprecation Begins | 2025-06-10   | `/v1/users` marked as deprecated                 |
| End of Life (EOL)  | 2025-09-01   | `/v1/users` fully removed from production        |

---

**Related Resources:**  
- 🔄 [Changelog](https://yourdomain.com/changelog) – Technical breakdown of the changes  
- 📘 [API Docs](https://yourdomain.com/docs) – Full specs & examples  
- 🛠️ [Migration Guide](https://yourdomain.com/migration-guide) – Code snippets, SDK updates

---

**Support Channels:**  
For migration help, contact [support@yourdomain.com](mailto:support@yourdomain.com) or visit the [Support Portal](https://yourdomain.com/support).

---

**✅ Final Checklist:**  
- [x] Versioning documented  
- [x] Public documentation updated  
- [x] Deprecation timeline published  
- [x] Migration guidance available  
