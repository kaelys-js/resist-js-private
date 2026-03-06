<script lang="ts">
import type { Str, Num, Bool } from '@/schemas/common';
import { BILLING_CYCLES, MONTHLY_CATEGORIES, type MonthlyExpense } from '$lib/schemas/finances';
import { invalidateAll } from '$app/navigation';
import * as Card from '$lib/components/ui/card/index.js';
import * as Table from '$lib/components/ui/table/index.js';
import * as Dialog from '$lib/components/ui/dialog/index.js';
import * as Select from '$lib/components/ui/select/index.js';
import { Button } from '$lib/components/ui/button/index.js';
import { Badge } from '$lib/components/ui/badge/index.js';
import { Input } from '$lib/components/ui/input/index.js';
import { Label } from '$lib/components/ui/label/index.js';
import { Separator } from '$lib/components/ui/separator/index.js';

const { data } = $props();

const expenses: MonthlyExpense[] = $derived(data.expenses as MonthlyExpense[]);

const fixedExpenses: MonthlyExpense[] = $derived(expenses.filter((e) => e.category === 'fixed'));
const estimatedExpenses: MonthlyExpense[] = $derived(
	expenses.filter((e) => e.category === 'estimated'),
);

function annualCost(expense: MonthlyExpense): Num {
	return expense.billingCycle === 'monthly' ? expense.amount * 12 : expense.amount * 6;
}

const totalMonthly: Num = $derived(
	expenses.reduce((sum, e) => {
		const monthly: Num = e.billingCycle === 'monthly' ? e.amount : e.amount / 2;
		return sum + monthly;
	}, 0),
);

const totalAnnual: Num = $derived(expenses.reduce((sum, e) => sum + annualCost(e), 0));

function fmt(value: Num): Str {
	return `$${value.toFixed(2)}`;
}

// ── Dialog state ─────────────────────────────────────────────────
let dialogOpen: Bool = $state(false);
let isEditing: Bool = $state(false);
let editingId: Str = $state('');

let formName: Str = $state('');
let formAmount: Str = $state('');
let formIsEstimate: Bool = $state(false);
let formBillingCycle: Str = $state('monthly');
let formCategory: Str = $state('fixed');
let formNotes: Str = $state('');

function resetForm(): void {
	formName = '';
	formAmount = '';
	formIsEstimate = false;
	formBillingCycle = 'monthly';
	formCategory = 'fixed';
	formNotes = '';
	isEditing = false;
	editingId = '';
}

function openAddDialog(): void {
	resetForm();
	dialogOpen = true;
}

function openEditDialog(expense: MonthlyExpense): void {
	isEditing = true;
	editingId = expense.id;
	formName = expense.name;
	formAmount = String(expense.amount);
	formIsEstimate = expense.isEstimate;
	formBillingCycle = expense.billingCycle;
	formCategory = expense.category;
	formNotes = expense.notes;
	dialogOpen = true;
}

async function handleSubmit(): Promise<void> {
	const amount: Num = Number.parseFloat(formAmount);
	if (!formName || Number.isNaN(amount)) return;

	const payload: MonthlyExpense = {
		id: isEditing ? editingId : crypto.randomUUID(),
		name: formName,
		amount,
		isEstimate: formIsEstimate,
		billingCycle: formBillingCycle as MonthlyExpense['billingCycle'],
		category: formCategory as MonthlyExpense['category'],
		notes: formNotes,
	};

	if (isEditing) {
		await fetch(`/api/monthly-expenses/${editingId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
	} else {
		await fetch('/api/monthly-expenses', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
	}

	dialogOpen = false;
	resetForm();
	await invalidateAll();
}

async function handleDelete(id: Str): Promise<void> {
	await fetch(`/api/monthly-expenses/${id}`, { method: 'DELETE' });
	await invalidateAll();
}
</script>

<div class="flex flex-1 flex-col gap-6 p-6">
	<!-- Header -->
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div class="flex items-center gap-3">
			<h1 class="text-2xl font-semibold tracking-tight">Monthly Expenses</h1>
			<Badge variant="secondary">Monthly: {fmt(totalMonthly)}</Badge>
			<Badge variant="outline">Annual: {fmt(totalAnnual)}</Badge>
		</div>
		<Button onclick={openAddDialog}>Add Expense</Button>
	</div>

	<!-- Fixed Expenses -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Fixed</Card.Title>
			<Card.Description>Recurring fixed-cost expenses</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if fixedExpenses.length === 0}
				<p class="text-muted-foreground text-sm">No fixed expenses yet.</p>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Name</Table.Head>
							<Table.Head class="text-right">Amount</Table.Head>
							<Table.Head>Billing Cycle</Table.Head>
							<Table.Head class="text-right">Annual Cost</Table.Head>
							<Table.Head>Notes</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each fixedExpenses as expense (expense.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{expense.name}</Table.Cell>
								<Table.Cell class="text-right">{fmt(expense.amount)}</Table.Cell>
								<Table.Cell class="capitalize">{expense.billingCycle}</Table.Cell>
								<Table.Cell class="text-right">{fmt(annualCost(expense))}</Table.Cell>
								<Table.Cell class="text-muted-foreground max-w-[200px] truncate">{expense.notes}</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-2">
										<Button variant="ghost" size="sm" onclick={() => openEditDialog(expense)}>Edit</Button>
										<Button variant="ghost" size="sm" onclick={() => handleDelete(expense.id)}>Delete</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Estimated Expenses -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Estimated</Card.Title>
			<Card.Description>Recurring expenses with estimated amounts</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if estimatedExpenses.length === 0}
				<p class="text-muted-foreground text-sm">No estimated expenses yet.</p>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Name</Table.Head>
							<Table.Head class="text-right">Amount</Table.Head>
							<Table.Head>Billing Cycle</Table.Head>
							<Table.Head class="text-right">Annual Cost</Table.Head>
							<Table.Head>Notes</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each estimatedExpenses as expense (expense.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{expense.name}</Table.Cell>
								<Table.Cell class="text-right">{fmt(expense.amount)}</Table.Cell>
								<Table.Cell class="capitalize">{expense.billingCycle}</Table.Cell>
								<Table.Cell class="text-right">{fmt(annualCost(expense))}</Table.Cell>
								<Table.Cell class="text-muted-foreground max-w-[200px] truncate">{expense.notes}</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-2">
										<Button variant="ghost" size="sm" onclick={() => openEditDialog(expense)}>Edit</Button>
										<Button variant="ghost" size="sm" onclick={() => handleDelete(expense.id)}>Delete</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Add/Edit Dialog -->
	<Dialog.Root bind:open={dialogOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>{isEditing ? 'Edit Expense' : 'Add Expense'}</Dialog.Title>
				<Dialog.Description>
					{isEditing ? 'Update the expense details below.' : 'Enter the details for the new expense.'}
				</Dialog.Description>
			</Dialog.Header>
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<Label for="expense-name">Name</Label>
					<Input id="expense-name" bind:value={formName} placeholder="Expense name" />
				</div>
				<div class="grid gap-2">
					<Label for="expense-amount">Amount ($)</Label>
					<Input id="expense-amount" type="number" bind:value={formAmount} placeholder="0.00" />
				</div>
				<div class="flex items-center gap-2">
					<input
						id="expense-estimate"
						type="checkbox"
						bind:checked={formIsEstimate}
						class="accent-primary size-4 rounded"
					/>
					<Label for="expense-estimate">Is Estimate</Label>
				</div>
				<div class="grid gap-2">
					<Label for="expense-billing">Billing Cycle</Label>
					<Select.Root bind:value={formBillingCycle} type="single">
						<Select.Trigger id="expense-billing" class="w-full">
							<span class="capitalize">{formBillingCycle}</span>
						</Select.Trigger>
						<Select.Content>
							{#each BILLING_CYCLES as cycle}
								<Select.Item value={cycle} label={cycle} />
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-2">
					<Label for="expense-category">Category</Label>
					<Select.Root bind:value={formCategory} type="single">
						<Select.Trigger id="expense-category" class="w-full">
							<span class="capitalize">{formCategory}</span>
						</Select.Trigger>
						<Select.Content>
							{#each MONTHLY_CATEGORIES as cat}
								<Select.Item value={cat} label={cat} />
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-2">
					<Label for="expense-notes">Notes</Label>
					<Input id="expense-notes" bind:value={formNotes} placeholder="Optional notes" />
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button>
				<Button onclick={handleSubmit}>{isEditing ? 'Save Changes' : 'Add Expense'}</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
