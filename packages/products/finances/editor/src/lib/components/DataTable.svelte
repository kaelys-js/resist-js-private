<script lang="ts">
import type { Str } from '@/schemas/common';
import * as Table from '$lib/components/ui/table/index.js';
import { Button } from '$lib/components/ui/button/index.js';

/**
 * Props for the DataTable component.
 *
 * A generic table wrapper that renders a shadcn Table with optional row actions.
 * Uses snippet props for cell formatting rather than TypeScript generics.
 *
 * @property columns - Column definitions with key, label, and optional alignment.
 * @property rows - Array of row data objects keyed by column key.
 * @property onEdit - Optional callback invoked when the Edit button is clicked for a row.
 * @property onDelete - Optional callback invoked when the Delete button is clicked for a row.
 * @property emptyMessage - Message displayed when rows is empty.
 * @property formatCell - Optional cell formatter; returns a display string for a given key/value pair.
 */
type Props = {
	columns: readonly { key: Str; label: Str; align?: 'left' | 'right' }[];
	rows: readonly Record<Str, unknown>[];
	onEdit?: (row: Record<Str, unknown>) => void;
	onDelete?: (row: Record<Str, unknown>) => void;
	emptyMessage?: Str;
	formatCell?: (key: Str, value: unknown) => Str;
};

const {
	columns,
	rows,
	onEdit,
	onDelete,
	emptyMessage = 'No data available.',
	formatCell,
}: Props = $props();

const hasActions: boolean = $derived(!!onEdit || !!onDelete);

function displayValue(key: Str, value: unknown): Str {
	if (formatCell) return formatCell(key, value);
	return String(value ?? '');
}
</script>

{#if rows.length === 0}
	<p class="text-muted-foreground py-6 text-center text-sm">{emptyMessage}</p>
{:else}
	<Table.Root>
		<Table.Header>
			<Table.Row>
				{#each columns as col (col.key)}
					<Table.Head class={col.align === 'right' ? 'text-right' : ''}>
						{col.label}
					</Table.Head>
				{/each}
				{#if hasActions}
					<Table.Head class="text-right">Actions</Table.Head>
				{/if}
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each rows as row, i (i)}
				<Table.Row>
					{#each columns as col (col.key)}
						<Table.Cell class={col.align === 'right' ? 'text-right' : ''}>
							{displayValue(col.key, row[col.key])}
						</Table.Cell>
					{/each}
					{#if hasActions}
						<Table.Cell class="text-right">
							<div class="flex justify-end gap-2">
								{#if onEdit}
									<Button variant="ghost" size="sm" onclick={() => onEdit(row)}>
										Edit
									</Button>
								{/if}
								{#if onDelete}
									<Button variant="ghost" size="sm" onclick={() => onDelete(row)}>
										Delete
									</Button>
								{/if}
							</div>
						</Table.Cell>
					{/if}
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
{/if}
