# Customer Support Plan

> **Purpose:** AI-first customer support with minimal manual intervention
> **Goal:** 70-80% of queries resolved automatically, you handle the rest
> **Tool:** Chatwoot (self-hosted or cloud) with AI integration

---

## Overview

Support automation layers:

```
Customer Query
      │
      ▼
┌─────────────────────────────────────────┐
│ Layer 1: Knowledge Base Bot (70%)       │
│ - Search docs, FAQ                      │
│ - Answer common questions               │
│ - Instant response                      │
└────────────────┬────────────────────────┘
                 │ Can't answer
                 ▼
┌─────────────────────────────────────────┐
│ Layer 2: AI Response (20%)              │
│ - Generate response from context        │
│ - Check confidence score                │
│ - Auto-send if high confidence          │
│ - Queue for review if uncertain         │
└────────────────┬────────────────────────┘
                 │ Low confidence / Complex
                 ▼
┌─────────────────────────────────────────┐
│ Layer 3: Human (You) (10%)              │
│ - Complex issues                        │
│ - Angry customers                       │
│ - Edge cases                            │
│ - With AI-suggested response            │
└─────────────────────────────────────────┘
```

---

## Chatwoot Setup

### Option 1: Self-Hosted (Recommended)

**Why self-host:**
- Free (no per-agent cost)
- Full data control
- All features available
- Can customize

**Infrastructure:**
- Small VPS ($5-10/month): Hetzner, DigitalOcean, or Vultr
- Or Railway/Render ($7/month hobby tier)
- PostgreSQL (included or external)
- Redis (included or external)

**Docker Compose Setup:**

```yaml
# docker-compose.yml
version: '3'

services:
  chatwoot:
    image: chatwoot/chatwoot:latest
    depends_on:
      - postgres
      - redis
    ports:
      - "3000:3000"
    environment:
      - RAILS_ENV=production
      - SECRET_KEY_BASE=${SECRET_KEY_BASE}
      - FRONTEND_URL=https://support.yourproduct.com
      - DEFAULT_LOCALE=en

      # Database
      - POSTGRES_HOST=postgres
      - POSTGRES_DATABASE=chatwoot
      - POSTGRES_USERNAME=postgres
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

      # Redis
      - REDIS_URL=redis://redis:6379

      # Email (for notifications)
      - MAILER_SENDER_EMAIL=support@yourproduct.com
      - SMTP_ADDRESS=smtp.resend.com
      - SMTP_PORT=587
      - SMTP_USERNAME=resend
      - SMTP_PASSWORD=${RESEND_API_KEY}

      # Storage (for attachments)
      - ACTIVE_STORAGE_SERVICE=cloudflare_r2
      - S3_BUCKET_NAME=${R2_BUCKET}
      - AWS_ACCESS_KEY_ID=${R2_ACCESS_KEY}
      - AWS_SECRET_ACCESS_KEY=${R2_SECRET_KEY}
      - AWS_REGION=auto
      - S3_ENDPOINT=https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com

    volumes:
      - chatwoot_storage:/app/storage

  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=chatwoot
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  sidekiq:
    image: chatwoot/chatwoot:latest
    depends_on:
      - postgres
      - redis
    command: bundle exec sidekiq -C config/sidekiq.yml
    environment:
      # Same as chatwoot service
      - RAILS_ENV=production
      # ... all the same env vars

volumes:
  chatwoot_storage:
  postgres_data:
  redis_data:
```

**Deployment with Caddy (HTTPS):**

```
# Caddyfile
support.yourproduct.com {
    reverse_proxy chatwoot:3000
}
```

### Option 2: Chatwoot Cloud

**Pricing:** $19/agent/month (you = 1 agent = $19/month)

**Pros:**
- Zero maintenance
- Automatic updates
- Managed infrastructure

**Cons:**
- Monthly cost
- Less customization
- Data on their servers

**Setup:**
1. Sign up at app.chatwoot.com
2. Create account/organization
3. Add inbox (website widget)
4. Configure automation

---

## AI Configuration

### Chatwoot AI Features (Built-in)

1. **AI Assist** - Suggests responses based on context
2. **Smart Assist** - Summarizes conversations
3. **Article Suggestions** - Recommends help articles

### Custom AI Integration

For deeper AI integration, connect Claude to Chatwoot:

```typescript
// packages/tools/admin/src/lib/support/ai-responder.ts
import Anthropic from '@anthropic-ai/sdk';

interface ConversationContext {
  messages: Message[];
  customer: Customer;
  knowledgeBase: KnowledgeArticle[];
}

export async function generateResponse(
  context: ConversationContext
): Promise<AIResponse> {
  const relevantArticles = await searchKnowledgeBase(
    context.messages[context.messages.length - 1].content
  );

  const prompt = `
You are a helpful customer support agent for ${PRODUCT_NAME}.

Customer: ${context.customer.name || 'Customer'}
Previous messages:
${context.messages.map(m => `${m.sender}: ${m.content}`).join('\n')}

Relevant help articles:
${relevantArticles.map(a => `- ${a.title}: ${a.summary}`).join('\n')}

Guidelines:
- Be helpful, friendly, and concise
- If you can answer from the knowledge base, do so
- If you're unsure, say so and offer to escalate
- Never make up features or capabilities
- If it's a bug report, acknowledge and say we'll look into it
- For billing issues, be extra careful and suggest contacting support directly for sensitive changes

Provide:
1. Your response to the customer
2. Confidence score (0-1) - how confident you are this is correct
3. Should this be auto-sent? (true if confidence > 0.8 AND not sensitive topic)
4. Category: general, billing, bug, feature_request, other

Output as JSON:
{
  "response": "...",
  "confidence": 0.X,
  "auto_send": true/false,
  "category": "...",
  "suggested_tags": ["..."]
}
`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  return JSON.parse(response.content[0].text);
}
```

### Chatwoot Webhook Integration

```typescript
// POST /api/support/webhook/chatwoot
export async function handleChatwootWebhook(request: Request) {
  const event = await request.json();

  switch (event.event) {
    case 'message_created':
      if (event.message_type === 'incoming') {
        await handleIncomingMessage(event);
      }
      break;

    case 'conversation_created':
      await handleNewConversation(event);
      break;

    case 'conversation_status_changed':
      if (event.status === 'resolved') {
        await handleResolved(event);
      }
      break;
  }

  return new Response('OK');
}

async function handleIncomingMessage(event: ChatwootEvent) {
  const context = await buildContext(event.conversation);
  const aiResponse = await generateResponse(context);

  if (aiResponse.auto_send && aiResponse.confidence > 0.8) {
    // Auto-send response
    await sendChatwootMessage(
      event.conversation.id,
      aiResponse.response,
      { ai_generated: true, confidence: aiResponse.confidence }
    );

    // Add tags
    await addConversationTags(event.conversation.id, aiResponse.suggested_tags);
  } else {
    // Queue for human review with AI suggestion
    await addPrivateNote(
      event.conversation.id,
      `🤖 AI Suggestion (confidence: ${aiResponse.confidence}):\n\n${aiResponse.response}`
    );

    // Notify in Overseer
    await createSupportAlert({
      type: 'needs_review',
      conversation_id: event.conversation.id,
      ai_confidence: aiResponse.confidence,
      category: aiResponse.category,
    });
  }
}
```

---

## Knowledge Base

### Sources

1. **Documentation** (Starlight) - Auto-sync
2. **FAQ** - Managed in Overseer
3. **Previous Tickets** - Learned responses
4. **Product Info** - From Overseer

### Sync from Documentation

```typescript
// Sync Starlight docs to Chatwoot knowledge base
export async function syncDocsToKnowledgeBase() {
  // Get all docs from Starlight content directory
  const docs = await glob('docs/src/content/docs/**/*.md');

  for (const docPath of docs) {
    const content = await readFile(docPath);
    const { data: frontmatter, content: body } = parseFrontmatter(content);

    // Create/update article in Chatwoot
    await upsertChatwootArticle({
      title: frontmatter.title,
      content: body,
      category: getCategoryFromPath(docPath),
      slug: getSlugFromPath(docPath),
    });
  }
}
```

### FAQ Management in Overseer

```sql
-- D1 Schema
CREATE TABLE support_faq (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  keywords TEXT, -- JSON array for search
  views INTEGER DEFAULT 0,
  helpful_yes INTEGER DEFAULT 0,
  helpful_no INTEGER DEFAULT 0,
  chatwoot_article_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### AI Learning from Tickets

```typescript
// After conversation resolved, learn from it
async function learnFromResolution(conversation: Conversation) {
  const messages = await getConversationMessages(conversation.id);
  const resolution = messages.find(m => m.is_resolution);

  if (!resolution) return;

  // Check if this is a new pattern
  const similarFaqs = await searchFAQ(messages[0].content);

  if (similarFaqs.length === 0) {
    // Potentially new FAQ candidate
    await createFAQCandidate({
      original_question: messages[0].content,
      resolution: resolution.content,
      conversation_id: conversation.id,
    });
  }
}
```

---

## Widget Integration

### Website Widget

```html
<!-- Add to marketing site and app -->
<script>
  window.chatwootSettings = {
    position: 'right',
    type: 'standard',
    launcherTitle: 'Chat with us',
  };

  (function(d,t) {
    var BASE_URL = "https://support.yourproduct.com";
    var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
    g.src=BASE_URL+"/packs/js/sdk.js";
    g.defer = true;
    g.async = true;
    s.parentNode.insertBefore(g,s);
    g.onload=function(){
      window.chatwootSDK.run({
        websiteToken: 'YOUR_WEBSITE_TOKEN',
        baseUrl: BASE_URL
      })
    }
  })(document,"script");
</script>
```

### Identify Logged-in Users

```typescript
// In app, after user logs in
window.$chatwoot.setUser(user.id, {
  email: user.email,
  name: user.name,
  avatar_url: user.avatarUrl,
  identifier_hash: hmac(user.id, CHATWOOT_IDENTITY_SECRET), // For security
  custom_attributes: {
    plan: user.plan,
    signup_date: user.createdAt,
    company: user.companyName,
  },
});
```

### Pre-fill Context

```typescript
// When user opens support from specific page
window.$chatwoot.setCustomAttributes({
  current_page: window.location.pathname,
  last_action: 'tried_to_export',
  error_message: 'Export failed: timeout',
});
```

---

## Support Workflows

### Workflow 1: General Question

```
Customer: "How do I export my data?"
      │
      ▼
Bot searches knowledge base
      │
      ▼
Found: "Data Export Guide" article
      │
      ▼
Bot: "You can export your data from Settings > Export.
      Here's a detailed guide: [link]

      Did this help?"
      │
      ▼
Customer: "Yes, thanks!"
      │
      ▼
Auto-resolve, log success
```

### Workflow 2: Bug Report

```
Customer: "The app crashes when I upload large files"
      │
      ▼
AI categorizes: bug_report
      │
      ▼
AI generates response (confidence: 0.7)
      │
      ▼
Queued for review (not auto-sent)
      │
      ▼
You see notification in Overseer
      │
      ▼
Review AI suggestion, edit, send:
"Thanks for reporting this. We've logged the issue.
 Could you tell us:
 - What file size causes the crash?
 - What browser are you using?
 This will help us fix it faster."
      │
      ▼
Create GitHub issue from conversation
```

### Workflow 3: Billing Question

```
Customer: "I want to cancel my subscription"
      │
      ▼
AI categorizes: billing (sensitive)
      │
      ▼
AI: "I can help with that..." (confidence: 0.9)
But: billing = sensitive, so never auto-send
      │
      ▼
Always queued for human
      │
      ▼
You respond personally
(Maybe with AI-suggested response as starting point)
```

### Workflow 4: Feature Request

```
Customer: "Can you add dark mode?"
      │
      ▼
AI categorizes: feature_request
      │
      ▼
Check if already planned (search roadmap)
      │
      ▼
AI generates response:
"Great suggestion! Dark mode is actually on our roadmap.
 I'll add your vote to help prioritize it.
 Want me to notify you when it's released?"
      │
      ▼
Auto-send (confidence: 0.95, not sensitive)
      │
      ▼
Log feature request in Overseer
```

---

## Overseer Integration

### Support Dashboard

```
/support                    → Support overview
/support/conversations      → Active conversations
/support/needs-review       → AI responses needing approval
/support/faq                → FAQ management
/support/analytics          → Support metrics
/support/settings           → AI settings, auto-response rules
```

### Support Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Support Dashboard                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Open: 3        Pending: 5       Resolved (24h): 12        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ NEEDS YOUR ATTENTION                                │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 🔴 Billing question from john@...        2 min ago  │   │
│  │ 🟡 Bug report - upload crash             15 min ago │   │
│  │ 🟡 Feature request - API access          1 hour ago │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ AI PERFORMANCE (Last 7 Days)                        │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Total conversations: 89                             │   │
│  │ Auto-resolved: 62 (70%)                             │   │
│  │ AI-assisted: 18 (20%)                               │   │
│  │ Fully manual: 9 (10%)                               │   │
│  │                                                      │   │
│  │ Avg response time: 2.3 min                          │   │
│  │ Avg resolution time: 4.5 hours                      │   │
│  │ Customer satisfaction: 94%                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ RECENT ACTIVITY                                      │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ✅ "How to reset password" - Auto-resolved          │   │
│  │ ✅ "Pricing question" - Auto-resolved               │   │
│  │ ✅ "Export issue" - You resolved (3 min)            │   │
│  │ ✅ "Cancel subscription" - You resolved (5 min)     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Conversation Review

```
┌─────────────────────────────────────────────────────────────┐
│ Conversation: Bug Report from sarah@...                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Customer Info:                                              │
│ Plan: Pro  │  Joined: 3 months ago  │  Support tickets: 2   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 👤 Sarah (2 min ago):                                       │
│ "The dashboard keeps showing a loading spinner. I've tried  │
│  refreshing but it won't load. This is urgent - I have a   │
│  presentation in an hour!"                                  │
│                                                             │
│ ─────────────────────────────────────────────────────────   │
│                                                             │
│ 🤖 AI Suggestion (confidence: 0.75):                        │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ "I'm sorry you're experiencing this! Let's get this │    │
│ │  fixed quickly.                                      │    │
│ │                                                       │    │
│ │  First, could you try:                               │    │
│ │  1. Clear your browser cache                         │    │
│ │  2. Try an incognito window                          │    │
│ │                                                       │    │
│ │  If that doesn't work, I'll escalate this           │    │
│ │  immediately given your timeline."                   │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ [Edit] [Send as-is] [Reject & Write Own]                   │
│                                                             │
│ Quick actions:                                              │
│ [Create Bug Ticket] [Check Status Page] [View User Logs]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Model (Overseer)

```sql
-- Support metrics aggregation
CREATE TABLE support_metrics (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  auto_resolved INTEGER DEFAULT 0,
  ai_assisted INTEGER DEFAULT 0,
  manual_resolved INTEGER DEFAULT 0,
  avg_response_time_seconds INTEGER,
  avg_resolution_time_seconds INTEGER,
  satisfaction_score REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date)
);

-- FAQ candidates from conversations
CREATE TABLE support_faq_candidates (
  id TEXT PRIMARY KEY,
  original_question TEXT NOT NULL,
  resolution TEXT NOT NULL,
  conversation_id TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  approved_as_faq_id TEXT REFERENCES support_faq(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Support alerts for Overseer
CREATE TABLE support_alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- needs_review, urgent, negative_sentiment
  conversation_id TEXT,
  chatwoot_url TEXT,
  ai_confidence REAL,
  category TEXT,
  acknowledged INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Auto-response rules
CREATE TABLE support_auto_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT, -- Which categories can auto-respond
  min_confidence REAL DEFAULT 0.8,
  enabled INTEGER DEFAULT 1,
  exceptions TEXT, -- JSON: keywords that block auto-send
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

```typescript
// Overseer Support APIs
GET    /api/support/dashboard            // Dashboard stats
GET    /api/support/conversations        // List conversations (via Chatwoot API)
GET    /api/support/needs-review         // Conversations needing review
POST   /api/support/conversations/:id/respond  // Send response

// FAQ
GET    /api/support/faq                  // List FAQ
POST   /api/support/faq                  // Create FAQ
PUT    /api/support/faq/:id              // Update FAQ
DELETE /api/support/faq/:id              // Delete FAQ
POST   /api/support/faq/sync             // Sync to Chatwoot

// FAQ Candidates
GET    /api/support/faq-candidates       // List candidates
POST   /api/support/faq-candidates/:id/approve  // Approve as FAQ
POST   /api/support/faq-candidates/:id/reject   // Reject

// Alerts
GET    /api/support/alerts               // List alerts
POST   /api/support/alerts/:id/acknowledge  // Mark as seen

// Settings
GET    /api/support/settings             // Get auto-response settings
PUT    /api/support/settings             // Update settings

// Webhooks
POST   /api/support/webhook/chatwoot     // Chatwoot events
```

---

## Cost Comparison

| Option | Monthly Cost | Notes |
|--------|--------------|-------|
| Self-hosted (VPS) | $5-10 | Full features, your data |
| Self-hosted (Railway) | $7-15 | Easier setup |
| Chatwoot Cloud | $19 | Zero maintenance |
| Claude API | $5-20 | Based on volume |
| **Total (Self-hosted)** | **$10-30** | |
| **Total (Cloud)** | **$25-40** | |

Compare to Intercom ($74/mo+), Zendesk ($55/mo+), or Freshdesk ($15/mo+ per agent).

---

## Implementation Checklist

### Phase 1: Chatwoot Setup
- [ ] Choose deployment (self-hosted vs cloud)
- [ ] Set up Chatwoot instance
- [ ] Configure inbox (website widget)
- [ ] Set up email channel
- [ ] Configure R2 for attachments

### Phase 2: Widget Integration
- [ ] Add widget to marketing site
- [ ] Add widget to app
- [ ] User identification
- [ ] Custom attributes

### Phase 3: Knowledge Base
- [ ] Sync documentation to Chatwoot
- [ ] Create initial FAQ
- [ ] Set up article categories

### Phase 4: AI Integration
- [ ] Chatwoot webhook handler
- [ ] Claude integration for responses
- [ ] Confidence scoring
- [ ] Auto-send rules

### Phase 5: Overseer Integration
- [ ] Support dashboard
- [ ] Review queue
- [ ] FAQ management
- [ ] Metrics collection
- [ ] Alert system
