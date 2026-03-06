<script lang="ts">
import type { Str, Num, Bool } from '@/schemas/common';
import { INCOME_FREQUENCIES, type IncomeSource } from '$lib/schemas/finances';
import { invalidateAll } from '$app/navigation';
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Separator } from '$lib/components/ui/separator';
import * as Dialog from '$lib/components/ui/dialog';
import * as Table from '$lib/components/ui/table';
import * as Select from '$lib/components/ui/select';

type PageData = {
	income: IncomeSource[];
};

const { data }: { data: PageData } = $props();

// ── Dialog state ────────────────────────────────────────────────────
let dialogOpen: Bool = $state(false);
let editingId: Str | null = $state(null);

let formName: Str = $state('');
let formAmount: Str = $state('');
let formFrequency: Str = $state('monthly');
let formStartDate: Str = $state('');
let formEndDate: Str = $state('');
let formNotes: Str = $state('');

// ── Derived ─────────────────────────────────────────────────────────
const totalAssets: Num = $derived(
	data.income.reduce((sum: Num, s: IncomeSource) => sum + s.amount, 0),
);

const dialogTitle: Str = $derived(editingId ? 'Edit Income' : 'Add Income');

// ── Formatting ──────────────────────────────────────────────────────
function formatCurrency(value: Num): Str {
	return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatFrequency(freq: Str): Str {
	const labels: Record<string, Str> = {
		'one-time': 'One-time',
		biweekly: 'Biweekly',
		monthly: 'Monthly',
		annual: 'Annual',
	};
	return labels[freq] ?? freq;
}

// ── Dialog helpers ──────────────────────────────────────────────────
function openAddDialog(): void {
	editingId = null;
	formName = '';
	formAmount = '';
	formFrequency = 'monthly';
	formStartDate = '';
	formEndDate = '';
	formNotes = '';
	dialogOpen = true;
}

function openEditDialog(source: IncomeSource): void {
	editingId = source.id;
	formName = source.name;
	formAmount = String(source.amount);
	formFrequency = source.frequency;
	formStartDate = source.startDate;
	formEndDate = source.endDate ?? '';
	formNotes = source.notes;
	dialogOpen = true;
}

// ── CRUD operations ─────────────────────────────────────────────────
async function handleSave(): Promise<void> {
	const amount: Num = Number.parseFloat(formAmount) || 0;
	const item: IncomeSource = {
		id: editingId ?? crypto.randomUUID(),
		name: formName,
		amount,
		frequency: formFrequency as IncomeSource['frequency'],
		startDate: formStartDate,
		endDate: formEndDate || undefined,
		notes: formNotes,
	};

	if (editingId) {
		await fetch(`/api/income/${editingId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(item),
		});
	} else {
		await fetch('/api/income', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(item),
		});
	}

	dialogOpen = false;
	await invalidateAll();
}

async function handleDelete(id: Str): Promise<void> {
	await fetch(`/api/income/${id}`, { method: 'DELETE' });
	await invalidateAll();
}
</script>

<div class="flex flex-col gap-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<h1 class="text-2xl font-semibold tracking-tight">Income</h1>
			<Badge variant="secondary">{formatCurrency(totalAssets)}</Badge>
		</div>
		<Button onclick={openAddDialog}>Add Income</Button>
	</div>

	<Separator />

	<!-- Table -->
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>Name</Table.Head>
				<Table.Head class="text-right">Amount</Table.Head>
				<Table.Head>Frequency</Table.Head>
				<Table.Head>Start Date</Table.Head>
				<Table.Head>End Date</Table.Head>
				<Table.Head>Notes</Table.Head>
				<Table.Head class="text-right">Actions</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each data.income as source (source.id)}
				<Table.Row>
					<Table.Cell class="font-medium">{source.name}</Table.Cell>
					<Table.Cell class="text-right">{formatCurrency(source.amount)}</Table.Cell>
					<Table.Cell>
						<Badge variant="outline">{formatFrequency(source.frequency)}</Badge>
					</Table.Cell>
					<Table.Cell>{source.startDate}</Table.Cell>
					<Table.Cell class="text-muted-foreground">{source.endDate || '—'}</Table.Cell>
					<Table.Cell class="text-muted-foreground max-w-[200px] truncate">
						{source.notes || '—'}
					</Table.Cell>
					<Table.Cell class="text-right">
						<div class="flex justify-end gap-2">
							<Button variant="outline" size="sm" onclick={() => openEditDialog(source)}>
								Edit
							</Button>
							<Button variant="destructive" size="sm" onclick={() => handleDelete(source.id)}>
								Delete
							</Button>
						</div>
					</Table.Cell>
				</Table.Row>
			{:else}
				<Table.Row>
					<Table.Cell colspan={7} class="text-muted-foreground text-center">
						No income sources recorded.
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
					{editingId
						? 'Update the income source details below.'
						: 'Enter the details for the new income source.'}
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
					<Label for="income-name">Name</Label>
					<Input
						id="income-name"
						bind:value={formName}
						placeholder="e.g. Salary"
						required
					/>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="income-amount">Amount ($)</Label>
					<Input
						id="income-amount"
						type="number"
						step="0.01"
						min="0"
						bind:value={formAmount}
						placeholder="0.00"
						required
					/>
				</div>

				<div class="flex flex-col gap-2">
					<Label>Frequency</Label>
					<Select.Root type="single" bind:value={formFrequency}>
						<Select.Trigger class="w-full">
							{formatFrequency(formFrequency)}
						</Select.Trigger>
						<Select.Content>
							{#each INCOME_FREQUENCIES as freq}
								<Select.Item value={freq} label={formatFrequency(freq)} />
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="income-start-date">Start Date</Label>
					<Input
						id="income-start-date"
						type="date"
						bind:value={formStartDate}
						required
					/>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="income-end-date">End Date (optional)</Label>
					<Input id="income-end-date" type="date" bind:value={formEndDate} />
				</div>

				<div class="flex flex-col gap-2">
					<Label for="income-notes">Notes</Label>
					<Input id="income-notes" bind:value={formNotes} placeholder="Optional notes" />
				</div>

				<Dialog.Footer>
					<Button type="button" variant="outline" onclick={() => (dialogOpen = false)}>
						Cancel
					</Button>
					<Button type="submit">{editingId ? 'Save Changes' : 'Add Income'}</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
</div>
