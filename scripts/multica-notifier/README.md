# Multica Notifier

Bridges Multica's in-app inbox + local daemon log to **ntfy.sh push** and **macOS native notifications**, so you get pinged when:

- Issues are assigned to you
- You're `@`-mentioned in a comment
- Status / priority / due-date changes on issues you're subscribed to
- Comments are added to issues you're subscribed to
- Reactions land on your issues or comments
- An agent task **fails** on an issue you assigned
- (From local daemon log) Tasks complete / fail / time out
- (From local daemon log) Daemon or runtimes go online / offline

## Architecture

```
                  ┌─────────────────────┐
                  │  notifier.sh (loop) │
                  │  every 15s:         │
                  │   1. GET /api/inbox │──→ ntfy.sh push  ──→ phone
                  │   2. tail daemon.log│
                  └──────┬──────────────┘──→ osascript     ──→ macOS notif center
                         │
                         └── state in ~/.multica/notifier-state.json
                                (last_inbox_id, last_log_offset)
```

## Setup

### 1. Pick an ntfy topic name

Already done if you're seeing this in the repo: the `.env` here uses an auto-generated unguessable suffix. The topic IS the access control on ntfy.sh — keep it private.

If you ever need to rotate it: pick a fresh 16-char random suffix and update `NTFY_TOPIC` in `.env`. Re-subscribe on your phone.

### 2. Generate a Multica API token

Multica → **Settings → API Tokens → New token** (name it `notifier`). Copy the token. Update `MULTICA_API_TOKEN` in `.env`.

Tokens default to 90-day expiry — set a calendar reminder to rotate.

### 3. Install the iOS app

[ntfy on App Store](https://apps.apple.com/app/ntfy/id1625396347). On first launch, tap **Subscribe to topic** and paste your `NTFY_TOPIC` value. (Android: [Play Store](https://play.google.com/store/apps/details?id=io.heckel.ntfy).)

### 4. Load the launchd agent

```bash
cp scripts/multica-notifier/com.user.multica-notifier.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.user.multica-notifier.plist
launchctl enable gui/$(id -u)/com.user.multica-notifier
```

Verify it's running:

```bash
launchctl print gui/$(id -u)/com.user.multica-notifier | grep -E '(state|last exit code)'
```

### 5. Smoke test

In Multica, assign yourself a test issue. Within ~15s you should see:
- A push notification on your phone (ntfy)
- A macOS Notification Center entry on your Mac

If neither fires, check logs:

```bash
tail -50 ~/Library/Logs/multica-notifier.log
```

## Daily use

The notifier runs in the background indefinitely. You don't interact with it.

To check status:

```bash
launchctl list | grep multica-notifier
```

To stop temporarily:

```bash
launchctl bootout gui/$(id -u)/com.user.multica-notifier
```

To start again:

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.user.multica-notifier.plist
```

To uninstall completely:

```bash
launchctl bootout gui/$(id -u)/com.user.multica-notifier
rm ~/Library/LaunchAgents/com.user.multica-notifier.plist
```

## Configuration

Edit `scripts/multica-notifier/.env`. Changes take effect the next time the daemon polls (or restart it).

| Variable | Default | Purpose |
|---|---|---|
| `MULTICA_API_TOKEN` | (required) | From Settings → API Tokens |
| `NTFY_TOPIC` | (required for ntfy) | Your unguessable topic name |
| `NTFY_BASE` | `https://ntfy.sh` | Set to your self-hosted ntfy instance for full privacy |
| `MACOS_NOTIFY` | `true` | Set to `false` to disable macOS notif center pushes |
| `MULTICA_API_BASE` | `http://localhost:8080` | Multica backend |
| `MULTICA_WORKSPACE_SLUG` | `resist-js` | For deep-link click URLs |
| `MULTICA_APP_BASE` | `http://localhost:3000` | Multica web UI |
| `POLL_INTERVAL` | `15` | Seconds between inbox polls |
| `DAEMON_LOG` | `~/.multica/daemon.log` | Path to local daemon log |

## Security

- **The ntfy topic name is the only access control.** Anyone who knows it can read your notifications. The auto-generated 16-char suffix is unguessable in practice; don't share or paste it publicly.
- **Don't put secrets in notification bodies.** Issue titles + statuses are fine. If your issues contain sensitive content, run a self-hosted ntfy instance instead of `https://ntfy.sh`.
- **The Multica API token has full workspace access.** Keep `.env` out of git (it's already gitignored). Rotate every 90 days at minimum.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| No notifications at all | Check `~/Library/Logs/multica-notifier.log` for errors |
| Notifications duplicated | Delete `~/.multica/notifier-state.json` and restart |
| ntfy works but macOS doesn't | Settings → Notifications → Script Editor: allow notifications |
| macOS works but ntfy doesn't | Wrong `NTFY_TOPIC`, or topic banned on public ntfy.sh |
| Daemon dies repeatedly | `KeepAlive.Crashed=true` plus `ThrottleInterval=30` means launchd will restart 30s after each crash; check the log |
| All notifications fire historically on first run | First run has no `last_inbox_id` — it'll dispatch every recent inbox item once, then settle |

## What's NOT covered

The notifier polls Multica's inbox API. If a notification kind doesn't land in the inbox (per Multica's design), the notifier won't see it. Per [Multica inbox docs](https://github.com/multica-ai/multica/blob/main/apps/docs/content/docs/inbox.mdx) the inbox covers:

- Issue assigned/unassigned/reassigned
- Status/priority/due-date changes on subscribed issues
- New comments on subscribed issues
- @-mentions
- Reactions to your issues/comments
- Agent task failures on issues you assigned

Things NOT in the inbox (so notifier won't push):
- Agent task **completion** (we cover this via daemon-log tail instead)
- Autopilot trigger fires (Multica autopilots don't notify on success)
- Workspace setting changes
