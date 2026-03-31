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
        error: `Timed out after ${timeoutMs}ms`,
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
          const parseMsg: string = parseErr instanceof Error ? parseErr.message : String(parseErr);
          resolve({
            ok: false,
            error: `Failed to parse JSON output (${parseMsg}): ${stdout.slice(0, 200)}`,
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
            error: stderr.trim() || `Process exited with code ${code}`,
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
        error: `Failed to spawn: ${err.message}`,
        stderr,
        code: null,
      });
    });
  });
}
