# SEO & Search Submission Plan

> Automated sitemap generation, IndexNow ping, and search engine submission

## Overview

Automatically submit new/updated pages to search engines on every deploy. Uses IndexNow for instant indexing (Bing, Yandex, Seznam, Naver) and Google's Indexing API for Google.

## Architecture

```
Deploy Workflow
      │
      ▼
┌─────────────────┐
│ Generate Sitemap│ (build time)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Deploy Pages   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         Post-Deploy Script              │
│                                         │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │  IndexNow    │  │ Google Indexing │ │
│  │  (instant)   │  │      API        │ │
│  └──────┬───────┘  └────────┬────────┘ │
│         │                   │          │
└─────────┼───────────────────┼──────────┘
          │                   │
          ▼                   ▼
    ┌───────────┐      ┌───────────┐
    │   Bing    │      │  Google   │
    │  Yandex   │      │           │
    │  Seznam   │      │           │
    │   Naver   │      │           │
    └───────────┘      └───────────┘
```

---

## Part 1: Sitemap Generation

### SvelteKit Sitemap

```typescript
// packages/products/tastier/marketing/src/routes/sitemap.xml/+server.ts
import type { RequestHandler } from './$types';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

const SITE_URL = 'https://tastier.app';

// Static pages
const staticPages: SitemapUrl[] = [
  { loc: '/', changefreq: 'weekly', priority: 1.0 },
  { loc: '/pricing', changefreq: 'weekly', priority: 0.9 },
  { loc: '/features', changefreq: 'monthly', priority: 0.8 },
  { loc: '/about', changefreq: 'monthly', priority: 0.6 },
  { loc: '/blog', changefreq: 'daily', priority: 0.8 },
  { loc: '/contact', changefreq: 'monthly', priority: 0.5 },
  { loc: '/privacy', changefreq: 'yearly', priority: 0.3 },
  { loc: '/terms', changefreq: 'yearly', priority: 0.3 },
];

export const GET: RequestHandler = async ({ fetch }) => {
  // Fetch dynamic pages (blog posts, etc.)
  const blogPosts = await fetchBlogPosts(fetch);

  const urls: SitemapUrl[] = [
    ...staticPages,
    ...blogPosts.map(post => ({
      loc: `/blog/${post.slug}`,
      lastmod: post.updatedAt,
      changefreq: 'monthly' as const,
      priority: 0.7,
    })),
  ];

  const sitemap = generateSitemapXml(urls);

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=3600', // 1 hour
    },
  });
};

function generateSitemapXml(urls: SitemapUrl[]): string {
  const urlElements = urls.map(url => `
  <url>
    <loc>${SITE_URL}${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''}
    ${url.priority !== undefined ? `<priority>${url.priority}</priority>` : ''}
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}

async function fetchBlogPosts(fetch: typeof globalThis.fetch) {
  // Fetch from your CMS or API
  // Return array of { slug, updatedAt }
  return [];
}
```

### Sitemap Index (for large sites)

```typescript
// packages/products/tastier/marketing/src/routes/sitemap_index.xml/+server.ts
import type { RequestHandler } from './$types';

const SITE_URL = 'https://tastier.app';

export const GET: RequestHandler = async () => {
  const sitemaps = [
    { loc: '/sitemap.xml', lastmod: new Date().toISOString().split('T')[0] },
    { loc: '/sitemap-blog.xml', lastmod: new Date().toISOString().split('T')[0] },
    // Add more as needed
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(s => `
  <sitemap>
    <loc>${SITE_URL}${s.loc}</loc>
    <lastmod>${s.lastmod}</lastmod>
  </sitemap>`).join('')}
</sitemapindex>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
```

---

## Part 2: Robots.txt

```typescript
// packages/products/tastier/marketing/src/routes/robots.txt/+server.ts
import type { RequestHandler } from './$types';

const SITE_URL = 'https://tastier.app';

export const GET: RequestHandler = async () => {
  const robots = `# robots.txt for ${SITE_URL}

User-agent: *
Allow: /

# Disallow admin/app routes
Disallow: /api/
Disallow: /app/
Disallow: /admin/

# Sitemaps
Sitemap: ${SITE_URL}/sitemap.xml
Sitemap: ${SITE_URL}/sitemap_index.xml
`;

  return new Response(robots, {
    headers: { 'Content-Type': 'text/plain' },
  });
};
```

---

## Part 3: IndexNow Integration

IndexNow allows instant indexing for Bing, Yandex, Seznam, and Naver with a single API call.

### Setup

1. Generate a key (any UUID-like string)
2. Host key file at `/.well-known/{key}.txt` or `/{key}.txt`
3. Submit URLs via API

### Key File Route

```typescript
// packages/products/tastier/marketing/src/routes/[key].txt/+server.ts
import type { RequestHandler } from './$types';
import { INDEXNOW_KEY } from '$env/static/private';

export const GET: RequestHandler = async ({ params }) => {
  if (params.key === INDEXNOW_KEY) {
    return new Response(INDEXNOW_KEY, {
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return new Response('Not found', { status: 404 });
};
```

### IndexNow Submission Script

```typescript
// scripts/seo/index-now.ts
interface IndexNowConfig {
  host: string;
  key: string;
  keyLocation: string;
}

const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow', // Bing, Yandex
  'https://www.bing.com/indexnow',
  'https://yandex.com/indexnow',
  // Seznam and Naver also support IndexNow
];

export async function submitToIndexNow(
  config: IndexNowConfig,
  urls: string[]
): Promise<void> {
  if (urls.length === 0) return;

  // IndexNow accepts up to 10,000 URLs per request
  const batches = chunk(urls, 10000);

  for (const batch of batches) {
    const payload = {
      host: config.host,
      key: config.key,
      keyLocation: config.keyLocation,
      urlList: batch,
    };

    // Submit to one endpoint (they share the submission)
    const response = await fetch(INDEXNOW_ENDPOINTS[0], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`IndexNow submission failed: ${response.status}`);
      const text = await response.text();
      console.error(text);
    } else {
      console.log(`IndexNow: Submitted ${batch.length} URLs`);
    }
  }
}

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

---

## Part 4: Google Indexing API

Google Indexing API is primarily for job postings and live streams, but you can also use it for general pages with some limitations. For general pages, Google recommends using Search Console API or just sitemaps.

### Option A: Google Search Console API (Recommended)

```typescript
// scripts/seo/google-search-console.ts
import { google } from 'googleapis';

interface GoogleSearchConsoleConfig {
  siteUrl: string;
  credentials: {
    client_email: string;
    private_key: string;
  };
}

export async function submitSitemapToGoogle(
  config: GoogleSearchConsoleConfig
): Promise<void> {
  const auth = new google.auth.GoogleAuth({
    credentials: config.credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters'],
  });

  const searchConsole = google.searchconsole({ version: 'v1', auth });

  // Submit sitemap
  await searchConsole.sitemaps.submit({
    siteUrl: config.siteUrl,
    feedpath: `${config.siteUrl}/sitemap.xml`,
  });

  console.log('Google: Sitemap submitted');
}

export async function requestIndexing(
  config: GoogleSearchConsoleConfig,
  urls: string[]
): Promise<void> {
  // Note: This uses the URL Inspection API which has quotas
  const auth = new google.auth.GoogleAuth({
    credentials: config.credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters'],
  });

  const searchConsole = google.searchconsole({ version: 'v1', auth });

  // Request indexing for each URL (limited to ~200/day)
  for (const url of urls.slice(0, 200)) {
    try {
      await searchConsole.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl: url,
          siteUrl: config.siteUrl,
        },
      });
      console.log(`Google: Requested indexing for ${url}`);
    } catch (error) {
      console.error(`Google: Failed to request indexing for ${url}`, error);
    }

    // Rate limiting - be gentle
    await sleep(1000);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Option B: Ping Google Sitemap (Simple)

```typescript
// scripts/seo/google-ping.ts
export async function pingGoogleSitemap(sitemapUrl: string): Promise<void> {
  const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;

  const response = await fetch(pingUrl);

  if (response.ok) {
    console.log('Google: Sitemap ping successful');
  } else {
    console.error(`Google: Sitemap ping failed: ${response.status}`);
  }
}
```

---

## Part 5: Baidu Submission (Optional)

Baidu requires a separate account and verification.

```typescript
// scripts/seo/baidu.ts
interface BaiduConfig {
  site: string;
  token: string; // From Baidu Webmaster Tools
}

export async function submitToBaidu(
  config: BaiduConfig,
  urls: string[]
): Promise<void> {
  const apiUrl = `http://data.zz.baidu.com/urls?site=${config.site}&token=${config.token}`;

  // Baidu accepts URLs as newline-separated text
  const body = urls.join('\n');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body,
  });

  const result = await response.json();
  console.log('Baidu submission result:', result);
}
```

---

## Part 6: Unified Submission Script

```typescript
// scripts/seo/submit.ts
import { submitToIndexNow } from './index-now';
import { pingGoogleSitemap, submitSitemapToGoogle } from './google-search-console';
import { submitToBaidu } from './baidu';

interface SEOConfig {
  products: Array<{
    name: string;
    domain: string;
    indexNowKey: string;
  }>;
  google: {
    credentials: {
      client_email: string;
      private_key: string;
    };
  };
  baidu?: {
    token: string;
  };
}

async function getChangedUrls(product: string): Promise<string[]> {
  // Option 1: Parse sitemap and submit all
  const sitemapUrl = `https://${product}.app/sitemap.xml`;
  const response = await fetch(sitemapUrl);
  const xml = await response.text();

  // Simple XML parsing for URLs
  const urlMatches = xml.matchAll(/<loc>([^<]+)<\/loc>/g);
  return Array.from(urlMatches, m => m[1]);

  // Option 2: Track changed files in git and map to URLs
  // This is more efficient for large sites
}

async function main() {
  const config: SEOConfig = {
    products: [
      {
        name: 'tastier',
        domain: 'tastier.app',
        indexNowKey: process.env.TASTIER_INDEXNOW_KEY!,
      },
      {
        name: 'cherishall',
        domain: 'cherishall.app',
        indexNowKey: process.env.CHERISHALL_INDEXNOW_KEY!,
      },
    ],
    google: {
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY!,
      },
    },
    baidu: process.env.BAIDU_TOKEN
      ? { token: process.env.BAIDU_TOKEN }
      : undefined,
  };

  for (const product of config.products) {
    console.log(`\nProcessing ${product.name}...`);

    const urls = await getChangedUrls(product.name);
    console.log(`Found ${urls.length} URLs`);

    // IndexNow (Bing, Yandex, Seznam, Naver)
    await submitToIndexNow(
      {
        host: product.domain,
        key: product.indexNowKey,
        keyLocation: `https://${product.domain}/${product.indexNowKey}.txt`,
      },
      urls
    );

    // Google (sitemap ping)
    await pingGoogleSitemap(`https://${product.domain}/sitemap.xml`);

    // Google Search Console (optional, if configured)
    if (config.google.credentials.client_email) {
      await submitSitemapToGoogle({
        siteUrl: `https://${product.domain}`,
        credentials: config.google.credentials,
      });
    }

    // Baidu (optional)
    if (config.baidu) {
      await submitToBaidu(
        { site: product.domain, token: config.baidu.token },
        urls
      );
    }
  }

  console.log('\nSEO submission complete!');
}

main().catch(console.error);
```

---

## Part 7: GitHub Actions Integration

### Post-Deploy SEO Submission

```yaml
# .github/workflows/seo.yml
name: SEO Submission

on:
  workflow_run:
    workflows: ["Deploy Staging", "Deploy Production"]
    types: [completed]
  workflow_dispatch:
    inputs:
      product:
        description: 'Product to submit'
        required: false
        type: choice
        options:
          - all
          - tastier
          - cherishall

jobs:
  submit:
    name: Submit to Search Engines
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' || github.event_name == 'workflow_dispatch' }}
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

      - name: Submit to search engines
        run: pnpm tsx scripts/seo/submit.ts
        env:
          TASTIER_INDEXNOW_KEY: ${{ secrets.TASTIER_INDEXNOW_KEY }}
          CHERISHALL_INDEXNOW_KEY: ${{ secrets.CHERISHALL_INDEXNOW_KEY }}
          GOOGLE_SERVICE_ACCOUNT_EMAIL: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_EMAIL }}
          GOOGLE_SERVICE_ACCOUNT_KEY: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_KEY }}
          BAIDU_TOKEN: ${{ secrets.BAIDU_TOKEN }}
```

---

## Part 8: Initial Search Console Setup (Manual)

### Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property for each domain
3. Verify ownership (DNS TXT record or HTML file)
4. Submit sitemap manually first time
5. Create Service Account for API access:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create project
   - Enable Search Console API
   - Create Service Account
   - Add Service Account email as user in Search Console

### Bing Webmaster Tools

1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Add site
3. Verify ownership
4. Submit sitemap
5. Enable IndexNow (auto-enabled for verified sites)

### Yandex Webmaster

1. Go to [Yandex Webmaster](https://webmaster.yandex.com)
2. Add site
3. Verify ownership
4. Submit sitemap
5. IndexNow works automatically

### Baidu Webmaster (Optional)

1. Go to [Baidu Webmaster](https://ziyuan.baidu.com)
2. Create account (requires Chinese phone number or use agent)
3. Add site
4. Verify ownership
5. Get API token for programmatic submission

---

## Part 9: Meta Tags & Structured Data

### SEO Component

```svelte
<!-- packages/shared/ui/src/components/SEO.svelte -->
<script lang="ts">
  interface Props {
    title: string;
    description: string;
    url: string;
    image?: string;
    type?: 'website' | 'article' | 'product';
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    twitterHandle?: string;
  }

  const {
    title,
    description,
    url,
    image,
    type = 'website',
    publishedTime,
    modifiedTime,
    author,
    twitterHandle,
  }: Props = $props();
</script>

<svelte:head>
  <!-- Primary Meta Tags -->
  <title>{title}</title>
  <meta name="title" content={title} />
  <meta name="description" content={description} />

  <!-- Canonical -->
  <link rel="canonical" href={url} />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content={type} />
  <meta property="og:url" content={url} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  {#if image}
    <meta property="og:image" content={image} />
  {/if}

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content={url} />
  <meta property="twitter:title" content={title} />
  <meta property="twitter:description" content={description} />
  {#if image}
    <meta property="twitter:image" content={image} />
  {/if}
  {#if twitterHandle}
    <meta property="twitter:site" content={twitterHandle} />
  {/if}

  <!-- Article specific -->
  {#if type === 'article'}
    {#if publishedTime}
      <meta property="article:published_time" content={publishedTime} />
    {/if}
    {#if modifiedTime}
      <meta property="article:modified_time" content={modifiedTime} />
    {/if}
    {#if author}
      <meta property="article:author" content={author} />
    {/if}
  {/if}
</svelte:head>
```

### JSON-LD Structured Data

```svelte
<!-- packages/shared/ui/src/components/StructuredData.svelte -->
<script lang="ts">
  interface Props {
    data: Record<string, unknown>;
  }

  const { data }: Props = $props();

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    ...data,
  });
</script>

<svelte:head>
  {@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>
```

### Usage

```svelte
<!-- packages/products/tastier/marketing/src/routes/+page.svelte -->
<script>
  import SEO from '@resist/ui/SEO.svelte';
  import StructuredData from '@resist/ui/StructuredData.svelte';
</script>

<SEO
  title="Tastier - The Best Recipe App"
  description="Discover and share amazing recipes with Tastier."
  url="https://tastier.app"
  image="https://tastier.app/og-image.png"
  twitterHandle="@tastierapp"
/>

<StructuredData data={{
  '@type': 'WebSite',
  name: 'Tastier',
  url: 'https://tastier.app',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://tastier.app/search?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
}} />
```

---

## Summary

| Search Engine | Submission Method | Frequency |
|---------------|-------------------|-----------|
| Google | Sitemap ping + Search Console API | On deploy |
| Bing | IndexNow | On deploy |
| Yandex | IndexNow | On deploy |
| Seznam | IndexNow | On deploy |
| Naver | IndexNow | On deploy |
| Baidu | API submission | On deploy (optional) |

## Implementation Order

1. **Day 1**: Sitemap generation, robots.txt
2. **Day 2**: IndexNow key setup, key file route
3. **Day 3**: IndexNow submission script
4. **Day 4**: Google Search Console setup, API integration
5. **Day 5**: GitHub Actions workflow
6. **Day 6**: SEO components, structured data
7. **Day 7**: Testing, monitoring
