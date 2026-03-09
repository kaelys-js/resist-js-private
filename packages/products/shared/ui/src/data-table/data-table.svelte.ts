import {
	createTable,
	type RowData,
	type TableOptions,
	type TableOptionsResolved,
	type TableState,
	type Updater,
} from '@tanstack/table-core';

/**
 * Creates a reactive TanStack table object for Svelte.
 * @param options Table options to create the table with.
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
			mergeOptions: (
				defaultOptions: TableOptions<TData>,
				overrides: Partial<TableOptions<TData>>,
			) => {
				return mergeObjects(defaultOptions, overrides);
			},
			onStateChange() {
				/* no-op — default state change handler */
			},
			renderFallbackValue: null,
			state: {},
		},
		options,
	);

	const table = createTable(resolvedOptions);
	let state = $state<TableState>(table.initialState);

	function updateOptions() {
		table.setOptions(() => {
			return mergeObjects(resolvedOptions, options, {
				onStateChange: (updater: Updater<TableState>) => {
					if (typeof updater === 'function') state = updater(state);
					else state = mergeObjects(state, updater);

					options.onStateChange?.(updater);
				},
				state: mergeObjects(state, options.state || {}),
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
type Intersection<T extends readonly unknown[]> = T extends [infer H, ...infer R]
	? H & Intersection<R>
	: unknown;

function resolveThunk<T extends object>(src: MaybeThunk<T>): T | undefined {
	return typeof src === 'function' ? (src() ?? undefined) : src;
}

/**
 * Lazily merges several objects (or thunks) while preserving
 * getter semantics from every source.
 *
 * Proxy-based to avoid known WebKit recursion issue.
 *
 * @returns A proxy that lazily merges all source objects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeObjects<Sources extends readonly MaybeThunk<any>[]>(
	...sources: Sources
): Intersection<{ [K in keyof Sources]: Sources[K] }> {
	const findSourceWithKey = (key: PropertyKey) => {
		for (let i = sources.length - 1; i >= 0; i--) {
			const obj = resolveThunk(sources[i]);
			if (obj && key in obj) return obj;
		}
	};

	return new Proxy(Object.create(null), {
		get(_, key) {
			const src = findSourceWithKey(key);

			return src?.[key as never];
		},

		getOwnPropertyDescriptor(_, key) {
			const src = findSourceWithKey(key);
			if (!src) return;
			return {
				configurable: true,
				enumerable: true,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				value: (src as any)[key],
				writable: true,
			};
		},

		has(_, key) {
			return Boolean(findSourceWithKey(key));
		},

		ownKeys(): Array<string | symbol> {
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const all = new Set<string | symbol>();
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
	}) as Intersection<{ [K in keyof Sources]: Sources[K] }>;
}
