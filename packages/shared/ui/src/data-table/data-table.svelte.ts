/**
 * DataTable Svelte 5 store — wraps `@tanstack/table-core` with
 * `$state` reactivity so the headless table API can be used
 * inside `<script module>` and Svelte components without manual
 * subscriptions. Exposes the `mergeObjects` helper for shallow
 * state merges.
 *
 * @module
 */

import {
  type RowData,
  type TableOptions,
  type TableOptionsResolved,
  type TableState,
  type Updater,
  createTable,
} from '@tanstack/table-core';

/**
 * Creates a reactive TanStack table object for Svelte.
 * @param {TableOptions<TData>} options Table options to create the table with.
 * @returns A reactive table object.
 * @example
 * ```svelte
 * <script>
 *   const table = createSvelteTable({ ... })
 * </script>
 *
 * <table>
 *   <thead>
 *     {#each table.getHeaderGroups() as headerGroup}
 *       <tr>
 *         {#each headerGroup.headers as header}
 *           <th colspan={header.colSpan}>
 *         	   <FlexRender content={header.column.columnDef.header} context={header.getContext()} />
 *         	 </th>
 *         {/each}
 *       </tr>
 *     {/each}
 *   </thead>
 * 	 <!-- ... -->
 * </table>
 * ```
 */
export function createSvelteTable<TData extends RowData>(options: TableOptions<TData>) {
  const resolvedOptions: TableOptionsResolved<TData> = mergeObjects(
    {
      state: {},
      onStateChange: (): void => {
        /* default no-op — overridden by updateOptions */
      },
      renderFallbackValue: null,
      mergeOptions: (
        defaultOpts: TableOptions<TData>,
        overrideOpts: Partial<TableOptions<TData>>,
      ) => {
        return mergeObjects(defaultOpts, overrideOpts);
      },
    },
    options,
  );

  const table = createTable(resolvedOptions);
  let state = $state<TableState>(table.initialState);

  function updateOptions() {
    table.setOptions(() => {
      return mergeObjects(resolvedOptions, options, {
        state: mergeObjects(state, options.state || {}),

        onStateChange: (updater: Updater<TableState>) => {
          if (typeof updater === 'function') {
            state = updater(state);
          } else {
            state = mergeObjects(state, updater);
          }

          options.onStateChange?.(updater);
        },
      });
    });
  }

  updateOptions();

  $effect.pre(() => {
    updateOptions();
  });

  return table;
}

type MaybeThunk<T extends object> = T | (() => T | null | undefined);
type Intersection<T extends readonly unknown[]> = (T extends [infer H, ...infer R]
  ? H & Intersection<R>
  : unknown) &
  Record<string, never>;

/**
 * Unwrap a thunk or pass through an object.
 *
 * @param src - Object or thunk to resolve
 * @returns The resolved object, or undefined if the thunk returned null/undefined
 */
function resolveThunk<T extends object>(src: MaybeThunk<T>): T | undefined {
  return typeof src === 'function' ? (src() ?? undefined) : src;
}

/**
 * Reactive object merge: returns a single typed object whose
 * property reads pick the value from the right-most source that
 * defines the key (function sources are resolved lazily).
 *
 * @param {Sources} sources - One or more plain objects or thunks returning
 *   objects; later entries override earlier ones
 *{Intersection<{ [K in keyof Sources]: Sources[K] }>}ources[K] }>} A live object whose keys reflect the merged sources
 *{Intersection<{ [K in keyof Sources]: Sources[K] }>}ources[K] }>} Description
 * @returns {Intersection<{ [K in keyof Sources]: Sources[K] }>} Description
 */
export function mergeObjects<Sources extends readonly MaybeThunk<object>[]>(
  ...sources: Sources
): Intersection<{ [K in keyof Sources]: Sources[K] }> {
  const findSourceWithKey = (key: PropertyKey) => {
    for (let i = sources.length - 1; i >= 0; i--) {
      const obj = resolveThunk(sources[i]);
      if (obj && key in obj) {
        return obj;
      }
    }
  };

  return new Proxy(Object.create(null), {
    get(_, key) {
      const src = findSourceWithKey(key);

      return src?.[key as never];
    },

    has(_, key) {
      return Boolean(findSourceWithKey(key));
    },

    ownKeys(): Array<string | symbol> {
      const all: Set<string | symbol> = new Set<string | symbol>();
      for (const s of sources) {
        const obj = resolveThunk(s);
        if (obj) {
          for (const k of Reflect.ownKeys(obj) as Array<string | symbol>) {
            all.add(k);
          }
        }
      }
      return [...all];
    },

    getOwnPropertyDescriptor(_, key) {
      const src = findSourceWithKey(key);
      if (!src) {
        return;
      }
      return {
        configurable: true,
        enumerable: true,
        value: (src as Record<PropertyKey, unknown>)[key],
        writable: true,
      };
    },
  }) as Intersection<{ [K in keyof Sources]: Sources[K] }>;
}
