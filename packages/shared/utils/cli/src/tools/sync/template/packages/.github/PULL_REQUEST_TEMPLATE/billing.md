### 💳 Billing or Subscription Change

#### What Changed
- [ ] Pricing model (e.g., flat-rate, tiered, usage-based)
- [ ] Metering logic (e.g., tracked metrics, thresholds, rate limits)
- [ ] Billing provider integration (e.g., Stripe, Chargebee, webhook schemas)

#### Affected Areas
- [ ] Existing customers (e.g., grandfathering, billing migration)
- [ ] New or restructured plan tiers
- [ ] Trial periods, coupons, or discount logic

#### Pre-Launch Validation
- [ ] Payment flows tested end-to-end in sandbox (success, failure, retries)
- [ ] Invoice generation and usage previews validated with representative data
- [ ] Refunds, cancellations, and proration logic reviewed for compliance
- [ ] Webhooks (e.g., `invoice.paid`, `subscription.updated`) handled and verified
- [ ] K8s secrets/configs updated securely (e.g., Stripe keys, pricing flags)
- [ ] Cloudflare rules reviewed for billing pages and API caching

#### Product & Platform Updates
- [ ] Svelte UI updated (pricing pages, checkout flows, account settings)
- [ ] App Store metadata reviewed (if pricing or plans are referenced)
- [ ] Mobile apps tested for compatibility (iOS/Android fallbacks for deprecated plans)
- [ ] Argo rollout strategy defined (e.g., canary, blue-green, rollback plan)
- [ ] Docker images rebuilt and validated with updated billing logic

#### Observability & Support
- [ ] Logs, metrics, and traces verified (e.g., billing attempts, overages, webhooks)
- [ ] Sentry alerts configured for billing-related errors and edge cases
- [ ] Umami and analytics updated to capture billing flow events
- [ ] Support team briefed; runbooks and FAQs updated
- [ ] Legal/privacy terms reviewed (if pricing or data usage changed)
- [ ] Audit logs capturing pricing/config changes (if applicable)

#### Dev Hygiene
- [ ] Code linted and formatted (Biome)
- [ ] Input validation and schemas updated (Valibot)
- [ ] Changes peer-reviewed, tested, and merged per standard process
