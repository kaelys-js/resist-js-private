/**
 * Tests for terminal utilities.
 *
 * Covers:
 * - Color config (setColors / getColorLevel / setColorLevel)
 * - Terminal width (getTerminalWidth)
 * - Line truncation (truncateLine)
 * - Style functions (style.*)
 * - Symbols (symbols.*)
 * - Markup rendering (renderMarkup)
 * - All log.* methods in pretty / json / github / compact modes
 * - Spinner (startSpinner / stopSpinner)
 * - Progress bar (progressBar)
 * - GitHub Actions groups (startGroup / endGroup)
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Bool,
  ColorLevel,
  JsonData,
  NonNegativeInteger,
  OutputFormat,
  PositiveInteger,
  PrintOptions,
  Str,
  Void,
} from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { setLogLevel } from './logger';
import { setOutputFormat } from './output-context';
import {
  endGroup,
  getColorLevel,
  getTerminalWidth,
  log,
  progressBar,
  renderMarkup,
  setColorLevel,
  setColors,
  startGroup,
  startSpinner,
  stopSpinner,
  style,
  symbols,
  truncateLine,
} from './terminal';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  /* Reset module-level state to deterministic baseline. */
  setLogLevel('info');
  setOutputFormat('pretty');
  setColors(true);
});

afterEach(() => {
  stopSpinner();
  vi.restoreAllMocks();
  vi.useRealTimers();
  /* Restore defaults for cross-file test stability. */
  setLogLevel('info');
  setOutputFormat('pretty');
  setColors(true);
});

/* ──────────────────────────────────────────────────────────────────────── */
/* Color config                                                            */
/* ──────────────────────────────────────────────────────────────────────── */

describe('color config', () => {
  it('setColors enables and disables colors', () => {
    const offResult: Result<Void> = setColors(false);
    expect(offResult.ok).toBe(true);

    const plain: Result<Str> = style.red('test');
    expect(plain.ok).toBe(true);
    if (plain.ok) {
      expect(plain.data).toBe('test');
    }
    setColors(true);
  });

  it('setColors(false) sets color level to 0', () => {
    setColors(false);
    const level: Result<ColorLevel> = getColorLevel();
    expect(level.ok).toBe(true);
    if (level.ok) {
      expect(level.data).toBe(0);
    }
  });

  it('setColors(true) sets color level to at least 1', () => {
    setColors(false);
    setColors(true);
    const level: Result<ColorLevel> = getColorLevel();
    expect(level.ok).toBe(true);
    if (level.ok) {
      expect(level.data).toBeGreaterThanOrEqual(1);
    }
  });

  it('getColorLevel returns a valid level', () => {
    const result: Result<ColorLevel> = getColorLevel();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect([0, 1, 2, 3]).toContain(result.data);
    }
  });

  it('setColorLevel(0) disables colors', () => {
    const result: Result<Void> = setColorLevel(0 as ColorLevel);
    expect(result.ok).toBe(true);
    const level: Result<ColorLevel> = getColorLevel();
    if (level.ok) {
      expect(level.data).toBe(0);
    }
    /* With colors off, style should return plain text. */
    const plain: Result<Str> = style.blue('x');
    if (plain.ok) {
      expect(plain.data).toBe('x');
    }
  });

  it('setColorLevel(1) enables basic colors', () => {
    const result: Result<Void> = setColorLevel(1 as ColorLevel);
    expect(result.ok).toBe(true);
    const level: Result<ColorLevel> = getColorLevel();
    if (level.ok) {
      expect(level.data).toBe(1);
    }
  });

  it('setColorLevel(2) enables 256 color mode', () => {
    const result: Result<Void> = setColorLevel(2 as ColorLevel);
    expect(result.ok).toBe(true);
    const level: Result<ColorLevel> = getColorLevel();
    if (level.ok) {
      expect(level.data).toBe(2);
    }
  });

  it('setColorLevel(3) enables truecolor', () => {
    const result: Result<Void> = setColorLevel(3 as ColorLevel);
    expect(result.ok).toBe(true);
    const level: Result<ColorLevel> = getColorLevel();
    if (level.ok) {
      expect(level.data).toBe(3);
    }
  });

  it('setColorLevel(invalid) returns Result.err', () => {
    /* Invalid value caught by Valibot. */
    const result: Result<Void> = setColorLevel(5 as unknown as ColorLevel);
    expect(result.ok).toBe(false);
  });

  it('setColors(invalid) returns Result.err', () => {
    const result: Result<Void> = setColors('yes' as unknown as Bool);
    expect(result.ok).toBe(false);
  });

  it('setColorLevel roundtrips via getColorLevel', () => {
    setColorLevel(3 as ColorLevel);
    const r3: Result<ColorLevel> = getColorLevel();
    if (r3.ok) {
      expect(r3.data).toBe(3);
    }
    setColorLevel(1 as ColorLevel);
    const r1: Result<ColorLevel> = getColorLevel();
    if (r1.ok) {
      expect(r1.data).toBe(1);
    }
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* Terminal width                                                          */
/* ──────────────────────────────────────────────────────────────────────── */

describe('getTerminalWidth', () => {
  it('returns a positive integer', () => {
    const result: Result<PositiveInteger> = getTerminalWidth();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeGreaterThan(0);
    }
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* truncateLine                                                            */
/* ──────────────────────────────────────────────────────────────────────── */

describe('truncateLine', () => {
  it('truncates line to specified width', () => {
    const result: Result<Str> = truncateLine(
      'Hello, world! This is a long line.',
      10 as NonNegativeInteger,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeLessThanOrEqual(15);
    }
  });

  it('returns string unchanged when shorter than width', () => {
    const result: Result<Str> = truncateLine('hi', 50 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('hi');
    }
  });

  it('returns empty string for empty input', () => {
    const result: Result<Str> = truncateLine('', 10 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('');
    }
  });

  it('uses getTerminalWidth when maxWidth omitted', () => {
    const result: Result<Str> = truncateLine('quick brown fox');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThan(0);
    }
  });

  it('returns Result.err for invalid maxWidth (negative)', () => {
    const result: Result<Str> = truncateLine('abc', -1 as unknown as NonNegativeInteger);
    expect(result.ok).toBe(false);
  });

  it('returns Result.err for non-string input', () => {
    const result: Result<Str> = truncateLine(123 as unknown as Str);
    expect(result.ok).toBe(false);
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* style.*                                                                 */
/* ──────────────────────────────────────────────────────────────────────── */

describe('style', () => {
  /* Decorations ─────────────────────────────────────────────────────── */

  it('style.bold wraps text with ANSI when colors enabled', () => {
    setColors(true);
    const result: Result<Str> = style.bold('t');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('t');
      expect(result.data).toContain('\u001B[1m');
    }
  });

  it('style.dim wraps text with ANSI when colors enabled', () => {
    setColors(true);
    const result: Result<Str> = style.dim('t');
    if (result.ok) {
      expect(result.data).toContain('\u001B[2m');
    }
  });

  it('style.italic wraps text with ANSI', () => {
    setColors(true);
    const result: Result<Str> = style.italic('t');
    if (result.ok) {
      expect(result.data).toContain('\u001B[3m');
    }
  });

  it('style.underline wraps text with ANSI', () => {
    setColors(true);
    const result: Result<Str> = style.underline('t');
    if (result.ok) {
      expect(result.data).toContain('\u001B[4m');
    }
  });

  it('style.inverse wraps text with ANSI', () => {
    setColors(true);
    const result: Result<Str> = style.inverse('t');
    if (result.ok) {
      expect(result.data).toContain('\u001B[7m');
    }
  });

  it('style.strikethrough wraps text with ANSI', () => {
    setColors(true);
    const result: Result<Str> = style.strikethrough('t');
    if (result.ok) {
      expect(result.data).toContain('\u001B[9m');
    }
  });

  /* Foreground colors ──────────────────────────────────────────────── */

  it('style.red wraps text', () => {
    setColors(true);
    const result: Result<Str> = style.red('err');
    if (result.ok) {
      expect(result.data).toContain('err');
      expect(result.data).toContain('\u001B[31m');
    }
  });

  it('style.green wraps text', () => {
    setColors(true);
    const result: Result<Str> = style.green('ok');
    if (result.ok) {
      expect(result.data).toContain('\u001B[32m');
    }
  });

  it('style.yellow wraps text', () => {
    setColors(true);
    const result: Result<Str> = style.yellow('warn');
    if (result.ok) {
      expect(result.data).toContain('\u001B[33m');
    }
  });

  it('style.blue wraps text', () => {
    setColors(true);
    const result: Result<Str> = style.blue('info');
    if (result.ok) {
      expect(result.data).toContain('\u001B[34m');
    }
  });

  it('style.magenta wraps text', () => {
    setColors(true);
    const result: Result<Str> = style.magenta('m');
    if (result.ok) {
      expect(result.data).toContain('\u001B[35m');
    }
  });

  it('style.cyan wraps text', () => {
    setColors(true);
    const result: Result<Str> = style.cyan('c');
    if (result.ok) {
      expect(result.data).toContain('\u001B[36m');
    }
  });

  it('style.white wraps text', () => {
    setColors(true);
    const result: Result<Str> = style.white('w');
    if (result.ok) {
      expect(result.data).toContain('\u001B[37m');
    }
  });

  it('style.gray wraps text', () => {
    setColors(true);
    const result: Result<Str> = style.gray('g');
    if (result.ok) {
      expect(result.data).toContain('\u001B[90m');
    }
  });

  it('style.grey is an alias for gray', () => {
    setColors(true);
    const g: Result<Str> = style.gray('x');
    const gr: Result<Str> = style.grey('x');
    if (g.ok && gr.ok) {
      expect(g.data).toBe(gr.data);
    }
  });

  /* Plain mode ─────────────────────────────────────────────────────── */

  it('style.dim returns plain text when colors disabled', () => {
    setColors(false);
    const result: Result<Str> = style.dim('faded');
    if (result.ok) {
      expect(result.data).toBe('faded');
    }
    setColors(true);
  });

  it('all style functions strip ANSI when colors disabled', () => {
    setColors(false);
    for (const fn of [
      style.bold,
      style.dim,
      style.italic,
      style.underline,
      style.inverse,
      style.strikethrough,
      style.red,
      style.green,
      style.yellow,
      style.blue,
      style.magenta,
      style.cyan,
      style.white,
      style.gray,
      style.grey,
    ]) {
      const r: Result<Str> = fn('x');
      if (r.ok) {
        expect(r.data).toBe('x');
      }
    }
    setColors(true);
  });

  it('style.red returns Result.err for non-string input', () => {
    const result: Result<Str> = style.red(123 as unknown as Str);
    expect(result.ok).toBe(false);
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* symbols                                                                 */
/* ──────────────────────────────────────────────────────────────────────── */

describe('symbols', () => {
  it('status symbols are non-empty strings', () => {
    expect(typeof symbols.success).toBe('string');
    expect(symbols.success.length).toBeGreaterThan(0);
    expect(typeof symbols.error).toBe('string');
    expect(typeof symbols.warning).toBe('string');
    expect(typeof symbols.info).toBe('string');
  });

  it('check and cross symbols exist', () => {
    expect(typeof symbols.check).toBe('string');
    expect(typeof symbols.cross).toBe('string');
    expect(typeof symbols.checkDouble).toBe('string');
  });

  it('navigation symbols exist', () => {
    expect(typeof symbols.arrow).toBe('string');
    expect(typeof symbols.arrowDown).toBe('string');
    expect(typeof symbols.arrowUp).toBe('string');
    expect(typeof symbols.arrowLeft).toBe('string');
    expect(typeof symbols.arrowRight).toBe('string');
  });

  it('punctuation symbols exist', () => {
    expect(typeof symbols.bullet).toBe('string');
    expect(typeof symbols.dot).toBe('string');
    expect(typeof symbols.ellipsis).toBe('string');
    expect(typeof symbols.dash).toBe('string');
    expect(typeof symbols.star).toBe('string');
    expect(typeof symbols.plus).toBe('string');
    expect(typeof symbols.minus).toBe('string');
    expect(typeof symbols.pipe).toBe('string');
  });

  it('checkbox/toggle symbols exist', () => {
    expect(typeof symbols.radioOn).toBe('string');
    expect(typeof symbols.radioOff).toBe('string');
    expect(typeof symbols.toggleOn).toBe('string');
    expect(typeof symbols.toggleOff).toBe('string');
  });

  it('box drawing symbols exist', () => {
    expect(typeof symbols.boxTopLeft).toBe('string');
    expect(typeof symbols.boxTopRight).toBe('string');
    expect(typeof symbols.boxBottomLeft).toBe('string');
    expect(typeof symbols.boxBottomRight).toBe('string');
    expect(typeof symbols.boxVertical).toBe('string');
    expect(typeof symbols.boxHorizontal).toBe('string');
    expect(typeof symbols.boxVerticalRight).toBe('string');
    expect(typeof symbols.boxVerticalLeft).toBe('string');
  });

  it('progress symbols exist', () => {
    expect(typeof symbols.progressFilled).toBe('string');
    expect(typeof symbols.progressEmpty).toBe('string');
  });

  it('tree symbols exist', () => {
    expect(typeof symbols.tree).toBe('string');
    expect(typeof symbols.treeLast).toBe('string');
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* renderMarkup                                                            */
/* ──────────────────────────────────────────────────────────────────────── */

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
    if (result.ok) {
      expect(result.data).toContain('hello');
    }
    setColors(true);
  });

  it('applies ANSI when colors enabled', () => {
    setColors(true);
    const result: Result<Str> = renderMarkup('{red}err{/}');
    if (result.ok) {
      expect(result.data).toContain('err');
      expect(result.data).toContain('\u001B[31m');
    }
  });

  it('strips {tag} markup when colors disabled', () => {
    setColors(false);
    const result: Result<Str> = renderMarkup('{red}err{/}');
    if (result.ok) {
      expect(result.data).toBe('err');
    }
  });

  it('handles nested {bold}{red}...{/}{/} with outer-only replacement (non-nesting)', () => {
    setColors(true);
    /* renderMarkup uses a single non-greedy `/\{tag\}(.*?)\{\/\}/` pass, so for
     * `{bold}{red}x{/}{/}` it matches `{bold}` + inner `{red}x` + `{/}`, leaving
     * the trailing `{/}` as literal. Inner `{red}` is preserved as text. */
    const result: Result<Str> = renderMarkup('{bold}{red}x{/}{/}');
    if (result.ok) {
      expect(result.data).toContain('x');
      expect(result.data).toContain('\u001B[1m'); /* bold applied */
      expect(result.data).toContain('\u001B[0m'); /* reset applied */
      expect(result.data).toContain('{red}'); /* inner tag left literal */
      expect(result.data).toContain('{/}'); /* trailing close left literal */
      expect(result.data).not.toContain('\u001B[31m'); /* red NOT applied (not nested) */
    }
  });

  it('passes through unknown {symbol:bogus} unchanged', () => {
    const result: Result<Str> = renderMarkup('{symbol:bogus} x');
    if (result.ok) {
      expect(result.data).toContain('{symbol:bogus}');
    }
  });

  it('passes through unclosed {bold}text as literal', () => {
    const result: Result<Str> = renderMarkup('{bold}text');
    /* Unclosed passes through: either the literal or best-effort. */
    if (result.ok) {
      expect(result.data).toContain('text');
    }
  });

  it('returns empty string for empty input', () => {
    const result: Result<Str> = renderMarkup('');
    if (result.ok) {
      expect(result.data).toBe('');
    }
  });

  it('passes plain text without markup through unchanged', () => {
    const result: Result<Str> = renderMarkup('plain text');
    if (result.ok) {
      expect(result.data).toBe('plain text');
    }
  });

  it('handles multiple consecutive symbol tags', () => {
    const result: Result<Str> = renderMarkup('{symbol:success}{symbol:error}');
    if (result.ok) {
      expect(result.data).not.toContain('{symbol:');
      expect(result.data.length).toBeGreaterThan(0);
    }
  });

  it('returns Result.err for non-string input', () => {
    const result: Result<Str> = renderMarkup(5 as unknown as Str);
    expect(result.ok).toBe(false);
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* log.print                                                               */
/* ──────────────────────────────────────────────────────────────────────── */

describe('log.print', () => {
  it('returns ok', () => {
    const result: Result<Void> = log.print('hello');
    expect(result.ok).toBe(true);
  });

  it('silenced in machine-readable mode (json)', () => {
    setOutputFormat('json' as OutputFormat);
    const spy = vi.mocked(console.log);
    spy.mockClear();
    const result: Result<Void> = log.print('silenced');
    expect(result.ok).toBe(true);
    /* Should not have emitted anything via console.log for print. */
    expect(spy).not.toHaveBeenCalled();
    setOutputFormat('pretty' as OutputFormat);
  });

  it('silenced in junit mode', () => {
    setOutputFormat('junit' as OutputFormat);
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.print('x');
    expect(spy).not.toHaveBeenCalled();
    setOutputFormat('pretty' as OutputFormat);
  });

  it('silenced in github mode', () => {
    setOutputFormat('github' as OutputFormat);
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.print('x');
    expect(spy).not.toHaveBeenCalled();
    setOutputFormat('pretty' as OutputFormat);
  });

  it('honors stream option via PrintOptions', () => {
    const errSpy = vi.mocked(console.error);
    errSpy.mockClear();
    const opts: PrintOptions = { level: 'error', stream: 'stderr' } as PrintOptions;
    log.print('e', opts);
    expect(errSpy).toHaveBeenCalled();
  });

  it('returns Result.err for non-string input', () => {
    const result: Result<Void> = log.print(123 as unknown as Str);
    expect(result.ok).toBe(false);
  });

  it('returns Result.err for invalid options', () => {
    const result: Result<Void> = log.print('x', {
      level: 'nope',
    } as unknown as PrintOptions);
    expect(result.ok).toBe(false);
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* log.info                                                                */
/* ──────────────────────────────────────────────────────────────────────── */

describe('log.info', () => {
  it('writes output when log level allows', () => {
    setLogLevel('info');
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.info('hello');
    expect(spy).toHaveBeenCalled();
  });

  it('no-ops when log level is error', () => {
    setLogLevel('error');
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.info('suppressed');
    expect(spy).not.toHaveBeenCalled();
  });

  it('delegates to base logger in JSON mode', () => {
    setOutputFormat('json' as OutputFormat);
    const result: Result<Void> = log.info('json-info');
    expect(result.ok).toBe(true);
    setOutputFormat('pretty' as OutputFormat);
  });

  it('emits ::notice:: in github mode', () => {
    setOutputFormat('github' as OutputFormat);
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.info('gh info');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('::notice::'));
    setOutputFormat('pretty' as OutputFormat);
  });

  it('emits INF prefix in compact mode', () => {
    setOutputFormat('compact' as OutputFormat);
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.info('compact msg');
    /* Compact format uses INF prefix. */
    const calls = spy.mock.calls.flat().join(' ');
    expect(calls).toContain('INF');
    setOutputFormat('pretty' as OutputFormat);
  });

  it('returns Result.err for non-string input', () => {
    const result: Result<Void> = log.info(null as unknown as Str);
    expect(result.ok).toBe(false);
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* log.warn                                                                */
/* ──────────────────────────────────────────────────────────────────────── */

describe('log.warn', () => {
  it('writes output when log level allows', () => {
    setLogLevel('warn');
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.warn('w');
    expect(spy).toHaveBeenCalled();
  });

  it('no-ops when log level is error', () => {
    setLogLevel('error');
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.warn('muted');
    expect(spy).not.toHaveBeenCalled();
  });

  it('delegates to base logger in JSON mode', () => {
    setOutputFormat('json' as OutputFormat);
    const result: Result<Void> = log.warn('json-warn');
    expect(result.ok).toBe(true);
    setOutputFormat('pretty' as OutputFormat);
  });

  it('emits ::warning:: in github mode', () => {
    setOutputFormat('github' as OutputFormat);
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.warn('gh');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('::warning::'));
    setOutputFormat('pretty' as OutputFormat);
  });

  it('emits WRN prefix in compact mode', () => {
    setOutputFormat('compact' as OutputFormat);
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.warn('compact warn');
    const calls = spy.mock.calls.flat().join(' ');
    expect(calls).toContain('WRN');
    setOutputFormat('pretty' as OutputFormat);
  });

  it('returns Result.err for non-string input', () => {
    const result: Result<Void> = log.warn(undefined as unknown as Str);
    expect(result.ok).toBe(false);
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* log.error                                                               */
/* ──────────────────────────────────────────────────────────────────────── */

describe('log.error', () => {
  it('writes output to stderr', () => {
    setLogLevel('error');
    const spy = vi.mocked(console.error);
    spy.mockClear();
    log.error('e');
    expect(spy).toHaveBeenCalled();
  });

  it('no-ops when log level is silent', () => {
    setLogLevel('silent');
    const spy = vi.mocked(console.error);
    spy.mockClear();
    log.error('muted');
    expect(spy).not.toHaveBeenCalled();
  });

  it('delegates to base logger in JSON mode', () => {
    setOutputFormat('json' as OutputFormat);
    const result: Result<Void> = log.error('json-err');
    expect(result.ok).toBe(true);
    setOutputFormat('pretty' as OutputFormat);
  });

  it('emits ::error:: in github mode', () => {
    setOutputFormat('github' as OutputFormat);
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.error('gh err');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('::error::'));
    setOutputFormat('pretty' as OutputFormat);
  });

  it('emits ERR prefix in compact mode', () => {
    setOutputFormat('compact' as OutputFormat);
    const spy = vi.mocked(console.error);
    spy.mockClear();
    log.error('compact err');
    const calls = spy.mock.calls.flat().join(' ');
    expect(calls).toContain('ERR');
    setOutputFormat('pretty' as OutputFormat);
  });

  it('returns Result.err for non-string input', () => {
    const result: Result<Void> = log.error({} as unknown as Str);
    expect(result.ok).toBe(false);
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* log.debug                                                               */
/* ──────────────────────────────────────────────────────────────────────── */

describe('log.debug', () => {
  it('writes when log level is debug', () => {
    setLogLevel('debug');
    const spy = vi.mocked(console.error);
    spy.mockClear();
    log.debug('d');
    expect(spy).toHaveBeenCalled();
  });

  it('no-ops when log level is info', () => {
    setLogLevel('info');
    const spy = vi.mocked(console.error);
    spy.mockClear();
    log.debug('muted');
    expect(spy).not.toHaveBeenCalled();
  });

  it('accepts optional data argument', () => {
    setLogLevel('debug');
    const spy = vi.mocked(console.error);
    spy.mockClear();
    const data: JsonData = { foo: 'bar' } as JsonData;
    const result: Result<Void> = log.debug('msg', data);
    expect(result.ok).toBe(true);
    expect(spy).toHaveBeenCalled();
  });

  it('delegates to base logger in JSON mode', () => {
    setLogLevel('debug');
    setOutputFormat('json' as OutputFormat);
    const result: Result<Void> = log.debug('d', { k: 1 } as JsonData);
    expect(result.ok).toBe(true);
    setOutputFormat('pretty' as OutputFormat);
  });

  it('emits ::debug:: in github mode', () => {
    setLogLevel('debug');
    setOutputFormat('github' as OutputFormat);
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.debug('gh debug');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('::debug::'));
    setOutputFormat('pretty' as OutputFormat);
  });

  it('emits DBG prefix in compact mode', () => {
    setLogLevel('debug');
    setOutputFormat('compact' as OutputFormat);
    const spy = vi.mocked(console.error);
    spy.mockClear();
    log.debug('compact dbg');
    const calls = spy.mock.calls.flat().join(' ');
    expect(calls).toContain('DBG');
    setOutputFormat('pretty' as OutputFormat);
  });

  it('returns Result.err for non-string input', () => {
    const result: Result<Void> = log.debug(123 as unknown as Str);
    expect(result.ok).toBe(false);
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* log.trace                                                               */
/* ──────────────────────────────────────────────────────────────────────── */

describe('log.trace', () => {
  it('writes when log level is trace', () => {
    setLogLevel('trace');
    const spy = vi.mocked(console.error);
    spy.mockClear();
    log.trace('t');
    expect(spy).toHaveBeenCalled();
  });

  it('no-ops when log level is info', () => {
    setLogLevel('info');
    const spy = vi.mocked(console.error);
    spy.mockClear();
    log.trace('muted');
    expect(spy).not.toHaveBeenCalled();
  });

  it('accepts optional data argument', () => {
    setLogLevel('trace');
    const spy = vi.mocked(console.error);
    spy.mockClear();
    const result: Result<Void> = log.trace('msg', { arr: [1, 2] } as JsonData);
    expect(result.ok).toBe(true);
    expect(spy).toHaveBeenCalled();
  });

  it('delegates to base logger in JSON mode', () => {
    setLogLevel('trace');
    setOutputFormat('json' as OutputFormat);
    const result: Result<Void> = log.trace('t', { k: 'v' } as JsonData);
    expect(result.ok).toBe(true);
    setOutputFormat('pretty' as OutputFormat);
  });

  it('emits ::debug:: in github mode (no trace level in GH)', () => {
    setLogLevel('trace');
    setOutputFormat('github' as OutputFormat);
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.trace('gh trace');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('::debug::'));
    setOutputFormat('pretty' as OutputFormat);
  });

  it('emits TRC prefix in compact mode', () => {
    setLogLevel('trace');
    setOutputFormat('compact' as OutputFormat);
    const spy = vi.mocked(console.error);
    spy.mockClear();
    log.trace('compact trace');
    const calls = spy.mock.calls.flat().join(' ');
    expect(calls).toContain('TRC');
    setOutputFormat('pretty' as OutputFormat);
  });

  it('returns Result.err for non-string input', () => {
    const result: Result<Void> = log.trace(true as unknown as Str);
    expect(result.ok).toBe(false);
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* log.json                                                                */
/* ──────────────────────────────────────────────────────────────────────── */

describe('log.json', () => {
  it('stringifies object', () => {
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.json({ a: 1 } as JsonData);
    expect(spy).toHaveBeenCalled();
    const arg = spy.mock.calls[0]?.[0] as string | undefined;
    expect(arg).toContain('"a"');
    expect(arg).toContain('1');
  });

  it('respects custom indent', () => {
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.json({ x: 1 } as JsonData, 4 as NonNegativeInteger);
    const arg = spy.mock.calls[0]?.[0] as string | undefined;
    expect(arg).toContain('    "x"');
  });

  it('returns Result.err for invalid indent', () => {
    const result: Result<Void> = log.json({} as JsonData, -1 as unknown as NonNegativeInteger);
    expect(result.ok).toBe(false);
  });

  it('stringifies primitives', () => {
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.json('hello' as unknown as JsonData);
    expect(spy).toHaveBeenCalled();
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* log.raw                                                                 */
/* ──────────────────────────────────────────────────────────────────────── */

describe('log.raw', () => {
  it('writes to stdout regardless of log level', () => {
    setLogLevel('silent');
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.raw('always');
    expect(spy).toHaveBeenCalled();
  });

  it('renders markup', () => {
    setColors(true);
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.raw('{red}x{/}');
    const arg = spy.mock.calls[0]?.[0] as string | undefined;
    expect(arg).toContain('x');
  });

  it('returns Result.err for non-string input', () => {
    const result: Result<Void> = log.raw(5 as unknown as Str);
    expect(result.ok).toBe(false);
  });

  it('writes even in machine-readable modes', () => {
    setOutputFormat('json' as OutputFormat);
    const spy = vi.mocked(console.log);
    spy.mockClear();
    log.raw('force');
    expect(spy).toHaveBeenCalled();
    setOutputFormat('pretty' as OutputFormat);
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* log.rawError                                                            */
/* ──────────────────────────────────────────────────────────────────────── */

describe('log.rawError', () => {
  it('writes to stderr regardless of log level', () => {
    setLogLevel('silent');
    const spy = vi.mocked(console.error);
    spy.mockClear();
    log.rawError('fatal');
    expect(spy).toHaveBeenCalled();
  });

  it('renders markup', () => {
    setColors(true);
    const spy = vi.mocked(console.error);
    spy.mockClear();
    log.rawError('{red}boom{/}');
    const arg = spy.mock.calls[0]?.[0] as string | undefined;
    expect(arg).toContain('boom');
  });

  it('returns Result.err for non-string input', () => {
    const result: Result<Void> = log.rawError(null as unknown as Str);
    expect(result.ok).toBe(false);
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* Spinner                                                                 */
/* ──────────────────────────────────────────────────────────────────────── */

describe('spinner', () => {
  it('startSpinner and stopSpinner return ok', () => {
    const startResult: Result<Void> = startSpinner('Loading...');
    expect(startResult.ok).toBe(true);
    const stopResult: Result<Void> = stopSpinner('Done');
    expect(stopResult.ok).toBe(true);
  });

  it('stopSpinner without prior start is ok', () => {
    const result: Result<Void> = stopSpinner();
    expect(result.ok).toBe(true);
  });

  it('stopSpinner with no final message is ok', () => {
    startSpinner('x');
    const result: Result<Void> = stopSpinner();
    expect(result.ok).toBe(true);
  });

  it('startSpinner returns Result.err for non-string', () => {
    const result: Result<Void> = startSpinner(123 as unknown as Str);
    expect(result.ok).toBe(false);
  });

  it('stopSpinner with invalid final message returns Result.err', () => {
    const result: Result<Void> = stopSpinner(123 as unknown as Str);
    expect(result.ok).toBe(false);
  });

  it('second startSpinner call replaces first (no leak)', () => {
    startSpinner('first');
    const result: Result<Void> = startSpinner('second');
    expect(result.ok).toBe(true);
    stopSpinner();
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* Progress bar                                                            */
/* ──────────────────────────────────────────────────────────────────────── */

describe('progressBar', () => {
  it('renders 50% progress', () => {
    const result: Result<Str> = progressBar(50 as NonNegativeInteger, 100 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data).toContain('50%');
    }
  });

  it('renders 0% progress', () => {
    const result: Result<Str> = progressBar(0 as NonNegativeInteger, 100 as NonNegativeInteger);
    if (result.ok) {
      expect(result.data).toContain('0%');
    }
  });

  it('renders 100% progress', () => {
    const result: Result<Str> = progressBar(100 as NonNegativeInteger, 100 as NonNegativeInteger);
    if (result.ok) {
      expect(result.data).toContain('100%');
    }
  });

  it('handles total=0 without crashing', () => {
    const result: Result<Str> = progressBar(0 as NonNegativeInteger, 0 as NonNegativeInteger);
    expect(result.ok).toBe(true);
  });

  it('accepts custom width', () => {
    const result: Result<Str> = progressBar(
      5 as NonNegativeInteger,
      10 as NonNegativeInteger,
      40 as PositiveInteger,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThan(40);
    }
  });

  it('returns Result.err for negative current', () => {
    const result: Result<Str> = progressBar(
      -1 as unknown as NonNegativeInteger,
      10 as NonNegativeInteger,
    );
    expect(result.ok).toBe(false);
  });

  it('returns Result.err for negative total', () => {
    const result: Result<Str> = progressBar(
      1 as NonNegativeInteger,
      -10 as unknown as NonNegativeInteger,
    );
    expect(result.ok).toBe(false);
  });

  it('returns Result.err for width=0', () => {
    const result: Result<Str> = progressBar(
      1 as NonNegativeInteger,
      10 as NonNegativeInteger,
      0 as unknown as PositiveInteger,
    );
    expect(result.ok).toBe(false);
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* Groups                                                                  */
/* ──────────────────────────────────────────────────────────────────────── */

describe('groups', () => {
  it('startGroup emits ::group:: prefix', () => {
    const spy = vi.mocked(console.log);
    spy.mockClear();
    const result: Result<Void> = startGroup('T');
    expect(result.ok).toBe(true);
    expect(spy).toHaveBeenCalledWith('::group::T');
  });

  it('endGroup emits ::endgroup::', () => {
    const spy = vi.mocked(console.log);
    spy.mockClear();
    const result: Result<Void> = endGroup();
    expect(result.ok).toBe(true);
    expect(spy).toHaveBeenCalledWith('::endgroup::');
  });

  it('startGroup returns Result.err for non-string', () => {
    const result: Result<Void> = startGroup(5 as unknown as Str);
    expect(result.ok).toBe(false);
  });

  it('startGroup accepts empty string', () => {
    const result: Result<Void> = startGroup('');
    expect(result.ok).toBe(true);
  });
});
