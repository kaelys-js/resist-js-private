# DNS Management Plan

> Automated Cloudflare DNS records from repo configuration via Pulumi

## Overview

All DNS records are defined in code and managed through Pulumi. Changes to DNS configuration go through PR review and are applied automatically on merge.

## Architecture

```
config/dns.ts (source of truth)
        │
        ▼
┌───────────────────────┐
│   Pulumi Cloudflare   │
│      Provider         │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────────────────────────────────────┐
│                    Cloudflare                          │
│                                                        │
│  ┌─────────────────┐  ┌─────────────────┐            │
│  │  tastier.app    │  │ cherishall.app  │            │
│  │                 │  │                 │            │
│  │ A, CNAME, MX,   │  │ A, CNAME, MX,   │            │
│  │ TXT, etc.       │  │ TXT, etc.       │            │
│  └─────────────────┘  └─────────────────┘            │
│                                                        │
│  ┌─────────────────┐  ┌─────────────────┐            │
│  │ *-staging.app   │  │   resist.dev    │            │
│  └─────────────────┘  └─────────────────┘            │
│                                                        │
└───────────────────────────────────────────────────────┘
```

---

## Part 1: Configuration Schema

```typescript
// config/dns.ts
import * as v from 'valibot';

// Record types
const ARecordSchema = v.object({
  type: v.literal('A'),
  name: v.string(), // @ for root, subdomain, or FQDN
  value: v.string(), // IPv4 address
  proxied: v.boolean(),
  ttl: v.optional(v.number()), // 1 = auto
});

const AAAARecordSchema = v.object({
  type: v.literal('AAAA'),
  name: v.string(),
  value: v.string(), // IPv6 address
  proxied: v.boolean(),
  ttl: v.optional(v.number()),
});

const CNAMERecordSchema = v.object({
  type: v.literal('CNAME'),
  name: v.string(),
  value: v.string(), // Target hostname
  proxied: v.boolean(),
  ttl: v.optional(v.number()),
});

const MXRecordSchema = v.object({
  type: v.literal('MX'),
  name: v.string(),
  value: v.string(), // Mail server
  priority: v.number(),
  ttl: v.optional(v.number()),
});

const TXTRecordSchema = v.object({
  type: v.literal('TXT'),
  name: v.string(),
  value: v.string(),
  ttl: v.optional(v.number()),
});

const SRVRecordSchema = v.object({
  type: v.literal('SRV'),
  name: v.string(),
  data: v.object({
    priority: v.number(),
    weight: v.number(),
    port: v.number(),
    target: v.string(),
  }),
  ttl: v.optional(v.number()),
});

const CAARecordSchema = v.object({
  type: v.literal('CAA'),
  name: v.string(),
  data: v.object({
    flags: v.number(),
    tag: v.picklist(['issue', 'issuewild', 'iodef']),
    value: v.string(),
  }),
  ttl: v.optional(v.number()),
});

export const DNSRecordSchema = v.variant('type', [
  ARecordSchema,
  AAAARecordSchema,
  CNAMERecordSchema,
  MXRecordSchema,
  TXTRecordSchema,
  SRVRecordSchema,
  CAARecordSchema,
]);

export type DNSRecord = v.InferOutput<typeof DNSRecordSchema>;

export const ZoneConfigSchema = v.object({
  domain: v.string(),
  records: v.array(DNSRecordSchema),
});

export type ZoneConfig = v.InferOutput<typeof ZoneConfigSchema>;

export const DNSConfigSchema = v.object({
  zones: v.array(ZoneConfigSchema),
});

export type DNSConfig = v.InferOutput<typeof DNSConfigSchema>;
```

---

## Part 2: DNS Configuration

```typescript
// config/dns.config.ts
import type { DNSConfig, ZoneConfig } from './dns';

// Shared records that apply to all product zones
const sharedProductRecords = (product: string) => [
  // Root -> Marketing (Cloudflare Pages)
  {
    type: 'CNAME' as const,
    name: '@',
    value: `${product}-marketing.pages.dev`,
    proxied: true,
  },
  // www -> root redirect
  {
    type: 'CNAME' as const,
    name: 'www',
    value: `${product}.app`,
    proxied: true,
  },
  // App (Cloudflare Pages)
  {
    type: 'CNAME' as const,
    name: 'app',
    value: `${product}-app.pages.dev`,
    proxied: true,
  },
  // API (Cloudflare Workers)
  {
    type: 'CNAME' as const,
    name: 'api',
    value: `${product}-api.workers.dev`,
    proxied: true,
  },
  // Status page
  {
    type: 'CNAME' as const,
    name: 'status',
    value: `${product}-status.workers.dev`,
    proxied: true,
  },
  // Docs (Cloudflare Pages)
  {
    type: 'CNAME' as const,
    name: 'docs',
    value: `${product}-docs.pages.dev`,
    proxied: true,
  },
];

// Email records for Google Workspace
const googleWorkspaceEmailRecords = (domain: string) => [
  // MX records
  { type: 'MX' as const, name: '@', value: 'aspmx.l.google.com', priority: 1 },
  { type: 'MX' as const, name: '@', value: 'alt1.aspmx.l.google.com', priority: 5 },
  { type: 'MX' as const, name: '@', value: 'alt2.aspmx.l.google.com', priority: 5 },
  { type: 'MX' as const, name: '@', value: 'alt3.aspmx.l.google.com', priority: 10 },
  { type: 'MX' as const, name: '@', value: 'alt4.aspmx.l.google.com', priority: 10 },
  // SPF
  {
    type: 'TXT' as const,
    name: '@',
    value: 'v=spf1 include:_spf.google.com ~all',
  },
  // DMARC
  {
    type: 'TXT' as const,
    name: '_dmarc',
    value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`,
  },
  // DKIM (placeholder - actual value comes from Google Workspace)
  {
    type: 'TXT' as const,
    name: 'google._domainkey',
    value: 'REPLACE_WITH_GOOGLE_DKIM_KEY',
  },
];

// Security records
const securityRecords = (domain: string) => [
  // CAA - only allow Let's Encrypt and Cloudflare to issue certificates
  {
    type: 'CAA' as const,
    name: '@',
    data: { flags: 0, tag: 'issue' as const, value: 'letsencrypt.org' },
  },
  {
    type: 'CAA' as const,
    name: '@',
    data: { flags: 0, tag: 'issue' as const, value: 'comodoca.com' },
  },
  {
    type: 'CAA' as const,
    name: '@',
    data: { flags: 0, tag: 'issuewild' as const, value: 'letsencrypt.org' },
  },
  {
    type: 'CAA' as const,
    name: '@',
    data: { flags: 0, tag: 'iodef' as const, value: `mailto:security@${domain}` },
  },
];

// Verification records
const verificationRecords = (domain: string) => [
  // Google Search Console verification
  {
    type: 'TXT' as const,
    name: '@',
    value: 'google-site-verification=REPLACE_WITH_GOOGLE_VERIFICATION',
  },
  // Apple domain verification (for Sign in with Apple)
  {
    type: 'TXT' as const,
    name: '@',
    value: 'apple-domain-verification=REPLACE_WITH_APPLE_VERIFICATION',
  },
];

// Production zone for a product
function productionZone(product: string): ZoneConfig {
  const domain = `${product}.app`;

  return {
    domain,
    records: [
      ...sharedProductRecords(product),
      ...googleWorkspaceEmailRecords(domain),
      ...securityRecords(domain),
      ...verificationRecords(domain),

      // IndexNow key verification
      {
        type: 'TXT' as const,
        name: '@',
        value: `indexnow-key=${process.env[`${product.toUpperCase()}_INDEXNOW_KEY`] || 'REPLACE'}`,
      },
    ],
  };
}

// Staging zone for a product
function stagingZone(product: string): ZoneConfig {
  const domain = `${product}-staging.app`;

  return {
    domain,
    records: [
      // Same structure as production, pointing to staging deployments
      {
        type: 'CNAME' as const,
        name: '@',
        value: `${product}-marketing-staging.pages.dev`,
        proxied: true,
      },
      {
        type: 'CNAME' as const,
        name: 'www',
        value: domain,
        proxied: true,
      },
      {
        type: 'CNAME' as const,
        name: 'app',
        value: `${product}-app-staging.pages.dev`,
        proxied: true,
      },
      {
        type: 'CNAME' as const,
        name: 'api',
        value: `${product}-api-staging.workers.dev`,
        proxied: true,
      },
      {
        type: 'CNAME' as const,
        name: 'status',
        value: `${product}-status-staging.workers.dev`,
        proxied: true,
      },
      // Wildcard for preview deployments (PR branches)
      {
        type: 'CNAME' as const,
        name: '*',
        value: domain,
        proxied: true,
      },
    ],
  };
}

// Main DNS configuration
export const DNS_CONFIG: DNSConfig = {
  zones: [
    // Tastier
    productionZone('tastier'),
    stagingZone('tastier'),

    // Cherishall
    productionZone('cherishall'),
    stagingZone('cherishall'),

    // resist.dev (company/docs domain)
    {
      domain: 'resist.dev',
      records: [
        // Root -> Docs or landing
        {
          type: 'CNAME' as const,
          name: '@',
          value: 'resist-landing.pages.dev',
          proxied: true,
        },
        {
          type: 'CNAME' as const,
          name: 'www',
          value: 'resist.dev',
          proxied: true,
        },
        // Admin panel
        {
          type: 'CNAME' as const,
          name: 'admin',
          value: 'resist-admin.pages.dev',
          proxied: true,
        },
        // Email
        ...googleWorkspaceEmailRecords('resist.dev'),
        // Security
        ...securityRecords('resist.dev'),
      ],
    },
  ],
};
```

---

## Part 3: Pulumi Implementation

```typescript
// packages/shared/iac/src/dns/index.ts
import * as cloudflare from '@pulumi/cloudflare';
import * as pulumi from '@pulumi/pulumi';
import { DNS_CONFIG, type DNSRecord } from '@resist/config/dns.config';

const config = new pulumi.Config();
const accountId = config.require('cloudflareAccountId');

// Zone ID mapping (populated after zones are created or imported)
const zoneIds: Record<string, pulumi.Output<string>> = {};

// Create or import zones
export function createZones() {
  for (const zone of DNS_CONFIG.zones) {
    // Check if zone exists (import) or create new
    const cfZone = new cloudflare.Zone(zone.domain, {
      accountId,
      zone: zone.domain,
      plan: zone.domain.endsWith('-staging.app') ? 'free' : 'pro',
      type: 'full',
    });

    zoneIds[zone.domain] = cfZone.id;
  }

  return zoneIds;
}

// Create DNS records for a zone
export function createRecords(zoneDomain: string, zoneId: pulumi.Output<string>) {
  const zoneConfig = DNS_CONFIG.zones.find(z => z.domain === zoneDomain);
  if (!zoneConfig) return;

  for (const record of zoneConfig.records) {
    const resourceName = `${zoneDomain}-${record.type}-${record.name}`.replace(/[^a-zA-Z0-9-]/g, '-');

    switch (record.type) {
      case 'A':
        new cloudflare.Record(resourceName, {
          zoneId,
          name: record.name,
          type: 'A',
          value: record.value,
          proxied: record.proxied,
          ttl: record.proxied ? 1 : record.ttl || 3600,
        });
        break;

      case 'AAAA':
        new cloudflare.Record(resourceName, {
          zoneId,
          name: record.name,
          type: 'AAAA',
          value: record.value,
          proxied: record.proxied,
          ttl: record.proxied ? 1 : record.ttl || 3600,
        });
        break;

      case 'CNAME':
        new cloudflare.Record(resourceName, {
          zoneId,
          name: record.name,
          type: 'CNAME',
          value: record.value,
          proxied: record.proxied,
          ttl: record.proxied ? 1 : record.ttl || 3600,
        });
        break;

      case 'MX':
        new cloudflare.Record(resourceName, {
          zoneId,
          name: record.name,
          type: 'MX',
          value: record.value,
          priority: record.priority,
          ttl: record.ttl || 3600,
        });
        break;

      case 'TXT':
        new cloudflare.Record(resourceName, {
          zoneId,
          name: record.name,
          type: 'TXT',
          value: record.value,
          ttl: record.ttl || 3600,
        });
        break;

      case 'SRV':
        new cloudflare.Record(resourceName, {
          zoneId,
          name: record.name,
          type: 'SRV',
          data: {
            priority: record.data.priority,
            weight: record.data.weight,
            port: record.data.port,
            target: record.data.target,
          },
          ttl: record.ttl || 3600,
        });
        break;

      case 'CAA':
        new cloudflare.Record(resourceName, {
          zoneId,
          name: record.name,
          type: 'CAA',
          data: {
            flags: record.data.flags,
            tag: record.data.tag,
            value: record.data.value,
          },
          ttl: record.ttl || 3600,
        });
        break;
    }
  }
}

// Main function to set up all DNS
export function setupDNS() {
  const zones = createZones();

  for (const [domain, zoneId] of Object.entries(zones)) {
    createRecords(domain, zoneId);
  }

  return zones;
}
```

---

## Part 4: Validation & Drift Detection

### Validation Script

```typescript
// scripts/validate-dns.ts
import { DNS_CONFIG, DNSRecordSchema } from '../config/dns.config';
import * as v from 'valibot';

function validateConfig(): boolean {
  let valid = true;

  for (const zone of DNS_CONFIG.zones) {
    console.log(`Validating zone: ${zone.domain}`);

    // Check for duplicate records
    const recordKeys = new Set<string>();

    for (const record of zone.records) {
      // Validate record schema
      const result = v.safeParse(DNSRecordSchema, record);
      if (!result.success) {
        console.error(`  Invalid record:`, record);
        console.error(`  Errors:`, result.issues);
        valid = false;
        continue;
      }

      // Check for duplicates
      const key = `${record.type}-${record.name}-${record.type === 'MX' ? record.priority : ''}`;
      if (recordKeys.has(key)) {
        console.warn(`  Warning: Duplicate record key: ${key}`);
      }
      recordKeys.add(key);

      // Validate specific record types
      if (record.type === 'CNAME' && record.name === '@') {
        console.error(`  Error: CNAME at root (@) is not allowed`);
        valid = false;
      }

      if (record.type === 'MX' && record.proxied) {
        console.error(`  Error: MX records cannot be proxied`);
        valid = false;
      }

      if (record.type === 'TXT' && record.value.length > 255) {
        console.warn(`  Warning: TXT record value is long (${record.value.length} chars)`);
      }
    }

    console.log(`  ${zone.records.length} records validated`);
  }

  return valid;
}

const isValid = validateConfig();
if (!isValid) {
  console.error('\nValidation failed!');
  process.exit(1);
}

console.log('\nAll DNS configurations are valid!');
```

### Drift Detection Script

```typescript
// scripts/detect-dns-drift.ts
import Cloudflare from 'cloudflare';
import { DNS_CONFIG } from '../config/dns.config';

const cf = new Cloudflare({
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
});

interface DriftReport {
  zone: string;
  missing: string[];
  extra: string[];
  different: string[];
}

async function detectDrift(): Promise<DriftReport[]> {
  const reports: DriftReport[] = [];

  for (const zoneConfig of DNS_CONFIG.zones) {
    const report: DriftReport = {
      zone: zoneConfig.domain,
      missing: [],
      extra: [],
      different: [],
    };

    // Get zone ID
    const zones = await cf.zones.list({ name: zoneConfig.domain });
    if (zones.result.length === 0) {
      console.error(`Zone not found: ${zoneConfig.domain}`);
      continue;
    }

    const zoneId = zones.result[0].id;

    // Get actual records
    const actualRecords = await cf.dns.records.list({ zone_id: zoneId });
    const actualMap = new Map<string, any>();

    for (const record of actualRecords.result) {
      const key = `${record.type}-${record.name}`;
      actualMap.set(key, record);
    }

    // Check expected records
    for (const expected of zoneConfig.records) {
      const fullName = expected.name === '@'
        ? zoneConfig.domain
        : `${expected.name}.${zoneConfig.domain}`;
      const key = `${expected.type}-${fullName}`;

      const actual = actualMap.get(key);
      actualMap.delete(key);

      if (!actual) {
        report.missing.push(`${expected.type} ${expected.name}`);
        continue;
      }

      // Check if values match
      if (expected.type === 'CNAME' || expected.type === 'A' || expected.type === 'AAAA') {
        if (actual.content !== expected.value) {
          report.different.push(
            `${expected.type} ${expected.name}: expected "${expected.value}", got "${actual.content}"`
          );
        }
      }
    }

    // Check for extra records (not in config)
    for (const [key, record] of actualMap) {
      // Ignore Cloudflare-managed records
      if (record.type === 'NS' || record.type === 'SOA') continue;

      report.extra.push(`${record.type} ${record.name}`);
    }

    if (report.missing.length || report.extra.length || report.different.length) {
      reports.push(report);
    }
  }

  return reports;
}

async function main() {
  console.log('Detecting DNS drift...\n');

  const reports = await detectDrift();

  if (reports.length === 0) {
    console.log('No drift detected. DNS is in sync with configuration.');
    return;
  }

  for (const report of reports) {
    console.log(`\nZone: ${report.zone}`);

    if (report.missing.length > 0) {
      console.log('  Missing (in config, not in DNS):');
      report.missing.forEach(r => console.log(`    - ${r}`));
    }

    if (report.extra.length > 0) {
      console.log('  Extra (in DNS, not in config):');
      report.extra.forEach(r => console.log(`    - ${r}`));
    }

    if (report.different.length > 0) {
      console.log('  Different (value mismatch):');
      report.different.forEach(r => console.log(`    - ${r}`));
    }
  }

  console.log('\nRun `pnpm pulumi up` to sync DNS with configuration.');
}

main().catch(console.error);
```

---

## Part 5: CI/CD Integration

### Workflow

```yaml
# .github/workflows/dns.yml
name: DNS Management

on:
  pull_request:
    paths:
      - 'config/dns.ts'
      - 'config/dns.config.ts'
      - 'packages/shared/iac/src/dns/**'
  push:
    branches: [main]
    paths:
      - 'config/dns.ts'
      - 'config/dns.config.ts'
      - 'packages/shared/iac/src/dns/**'
  schedule:
    # Drift detection daily at 6 AM
    - cron: '0 6 * * *'

jobs:
  validate:
    name: Validate DNS Config
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Validate DNS configuration
        run: pnpm tsx scripts/validate-dns.ts

  preview:
    name: Preview Changes
    runs-on: ubuntu-latest
    needs: validate
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Pulumi preview
        uses: pulumi/actions@v4
        with:
          command: preview
          stack-name: dns-prod
          work-dir: packages/shared/iac
        env:
          PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  apply:
    name: Apply Changes
    runs-on: ubuntu-latest
    needs: validate
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Pulumi up
        uses: pulumi/actions@v4
        with:
          command: up
          stack-name: dns-prod
          work-dir: packages/shared/iac
        env:
          PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  drift-detection:
    name: Drift Detection
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule'
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Detect drift
        id: drift
        run: |
          pnpm tsx scripts/detect-dns-drift.ts > drift-report.txt 2>&1
          echo "has_drift=$(grep -q 'No drift detected' drift-report.txt && echo 'false' || echo 'true')" >> $GITHUB_OUTPUT
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Create issue if drift detected
        if: steps.drift.outputs.has_drift == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('drift-report.txt', 'utf8');

            const title = '🔄 DNS Drift Detected';
            const body = `## DNS Drift Report

            \`\`\`
            ${report}
            \`\`\`

            ### Next Steps
            1. Review the drift report above
            2. If changes are intentional, update \`config/dns.config.ts\`
            3. Run \`pnpm pulumi up\` to sync

            ---
            *This issue was automatically created by the DNS drift detection workflow.*`;

            // Check for existing open issue
            const issues = await github.rest.issues.listForRepo({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'open',
              labels: 'area: infra',
            });

            const existing = issues.data.find(i => i.title === title);
            if (!existing) {
              await github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title,
                body,
                labels: ['area: infra', 'priority: medium'],
              });
            }
```

---

## Summary

| Feature | Implementation |
|---------|----------------|
| Config format | TypeScript with Valibot schemas |
| IaC tool | Pulumi with Cloudflare provider |
| Validation | Schema validation + custom rules |
| Drift detection | Daily scheduled check |
| CI/CD | Preview on PR, apply on merge |

### Record Types Supported

| Type | Purpose |
|------|---------|
| A | IPv4 address |
| AAAA | IPv6 address |
| CNAME | Alias to another hostname |
| MX | Mail exchange |
| TXT | Text records (SPF, DKIM, verification) |
| SRV | Service records |
| CAA | Certificate authority authorization |

### Zones Managed

| Zone | Environment |
|------|-------------|
| tastier.app | Production |
| tastier-staging.app | Staging |
| cherishall.app | Production |
| cherishall-staging.app | Staging |
| resist.dev | Company |

## Implementation Order

1. **Day 1**: Config schema, validation script
2. **Day 2**: DNS configuration for all zones
3. **Day 3**: Pulumi implementation
4. **Day 4**: Drift detection script
5. **Day 5**: CI/CD workflow
6. **Day 6**: Testing, documentation
