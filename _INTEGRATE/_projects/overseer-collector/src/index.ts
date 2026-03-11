import type { Env, LocalContext } from './types.js';
import { dispatch } from './dispatcher.js';
import { getCollector, getCollectorsByCron, getAllCollectors, getCollectorIds } from './registry.js';
import { createExecClient } from './exec.js';

// Import collectors - add new collector imports here
import '../collectors/example.js';
import '../collectors/batteries.js';
import '../collectors/changelogs.js';
import '../collectors/skating.js';
import '../collectors/swimming.js';
import '../collectors/cloudflare-blog.js';
import '../collectors/weather.js';
import '../collectors/radarr.js';
import '../collectors/sonarr.js';
import '../collectors/apple-calendar.js';
import '../collectors/apple-reminders.js';
import '../collectors/plex.js';
import '../collectors/trailers.js';
import '../collectors/concerts.js';
import '../collectors/air-quality.js';
import '../collectors/birthdays.js';
import '../collectors/lottery.js';
import '../collectors/contacts.js';

// Cached exec function (per env, since secrets may differ)
let cachedExec: LocalContext['exec'] | null | undefined = undefined;
let cachedEnvHash: string | undefined = undefined;

// Detect runtime from env.RUNTIME variable
function detectRuntime(env: Env): 'local' | 'cloud' {
  const runtime = env.RUNTIME;
  if (runtime === 'local') return 'local';
  return 'cloud';
}

// Simple hash of env vars that affect exec
function getEnvHash(env: Env): string {
  return `${env.EXEC_SERVER_URL ?? ''}-${env.EXEC_SECRET ?? ''}`;
}

// Get exec function (checks for exec server availability)
async function getExec(env: Env): Promise<LocalContext['exec'] | undefined> {
  const envHash = getEnvHash(env);

  // Re-check if env changed or not yet initialized
  if (cachedExec === undefined || cachedEnvHash !== envHash) {
    cachedEnvHash = envHash;
    cachedExec = (await createExecClient(env)) ?? null;
  }
  return cachedExec ?? undefined;
}

export default {
  // Cron trigger handler
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const cron = controller.cron;
    const runtime = detectRuntime(env);
    const exec = await getExec(env);

    console.log(`[overseer] Scheduled trigger: ${cron} (runtime: ${runtime})`);

    // Find collectors matching this cron
    const collectors = getCollectorsByCron(cron);

    if (collectors.length === 0) {
      console.warn(`[overseer] No collectors registered for cron: ${cron}`);
      return;
    }

    // Execute all matching collectors
    const results = await Promise.allSettled(
      collectors.map((collector) =>
        dispatch(collector, { env, runtime, exec })
      )
    );

    // Log summary
    const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length;
    const failed = results.length - succeeded;
    console.log(`[overseer] Completed: ${succeeded} succeeded, ${failed} failed`);
  },

  // HTTP handler for manual triggers and status
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const runtime = detectRuntime(env);
    const exec = await getExec(env);

    // Manual trigger: POST /trigger/:collectorId
    if (request.method === 'POST' && url.pathname.startsWith('/trigger/')) {
      const collectorId = url.pathname.slice('/trigger/'.length);
      const collector = getCollector(collectorId);

      if (!collector) {
        return Response.json(
          { error: `Collector not found: ${collectorId}` },
          { status: 404 }
        );
      }

      const result = await dispatch(collector, { env, runtime, exec });
      return Response.json(result);
    }

    // List collectors: GET /collectors
    if (request.method === 'GET' && url.pathname === '/collectors') {
      const collectors = getAllCollectors().map((c) => ({
        id: c.id,
        schedule: c.schedule,
        mode: c.mode,
        retry: c.retry,
      }));
      return Response.json({ collectors });
    }

    // Status: GET /status/:collectorId
    if (request.method === 'GET' && url.pathname.startsWith('/status/')) {
      const collectorId = url.pathname.slice('/status/'.length);
      const collector = getCollector(collectorId);

      if (!collector) {
        return Response.json(
          { error: `Collector not found: ${collectorId}` },
          { status: 404 }
        );
      }

      // Get last run from D1
      const lastRun = await env.DB.prepare(
        `SELECT * FROM collector_runs WHERE collector_id = ? ORDER BY started_at DESC LIMIT 1`
      )
        .bind(collectorId)
        .first();

      // Get last successful data
      const lastData = await env.DB.prepare(
        `SELECT * FROM collector_data WHERE collector_id = ? ORDER BY collected_at DESC LIMIT 1`
      )
        .bind(collectorId)
        .first();

      return Response.json({
        collector: {
          id: collector.id,
          schedule: collector.schedule,
          mode: collector.mode,
        },
        lastRun: lastRun ?? null,
        lastData: lastData
          ? {
              ...lastData,
              payload: JSON.parse(lastData.payload as string),
            }
          : null,
      });
    }

    // Health check: GET /health
    if (request.method === 'GET' && url.pathname === '/health') {
      return Response.json({
        ok: true,
        runtime,
        collectors: getCollectorIds(),
      });
    }

    // Scheduled trigger simulation: GET /__scheduled?cron=...
    // For local testing with wrangler
    if (url.pathname === '/__scheduled') {
      const cron = url.searchParams.get('cron') ?? '* * * * *';

      // Simulate scheduled event
      await this.scheduled(
        { cron, scheduledTime: Date.now() } as ScheduledController,
        env,
        ctx
      );

      return Response.json({ triggered: cron });
    }

    return Response.json(
      {
        error: 'Not found',
        endpoints: [
          'GET /health',
          'GET /collectors',
          'GET /status/:collectorId',
          'POST /trigger/:collectorId',
          'GET /__scheduled?cron=...',
        ],
      },
      { status: 404 }
    );
  },
};
