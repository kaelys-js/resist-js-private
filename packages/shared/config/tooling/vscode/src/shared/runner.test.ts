/**
 * Tests for CLI Process Runner
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-55.md TASK 11
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventEmitter } from 'node:events';
import { runToolJson } from './runner';

// Mock child_process.spawn using EventEmitter-based streams
vi.mock('node:child_process', async () => {
  const { EventEmitter: EE } = await import('node:events');

  function createMockChild(): EventEmitter & {
    stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: ReturnType<typeof vi.fn>;
  } {
    const child = new EE() as EventEmitter & {
      stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof vi.fn>;
    };
    child.stdin = { write: vi.fn(), end: vi.fn() };
    child.stdout = new EE();
    child.stderr = new EE();
    child.kill = vi.fn();
    return child;
  }

  return {
    spawn: vi.fn(() => createMockChild()),
  };
});

// Import after mock setup
const { spawn } = await import('node:child_process');

type MockChild = EventEmitter & {
  stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: ReturnType<typeof vi.fn>;
};

function getLastChild(): MockChild {
  const { results } = (spawn as unknown as ReturnType<typeof vi.fn>).mock;

  return results.at(-1)!.value as MockChild;
}

/**
 * Emit stdout data then close the process.
 *
 * @param child - The mock child process
 * @param data - The stdout data to emit
 * @param exitCode - The exit code to emit on close
 */
function emitStdout(child: MockChild, data: string, exitCode: number): void {
  child.stdout.emit('data', Buffer.from(data));
  child.emit('close', exitCode);
}

/**
 * Emit stderr data then close the process.
 *
 * @param child - The mock child process
 * @param data - The stderr data to emit
 * @param exitCode - The exit code to emit on close
 */
function emitStderr(child: MockChild, data: string, exitCode: number): void {
  child.stderr.emit('data', Buffer.from(data));
  child.emit('close', exitCode);
}

describe('runToolJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses valid JSON output on success', async () => {
    const promise = runToolJson<{ count: number }>({
      command: 'test-tool',
      args: ['--json'],
      cwd: '/tmp',
    });

    const child = getLastChild();
    emitStdout(child, JSON.stringify({ count: 42 }), 0);

    const result = await promise;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ count: 42 });
      expect(result.elapsed).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns failure on malformed JSON', async () => {
    const promise = runToolJson<unknown>({
      command: 'test-tool',
      args: [],
      cwd: '/tmp',
    });

    const child = getLastChild();
    emitStdout(child, 'not json {{{}}}', 0);

    const result = await promise;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Failed to parse JSON output');
      expect(result.error).toContain('not json');
    }
  });

  it('returns failure with stderr on non-zero exit', async () => {
    const promise = runToolJson<unknown>({
      command: 'test-tool',
      args: [],
      cwd: '/tmp',
    });

    const child = getLastChild();
    emitStderr(child, 'something went wrong', 1);

    const result = await promise;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('something went wrong');
      expect(result.code).toBe(1);
    }
  });

  it('returns empty array on code 0 with empty stdout', async () => {
    const promise = runToolJson<string[]>({
      command: 'test-tool',
      args: [],
      cwd: '/tmp',
    });

    const child = getLastChild();
    child.emit('close', 0);

    const result = await promise;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });

  it('returns failure on spawn error', async () => {
    const promise = runToolJson<unknown>({
      command: 'nonexistent-tool',
      args: [],
      cwd: '/tmp',
    });

    const child = getLastChild();
    child.emit('error', new Error('ENOENT'));

    const result = await promise;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Failed to spawn');
      expect(result.error).toContain('ENOENT');
    }
  });

  it('augments PATH with node_modules/.bin', () => {
    runToolJson<unknown>({
      command: 'test-tool',
      args: ['--flag'],
      cwd: '/my/project',
    });

    const spawnCall = (spawn as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const env = spawnCall[2].env as Record<string, string>;
    expect(env['PATH']).toContain('/my/project/node_modules/.bin');
  });

  it('sets FORCE_COLOR=0', () => {
    runToolJson<unknown>({
      command: 'test-tool',
      args: [],
      cwd: '/tmp',
    });

    const spawnCall = (spawn as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const env = spawnCall[2].env as Record<string, string>;
    expect(env['FORCE_COLOR']).toBe('0');
  });

  it('includes parse error message in failure', async () => {
    const promise = runToolJson<unknown>({
      command: 'test-tool',
      args: [],
      cwd: '/tmp',
    });

    const child = getLastChild();
    emitStdout(child, '{invalid json', 0);

    const result = await promise;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Should include the SyntaxError message from JSON.parse
      expect(result.error).toMatch(/Failed to parse JSON output \(/);
    }
  });

  it('writes stdin content to child process when provided', async () => {
    const stdinContent = 'export const x: number = 42;';
    const promise = runToolJson<string[]>({
      command: 'test-tool',
      args: ['--stdin-filename=/src/foo.ts'],
      cwd: '/tmp',
      stdin: stdinContent,
    });

    const child = getLastChild();
    expect(child.stdin.write).toHaveBeenCalledWith(stdinContent);
    expect(child.stdin.end).toHaveBeenCalled();

    emitStdout(child, '[]', 0);
    const result = await promise;
    expect(result.ok).toBe(true);
  });

  it('closes stdin without writing when no stdin option provided', async () => {
    const promise = runToolJson<string[]>({
      command: 'test-tool',
      args: [],
      cwd: '/tmp',
    });

    const child = getLastChild();
    expect(child.stdin.write).not.toHaveBeenCalled();
    expect(child.stdin.end).toHaveBeenCalled();

    emitStdout(child, '[]', 0);
    const result = await promise;
    expect(result.ok).toBe(true);
  });

  it('writes stdin and parses JSON response correctly', async () => {
    const stdinContent = '/** @param x */ export function f(x: number) {}';
    const diagnostics = [{ file: '/src/foo.ts', line: 1, message: 'error' }];

    const promise = runToolJson<typeof diagnostics>({
      command: 'resist-lint',
      args: ['--format=json', '--stdin-filename=/src/foo.ts'],
      cwd: '/tmp',
      stdin: stdinContent,
    });

    const child = getLastChild();
    expect(child.stdin.write).toHaveBeenCalledWith(stdinContent);
    emitStdout(child, JSON.stringify(diagnostics), 0);

    const result = await promise;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(diagnostics);
    }
  });

  it('handles empty stdin content', async () => {
    const promise = runToolJson<string[]>({
      command: 'test-tool',
      args: [],
      cwd: '/tmp',
      stdin: '',
    });

    const child = getLastChild();
    expect(child.stdin.write).toHaveBeenCalledWith('');
    expect(child.stdin.end).toHaveBeenCalled();

    child.emit('close', 0);
    const result = await promise;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });
});
