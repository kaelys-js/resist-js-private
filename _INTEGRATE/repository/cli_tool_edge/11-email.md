# 11 — Email Routing: Mailpit Simulation, Email Workers, SPF/DKIM/DMARC

## Context

Cloudflare Email Routing lets users create custom email addresses for a zone and route incoming mail to destination addresses, Email Workers, or `/dev/null` (drop). Locally, we simulate this with **Mailpit** (an SMTP server with web UI) so developers can test email flows without external services. Email Workers are tested via wrangler's built-in `POST /cdn-cgi/handler/email` endpoint plus a CLI convenience wrapper. SPF/DKIM/DMARC records are schema-only (no local simulation) — they drive Pulumi DNS TXT record generation.

## Documentation Links

- Cloudflare Email Routing overview: https://developers.cloudflare.com/email-routing/
- Custom addresses: https://developers.cloudflare.com/email-routing/setup/email-routing-addresses/
- Email Workers: https://developers.cloudflare.com/email-routing/email-workers/
- Email Workers runtime API: https://developers.cloudflare.com/email-routing/email-workers/runtime-api/
- Send email from Workers: https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/
- Local development: https://developers.cloudflare.com/email-routing/email-workers/local-development/
- Mailpit: https://github.com/axllent/mailpit
- Pulumi `EmailRoutingRule`: https://www.pulumi.com/registry/packages/cloudflare/api-docs/emailroutingrule/
- Pulumi `EmailRoutingCatchAll`: https://www.pulumi.com/registry/packages/cloudflare/api-docs/emailroutingcatchall/
- Pulumi `EmailRoutingAddress`: https://www.pulumi.com/registry/packages/cloudflare/api-docs/emailroutingaddress/
- Pulumi `EmailRoutingSettings`: https://www.pulumi.com/registry/packages/cloudflare/api-docs/emailroutingsettings/

---

## 1. Valibot Schema: `packages/shared/schemas/core-config/src/edge-email.ts`

### 1.1 Cloudflare API surface (schema must cover all of these)

**Routing Rules** (Pulumi `EmailRoutingRule`):
- `matchers[]`: `{ type: 'literal' | 'all', field?: 'to', value?: string }`
- `actions[]`: `{ type: 'forward' | 'worker' | 'drop', values?: string[] }`
- `enabled`: boolean
- `name`: string (human-readable label)
- `priority`: number (ordering — lower = higher priority)

**Catch-All** (Pulumi `EmailRoutingCatchAll`):
- `matchers[]`: `{ type: 'all' }` (always `'all'` — matches everything unmatched)
- `actions[]`: `{ type: 'forward' | 'worker' | 'drop', values?: string[] }`
- `enabled`: boolean
- `name`: string

**Destination Addresses** (Pulumi `EmailRoutingAddress`):
- `email`: string (the external address to forward to)
- Account-scoped (reusable across zones)

**Email Workers**:
- Worker script that exports `async email(message, env, ctx)` handler
- `EmailMessage` interface: `from`, `to`, `headers` (Headers), `raw` (ReadableStream), `rawSize` (number)
- Methods: `setReject(reason)`, `forward(rcptTo, headers?)`, `reply(message)`
- `send_email` binding in wrangler.toml: `{ name, destination_address?, allowed_destination_addresses?, allowed_sender_addresses? }`

**DNS Records (SPF/DKIM/DMARC)** — schema-only, for Pulumi TXT record generation:
- SPF: `v=spf1 include:_spf.mx.cloudflare.net ~all` (standard CF Email Routing SPF)
- DKIM: selector + public key TXT record at `<selector>._domainkey.<domain>`
- DMARC: policy TXT record at `_dmarc.<domain>`

**Email Routing Settings** (Pulumi `EmailRoutingSettings`):
- Zone-level enable/disable (creating the resource activates routing)

### 1.2 Complete schema

```typescript
/**
 * Email Routing Edge Config Schema
 *
 * Defines Cloudflare Email Routing configuration for both local Caddy/Mailpit
 * simulation and Pulumi Cloudflare IaC generation. Covers routing rules,
 * custom addresses, catch-all behavior, Email Worker bindings, SPF/DKIM/DMARC
 * DNS records, and Mailpit local dev settings.
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Primitives
// =============================================================================

/** Email address validated with Valibot's email pipe. */
const EmailAddressSchema = v.pipe(v.string(), v.email());

/**
 * Port number in the valid range 1-65535.
 * Uses NonNegativeInteger with min/max constraints.
 */
const PortSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(1),
  v.maxValue(65535),
);

// =============================================================================
// Routing Rule Matcher
// =============================================================================

/**
 * Matcher for a literal email address.
 *
 * Maps to Cloudflare API: `{ type: 'literal', field: 'to', value: '<address>' }`
 * Matches when the envelope-to address exactly equals `value`.
 * Subaddressing (RFC 5233): `user+tag@domain` routes to `user@domain`
 * unless an explicit rule for `user+tag@domain` exists.
 */
const LiteralMatcherSchema = v.strictObject({
  /** Matcher type — literal exact match. */
  type: v.literal('literal'),
  /** Email field to match against. Always 'to' for Email Routing. */
  field: v.optional(v.literal('to'), 'to'),
  /** The full email address to match (e.g., 'support@example.com'). */
  value: EmailAddressSchema,
});

/**
 * Catch-all matcher — matches all addresses not matched by other rules.
 * Maps to Cloudflare API: `{ type: 'all' }`
 */
const AllMatcherSchema = v.strictObject({
  /** Matcher type — matches everything. */
  type: v.literal('all'),
});

/**
 * Union of all matcher types.
 * Use `variant` for discriminated union on `type` field (better perf than `union`).
 */
const RoutingRuleMatcherSchema = v.variant('type', [
  LiteralMatcherSchema,
  AllMatcherSchema,
]);

/** Inferred type for routing rule matchers. */
type RoutingRuleMatcher = v.InferOutput<typeof RoutingRuleMatcherSchema>;

// =============================================================================
// Routing Rule Action
// =============================================================================

/**
 * Forward action — routes email to one or more destination addresses.
 * Maps to Cloudflare API: `{ type: 'forward', value: ['dest@example.com'] }`
 * Destination addresses must be verified in the Cloudflare account.
 */
const ForwardActionSchema = v.strictObject({
  /** Action type — forward to destination addresses. */
  type: v.literal('forward'),
  /** Destination email addresses to forward to. At least one required. */
  values: v.pipe(v.array(EmailAddressSchema), v.minLength(1)),
});

/**
 * Worker action — routes email to an Email Worker for processing.
 * Maps to Cloudflare API: `{ type: 'worker', value: ['my-email-worker'] }`
 * The worker must export an `email(message, env, ctx)` handler.
 */
const WorkerActionSchema = v.strictObject({
  /** Action type — route to Email Worker. */
  type: v.literal('worker'),
  /**
   * Worker script names that handle the email.
   * Typically a single worker, but the API accepts an array.
   */
  values: v.pipe(v.array(v.pipe(v.string(), v.minLength(1))), v.minLength(1)),
});

/**
 * Drop action — silently discards the email.
 * Maps to Cloudflare API: `{ type: 'drop' }`
 * No values needed — the email is deleted without routing.
 */
const DropActionSchema = v.strictObject({
  /** Action type — drop/discard the email. */
  type: v.literal('drop'),
});

/**
 * Union of all action types.
 * Use `variant` for discriminated union on `type` field.
 */
const RoutingRuleActionSchema = v.variant('type', [
  ForwardActionSchema,
  WorkerActionSchema,
  DropActionSchema,
]);

/** Inferred type for routing rule actions. */
type RoutingRuleAction = v.InferOutput<typeof RoutingRuleActionSchema>;

// =============================================================================
// Routing Rule
// =============================================================================

/**
 * A single email routing rule.
 *
 * Maps to Pulumi `cloudflare.EmailRoutingRule` resource.
 * Rules are evaluated in priority order (lower number = higher priority).
 * Only the first matching rule is executed — subsequent rules are skipped.
 *
 * @example
 * ```typescript
 * const rule = {
 *   name: 'Support inbox',
 *   enabled: true,
 *   priority: 10,
 *   matchers: [{ type: 'literal', field: 'to', value: 'support@example.com' }],
 *   actions: [{ type: 'forward', values: ['team@company.com'] }],
 * };
 * ```
 */
const RoutingRuleSchema = v.strictObject({
  /** Human-readable rule name. Used in dashboard and logging. */
  name: v.optional(v.pipe(v.string(), v.minLength(1)), ''),
  /** Whether this rule is active. Disabled rules are skipped during evaluation. */
  enabled: v.optional(v.boolean(), true),
  /**
   * Rule priority. Lower numbers are evaluated first.
   * Rules at the same priority are evaluated in array order.
   * Range: 0-65535.
   */
  priority: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(65535)), 0),
  /**
   * Matchers define when this rule applies.
   * Typically a single `literal` matcher for a specific address.
   * Must have at least one matcher.
   */
  matchers: v.pipe(v.array(RoutingRuleMatcherSchema), v.minLength(1)),
  /**
   * Actions define what happens when matchers match.
   * Must have at least one action.
   */
  actions: v.pipe(v.array(RoutingRuleActionSchema), v.minLength(1)),
});

/** Inferred type for a single routing rule. */
type RoutingRule = v.InferOutput<typeof RoutingRuleSchema>;

// =============================================================================
// Catch-All Rule
// =============================================================================

/**
 * Catch-all routing rule for unmatched addresses.
 *
 * Maps to Pulumi `cloudflare.EmailRoutingCatchAll` resource.
 * Applied when no other routing rule matches the envelope-to address.
 * Catches typos, variations, and any address at the domain.
 *
 * The matcher is always `{ type: 'all' }` — this is enforced by the schema.
 *
 * @example
 * ```typescript
 * const catchAll = {
 *   enabled: true,
 *   action: { type: 'forward', values: ['catchall@company.com'] },
 * };
 * ```
 */
const CatchAllSchema = v.strictObject({
  /** Whether the catch-all rule is active. */
  enabled: v.optional(v.boolean(), false),
  /** Human-readable name for the catch-all rule. */
  name: v.optional(v.pipe(v.string(), v.minLength(1)), 'Catch-all'),
  /**
   * Action for unmatched addresses.
   * Typically `forward` to a catch-all inbox or `drop` to discard.
   * Worker routing is also supported.
   */
  action: v.optional(RoutingRuleActionSchema, { type: 'drop' as const }),
});

/** Inferred type for catch-all configuration. */
type CatchAll = v.InferOutput<typeof CatchAllSchema>;

// =============================================================================
// Destination Addresses
// =============================================================================

/**
 * A verified destination address that routing rules can forward to.
 *
 * Maps to Pulumi `cloudflare.EmailRoutingAddress` resource.
 * Destination addresses are account-scoped and reusable across zones.
 * In production, Cloudflare sends a verification email that must be clicked.
 * Locally (Mailpit), all addresses are treated as verified.
 *
 * @example
 * ```typescript
 * const destinations = [
 *   { email: 'admin@company.com' },
 *   { email: 'support-team@company.com' },
 * ];
 * ```
 */
const DestinationAddressSchema = v.strictObject({
  /** The external email address to forward to. Must be a valid email. */
  email: EmailAddressSchema,
});

/** Inferred type for a destination address. */
type DestinationAddress = v.InferOutput<typeof DestinationAddressSchema>;

// =============================================================================
// Email Worker Binding (send_email)
// =============================================================================

/**
 * Configuration for the `send_email` Worker binding.
 *
 * Allows Workers to send outbound email via `env.<BINDING_NAME>.send(message)`.
 * The sender must be an address on a domain with Email Routing enabled.
 *
 * Maps to wrangler.toml `[[send_email]]` section:
 * ```toml
 * [[send_email]]
 * name = "EMAIL"
 * destination_address = "user@example.com"
 * ```
 *
 * Restriction modes:
 * - No restriction fields: send to any verified Email Routing address
 * - `destinationAddress`: locked to a single recipient
 * - `allowedDestinationAddresses`: allowlist of permitted recipients
 * - `allowedSenderAddresses`: allowlist of permitted senders
 */
const SendEmailBindingSchema = v.strictObject({
  /** Binding name accessible as `env.<name>` in the Worker. */
  name: v.pipe(v.string(), v.minLength(1)),
  /** Lock to a single destination address. Mutually exclusive with allowedDestinationAddresses. */
  destinationAddress: v.optional(EmailAddressSchema),
  /** Allowlist of permitted destination addresses. Mutually exclusive with destinationAddress. */
  allowedDestinationAddresses: v.optional(v.array(EmailAddressSchema)),
  /** Allowlist of permitted sender addresses. */
  allowedSenderAddresses: v.optional(v.array(EmailAddressSchema)),
});

/** Inferred type for a send_email binding. */
type SendEmailBinding = v.InferOutput<typeof SendEmailBindingSchema>;

/**
 * Email Worker configuration — a worker that processes inbound email.
 *
 * The worker script must export an `email(message, env, ctx)` handler.
 *
 * `EmailMessage` interface (Cloudflare runtime):
 * - `from: string` — envelope-from address
 * - `to: string` — envelope-to address
 * - `headers: Headers` — standard Web API Headers object
 * - `raw: ReadableStream` — full raw email content stream
 * - `rawSize: number` — size of raw email in bytes
 * - `setReject(reason: string): void` — reject with SMTP error
 * - `forward(rcptTo: string, headers?: Headers): Promise<void>` — forward (only X-* headers allowed)
 * - `reply(message: EmailMessage): Promise<void>` — reply to sender
 */
const EmailWorkerSchema = v.strictObject({
  /**
   * Worker script name. Must match a Worker in the product's api/ layer.
   * Used to resolve the worker for both routing rules and local testing.
   */
  scriptName: v.pipe(v.string(), v.minLength(1)),
  /**
   * Relative path to the worker entry point (from product root).
   * Used by the local test harness to invoke the worker via wrangler.
   * Example: 'api/src/email-worker.ts'
   */
  scriptPath: v.optional(v.pipe(v.string(), v.minLength(1))),
  /** send_email bindings for outbound email from this worker. */
  sendEmailBindings: v.optional(v.array(SendEmailBindingSchema), []),
});

/** Inferred type for email worker config. */
type EmailWorker = v.InferOutput<typeof EmailWorkerSchema>;

// =============================================================================
// SPF / DKIM / DMARC (DNS TXT records — Pulumi only)
// =============================================================================

/**
 * SPF (Sender Policy Framework) configuration.
 *
 * Generates a DNS TXT record at the zone apex:
 * `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all`
 *
 * The `includes` array lets users add multiple SPF include directives
 * (e.g., Google Workspace, Resend, etc.) alongside the required Cloudflare include.
 *
 * **Important**: Only ONE SPF record per domain is allowed (RFC 7208).
 * Multiple SPF records break email routing.
 */
const SpfConfigSchema = v.strictObject({
  /** Whether to generate an SPF TXT record. */
  enabled: v.optional(v.boolean(), true),
  /**
   * SPF include directives.
   * `_spf.mx.cloudflare.net` is always prepended (required for CF Email Routing).
   * Add additional includes for other email providers.
   *
   * @example ['_spf.google.com', 'amazonses.com']
   */
  includes: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), []),
  /**
   * SPF qualifier for the `all` mechanism.
   * - `~all` (softfail): recommended default — marks non-matching as suspicious
   * - `-all` (hardfail): strict — rejects non-matching senders
   * - `?all` (neutral): no assertion
   * - `+all` (pass): allows all — defeats purpose of SPF, never use
   */
  allQualifier: v.optional(
    v.picklist(['~all', '-all', '?all']),
    '~all',
  ),
});

/** Inferred type for SPF config. */
type SpfConfig = v.InferOutput<typeof SpfConfigSchema>;

/**
 * DKIM (DomainKeys Identified Mail) record configuration.
 *
 * Generates a DNS TXT record at `<selector>._domainkey.<domain>`.
 * Cloudflare manages its own DKIM signing for Email Routing.
 * Additional DKIM records may be needed for third-party senders
 * (Google Workspace, Resend, etc.).
 *
 * @example
 * ```typescript
 * const dkim = {
 *   selector: 'google',
 *   publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...',
 * };
 * // Generates: google._domainkey.example.com TXT "v=DKIM1; k=rsa; p=MIIBIjAN..."
 * ```
 */
const DkimRecordSchema = v.strictObject({
  /**
   * DKIM selector. Forms the subdomain: `<selector>._domainkey.<domain>`.
   * Common selectors: 'google' (Google Workspace), 'resend' (Resend),
   * 'cf2024-1' (Cloudflare-managed).
   */
  selector: v.pipe(v.string(), v.minLength(1)),
  /**
   * DKIM public key (base64-encoded, without header/footer).
   * This is the `p=` value in the TXT record.
   */
  publicKey: v.pipe(v.string(), v.minLength(1)),
  /**
   * Key type. Almost always 'rsa'. Ed25519 support is growing but not universal.
   * @default 'rsa'
   */
  keyType: v.optional(v.picklist(['rsa', 'ed25519']), 'rsa'),
});

/** Inferred type for a single DKIM record. */
type DkimRecord = v.InferOutput<typeof DkimRecordSchema>;

/**
 * DMARC (Domain-based Message Authentication, Reporting & Conformance) config.
 *
 * Generates a DNS TXT record at `_dmarc.<domain>`:
 * `v=DMARC1; p=<policy>; rua=mailto:<reportAddress>; ...`
 *
 * @example
 * ```typescript
 * const dmarc = {
 *   policy: 'quarantine',
 *   subdomainPolicy: 'reject',
 *   reportAddress: 'dmarc-reports@example.com',
 *   percentage: 100,
 * };
 * // Generates: _dmarc.example.com TXT "v=DMARC1; p=quarantine; sp=reject; rua=mailto:dmarc-reports@example.com; pct=100"
 * ```
 */
const DmarcConfigSchema = v.strictObject({
  /** Whether to generate a DMARC TXT record. */
  enabled: v.optional(v.boolean(), true),
  /**
   * DMARC policy for the domain. Instructs receiving servers what to do
   * when SPF and DKIM checks fail.
   * - 'none': monitor only (receive reports, take no action)
   * - 'quarantine': mark as spam
   * - 'reject': reject outright
   *
   * Start with 'none', progress to 'quarantine', then 'reject'.
   * @default 'none'
   */
  policy: v.optional(v.picklist(['none', 'quarantine', 'reject']), 'none'),
  /**
   * DMARC policy for subdomains (`sp=` tag).
   * If omitted, inherits from `policy`.
   */
  subdomainPolicy: v.optional(v.picklist(['none', 'quarantine', 'reject'])),
  /**
   * Email address to receive aggregate DMARC reports (`rua=` tag).
   * Cloudflare offers free DMARC report processing via Email Security.
   */
  reportAddress: v.optional(EmailAddressSchema),
  /**
   * Email address to receive forensic/failure DMARC reports (`ruf=` tag).
   * More detailed than aggregate reports, but not all providers send them.
   */
  forensicReportAddress: v.optional(EmailAddressSchema),
  /**
   * Percentage of messages to apply the policy to (`pct=` tag).
   * Range: 0-100. Default is 100 (apply to all messages).
   * Useful for gradual rollout of stricter policies.
   */
  percentage: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100)),
    100,
  ),
  /**
   * DKIM alignment mode (`adkim=` tag).
   * - 'r' (relaxed): domain and subdomain match (default)
   * - 's' (strict): exact domain match only
   */
  dkimAlignment: v.optional(v.picklist(['r', 's']), 'r'),
  /**
   * SPF alignment mode (`aspf=` tag).
   * - 'r' (relaxed): domain and subdomain match (default)
   * - 's' (strict): exact domain match only
   */
  spfAlignment: v.optional(v.picklist(['r', 's']), 'r'),
});

/** Inferred type for DMARC config. */
type DmarcConfig = v.InferOutput<typeof DmarcConfigSchema>;

/**
 * DNS email authentication records (SPF, DKIM, DMARC).
 * These are schema-only — no local simulation. They drive Pulumi DNS TXT
 * record generation in the product's iac/ layer.
 */
const EmailDnsSchema = v.strictObject({
  /** SPF configuration (TXT record at zone apex). */
  spf: v.optional(SpfConfigSchema, {}),
  /** DKIM records (TXT records at <selector>._domainkey.<domain>). */
  dkim: v.optional(v.array(DkimRecordSchema), []),
  /** DMARC configuration (TXT record at _dmarc.<domain>). */
  dmarc: v.optional(DmarcConfigSchema, {}),
});

/** Inferred type for email DNS config. */
type EmailDns = v.InferOutput<typeof EmailDnsSchema>;

// =============================================================================
// Mailpit Local Config
// =============================================================================

/**
 * Mailpit local development server configuration.
 *
 * Mailpit acts as a local SMTP server with a web UI, replacing Cloudflare
 * Email Routing for local development. All routing rules that use `forward`
 * actions deliver to Mailpit instead of real SMTP servers.
 *
 * - SMTP server: receives forwarded email from routing rules
 * - Web UI: browse, search, view captured emails
 * - REST API: programmatic access for integration tests
 *
 * Web UI is served via Caddy at `mail.<localTld>:<port>` (e.g., mail.localhost:3000).
 *
 * @see https://github.com/axllent/mailpit
 */
const MailpitConfigSchema = v.strictObject({
  /**
   * SMTP listen port. This is where the edge tool delivers forwarded emails.
   * Mailpit default is 1025. Must not conflict with other services.
   * @default 1025
   */
  smtpPort: v.optional(PortSchema, 1025),
  /**
   * Web UI listen port (internal — Caddy proxies to this).
   * Mailpit default is 8025. Caddy serves the UI at `mail.<localTld>:<proxyPort>`.
   * @default 8025
   */
  uiPort: v.optional(PortSchema, 8025),
  /**
   * Data directory for Mailpit's persistent storage.
   * Relative to workspace root. Created automatically.
   * @default '.resist/mailpit'
   */
  dataDir: v.optional(v.pipe(v.string(), v.minLength(1)), '.resist/mailpit'),
  /**
   * Maximum number of emails to retain. Older emails are pruned.
   * Mailpit default is 500. Set to 0 for unlimited (not recommended).
   * @default 500
   */
  maxMessages: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 500),
  /**
   * Enable SMTP authentication. When enabled, all SMTP clients must
   * authenticate. Useful for multi-developer environments.
   * Uses Mailpit's "accept any" auth mode (any username/password works).
   * @default false
   */
  smtpAuthAcceptAny: v.optional(v.boolean(), false),
  /**
   * Enable verbose logging for Mailpit. Useful for debugging email delivery.
   * @default false
   */
  verbose: v.optional(v.boolean(), false),
});

/** Inferred type for Mailpit config. */
type MailpitConfig = v.InferOutput<typeof MailpitConfigSchema>;

// =============================================================================
// Root Email Config
// =============================================================================

/**
 * Valibot schema for the complete Email Routing edge configuration.
 *
 * Drives both local Mailpit simulation (via `pnpm tool edge`) and
 * Cloudflare Email Routing IaC generation (via Pulumi).
 *
 * When `enabled` is true:
 * - Local: Mailpit starts as a companion service, routing rules map to
 *   Mailpit inboxes, Email Workers are testable via CLI harness
 * - Pulumi: Generates EmailRoutingSettings, EmailRoutingRule,
 *   EmailRoutingCatchAll, EmailRoutingAddress, and DNS TXT records
 *
 * @example
 * ```typescript
 * // resist.config.ts
 * export default defineConfig({
 *   tooling: {
 *     edge: {
 *       email: {
 *         enabled: true,
 *         rules: [
 *           {
 *             name: 'Support',
 *             matchers: [{ type: 'literal', value: 'support@example.com' }],
 *             actions: [{ type: 'forward', values: ['team@company.com'] }],
 *           },
 *         ],
 *         catchAll: {
 *           enabled: true,
 *           action: { type: 'drop' },
 *         },
 *         destinationAddresses: [
 *           { email: 'team@company.com' },
 *         ],
 *         dns: {
 *           spf: { includes: ['_spf.google.com'] },
 *           dmarc: { policy: 'quarantine' },
 *         },
 *       },
 *     },
 *   },
 * });
 * ```
 */
export const EmailConfigSchema = v.strictObject({
  /** Enable email routing simulation. When false, Mailpit is not started. */
  enabled: v.optional(v.boolean(), false),

  /**
   * Email routing rules. Evaluated in priority order (lower = first).
   * Each rule pairs matchers (which addresses to match) with actions
   * (what to do with the email).
   *
   * Maps to Pulumi `cloudflare.EmailRoutingRule` resources.
   * Locally, `forward` actions deliver to Mailpit SMTP.
   */
  rules: v.optional(v.array(RoutingRuleSchema), []),

  /**
   * Catch-all rule for addresses not matched by any routing rule.
   * Applied last, after all explicit rules are evaluated.
   *
   * Maps to Pulumi `cloudflare.EmailRoutingCatchAll` resource.
   * Locally, catch-all forwards go to Mailpit's default inbox.
   */
  catchAll: v.optional(CatchAllSchema, {}),

  /**
   * Destination addresses that routing rules can forward to.
   * In production, these must be verified via a confirmation email.
   * Locally (Mailpit), all addresses are treated as verified.
   *
   * Maps to Pulumi `cloudflare.EmailRoutingAddress` resources.
   */
  destinationAddresses: v.optional(v.array(DestinationAddressSchema), []),

  /**
   * Email Workers that process inbound email via custom logic.
   * Each worker can be referenced by name in routing rule actions.
   *
   * Workers are tested locally via:
   * 1. wrangler's `POST /cdn-cgi/handler/email` endpoint
   * 2. The `pnpm tool edge --send-email` CLI harness
   */
  workers: v.optional(v.array(EmailWorkerSchema), []),

  /**
   * DNS email authentication records (SPF, DKIM, DMARC).
   * Schema-only — no local simulation. Drives Pulumi DNS TXT record generation.
   */
  dns: v.optional(EmailDnsSchema, {}),

  /**
   * Mailpit local development server configuration.
   * Only used by `pnpm tool edge` — ignored by Pulumi.
   */
  mailpit: v.optional(MailpitConfigSchema, {}),
});

/** Inferred output type of {@link EmailConfigSchema}. */
export type EmailConfig = v.InferOutput<typeof EmailConfigSchema>;
```

### 1.3 Exported items

Only two exports from this file:
- `EmailConfigSchema` (the root schema)
- `EmailConfig` (the inferred type)

All sub-schemas (`RoutingRuleSchema`, `CatchAllSchema`, etc.) are module-private. If other files need them (e.g., Pulumi mapper), they import the inferred types via `EmailConfig['rules'][number]` etc.

---

## 2. Service Lifecycle: Mailpit

### 2.1 Service registration

File: `packages/shared/utils/cli/src/tools/edge/utils/services.ts`

Mailpit is registered as a companion service alongside Caddy. The service registry pattern (established in 00-foundation.md) manages start, stop, and health check for each companion.

```typescript
/**
 * Mailpit service definition.
 *
 * Starts a Mailpit process as a companion to Caddy when email routing is
 * enabled. Manages SMTP + Web UI, forwards to configured data directory.
 *
 * @param config - Merged email config (from EdgeConfig.email).
 * @param localTld - Local TLD from devProxy config (e.g., 'localhost').
 * @returns Service definition for the service registry.
 */
function createMailpitService(
  config: EmailConfig,
  localTld: v.InferOutput<typeof v.string()>,
): Result<ServiceDefinition> {
  if (!config.enabled) {
    return okUnchecked(undefined);
  }

  const mailpitConfig: MailpitConfig = config.mailpit;

  // Build command-line arguments
  const args: v.InferOutput<typeof v.array(v.string())> = [
    '--smtp', `0.0.0.0:${String(mailpitConfig.smtpPort)}`,
    '--listen', `127.0.0.1:${String(mailpitConfig.uiPort)}`,
    '--database', `${mailpitConfig.dataDir}/mailpit.db`,
    '--max', String(mailpitConfig.maxMessages),
  ];

  if (mailpitConfig.smtpAuthAcceptAny) {
    args.push('--smtp-auth-accept-any');
  }

  if (mailpitConfig.verbose) {
    args.push('--verbose');
  }

  return okUnchecked({
    name: 'mailpit' as v.InferOutput<typeof v.string()>,
    command: 'mailpit' as v.InferOutput<typeof v.string()>,
    args,
    healthCheck: {
      /** HTTP health check against Mailpit's web UI. */
      url: `http://127.0.0.1:${String(mailpitConfig.uiPort)}/api/v1/info`,
      method: 'GET' as v.InferOutput<typeof v.string()>,
      expectedStatus: 200,
      intervalMs: 1000,
      timeoutMs: 5000,
      retries: 5,
    },
    /** Mailpit handles SIGTERM gracefully. */
    stopSignal: 'SIGTERM' as v.InferOutput<typeof v.string()>,
  } satisfies ServiceDefinition);
}
```

### 2.2 Service start (in edge tool main)

```typescript
// packages/shared/utils/cli/src/tools/edge/index.ts — inside startEdge()

if (edgeConfig.email.enabled) {
  const mailpitServiceResult: Result<ServiceDefinition> = createMailpitService(
    edgeConfig.email,
    devProxyConfig.localTld,
  );
  if (!mailpitServiceResult.ok) return mailpitServiceResult;

  const startResult: Result<Void> = serviceRegistry.start(mailpitServiceResult.data);
  if (!startResult.ok) return startResult;
}
```

### 2.3 Health check endpoint

Mailpit exposes `GET /api/v1/info` which returns:
```json
{
  "Version": "1.23.1",
  "Database": "/path/to/mailpit.db",
  "DatabaseSize": 12345,
  "Messages": 42,
  "Unread": 5,
  ...
}
```

The service registry polls this endpoint during startup to confirm Mailpit is ready before Caddy starts accepting connections.

### 2.4 Version management

Mailpit version is pinned in `packages/shared/schemas/core-config/src/versions.ts` (added in 00-foundation.md):

```typescript
/** Mailpit — local email routing simulation */
mailpit: v.optional(PinnedVersionSchema, '1.23.1'),
```

The edge tool checks that the installed Mailpit version matches the pinned version:

```typescript
/**
 * Validates that the installed Mailpit binary matches the pinned version.
 *
 * @param expectedVersion - The version string from SystemToolVersionsSchema.
 * @returns Ok if version matches, Err with mismatch details.
 */
function validateMailpitVersion(
  expectedVersion: v.InferOutput<typeof v.string()>,
): Result<Void> {
  // Run: mailpit version
  // Parse output, compare to expectedVersion
  // Return ok or err
}
```

---

## 3. Caddy Virtual Host: Mailpit Web UI

### 3.1 Caddyfile directive

When email routing is enabled, `generateCaddyfile()` adds a virtual host for the Mailpit web UI:

```
# Mailpit Web UI
mail.{localTld}:{proxyPort} {
    tls {certFile} {keyFile}

    reverse_proxy 127.0.0.1:{mailpitUiPort}

    # Optional: basic logging
    log {
        output file .resist/logs/mailpit-access.ndjson
        format json
    }
}
```

### 3.2 Caddyfile generation function

File: `packages/shared/utils/cli/src/tools/edge/utils/caddy.ts`

```typescript
/**
 * Generates the Caddyfile site block for the Mailpit web UI.
 *
 * Creates a reverse proxy at `mail.<localTld>:<proxyPort>` pointing to
 * Mailpit's internal web UI port.
 *
 * @param emailConfig - Email routing config.
 * @param proxyPort - The Caddy HTTPS listen port (from devProxy config).
 * @param localTld - Local TLD (from devProxy config, e.g., 'localhost').
 * @param certFile - Path to the TLS certificate file.
 * @param keyFile - Path to the TLS private key file.
 * @returns Caddyfile site block string, or empty string if email is disabled.
 */
function generateMailpitCaddyBlock(
  emailConfig: EmailConfig,
  proxyPort: v.InferOutput<typeof PortSchema>,
  localTld: v.InferOutput<typeof v.string()>,
  certFile: v.InferOutput<typeof v.string()>,
  keyFile: v.InferOutput<typeof v.string()>,
): Result<v.InferOutput<typeof v.string()>> {
  if (!emailConfig.enabled) {
    return okUnchecked('' as v.InferOutput<typeof v.string()>);
  }

  const uiPort: v.InferOutput<typeof v.number()> = emailConfig.mailpit.uiPort;

  const block: v.InferOutput<typeof v.string()> = `
mail.${localTld}:${String(proxyPort)} {
    tls ${certFile} ${keyFile}
    reverse_proxy 127.0.0.1:${String(uiPort)}
    log {
        output file .resist/logs/mailpit-access.ndjson
        format json
    }
}
` as v.InferOutput<typeof v.string()>;

  return okUnchecked(block);
}
```

### 3.3 DNS / hosts entry

The edge tool's hosts file generator (from 10-dns.md) must include:

```
127.0.0.1  mail.localhost
```

This is added automatically when `email.enabled` is true.

### 3.4 mkcert SAN

The TLS certificate generated by mkcert must include `mail.<localTld>` as a Subject Alternative Name:

```typescript
// In the mkcert certificate generation logic
if (edgeConfig.email.enabled) {
  sans.push(`mail.${localTld}` as v.InferOutput<typeof v.string()>);
}
```

---

## 4. Email Worker Test Harness

### 4.1 Overview

Cloudflare Workers with `email()` handlers can be tested locally via wrangler's built-in endpoint:

```
POST http://localhost:<wranglerPort>/cdn-cgi/handler/email
```

with query params `from` and `to`, and the raw email content (RFC 5322) as the request body.

Wrangler simulates:
- `message.forward(rcptTo)` -- logs to console: `"Email handler forwarded message with rcptTo: <address>"`
- `message.reply(replyMessage)` -- writes reply to `.eml` file, logs path
- `message.setReject(reason)` -- logs rejection reason
- `env.<BINDING>.send(message)` -- writes outbound email to `.eml` file, logs path

The edge tool wraps this with a higher-level CLI command.

### 4.2 CLI command: `--send-email`

```
pnpm tool edge --send-email <from> <to> [--subject <text>] [--body <text>] [--raw <path>] [--worker <name>]
```

**Arguments**:
- `<from>` — Sender email address
- `<to>` — Recipient email address (must match a routing rule)
- `--subject` — Email subject line (default: "Test email")
- `--body` — Plain text body (default: "This is a test email from the edge tool.")
- `--raw` — Path to a raw RFC 5322 email file (overrides `--subject` and `--body`)
- `--worker` — Worker script name to invoke directly (bypasses routing rules)

**Behavior**:
1. If `--worker` is specified, send directly to that worker's wrangler instance
2. If no `--worker`, look up which routing rule matches `<to>` address
3. If the matching rule's action is `forward`, deliver to Mailpit's SMTP port
4. If the matching rule's action is `worker`, invoke the worker via wrangler's endpoint
5. If the matching rule's action is `drop`, log that the email would be dropped
6. If no rule matches and catch-all is enabled, apply catch-all action
7. If no rule matches and catch-all is disabled, log an error

### 4.3 Flag definitions

File: `packages/shared/utils/cli/src/tools/edge/flags/index.ts`

```typescript
/** Send a test email through the email routing pipeline. */
{
  name: 'send-email',
  type: 'string',
  description: 'Send a test email: --send-email <from> <to>',
  required: false,
},
{
  name: 'subject',
  type: 'string',
  description: 'Subject line for --send-email (default: "Test email")',
  required: false,
},
{
  name: 'body',
  type: 'string',
  description: 'Plain text body for --send-email',
  required: false,
},
{
  name: 'raw',
  type: 'string',
  description: 'Path to raw RFC 5322 email file for --send-email',
  required: false,
},
{
  name: 'worker',
  type: 'string',
  description: 'Email Worker name to invoke directly (bypasses routing rules)',
  required: false,
},
```

### 4.4 Implementation

File: `packages/shared/utils/cli/src/tools/edge/utils/email-harness.ts`

```typescript
/**
 * Email Worker Test Harness
 *
 * Sends test emails through the local email routing pipeline.
 * Routes to Mailpit SMTP (forward actions) or wrangler (worker actions).
 *
 * @module
 */

import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/utils/result/types';

/**
 * Constructs a minimal RFC 5322 email message from parts.
 *
 * @param from - Sender email address.
 * @param to - Recipient email address.
 * @param subject - Email subject line.
 * @param body - Plain text body.
 * @returns Raw email string in RFC 5322 format.
 */
function buildRawEmail(
  from: v.InferOutput<typeof v.string()>,
  to: v.InferOutput<typeof v.string()>,
  subject: v.InferOutput<typeof v.string()>,
  body: v.InferOutput<typeof v.string()>,
): Result<v.InferOutput<typeof v.string()>> {
  const date: v.InferOutput<typeof v.string()> = new Date().toUTCString() as v.InferOutput<typeof v.string()>;
  const messageId: v.InferOutput<typeof v.string()> =
    `<${Date.now()}@edge-test.local>` as v.InferOutput<typeof v.string()>;

  const raw: v.InferOutput<typeof v.string()> = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    `Message-ID: ${messageId}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
  ].join('\r\n') as v.InferOutput<typeof v.string()>;

  return okUnchecked(raw);
}

/**
 * Resolves a recipient address to its routing action.
 *
 * Evaluates routing rules in priority order, then falls back to catch-all.
 *
 * @param to - Recipient email address.
 * @param emailConfig - Email routing config.
 * @returns The matching routing action, or Err if no rule matches and no catch-all.
 */
function resolveRoutingAction(
  to: v.InferOutput<typeof v.string()>,
  emailConfig: EmailConfig,
): Result<v.InferOutput<typeof RoutingRuleActionSchema>> {
  // Sort rules by priority (ascending — lower = higher priority)
  const sortedRules = [...emailConfig.rules].sort(
    (a, b) => a.priority - b.priority,
  );

  for (const rule of sortedRules) {
    if (!rule.enabled) continue;
    for (const matcher of rule.matchers) {
      if (matcher.type === 'literal' && matcher.value === to) {
        // First matching action wins
        return okUnchecked(rule.actions[0]);
      }
      // 'all' matcher type in a regular rule matches everything
      if (matcher.type === 'all') {
        return okUnchecked(rule.actions[0]);
      }
    }
  }

  // No rule matched — try catch-all
  if (emailConfig.catchAll.enabled) {
    return okUnchecked(emailConfig.catchAll.action);
  }

  return err({
    code: 'EMAIL_NO_ROUTE',
    message: `No routing rule matches '${to}' and catch-all is disabled`,
  });
}

/**
 * Sends a test email to a wrangler Email Worker via its local endpoint.
 *
 * Uses wrangler's `POST /cdn-cgi/handler/email` endpoint to deliver
 * the raw email to the worker's `email()` handler.
 *
 * @param workerPort - The wrangler dev server port for the worker.
 * @param from - Sender email address (query param).
 * @param to - Recipient email address (query param).
 * @param rawEmail - Raw RFC 5322 email content (request body).
 * @returns Ok on successful delivery, Err on failure.
 */
async function sendToWorker(
  workerPort: v.InferOutput<typeof PortSchema>,
  from: v.InferOutput<typeof v.string()>,
  to: v.InferOutput<typeof v.string()>,
  rawEmail: v.InferOutput<typeof v.string()>,
): Promise<Result<Void>> {
  const url: v.InferOutput<typeof v.string()> =
    `http://127.0.0.1:${String(workerPort)}/cdn-cgi/handler/email?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` as v.InferOutput<typeof v.string()>;

  // POST raw email body to wrangler endpoint
  // Parse response, check for errors
  // Return ok or err
}

/**
 * Sends a test email to Mailpit's SMTP server (for forward actions).
 *
 * Constructs a minimal SMTP transaction via TCP to deliver the email.
 * Alternatively, shells out to a sendmail-compatible command.
 *
 * @param smtpPort - Mailpit SMTP port.
 * @param from - Sender email address (MAIL FROM).
 * @param to - Recipient email address (RCPT TO).
 * @param rawEmail - Raw RFC 5322 email content (DATA).
 * @returns Ok on successful delivery, Err on SMTP failure.
 */
async function sendToMailpit(
  smtpPort: v.InferOutput<typeof PortSchema>,
  from: v.InferOutput<typeof v.string()>,
  to: v.InferOutput<typeof v.string()>,
  rawEmail: v.InferOutput<typeof v.string()>,
): Promise<Result<Void>> {
  // Option A: Use Node.js net module for raw SMTP
  // EHLO edge-test.local
  // MAIL FROM:<from>
  // RCPT TO:<to>
  // DATA
  // <rawEmail>
  // .
  // QUIT
  //
  // Option B: Shell out to `curl --url smtp://127.0.0.1:<port> ...`
  //
  // Return ok or err based on SMTP response codes
}

/**
 * Main entry point for the email test harness.
 *
 * Orchestrates: parse flags → build raw email → resolve route → deliver.
 *
 * @param flags - Parsed CLI flags.
 * @param emailConfig - Email routing config from EdgeConfig.
 * @returns Ok on successful delivery, Err on any failure.
 */
export async function handleSendEmail(
  flags: ParsedFlags,
  emailConfig: EmailConfig,
): Promise<Result<Void>> {
  // 1. Parse from/to from flags.sendEmail (space-separated)
  // 2. If flags.raw, read raw email from file
  //    Else, buildRawEmail(from, to, flags.subject, flags.body)
  // 3. If flags.worker, send directly to that worker
  //    Else, resolveRoutingAction(to, emailConfig)
  // 4. Dispatch based on action type:
  //    - 'forward' → sendToMailpit()
  //    - 'worker' → sendToWorker()
  //    - 'drop' → log "Email would be dropped" and return ok
  // 5. Log result (success/failure, action taken, destination)
}
```

### 4.5 Subaddressing support

The routing resolution must handle RFC 5233 subaddressing (plus addressing):
- If `user+tag@domain` has an explicit rule, use that rule
- Otherwise, strip `+tag` and try `user@domain`
- This matches Cloudflare's production behavior

```typescript
/**
 * Normalizes an email address by stripping subaddress tags.
 * 'user+tag@domain' → 'user@domain'
 *
 * @param address - Email address, possibly with subaddress tag.
 * @returns Normalized address without subaddress tag.
 */
function stripSubaddress(
  address: v.InferOutput<typeof v.string()>,
): Result<v.InferOutput<typeof v.string()>> {
  const atIdx: v.InferOutput<typeof v.number()> = address.lastIndexOf('@') as v.InferOutput<typeof v.number()>;
  if (atIdx === -1) {
    return err({ code: 'EMAIL_INVALID', message: `Invalid email address: ${address}` });
  }
  const local: v.InferOutput<typeof v.string()> = address.slice(0, atIdx) as v.InferOutput<typeof v.string()>;
  const domain: v.InferOutput<typeof v.string()> = address.slice(atIdx) as v.InferOutput<typeof v.string()>;
  const plusIdx: v.InferOutput<typeof v.number()> = local.indexOf('+') as v.InferOutput<typeof v.number()>;
  if (plusIdx === -1) {
    return okUnchecked(address);
  }
  return okUnchecked(`${local.slice(0, plusIdx)}${domain}` as v.InferOutput<typeof v.string()>);
}
```

---

## 5. SPF/DKIM/DMARC DNS Record Generation

### 5.1 SPF record builder

File: `packages/shared/utils/cli/src/tools/edge/utils/email-dns.ts`

```typescript
/**
 * Builds the SPF TXT record value from config.
 *
 * Always includes `include:_spf.mx.cloudflare.net` (required for CF Email Routing).
 * User-configured includes are appended. Only one SPF record per domain is allowed.
 *
 * @param spfConfig - SPF configuration from EmailConfig.dns.spf.
 * @returns SPF TXT record value string.
 *
 * @example
 * buildSpfRecord({ enabled: true, includes: ['_spf.google.com'], allQualifier: '~all' })
 * // → 'v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all'
 */
function buildSpfRecord(
  spfConfig: SpfConfig,
): Result<v.InferOutput<typeof v.string()>> {
  if (!spfConfig.enabled) {
    return okUnchecked('' as v.InferOutput<typeof v.string()>);
  }

  const parts: v.InferOutput<typeof v.array(v.string())> = ['v=spf1'];

  // Always include Cloudflare's SPF
  parts.push('include:_spf.mx.cloudflare.net');

  // Add user-configured includes
  for (const include of spfConfig.includes) {
    parts.push(`include:${include}`);
  }

  // Qualifier
  parts.push(spfConfig.allQualifier);

  return okUnchecked(parts.join(' ') as v.InferOutput<typeof v.string()>);
}
```

### 5.2 DKIM record builder

```typescript
/**
 * Builds DKIM TXT record entries from config.
 *
 * Each entry produces a TXT record at `<selector>._domainkey.<domain>`.
 *
 * @param dkimRecords - Array of DKIM record configs.
 * @param domain - Zone domain (e.g., 'example.com').
 * @returns Array of { name, value } pairs for DNS TXT records.
 *
 * @example
 * buildDkimRecords([{ selector: 'google', publicKey: 'MIIB...', keyType: 'rsa' }], 'example.com')
 * // → [{ name: 'google._domainkey.example.com', value: 'v=DKIM1; k=rsa; p=MIIB...' }]
 */
function buildDkimRecords(
  dkimRecords: v.InferOutput<typeof v.array(typeof DkimRecordSchema)>,
  domain: v.InferOutput<typeof v.string()>,
): Result<v.InferOutput<typeof v.array(v.strictObject({ name: typeof v.string(), value: typeof v.string() }))>> {
  const results = [];

  for (const record of dkimRecords) {
    const name: v.InferOutput<typeof v.string()> =
      `${record.selector}._domainkey.${domain}` as v.InferOutput<typeof v.string()>;
    const value: v.InferOutput<typeof v.string()> =
      `v=DKIM1; k=${record.keyType}; p=${record.publicKey}` as v.InferOutput<typeof v.string()>;
    results.push({ name, value });
  }

  return okUnchecked(results);
}
```

### 5.3 DMARC record builder

```typescript
/**
 * Builds the DMARC TXT record value from config.
 *
 * Record is placed at `_dmarc.<domain>`.
 *
 * @param dmarcConfig - DMARC configuration.
 * @returns DMARC TXT record value string.
 *
 * @example
 * buildDmarcRecord({
 *   enabled: true, policy: 'quarantine', reportAddress: 'dmarc@example.com',
 *   percentage: 100, dkimAlignment: 'r', spfAlignment: 'r',
 * })
 * // → 'v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com; pct=100; adkim=r; aspf=r'
 */
function buildDmarcRecord(
  dmarcConfig: DmarcConfig,
): Result<v.InferOutput<typeof v.string()>> {
  if (!dmarcConfig.enabled) {
    return okUnchecked('' as v.InferOutput<typeof v.string()>);
  }

  const parts: v.InferOutput<typeof v.array(v.string())> = [
    'v=DMARC1',
    `p=${dmarcConfig.policy}`,
  ];

  if (dmarcConfig.subdomainPolicy !== undefined) {
    parts.push(`sp=${dmarcConfig.subdomainPolicy}`);
  }

  if (dmarcConfig.reportAddress !== undefined) {
    parts.push(`rua=mailto:${dmarcConfig.reportAddress}`);
  }

  if (dmarcConfig.forensicReportAddress !== undefined) {
    parts.push(`ruf=mailto:${dmarcConfig.forensicReportAddress}`);
  }

  parts.push(`pct=${String(dmarcConfig.percentage)}`);
  parts.push(`adkim=${dmarcConfig.dkimAlignment}`);
  parts.push(`aspf=${dmarcConfig.spfAlignment}`);

  return okUnchecked(parts.join('; ') as v.InferOutput<typeof v.string()>);
}
```

---

## 6. Pulumi Mapping

### 6.1 Resources generated from `EmailConfig`

File: `packages/products/[product]/iac/src/email.ts` (product IaC layer)

| Config field | Pulumi resource | Notes |
|-------------|----------------|-------|
| `email.enabled` | `cloudflare.EmailRoutingSettings` | Activates routing for the zone |
| `email.destinationAddresses[]` | `cloudflare.EmailRoutingAddress` | Account-scoped, one per entry |
| `email.rules[]` | `cloudflare.EmailRoutingRule` | One per routing rule |
| `email.catchAll` | `cloudflare.EmailRoutingCatchAll` | Single resource per zone |
| `email.dns.spf` | `cloudflare.Record` (TXT) | At zone apex |
| `email.dns.dkim[]` | `cloudflare.Record` (TXT) | At `<selector>._domainkey.<domain>` |
| `email.dns.dmarc` | `cloudflare.Record` (TXT) | At `_dmarc.<domain>` |

### 6.2 Pulumi TypeScript generation

```typescript
/**
 * Generates Pulumi resources for Cloudflare Email Routing.
 *
 * Reads the merged EmailConfig and creates:
 * - EmailRoutingSettings (zone activation)
 * - EmailRoutingAddress (destination addresses)
 * - EmailRoutingRule (per routing rule)
 * - EmailRoutingCatchAll (catch-all rule)
 * - DNS TXT records (SPF, DKIM, DMARC)
 *
 * @param emailConfig - Merged email config from EdgeConfig.
 * @param zoneId - Cloudflare zone ID (from Pulumi config or product config).
 * @param accountId - Cloudflare account ID.
 * @param domain - Zone domain (e.g., 'example.com').
 * @returns Ok with array of Pulumi resource references, Err on failure.
 */
function generateEmailPulumiResources(
  emailConfig: EmailConfig,
  zoneId: v.InferOutput<typeof v.string()>,
  accountId: v.InferOutput<typeof v.string()>,
  domain: v.InferOutput<typeof v.string()>,
): Result<PulumiResourceArray> {
  if (!emailConfig.enabled) {
    return okUnchecked([] as PulumiResourceArray);
  }

  const resources: PulumiResourceArray = [];

  // 1. Email Routing Settings (enable routing for zone)
  // new cloudflare.EmailRoutingSettings("email-routing", { zoneId });

  // 2. Destination Addresses
  // for (const dest of emailConfig.destinationAddresses) {
  //   new cloudflare.EmailRoutingAddress(`dest-${sanitize(dest.email)}`, {
  //     accountId,
  //     email: dest.email,
  //   });
  // }

  // 3. Routing Rules
  // for (const [i, rule] of emailConfig.rules.entries()) {
  //   new cloudflare.EmailRoutingRule(`rule-${i}-${rule.name || 'unnamed'}`, {
  //     zoneId,
  //     name: rule.name,
  //     enabled: rule.enabled,
  //     priority: rule.priority,
  //     matchers: rule.matchers.map(m => ({
  //       type: m.type,
  //       field: m.type === 'literal' ? m.field : undefined,
  //       value: m.type === 'literal' ? m.value : undefined,
  //     })),
  //     actions: rule.actions.map(a => ({
  //       type: a.type,
  //       values: a.type !== 'drop' ? a.values : undefined,
  //     })),
  //   });
  // }

  // 4. Catch-All Rule
  // if (emailConfig.catchAll.enabled) {
  //   new cloudflare.EmailRoutingCatchAll("catch-all", {
  //     zoneId,
  //     name: emailConfig.catchAll.name,
  //     enabled: emailConfig.catchAll.enabled,
  //     matchers: [{ type: "all" }],
  //     actions: [{
  //       type: emailConfig.catchAll.action.type,
  //       values: emailConfig.catchAll.action.type !== 'drop'
  //         ? emailConfig.catchAll.action.values
  //         : undefined,
  //     }],
  //   });
  // }

  // 5. SPF TXT Record
  // const spfResult = buildSpfRecord(emailConfig.dns.spf);
  // if (!spfResult.ok) return spfResult;
  // if (spfResult.data) {
  //   new cloudflare.Record("spf", {
  //     zoneId,
  //     name: domain,
  //     type: "TXT",
  //     content: spfResult.data,
  //   });
  // }

  // 6. DKIM TXT Records
  // const dkimResult = buildDkimRecords(emailConfig.dns.dkim, domain);
  // if (!dkimResult.ok) return dkimResult;
  // for (const record of dkimResult.data) {
  //   new cloudflare.Record(`dkim-${record.name}`, {
  //     zoneId,
  //     name: record.name,
  //     type: "TXT",
  //     content: record.value,
  //   });
  // }

  // 7. DMARC TXT Record
  // const dmarcResult = buildDmarcRecord(emailConfig.dns.dmarc);
  // if (!dmarcResult.ok) return dmarcResult;
  // if (dmarcResult.data) {
  //   new cloudflare.Record("dmarc", {
  //     zoneId,
  //     name: `_dmarc.${domain}`,
  //     type: "TXT",
  //     content: dmarcResult.data,
  //   });
  // }

  return okUnchecked(resources);
}
```

### 6.3 MX records

When Cloudflare Email Routing is enabled, Cloudflare automatically creates MX records pointing to its mail servers. The standard MX records are:

```
example.com.  MX  5  isaac.mx.cloudflare.net.
example.com.  MX  28 linda.mx.cloudflare.net.
example.com.  MX  6  amir.mx.cloudflare.net.
```

These are managed by the `EmailRoutingSettings` resource — creating it triggers Cloudflare to add the MX records automatically. The Pulumi code does NOT need to create MX records manually.

However, the DKIM record that Cloudflare automatically creates follows the format: `cf2024-1._domainkey.<domain>` — this is also managed internally and does not need explicit Pulumi resources.

---

## 7. Integration with Edge Tool Lifecycle

### 7.1 Startup sequence

When `pnpm tool edge` runs with `email.enabled: true`:

```
1. Parse config (safeParse EmailConfigSchema)
2. Ensure .resist/mailpit/ directory exists
3. Validate Mailpit binary version
4. Start Mailpit service (SMTP + Web UI)
5. Wait for Mailpit health check (GET /api/v1/info)
6. Add mail.<localTld> to Caddy SAN list
7. Generate Caddyfile with Mailpit reverse proxy block
8. Start Caddy (serves Mailpit UI at https://mail.localhost:<port>)
9. Print startup summary:
   - Mailpit Web UI: https://mail.<localTld>:<proxyPort>
   - Mailpit SMTP: localhost:<smtpPort>
   - Email routing: N rules configured
   - Catch-all: enabled/disabled
```

### 7.2 Shutdown sequence

```
1. Stop Caddy (SIGTERM — graceful)
2. Stop Mailpit (SIGTERM — graceful)
3. (Mailpit data persists in .resist/mailpit/ for next run)
```

### 7.3 Hot reload

When `resist.config.ts` changes and `email` config is modified:

```
1. Re-parse email config
2. Regenerate Caddyfile (Mailpit block may have changed ports)
3. Reload Caddy (graceful config reload via admin API)
4. If Mailpit ports changed:
   a. Stop Mailpit
   b. Restart with new port args
   c. Wait for health check
```

### 7.4 Console output on email send

When `--send-email` is used, the tool prints:

```
[email] Sending test email...
  From: sender@example.com
  To:   support@example.com
  Subject: Test email

[email] Route matched: "Support inbox" (priority: 10)
[email] Action: forward → team@company.com
[email] Delivered to Mailpit SMTP (localhost:1025)
[email] View at: https://mail.localhost:3000
```

For worker actions:

```
[email] Route matched: "Auto-reply" (priority: 20)
[email] Action: worker → my-email-worker
[email] Sent to wrangler (localhost:8787/cdn-cgi/handler/email)
[email] Worker output:
  Email handler forwarded message with rcptTo: archive@company.com
```

---

## 8. Wrangler Configuration for Email Workers

### 8.1 wrangler.toml additions

When a product has Email Workers configured, the edge tool validates that the product's `wrangler.toml` includes the correct bindings:

```toml
# Inbound email handler
# (no wrangler.toml config needed — the email() export is detected automatically)

# Outbound email via send_email binding
[[send_email]]
name = "EMAIL"

# Locked to single destination
[[send_email]]
name = "SUPPORT_EMAIL"
destination_address = "support@company.com"

# Allowlisted destinations
[[send_email]]
name = "TEAM_EMAIL"
allowed_destination_addresses = ["team1@company.com", "team2@company.com"]
```

### 8.2 Validation

```typescript
/**
 * Validates that Email Worker send_email bindings in config match
 * what's declared in the product's wrangler.toml.
 *
 * Emits warnings for:
 * - Bindings in config but not in wrangler.toml
 * - Bindings in wrangler.toml but not in config
 *
 * @param emailWorkers - Email worker configs from EdgeConfig.
 * @param wranglerConfig - Parsed wrangler.toml content.
 * @returns Ok with array of warnings (empty if all match), Err on parse failure.
 */
function validateSendEmailBindings(
  emailWorkers: v.InferOutput<typeof v.array(typeof EmailWorkerSchema)>,
  wranglerConfig: WranglerConfig,
): Result<v.InferOutput<typeof v.array(v.string())>> {
  // Compare emailWorkers[].sendEmailBindings against wranglerConfig.send_email[]
  // Return warnings for mismatches
}
```

---

## 9. Verification Steps

### 9.1 Schema validation

```typescript
// Test: Empty config uses all defaults
const r1 = safeParse(EmailConfigSchema, {});
assert(r1.ok);
assert(r1.data.enabled === false);
assert(r1.data.rules.length === 0);
assert(r1.data.catchAll.enabled === false);
assert(r1.data.catchAll.action.type === 'drop');
assert(r1.data.mailpit.smtpPort === 1025);
assert(r1.data.mailpit.uiPort === 8025);

// Test: Full config with all features
const r2 = safeParse(EmailConfigSchema, {
  enabled: true,
  rules: [
    {
      name: 'Support',
      priority: 10,
      matchers: [{ type: 'literal', field: 'to', value: 'support@example.com' }],
      actions: [{ type: 'forward', values: ['team@company.com'] }],
    },
    {
      name: 'Auto-reply worker',
      priority: 20,
      matchers: [{ type: 'literal', value: 'info@example.com' }],
      actions: [{ type: 'worker', values: ['auto-reply-worker'] }],
    },
    {
      name: 'Spam trap',
      priority: 100,
      matchers: [{ type: 'literal', value: 'noreply@example.com' }],
      actions: [{ type: 'drop' }],
    },
  ],
  catchAll: {
    enabled: true,
    name: 'Default catch-all',
    action: { type: 'forward', values: ['catchall@company.com'] },
  },
  destinationAddresses: [
    { email: 'team@company.com' },
    { email: 'catchall@company.com' },
  ],
  workers: [
    {
      scriptName: 'auto-reply-worker',
      scriptPath: 'api/src/email/auto-reply.ts',
      sendEmailBindings: [
        { name: 'EMAIL' },
        { name: 'SUPPORT', destinationAddress: 'support@company.com' },
      ],
    },
  ],
  dns: {
    spf: {
      enabled: true,
      includes: ['_spf.google.com'],
      allQualifier: '~all',
    },
    dkim: [
      { selector: 'google', publicKey: 'MIIBIjANBgkqhkiG9w0BAQE...', keyType: 'rsa' },
    ],
    dmarc: {
      enabled: true,
      policy: 'quarantine',
      subdomainPolicy: 'reject',
      reportAddress: 'dmarc@example.com',
      percentage: 100,
      dkimAlignment: 'r',
      spfAlignment: 'r',
    },
  },
  mailpit: {
    smtpPort: 1025,
    uiPort: 8025,
    dataDir: '.resist/mailpit',
    maxMessages: 1000,
    smtpAuthAcceptAny: false,
    verbose: false,
  },
});
assert(r2.ok);
assert(r2.data.rules.length === 3);
assert(r2.data.workers[0].sendEmailBindings.length === 2);

// Test: Invalid config fails validation
const r3 = safeParse(EmailConfigSchema, {
  enabled: true,
  rules: [
    {
      matchers: [], // minLength(1) violation
      actions: [{ type: 'forward', values: ['a@b.com'] }],
    },
  ],
});
assert(!r3.ok);

// Test: SPF record generation
const spf = buildSpfRecord({
  enabled: true,
  includes: ['_spf.google.com', 'amazonses.com'],
  allQualifier: '-all',
});
assert(spf.ok);
assert(spf.data === 'v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com include:amazonses.com -all');

// Test: DMARC record generation
const dmarc = buildDmarcRecord({
  enabled: true,
  policy: 'quarantine',
  reportAddress: 'dmarc@example.com',
  percentage: 50,
  dkimAlignment: 'r',
  spfAlignment: 's',
});
assert(dmarc.ok);
assert(dmarc.data === 'v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com; pct=50; adkim=r; aspf=s');

// Test: Subaddressing
const stripped = stripSubaddress('user+tag@example.com');
assert(stripped.ok);
assert(stripped.data === 'user@example.com');

// Test: Routing resolution with priority
const action = resolveRoutingAction('support@example.com', r2.data);
assert(action.ok);
assert(action.data.type === 'forward');
```

### 9.2 Mailpit service

```bash
# Start edge tool with email enabled
pnpm tool edge

# Verify Mailpit is running
curl -s http://127.0.0.1:8025/api/v1/info | jq .Version
# → "1.23.1"

# Verify Caddy proxies Mailpit UI
curl -sk https://mail.localhost:3000/ | head -1
# → <!DOCTYPE html>

# Send test email via SMTP
pnpm tool edge --send-email sender@example.com support@example.com --subject "Test" --body "Hello"
# → [email] Delivered to Mailpit SMTP (localhost:1025)

# Verify email appears in Mailpit
curl -s http://127.0.0.1:8025/api/v1/messages | jq '.messages[0].Subject'
# → "Test"
```

### 9.3 Email Worker test

```bash
# Start wrangler for the email worker
cd packages/products/myapp/api && npx wrangler dev &

# Send test email to worker via CLI
pnpm tool edge --send-email sender@example.com info@example.com --worker auto-reply-worker

# Check wrangler console output for forward/reject/reply logs
```

### 9.4 Pulumi preview

```bash
# Verify Pulumi resources are generated correctly
cd packages/products/myapp/iac && pulumi preview

# Expected resources:
# + cloudflare:index:EmailRoutingSettings  email-routing
# + cloudflare:index:EmailRoutingAddress   dest-team@company.com
# + cloudflare:index:EmailRoutingAddress   dest-catchall@company.com
# + cloudflare:index:EmailRoutingRule      rule-0-Support
# + cloudflare:index:EmailRoutingRule      rule-1-Auto-reply-worker
# + cloudflare:index:EmailRoutingRule      rule-2-Spam-trap
# + cloudflare:index:EmailRoutingCatchAll  catch-all
# + cloudflare:index:Record                spf
# + cloudflare:index:Record                dkim-google._domainkey.example.com
# + cloudflare:index:Record                dmarc
```

---

## Dependencies

- **00-foundation.md**: Edge config schema foundation, `.resist/` directory structure, service registry, Mailpit version in `versions.ts`
- **10-dns.md**: `/etc/hosts` generation (adds `mail.<localTld>` entry), mkcert SAN list

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `packages/shared/schemas/core-config/src/edge-email.ts` | Create | Complete email routing Valibot schema |
| `packages/shared/utils/cli/src/tools/edge/utils/email-harness.ts` | Create | Email Worker test harness CLI |
| `packages/shared/utils/cli/src/tools/edge/utils/email-dns.ts` | Create | SPF/DKIM/DMARC record builders |
| `packages/shared/utils/cli/src/tools/edge/utils/services.ts` | Modify | Add Mailpit service definition |
| `packages/shared/utils/cli/src/tools/edge/utils/caddy.ts` | Modify | Add Mailpit virtual host block |
| `packages/shared/utils/cli/src/tools/edge/flags/index.ts` | Modify | Add `--send-email` and related flags |
| `packages/shared/utils/cli/src/tools/edge/index.ts` | Modify | Integrate email startup/shutdown/hot-reload |

## Implementation Order

1. Create `edge-email.ts` schema file with all sub-schemas
2. Wire `EmailConfigSchema` into `EdgeConfigSchema` (in `edge.ts`)
3. Add Mailpit service definition to `services.ts`
4. Add Mailpit Caddy virtual host to `caddy.ts`
5. Add `mail.<localTld>` to hosts file generation and mkcert SAN list
6. Create `email-dns.ts` with SPF/DKIM/DMARC builders
7. Create `email-harness.ts` with routing resolution and send logic
8. Add `--send-email` flags
9. Integrate startup/shutdown/hot-reload in `index.ts`
10. Add Pulumi mapping to product IaC template
11. Tests for schema, DNS builders, routing resolution, subaddressing
