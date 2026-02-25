/**
 * Object Utilities
 *
 * Deep freeze, deep merge, safe JSON serialization, and recursive readonly type.
 * No CLI dependencies — suitable for use in any context.
 *
 * Type annotations use TypeScript generics — Valibot-inferred types are not
 * applicable here as these utilities operate on arbitrary object shapes.
 *
 * @module
 */

import {
	DEFAULT_JSON_INDENT,
	NonNegativeIntegerSchema,
	StrSchema,
	type JsonData,
	type NonNegativeInteger,
	type Str,
	type StrArray,
} from '@/schemas/common';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Types
// =============================================================================

/**
 * Deep readonly type — makes all nested properties readonly.
 * Arrays become `ReadonlyArray`, Sets become `ReadonlySet`,
 * Maps become `ReadonlyMap`, all recursively.
 *
 * @example
 * ```typescript
 * type Config = { items: string[]; nested: { flag: boolean }; ids: Set<string> };
 * type Frozen = DeepReadonly<Config>;
 * // {
 * //   readonly items: ReadonlyArray<string>;
 * //   readonly nested: { readonly flag: boolean };
 * //   readonly ids: ReadonlySet<string>;
 * // }
 * ```
 */
export type DeepReadonly<T> =
	T extends Set<infer U>
		? ReadonlySet<DeepReadonly<U>>
		: T extends Map<infer K, infer V>
			? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
			: T extends Array<infer U>
				? ReadonlyArray<DeepReadonly<U>>
				: T extends object
					? { readonly [K in keyof T]: DeepReadonly<T[K]> }
					: T;

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Type predicate for plain objects suitable for deep merge.
 * Narrows `unknown` to `Record<string, unknown>`, excluding arrays and nullish values.
 *
 * @param value - The value to check
 * @returns `true` if the value is a plain object, `false` otherwise
 */
function _isPlainObject(value: unknown): value is Record<string, unknown> {
	return (
		value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)
	);
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Deeply freezes an object to prevent mutation at runtime.
 * Recursively freezes all nested objects and arrays.
 * Functions are left callable but their properties are frozen.
 *
 * @param obj - Object to deep freeze.
 * @returns The same object reference, deeply frozen.
 *
 * @remarks Intentionally returns T instead of Result<T> because this function is used by the Result system itself — returning Result would create a circular dependency.
 *
 * @example
 * ```typescript
 * const config = deepFreeze({ db: { host: 'localhost', port: 5432 } });
 * config.db.host = 'other'; // TypeError at runtime
 * ```
 */
export function deepFreeze<T extends object>(obj: T): Readonly<T> {
	const propNames: StrArray = Object.getOwnPropertyNames(obj);

	for (const name of propNames) {
		const value: unknown = Object.getOwnPropertyDescriptor(obj, name)?.value;
		if (value && typeof value === 'object' && !Object.isFrozen(value)) {
			deepFreeze(value);
		}
	}

	return Object.freeze(obj);
}

/**
 * Deep merge two objects. Source values override target values.
 * Arrays are replaced, not merged.
 *
 * @param target - Base object.
 * @param source - Partial object with overrides.
 * @returns New object with deep-merged values (target structure with source overrides).
 *
 * @remarks Intentionally returns T instead of Result<T> because this function is used by the Result system itself — returning Result would create a circular dependency.
 *
 * @example
 * ```typescript
 * const defaults = { db: { host: 'localhost', port: 5432 }, debug: false };
 * const overrides = { db: { host: 'prod.db.com' } };
 * const merged = deepMerge(defaults, overrides);
 * // { db: { host: 'prod.db.com', port: 5432 }, debug: false }
 * ```
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
	const result: Record<string, unknown> = { ...target };

	for (const key of Object.keys(source)) {
		const sourceValue: unknown = source[key];
		const targetValue: unknown = target[key];

		if (_isPlainObject(sourceValue) && _isPlainObject(targetValue)) {
			result[key] = deepMerge(targetValue, sourceValue);
		} else if (sourceValue !== undefined) {
			result[key] = sourceValue;
		}
	}

	// Structural cast: result was spread from target (T) with matching keys overwritten
	return result as T;
}

// =============================================================================
// JSON Serialization
// =============================================================================

/**
 * Safely serialize any value to JSON, handling circular references
 * and non-serializable values (BigInt, functions, symbols).
 *
 * Circular references are replaced with `"[Circular]"`.
 * BigInts are replaced with `"[BigInt: <value>]"`.
 *
 * @remarks Intentionally does not return Result for `deepFreeze`/`deepMerge`
 * compatibility reasons — those are used by the Result system itself. This
 * function DOES return Result because it's not in the Result dependency chain.
 *
 * @param data - Serializable data to stringify.
 * @param indent - Indentation: a number (spaces) or string (e.g. `'\t'`). Defaults to 2.
 * @returns `Result<Str>` — JSON string, or error if serialization fails.
 *
 * @example
 * ```typescript
 * const json = safeStringify({ key: 'value' }, 2);
 * if (!json.ok) return json;
 * json.data;
 * ```
 *
 * @example
 * ```typescript
 * const json = safeStringify(data, '\t');
 * if (!json.ok) return json;
 * ```
 */
export function safeStringify(
	data: JsonData,
	indent: NonNegativeInteger | Str = DEFAULT_JSON_INDENT,
): Result<Str> {
	let validatedIndent: NonNegativeInteger | Str;
	if (typeof indent === 'string') {
		const strResult: Result<Str> = safeParse(StrSchema, indent);
		if (!strResult.ok) return strResult;
		validatedIndent = strResult.data;
	} else {
		const numResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, indent);
		if (!numResult.ok) return numResult;
		validatedIndent = numResult.data as NonNegativeInteger;
	}

	const seen = new WeakSet<object>();
	const replacer = (_key: string, value: JsonData): JsonData => {
		if (typeof value === 'bigint') return `[BigInt: ${value}]`;
		if (typeof value === 'object' && value !== null) {
			if (seen.has(value)) return '[Circular]';
			seen.add(value);
		}
		return value;
	};

	try {
		const result: Str = JSON.stringify(data, replacer, validatedIndent);
		return ok(StrSchema, result);
	} catch (error: unknown) {
		return err(ERRORS.VALIDATION.INVALID_FORMAT, {
			meta: { operation: 'JSON.stringify' },
			cause: fromUnknownError(error),
		});
	}
}
