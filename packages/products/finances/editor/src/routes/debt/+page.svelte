<script lang="ts">
import { localeStore, t } from '$lib/i18n.svelte';
import type { Str, Num, Bool } from '@/schemas/common';
import type { DebtItem } from '$lib/schemas/finances';
import { invalidateAll } from '$app/navigation';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Switch } from '@/ui/switch';
import { Separator } from '@/ui/separator';
import * as Dialog from '@/ui/dialog';
import * as Table from '@/ui/table';
import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

type PageData = {
	debts: DebtItem[];
};

const { data }: { data: PageData } = $props();

// ── Dialog state ────────────────────────────────────────────────────
let dialogOpen: Bool = $state(false);
let editingId: Str | null = $state(null);

let formName: Str = $state('');
let formBalance: Str = $state('');
let formIsEstimate: Bool = $state(false);
let formNotes: Str = $state('');

// ── Delete confirmation state ──────────────────────────────────────
let confirmOpen: Bool = $state(false);
let pendingDeleteId: Str | null = $state(null);

// ── Search & sort state ────────────────────────────────────────────
let searchQuery: Str = $state('');
let sortKey: Str = $state('name');
let sortDir: Str = $state('asc');

// ── Derived ─────────────────────────────────────────────────────────
const totalDebt: Num = $derived(data.debts.reduce((sum: Num, d: DebtItem) => sum + d.balance, 0));

const dialogTitle: Str = $derived(
	editingId
		? t(localeStore.t.finance.editItem, 'Edit Debt')
		: t(localeStore.t.finance.addItem, 'Add Debt'),
);

const sortedRows: DebtItem[] = $derived.by(() => {
	const rows: DebtItem[] = [...data.debts];
	const dir: Num = sortDir === 'asc' ? 1 : -1;
	rows.sort((a: DebtItem, b: DebtItem) => {
		if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
		if (sortKey === 'balance') return (a.balance - b.balance) * dir;
		return 0;
	});
	return rows;
});

const filteredRows: DebtItem[] = $derived(
	sortedRows.filter((row: DebtItem) => row.name.toLowerCase().includes(searchQuery.toLowerCase())),
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

// ── Formatting ──────────────────────────────────────────────────────
function formatCurrency(value: Num): Str {
	return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Dialog helpers ──────────────────────────────────────────────────
function openAddDialog(): void {
	editingId = null;
	formName = '';
	formBalance = '';
	formIsEstimate = false;
	formNotes = '';
	dialogOpen = true;
}

function openEditDialog(debt: DebtItem): void {
	editingId = debt.id;
	formName = debt.name;
	formBalance = String(debt.balance);
	formIsEstimate = debt.isEstimate;
	formNotes = debt.notes;
	dialogOpen = true;
}

// ── CRUD operations ─────────────────────────────────────────────────
async function handleSave(): Promise<void> {
	const balance: Num = Number.parseFloat(formBalance) || 0;
	const item: DebtItem = {
		id: editingId ?? crypto.randomUUID(),
		name: formName,
		balance,
		isEstimate: formIsEstimate,
		notes: formNotes,
	};

	if (editingId) {
		await fetch(`/api/debts/${editingId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(item),
		});
	} else {
		await fetch('/api/debts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(item),
		});
	}

	dialogOpen = false;
	await invalidateAll();
}

function requestDelete(id: Str): void {
	pendingDeleteId = id;
	confirmOpen = true;
}

async function performDelete(): Promise<void> {
	if (!pendingDeleteId) return;
	await fetch(`/api/debts/${pendingDeleteId}`, { method: 'DELETE' });
	pendingDeleteId = null;
	await invalidateAll();
}
</script>

<div class="flex flex-col gap-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<h1 class="text-2xl font-semibold tracking-tight">{t(localeStore.t.finance.totalDebt, 'Debt')}</h1>
			<Badge variant="secondary">{formatCurrency(totalDebt)}</Badge>
		</div>
		<Button onclick={openAddDialog}>{t(localeStore.t.finance.addItem, 'Add Debt')}</Button>
	</div>

	<Separator />

	<!-- Search -->
	<div class="flex items-center gap-4">
		<Input
			type="search"
			placeholder={t(localeStore.t.finance.searchPlaceholder, 'Search debts...')}
			class="max-w-sm"
			bind:value={searchQuery}
		/>
	</div>

	<!-- Table -->
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
					onclick={() => toggleSort('balance')}
				>
					{t(localeStore.t.finance.balance, 'Balance')}{sortIndicator('balance')}
				</Table.Head>
				<Table.Head class="text-muted-foreground text-xs font-medium uppercase tracking-wide">
					{t(localeStore.t.finance.estimated, 'Estimated?')}
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
			{#each filteredRows as debt (debt.id)}
				<Table.Row>
					<Table.Cell class="font-medium">{debt.name}</Table.Cell>
					<Table.Cell class="text-right">{formatCurrency(debt.balance)}</Table.Cell>
					<Table.Cell>
						<Badge variant={debt.isEstimate ? 'outline' : 'secondary'}>
							{debt.isEstimate ? t(localeStore.t.finance.yes, 'Yes') : t(localeStore.t.finance.no, 'No')}
						</Badge>
					</Table.Cell>
					<Table.Cell class="text-muted-foreground max-w-[200px] truncate">
						{debt.notes || '—'}
					</Table.Cell>
					<Table.Cell class="text-right">
						<div class="flex justify-end gap-2">
							<Button variant="outline" size="sm" onclick={() => openEditDialog(debt)}>
								{t(localeStore.t.finance.editItem, 'Edit')}
							</Button>
							<Button variant="destructive" size="sm" onclick={() => requestDelete(debt.id)}>
								{t(localeStore.t.finance.deleteItem, 'Delete')}
							</Button>
						</div>
					</Table.Cell>
				</Table.Row>
			{:else}
				<Table.Row>
					<Table.Cell colspan={5} class="text-muted-foreground text-center">
						{searchQuery
							? t(localeStore.t.finance.noMatchingResults, 'No matching results.')
							: t(localeStore.t.finance.noDebtsRecorded, 'No debts recorded.')}
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
	</div>

	<!-- Add / Edit Dialog -->
	<Dialog.Root bind:open={dialogOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>{dialogTitle}</Dialog.Title>
				<Dialog.Description>
					{editingId ? t(localeStore.t.finance.editDebtDesc, 'Update the debt details below.') : t(localeStore.t.finance.addDebtDesc, 'Enter the details for the new debt.')}
				</Dialog.Description>
			</Dialog.Header>

			<form
				class="flex flex-col gap-4"
				onsubmit={(e: Event) => {
					e.preventDefault();
					handleSave();
				}}
			>
				<div class="flex flex-col gap-2">
					<Label for="debt-name">{t(localeStore.t.finance.name, 'Name')}</Label>
					<Input id="debt-name" bind:value={formName} placeholder={t(localeStore.t.finance.placeholderEgCreditCard, 'e.g. Credit Card')} required />
				</div>

				<div class="flex flex-col gap-2">
					<Label for="debt-balance">{t(localeStore.t.finance.balance, 'Balance')} ($)</Label>
					<Input
						id="debt-balance"
						type="number"
						step="0.01"
						min="0"
						bind:value={formBalance}
						placeholder={t(localeStore.t.finance.placeholderAmount, '0.00')}
						required
					/>
				</div>

				<div class="flex items-center gap-3">
					<Switch id="debt-estimate" bind:checked={formIsEstimate} />
					<Label for="debt-estimate">{t(localeStore.t.finance.estimated, 'Estimated')} {t(localeStore.t.finance.balance, 'balance')}</Label>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="debt-notes">{t(localeStore.t.finance.notes, 'Notes')}</Label>
					<Input id="debt-notes" bind:value={formNotes} placeholder={t(localeStore.t.finance.optionalNotes, 'Optional notes')} />
				</div>

				<Dialog.Footer>
					<Button type="button" variant="outline" onclick={() => (dialogOpen = false)}>
						{t(localeStore.t.common.cancel, 'Cancel')}
					</Button>
					<Button type="submit">{editingId ? t(localeStore.t.finance.saveChanges, 'Save Changes') : t(localeStore.t.finance.addItem, 'Add Debt')}</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Delete Confirmation -->
	<ConfirmDialog
		bind:open={confirmOpen}
		title={t(localeStore.t.finance.deleteConfirmTitle, 'Delete Debt?')}
		description={t(localeStore.t.finance.deleteConfirmDesc, 'This action cannot be undone. This will permanently delete this debt entry.')}
		onConfirm={performDelete}
	/>
</div>
