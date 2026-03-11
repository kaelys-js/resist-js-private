import type {
  CollectorDefinition,
  CollectorContext,
  CollectorResult,
  Env,
  LocalContext,
} from './types.js';
import { isLocalContext } from './types.js';

type Runtime = 'local' | 'cloud';

interface DispatchOptions {
  env: Env;
  runtime: Runtime;
  now?: Date;
  exec?: LocalContext['exec'];
}

// Generate a unique run ID
function generateRunId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// Sleep helper for backoff
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Timeout wrapper
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout after ${ms}ms`));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// Main dispatcher
export async function dispatch<T>(
  collector: CollectorDefinition<T>,
  options: DispatchOptions
): Promise<CollectorResult<T>> {
  const { env, runtime, exec } = options;
  const now = options.now ?? new Date();
  const runId = generateRunId();
  const startedAt = now.toISOString();

  // Verify runtime compatibility
  if (collector.mode !== 'both' && collector.mode !== runtime) {
    const error = `Collector "${collector.id}" requires ${collector.mode} runtime, but running in ${runtime}`;
    console.error(`[${collector.id}] ${error}`);

    await recordRun(env.DB, {
      runId,
      collectorId: collector.id,
      runtime,
      startedAt,
      finishedAt: new Date().toISOString(),
      ok: false,
      error,
      attempts: 0,
    });

    return {
      updatedAt: startedAt,
      ok: false,
      data: null,
      error,
    };
  }

  // Build context
  const ctx: CollectorContext = {
    env,
    fetch: globalThis.fetch.bind(globalThis),
    db: env.DB,
    now,
    ...(runtime === 'local' && exec ? { exec } : {}),
  };

  // Verify exec is available for local-only collectors
  if (collector.mode === 'local' && !isLocalContext(ctx)) {
    const error = `Collector "${collector.id}" requires exec() but it's not available`;
    console.error(`[${collector.id}] ${error}`);

    await recordRun(env.DB, {
      runId,
      collectorId: collector.id,
      runtime,
      startedAt,
      finishedAt: new Date().toISOString(),
      ok: false,
      error,
      attempts: 0,
    });

    return {
      updatedAt: startedAt,
      ok: false,
      data: null,
      error,
    };
  }

  const { maxAttempts, timeoutMs, backoff } = collector.retry;
  let lastError: Error | null = null;
  let attempts = 0;

  // Retry loop
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attempts = attempt;

    try {
      console.log(`[${collector.id}] Attempt ${attempt}/${maxAttempts}`);

      const data = await withTimeout(collector.collect(ctx), timeoutMs);
      const finishedAt = new Date().toISOString();

      // Success - record run and data
      await recordRun(env.DB, {
        runId,
        collectorId: collector.id,
        runtime,
        startedAt,
        finishedAt,
        ok: true,
        error: null,
        attempts,
      });

      await recordData(env.DB, {
        collectorId: collector.id,
        collectedAt: finishedAt,
        payload: data,
        runId,
      });

      console.log(`[${collector.id}] Success after ${attempts} attempt(s)`);

      return {
        updatedAt: finishedAt,
        ok: true,
        data,
        error: null,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[${collector.id}] Attempt ${attempt} failed: ${lastError.message}`);

      // Backoff before retry (unless last attempt)
      if (attempt < maxAttempts) {
        const delay = backoff.baseMs * Math.pow(backoff.multiplier, attempt - 1);
        console.log(`[${collector.id}] Retrying in ${delay}ms`);
        await sleep(delay);
      }
    }
  }

  // All attempts failed
  const finishedAt = new Date().toISOString();
  const errorMessage = lastError?.message ?? 'Unknown error';

  await recordRun(env.DB, {
    runId,
    collectorId: collector.id,
    runtime,
    startedAt,
    finishedAt,
    ok: false,
    error: errorMessage,
    attempts,
  });

  console.error(`[${collector.id}] Failed after ${attempts} attempts: ${errorMessage}`);

  return {
    updatedAt: finishedAt,
    ok: false,
    data: null,
    error: errorMessage,
  };
}

// Record run to D1
interface RunRecord {
  runId: string;
  collectorId: string;
  runtime: Runtime;
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  error: string | null;
  attempts: number;
}

async function recordRun(db: D1Database, record: RunRecord): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO collector_runs (run_id, collector_id, runtime, started_at, finished_at, ok, error, attempts)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        record.runId,
        record.collectorId,
        record.runtime,
        record.startedAt,
        record.finishedAt,
        record.ok ? 1 : 0,
        record.error,
        record.attempts
      )
      .run();
  } catch (err) {
    console.error(`[${record.collectorId}] Failed to record run: ${err}`);
  }
}

// Record data to D1
interface DataRecord {
  collectorId: string;
  collectedAt: string;
  payload: unknown;
  runId: string;
}

async function recordData(db: D1Database, record: DataRecord): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO collector_data (collector_id, collected_at, payload, run_id)
         VALUES (?, ?, ?, ?)`
      )
      .bind(
        record.collectorId,
        record.collectedAt,
        JSON.stringify(record.payload),
        record.runId
      )
      .run();
  } catch (err) {
    console.error(`[${record.collectorId}] Failed to record data: ${err}`);
  }
}
