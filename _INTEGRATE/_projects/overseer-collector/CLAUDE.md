# Overseer

Unified collector system for Cloudflare Workers. Defines, schedules, executes, retries, logs, and persists collectors.

## Architecture

- **Cloudflare cron is the only scheduler** - in cloud and locally via wrangler
- **Collectors are pure execution units** - they don't schedule themselves, retry themselves, or swallow errors
- **Dispatcher handles orchestration** - retries, timeouts, backoff, logging, persistence
- **Same code runs in Cloudflare and locally** - unified worker codebase
- **Exec server** - HTTP bridge for shell commands (authenticated via shared secret)

```
┌─────────────────────────────────────────────────────────┐
│  Cloudflare Worker (deployed or wrangler dev)           │
│  - Cron triggers → Dispatcher → Collectors              │
│  - D1 persistence                                       │
│                                                         │
│  When collector needs exec():                           │
│    POST {EXEC_SERVER_URL}/exec                          │
│    Authorization: Bearer {EXEC_SECRET}                  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ (localhost or tunnel)
┌─────────────────────────────────────────────────────────┐
│  Exec Server (npm run exec)                             │
│  - Runs on your Mac                                     │
│  - Validates bearer token                               │
│  - Executes shell commands                              │
│  - Returns { stdout, stderr, exitCode }                 │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

- Cloudflare Workers (runtime)
- Cloudflare Cron Triggers (scheduling)
- D1 (persistence)
- Localflare (local dev dashboard)
- Exec Server (shell command bridge, bearer token auth)

## Project Structure

```
overseer/
├── src/
│   ├── index.ts        # Worker entry point (scheduled + fetch handlers)
│   ├── dispatcher.ts   # Execution dispatcher (retry, timeout, persistence)
│   ├── registry.ts     # Collector registry
│   ├── types.ts        # Type definitions
│   ├── exec.ts         # Exec client (HTTP calls to exec server)
│   └── exec-server.ts  # Exec server (runs locally, executes shell commands)
├── collectors/
│   └── [name].ts       # One file per collector
├── schema.sql          # D1 schema
├── wrangler.toml       # Worker + cron config
├── .dev.vars           # Local secrets (gitignored)
└── package.json
```

## Commands

```bash
npm run dev              # Start wrangler dev server
npm run exec             # Start exec server (for local collectors)
npm run studio           # Start Localflare dashboard
npm run deploy           # Deploy to Cloudflare
npm run db:migrate       # Apply schema locally
npm run db:migrate:prod  # Apply schema in production
npm run typecheck        # Type check
```

## Setup

### 1. Generate a shared secret

```bash
openssl rand -hex 32
```

### 2. Configure for local development

Create `.dev.vars`:
```
EXEC_SECRET=your-generated-secret
```

### 3. Configure for production (Cloudflare → your Mac)

On Cloudflare:
```bash
wrangler secret put EXEC_SECRET
# paste your secret

# In wrangler.toml, set:
# EXEC_SERVER_URL = "https://your-tunnel.example.com"
```

On your Mac:
```bash
# Start exec server with the same secret
EXEC_SECRET=your-generated-secret npm run exec

# Expose via Cloudflare Tunnel
cloudflared tunnel --url http://localhost:9898
```

## Running Locally

```bash
# Terminal 1: Start exec server (generates random secret if not set)
npm run exec
# Copy the generated EXEC_SECRET to .dev.vars

# Terminal 2: Start wrangler dev
npm run dev

# Trigger collector
curl -X POST http://localhost:8787/trigger/batteries
```

## Creating a Collector

1. Create `collectors/[name].ts`:

```typescript
import { register } from '../src/registry.js';
import type { CollectorDefinition } from '../src/types.js';
import { DEFAULT_RETRY_POLICY, isLocalContext } from '../src/types.js';

const myCollector: CollectorDefinition<MyDataType> = {
  id: 'my-collector',
  schedule: { type: 'cron', expression: '0 * * * *' }, // hourly
  mode: 'both', // 'local' | 'cloud' | 'both'
  retry: DEFAULT_RETRY_POLICY,
  async collect(ctx) {
    // ctx.env, ctx.fetch, ctx.db, ctx.now
    // ctx.exec available when exec server is running and authenticated
    if (isLocalContext(ctx)) {
      const result = await ctx.exec('some-command');
    }
    return { /* your data */ };
  },
};

register(myCollector);
```

2. Import in `src/index.ts`:

```typescript
import '../collectors/my-collector.js';
```

3. Add cron to `wrangler.toml`:

```toml
[triggers]
crons = ["0 * * * *"]
```

## Collector Modes

- `local` - Requires exec server running (has `exec()` for shell commands)
- `cloud` - Runs in Cloudflare Workers (no shell access)
- `both` - Runs in both (exec available when exec server is running)

## Environment Variables

| Variable | Description | Where |
|----------|-------------|-------|
| `EXEC_SECRET` | Shared secret for exec server auth | `.dev.vars` (local), `wrangler secret` (prod) |
| `EXEC_SERVER_URL` | Exec server URL (default: `http://127.0.0.1:9898`) | `wrangler.toml` |
| `RUNTIME` | `local` or `cloud` | `wrangler.toml` |

## HTTP Endpoints

- `GET /health` - Health check
- `GET /collectors` - List all collectors
- `GET /status/:id` - Last run + data for collector
- `POST /trigger/:id` - Manual trigger
- `GET /__scheduled?cron=...` - Simulate cron trigger

## D1 Schema

- `collector_runs` - Execution history (run_id, collector_id, runtime, started_at, finished_at, ok, error, attempts)
- `collector_data` - Collected data (collector_id, collected_at, payload, run_id)

## Key Invariants

1. Collectors never reschedule themselves
2. Collectors never decide when to run
3. Collectors never catch failures silently - they throw
4. All retry/timeout logic lives in dispatcher
5. Every result follows common schema: `{ updatedAt, ok, data, error, metadata? }`
6. Exec server requires bearer token auth - only your worker can call it
