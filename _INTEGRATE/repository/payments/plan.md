# Payments Plan

> Unified entitlements across web (Lemon Squeezy) and mobile (RevenueCat) with same products/pricing

## Overview

Users can purchase on any platform and access on all platforms. Single source of truth for entitlements stored in your D1 database, synced via webhooks from both payment providers.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Your System                                     │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         D1 Database                                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │   │
│  │  │   users     │  │ entitlements│  │     payment_events          │  │   │
│  │  │             │  │             │  │                             │  │   │
│  │  │ id          │  │ id          │  │ id                          │  │   │
│  │  │ email       │◄─│ user_id     │  │ provider (ls/rc)            │  │   │
│  │  │ rc_id       │  │ product_id  │  │ event_type                  │  │   │
│  │  │ ls_id       │  │ status      │  │ user_id                     │  │   │
│  │  └─────────────┘  │ source (ls/ │  │ payload                     │  │   │
│  │                   │         rc) │  │ created_at                  │  │   │
│  │                   │ expires_at  │  └─────────────────────────────┘  │   │
│  │                   └─────────────┘                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    ▲                                         │
│                                    │                                         │
│  ┌─────────────────────────────────┴────────────────────────────────────┐   │
│  │                      Webhook Handler Worker                           │   │
│  │                     /webhooks/payments                                │   │
│  └─────────────────────────────────┬────────────────────────────────────┘   │
│                                    │                                         │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
          ┌─────────────────┐               ┌─────────────────┐
          │  Lemon Squeezy  │               │   RevenueCat    │
          │     (Web)       │               │    (Mobile)     │
          │                 │               │                 │
          │ - Checkout      │               │ - iOS IAP       │
          │ - Subscriptions │               │ - Android IAP   │
          │ - One-time      │               │ - Subscriptions │
          │ - License keys  │               │                 │
          └─────────────────┘               └─────────────────┘
                    ▲                                 ▲
                    │                                 │
          ┌─────────┴─────────┐             ┌────────┴────────┐
          │    Web App        │             │   Mobile App    │
          │   (SvelteKit)     │             │   (Capacitor)   │
          └───────────────────┘             └─────────────────┘
```

## Product Catalog

### Define Products Once

```typescript
// config/products.ts
import * as v from 'valibot';

export const ProductSchema = v.object({
  id: v.string(), // Internal ID
  name: v.string(),
  description: v.string(),
  type: v.picklist(['subscription', 'one_time', 'consumable']),

  // Pricing (same across platforms)
  priceMonthly: v.optional(v.number()), // In cents
  priceYearly: v.optional(v.number()),
  priceOneTime: v.optional(v.number()),

  // Platform-specific IDs (set after creating in each platform)
  lemonSqueezyVariantId: v.optional(v.string()),
  revenueCatProductId: v.optional(v.string()),

  // Entitlements this product grants
  entitlements: v.array(v.string()),

  // Feature limits
  limits: v.optional(v.object({
    apiCalls: v.optional(v.number()),
    storage: v.optional(v.number()), // MB
    teamMembers: v.optional(v.number()),
  })),
});

export type Product = v.InferOutput<typeof ProductSchema>;

export const PRODUCTS: Product[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Basic features for personal use',
    type: 'subscription',
    priceMonthly: 0,
    priceYearly: 0,
    entitlements: ['basic_access'],
    limits: {
      apiCalls: 1000,
      storage: 100,
      teamMembers: 1,
    },
  },
  {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    description: 'Full features for professionals',
    type: 'subscription',
    priceMonthly: 999, // $9.99
    lemonSqueezyVariantId: 'var_xxx', // Set after LS setup
    revenueCatProductId: 'pro_monthly', // Set after RC setup
    entitlements: ['basic_access', 'pro_features', 'priority_support'],
    limits: {
      apiCalls: 50000,
      storage: 5000,
      teamMembers: 5,
    },
  },
  {
    id: 'pro_yearly',
    name: 'Pro Yearly',
    description: 'Full features, billed annually (2 months free)',
    type: 'subscription',
    priceYearly: 9999, // $99.99 (~$8.33/mo)
    lemonSqueezyVariantId: 'var_yyy',
    revenueCatProductId: 'pro_yearly',
    entitlements: ['basic_access', 'pro_features', 'priority_support'],
    limits: {
      apiCalls: 50000,
      storage: 5000,
      teamMembers: 5,
    },
  },
  {
    id: 'team_monthly',
    name: 'Team Monthly',
    description: 'For teams and organizations',
    type: 'subscription',
    priceMonthly: 2999, // $29.99
    lemonSqueezyVariantId: 'var_zzz',
    revenueCatProductId: 'team_monthly',
    entitlements: ['basic_access', 'pro_features', 'team_features', 'priority_support'],
    limits: {
      apiCalls: 200000,
      storage: 50000,
      teamMembers: 20,
    },
  },
  {
    id: 'lifetime',
    name: 'Lifetime Access',
    description: 'One-time purchase, lifetime access',
    type: 'one_time',
    priceOneTime: 29999, // $299.99
    lemonSqueezyVariantId: 'var_lifetime',
    // Note: RevenueCat doesn't support one-time purchases the same way
    // Could use non-renewing subscription or skip mobile for this
    entitlements: ['basic_access', 'pro_features', 'lifetime'],
    limits: {
      apiCalls: 100000,
      storage: 10000,
      teamMembers: 10,
    },
  },
];

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find(p => p.id === id);
}

export function getProductByLemonSqueezyVariant(variantId: string): Product | undefined {
  return PRODUCTS.find(p => p.lemonSqueezyVariantId === variantId);
}

export function getProductByRevenueCatProduct(productId: string): Product | undefined {
  return PRODUCTS.find(p => p.revenueCatProductId === productId);
}
```

---

## Part 1: Database Schema

### Entitlements Schema

```typescript
// packages/shared/db/src/schema/entitlements.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const entitlements = sqliteTable('entitlements', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // What they purchased
  productId: text('product_id').notNull(), // References config/products.ts

  // Where they purchased
  source: text('source', { enum: ['lemon_squeezy', 'revenuecat', 'manual'] }).notNull(),
  sourceSubscriptionId: text('source_subscription_id'), // LS subscription ID or RC subscriber ID

  // Status
  status: text('status', {
    enum: ['active', 'cancelled', 'expired', 'past_due', 'paused']
  }).notNull(),

  // Dates
  currentPeriodStart: integer('current_period_start', { mode: 'timestamp' }),
  currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }),
  cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),

  // Metadata
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  userIdIdx: index('entitlements_user_id_idx').on(table.userId),
  statusIdx: index('entitlements_status_idx').on(table.status),
  sourceSubIdx: index('entitlements_source_sub_idx').on(table.source, table.sourceSubscriptionId),
}));

// Payment events log (for debugging and auditing)
export const paymentEvents = sqliteTable('payment_events', {
  id: text('id').primaryKey(),
  provider: text('provider', { enum: ['lemon_squeezy', 'revenuecat'] }).notNull(),
  eventType: text('event_type').notNull(),
  eventId: text('event_id'), // Provider's event ID for deduplication
  userId: text('user_id').references(() => users.id),
  payload: text('payload', { mode: 'json' }), // Full webhook payload
  processedAt: integer('processed_at', { mode: 'timestamp' }),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  eventIdIdx: index('payment_events_event_id_idx').on(table.provider, table.eventId),
  userIdIdx: index('payment_events_user_id_idx').on(table.userId),
}));

// User payment identifiers
// Update users table to include:
// - lemonSqueezyCustomerId
// - revenueCatAppUserId
```

### Update Users Schema

```typescript
// Add to packages/shared/db/src/schema/users.ts
export const users = sqliteTable('users', {
  // ... existing fields ...

  // Payment provider IDs
  lemonSqueezyCustomerId: text('lemon_squeezy_customer_id').unique(),
  revenueCatAppUserId: text('revenuecat_app_user_id').unique(),
});
```

---

## Part 2: Lemon Squeezy Setup

### Account Setup (Manual)

1. Create account at lemonsqueezy.com
2. Complete business verification
3. Create Store
4. Add Products (matching config/products.ts)
5. Configure Webhooks

### API Configuration

```typescript
// packages/shared/payments/src/lemon-squeezy/client.ts
const LEMON_SQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1';

interface LemonSqueezyConfig {
  apiKey: string;
  storeId: string;
  webhookSecret: string;
}

export class LemonSqueezyClient {
  constructor(private config: LemonSqueezyConfig) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const response = await fetch(`${LEMON_SQUEEZY_API_URL}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Lemon Squeezy API error: ${response.status}`);
    }

    return response.json();
  }

  // Create checkout session
  async createCheckout(params: {
    variantId: string;
    email: string;
    userId: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    return this.request<{ data: { attributes: { url: string } } }>('POST', '/checkouts', {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: params.email,
            custom: {
              user_id: params.userId, // Link to your user
            },
          },
          product_options: {
            redirect_url: params.successUrl,
          },
        },
        relationships: {
          store: {
            data: { type: 'stores', id: this.config.storeId },
          },
          variant: {
            data: { type: 'variants', id: params.variantId },
          },
        },
      },
    });
  }

  // Get subscription
  async getSubscription(subscriptionId: string) {
    return this.request<{ data: any }>('GET', `/subscriptions/${subscriptionId}`);
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string) {
    return this.request<{ data: any }>('DELETE', `/subscriptions/${subscriptionId}`);
  }

  // Get customer portal URL
  async getCustomerPortalUrl(customerId: string) {
    return this.request<{ data: { attributes: { urls: { customer_portal: string } } } }>(
      'GET',
      `/customers/${customerId}`
    );
  }
}
```

### Webhook Handler

```typescript
// packages/products/tastier/api/src/webhooks/lemon-squeezy.ts
import { createHmac } from 'node:crypto';
import { getProductByLemonSqueezyVariant } from '@resist/config/products';
import { entitlements, paymentEvents, users } from '@resist/db';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';

interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: string;
    custom_data?: { user_id?: string };
  };
  data: {
    id: string;
    type: string;
    attributes: {
      store_id: number;
      customer_id: number;
      variant_id: number;
      status: string;
      renews_at?: string;
      ends_at?: string;
      user_email: string;
    };
  };
}

export async function handleLemonSqueezyWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  // Verify webhook signature
  const signature = request.headers.get('X-Signature');
  const rawBody = await request.text();

  if (!verifySignature(rawBody, signature, env.LEMON_SQUEEZY_WEBHOOK_SECRET)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const payload: LemonSqueezyWebhookPayload = JSON.parse(rawBody);
  const eventType = payload.meta.event_name;

  // Log event
  const db = getDb(env);
  const eventId = `ls_${payload.data.id}_${eventType}`;

  // Check for duplicate
  const existing = await db.query.paymentEvents.findFirst({
    where: eq(paymentEvents.eventId, eventId),
  });

  if (existing) {
    return new Response('Already processed', { status: 200 });
  }

  // Record event
  await db.insert(paymentEvents).values({
    id: ulid(),
    provider: 'lemon_squeezy',
    eventType,
    eventId,
    payload: payload as any,
    createdAt: new Date(),
  });

  try {
    switch (eventType) {
      case 'subscription_created':
      case 'subscription_updated':
        await handleSubscriptionChange(db, payload);
        break;

      case 'subscription_cancelled':
        await handleSubscriptionCancelled(db, payload);
        break;

      case 'subscription_expired':
        await handleSubscriptionExpired(db, payload);
        break;

      case 'order_created':
        // One-time purchases
        await handleOrderCreated(db, payload);
        break;
    }

    // Mark as processed
    await db
      .update(paymentEvents)
      .set({ processedAt: new Date() })
      .where(eq(paymentEvents.eventId, eventId));

    return new Response('OK', { status: 200 });
  } catch (error) {
    // Log error
    await db
      .update(paymentEvents)
      .set({ error: String(error) })
      .where(eq(paymentEvents.eventId, eventId));

    console.error('Webhook processing error:', error);
    return new Response('Processing error', { status: 500 });
  }
}

async function handleSubscriptionChange(db: Database, payload: LemonSqueezyWebhookPayload) {
  const { attributes } = payload.data;
  const userId = payload.meta.custom_data?.user_id;

  if (!userId) {
    throw new Error('No user_id in webhook custom_data');
  }

  const product = getProductByLemonSqueezyVariant(String(attributes.variant_id));
  if (!product) {
    throw new Error(`Unknown variant: ${attributes.variant_id}`);
  }

  // Update or create entitlement
  const existingEntitlement = await db.query.entitlements.findFirst({
    where: eq(entitlements.sourceSubscriptionId, String(payload.data.id)),
  });

  const status = mapLemonSqueezyStatus(attributes.status);

  if (existingEntitlement) {
    await db
      .update(entitlements)
      .set({
        status,
        currentPeriodEnd: attributes.renews_at ? new Date(attributes.renews_at) : null,
        updatedAt: new Date(),
      })
      .where(eq(entitlements.id, existingEntitlement.id));
  } else {
    await db.insert(entitlements).values({
      id: ulid(),
      userId,
      productId: product.id,
      source: 'lemon_squeezy',
      sourceSubscriptionId: String(payload.data.id),
      status,
      currentPeriodEnd: attributes.renews_at ? new Date(attributes.renews_at) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Update user's LS customer ID
  await db
    .update(users)
    .set({ lemonSqueezyCustomerId: String(attributes.customer_id) })
    .where(eq(users.id, userId));
}

async function handleSubscriptionCancelled(db: Database, payload: LemonSqueezyWebhookPayload) {
  await db
    .update(entitlements)
    .set({
      status: 'cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(entitlements.sourceSubscriptionId, String(payload.data.id)));
}

async function handleSubscriptionExpired(db: Database, payload: LemonSqueezyWebhookPayload) {
  await db
    .update(entitlements)
    .set({
      status: 'expired',
      updatedAt: new Date(),
    })
    .where(eq(entitlements.sourceSubscriptionId, String(payload.data.id)));
}

async function handleOrderCreated(db: Database, payload: LemonSqueezyWebhookPayload) {
  // Handle one-time purchases (lifetime, etc.)
  const userId = payload.meta.custom_data?.user_id;
  if (!userId) return;

  const product = getProductByLemonSqueezyVariant(String(payload.data.attributes.variant_id));
  if (!product || product.type !== 'one_time') return;

  await db.insert(entitlements).values({
    id: ulid(),
    userId,
    productId: product.id,
    source: 'lemon_squeezy',
    sourceSubscriptionId: String(payload.data.id),
    status: 'active',
    // No expiration for lifetime
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function mapLemonSqueezyStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'active': 'active',
    'on_trial': 'active',
    'paused': 'paused',
    'past_due': 'past_due',
    'cancelled': 'cancelled',
    'expired': 'expired',
  };
  return statusMap[status] || 'active';
}

function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;

  const hmac = createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');

  return signature === digest;
}
```

---

## Part 3: RevenueCat Setup

### Account Setup (Manual)

1. Create account at revenuecat.com
2. Create Project
3. Add iOS App (App Store Connect integration)
4. Add Android App (Google Play integration)
5. Create Products matching config/products.ts
6. Create Entitlements
7. Configure Webhooks

### SDK Integration (Capacitor)

```typescript
// packages/products/tastier/app/src/lib/purchases.ts
import { Purchases, LOG_LEVEL, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

const REVENUECAT_API_KEY_IOS = 'appl_xxx';
const REVENUECAT_API_KEY_ANDROID = 'goog_xxx';

export async function initializePurchases(userId: string) {
  if (!Capacitor.isNativePlatform()) {
    console.log('Purchases not available on web');
    return;
  }

  const apiKey = Capacitor.getPlatform() === 'ios'
    ? REVENUECAT_API_KEY_IOS
    : REVENUECAT_API_KEY_ANDROID;

  await Purchases.configure({
    apiKey,
    appUserID: userId, // Your user ID
  });

  // Enable debug logging in development
  if (import.meta.env.DEV) {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  }
}

export async function getOfferings() {
  const { offerings } = await Purchases.getOfferings();
  return offerings;
}

export async function purchasePackage(pkg: PurchasesPackage) {
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return { success: true, customerInfo };
  } catch (error: any) {
    if (error.userCancelled) {
      return { success: false, cancelled: true };
    }
    throw error;
  }
}

export async function restorePurchases() {
  const { customerInfo } = await Purchases.restorePurchases();
  return customerInfo;
}

export async function getCustomerInfo() {
  const { customerInfo } = await Purchases.getCustomerInfo();
  return customerInfo;
}

export async function syncWithBackend(userId: string) {
  // After any purchase, sync entitlements with your backend
  const customerInfo = await getCustomerInfo();

  await fetch('/api/purchases/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      revenueCatId: customerInfo.originalAppUserId,
      entitlements: customerInfo.entitlements.active,
    }),
  });
}
```

### Webhook Handler

```typescript
// packages/products/tastier/api/src/webhooks/revenuecat.ts
import { getProductByRevenueCatProduct } from '@resist/config/products';
import { entitlements, paymentEvents, users } from '@resist/db';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';

interface RevenueCatWebhookPayload {
  api_version: string;
  event: {
    id: string;
    type: string;
    app_user_id: string; // Your user ID
    original_app_user_id: string;
    product_id: string;
    entitlement_ids: string[];
    period_type: string;
    purchased_at_ms: number;
    expiration_at_ms?: number;
    store: string;
    environment: string;
  };
}

export async function handleRevenueCatWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  // Verify webhook (RevenueCat uses Bearer token)
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${env.REVENUECAT_WEBHOOK_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload: RevenueCatWebhookPayload = await request.json();
  const { event } = payload;

  const db = getDb(env);

  // Check for duplicate
  const existing = await db.query.paymentEvents.findFirst({
    where: eq(paymentEvents.eventId, event.id),
  });

  if (existing) {
    return new Response('Already processed', { status: 200 });
  }

  // Record event
  await db.insert(paymentEvents).values({
    id: ulid(),
    provider: 'revenuecat',
    eventType: event.type,
    eventId: event.id,
    userId: event.app_user_id,
    payload: payload as any,
    createdAt: new Date(),
  });

  try {
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
        await handlePurchase(db, event);
        break;

      case 'CANCELLATION':
        await handleCancellation(db, event);
        break;

      case 'EXPIRATION':
        await handleExpiration(db, event);
        break;

      case 'BILLING_ISSUE':
        await handleBillingIssue(db, event);
        break;
    }

    // Mark as processed
    await db
      .update(paymentEvents)
      .set({ processedAt: new Date() })
      .where(eq(paymentEvents.eventId, event.id));

    return new Response('OK', { status: 200 });
  } catch (error) {
    await db
      .update(paymentEvents)
      .set({ error: String(error) })
      .where(eq(paymentEvents.eventId, event.id));

    console.error('RevenueCat webhook error:', error);
    return new Response('Processing error', { status: 500 });
  }
}

async function handlePurchase(db: Database, event: RevenueCatWebhookPayload['event']) {
  const product = getProductByRevenueCatProduct(event.product_id);
  if (!product) {
    throw new Error(`Unknown product: ${event.product_id}`);
  }

  const userId = event.app_user_id;

  // Check for existing entitlement from this subscription
  const existingEntitlement = await db.query.entitlements.findFirst({
    where: eq(entitlements.sourceSubscriptionId, event.original_app_user_id),
  });

  const status = 'active';
  const expiresAt = event.expiration_at_ms
    ? new Date(event.expiration_at_ms)
    : null;

  if (existingEntitlement) {
    await db
      .update(entitlements)
      .set({
        productId: product.id,
        status,
        currentPeriodEnd: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(entitlements.id, existingEntitlement.id));
  } else {
    await db.insert(entitlements).values({
      id: ulid(),
      userId,
      productId: product.id,
      source: 'revenuecat',
      sourceSubscriptionId: event.original_app_user_id,
      status,
      currentPeriodStart: new Date(event.purchased_at_ms),
      currentPeriodEnd: expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Update user's RevenueCat ID
  await db
    .update(users)
    .set({ revenueCatAppUserId: event.original_app_user_id })
    .where(eq(users.id, userId));
}

async function handleCancellation(db: Database, event: RevenueCatWebhookPayload['event']) {
  await db
    .update(entitlements)
    .set({
      status: 'cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(entitlements.sourceSubscriptionId, event.original_app_user_id));
}

async function handleExpiration(db: Database, event: RevenueCatWebhookPayload['event']) {
  await db
    .update(entitlements)
    .set({
      status: 'expired',
      updatedAt: new Date(),
    })
    .where(eq(entitlements.sourceSubscriptionId, event.original_app_user_id));
}

async function handleBillingIssue(db: Database, event: RevenueCatWebhookPayload['event']) {
  await db
    .update(entitlements)
    .set({
      status: 'past_due',
      updatedAt: new Date(),
    })
    .where(eq(entitlements.sourceSubscriptionId, event.original_app_user_id));
}
```

---

## Part 4: Entitlement Service

### Check Entitlements

```typescript
// packages/shared/payments/src/entitlements.ts
import { getProductById, PRODUCTS } from '@resist/config/products';
import { entitlements } from '@resist/db';
import { eq, and, or, gt } from 'drizzle-orm';

export interface UserEntitlements {
  products: string[];
  entitlements: string[];
  limits: {
    apiCalls: number;
    storage: number;
    teamMembers: number;
  };
  subscription?: {
    productId: string;
    status: string;
    source: string;
    expiresAt?: Date;
    cancelledAt?: Date;
  };
}

export async function getUserEntitlements(
  db: Database,
  userId: string
): Promise<UserEntitlements> {
  // Get active entitlements
  const userEntitlements = await db.query.entitlements.findMany({
    where: and(
      eq(entitlements.userId, userId),
      or(
        eq(entitlements.status, 'active'),
        // Include cancelled but not yet expired
        and(
          eq(entitlements.status, 'cancelled'),
          gt(entitlements.currentPeriodEnd, new Date())
        )
      )
    ),
  });

  if (userEntitlements.length === 0) {
    // Return free tier
    const freeProduct = getProductById('free')!;
    return {
      products: ['free'],
      entitlements: freeProduct.entitlements,
      limits: freeProduct.limits!,
    };
  }

  // Aggregate entitlements (user might have multiple)
  const products = new Set<string>();
  const entitlementSet = new Set<string>();
  let bestLimits = { apiCalls: 0, storage: 0, teamMembers: 0 };
  let primarySubscription: UserEntitlements['subscription'];

  for (const ent of userEntitlements) {
    const product = getProductById(ent.productId);
    if (!product) continue;

    products.add(product.id);
    product.entitlements.forEach(e => entitlementSet.add(e));

    // Take highest limits
    if (product.limits) {
      bestLimits.apiCalls = Math.max(bestLimits.apiCalls, product.limits.apiCalls || 0);
      bestLimits.storage = Math.max(bestLimits.storage, product.limits.storage || 0);
      bestLimits.teamMembers = Math.max(bestLimits.teamMembers, product.limits.teamMembers || 0);
    }

    // Primary subscription (most recent active)
    if (!primarySubscription || ent.status === 'active') {
      primarySubscription = {
        productId: ent.productId,
        status: ent.status,
        source: ent.source,
        expiresAt: ent.currentPeriodEnd || undefined,
        cancelledAt: ent.cancelledAt || undefined,
      };
    }
  }

  return {
    products: Array.from(products),
    entitlements: Array.from(entitlementSet),
    limits: bestLimits,
    subscription: primarySubscription,
  };
}

export function hasEntitlement(userEntitlements: UserEntitlements, entitlement: string): boolean {
  return userEntitlements.entitlements.includes(entitlement);
}

export function hasProduct(userEntitlements: UserEntitlements, productId: string): boolean {
  return userEntitlements.products.includes(productId);
}
```

### API Endpoint

```typescript
// packages/products/tastier/api/src/routes/entitlements.ts
import { getUserEntitlements, hasEntitlement } from '@resist/payments/entitlements';

export async function getEntitlements(request: Request, env: Env): Promise<Response> {
  const userId = request.headers.get('X-User-Id'); // From auth middleware
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const db = getDb(env);
  const entitlements = await getUserEntitlements(db, userId);

  return new Response(JSON.stringify(entitlements), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// Middleware to check entitlement
export function requireEntitlement(entitlement: string) {
  return async (request: Request, env: Env, next: () => Promise<Response>) => {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const db = getDb(env);
    const userEntitlements = await getUserEntitlements(db, userId);

    if (!hasEntitlement(userEntitlements, entitlement)) {
      return new Response(JSON.stringify({
        error: 'UPGRADE_REQUIRED',
        message: `This feature requires the "${entitlement}" entitlement`,
        requiredEntitlement: entitlement,
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return next();
  };
}
```

---

## Part 5: Frontend Integration

### Web (Lemon Squeezy)

```svelte
<!-- packages/products/tastier/app/src/routes/pricing/+page.svelte -->
<script lang="ts">
  import { PRODUCTS } from '@resist/config/products';

  const { data } = $props();
  const user = data.user;

  async function checkout(productId: string) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product?.lemonSqueezyVariantId) return;

    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId: product.lemonSqueezyVariantId,
      }),
    });

    const { checkoutUrl } = await response.json();
    window.location.href = checkoutUrl;
  }

  async function openCustomerPortal() {
    const response = await fetch('/api/billing/portal');
    const { portalUrl } = await response.json();
    window.location.href = portalUrl;
  }
</script>

<div class="pricing-grid">
  {#each PRODUCTS.filter(p => p.type === 'subscription' && p.priceMonthly !== undefined) as product}
    <div class="pricing-card">
      <h3>{product.name}</h3>
      <p class="price">
        ${(product.priceMonthly! / 100).toFixed(2)}/mo
      </p>
      <ul>
        {#each product.entitlements as entitlement}
          <li>{entitlement}</li>
        {/each}
      </ul>
      <button onclick={() => checkout(product.id)}>
        {user.subscription?.productId === product.id ? 'Current Plan' : 'Subscribe'}
      </button>
    </div>
  {/each}
</div>

{#if user.subscription}
  <button onclick={openCustomerPortal}>
    Manage Subscription
  </button>
{/if}
```

### Mobile (RevenueCat)

```svelte
<!-- packages/products/tastier/app/src/lib/components/Paywall.svelte -->
<script lang="ts">
  import { getOfferings, purchasePackage, syncWithBackend } from '$lib/purchases';
  import { onMount } from 'svelte';
  import { Capacitor } from '@capacitor/core';

  let offerings = $state<any>(null);
  let loading = $state(true);
  let purchasing = $state(false);

  const { user } = $props();

  onMount(async () => {
    if (Capacitor.isNativePlatform()) {
      offerings = await getOfferings();
    }
    loading = false;
  });

  async function purchase(pkg: any) {
    purchasing = true;
    try {
      const result = await purchasePackage(pkg);
      if (result.success) {
        await syncWithBackend(user.id);
        // Refresh entitlements
        window.location.reload();
      }
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      purchasing = false;
    }
  }
</script>

{#if loading}
  <p>Loading...</p>
{:else if offerings?.current}
  <div class="packages">
    {#each offerings.current.availablePackages as pkg}
      <button
        onclick={() => purchase(pkg)}
        disabled={purchasing}
      >
        {pkg.product.title} - {pkg.product.priceString}
      </button>
    {/each}
  </div>
{:else}
  <!-- Web fallback - show Lemon Squeezy pricing -->
  <a href="/pricing">View Pricing</a>
{/if}
```

---

## Part 6: Syncing Between Platforms

### Link User Accounts

When a user signs in on both web and mobile, link their accounts:

```typescript
// packages/products/tastier/api/src/routes/purchases/link.ts
import { Purchases } from '@revenuecat/purchases-capacitor';

export async function linkRevenueCatAccount(
  request: Request,
  env: Env
): Promise<Response> {
  const userId = request.headers.get('X-User-Id');
  const { revenueCatAppUserId } = await request.json();

  const db = getDb(env);

  // Update user with RevenueCat ID
  await db
    .update(users)
    .set({ revenueCatAppUserId })
    .where(eq(users.id, userId));

  // Fetch current entitlements from RevenueCat and sync
  const rcEntitlements = await fetchRevenueCatEntitlements(
    env.REVENUECAT_API_KEY,
    revenueCatAppUserId
  );

  // Sync to database
  for (const ent of rcEntitlements.subscriber.entitlements) {
    // Create/update entitlements...
  }

  return new Response(JSON.stringify({ success: true }));
}

async function fetchRevenueCatEntitlements(apiKey: string, appUserId: string) {
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${appUserId}`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.json();
}
```

---

## Summary

| Component | Implementation |
|-----------|----------------|
| Products | Single config in `config/products.ts` |
| Web Payments | Lemon Squeezy checkout + webhooks |
| Mobile Payments | RevenueCat SDK + webhooks |
| Entitlements | Unified D1 table, checked via service |
| Cross-Platform | User IDs linked, webhooks sync state |

## Implementation Order

1. **Day 1**: Database schema, product config
2. **Day 2**: Lemon Squeezy account setup, products
3. **Day 3**: Lemon Squeezy webhook handler
4. **Day 4**: RevenueCat account setup, products
5. **Day 5**: RevenueCat webhook handler
6. **Day 6**: Entitlement service, API endpoints
7. **Day 7**: Web frontend (pricing, checkout)
8. **Day 8**: Mobile SDK integration
9. **Day 9**: Account linking, sync
10. **Day 10**: Testing, edge cases
