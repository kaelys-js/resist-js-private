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
	type NullableRegExpMatchArray,
	type Num,
	type Str,
	type StrArray,
} from '@/schemas/common';
import { ERRORS, type Result, err, ok, okUnchecked } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Schemas
// =============================================================================

/** Valibot schema for date/time format style names. */
export const DateTimeStyleSchema = v.picklist(['short', 'medium', 'long', 'full']);

/** A date/time format style: `'short'`, `'medium'`, `'long'`, or `'full'`. */
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
 * @param style - One of `'short'`, `'medium'`, `'long'`, `'full'`. Typed via `DateTimeStyleSchema`.
 * @param kind - `'date'` for date-only, `'time'` for time-only. Typed via `FormatKindSchema`.
 * @returns Intl.DateTimeFormatOptions for the given style.
 */
function styleToOptions(style: DateTimeStyle, kind: FormatKind): Intl.DateTimeFormatOptions {
	if (kind === 'time') {
		const map: Record<Str, Intl.DateTimeFormatOptions> = {
			short: { hour: 'numeric', minute: 'numeric' },
			medium: { hour: 'numeric', minute: 'numeric', second: 'numeric' },
			long: { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short' },
			full: { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'long' },
		};
		// oxlint-disable-next-line typescript/no-non-null-assertion -- 'medium' is a literal key in map, always exists
		return (map[style] ?? map['medium'])!;
	}
	// date
	const map: Record<Str, Intl.DateTimeFormatOptions> = {
		short: { year: 'numeric', month: 'numeric', day: 'numeric' },
		medium: { year: 'numeric', month: 'short', day: 'numeric' },
		long: { year: 'numeric', month: 'long', day: 'numeric' },
		full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
	};
	// oxlint-disable-next-line typescript/no-non-null-assertion -- 'medium' is a literal key in map, always exists
	return (map[style] ?? map['medium'])!;
}

/**
 * Coerces a `Date | Num` value into a `Date` object.
 *
 * @param value - A `Date` object or a Unix timestamp in milliseconds.
 * @returns A `Date` object.
 */
function toDate(value: Date | Num): Date {
	return value instanceof Date ? value : new Date(value);
}

// =============================================================================
// Number Formatting
// =============================================================================

/**
 * Formats a number using `Intl.NumberFormat`.
 *
 * @param value - The number to format. Validated via `NumSchema`.
 * @param locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param options - `Intl.NumberFormatOptions` (style, currency, notation, etc.). Optional.
 * @returns `Result<Str>` — the formatted number string, or an error.
 *
 * @example
 * ```typescript
 * const result = formatNumber(1234567.89, 'en-US', undefined);
 * // ok('1,234,567.89')
 *
 * const deResult = formatNumber(1234567.89, 'de-DE', undefined);
 * // ok('1.234.567,89')
 * ```
 */
export function formatNumber(
	value: Num,
	locale: Str,
	options: Intl.NumberFormatOptions | undefined,
): Result<Str> {
	const valueResult: Result<Num> = safeParse(NumSchema, value);
	if (!valueResult.ok) return valueResult;
	const localeResult: Result<Str> = safeParse(StrSchema, locale);
	if (!localeResult.ok) return localeResult;

	try {
		const formatter: Intl.NumberFormat = new Intl.NumberFormat(localeResult.data, options);
		const formatted: Str = formatter.format(valueResult.data);
		return ok(StrSchema, formatted);
	} catch (error: unknown) {
		return err(ERRORS.LOCALE.FORMAT_FAILED, {
			meta: {
				type: 'number',
				locale: localeResult.data,
				reason: error instanceof Error ? error.message : String(error),
			},
		});
	}
}

/**
 * Formats a number as currency using `Intl.NumberFormat`.
 *
 * @param value - The monetary amount. Validated via `NumSchema`.
 * @param locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param currency - ISO 4217 currency code (e.g., `'USD'`, `'EUR'`). Validated via `StrSchema`.
 * @returns `Result<Str>` — the formatted currency string, or an error.
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
	if (!valueResult.ok) return valueResult;
	const localeResult: Result<Str> = safeParse(StrSchema, locale);
	if (!localeResult.ok) return localeResult;
	const currencyResult: Result<Str> = safeParse(StrSchema, currency);
	if (!currencyResult.ok) return currencyResult;

	return formatNumber(valueResult.data, localeResult.data, {
		style: 'currency',
		currency: currencyResult.data,
	});
}

// =============================================================================
// Date Formatting
// =============================================================================

/**
 * Formats a date using `Intl.DateTimeFormat`.
 *
 * @param value - Date to format (`Date` object or Unix timestamp in milliseconds).
 * @param locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param style - Predefined format. Typed via `DateTimeStyleSchema`. Optional.
 * @param options - `Intl.DateTimeFormatOptions`. Overrides `style` if both provided. Optional.
 * @returns `Result<Str>` — the formatted date string, or an error.
 *
 * @example
 * ```typescript
 * const result = formatDate(new Date('2026-02-23'), 'en-US', 'long', undefined);
 * // ok('February 23, 2026')
 *
 * const shortResult = formatDate(new Date('2026-02-23'), 'en-US', 'short', undefined);
 * // ok('2/23/2026')
 * ```
 */
export function formatDate(
	value: Date | Num,
	locale: Str,
	style?: DateTimeStyle,
	options?: Intl.DateTimeFormatOptions,
): Result<Str> {
	const localeResult: Result<Str> = safeParse(StrSchema, locale);
	if (!localeResult.ok) return localeResult;

	try {
		const dateObj: Date = toDate(value);
		const formatOptions: Intl.DateTimeFormatOptions =
			options ?? (style ? styleToOptions(style, 'date') : {});
		const formatter: Intl.DateTimeFormat = new Intl.DateTimeFormat(
			localeResult.data,
			formatOptions,
		);
		const formatted: Str = formatter.format(dateObj);
		return ok(StrSchema, formatted);
	} catch (error: unknown) {
		return err(ERRORS.LOCALE.FORMAT_FAILED, {
			meta: {
				type: 'date',
				locale: localeResult.data,
				reason: error instanceof Error ? error.message : String(error),
			},
		});
	}
}

/**
 * Formats only the time portion using `Intl.DateTimeFormat`.
 *
 * @param value - Date to format (`Date` object or Unix timestamp in milliseconds).
 * @param locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param style - Time format style. Typed via `DateTimeStyleSchema`. Optional. Defaults to `'medium'`.
 * @param options - `Intl.DateTimeFormatOptions`. Overrides `style` if provided. Optional.
 * @returns `Result<Str>` — the formatted time string, or an error.
 *
 * @example
 * ```typescript
 * const result = formatTime(new Date('2026-02-23T14:30:00'), 'en-US', 'short', undefined);
 * // ok('2:30 PM')
 *
 * const longResult = formatTime(new Date('2026-02-23T14:30:00'), 'en-US', 'long', undefined);
 * // ok('2:30:00 PM EST')
 * ```
 */
export function formatTime(
	value: Date | Num,
	locale: Str,
	style?: DateTimeStyle,
	options?: Intl.DateTimeFormatOptions,
): Result<Str> {
	const localeResult: Result<Str> = safeParse(StrSchema, locale);
	if (!localeResult.ok) return localeResult;

	try {
		const dateObj: Date = toDate(value);
		const formatOptions: Intl.DateTimeFormatOptions =
			options ?? styleToOptions(style ?? 'medium', 'time');
		const formatter: Intl.DateTimeFormat = new Intl.DateTimeFormat(
			localeResult.data,
			formatOptions,
		);
		const formatted: Str = formatter.format(dateObj);
		return ok(StrSchema, formatted);
	} catch (error: unknown) {
		return err(ERRORS.LOCALE.FORMAT_FAILED, {
			meta: {
				type: 'time',
				locale: localeResult.data,
				reason: error instanceof Error ? error.message : String(error),
			},
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

/** A relative time unit. */
export type RelativeTimeUnit = v.InferOutput<typeof RelativeTimeUnitSchema>;

/** Valibot schema for relative time numeric option. */
export const RelativeTimeNumericSchema = v.picklist(['always', 'auto']);

/** Relative time numeric display. `'auto'` uses "yesterday" instead of "1 day ago". */
export type RelativeTimeNumeric = v.InferOutput<typeof RelativeTimeNumericSchema>;

/** Valibot schema for relative time style. */
export const RelativeTimeStyleSchema = v.picklist(['long', 'short', 'narrow']);

/** Relative time style. */
export type RelativeTimeStyle = v.InferOutput<typeof RelativeTimeStyleSchema>;

// =============================================================================
// Relative Time Formatting
// =============================================================================

/**
 * Formats a relative time value using `Intl.RelativeTimeFormat`.
 *
 * @param value - The numeric offset (negative for past, positive for future). Validated via `NumSchema`.
 * @param unit - The time unit. Validated via `RelativeTimeUnitSchema`.
 * @param locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param numeric - `'always'` (default) or `'auto'`. `'auto'` uses "yesterday" instead of "1 day ago".
 * @param style - `'long'` (default), `'short'`, or `'narrow'`.
 * @returns `Result<Str>` — the formatted relative time string, or an error.
 *
 * @example
 * ```typescript
 * formatRelativeTime(-3, 'day', 'en', undefined, undefined);
 * // ok('3 days ago')
 *
 * formatRelativeTime(2, 'hour', 'en', undefined, undefined);
 * // ok('in 2 hours')
 *
 * formatRelativeTime(-1, 'day', 'en', 'auto', undefined);
 * // ok('yesterday')
 * ```
 */
export function formatRelativeTime(
	value: Num,
	unit: RelativeTimeUnit,
	locale: Str,
	numeric?: RelativeTimeNumeric,
	style?: RelativeTimeStyle,
): Result<Str> {
	const valueResult: Result<Num> = safeParse(NumSchema, value);
	if (!valueResult.ok) return valueResult;
	const unitResult: Result<RelativeTimeUnit> = safeParse(RelativeTimeUnitSchema, unit);
	if (!unitResult.ok) return unitResult;
	const localeResult: Result<Str> = safeParse(StrSchema, locale);
	if (!localeResult.ok) return localeResult;
	if (numeric !== undefined) {
		const numericResult: Result<RelativeTimeNumeric> = safeParse(
			RelativeTimeNumericSchema,
			numeric,
		);
		if (!numericResult.ok) return numericResult;
	}
	if (style !== undefined) {
		const styleResult: Result<RelativeTimeStyle> = safeParse(RelativeTimeStyleSchema, style);
		if (!styleResult.ok) return styleResult;
	}

	try {
		const formatter: Intl.RelativeTimeFormat = new Intl.RelativeTimeFormat(localeResult.data, {
			numeric: numeric ?? 'always',
			style: style ?? 'long',
		});
		const formatted: Str = formatter.format(valueResult.data, unitResult.data);
		return ok(StrSchema, formatted);
	} catch (error: unknown) {
		return err(ERRORS.LOCALE.FORMAT_FAILED, {
			meta: {
				type: 'relativeTime',
				locale: localeResult.data,
				reason: error instanceof Error ? error.message : String(error),
			},
		});
	}
}

// =============================================================================
// Schemas — List Format
// =============================================================================

/** Valibot schema for list format type. */
export const ListFormatTypeSchema = v.picklist(['conjunction', 'disjunction', 'unit']);

/** List format type: `'conjunction'` ("and"), `'disjunction'` ("or"), `'unit'`. */
export type ListFormatType = v.InferOutput<typeof ListFormatTypeSchema>;

/** Valibot schema for list format style. */
export const ListFormatStyleSchema = v.picklist(['long', 'short', 'narrow']);

/** List format style. */
export type ListFormatStyle = v.InferOutput<typeof ListFormatStyleSchema>;

// =============================================================================
// List Formatting
// =============================================================================

/**
 * Formats a list of strings using `Intl.ListFormat`.
 *
 * @param items - Array of strings to format. Validated via `StrArraySchema`.
 * @param locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param type - List type: `'conjunction'` (default, "and"), `'disjunction'` ("or"), `'unit'`.
 * @param style - Display style: `'long'` (default), `'short'`, `'narrow'`.
 * @returns `Result<Str>` — the formatted list string, or an error.
 *
 * @example
 * ```typescript
 * formatList(['Alice', 'Bob', 'Charlie'], 'en', undefined, undefined);
 * // ok('Alice, Bob, and Charlie')
 *
 * formatList(['Alice', 'Bob', 'Charlie'], 'en', 'disjunction', undefined);
 * // ok('Alice, Bob, or Charlie')
 *
 * formatList(['Alice', 'Bob'], 'de', undefined, undefined);
 * // ok('Alice und Bob')
 * ```
 */
export function formatList(
	items: readonly Str[],
	locale: Str,
	type?: ListFormatType,
	style?: ListFormatStyle,
): Result<Str> {
	const itemsResult: Result<StrArray> = safeParse(StrArraySchema, [...items]);
	if (!itemsResult.ok) return itemsResult;
	const localeResult: Result<Str> = safeParse(StrSchema, locale);
	if (!localeResult.ok) return localeResult;
	if (type !== undefined) {
		const typeResult: Result<ListFormatType> = safeParse(ListFormatTypeSchema, type);
		if (!typeResult.ok) return typeResult;
	}
	if (style !== undefined) {
		const styleResult: Result<ListFormatStyle> = safeParse(ListFormatStyleSchema, style);
		if (!styleResult.ok) return styleResult;
	}

	try {
		const formatter: Intl.ListFormat = new Intl.ListFormat(localeResult.data, {
			type: type ?? 'conjunction',
			style: style ?? 'long',
		});
		const formatted: Str = formatter.format(itemsResult.data);
		return ok(StrSchema, formatted);
	} catch (error: unknown) {
		return err(ERRORS.LOCALE.FORMAT_FAILED, {
			meta: {
				type: 'list',
				locale: localeResult.data,
				reason: error instanceof Error ? error.message : String(error),
			},
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
 * @param start - Start date (`Date` object or Unix timestamp in ms).
 * @param end - End date (`Date` object or Unix timestamp in ms).
 * @param locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param style - Predefined format. Typed via `DateTimeStyleSchema`. Optional.
 * @param options - `Intl.DateTimeFormatOptions`. Overrides `style` if both provided. Optional.
 * @returns `Result<Str>` — the formatted date range string, or an error.
 *
 * @example
 * ```typescript
 * formatDateRange(
 *   new Date('2026-01-15'),
 *   new Date('2026-02-23'),
 *   'en-US',
 *   'long',
 *   undefined,
 * );
 * // ok('January 15 – February 23, 2026')
 * ```
 */
export function formatDateRange(
	start: Date | Num,
	end: Date | Num,
	locale: Str,
	style?: DateTimeStyle,
	options?: Intl.DateTimeFormatOptions,
): Result<Str> {
	const localeResult: Result<Str> = safeParse(StrSchema, locale);
	if (!localeResult.ok) return localeResult;

	try {
		const startDate: Date = toDate(start);
		const endDate: Date = toDate(end);
		const formatOptions: Intl.DateTimeFormatOptions =
			options ?? (style ? styleToOptions(style, 'date') : {});
		const formatter: Intl.DateTimeFormat = new Intl.DateTimeFormat(
			localeResult.data,
			formatOptions,
		);
		const formatted: Str = formatter.formatRange(startDate, endDate);
		return ok(StrSchema, formatted);
	} catch (error: unknown) {
		return err(ERRORS.LOCALE.FORMAT_FAILED, {
			meta: {
				type: 'dateRange',
				locale: localeResult.data,
				reason: error instanceof Error ? error.message : String(error),
			},
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

/** Display name type for `Intl.DisplayNames`. */
export type DisplayNameType = v.InferOutput<typeof DisplayNameTypeSchema>;

/** Valibot schema for display name style. */
export const DisplayNameStyleSchema = v.picklist(['long', 'short', 'narrow']);

/** Display name style. */
export type DisplayNameStyle = v.InferOutput<typeof DisplayNameStyleSchema>;

// =============================================================================
// Display Names
// =============================================================================

/**
 * Formats a code (language, region, currency, etc.) into its display name
 * using `Intl.DisplayNames`.
 *
 * @param code - The code to display (e.g., `'en'`, `'US'`, `'EUR'`). Validated via `StrSchema`.
 * @param locale - BCP 47 locale tag for the output language. Validated via `StrSchema`.
 * @param type - What the code represents. Validated via `DisplayNameTypeSchema`.
 * @param style - Display style. Validated via `DisplayNameStyleSchema`. Optional, defaults to `'long'`.
 * @returns `Result<Str>` — the display name, or an error if the code is unknown.
 *
 * @example
 * ```typescript
 * formatDisplayName('en', 'en', 'language', undefined);
 * // ok('English')
 *
 * formatDisplayName('en', 'fr', 'language', undefined);
 * // ok('anglais')
 *
 * formatDisplayName('US', 'en', 'region', undefined);
 * // ok('United States')
 *
 * formatDisplayName('EUR', 'en', 'currency', undefined);
 * // ok('Euro')
 * ```
 */
export function formatDisplayName(
	code: Str,
	locale: Str,
	type: DisplayNameType,
	style?: DisplayNameStyle,
): Result<Str> {
	const codeResult: Result<Str> = safeParse(StrSchema, code);
	if (!codeResult.ok) return codeResult;
	const localeResult: Result<Str> = safeParse(StrSchema, locale);
	if (!localeResult.ok) return localeResult;
	const typeResult: Result<DisplayNameType> = safeParse(DisplayNameTypeSchema, type);
	if (!typeResult.ok) return typeResult;
	if (style !== undefined) {
		const styleResult: Result<DisplayNameStyle> = safeParse(DisplayNameStyleSchema, style);
		if (!styleResult.ok) return styleResult;
	}

	try {
		const formatter: Intl.DisplayNames = new Intl.DisplayNames(localeResult.data, {
			type: typeResult.data,
			style: style ?? 'long',
		});
		const displayName: Str | undefined = formatter.of(codeResult.data);
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
		return err(ERRORS.LOCALE.FORMAT_FAILED, {
			meta: {
				type: 'displayName',
				locale: localeResult.data,
				reason: error instanceof Error ? error.message : String(error),
			},
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
 * @param value - The decimal fraction to format as percent. Validated via `NumSchema`.
 * @param locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param options - Additional `Intl.NumberFormatOptions` to merge with `{ style: 'percent' }`. Optional.
 * @returns `Result<Str>` — the formatted percentage string, or an error.
 *
 * @example
 * ```typescript
 * formatPercent(0.256, 'en-US', undefined);
 * // ok('26%')
 *
 * formatPercent(0.256, 'en-US', { minimumFractionDigits: 1 });
 * // ok('25.6%')
 * ```
 */
export function formatPercent(
	value: Num,
	locale: Str,
	options?: Intl.NumberFormatOptions,
): Result<Str> {
	const valueResult: Result<Num> = safeParse(NumSchema, value);
	if (!valueResult.ok) return valueResult;
	const localeResult: Result<Str> = safeParse(StrSchema, locale);
	if (!localeResult.ok) return localeResult;

	return formatNumber(valueResult.data, localeResult.data, {
		style: 'percent',
		...options,
	});
}

// =============================================================================
// Schemas — Unit
// =============================================================================

/** Valibot schema for Intl.NumberFormat unit display modes. */
export const UnitDisplaySchema = v.picklist(['long', 'short', 'narrow']);

/** Unit display mode. */
export type UnitDisplay = v.InferOutput<typeof UnitDisplaySchema>;

// =============================================================================
// Unit Formatting
// =============================================================================

/**
 * Formats a number with a measurement unit using `Intl.NumberFormat`.
 *
 * Uses `style: 'unit'` with the specified `unit` option. The unit must be a
 * sanctioned single unit identifier (e.g., `'kilometer'`, `'kilogram'`, `'celsius'`)
 * or a compound unit (e.g., `'kilometer-per-hour'`).
 *
 * @param value - The numeric value. Validated via `NumSchema`.
 * @param unit - The unit identifier (e.g., `'kilometer-per-hour'`). Validated via `StrSchema`.
 * @param locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param unitDisplay - `'long'` (default), `'short'`, or `'narrow'`.
 * @param options - Additional `Intl.NumberFormatOptions` to merge. Optional.
 * @returns `Result<Str>` — the formatted unit string, or an error.
 *
 * @example
 * ```typescript
 * formatUnit(100, 'kilometer-per-hour', 'en', undefined, undefined);
 * // ok('100 km/h')
 *
 * formatUnit(100, 'kilometer-per-hour', 'en', 'long', undefined);
 * // ok('100 kilometers per hour')
 *
 * formatUnit(37.5, 'celsius', 'en', 'short', undefined);
 * // ok('37.5°C')
 * ```
 */
export function formatUnit(
	value: Num,
	unit: Str,
	locale: Str,
	unitDisplay?: UnitDisplay,
	options?: Intl.NumberFormatOptions,
): Result<Str> {
	const valueResult: Result<Num> = safeParse(NumSchema, value);
	if (!valueResult.ok) return valueResult;
	const unitResult: Result<Str> = safeParse(StrSchema, unit);
	if (!unitResult.ok) return unitResult;
	const localeResult: Result<Str> = safeParse(StrSchema, locale);
	if (!localeResult.ok) return localeResult;
	if (unitDisplay !== undefined) {
		const displayResult: Result<UnitDisplay> = safeParse(UnitDisplaySchema, unitDisplay);
		if (!displayResult.ok) return displayResult;
	}

	return formatNumber(valueResult.data, localeResult.data, {
		style: 'unit',
		unit: unitResult.data,
		unitDisplay: unitDisplay ?? 'short',
		...options,
	});
}

// =============================================================================
// Schemas — Duration
// =============================================================================

/** Valibot schema for duration format style. */
export const DurationStyleSchema = v.picklist(['long', 'short', 'narrow', 'digital']);

/** Duration format style. */
export type DurationStyle = v.InferOutput<typeof DurationStyleSchema>;

/**
 * Valibot schema for a duration input object.
 * All fields are optional — only included units are formatted.
 */
export const DurationInputSchema = v.strictObject({
	years: v.optional(NumSchema),
	months: v.optional(NumSchema),
	weeks: v.optional(NumSchema),
	days: v.optional(NumSchema),
	hours: v.optional(NumSchema),
	minutes: v.optional(NumSchema),
	seconds: v.optional(NumSchema),
	milliseconds: v.optional(NumSchema),
	microseconds: v.optional(NumSchema),
	nanoseconds: v.optional(NumSchema),
});

/** Duration input object. */
export type DurationInput = v.InferOutput<typeof DurationInputSchema>;

// =============================================================================
// Duration Formatting
// =============================================================================

/**
 * Formats a duration using `Intl.DurationFormat` (ES2025).
 *
 * Returns an error if `Intl.DurationFormat` is not available in the runtime
 * (Node < 22.6, older browsers).
 *
 * @param duration - Duration object with optional unit fields. Validated via `DurationInputSchema`.
 * @param locale - BCP 47 locale tag. Validated via `StrSchema`.
 * @param style - `'long'` (default), `'short'`, `'narrow'`, or `'digital'`.
 * @returns `Result<Str>` — the formatted duration string, or an error.
 *
 * @example
 * ```typescript
 * formatDuration({ hours: 1, minutes: 46, seconds: 40 }, 'en', undefined);
 * // ok('1 hr, 46 min, 40 sec')
 *
 * formatDuration({ hours: 1, minutes: 46, seconds: 40 }, 'en', 'digital');
 * // ok('1:46:40')
 *
 * formatDuration({ days: 3, hours: 4 }, 'en', 'long');
 * // ok('3 days, 4 hours')
 * ```
 */
export function formatDuration(
	duration: DurationInput,
	locale: Str,
	style?: DurationStyle,
): Result<Str> {
	const durationResult: Result<DurationInput> = safeParse(DurationInputSchema, duration);
	if (!durationResult.ok) return durationResult;
	const localeResult: Result<Str> = safeParse(StrSchema, locale);
	if (!localeResult.ok) return localeResult;
	if (style !== undefined) {
		const styleResult: Result<DurationStyle> = safeParse(DurationStyleSchema, style);
		if (!styleResult.ok) return styleResult;
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
		const DurationFormat = (Intl as Record<Str, unknown>).DurationFormat as new (
			locale: Str,
			options?: { style?: Str },
		) => { format: (duration: DurationInput) => Str }; // Irreducible: Intl.DurationFormat not in TS lib es2024 — runtime-guarded by 'DurationFormat' in Intl check above
		const formatter = new DurationFormat(localeResult.data, {
			style: style ?? 'long',
		});
		const formatted: Str = formatter.format(durationResult.data);
		return ok(StrSchema, formatted);
	} catch (error: unknown) {
		return err(ERRORS.LOCALE.FORMAT_FAILED, {
			meta: {
				type: 'duration',
				locale: localeResult.data,
				reason: error instanceof Error ? error.message : String(error),
			},
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
 * @param skeleton - The skeleton string (without `::` prefix). Validated via `StrSchema`.
 * @returns `Result<Intl.NumberFormatOptions>` — parsed options, or a validation error.
 */
export function parseNumberSkeleton(skeleton: Str): Result<Intl.NumberFormatOptions> {
	const skeletonResult: Result<Str> = safeParse(StrSchema, skeleton);
	if (!skeletonResult.ok) return skeletonResult;

	const tokens: Str[] = skeletonResult.data.trim().split(/\s+/);
	const options: Intl.NumberFormatOptions = {};

	for (const token of tokens) {
		if (token === '') continue;

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
 * @param skeleton - The skeleton string (without `::` prefix). Validated via `StrSchema`.
 * @returns `Result<Intl.DateTimeFormatOptions>` — parsed options, or a validation error.
 */
export function parseDateTimeSkeleton(skeleton: Str): Result<Intl.DateTimeFormatOptions> {
	const skeletonResult: Result<Str> = safeParse(StrSchema, skeleton);
	if (!skeletonResult.ok) return skeletonResult;

	const options: Intl.DateTimeFormatOptions = {};
	const s: Str = skeletonResult.data.trim();
	let i: Num = 0;

	while (i < s.length) {
		// oxlint-disable-next-line typescript/no-non-null-assertion -- guarded by i < s.length in while condition
		const ch: Str = s[i]!;
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
				if (count >= 4) options.month = 'long';
				else if (count === 3) options.month = 'short';
				else if (count === 2) options.month = '2-digit';
				else options.month = 'numeric';
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
