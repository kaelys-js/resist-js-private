/**
 * Unit tests for `createSvelteTable` and `mergeObjects`.
 *
 * Covers:
 * - `resolveThunk` object vs function paths
 * - `mergeObjects` Proxy handlers: `get`, `has`, `ownKeys`, `getOwnPropertyDescriptor`
 * - missing-key short-circuits inside `findSourceWithKey`
 * - `createSvelteTable` initial construction and state-change updaters (function + object forms)
 *
 * `createSvelteTable` uses `$state` + `$effect.pre`, so it must be called inside
 * an `$effect.root` so the reactive graph is active.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { createSvelteTable, mergeObjects } from './data-table.svelte.js';
import type { ColumnDef } from '@tanstack/table-core';

type Row = { id: number; name: string };

const ROWS: Row[] = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];

const COLUMNS: ColumnDef<Row>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Name' },
];

describe('mergeObjects', () => {
  it('merges plain objects — later sources win on conflicting keys', () => {
    const merged = mergeObjects({ a: 1, b: 2 }, { b: 3, c: 4 });
    expect(merged.a).toBe(1);
    expect(merged.b).toBe(3);
    expect(merged.c).toBe(4);
  });

  it('returns undefined for missing keys (findSourceWithKey short-circuit)', () => {
    const merged = mergeObjects({ a: 1 } as Record<string, number>) as Record<string, number>;
    expect(merged.nope).toBeUndefined();
  });

  it('supports thunk sources — resolveThunk unwraps function values', () => {
    const merged = mergeObjects({ a: 1 }, () => ({ b: 2 }));
    expect(merged.a).toBe(1);
    expect(merged.b).toBe(2);
  });

  it('supports thunk returning null/undefined — treated as empty source', () => {
    const merged = mergeObjects(
      { a: 1 },
      () => null,
      () => undefined,
    );
    expect(merged.a).toBe(1);
  });

  it('Proxy `has` trap returns true for present keys and false otherwise', () => {
    const merged = mergeObjects({ x: 1 });
    expect('x' in merged).toBe(true);
    expect('y' in merged).toBe(false);
  });

  it('Proxy `ownKeys` aggregates keys from every source (deduped)', () => {
    const merged = mergeObjects({ a: 1, b: 2 }, { b: 3, c: 4 });
    const keys: (string | symbol)[] = Reflect.ownKeys(merged);
    expect(new Set(keys)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('Proxy `ownKeys` skips thunk sources that return null', () => {
    const merged = mergeObjects({ a: 1 }, () => null);
    const keys: (string | symbol)[] = Reflect.ownKeys(merged);
    expect(keys).toEqual(['a']);
  });

  it('Proxy `getOwnPropertyDescriptor` returns a data descriptor for present keys', () => {
    const merged = mergeObjects({ a: 42 });
    const desc = Object.getOwnPropertyDescriptor(merged, 'a');
    expect(desc).toEqual({ configurable: true, enumerable: true, value: 42, writable: true });
  });

  it('Proxy `getOwnPropertyDescriptor` returns undefined for missing keys', () => {
    const merged = mergeObjects({ a: 1 });
    const desc = Object.getOwnPropertyDescriptor(merged, 'nope');
    expect(desc).toBeUndefined();
  });
});

describe('createSvelteTable', () => {
  it('returns a live table reacting inside an $effect.root context', () => {
    const cleanup = $effect.root(() => {
      const table = createSvelteTable<Row>({
        data: ROWS,
        columns: COLUMNS,
        getCoreRowModel: () => () => ({ rows: [], flatRows: [], rowsById: {} }) as never,
      });
      flushSync();
      expect(typeof table.getState).toBe('function');
      expect(table.getState()).toBeDefined();
    });
    cleanup();
  });

  it('updater-as-function path: state = updater(state)', () => {
    const cleanup = $effect.root(() => {
      const onStateChange = vi.fn();
      const table = createSvelteTable<Row>({
        data: ROWS,
        columns: COLUMNS,
        getCoreRowModel: () => () => ({ rows: [], flatRows: [], rowsById: {} }) as never,
        onStateChange,
      });
      flushSync();
      /* Trigger the onStateChange callback with a function updater. */
      table.setPageIndex(1);
      flushSync();
      expect(onStateChange).toHaveBeenCalled();
    });
    cleanup();
  });

  it('updater-as-object path: state = mergeObjects(state, updater)', () => {
    const cleanup = $effect.root(() => {
      const onStateChange = vi.fn();
      const table = createSvelteTable<Row>({
        data: ROWS,
        columns: COLUMNS,
        getCoreRowModel: () => () => ({ rows: [], flatRows: [], rowsById: {} }) as never,
        onStateChange,
      });
      flushSync();
      /* Manually dispatch an object updater to hit the else branch. */
      const opts = table.options;
      opts.onStateChange?.({ pagination: { pageIndex: 2, pageSize: 10 } } as never);
      flushSync();
      expect(onStateChange).toHaveBeenCalled();
    });
    cleanup();
  });
});
