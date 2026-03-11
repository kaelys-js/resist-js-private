# Email Automation Plan

> **Purpose:** Trigger-based email sequences for marketing, onboarding, and retention
> **Goal:** Emails send automatically based on user actions, you only write content once
> **Integration:** Sends via Resend, managed via Overseer, analytics in PostHog

---

## Overview

Email automation handles marketing/lifecycle emails (not transactional):

| Type | Example | Trigger |
|------|---------|---------|
| **Transactional** | Password reset | User action (handled by product API) |
| **Marketing** | Welcome sequence | User signs up |
| **Lifecycle** | Trial expiring | Time-based |
| **Engagement** | Feature announcement | Product event |
| **Retention** | Win-back | Inactivity |

This plan covers everything except transactional (which is in the product API).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       OVERSEER                               │
│                  Email Automation Module                     │
├─────────────────────────────────────────────────────────────┤
│ Sequences │ Templates │ Triggers │ Analytics │ Subscribers  │
└─────┬─────┴─────┬─────┴────┬─────┴─────┬─────┴──────┬───────┘
      │           │          │           │            │
      ▼           ▼          ▼           ▼            ▼
 ┌─────────┐ ┌────────┐ ┌─────────┐ ┌────────┐ ┌──────────┐
 │   D1    │ │ Claude │ │ Webhook │ │ Resend │ │ PostHog  │
 │Sequences│ │  API   │ │Receiver │ │  API   │ │  Events  │
 └─────────┘ └────────┘ └─────────┘ └────────┘ └──────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
       Product API       Lemon Squeezy      RevenueCat
       (user events)     (payment events)   (sub events)
```

---

## Email Sequences

### Pre-built Sequences

#### 1. Welcome Sequence (New User)
```
Trigger: user_signed_up
Timing: Immediate → Day 1 → Day 3 → Day 7

Email 1 (Immediate): Welcome & Quick Start
- Thank them for signing up
- One key action to get started
- Link to docs/guides

Email 2 (Day 1): Key Feature Highlight
- Showcase main value proposition
- How to use core feature
- Success story/testimonial

Email 3 (Day 3): Tips & Best Practices
- Power user tips
- Common mistakes to avoid
- Link to community/support

Email 4 (Day 7): Check-in
- How's it going?
- Offer help
- Link to upgrade (if free tier)
```

#### 2. Trial Conversion Sequence
```
Trigger: trial_started
Timing: Day 7 → Day 12 → Day 14 (expiry)

Email 1 (Day 7): Trial Midpoint
- Reminder of trial timeline
- Features they haven't tried
- Success metrics from other users

Email 2 (Day 12): Expiry Warning
- 2 days left
- What they'll lose
- Upgrade CTA

Email 3 (Day 14): Last Chance
- Trial ending today
- Special offer (optional)
- What happens next
```

#### 3. Onboarding Completion
```
Trigger: Various (setup_complete, first_action, etc.)
Condition-based: Only if user hasn't done X

Email 1: Complete Profile
Trigger: user_signed_up AND NOT profile_completed (after 2 days)
- Remind to complete profile
- Benefits of complete profile

Email 2: First Project
Trigger: user_signed_up AND NOT project_created (after 3 days)
- Help create first project
- Templates/examples

Email 3: Invite Team
Trigger: project_created AND NOT team_invited (after 5 days)
- Collaboration benefits
- How to invite
```

#### 4. Re-engagement Sequence
```
Trigger: user_inactive (14 days no login)
Timing: Day 14 → Day 21 → Day 30

Email 1 (Day 14): We Miss You
- Personalized based on last activity
- What's new since they left
- One-click return

Email 2 (Day 21): What's New
- Recent features/updates
- Customer success story
- Special offer (optional)

Email 3 (Day 30): Final Check
- Are you still interested?
- Feedback request
- Unsubscribe option prominent
```

#### 5. Cancellation/Win-back
```
Trigger: subscription_cancelled
Timing: Immediate → Day 7 → Day 30

Email 1 (Immediate): Confirmation & Feedback
- Confirm cancellation
- Quick feedback survey (why?)
- Door is open

Email 2 (Day 7): We'd Love You Back
- Address common cancellation reasons
- What's improved
- Special comeback offer

Email 3 (Day 30): One Month Later
- Significant updates since leaving
- New features
- Final offer
```

#### 6. Feature Announcements
```
Trigger: Manual or changelog entry
Target: Active users or specific segments

Email: New Feature Announcement
- What's new
- How it helps them
- How to use it
- Feedback link
```

---

## Data Model

### D1 Schema (Overseer)

```sql
-- Email sequences
CREATE TABLE email_sequences (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL, -- PostHog event name
  trigger_conditions TEXT, -- JSON: additional conditions
  status TEXT DEFAULT 'draft', -- draft, active, paused
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Sequence emails (steps)
CREATE TABLE sequence_emails (
  id TEXT PRIMARY KEY,
  sequence_id TEXT REFERENCES email_sequences(id),
  position INTEGER NOT NULL, -- Order in sequence
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  template_id TEXT REFERENCES email_templates(id),
  delay_days INTEGER DEFAULT 0, -- Days after trigger (or previous email)
  delay_hours INTEGER DEFAULT 0,
  send_conditions TEXT, -- JSON: skip if conditions not met
  status TEXT DEFAULT 'active', -- active, paused, archived
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Email templates
CREATE TABLE email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT, -- welcome, trial, engagement, announcement
  subject_template TEXT NOT NULL, -- Handlebars template
  body_html TEXT NOT NULL, -- Handlebars template
  body_text TEXT, -- Plain text version
  variables TEXT, -- JSON: list of variables used
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Subscriber states (sequence progress)
CREATE TABLE subscriber_sequences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  sequence_id TEXT REFERENCES email_sequences(id),
  current_position INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, completed, paused, unsubscribed
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  next_email_at TEXT,
  completed_at TEXT,
  metadata TEXT -- JSON: user properties for personalization
);

-- Sent emails log
CREATE TABLE sent_emails (
  id TEXT PRIMARY KEY,
  subscriber_sequence_id TEXT REFERENCES subscriber_sequences(id),
  sequence_email_id TEXT REFERENCES sequence_emails(id),
  resend_id TEXT, -- Resend email ID
  sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'sent', -- sent, delivered, opened, clicked, bounced, complained
  opened_at TEXT,
  clicked_at TEXT,
  click_urls TEXT -- JSON: array of clicked URLs
);

-- Email preferences
CREATE TABLE email_preferences (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  marketing_emails INTEGER DEFAULT 1,
  product_updates INTEGER DEFAULT 1,
  tips_and_tricks INTEGER DEFAULT 1,
  unsubscribed_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## Trigger System

### Event Sources

```typescript
// Events come from multiple sources

// 1. Product API webhooks (user actions)
interface ProductEvent {
  event: 'user_signed_up' | 'user_logged_in' | 'project_created' | etc;
  user_id: string;
  email: string;
  properties: Record<string, any>;
  timestamp: string;
}

// 2. Lemon Squeezy webhooks (payments)
interface PaymentEvent {
  event: 'subscription_created' | 'subscription_cancelled' | etc;
  user_id: string;
  email: string;
  subscription: SubscriptionData;
}

// 3. RevenueCat webhooks (mobile payments)
interface MobilePaymentEvent {
  event: 'INITIAL_PURCHASE' | 'CANCELLATION' | etc;
  app_user_id: string;
  // ... RevenueCat data
}

// 4. Cron-based (time triggers)
interface TimeEvent {
  event: 'trial_expiring' | 'user_inactive' | 'subscription_renewing';
  user_id: string;
  email: string;
  context: Record<string, any>;
}
```

### Event Handler

```typescript
// packages/tools/admin/src/lib/email/event-handler.ts

export async function handleEmailEvent(event: EmailEvent) {
  // Find matching sequences
  const sequences = await db
    .select()
    .from(emailSequences)
    .where(
      and(
        eq(emailSequences.trigger_event, event.event),
        eq(emailSequences.status, 'active')
      )
    );

  for (const sequence of sequences) {
    // Check trigger conditions
    if (!matchesConditions(event, sequence.trigger_conditions)) {
      continue;
    }

    // Check if user already in this sequence
    const existing = await db
      .select()
      .from(subscriberSequences)
      .where(
        and(
          eq(subscriberSequences.user_id, event.user_id),
          eq(subscriberSequences.sequence_id, sequence.id),
          eq(subscriberSequences.status, 'active')
        )
      )
      .first();

    if (existing) {
      continue; // Already in sequence
    }

    // Check email preferences
    const prefs = await getEmailPreferences(event.user_id);
    if (!shouldReceiveEmail(prefs, sequence)) {
      continue;
    }

    // Start sequence
    await startSequence(event.user_id, event.email, sequence, event.properties);
  }
}

async function startSequence(
  userId: string,
  email: string,
  sequence: EmailSequence,
  metadata: Record<string, any>
) {
  const firstEmail = await getFirstSequenceEmail(sequence.id);
  const nextEmailAt = calculateNextEmailTime(firstEmail);

  await db.insert(subscriberSequences).values({
    id: generateId(),
    user_id: userId,
    email,
    sequence_id: sequence.id,
    current_position: 0,
    status: 'active',
    next_email_at: nextEmailAt.toISOString(),
    metadata: JSON.stringify(metadata),
  });
}
```

### Cron Triggers

```typescript
// Check for time-based triggers daily
export async function checkTimeBasedTriggers(env: Env) {
  // Trial expiring (2 days out)
  const expiringTrials = await db.query(`
    SELECT user_id, email, trial_ends_at
    FROM users
    WHERE trial_ends_at BETWEEN NOW() AND NOW() + INTERVAL 2 DAYS
    AND subscription_status = 'trialing'
  `);

  for (const user of expiringTrials) {
    await handleEmailEvent({
      event: 'trial_expiring',
      user_id: user.user_id,
      email: user.email,
      properties: { trial_ends_at: user.trial_ends_at },
      timestamp: new Date().toISOString(),
    });
  }

  // Inactive users (14 days)
  const inactiveUsers = await db.query(`
    SELECT user_id, email, last_seen_at
    FROM users
    WHERE last_seen_at < NOW() - INTERVAL 14 DAYS
    AND NOT EXISTS (
      SELECT 1 FROM subscriber_sequences
      WHERE user_id = users.user_id
      AND sequence_id = 're-engagement'
      AND status IN ('active', 'completed')
    )
  `);

  for (const user of inactiveUsers) {
    await handleEmailEvent({
      event: 'user_inactive',
      user_id: user.user_id,
      email: user.email,
      properties: { last_seen_at: user.last_seen_at },
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## Email Sending

### Sequence Processor

```typescript
// Cron job: runs every 15 minutes
export async function processEmailQueue(env: Env) {
  const now = new Date();

  // Get subscribers due for next email
  const due = await db
    .select()
    .from(subscriberSequences)
    .where(
      and(
        eq(subscriberSequences.status, 'active'),
        lte(subscriberSequences.next_email_at, now.toISOString())
      )
    );

  for (const subscriber of due) {
    try {
      await sendNextEmail(subscriber, env);
    } catch (error) {
      console.error(`Failed to send email for ${subscriber.id}:`, error);
      // Don't fail entire batch
    }
  }
}

async function sendNextEmail(subscriber: SubscriberSequence, env: Env) {
  // Get next email in sequence
  const nextPosition = subscriber.current_position + 1;
  const sequenceEmail = await db
    .select()
    .from(sequenceEmails)
    .where(
      and(
        eq(sequenceEmails.sequence_id, subscriber.sequence_id),
        eq(sequenceEmails.position, nextPosition),
        eq(sequenceEmails.status, 'active')
      )
    )
    .first();

  if (!sequenceEmail) {
    // Sequence complete
    await db
      .update(subscriberSequences)
      .set({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .where(eq(subscriberSequences.id, subscriber.id));
    return;
  }

  // Check send conditions
  if (!await checkSendConditions(subscriber, sequenceEmail)) {
    // Skip this email, move to next
    await advanceSequence(subscriber, sequenceEmail);
    return;
  }

  // Render email
  const template = await getTemplate(sequenceEmail.template_id);
  const context = {
    ...JSON.parse(subscriber.metadata || '{}'),
    user_email: subscriber.email,
    unsubscribe_url: generateUnsubscribeUrl(subscriber.user_id),
  };

  const subject = renderTemplate(sequenceEmail.subject, context);
  const html = renderTemplate(template.body_html, context);
  const text = template.body_text ? renderTemplate(template.body_text, context) : undefined;

  // Send via Resend
  const resend = new Resend(env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: 'Your Product <hello@yourproduct.com>',
    to: subscriber.email,
    subject,
    html,
    text,
    tags: [
      { name: 'sequence', value: subscriber.sequence_id },
      { name: 'email', value: sequenceEmail.id },
    ],
  });

  // Log sent email
  await db.insert(sentEmails).values({
    id: generateId(),
    subscriber_sequence_id: subscriber.id,
    sequence_email_id: sequenceEmail.id,
    resend_id: result.id,
    status: 'sent',
  });

  // Advance sequence
  await advanceSequence(subscriber, sequenceEmail);
}

async function advanceSequence(
  subscriber: SubscriberSequence,
  currentEmail: SequenceEmail
) {
  const nextEmail = await getNextSequenceEmail(
    subscriber.sequence_id,
    currentEmail.position + 1
  );

  if (nextEmail) {
    const nextTime = calculateNextEmailTime(nextEmail, new Date());
    await db
      .update(subscriberSequences)
      .set({
        current_position: currentEmail.position,
        next_email_at: nextTime.toISOString(),
      })
      .where(eq(subscriberSequences.id, subscriber.id));
  } else {
    await db
      .update(subscriberSequences)
      .set({
        status: 'completed',
        current_position: currentEmail.position,
        completed_at: new Date().toISOString(),
      })
      .where(eq(subscriberSequences.id, subscriber.id));
  }
}
```

### Resend Webhooks

Track email engagement:

```typescript
// POST /api/email/webhook/resend
export async function handleResendWebhook(request: Request) {
  const event = await request.json();

  const emailId = event.tags?.find(t => t.name === 'email')?.value;
  if (!emailId) return;

  const sentEmail = await db
    .select()
    .from(sentEmails)
    .where(eq(sentEmails.resend_id, event.data.email_id))
    .first();

  if (!sentEmail) return;

  switch (event.type) {
    case 'email.delivered':
      await db.update(sentEmails)
        .set({ status: 'delivered' })
        .where(eq(sentEmails.id, sentEmail.id));
      break;

    case 'email.opened':
      await db.update(sentEmails)
        .set({ status: 'opened', opened_at: new Date().toISOString() })
        .where(eq(sentEmails.id, sentEmail.id));
      break;

    case 'email.clicked':
      await db.update(sentEmails)
        .set({
          status: 'clicked',
          clicked_at: new Date().toISOString(),
          click_urls: JSON.stringify([...(sentEmail.click_urls || []), event.data.url]),
        })
        .where(eq(sentEmails.id, sentEmail.id));
      break;

    case 'email.bounced':
      await db.update(sentEmails)
        .set({ status: 'bounced' })
        .where(eq(sentEmails.id, sentEmail.id));
      // Pause subscriber
      await pauseSubscriber(sentEmail.subscriber_sequence_id, 'bounced');
      break;

    case 'email.complained':
      await db.update(sentEmails)
        .set({ status: 'complained' })
        .where(eq(sentEmails.id, sentEmail.id));
      // Unsubscribe user
      await unsubscribeUser(sentEmail.subscriber_sequence_id);
      break;
  }
}
```

---

## AI Content Generation

### Generate Email Content

```typescript
// Generate email content from brief description
export async function generateEmailContent(
  brief: string,
  context: EmailContext
): Promise<GeneratedEmail> {
  const prompt = `
You are an email copywriter for ${context.productName}, ${context.productDescription}.

Target audience: ${context.targetAudience}
Brand voice: ${context.brandVoice}

Write a marketing email based on this brief:
${brief}

Email context:
- Sequence: ${context.sequenceName}
- Position in sequence: Email ${context.position} of ${context.totalEmails}
- Days since trigger: ${context.daysSinceTrigger}

Requirements:
- Subject line (max 60 chars, avoid spam triggers)
- Preview text (max 90 chars)
- Body (HTML-safe, use {{variable}} for personalization)
- Available variables: {{first_name}}, {{product_name}}, {{unsubscribe_url}}
- Keep it concise, scannable
- Clear single CTA
- Genuine tone, not salesy

Output as JSON:
{
  "subject": "...",
  "preview_text": "...",
  "body_html": "...",
  "body_text": "..."
}
`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  return JSON.parse(response.content[0].text);
}
```

### Generate Sequence

```typescript
// Generate entire sequence from description
export async function generateSequence(
  description: string,
  numEmails: number,
  context: SequenceContext
): Promise<GeneratedSequence> {
  const prompt = `
Create an email sequence for ${context.productName}.

Sequence purpose: ${description}
Number of emails: ${numEmails}
Trigger event: ${context.triggerEvent}

For each email, provide:
1. Day to send (after trigger)
2. Subject line
3. Preview text
4. Brief content description (I'll generate full content later)
5. Goal of this email

Output as JSON array.
`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  return JSON.parse(response.content[0].text);
}
```

---

## Overseer UI

### Pages

```
/email                      → Email dashboard
/email/sequences            → All sequences
/email/sequences/:id        → Sequence detail/editor
/email/templates            → Email templates
/email/analytics            → Performance analytics
/email/subscribers          → Subscriber management
/email/preferences          → Global email settings
```

### Sequence Editor

```
┌─────────────────────────────────────────────────────────────┐
│ Welcome Sequence                              [Save] [Test] │
├─────────────────────────────────────────────────────────────┤
│ Trigger: user_signed_up                                     │
│ Status: Active                          [Pause Sequence]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ 📧 Email 1: Welcome                    [Edit] [Test]│    │
│ │ ───────────────────────────────────────────────────│    │
│ │ Delay: Immediate                                    │    │
│ │ Subject: Welcome to {{product_name}}!               │    │
│ │ Open rate: 68%  Click rate: 24%                    │    │
│ └─────────────────────────────────────────────────────┘    │
│                      ↓                                      │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ 📧 Email 2: Getting Started            [Edit] [Test]│    │
│ │ ───────────────────────────────────────────────────│    │
│ │ Delay: 1 day                                        │    │
│ │ Subject: Your first steps with {{product_name}}     │    │
│ │ Open rate: 52%  Click rate: 18%                    │    │
│ └─────────────────────────────────────────────────────┘    │
│                      ↓                                      │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ 📧 Email 3: Tips & Tricks              [Edit] [Test]│    │
│ │ ───────────────────────────────────────────────────│    │
│ │ Delay: 3 days                                       │    │
│ │ Subject: 5 tips to get more from {{product_name}}   │    │
│ │ Open rate: 45%  Click rate: 12%                    │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ [+ Add Email] [🤖 Generate with AI]                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Email Editor

```
┌─────────────────────────────────────────────────────────────┐
│ Edit Email: Welcome                    [Preview] [Send Test]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Subject:                                                    │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Welcome to {{product_name}}! 🎉                     │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ Preview text:                                               │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Get started in 2 minutes                            │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ Body:                                     [🤖 Regenerate]   │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Hi {{first_name}},                                  │    │
│ │                                                      │    │
│ │ Welcome to {{product_name}}!                        │    │
│ │                                                      │    │
│ │ We're excited to have you on board...              │    │
│ │                                                      │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ Variables: {{first_name}} {{product_name}} {{unsubscribe_url}}
│                                                             │
│ Delay after previous: [1] days [0] hours                   │
│                                                             │
│ Skip conditions:                                            │
│ ☐ Skip if user has upgraded                                │
│ ☐ Skip if user logged in recently                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [Cancel] [Save Draft] [Save & Activate]                     │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

```typescript
// Sequences
GET    /api/email/sequences              // List sequences
POST   /api/email/sequences              // Create sequence
GET    /api/email/sequences/:id          // Get sequence details
PUT    /api/email/sequences/:id          // Update sequence
DELETE /api/email/sequences/:id          // Delete sequence
POST   /api/email/sequences/:id/pause    // Pause sequence
POST   /api/email/sequences/:id/activate // Activate sequence

// Sequence Emails
GET    /api/email/sequences/:id/emails   // List emails in sequence
POST   /api/email/sequences/:id/emails   // Add email to sequence
PUT    /api/email/emails/:id             // Update email
DELETE /api/email/emails/:id             // Delete email
POST   /api/email/emails/:id/test        // Send test email

// Templates
GET    /api/email/templates              // List templates
POST   /api/email/templates              // Create template
PUT    /api/email/templates/:id          // Update template
DELETE /api/email/templates/:id          // Delete template

// Subscribers
GET    /api/email/subscribers            // List subscribers
GET    /api/email/subscribers/:userId    // Get subscriber status
POST   /api/email/subscribers/:userId/pause    // Pause all sequences
POST   /api/email/subscribers/:userId/resume   // Resume sequences

// Analytics
GET    /api/email/analytics              // Overall email stats
GET    /api/email/analytics/sequences/:id // Sequence performance
GET    /api/email/analytics/emails/:id    // Email performance

// Webhooks
POST   /api/email/webhook/product        // Product events
POST   /api/email/webhook/resend         // Resend events

// AI Generation
POST   /api/email/generate/email         // Generate single email
POST   /api/email/generate/sequence      // Generate sequence
```

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] D1 schema for sequences, emails, subscribers
- [ ] Email template system (Handlebars)
- [ ] Resend integration
- [ ] Basic send functionality

### Phase 2: Sequences
- [ ] Sequence management UI
- [ ] Trigger event handling
- [ ] Delay/timing logic
- [ ] Condition checking

### Phase 3: Automation
- [ ] Cron job for email queue
- [ ] Webhook handlers (product, payments)
- [ ] Time-based trigger detection
- [ ] Error handling/retries

### Phase 4: Tracking
- [ ] Resend webhook integration
- [ ] Open/click tracking
- [ ] Bounce/complaint handling
- [ ] Unsubscribe flow

### Phase 5: AI & Analytics
- [ ] Claude integration for content generation
- [ ] Sequence generation
- [ ] Performance dashboards
- [ ] A/B testing (future)
