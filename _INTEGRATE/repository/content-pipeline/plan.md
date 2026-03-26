# Content Pipeline Plan

> **Purpose:** AI-assisted content generation and repurposing with minimal manual effort
> **Goal:** You focus on product, AI handles content creation, you approve/publish
> **Integration:** Managed via Overseer dashboard

---

## Overview

The content pipeline transforms minimal input (changelog entries, product updates, ideas) into full content across multiple formats:

```
Your Input (minimal)              AI Output (automated)
────────────────────              ────────────────────
Changelog entry (2 sentences) →   Blog post draft
Feature description           →   5-10 social posts
Product update               →    Email announcement
Idea/topic                   →    Full article draft
Existing blog post           →    Repurposed content for all platforms
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       OVERSEER                               │
│                   Content Pipeline UI                        │
├─────────────────────────────────────────────────────────────┤
│  Content Queue  │  Generation  │  Approval  │  Analytics    │
└────────┬────────┴──────┬───────┴─────┬──────┴───────┬───────┘
         │               │             │              │
         ▼               ▼             ▼              ▼
    ┌─────────┐    ┌──────────┐  ┌─────────┐   ┌──────────┐
    │   D1    │    │ Claude   │  │ GitHub  │   │ PostHog  │
    │ Content │    │   API    │  │  (blog) │   │ (metrics)│
    │  Queue  │    │          │  │         │   │          │
    └─────────┘    └──────────┘  └─────────┘   └──────────┘
```

---

## Content Types

### 1. Blog Posts

**Sources:**
- Changelog entries (auto-trigger)
- Manual topic submission
- Scheduled content calendar

**Output:**
- Full markdown article (800-1500 words)
- SEO metadata (title, description, keywords)
- Social snippets for promotion
- Email announcement version

### 2. Social Posts

**Generated from:**
- Blog posts (repurposed)
- Changelog entries
- Product milestones
- Manual ideas

**Formats per platform:**
- Twitter/X: Thread (3-7 tweets) + standalone tweets
- LinkedIn: Professional long-form post
- DEV.to/Hashnode: Technical deep-dive (if applicable)

### 3. Email Content

**Types:**
- Feature announcements
- Blog post digests
- Product updates

**Flows to:** `email-automation/plan.md` for sending

### 4. Changelog

**Input:** You write 1-2 sentences per change
**Output:**
- Formatted changelog entry
- Auto-triggers blog post generation (for major features)
- Auto-triggers social posts
- Auto-triggers email (for subscribers who opted in)

---

## Data Model

### D1 Schema (Overseer)

```sql
-- Content sources (triggers for generation)
CREATE TABLE content_sources (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- changelog, topic, repurpose, scheduled
  title TEXT NOT NULL,
  description TEXT, -- Your brief input
  source_content TEXT, -- Original content if repurposing
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  status TEXT DEFAULT 'pending', -- pending, generating, ready, approved, published
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Generated content items
CREATE TABLE content_items (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES content_sources(id),
  type TEXT NOT NULL, -- blog, tweet, linkedin, email, thread
  platform TEXT, -- twitter, linkedin, devto, hashnode, blog, email
  title TEXT,
  content TEXT NOT NULL, -- The generated content
  metadata TEXT, -- JSON: SEO data, hashtags, etc.
  status TEXT DEFAULT 'draft', -- draft, approved, scheduled, published, rejected
  scheduled_for TEXT, -- ISO timestamp if scheduled
  published_at TEXT,
  published_url TEXT,
  engagement TEXT, -- JSON: likes, shares, comments, clicks
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Content calendar
CREATE TABLE content_calendar (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL, -- blog, social, email
  scheduled_date TEXT NOT NULL,
  recurrence TEXT, -- none, weekly, monthly
  source_id TEXT REFERENCES content_sources(id),
  status TEXT DEFAULT 'planned', -- planned, generating, ready, published
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Generation templates (prompts)
CREATE TABLE content_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- blog, tweet, linkedin, thread, email
  prompt_template TEXT NOT NULL, -- Handlebars template for Claude prompt
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## AI Generation

### Claude API Integration

```typescript
// packages/tools/admin/src/lib/content/generator.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

interface GenerationRequest {
  sourceId: string;
  type: 'blog' | 'tweet' | 'linkedin' | 'thread' | 'email';
  context: {
    productName: string;
    productDescription: string;
    targetAudience: string;
    brandVoice: string;
    sourceContent: string;
  };
}

export async function generateContent(request: GenerationRequest): Promise<string> {
  const template = await getTemplate(request.type);
  const prompt = renderTemplate(template.prompt_template, request.context);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  return response.content[0].text;
}
```

### Prompt Templates

**Blog Post from Changelog:**
```handlebars
You are a technical content writer for {{productName}}, {{productDescription}}.

Target audience: {{targetAudience}}
Brand voice: {{brandVoice}}

Write a blog post announcing this update:

{{sourceContent}}

Requirements:
- 800-1500 words
- Include a compelling title
- Start with the problem this solves
- Explain what changed and why it matters
- Include practical examples or use cases
- End with a call to action
- Be genuine, not salesy
- Output as markdown

Also provide:
- SEO meta description (150-160 chars)
- 3-5 relevant keywords
- Social media snippet (280 chars max)
```

**Twitter Thread from Blog:**
```handlebars
You are a social media expert for {{productName}}.

Convert this blog post into a Twitter thread:

{{sourceContent}}

Requirements:
- 4-7 tweets maximum
- First tweet must hook attention
- Each tweet should stand alone but flow together
- Include relevant insights, not just summary
- Last tweet should have a CTA
- No hashtags in thread (add separately)
- Each tweet max 280 characters

Output format:
TWEET 1: [content]
TWEET 2: [content]
...

Also provide:
- 3 standalone tweet variations (different angles)
- 3-5 relevant hashtags
```

**LinkedIn Post from Blog:**
```handlebars
You are a B2B content strategist for {{productName}}.

Convert this blog post into a LinkedIn post:

{{sourceContent}}

Requirements:
- Professional but approachable tone
- 1000-1300 characters ideal
- Start with a hook (question or bold statement)
- Use line breaks for readability
- End with engagement question or CTA
- No hashtags in body (add at end)

Also provide:
- 3-5 relevant hashtags
```

---

## Workflows

### Workflow 1: Changelog → Everything

```
1. You add changelog entry in Overseer
   "Added dark mode support with system preference detection"

2. System auto-triggers generation:
   - Blog post draft
   - Twitter thread
   - LinkedIn post
   - Email announcement

3. Content appears in approval queue

4. You review each item:
   - Approve as-is
   - Edit and approve
   - Regenerate (with feedback)
   - Reject

5. Approved content:
   - Blog: Creates PR to marketing repo
   - Social: Queued in social-publishing
   - Email: Queued in email-automation

6. On schedule/trigger: Content publishes
```

### Workflow 2: Topic → Blog → Repurpose

```
1. You submit topic idea:
   "How we reduced API latency by 40%"

2. System generates blog post outline first
   - You approve/modify outline

3. System generates full blog post
   - You approve/edit

4. On approval, auto-triggers:
   - Social posts (all platforms)
   - Email digest inclusion

5. Content flows through pipeline
```

### Workflow 3: Scheduled Content Calendar

```
1. You set up recurring content:
   - "Weekly tip" every Tuesday
   - "Monthly roundup" first of month

2. System generates drafts ahead of time
   - 3-7 days before scheduled date

3. You receive notification to review

4. Approved content publishes on schedule
```

---

## Auto-Publishing Rules

Certain content can skip approval queue:

```typescript
const autoPublishRules = {
  changelog: {
    // Auto-publish changelog social posts
    twitter: true,
    linkedin: true,
    // Blog still needs approval
    blog: false,
  },
  engagement: {
    // Auto-respond to certain engagement
    thankYouReplies: true,
  },
};
```

**Configurable in Overseer settings.**

---

## Overseer UI

### Pages

```
/content                    → Content dashboard
/content/queue              → Approval queue
/content/sources            → Content sources (changelogs, topics)
/content/calendar           → Content calendar
/content/published          → Published content with analytics
/content/templates          → Prompt template editor
/content/settings           → Auto-publish rules, brand voice
```

### Content Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ Content Pipeline                              [+ New Topic] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Pending Approval: 5        Scheduled: 12      Published: 47│
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ APPROVAL QUEUE                                      │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 📝 Blog: "Dark Mode Support"        [Approve] [Edit]│   │
│  │ 🐦 Thread: Dark mode announcement   [Approve] [Edit]│   │
│  │ 💼 LinkedIn: Dark mode post         [Approve] [Edit]│   │
│  │ 📝 Blog: "API Performance Tips"     [Approve] [Edit]│   │
│  │ 📧 Email: Weekly digest             [Approve] [Edit]│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ UPCOMING (Next 7 Days)                              │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Mon 10:00  🐦 Tweet: Performance tip                │   │
│  │ Tue 14:00  💼 LinkedIn: Weekly insight              │   │
│  │ Wed 09:00  📝 Blog: API best practices              │   │
│  │ Fri 16:00  🐦 Thread: Week recap                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Content Editor

```
┌─────────────────────────────────────────────────────────────┐
│ Edit Content                                    [Save Draft]│
├─────────────────────────────────────────────────────────────┤
│ Source: Changelog - Dark Mode Support                       │
│ Type: Twitter Thread                                        │
│ Status: Draft                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ TWEET 1 (Hook):                              [🔄 Regenerate]│
│ ┌─────────────────────────────────────────────────────────┐│
│ │ We just shipped dark mode 🌙                            ││
│ │                                                         ││
│ │ But not just any dark mode - it automatically          ││
│ │ matches your system preferences.                        ││
│ │                                                         ││
│ │ Here's why that matters: 🧵                             ││
│ └─────────────────────────────────────────────────────────┘│
│ Characters: 198/280                                         │
│                                                             │
│ TWEET 2:                                     [🔄 Regenerate]│
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Most dark mode implementations require you to          ││
│ │ manually toggle.                                        ││
│ │                                                         ││
│ │ We think that's backwards.                              ││
│ │                                                         ││
│ │ Your app should adapt to YOU, not the other way.       ││
│ └─────────────────────────────────────────────────────────┘│
│ Characters: 167/280                                         │
│                                                             │
│ [+ Add Tweet]                                               │
│                                                             │
│ Hashtags: #darkmode #ux #webdev                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [Reject] [Request Changes] [Approve] [Approve & Schedule]  │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

```typescript
// Content Sources
POST   /api/content/sources          // Create new source (topic, changelog)
GET    /api/content/sources          // List sources
GET    /api/content/sources/:id      // Get source details
DELETE /api/content/sources/:id      // Delete source

// Content Items
GET    /api/content/items            // List items (filter by status, type)
GET    /api/content/items/:id        // Get item details
PATCH  /api/content/items/:id        // Update item (edit content)
POST   /api/content/items/:id/approve    // Approve item
POST   /api/content/items/:id/reject     // Reject item
POST   /api/content/items/:id/regenerate // Regenerate with feedback
POST   /api/content/items/:id/schedule   // Schedule for publishing

// Generation
POST   /api/content/generate         // Trigger generation for source
POST   /api/content/generate/batch   // Generate all types for source

// Calendar
GET    /api/content/calendar         // Get calendar items
POST   /api/content/calendar         // Add scheduled topic
PATCH  /api/content/calendar/:id     // Update calendar item
DELETE /api/content/calendar/:id     // Remove from calendar

// Templates
GET    /api/content/templates        // List templates
PUT    /api/content/templates/:id    // Update template prompt

// Analytics
GET    /api/content/analytics        // Aggregate content performance
GET    /api/content/analytics/:id    // Single item performance
```

---

## Cron Jobs

### Daily Content Generation

```typescript
// Runs daily at 6 AM
// Generates content for upcoming calendar items

export async function dailyContentGeneration(env: Env) {
  const upcomingItems = await db
    .select()
    .from(contentCalendar)
    .where(
      and(
        eq(contentCalendar.status, 'planned'),
        lte(contentCalendar.scheduled_date, addDays(new Date(), 7))
      )
    );

  for (const item of upcomingItems) {
    await queueContentGeneration(item);
  }
}
```

### Changelog Watcher

```typescript
// Triggered by webhook from changelog updates
// Or polls changelog file in repo

export async function onChangelogUpdate(entry: ChangelogEntry) {
  // Create content source
  const source = await createContentSource({
    type: 'changelog',
    title: entry.title,
    description: entry.description,
    priority: entry.breaking ? 'high' : 'normal',
  });

  // Trigger generation for all content types
  await generateAllContentTypes(source.id);
}
```

---

## Blog Publishing

Blog posts are stored in the marketing site repo:

```typescript
// On blog approval, create PR
export async function publishBlogPost(item: ContentItem) {
  const slug = slugify(item.title);
  const filePath = `src/content/blog/${slug}.md`;

  const frontmatter = {
    title: item.title,
    description: item.metadata.seoDescription,
    date: new Date().toISOString(),
    tags: item.metadata.keywords,
  };

  const content = `---
${yaml.stringify(frontmatter)}
---

${item.content}
`;

  // Create PR via GitHub API
  await github.createPullRequest({
    title: `Blog: ${item.title}`,
    body: `Auto-generated from content pipeline.\n\nSource: ${item.source_id}`,
    branch: `blog/${slug}`,
    files: [{ path: filePath, content }],
  });

  // Update item status
  await updateContentItem(item.id, { status: 'pending_merge' });
}
```

---

## Cost Estimation

**Claude API usage:**
- Blog post (~2K tokens out): ~$0.03
- Social posts (~500 tokens out): ~$0.01
- Regeneration/editing: +50%

**Monthly estimate (active content):**
| Content | Volume | Cost |
|---------|--------|------|
| Blog posts | 4/month | $0.15 |
| Social posts | 50/month | $0.50 |
| Regenerations | ~20% | $0.15 |
| **Total** | | **~$1/month** |

Even at 10x volume, it's ~$10/month.

---

## Integration Points

| System | Integration |
|--------|-------------|
| `social-publishing/plan.md` | Approved social content flows here |
| `email-automation/plan.md` | Email content flows here |
| Marketing site repo | Blog PRs created here |
| PostHog | Content performance tracking |
| Changelog | Triggers content generation |

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] D1 schema for content tables
- [ ] Claude API integration
- [ ] Basic prompt templates
- [ ] Content source CRUD

### Phase 2: Generation Pipeline
- [ ] Changelog → content trigger
- [ ] Topic → outline → blog workflow
- [ ] Repurposing engine (blog → social)
- [ ] Batch generation

### Phase 3: Approval UI
- [ ] Approval queue page
- [ ] Content editor with regenerate
- [ ] Scheduling interface
- [ ] Auto-publish rules

### Phase 4: Publishing
- [ ] GitHub PR for blogs
- [ ] Integration with social-publishing
- [ ] Integration with email-automation
- [ ] Published content tracking

### Phase 5: Analytics
- [ ] Performance tracking
- [ ] Engagement aggregation
- [ ] Content effectiveness reports
