/**
 * Tests for terminal utilities.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Bool, ColorLevel, NonNegativeInteger, PositiveInteger, Str, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import {
  setColors,
  getColorLevel,
  setColorLevel,
  getTerminalWidth,
  truncateLine,
  style,
  renderMarkup,
  symbols,
  startSpinner,
  stopSpinner,
  progressBar,
  startGroup,
  endGroup,
  log,
} from './terminal';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

afterEach(() => {
  stopSpinner();
  vi.restoreAllMocks();
});

// ── Color config ────────────────────────────────────────────────────────

describe('color config', () => {
  it('setColors enables and disables colors', () => {
    const offResult: Result<Void> = setColors(false);
    expect(offResult.ok).toBe(true);

    // With colors off, style should return plain text
    const plain = style.red('test');
    expect(plain.ok).toBe(true);
    if (plain.ok) expect(plain.data).toBe('test');

    // Re-enable
    setColors(true);
  });

  it('getColorLevel returns a valid level', () => {
    const result: Result<ColorLevel> = getColorLevel();
    expect(result.ok).toBe(true);
    if (result.ok) expect([0, 1, 2, 3]).toContain(result.data);
  });

  it('setColorLevel accepts valid level', () => {
    const result: Result<Void> = setColorLevel(1 as ColorLevel);
    expect(result.ok).toBe(true);
  });
});

// ── Terminal width ──────────────────────────────────────────────────────

describe('getTerminalWidth', () => {
  it('returns a positive integer', () => {
    const result: Result<PositiveInteger> = getTerminalWidth();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeGreaterThan(0);
  });
});

// ── truncateLine ────────────────────────────────────────────────────────

describe('truncateLine', () => {
  it('truncates line to specified width', () => {
    const result: Result<Str> = truncateLine('Hello, world! This is a long line.', 10 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.length).toBeLessThanOrEqual(15); // includes potential ANSI
  });
});

// ── style object ────────────────────────────────────────────────────────

describe('style', () => {
  it('style.bold wraps text', () => {
    setColors(true);
    const result: Result<Str> = style.bold('test');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('test');
  });

  it('style.red wraps text', () => {
    setColors(true);
    const result: Result<Str> = style.red('error');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('error');
  });

  it('style.dim returns plain text when colors disabled', () => {
    setColors(false);
    const result: Result<Str> = style.dim('faded');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('faded');
    setColors(true);
  });
});

// ── renderMarkup ────────────────────────────────────────────────────────

describe('renderMarkup', () => {
  it('replaces {symbol:name} with symbol characters', () => {
    const result: Result<Str> = renderMarkup('{symbol:success} Done');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).not.toContain('{symbol:');
      expect(result.data).toContain('Done');
    }
  });

  it('replaces {tag}...{/} markup', () => {
    setColors(false);
    const result: Result<Str> = renderMarkup('{bold}hello{/}');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('hello');
    setColors(true);
  });
});

// ── symbols ─────────────────────────────────────────────────────────────

describe('symbols', () => {
  it('symbols.success returns a string', () => {
    expect(typeof symbols.success).toBe('string');
    expect(symbols.success.length).toBeGreaterThan(0);
  });
});

// ── spinner ─────────────────────────────────────────────────────────────

describe('spinner', () => {
  it('startSpinner and stopSpinner return ok', () => {
    const startResult: Result<Void> = startSpinner('Loading...');
    expect(startResult.ok).toBe(true);

    const stopResult: Result<Void> = stopSpinner('Done');
    expect(stopResult.ok).toBe(true);
  });
});

// ── progressBar ─────────────────────────────────────────────────────────

describe('progressBar', () => {
  it('returns a formatted progress string', () => {
    const result: Result<Str> = progressBar(50 as NonNegativeInteger, 100 as PositiveInteger);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.length).toBeGreaterThan(0);
  });
});

// ── groups ──────────────────────────────────────────────────────────────

describe('groups', () => {
  it('startGroup and endGroup return ok', () => {
    const startResult: Result<Void> = startGroup('Test Group');
    expect(startResult.ok).toBe(true);

    const endResult: Result<Void> = endGroup();
    expect(endResult.ok).toBe(true);
  });
});

// ── log object ──────────────────────────────────────────────────────────

describe('log', () => {
  it('log.print writes output', () => {
    const result: Result<Void> = log.print('hello');
    expect(result.ok).toBe(true);
  });
});
