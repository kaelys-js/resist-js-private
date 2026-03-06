<script lang="ts">
import { localeStore, t } from '$lib/i18n.svelte';
import type { Str, Num, Bool } from '@/schemas/common';
import type { DebtItem } from '$lib/schemas/finances';
import { invalidateAll } from '$app/navigation';
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Switch } from '$lib/components/ui/switch';
import { Separator } from '$lib/components/ui/separator';
import * as Dialog from '$lib/components/ui/dialog';
import * as Table from '$lib/components/ui/table';

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

// ── Derived ─────────────────────────────────────────────────────────
const totalDebt: Num = $derived(data.debts.reduce((sum: Num, d: DebtItem) => sum + d.balance, 0));

const dialogTitle: Str = $derived(editingId ? t(localeStore.t.finance.editItem, 'Edit Debt') : t(localeStore.t.finance.addItem, 'Add Debt'));

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

async function handleDelete(id: Str): Promise<void> {
	await fetch(`/api/debts/${id}`, { method: 'DELETE' });
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

	<!-- Table -->
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>{t(localeStore.t.finance.name, 'Name')}</Table.Head>
				<Table.Head class="text-right">{t(localeStore.t.finance.balance, 'Balance')}</Table.Head>
				<Table.Head>{t(localeStore.t.finance.estimated, 'Estimated?')}</Table.Head>
				<Table.Head>{t(localeStore.t.finance.notes, 'Notes')}</Table.Head>
				<Table.Head class="text-right">{t(localeStore.t.finance.actions, 'Actions')}</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each data.debts as debt (debt.id)}
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
							<Button variant="destructive" size="sm" onclick={() => handleDelete(debt.id)}>
								{t(localeStore.t.finance.deleteItem, 'Delete')}
							</Button>
						</div>
					</Table.Cell>
				</Table.Row>
			{:else}
				<Table.Row>
					<Table.Cell colspan={5} class="text-muted-foreground text-center">
						{t(localeStore.t.finance.noDebtsRecorded, 'No debts recorded.')}
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>

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
</div>
