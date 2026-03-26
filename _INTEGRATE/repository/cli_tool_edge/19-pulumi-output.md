# 19 — Pulumi Output: IaC Generation from Edge Config

## Context

The edge tool has a dual-target architecture: the same Valibot config schema drives both **local Caddy simulation** and **production Cloudflare infrastructure via Pulumi**. This plan covers the Pulumi IaC generation layer — a code generator that reads the complete edge config and produces a Pulumi TypeScript program that creates/manages all corresponding Cloudflare resources.

### Dual-Target Flow

```
resist.config.ts → EdgeConfigSchema (Valibot)
    │
    ├── Local Dev: edge tool → Caddy + companion services
    │
    └── Production: pulumi generator → Pulumi program → Cloudflare API
```

### What Gets Generated

The Pulumi generator produces a complete IaC program that manages:
- Zone creation + settings
- DNS records (all types)
- SSL/TLS settings
- WAF managed rulesets + custom rules
- Rate limiting rules
- Bot management configuration
- IP access rules
- Page rules (legacy) + ruleset rules (modern)
- Transform rules (URL rewrite, headers)
- Redirect rules
- Origin rules
- Cache rules
- Load balancers + pools + monitors
- Access applications + policies
- Notification policies
- Email routing rules + addresses
- Worker routes
- Page Shield policies

### Generation Strategy

The generator does NOT produce raw Cloudflare API calls. Instead, it generates a Pulumi TypeScript program using `@pulumi/cloudflare` that:

1. **Reads** the edge config from `resist.config.ts`
2. **Validates** it against the same Valibot schemas
3. **Creates** Pulumi resources for each configured feature
4. **Exports** resource IDs and URLs for use by other stacks

This means the generated code is:
- Type-safe (TypeScript + Pulumi types)
- Declarative (Pulumi handles create/update/delete)
- Diffable (`pulumi preview` shows changes before applying)
- Rollbackable (Pulumi state tracks history)

---

## Documentation Links

- Pulumi Cloudflare provider: https://www.pulumi.com/registry/packages/cloudflare/
- Pulumi Cloudflare API docs: https://www.pulumi.com/registry/packages/cloudflare/api-docs/
- Zone: https://www.pulumi.com/registry/packages/cloudflare/api-docs/zone/
- ZoneSettingsOverride: https://www.pulumi.com/registry/packages/cloudflare/api-docs/zonesettingsoverride/
- Record: https://www.pulumi.com/registry/packages/cloudflare/api-docs/record/
- Ruleset: https://www.pulumi.com/registry/packages/cloudflare/api-docs/ruleset/
- RateLimit: https://www.pulumi.com/registry/packages/cloudflare/api-docs/ratelimit/
- AccessApplication: https://www.pulumi.com/registry/packages/cloudflare/api-docs/accessapplication/
- LoadBalancer: https://www.pulumi.com/registry/packages/cloudflare/api-docs/loadbalancer/
- NotificationPolicy: https://www.pulumi.com/registry/packages/cloudflare/api-docs/notificationpolicy/
- Pulumi ComponentResource: https://www.pulumi.com/docs/concepts/resources/components/
- Pulumi Stack References: https://www.pulumi.com/docs/concepts/stack/#stackreferences

---

## 1. Valibot Schema: `PulumiOutputConfigSchema`

### File: `packages/shared/schemas/core-config/src/edge-pulumi.ts`

```typescript
/**
 * Pulumi Output Configuration Schema
 *
 * Controls how the edge config is translated to Pulumi IaC.
 * This schema wraps the generation settings, not the edge features
 * themselves (those come from their respective schemas).
 *
 * @module
 */

import * as v from 'valibot';

// ─── Stack Configuration ─────────────────────────────────────────────────────

/**
 * Schema for Pulumi stack configuration.
 */
export const PulumiStackConfigSchema = v.strictObject({
  /** @description Pulumi project name */
  projectName: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  /** @description Pulumi stack name (e.g., 'production', 'staging') */
  stackName: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  /** @description Cloudflare account ID (from Infisical or env) */
  accountId: v.optional(v.pipe(v.string(), v.minLength(1))),
  /** @description Cloudflare API token secret name in Infisical */
  apiTokenSecret: v.optional(v.pipe(v.string(), v.minLength(1)), 'cloudflare/api-token'),
});
export type PulumiStackConfig = v.InferOutput<typeof PulumiStackConfigSchema>;

// ─── Generation Options ──────────────────────────────────────────────────────

/**
 * Schema for Pulumi code generation options.
 */
export const PulumiGenerationOptionsSchema = v.strictObject({
  /** @description Output directory for generated Pulumi program (relative to product/iac/) */
  outputDir: v.optional(v.pipe(v.string(), v.minLength(1)), 'edge'),
  /** @description Whether to generate a standalone program or a ComponentResource */
  mode: v.optional(v.picklist(['standalone', 'component']), 'component'),
  /** @description Whether to include comments in generated code */
  includeComments: v.optional(v.boolean(), true),
  /** @description Whether to generate Pulumi stack outputs */
  generateOutputs: v.optional(v.boolean(), true),
  /** @description Features to skip in generation (useful for gradual migration) */
  skipFeatures: v.optional(v.array(v.picklist([
    'dns', 'ssl', 'waf', 'rateLimit', 'bot', 'ipFirewall',
    'cache', 'performance', 'rules', 'access', 'loadBalancing',
    'email', 'analytics', 'media', 'apiSecurity', 'notifications',
    'clientSecurity',
  ])), []),
  /** @description Whether to use `protect` on critical resources (prevents accidental deletion) */
  protectCriticalResources: v.optional(v.boolean(), true),
  /** @description Resource name prefix for multi-product accounts */
  resourcePrefix: v.optional(v.pipe(v.string(), v.minLength(1))),
});
export type PulumiGenerationOptions = v.InferOutput<typeof PulumiGenerationOptionsSchema>;

// ─── Top-Level Pulumi Output Config ──────────────────────────────────────────

/**
 * Complete Pulumi output configuration.
 *
 * @example
 * ```typescript
 * const config: PulumiOutputConfig = {
 *   stack: {
 *     projectName: 'myapp-edge',
 *     stackName: 'production',
 *     apiTokenSecret: 'cloudflare/api-token',
 *   },
 *   generation: {
 *     mode: 'component',
 *     protectCriticalResources: true,
 *   },
 * };
 * ```
 */
export const PulumiOutputConfigSchema = v.strictObject({
  /** @description Pulumi stack settings */
  stack: PulumiStackConfigSchema,
  /** @description Code generation options */
  generation: v.optional(PulumiGenerationOptionsSchema),
});
export type PulumiOutputConfig = v.InferOutput<typeof PulumiOutputConfigSchema>;
```

---

## 2. Generator Architecture

### File: `packages/shared/utils/cli/src/tools/edge/utils/pulumi-generator.ts`

The generator follows this structure:

```
pulumi-generator.ts (orchestrator)
    │
    ├── generatePulumiProgram()     → writes index.ts (entry point)
    ├── generateZoneModule()        → writes zone.ts
    ├── generateDnsModule()         → writes dns.ts
    ├── generateSslModule()         → writes ssl.ts
    ├── generateWafModule()         → writes waf.ts
    ├── generateRateLimitModule()   → writes rate-limit.ts
    ├── generateBotModule()         → writes bot.ts
    ├── generateIpFirewallModule()  → writes ip-firewall.ts
    ├── generateCacheModule()       → writes cache.ts
    ├── generatePerformanceModule() → writes performance.ts
    ├── generateRulesModule()       → writes rules.ts
    ├── generateAccessModule()      → writes access.ts
    ├── generateLoadBalancerModule()→ writes load-balancer.ts
    ├── generateEmailModule()       → writes email.ts
    ├── generateAnalyticsModule()   → writes analytics.ts
    ├── generateApiSecurityModule() → writes api-security.ts
    ├── generateNotificationsModule()→ writes notifications.ts
    ├── generateClientSecurityModule()→ writes client-security.ts
    └── generateStackOutputs()      → appends exports to index.ts
```

```typescript
/**
 * Pulumi IaC Generator — Orchestrator
 *
 * Reads the complete edge config and generates a Pulumi TypeScript
 * program that creates all corresponding Cloudflare resources.
 *
 * @module
 */

import * as v from 'valibot';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/utils/result/types';
import { ok, err } from '@/utils/result/helpers';
import type { PulumiOutputConfig, PulumiGenerationOptions } from '@resist/schemas/core-config/edge-pulumi';

/**
 * Edge config type — union of all feature configs.
 * In practice, this is the full EdgeConfigSchema output.
 */
interface EdgeConfig {
  dns?: unknown;
  ssl?: unknown;
  waf?: unknown;
  rateLimit?: unknown;
  bot?: unknown;
  ipFirewall?: unknown;
  cache?: unknown;
  performance?: unknown;
  rules?: unknown;
  access?: unknown;
  loadBalancing?: unknown;
  email?: unknown;
  analytics?: unknown;
  media?: unknown;
  apiSecurity?: unknown;
  notifications?: unknown;
  clientSecurity?: unknown;
  cfFields?: unknown;
  pulumi?: PulumiOutputConfig;
}

/**
 * Generate a complete Pulumi program from edge config.
 *
 * @param edgeConfig - Complete edge configuration
 * @param productRoot - Path to product root (e.g., packages/products/myapp/)
 * @returns List of generated file paths
 */
export async function generatePulumiProgram(
  edgeConfig: EdgeConfig,
  productRoot: string,
): Promise<Result<string[]>> {
  const pulumiConfig = edgeConfig.pulumi;
  if (!pulumiConfig) {
    return err('No pulumi configuration found in edge config');
  }

  const generation = pulumiConfig.generation ?? {};
  const outputDir = resolve(productRoot, 'iac', generation.outputDir ?? 'edge');
  const skipFeatures = new Set(generation.skipFeatures ?? []);
  const prefix = generation.resourcePrefix ?? '';
  const protect = generation.protectCriticalResources ?? true;
  const comments = generation.includeComments ?? true;

  // Create output directory
  try {
    await mkdir(outputDir, { recursive: true });
  } catch {
    return err(`Failed to create output directory: ${outputDir}`);
  }

  const generatedFiles: string[] = [];

  // ── Generate entry point (index.ts) ────────────────────────────

  const indexLines: string[] = [];
  indexLines.push(fileHeader('Edge Infrastructure — Pulumi Entry Point', comments));
  indexLines.push('');
  indexLines.push("import * as pulumi from '@pulumi/pulumi';");
  indexLines.push("import * as cf from '@pulumi/cloudflare';");
  indexLines.push('');

  // Stack config
  indexLines.push('// ── Stack Configuration ──────────────────────────────────────');
  indexLines.push(`const config = new pulumi.Config();`);
  indexLines.push(`const accountId = config.require('accountId');`);
  indexLines.push('');

  // Zone resource
  indexLines.push('// ── Zone ────────────────────────────────────────────────────');
  indexLines.push(`const zone = new cf.Zone('${prefix}zone', {`);
  indexLines.push(`  accountId,`);
  indexLines.push(`  zone: config.require('domain'),`);
  indexLines.push(`  plan: config.get('plan') ?? 'free',`);
  if (protect) {
    indexLines.push('}, { protect: true });');
  } else {
    indexLines.push('});');
  }
  indexLines.push('');
  indexLines.push('const zoneId = zone.id;');
  indexLines.push('');

  // Feature modules
  const featureModules = [
    { key: 'dns', module: 'dns', fn: 'createDnsResources' },
    { key: 'ssl', module: 'ssl', fn: 'createSslResources' },
    { key: 'waf', module: 'waf', fn: 'createWafResources' },
    { key: 'rateLimit', module: 'rate-limit', fn: 'createRateLimitResources' },
    { key: 'bot', module: 'bot', fn: 'createBotResources' },
    { key: 'ipFirewall', module: 'ip-firewall', fn: 'createIpFirewallResources' },
    { key: 'cache', module: 'cache', fn: 'createCacheResources' },
    { key: 'performance', module: 'performance', fn: 'createPerformanceResources' },
    { key: 'rules', module: 'rules', fn: 'createRulesResources' },
    { key: 'access', module: 'access', fn: 'createAccessResources' },
    { key: 'loadBalancing', module: 'load-balancer', fn: 'createLoadBalancerResources' },
    { key: 'email', module: 'email', fn: 'createEmailResources' },
    { key: 'analytics', module: 'analytics', fn: 'createAnalyticsResources' },
    { key: 'apiSecurity', module: 'api-security', fn: 'createApiSecurityResources' },
    { key: 'notifications', module: 'notifications', fn: 'createNotificationResources' },
    { key: 'clientSecurity', module: 'client-security', fn: 'createClientSecurityResources' },
  ];

  for (const feat of featureModules) {
    if (skipFeatures.has(feat.key)) {
      if (comments) {
        indexLines.push(`// Skipped: ${feat.key} (in skipFeatures)`);
      }
      continue;
    }

    if (edgeConfig[feat.key as keyof EdgeConfig]) {
      indexLines.push(`import { ${feat.fn} } from './${feat.module}';`);
    }
  }

  indexLines.push('');
  indexLines.push('// ── Create Resources ─────────────────────────────────────────');
  indexLines.push('');

  for (const feat of featureModules) {
    if (skipFeatures.has(feat.key)) continue;
    if (!edgeConfig[feat.key as keyof EdgeConfig]) continue;

    const configVar = `edgeConfig.${feat.key}`;
    if (feat.key === 'notifications') {
      indexLines.push(`const ${feat.key}Resources = ${feat.fn}(${configVar}, accountId);`);
    } else {
      indexLines.push(`const ${feat.key}Resources = ${feat.fn}(${configVar}, zoneId);`);
    }
  }

  // Stack outputs
  if (generation.generateOutputs) {
    indexLines.push('');
    indexLines.push('// ── Stack Outputs ────────────────────────────────────────────');
    indexLines.push('export const zoneIdOutput = zone.id;');
    indexLines.push("export const zoneName = zone.zone;");
    indexLines.push('export const nameServers = zone.nameServers;');
  }

  const indexPath = join(outputDir, 'index.ts');
  await writeFile(indexPath, indexLines.join('\n'), 'utf-8');
  generatedFiles.push(indexPath);

  // ── Generate feature modules ───────────────────────────────────

  // DNS module
  if (!skipFeatures.has('dns') && edgeConfig.dns) {
    const dnsPath = join(outputDir, 'dns.ts');
    await writeFile(dnsPath, generateDnsModule(comments, prefix, protect), 'utf-8');
    generatedFiles.push(dnsPath);
  }

  // SSL module
  if (!skipFeatures.has('ssl') && edgeConfig.ssl) {
    const sslPath = join(outputDir, 'ssl.ts');
    await writeFile(sslPath, generateSslModule(comments, prefix), 'utf-8');
    generatedFiles.push(sslPath);
  }

  // WAF module
  if (!skipFeatures.has('waf') && edgeConfig.waf) {
    const wafPath = join(outputDir, 'waf.ts');
    await writeFile(wafPath, generateWafModule(comments, prefix), 'utf-8');
    generatedFiles.push(wafPath);
  }

  // Rate limit module
  if (!skipFeatures.has('rateLimit') && edgeConfig.rateLimit) {
    const rlPath = join(outputDir, 'rate-limit.ts');
    await writeFile(rlPath, generateRateLimitModule(comments, prefix), 'utf-8');
    generatedFiles.push(rlPath);
  }

  // Bot management module
  if (!skipFeatures.has('bot') && edgeConfig.bot) {
    const botPath = join(outputDir, 'bot.ts');
    await writeFile(botPath, generateBotModule(comments, prefix), 'utf-8');
    generatedFiles.push(botPath);
  }

  // IP firewall module
  if (!skipFeatures.has('ipFirewall') && edgeConfig.ipFirewall) {
    const fwPath = join(outputDir, 'ip-firewall.ts');
    await writeFile(fwPath, generateIpFirewallModule(comments, prefix), 'utf-8');
    generatedFiles.push(fwPath);
  }

  // Cache module
  if (!skipFeatures.has('cache') && edgeConfig.cache) {
    const cachePath = join(outputDir, 'cache.ts');
    await writeFile(cachePath, generateCacheModule(comments, prefix), 'utf-8');
    generatedFiles.push(cachePath);
  }

  // Performance module
  if (!skipFeatures.has('performance') && edgeConfig.performance) {
    const perfPath = join(outputDir, 'performance.ts');
    await writeFile(perfPath, generatePerformanceModule(comments, prefix), 'utf-8');
    generatedFiles.push(perfPath);
  }

  // Rules engine module
  if (!skipFeatures.has('rules') && edgeConfig.rules) {
    const rulesPath = join(outputDir, 'rules.ts');
    await writeFile(rulesPath, generateRulesModule(comments, prefix), 'utf-8');
    generatedFiles.push(rulesPath);
  }

  // Access module
  if (!skipFeatures.has('access') && edgeConfig.access) {
    const accessPath = join(outputDir, 'access.ts');
    await writeFile(accessPath, generateAccessModule(comments, prefix), 'utf-8');
    generatedFiles.push(accessPath);
  }

  // Load balancer module
  if (!skipFeatures.has('loadBalancing') && edgeConfig.loadBalancing) {
    const lbPath = join(outputDir, 'load-balancer.ts');
    await writeFile(lbPath, generateLoadBalancerModule(comments, prefix), 'utf-8');
    generatedFiles.push(lbPath);
  }

  // Email module
  if (!skipFeatures.has('email') && edgeConfig.email) {
    const emailPath = join(outputDir, 'email.ts');
    await writeFile(emailPath, generateEmailModule(comments, prefix), 'utf-8');
    generatedFiles.push(emailPath);
  }

  // Analytics module
  if (!skipFeatures.has('analytics') && edgeConfig.analytics) {
    const analyticsPath = join(outputDir, 'analytics.ts');
    await writeFile(analyticsPath, generateAnalyticsModule(comments, prefix), 'utf-8');
    generatedFiles.push(analyticsPath);
  }

  // API security module
  if (!skipFeatures.has('apiSecurity') && edgeConfig.apiSecurity) {
    const apiPath = join(outputDir, 'api-security.ts');
    await writeFile(apiPath, generateApiSecurityModule(comments, prefix), 'utf-8');
    generatedFiles.push(apiPath);
  }

  // Notifications module
  if (!skipFeatures.has('notifications') && edgeConfig.notifications) {
    const notifPath = join(outputDir, 'notifications.ts');
    await writeFile(notifPath, generateNotificationsModule(comments, prefix), 'utf-8');
    generatedFiles.push(notifPath);
  }

  // Client security module
  if (!skipFeatures.has('clientSecurity') && edgeConfig.clientSecurity) {
    const csPath = join(outputDir, 'client-security.ts');
    await writeFile(csPath, generateClientSecurityModule(comments, prefix), 'utf-8');
    generatedFiles.push(csPath);
  }

  // ── Generate Pulumi.yaml ───────────────────────────────────────

  const pulumiYaml = [
    `name: ${pulumiConfig.stack.projectName}`,
    'runtime: nodejs',
    'description: Edge infrastructure managed by resist.js edge tool',
  ].join('\n');

  const yamlPath = join(outputDir, 'Pulumi.yaml');
  await writeFile(yamlPath, pulumiYaml, 'utf-8');
  generatedFiles.push(yamlPath);

  // ── Generate Pulumi.<stack>.yaml ───────────────────────────────

  const stackYaml = [
    `config:`,
    `  accountId: \${CLOUDFLARE_ACCOUNT_ID}`,
    `  domain: \${DOMAIN}`,
  ].join('\n');

  const stackYamlPath = join(outputDir, `Pulumi.${pulumiConfig.stack.stackName}.yaml`);
  await writeFile(stackYamlPath, stackYaml, 'utf-8');
  generatedFiles.push(stackYamlPath);

  return ok(generatedFiles);
}

// ─── Module Generators ───────────────────────────────────────────────────────

/**
 * Generate file header comment.
 *
 * @param title - Module title
 * @param include - Whether to include the header
 * @returns Header string
 */
function fileHeader(title: string, include: boolean): string {
  if (!include) return '';
  return [
    '/**',
    ` * ${title}`,
    ' *',
    ' * Auto-generated by resist.js edge tool from resist.config.ts.',
    ' * Do not edit manually — changes will be overwritten.',
    ' *',
    ' * @module',
    ' */',
  ].join('\n');
}
```

---

## 3. Feature Module Generator — DNS Example

Each feature module generator produces a TypeScript file that exports a `create*Resources()` function. Here's the DNS module as a reference for the pattern all modules follow:

```typescript
/**
 * Generate the DNS Pulumi module.
 *
 * @param comments - Whether to include comments
 * @param prefix - Resource name prefix
 * @param protect - Whether to protect critical resources
 * @returns TypeScript module source
 */
function generateDnsModule(comments: boolean, prefix: string, protect: boolean): string {
  const lines: string[] = [];
  lines.push(fileHeader('DNS Records — Pulumi Resources', comments));
  lines.push('');
  lines.push("import * as pulumi from '@pulumi/pulumi';");
  lines.push("import * as cf from '@pulumi/cloudflare';");
  lines.push("import type { DnsConfig } from '@resist/schemas/core-config/edge-dns';");
  lines.push('');

  if (comments) {
    lines.push('/**');
    lines.push(' * Create all DNS record resources from edge config.');
    lines.push(' *');
    lines.push(' * @param config - DNS configuration from edge schema');
    lines.push(' * @param zoneId - Cloudflare zone ID');
    lines.push(' * @param opts - Pulumi resource options');
    lines.push(' * @returns Created DNS record resources');
    lines.push(' */');
  }

  lines.push('export function createDnsResources(');
  lines.push('  config: DnsConfig,');
  lines.push('  zoneId: pulumi.Input<string>,');
  lines.push('  opts?: pulumi.ComponentResourceOptions,');
  lines.push(') {');
  lines.push('  const resources: Record<string, cf.Record> = {};');
  lines.push('');
  lines.push('  for (const [index, record] of (config.records ?? []).entries()) {');
  lines.push(`    const name = \`${prefix}dns-\${record.type.toLowerCase()}-\${record.name}-\${index}\`;`);
  lines.push('');
  lines.push("    resources[name] = new cf.Record(name, {");
  lines.push('      zoneId,');
  lines.push('      name: record.name,');
  lines.push('      type: record.type,');
  lines.push("      value: 'value' in record ? record.value : undefined,");
  lines.push("      ttl: record.ttl ?? 1, // 1 = automatic");
  lines.push("      proxied: 'proxied' in record ? record.proxied : undefined,");
  lines.push("      priority: 'priority' in record ? record.priority : undefined,");

  if (protect) {
    lines.push('    }, { ...opts, protect: true });');
  } else {
    lines.push('    }, opts);');
  }

  lines.push('  }');
  lines.push('');
  lines.push('  return resources;');
  lines.push('}');

  return lines.join('\n');
}
```

---

## 4. Feature Module Generator — WAF Example

```typescript
/**
 * Generate the WAF Pulumi module.
 *
 * @param comments - Whether to include comments
 * @param prefix - Resource name prefix
 * @returns TypeScript module source
 */
function generateWafModule(comments: string, prefix: string): string {
  const lines: string[] = [];
  lines.push(fileHeader('WAF — Pulumi Resources', comments));
  lines.push('');
  lines.push("import * as pulumi from '@pulumi/pulumi';");
  lines.push("import * as cf from '@pulumi/cloudflare';");
  lines.push("import type { WafConfig } from '@resist/schemas/core-config/edge-security';");
  lines.push('');

  if (comments) {
    lines.push('/**');
    lines.push(' * Create WAF resources: managed rulesets, custom rules, rate limit rulesets.');
    lines.push(' */');
  }

  lines.push('export function createWafResources(');
  lines.push('  config: WafConfig,');
  lines.push('  zoneId: pulumi.Input<string>,');
  lines.push('  opts?: pulumi.ComponentResourceOptions,');
  lines.push(') {');
  lines.push('  const resources: Record<string, pulumi.Resource> = {};');
  lines.push('');

  // OWASP managed ruleset
  lines.push('  // ── OWASP Managed Ruleset ──────────────────────────────────');
  lines.push("  if (config.owaspCrs?.enabled) {");
  lines.push(`    resources['owaspRuleset'] = new cf.Ruleset('${prefix}owasp-managed', {`);
  lines.push('      zoneId,');
  lines.push("      name: 'OWASP managed ruleset',");
  lines.push("      kind: 'zone',");
  lines.push("      phase: 'http_request_firewall_managed',");
  lines.push('      rules: [{');
  lines.push("        actionParameters: {");
  lines.push("          id: 'efb7b8c949ac4650a09736fc376e9aee', // CF OWASP CRS");
  lines.push('          overrides: {');
  lines.push('            categories: config.owaspCrs.disabledCategories?.map((cat) => ({');
  lines.push('              category: cat,');
  lines.push("              action: 'disabled' as const,");
  lines.push('            })) ?? [],');
  lines.push('          },');
  lines.push('        },');
  lines.push("        action: 'execute',");
  lines.push("        expression: 'true',");
  lines.push("        description: 'Deploy OWASP CRS managed ruleset',");
  lines.push('      }],');
  lines.push('    }, opts);');
  lines.push('  }');
  lines.push('');

  // Custom WAF rules
  lines.push('  // ── Custom WAF Rules ────────────────────────────────────────');
  lines.push('  for (const [index, rule] of (config.customRules ?? []).entries()) {');
  lines.push('    if (!rule.enabled) continue;');
  lines.push(`    resources[\`customRule_\${index}\`] = new cf.Ruleset(\`${prefix}custom-waf-\${rule.name}\`, {`);
  lines.push('      zoneId,');
  lines.push('      name: rule.name,');
  lines.push("      kind: 'zone',");
  lines.push("      phase: 'http_request_firewall_custom',");
  lines.push('      rules: [{');
  lines.push('        action: rule.action,');
  lines.push('        expression: rule.expression,');
  lines.push('        description: rule.description ?? rule.name,');
  lines.push('      }],');
  lines.push('    }, opts);');
  lines.push('  }');
  lines.push('');

  lines.push('  return resources;');
  lines.push('}');

  return lines.join('\n');
}
```

---

## 5. Feature Module Generators — Remaining Modules

Each remaining feature follows the same pattern. The generator produces a module file with:

1. Imports (`@pulumi/pulumi`, `@pulumi/cloudflare`, feature config type)
2. A `create*Resources()` function that:
   - Takes the feature config + zoneId (or accountId)
   - Iterates over config entries
   - Creates `cf.*` resources
   - Returns a record of created resources

### Module → Pulumi Resource Mapping

| Module | Primary Pulumi Resources |
|--------|--------------------------|
| `ssl.ts` | `cf.ZoneSettingsOverride` (ssl, tls_1_3, min_tls_version, etc.) |
| `rate-limit.ts` | `cf.Ruleset` (phase: http_ratelimit) |
| `bot.ts` | `cf.BotManagement`, `cf.Ruleset` (phase: http_request_sbfm) |
| `ip-firewall.ts` | `cf.AccessRule` (IP allow/block) |
| `cache.ts` | `cf.Ruleset` (phase: http_request_cache_settings) |
| `performance.ts` | `cf.ZoneSettingsOverride` (minify, polish, mirage, etc.) |
| `rules.ts` | `cf.Ruleset` (phases: http_request_transform, http_request_redirect, http_request_origin, http_config_settings, http_request_late_transform) |
| `access.ts` | `cf.AccessApplication`, `cf.AccessPolicy`, `cf.AccessServiceToken` |
| `load-balancer.ts` | `cf.LoadBalancer`, `cf.LoadBalancerPool`, `cf.LoadBalancerMonitor` |
| `email.ts` | `cf.EmailRoutingSettings`, `cf.EmailRoutingRule`, `cf.EmailRoutingAddress` |
| `analytics.ts` | `cf.LogpushJob`, `cf.WebAnalyticsSite` |
| `api-security.ts` | `cf.ApiShieldSchema`, `cf.ApiShieldOperation` |
| `notifications.ts` | `cf.NotificationPolicy`, `cf.NotificationPolicyWebhooks` |
| `client-security.ts` | `cf.ZoneSettingsOverride`, `cf.PageShieldPolicy` |

---

## 6. CLI Command: `pnpm tool edge --pulumi`

### File: `packages/shared/utils/cli/src/tools/edge/index.ts` (addition)

```typescript
/**
 * CLI handler for `pnpm tool edge --pulumi`.
 *
 * Reads the edge config, generates a Pulumi program, and outputs
 * the list of generated files.
 *
 * @param flags - CLI flags
 * @returns Result with success message
 */
async function handlePulumiGenerate(flags: EdgeFlags): Promise<Result<string>> {
  const configResult = await loadEdgeConfig();
  if (!configResult.ok) return configResult;

  const config = configResult.data;
  if (!config.pulumi) {
    return err('No pulumi configuration found in edge config. Add a `pulumi` section to your edge config.');
  }

  const productRoot = flags.productRoot ?? process.cwd();

  const genResult = await generatePulumiProgram(config, productRoot);
  if (!genResult.ok) return genResult;

  const files = genResult.data;
  const outputDir = config.pulumi.generation?.outputDir ?? 'edge';

  return ok([
    `Generated ${files.length} Pulumi files in ${outputDir}/`,
    '',
    'Files:',
    ...files.map((f) => `  ${f}`),
    '',
    'Next steps:',
    `  cd ${outputDir}`,
    '  npm install',
    '  pulumi preview',
    '  pulumi up',
  ].join('\n'));
}
```

---

## 7. Generated Program Structure

When `pnpm tool edge --pulumi` runs, it generates:

```
packages/products/[product]/iac/edge/
├── Pulumi.yaml                   # Project config
├── Pulumi.production.yaml        # Stack config
├── index.ts                      # Entry point — imports all modules
├── dns.ts                        # DNS records
├── ssl.ts                        # SSL/TLS zone settings
├── waf.ts                        # WAF rulesets + custom rules
├── rate-limit.ts                 # Rate limiting rulesets
├── bot.ts                        # Bot management config
├── ip-firewall.ts                # IP access rules
├── cache.ts                      # Cache rulesets
├── performance.ts                # Performance zone settings
├── rules.ts                      # Transform/redirect/origin rulesets
├── access.ts                     # Access applications + policies
├── load-balancer.ts              # Load balancers + pools + monitors
├── email.ts                      # Email routing rules + addresses
├── analytics.ts                  # Logpush + web analytics
├── api-security.ts               # API Shield operations
├── notifications.ts              # Notification policies + webhooks
└── client-security.ts            # Page Shield + zone settings
```

---

## 8. Config ↔ Resource Cross-Reference

Complete mapping from edge config properties to Pulumi resources:

| Edge Config Path | Plan | Pulumi Resource | Pulumi Property |
|---|---|---|---|
| `dns.records[]` | 10 | `cf.Record` | name, type, value, ttl, proxied |
| `ssl.mode` | 01 | `cf.ZoneSettingsOverride` | settings.ssl |
| `ssl.minTlsVersion` | 01 | `cf.ZoneSettingsOverride` | settings.minTlsVersion |
| `ssl.hsts.*` | 01 | `cf.ZoneSettingsOverride` | settings.securityHeader |
| `ssl.alwaysUseHttps` | 01 | `cf.ZoneSettingsOverride` | settings.alwaysUseHttps |
| `waf.owaspCrs` | 02 | `cf.Ruleset` (firewall_managed) | rules[].actionParameters.id |
| `waf.customRules[]` | 02 | `cf.Ruleset` (firewall_custom) | rules[].action, expression |
| `rateLimit.rules[]` | 03 | `cf.Ruleset` (http_ratelimit) | rules[].ratelimit |
| `bot.botFightMode` | 04 | `cf.BotManagement` | fightMode |
| `bot.superBotFightMode` | 04 | `cf.BotManagement` | sbfmDefinitelyAutomated |
| `ipFirewall.accessRules[]` | 05 | `cf.AccessRule` | mode, configuration |
| `cache.rules[]` | 07 | `cf.Ruleset` (cache_settings) | rules[].actionParameters |
| `performance.polish` | 08 | `cf.ZoneSettingsOverride` | settings.polish |
| `performance.minify` | 08 | `cf.ZoneSettingsOverride` | settings.minify |
| `performance.earlyHints` | 08 | `cf.ZoneSettingsOverride` | settings.earlyHints |
| `rules.transforms[]` | 06 | `cf.Ruleset` (transform) | rules[].actionParameters |
| `rules.redirects[]` | 06 | `cf.Ruleset` (redirect) | rules[].actionParameters |
| `access.applications[]` | 09 | `cf.AccessApplication` | name, domain, type |
| `access.policies[]` | 09 | `cf.AccessPolicy` | include, require, exclude |
| `loadBalancing.pools[]` | 13 | `cf.LoadBalancerPool` | origins, monitors |
| `loadBalancing.balancers[]` | 13 | `cf.LoadBalancer` | defaultPoolIds, steering |
| `email.rules[]` | 11 | `cf.EmailRoutingRule` | matchers, actions |
| `analytics.logpush[]` | 12 | `cf.LogpushJob` | dataset, destinationConf |
| `apiSecurity.schemaValidation` | 16 | `cf.ApiShieldSchema` | kind, source |
| `notifications.policies[]` | 17 | `cf.NotificationPolicy` | alertType, emailIntegrations |
| `clientSecurity.csp.policies[]` | 18 | `cf.PageShieldPolicy` | action, value |
| `clientSecurity.emailObfuscation` | 18 | `cf.ZoneSettingsOverride` | settings.emailObfuscation |

---

## 9. Verification Steps

### Generate Pulumi Program

```bash
# Generate from edge config
pnpm tool edge --pulumi
# → Generated 18 Pulumi files in iac/edge/
#   iac/edge/index.ts
#   iac/edge/dns.ts
#   ...

# Verify generated files compile
cd packages/products/myapp/iac/edge
npx tsc --noEmit
# → No errors
```

### Preview Resources

```bash
# Set up Pulumi stack
pulumi stack init production
pulumi config set accountId $CLOUDFLARE_ACCOUNT_ID
pulumi config set domain myapp.com

# Preview without applying
pulumi preview
# → Shows all resources that would be created:
#   + cf:index:Zone             myapp-zone
#   + cf:index:Record           myapp-dns-a-@-0
#   + cf:index:Ruleset          myapp-owasp-managed
#   + cf:index:BotManagement    myapp-bot
#   ...
```

### Verify Idempotency

```bash
# Apply resources
pulumi up --yes

# Run again with no config changes
pulumi preview
# → No changes (idempotent)

# Change a config value
# (edit resist.config.ts, regenerate)
pnpm tool edge --pulumi
pulumi preview
# → Shows only the changed resource
```

### Verify Config Parity

```bash
# Compare local edge simulation with Pulumi preview
# Every feature enabled locally should have a corresponding Pulumi resource

pnpm tool edge --dry-run | grep -c "# "  # Count feature sections in Caddyfile
# → N sections

pulumi preview --json | jq '.steps | length'  # Count Pulumi resources
# → Should be >= N (some features generate multiple resources)
```

---

## 10. Known Limitations & Simulation Gaps

| Aspect | Local Edge Tool | Pulumi Generator | Gap |
|---|---|---|---|
| Config drift | N/A (local only) | `pulumi refresh` detects | Must run refresh to catch manual dashboard changes |
| Feature parity | Simulates subset | Manages all CF features | Some CF features are schema-only locally |
| Secrets | Not needed locally | Requires API token | Token must be in Pulumi config/env |
| Multi-zone | Single local zone | Supports multiple zones | Generator creates resources for one zone at a time |
| Preview deploys | Local dev server | Full CF infrastructure | Preview environments need separate stacks |
| Custom Workers | `wrangler dev` | Separate Worker deploy | Worker deployment handled by wrangler, not Pulumi |
| State management | N/A | Pulumi state backend | Requires state backend (local, S3, Pulumi Cloud) |
| Import existing | N/A | `pulumi import` | Must import pre-existing resources before managing |
| Rollback | Stop edge tool | `pulumi stack history` + targeted update | Rollback is per-resource, not atomic |

---

## 11. File Summary

| File | Purpose |
|------|---------|
| `packages/shared/schemas/core-config/src/edge-pulumi.ts` | Valibot schemas for Pulumi generation options |
| `packages/shared/utils/cli/src/tools/edge/utils/pulumi-generator.ts` | Master generator — orchestrates all module generation |
| `packages/products/[product]/iac/edge/index.ts` | Generated entry point — imports all feature modules |
| `packages/products/[product]/iac/edge/*.ts` | Generated feature modules (one per feature) |
| `packages/products/[product]/iac/edge/Pulumi.yaml` | Generated Pulumi project config |
| `packages/products/[product]/iac/edge/Pulumi.*.yaml` | Generated Pulumi stack configs |

---

## 12. Dependencies

| Dependency | Plan | Relationship |
|------------|------|-------------|
| All plans (01-18) | Feature schemas | Each plan's schema drives a Pulumi module |
| `00-foundation.md` | Edge config loader | Reads resist.config.ts edge section |
| `10-dns.md` | DNS records | DNS module uses DnsConfigSchema |
| `01-ssl-tls.md` | SSL settings | SSL module uses SslConfigSchema |
| `02-waf.md` | WAF rules | WAF module uses WafConfigSchema |
| `03-rate-limiting.md` | Rate limits | Rate limit module uses RateLimitConfigSchema |

---

## 13. Implementation Order

1. **Schema layer**: Create `edge-pulumi.ts` with generation options schema
2. **Generator scaffold**: Implement `generatePulumiProgram()` orchestrator
3. **Zone module**: Generate zone creation + base settings
4. **DNS module**: Generate DNS record resources (most straightforward mapping)
5. **SSL module**: Generate zone settings for SSL/TLS
6. **WAF module**: Generate managed + custom WAF rulesets
7. **Rate limit module**: Generate rate limiting rulesets
8. **Bot module**: Generate bot management config
9. **IP firewall module**: Generate access rules
10. **Cache module**: Generate cache rulesets
11. **Performance module**: Generate zone performance settings
12. **Rules module**: Generate transform/redirect/origin rulesets
13. **Access module**: Generate Access applications + policies
14. **Load balancer module**: Generate LB + pools + monitors
15. **Email module**: Generate email routing rules
16. **Analytics module**: Generate Logpush jobs + web analytics
17. **API security module**: Generate API Shield resources
18. **Notifications module**: Generate notification policies
19. **Client security module**: Generate Page Shield + zone settings
20. **CLI command**: Add `--pulumi` flag to edge tool
21. **Verification**: Test `pulumi preview` with generated program
