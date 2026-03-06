/**
 * Finance data service — reads and writes JSON seed data files.
 *
 * Provides typed CRUD operations for all finance data collections.
 * Uses Valibot `safeParse` for validation, returns `Result<T>` everywhere.
 *
 * In development, reads/writes from the seed directory under `src/lib/server/data/seed/`.
 * All functions are async to allow future migration to database-backed storage.
 *
 * @module
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type * as v from 'valibot';
import type { Str, Void } from '@/schemas/common';
import { ERRORS, err, type Result, okUnchecked } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

/** Base path for seed data JSON files. */
const SEED_DIR: Str = join(import.meta.dirname, 'seed');

/**
 * Reads and validates a JSON array collection from disk.
 *
 * @param filename - JSON filename (e.g. 'debts.json')
 * @param schema - Valibot schema for a single item
 * @returns Validated array of items, or error
 */
export async function readCollection<T>(
	filename: Str,
	schema: v.GenericSchema<unknown, T>,
): Promise<Result<readonly T[]>> {
	try {
		const raw: Str = await readFile(join(SEED_DIR, filename), 'utf8');
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return err(ERRORS.VALIDATION.INVALID_FORMAT, `Expected array in ${filename}`);
		}
		const items: T[] = [];
		for (const item of parsed) {
			const result = safeParse(schema, item);
			if (!result.ok) return result;
			items.push(result.data as T);
		}
		return okUnchecked(items as readonly T[]);
	} catch {
		return err(ERRORS.IO.READ_FAILED, `Failed to read ${filename}`);
	}
}

/**
 * Writes a JSON array collection to disk after validation.
 *
 * @param filename - JSON filename (e.g. 'debts.json')
 * @param schema - Valibot schema for a single item
 * @param data - Array of items to write
 * @returns Ok on success, or error
 */
export async function writeCollection<T>(
	filename: Str,
	schema: v.GenericSchema<unknown, T>,
	data: readonly T[],
): Promise<Result<Void>> {
	try {
		for (const item of data) {
			const result = safeParse(schema, item);
			if (!result.ok) return result;
		}
		await writeFile(join(SEED_DIR, filename), `${JSON.stringify(data, null, '\t')}\n`, 'utf8');
		return okUnchecked<Void>(undefined);
	} catch {
		return err(ERRORS.IO.WRITE_FAILED, `Failed to write ${filename}`);
	}
}

/**
 * Reads and validates a singleton JSON object from disk.
 *
 * @param filename - JSON filename (e.g. 'settings.json')
 * @param schema - Valibot schema for the object
 * @returns Validated object, or error
 */
export async function readSingleton<T>(
	filename: Str,
	schema: v.GenericSchema<unknown, T>,
): Promise<Result<T>> {
	try {
		const raw: Str = await readFile(join(SEED_DIR, filename), 'utf8');
		const parsed: unknown = JSON.parse(raw);
		return safeParse(schema, parsed);
	} catch {
		return err(ERRORS.IO.READ_FAILED, `Failed to read ${filename}`);
	}
}

/**
 * Writes a singleton JSON object to disk after validation.
 *
 * @param filename - JSON filename (e.g. 'settings.json')
 * @param schema - Valibot schema for the object
 * @param data - Object to write
 * @returns Ok on success, or error
 */
export async function writeSingleton<T>(
	filename: Str,
	schema: v.GenericSchema<unknown, T>,
	data: T,
): Promise<Result<Void>> {
	try {
		const result = safeParse(schema, data);
		if (!result.ok) return result;
		await writeFile(join(SEED_DIR, filename), `${JSON.stringify(data, null, '\t')}\n`, 'utf8');
		return okUnchecked<Void>(undefined);
	} catch {
		return err(ERRORS.IO.WRITE_FAILED, `Failed to write ${filename}`);
	}
}
