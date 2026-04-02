/**
 * CLI Process Runner
 *
 * Spawns CLI tools as child processes, collects structured output, and
 * handles timeouts gracefully. Used by the linter module to run resist-lint.
 *
 * @module
 */

import { spawn } from 'child_process';
import * as path from 'path';
import type { RunOptions, RunResult } from './types';
import { en } from '../locale/en';
import { format } from '../locale/schema';
import { extractMessage } from './errors';

/** Raw process result from runTool. */
interface ToolResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number | null;
  readonly elapsed: number;
}

/**
 * Spawns a CLI tool and returns raw stdout/stderr/exitCode.
 *
 * This is the base function that `runToolJson` and `runToolText`
 * are built on.
 *
 * @param options - Spawn configuration (command, args, cwd, env, timeout)
 * @returns Raw process result
 */
function runTool(options: RunOptions): Promise<ToolResult> {
  return new Promise((resolve) => {
    const timeoutMs: number = options.timeout ?? 30000;
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

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    const timer: NodeJS.Timeout = setTimeout(() => {
      child.kill();
      resolve({
        stdout,
        stderr,
        exitCode: null,
        elapsed: Date.now() - startTime,
      });
    }, timeoutMs);

    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode: code,
        elapsed: Date.now() - startTime,
      });
    });

    child.on('error', (err: Error) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr: format(en.runner.spawnFailed, { error: err.message }),
        exitCode: null,
        elapsed: Date.now() - startTime,
      });
    });
  });
}

/**
 * Spawns a CLI tool and returns the raw text output.
 *
 * @param options - Spawn configuration
 * @returns Success with text data, or failure with error
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
 * @param options - Spawn configuration (command, args, cwd, env, timeout)
 * @returns Parsed JSON result or failure info
 */
export function runToolJson<T>(options: RunOptions): Promise<RunResult<T>> {
  return new Promise((resolve) => {
    const timeoutMs: number = options.timeout ?? 30000;
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

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    const timer: NodeJS.Timeout = setTimeout(() => {
      child.kill();
      resolve({
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
          resolve({ ok: true, data, stderr, elapsed });
        } catch (parseErr: unknown) {
          const parseMsg: string = extractMessage(parseErr);
          resolve({
            ok: false,
            error: format(en.runner.jsonParseFailed, {
              error: parseMsg,
              preview: stdout.slice(0, 200),
            }),
            stderr,
            code,
          });
        }
      } else {
        // No stdout — could be an error or just no results.
        // When the CLI exits 0 with empty stdout, it means zero diagnostics
        // were found. We return an empty array as the typed result.
        if (code === 0) {
          resolve({ ok: true, data: [] as unknown as T, stderr, elapsed });
        } else {
          resolve({
            ok: false,
            error: stderr.trim() || format(en.runner.exitCode, { code: String(code) }),
            stderr,
            code,
          });
        }
      }
    });

    child.on('error', (err: Error) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        error: format(en.runner.spawnFailed, { error: err.message }),
        stderr,
        code: null,
      });
    });
  });
}
