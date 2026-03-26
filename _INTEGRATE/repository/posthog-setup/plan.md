# PostHog Setup Plan

> **Purpose:** Configure PostHog for analytics, feature flags, session replay, and A/B testing across all products
> **Approach:** Cloud-hosted PostHog with API-driven project configuration

---

## Overview

PostHog serves as the unified analytics and experimentation platform:
- **Product Analytics** - Event tracking, funnels, user journeys
- **Feature Flags** - Gradual rollouts, A/B testing
- **Session Replay** - Debug user issues, understand UX
- **Experiments** - A/B tests with statistical analysis

---

## Account Structure

```
PostHog Organization: [Company Name]
├── Project: overseer (internal)
├── Project: [product-1] (production)
├── Project: [product-1]-staging
├── Project: [product-2] (production)
├── Project: [product-2]-staging
└── ...
```

**One project per product per environment** for data isolation.

---

## Initial Setup (Manual)

### 1. Create Account

1. Sign up at [posthog.com](https://posthog.com)
2. Choose Cloud (US or EU based on primary user base)
3. Create organization with company name
4. Enable 2FA on account

### 2. Organization Settings

- **Data Processing Agreement**: Sign if storing EU user data
- **Data Retention**: Configure based on plan (default 1 year)
- **Team Members**: Add via Google Workspace SSO if available

### 3. Create Initial Project

1. Create project for first product (production)
2. Note the Project API Key
3. Store in Infisical: `posthog/[product]/api-key`

---

## API-Driven Configuration

After initial account setup, automate project creation and configuration.

### PostHog API Client

```typescript
// packages/shared/utils/src/posthog-admin.ts
import * as v from 'valibot';

const PostHogProjectSchema = v.object({
  id: v.number(),
  name: v.string(),
  api_token: v.string(),
  organization: v.number(),
});

export class PostHogAdmin {
  private baseUrl = 'https://app.posthog.com/api';

  constructor(private personalApiKey: string) {}

  async createProject(orgId: number, name: string) {
    const response = await fetch(`${this.baseUrl}/organizations/${orgId}/projects/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.personalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    return v.parse(PostHogProjectSchema, await response.json());
  }

  async listProjects(orgId: number) {
    const response = await fetch(`${this.baseUrl}/organizations/${orgId}/projects/`, {
      headers: { 'Authorization': `Bearer ${this.personalApiKey}` },
    });

    return response.json();
  }

  async createFeatureFlag(projectId: number, flag: FeatureFlagConfig) {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/feature_flags/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.personalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(flag),
    });

    return response.json();
  }
}
```

### Project Setup Script

```typescript
// scripts/setup-posthog.ts
import { PostHogAdmin } from '@resist/utils/posthog-admin';
import { config } from '../config/business.config';

const posthog = new PostHogAdmin(process.env.POSTHOG_PERSONAL_API_KEY!);
const orgId = parseInt(process.env.POSTHOG_ORG_ID!);

async function setupPostHog() {
  for (const product of config.products) {
    // Create production project
    const prodProject = await posthog.createProject(
      orgId,
      product.name
    );
    console.log(`Created ${product.name}: ${prodProject.api_token}`);

    // Create staging project
    const stagingProject = await posthog.createProject(
      orgId,
      `${product.name}-staging`
    );
    console.log(`Created ${product.name}-staging: ${stagingProject.api_token}`);

    // Set up default feature flags
    await setupDefaultFlags(prodProject.id);
    await setupDefaultFlags(stagingProject.id);
  }
}

async function setupDefaultFlags(projectId: number) {
  const defaultFlags = [
    {
      key: 'maintenance-mode',
      name: 'Maintenance Mode',
      active: false,
      filters: { groups: [{ rollout_percentage: 0 }] },
    },
    {
      key: 'new-user-onboarding',
      name: 'New User Onboarding Flow',
      active: true,
      filters: { groups: [{ rollout_percentage: 100 }] },
    },
  ];

  for (const flag of defaultFlags) {
    await posthog.createFeatureFlag(projectId, flag);
  }
}

setupPostHog().catch(console.error);
```

---

## Client Integration

### Web (SvelteKit)

```typescript
// packages/products/[product]/app/src/lib/analytics.ts
import posthog from 'posthog-js';
import { browser } from '$app/environment';
import { PUBLIC_POSTHOG_KEY, PUBLIC_POSTHOG_HOST } from '$env/static/public';

export function initAnalytics() {
  if (!browser) return;

  posthog.init(PUBLIC_POSTHOG_KEY, {
    api_host: PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    capture_pageview: false, // Manual for SvelteKit
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    autocapture: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '[data-mask]',
    },
  });
}

export function identifyUser(userId: string, properties?: Record<string, any>) {
  posthog.identify(userId, properties);
}

export function trackEvent(event: string, properties?: Record<string, any>) {
  posthog.capture(event, properties);
}

export function trackPageView(path: string) {
  posthog.capture('$pageview', { $current_url: path });
}

export function getFeatureFlag(key: string): boolean | string | undefined {
  return posthog.getFeatureFlag(key);
}

export function isFeatureEnabled(key: string): boolean {
  return posthog.isFeatureEnabled(key) ?? false;
}
```

### SvelteKit Layout Integration

```svelte
<!-- packages/products/[product]/app/src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { initAnalytics, trackPageView, identifyUser } from '$lib/analytics';

  let { children, data } = $props();

  onMount(() => {
    initAnalytics();

    // Identify user if logged in
    if (data.user) {
      identifyUser(data.user.id, {
        email: data.user.email,
        plan: data.user.plan,
        created_at: data.user.createdAt,
      });
    }
  });

  // Track page views on navigation
  $effect(() => {
    trackPageView($page.url.pathname);
  });
</script>

{@render children()}
```

### Mobile (Capacitor)

```typescript
// packages/products/[product]/app/src/lib/analytics-mobile.ts
import { Capacitor } from '@capacitor/core';
import posthog from 'posthog-js';

export function initMobileAnalytics() {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
    persistence: 'localStorage',
    autocapture: false, // Manual for mobile
    capture_pageview: false,
  });

  // Add mobile-specific properties
  posthog.register({
    $os: Capacitor.getPlatform(),
    $app_version: import.meta.env.VITE_APP_VERSION,
    $device_type: 'mobile',
  });
}
```

### Server-Side (Workers)

```typescript
// packages/products/[product]/api/src/analytics.ts
import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

export function getPostHog(apiKey: string): PostHog {
  if (!posthogClient) {
    posthogClient = new PostHog(apiKey, {
      host: 'https://app.posthog.com',
      flushAt: 1, // Flush immediately for Workers (short-lived)
      flushInterval: 0,
    });
  }
  return posthogClient;
}

export async function trackServerEvent(
  posthog: PostHog,
  distinctId: string,
  event: string,
  properties?: Record<string, any>
) {
  posthog.capture({
    distinctId,
    event,
    properties: {
      ...properties,
      $lib: 'posthog-node',
      environment: 'server',
    },
  });

  // Flush immediately for Workers
  await posthog.flush();
}
```

---

## Standard Events

Define consistent event naming across all products:

```typescript
// packages/shared/types/src/analytics-events.ts

// User lifecycle
export const UserEvents = {
  SIGNED_UP: 'user_signed_up',
  LOGGED_IN: 'user_logged_in',
  LOGGED_OUT: 'user_logged_out',
  PASSWORD_RESET: 'user_password_reset',
  PROFILE_UPDATED: 'user_profile_updated',
  ACCOUNT_DELETED: 'user_account_deleted',
} as const;

// Subscription lifecycle
export const SubscriptionEvents = {
  TRIAL_STARTED: 'subscription_trial_started',
  TRIAL_ENDED: 'subscription_trial_ended',
  SUBSCRIBED: 'subscription_created',
  UPGRADED: 'subscription_upgraded',
  DOWNGRADED: 'subscription_downgraded',
  CANCELLED: 'subscription_cancelled',
  RENEWED: 'subscription_renewed',
  PAYMENT_FAILED: 'subscription_payment_failed',
} as const;

// Feature usage (product-specific, but pattern is standard)
export const FeatureEvents = {
  FEATURE_USED: 'feature_used', // { feature: string, context?: any }
  LIMIT_REACHED: 'feature_limit_reached', // { feature: string, limit: number }
  UPGRADE_PROMPT_SHOWN: 'upgrade_prompt_shown', // { feature: string, context: string }
  UPGRADE_PROMPT_CLICKED: 'upgrade_prompt_clicked',
  UPGRADE_PROMPT_DISMISSED: 'upgrade_prompt_dismissed',
} as const;

// Errors
export const ErrorEvents = {
  ERROR_OCCURRED: 'error_occurred', // { error_type, message, stack?, context? }
  API_ERROR: 'api_error', // { endpoint, status, message }
} as const;
```

---

## Feature Flags Configuration

### Flag Naming Convention

```
[category]-[feature-name]
```

Categories:
- `feature-` - New features being rolled out
- `experiment-` - A/B tests
- `ops-` - Operational flags (maintenance, etc.)
- `ui-` - UI variants

### Standard Flags (All Products)

```typescript
const standardFlags = [
  {
    key: 'ops-maintenance-mode',
    name: 'Maintenance Mode',
    description: 'Show maintenance page to all users',
    active: false,
  },
  {
    key: 'ops-read-only-mode',
    name: 'Read Only Mode',
    description: 'Disable all write operations',
    active: false,
  },
  {
    key: 'feature-new-onboarding',
    name: 'New Onboarding Flow',
    description: 'Updated first-run experience',
    active: true,
    filters: {
      groups: [{
        properties: [{ key: 'created_at', operator: 'is_date_after', value: '-7d' }],
        rollout_percentage: 100,
      }],
    },
  },
];
```

### Using Feature Flags

```svelte
<script lang="ts">
  import { isFeatureEnabled } from '$lib/analytics';

  let showNewOnboarding = $derived(isFeatureEnabled('feature-new-onboarding'));
</script>

{#if showNewOnboarding}
  <NewOnboarding />
{:else}
  <LegacyOnboarding />
{/if}
```

---

## Session Replay Configuration

### Privacy-First Setup

```typescript
posthog.init(API_KEY, {
  session_recording: {
    // Mask all inputs by default
    maskAllInputs: true,

    // Additional selectors to mask
    maskTextSelector: '[data-mask], .sensitive, .pii',

    // Block recording of specific elements
    blockSelector: '[data-no-record], .payment-form',

    // Only record on specific pages (optional)
    // recordCrossOriginIframes: false,
  },
});
```

### Opt-Out Support

```typescript
// Let users opt out of session recording
export function optOutOfRecording() {
  posthog.opt_out_capturing();
  localStorage.setItem('posthog-opt-out', 'true');
}

export function optInToRecording() {
  posthog.opt_in_capturing();
  localStorage.removeItem('posthog-opt-out');
}

// Check on init
if (localStorage.getItem('posthog-opt-out')) {
  posthog.opt_out_capturing();
}
```

---

## Dashboards

### Standard Dashboards to Create

1. **Product Overview**
   - Daily/Weekly/Monthly Active Users
   - New signups
   - Retention curves
   - Feature adoption

2. **Revenue**
   - MRR trend
   - Subscription events
   - Churn rate
   - Upgrade/downgrade ratio

3. **Engagement**
   - Session duration
   - Pages per session
   - Feature usage heatmap
   - User journey funnels

4. **Technical**
   - Error rates
   - API response times
   - Client-side errors
   - Mobile vs web split

---

## A/B Testing Workflow

### Creating an Experiment

1. Define hypothesis in Overseer or PostHog
2. Create feature flag with variants
3. Implement variants in code
4. Set experiment goals (conversion events)
5. Run until statistical significance
6. Roll out winner or iterate

### Example Experiment

```typescript
// PostHog experiment setup
const experiment = {
  name: 'Pricing Page CTA Test',
  feature_flag_key: 'experiment-pricing-cta',
  variants: ['control', 'variant-a', 'variant-b'],
  goals: [
    { event: 'subscription_created', conversion_window: 7 },
  ],
  minimum_sample_size: 1000,
};

// In code
const variant = getFeatureFlag('experiment-pricing-cta');

switch (variant) {
  case 'variant-a':
    return <CTAButton text="Start Free Trial" />;
  case 'variant-b':
    return <CTAButton text="Get Started Now" />;
  default:
    return <CTAButton text="Subscribe" />;
}
```

---

## Environment Variables

```bash
# .env.example

# Client-side (PUBLIC_ prefix for SvelteKit)
PUBLIC_POSTHOG_KEY=phc_xxx
PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Server-side
POSTHOG_API_KEY=phc_xxx

# Admin (for project management)
POSTHOG_PERSONAL_API_KEY=phx_xxx
POSTHOG_ORG_ID=12345
```

Store in Infisical:
- `posthog/[product]/client-key` - Public key for client
- `posthog/[product]/server-key` - Server-side key
- `posthog/admin/personal-key` - Personal API key for admin
- `posthog/admin/org-id` - Organization ID

---

## Overseer Integration

Overseer displays PostHog metrics via API:

```typescript
// In Overseer API
async function getProductMetrics(projectId: number) {
  const posthog = new PostHog(POSTHOG_PERSONAL_API_KEY);

  const insights = await fetch(
    `https://app.posthog.com/api/projects/${projectId}/insights/trend/`,
    {
      headers: { Authorization: `Bearer ${POSTHOG_PERSONAL_API_KEY}` },
      body: JSON.stringify({
        events: [{ id: 'user_signed_up' }, { id: '$pageview' }],
        date_from: '-7d',
      }),
    }
  );

  return insights.json();
}
```

---

## Implementation Checklist

### Initial Setup (Manual)
- [ ] Create PostHog account
- [ ] Set organization name
- [ ] Enable 2FA
- [ ] Sign DPA if needed
- [ ] Generate personal API key
- [ ] Store credentials in Infisical

### Per Product
- [ ] Create production project
- [ ] Create staging project
- [ ] Store API keys in Infisical
- [ ] Add client SDK to app
- [ ] Add server SDK to API
- [ ] Implement standard events
- [ ] Set up default feature flags
- [ ] Create standard dashboards

### Ongoing
- [ ] Review weekly metrics
- [ ] Clean up unused feature flags
- [ ] Archive completed experiments
- [ ] Update event documentation

---

## Cost Optimization

PostHog Cloud pricing is usage-based:
- Events: First 1M free, then per-event pricing
- Session recordings: Limited on free tier
- Feature flags: Unlimited

**Tips:**
- Use `capture_pageview: false` and track manually to avoid duplicate events
- Implement sampling for high-volume events
- Use `posthog.register()` for properties that don't change often
- Archive old session recordings periodically
