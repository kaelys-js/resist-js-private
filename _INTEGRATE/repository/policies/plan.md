# Policies Plan

> Auto-generated legal documents from templates and configuration

## Overview

Generate all required legal policies from Markdown templates with variable substitution. Policies are stored in the repo, versioned, and auto-published to marketing sites.

## Policy Types

| Policy | Required | Update Frequency |
|--------|----------|------------------|
| Privacy Policy | Yes | When data practices change |
| Terms of Service | Yes | When terms change |
| Cookie Policy | Yes (GDPR) | When tracking changes |
| Acceptable Use Policy | Recommended | Rarely |
| DMCA Policy | Recommended | Rarely |
| Refund Policy | Yes | When pricing changes |
| SLA (Service Level Agreement) | Recommended | When services change |
| DPA (Data Processing Agreement) | Yes (B2B, GDPR) | Rarely |
| DSAR Procedure | Yes (GDPR/CCPA) | Rarely |
| Security Policy | Recommended | Annually |
| Cancellation Policy | Recommended | When terms change |
| Chargeback Policy | Recommended | Rarely |

---

## Architecture

```
config/
├── company.ts          # Company information
└── policies.ts         # Policy-specific variables

templates/policies/
├── privacy-policy.md
├── terms-of-service.md
├── cookie-policy.md
├── acceptable-use.md
├── dmca.md
├── refund-policy.md
├── sla.md
├── dpa.md
├── dsar.md
├── security.md
├── cancellation.md
└── chargeback.md

scripts/
└── generate-policies.ts

packages/products/<product>/marketing/
└── src/routes/
    ├── privacy/+page.svelte
    ├── terms/+page.svelte
    ├── cookies/+page.svelte
    └── legal/
        ├── acceptable-use/+page.svelte
        ├── dmca/+page.svelte
        ├── refund/+page.svelte
        ├── sla/+page.svelte
        ├── dpa/+page.svelte
        └── security/+page.svelte
```

---

## Part 1: Configuration

### Company Config

```typescript
// config/company.ts
import * as v from 'valibot';

export const CompanyConfigSchema = v.object({
  // Legal entity
  legalName: v.string(),
  tradingName: v.string(),
  entityType: v.string(), // LLC, Inc, Ltd, etc.
  jurisdiction: v.string(), // State/Country of incorporation
  registrationNumber: v.optional(v.string()),

  // Contact
  address: v.object({
    street: v.string(),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    country: v.string(),
  }),
  email: v.object({
    general: v.string(),
    support: v.string(),
    privacy: v.string(),
    legal: v.string(),
    security: v.string(),
    dmca: v.string(),
  }),
  phone: v.optional(v.string()),

  // Social
  website: v.string(),
  socialMedia: v.optional(v.object({
    twitter: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    github: v.optional(v.string()),
  })),
});

export type CompanyConfig = v.InferOutput<typeof CompanyConfigSchema>;

export const COMPANY: CompanyConfig = {
  legalName: 'Resist Technologies LLC',
  tradingName: 'resist.js',
  entityType: 'Limited Liability Company',
  jurisdiction: 'Delaware, United States',

  address: {
    street: '123 Main Street',
    city: 'Wilmington',
    state: 'Delaware',
    postalCode: '19801',
    country: 'United States',
  },

  email: {
    general: 'hello@resist.dev',
    support: 'support@resist.dev',
    privacy: 'privacy@resist.dev',
    legal: 'legal@resist.dev',
    security: 'security@resist.dev',
    dmca: 'dmca@resist.dev',
  },

  website: 'https://resist.dev',

  socialMedia: {
    twitter: '@resistjs',
    github: 'resist-js',
  },
};
```

### Policies Config

```typescript
// config/policies.ts
import * as v from 'valibot';

export const PoliciesConfigSchema = v.object({
  // Effective dates
  effectiveDate: v.string(), // ISO date
  lastUpdated: v.string(),

  // Privacy specific
  privacy: v.object({
    dataRetentionDays: v.number(),
    cookieRetentionDays: v.number(),
    dataCollected: v.array(v.object({
      category: v.string(),
      types: v.array(v.string()),
      purpose: v.string(),
      retention: v.string(),
    })),
    thirdPartyServices: v.array(v.object({
      name: v.string(),
      purpose: v.string(),
      privacyUrl: v.string(),
    })),
    dataTransfers: v.array(v.string()), // Countries
    rightsContact: v.string(),
    dpoContact: v.optional(v.string()), // Data Protection Officer
  }),

  // Terms specific
  terms: v.object({
    minimumAge: v.number(),
    arbitrationState: v.string(),
    governingLaw: v.string(),
    classActionWaiver: v.boolean(),
    indemnification: v.boolean(),
  }),

  // Refund specific
  refund: v.object({
    refundPeriodDays: v.number(),
    proRatedRefunds: v.boolean(),
    nonRefundableItems: v.array(v.string()),
    refundMethod: v.string(),
    processingTimeDays: v.number(),
  }),

  // SLA specific
  sla: v.object({
    uptimeTarget: v.number(), // 99.9
    responseTimeHours: v.object({
      critical: v.number(),
      high: v.number(),
      medium: v.number(),
      low: v.number(),
    }),
    maintenanceWindow: v.string(),
    creditSchedule: v.array(v.object({
      uptimeBelow: v.number(),
      creditPercent: v.number(),
    })),
  }),

  // Security specific
  security: v.object({
    encryptionStandard: v.string(),
    certifications: v.array(v.string()),
    bugBountyUrl: v.optional(v.string()),
    securityContactPgp: v.optional(v.string()),
    incidentResponseHours: v.number(),
  }),
});

export type PoliciesConfig = v.InferOutput<typeof PoliciesConfigSchema>;

export const POLICIES: PoliciesConfig = {
  effectiveDate: '2024-01-01',
  lastUpdated: new Date().toISOString().split('T')[0],

  privacy: {
    dataRetentionDays: 365,
    cookieRetentionDays: 365,
    dataCollected: [
      {
        category: 'Account Information',
        types: ['Email address', 'Name', 'Profile picture'],
        purpose: 'Account creation and management',
        retention: 'Until account deletion + 30 days',
      },
      {
        category: 'Usage Data',
        types: ['Pages visited', 'Features used', 'Time spent'],
        purpose: 'Service improvement and analytics',
        retention: '12 months',
      },
      {
        category: 'Payment Information',
        types: ['Billing address', 'Payment method (via processor)'],
        purpose: 'Payment processing',
        retention: '7 years (legal requirement)',
      },
      {
        category: 'Device Information',
        types: ['IP address', 'Browser type', 'Device type'],
        purpose: 'Security and fraud prevention',
        retention: '90 days',
      },
    ],
    thirdPartyServices: [
      {
        name: 'Cloudflare',
        purpose: 'Hosting, CDN, Security',
        privacyUrl: 'https://www.cloudflare.com/privacypolicy/',
      },
      {
        name: 'Lemon Squeezy',
        purpose: 'Payment processing',
        privacyUrl: 'https://www.lemonsqueezy.com/privacy',
      },
      {
        name: 'RevenueCat',
        purpose: 'In-app purchases',
        privacyUrl: 'https://www.revenuecat.com/privacy/',
      },
      {
        name: 'PostHog',
        purpose: 'Product analytics',
        privacyUrl: 'https://posthog.com/privacy',
      },
      {
        name: 'Resend',
        purpose: 'Transactional emails',
        privacyUrl: 'https://resend.com/legal/privacy-policy',
      },
    ],
    dataTransfers: ['United States', 'European Union'],
    rightsContact: 'privacy@resist.dev',
  },

  terms: {
    minimumAge: 13,
    arbitrationState: 'Delaware',
    governingLaw: 'State of Delaware, United States',
    classActionWaiver: true,
    indemnification: true,
  },

  refund: {
    refundPeriodDays: 14,
    proRatedRefunds: true,
    nonRefundableItems: [
      'Lifetime purchases after 30 days',
      'Consumed credits or tokens',
      'Domain registrations',
    ],
    refundMethod: 'Original payment method',
    processingTimeDays: 5,
  },

  sla: {
    uptimeTarget: 99.9,
    responseTimeHours: {
      critical: 1,
      high: 4,
      medium: 24,
      low: 72,
    },
    maintenanceWindow: 'Sundays 2:00-6:00 AM UTC',
    creditSchedule: [
      { uptimeBelow: 99.9, creditPercent: 10 },
      { uptimeBelow: 99.0, creditPercent: 25 },
      { uptimeBelow: 95.0, creditPercent: 50 },
    ],
  },

  security: {
    encryptionStandard: 'AES-256',
    certifications: [],
    securityContactPgp: undefined,
    incidentResponseHours: 24,
  },
};
```

---

## Part 2: Templates

### Privacy Policy Template

```markdown
<!-- templates/policies/privacy-policy.md -->
# Privacy Policy

**Effective Date:** {{effectiveDate}}
**Last Updated:** {{lastUpdated}}

## Introduction

{{companyLegalName}} ("**{{companyTradingName}}**", "**we**", "**us**", or "**our**") operates {{productName}} (the "**Service**"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.

Please read this Privacy Policy carefully. By using the Service, you agree to the collection and use of information in accordance with this policy.

## Information We Collect

### Information You Provide

{{#each dataCollected}}
**{{category}}**
- Types: {{#each types}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- Purpose: {{purpose}}
- Retention: {{retention}}

{{/each}}

### Information Collected Automatically

When you access our Service, we may automatically collect certain information, including:

- Device and browser information
- IP address and location data
- Usage patterns and preferences
- Cookies and similar tracking technologies

## How We Use Your Information

We use the information we collect to:

- Provide, maintain, and improve our Service
- Process transactions and send related information
- Send you technical notices, updates, and support messages
- Respond to your comments, questions, and requests
- Monitor and analyze trends, usage, and activities
- Detect, investigate, and prevent fraudulent transactions and other illegal activities
- Personalize and improve your experience

## Information Sharing

We may share your information in the following circumstances:

### Service Providers

We work with third-party service providers to help us operate our Service:

{{#each thirdPartyServices}}
- **{{name}}**: {{purpose}} ([Privacy Policy]({{privacyUrl}}))
{{/each}}

### Legal Requirements

We may disclose your information if required to do so by law or in response to valid requests by public authorities.

### Business Transfers

If we are involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.

## Data Transfers

Your information may be transferred to and processed in countries outside of your residence, including:

{{#each dataTransfers}}
- {{this}}
{{/each}}

We ensure appropriate safeguards are in place for such transfers in accordance with applicable law.

## Data Retention

We retain your personal information for as long as necessary to provide our Service and fulfill the purposes described in this policy. Generally:

- Account information: Until account deletion + 30 days
- Usage data: {{dataRetentionDays}} days
- Payment records: 7 years (legal requirement)

## Your Rights

Depending on your location, you may have the following rights:

### For All Users

- **Access**: Request a copy of your personal information
- **Correction**: Request correction of inaccurate information
- **Deletion**: Request deletion of your personal information
- **Portability**: Request a copy of your data in a portable format

### For EU/EEA Residents (GDPR)

- Right to object to processing
- Right to restrict processing
- Right to withdraw consent
- Right to lodge a complaint with a supervisory authority

### For California Residents (CCPA)

- Right to know what personal information is collected
- Right to know if personal information is sold or disclosed
- Right to opt-out of the sale of personal information
- Right to non-discrimination for exercising your rights

To exercise any of these rights, contact us at {{rightsContact}}.

## Cookies

We use cookies and similar tracking technologies to collect and track information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.

For more information, see our [Cookie Policy](/cookies).

## Children's Privacy

Our Service is not intended for children under {{minimumAge}} years of age. We do not knowingly collect personal information from children under {{minimumAge}}.

## Security

We implement appropriate technical and organizational measures to protect your personal information, including:

- Encryption in transit (TLS 1.2+)
- Encryption at rest ({{encryptionStandard}})
- Regular security assessments
- Access controls and authentication

## Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.

## Contact Us

If you have questions about this Privacy Policy, please contact us:

**{{companyLegalName}}**
{{companyAddressStreet}}
{{companyAddressCity}}, {{companyAddressState}} {{companyAddressPostalCode}}
{{companyAddressCountry}}

Email: {{companyEmailPrivacy}}
```

### Terms of Service Template

```markdown
<!-- templates/policies/terms-of-service.md -->
# Terms of Service

**Effective Date:** {{effectiveDate}}
**Last Updated:** {{lastUpdated}}

## 1. Agreement to Terms

By accessing or using {{productName}} (the "**Service**") operated by {{companyLegalName}} ("**{{companyTradingName}}**", "**we**", "**us**", or "**our**"), you agree to be bound by these Terms of Service ("**Terms**").

If you do not agree to these Terms, do not use the Service.

## 2. Eligibility

You must be at least {{minimumAge}} years old to use the Service. By using the Service, you represent and warrant that you meet this age requirement.

## 3. Account Registration

To use certain features of the Service, you must register for an account. You agree to:

- Provide accurate and complete information
- Maintain the security of your account credentials
- Notify us immediately of any unauthorized access
- Accept responsibility for all activities under your account

## 4. Subscription and Payments

### Billing

If you purchase a subscription or other paid features, you agree to pay all fees associated with your selected plan. Fees are billed in advance on a recurring basis.

### Price Changes

We may change our prices at any time. Price changes will take effect at the start of the next billing cycle following notice to you.

### Cancellation

You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period.

### Refunds

Our refund policy is available at [/legal/refund](/legal/refund). Please review it before making a purchase.

## 5. Acceptable Use

You agree not to:

- Violate any applicable laws or regulations
- Infringe on the rights of others
- Upload malicious code or content
- Attempt to gain unauthorized access to the Service
- Interfere with the proper functioning of the Service
- Use the Service for any illegal or unauthorized purpose
- Engage in any activity that could damage, disable, or impair the Service

See our full [Acceptable Use Policy](/legal/acceptable-use) for details.

## 6. Intellectual Property

### Our Content

The Service and its original content, features, and functionality are owned by {{companyLegalName}} and are protected by copyright, trademark, and other intellectual property laws.

### Your Content

You retain ownership of content you submit to the Service. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and display such content in connection with operating the Service.

## 7. Privacy

Your use of the Service is also governed by our [Privacy Policy](/privacy). Please review it to understand our practices.

## 8. Disclaimers

THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.

We do not warrant that:

- The Service will be uninterrupted or error-free
- Defects will be corrected
- The Service is free of viruses or harmful components
- The results of using the Service will meet your requirements

## 9. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, {{companyLegalName}} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.

Our total liability for any claim arising out of or relating to these Terms or the Service shall not exceed the greater of $100 or the amount you paid us in the 12 months preceding the claim.

{{#if indemnification}}
## 10. Indemnification

You agree to indemnify, defend, and hold harmless {{companyLegalName}} and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including attorneys' fees) arising out of or related to your use of the Service or violation of these Terms.
{{/if}}

## 11. Dispute Resolution

{{#if classActionWaiver}}
### Class Action Waiver

YOU AND {{companyLegalName}} AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE ACTION.

### Arbitration

Any dispute arising from these Terms or the Service shall be resolved through binding arbitration in {{arbitrationState}}, rather than in court.
{{else}}
Any disputes shall be resolved in the courts of {{governingLaw}}.
{{/if}}

## 12. Governing Law

These Terms shall be governed by and construed in accordance with the laws of {{governingLaw}}, without regard to its conflict of law provisions.

## 13. Changes to Terms

We reserve the right to modify these Terms at any time. If we make material changes, we will notify you by email or by posting a notice on the Service prior to the effective date.

Your continued use of the Service after the effective date constitutes acceptance of the modified Terms.

## 14. Termination

We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including if you breach these Terms.

Upon termination:

- Your right to use the Service will immediately cease
- We may delete your account and data
- Provisions that by their nature should survive will survive termination

## 15. General Provisions

- **Entire Agreement**: These Terms constitute the entire agreement between you and {{companyLegalName}}.
- **Waiver**: Our failure to enforce any provision shall not be deemed a waiver of that provision.
- **Severability**: If any provision is found to be unenforceable, the remaining provisions will continue in effect.
- **Assignment**: You may not assign your rights under these Terms without our prior written consent.

## 16. Contact Us

If you have questions about these Terms, please contact us:

**{{companyLegalName}}**
Email: {{companyEmailLegal}}
```

### Additional Templates (Summaries)

I'll provide abbreviated versions - the full templates follow similar patterns:

```markdown
<!-- templates/policies/cookie-policy.md -->
# Cookie Policy

Explains cookie types, purposes, third-party cookies, and how to manage preferences.
Variables: cookieRetentionDays, thirdPartyServices, etc.
```

```markdown
<!-- templates/policies/refund-policy.md -->
# Refund Policy

Details refund eligibility, process, timeframes, and exceptions.
Variables: refundPeriodDays, proRatedRefunds, nonRefundableItems, refundMethod, processingTimeDays
```

```markdown
<!-- templates/policies/sla.md -->
# Service Level Agreement

Uptime commitments, support response times, maintenance windows, credits.
Variables: uptimeTarget, responseTimeHours, maintenanceWindow, creditSchedule
```

```markdown
<!-- templates/policies/dpa.md -->
# Data Processing Agreement

GDPR-compliant DPA for B2B customers processing personal data.
Variables: Standard contractual clauses, subprocessors, security measures
```

```markdown
<!-- templates/policies/dsar.md -->
# Data Subject Access Request Procedure

How users can request their data (GDPR/CCPA compliance).
Variables: rightsContact, responseTimeDays
```

```markdown
<!-- templates/policies/security.md -->
# Security Policy

Security practices, reporting vulnerabilities, incident response.
Variables: encryptionStandard, certifications, incidentResponseHours
```

---

## Part 3: Generator Script

```typescript
// scripts/generate-policies.ts
import Handlebars from 'handlebars';
import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { join } from 'path';
import { marked } from 'marked';
import { COMPANY } from '../config/company';
import { POLICIES } from '../config/policies';

interface ProductConfig {
  name: string;
  domain: string;
  outputDir: string;
}

const PRODUCTS: ProductConfig[] = [
  {
    name: 'Tastier',
    domain: 'tastier.app',
    outputDir: 'packages/products/tastier/marketing/src/lib/policies',
  },
  {
    name: 'Cherishall',
    domain: 'cherishall.app',
    outputDir: 'packages/products/cherishall/marketing/src/lib/policies',
  },
];

async function loadTemplates(): Promise<Map<string, HandlebarsTemplateDelegate>> {
  const templates = new Map<string, HandlebarsTemplateDelegate>();
  const templatesDir = 'templates/policies';

  const files = await readdir(templatesDir);

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const name = file.replace('.md', '');
    const content = await readFile(join(templatesDir, file), 'utf-8');
    templates.set(name, Handlebars.compile(content));
  }

  return templates;
}

function buildContext(product: ProductConfig) {
  return {
    // Company
    companyLegalName: COMPANY.legalName,
    companyTradingName: COMPANY.tradingName,
    companyEntityType: COMPANY.entityType,
    companyJurisdiction: COMPANY.jurisdiction,
    companyAddressStreet: COMPANY.address.street,
    companyAddressCity: COMPANY.address.city,
    companyAddressState: COMPANY.address.state,
    companyAddressPostalCode: COMPANY.address.postalCode,
    companyAddressCountry: COMPANY.address.country,
    companyEmailGeneral: COMPANY.email.general,
    companyEmailSupport: COMPANY.email.support,
    companyEmailPrivacy: COMPANY.email.privacy,
    companyEmailLegal: COMPANY.email.legal,
    companyEmailSecurity: COMPANY.email.security,
    companyEmailDmca: COMPANY.email.dmca,

    // Product
    productName: product.name,
    productDomain: product.domain,

    // Dates
    effectiveDate: POLICIES.effectiveDate,
    lastUpdated: POLICIES.lastUpdated,

    // Privacy
    dataRetentionDays: POLICIES.privacy.dataRetentionDays,
    cookieRetentionDays: POLICIES.privacy.cookieRetentionDays,
    dataCollected: POLICIES.privacy.dataCollected,
    thirdPartyServices: POLICIES.privacy.thirdPartyServices,
    dataTransfers: POLICIES.privacy.dataTransfers,
    rightsContact: POLICIES.privacy.rightsContact,

    // Terms
    minimumAge: POLICIES.terms.minimumAge,
    arbitrationState: POLICIES.terms.arbitrationState,
    governingLaw: POLICIES.terms.governingLaw,
    classActionWaiver: POLICIES.terms.classActionWaiver,
    indemnification: POLICIES.terms.indemnification,

    // Refund
    refundPeriodDays: POLICIES.refund.refundPeriodDays,
    proRatedRefunds: POLICIES.refund.proRatedRefunds,
    nonRefundableItems: POLICIES.refund.nonRefundableItems,
    refundMethod: POLICIES.refund.refundMethod,
    processingTimeDays: POLICIES.refund.processingTimeDays,

    // SLA
    uptimeTarget: POLICIES.sla.uptimeTarget,
    responseTimeHours: POLICIES.sla.responseTimeHours,
    maintenanceWindow: POLICIES.sla.maintenanceWindow,
    creditSchedule: POLICIES.sla.creditSchedule,

    // Security
    encryptionStandard: POLICIES.security.encryptionStandard,
    certifications: POLICIES.security.certifications,
    incidentResponseHours: POLICIES.security.incidentResponseHours,
  };
}

async function generatePolicies() {
  // Register Handlebars helpers
  Handlebars.registerHelper('each', function(context, options) {
    let ret = '';
    for (let i = 0; i < context.length; i++) {
      ret += options.fn({ ...context[i], '@index': i, '@first': i === 0, '@last': i === context.length - 1 });
    }
    return ret;
  });

  const templates = await loadTemplates();

  for (const product of PRODUCTS) {
    console.log(`Generating policies for ${product.name}...`);

    const context = buildContext(product);
    await mkdir(product.outputDir, { recursive: true });

    for (const [name, template] of templates) {
      // Generate markdown
      const markdown = template(context);

      // Convert to HTML
      const html = await marked(markdown);

      // Write markdown
      await writeFile(
        join(product.outputDir, `${name}.md`),
        markdown
      );

      // Write JSON (for programmatic access)
      await writeFile(
        join(product.outputDir, `${name}.json`),
        JSON.stringify({
          name,
          markdown,
          html,
          effectiveDate: POLICIES.effectiveDate,
          lastUpdated: POLICIES.lastUpdated,
        }, null, 2)
      );

      console.log(`  ✓ ${name}`);
    }
  }

  console.log('\nPolicies generated successfully!');
}

generatePolicies().catch(console.error);
```

---

## Part 4: SvelteKit Integration

### Policy Page Component

```svelte
<!-- packages/products/tastier/marketing/src/routes/privacy/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import privacyPolicy from '$lib/policies/privacy-policy.json';
  import SEO from '@resist/ui/SEO.svelte';
</script>

<SEO
  title="Privacy Policy - Tastier"
  description="Learn how Tastier collects, uses, and protects your personal information."
  url={$page.url.href}
/>

<article class="policy">
  <div class="policy-meta">
    <p>Effective Date: {privacyPolicy.effectiveDate}</p>
    <p>Last Updated: {privacyPolicy.lastUpdated}</p>
  </div>

  <div class="policy-content">
    {@html privacyPolicy.html}
  </div>
</article>

<style>
  .policy {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .policy-meta {
    color: var(--color-text-muted);
    font-size: 0.875rem;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .policy-content :global(h1) {
    font-size: 2rem;
    margin-bottom: 1.5rem;
  }

  .policy-content :global(h2) {
    font-size: 1.5rem;
    margin-top: 2rem;
    margin-bottom: 1rem;
  }

  .policy-content :global(h3) {
    font-size: 1.25rem;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
  }

  .policy-content :global(p) {
    margin-bottom: 1rem;
    line-height: 1.7;
  }

  .policy-content :global(ul),
  .policy-content :global(ol) {
    margin-bottom: 1rem;
    padding-left: 1.5rem;
  }

  .policy-content :global(li) {
    margin-bottom: 0.5rem;
  }

  .policy-content :global(a) {
    color: var(--color-primary);
    text-decoration: underline;
  }
</style>
```

### Legal Index Page

```svelte
<!-- packages/products/tastier/marketing/src/routes/legal/+page.svelte -->
<script lang="ts">
  import SEO from '@resist/ui/SEO.svelte';

  const policies = [
    { name: 'Privacy Policy', href: '/privacy', description: 'How we handle your data' },
    { name: 'Terms of Service', href: '/terms', description: 'Rules for using our service' },
    { name: 'Cookie Policy', href: '/cookies', description: 'How we use cookies' },
    { name: 'Acceptable Use', href: '/legal/acceptable-use', description: 'What you can and cannot do' },
    { name: 'Refund Policy', href: '/legal/refund', description: 'Our refund terms' },
    { name: 'SLA', href: '/legal/sla', description: 'Service level agreement' },
    { name: 'DPA', href: '/legal/dpa', description: 'Data processing agreement' },
    { name: 'Security', href: '/legal/security', description: 'Our security practices' },
    { name: 'DMCA', href: '/legal/dmca', description: 'Copyright infringement policy' },
  ];
</script>

<SEO
  title="Legal - Tastier"
  description="Legal documents and policies for Tastier"
  url="/legal"
/>

<div class="legal-index">
  <h1>Legal</h1>
  <p class="subtitle">Our policies and legal documents</p>

  <div class="policies-grid">
    {#each policies as policy}
      <a href={policy.href} class="policy-card">
        <h2>{policy.name}</h2>
        <p>{policy.description}</p>
      </a>
    {/each}
  </div>
</div>
```

---

## Part 5: CI/CD Integration

### GitHub Workflow

```yaml
# .github/workflows/policies.yml
name: Generate Policies

on:
  push:
    branches: [main]
    paths:
      - 'config/company.ts'
      - 'config/policies.ts'
      - 'templates/policies/**'
  workflow_dispatch:

jobs:
  generate:
    name: Generate Policies
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

      - name: Generate policies
        run: pnpm tsx scripts/generate-policies.ts

      - name: Check for changes
        id: changes
        run: |
          if [[ -n $(git status --porcelain) ]]; then
            echo "changed=true" >> $GITHUB_OUTPUT
          fi

      - name: Commit changes
        if: steps.changes.outputs.changed == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add -A
          git commit -m "chore: regenerate policies [skip ci]"
          git push
```

---

## Summary

| Policy | Template | Auto-Generated |
|--------|----------|----------------|
| Privacy Policy | ✓ | ✓ |
| Terms of Service | ✓ | ✓ |
| Cookie Policy | ✓ | ✓ |
| Acceptable Use | ✓ | ✓ |
| DMCA Policy | ✓ | ✓ |
| Refund Policy | ✓ | ✓ |
| SLA | ✓ | ✓ |
| DPA | ✓ | ✓ |
| DSAR Procedure | ✓ | ✓ |
| Security Policy | ✓ | ✓ |
| Cancellation | ✓ | ✓ |
| Chargeback | ✓ | ✓ |

## Implementation Order

1. **Day 1**: Config schemas, company config
2. **Day 2**: Policies config
3. **Day 3**: Privacy Policy, Terms templates
4. **Day 4**: Cookie, Refund, SLA templates
5. **Day 5**: DPA, DSAR, Security templates
6. **Day 6**: Generator script, Handlebars setup
7. **Day 7**: SvelteKit integration, styling
8. **Day 8**: CI/CD workflow, testing
