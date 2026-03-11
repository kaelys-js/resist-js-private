# 18 — Client Security: Page Shield (CSP), SRI, Email Obfuscation, Hotlink Protection

## Context

Cloudflare's client-side security features protect end users from malicious scripts, data exfiltration, and content theft. The edge tool simulates these by injecting security headers and transforming HTML responses via Caddy middleware.

### Key Features

- **Page Shield (CSP)**: Content Security Policy generation and enforcement — controls which scripts, styles, images, fonts, and other resources can load on a page
- **Subresource Integrity (SRI)**: Automatic SRI hash injection for `<script>` and `<link>` tags
- **Email Address Obfuscation**: Replace plaintext email addresses in HTML with JavaScript-decoded versions to prevent scraping
- **Hotlink Protection**: Block external sites from embedding your images/media
- **Server-Side Excludes**: Strip content between `<!--sse-->` tags for requests from suspicious IPs
- **Scrape Shield**: Bundle of protections (email obfuscation, hotlink protection, server-side excludes)
- **CSP violation reporting**: Collect CSP violation reports and log them

### Simulation Strategy

| Feature | Strategy | Details |
|---------|----------|---------|
| Page Shield / CSP | Simulate | Caddy `header` directive injects CSP headers |
| SRI | Simulate | Response body filter adds integrity attributes |
| Email Obfuscation | Simulate | Response body filter replaces emails with JS decoder |
| Hotlink Protection | Simulate | Caddy `@referer` matcher blocks external media requests |
| Server-Side Excludes | Simulate | Response body filter strips `<!--sse-->` blocks |
| CSP Reporting | Simulate | Caddy endpoint receives CSP reports → `.resist/logs/csp-violations.ndjson` |

---

## Documentation Links

- Page Shield: https://developers.cloudflare.com/page-shield/
- CSP: https://developers.cloudflare.com/page-shield/policies/
- Email Obfuscation: https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/
- Hotlink Protection: https://developers.cloudflare.com/waf/tools/scrape-shield/hotlink-protection/
- Server-Side Excludes: https://developers.cloudflare.com/waf/tools/scrape-shield/server-side-excludes/
- SRI: https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity
- CSP reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- Caddy header directive: https://caddyserver.com/docs/caddyfile/directives/header
- Caddy templates: https://caddyserver.com/docs/caddyfile/directives/templates

---

## 1. Valibot Schema: `ClientSecurityConfigSchema`

### File: `packages/shared/schemas/core-config/src/edge-client-security.ts`

```typescript
/**
 * Client Security Edge Config Schema
 *
 * Valibot schemas for client-side security features:
 * - Page Shield / Content Security Policy
 * - Subresource Integrity (SRI)
 * - Email Address Obfuscation
 * - Hotlink Protection
 * - Server-Side Excludes
 * - CSP Violation Reporting
 *
 * @module
 */

import * as v from 'valibot';

// ─── CSP Directive Sources ───────────────────────────────────────────────────

/**
 * CSP source expression — can be a keyword, URL, nonce, or hash.
 *
 * Examples: "'self'", "'unsafe-inline'", "https://cdn.example.com", "'nonce-abc123'"
 */
export const CspSourceSchema = v.pipe(v.string(), v.minLength(1));
export type CspSource = v.InferOutput<typeof CspSourceSchema>;

// ─── CSP Directive Map ───────────────────────────────────────────────────────

/**
 * Schema for CSP directive values.
 *
 * Each key is a CSP directive name, value is array of sources.
 * Maps to: Content-Security-Policy header directives
 */
export const CspDirectivesSchema = v.strictObject({
  /** @description Default policy for fetch directives not explicitly set */
  defaultSrc: v.optional(v.array(CspSourceSchema)),
  /** @description Valid sources for JavaScript */
  scriptSrc: v.optional(v.array(CspSourceSchema)),
  /** @description Valid sources for stylesheets */
  styleSrc: v.optional(v.array(CspSourceSchema)),
  /** @description Valid sources for images */
  imgSrc: v.optional(v.array(CspSourceSchema)),
  /** @description Valid sources for fonts */
  fontSrc: v.optional(v.array(CspSourceSchema)),
  /** @description Valid sources for `<object>`, `<embed>`, `<applet>` */
  objectSrc: v.optional(v.array(CspSourceSchema)),
  /** @description Valid sources for media (`<audio>`, `<video>`) */
  mediaSrc: v.optional(v.array(CspSourceSchema)),
  /** @description Valid sources for frames */
  frameSrc: v.optional(v.array(CspSourceSchema)),
  /** @description Valid sources for Workers, SharedWorkers, ServiceWorkers */
  workerSrc: v.optional(v.array(CspSourceSchema)),
  /** @description Valid sources for `fetch()`, `XMLHttpRequest`, WebSocket, EventSource */
  connectSrc: v.optional(v.array(CspSourceSchema)),
  /** @description Valid sources for `<form>` action URLs */
  formAction: v.optional(v.array(CspSourceSchema)),
  /** @description Valid sources that can embed this page in frames */
  frameAncestors: v.optional(v.array(CspSourceSchema)),
  /** @description Valid base URIs for `<base>` element */
  baseUri: v.optional(v.array(CspSourceSchema)),
  /** @description Valid MIME types for plugins */
  pluginTypes: v.optional(v.array(CspSourceSchema)),
  /** @description Valid sources for `<link rel="manifest">` */
  manifestSrc: v.optional(v.array(CspSourceSchema)),
  /** @description Valid sources for prefetch and prerender */
  prefetchSrc: v.optional(v.array(CspSourceSchema)),
  /** @description Controls the `Upgrade-Insecure-Requests` directive */
  upgradeInsecureRequests: v.optional(v.boolean()),
  /** @description Controls the `block-all-mixed-content` directive */
  blockAllMixedContent: v.optional(v.boolean()),
});
export type CspDirectives = v.InferOutput<typeof CspDirectivesSchema>;

// ─── CSP Policy ──────────────────────────────────────────────────────────────

/**
 * Schema for a Content Security Policy.
 *
 * Maps to: Cloudflare Page Shield → Policies
 */
export const CspPolicySchema = v.strictObject({
  /** @description Human-readable policy name */
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  /** @description Whether this policy is enabled */
  enabled: v.optional(v.boolean(), true),
  /** @description Path patterns this policy applies to (glob, empty = all) */
  paths: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), []),
  /** @description CSP directives */
  directives: CspDirectivesSchema,
  /** @description Whether to use Report-Only mode (log violations, don't enforce) */
  reportOnly: v.optional(v.boolean(), false),
  /** @description Whether to auto-generate nonces for inline scripts */
  useNonces: v.optional(v.boolean(), false),
});
export type CspPolicy = v.InferOutput<typeof CspPolicySchema>;

// ─── CSP Reporting ───────────────────────────────────────────────────────────

/**
 * Schema for CSP violation report collection.
 */
export const CspReportingConfigSchema = v.strictObject({
  /** @description Whether CSP reporting is enabled */
  enabled: v.optional(v.boolean(), false),
  /** @description Endpoint path for CSP violation reports */
  endpoint: v.optional(v.pipe(v.string(), v.minLength(1)), '/__csp-report'),
  /** @description Log file for CSP violations */
  logFile: v.optional(v.pipe(v.string(), v.minLength(1)), 'logs/csp-violations.ndjson'),
  /** @description Also forward reports to an external URL */
  forwardTo: v.optional(v.pipe(v.string(), v.url())),
});
export type CspReportingConfig = v.InferOutput<typeof CspReportingConfigSchema>;

// ─── Email Obfuscation ──────────────────────────────────────────────────────

/**
 * Schema for email address obfuscation settings.
 *
 * Maps to: Cloudflare Scrape Shield → Email Address Obfuscation
 */
export const EmailObfuscationConfigSchema = v.strictObject({
  /** @description Whether email obfuscation is enabled */
  enabled: v.optional(v.boolean(), false),
  /** @description CSS class added to obfuscated email links */
  cssClass: v.optional(v.pipe(v.string(), v.minLength(1)), '__cf_email__'),
  /** @description Paths to exclude from obfuscation (glob) */
  excludePaths: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), []),
});
export type EmailObfuscationConfig = v.InferOutput<typeof EmailObfuscationConfigSchema>;

// ─── Hotlink Protection ──────────────────────────────────────────────────────

/**
 * Schema for hotlink protection settings.
 *
 * Maps to: Cloudflare Scrape Shield → Hotlink Protection
 */
export const HotlinkProtectionConfigSchema = v.strictObject({
  /** @description Whether hotlink protection is enabled */
  enabled: v.optional(v.boolean(), false),
  /** @description File extensions to protect */
  extensions: v.optional(
    v.array(v.pipe(v.string(), v.minLength(1))),
    ['gif', 'ico', 'jpg', 'jpeg', 'png', 'webp', 'avif', 'svg', 'bmp'],
  ),
  /** @description Allowed referer domains (your own domains) */
  allowedDomains: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), []),
  /** @description Allow empty referer (direct access) */
  allowEmpty: v.optional(v.boolean(), true),
  /** @description Custom response for blocked hotlinks */
  blockResponse: v.optional(v.strictObject({
    /** @description HTTP status code (default: 403) */
    statusCode: v.optional(v.pipe(v.number(), v.integer(), v.minValue(400), v.maxValue(599)), 403),
    /** @description Response body */
    body: v.optional(v.pipe(v.string(), v.minLength(1)), 'Hotlinking not allowed'),
  })),
});
export type HotlinkProtectionConfig = v.InferOutput<typeof HotlinkProtectionConfigSchema>;

// ─── Server-Side Excludes ────────────────────────────────────────────────────

/**
 * Schema for server-side excludes (SSE).
 *
 * Maps to: Cloudflare Scrape Shield → Server-Side Excludes
 * Content between `<!--sse-->` and `<!--/sse-->` is stripped for suspicious IPs.
 */
export const ServerSideExcludesConfigSchema = v.strictObject({
  /** @description Whether SSE is enabled */
  enabled: v.optional(v.boolean(), false),
  /** @description Threat score threshold above which content is stripped */
  threatScoreThreshold: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100)), 14),
});
export type ServerSideExcludesConfig = v.InferOutput<typeof ServerSideExcludesConfigSchema>;

// ─── SRI (Subresource Integrity) ─────────────────────────────────────────────

/**
 * Schema for automatic SRI hash injection.
 */
export const SriConfigSchema = v.strictObject({
  /** @description Whether automatic SRI is enabled */
  enabled: v.optional(v.boolean(), false),
  /** @description Hash algorithm for SRI */
  algorithm: v.optional(v.picklist(['sha256', 'sha384', 'sha512']), 'sha384'),
  /** @description Only add SRI to resources from these domains */
  includeDomains: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), []),
  /** @description Paths to exclude from SRI injection */
  excludePaths: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), []),
});
export type SriConfig = v.InferOutput<typeof SriConfigSchema>;

// ─── Top-Level Client Security Config ────────────────────────────────────────

/**
 * Complete client security configuration schema.
 *
 * Maps to: Cloudflare Page Shield + Scrape Shield
 *
 * @example
 * ```typescript
 * const config: ClientSecurityConfig = {
 *   csp: {
 *     policies: [{
 *       name: 'default',
 *       directives: {
 *         defaultSrc: ["'self'"],
 *         scriptSrc: ["'self'", "'nonce-{{nonce}}'", "https://cdn.example.com"],
 *         styleSrc: ["'self'", "'unsafe-inline'"],
 *         imgSrc: ["'self'", "data:", "https:"],
 *         connectSrc: ["'self'", "https://api.example.com"],
 *         frameAncestors: ["'none'"],
 *         upgradeInsecureRequests: true,
 *       },
 *     }],
 *     reporting: { enabled: true },
 *   },
 *   emailObfuscation: { enabled: true },
 *   hotlinkProtection: { enabled: true, allowedDomains: ['example.com'] },
 * };
 * ```
 */
export const ClientSecurityConfigSchema = v.strictObject({
  /** @description Content Security Policy settings */
  csp: v.optional(v.strictObject({
    /** @description CSP policies (multiple allowed for different paths) */
    policies: v.optional(v.array(CspPolicySchema), []),
    /** @description CSP violation reporting */
    reporting: v.optional(CspReportingConfigSchema),
  })),
  /** @description Email address obfuscation */
  emailObfuscation: v.optional(EmailObfuscationConfigSchema),
  /** @description Hotlink protection */
  hotlinkProtection: v.optional(HotlinkProtectionConfigSchema),
  /** @description Server-side excludes */
  serverSideExcludes: v.optional(ServerSideExcludesConfigSchema),
  /** @description Subresource Integrity (SRI) auto-injection */
  sri: v.optional(SriConfigSchema),
});
export type ClientSecurityConfig = v.InferOutput<typeof ClientSecurityConfigSchema>;
```

---

## 2. CSP Header Generation

### File: `packages/shared/utils/cli/src/tools/edge/utils/client-security.ts`

```typescript
/**
 * Client Security — Caddy directive generation
 *
 * Generates Caddy directives for CSP headers, email obfuscation,
 * hotlink protection, and other client-side security features.
 *
 * @module
 */

import * as v from 'valibot';
import type { Result } from '@/utils/result/types';
import { ok, err } from '@/utils/result/helpers';
import type {
  ClientSecurityConfig,
  CspPolicy,
  CspDirectives,
  CspReportingConfig,
} from '@resist/schemas/core-config/edge-client-security';

/**
 * Build a CSP header value string from directives.
 *
 * @param directives - CSP directive configuration
 * @param nonce - Optional nonce value for script-src
 * @param reportUri - Optional report-uri endpoint
 * @returns CSP header string
 */
function buildCspHeaderValue(
  directives: CspDirectives,
  nonce?: string,
  reportUri?: string,
): string {
  const parts: string[] = [];

  const directiveMap: Record<string, string> = {
    defaultSrc: 'default-src',
    scriptSrc: 'script-src',
    styleSrc: 'style-src',
    imgSrc: 'img-src',
    fontSrc: 'font-src',
    objectSrc: 'object-src',
    mediaSrc: 'media-src',
    frameSrc: 'frame-src',
    workerSrc: 'worker-src',
    connectSrc: 'connect-src',
    formAction: 'form-action',
    frameAncestors: 'frame-ancestors',
    baseUri: 'base-uri',
    pluginTypes: 'plugin-types',
    manifestSrc: 'manifest-src',
    prefetchSrc: 'prefetch-src',
  };

  for (const [key, directive] of Object.entries(directiveMap)) {
    const sources = directives[key as keyof CspDirectives] as string[] | undefined;
    if (sources && sources.length > 0) {
      let sourceList = [...sources];

      // Inject nonce if enabled and this is script-src
      if (nonce && key === 'scriptSrc') {
        sourceList.push(`'nonce-${nonce}'`);
      }

      parts.push(`${directive} ${sourceList.join(' ')}`);
    }
  }

  // Boolean directives
  if (directives.upgradeInsecureRequests) {
    parts.push('upgrade-insecure-requests');
  }
  if (directives.blockAllMixedContent) {
    parts.push('block-all-mixed-content');
  }

  // Report URI
  if (reportUri) {
    parts.push(`report-uri ${reportUri}`);
    parts.push(`report-to csp-endpoint`);
  }

  return parts.join('; ');
}

/**
 * Generate Caddy directives for CSP policies.
 *
 * @param policies - CSP policies from config
 * @param reporting - CSP reporting config
 * @returns Caddy directive lines
 */
export function generateCspDirectives(
  policies: CspPolicy[],
  reporting?: CspReportingConfig,
): Result<string[]> {
  const enabledPolicies = policies.filter((p) => p.enabled);
  if (enabledPolicies.length === 0) return ok([]);

  const lines: string[] = [];
  lines.push('# Content Security Policy');
  lines.push('');

  const reportUri = reporting?.enabled ? reporting.endpoint ?? '/__csp-report' : undefined;

  for (const policy of enabledPolicies) {
    const headerValue = buildCspHeaderValue(policy.directives, undefined, reportUri);
    const headerName = policy.reportOnly
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';

    if (policy.paths && policy.paths.length > 0) {
      // Path-specific CSP
      const matcherName = `csp_${policy.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      lines.push(`@${matcherName} {`);
      for (const path of policy.paths) {
        lines.push(`  path ${path}`);
      }
      lines.push('}');
      lines.push(`header @${matcherName} ${headerName} "${headerValue}"`);
    } else {
      // Global CSP
      lines.push(`header ${headerName} "${headerValue}"`);
    }

    // Nonce injection (if enabled, requires Caddy templates module)
    if (policy.useNonces) {
      lines.push('');
      lines.push('# CSP nonce injection — requires templates module');
      lines.push('# Generates unique nonce per request, injects into CSP header');
      lines.push('# and replaces <script nonce="{{nonce}}"> in response body');
      lines.push('templates');
    }

    lines.push('');
  }

  // Reporting-Endpoints header (Report-To API)
  if (reporting?.enabled) {
    lines.push('# CSP Reporting Endpoint');
    lines.push(`header Reporting-Endpoints "csp-endpoint=\\"${reportUri}\\""`);
    lines.push('');
  }

  return ok(lines);
}

/**
 * Generate Caddy directives for the CSP report collector endpoint.
 *
 * @param reporting - CSP reporting configuration
 * @returns Caddy directive lines
 */
export function generateCspReportCollector(
  reporting: CspReportingConfig,
): Result<string[]> {
  if (!reporting.enabled) return ok([]);

  const endpoint = reporting.endpoint ?? '/__csp-report';
  const logFile = reporting.logFile ?? 'logs/csp-violations.ndjson';

  const lines: string[] = [];
  lines.push('# CSP Violation Report Collector');
  lines.push(`handle ${endpoint} {`);
  lines.push('  method POST');
  lines.push('');
  lines.push(`  log csp_violations {`);
  lines.push(`    output file ${logFile} {`);
  lines.push('      roll_size 20MiB');
  lines.push('      roll_keep 5');
  lines.push('    }');
  lines.push('    format json');
  lines.push('  }');
  lines.push('');

  // Forward to external URL if configured
  if (reporting.forwardTo) {
    lines.push(`  reverse_proxy ${reporting.forwardTo}`);
  } else {
    lines.push('  respond 204');
  }

  lines.push('}');
  lines.push('');

  return ok(lines);
}
```

---

## 3. Email Obfuscation — Response Body Filter

```typescript
/**
 * Generate Caddy directives for email address obfuscation.
 *
 * Cloudflare replaces plaintext email addresses in HTML responses
 * with encoded versions that are decoded via JavaScript. This prevents
 * email scrapers from harvesting addresses.
 *
 * Local simulation uses Caddy's templates module to scan and replace
 * email patterns in HTML responses.
 *
 * @param config - Email obfuscation configuration
 * @returns Caddy directive lines
 */
export function generateEmailObfuscationDirectives(
  config: EmailObfuscationConfig,
): Result<string[]> {
  if (!config.enabled) return ok([]);

  const lines: string[] = [];
  lines.push('# Email Address Obfuscation');
  lines.push('');

  // Exclude paths
  if (config.excludePaths && config.excludePaths.length > 0) {
    const matcherName = 'email_obfuscate';
    lines.push(`@${matcherName} {`);
    lines.push('  header Content-Type text/html*');
    for (const path of config.excludePaths) {
      lines.push(`  not path ${path}`);
    }
    lines.push('}');
    lines.push('');
  }

  // The actual obfuscation is done by a response body filter.
  // In Caddy, we use the `templates` directive combined with
  // a custom handler that processes the response body.
  //
  // CF's obfuscation works by:
  // 1. Finding email-like patterns in HTML text nodes
  // 2. Replacing with: <a href="/cdn-cgi/l/email-protection" class="__cf_email__"
  //    data-cfemail="HEXENCODED">[email&#160;protected]</a>
  // 3. Injecting a decoder script that restores the original email
  //
  // Local simulation: Caddy route that serves a response filter endpoint
  lines.push('# Email obfuscation response filter');
  lines.push('# Replaces email patterns in HTML with encoded versions');
  lines.push('# Injects /cdn-cgi/scripts/email-decode.min.js decoder');
  lines.push('');
  lines.push('handle /cdn-cgi/scripts/email-decode.min.js {');
  lines.push('  header Content-Type "application/javascript"');
  lines.push('  respond `');
  lines.push('    (function(){');
  lines.push('      function d(a){');
  lines.push('        for(var e="",r=parseInt(a.substr(0,2),16),n=2;n<a.length;n+=2)');
  lines.push('          e+=String.fromCharCode(parseInt(a.substr(n,2),16)^r);');
  lines.push('        return e;');
  lines.push('      }');
  lines.push(`      var els=document.querySelectorAll(".${config.cssClass ?? '__cf_email__'}");`);
  lines.push('      for(var i=0;i<els.length;i++){');
  lines.push('        var el=els[i],enc=el.getAttribute("data-cfemail");');
  lines.push('        if(enc){el.href="mailto:"+d(enc);el.textContent=d(enc);}');
  lines.push('      }');
  lines.push('    })();');
  lines.push('  `');
  lines.push('}');
  lines.push('');

  return ok(lines);
}
```

---

## 4. Hotlink Protection — Referer-Based Blocking

```typescript
/**
 * Generate Caddy directives for hotlink protection.
 *
 * Blocks requests for media files when the Referer header
 * indicates the request is from an external domain.
 *
 * @param config - Hotlink protection configuration
 * @param primaryDomain - The site's primary domain
 * @returns Caddy directive lines
 */
export function generateHotlinkProtectionDirectives(
  config: HotlinkProtectionConfig,
  primaryDomain: string,
): Result<string[]> {
  if (!config.enabled) return ok([]);

  const extensions = config.extensions ?? ['gif', 'ico', 'jpg', 'jpeg', 'png', 'webp', 'avif', 'svg', 'bmp'];
  const statusCode = config.blockResponse?.statusCode ?? 403;
  const body = config.blockResponse?.body ?? 'Hotlinking not allowed';

  const lines: string[] = [];
  lines.push('# Hotlink Protection');
  lines.push('');

  // Build extension matcher
  const extPatterns = extensions.map((ext) => `*.${ext}`).join(' ');

  lines.push('@hotlink {');
  lines.push(`  path ${extPatterns}`);

  // Allow: own domain + configured allowed domains
  const allowedDomains = [primaryDomain, ...(config.allowedDomains ?? [])];
  for (const domain of allowedDomains) {
    lines.push(`  not header Referer *${domain}*`);
  }

  // Allow empty referer (direct access) if configured
  if (config.allowEmpty) {
    lines.push('  header Referer *'); // Only match when Referer IS present
  }

  lines.push('}');
  lines.push('');

  lines.push(`respond @hotlink ${statusCode} {`);
  lines.push(`  body "${body}"`);
  lines.push('  close');
  lines.push('}');
  lines.push('');

  return ok(lines);
}
```

---

## 5. Server-Side Excludes — Content Stripping

```typescript
/**
 * Generate Caddy directives for server-side excludes.
 *
 * Content between `<!--sse-->` and `<!--/sse-->` HTML comments
 * is stripped for requests from IPs with a threat score above
 * the configured threshold.
 *
 * @param config - Server-side excludes configuration
 * @returns Caddy directive lines
 */
export function generateServerSideExcludesDirectives(
  config: ServerSideExcludesConfig,
): Result<string[]> {
  if (!config.enabled) return ok([]);

  const lines: string[] = [];
  lines.push('# Server-Side Excludes');
  lines.push(`# Strips <!--sse-->...<!--/sse--> blocks when CF-Threat-Score > ${config.threatScoreThreshold}`);
  lines.push('');

  // Use the CF-Threat-Score header injected by cf-fields (plan 15)
  // to determine whether to strip SSE content
  lines.push(`@sse_suspicious {`);
  lines.push('  header Content-Type text/html*');
  lines.push(`  expression {http.request.header.CF-Threat-Score} > ${config.threatScoreThreshold}`);
  lines.push('}');
  lines.push('');

  // Response body filter to strip SSE blocks
  // In practice, this would use a Caddy response matcher + template
  lines.push('# SSE content stripping for suspicious requests');
  lines.push('# Implemented via response body filter that removes');
  lines.push('# content between <!--sse--> and <!--/sse--> markers');
  lines.push('');

  return ok(lines);
}
```

---

## 6. Master Orchestrator — `generateClientSecurityDirectives()`

```typescript
/**
 * Generate all client security Caddy directives.
 *
 * @param config - Complete client security configuration
 * @param primaryDomain - The site's primary domain
 * @returns All Caddy directive lines
 */
export function generateClientSecurityDirectives(
  config: ClientSecurityConfig,
  primaryDomain: string,
): Result<string[]> {
  const allLines: string[] = [];

  // 1. CSP policies
  if (config.csp?.policies && config.csp.policies.length > 0) {
    const cspResult = generateCspDirectives(config.csp.policies, config.csp.reporting);
    if (!cspResult.ok) return cspResult;
    allLines.push(...cspResult.data);
  }

  // 2. CSP report collector
  if (config.csp?.reporting?.enabled) {
    const reportResult = generateCspReportCollector(config.csp.reporting);
    if (!reportResult.ok) return reportResult;
    allLines.push(...reportResult.data);
  }

  // 3. Email obfuscation
  if (config.emailObfuscation?.enabled) {
    const emailResult = generateEmailObfuscationDirectives(config.emailObfuscation);
    if (!emailResult.ok) return emailResult;
    allLines.push(...emailResult.data);
  }

  // 4. Hotlink protection
  if (config.hotlinkProtection?.enabled) {
    const hotlinkResult = generateHotlinkProtectionDirectives(config.hotlinkProtection, primaryDomain);
    if (!hotlinkResult.ok) return hotlinkResult;
    allLines.push(...hotlinkResult.data);
  }

  // 5. Server-side excludes
  if (config.serverSideExcludes?.enabled) {
    const sseResult = generateServerSideExcludesDirectives(config.serverSideExcludes);
    if (!sseResult.ok) return sseResult;
    allLines.push(...sseResult.data);
  }

  return ok(allLines);
}
```

---

## 7. Pulumi Mapping

### File: `packages/products/[product]/iac/client-security.ts`

```typescript
/**
 * Pulumi IaC generation for Client Security features.
 *
 * Maps ClientSecurityConfigSchema → Cloudflare zone settings
 * and Page Shield resources.
 *
 * @module
 */

import * as pulumi from '@pulumi/pulumi';
import * as cf from '@pulumi/cloudflare';
import type { ClientSecurityConfig } from '@resist/schemas/core-config/edge-client-security';

/**
 * Create client security Pulumi resources from edge config.
 *
 * @param config - Client security config
 * @param zoneId - Cloudflare zone ID
 * @param opts - Pulumi resource options
 * @returns Created Pulumi resources
 */
export function createClientSecurityResources(
  config: ClientSecurityConfig,
  zoneId: pulumi.Input<string>,
  opts?: pulumi.ComponentResourceOptions,
) {
  const resources: Record<string, pulumi.Resource> = {};

  // ── Zone Settings ────────────────────────────────────────────────

  // Email obfuscation
  if (config.emailObfuscation) {
    resources['emailObfuscation'] = new cf.ZoneSettingsOverride(
      'email-obfuscation',
      {
        zoneId,
        settings: {
          emailObfuscation: config.emailObfuscation.enabled ? 'on' : 'off',
        },
      },
      opts,
    );
  }

  // Hotlink protection
  if (config.hotlinkProtection) {
    resources['hotlinkProtection'] = new cf.ZoneSettingsOverride(
      'hotlink-protection',
      {
        zoneId,
        settings: {
          hotlinkProtection: config.hotlinkProtection.enabled ? 'on' : 'off',
        },
      },
      opts,
    );
  }

  // Server-side excludes
  if (config.serverSideExcludes) {
    resources['serverSideExcludes'] = new cf.ZoneSettingsOverride(
      'server-side-excludes',
      {
        zoneId,
        settings: {
          serverSideExclude: config.serverSideExcludes.enabled ? 'on' : 'off',
        },
      },
      opts,
    );
  }

  // ── Page Shield Policies (CSP) ───────────────────────────────────

  for (const [index, policy] of (config.csp?.policies ?? []).entries()) {
    if (!policy.enabled) continue;

    // CF Page Shield policies are managed via the API
    // Each policy maps to a Page Shield connection policy
    resources[`pageShieldPolicy_${index}`] = new cf.PageShieldPolicy(
      `page-shield-policy-${policy.name}`,
      {
        zoneId,
        action: policy.reportOnly ? 'log' : 'allow',
        description: policy.name,
        expression: policy.paths && policy.paths.length > 0
          ? `http.request.uri.path matches "${policy.paths[0]}"`
          : 'true',
        enabled: policy.enabled,
        value: buildCspHeaderValueForPulumi(policy.directives),
      },
      opts,
    );
  }

  return resources;
}

/**
 * Build CSP header value for Pulumi (plain string, no Caddy escaping).
 *
 * @param directives - CSP directives
 * @returns CSP header value string
 */
function buildCspHeaderValueForPulumi(directives: CspDirectives): string {
  const parts: string[] = [];
  const directiveMap: Record<string, string> = {
    defaultSrc: 'default-src',
    scriptSrc: 'script-src',
    styleSrc: 'style-src',
    imgSrc: 'img-src',
    fontSrc: 'font-src',
    objectSrc: 'object-src',
    mediaSrc: 'media-src',
    frameSrc: 'frame-src',
    workerSrc: 'worker-src',
    connectSrc: 'connect-src',
    formAction: 'form-action',
    frameAncestors: 'frame-ancestors',
    baseUri: 'base-uri',
  };

  for (const [key, directive] of Object.entries(directiveMap)) {
    const sources = directives[key as keyof CspDirectives] as string[] | undefined;
    if (sources && sources.length > 0) {
      parts.push(`${directive} ${sources.join(' ')}`);
    }
  }

  if (directives.upgradeInsecureRequests) parts.push('upgrade-insecure-requests');
  if (directives.blockAllMixedContent) parts.push('block-all-mixed-content');

  return parts.join('; ');
}
```

---

## 8. Mapping Table

| CF Feature | Edge Tool Simulation | Pulumi Resource |
|---|---|---|
| Page Shield (CSP) | Caddy `header Content-Security-Policy` | `cf.PageShieldPolicy` |
| CSP Report-Only | Caddy `header Content-Security-Policy-Report-Only` | `cf.PageShieldPolicy` (action: log) |
| CSP Reporting | Caddy `handle /__csp-report` → log to ndjson | Automatic (CF reports to dashboard) |
| CSP Nonces | Caddy `templates` module nonce generation | Not applicable (CF handles) |
| Email Obfuscation | Response body filter + JS decoder script | `cf.ZoneSettingsOverride` (emailObfuscation) |
| Hotlink Protection | Caddy `@referer` matcher → 403 | `cf.ZoneSettingsOverride` (hotlinkProtection) |
| Server-Side Excludes | Response body filter (SSE markers) | `cf.ZoneSettingsOverride` (serverSideExclude) |
| SRI | Response body filter adds integrity attributes | Not a CF feature (app-level) |
| Page Shield monitoring | Not simulated (local scripts are trusted) | Automatic (CF monitors scripts) |

---

## 9. Verification Steps

### CSP Headers

```bash
# Check CSP header is present
curl -sI https://localhost:9000/ | grep -i content-security-policy
# → Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com; ...

# CSP Report-Only mode
curl -sI https://localhost:9000/ | grep -i content-security-policy-report-only
# → Content-Security-Policy-Report-Only: ...
```

### CSP Violation Reporting

```bash
# Send a fake CSP violation report
curl -X POST https://localhost:9000/__csp-report \
  -H "Content-Type: application/csp-report" \
  -d '{"csp-report":{"document-uri":"https://example.com","violated-directive":"script-src"}}'
# → 204

# Check violation log
cat .resist/logs/csp-violations.ndjson
# → {"csp-report":{"document-uri":"https://example.com",...}}
```

### Email Obfuscation

```bash
# Fetch the decoder script
curl https://localhost:9000/cdn-cgi/scripts/email-decode.min.js
# → JavaScript decoder function

# Check HTML response has encoded emails
curl https://localhost:9000/page-with-email.html | grep '__cf_email__'
# → <a class="__cf_email__" data-cfemail="...">
```

### Hotlink Protection

```bash
# Direct access (no referer) — allowed
curl https://localhost:9000/images/logo.png
# → 200

# Same-domain referer — allowed
curl -H "Referer: https://localhost:9000/page" https://localhost:9000/images/logo.png
# → 200

# External referer — blocked
curl -H "Referer: https://evil.com/steal" https://localhost:9000/images/logo.png
# → 403 "Hotlinking not allowed"
```

---

## 10. Known Limitations & Simulation Gaps

| Feature | CF Behavior | Local Simulation | Gap |
|---|---|---|---|
| Page Shield monitoring | ML-based script change detection | Not simulated | No script monitoring/alerting |
| Page Shield connections | Tracks all outbound JS connections | Not simulated | No connection tracking |
| Email obfuscation | Server-side HTML rewriting | Client-side JS decoder only | Encoded emails visible in source |
| SRI auto-injection | Not a CF feature | Basic response filter | Limited to static resources |
| CSP nonces | CF generates per-request | Requires Caddy templates | May not work with all frameworks |
| Hotlink (signed URLs) | CF supports signed URL exemptions | Not supported | No signed URL bypass |
| Server-side excludes | Strips based on CF threat intelligence | Uses CF-Threat-Score header | Local threat scores are simulated |

---

## 11. File Summary

| File | Purpose |
|------|---------|
| `packages/shared/schemas/core-config/src/edge-client-security.ts` | Valibot schemas for CSP, email obfuscation, hotlink, SSE, SRI |
| `packages/shared/utils/cli/src/tools/edge/utils/client-security.ts` | Caddy directive generation for all client security features |
| `packages/products/[product]/iac/client-security.ts` | Pulumi resource creation for Page Shield + zone settings |

---

## 12. Dependencies

| Dependency | Plan | Relationship |
|------------|------|-------------|
| `15-cf-fields.md` | CF-Threat-Score header | Used by server-side excludes threshold check |
| `01-ssl-tls.md` | HTTPS | CSP upgrade-insecure-requests requires SSL |
| `06-rules-engine.md` | Transform rules | CSP headers can also be set via transform rules |
| `12-analytics.md` | CSP violation logs | Violations logged alongside analytics data |

---

## 13. Implementation Order

1. **Schema layer**: Create `edge-client-security.ts` with all Valibot schemas
2. **CSP header generation**: Build CSP header strings from directive config
3. **CSP path-specific policies**: Caddy matchers for per-path CSP
4. **CSP report collector**: Caddy endpoint for violation reports
5. **Email obfuscation**: JS decoder script + response filter directives
6. **Hotlink protection**: Referer-based blocking matchers
7. **Server-side excludes**: Threat-score-based content stripping
8. **SRI injection**: Response body filter for integrity attributes
9. **Pulumi mapping**: Zone settings + Page Shield policy resources
10. **Integration**: Wire into master `generateCaddyfile()` in `caddy.ts`
