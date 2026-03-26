// Runtime mode for collectors
export type RuntimeMode = 'local' | 'cloud' | 'both';

// Retry policy configuration
export interface RetryPolicy {
  maxAttempts: number;
  timeoutMs: number;
  backoff: {
    baseMs: number;
    multiplier: number;
  };
}

// Base runtime context (available in both environments)
export interface BaseContext {
  env: Env;
  fetch: typeof fetch;
  db: D1Database;
  now: Date;
}

// Local-only context (has exec binding)
export interface LocalContext extends BaseContext {
  exec: (command: string) => Promise<ExecResult>;
}

// Cloud context (no exec)
export type CloudContext = BaseContext;

// Union type for collector context
export type CollectorContext = LocalContext | CloudContext;

// Result of exec() in local runtime
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// Common result schema for all collectors
export interface CollectorResult<T = unknown> {
  updatedAt: string;
  ok: boolean;
  data: T | null;
  error: string | null;
  metadata?: Record<string, unknown>;
}

// Schedule configuration
export type Schedule =
  | { type: 'cron'; expression: string }
  | { type: 'interval'; minutes: number };

// Collector definition
export interface CollectorDefinition<T = unknown> {
  id: string;
  schedule: Schedule;
  mode: RuntimeMode;
  retry: RetryPolicy;
  collect: (ctx: CollectorContext) => Promise<T>;
}

// Env bindings
export interface Env {
  DB: D1Database;
  RUNTIME?: string;
  EXEC_SERVER_URL?: string;
  EXEC_SECRET?: string;
  [key: string]: unknown;
}

// Runtime detection
export function isLocalContext(ctx: CollectorContext): ctx is LocalContext {
  return 'exec' in ctx && typeof ctx.exec === 'function';
}

// Default retry policy
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  timeoutMs: 30000,
  backoff: {
    baseMs: 1000,
    multiplier: 2,
  },
};
