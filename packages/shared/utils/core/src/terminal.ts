/**
 * Terminal Utilities
 *
 * Cross-platform output primitives. Provides:
 * - `style.*` — text styling (ANSI in Node, CSS via %c in browser, plain in Workers)
 * - `renderMarkup()` — parse `{tag}...{/}` and `{symbol:name}` inline markup
 * - `log.*` — 8 methods: print, info, warn, error, debug, json, raw, rawError
 * - Symbols, spinner, progress bar
 *
 * Auto-detects runtime (Node TTY, Node pipe, browser, Cloudflare Worker) at
 * module load. All APIs return `Result<T>`. Zero caller changes needed across
 * environments — `style.*` produces ANSI codes, `log.*` converts to platform
 * format at output time.
 *
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 */

import {
  BoolSchema,
  ColorLevelSchema,
  DEFAULT_JSON_INDENT,
  DEFAULT_PROGRESS_BAR_WIDTH,
  DEFAULT_RUNTIME_KIND,
  NonNegativeIntegerSchema,
  PositiveIntegerSchema,
  PrintOptionsSchema,
  StrSchema,
  StyleNameSchema,
  SymbolNameSchema,
  VoidSchema,
  type Bool,
  type ColorLevel,
  type ConsoleLogFn,
  type EnvRecordWithUndefined,
  type JsonData,
  type NonNegativeInteger,
  type OutputFormat,
  type PositiveInteger,
  type PrintOptions,
  type PrintStream,
  type RuntimeKind,
  type OptionalStr,
  type Str,
  type StyleName,
  type SymbolName,
  type NullableIntervalId,
  type NullableRegExpExecArray,
  type Void,
} from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';
import { detectColorLevel, detectRuntime } from '@/utils/core/environment';
import { log as baseLog, shouldLog } from '@/utils/core/logger';
import { safeStringify } from '@/utils/core/object';
import { getOutputFormat, isMachineReadable } from '@/utils/core/output-context';
import {
  clearLine,
  cursorTo,
  getColumns,
  getEnvRecord,
  isTTY,
  writeStdout,
} from '@/utils/core/process';
import { truncateLine as coreTruncateLine } from '@/utils/core/string';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Runtime Detection
// =============================================================================

/** Detected runtime, resolved once at module load. */
const runtimeResult: Result<RuntimeKind> = detectRuntime();
// Module-init: 'worker' is safest default (no ANSI, no process access)
const runtime: RuntimeKind = runtimeResult.ok ? runtimeResult.data : DEFAULT_RUNTIME_KIND;

// =============================================================================
// Color & Unicode Configuration
// =============================================================================

/**
 * Detected color support level at module load.
 * Computed via {@link detectColorLevel} for server-side runtimes,
 * with hardcoded values for browser (1) and workers/edge (0).
 */
let currentColorLevel: ColorLevel = (() => {
  // Browser always supports colors (via CSS %c)
  if (runtime === 'browser') {
    return 1 as ColorLevel;
  }
  // Workers and edge runtimes never support ANSI colors
  if (
    runtime === 'worker' ||
    runtime === 'web-worker' ||
    runtime === 'shared-worker' ||
    runtime === 'service-worker' ||
    runtime === 'edge-light' ||
    runtime === 'fastly' ||
    runtime === 'netlify'
  ) {
    return 0 as ColorLevel;
  }
  // Node/Deno/Bun — detect from env
  const envResult: Result<EnvRecordWithUndefined> = getEnvRecord();
  if (!envResult.ok) {
    return 0 as ColorLevel;
  }
  const ttyResult: Result<Bool> = isTTY();
  const tty: Bool = ttyResult.ok ? ttyResult.data : false;
  const colorResult: Result<ColorLevel> = detectColorLevel(
    envResult.data,
    tty,
    envResult.data.CI !== undefined,
  );
  return colorResult.ok ? colorResult.data : (0 as ColorLevel);
})();

/** Whether to apply color styling. Derived from {@link currentColorLevel}. */
let useColors: Bool = currentColorLevel > 0;

/**
 * Whether to use Unicode symbols (true everywhere except Workers).
 * Separate from color styling — Unicode works in non-styled contexts too.
 */
const useUnicode: Bool =
  runtime !== 'worker' &&
  runtime !== 'web-worker' &&
  runtime !== 'shared-worker' &&
  runtime !== 'service-worker' &&
  runtime !== 'edge-light' &&
  runtime !== 'fastly' &&
  runtime !== 'netlify';

/**
 * Override color setting.
 *
 * @param {Bool} enabled - Whether to enable colors.
 * @returns {Result<Void>} `Result<Void>` — success, or a validation error if `enabled` is invalid.
 *
 * @example
 * ```typescript
 * setColors(true);  // enable colors
 * setColors(false); // disable colors
 * ```
 */
export function setColors(enabled: Bool): Result<Void> {
  const input: Result<Bool> = safeParse(BoolSchema, enabled);
  if (!input.ok) {
    return input;
  }
  useColors = input.data;
  if (input.data) {
    currentColorLevel = currentColorLevel > 0 ? currentColorLevel : (1 as ColorLevel);
  } else {
    currentColorLevel = 0 as ColorLevel;
  }
  return ok(VoidSchema, undefined);
}

/**
 * Get current color support level.
 *
 * @returns {Result<ColorLevel>} `Result<ColorLevel>` — current color level (0–3).
 *
 * @example
 * ```typescript
 * const result: Result<ColorLevel> = getColorLevel();
 * if (result.ok) result.data; // 0 | 1 | 2 | 3
 * ```
 */
export function getColorLevel(): Result<ColorLevel> {
  return ok(ColorLevelSchema, currentColorLevel);
}

/**
 * Override color support level.
 *
 * Also updates `useColors` flag (level > 0 = colors enabled).
 *
 * @param {ColorLevel} level - Color level (0–3).
 * @returns {Result<Void>} `Result<Void>` — success, or a validation error.
 *
 * @example
 * ```typescript
 * setColorLevel(3); // force truecolor
 * setColorLevel(0); // disable colors
 * ```
 */
export function setColorLevel(level: ColorLevel): Result<Void> {
  const input: Result<ColorLevel> = safeParse(ColorLevelSchema, level);
  if (!input.ok) {
    return input;
  }
  currentColorLevel = input.data;
  useColors = input.data > 0;
  return ok(VoidSchema, undefined);
}

// =============================================================================
// Terminal Width
// =============================================================================

/**
 * Gets current terminal width.
 * Returns columns if available, otherwise defaults to 80.
 * Safe in all runtimes — returns 80 when `process.stdout` is unavailable.
 *
 * @returns {Result<PositiveInteger>} `Result<PositiveInteger>` — terminal width in columns (always ≥ 1).
 *
 * @example
 * ```typescript
 * const result = getTerminalWidth();
 * // result.data contains the terminal width in columns
 * ```
 */
export function getTerminalWidth(): Result<PositiveInteger> {
  const colsResult: Result<NonNegativeInteger> = getColumns();
  if (!colsResult.ok) {
    return colsResult;
  }
  return safeParse(PositiveIntegerSchema, colsResult.data);
}

/**
 * Truncates a line to fit within terminal width.
 * Wraps core truncateLine with getTerminalWidth() as the default maxWidth.
 *
 * @param {Str} line - String to truncate (may contain ANSI codes).
 * @param {NonNegativeInteger} maxWidth - Maximum visible character width (defaults to terminal width).
 * @returns {Result<Str>} `Result<Str>` — truncated string, or a validation error.
 *
 * @example
 * ```typescript
 * const result = truncateLine('A very long line of text...');
 * if (result.ok) result.data; // truncated text
 * ```
 */
export function truncateLine(line: Str, maxWidth?: NonNegativeInteger): Result<Str> {
  const input: Result<Str> = safeParse(StrSchema, line);
  if (!input.ok) {
    return input;
  }

  if (maxWidth !== undefined) {
    const maxWidthResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      maxWidth,
    );
    if (!maxWidthResult.ok) {
      return maxWidthResult;
    }
    return coreTruncateLine(input.data, maxWidthResult.data as NonNegativeInteger);
  }

  const widthResult: Result<PositiveInteger> = getTerminalWidth();
  if (!widthResult.ok) {
    return widthResult;
  }
  const width: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, widthResult.data);
  if (!width.ok) {
    return width;
  }
  return coreTruncateLine(input.data, width.data as NonNegativeInteger);
}

// =============================================================================
// ANSI Escape Codes
// =============================================================================

/** ANSI escape code map. Keys match {@link StyleNameSchema} values plus `reset`. */
const codes = {
  reset: '\u001B[0m',
  // Text decoration
  bold: '\u001B[1m',
  dim: '\u001B[2m',
  italic: '\u001B[3m',
  underline: '\u001B[4m',
  inverse: '\u001B[7m',
  strikethrough: '\u001B[9m',
  // Foreground colors
  red: '\u001B[31m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  blue: '\u001B[34m',
  magenta: '\u001B[35m',
  cyan: '\u001B[36m',
  white: '\u001B[37m',
  gray: '\u001B[90m',
} as const satisfies Record<StyleName | 'reset', Str>;

// =============================================================================
// Platform Output
// =============================================================================

/** Maps ANSI SGR parameter numbers to CSS style strings for browser console. */
const ansiToCss: Record<Str, Str> = {
  '0': '',
  '1': 'font-weight:bold',
  '2': 'opacity:0.7',
  '3': 'font-style:italic',
  '4': 'text-decoration:underline',
  '7': 'filter:invert(1)',
  '9': 'text-decoration:line-through',
  '31': 'color:#e74c3c',
  '32': 'color:#2ecc71',
  '33': 'color:#f39c12',
  '34': 'color:#3498db',
  '35': 'color:#9b59b6',
  '36': 'color:#1abc9c',
  '37': 'color:#ecf0f1',
  '90': 'color:#95a5a6',
};

/**
 * Converts an ANSI-coded string to browser `console.log` arguments.
 *
 * Splits on ANSI escape sequences, inserting `%c` directives and
 * accumulating CSS strings. Returns `[formatString, ...cssArgs]`.
 *
 * @param text - String with embedded ANSI escape codes.
 * @returns Array where `[0]` is `%c`-annotated format string, `[1..n]` are CSS strings.
 */
function ansiToBrowserArgs(text: Str): Str[] {
  const parts: Str[] = [];
  const cssArgs: Str[] = [];
  const ansiRegex = new RegExp(`${String.fromCodePoint(0x1b)}${String.raw`\[([0-9;]*)m`}`, 'g');
  let lastIndex = 0;
  let currentCss: Str[] = [];
  let match: NullableRegExpExecArray;

  while ((match = ansiRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push('%c');
      parts.push(text.slice(lastIndex, match.index));
      cssArgs.push(currentCss.join(';'));
    }
    const sgr: Str[] = (match[1] ?? '').split(';');
    for (const code of sgr) {
      if (code === '0' || code === '') {
        currentCss = [];
      } else {
        const css: OptionalStr = ansiToCss[code];
        if (css) {
          currentCss.push(css);
        }
      }
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push('%c');
    parts.push(text.slice(lastIndex));
    cssArgs.push(currentCss.join(';'));
  }

  if (parts.length === 0) {
    return [text];
  }
  return [parts.join(''), ...cssArgs];
}

/**
 * Platform-aware console output.
 *
 * - **Node:** passes ANSI-coded text directly to `console.log`/`console.error`.
 * - **Browser:** converts ANSI codes to `%c` CSS directives.
 * - **Worker:** text has no ANSI codes (`useColors=false`), passes through plain.
 *
 * @remarks Fire-and-forget internal function — cannot return `Result` because
 *   it is the lowest-level output primitive used by the logging system itself.
 *
 * @param stream - Output stream: `'stdout'` → `console.log`, `'stderr'` → `console.error`.
 * @param text - Text to output (may contain ANSI escape codes).
 */
function platformLog(stream: PrintStream, text: Str): void {
  // Fire-and-forget — lowest-level output primitive, cannot return Result
  const fn: ConsoleLogFn = stream === 'stderr' ? console.error : console.log;
  if (runtime === 'browser' && useColors) {
    const args: Str[] = ansiToBrowserArgs(text);
    fn(...args);
  } else {
    fn(text);
  }
}

// =============================================================================
// Style
// =============================================================================

/**
 * Apply a single ANSI style to text. Returns plain text when colors disabled.
 *
 * @param text - Text to style.
 * @param name - Style name (bold, dim, italic, underline, inverse, strikethrough, red, green, yellow, blue, cyan, magenta, white, gray).
 * @returns `Result<Str>` — styled text, or a validation error.
 */
function applyStyle(text: Str, name: StyleName): Result<Str> {
  const textResult: Result<Str> = safeParse(StrSchema, text);
  if (!textResult.ok) {
    return textResult;
  }
  const nameResult: Result<StyleName> = safeParse(StyleNameSchema, name);
  if (!nameResult.ok) {
    return nameResult;
  }

  if (!useColors) {
    return ok(StrSchema, textResult.data);
  }
  const code: OptionalStr = codes[nameResult.data];
  if (!code) {
    return ok(StrSchema, textResult.data);
  }
  return ok(StrSchema, `${code}${textResult.data}${codes.reset}`);
}

/**
 * ANSI text styling object. Each method validates input and returns `Result<Str>`.
 * When colors are disabled, returns the input unchanged.
 *
 * Compose via nesting: `style.bold(style.red(text).data)` (after checking `.ok`).
 *
 * @example
 * ```typescript
 * const result = style.bold('Important');
 * if (result.ok) result.data; // styled text
 *
 * const nested = style.bold('Error');
 * if (nested.ok) {
 *   const red = style.red(nested.data);
 *   if (red.ok) red.data; // bold red text
 * }
 * ```
 */
export const style = {
  /**
   * Apply bold style.
   *
   * @param text - Text to style
   * @returns Result containing the styled text
   */
  bold: (text: Str): Result<Str> => applyStyle(text, 'bold'),
  /**
   * Apply dim style.
   *
   * @param text - Text to style
   * @returns Result containing the styled text
   */
  dim: (text: Str): Result<Str> => applyStyle(text, 'dim'),
  /**
   * Apply italic style.
   *
   * @param text - Text to style
   * @returns Result containing the styled text
   */
  italic: (text: Str): Result<Str> => applyStyle(text, 'italic'),
  /**
   * Apply underline style.
   *
   * @param text - Text to style
   * @returns Result containing the styled text
   */
  underline: (text: Str): Result<Str> => applyStyle(text, 'underline'),
  /**
   * Apply inverse style.
   *
   * @param text - Text to style
   * @returns Result containing the styled text
   */
  inverse: (text: Str): Result<Str> => applyStyle(text, 'inverse'),
  /**
   * Apply strikethrough style.
   *
   * @param text - Text to style
   * @returns Result containing the styled text
   */
  strikethrough: (text: Str): Result<Str> => applyStyle(text, 'strikethrough'),
  /**
   * Apply red color.
   *
   * @param text - Text to style
   * @returns Result containing the styled text
   */
  red: (text: Str): Result<Str> => applyStyle(text, 'red'),
  /**
   * Apply green color.
   *
   * @param text - Text to style
   * @returns Result containing the styled text
   */
  green: (text: Str): Result<Str> => applyStyle(text, 'green'),
  /**
   * Apply yellow color.
   *
   * @param text - Text to style
   * @returns Result containing the styled text
   */
  yellow: (text: Str): Result<Str> => applyStyle(text, 'yellow'),
  /**
   * Apply blue color.
   *
   * @param text - Text to style
   * @returns Result containing the styled text
   */
  blue: (text: Str): Result<Str> => applyStyle(text, 'blue'),
  /**
   * Apply cyan color.
   *
   * @param text - Text to style
   * @returns Result containing the styled text
   */
  cyan: (text: Str): Result<Str> => applyStyle(text, 'cyan'),
  /**
   * Apply magenta color.
   *
   * @param text - Text to style
   * @returns Result containing the styled text
   */
  magenta: (text: Str): Result<Str> => applyStyle(text, 'magenta'),
  /**
   * Apply white color.
   *
   * @param text - Text to style
   * @returns Result containing the styled text
   */
  white: (text: Str): Result<Str> => applyStyle(text, 'white'),
  /**
   * Apply gray color.
   *
   * @param text - Text to style
   * @returns Result containing the styled text
   */
  gray: (text: Str): Result<Str> => applyStyle(text, 'gray'),
  /**
   * Alias for {@link gray}.
   *
   * @param text - Text to style
   * @returns Result containing the styled text
   */
  grey: (text: Str): Result<Str> => applyStyle(text, 'gray'),
} as const;

// =============================================================================
// Markup
// =============================================================================

/**
 * Strips `{tag}...{/}` markup and resolves `{symbol:name}` to characters,
 * without applying any ANSI/CSS styling. Used when delegating to the base
 * logger in JSON mode, where styled output is replaced by structured entries.
 *
 * @param text - String with optional `{tag}...{/}` and `{symbol:name}` markup.
 * @returns `Result<Str>` — plain text with tags removed and symbols resolved.
 */
function stripMarkup(text: Str): Result<Str> {
  const input: Result<Str> = safeParse(StrSchema, text);
  if (!input.ok) {
    return input;
  }

  // Replace {symbol:name} with actual characters
  const withSymbols: Str = input.data.replaceAll(
    /\{symbol:(\w+)\}/g,
    (_match: string, name: string): string => {
      const symNameResult: Result<SymbolName> = safeParse(SymbolNameSchema, name);
      if (!symNameResult.ok) {
        return _match;
      }
      return symbols[symNameResult.data];
    },
  );

  // Strip {tag}...{/} — keep content, remove tags
  const stripped: Str = withSymbols.replaceAll(
    /\{(bold|dim|italic|underline|inverse|strikethrough|red|green|yellow|blue|cyan|magenta|white|gray)\}(.*?)\{\/\}/gs,
    (_match: string, _tag: string, content: string): string => content,
  );
  return ok(StrSchema, stripped);
}

/**
 * Parse inline style and symbol markup, applying ANSI codes.
 *
 * **Style syntax:** `{tag}text{/}` where tag is bold|dim|italic|underline|inverse|strikethrough|red|green|yellow|blue|cyan|magenta|white|gray.
 * **Symbol syntax:** `{symbol:name}` where name is a key from the {@link symbols} object.
 *
 * Strips style tags when colors are disabled. Unrecognized tags pass through unchanged.
 * Supports nesting: `{bold}{red}text{/}{/}` (global regex replaces inner-to-outer).
 *
 * **Validation behavior (safe by design):**
 * - Unrecognized style tags (`{blink}text{/}`) — pass through unchanged.
 * - Unclosed style tags (`{bold}text`) — pass through as literal text.
 * - Invalid symbol names (`{symbol:bogus}`) — pass through as literal `{symbol:bogus}`.
 * - Malformed symbol syntax (`{symbol:}`, `{symbol}`) — pass through unchanged.
 *
 * @param {Str} text - String with optional `{tag}...{/}` and `{symbol:name}` markup.
 * @returns {Result<Str>} `Result<Str>` — string with ANSI codes and symbols applied (or tags stripped).
 *
 * @example
 * ```typescript
 * const result = renderMarkup('{bold}Title{/} {symbol:success} done');
 * if (result.ok) result.data; // "Title ✔ done" (with ANSI bold)
 *
 * renderMarkup('  {green}{symbol:success}{/} All tests passed');
 * renderMarkup('{dim}[DEBUG] cache hit{/}');
 * ```
 */
export function renderMarkup(text: Str): Result<Str> {
  const input: Result<Str> = safeParse(StrSchema, text);
  if (!input.ok) {
    return input;
  }

  // Pass 1: Replace {symbol:name} with actual symbol characters
  // .replace() callback receives native `string` params — Str is non-branded, direct assignment works
  const withSymbols: Str = input.data.replaceAll(
    /\{symbol:(\w+)\}/g,
    (_match: string, name: string): string => {
      const symNameResult: Result<SymbolName> = safeParse(SymbolNameSchema, name);
      if (!symNameResult.ok) {
        return _match;
      }
      return symbols[symNameResult.data];
    },
  );

  // Pass 2: Replace {tag}...{/} with ANSI codes
  // .replace() callback receives native `string` params — Str is non-branded, direct assignment works
  const rendered: Str = withSymbols.replaceAll(
    /\{(bold|dim|italic|underline|inverse|strikethrough|red|green|yellow|blue|cyan|magenta|white|gray)\}(.*?)\{\/\}/gs,
    (_match: string, tag: string, content: string): string => {
      if (!useColors) {
        return content;
      }
      const styleResult: Result<StyleName> = safeParse(StyleNameSchema, tag);
      if (!styleResult.ok) {
        return content;
      }
      const code: OptionalStr = codes[styleResult.data];
      return code ? `${code}${content}${codes.reset}` : content;
    },
  );
  return ok(StrSchema, rendered);
}

// =============================================================================
// Symbols
// =============================================================================

/**
 * Unicode symbols with ASCII fallbacks.
 * Reactive to `useUnicode` — each access reads the current Unicode setting.
 *
 * **Status:** success (✔), error (✖), warning (⚠), info (ℹ).
 * **Navigation:** arrow (→), arrowDown (↓), arrowUp (↑), arrowLeft (←), arrowRight (→).
 * **Punctuation:** bullet (●), dot (·), ellipsis (…), dash (─), star (★), plus (+), minus (-), pipe (│).
 * **Checkbox/Toggle:** check (✔), cross (✖), checkDouble (✔✔), radioOn (◉), radioOff (◯), toggleOn (●), toggleOff (○).
 * **Box drawing:** boxTopLeft (┌), boxTopRight (┐), boxBottomLeft (└), boxBottomRight (┘),
 *   boxVertical (│), boxHorizontal (─), boxVerticalRight (├), boxVerticalLeft (┤).
 * **Progress:** progressFilled (█), progressEmpty (░).
 * **Tree:** tree (├─), treeLast (└─).
 */
export const symbols = {
  // Status
  get success() {
    return useUnicode ? '✔' : '[OK]';
  },
  get error() {
    return useUnicode ? '✖' : '[ERR]';
  },
  get warning() {
    return useUnicode ? '⚠' : '[!]';
  },
  get info() {
    return useUnicode ? 'ℹ' : '[i]';
  },
  // Navigation
  get bullet() {
    return useUnicode ? '●' : '*';
  },
  get dot() {
    return useUnicode ? '·' : '.';
  },
  get arrow() {
    return useUnicode ? '→' : '->';
  },
  get arrowDown() {
    return useUnicode ? '↓' : 'v';
  },
  get arrowUp() {
    return useUnicode ? '↑' : '^';
  },
  get arrowLeft() {
    return useUnicode ? '←' : '<-';
  },
  get arrowRight() {
    return useUnicode ? '→' : '->';
  },
  // Punctuation
  get ellipsis() {
    return useUnicode ? '…' : '...';
  },
  get dash() {
    return useUnicode ? '─' : '-';
  },
  get star() {
    return useUnicode ? '★' : '*';
  },
  get plus() {
    return useUnicode ? '+' : '+';
  },
  get minus() {
    return useUnicode ? '-' : '-';
  },
  get pipe() {
    return useUnicode ? '│' : '|';
  },
  // Checkbox/Toggle
  get check() {
    return useUnicode ? '✔' : '[OK]';
  },
  get cross() {
    return useUnicode ? '✖' : '[ERR]';
  },
  get checkDouble() {
    return useUnicode ? '✔✔' : '[OK][OK]';
  },
  get radioOn() {
    return useUnicode ? '◉' : '(*)';
  },
  get radioOff() {
    return useUnicode ? '◯' : '( )';
  },
  get toggleOn() {
    return useUnicode ? '●' : '[x]';
  },
  get toggleOff() {
    return useUnicode ? '○' : '[ ]';
  },
  // Box drawing
  get boxTopLeft() {
    return useUnicode ? '┌' : '+';
  },
  get boxTopRight() {
    return useUnicode ? '┐' : '+';
  },
  get boxBottomLeft() {
    return useUnicode ? '└' : '+';
  },
  get boxBottomRight() {
    return useUnicode ? '┘' : '+';
  },
  get boxVertical() {
    return useUnicode ? '│' : '|';
  },
  get boxHorizontal() {
    return useUnicode ? '─' : '-';
  },
  get boxVerticalRight() {
    return useUnicode ? '├' : '+';
  },
  get boxVerticalLeft() {
    return useUnicode ? '┤' : '+';
  },
  // Progress
  get progressFilled() {
    return useUnicode ? '█' : '#';
  },
  get progressEmpty() {
    return useUnicode ? '░' : '-';
  },
  // Tree
  get tree() {
    return useUnicode ? '├─' : '+-';
  },
  get treeLast() {
    return useUnicode ? '└─' : '+-';
  },
};

// =============================================================================
// Spinner
// =============================================================================

const spinnerFrames: Str[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerIndex = 0;
let spinnerInterval: NullableIntervalId = null;

/**
 * Starts a spinner with a message.
 * Only animates in Node TTY mode. Falls back to a single plain-text log in other runtimes.
 *
 * @param {Str} message - Message to display alongside the spinner.
 * @returns {Result<Void>} `Result<Void>` — success, or a validation error.
 *
 * @example
 * ```typescript
 * startSpinner('Loading...');
 * // ... work ...
 * stopSpinner('Done!');
 * ```
 */
export function startSpinner(message: Str): Result<Void> {
  const input: Result<Str> = safeParse(StrSchema, message);
  if (!input.ok) {
    return input;
  }

  if (!useColors || runtime !== 'node-tty') {
    // Deliberate platformLog — spinner bypasses log.raw() because
    // renderMarkup() would mangle spinner frame characters.
    platformLog('stdout', input.data);
    return ok(VoidSchema, undefined);
  }

  spinnerIndex = 0;
  const frame: Result<Str> = style.cyan(spinnerFrames[spinnerIndex] ?? '');
  if (!frame.ok) {
    return frame;
  }
  writeStdout(`${frame.data} ${input.data}`);

  const zeroCol: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 0);
  if (!zeroCol.ok) {
    return zeroCol;
  }

  spinnerInterval = setInterval(() => {
    spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
    clearLine();
    cursorTo(zeroCol.data as NonNegativeInteger);
    // Fire-and-forget callback — can't propagate Result, use fallback
    const currentFrame: Str = (spinnerFrames[spinnerIndex] ?? '') as Str;
    const f: Result<Str> = style.cyan(currentFrame);
    writeStdout(`${f.ok ? f.data : currentFrame} ${input.data}`);
  }, 80);

  return ok(VoidSchema, undefined);
}

/**
 * Stops the spinner.
 *
 * @param {Str} finalMessage - Optional final message to display after stopping.
 * @returns {Result<Void>} `Result<Void>` — success, or a validation error if `finalMessage` is invalid.
 *
 * @example
 * ```typescript
 * stopSpinner('All done!');
 * ```
 */
export function stopSpinner(finalMessage?: Str): Result<Void> {
  if (finalMessage !== undefined) {
    const input: Result<Str> = safeParse(StrSchema, finalMessage);
    if (!input.ok) {
      return input;
    }
  }

  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
  }

  if (runtime === 'node-tty') {
    clearLine();
    const zeroCol: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 0);
    if (zeroCol.ok) {
      cursorTo(zeroCol.data as NonNegativeInteger);
    }
  }

  if (finalMessage) {
    // Deliberate platformLog — see startSpinner comment.
    platformLog('stdout', finalMessage);
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Progress Bar
// =============================================================================

/**
 * Renders a progress bar string.
 *
 * @param {NonNegativeInteger} current - Current progress value.
 * @param {NonNegativeInteger} total - Total items.
 * @param {PositiveInteger} width - Bar width in characters (defaults to 20).
 * @returns {Result<Str>} `Result<Str>` — formatted progress bar, or a validation error.
 *
 * @example
 * ```typescript
 * const result = progressBar(5, 10, 20);
 * if (result.ok) result.data; // '██████████░░░░░░░░░░  50%'
 * ```
 */
export function progressBar(
  current: NonNegativeInteger,
  total: NonNegativeInteger,
  width: PositiveInteger = DEFAULT_PROGRESS_BAR_WIDTH,
): Result<Str> {
  const currentResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, current);
  if (!currentResult.ok) {
    return currentResult;
  }

  const totalResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, total);
  if (!totalResult.ok) {
    return totalResult;
  }

  const widthResult: Result<PositiveInteger> = safeParse(PositiveIntegerSchema, width);
  if (!widthResult.ok) {
    return widthResult;
  }

  // Internal arithmetic — values provably non-negative from validated inputs
  const currentNum: number = currentResult.data as unknown as number;
  const totalNum: number = totalResult.data as unknown as number;
  const widthNum: number = widthResult.data as unknown as number;
  const percentage: number = totalNum > 0 ? currentNum / totalNum : 0;
  const filled: number = Math.round(percentage * widthNum);
  const empty: number = widthNum - filled;

  const filledBar: Result<Str> = style.green(symbols.progressFilled.repeat(filled));
  if (!filledBar.ok) {
    return filledBar;
  }
  const emptyBar: Result<Str> = style.dim(symbols.progressEmpty.repeat(empty));
  if (!emptyBar.ok) {
    return emptyBar;
  }
  const percentStr: Str = `${Math.round(percentage * 100)}%`.padStart(4);
  const dimPercent: Result<Str> = style.dim(percentStr);
  if (!dimPercent.ok) {
    return dimPercent;
  }

  return ok(StrSchema, `${filledBar.data}${emptyBar.data} ${dimPercent.data}`);
}

// =============================================================================
// Log Object (8 methods)
// =============================================================================

/**
 * Unified logger with markup support.
 *
 * 8 methods covering all output needs:
 * - `print` — universal format-aware output (silent for machine-readable formats)
 * - `info` — info-level message (NOT format-gated, used by views with own format logic)
 * - `warn` — warning with `{symbol:warning}` prefix
 * - `error` — error with `{symbol:error}` prefix to stderr
 * - `debug` — debug with `[DEBUG]` prefix to stderr, accepts optional data
 * - `json` — structured JSON to stdout (always prints)
 * - `raw` — raw output to stdout (always prints, NOT format-gated)
 * - `rawError` — raw output to stderr (always prints)
 *
 * All text methods parse `{tag}...{/}` and `{symbol:name}` markup via {@link renderMarkup}.
 * Output is platform-aware: ANSI in Node, CSS `%c` in browser, plain in Workers.
 *
 * @example
 * ```typescript
 * import { log } from '@/utils/core/terminal';
 *
 * log.print('{bold}{yellow}My Tool{/}{/}');        // format-aware visual output
 * log.print('  {green}{symbol:success}{/} Done!');  // success line
 * log.print('');                                     // blank line (format-aware)
 * log.info('Processing {yellow}config{/}...');       // info (not format-gated)
 * log.warn('{bold}Deprecation:{/} use --format');    // warning with symbol
 * log.error('Failed to read {red}file.ts{/}');       // error with symbol
 * log.debug('Cache hit for {dim}key{/}');            // debug to stderr
 * log.json({ status: 'ok' });                        // structured JSON
 * log.raw('{bold}Usage:{/} tool [options]');          // always prints (help, version)
 * log.rawError('{red}{symbol:error}{/} Fatal');       // always prints to stderr
 * ```
 */

// =============================================================================
// GitHub Actions Workflow Commands
// =============================================================================

/**
 * Emits a GitHub Actions workflow command.
 *
 * @param command - Command name (error, warning, notice, debug, group, endgroup).
 * @param message - Message content.
 * @param properties - Optional properties (file, line, col, title).
 * @returns `Result<Void>`
 */
function emitGitHubCommand(
  command: Str,
  message: Str,
  properties?: { file?: Str; line?: number; col?: number; title?: Str },
): Result<Void> {
  let cmd: Str = `::${command}`;
  if (properties) {
    const props: Str[] = [];
    if (properties.file) {
      props.push(`file=${properties.file}`);
    }
    if (properties.line !== undefined) {
      props.push(`line=${properties.line}`);
    }
    if (properties.col !== undefined) {
      props.push(`col=${properties.col}`);
    }
    if (properties.title) {
      props.push(`title=${properties.title}`);
    }
    if (props.length > 0) {
      cmd = `${cmd} ${props.join(',')}`;
    }
  }
  cmd = `${cmd}::${message}`;
  console.log(cmd);
  return ok(VoidSchema, undefined);
}

/**
 * Starts a GitHub Actions log group.
 *
 * Groups collapse related output in the Actions log viewer.
 *
 * @param {Str} title - Group title shown in the collapsed header.
 * @returns {Result<Void>} `Result<Void>`
 *
 * @example
 * ```typescript
 * startGroup('Installing dependencies');
 * // ... output ...
 * endGroup();
 * ```
 */
export function startGroup(title: Str): Result<Void> {
  const input: Result<Str> = safeParse(StrSchema, title);
  if (!input.ok) {
    return input;
  }
  console.log(`::group::${input.data}`);
  return ok(VoidSchema, undefined);
}

/**
 * Ends a GitHub Actions log group.
 *
 * @returns {Result<Void>} `Result<Void>`
 */
export function endGroup(): Result<Void> {
  console.log('::endgroup::');
  return ok(VoidSchema, undefined);
}

// =============================================================================
// Format-Specific Helpers
// =============================================================================

/**
 * Gets the current output format, returning `undefined` on error.
 *
 * @returns The output format, or `undefined`.
 */
function getCurrentFormat(): OutputFormat | undefined {
  const formatResult: Result<OutputFormat> = getOutputFormat();
  return formatResult.ok ? formatResult.data : undefined;
}

/**
 * Emits a log message in compact format: `LEVEL message` on a single line.
 *
 * @param level - Log level prefix.
 * @param message - Message (markup-stripped).
 * @param stream - Output stream.
 * @returns `Result<Void>`
 */
function emitCompact(level: Str, message: Str, stream: PrintStream): Result<Void> {
  let prefix: Str;
  if (level === 'error') {
    prefix = 'ERR';
  } else if (level === 'warn') {
    prefix = 'WRN';
  } else if (level === 'debug') {
    prefix = 'DBG';
  } else if (level === 'trace') {
    prefix = 'TRC';
  } else {
    prefix = 'INF';
  }
  platformLog(stream, `${prefix} ${message}`);
  return ok(VoidSchema, undefined);
}

export const log = {
  /**
   * Universal output with markup support. Format-aware: silent for machine-readable formats.
   * Respects log level filtering via the `level` option.
   *
   * @param message - Message with optional `{tag}...{/}` and `{symbol:name}` markup.
   * @param options - Optional {@link PrintOptions}: level (default `'info'`), stream (default `'stdout'`).
   * @returns `Result<Void>` — success, or a validation error.
   *
   * @example
   * ```typescript
   * log.print('{bold}{yellow}My Header{/}{/}');
   * log.print('  {green}{symbol:success}{/} Done!');
   * log.print('Error detail', { level: 'error', stream: 'stderr' });
   * log.print('');  // blank line (suppressed for json/junit/github)
   * ```
   */
  print: (message: Str, options?: PrintOptions): Result<Void> => {
    const machineResult: Result<Bool> = isMachineReadable();
    if (!machineResult.ok) {
      return machineResult;
    }
    if (machineResult.data) {
      return ok(VoidSchema, undefined);
    }
    const optionsResult: Result<PrintOptions> = safeParse(PrintOptionsSchema, options ?? {});
    if (!optionsResult.ok) {
      return optionsResult;
    }
    const msgResult: Result<Str> = safeParse(StrSchema, message);
    if (!msgResult.ok) {
      return msgResult;
    }
    const rendered: Result<Str> = renderMarkup(msgResult.data);
    if (!rendered.ok) {
      return rendered;
    }
    const { level } = optionsResult.data;
    const { stream } = optionsResult.data;
    const allowed: Result<Bool> = shouldLog(level);
    if (!allowed.ok) {
      return allowed;
    }
    if (allowed.data) {
      platformLog(stream, rendered.data);
    }
    return ok(VoidSchema, undefined);
  },

  /**
   * Print an info message with markup support. Respects log level (info).
   * In JSON mode, delegates to base logger for structured output.
   *
   * @param message - Message with optional `{tag}...{/}` markup.
   * @returns `Result<Void>` — success, or a validation error.
   */
  info: (message: Str): Result<Void> => {
    const msgResult: Result<Str> = safeParse(StrSchema, message);
    if (!msgResult.ok) {
      return msgResult;
    }
    const allowed: Result<Bool> = shouldLog('info');
    if (!allowed.ok) {
      return allowed;
    }
    if (!allowed.data) {
      return ok(VoidSchema, undefined);
    }

    // GitHub Actions format: emit ::notice:: (checked first so github-mode
    // hits the workflow-command branch rather than falling through to baseLog)
    const format: OutputFormat | undefined = getCurrentFormat();
    if (format === 'github') {
      const stripped: Result<Str> = stripMarkup(msgResult.data);
      const cleanMessage: Str = stripped.ok ? stripped.data : msgResult.data;
      return emitGitHubCommand('notice', cleanMessage);
    }

    // In JSON/JUnit mode, delegate to base logger (strips markup, emits structured entry)
    const machineResult: Result<Bool> = isMachineReadable();
    if (machineResult.ok && machineResult.data) {
      const stripped: Result<Str> = stripMarkup(msgResult.data);
      const cleanMessage: Str = stripped.ok ? stripped.data : msgResult.data;
      return baseLog.info(cleanMessage);
    }

    // Compact format: single-line INF prefix
    if (format === 'compact') {
      const stripped: Result<Str> = stripMarkup(msgResult.data);
      const cleanMessage: Str = stripped.ok ? stripped.data : msgResult.data;
      return emitCompact('info', cleanMessage, 'stdout');
    }

    // Pretty mode: render markup with ANSI/CSS
    const rendered: Result<Str> = renderMarkup(msgResult.data);
    if (!rendered.ok) {
      return rendered;
    }
    platformLog('stdout', rendered.data);
    return ok(VoidSchema, undefined);
  },

  /**
   * Print a warning message with yellow warning symbol prefix.
   * Respects log level (warn). In JSON mode, delegates to base logger.
   *
   * @param message - Message with optional `{tag}...{/}` markup.
   * @returns `Result<Void>` — success, or a validation error.
   */
  warn: (message: Str): Result<Void> => {
    const msgResult: Result<Str> = safeParse(StrSchema, message);
    if (!msgResult.ok) {
      return msgResult;
    }
    const allowed: Result<Bool> = shouldLog('warn');
    if (!allowed.ok) {
      return allowed;
    }
    if (!allowed.data) {
      return ok(VoidSchema, undefined);
    }

    // GitHub Actions format: emit ::warning:: (checked first so github-mode
    // hits the workflow-command branch rather than falling through to baseLog)
    const format: OutputFormat | undefined = getCurrentFormat();
    if (format === 'github') {
      const stripped: Result<Str> = stripMarkup(msgResult.data);
      const cleanMessage: Str = stripped.ok ? stripped.data : msgResult.data;
      return emitGitHubCommand('warning', cleanMessage);
    }

    // In JSON/JUnit mode, delegate to base logger
    const machineResult: Result<Bool> = isMachineReadable();
    if (machineResult.ok && machineResult.data) {
      const stripped: Result<Str> = stripMarkup(msgResult.data);
      const cleanMessage: Str = stripped.ok ? stripped.data : msgResult.data;
      return baseLog.warn(cleanMessage);
    }

    // Compact format
    if (format === 'compact') {
      const stripped: Result<Str> = stripMarkup(msgResult.data);
      const cleanMessage: Str = stripped.ok ? stripped.data : msgResult.data;
      return emitCompact('warn', cleanMessage, 'stdout');
    }

    // Pretty mode: render markup with symbol prefix
    const rendered: Result<Str> = renderMarkup(msgResult.data);
    if (!rendered.ok) {
      return rendered;
    }
    const sym: Result<Str> = style.yellow(symbols.warning);
    if (!sym.ok) {
      return sym;
    }
    platformLog('stdout', `  ${sym.data} ${rendered.data}`);
    return ok(VoidSchema, undefined);
  },

  /**
   * Print an error message with red error symbol prefix to stderr.
   * Respects log level (error). In JSON mode, delegates to base logger.
   *
   * @param message - Message with optional `{tag}...{/}` markup.
   * @returns `Result<Void>` — success, or a validation error.
   */
  error: (message: Str): Result<Void> => {
    const msgResult: Result<Str> = safeParse(StrSchema, message);
    if (!msgResult.ok) {
      return msgResult;
    }
    const allowed: Result<Bool> = shouldLog('error');
    if (!allowed.ok) {
      return allowed;
    }
    if (!allowed.data) {
      return ok(VoidSchema, undefined);
    }

    // GitHub Actions format: emit ::error:: (checked first so github-mode
    // hits the workflow-command branch rather than falling through to baseLog)
    const format: OutputFormat | undefined = getCurrentFormat();
    if (format === 'github') {
      const stripped: Result<Str> = stripMarkup(msgResult.data);
      const cleanMessage: Str = stripped.ok ? stripped.data : msgResult.data;
      return emitGitHubCommand('error', cleanMessage);
    }

    // In JSON/JUnit mode, delegate to base logger
    const machineResult: Result<Bool> = isMachineReadable();
    if (machineResult.ok && machineResult.data) {
      const stripped: Result<Str> = stripMarkup(msgResult.data);
      const cleanMessage: Str = stripped.ok ? stripped.data : msgResult.data;
      return baseLog.error(cleanMessage);
    }

    // Compact format
    if (format === 'compact') {
      const stripped: Result<Str> = stripMarkup(msgResult.data);
      const cleanMessage: Str = stripped.ok ? stripped.data : msgResult.data;
      return emitCompact('error', cleanMessage, 'stderr');
    }

    // Pretty mode: render markup with symbol prefix
    const rendered: Result<Str> = renderMarkup(msgResult.data);
    if (!rendered.ok) {
      return rendered;
    }
    const sym: Result<Str> = style.red(symbols.error);
    if (!sym.ok) {
      return sym;
    }
    platformLog('stderr', `  ${sym.data} ${rendered.data}`);
    return ok(VoidSchema, undefined);
  },

  /**
   * Print a debug message with dimmed `[DEBUG]` prefix to stderr.
   * Respects log level (debug). Accepts optional structured data.
   * In JSON mode, delegates to base logger with data payload.
   *
   * @param message - Message with optional `{tag}...{/}` markup.
   * @param data - Optional serializable data to include after the message.
   * @returns `Result<Void>` — success, or a validation error.
   */
  debug: (message: Str, data?: JsonData): Result<Void> => {
    const msgResult: Result<Str> = safeParse(StrSchema, message);
    if (!msgResult.ok) {
      return msgResult;
    }
    const allowed: Result<Bool> = shouldLog('debug');
    if (!allowed.ok) {
      return allowed;
    }
    if (!allowed.data) {
      return ok(VoidSchema, undefined);
    }

    // GitHub Actions format: emit ::debug:: (checked first so github-mode
    // hits the workflow-command branch rather than falling through to baseLog)
    const format: OutputFormat | undefined = getCurrentFormat();
    if (format === 'github') {
      const stripped: Result<Str> = stripMarkup(msgResult.data);
      const cleanMessage: Str = stripped.ok ? stripped.data : msgResult.data;
      return emitGitHubCommand('debug', cleanMessage);
    }

    // In JSON/JUnit mode, delegate to base logger
    const machineResult: Result<Bool> = isMachineReadable();
    if (machineResult.ok && machineResult.data) {
      const stripped: Result<Str> = stripMarkup(msgResult.data);
      const cleanMessage: Str = stripped.ok ? stripped.data : msgResult.data;
      return baseLog.debug(cleanMessage, data);
    }

    // Compact format
    if (format === 'compact') {
      const stripped: Result<Str> = stripMarkup(msgResult.data);
      const cleanMessage: Str = stripped.ok ? stripped.data : msgResult.data;
      return emitCompact('debug', cleanMessage, 'stderr');
    }

    // Pretty mode: render markup with styled [DEBUG] prefix
    const rendered: Result<Str> = renderMarkup(msgResult.data);
    if (!rendered.ok) {
      return rendered;
    }
    const styled: Result<Str> = style.dim(`[DEBUG] ${rendered.data}`);
    if (!styled.ok) {
      return styled;
    }
    if (data === undefined) {
      platformLog('stderr', `${styled.data}`);
    } else {
      platformLog('stderr', `${styled.data}`);
      console.error(data);
    }
    return ok(VoidSchema, undefined);
  },

  /**
   * Print data as formatted JSON to stdout. Always prints regardless of log level or format.
   *
   * @param data - Serializable data to stringify.
   * @param indent - Indentation level (defaults to 2).
   * @returns `Result<Void>` — success, or a validation error.
   */
  json: (data: JsonData, indent?: NonNegativeInteger): Result<Void> => {
    let validatedIndent: NonNegativeInteger = DEFAULT_JSON_INDENT;
    if (indent !== undefined) {
      const indentResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, indent);
      if (!indentResult.ok) {
        return indentResult;
      }
      validatedIndent = indentResult.data as NonNegativeInteger;
    }
    const jsonResult: Result<Str> = safeStringify(data, validatedIndent);
    if (!jsonResult.ok) {
      return jsonResult;
    }
    console.log(jsonResult.data);
    return ok(VoidSchema, undefined);
  },

  /**
   * Print raw output with markup support to stdout. Always prints regardless of log level.
   * NOT format-gated — prints even for machine-readable formats.
   * Use for help screens, version output, and structured output that must always appear.
   *
   * @param message - Raw text with optional `{tag}...{/}` and `{symbol:name}` markup.
   * @returns `Result<Void>` — success, or a validation error.
   */
  raw: (message: Str): Result<Void> => {
    const msgResult: Result<Str> = safeParse(StrSchema, message);
    if (!msgResult.ok) {
      return msgResult;
    }
    const rendered: Result<Str> = renderMarkup(msgResult.data);
    if (!rendered.ok) {
      return rendered;
    }
    platformLog('stdout', rendered.data);
    return ok(VoidSchema, undefined);
  },

  /**
   * Print a trace message with dimmed `[TRACE]` prefix to stderr.
   * Most verbose level — below debug. Accepts optional structured data.
   * In JSON mode, delegates to base logger with data payload.
   *
   * @param message - Message with optional `{tag}...{/}` markup.
   * @param data - Optional serializable data to include after the message.
   * @returns `Result<Void>` — success, or a validation error.
   */
  trace: (message: Str, data?: JsonData): Result<Void> => {
    const msgResult: Result<Str> = safeParse(StrSchema, message);
    if (!msgResult.ok) {
      return msgResult;
    }
    const allowed: Result<Bool> = shouldLog('trace');
    if (!allowed.ok) {
      return allowed;
    }
    if (!allowed.data) {
      return ok(VoidSchema, undefined);
    }

    // GitHub Actions format: emit ::debug:: — GitHub has no trace level (checked
    // first so github-mode hits the workflow-command branch rather than baseLog)
    const format: OutputFormat | undefined = getCurrentFormat();
    if (format === 'github') {
      const stripped: Result<Str> = stripMarkup(msgResult.data);
      const cleanMessage: Str = stripped.ok ? stripped.data : msgResult.data;
      return emitGitHubCommand('debug', cleanMessage);
    }

    // In JSON/JUnit mode, delegate to base logger
    const machineResult: Result<Bool> = isMachineReadable();
    if (machineResult.ok && machineResult.data) {
      const stripped: Result<Str> = stripMarkup(msgResult.data);
      const cleanMessage: Str = stripped.ok ? stripped.data : msgResult.data;
      return baseLog.trace(cleanMessage, data);
    }

    // Compact format
    if (format === 'compact') {
      const stripped: Result<Str> = stripMarkup(msgResult.data);
      const cleanMessage: Str = stripped.ok ? stripped.data : msgResult.data;
      return emitCompact('trace', cleanMessage, 'stderr');
    }

    // Pretty mode: render markup with styled [TRACE] prefix
    const rendered: Result<Str> = renderMarkup(msgResult.data);
    if (!rendered.ok) {
      return rendered;
    }
    const styled: Result<Str> = style.dim(`[TRACE] ${rendered.data}`);
    if (!styled.ok) {
      return styled;
    }
    if (data === undefined) {
      platformLog('stderr', `${styled.data}`);
    } else {
      platformLog('stderr', `${styled.data}`);
      console.error(data);
    }
    return ok(VoidSchema, undefined);
  },

  /**
   * Print raw output with markup support to stderr. Always prints regardless of log level.
   * Use for fatal error messages that must always appear.
   *
   * @param message - Raw text with optional `{tag}...{/}` and `{symbol:name}` markup.
   * @returns `Result<Void>` — success, or a validation error.
   */
  rawError: (message: Str): Result<Void> => {
    const msgResult: Result<Str> = safeParse(StrSchema, message);
    if (!msgResult.ok) {
      return msgResult;
    }
    const rendered: Result<Str> = renderMarkup(msgResult.data);
    if (!rendered.ok) {
      return rendered;
    }
    platformLog('stderr', rendered.data);
    return ok(VoidSchema, undefined);
  },
} as const;
