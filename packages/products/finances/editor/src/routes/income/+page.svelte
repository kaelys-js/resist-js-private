<script lang="ts">
import { localeStore, t } from '$lib/i18n.svelte';
import type { Str, Num, Bool } from '@/schemas/common';
import { INCOME_FREQUENCIES, type IncomeSource, type Settings } from '$lib/schemas/finances';
import { invalidateAll } from '$app/navigation';
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Separator } from '$lib/components/ui/separator';
import * as Dialog from '$lib/components/ui/dialog';
import * as Table from '$lib/components/ui/table';
import * as Select from '$lib/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { projectIncome, type YearlyIncome } from '$lib/engine/income';
import { Chart, Svg, Axis, Bars } from 'layerchart';
import { scaleBand, scaleLinear } from 'd3-scale';

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

// ── Derived ─────────────────────────────────────────────────────────
const totalAssets: Num = $derived(
	data.income.reduce((sum: Num, s: IncomeSource) => sum + s.amount, 0),
);

const dialogTitle: Str = $derived(editingId ? t(localeStore.t.finance.editItem, 'Edit Income') : t(localeStore.t.finance.addItem, 'Add Income'));

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
	return payments.sort((a, b) => a.date.localeCompare(b.date));
});

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

async function handleDelete(id: Str): Promise<void> {
	await fetch(`/api/income/${id}`, { method: 'DELETE' });
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

	<!-- Table -->
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>{t(localeStore.t.finance.name, 'Name')}</Table.Head>
				<Table.Head class="text-right">{t(localeStore.t.finance.amount, 'Amount')}</Table.Head>
				<Table.Head>{t(localeStore.t.finance.frequency, 'Frequency')}</Table.Head>
				<Table.Head>{t(localeStore.t.finance.startDate, 'Start Date')}</Table.Head>
				<Table.Head>{t(localeStore.t.finance.endDate, 'End Date')}</Table.Head>
				<Table.Head>{t(localeStore.t.finance.notes, 'Notes')}</Table.Head>
				<Table.Head class="text-right">{t(localeStore.t.finance.actions, 'Actions')}</Table.Head>
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
								{t(localeStore.t.finance.editItem, 'Edit')}
							</Button>
							<Button variant="destructive" size="sm" onclick={() => handleDelete(source.id)}>
								{t(localeStore.t.finance.deleteItem, 'Delete')}
							</Button>
						</div>
					</Table.Cell>
				</Table.Row>
			{:else}
				<Table.Row>
					<Table.Cell colspan={7} class="text-muted-foreground text-center">
						{t(localeStore.t.finance.noIncomeRecorded, 'No income sources recorded.')}
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>

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
			<CardContent>
				<div class="max-h-[400px] overflow-y-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>{t(localeStore.t.finance.date, 'Date')}</Table.Head>
								<Table.Head>{t(localeStore.t.finance.source, 'Source')}</Table.Head>
								<Table.Head class="text-right">{t(localeStore.t.finance.amount, 'Amount')}</Table.Head>
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
</div>
