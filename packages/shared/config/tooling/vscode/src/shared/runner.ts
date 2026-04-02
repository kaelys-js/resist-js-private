/**
 * CLI Process Runner
 *
 * Spawns CLI tools as child processes, collects structured output, and
 * handles timeouts gracefully. Used by the linter module to run resist-lint.
 *
 * @module
 */

import { spawn } from 'node:child_process';
import * as path from 'node:path';
import type { RunOptions, RunResult } from './types';
import { en } from '../locale/en';
import { format } from '../locale/schema';
import { extractMessage } from './errors';

/** Raw process result from runTool. */
type ToolResult = {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number | null;
  readonly elapsed: number;
};

/**
 * Spawns a CLI tool and returns raw stdout/stderr/exitCode.
 *
 * This is the base function that `runToolJson` and `runToolText`
 * are built on.
 *
 * @param {RunOptions} options - Spawn configuration (command, args, cwd, env, timeout)
 * @returns {Promise<ToolResult>} Raw process result
 */
function runTool(options: RunOptions): Promise<ToolResult> {
  const timeoutMs: number = options.timeout ?? 30_000;
  const startTime: number = Date.now();

  const nodeModulesBin: string = path.join(options.cwd, 'node_modules', '.bin');
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...options.env,
    FORCE_COLOR: '0',
    PATH: `${nodeModulesBin}${path.delimiter}${process.env['PATH'] ?? ''}`,
  };

  const child = spawn(options.command, options.args as string[], {
    cwd: options.cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    env,
  });

  /* Write stdin content to the child process when provided (--stdin-filename mode) */
  if (options.stdin === undefined) {
    child.stdin.end();
  } else {
    child.stdin.write(options.stdin);
    child.stdin.end();
  }

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (data: Buffer) => {
    stdout += data.toString();
  });

  child.stderr.on('data', (data: Buffer) => {
    stderr += data.toString();
  });

  return new Promise((resolve) => {
    let settled = false;
    const settle = (result: ToolResult): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    const timer: NodeJS.Timeout = setTimeout(() => {
      child.kill();
      settle({ stdout, stderr, exitCode: null, elapsed: Date.now() - startTime });
    }, timeoutMs);

    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      settle({ stdout, stderr, exitCode: code, elapsed: Date.now() - startTime });
    });

    child.on('error', (error: Error) => {
      clearTimeout(timer);
      settle({
        stdout,
        stderr: format(en.runner.spawnFailed, { error: error.message }),
        exitCode: null,
        elapsed: Date.now() - startTime,
      });
    });
  });
}

/**
 * Spawns a CLI tool and returns the raw text output.
 *
 * @param {RunOptions} options - Spawn configuration
 * @returns {Promise<RunResult<string>>} Success with text data, or failure with error
 *
 * @example
 * ```typescript
 * const result = await runToolText({
 *   command: 'resist-lint',
 *   args: ['--format', 'text', 'src/app.ts'],
 *   cwd: workspaceRoot,
 *   timeout: 15_000,
 * });
 * if (result.ok) {
 *   log(channel, result.data);
 * }
 * ```
 */
export async function runToolText(options: RunOptions): Promise<RunResult<string>> {
  const result: ToolResult = await runTool(options);

  if (result.exitCode === null) {
    return { ok: false, error: result.stderr, stderr: result.stderr, code: null };
  }

  if (result.exitCode !== 0) {
    return {
      ok: false,
      error: result.stderr.trim() || format(en.runner.exitCode, { code: String(result.exitCode) }),
      stderr: result.stderr,
      code: result.exitCode,
    };
  }

  return { ok: true, data: result.stdout, stderr: result.stderr, elapsed: result.elapsed };
}

/**
 * Spawns a CLI tool and parses its JSON stdout output.
 *
 * Augments PATH with node_modules/.bin so locally-installed binaries resolve.
 * Disables color output via FORCE_COLOR=0. Kills the child on timeout.
 *
 * @param {RunOptions} options - Spawn configuration (command, args, cwd, env, timeout)
 * @returns {Promise<RunResult<T>>} Parsed JSON result or failure info
 *
 * @example
 * ```typescript
 * const result = await runToolJson<DiagnosticEntry[]>({
 *   command: 'resist-lint',
 *   args: ['--format', 'json', 'src/app.ts'],
 *   cwd: workspaceRoot,
 *   timeout: 30_000,
 * });
 * if (result.ok) {
 *   for (const entry of result.data) {
 *     const diagnostic = createDiagnosticFromEntry(entry, 'resist-linter');
 *   }
 * }
 * ```
 */
export function runToolJson<T>(options: RunOptions): Promise<RunResult<T>> {
  const timeoutMs: number = options.timeout ?? 30_000;
  const startTime: number = Date.now();

  const nodeModulesBin: string = path.join(options.cwd, 'node_modules', '.bin');
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...options.env,
    FORCE_COLOR: '0',
    PATH: `${nodeModulesBin}${path.delimiter}${process.env['PATH'] ?? ''}`,
  };

  const child = spawn(options.command, options.args as string[], {
    cwd: options.cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    env,
  });

  /* Write stdin content to the child process when provided (--stdin-filename mode) */
  if (options.stdin === undefined) {
    child.stdin.end();
  } else {
    child.stdin.write(options.stdin);
    child.stdin.end();
  }

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (data: Buffer) => {
    stdout += data.toString();
  });

  child.stderr.on('data', (data: Buffer) => {
    stderr += data.toString();
  });

  return new Promise((resolve) => {
    let settled = false;
    const settle = (result: RunResult<T>): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    const timer: NodeJS.Timeout = setTimeout(() => {
      child.kill();
      settle({
        ok: false,
        error: format(en.runner.timeout, { ms: timeoutMs }),
        stderr,
        code: null,
      });
    }, timeoutMs);

    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      const elapsed: number = Date.now() - startTime;

      if (stdout.trim()) {
        try {
          const data = JSON.parse(stdout) as T;
          settle({ ok: true, data, stderr, elapsed });
        } catch (parseError: unknown) {
          const parseMsg: string = extractMessage(parseError);
          settle({
            ok: false,
            error: format(en.runner.jsonParseFailed, {
              error: parseMsg,
              preview: stdout.slice(0, 200),
            }),
            stderr,
            code,
          });
        }
      } else if (code === 0) {
        // No stdout with exit 0 means zero diagnostics found
        settle({ ok: true, data: [] as unknown as T, stderr, elapsed });
      } else {
        settle({
          ok: false,
          error: stderr.trim() || format(en.runner.exitCode, { code: String(code) }),
          stderr,
          code,
        });
      }
    });

    child.on('error', (error: Error) => {
      clearTimeout(timer);
      settle({
        ok: false,
        error: format(en.runner.spawnFailed, { error: error.message }),
        stderr,
        code: null,
      });
    });
  });
}
