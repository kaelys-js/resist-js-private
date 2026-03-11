# Social Publishing Plan

> **Purpose:** Automated multi-platform social media publishing with scheduling and analytics
> **Goal:** Publish approved content across all platforms automatically
> **Integration:** Receives content from `content-pipeline/plan.md`, managed via Overseer

---

## Overview

Social publishing handles the "last mile" of content distribution:

```
Content Pipeline                Social Publishing              Platforms
────────────────                ─────────────────              ─────────
Approved tweet     ─────────►   Schedule/Queue    ─────────►   Twitter/X
Approved thread    ─────────►   Optimal timing    ─────────►   LinkedIn
Approved post      ─────────►   Platform APIs     ─────────►   DEV.to
                                Analytics pull    ◄─────────   Hashnode
                                                               Medium
```

---

## Platform Strategy

### Tier 1: Active Publishing (API Automation)

| Platform | API | Content Types | Frequency |
|----------|-----|---------------|-----------|
| Twitter/X | Yes | Tweets, threads, replies | Daily |
| LinkedIn | Yes | Posts, articles | 2-3x/week |
| DEV.to | Yes | Articles (blog sync) | Per blog post |
| Hashnode | Yes | Articles (blog sync) | Per blog post |

### Tier 2: Semi-Active (Manual/Assisted)

| Platform | API | Content Types | Frequency |
|----------|-----|---------------|-----------|
| Product Hunt | Limited | Launches, updates | Per major release |
| Hacker News | No | Submissions | Strategic only |
| Reddit | Yes (careful) | Posts, comments | Strategic only |
| Discord | Webhook | Announcements | Per update |
| YouTube | Yes | Videos (if applicable) | Rare |

### Tier 3: Reserved (Username Only)

All other platforms listed in PLAN.md - reserved for brand protection, occasional manual posts.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       OVERSEER                               │
│                 Social Publishing Module                     │
├─────────────────────────────────────────────────────────────┤
│  Post Queue  │  Scheduler  │  Publisher  │  Analytics       │
└──────┬───────┴──────┬──────┴──────┬──────┴───────┬──────────┘
       │              │             │              │
       ▼              ▼             ▼              ▼
  ┌─────────┐   ┌──────────┐  ┌─────────┐   ┌──────────┐
  │   D1    │   │   Cron   │  │ Platform│   │ Platform │
  │  Queue  │   │  Worker  │  │  APIs   │   │  APIs    │
  └─────────┘   └──────────┘  └─────────┘   └──────────┘
                                   │              │
                    ┌──────────────┼──────────────┤
                    ▼              ▼              ▼
               Twitter/X      LinkedIn       DEV.to
```

---

## Data Model

### D1 Schema (Overseer)

```sql
-- Social accounts (connected platforms)
CREATE TABLE social_accounts (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL, -- twitter, linkedin, devto, hashnode, discord
  account_id TEXT NOT NULL, -- Platform's user/account ID
  username TEXT,
  display_name TEXT,
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  token_expires_at TEXT,
  status TEXT DEFAULT 'active', -- active, expired, revoked
  metadata TEXT, -- JSON: platform-specific data
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Post queue
CREATE TABLE social_posts (
  id TEXT PRIMARY KEY,
  content_item_id TEXT REFERENCES content_items(id), -- From content pipeline
  platform TEXT NOT NULL,
  account_id TEXT REFERENCES social_accounts(id),
  post_type TEXT NOT NULL, -- tweet, thread, post, article
  content TEXT NOT NULL, -- The actual post content
  media_urls TEXT, -- JSON array of media URLs
  metadata TEXT, -- JSON: hashtags, mentions, etc.
  status TEXT DEFAULT 'queued', -- queued, scheduled, publishing, published, failed
  scheduled_for TEXT, -- ISO timestamp
  published_at TEXT,
  platform_post_id TEXT, -- ID from platform after publishing
  platform_url TEXT, -- URL to published post
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Thread posts (for multi-post threads)
CREATE TABLE social_thread_posts (
  id TEXT PRIMARY KEY,
  parent_post_id TEXT REFERENCES social_posts(id),
  position INTEGER NOT NULL, -- Order in thread
  content TEXT NOT NULL,
  platform_post_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Engagement metrics
CREATE TABLE social_engagement (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES social_posts(id),
  platform TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0, -- Or shares/reposts
  replies INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  profile_visits INTEGER DEFAULT 0,
  followers_gained INTEGER DEFAULT 0,
  fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Optimal posting times (learned)
CREATE TABLE posting_analytics (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  day_of_week INTEGER, -- 0-6
  hour INTEGER, -- 0-23
  avg_engagement REAL,
  post_count INTEGER,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## Platform Integrations

### Twitter/X API v2

```typescript
// packages/tools/admin/src/lib/social/twitter.ts
import { TwitterApi } from 'twitter-api-v2';

export class TwitterPublisher {
  private client: TwitterApi;

  constructor(accessToken: string) {
    this.client = new TwitterApi(accessToken);
  }

  async postTweet(content: string, mediaIds?: string[]): Promise<string> {
    const tweet = await this.client.v2.tweet({
      text: content,
      media: mediaIds ? { media_ids: mediaIds } : undefined,
    });
    return tweet.data.id;
  }

  async postThread(tweets: string[]): Promise<string[]> {
    const ids: string[] = [];
    let replyToId: string | undefined;

    for (const content of tweets) {
      const tweet = await this.client.v2.tweet({
        text: content,
        reply: replyToId ? { in_reply_to_tweet_id: replyToId } : undefined,
      });
      ids.push(tweet.data.id);
      replyToId = tweet.data.id;
    }

    return ids;
  }

  async getMetrics(tweetId: string): Promise<TweetMetrics> {
    const tweet = await this.client.v2.singleTweet(tweetId, {
      'tweet.fields': ['public_metrics', 'organic_metrics'],
    });
    return tweet.data.public_metrics;
  }

  async uploadMedia(buffer: Buffer, mimeType: string): Promise<string> {
    const mediaId = await this.client.v1.uploadMedia(buffer, { mimeType });
    return mediaId;
  }
}
```

### LinkedIn API

```typescript
// packages/tools/admin/src/lib/social/linkedin.ts

export class LinkedInPublisher {
  private accessToken: string;
  private personUrn: string;

  constructor(accessToken: string, personUrn: string) {
    this.accessToken = accessToken;
    this.personUrn = personUrn;
  }

  async postUpdate(content: string): Promise<string> {
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: this.personUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      }),
    });

    const data = await response.json();
    return data.id;
  }

  async getMetrics(postId: string): Promise<LinkedInMetrics> {
    const response = await fetch(
      `https://api.linkedin.com/v2/socialActions/${postId}`,
      {
        headers: { 'Authorization': `Bearer ${this.accessToken}` },
      }
    );
    return response.json();
  }
}
```

### DEV.to API

```typescript
// packages/tools/admin/src/lib/social/devto.ts

export class DevToPublisher {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async publishArticle(article: DevToArticle): Promise<string> {
    const response = await fetch('https://dev.to/api/articles', {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        article: {
          title: article.title,
          body_markdown: article.content,
          published: true,
          tags: article.tags,
          canonical_url: article.canonicalUrl, // Your blog URL
        },
      }),
    });

    const data = await response.json();
    return data.id;
  }

  async updateArticle(id: string, article: Partial<DevToArticle>): Promise<void> {
    await fetch(`https://dev.to/api/articles/${id}`, {
      method: 'PUT',
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ article }),
    });
  }
}
```

### Hashnode API (GraphQL)

```typescript
// packages/tools/admin/src/lib/social/hashnode.ts

export class HashnodePublisher {
  private apiKey: string;
  private publicationId: string;

  constructor(apiKey: string, publicationId: string) {
    this.apiKey = apiKey;
    this.publicationId = publicationId;
  }

  async publishArticle(article: HashnodeArticle): Promise<string> {
    const mutation = `
      mutation PublishPost($input: PublishPostInput!) {
        publishPost(input: $input) {
          post {
            id
            url
          }
        }
      }
    `;

    const response = await fetch('https://gql.hashnode.com', {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            title: article.title,
            contentMarkdown: article.content,
            publicationId: this.publicationId,
            tags: article.tags.map(t => ({ slug: t })),
            originalArticleURL: article.canonicalUrl,
          },
        },
      }),
    });

    const data = await response.json();
    return data.data.publishPost.post.id;
  }
}
```

### Discord Webhook

```typescript
// packages/tools/admin/src/lib/social/discord.ts

export async function postToDiscord(
  webhookUrl: string,
  message: DiscordMessage
): Promise<void> {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: message.content,
      embeds: message.embeds,
    }),
  });
}
```

---

## Scheduling & Timing

### Optimal Posting Times

Default schedule (adjusts based on analytics):

| Platform | Best Days | Best Times (UTC) |
|----------|-----------|------------------|
| Twitter | Mon-Fri | 13:00-15:00 |
| LinkedIn | Tue-Thu | 10:00-12:00 |
| DEV.to | Tue-Wed | 14:00-16:00 |

### Scheduling Algorithm

```typescript
interface ScheduleOptions {
  platform: string;
  preferredTime?: string; // ISO time
  avoidWeekends?: boolean;
  spreadPosts?: boolean; // Avoid posting too close together
}

export function calculateOptimalTime(
  platform: string,
  analytics: PostingAnalytics[],
  existingScheduled: SocialPost[]
): Date {
  // Find best performing time slots
  const bestSlots = analytics
    .filter(a => a.platform === platform)
    .sort((a, b) => b.avg_engagement - a.avg_engagement)
    .slice(0, 5);

  // Find next available slot that doesn't conflict
  for (const slot of bestSlots) {
    const nextOccurrence = getNextOccurrence(slot.day_of_week, slot.hour);

    // Check no other post within 2 hours
    const hasConflict = existingScheduled.some(p =>
      Math.abs(new Date(p.scheduled_for).getTime() - nextOccurrence.getTime()) < 2 * 60 * 60 * 1000
    );

    if (!hasConflict) {
      return nextOccurrence;
    }
  }

  // Fallback to next available slot
  return getNextAvailableSlot(platform);
}
```

---

## Publishing Workflow

### Cron Worker

```typescript
// Runs every 5 minutes
export async function publishScheduledPosts(env: Env) {
  const now = new Date();

  // Get posts ready to publish
  const readyPosts = await db
    .select()
    .from(socialPosts)
    .where(
      and(
        eq(socialPosts.status, 'scheduled'),
        lte(socialPosts.scheduled_for, now.toISOString())
      )
    );

  for (const post of readyPosts) {
    try {
      await publishPost(post, env);
    } catch (error) {
      await handlePublishError(post, error);
    }
  }
}

async function publishPost(post: SocialPost, env: Env) {
  // Update status to publishing
  await updatePostStatus(post.id, 'publishing');

  // Get account credentials
  const account = await getAccount(post.account_id);
  const publisher = getPublisher(post.platform, account);

  let platformPostId: string;
  let platformUrl: string;

  switch (post.post_type) {
    case 'tweet':
      platformPostId = await publisher.postTweet(post.content);
      platformUrl = `https://twitter.com/${account.username}/status/${platformPostId}`;
      break;

    case 'thread':
      const threadPosts = await getThreadPosts(post.id);
      const ids = await publisher.postThread(threadPosts.map(p => p.content));
      platformPostId = ids[0];
      platformUrl = `https://twitter.com/${account.username}/status/${platformPostId}`;
      // Update thread post IDs
      await updateThreadPostIds(post.id, ids);
      break;

    case 'post':
      platformPostId = await publisher.postUpdate(post.content);
      platformUrl = getPlatformUrl(post.platform, platformPostId);
      break;

    case 'article':
      platformPostId = await publisher.publishArticle({
        title: post.metadata.title,
        content: post.content,
        canonicalUrl: post.metadata.canonicalUrl,
        tags: post.metadata.tags,
      });
      platformUrl = getPlatformUrl(post.platform, platformPostId);
      break;
  }

  // Update post with platform details
  await db
    .update(socialPosts)
    .set({
      status: 'published',
      published_at: new Date().toISOString(),
      platform_post_id: platformPostId,
      platform_url: platformUrl,
    })
    .where(eq(socialPosts.id, post.id));
}
```

### Error Handling

```typescript
async function handlePublishError(post: SocialPost, error: Error) {
  const retryCount = post.retry_count + 1;

  if (retryCount < 3) {
    // Schedule retry with exponential backoff
    const retryIn = Math.pow(2, retryCount) * 60 * 1000; // 2min, 4min, 8min
    await db
      .update(socialPosts)
      .set({
        retry_count: retryCount,
        scheduled_for: new Date(Date.now() + retryIn).toISOString(),
        error_message: error.message,
      })
      .where(eq(socialPosts.id, post.id));
  } else {
    // Mark as failed
    await db
      .update(socialPosts)
      .set({
        status: 'failed',
        error_message: error.message,
      })
      .where(eq(socialPosts.id, post.id));

    // Notify via Overseer
    await createAlert({
      type: 'social_publish_failed',
      severity: 'warning',
      message: `Failed to publish to ${post.platform}: ${error.message}`,
      metadata: { postId: post.id },
    });
  }
}
```

---

## Analytics Collection

### Metrics Cron

```typescript
// Runs hourly for recent posts, daily for older
export async function collectEngagementMetrics(env: Env) {
  // Get published posts that need metric updates
  const posts = await db
    .select()
    .from(socialPosts)
    .where(
      and(
        eq(socialPosts.status, 'published'),
        // Published within last 30 days
        gte(socialPosts.published_at, subDays(new Date(), 30).toISOString())
      )
    );

  for (const post of posts) {
    try {
      const account = await getAccount(post.account_id);
      const publisher = getPublisher(post.platform, account);
      const metrics = await publisher.getMetrics(post.platform_post_id);

      await db.insert(socialEngagement).values({
        id: generateId(),
        post_id: post.id,
        platform: post.platform,
        likes: metrics.likes,
        retweets: metrics.retweets || metrics.shares,
        replies: metrics.replies,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        fetched_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Failed to fetch metrics for ${post.id}:`, error);
    }
  }
}
```

### Analytics Aggregation

```typescript
export async function getContentPerformance(
  timeRange: 'week' | 'month' | 'quarter'
): Promise<PerformanceReport> {
  const since = getStartDate(timeRange);

  const stats = await db
    .select({
      platform: socialPosts.platform,
      total_posts: count(),
      total_likes: sum(socialEngagement.likes),
      total_impressions: sum(socialEngagement.impressions),
      avg_engagement: avg(
        sql`(${socialEngagement.likes} + ${socialEngagement.retweets} + ${socialEngagement.replies})`
      ),
    })
    .from(socialPosts)
    .leftJoin(socialEngagement, eq(socialPosts.id, socialEngagement.post_id))
    .where(gte(socialPosts.published_at, since.toISOString()))
    .groupBy(socialPosts.platform);

  return stats;
}
```

---

## Overseer UI

### Pages

```
/social                     → Social dashboard
/social/queue               → Post queue
/social/scheduled           → Scheduled posts
/social/published           → Published posts with metrics
/social/accounts            → Connected accounts
/social/analytics           → Performance analytics
/social/settings            → Posting preferences
```

### Social Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ Social Publishing                        [+ Manual Post]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Queued: 8       Scheduled: 15      Published (7d): 23     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ CONNECTED ACCOUNTS                                   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 🐦 Twitter   @yourproduct    ✅ Connected           │   │
│  │ 💼 LinkedIn  Your Product    ✅ Connected           │   │
│  │ 📝 DEV.to    yourproduct     ✅ Connected           │   │
│  │ #️⃣ Hashnode  Your Product    ✅ Connected           │   │
│  │ 💬 Discord   #announcements  ✅ Webhook Active      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ THIS WEEK'S PERFORMANCE                              │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │         Posts   Impressions   Engagement   Clicks   │   │
│  │ Twitter    12      45.2K        3.2%       234     │   │
│  │ LinkedIn    4       8.5K        4.1%        89     │   │
│  │ DEV.to      2       2.1K        2.8%        67     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ UPCOMING (Next 48 Hours)                            │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Today 14:00   🐦 Tweet about dark mode             │   │
│  │ Today 14:02   🐦 Thread continuation (auto)        │   │
│  │ Tomorrow 10:00 💼 LinkedIn weekly insight          │   │
│  │ Tomorrow 15:00 🐦 Performance tip tweet            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

```typescript
// Accounts
GET    /api/social/accounts              // List connected accounts
POST   /api/social/accounts/connect      // Start OAuth flow
DELETE /api/social/accounts/:id          // Disconnect account
POST   /api/social/accounts/:id/refresh  // Refresh tokens

// Posts
GET    /api/social/posts                 // List posts (filter by status)
POST   /api/social/posts                 // Create manual post
GET    /api/social/posts/:id             // Get post details
PATCH  /api/social/posts/:id             // Update post
DELETE /api/social/posts/:id             // Delete post
POST   /api/social/posts/:id/publish     // Publish immediately
POST   /api/social/posts/:id/schedule    // Schedule post

// Queue (from content pipeline)
POST   /api/social/queue                 // Add to queue (internal)
GET    /api/social/queue                 // View queue

// Analytics
GET    /api/social/analytics             // Aggregate stats
GET    /api/social/analytics/:platform   // Platform-specific stats
GET    /api/social/analytics/best-times  // Optimal posting times
```

---

## OAuth Setup

### Twitter OAuth 2.0

```typescript
// Requires Twitter Developer Account with OAuth 2.0 enabled
const twitterOAuth = {
  clientId: env.TWITTER_CLIENT_ID,
  clientSecret: env.TWITTER_CLIENT_SECRET,
  scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
  callbackUrl: 'https://overseer.yourcompany.com/api/social/callback/twitter',
};
```

### LinkedIn OAuth 2.0

```typescript
const linkedInOAuth = {
  clientId: env.LINKEDIN_CLIENT_ID,
  clientSecret: env.LINKEDIN_CLIENT_SECRET,
  scopes: ['w_member_social', 'r_liteprofile'],
  callbackUrl: 'https://overseer.yourcompany.com/api/social/callback/linkedin',
};
```

---

## Implementation Checklist

### Phase 1: Account Connection
- [ ] OAuth flows for Twitter, LinkedIn
- [ ] API key storage for DEV.to, Hashnode
- [ ] Discord webhook configuration
- [ ] Token refresh handling

### Phase 2: Publishing Core
- [ ] Post queue management
- [ ] Basic scheduling
- [ ] Single post publishing
- [ ] Thread publishing

### Phase 3: Automation
- [ ] Cron worker for scheduled posts
- [ ] Retry logic
- [ ] Error notifications
- [ ] Auto-scheduling from content pipeline

### Phase 4: Analytics
- [ ] Metrics collection
- [ ] Engagement tracking
- [ ] Optimal time learning
- [ ] Performance dashboards

### Phase 5: Blog Syndication
- [ ] DEV.to article sync
- [ ] Hashnode article sync
- [ ] Canonical URL handling
- [ ] Update propagation
