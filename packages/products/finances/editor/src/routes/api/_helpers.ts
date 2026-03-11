/**
 * Shared helpers for finance API routes.
 *
 * Provides typed CRUD handler factories that reduce boilerplate across
 * collection and singleton API routes.
 *
 * @module
 */

import { json } from '@sveltejs/kit';
import * as v from 'valibot';
import type { Str } from '@/schemas/common';
import {
  readCollection,
  writeCollection,
  readSingleton,
  writeSingleton,
} from '$lib/server/data/finance-service';

/**
 * Creates a GET handler that reads a JSON collection.
 *
 * @param filename - JSON filename in seed directory
 * @param schema - Valibot schema for a single item
 * @returns SvelteKit RequestHandler
 */
export function collectionGet<T>(filename: Str, schema: v.GenericSchema<unknown, T>) {
  return async () => {
    const result = await readCollection(filename, schema);
    if (!result.ok) return json({ ok: false, error: result.error.message }, { status: 500 });
    return json({ ok: true, data: result.data });
  };
}

/**
 * Creates a POST handler that adds an item to a JSON collection.
 *
 * @param filename - JSON filename in seed directory
 * @param schema - Valibot schema for a single item
 * @returns SvelteKit RequestHandler
 */
export function collectionPost<T>(filename: Str, schema: v.GenericSchema<unknown, T>) {
  return async ({ request }: { request: Request }) => {
    const body: unknown = await request.json();
    const parseResult = v.safeParse(schema, body);
    if (!parseResult.success) {
      return json({ ok: false, error: 'Validation failed' }, { status: 400 });
    }
    const readResult = await readCollection(filename, schema);
    if (!readResult.ok)
      return json({ ok: false, error: readResult.error.message }, { status: 500 });

    const items = [...readResult.data, parseResult.output] as T[];
    const writeResult = await writeCollection(filename, schema, items);
    if (!writeResult.ok)
      return json({ ok: false, error: writeResult.error.message }, { status: 500 });
    return json({ ok: true, data: parseResult.output }, { status: 201 });
  };
}

/**
 * Creates a PUT handler that updates an item in a JSON collection by ID.
 *
 * @param filename - JSON filename in seed directory
 * @param schema - Valibot schema for a single item
 * @returns SvelteKit RequestHandler
 */
export function collectionPut<T extends { id: Str }>(
  filename: Str,
  schema: v.GenericSchema<unknown, T>,
) {
  return async ({ params, request }: { params: { id: Str }; request: Request }) => {
    const body: unknown = await request.json();
    const parseResult = v.safeParse(schema, body);
    if (!parseResult.success) {
      return json({ ok: false, error: 'Validation failed' }, { status: 400 });
    }
    if (parseResult.output.id !== params.id) {
      return json({ ok: false, error: 'ID mismatch' }, { status: 400 });
    }
    const readResult = await readCollection(filename, schema);
    if (!readResult.ok)
      return json({ ok: false, error: readResult.error.message }, { status: 500 });

    const idx: number = readResult.data.findIndex((item) => item.id === params.id);
    if (idx === -1) return json({ ok: false, error: 'Not found' }, { status: 404 });

    const items = [...readResult.data] as T[];
    items[idx] = parseResult.output;
    const writeResult = await writeCollection(filename, schema, items);
    if (!writeResult.ok)
      return json({ ok: false, error: writeResult.error.message }, { status: 500 });
    return json({ ok: true, data: parseResult.output });
  };
}

/**
 * Creates a DELETE handler that removes an item from a JSON collection by ID.
 *
 * @param filename - JSON filename in seed directory
 * @param schema - Valibot schema for a single item
 * @returns SvelteKit RequestHandler
 */
export function collectionDelete<T extends { id: Str }>(
  filename: Str,
  schema: v.GenericSchema<unknown, T>,
) {
  return async ({ params }: { params: { id: Str } }) => {
    const readResult = await readCollection(filename, schema);
    if (!readResult.ok)
      return json({ ok: false, error: readResult.error.message }, { status: 500 });

    const items = readResult.data.filter((item) => item.id !== params.id) as T[];
    if (items.length === readResult.data.length) {
      return json({ ok: false, error: 'Not found' }, { status: 404 });
    }
    const writeResult = await writeCollection(filename, schema, items);
    if (!writeResult.ok)
      return json({ ok: false, error: writeResult.error.message }, { status: 500 });
    return json({ ok: true });
  };
}

/**
 * Creates a GET handler that reads a singleton JSON object.
 *
 * @param filename - JSON filename in seed directory
 * @param schema - Valibot schema for the object
 * @returns SvelteKit RequestHandler
 */
export function singletonGet<T>(filename: Str, schema: v.GenericSchema<unknown, T>) {
  return async () => {
    const result = await readSingleton(filename, schema);
    if (!result.ok) return json({ ok: false, error: result.error.message }, { status: 500 });
    return json({ ok: true, data: result.data });
  };
}

/**
 * Creates a PUT handler that writes a singleton JSON object.
 *
 * @param filename - JSON filename in seed directory
 * @param schema - Valibot schema for the object
 * @returns SvelteKit RequestHandler
 */
export function singletonPut<T>(filename: Str, schema: v.GenericSchema<unknown, T>) {
  return async ({ request }: { request: Request }) => {
    const body: unknown = await request.json();
    const parseResult = v.safeParse(schema, body);
    if (!parseResult.success) {
      return json({ ok: false, error: 'Validation failed' }, { status: 400 });
    }
    const writeResult = await writeSingleton(filename, schema, parseResult.output);
    if (!writeResult.ok)
      return json({ ok: false, error: writeResult.error.message }, { status: 500 });
    return json({ ok: true, data: parseResult.output });
  };
}
