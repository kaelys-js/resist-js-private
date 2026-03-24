/**
 * Locale Formatting
 *
 * Locale-aware formatting via `Intl` APIs: numbers, dates, times, relative time,
 * lists, date ranges, display names, percentages, units, and durations.
 * Standalone functions that return `Result<Str>`. Also integrates
 * with `renderMessage()` via `{name, number}` and `{name, date}` blocks.
 *
 * Every function validates inputs via `safeParse` and returns `Result<Str>`.
 * No function throws.
 *
 * @module
 */

import * as v from 'valibot';

import {
  NumSchema,
  StrArraySchema,
  StrSchema,
  type Bool,
  type NullableRegExpMatchArray,
  type Num,
  type OptionalStr,
  type Str,
  type StrArray,
} from '@/schemas/common';
import { ERRORS, type Result, err, ok, okUnchecked } from '@/schemas/result/result';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Schemas
// =============================================================================

/** Valibot schema for date/time format style names. */
export const DateTimeStyleSchema = v.picklist(['short', 'medium', 'long', 'full']);

/** A date/time format style: `'short'`, `'medium'`, `'long'`, or `'full'`. See {@link DateTimeStyleSchema}. */
export type DateTimeStyle = v.InferOutput<typeof DateTimeStyleSchema>;

/** Valibot schema for format kind (date vs time). */
const FormatKindSchema = v.picklist(['date', 'time']);

/** Format kind: `'date'` or `'time'`. */
type FormatKind = v.InferOutput<typeof FormatKindSchema>;

// =============================================================================
// Date/Time Style Mapping
// =============================================================================

/**
 * Maps shorthand style names to `Intl.DateTimeFormatOptions`.
 *
 * @param {DateTimeStyle} style - One of `'short'`, `'medium'`, `'long'`, `'full'`. Typed via `DateTimeStyleSchema`.
 * @param {FormatKind} kind - `'date'` for date-only, `'time'` for time-only. Typed via `FormatKindSchema`.
 * @returns {Result<Intl.DateTimeFormatOptions>} Intl.DateTimeFormatOptions for the given style.
 */
function styleToOptions(
  style: DateTimeStyle,
  kind: FormatKind,
): Result<Intl.DateTimeFormatOptions> {
  const styleResult: Result<DateTimeStyle> = safeParse(DateTimeStyleSchema, style);

  if (!styleResult.ok) {
    return styleResult;
  }

  const kindResult: Result<FormatKind> = safeParse(FormatKindSchema, kind);

  if (!kindResult.ok) {
    return kindResult;
  }

  if (kindResult.data === 'time') {
    const map: Record<Str, Intl.DateTimeFormatOptions> = {
      short: { hour: 'numeric', minute: 'numeric' },
      medium: { hour: 'numeric', minute: 'numeric', second: 'numeric' },
      long: { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short' },
      full: { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'long' },
    };

    const opts: Intl.DateTimeFormatOptions = map[styleResult.data] ?? map['medium'] ?? {}; // cast safe: all 4 picklist values are keys in map

    return okUnchecked<Intl.DateTimeFormatOptions>(opts);
  }

  // date
  const map: Record<Str, Intl.DateTimeFormatOptions> = {
    short: { year: 'numeric', month: 'numeric', day: 'numeric' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
  };

  const opts: Intl.DateTimeFormatOptions = map[styleResult.data] ?? map['medium'] ?? {}; // cast safe: all 4 picklist values are keys in map

  return okUnchecked<Intl.DateTimeFormatOptions>(opts);
}

/**
 * Coerces a `Date | Num` value into a `Date` object.
 *
 * @param {Date | Num} value - A `Date` object or a Unix timestamp in milliseconds.
 * @returns {Result<Date>} A `Date` object wrapped in Result.
 */
function toDate(value: Date | Num): Result<Date> {
  if (value instanceof Date) {
    return okUnchecked<Date>(value);
  }

  const numResult: Result<Num> = safeParse(NumSchema, value);

  if (!numResult.ok) {
    return numResult;
  }

  return okUnchecked<Date>(new Date(numResult.data));
}

// =============================================================================
// Number Formatting
// =============================================================================

/** Schema for `formatNumber` options. */
const FormatNumberOptionsSchema = v.strictObject({
  /** Intl.NumberFormatOptions. */
  options: v.optional(v.custom<Intl.NumberFormatOptions>((): Bool => true)), // cast safe: external Intl type
});

/** Options for {@link formatNumber}. See {@link FormatNumberOptionsSchema}. */
type FormatNumberOptions = v.InferOutput<typeof FormatNumberOptionsSchema>;

/**
 * Formats a number using `Intl.NumberFormat`.
 *
 * @param {Num} value - The number to format. Validated via `NumSchema`.
 * @param {Str} locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param {FormatNumberOptions} opts - Options. See {@link FormatNumberOptionsSchema}.
 * @returns {Result<Str>} The formatted number string, or an error.
 *
 * @example
 * ```typescript
 * const result = formatNumber(1234567.89, 'en-US', {});
 * // ok('1,234,567.89')
 *
 * const deResult = formatNumber(1234567.89, 'de-DE', {});
 * // ok('1.234.567,89')
 * ```
 */
export function formatNumber(value: Num, locale: Str, opts: FormatNumberOptions): Result<Str> {
  const optsResult: Result<FormatNumberOptions> = safeParse(FormatNumberOptionsSchema, opts);

  if (!optsResult.ok) {
    return optsResult;
  }

  const valueResult: Result<Num> = safeParse(NumSchema, value);

  if (!valueResult.ok) {
    return valueResult;
  }

  const localeResult: Result<Str> = safeParse(StrSchema, locale);

  if (!localeResult.ok) {
    return localeResult;
  }

  try {
    const formatter: Intl.NumberFormat = new Intl.NumberFormat(
      localeResult.data,
      optsResult.data.options,
    );

    const formatted: Str = formatter.format(valueResult.data);

    return ok(StrSchema, formatted);
  } catch (error: unknown) {
    // Intl.NumberFormat constructor or format() threw — convert to typed error
    return err(ERRORS.LOCALE.FORMAT_FAILED, {
      meta: { type: 'number', locale: localeResult.data },
      cause: fromUnknownError(error),
    });
  }
}

/**
 * Formats a number as currency using `Intl.NumberFormat`.
 *
 * @param {Num} value - The monetary amount. Validated via `NumSchema`.
 * @param {Str} locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param {Str} currency - ISO 4217 currency code (e.g., `'USD'`, `'EUR'`). Validated via `StrSchema`.
 * @returns {Result<Str>} The formatted currency string, or an error.
 *
 * @example
 * ```typescript
 * const result = formatCurrency(1234.56, 'en-US', 'USD');
 * // ok('$1,234.56')
 *
 * const eurResult = formatCurrency(1234.56, 'de-DE', 'EUR');
 * // ok('1.234,56 €')
 * ```
 */
export function formatCurrency(value: Num, locale: Str, currency: Str): Result<Str> {
  const valueResult: Result<Num> = safeParse(NumSchema, value);

  if (!valueResult.ok) {
    return valueResult;
  }

  const localeResult: Result<Str> = safeParse(StrSchema, locale);

  if (!localeResult.ok) {
    return localeResult;
  }

  const currencyResult: Result<Str> = safeParse(StrSchema, currency);

  if (!currencyResult.ok) {
    return currencyResult;
  }

  return formatNumber(valueResult.data, localeResult.data, {
    options: {
      style: 'currency',
      currency: currencyResult.data,
    },
  });
}

// =============================================================================
// Date Formatting
// =============================================================================

/** Schema for `formatDate` and `formatTime` options. */
const FormatDateOptionsSchema = v.strictObject({
  /** Predefined format style. */
  style: v.optional(DateTimeStyleSchema),
  /** Raw Intl.DateTimeFormatOptions. Overrides `style` if both provided. */
  options: v.optional(v.custom<Intl.DateTimeFormatOptions>((): Bool => true)), // cast safe: external Intl type
});

/** Options for {@link formatDate} and {@link formatTime}. See {@link FormatDateOptionsSchema}. */
type FormatDateOptions = v.InferOutput<typeof FormatDateOptionsSchema>;

/**
 * Formats a date using `Intl.DateTimeFormat`.
 *
 * @param {Date | Num} value - Date to format (`Date` object or Unix timestamp in milliseconds).
 * @param {Str} locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param {FormatDateOptions} opts - Options. See {@link FormatDateOptionsSchema}.
 * @returns {Result<Str>} The formatted date string, or an error.
 *
 * @example
 * ```typescript
 * const result = formatDate(new Date('2026-02-23'), 'en-US', { style: 'long' });
 * // ok('February 23, 2026')
 *
 * const shortResult = formatDate(new Date('2026-02-23'), 'en-US', { style: 'short' });
 * // ok('2/23/2026')
 * ```
 */
export function formatDate(value: Date | Num, locale: Str, opts: FormatDateOptions): Result<Str> {
  const optsResult: Result<FormatDateOptions> = safeParse(FormatDateOptionsSchema, opts);

  if (!optsResult.ok) {
    return optsResult;
  }

  const localeResult: Result<Str> = safeParse(StrSchema, locale);

  if (!localeResult.ok) {
    return localeResult;
  }

  const dateResult: Result<Date> = toDate(value);

  if (!dateResult.ok) {
    return dateResult;
  }

  const { style, options }: FormatDateOptions = optsResult.data;

  try {
    let formatOptions: Intl.DateTimeFormatOptions = {};

    if (options) {
      formatOptions = options;
    } else if (style) {
      const styleOptsResult: Result<Intl.DateTimeFormatOptions> = styleToOptions(style, 'date');

      if (!styleOptsResult.ok) {
        return styleOptsResult;
      }

      formatOptions = styleOptsResult.data;
    }

    const formatter: Intl.DateTimeFormat = new Intl.DateTimeFormat(
      localeResult.data,
      formatOptions,
    );

    const formatted: Str = formatter.format(dateResult.data);

    return ok(StrSchema, formatted);
  } catch (error: unknown) {
    // Intl.DateTimeFormat threw — convert to typed error
    return err(ERRORS.LOCALE.FORMAT_FAILED, {
      meta: { type: 'date', locale: localeResult.data },
      cause: fromUnknownError(error),
    });
  }
}

/**
 * Formats only the time portion using `Intl.DateTimeFormat`.
 *
 * @param {Date | Num} value - Date to format (`Date` object or Unix timestamp in milliseconds).
 * @param {Str} locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param {FormatDateOptions} opts - Options. See {@link FormatDateOptionsSchema}.
 * @returns {Result<Str>} The formatted time string, or an error.
 *
 * @example
 * ```typescript
 * const result = formatTime(new Date('2026-02-23T14:30:00'), 'en-US', { style: 'short' });
 * // ok('2:30 PM')
 *
 * const longResult = formatTime(new Date('2026-02-23T14:30:00'), 'en-US', { style: 'long' });
 * // ok('2:30:00 PM EST')
 * ```
 */
export function formatTime(value: Date | Num, locale: Str, opts: FormatDateOptions): Result<Str> {
  const optsResult: Result<FormatDateOptions> = safeParse(FormatDateOptionsSchema, opts);

  if (!optsResult.ok) {
    return optsResult;
  }

  const localeResult: Result<Str> = safeParse(StrSchema, locale);

  if (!localeResult.ok) {
    return localeResult;
  }

  const dateResult: Result<Date> = toDate(value);

  if (!dateResult.ok) {
    return dateResult;
  }

  const { style, options }: FormatDateOptions = optsResult.data;

  try {
    let formatOptions: Intl.DateTimeFormatOptions;

    if (options) {
      formatOptions = options;
    } else {
      const styleOptsResult: Result<Intl.DateTimeFormatOptions> = styleToOptions(
        style ?? 'medium',
        'time',
      );

      if (!styleOptsResult.ok) {
        return styleOptsResult;
      }

      formatOptions = styleOptsResult.data;
    }

    const formatter: Intl.DateTimeFormat = new Intl.DateTimeFormat(
      localeResult.data,
      formatOptions,
    );

    const formatted: Str = formatter.format(dateResult.data);

    return ok(StrSchema, formatted);
  } catch (error: unknown) {
    // Intl.DateTimeFormat threw — convert to typed error
    return err(ERRORS.LOCALE.FORMAT_FAILED, {
      meta: { type: 'time', locale: localeResult.data },
      cause: fromUnknownError(error),
    });
  }
}

// =============================================================================
// Schemas — Relative Time
// =============================================================================

/** Valibot schema for relative time unit names. */
export const RelativeTimeUnitSchema = v.picklist([
  'second',
  'minute',
  'hour',
  'day',
  'week',
  'month',
  'quarter',
  'year',
]);

/** A relative time unit. See {@link RelativeTimeUnitSchema}. */
export type RelativeTimeUnit = v.InferOutput<typeof RelativeTimeUnitSchema>;

/** Valibot schema for relative time numeric option. */
export const RelativeTimeNumericSchema = v.picklist(['always', 'auto']);

/** Relative time numeric display. `'auto'` uses "yesterday" instead of "1 day ago". See {@link RelativeTimeNumericSchema}. */
export type RelativeTimeNumeric = v.InferOutput<typeof RelativeTimeNumericSchema>;

/** Valibot schema for relative time style. */
export const RelativeTimeStyleSchema = v.picklist(['long', 'short', 'narrow']);

/** Relative time style. See {@link RelativeTimeStyleSchema}. */
export type RelativeTimeStyle = v.InferOutput<typeof RelativeTimeStyleSchema>;

// =============================================================================
// Relative Time Formatting
// =============================================================================

/** Schema for `formatRelativeTime` options. */
const FormatRelativeTimeOptionsSchema = v.strictObject({
  /** Numeric display: `'always'` (default) or `'auto'` (e.g., "yesterday" instead of "1 day ago"). */
  numeric: v.optional(RelativeTimeNumericSchema, 'always'),
  /** Format style: `'long'` (default), `'short'`, or `'narrow'`. */
  style: v.optional(RelativeTimeStyleSchema, 'long'),
});

/** Options for {@link formatRelativeTime}. See {@link FormatRelativeTimeOptionsSchema}. */
type FormatRelativeTimeOptions = v.InferInput<typeof FormatRelativeTimeOptionsSchema>;

/**
 * Formats a relative time value using `Intl.RelativeTimeFormat`.
 *
 * @param {Num} value - The numeric offset (negative for past, positive for future). Validated via `NumSchema`.
 * @param {RelativeTimeUnit} unit - The time unit. Validated via `RelativeTimeUnitSchema`.
 * @param {Str} locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param {FormatRelativeTimeOptions} opts - Options. See {@link FormatRelativeTimeOptionsSchema}.
 * @returns {Result<Str>} The formatted relative time string, or an error.
 *
 * @example
 * ```typescript
 * formatRelativeTime(-3, 'day', 'en', {});
 * // ok('3 days ago')
 *
 * formatRelativeTime(2, 'hour', 'en', {});
 * // ok('in 2 hours')
 *
 * formatRelativeTime(-1, 'day', 'en', { numeric: 'auto' });
 * // ok('yesterday')
 * ```
 */
export function formatRelativeTime(
  value: Num,
  unit: RelativeTimeUnit,
  locale: Str,
  opts: FormatRelativeTimeOptions,
): Result<Str> {
  const optsResult: Result<v.InferOutput<typeof FormatRelativeTimeOptionsSchema>> = safeParse(
    FormatRelativeTimeOptionsSchema,
    opts,
  );

  if (!optsResult.ok) {
    return optsResult;
  }

  const valueResult: Result<Num> = safeParse(NumSchema, value);

  if (!valueResult.ok) {
    return valueResult;
  }

  const unitResult: Result<RelativeTimeUnit> = safeParse(RelativeTimeUnitSchema, unit);

  if (!unitResult.ok) {
    return unitResult;
  }

  const localeResult: Result<Str> = safeParse(StrSchema, locale);

  if (!localeResult.ok) {
    return localeResult;
  }

  try {
    const formatter: Intl.RelativeTimeFormat = new Intl.RelativeTimeFormat(localeResult.data, {
      numeric: optsResult.data.numeric,
      style: optsResult.data.style,
    });

    const formatted: Str = formatter.format(valueResult.data, unitResult.data);

    return ok(StrSchema, formatted);
  } catch (error: unknown) {
    // Intl.RelativeTimeFormat threw — convert to typed error
    return err(ERRORS.LOCALE.FORMAT_FAILED, {
      meta: { type: 'relativeTime', locale: localeResult.data },
      cause: fromUnknownError(error),
    });
  }
}

// =============================================================================
// Schemas — List Format
// =============================================================================

/** Valibot schema for list format type. */
export const ListFormatTypeSchema = v.picklist(['conjunction', 'disjunction', 'unit']);

/** List format type: `'conjunction'` ("and"), `'disjunction'` ("or"), `'unit'`. See {@link ListFormatTypeSchema}. */
export type ListFormatType = v.InferOutput<typeof ListFormatTypeSchema>;

/** Valibot schema for list format style. */
export const ListFormatStyleSchema = v.picklist(['long', 'short', 'narrow']);

/** List format style. See {@link ListFormatStyleSchema}. */
export type ListFormatStyle = v.InferOutput<typeof ListFormatStyleSchema>;

// =============================================================================
// List Formatting
// =============================================================================

/** Schema for `formatList` options. */
const FormatListOptionsSchema = v.strictObject({
  /** List type: `'conjunction'` ("and"), `'disjunction'` ("or"), `'unit'`. */
  type: v.optional(ListFormatTypeSchema, 'conjunction'),
  /** Display style. */
  style: v.optional(ListFormatStyleSchema, 'long'),
});

/** Options for {@link formatList}. See {@link FormatListOptionsSchema}. */
type FormatListOptions = v.InferInput<typeof FormatListOptionsSchema>;

/**
 * Formats a list of strings using `Intl.ListFormat`.
 *
 * @param {readonly Str[]} items - Array of strings to format. Validated via `StrArraySchema`.
 * @param {Str} locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param {FormatListOptions} opts - Options. See {@link FormatListOptionsSchema}.
 * @returns {Result<Str>} The formatted list string, or an error.
 *
 * @example
 * ```typescript
 * formatList(['Alice', 'Bob', 'Charlie'], 'en', {});
 * // ok('Alice, Bob, and Charlie')
 *
 * formatList(['Alice', 'Bob', 'Charlie'], 'en', { type: 'disjunction' });
 * // ok('Alice, Bob, or Charlie')
 *
 * formatList(['Alice', 'Bob'], 'de', {});
 * // ok('Alice und Bob')
 * ```
 */
export function formatList(
  items: readonly Str[],
  locale: Str,
  opts: FormatListOptions,
): Result<Str> {
  const optsResult: Result<v.InferOutput<typeof FormatListOptionsSchema>> = safeParse(
    FormatListOptionsSchema,
    opts,
  );

  if (!optsResult.ok) {
    return optsResult;
  }

  const itemsResult: Result<StrArray> = safeParse(StrArraySchema, [...items]);

  if (!itemsResult.ok) {
    return itemsResult;
  }

  const localeResult: Result<Str> = safeParse(StrSchema, locale);

  if (!localeResult.ok) {
    return localeResult;
  }

  try {
    const formatter: Intl.ListFormat = new Intl.ListFormat(localeResult.data, {
      type: optsResult.data.type,
      style: optsResult.data.style,
    });

    const formatted: Str = formatter.format(itemsResult.data);

    return ok(StrSchema, formatted);
  } catch (error: unknown) {
    // Intl.ListFormat threw — convert to typed error
    return err(ERRORS.LOCALE.FORMAT_FAILED, {
      meta: { type: 'list', locale: localeResult.data },
      cause: fromUnknownError(error),
    });
  }
}

// =============================================================================
// Date Range Formatting
// =============================================================================

/**
 * Formats a date range using `Intl.DateTimeFormat.formatRange()`.
 *
 * Intelligently omits redundant parts (e.g., same month only shown once).
 *
 * @param {Date | Num} start - Start date (`Date` object or Unix timestamp in ms).
 * @param {Date | Num} end - End date (`Date` object or Unix timestamp in ms).
 * @param {Str} locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param {FormatDateOptions} opts - Options. See {@link FormatDateOptionsSchema}.
 * @returns {Result<Str>} The formatted date range string, or an error.
 *
 * @example
 * ```typescript
 * formatDateRange(
 *   new Date('2026-01-15'),
 *   new Date('2026-02-23'),
 *   'en-US',
 *   { style: 'long' },
 * );
 * // ok('January 15 – February 23, 2026')
 * ```
 */
export function formatDateRange(
  start: Date | Num,
  end: Date | Num,
  locale: Str,
  opts: FormatDateOptions,
): Result<Str> {
  const optsResult: Result<FormatDateOptions> = safeParse(FormatDateOptionsSchema, opts);

  if (!optsResult.ok) {
    return optsResult;
  }

  const localeResult: Result<Str> = safeParse(StrSchema, locale);

  if (!localeResult.ok) {
    return localeResult;
  }

  const startResult: Result<Date> = toDate(start);

  if (!startResult.ok) {
    return startResult;
  }

  const endResult: Result<Date> = toDate(end);

  if (!endResult.ok) {
    return endResult;
  }

  const { style, options }: FormatDateOptions = optsResult.data;

  try {
    let formatOptions: Intl.DateTimeFormatOptions = {};

    if (options) {
      formatOptions = options;
    } else if (style) {
      const styleOptsResult: Result<Intl.DateTimeFormatOptions> = styleToOptions(style, 'date');

      if (!styleOptsResult.ok) {
        return styleOptsResult;
      }

      formatOptions = styleOptsResult.data;
    }

    const formatter: Intl.DateTimeFormat = new Intl.DateTimeFormat(
      localeResult.data,
      formatOptions,
    );

    const formatted: Str = formatter.formatRange(startResult.data, endResult.data);

    return ok(StrSchema, formatted);
  } catch (error: unknown) {
    // Intl.DateTimeFormat.formatRange threw — convert to typed error
    return err(ERRORS.LOCALE.FORMAT_FAILED, {
      meta: { type: 'dateRange', locale: localeResult.data },
      cause: fromUnknownError(error),
    });
  }
}

// =============================================================================
// Schemas — Display Names
// =============================================================================

/** Valibot schema for display name types. */
export const DisplayNameTypeSchema = v.picklist([
  'language',
  'region',
  'script',
  'currency',
  'calendar',
  'dateTimeField',
]);

/** Display name type for `Intl.DisplayNames`. See {@link DisplayNameTypeSchema}. */
export type DisplayNameType = v.InferOutput<typeof DisplayNameTypeSchema>;

/** Valibot schema for display name style. */
export const DisplayNameStyleSchema = v.picklist(['long', 'short', 'narrow']);

/** Display name style. See {@link DisplayNameStyleSchema}. */
export type DisplayNameStyle = v.InferOutput<typeof DisplayNameStyleSchema>;

// =============================================================================
// Display Names
// =============================================================================

/** Schema for `formatDisplayName` options. */
const FormatDisplayNameOptionsSchema = v.strictObject({
  /** Display style. */
  style: v.optional(DisplayNameStyleSchema, 'long'),
});

/** Options for {@link formatDisplayName}. See {@link FormatDisplayNameOptionsSchema}. */
type FormatDisplayNameOptions = v.InferInput<typeof FormatDisplayNameOptionsSchema>;

/**
 * Formats a code (language, region, currency, etc.) into its display name
 * using `Intl.DisplayNames`.
 *
 * @param {Str} code - The code to display (e.g., `'en'`, `'US'`, `'EUR'`). Validated via `StrSchema`.
 * @param {Str} locale - BCP 47 locale tag for the output language. Validated via `StrSchema`.
 * @param {DisplayNameType} type - What the code represents. Validated via `DisplayNameTypeSchema`.
 * @param {FormatDisplayNameOptions} opts - Options. See {@link FormatDisplayNameOptionsSchema}.
 * @returns {Result<Str>} The display name, or an error if the code is unknown.
 *
 * @example
 * ```typescript
 * formatDisplayName('en', 'en', 'language', {});
 * // ok('English')
 *
 * formatDisplayName('en', 'fr', 'language', {});
 * // ok('anglais')
 *
 * formatDisplayName('US', 'en', 'region', {});
 * // ok('United States')
 *
 * formatDisplayName('EUR', 'en', 'currency', {});
 * // ok('Euro')
 * ```
 */
export function formatDisplayName(
  code: Str,
  locale: Str,
  type: DisplayNameType,
  opts: FormatDisplayNameOptions,
): Result<Str> {
  const optsResult: Result<v.InferOutput<typeof FormatDisplayNameOptionsSchema>> = safeParse(
    FormatDisplayNameOptionsSchema,
    opts,
  );

  if (!optsResult.ok) {
    return optsResult;
  }

  const codeResult: Result<Str> = safeParse(StrSchema, code);

  if (!codeResult.ok) {
    return codeResult;
  }

  const localeResult: Result<Str> = safeParse(StrSchema, locale);

  if (!localeResult.ok) {
    return localeResult;
  }

  const typeResult: Result<DisplayNameType> = safeParse(DisplayNameTypeSchema, type);

  if (!typeResult.ok) {
    return typeResult;
  }

  try {
    const formatter: Intl.DisplayNames = new Intl.DisplayNames(localeResult.data, {
      type: typeResult.data,
      style: optsResult.data.style,
    });

    const displayName: OptionalStr = formatter.of(codeResult.data);

    if (displayName === undefined) {
      return err(ERRORS.LOCALE.FORMAT_FAILED, {
        meta: {
          type: 'displayName',
          locale: localeResult.data,
          reason: `Unknown ${typeResult.data} code: ${codeResult.data}`,
        },
      });
    }

    return ok(StrSchema, displayName);
  } catch (error: unknown) {
    // Intl.DisplayNames threw — convert to typed error
    return err(ERRORS.LOCALE.FORMAT_FAILED, {
      meta: { type: 'displayName', locale: localeResult.data },
      cause: fromUnknownError(error),
    });
  }
}

// =============================================================================
// Percent Formatting
// =============================================================================

/**
 * Formats a number as a percentage using `Intl.NumberFormat`.
 *
 * Convenience wrapper for `formatNumber(value, locale, { style: 'percent' })`.
 * Input value is a decimal fraction (e.g., `0.25` for 25%).
 *
 * @param {Num} value - The decimal fraction to format as percent. Validated via `NumSchema`.
 * @param {Str} locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param {FormatNumberOptions} opts - Options. See {@link FormatNumberOptionsSchema}.
 * @returns {Result<Str>} The formatted percentage string, or an error.
 *
 * @example
 * ```typescript
 * formatPercent(0.256, 'en-US', {});
 * // ok('26%')
 *
 * formatPercent(0.256, 'en-US', { options: { minimumFractionDigits: 1 } });
 * // ok('25.6%')
 * ```
 */
export function formatPercent(value: Num, locale: Str, opts: FormatNumberOptions): Result<Str> {
  const optsResult: Result<v.InferOutput<typeof FormatNumberOptionsSchema>> = safeParse(
    FormatNumberOptionsSchema,
    opts,
  );

  if (!optsResult.ok) {
    return optsResult;
  }

  const valueResult: Result<Num> = safeParse(NumSchema, value);

  if (!valueResult.ok) {
    return valueResult;
  }

  const localeResult: Result<Str> = safeParse(StrSchema, locale);

  if (!localeResult.ok) {
    return localeResult;
  }

  return formatNumber(valueResult.data, localeResult.data, {
    options: {
      style: 'percent',
      ...optsResult.data.options,
    },
  });
}

// =============================================================================
// Schemas — Unit
// =============================================================================

/** Valibot schema for Intl.NumberFormat unit display modes. */
export const UnitDisplaySchema = v.picklist(['long', 'short', 'narrow']);

/** Unit display mode. See {@link UnitDisplaySchema}. */
export type UnitDisplay = v.InferOutput<typeof UnitDisplaySchema>;

// =============================================================================
// Unit Formatting
// =============================================================================

/** Schema for `formatUnit` options. */
const FormatUnitOptionsSchema = v.strictObject({
  /** Unit display: `'short'` (default), `'long'`, or `'narrow'`. */
  unitDisplay: v.optional(UnitDisplaySchema, 'short'),
  /** Additional Intl.NumberFormatOptions. */
  options: v.optional(v.custom<Intl.NumberFormatOptions>((): Bool => true)), // cast safe: external Intl type
});

/** Options for {@link formatUnit}. See {@link FormatUnitOptionsSchema}. */
type FormatUnitOptions = v.InferInput<typeof FormatUnitOptionsSchema>;

/**
 * Formats a number with a measurement unit using `Intl.NumberFormat`.
 *
 * Uses `style: 'unit'` with the specified `unit` option. The unit must be a
 * sanctioned single unit identifier (e.g., `'kilometer'`, `'kilogram'`, `'celsius'`)
 * or a compound unit (e.g., `'kilometer-per-hour'`).
 *
 * @param {Num} value - The numeric value. Validated via `NumSchema`.
 * @param {Str} unit - The unit identifier (e.g., `'kilometer-per-hour'`). Validated via `StrSchema`.
 * @param {Str} locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param {FormatUnitOptions} opts - Options. See {@link FormatUnitOptionsSchema}.
 * @returns {Result<Str>} The formatted unit string, or an error.
 *
 * @example
 * ```typescript
 * formatUnit(100, 'kilometer-per-hour', 'en', {});
 * // ok('100 km/h')
 *
 * formatUnit(100, 'kilometer-per-hour', 'en', { unitDisplay: 'long' });
 * // ok('100 kilometers per hour')
 *
 * formatUnit(37.5, 'celsius', 'en', { unitDisplay: 'short' });
 * // ok('37.5°C')
 * ```
 */
export function formatUnit(
  value: Num,
  unit: Str,
  locale: Str,
  opts: FormatUnitOptions,
): Result<Str> {
  const optsResult: Result<v.InferOutput<typeof FormatUnitOptionsSchema>> = safeParse(
    FormatUnitOptionsSchema,
    opts,
  );

  if (!optsResult.ok) {
    return optsResult;
  }

  const valueResult: Result<Num> = safeParse(NumSchema, value);

  if (!valueResult.ok) {
    return valueResult;
  }

  const unitResult: Result<Str> = safeParse(StrSchema, unit);

  if (!unitResult.ok) {
    return unitResult;
  }

  const localeResult: Result<Str> = safeParse(StrSchema, locale);

  if (!localeResult.ok) {
    return localeResult;
  }

  return formatNumber(valueResult.data, localeResult.data, {
    options: {
      style: 'unit',
      unit: unitResult.data,
      unitDisplay: optsResult.data.unitDisplay,
      ...optsResult.data.options,
    },
  });
}

// =============================================================================
// Schemas — Duration
// =============================================================================

/** Valibot schema for duration format style. */
export const DurationStyleSchema = v.picklist(['long', 'short', 'narrow', 'digital']);

/** Duration format style. See {@link DurationStyleSchema}. */
export type DurationStyle = v.InferOutput<typeof DurationStyleSchema>;

/**
 * Valibot schema for a duration input object.
 * All fields are optional — only included units are formatted.
 */
export const DurationInputSchema = v.strictObject({
  /** Number of years. */
  years: v.optional(NumSchema),
  /** Number of months. */
  months: v.optional(NumSchema),
  /** Number of weeks. */
  weeks: v.optional(NumSchema),
  /** Number of days. */
  days: v.optional(NumSchema),
  /** Number of hours. */
  hours: v.optional(NumSchema),
  /** Number of minutes. */
  minutes: v.optional(NumSchema),
  /** Number of seconds. */
  seconds: v.optional(NumSchema),
  /** Number of milliseconds. */
  milliseconds: v.optional(NumSchema),
  /** Number of microseconds. */
  microseconds: v.optional(NumSchema),
  /** Number of nanoseconds. */
  nanoseconds: v.optional(NumSchema),
});

/** Duration input object. See {@link DurationInputSchema}. */
export type DurationInput = v.InferOutput<typeof DurationInputSchema>;

// =============================================================================
// Duration Formatting
// =============================================================================

/** Schema for `formatDuration` options. */
const FormatDurationOptionsSchema = v.strictObject({
  /** Format style: `'long'` (default), `'short'`, `'narrow'`, or `'digital'`. */
  style: v.optional(DurationStyleSchema, 'long'),
});

/** Options for {@link formatDuration}. See {@link FormatDurationOptionsSchema}. */
type FormatDurationOptions = v.InferInput<typeof FormatDurationOptionsSchema>;

/**
 * Formats a duration using `Intl.DurationFormat` (ES2025).
 *
 * Returns an error if `Intl.DurationFormat` is not available in the runtime
 * (Node < 22.6, older browsers).
 *
 * @param {DurationInput} duration - Duration object with optional unit fields. Validated via `DurationInputSchema`.
 * @param {Str} locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param {FormatDurationOptions} opts - Options. See {@link FormatDurationOptionsSchema}.
 * @returns {Result<Str>} The formatted duration string, or an error.
 *
 * @example
 * ```typescript
 * formatDuration({ hours: 1, minutes: 46, seconds: 40 }, 'en', {});
 * // ok('1 hr, 46 min, 40 sec')
 *
 * formatDuration({ hours: 1, minutes: 46, seconds: 40 }, 'en', { style: 'digital' });
 * // ok('1:46:40')
 *
 * formatDuration({ days: 3, hours: 4 }, 'en', { style: 'long' });
 * // ok('3 days, 4 hours')
 * ```
 */
export function formatDuration(
  duration: DurationInput,
  locale: Str,
  opts: FormatDurationOptions,
): Result<Str> {
  const optsResult: Result<v.InferOutput<typeof FormatDurationOptionsSchema>> = safeParse(
    FormatDurationOptionsSchema,
    opts,
  );

  if (!optsResult.ok) {
    return optsResult;
  }

  const durationResult: Result<DurationInput> = safeParse(DurationInputSchema, duration);

  if (!durationResult.ok) {
    return durationResult;
  }

  const localeResult: Result<Str> = safeParse(StrSchema, locale);

  if (!localeResult.ok) {
    return localeResult;
  }

  // Check runtime support — Intl.DurationFormat is ES2025, not available in all runtimes
  if (typeof Intl === 'undefined' || !('DurationFormat' in Intl)) {
    return err(ERRORS.LOCALE.FORMAT_FAILED, {
      meta: {
        type: 'duration',
        locale: localeResult.data,
        reason:
          'Intl.DurationFormat is not available in this runtime. Requires Node 22.6+, Chrome 129+, Firefox 131+, or Safari 16.4+.',
      },
    });
  }

  try {
    // cast safe: irreducible — Intl.DurationFormat not in TS lib es2024, runtime-guarded above
    // cast safe: irreducible — Intl.DurationFormat not in TS lib, runtime-guarded by 'DurationFormat' in Intl check above
    type DurationFormatInstance = { format: (d: DurationInput) => Str };
    type DurationFormatCtor = new (l: Str, o: { style: Str }) => DurationFormatInstance;

    const intlRecord: Record<Str, unknown> = Intl as Record<Str, unknown>; // cast safe: accessing non-standard Intl property
    // eslint camelCase conflict: constructor refs must be PascalCase (new-cap) but vars must be camelCase
    // cast safe: runtime-guarded by 'DurationFormat' in Intl check above
    const DurationFormat: DurationFormatCtor = intlRecord.DurationFormat as DurationFormatCtor;

    const instance: DurationFormatInstance = new DurationFormat(localeResult.data, {
      style: optsResult.data.style,
    });

    const formatted: Str = instance.format(durationResult.data);

    return ok(StrSchema, formatted);
  } catch (error: unknown) {
    // Intl.DurationFormat threw — convert to typed error
    return err(ERRORS.LOCALE.FORMAT_FAILED, {
      meta: { type: 'duration', locale: localeResult.data },
      cause: fromUnknownError(error),
    });
  }
}

// =============================================================================
// ICU Number Skeleton Parser
// =============================================================================

/**
 * Parses an ICU number skeleton string into `Intl.NumberFormatOptions`.
 *
 * Receives the skeleton WITHOUT the `::` prefix.
 *
 * Supported tokens:
 * - `currency/CODE` → `{ style: 'currency', currency: CODE }`
 * - `unit/UNIT` / `measure-unit/UNIT` → `{ style: 'unit', unit: UNIT }`
 * - `compact-short` / `compact-long` → `{ notation: 'compact', compactDisplay }`
 * - `scientific` / `engineering` → notation variants
 * - `sign-always` / `sign-never` / `sign-except-zero` / `sign-auto` → sign display
 * - `percent` → `{ style: 'percent' }`
 * - `group-off` / `group-min2` → grouping separator control
 * - `.00` → exact fraction digits, `.##` → max fraction digits, `.00##` → mixed
 * - `integer` → zero fraction digits
 *
 * Unknown tokens are silently ignored for forward compatibility.
 *
 * @param {Str} skeleton - The skeleton string (without `::` prefix). Validated via `StrSchema`.
 * @returns {Result<Intl.NumberFormatOptions>} Parsed options, or a validation error.
 *
 * @example
 * ```typescript
 * const result = parseNumberSkeleton('currency/USD .00');
 * // ok({ style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
 * ```
 */
export function parseNumberSkeleton(skeleton: Str): Result<Intl.NumberFormatOptions> {
  const skeletonResult: Result<Str> = safeParse(StrSchema, skeleton);

  if (!skeletonResult.ok) {
    return skeletonResult;
  }

  const tokens: Str[] = skeletonResult.data.trim().split(/\s+/);

  const options: Intl.NumberFormatOptions = {};

  for (const token of tokens) {
    if (token === '') {
      continue;
    }

    if (token.startsWith('currency/')) {
      options.style = 'currency';
      options.currency = token.slice('currency/'.length);
      continue;
    }
    if (token.startsWith('unit/') || token.startsWith('measure-unit/')) {
      options.style = 'unit';
      options.unit = token.slice(token.indexOf('/') + 1);
      continue;
    }
    if (token === 'compact-short') {
      options.notation = 'compact';
      options.compactDisplay = 'short';
      continue;
    }
    if (token === 'compact-long') {
      options.notation = 'compact';
      options.compactDisplay = 'long';
      continue;
    }
    if (token === 'scientific') {
      options.notation = 'scientific';
      continue;
    }
    if (token === 'engineering') {
      options.notation = 'engineering';
      continue;
    }
    if (token === 'sign-always') {
      options.signDisplay = 'always';
      continue;
    }
    if (token === 'sign-never') {
      options.signDisplay = 'never';
      continue;
    }
    if (token === 'sign-except-zero') {
      options.signDisplay = 'exceptZero';
      continue;
    }
    if (token === 'sign-auto') {
      options.signDisplay = 'auto';
      continue;
    }
    if (token === 'percent') {
      options.style = 'percent';
      continue;
    }
    if (token === 'group-off') {
      options.useGrouping = false;
      continue;
    }
    if (token === 'group-min2') {
      options.useGrouping = 'min2' as unknown as Intl.NumberFormatOptions['useGrouping']; // Irreducible: 'min2' is valid per ECMA-402 but TS lib types useGrouping as boolean | undefined
      continue;
    }
    if (token === 'integer') {
      options.maximumFractionDigits = 0;
      continue;
    }

    // Fraction digits: .00 (exact min & max)
    const exactMatch: NullableRegExpMatchArray = token.match(/^\.([0]+)$/);

    if (exactMatch?.[1]) {
      options.minimumFractionDigits = exactMatch[1].length;
      options.maximumFractionDigits = exactMatch[1].length;

      continue;
    }

    // Fraction digits: .## (max only)
    const maxMatch: NullableRegExpMatchArray = token.match(/^\.([#]+)$/);

    if (maxMatch?.[1]) {
      options.maximumFractionDigits = maxMatch[1].length;

      continue;
    }

    // Mixed: .00## (min from 0-count, max from 0+# count)
    const mixedMatch: NullableRegExpMatchArray = token.match(/^\.([0]+)([#]+)$/);

    if (mixedMatch?.[1] && mixedMatch[2]) {
      options.minimumFractionDigits = mixedMatch[1].length;
      options.maximumFractionDigits = mixedMatch[1].length + mixedMatch[2].length;
      continue;
    }
    // Unknown token — skip for forward compatibility
  }

  return okUnchecked<Intl.NumberFormatOptions>(options);
}

// =============================================================================
// ICU Date/Time Skeleton Parser
// =============================================================================

/**
 * Parses an ICU date/time skeleton string into `Intl.DateTimeFormatOptions`.
 *
 * Receives the skeleton WITHOUT the `::` prefix.
 *
 * Supported symbols:
 * - `y`/`yy`/`yyyy` — year (numeric/2-digit)
 * - `M`/`MM`/`MMM`/`MMMM` — month (numeric/2-digit/short/long)
 * - `d`/`dd` — day (numeric/2-digit)
 * - `E`/`EE`/`EEE`/`EEEE` — weekday (short/long)
 * - `h`/`hh` — hour 12h (numeric/2-digit)
 * - `H`/`HH` — hour 24h (numeric/2-digit)
 * - `m`/`mm` — minute (numeric/2-digit)
 * - `s`/`ss` — second (numeric/2-digit)
 * - `z`/`zzzz` — timezone name (short/long)
 *
 * Unknown symbols are silently ignored for forward compatibility.
 *
 * @param {Str} skeleton - The skeleton string (without `::` prefix). Validated via `StrSchema`.
 * @returns {Result<Intl.DateTimeFormatOptions>} Parsed options, or a validation error.
 *
 * @example
 * ```typescript
 * const result = parseDateTimeSkeleton('yyyyMMdd');
 * // ok({ year: 'numeric', month: '2-digit', day: '2-digit' })
 * ```
 */
export function parseDateTimeSkeleton(skeleton: Str): Result<Intl.DateTimeFormatOptions> {
  const skeletonResult: Result<Str> = safeParse(StrSchema, skeleton);

  if (!skeletonResult.ok) {
    return skeletonResult;
  }

  const options: Intl.DateTimeFormatOptions = {};

  const s: Str = skeletonResult.data.trim();
  let i: Num = 0;

  while (i < s.length) {
    const ch: Str = s.charAt(i);
    let count: Num = 0;

    while (i < s.length && s[i] === ch) {
      count++;
      i++;
    }

    switch (ch) {
      case 'y': {
        options.year = count === 2 ? '2-digit' : 'numeric';
        break;
      }
      case 'M': {
        if (count >= 4) {
          options.month = 'long';
        } else if (count === 3) {
          options.month = 'short';
        } else if (count === 2) {
          options.month = '2-digit';
        } else {
          options.month = 'numeric';
        }
        break;
      }
      case 'd': {
        options.day = count >= 2 ? '2-digit' : 'numeric';
        break;
      }
      case 'E': {
        options.weekday = count >= 4 ? 'long' : 'short';
        break;
      }
      case 'h': {
        options.hour = count >= 2 ? '2-digit' : 'numeric';
        options.hourCycle = 'h12';
        break;
      }
      case 'H': {
        options.hour = count >= 2 ? '2-digit' : 'numeric';
        options.hourCycle = 'h23';
        break;
      }
      case 'm': {
        options.minute = count >= 2 ? '2-digit' : 'numeric';
        break;
      }
      case 's': {
        options.second = count >= 2 ? '2-digit' : 'numeric';
        break;
      }
      case 'z': {
        options.timeZoneName = count >= 4 ? 'long' : 'short';
        break;
      }
      default: {
        break;
      } // Unknown symbol — skip
    }
  }

  return okUnchecked<Intl.DateTimeFormatOptions>(options);
}
