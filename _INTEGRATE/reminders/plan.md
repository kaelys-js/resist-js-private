# Reminders Plan

> Automated GitHub issues for SaaS maintenance tasks, renewals, and reviews

## Overview

A scheduled GitHub workflow that creates issues for recurring tasks. Ensures nothing falls through the cracks - domain renewals, certificate expiry, policy reviews, security audits, and more.

## Reminder Categories

### 1. Renewals & Expiry
- Domain renewals
- SSL certificates (if not auto-renewed)
- Apple Developer Program
- Google Play Developer Account
- Code signing certificates
- API keys with expiration

### 2. Reviews & Audits
- Security audit
- Privacy policy review
- Terms of service review
- Dependency audit
- Performance review
- Cost review

### 3. Compliance & Legal
- GDPR compliance check
- CCPA compliance check
- Accessibility audit
- License compliance check

### 4. Business Operations
- Pricing review
- Analytics review
- Customer feedback review
- Documentation review
- Backup verification

### 5. Technical Debt
- Dependency updates (major versions)
- Dead code cleanup
- Database optimization
- Log rotation check

---

## Configuration

```typescript
// config/reminders.ts
import * as v from 'valibot';

export const ReminderSchema = v.object({
  id: v.string(),
  title: v.string(),
  description: v.string(),
  category: v.picklist([
    'renewal',
    'review',
    'compliance',
    'operations',
    'technical',
  ]),
  schedule: v.union([
    // Fixed schedule
    v.object({
      type: v.literal('cron'),
      cron: v.string(), // Cron expression
    }),
    // Days before a date
    v.object({
      type: v.literal('before_date'),
      daysBeforeDate: v.number(),
      dateConfigKey: v.string(), // Key in dates config
    }),
    // Recurring from a date
    v.object({
      type: v.literal('recurring'),
      intervalDays: v.number(),
      startDate: v.string(), // ISO date
    }),
  ]),
  labels: v.array(v.string()),
  assignees: v.optional(v.array(v.string())),
  priority: v.picklist(['critical', 'high', 'medium', 'low']),
  checklist: v.optional(v.array(v.string())),
  links: v.optional(v.array(v.object({
    title: v.string(),
    url: v.string(),
  }))),
});

export type Reminder = v.InferOutput<typeof ReminderSchema>;

// Important dates
export const DATES = {
  // Domains (expiry dates)
  'domain:tastier.app': '2025-06-15',
  'domain:cherishall.app': '2025-06-15',
  'domain:resist.dev': '2025-06-15',

  // Developer accounts (renewal dates)
  'apple:developer': '2025-01-15',
  'google:developer': '2025-03-20',

  // Certificates
  'cert:ios:distribution': '2025-08-01',
  'cert:ios:development': '2025-08-01',
};

export const REMINDERS: Reminder[] = [
  // ============================================
  // RENEWALS
  // ============================================
  {
    id: 'domain-tastier',
    title: 'Domain Renewal: tastier.app',
    description: 'The domain tastier.app is expiring soon. Renew it to avoid service disruption.',
    category: 'renewal',
    schedule: {
      type: 'before_date',
      daysBeforeDate: 60,
      dateConfigKey: 'domain:tastier.app',
    },
    labels: ['reminder', 'reminder: renewal', 'priority: critical'],
    priority: 'critical',
    checklist: [
      'Check current registrar',
      'Verify auto-renew is enabled',
      'Update billing information if needed',
      'Renew for 2+ years if possible',
    ],
    links: [
      { title: 'Cloudflare Registrar', url: 'https://dash.cloudflare.com/?to=/:account/domains' },
    ],
  },
  {
    id: 'domain-cherishall',
    title: 'Domain Renewal: cherishall.app',
    description: 'The domain cherishall.app is expiring soon.',
    category: 'renewal',
    schedule: {
      type: 'before_date',
      daysBeforeDate: 60,
      dateConfigKey: 'domain:cherishall.app',
    },
    labels: ['reminder', 'reminder: renewal', 'priority: critical'],
    priority: 'critical',
    checklist: [
      'Check current registrar',
      'Verify auto-renew is enabled',
      'Update billing information if needed',
    ],
  },
  {
    id: 'apple-developer',
    title: 'Apple Developer Program Renewal',
    description: 'The Apple Developer Program membership is expiring. Renew to maintain App Store presence.',
    category: 'renewal',
    schedule: {
      type: 'before_date',
      daysBeforeDate: 30,
      dateConfigKey: 'apple:developer',
    },
    labels: ['reminder', 'reminder: renewal', 'priority: critical', 'area: mobile'],
    priority: 'critical',
    checklist: [
      'Log in to Apple Developer account',
      'Review billing information',
      'Renew membership ($99/year)',
      'Verify all certificates are still valid',
    ],
    links: [
      { title: 'Apple Developer', url: 'https://developer.apple.com/account' },
    ],
  },
  {
    id: 'google-play-developer',
    title: 'Google Play Developer Account Check',
    description: 'Annual check of Google Play Developer account status.',
    category: 'renewal',
    schedule: {
      type: 'before_date',
      daysBeforeDate: 30,
      dateConfigKey: 'google:developer',
    },
    labels: ['reminder', 'reminder: renewal', 'priority: high', 'area: mobile'],
    priority: 'high',
    checklist: [
      'Log in to Google Play Console',
      'Review account standing',
      'Check for any policy violations',
      'Update contact information if needed',
    ],
    links: [
      { title: 'Google Play Console', url: 'https://play.google.com/console' },
    ],
  },
  {
    id: 'ios-certificates',
    title: 'iOS Certificates Expiring',
    description: 'iOS distribution/development certificates are expiring. Regenerate via Fastlane match.',
    category: 'renewal',
    schedule: {
      type: 'before_date',
      daysBeforeDate: 30,
      dateConfigKey: 'cert:ios:distribution',
    },
    labels: ['reminder', 'reminder: renewal', 'priority: critical', 'area: mobile'],
    priority: 'critical',
    checklist: [
      'Run `fastlane match nuke distribution` (if needed)',
      'Run `fastlane match appstore`',
      'Run `fastlane match development`',
      'Update CI/CD secrets if certificates changed',
      'Test a build to verify',
    ],
  },

  // ============================================
  // REVIEWS & AUDITS
  // ============================================
  {
    id: 'security-audit-quarterly',
    title: 'Quarterly Security Audit',
    description: 'Perform quarterly security review of the codebase and infrastructure.',
    category: 'review',
    schedule: {
      type: 'cron',
      cron: '0 9 1 1,4,7,10 *', // 9 AM on 1st of Jan, Apr, Jul, Oct
    },
    labels: ['reminder', 'reminder: review', 'security', 'priority: high'],
    priority: 'high',
    checklist: [
      'Run `pnpm audit` and review vulnerabilities',
      'Check for outdated dependencies with known CVEs',
      'Review Cloudflare security events',
      'Review authentication logs for anomalies',
      'Check for exposed secrets in codebase',
      'Review API rate limiting effectiveness',
      'Test password reset flow',
      'Verify 2FA is working correctly',
    ],
  },
  {
    id: 'privacy-policy-review',
    title: 'Quarterly Privacy Policy Review',
    description: 'Review privacy policy to ensure it reflects current data practices.',
    category: 'compliance',
    schedule: {
      type: 'cron',
      cron: '0 9 15 1,4,7,10 *', // 9 AM on 15th of Jan, Apr, Jul, Oct
    },
    labels: ['reminder', 'reminder: review', 'priority: medium'],
    priority: 'medium',
    checklist: [
      'Review data collection practices',
      'Check third-party service list is current',
      'Verify data retention periods are accurate',
      'Ensure contact information is correct',
      'Update lastUpdated date if changes made',
      'Regenerate policies if config changed',
    ],
  },
  {
    id: 'terms-review',
    title: 'Quarterly Terms of Service Review',
    description: 'Review terms of service for accuracy and completeness.',
    category: 'compliance',
    schedule: {
      type: 'cron',
      cron: '0 9 15 1,4,7,10 *',
    },
    labels: ['reminder', 'reminder: review', 'priority: medium'],
    priority: 'medium',
    checklist: [
      'Review pricing and refund terms',
      'Check acceptable use policy is current',
      'Verify arbitration clause is appropriate',
      'Update lastUpdated date if changes made',
    ],
  },
  {
    id: 'dependency-audit-monthly',
    title: 'Monthly Dependency Audit',
    description: 'Review and update dependencies, especially major version updates.',
    category: 'technical',
    schedule: {
      type: 'cron',
      cron: '0 9 1 * *', // 9 AM on 1st of every month
    },
    labels: ['reminder', 'reminder: review', 'dependencies', 'priority: medium'],
    priority: 'medium',
    checklist: [
      'Run `pnpm outdated` to see all outdated packages',
      'Review Renovate PRs that are pending',
      'Check for any security advisories',
      'Test major version updates in staging',
      'Update CHANGELOG if significant updates',
    ],
  },
  {
    id: 'performance-review-monthly',
    title: 'Monthly Performance Review',
    description: 'Review application performance metrics and identify bottlenecks.',
    category: 'operations',
    schedule: {
      type: 'cron',
      cron: '0 9 5 * *', // 9 AM on 5th of every month
    },
    labels: ['reminder', 'reminder: review', 'priority: medium'],
    priority: 'medium',
    checklist: [
      'Review Cloudflare Analytics for response times',
      'Check Core Web Vitals in Search Console',
      'Review D1 query performance',
      'Check for slow API endpoints',
      'Review bundle sizes',
      'Run Lighthouse on marketing pages',
    ],
    links: [
      { title: 'Cloudflare Analytics', url: 'https://dash.cloudflare.com/?to=/:account/:zone/analytics' },
      { title: 'Search Console', url: 'https://search.google.com/search-console' },
    ],
  },
  {
    id: 'cost-review-monthly',
    title: 'Monthly Cost Review',
    description: 'Review infrastructure and service costs.',
    category: 'operations',
    schedule: {
      type: 'cron',
      cron: '0 9 3 * *', // 9 AM on 3rd of every month
    },
    labels: ['reminder', 'reminder: review', 'priority: low'],
    priority: 'low',
    checklist: [
      'Review Cloudflare billing',
      'Check Lemon Squeezy fees',
      'Review RevenueCat costs',
      'Check Google Workspace billing',
      'Review any other SaaS subscriptions',
      'Compare to previous month',
      'Identify optimization opportunities',
    ],
  },
  {
    id: 'analytics-review-monthly',
    title: 'Monthly Analytics Review',
    description: 'Review business metrics and user analytics.',
    category: 'operations',
    schedule: {
      type: 'cron',
      cron: '0 9 7 * *', // 9 AM on 7th of every month
    },
    labels: ['reminder', 'reminder: review', 'priority: medium'],
    priority: 'medium',
    checklist: [
      'Review user signups and activation',
      'Check conversion rates',
      'Review churn and retention',
      'Analyze feature usage',
      'Review error rates and support tickets',
      'Document key insights',
    ],
  },
  {
    id: 'backup-verification-monthly',
    title: 'Monthly Backup Verification',
    description: 'Verify that backups are working and data can be restored.',
    category: 'operations',
    schedule: {
      type: 'cron',
      cron: '0 9 10 * *', // 9 AM on 10th of every month
    },
    labels: ['reminder', 'reminder: review', 'priority: high'],
    priority: 'high',
    checklist: [
      'Verify D1 point-in-time recovery is available',
      'Check R2 versioning status',
      'Test database restore in staging',
      'Verify KV data can be exported',
      'Document any backup gaps',
    ],
  },

  // ============================================
  // COMPLIANCE
  // ============================================
  {
    id: 'accessibility-audit-quarterly',
    title: 'Quarterly Accessibility Audit',
    description: 'Ensure the application meets WCAG 2.1 AA standards.',
    category: 'compliance',
    schedule: {
      type: 'cron',
      cron: '0 9 20 1,4,7,10 *',
    },
    labels: ['reminder', 'reminder: review', 'priority: medium'],
    priority: 'medium',
    checklist: [
      'Run automated accessibility tests (axe-core)',
      'Test with screen reader (VoiceOver/NVDA)',
      'Check keyboard navigation',
      'Verify color contrast ratios',
      'Test with reduced motion preference',
      'Review form labels and error messages',
      'Document and fix issues found',
    ],
  },
  {
    id: 'gdpr-compliance-annual',
    title: 'Annual GDPR Compliance Review',
    description: 'Annual review of GDPR compliance for EU users.',
    category: 'compliance',
    schedule: {
      type: 'cron',
      cron: '0 9 15 5 *', // May 15th (around GDPR anniversary)
    },
    labels: ['reminder', 'reminder: review', 'priority: high'],
    priority: 'high',
    checklist: [
      'Review data processing activities',
      'Verify consent mechanisms are working',
      'Test DSAR (data subject access request) process',
      'Test data deletion request process',
      'Review third-party data processors',
      'Update DPA if needed',
      'Document compliance status',
    ],
  },

  // ============================================
  // TECHNICAL DEBT
  // ============================================
  {
    id: 'dead-code-cleanup-quarterly',
    title: 'Quarterly Dead Code Cleanup',
    description: 'Remove unused code, dependencies, and files.',
    category: 'technical',
    schedule: {
      type: 'cron',
      cron: '0 9 25 2,5,8,11 *', // Feb, May, Aug, Nov
    },
    labels: ['reminder', 'reminder: review', 'type: chore', 'priority: low'],
    priority: 'low',
    checklist: [
      'Run dead code detection tools',
      'Review unused dependencies',
      'Check for commented-out code',
      'Remove unused feature flags',
      'Clean up old migrations',
      'Archive outdated documentation',
    ],
  },
  {
    id: 'documentation-review-quarterly',
    title: 'Quarterly Documentation Review',
    description: 'Ensure documentation is accurate and up-to-date.',
    category: 'operations',
    schedule: {
      type: 'cron',
      cron: '0 9 1 3,6,9,12 *', // Mar, Jun, Sep, Dec
    },
    labels: ['reminder', 'reminder: review', 'type: docs', 'priority: medium'],
    priority: 'medium',
    checklist: [
      'Review README accuracy',
      'Check API documentation matches implementation',
      'Update architecture diagrams if needed',
      'Review onboarding documentation',
      'Check for broken links',
      'Update screenshots if UI changed',
    ],
  },

  // ============================================
  // ANNUAL
  // ============================================
  {
    id: 'penetration-test-annual',
    title: 'Annual Penetration Test',
    description: 'Schedule annual security penetration test.',
    category: 'compliance',
    schedule: {
      type: 'cron',
      cron: '0 9 1 11 *', // November 1st
    },
    labels: ['reminder', 'reminder: review', 'security', 'priority: high'],
    priority: 'high',
    checklist: [
      'Research penetration testing firms',
      'Get quotes and schedule',
      'Prepare staging environment',
      'Coordinate with team',
      'Review and act on findings',
    ],
  },
  {
    id: 'pricing-review-annual',
    title: 'Annual Pricing Review',
    description: 'Review pricing strategy and competitor landscape.',
    category: 'operations',
    schedule: {
      type: 'cron',
      cron: '0 9 15 1 *', // January 15th
    },
    labels: ['reminder', 'reminder: review', 'priority: medium'],
    priority: 'medium',
    checklist: [
      'Review current pricing performance',
      'Analyze competitor pricing',
      'Review cost structure',
      'Consider new pricing tiers',
      'Plan any price changes (with notice)',
      'Update documentation if changes made',
    ],
  },
];
```

---

## Implementation

### GitHub Workflow

```yaml
# .github/workflows/reminders.yml
name: Reminders

on:
  schedule:
    # Run daily at 9 AM UTC
    - cron: '0 9 * * *'
  workflow_dispatch:
    inputs:
      force_all:
        description: 'Force create all reminders (ignore schedule)'
        required: false
        type: boolean
        default: false

jobs:
  create-reminders:
    name: Create Reminder Issues
    runs-on: ubuntu-latest
    permissions:
      issues: write
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

      - name: Create reminders
        run: pnpm tsx scripts/create-reminders.ts
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          FORCE_ALL: ${{ inputs.force_all }}
```

### Reminder Script

```typescript
// scripts/create-reminders.ts
import { Octokit } from '@octokit/rest';
import { REMINDERS, DATES, type Reminder } from '../config/reminders';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const OWNER = 'resist-js';
const REPO = 'resist.js';

async function getExistingIssues(): Promise<Set<string>> {
  const issues = await octokit.paginate(octokit.issues.listForRepo, {
    owner: OWNER,
    repo: REPO,
    state: 'open',
    labels: 'reminder',
  });

  // Extract reminder IDs from issue titles
  const existingIds = new Set<string>();
  for (const issue of issues) {
    const match = issue.title.match(/\[([^\]]+)\]/);
    if (match) {
      existingIds.add(match[1]);
    }
  }

  return existingIds;
}

function shouldCreateReminder(reminder: Reminder, today: Date): boolean {
  const schedule = reminder.schedule;

  if (schedule.type === 'cron') {
    // Parse cron and check if today matches
    return matchesCron(schedule.cron, today);
  }

  if (schedule.type === 'before_date') {
    const targetDate = new Date(DATES[schedule.dateConfigKey as keyof typeof DATES]);
    const daysUntil = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= schedule.daysBeforeDate && daysUntil > 0;
  }

  if (schedule.type === 'recurring') {
    const startDate = new Date(schedule.startDate);
    const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceStart >= 0 && daysSinceStart % schedule.intervalDays === 0;
  }

  return false;
}

function matchesCron(cron: string, date: Date): boolean {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = cron.split(' ');

  const matches = (field: string, value: number): boolean => {
    if (field === '*') return true;
    if (field.includes(',')) {
      return field.split(',').map(Number).includes(value);
    }
    if (field.includes('/')) {
      const [, step] = field.split('/');
      return value % Number(step) === 0;
    }
    return Number(field) === value;
  };

  return (
    matches(dayOfMonth, date.getDate()) &&
    matches(month, date.getMonth() + 1) &&
    matches(dayOfWeek, date.getDay())
  );
}

function buildIssueBody(reminder: Reminder): string {
  let body = `## Description\n\n${reminder.description}\n\n`;

  if (reminder.checklist && reminder.checklist.length > 0) {
    body += `## Checklist\n\n`;
    for (const item of reminder.checklist) {
      body += `- [ ] ${item}\n`;
    }
    body += '\n';
  }

  if (reminder.links && reminder.links.length > 0) {
    body += `## Useful Links\n\n`;
    for (const link of reminder.links) {
      body += `- [${link.title}](${link.url})\n`;
    }
    body += '\n';
  }

  body += `---\n\n`;
  body += `*This issue was automatically created by the reminders workflow.*\n`;
  body += `*Reminder ID: \`${reminder.id}\`*`;

  return body;
}

async function createIssue(reminder: Reminder): Promise<void> {
  const title = `[${reminder.id}] ${reminder.title}`;

  await octokit.issues.create({
    owner: OWNER,
    repo: REPO,
    title,
    body: buildIssueBody(reminder),
    labels: reminder.labels,
    assignees: reminder.assignees,
  });

  console.log(`Created issue: ${title}`);
}

async function main() {
  const today = new Date();
  const forceAll = process.env.FORCE_ALL === 'true';

  console.log(`Running reminders check for ${today.toISOString().split('T')[0]}`);

  // Get existing open reminder issues
  const existingIssues = await getExistingIssues();
  console.log(`Found ${existingIssues.size} existing reminder issues`);

  for (const reminder of REMINDERS) {
    // Skip if issue already exists
    if (existingIssues.has(reminder.id)) {
      console.log(`Skipping ${reminder.id} - issue already exists`);
      continue;
    }

    // Check if reminder should be created today
    if (forceAll || shouldCreateReminder(reminder, today)) {
      await createIssue(reminder);
    }
  }

  console.log('Reminders check complete');
}

main().catch(console.error);
```

---

## Complete Reminder List

### Renewals (Before Expiry)

| Reminder | Trigger | Priority |
|----------|---------|----------|
| Domain: tastier.app | 60 days before | Critical |
| Domain: cherishall.app | 60 days before | Critical |
| Domain: resist.dev | 60 days before | Critical |
| Apple Developer Program | 30 days before | Critical |
| Google Play Developer | 30 days before | High |
| iOS Certificates | 30 days before | Critical |
| Android Keystore | 30 days before | Critical |

### Monthly

| Reminder | Day | Priority |
|----------|-----|----------|
| Dependency Audit | 1st | Medium |
| Cost Review | 3rd | Low |
| Performance Review | 5th | Medium |
| Analytics Review | 7th | Medium |
| Backup Verification | 10th | High |

### Quarterly

| Reminder | Months | Priority |
|----------|--------|----------|
| Security Audit | Jan, Apr, Jul, Oct | High |
| Privacy Policy Review | Jan, Apr, Jul, Oct | Medium |
| Terms of Service Review | Jan, Apr, Jul, Oct | Medium |
| Accessibility Audit | Jan, Apr, Jul, Oct | Medium |
| Dead Code Cleanup | Feb, May, Aug, Nov | Low |
| Documentation Review | Mar, Jun, Sep, Dec | Medium |

### Annual

| Reminder | Month | Priority |
|----------|-------|----------|
| GDPR Compliance Review | May | High |
| Penetration Test | November | High |
| Pricing Review | January | Medium |

---

## Summary

| Category | Count | Frequency |
|----------|-------|-----------|
| Renewals | 7 | Before expiry |
| Reviews | 6 | Monthly/Quarterly |
| Compliance | 3 | Quarterly/Annual |
| Operations | 5 | Monthly/Quarterly |
| Technical | 2 | Quarterly |

## Implementation Order

1. **Day 1**: Config schema, dates config
2. **Day 2**: Reminders config (all reminders)
3. **Day 3**: Cron matching logic
4. **Day 4**: GitHub issue creation script
5. **Day 5**: GitHub workflow
6. **Day 6**: Testing, documentation
