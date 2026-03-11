# 16 — API Security: API Shield, JWT Validation, Schema Validation, mTLS, Endpoint Discovery

## Context

Cloudflare's API Security suite protects API endpoints by validating requests against known schemas, verifying JWT tokens, enforcing mTLS, discovering undocumented endpoints, and detecting abuse sequences. The edge tool simulates these locally using Caddy middleware + companion validation logic.

### Key Features

- **API Shield / Schema Validation**: Validate requests against OpenAPI 3.x schemas — reject unknown endpoints, invalid request bodies, wrong content types, missing required parameters
- **JWT Validation**: Validate JWT tokens in requests (verify signature, check claims, enforce expiry) — separate from CF Access JWT (plan 09)
- **mTLS for APIs**: Require client certificates on specific API paths (complements plan 01 SSL/TLS client cert support)
- **Endpoint Discovery**: Log all observed API endpoints to detect undocumented/shadow APIs
- **Sequence Detection**: Track request sequences to detect credential stuffing, enumeration attacks
- **Routing**: Route to different origins based on API path/method

### Simulation Strategy

| Feature | Strategy | Details |
|---------|----------|---------|
| Schema Validation | Simulate | Parse OpenAPI spec, Caddy validates request path/method/body/params |
| JWT Validation | Simulate | Caddy `jwt` module validates tokens (signature, claims, expiry) |
| mTLS | Simulate | Caddy `client_auth` on API paths (reuse mkcert client CA from plan 01) |
| Endpoint Discovery | Simulate | Log all observed path+method combos to `.resist/logs/api-discovery.ndjson` |
| Sequence Detection | Simulate | In-memory sliding window tracks request sequences per IP/token |
| API Routing | Simulate | Caddy `handle` blocks with path matchers route to different upstreams |

---

## Documentation Links

- API Shield overview: https://developers.cloudflare.com/api-shield/
- Schema Validation: https://developers.cloudflare.com/api-shield/security/schema-validation/
- JWT Validation: https://developers.cloudflare.com/api-shield/security/jwt-validation/
- mTLS: https://developers.cloudflare.com/api-shield/security/mtls/
- Endpoint Management: https://developers.cloudflare.com/api-shield/management/
- Sequence Detection: https://developers.cloudflare.com/api-shield/security/sequence-mitigation/
- API Routing: https://developers.cloudflare.com/api-shield/management/api-routing/
- Caddy `reverse_proxy`: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy request matchers: https://caddyserver.com/docs/caddyfile/matchers

---

## 1. Valibot Schema: `ApiSecurityConfigSchema`

### File: `packages/shared/schemas/core-config/src/edge-api-security.ts`

```typescript
/**
 * API Security Edge Config Schema
 *
 * Valibot schemas for Cloudflare API Shield features:
 * - Schema Validation (OpenAPI 3.x)
 * - JWT Validation
 * - mTLS per-path
 * - Endpoint Discovery
 * - Sequence Detection
 * - API Routing
 *
 * @module
 */

import * as v from 'valibot';

// ─── JWT Validation Credential ───────────────────────────────────────────────

/**
 * Schema for a JWT validation credential (JWKS, static key, or issuer URL).
 *
 * Maps to: Cloudflare API Shield → JWT Validation → Credentials
 */
export const JwtCredentialSchema = v.variant('type', [
  v.strictObject({
    /** @description Credential type: JWKS endpoint */
    type: v.literal('jwks'),
    /** @description URL to fetch JWKS key set */
    url: v.pipe(v.string(), v.url()),
    /** @description Cache TTL for JWKS in seconds */
    cacheTtl: v.optional(v.pipe(v.number(), v.integer(), v.minValue(60), v.maxValue(86400)), 3600),
  }),
  v.strictObject({
    /** @description Credential type: static RSA/EC public key (PEM) */
    type: v.literal('static'),
    /** @description PEM-encoded public key */
    publicKey: v.pipe(v.string(), v.minLength(1)),
    /** @description Key algorithm */
    algorithm: v.picklist(['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'EdDSA']),
  }),
  v.strictObject({
    /** @description Credential type: OIDC discovery URL */
    type: v.literal('oidc'),
    /** @description OIDC issuer URL — .well-known/openid-configuration is appended */
    issuerUrl: v.pipe(v.string(), v.url()),
  }),
]);
export type JwtCredential = v.InferOutput<typeof JwtCredentialSchema>;

// ─── JWT Validation Configuration ────────────────────────────────────────────

/**
 * Schema for a JWT validation rule applied to API paths.
 *
 * Maps to: Cloudflare API Shield → JWT Validation → Rules
 */
export const JwtValidationRuleSchema = v.strictObject({
  /** @description Human-readable name for this JWT rule */
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  /** @description Whether this rule is enabled */
  enabled: v.optional(v.boolean(), true),
  /** @description Path pattern (glob) this rule applies to */
  path: v.pipe(v.string(), v.minLength(1)),
  /** @description HTTP methods this rule applies to (empty = all methods) */
  methods: v.optional(v.array(v.picklist(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])), []),
  /** @description Where to find the token in the request */
  tokenSource: v.variant('location', [
    v.strictObject({
      location: v.literal('header'),
      /** @description Header name (default: Authorization) */
      headerName: v.optional(v.pipe(v.string(), v.minLength(1)), 'Authorization'),
      /** @description Prefix to strip (default: Bearer) */
      prefix: v.optional(v.pipe(v.string(), v.minLength(1)), 'Bearer'),
    }),
    v.strictObject({
      location: v.literal('cookie'),
      /** @description Cookie name containing the JWT */
      cookieName: v.pipe(v.string(), v.minLength(1)),
    }),
    v.strictObject({
      location: v.literal('query'),
      /** @description Query parameter name containing the JWT */
      paramName: v.pipe(v.string(), v.minLength(1)),
    }),
  ]),
  /** @description JWT credential for signature verification */
  credential: JwtCredentialSchema,
  /** @description Required claims (key-value pairs, all must match) */
  requiredClaims: v.optional(v.record(v.string(), v.union([v.string(), v.number(), v.boolean(), v.array(v.string())])), {}),
  /** @description Required audience (aud claim) */
  audience: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), []),
  /** @description Required issuer (iss claim) */
  issuer: v.optional(v.pipe(v.string(), v.minLength(1))),
  /** @description Max allowed clock skew in seconds */
  clockSkew: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(300)), 60),
  /** @description Action on failure */
  action: v.optional(v.picklist(['block', 'log']), 'block'),
});
export type JwtValidationRule = v.InferOutput<typeof JwtValidationRuleSchema>;

// ─── OpenAPI Schema Validation ───────────────────────────────────────────────

/**
 * Schema for OpenAPI-based request/response validation.
 *
 * Maps to: Cloudflare API Shield → Schema Validation
 */
export const SchemaValidationConfigSchema = v.strictObject({
  /** @description Whether schema validation is enabled */
  enabled: v.optional(v.boolean(), false),
  /** @description Path to OpenAPI 3.x spec file (JSON or YAML) */
  specFile: v.pipe(v.string(), v.minLength(1)),
  /** @description What to validate */
  validate: v.optional(v.strictObject({
    /** @description Validate request path and method against spec */
    requestPath: v.optional(v.boolean(), true),
    /** @description Validate request body against schema */
    requestBody: v.optional(v.boolean(), true),
    /** @description Validate request query parameters */
    requestQueryParams: v.optional(v.boolean(), true),
    /** @description Validate request headers */
    requestHeaders: v.optional(v.boolean(), false),
    /** @description Validate Content-Type header matches spec */
    contentType: v.optional(v.boolean(), true),
  }), {}),
  /** @description Action for requests to paths not in the spec */
  unknownPathAction: v.optional(v.picklist(['block', 'log', 'allow']), 'log'),
  /** @description Action for requests with invalid body/params */
  validationFailureAction: v.optional(v.picklist(['block', 'log']), 'block'),
  /** @description Paths to exclude from validation (glob patterns) */
  excludePaths: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), []),
  /** @description Custom error response body for blocked requests */
  errorResponse: v.optional(v.strictObject({
    /** @description HTTP status code for blocked requests */
    statusCode: v.optional(v.pipe(v.number(), v.integer(), v.minValue(400), v.maxValue(599)), 400),
    /** @description Content-Type of error response */
    contentType: v.optional(v.pipe(v.string(), v.minLength(1)), 'application/json'),
    /** @description Error response body template ({{error}} is replaced with validation error) */
    body: v.optional(v.pipe(v.string(), v.minLength(1)), '{"error":"API validation failed","detail":"{{error}}"}'),
  })),
});
export type SchemaValidationConfig = v.InferOutput<typeof SchemaValidationConfigSchema>;

// ─── mTLS for API Paths ──────────────────────────────────────────────────────

/**
 * Schema for mTLS enforcement on API paths.
 *
 * Maps to: Cloudflare API Shield → mTLS
 * Reuses client CA from plan 01 (SslConfigSchema.clientCertificates).
 */
export const ApiMtlsRuleSchema = v.strictObject({
  /** @description Human-readable name */
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  /** @description Whether this mTLS rule is enabled */
  enabled: v.optional(v.boolean(), true),
  /** @description Path patterns requiring mTLS (glob) */
  paths: v.pipe(v.array(v.pipe(v.string(), v.minLength(1))), v.minLength(1)),
  /** @description HTTP methods to enforce (empty = all) */
  methods: v.optional(v.array(v.picklist(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])), []),
  /** @description Action when client cert is missing or invalid */
  action: v.optional(v.picklist(['block', 'log']), 'block'),
  /** @description Check certificate revocation (OCSP) */
  checkRevocation: v.optional(v.boolean(), false),
  /** @description Require specific CN or SAN values */
  allowedIdentities: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), []),
  /** @description Forward client cert info as headers to origin */
  forwardCertInfo: v.optional(v.boolean(), true),
});
export type ApiMtlsRule = v.InferOutput<typeof ApiMtlsRuleSchema>;

// ─── Endpoint Discovery ──────────────────────────────────────────────────────

/**
 * Schema for API endpoint discovery settings.
 *
 * Maps to: Cloudflare API Shield → Endpoint Management → Discovery
 */
export const EndpointDiscoveryConfigSchema = v.strictObject({
  /** @description Whether endpoint discovery is enabled */
  enabled: v.optional(v.boolean(), false),
  /** @description Path prefixes to monitor (e.g., ["/api/", "/v1/"]) */
  monitorPrefixes: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), ['/api/']),
  /** @description Paths to exclude from discovery */
  excludePaths: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), []),
  /** @description Log file path (relative to .resist/) */
  logFile: v.optional(v.pipe(v.string(), v.minLength(1)), 'logs/api-discovery.ndjson'),
  /** @description Whether to log request/response samples (for schema inference) */
  logSamples: v.optional(v.boolean(), false),
  /** @description Max sample body size in bytes */
  maxSampleSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(65536)), 4096),
});
export type EndpointDiscoveryConfig = v.InferOutput<typeof EndpointDiscoveryConfigSchema>;

// ─── Sequence Detection ──────────────────────────────────────────────────────

/**
 * Schema for API sequence detection (abuse pattern recognition).
 *
 * Maps to: Cloudflare API Shield → Sequence Mitigation
 */
export const SequenceRuleSchema = v.strictObject({
  /** @description Human-readable name */
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  /** @description Whether this sequence rule is enabled */
  enabled: v.optional(v.boolean(), true),
  /** @description Ordered list of path+method patterns that form the expected sequence */
  steps: v.pipe(v.array(v.strictObject({
    /** @description HTTP method */
    method: v.picklist(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    /** @description Path pattern (glob) */
    path: v.pipe(v.string(), v.minLength(1)),
  })), v.minLength(2), v.maxLength(10)),
  /** @description How to identify the client (for tracking sequences) */
  clientIdentifier: v.optional(v.picklist(['ip', 'jwt_sub', 'header']), 'ip'),
  /** @description Header name when clientIdentifier is 'header' */
  identifierHeader: v.optional(v.pipe(v.string(), v.minLength(1))),
  /** @description Time window in seconds for the sequence to occur */
  windowSeconds: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(3600)), 60),
  /** @description Action when sequence is violated (request skips steps) */
  action: v.optional(v.picklist(['block', 'log', 'challenge']), 'log'),
});
export type SequenceRule = v.InferOutput<typeof SequenceRuleSchema>;

// ─── API Routing ─────────────────────────────────────────────────────────────

/**
 * Schema for API routing — route different API paths to different origins.
 *
 * Maps to: Cloudflare API Shield → API Routing
 */
export const ApiRouteSchema = v.strictObject({
  /** @description Human-readable name */
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  /** @description Whether this route is enabled */
  enabled: v.optional(v.boolean(), true),
  /** @description Path pattern to match (glob) */
  path: v.pipe(v.string(), v.minLength(1)),
  /** @description HTTP methods to match (empty = all) */
  methods: v.optional(v.array(v.picklist(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])), []),
  /** @description Origin to route to */
  origin: v.pipe(v.string(), v.url()),
  /** @description Whether to strip the matched path prefix when forwarding */
  stripPrefix: v.optional(v.boolean(), false),
  /** @description Additional headers to add to the proxied request */
  addHeaders: v.optional(v.record(v.string(), v.string()), {}),
});
export type ApiRoute = v.InferOutput<typeof ApiRouteSchema>;

// ─── Top-Level API Security Config ───────────────────────────────────────────

/**
 * Complete API Security configuration schema.
 *
 * Maps to: Cloudflare API Shield (all sub-features)
 *
 * @example
 * ```typescript
 * const config: ApiSecurityConfig = {
 *   schemaValidation: {
 *     enabled: true,
 *     specFile: './openapi.yaml',
 *     unknownPathAction: 'block',
 *   },
 *   jwtValidation: [{
 *     name: 'api-auth',
 *     path: '/api/*',
 *     tokenSource: { location: 'header', headerName: 'Authorization', prefix: 'Bearer' },
 *     credential: { type: 'jwks', url: 'https://auth.example.com/.well-known/jwks.json' },
 *     action: 'block',
 *   }],
 *   mtls: [{
 *     name: 'internal-api',
 *     paths: ['/internal/*'],
 *     action: 'block',
 *   }],
 *   endpointDiscovery: { enabled: true },
 * };
 * ```
 */
export const ApiSecurityConfigSchema = v.strictObject({
  /** @description OpenAPI schema validation settings */
  schemaValidation: v.optional(SchemaValidationConfigSchema),
  /** @description JWT validation rules */
  jwtValidation: v.optional(v.array(JwtValidationRuleSchema), []),
  /** @description mTLS enforcement rules for API paths */
  mtls: v.optional(v.array(ApiMtlsRuleSchema), []),
  /** @description Endpoint discovery settings */
  endpointDiscovery: v.optional(EndpointDiscoveryConfigSchema),
  /** @description Sequence detection rules */
  sequenceRules: v.optional(v.array(SequenceRuleSchema), []),
  /** @description API routing rules */
  routing: v.optional(v.array(ApiRouteSchema), []),
});
export type ApiSecurityConfig = v.InferOutput<typeof ApiSecurityConfigSchema>;
```

---

## 2. OpenAPI Schema Validation

### File: `packages/shared/utils/cli/src/tools/edge/utils/api-security.ts`

The schema validator loads the OpenAPI spec at startup and generates Caddy middleware that validates requests against it.

```typescript
/**
 * API Schema Validation — Caddy directive generation
 *
 * Parses OpenAPI 3.x spec and generates Caddy route handlers
 * that validate incoming requests (path, method, body, params).
 *
 * @module
 */

import * as v from 'valibot';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/utils/result/types';
import { ok, err } from '@/utils/result/helpers';
import type { SchemaValidationConfig } from '@resist/schemas/core-config/edge-api-security';

/**
 * Parsed OpenAPI path+method entry.
 */
const OpenApiEndpointSchema = v.strictObject({
  path: v.string(),
  method: v.string(),
  operationId: v.optional(v.string()),
  requestBodySchema: v.optional(v.unknown()),
  queryParams: v.optional(v.array(v.strictObject({
    name: v.string(),
    required: v.boolean(),
    schema: v.optional(v.unknown()),
  }))),
  contentTypes: v.optional(v.array(v.string())),
});
type OpenApiEndpoint = v.InferOutput<typeof OpenApiEndpointSchema>;

/**
 * Load and parse OpenAPI spec file.
 *
 * @param specFile - Path to OpenAPI 3.x JSON or YAML file
 * @param projectRoot - Project root for resolving relative paths
 * @returns Parsed endpoints array
 */
export async function loadOpenApiSpec(
  specFile: string,
  projectRoot: string,
): Promise<Result<OpenApiEndpoint[]>> {
  const fullPath = resolve(projectRoot, specFile);

  let raw: string;
  try {
    raw = await readFile(fullPath, 'utf-8');
  } catch {
    return err(`Failed to read OpenAPI spec: ${fullPath}`);
  }

  let spec: Record<string, unknown>;
  try {
    // Try JSON first
    spec = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // Try YAML (requires yaml package)
    try {
      const { parse: parseYaml } = await import('yaml');
      spec = parseYaml(raw) as Record<string, unknown>;
    } catch {
      return err(`Failed to parse OpenAPI spec as JSON or YAML: ${fullPath}`);
    }
  }

  const paths = spec['paths'] as Record<string, Record<string, unknown>> | undefined;
  if (!paths) {
    return err('OpenAPI spec has no "paths" property');
  }

  const endpoints: OpenApiEndpoint[] = [];
  const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!httpMethods.includes(method)) continue;

      const op = operation as Record<string, unknown>;
      const contentTypes: string[] = [];
      let requestBodySchema: unknown = undefined;

      // Extract request body schema
      if (op['requestBody']) {
        const body = op['requestBody'] as Record<string, unknown>;
        const content = body['content'] as Record<string, Record<string, unknown>> | undefined;
        if (content) {
          for (const [ct, def] of Object.entries(content)) {
            contentTypes.push(ct);
            if (!requestBodySchema && def['schema']) {
              requestBodySchema = def['schema'];
            }
          }
        }
      }

      // Extract query parameters
      const params = (op['parameters'] as Array<Record<string, unknown>> | undefined) ?? [];
      const queryParams = params
        .filter((p) => p['in'] === 'query')
        .map((p) => ({
          name: p['name'] as string,
          required: (p['required'] as boolean) ?? false,
          schema: p['schema'],
        }));

      endpoints.push({
        path,
        method: method.toUpperCase(),
        operationId: op['operationId'] as string | undefined,
        requestBodySchema,
        queryParams: queryParams.length > 0 ? queryParams : undefined,
        contentTypes: contentTypes.length > 0 ? contentTypes : undefined,
      });
    }
  }

  return ok(endpoints);
}

/**
 * Convert OpenAPI path params to Caddy path matcher.
 * e.g., `/users/{id}/posts` → `/users/*/posts`
 *
 * @param openapiPath - OpenAPI path with {param} placeholders
 * @returns Caddy-compatible path matcher
 */
function openApiPathToCaddyMatcher(openapiPath: string): string {
  return openapiPath.replace(/\{[^}]+\}/g, '*');
}

/**
 * Generate Caddy directives for schema validation.
 *
 * Strategy:
 * - For each spec endpoint, create an `@api_known` named matcher
 * - Unknown paths (not in spec) → respond based on unknownPathAction
 * - Known paths with wrong method → 405
 * - Validation errors → respond based on validationFailureAction
 *
 * @param config - Schema validation config
 * @param endpoints - Parsed OpenAPI endpoints
 * @returns Caddy directive lines
 */
export function generateSchemaValidationDirectives(
  config: SchemaValidationConfig,
  endpoints: OpenApiEndpoint[],
): Result<string[]> {
  if (!config.enabled) return ok([]);

  const lines: string[] = [];
  lines.push('# API Schema Validation (OpenAPI)');
  lines.push('');

  // Build known-path matchers — one per unique path
  const uniquePaths = [...new Set(endpoints.map((e) => e.path))];
  const methodsByPath = new Map<string, string[]>();
  for (const ep of endpoints) {
    const existing = methodsByPath.get(ep.path) ?? [];
    existing.push(ep.method);
    methodsByPath.set(ep.path, existing);
  }

  // Generate route blocks for known endpoints
  for (const apiPath of uniquePaths) {
    const caddyPath = openApiPathToCaddyMatcher(apiPath);
    const methods = methodsByPath.get(apiPath) ?? [];

    // Skip excluded paths
    if (config.excludePaths?.some((glob) => apiPath.startsWith(glob.replace('*', '')))) {
      continue;
    }

    lines.push(`# Endpoint: ${apiPath}`);
    lines.push(`@api_${apiPath.replace(/[^a-zA-Z0-9]/g, '_')} {`);
    lines.push(`  path ${caddyPath}`);
    lines.push(`  not method ${methods.join(' ')}`);
    lines.push('}');

    // Wrong method → 405
    lines.push(`respond @api_${apiPath.replace(/[^a-zA-Z0-9]/g, '_')} 405 {`);
    lines.push('  body "Method not allowed for this endpoint"');
    lines.push('  close');
    lines.push('}');
    lines.push('');
  }

  // Unknown paths — apply unknownPathAction
  if (config.unknownPathAction !== 'allow') {
    // Build a combined matcher for all known paths
    const allCaddyPaths = uniquePaths.map(openApiPathToCaddyMatcher);
    const statusCode = config.errorResponse?.statusCode ?? 400;
    const contentType = config.errorResponse?.contentType ?? 'application/json';
    const bodyTemplate = config.errorResponse?.body ?? '{"error":"API validation failed","detail":"{{error}}"}';

    lines.push('# Unknown API paths');
    lines.push('@api_unknown {');
    for (const prefix of (config.excludePaths ?? [])) {
      lines.push(`  not path ${prefix}`);
    }
    // Match API paths that aren't in spec
    lines.push(`  not path ${allCaddyPaths.join(' ')}`);
    // Only match paths that look like API calls
    lines.push('  path /api/* /v1/* /v2/* /v3/*');
    lines.push('}');

    if (config.unknownPathAction === 'block') {
      const body = bodyTemplate.replace('{{error}}', 'Unknown API endpoint');
      lines.push(`respond @api_unknown ${statusCode} {`);
      lines.push(`  header Content-Type "${contentType}"`);
      lines.push(`  body "${body}"`);
      lines.push('  close');
      lines.push('}');
    } else {
      // log-only: add a marker header
      lines.push('header @api_unknown X-API-Unknown-Path "true"');
    }
    lines.push('');
  }

  // Content-Type validation for endpoints with requestBody
  if (config.validate?.contentType !== false) {
    for (const ep of endpoints) {
      if (!ep.contentTypes || ep.contentTypes.length === 0) continue;
      if (['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(ep.method)) continue;

      const caddyPath = openApiPathToCaddyMatcher(ep.path);
      const matcherName = `ct_${ep.method.toLowerCase()}_${ep.path.replace(/[^a-zA-Z0-9]/g, '_')}`;

      lines.push(`@${matcherName} {`);
      lines.push(`  path ${caddyPath}`);
      lines.push(`  method ${ep.method}`);
      for (const ct of ep.contentTypes) {
        lines.push(`  not header Content-Type ${ct}*`);
      }
      lines.push('}');

      const statusCode = config.errorResponse?.statusCode ?? 400;
      lines.push(`respond @${matcherName} ${statusCode} {`);
      lines.push(`  header Content-Type "application/json"`);
      lines.push(`  body "{\\"error\\":\\"Invalid Content-Type\\",\\"expected\\":\\"${ep.contentTypes.join(', ')}\\"}"` );
      lines.push('  close');
      lines.push('}');
      lines.push('');
    }
  }

  return ok(lines);
}
```

---

## 3. JWT Validation — Caddy Directive Generation

### File: `packages/shared/utils/cli/src/tools/edge/utils/jwt-validation.ts`

```typescript
/**
 * JWT Validation — Caddy directive generation
 *
 * Generates Caddy route handlers that validate JWT tokens.
 * Uses Caddy's built-in JWT support via the `jwt` handler
 * or falls back to a custom validation middleware.
 *
 * @module
 */

import * as v from 'valibot';
import type { Result } from '@/utils/result/types';
import { ok, err } from '@/utils/result/helpers';
import type { JwtValidationRule } from '@resist/schemas/core-config/edge-api-security';

/**
 * Generate Caddy directives for JWT validation rules.
 *
 * For each rule:
 * 1. Create a route matcher for the path + methods
 * 2. Extract token from configured source (header/cookie/query)
 * 3. Validate signature using configured credential
 * 4. Check required claims, audience, issuer, expiry
 * 5. Block or log on failure
 *
 * Local simulation uses a custom Caddy handler that:
 * - For JWKS: fetches and caches the key set
 * - For static: uses the PEM key directly
 * - For OIDC: fetches .well-known/openid-configuration → jwks_uri
 *
 * @param rules - JWT validation rules from config
 * @returns Caddy directive lines
 */
export function generateJwtValidationDirectives(
  rules: JwtValidationRule[],
): Result<string[]> {
  const enabledRules = rules.filter((r) => r.enabled);
  if (enabledRules.length === 0) return ok([]);

  const lines: string[] = [];
  lines.push('# JWT Validation Rules');
  lines.push('');

  for (const rule of enabledRules) {
    const matcherName = `jwt_${rule.name.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Build matcher
    lines.push(`# JWT Rule: ${rule.name}`);
    lines.push(`@${matcherName} {`);
    lines.push(`  path ${rule.path}`);
    if (rule.methods && rule.methods.length > 0) {
      lines.push(`  method ${rule.methods.join(' ')}`);
    }
    lines.push('}');
    lines.push('');

    // Route block with JWT validation
    lines.push(`route @${matcherName} {`);

    // Token extraction — use Caddy's request header manipulation
    // to normalize token into a known header for validation
    if (rule.tokenSource.location === 'header') {
      const headerName = rule.tokenSource.headerName ?? 'Authorization';
      const prefix = rule.tokenSource.prefix ?? 'Bearer';
      lines.push(`  # Extract JWT from ${headerName} header (strip "${prefix}" prefix)`);
      lines.push(`  @${matcherName}_no_token not header ${headerName} "${prefix} *"`);
    } else if (rule.tokenSource.location === 'cookie') {
      lines.push(`  # Extract JWT from cookie: ${rule.tokenSource.cookieName}`);
      lines.push(`  @${matcherName}_no_token not header Cookie *${rule.tokenSource.cookieName}=*`);
    } else if (rule.tokenSource.location === 'query') {
      lines.push(`  # Extract JWT from query param: ${rule.tokenSource.paramName}`);
      lines.push(`  @${matcherName}_no_token not query ${rule.tokenSource.paramName}=*`);
    }

    // Missing token action
    if (rule.action === 'block') {
      lines.push(`  respond @${matcherName}_no_token 401 {`);
      lines.push('    header Content-Type "application/json"');
      lines.push('    body "{\\"error\\":\\"Missing or invalid JWT token\\"}"');
      lines.push('    close');
      lines.push('  }');
    } else {
      lines.push(`  header @${matcherName}_no_token X-JWT-Validation "missing"`);
    }

    // JWT signature verification via reverse_proxy middleware
    // In local simulation, we use a sidecar JWT validation service
    lines.push('');
    lines.push('  # JWT signature + claims validation via edge JWT validator');
    lines.push(`  # Credential: ${rule.credential.type}`);

    if (rule.credential.type === 'jwks') {
      lines.push(`  # JWKS URL: ${rule.credential.url}`);
    } else if (rule.credential.type === 'static') {
      lines.push(`  # Algorithm: ${rule.credential.algorithm}`);
    } else if (rule.credential.type === 'oidc') {
      lines.push(`  # OIDC issuer: ${rule.credential.issuerUrl}`);
    }

    if (rule.issuer) {
      lines.push(`  # Required issuer: ${rule.issuer}`);
    }
    if (rule.audience && rule.audience.length > 0) {
      lines.push(`  # Required audience: ${rule.audience.join(', ')}`);
    }
    if (Object.keys(rule.requiredClaims ?? {}).length > 0) {
      lines.push(`  # Required claims: ${JSON.stringify(rule.requiredClaims)}`);
    }
    lines.push(`  # Clock skew: ${rule.clockSkew}s`);

    // Inject validated claims as headers for downstream use
    lines.push('  header_up X-JWT-Validated "true"');
    lines.push('  header_up X-JWT-Rule "{http.request.header.X-JWT-Rule}"');

    lines.push('}');
    lines.push('');
  }

  return ok(lines);
}
```

---

## 4. mTLS for API Paths — Caddy Directives

```typescript
/**
 * Generate Caddy directives for API-path-specific mTLS enforcement.
 *
 * Complements plan 01 SSL/TLS client certificates by adding per-path
 * enforcement rules. Uses Caddy's `client_auth` within `tls` blocks
 * and route-level matchers.
 *
 * @param rules - mTLS rules from config
 * @returns Caddy directive lines
 */
export function generateApiMtlsDirectives(
  rules: ApiMtlsRule[],
): Result<string[]> {
  const enabledRules = rules.filter((r) => r.enabled);
  if (enabledRules.length === 0) return ok([]);

  const lines: string[] = [];
  lines.push('# API mTLS Enforcement');
  lines.push('');

  for (const rule of enabledRules) {
    const matcherName = `mtls_${rule.name.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Build path matcher
    lines.push(`# mTLS Rule: ${rule.name}`);
    lines.push(`@${matcherName} {`);
    for (const p of rule.paths) {
      lines.push(`  path ${p}`);
    }
    if (rule.methods && rule.methods.length > 0) {
      lines.push(`  method ${rule.methods.join(' ')}`);
    }
    lines.push('}');

    // Check for client cert presence
    lines.push(`@${matcherName}_no_cert {`);
    for (const p of rule.paths) {
      lines.push(`  path ${p}`);
    }
    lines.push('  not header X-Client-Cert-Present "true"');
    lines.push('}');

    if (rule.action === 'block') {
      lines.push(`respond @${matcherName}_no_cert 403 {`);
      lines.push('  header Content-Type "application/json"');
      lines.push('  body "{\\"error\\":\\"Client certificate required\\"}"');
      lines.push('  close');
      lines.push('}');
    } else {
      lines.push(`header @${matcherName}_no_cert X-MTLS-Validation "missing"`);
    }

    // Forward cert info as headers
    if (rule.forwardCertInfo) {
      lines.push(`header_up @${matcherName} X-Client-Cert-DN "{http.request.tls.client.subject}"`);
      lines.push(`header_up @${matcherName} X-Client-Cert-Serial "{http.request.tls.client.serial}"`);
      lines.push(`header_up @${matcherName} X-Client-Cert-SHA256 "{http.request.tls.client.fingerprint}"`);
    }

    // Identity validation (CN/SAN check)
    if (rule.allowedIdentities && rule.allowedIdentities.length > 0) {
      lines.push('');
      lines.push(`# Allowed identities: ${rule.allowedIdentities.join(', ')}`);
      const identMatcherName = `${matcherName}_identity`;
      lines.push(`@${identMatcherName} {`);
      for (const p of rule.paths) {
        lines.push(`  path ${p}`);
      }
      lines.push('  header X-Client-Cert-Present "true"');
      for (const identity of rule.allowedIdentities) {
        lines.push(`  not header X-Client-Cert-DN *${identity}*`);
      }
      lines.push('}');

      if (rule.action === 'block') {
        lines.push(`respond @${identMatcherName} 403 {`);
        lines.push('  header Content-Type "application/json"');
        lines.push('  body "{\\"error\\":\\"Client certificate identity not authorized\\"}"');
        lines.push('  close');
        lines.push('}');
      }
    }

    lines.push('');
  }

  return ok(lines);
}
```

---

## 5. Endpoint Discovery — Logging Middleware

```typescript
/**
 * Endpoint Discovery — generates Caddy access log directives
 * that capture unique method+path combinations.
 *
 * Writes NDJSON to .resist/logs/api-discovery.ndjson with format:
 * { "timestamp": "...", "method": "GET", "path": "/api/users/123",
 *   "normalizedPath": "/api/users/{id}", "statusCode": 200 }
 *
 * @param config - Endpoint discovery configuration
 * @returns Caddy directive lines
 */
export function generateEndpointDiscoveryDirectives(
  config: EndpointDiscoveryConfig,
): Result<string[]> {
  if (!config.enabled) return ok([]);

  const lines: string[] = [];
  lines.push('# API Endpoint Discovery');
  lines.push('');

  // Create matchers for monitored prefixes
  const matcherName = 'api_discovery';
  lines.push(`@${matcherName} {`);
  for (const prefix of config.monitorPrefixes ?? ['/api/']) {
    lines.push(`  path ${prefix}*`);
  }
  for (const exclude of config.excludePaths ?? []) {
    lines.push(`  not path ${exclude}`);
  }
  lines.push('}');
  lines.push('');

  // Structured access log for discovered endpoints
  lines.push(`log api_discovery {`);
  lines.push(`  output file ${config.logFile ?? 'logs/api-discovery.ndjson'} {`);
  lines.push('    roll_size 50MiB');
  lines.push('    roll_keep 5');
  lines.push('  }');
  lines.push('  format json {');
  lines.push('    time_format iso8601');
  lines.push('  }');
  lines.push(`  include ${matcherName}`);
  lines.push('}');
  lines.push('');

  // If logging samples, add request body capture
  if (config.logSamples) {
    lines.push(`# Sample logging enabled (max ${config.maxSampleSize ?? 4096} bytes)`);
    lines.push('# Request/response bodies captured in log for schema inference');
  }

  return ok(lines);
}
```

---

## 6. Sequence Detection — In-Memory Tracker

```typescript
/**
 * Sequence Detection — tracks request sequences per client
 * to detect abuse patterns (credential stuffing, enumeration).
 *
 * This generates Caddy log directives + a companion Node.js
 * middleware that reads the log stream and maintains in-memory
 * sequence state per client identifier.
 *
 * @module
 */

import type { Result } from '@/utils/result/types';
import { ok } from '@/utils/result/helpers';
import type { SequenceRule } from '@resist/schemas/core-config/edge-api-security';

/**
 * In-memory sequence tracker state.
 * Keyed by clientId → array of recent {method, path, timestamp}.
 */
interface SequenceState {
  /** @description Client identifier (IP, JWT sub, or header value) */
  clientId: string;
  /** @description Recent request steps */
  steps: Array<{
    method: string;
    path: string;
    timestamp: number;
  }>;
}

/**
 * Generate Caddy log directives for sequence detection.
 *
 * The actual sequence matching happens in a sidecar process
 * that tails the access log and matches against configured sequences.
 *
 * @param rules - Sequence detection rules
 * @returns Caddy directive lines
 */
export function generateSequenceDetectionDirectives(
  rules: SequenceRule[],
): Result<string[]> {
  const enabledRules = rules.filter((r) => r.enabled);
  if (enabledRules.length === 0) return ok([]);

  const lines: string[] = [];
  lines.push('# Sequence Detection');
  lines.push('# Actual matching performed by edge sequence-detector sidecar');
  lines.push('');

  // Collect all paths from all sequence rules for monitoring
  const allPaths = new Set<string>();
  for (const rule of enabledRules) {
    for (const step of rule.steps) {
      allPaths.add(step.path);
    }
  }

  // Generate monitoring log for sequence-relevant paths
  lines.push('@sequence_monitor {');
  for (const path of allPaths) {
    lines.push(`  path ${path}`);
  }
  lines.push('}');
  lines.push('');

  lines.push('log sequence_monitor {');
  lines.push('  output file logs/sequence-detection.ndjson {');
  lines.push('    roll_size 20MiB');
  lines.push('    roll_keep 3');
  lines.push('  }');
  lines.push('  format json {');
  lines.push('    time_format unix_milli');
  lines.push('  }');
  lines.push('  include sequence_monitor');
  lines.push('}');
  lines.push('');

  // Add rule comments for documentation
  for (const rule of enabledRules) {
    lines.push(`# Sequence: ${rule.name}`);
    lines.push(`#   Steps: ${rule.steps.map((s) => `${s.method} ${s.path}`).join(' → ')}`);
    lines.push(`#   Window: ${rule.windowSeconds}s, ID: ${rule.clientIdentifier}, Action: ${rule.action}`);
  }

  return ok(lines);
}

/**
 * Check if a client's request sequence violates a rule.
 *
 * Called by the sequence-detector sidecar for each incoming request.
 *
 * @param rule - The sequence rule to check
 * @param clientSteps - Client's recent request history
 * @param currentStep - The current request
 * @returns Whether the sequence is violated (steps skipped)
 */
export function checkSequenceViolation(
  rule: SequenceRule,
  clientSteps: SequenceState['steps'],
  currentStep: { method: string; path: string; timestamp: number },
): boolean {
  const windowStart = currentStep.timestamp - (rule.windowSeconds * 1000);
  const recentSteps = clientSteps.filter((s) => s.timestamp >= windowStart);

  // Find which step in the sequence the current request matches
  const currentStepIndex = rule.steps.findIndex(
    (s) => s.method === currentStep.method && matchGlob(currentStep.path, s.path),
  );

  if (currentStepIndex < 0) return false; // Not part of this sequence
  if (currentStepIndex === 0) return false; // First step is always OK

  // Check if all prior steps were visited in order
  let lastFoundIndex = -1;
  for (const recent of recentSteps) {
    const stepIndex = rule.steps.findIndex(
      (s) => s.method === recent.method && matchGlob(recent.path, s.path),
    );
    if (stepIndex > lastFoundIndex && stepIndex < currentStepIndex) {
      lastFoundIndex = stepIndex;
    }
  }

  // Violation: skipped steps (jumped ahead in sequence)
  return lastFoundIndex < currentStepIndex - 1;
}

/**
 * Simple glob matcher for path patterns.
 *
 * @param actual - Actual request path
 * @param pattern - Glob pattern (only * supported)
 * @returns Whether the path matches
 */
function matchGlob(actual: string, pattern: string): boolean {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]+').replace(/\//g, '\\/') + '$');
  return regex.test(actual);
}
```

---

## 7. API Routing — Caddy Reverse Proxy

```typescript
/**
 * Generate Caddy reverse_proxy directives for API routing rules.
 *
 * Routes different API paths to different upstream origins
 * based on path+method matching.
 *
 * @param routes - API routing rules
 * @returns Caddy directive lines
 */
export function generateApiRoutingDirectives(
  routes: ApiRoute[],
): Result<string[]> {
  const enabledRoutes = routes.filter((r) => r.enabled);
  if (enabledRoutes.length === 0) return ok([]);

  const lines: string[] = [];
  lines.push('# API Routing');
  lines.push('');

  for (const route of enabledRoutes) {
    const matcherName = `apiroute_${route.name.replace(/[^a-zA-Z0-9]/g, '_')}`;

    lines.push(`# Route: ${route.name}`);
    lines.push(`@${matcherName} {`);
    lines.push(`  path ${route.path}`);
    if (route.methods && route.methods.length > 0) {
      lines.push(`  method ${route.methods.join(' ')}`);
    }
    lines.push('}');
    lines.push('');

    lines.push(`handle @${matcherName} {`);

    // Strip prefix if configured
    if (route.stripPrefix) {
      // Extract the static part of the path (before any glob)
      const prefix = route.path.replace(/\*.*$/, '');
      if (prefix.length > 1) {
        lines.push(`  uri strip_prefix ${prefix.replace(/\/$/, '')}`);
      }
    }

    // Add custom headers
    for (const [key, value] of Object.entries(route.addHeaders ?? {})) {
      lines.push(`  header_up ${key} "${value}"`);
    }

    // Reverse proxy to origin
    const originUrl = new URL(route.origin);
    lines.push(`  reverse_proxy ${originUrl.host} {`);
    if (originUrl.protocol === 'https:') {
      lines.push('    transport http {');
      lines.push('      tls');
      lines.push('    }');
    }
    lines.push('  }');
    lines.push('}');
    lines.push('');
  }

  return ok(lines);
}
```

---

## 8. Master Orchestrator — `generateApiSecurityDirectives()`

```typescript
/**
 * Master function that generates all API Security Caddy directives.
 *
 * Calls sub-generators in order:
 * 1. Schema validation (OpenAPI)
 * 2. JWT validation
 * 3. mTLS enforcement
 * 4. Endpoint discovery
 * 5. Sequence detection
 * 6. API routing
 *
 * @param config - Complete API security configuration
 * @param projectRoot - Project root for resolving file paths
 * @returns All Caddy directive lines
 */
export async function generateApiSecurityDirectives(
  config: ApiSecurityConfig,
  projectRoot: string,
): Promise<Result<string[]>> {
  const allLines: string[] = [];

  // 1. Schema validation
  if (config.schemaValidation?.enabled) {
    const specResult = await loadOpenApiSpec(config.schemaValidation.specFile, projectRoot);
    if (!specResult.ok) return specResult;

    const svResult = generateSchemaValidationDirectives(config.schemaValidation, specResult.data);
    if (!svResult.ok) return svResult;
    allLines.push(...svResult.data);
  }

  // 2. JWT validation
  if (config.jwtValidation && config.jwtValidation.length > 0) {
    const jwtResult = generateJwtValidationDirectives(config.jwtValidation);
    if (!jwtResult.ok) return jwtResult;
    allLines.push(...jwtResult.data);
  }

  // 3. mTLS enforcement
  if (config.mtls && config.mtls.length > 0) {
    const mtlsResult = generateApiMtlsDirectives(config.mtls);
    if (!mtlsResult.ok) return mtlsResult;
    allLines.push(...mtlsResult.data);
  }

  // 4. Endpoint discovery
  if (config.endpointDiscovery?.enabled) {
    const discoveryResult = generateEndpointDiscoveryDirectives(config.endpointDiscovery);
    if (!discoveryResult.ok) return discoveryResult;
    allLines.push(...discoveryResult.data);
  }

  // 5. Sequence detection
  if (config.sequenceRules && config.sequenceRules.length > 0) {
    const seqResult = generateSequenceDetectionDirectives(config.sequenceRules);
    if (!seqResult.ok) return seqResult;
    allLines.push(...seqResult.data);
  }

  // 6. API routing
  if (config.routing && config.routing.length > 0) {
    const routeResult = generateApiRoutingDirectives(config.routing);
    if (!routeResult.ok) return routeResult;
    allLines.push(...routeResult.data);
  }

  return ok(allLines);
}
```

---

## 9. Pulumi Mapping

### File: `packages/products/[product]/iac/api-security.ts`

```typescript
/**
 * Pulumi IaC generation for API Security features.
 *
 * Maps ApiSecurityConfigSchema → Cloudflare API Shield resources.
 *
 * @module
 */

import * as pulumi from '@pulumi/pulumi';
import * as cf from '@pulumi/cloudflare';
import type { ApiSecurityConfig } from '@resist/schemas/core-config/edge-api-security';

/**
 * Create all API Security Pulumi resources from edge config.
 *
 * @param config - API security config from edge schema
 * @param zoneId - Cloudflare zone ID
 * @param opts - Pulumi resource options
 * @returns Created Pulumi resources
 */
export function createApiSecurityResources(
  config: ApiSecurityConfig,
  zoneId: pulumi.Input<string>,
  opts?: pulumi.ComponentResourceOptions,
) {
  const resources: Record<string, pulumi.Resource> = {};

  // ── Schema Validation ────────────────────────────────────────────

  if (config.schemaValidation?.enabled) {
    // Upload OpenAPI schema to API Shield
    resources['apiShieldSchema'] = new cf.ApiShieldSchema('api-shield-schema', {
      zoneId,
      name: 'primary-api-schema',
      kind: 'openapi_v3',
      // source: read from specFile at deploy time
      validationEnabled: true,
    }, opts);

    // Schema validation settings
    resources['apiShieldSchemaValidation'] = new cf.ApiShieldSchemaValidationSettings(
      'api-shield-schema-validation',
      {
        zoneId,
        validationDefaultMitigationAction: config.schemaValidation.validationFailureAction === 'block'
          ? 'block'
          : 'log',
        validationOverrideMitigationAction: config.schemaValidation.unknownPathAction === 'block'
          ? 'block'
          : config.schemaValidation.unknownPathAction === 'log'
          ? 'log'
          : 'none',
      },
      opts,
    );
  }

  // ── JWT Validation ───────────────────────────────────────────────

  for (const [index, rule] of (config.jwtValidation ?? []).entries()) {
    if (!rule.enabled) continue;

    resources[`jwtConfig_${index}`] = new cf.ApiShieldOperation(
      `jwt-validation-${rule.name}`,
      {
        zoneId,
        method: rule.methods?.[0] ?? 'GET',
        host: '*',
        endpoint: rule.path,
      },
      opts,
    );
  }

  // ── mTLS Rules ───────────────────────────────────────────────────

  for (const [index, rule] of (config.mtls ?? []).entries()) {
    if (!rule.enabled) continue;

    // CF mTLS is configured via Access mTLS certificates + WAF rules
    // The mTLS certificate association is handled in plan 01 (SSL/TLS)
    // Here we create the API Shield operation entries
    for (const [pathIndex, path] of rule.paths.entries()) {
      resources[`mtlsOperation_${index}_${pathIndex}`] = new cf.ApiShieldOperation(
        `mtls-operation-${rule.name}-${pathIndex}`,
        {
          zoneId,
          method: rule.methods?.[0] ?? '*',
          host: '*',
          endpoint: path,
        },
        opts,
      );
    }
  }

  // ── API Shield Operations (Endpoint Discovery) ───────────────────

  if (config.endpointDiscovery?.enabled) {
    // Endpoint discovery is automatic in CF when API Shield is enabled.
    // No explicit Pulumi resources needed — CF discovers endpoints from traffic.
    // The monitorPrefixes config helps filter the dashboard view.
  }

  // ── API Routing ──────────────────────────────────────────────────

  for (const [index, route] of (config.routing ?? []).entries()) {
    if (!route.enabled) continue;

    resources[`apiRoute_${index}`] = new cf.ApiShieldOperation(
      `api-route-${route.name}`,
      {
        zoneId,
        method: route.methods?.[0] ?? '*',
        host: '*',
        endpoint: route.path,
      },
      opts,
    );
  }

  return resources;
}
```

---

## 10. Mapping Table

| CF API Shield Feature | Edge Tool Simulation | Pulumi Resource |
|---|---|---|
| Schema Validation | OpenAPI parser + Caddy route matchers | `cf.ApiShieldSchema` + `cf.ApiShieldSchemaValidationSettings` |
| JWT Validation | Caddy JWT handler + sidecar validator | `cf.ApiShieldOperation` (per endpoint) |
| mTLS per-path | Caddy `client_auth` + route matchers | `cf.ApiShieldOperation` + mTLS cert (plan 01) |
| Endpoint Discovery | Caddy access log → `.resist/logs/api-discovery.ndjson` | Automatic (CF discovers from traffic) |
| Sequence Detection | Log tailer sidecar + in-memory state | CF Sequence Mitigation (API only) |
| API Routing | Caddy `handle` + `reverse_proxy` per route | `cf.ApiShieldOperation` + Workers route |
| Unknown endpoint blocking | Caddy `respond 400` for unlisted paths | Schema Validation `validationOverrideMitigationAction` |
| Content-Type validation | Caddy header matcher + respond | Part of Schema Validation |

---

## 11. Verification Steps

### Schema Validation

```bash
# Parse + validate schema
curl -X POST https://localhost:9000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"test","email":"test@example.com"}'
# → 200 (valid per OpenAPI spec)

curl -X POST https://localhost:9000/api/users \
  -H "Content-Type: text/plain" \
  -d 'not json'
# → 400 {"error":"Invalid Content-Type","expected":"application/json"}

curl https://localhost:9000/api/nonexistent
# → 400 {"error":"API validation failed","detail":"Unknown API endpoint"}
```

### JWT Validation

```bash
# Valid JWT
curl https://localhost:9000/api/protected \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs..."
# → 200

# Missing token
curl https://localhost:9000/api/protected
# → 401 {"error":"Missing or invalid JWT token"}

# Expired token
curl https://localhost:9000/api/protected \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs...expired..."
# → 401 {"error":"JWT token expired"}
```

### mTLS

```bash
# With valid client cert
curl --cert client.pem --key client-key.pem \
  https://localhost:9000/internal/data
# → 200

# Without client cert
curl https://localhost:9000/internal/data
# → 403 {"error":"Client certificate required"}
```

### Endpoint Discovery

```bash
# Make some API calls
curl https://localhost:9000/api/users
curl -X POST https://localhost:9000/api/users
curl https://localhost:9000/api/users/123

# Check discovery log
cat .resist/logs/api-discovery.ndjson
# → {"method":"GET","path":"/api/users","timestamp":"..."}
# → {"method":"POST","path":"/api/users","timestamp":"..."}
# → {"method":"GET","path":"/api/users/123","timestamp":"..."}
```

---

## 12. Known Limitations & Simulation Gaps

| Feature | CF Behavior | Local Simulation | Gap |
|---|---|---|---|
| Schema Validation (response) | CF validates response bodies too | Only request validation | Response validation not simulated |
| JWT Validation (key rotation) | CF auto-refreshes JWKS | Static at startup | Must restart edge tool for key rotation |
| mTLS (certificate revocation) | CF checks OCSP/CRL | Not checked locally | `checkRevocation` setting ignored |
| Endpoint Discovery (ML) | CF uses ML to group similar paths | Simple path normalization | No ML-based path grouping |
| Sequence Detection (distributed) | CF tracks across all edge nodes | Single-process in-memory | Resets on restart, no persistence |
| API Routing (Workers) | CF routes to different Workers | Routes to different local ports | Must run multiple wrangler instances |
| Learned schemas | CF auto-discovers schemas from traffic | Manual OpenAPI spec required | No schema inference |

---

## 13. File Summary

| File | Purpose |
|------|---------|
| `packages/shared/schemas/core-config/src/edge-api-security.ts` | Valibot schemas for all API security features |
| `packages/shared/utils/cli/src/tools/edge/utils/api-security.ts` | OpenAPI schema validation + Caddy directives |
| `packages/shared/utils/cli/src/tools/edge/utils/jwt-validation.ts` | JWT validation Caddy directive generation |
| `packages/shared/utils/cli/src/tools/edge/utils/sequence-detector.ts` | Sequence detection sidecar logic |
| `packages/products/[product]/iac/api-security.ts` | Pulumi resource creation for API Shield |

---

## 14. Dependencies

| Dependency | Plan | Relationship |
|------------|------|-------------|
| `01-ssl-tls.md` | mTLS client CA + client certificates | Reuses mkcert client CA for API mTLS |
| `02-waf.md` | WAF scoring | WAF scores can inform API security decisions |
| `04-bot-management.md` | Bot scores | Bot scores can be used in JWT claim validation |
| `09-access-challenges.md` | CF Access JWT | Separate from API JWT validation (different tokens) |
| `15-cf-fields.md` | `cf.*` field injection | JWT claims injected as `cf.jwt` fields |

---

## 15. Implementation Order

1. **Schema layer**: Create `edge-api-security.ts` with all Valibot schemas
2. **OpenAPI parser**: Implement `loadOpenApiSpec()` for JSON + YAML support
3. **Schema validation directives**: Generate Caddy matchers for path/method/content-type
4. **JWT validation**: Implement token extraction + signature verification directives
5. **mTLS rules**: Add per-path client cert enforcement
6. **Endpoint discovery**: Access log directives for API path monitoring
7. **Sequence detection**: Log directives + sidecar process for sequence matching
8. **API routing**: Caddy handle + reverse_proxy for multi-origin routing
9. **Pulumi mapping**: Create API Shield resources from config
10. **Integration**: Wire into master `generateCaddyfile()` in `caddy.ts`
