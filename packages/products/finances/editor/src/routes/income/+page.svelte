<script lang="ts">
import { localeStore, t } from '$lib/i18n.svelte';
import type { Str, Num, Bool } from '@/schemas/common';
import { INCOME_FREQUENCIES, type IncomeSource, type Settings } from '$lib/schemas/finances';
import { invalidateAll } from '$app/navigation';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Separator } from '@/ui/separator';
import * as Dialog from '@/ui/dialog';
import * as Table from '@/ui/table';
import * as Select from '@/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { projectIncome, type YearlyIncome } from '$lib/engine/income';
import { Chart, Svg, Axis, Bars } from 'layerchart';
import { scaleBand, scaleLinear } from 'd3-scale';
import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

type PageData = {
	income: IncomeSource[];
	settings: Settings;
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

// ── Delete confirmation state ──────────────────────────────────────
let confirmOpen: Bool = $state(false);
let pendingDeleteId: Str | null = $state(null);

// ── Search & sort state ────────────────────────────────────────────
let searchQuery: Str = $state('');
let sortKey: Str = $state('name');
let sortDir: Str = $state('asc');

// ── Derived ─────────────────────────────────────────────────────────
const totalAssets: Num = $derived(
	data.income.reduce((sum: Num, s: IncomeSource) => sum + s.amount, 0),
);

const dialogTitle: Str = $derived(
	editingId
		? t(localeStore.t.finance.editItem, 'Edit Income')
		: t(localeStore.t.finance.addItem, 'Add Income'),
);

const sortedRows: IncomeSource[] = $derived.by(() => {
	const rows: IncomeSource[] = [...data.income];
	const dir: Num = sortDir === 'asc' ? 1 : -1;
	rows.sort((a: IncomeSource, b: IncomeSource) => {
		if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
		if (sortKey === 'amount') return (a.amount - b.amount) * dir;
		if (sortKey === 'frequency') return a.frequency.localeCompare(b.frequency) * dir;
		if (sortKey === 'startDate') return a.startDate.localeCompare(b.startDate) * dir;
		return 0;
	});
	return rows;
});

const filteredRows: IncomeSource[] = $derived(
	sortedRows.filter((row: IncomeSource) =>
		row.name.toLowerCase().includes(searchQuery.toLowerCase()),
	),
);

// ── Chart data ──────────────────────────────────────────────────────

const yearlyIncome: readonly YearlyIncome[] = $derived.by(() => {
	const result = projectIncome(data.income, data.settings);
	return result.ok ? result.data : [];
});

const incomeChartYears: Num[] = $derived(yearlyIncome.map((yi) => yi.year));
const incomeChartMax: Num = $derived.by(() => {
	if (yearlyIncome.length === 0) return 1;
	return Math.max(...yearlyIncome.map((yi) => yi.total));
});

const incomeXScale = $derived(scaleBand<Num>().domain(incomeChartYears).padding(0.2));

// ── EI Payment Schedule ─────────────────────────────────────────────

type PaymentDate = {
	date: Str;
	amount: Num;
	source: Str;
};

const biweeklyPayments: PaymentDate[] = $derived.by(() => {
	const payments: PaymentDate[] = [];
	const biweeklySources = data.income.filter((s) => s.frequency === 'biweekly');
	for (const source of biweeklySources) {
		const start = new Date(source.startDate);
		const end = source.endDate ? new Date(source.endDate) : new Date(start.getFullYear(), 11, 31);
		let current = new Date(start);
		while (current <= end) {
			payments.push({
				date: current.toISOString().split('T')[0] ?? '',
				amount: source.amount,
				source: source.name,
			});
			current = new Date(current.getTime() + 14 * 24 * 60 * 60 * 1000);
		}
	}
	return payments.toSorted((a, b) => a.date.localeCompare(b.date));
});

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

function formatFrequency(freq: Str): Str {
	const labels: Record<string, Str> = {
		'one-time': t(localeStore.t.finance.freqOneTime, 'One-time'),
		biweekly: t(localeStore.t.finance.freqBiweekly, 'Biweekly'),
		monthly: t(localeStore.t.finance.freqMonthly, 'Monthly'),
		annual: t(localeStore.t.finance.freqAnnual, 'Annual'),
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

function requestDelete(id: Str): void {
	pendingDeleteId = id;
	confirmOpen = true;
}

async function performDelete(): Promise<void> {
	if (!pendingDeleteId) return;
	await fetch(`/api/income/${pendingDeleteId}`, { method: 'DELETE' });
	pendingDeleteId = null;
	await invalidateAll();
}
</script>

<div class="flex flex-col gap-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<h1 class="text-2xl font-semibold tracking-tight">{t(localeStore.t.finance.projectedIncome, 'Income')}</h1>
			<Badge variant="secondary">{formatCurrency(totalAssets)}</Badge>
		</div>
		<Button onclick={openAddDialog}>{t(localeStore.t.finance.addItem, 'Add Income')}</Button>
	</div>

	<Separator />

	<!-- Search -->
	<div class="flex items-center gap-4">
		<Input
			type="search"
			placeholder={t(localeStore.t.finance.searchPlaceholder, 'Search income...')}
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
					onclick={() => toggleSort('amount')}
				>
					{t(localeStore.t.finance.amount, 'Amount')}{sortIndicator('amount')}
				</Table.Head>
				<Table.Head
					class="text-muted-foreground cursor-pointer text-xs font-medium uppercase tracking-wide select-none hover:bg-muted/50"
					onclick={() => toggleSort('frequency')}
				>
					{t(localeStore.t.finance.frequency, 'Frequency')}{sortIndicator('frequency')}
				</Table.Head>
				<Table.Head
					class="text-muted-foreground cursor-pointer text-xs font-medium uppercase tracking-wide select-none hover:bg-muted/50"
					onclick={() => toggleSort('startDate')}
				>
					{t(localeStore.t.finance.startDate, 'Start Date')}{sortIndicator('startDate')}
				</Table.Head>
				<Table.Head class="text-muted-foreground text-xs font-medium uppercase tracking-wide">
					{t(localeStore.t.finance.endDate, 'End Date')}
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
			{#each filteredRows as source (source.id)}
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
								{t(localeStore.t.finance.editItem, 'Edit')}
							</Button>
							<Button variant="destructive" size="sm" onclick={() => requestDelete(source.id)}>
								{t(localeStore.t.finance.deleteItem, 'Delete')}
							</Button>
						</div>
					</Table.Cell>
				</Table.Row>
			{:else}
				<Table.Row>
					<Table.Cell colspan={7} class="text-muted-foreground text-center">
						{searchQuery
							? t(localeStore.t.finance.noMatchingResults, 'No matching results.')
							: t(localeStore.t.finance.noIncomeRecorded, 'No income sources recorded.')}
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
	</div>

	<!-- Income Projection Chart -->
	{#if yearlyIncome.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>{t(localeStore.t.finance.projectedIncome, 'Income Projection by Year')}</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="h-[300px]">
					<Chart
						data={yearlyIncome}
						x="year"
						xScale={incomeXScale}
						y="total"
						yDomain={[0, incomeChartMax]}
						yNice
						padding={{ top: 20, right: 16, bottom: 40, left: 60 }}
					>
						<Svg>
							<Axis placement="left" format={(d) => `$${(d / 1000).toFixed(0)}k`} />
							<Axis placement="bottom" format={(d) => String(d)} />
							<Bars fill="#3b82f6" strokeWidth={0} />
						</Svg>
					</Chart>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- EI Payment Schedule -->
	{#if biweeklyPayments.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>{t(localeStore.t.finance.eiSchedule, 'Biweekly Payment Schedule')}</CardTitle>
			</CardHeader>
			<CardContent class="p-0">
				<div class="max-h-[400px] overflow-y-auto rounded-lg">
					<Table.Root>
						<Table.Header class="bg-muted sticky top-0 z-10">
							<Table.Row>
								<Table.Head class="text-muted-foreground text-xs font-medium uppercase tracking-wide">{t(localeStore.t.finance.date, 'Date')}</Table.Head>
								<Table.Head class="text-muted-foreground text-xs font-medium uppercase tracking-wide">{t(localeStore.t.finance.source, 'Source')}</Table.Head>
								<Table.Head class="text-muted-foreground text-right text-xs font-medium uppercase tracking-wide">{t(localeStore.t.finance.amount, 'Amount')}</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each biweeklyPayments as payment (payment.date + payment.source)}
								<Table.Row>
									<Table.Cell class="font-mono">{payment.date}</Table.Cell>
									<Table.Cell>{payment.source}</Table.Cell>
									<Table.Cell class="text-right font-mono">{formatCurrency(payment.amount)}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
						<Table.Footer>
							<Table.Row>
								<Table.Cell colspan={2} class="font-semibold">
									{t(localeStore.t.finance.totalPayments, 'Total')} ({biweeklyPayments.length})
								</Table.Cell>
								<Table.Cell class="text-right font-mono font-semibold">
									{formatCurrency(biweeklyPayments.reduce((sum, p) => sum + p.amount, 0))}
								</Table.Cell>
							</Table.Row>
						</Table.Footer>
					</Table.Root>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Add / Edit Dialog -->
	<Dialog.Root bind:open={dialogOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>{dialogTitle}</Dialog.Title>
				<Dialog.Description>
					{editingId
						? t(localeStore.t.finance.editIncomeDesc, 'Update the income source details below.')
						: t(localeStore.t.finance.addIncomeDesc, 'Enter the details for the new income source.')}
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
					<Label for="income-name">{t(localeStore.t.finance.name, 'Name')}</Label>
					<Input
						id="income-name"
						bind:value={formName}
						placeholder={t(localeStore.t.finance.placeholderEgSalary, 'e.g. Salary')}
						required
					/>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="income-amount">{t(localeStore.t.finance.amount, 'Amount')} ($)</Label>
					<Input
						id="income-amount"
						type="number"
						step="0.01"
						min="0"
						bind:value={formAmount}
						placeholder={t(localeStore.t.finance.placeholderAmount, '0.00')}
						required
					/>
				</div>

				<div class="flex flex-col gap-2">
					<Label>{t(localeStore.t.finance.frequency, 'Frequency')}</Label>
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
					<Label for="income-start-date">{t(localeStore.t.finance.startDate, 'Start Date')}</Label>
					<Input
						id="income-start-date"
						type="date"
						bind:value={formStartDate}
						required
					/>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="income-end-date">{t(localeStore.t.finance.endDate, 'End Date')} {t(localeStore.t.finance.optional, '(optional)')}</Label>
					<Input id="income-end-date" type="date" bind:value={formEndDate} />
				</div>

				<div class="flex flex-col gap-2">
					<Label for="income-notes">{t(localeStore.t.finance.notes, 'Notes')}</Label>
					<Input id="income-notes" bind:value={formNotes} placeholder={t(localeStore.t.finance.optionalNotes, 'Optional notes')} />
				</div>

				<Dialog.Footer>
					<Button type="button" variant="outline" onclick={() => (dialogOpen = false)}>
						{t(localeStore.t.common.cancel, 'Cancel')}
					</Button>
					<Button type="submit">{editingId ? t(localeStore.t.finance.saveChanges, 'Save Changes') : t(localeStore.t.finance.addItem, 'Add Income')}</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Delete Confirmation -->
	<ConfirmDialog
		bind:open={confirmOpen}
		title={t(localeStore.t.finance.deleteConfirmTitle, 'Delete Income Source?')}
		description={t(localeStore.t.finance.deleteConfirmDesc, 'This action cannot be undone. This will permanently delete this income source.')}
		onConfirm={performDelete}
	/>
</div>
