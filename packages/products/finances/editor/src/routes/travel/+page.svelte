<script lang="ts">
import type { Str, Num, Bool } from '@/schemas/common';
import type { Travel } from '$lib/schemas/finances';
import { invalidateAll } from '$app/navigation';
import { localeStore, t } from '$lib/i18n.svelte';
import { Badge } from '@/ui/badge/index.js';
import { Button } from '@/ui/button/index.js';
import * as Card from '@/ui/card/index.js';
import * as Dialog from '@/ui/dialog/index.js';
import { Input } from '@/ui/input/index.js';
import { Label } from '@/ui/label/index.js';
import { Switch } from '@/ui/switch/index.js';
import * as Table from '@/ui/table/index.js';
import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

type PageData = { trips: Travel[] };
let { data }: { data: PageData } = $props();

let trips: Travel[] = $derived(data.trips);

let totalBudget: Num = $derived(trips.reduce((sum: Num, trip: Travel) => sum + trip.budget, 0));

// ── Delete confirmation state ──────────────────────────────────────
let confirmOpen: Bool = $state(false);
let pendingDeleteId: Str | null = $state(null);

// ── Search & sort state ────────────────────────────────────────────
let searchQuery: Str = $state('');
let sortKey: Str = $state('name');
let sortDir: Str = $state('asc');

// ── Sorted & filtered rows ─────────────────────────────────────────
const sortedRows: Travel[] = $derived.by(() => {
	const rows: Travel[] = [...trips];
	const dir: Num = sortDir === 'asc' ? 1 : -1;
	rows.sort((a: Travel, b: Travel) => {
		if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
		if (sortKey === 'budget') return (a.budget - b.budget) * dir;
		return 0;
	});
	return rows;
});

const filteredRows: Travel[] = $derived(
	sortedRows.filter((row: Travel) => row.name.toLowerCase().includes(searchQuery.toLowerCase())),
);

// ── Sort helpers ───────────────────────────────────────────────────
function toggleSort(key: Str): void {
	if (sortKey === key) {
		sortDir = sortDir === 'asc' ? 'desc' : 'asc';
	} else {
		sortKey = key;
		sortDir = 'asc';
	}
}

function sortIndicator(key: Str): Str {
	if (sortKey !== key) return ' ↕';
	return sortDir === 'asc' ? ' ↑' : ' ↓';
}

// ── Add dialog state ────────────────────────────────────────────
let addOpen: Bool = $state(false);
let addName: Str = $state('');
let addBudget: Num = $state(0);
let addIsEstimate: Bool = $state(false);
let addPlanned: Bool = $state(false);
let addNotes: Str = $state('');

function resetAddForm(): void {
	addName = '';
	addBudget = 0;
	addIsEstimate = false;
	addPlanned = false;
	addNotes = '';
}

async function handleAdd(): Promise<void> {
	const trip: Travel = {
		id: crypto.randomUUID(),
		name: addName,
		budget: addBudget,
		isEstimate: addIsEstimate,
		planned: addPlanned,
		notes: addNotes,
	};
	await fetch('/api/travel', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(trip),
	});
	addOpen = false;
	resetAddForm();
	await invalidateAll();
}

// ── Edit dialog state ───────────────────────────────────────────
let editOpen: Bool = $state(false);
let editId: Str = $state('');
let editName: Str = $state('');
let editBudget: Num = $state(0);
let editIsEstimate: Bool = $state(false);
let editPlanned: Bool = $state(false);
let editNotes: Str = $state('');

function openEdit(trip: Travel): void {
	editId = trip.id;
	editName = trip.name;
	editBudget = trip.budget;
	editIsEstimate = trip.isEstimate;
	editPlanned = trip.planned;
	editNotes = trip.notes;
	editOpen = true;
}

async function handleEdit(): Promise<void> {
	const trip: Travel = {
		id: editId,
		name: editName,
		budget: editBudget,
		isEstimate: editIsEstimate,
		planned: editPlanned,
		notes: editNotes,
	};
	await fetch(`/api/travel/${editId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(trip),
	});
	editOpen = false;
	await invalidateAll();
}

// ── Delete ──────────────────────────────────────────────────────
function requestDelete(id: Str): void {
	pendingDeleteId = id;
	confirmOpen = true;
}

async function performDelete(): Promise<void> {
	if (!pendingDeleteId) return;
	await fetch(`/api/travel/${pendingDeleteId}`, { method: 'DELETE' });
	pendingDeleteId = null;
	await invalidateAll();
}
</script>

<div class="flex flex-1 flex-col gap-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<h1 class="text-2xl font-semibold tracking-tight">{t(localeStore.t.sidebar.travel, 'Travel')}</h1>
			<Badge variant="secondary">
				{t(localeStore.t.finance.total, 'Total')}: ${totalBudget.toFixed(2)}
			</Badge>
		</div>
		<Button onclick={() => (addOpen = true)}>{t(localeStore.t.finance.addItem, 'Add Trip')}</Button>
	</div>

	<!-- Search -->
	<div class="flex items-center gap-4">
		<Input
			type="search"
			placeholder={t(localeStore.t.finance.searchPlaceholder, 'Search trips...')}
			class="max-w-sm"
			bind:value={searchQuery}
		/>
	</div>

	<!-- Trips table -->
	<div class="overflow-hidden rounded-lg border">
		<Table.Root>
			<Table.Header class="bg-muted sticky top-0 z-10">
					<Table.Row>
						<Table.Head
							class="text-muted-foreground cursor-pointer text-xs font-medium uppercase tracking-wide select-none hover:bg-muted/50"
							onclick={() => toggleSort('name')}
						>
							{t(localeStore.t.finance.name, 'Name')}{sortIndicator('name')}
						</Table.Head>
						<Table.Head
							class="text-muted-foreground cursor-pointer text-right text-xs font-medium uppercase tracking-wide select-none hover:bg-muted/50"
							onclick={() => toggleSort('budget')}
						>
							{t(localeStore.t.finance.budget, 'Budget')} ($){sortIndicator('budget')}
						</Table.Head>
						<Table.Head class="text-muted-foreground text-xs font-medium uppercase tracking-wide">
							{t(localeStore.t.finance.estimated, 'Estimated')}?
						</Table.Head>
						<Table.Head class="text-muted-foreground text-xs font-medium uppercase tracking-wide">
							{t(localeStore.t.finance.planned, 'Planned')}?
						</Table.Head>
						<Table.Head class="text-muted-foreground text-xs font-medium uppercase tracking-wide">
							{t(localeStore.t.finance.notes, 'Notes')}
						</Table.Head>
						<Table.Head class="text-muted-foreground w-[100px] text-right text-xs font-medium uppercase tracking-wide">
							{t(localeStore.t.finance.actions, 'Actions')}
						</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each filteredRows as trip (trip.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{trip.name}</Table.Cell>
							<Table.Cell class="text-right">${trip.budget.toFixed(2)}</Table.Cell>
							<Table.Cell>
								<Badge variant={trip.isEstimate ? 'outline' : 'secondary'}>
									{trip.isEstimate ? t(localeStore.t.finance.yes, 'Yes') : t(localeStore.t.finance.no, 'No')}
								</Badge>
							</Table.Cell>
							<Table.Cell>
								<Badge variant={trip.planned ? 'default' : 'outline'}>
									{trip.planned ? t(localeStore.t.finance.yes, 'Yes') : t(localeStore.t.finance.no, 'No')}
								</Badge>
							</Table.Cell>
							<Table.Cell class="max-w-[200px] truncate">{trip.notes}</Table.Cell>
							<Table.Cell class="text-right">
								<div class="flex items-center justify-end gap-2">
									<Button variant="outline" size="sm" onclick={() => openEdit(trip)}>
										{t(localeStore.t.finance.editItem, 'Edit')}
									</Button>
									<Button variant="destructive" size="sm" onclick={() => requestDelete(trip.id)}>
										{t(localeStore.t.finance.deleteItem, 'Delete')}
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={6} class="text-muted-foreground py-8 text-center">
								{searchQuery
									? t(localeStore.t.finance.noMatchingResults, 'No matching results.')
									: t(localeStore.t.finance.noTrips, 'No trips yet.')}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
	</div>

	<!-- Add Trip dialog -->
	<Dialog.Root bind:open={addOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>{t(localeStore.t.finance.addItem, 'Add Trip')}</Dialog.Title>
				<Dialog.Description>
					{t(localeStore.t.finance.addTripDesc, 'Add a new travel destination or trip to your budget.')}
				</Dialog.Description>
			</Dialog.Header>
			<div class="flex flex-col gap-4 py-4">
				<div class="flex flex-col gap-2">
					<Label for="add-name">{t(localeStore.t.finance.name, 'Name')}</Label>
					<Input id="add-name" bind:value={addName} placeholder={t(localeStore.t.finance.placeholderEgJapan, 'e.g. Japan')} />
				</div>
				<div class="flex flex-col gap-2">
					<Label for="add-budget">{t(localeStore.t.finance.budget, 'Budget')} ($)</Label>
					<Input id="add-budget" type="number" step="0.01" bind:value={addBudget} />
				</div>
				<div class="flex items-center gap-3">
					<Switch id="add-estimate" bind:checked={addIsEstimate} />
					<Label for="add-estimate">{t(localeStore.t.finance.estimatedBudget, 'Estimated budget')}</Label>
				</div>
				<div class="flex items-center gap-3">
					<Switch id="add-planned" bind:checked={addPlanned} />
					<Label for="add-planned">{t(localeStore.t.finance.plannedTrip, 'Planned trip')}</Label>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="add-notes">{t(localeStore.t.finance.notes, 'Notes')}</Label>
					<Input id="add-notes" bind:value={addNotes} placeholder={t(localeStore.t.finance.optionalNotes, 'Optional notes')} />
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (addOpen = false)}>{t(localeStore.t.common.cancel, 'Cancel')}</Button>
				<Button onclick={handleAdd} disabled={!addName}>{t(localeStore.t.common.save, 'Save')}</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Edit Trip dialog -->
	<Dialog.Root bind:open={editOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>{t(localeStore.t.finance.editItem, 'Edit Trip')}</Dialog.Title>
				<Dialog.Description>
					{t(localeStore.t.finance.editTripDesc, 'Update the details for this trip.')}
				</Dialog.Description>
			</Dialog.Header>
			<div class="flex flex-col gap-4 py-4">
				<div class="flex flex-col gap-2">
					<Label for="edit-name">{t(localeStore.t.finance.name, 'Name')}</Label>
					<Input id="edit-name" bind:value={editName} placeholder={t(localeStore.t.finance.placeholderEgJapan, 'e.g. Japan')} />
				</div>
				<div class="flex flex-col gap-2">
					<Label for="edit-budget">{t(localeStore.t.finance.budget, 'Budget')} ($)</Label>
					<Input id="edit-budget" type="number" step="0.01" bind:value={editBudget} />
				</div>
				<div class="flex items-center gap-3">
					<Switch id="edit-estimate" bind:checked={editIsEstimate} />
					<Label for="edit-estimate">{t(localeStore.t.finance.estimatedBudget, 'Estimated budget')}</Label>
				</div>
				<div class="flex items-center gap-3">
					<Switch id="edit-planned" bind:checked={editPlanned} />
					<Label for="edit-planned">{t(localeStore.t.finance.plannedTrip, 'Planned trip')}</Label>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="edit-notes">{t(localeStore.t.finance.notes, 'Notes')}</Label>
					<Input id="edit-notes" bind:value={editNotes} placeholder={t(localeStore.t.finance.optionalNotes, 'Optional notes')} />
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (editOpen = false)}>{t(localeStore.t.common.cancel, 'Cancel')}</Button>
				<Button onclick={handleEdit} disabled={!editName}>{t(localeStore.t.common.save, 'Save')}</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Delete Confirmation -->
	<ConfirmDialog
		bind:open={confirmOpen}
		title={t(localeStore.t.finance.deleteConfirmTitle, 'Delete Trip?')}
		description={t(localeStore.t.finance.deleteConfirmDesc, 'This action cannot be undone. This will permanently delete this trip.')}
		onConfirm={performDelete}
	/>
</div>
