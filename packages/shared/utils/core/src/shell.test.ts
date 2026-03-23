/**
 * Tests for shell utilities.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { Bool, Command, Str, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import type { ChildProcess } from 'node:child_process';
import {
  runCommand,
  execSyncSafe,
  execSyncBool,
  commandExists,
  ensureCommand,
  ensureCommandOrFail,
  spawnProcess,
} from './shell';

// ── runCommand ──────────────────────────────────────────────────────────

describe('runCommand', () => {
  it('runs echo command and returns output', () => {
    const result: Result<Str> = runCommand('echo hello' as Command, 'pipe');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.trim()).toBe('hello');
  });

  it('returns IO.EXEC_FAILED for invalid command', () => {
    const result: Result<Str> = runCommand('__nonexistent_cmd_xyz_12345__' as Command, 'pipe');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IO.EXEC_FAILED');
  });
});

// ── execSyncSafe ────────────────────────────────────────────────────────

describe('execSyncSafe', () => {
  it('runs command and returns trimmed output', () => {
    const result: Result<Str> = execSyncSafe('echo hello' as Command);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('hello');
  });

  it('returns error for failing command', () => {
    const result: Result<Str> = execSyncSafe('false' as Command);
    expect(result.ok).toBe(false);
  });
});

// ── execSyncBool ────────────────────────────────────────────────────────

describe('execSyncBool', () => {
  it('returns true for successful command', () => {
    const result: Result<Bool> = execSyncBool('true' as Command);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(true);
  });

  it('returns false for failing command', () => {
    const result: Result<Bool> = execSyncBool('false' as Command);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(false);
  });
});

// ── commandExists ───────────────────────────────────────────────────────

describe('commandExists', () => {
  it('returns true for node', () => {
    const result: Result<Bool> = commandExists('node' as Command);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(true);
  });

  it('returns false for nonexistent command', () => {
    const result: Result<Bool> = commandExists('__nonexistent_cmd_xyz_12345__' as Command);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(false);
  });
});

// ── ensureCommand ───────────────────────────────────────────────────────

describe('ensureCommand', () => {
  it('returns available for existing command', () => {
    const result = ensureCommand('node' as Command, 'brew install node' as Command);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe('available');
  });

  it('returns not_found for missing command', () => {
    const result = ensureCommand(
      '__nonexistent_cmd_xyz_12345__' as Command,
      'install it' as Command,
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.data.status === 'not_found') {
      expect(result.data.command).toBe('__nonexistent_cmd_xyz_12345__');
    }
  });
});

// ── ensureCommandOrFail ─────────────────────────────────────────────────

describe('ensureCommandOrFail', () => {
  it('returns ok for existing command', () => {
    const result: Result<Void> = ensureCommandOrFail('node' as Command, 'brew install node' as Command);
    expect(result.ok).toBe(true);
  });

  it('returns error for missing command', () => {
    const result: Result<Void> = ensureCommandOrFail(
      '__nonexistent_cmd_xyz_12345__' as Command,
      'install it' as Command,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toContain('CONFIG');
  });
});

// ── spawnProcess ────────────────────────────────────────────────────────

describe('spawnProcess', () => {
  it('spawns process with pipe stdio when inherit is false', () => {
    const result: Result<ChildProcess> = spawnProcess('echo' as Command, ['test'], { inherit: false });
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Kill the spawned process to avoid hanging
      result.data.kill();
    }
  });
});
