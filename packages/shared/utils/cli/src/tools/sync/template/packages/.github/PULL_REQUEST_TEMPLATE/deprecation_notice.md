### 📉 Deprecation & Sunset Notice

**Feature Being Deprecated:**  
`/v1/legacy/feature`

**Replacement:**  
Migrate to `/v2/new-feature` — designed for better performance, enhanced security, and future compatibility.

---

### 🧠 Why This Is Happening

The `/v1/legacy/feature` endpoint is being phased out due to low usage, architectural constraints, and the availability of a newer, more efficient version. This helps us improve performance, reduce maintenance overhead, and unify platform behaviors across clients.

---

### 🗓 Deprecation Lifecycle

| Phase         | Date (ISO 8601) | Description                                                                 |
|---------------|-----------------|-----------------------------------------------------------------------------|
| ⚠️ Deprecated | 2025-06-02      | Warning headers returned. Supported but no longer recommended.              |
| 🚫 Unsupported | 2025-08-01      | No further fixes or guarantees. May return partial failures.                |
| ❌ Removed     | 2025-09-30      | Endpoint fully removed. Calls will return `410 Gone` with structured error. |

---

### 🔁 Migration Required

All clients must switch to `/v2/new-feature` before **2025-09-30**. Continued use of `/v1/legacy/feature` beyond this date will result in request failures.

---

### 🧰 Developer Impact

- **HTTP Changes During Deprecation:**
  - Adds `Deprecation: true` and `Sunset: 2025-09-30` headers
  - Optional `Link` header: `<https://api.example.com/v2/new-feature>; rel="alternate"`
- **Post-Sunset Behavior:**
  - Returns `410 Gone`
  - Example:
    ```json
    {
      "error": "Gone",
      "message": "/v1/legacy/feature has been removed. Please use /v2/new-feature."
    }
    ```

---

### ✅ Migration & Communication Checklist

- [x] 📚 [Migration guide](#) published
- [x] 🧪 Tests added for `/v2/new-feature` in CI pipelines
- [ ] 📦 SDKs updated:
  - `@yourorg/sdk-js@^3.1.0`
  - `yourorg-ios-sdk v2.5+`
  - `yourorg-android-sdk v2.4+`
- [ ] 📱 Mobile apps updated (iOS/Android) and released to app stores
- [x] 📊 Legacy usage monitored (via Umami, Sentry, GCP Logging)
- [ ] 🛑 Legacy feature flags removed from feature store
- [ ] 🐳 Docker image deprecation tags updated
- [ ] 🚥 Canary & gradual traffic rollout configured in Argo/Cloudflare
- [ ] 📞 Support team briefed & escalation path defined
- [ ] 📬 User notifications sent via:
  - Email campaigns
  - In-app banners
  - [Status page](https://status.yourdomain.com)
  - [Changelog](https://yourdomain.com/changelog#2025-06)

---

### 🔐 Security & Compliance

- No known vulnerabilities related to this endpoint.
- Migration aligns with internal security policies and ISO/SOC2 readiness.
- Data access patterns unchanged; no new scopes required.

---

### 📜 Legal, SLA & Billing Impact

- No impact on SLAs, pricing tiers, or contractual terms.
- Stripe-based billing integrations are unaffected.

---

### 🧱 Stack Reference

bun · TypeScript · valibot · GCP · Kubernetes · Stripe · Argo CD · biome · Docker · Svelte · iOS · Android · App Stores · Umami · Sentry · Cloudflare

---

📮 Questions? See the [Migration Guide](#) or reach out via [Support](mailto:support@yourdomain.com)
