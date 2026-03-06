<script lang="ts">
import type { Str, Num, Bool } from '@/schemas/common';
import type { Travel } from '$lib/schemas/finances';
import { invalidateAll } from '$app/navigation';
import { localeStore, t } from '$lib/i18n.svelte';
import { Badge } from '$lib/components/ui/badge/index.js';
import { Button } from '$lib/components/ui/button/index.js';
import * as Card from '$lib/components/ui/card/index.js';
import * as Dialog from '$lib/components/ui/dialog/index.js';
import { Input } from '$lib/components/ui/input/index.js';
import { Label } from '$lib/components/ui/label/index.js';
import { Switch } from '$lib/components/ui/switch/index.js';
import * as Table from '$lib/components/ui/table/index.js';

type PageData = { trips: Travel[] };
let { data }: { data: PageData } = $props();

let trips: Travel[] = $derived(data.trips);

let totalBudget: Num = $derived(trips.reduce((sum: Num, t: Travel) => sum + t.budget, 0));

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
async function handleDelete(id: Str): Promise<void> {
	await fetch(`/api/travel/${id}`, { method: 'DELETE' });
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

	<!-- Trips table -->
	<Card.Card>
		<Card.CardContent class="p-0">
			<Table.Table>
				<Table.TableHeader>
					<Table.TableRow>
						<Table.TableHead>{t(localeStore.t.finance.name, 'Name')}</Table.TableHead>
						<Table.TableHead class="text-right">{t(localeStore.t.finance.budget, 'Budget')} ($)</Table.TableHead>
						<Table.TableHead>{t(localeStore.t.finance.estimated, 'Estimated')}?</Table.TableHead>
						<Table.TableHead>{t(localeStore.t.finance.planned, 'Planned')}?</Table.TableHead>
						<Table.TableHead>{t(localeStore.t.finance.notes, 'Notes')}</Table.TableHead>
						<Table.TableHead class="text-right">{t(localeStore.t.finance.actions, 'Actions')}</Table.TableHead>
					</Table.TableRow>
				</Table.TableHeader>
				<Table.TableBody>
					{#each trips as trip (trip.id)}
						<Table.TableRow>
							<Table.TableCell class="font-medium">{trip.name}</Table.TableCell>
							<Table.TableCell class="text-right">${trip.budget.toFixed(2)}</Table.TableCell>
							<Table.TableCell>
								<Badge variant={trip.isEstimate ? 'outline' : 'secondary'}>
									{trip.isEstimate ? t(localeStore.t.finance.yes, 'Yes') : t(localeStore.t.finance.no, 'No')}
								</Badge>
							</Table.TableCell>
							<Table.TableCell>
								<Badge variant={trip.planned ? 'default' : 'outline'}>
									{trip.planned ? t(localeStore.t.finance.yes, 'Yes') : t(localeStore.t.finance.no, 'No')}
								</Badge>
							</Table.TableCell>
							<Table.TableCell class="max-w-[200px] truncate">{trip.notes}</Table.TableCell>
							<Table.TableCell class="text-right">
								<div class="flex items-center justify-end gap-2">
									<Button variant="outline" size="sm" onclick={() => openEdit(trip)}>
										{t(localeStore.t.finance.editItem, 'Edit')}
									</Button>
									<Button variant="destructive" size="sm" onclick={() => handleDelete(trip.id)}>
										{t(localeStore.t.finance.deleteItem, 'Delete')}
									</Button>
								</div>
							</Table.TableCell>
						</Table.TableRow>
					{:else}
						<Table.TableRow>
							<Table.TableCell colspan={6} class="text-muted-foreground py-8 text-center">
								{t(localeStore.t.finance.noTrips, 'No trips yet.')}
							</Table.TableCell>
						</Table.TableRow>
					{/each}
				</Table.TableBody>
			</Table.Table>
		</Card.CardContent>
	</Card.Card>

	<!-- Add Trip dialog -->
	<Dialog.Dialog bind:open={addOpen}>
		<Dialog.DialogContent>
			<Dialog.DialogHeader>
				<Dialog.DialogTitle>{t(localeStore.t.finance.addItem, 'Add Trip')}</Dialog.DialogTitle>
				<Dialog.DialogDescription>
					{t(localeStore.t.finance.addTripDesc, 'Add a new travel destination or trip to your budget.')}
				</Dialog.DialogDescription>
			</Dialog.DialogHeader>
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
			<Dialog.DialogFooter>
				<Button variant="outline" onclick={() => (addOpen = false)}>{t(localeStore.t.common.cancel, 'Cancel')}</Button>
				<Button onclick={handleAdd} disabled={!addName}>{t(localeStore.t.common.save, 'Save')}</Button>
			</Dialog.DialogFooter>
		</Dialog.DialogContent>
	</Dialog.Dialog>

	<!-- Edit Trip dialog -->
	<Dialog.Dialog bind:open={editOpen}>
		<Dialog.DialogContent>
			<Dialog.DialogHeader>
				<Dialog.DialogTitle>{t(localeStore.t.finance.editItem, 'Edit Trip')}</Dialog.DialogTitle>
				<Dialog.DialogDescription>
					{t(localeStore.t.finance.editTripDesc, 'Update the details for this trip.')}
				</Dialog.DialogDescription>
			</Dialog.DialogHeader>
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
			<Dialog.DialogFooter>
				<Button variant="outline" onclick={() => (editOpen = false)}>{t(localeStore.t.common.cancel, 'Cancel')}</Button>
				<Button onclick={handleEdit} disabled={!editName}>{t(localeStore.t.common.save, 'Save')}</Button>
			</Dialog.DialogFooter>
		</Dialog.DialogContent>
	</Dialog.Dialog>
</div>
