/**
 * Tests for shell utilities.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { Bool, Command, Str, StrArray, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import type { ChildProcess } from 'node:child_process';
import {
  commandExists,
  ensureCommand,
  ensureCommandOrFail,
  ensureMise,
  execSyncBool,
  execSyncSafe,
  runCommand,
  spawnProcess,
} from './shell';

/*
 * Note: runPmCommand/getPmTool/getPmExec are intentionally untested here —
 * shell.ts's `_loadConfig()` uses `require('@/config/loader')` to defer
 * loading the config (to avoid a circular import). In vitest's ESM sandbox
 * the `require` call cannot resolve the `@/` path alias, and vi.mock does
 * not intercept `require()` — only `import`. Testing those functions
 * requires either a production change (`import()`-based deferred load) or
 * a test-runtime register for `@/` aliases in CJS require, both of which
 * are out of scope for test-only coverage work.
 */

// ── runCommand ──────────────────────────────────────────────────────────

describe('runCommand', () => {
  it('runs echo command and returns output', () => {
    const result: Result<Str> = runCommand('echo hello' as Command, 'pipe');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.trim()).toBe('hello');
    }
  });

  it('returns IO.EXEC_FAILED for invalid command', () => {
    const result: Result<Str> = runCommand('__nonexistent_cmd_xyz_12345__' as Command, 'pipe');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('IO.EXEC_FAILED');
    }
  });

  it('returns validation error for empty command', () => {
    const result: Result<Str> = runCommand('' as Command, 'pipe');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns validation error for invalid stdio', () => {
    const result: Result<Str> = runCommand('echo x' as Command, 'bogus-stdio' as unknown as 'pipe');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('accepts env overrides and passes them through', () => {
    const result: Result<Str> = runCommand(
      'node -e "process.stdout.write(process.env.SHELL_TEST_VAR ?? \'missing\')"' as Command,
      'pipe',
      { SHELL_TEST_VAR: 'present' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.trim()).toBe('present');
    }
  });
});

// ── execSyncSafe ────────────────────────────────────────────────────────

describe('execSyncSafe', () => {
  it('runs command and returns trimmed output', () => {
    const result: Result<Str> = execSyncSafe('echo hello' as Command);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('hello');
    }
  });

  it('returns IO.EXEC_FAILED for failing command', () => {
    const result: Result<Str> = execSyncSafe('false' as Command);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('IO.EXEC_FAILED');
    }
  });

  it('returns validation error for empty command', () => {
    const result: Result<Str> = execSyncSafe('' as Command);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('trims leading and trailing whitespace from output', () => {
    const result: Result<Str> = execSyncSafe('echo    spaces   ' as Command);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('spaces');
    }
  });
});

// ── execSyncBool ────────────────────────────────────────────────────────

describe('execSyncBool', () => {
  it('returns true for successful command', () => {
    const result: Result<Bool> = execSyncBool('true' as Command);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
  });

  it('returns false for failing command', () => {
    const result: Result<Bool> = execSyncBool('false' as Command);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(false);
    }
  });

  it('returns validation error for empty command', () => {
    const result: Result<Bool> = execSyncBool('' as Command);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns false for nonexistent binary', () => {
    const result: Result<Bool> = execSyncBool('__nonexistent_cmd_xyz_12345__' as Command);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(false);
    }
  });
});

// ── commandExists ───────────────────────────────────────────────────────

describe('commandExists', () => {
  it('returns true for node', () => {
    const result: Result<Bool> = commandExists('node' as Command);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
  });

  it('returns false for nonexistent command', () => {
    const result: Result<Bool> = commandExists('__nonexistent_cmd_xyz_12345__' as Command);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(false);
    }
  });

  it('returns validation error for empty command name', () => {
    const result: Result<Bool> = commandExists('' as Command);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });
});

// ── ensureCommand ───────────────────────────────────────────────────────

describe('ensureCommand', () => {
  it('returns available for existing command', () => {
    const result = ensureCommand('node' as Command, 'brew install node' as Command);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe('available');
    }
  });

  it('returns not_found for missing command', () => {
    const result = ensureCommand(
      '__nonexistent_cmd_xyz_12345__' as Command,
      'install it' as Command,
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.data.status === 'not_found') {
      expect(result.data.command).toBe('__nonexistent_cmd_xyz_12345__');
      expect(result.data.installHint).toBe('install it');
    }
  });

  it('returns validation error for empty cmd', () => {
    const result = ensureCommand('' as Command, 'hint' as Command);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns validation error for empty installHint', () => {
    const result = ensureCommand('node' as Command, '' as Command);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });
});

// ── ensureCommandOrFail ─────────────────────────────────────────────────

describe('ensureCommandOrFail', () => {
  it('returns ok for existing command', () => {
    const result: Result<Void> = ensureCommandOrFail(
      'node' as Command,
      'brew install node' as Command,
    );
    expect(result.ok).toBe(true);
  });

  it('returns CONFIG.NOT_FOUND error for missing command', () => {
    const result: Result<Void> = ensureCommandOrFail(
      '__nonexistent_cmd_xyz_12345__' as Command,
      'install it' as Command,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFIG.NOT_FOUND');
      expect(result.error.meta?.command).toBe('__nonexistent_cmd_xyz_12345__');
      expect(result.error.meta?.installHint).toBe('install it');
    }
  });

  it('propagates validation error on empty cmd', () => {
    const result: Result<Void> = ensureCommandOrFail('' as Command, 'hint' as Command);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('propagates validation error on empty installHint', () => {
    const result: Result<Void> = ensureCommandOrFail('node' as Command, '' as Command);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });
});

// ── spawnProcess ────────────────────────────────────────────────────────

describe('spawnProcess', () => {
  it('spawns process with pipe stdio when inherit is false', () => {
    const result: Result<ChildProcess> = spawnProcess('echo' as Command, ['test'], {
      inherit: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.data.pid === 'number' || result.data.pid === undefined).toBe(true);
      result.data.kill();
    }
  });

  it('spawns process with inherit=true by default', () => {
    const result: Result<ChildProcess> = spawnProcess('echo' as Command, ['default']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      result.data.kill();
    }
  });

  it('returns validation error for empty command', () => {
    const result: Result<ChildProcess> = spawnProcess('' as Command);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns validation error for non-array args', () => {
    const result: Result<ChildProcess> = spawnProcess(
      'echo' as Command,
      'not-an-array' as unknown as StrArray,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });
});

// ── ensureMise ──────────────────────────────────────────────────────────

describe('ensureMise', () => {
  it('returns skipped_dry_run when dryRun=true', () => {
    const result = ensureMise('/tmp/__nowhere__' as Str, '2026.2.16' as Str, true);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe('skipped_dry_run');
    }
  });

  it('rejects non-boolean dryRun', () => {
    const result = ensureMise(
      '/tmp/__nowhere__' as Str,
      '2026.2.16' as Str,
      'yes' as unknown as Bool,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });
});
