<script lang="ts">
import type { Str, Num, Bool } from '@/schemas/common';
import { BILLING_CYCLES, MONTHLY_CATEGORIES, type MonthlyExpense } from '$lib/schemas/finances';
import { invalidateAll } from '$app/navigation';
import { localeStore, t } from '$lib/i18n.svelte';
import * as Card from '$lib/components/ui/card/index.js';
import * as Table from '$lib/components/ui/table/index.js';
import * as Dialog from '$lib/components/ui/dialog/index.js';
import * as Select from '$lib/components/ui/select/index.js';
import { Button } from '$lib/components/ui/button/index.js';
import { Badge } from '$lib/components/ui/badge/index.js';
import { Input } from '$lib/components/ui/input/index.js';
import { Label } from '$lib/components/ui/label/index.js';
import { Separator } from '$lib/components/ui/separator/index.js';
import { Chart, Svg, Pie, Arc, Group, Text } from 'layerchart';
import { scaleOrdinal } from 'd3-scale';

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

function billingCycleLabel(cycle: Str): Str {
	const labels: Record<string, Str> = {
		monthly: t(localeStore.t.finance.billingMonthly, 'Monthly'),
		bimonthly: t(localeStore.t.finance.billingBimonthly, 'Bimonthly'),
	};
	return labels[cycle] ?? cycle;
}

function categoryLabel(cat: Str): Str {
	const labels: Record<string, Str> = {
		fixed: t(localeStore.t.finance.fixed, 'Fixed'),
		estimated: t(localeStore.t.finance.estimated, 'Estimated'),
	};
	return labels[cat] ?? cat;
}

// ── Pie chart data ───────────────────────────────────────────────

type PieSlice = {
	name: Str;
	value: Num;
	category: Str;
};

const pieData: PieSlice[] = $derived.by(() => {
	return expenses.map((e: MonthlyExpense) => ({
		name: e.name,
		value: e.billingCycle === 'monthly' ? e.amount : e.amount / 2,
		category: e.category,
	}));
});

const pieColors = $derived(
	scaleOrdinal<string, string>()
		.domain(pieData.map((d) => d.name))
		.range([
			'#3b82f6',
			'#8b5cf6',
			'#f59e0b',
			'#10b981',
			'#ef4444',
			'#06b6d4',
			'#ec4899',
			'#f97316',
			'#14b8a6',
			'#6366f1',
			'#84cc16',
			'#a855f7',
		]),
);

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
			<h1 class="text-2xl font-semibold tracking-tight">{t(localeStore.t.finance.overview, 'Monthly Expenses')}</h1>
			<Badge variant="secondary">{t(localeStore.t.finance.monthlyBurnRate, 'Monthly')}: {fmt(totalMonthly)}</Badge>
			<Badge variant="outline">{t(localeStore.t.finance.annualCost, 'Annual')}: {fmt(totalAnnual)}</Badge>
		</div>
		<Button onclick={openAddDialog}>{t(localeStore.t.finance.addItem, 'Add Expense')}</Button>
	</div>

	<!-- Expense Breakdown Pie Chart -->
	{#if pieData.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>{t(localeStore.t.finance.expensesByCategory, 'Monthly Expense Breakdown')}</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col items-center gap-6 md:flex-row">
					<div class="h-[300px] w-[300px]">
						<Chart data={pieData} x="value" c="name" cScale={pieColors}>
							<Svg>
								<Group center>
									<Pie
										innerRadius={60}
										padAngle={0.02}
										cornerRadius={4}
										sort={null}
									/>
								</Group>
							</Svg>
						</Chart>
					</div>
					<div class="flex flex-wrap gap-2">
						{#each pieData as slice}
							<div class="flex items-center gap-1.5 text-xs">
								<div class="h-3 w-3 rounded-sm" style="background-color: {pieColors(slice.name)}"></div>
								<span>{slice.name}: {fmt(slice.value)}</span>
							</div>
						{/each}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Fixed Expenses -->
	<Card.Root>
		<Card.Header>
			<Card.Title>{t(localeStore.t.finance.fixed, 'Fixed')}</Card.Title>
			<Card.Description>{t(localeStore.t.finance.fixedDesc, 'Recurring fixed-cost expenses')}</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if fixedExpenses.length === 0}
				<p class="text-muted-foreground text-sm">{t(localeStore.t.finance.noFixedExpenses, 'No fixed expenses yet.')}</p>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>{t(localeStore.t.finance.name, 'Name')}</Table.Head>
							<Table.Head class="text-right">{t(localeStore.t.finance.amount, 'Amount')}</Table.Head>
							<Table.Head>{t(localeStore.t.finance.billingCycle, 'Billing Cycle')}</Table.Head>
							<Table.Head class="text-right">{t(localeStore.t.finance.annualCostLabel, 'Annual Cost')}</Table.Head>
							<Table.Head>{t(localeStore.t.finance.notes, 'Notes')}</Table.Head>
							<Table.Head class="text-right">{t(localeStore.t.finance.actions, 'Actions')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each fixedExpenses as expense (expense.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{expense.name}</Table.Cell>
								<Table.Cell class="text-right">{fmt(expense.amount)}</Table.Cell>
								<Table.Cell>{billingCycleLabel(expense.billingCycle)}</Table.Cell>
								<Table.Cell class="text-right">{fmt(annualCost(expense))}</Table.Cell>
								<Table.Cell class="text-muted-foreground max-w-[200px] truncate">{expense.notes}</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-2">
										<Button variant="ghost" size="sm" onclick={() => openEditDialog(expense)}>{t(localeStore.t.finance.editItem, 'Edit')}</Button>
										<Button variant="ghost" size="sm" onclick={() => handleDelete(expense.id)}>{t(localeStore.t.finance.deleteItem, 'Delete')}</Button>
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
			<Card.Title>{t(localeStore.t.finance.estimated, 'Estimated')}</Card.Title>
			<Card.Description>{t(localeStore.t.finance.estimatedDesc, 'Recurring expenses with estimated amounts')}</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if estimatedExpenses.length === 0}
				<p class="text-muted-foreground text-sm">{t(localeStore.t.finance.noEstimatedExpenses, 'No estimated expenses yet.')}</p>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>{t(localeStore.t.finance.name, 'Name')}</Table.Head>
							<Table.Head class="text-right">{t(localeStore.t.finance.amount, 'Amount')}</Table.Head>
							<Table.Head>{t(localeStore.t.finance.billingCycle, 'Billing Cycle')}</Table.Head>
							<Table.Head class="text-right">{t(localeStore.t.finance.annualCostLabel, 'Annual Cost')}</Table.Head>
							<Table.Head>{t(localeStore.t.finance.notes, 'Notes')}</Table.Head>
							<Table.Head class="text-right">{t(localeStore.t.finance.actions, 'Actions')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each estimatedExpenses as expense (expense.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{expense.name}</Table.Cell>
								<Table.Cell class="text-right">{fmt(expense.amount)}</Table.Cell>
								<Table.Cell>{billingCycleLabel(expense.billingCycle)}</Table.Cell>
								<Table.Cell class="text-right">{fmt(annualCost(expense))}</Table.Cell>
								<Table.Cell class="text-muted-foreground max-w-[200px] truncate">{expense.notes}</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-2">
										<Button variant="ghost" size="sm" onclick={() => openEditDialog(expense)}>{t(localeStore.t.finance.editItem, 'Edit')}</Button>
										<Button variant="ghost" size="sm" onclick={() => handleDelete(expense.id)}>{t(localeStore.t.finance.deleteItem, 'Delete')}</Button>
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
				<Dialog.Title>{isEditing ? t(localeStore.t.finance.editItem, 'Edit Expense') : t(localeStore.t.finance.addItem, 'Add Expense')}</Dialog.Title>
				<Dialog.Description>
					{isEditing ? t(localeStore.t.finance.editExpenseDesc, 'Update the expense details below.') : t(localeStore.t.finance.addExpenseDesc, 'Enter the details for the new expense.')}
				</Dialog.Description>
			</Dialog.Header>
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<Label for="expense-name">{t(localeStore.t.finance.name, 'Name')}</Label>
					<Input id="expense-name" bind:value={formName} placeholder={t(localeStore.t.finance.placeholderExpenseName, 'Expense name')} />
				</div>
				<div class="grid gap-2">
					<Label for="expense-amount">{t(localeStore.t.finance.amount, 'Amount')} ($)</Label>
					<Input id="expense-amount" type="number" bind:value={formAmount} placeholder={t(localeStore.t.finance.placeholderAmount, '0.00')} />
				</div>
				<div class="flex items-center gap-2">
					<input
						id="expense-estimate"
						type="checkbox"
						bind:checked={formIsEstimate}
						class="accent-primary size-4 rounded"
					/>
					<Label for="expense-estimate">{t(localeStore.t.finance.estimated, 'Is Estimate')}</Label>
				</div>
				<div class="grid gap-2">
					<Label for="expense-billing">{t(localeStore.t.finance.billingCycle, 'Billing Cycle')}</Label>
					<Select.Root bind:value={formBillingCycle} type="single">
						<Select.Trigger id="expense-billing" class="w-full">
							{billingCycleLabel(formBillingCycle)}
						</Select.Trigger>
						<Select.Content>
							{#each BILLING_CYCLES as cycle}
								<Select.Item value={cycle} label={billingCycleLabel(cycle)} />
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-2">
					<Label for="expense-category">{t(localeStore.t.finance.category, 'Category')}</Label>
					<Select.Root bind:value={formCategory} type="single">
						<Select.Trigger id="expense-category" class="w-full">
							{categoryLabel(formCategory)}
						</Select.Trigger>
						<Select.Content>
							{#each MONTHLY_CATEGORIES as cat}
								<Select.Item value={cat} label={categoryLabel(cat)} />
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-2">
					<Label for="expense-notes">{t(localeStore.t.finance.notes, 'Notes')}</Label>
					<Input id="expense-notes" bind:value={formNotes} placeholder={t(localeStore.t.finance.optionalNotes, 'Optional notes')} />
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (dialogOpen = false)}>{t(localeStore.t.common.cancel, 'Cancel')}</Button>
				<Button onclick={handleSubmit}>{isEditing ? t(localeStore.t.finance.saveChanges, 'Save Changes') : t(localeStore.t.finance.addItem, 'Add Expense')}</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
