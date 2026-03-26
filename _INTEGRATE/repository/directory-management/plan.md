# Directory Management Plan

> **Purpose:** Automated directory submissions and ongoing listing maintenance
> **Goal:** Submit once, sync forever - directories stay updated automatically
> **Integration:** Managed via Overseer, product info is single source of truth

---

## Overview

Directory management handles:
1. **Initial submission** to 100+ directories
2. **Ongoing sync** when product info changes
3. **Traffic attribution** to see which directories drive users
4. **Listing health** monitoring

```
Product Info (Overseer)           Directory Sync              Directories
───────────────────────           ──────────────              ───────────
Name, description, logo   ───►    API submissions    ───►    Product Hunt
Pricing, features         ───►    Form pre-fill      ───►    G2, Capterra
Screenshots, links        ───►    Update detection   ───►    100+ more
                                  Traffic tracking   ◄───    UTM attribution
```

---

## Directory Tiers

### Tier 1: High Impact (API Available)

| Directory | API | Traffic Potential | Notes |
|-----------|-----|-------------------|-------|
| Product Hunt | Limited | High | Manual launches, API for updates |
| G2 | Yes | High | Enterprise credibility |
| Capterra | Yes | High | Software buyers |
| GetApp | Yes | Medium | Part of Gartner |
| Software Advice | Yes | Medium | Part of Gartner |
| AlternativeTo | No | Medium | Manual, high SEO |
| Stackshare | Yes | Medium | Developer tools |

### Tier 2: Developer/Tech (Often API)

| Directory | API | Traffic Potential | Notes |
|-----------|-----|-------------------|-------|
| DevHunt | Yes | Medium | Developer tools |
| SaaSHub | Yes | Medium | SaaS comparison |
| BetaList | No | Low-Medium | Pre-launch |
| Launching Next | No | Low | Startup launches |
| There's An AI For That | Form | Medium | AI tools |
| Futurepedia | Form | Medium | AI tools |
| ToolPilot | Form | Low | AI tools |

### Tier 3: General/SEO Value

| Directory | API | Traffic Potential | Notes |
|-----------|-----|-------------------|-------|
| Crunchbase | Yes | Medium | Business credibility |
| AngelList | Yes | Low | Startup ecosystem |
| F6S | Form | Low | Startup programs |
| StartupBase | Form | Low | Backlink value |
| 100+ others | Varies | Low each | SEO/backlink value |

---

## Data Model

### D1 Schema (Overseer)

```sql
-- Canonical product information (source of truth)
CREATE TABLE product_info (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL, -- Which product in monorepo
  name TEXT NOT NULL,
  tagline TEXT, -- Short description (60 chars)
  description TEXT, -- Full description
  short_description TEXT, -- 150-200 chars
  long_description TEXT, -- 500+ chars
  category TEXT,
  subcategory TEXT,
  tags TEXT, -- JSON array
  logo_url TEXT,
  icon_url TEXT,
  screenshot_urls TEXT, -- JSON array
  video_url TEXT,
  website_url TEXT,
  app_store_url TEXT,
  play_store_url TEXT,
  pricing_model TEXT, -- free, freemium, paid, enterprise
  pricing_details TEXT, -- JSON: tiers, prices
  features TEXT, -- JSON array of feature objects
  integrations TEXT, -- JSON array
  founded_date TEXT,
  company_name TEXT,
  company_location TEXT,
  team_size TEXT,
  social_links TEXT, -- JSON: twitter, linkedin, etc.
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Directory registry
CREATE TABLE directories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT, -- tech, general, ai, saas, startup
  has_api INTEGER DEFAULT 0,
  api_docs_url TEXT,
  submission_url TEXT,
  submission_type TEXT, -- api, form, email, manual
  estimated_traffic TEXT, -- high, medium, low
  dofollow_links INTEGER DEFAULT 0, -- SEO value
  requires_approval INTEGER DEFAULT 1,
  typical_approval_days INTEGER,
  notes TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Directory submissions
CREATE TABLE directory_submissions (
  id TEXT PRIMARY KEY,
  directory_id TEXT REFERENCES directories(id),
  product_info_id TEXT REFERENCES product_info(id),
  status TEXT DEFAULT 'pending', -- pending, submitted, approved, rejected, live
  submitted_at TEXT,
  approved_at TEXT,
  listing_url TEXT,
  directory_listing_id TEXT, -- ID from directory if available
  last_synced_at TEXT,
  sync_status TEXT, -- synced, needs_update, sync_failed
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Traffic from directories
CREATE TABLE directory_traffic (
  id TEXT PRIMARY KEY,
  submission_id TEXT REFERENCES directory_submissions(id),
  date TEXT NOT NULL,
  visits INTEGER DEFAULT 0,
  signups INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(submission_id, date)
);
```

---

## Product Info Management

### Single Source of Truth

All directory listings pull from `product_info` table:

```typescript
// When you update product info in Overseer
export async function updateProductInfo(
  productId: string,
  updates: Partial<ProductInfo>
) {
  // Update canonical info
  await db
    .update(productInfo)
    .set({ ...updates, updated_at: new Date().toISOString() })
    .where(eq(productInfo.product_id, productId));

  // Queue sync for all live submissions
  const submissions = await db
    .select()
    .from(directorySubmissions)
    .where(
      and(
        eq(directorySubmissions.product_info_id, productId),
        eq(directorySubmissions.status, 'live')
      )
    );

  for (const sub of submissions) {
    await queueDirectorySync(sub.id);
  }
}
```

### Required Fields by Directory

Different directories need different info:

```typescript
const directoryRequirements: Record<string, string[]> = {
  'product-hunt': ['name', 'tagline', 'description', 'logo_url', 'screenshot_urls'],
  'g2': ['name', 'description', 'category', 'pricing_model', 'features'],
  'capterra': ['name', 'description', 'category', 'pricing_details', 'screenshot_urls'],
  'stackshare': ['name', 'description', 'category', 'integrations'],
  // ... etc
};

export function validateForDirectory(
  productInfo: ProductInfo,
  directoryId: string
): ValidationResult {
  const required = directoryRequirements[directoryId] || [];
  const missing = required.filter(field => !productInfo[field]);
  return {
    valid: missing.length === 0,
    missing,
  };
}
```

---

## Submission Workflows

### Workflow 1: API Submission

```typescript
// For directories with APIs (G2, Capterra, etc.)
export async function submitViaApi(
  directoryId: string,
  productInfoId: string
): Promise<SubmissionResult> {
  const directory = await getDirectory(directoryId);
  const product = await getProductInfo(productInfoId);

  // Validate requirements
  const validation = validateForDirectory(product, directoryId);
  if (!validation.valid) {
    throw new Error(`Missing fields: ${validation.missing.join(', ')}`);
  }

  // Get API client for directory
  const client = getDirectoryClient(directory);

  // Submit
  const result = await client.submit({
    name: product.name,
    description: product.description,
    // ... map fields to directory's schema
  });

  // Track submission
  await db.insert(directorySubmissions).values({
    id: generateId(),
    directory_id: directoryId,
    product_info_id: productInfoId,
    status: result.requiresApproval ? 'submitted' : 'live',
    submitted_at: new Date().toISOString(),
    directory_listing_id: result.listingId,
    listing_url: result.listingUrl,
  });

  return result;
}
```

### Workflow 2: Assisted Form Submission

For directories without APIs, pre-fill a submission template:

```typescript
// Generate pre-filled content for manual submission
export async function generateSubmissionContent(
  directoryId: string,
  productInfoId: string
): Promise<SubmissionContent> {
  const directory = await getDirectory(directoryId);
  const product = await getProductInfo(productInfoId);

  return {
    directoryName: directory.name,
    submissionUrl: directory.submission_url,
    fields: {
      name: product.name,
      tagline: product.tagline,
      description: truncate(product.description, getMaxLength(directory, 'description')),
      website: addUtmParams(product.website_url, directory.id),
      category: mapCategory(product.category, directory),
      // ... etc
    },
    instructions: getSubmissionInstructions(directory),
  };
}
```

### Workflow 3: Bulk Submission

Submit to multiple directories at once:

```typescript
export async function bulkSubmit(
  productInfoId: string,
  directoryIds: string[]
): Promise<BulkSubmissionResult> {
  const results: SubmissionResult[] = [];

  // Prioritize API submissions
  const directories = await getDirectories(directoryIds);
  const apiDirs = directories.filter(d => d.has_api);
  const manualDirs = directories.filter(d => !d.has_api);

  // Auto-submit to API directories
  for (const dir of apiDirs) {
    try {
      const result = await submitViaApi(dir.id, productInfoId);
      results.push({ directory: dir.name, status: 'submitted', ...result });
    } catch (error) {
      results.push({ directory: dir.name, status: 'failed', error: error.message });
    }
  }

  // Generate content for manual directories
  const manualContent = await Promise.all(
    manualDirs.map(dir => generateSubmissionContent(dir.id, productInfoId))
  );

  return {
    apiSubmissions: results,
    manualSubmissions: manualContent,
    summary: {
      total: directoryIds.length,
      autoSubmitted: results.filter(r => r.status === 'submitted').length,
      needsManual: manualContent.length,
      failed: results.filter(r => r.status === 'failed').length,
    },
  };
}
```

---

## Directory Sync

### Sync on Product Update

```typescript
// Cron job: Check for products that need sync
export async function syncOutdatedListings(env: Env) {
  // Find submissions where product_info updated after last_synced_at
  const outdated = await db
    .select()
    .from(directorySubmissions)
    .innerJoin(productInfo, eq(directorySubmissions.product_info_id, productInfo.id))
    .innerJoin(directories, eq(directorySubmissions.directory_id, directories.id))
    .where(
      and(
        eq(directorySubmissions.status, 'live'),
        eq(directories.has_api, 1),
        gt(productInfo.updated_at, directorySubmissions.last_synced_at)
      )
    );

  for (const { directory_submissions: sub, directories: dir, product_info: product } of outdated) {
    try {
      await syncListing(sub, dir, product);
    } catch (error) {
      await markSyncFailed(sub.id, error.message);
    }
  }
}

async function syncListing(
  submission: DirectorySubmission,
  directory: Directory,
  product: ProductInfo
) {
  const client = getDirectoryClient(directory);

  await client.update(submission.directory_listing_id, {
    name: product.name,
    description: product.description,
    // ... map fields
  });

  await db
    .update(directorySubmissions)
    .set({
      last_synced_at: new Date().toISOString(),
      sync_status: 'synced',
    })
    .where(eq(directorySubmissions.id, submission.id));
}
```

### Manual Sync Alerts

For directories without APIs, alert when update is needed:

```typescript
export async function checkManualSyncNeeded() {
  const needsUpdate = await db
    .select()
    .from(directorySubmissions)
    .innerJoin(productInfo, eq(directorySubmissions.product_info_id, productInfo.id))
    .innerJoin(directories, eq(directorySubmissions.directory_id, directories.id))
    .where(
      and(
        eq(directorySubmissions.status, 'live'),
        eq(directories.has_api, 0),
        gt(productInfo.updated_at, directorySubmissions.last_synced_at)
      )
    );

  if (needsUpdate.length > 0) {
    await createAlert({
      type: 'directory_update_needed',
      severity: 'info',
      message: `${needsUpdate.length} directory listings need manual update`,
      metadata: { submissions: needsUpdate.map(n => n.directory_submissions.id) },
    });
  }
}
```

---

## Traffic Attribution

### UTM Parameter Strategy

All directory links include UTM params:

```typescript
export function addUtmParams(url: string, directoryId: string): string {
  const params = new URLSearchParams({
    utm_source: 'directory',
    utm_medium: 'listing',
    utm_campaign: directoryId,
  });

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${params.toString()}`;
}
```

### Traffic Collection

Pull from PostHog:

```typescript
// Daily cron job
export async function collectDirectoryTraffic(env: Env) {
  const yesterday = subDays(new Date(), 1);

  // Get visits by utm_campaign (directory ID)
  const traffic = await posthog.query({
    query: `
      SELECT
        properties.utm_campaign as directory_id,
        count() as visits,
        countIf(event = 'user_signed_up') as signups,
        countIf(event = 'subscription_created') as conversions
      FROM events
      WHERE
        properties.utm_source = 'directory'
        AND timestamp >= '${yesterday.toISOString()}'
        AND timestamp < '${new Date().toISOString()}'
      GROUP BY directory_id
    `,
  });

  for (const row of traffic) {
    const submission = await findSubmissionByDirectory(row.directory_id);
    if (submission) {
      await db.insert(directoryTraffic).values({
        id: generateId(),
        submission_id: submission.id,
        date: yesterday.toISOString().split('T')[0],
        visits: row.visits,
        signups: row.signups,
        conversions: row.conversions,
      });
    }
  }
}
```

---

## Directory Database

### Pre-populated Directory List

Seed with 100+ directories:

```typescript
const directories: Directory[] = [
  // Tier 1: High Impact
  {
    id: 'product-hunt',
    name: 'Product Hunt',
    url: 'https://producthunt.com',
    category: 'startup',
    has_api: 0, // Manual launches
    submission_url: 'https://producthunt.com/posts/new',
    estimated_traffic: 'high',
    dofollow_links: 1,
  },
  {
    id: 'g2',
    name: 'G2',
    url: 'https://g2.com',
    category: 'saas',
    has_api: 1,
    api_docs_url: 'https://developer.g2.com',
    estimated_traffic: 'high',
    dofollow_links: 1,
  },
  // ... 100+ more
];
```

### Directory API Clients

```typescript
// packages/tools/admin/src/lib/directories/clients/

// G2 Client
export class G2Client {
  constructor(private apiKey: string) {}

  async submit(listing: G2Listing): Promise<SubmissionResult> {
    // G2 API implementation
  }

  async update(listingId: string, updates: Partial<G2Listing>): Promise<void> {
    // Update implementation
  }
}

// Capterra Client (Gartner Digital Markets API)
export class CapterraClient {
  constructor(private apiKey: string) {}

  async submit(listing: CapterraListing): Promise<SubmissionResult> {
    // Capterra API implementation
  }
}

// Factory
export function getDirectoryClient(directory: Directory): DirectoryClient {
  switch (directory.id) {
    case 'g2':
      return new G2Client(env.G2_API_KEY);
    case 'capterra':
      return new CapterraClient(env.CAPTERRA_API_KEY);
    // ... etc
    default:
      throw new Error(`No API client for ${directory.id}`);
  }
}
```

---

## Overseer UI

### Pages

```
/directories                    → Directory dashboard
/directories/submissions        → All submissions
/directories/submit             → New submission wizard
/directories/sync               → Sync status
/directories/traffic            → Traffic analytics
/directories/registry           → Directory database
```

### Directory Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ Directory Management                      [+ Submit New]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Live: 45       Pending: 8       Need Update: 3            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ TRAFFIC THIS MONTH                                   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Directory        Visits    Signups    Revenue       │   │
│  │ Product Hunt       2,340       45      $890         │   │
│  │ G2                 1,120       23      $450         │   │
│  │ AlternativeTo        890       12      $180         │   │
│  │ Capterra             650        8      $120         │   │
│  │ Others (42)        1,200       15      $220         │   │
│  │ ─────────────────────────────────────────────────   │   │
│  │ Total              6,200      103    $1,860         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ NEEDS ATTENTION                                      │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ⚠️ AlternativeTo - needs manual update              │   │
│  │ ⚠️ BetaList - listing expired                       │   │
│  │ ⚠️ SaaSHub - sync failed                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Submission Wizard

```
┌─────────────────────────────────────────────────────────────┐
│ Submit to Directories                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Step 1: Select Product                                      │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ [✓] Product Name - Main product                     │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ Step 2: Select Directories                                  │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ [✓] Select All API-Enabled (23)                     │    │
│ │ [✓] Select All High-Traffic (12)                    │    │
│ │                                                      │    │
│ │ [✓] G2 ⚡ API                                        │    │
│ │ [✓] Capterra ⚡ API                                  │    │
│ │ [✓] Product Hunt                                     │    │
│ │ [✓] AlternativeTo                                    │    │
│ │ [ ] BetaList (already submitted)                     │    │
│ │ ...                                                  │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ Step 3: Review & Submit                                     │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Auto-submit: 18 directories                         │    │
│ │ Manual submit: 27 directories                       │    │
│ │                                                      │    │
│ │ Missing info for 3 directories:                     │    │
│ │ - G2: needs 'features' field                        │    │
│ │ - Capterra: needs 'screenshot_urls'                 │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ [Back] [Fix Missing Info] [Submit]                          │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

```typescript
// Product Info
GET    /api/directories/products            // List products
GET    /api/directories/products/:id        // Get product info
PUT    /api/directories/products/:id        // Update product info

// Directories
GET    /api/directories                     // List all directories
GET    /api/directories/:id                 // Get directory details
POST   /api/directories                     // Add custom directory

// Submissions
GET    /api/directories/submissions         // List submissions
POST   /api/directories/submissions         // Submit to directory
POST   /api/directories/submissions/bulk    // Bulk submit
GET    /api/directories/submissions/:id     // Get submission detail
PATCH  /api/directories/submissions/:id     // Update submission status
POST   /api/directories/submissions/:id/sync // Trigger sync

// Traffic
GET    /api/directories/traffic             // Traffic analytics
GET    /api/directories/traffic/:id         // Directory-specific traffic

// Helpers
GET    /api/directories/prefill/:id         // Get pre-filled form content
GET    /api/directories/validate/:id        // Validate product info for directory
```

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] D1 schema for directories, submissions, traffic
- [ ] Product info management
- [ ] Directory database seed (100+ directories)

### Phase 2: Submission
- [ ] API clients for major directories
- [ ] Bulk submission workflow
- [ ] Pre-fill content generation
- [ ] Submission tracking

### Phase 3: Sync
- [ ] Update detection
- [ ] API sync for supported directories
- [ ] Manual update alerts
- [ ] Sync status dashboard

### Phase 4: Analytics
- [ ] UTM parameter injection
- [ ] PostHog traffic collection
- [ ] Revenue attribution
- [ ] ROI dashboard

### Phase 5: Optimization
- [ ] Directory performance ranking
- [ ] Submission recommendations
- [ ] Automated resubmission for expired listings
