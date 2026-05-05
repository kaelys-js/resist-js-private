# Multica Recurring Tasks

This directory contains **scheduled work definitions** that the Multica master autopilot reads daily to file new issues.

## How it works

A single autopilot in Multica fires every day at 8am Vancouver time. Its prompt instructs the agent to:

1. Read every `.md` file in this directory at HEAD of `main`
2. For each file, check if its `cron` expression was due in the last 24 hours (using the file's `tz` or `America/Vancouver` default)
3. If due, file a new Multica issue with:
   - Title = `name` from frontmatter
   - Body = the file's body content (the prompt the agent will receive)
   - Assignee = `agent` from frontmatter
   - Priority = `priority` from frontmatter (default: `medium`)
   - Labels = `labels` from frontmatter (default: `[autopilot]`)
4. Skip filing if an issue with the same title was filed in the last 7 days (deduplication)

This means **adding a new recurring task is a `git add file.md`**, not clicking around in Multica UI. Recurring tasks are versioned, reviewable in PRs, and shared via git.

## File format

```yaml
---
name: Weekly lint cleanup (most-affected package)
cron: "0 9 * * 1"
tz: America/Vancouver       # optional, defaults to America/Vancouver
agent: Sonnet 4.6
priority: medium             # optional: low | medium | high | urgent
labels: [autopilot, lint]   # optional, default: [autopilot]
---

<the actual prompt body the agent receives when the issue is filed>
```

### Field reference

| Field | Required | Format | Notes |
|---|---|---|---|
| `name` | yes | string | Becomes the issue title; used for 7-day dedup |
| `cron` | yes | 5-field cron | Standard format: minute hour day month weekday |
| `tz` | no | IANA tz | Defaults to `America/Vancouver` |
| `agent` | yes | string | Must match an existing Multica agent name (`Opus 4.7`, `Sonnet 4.6`) |
| `priority` | no | enum | `low` `medium` `high` `urgent` (default: `medium`) |
| `labels` | no | array | Always include `autopilot`; add domain labels like `lint`, `coverage` |

### Cron examples

| Expression | Meaning |
|---|---|
| `0 9 * * 1` | Mon 9am |
| `0 9 * * 1-5` | Weekdays 9am |
| `0 6 1 * *` | 1st of month, 6am |
| `0 */6 * * *` | Every 6 hours |
| `*/30 * * * *` | Every 30 min |

The Multica server checks for due autopilots every 30 seconds — actual fire time can lag up to 30s.

## Adding a new recurring task

1. Create a new `.md` file in this directory with the frontmatter above
2. Open a PR
3. Once merged to `main`, the master autopilot picks it up at the next 8am Vancouver fire
4. Verify by waiting one fire cycle, OR manually trigger the master autopilot from the Multica UI

## Removing a recurring task

`git rm` the file. The master autopilot won't see it on the next read, so no new issues will be filed. Existing in-flight issues continue to completion normally.

## Master autopilot configuration

The master autopilot in Multica UI has:

- **Name:** `Recurring task scheduler`
- **Agent:** Opus 4.7 (needs reasoning to interpret cron + dedup)
- **Mode:** `create_issue`
- **Cron:** `0 8 * * *`
- **Timezone:** `America/Vancouver`
- **Title template:** `Recurring task dispatch — {{date}}`

If you change the master autopilot's schedule, update this README to match.

## Why this design

**Compared to one-Multica-autopilot-per-recurring-task:**

| | This (file-driven) | One autopilot per task |
|---|---|---|
| Add new task | `git add file.md`, PR | Click around in Multica UI |
| Reviewable | Yes (PR diff) | No (UI history only) |
| Versioned | Yes | No |
| Sharable across machines | Yes (git clone) | No (Multica DB) |
| Modifiable in bulk | Yes (file edit) | No (UI only) |
| Dedup logic | In master autopilot prompt | Per-autopilot config |

**Compared to native cron + curl:**

| | This | Native cron |
|---|---|---|
| Goes through Multica issue board | Yes (audit trail, status, comments) | No |
| Uses Multica's task lifecycle | Yes | No |
| Auto-routes to the right agent | Yes (per file) | Manual scripting |
| Visible in inbox + notifications | Yes | No |

The trade-off is one extra layer of indirection (master autopilot → reads files → files issues), worth it for the integration.
