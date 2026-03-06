<script lang="ts">
import type { Num, Str, Bool } from '@/schemas/common';
import type {
	MonthlyExpense,
	LifetimeExpense,
	LifetimeReplacement,
	Travel,
	Purchase,
	Settings,
	InflationConfig,
} from '$lib/schemas/finances';
import {
	calculateLifetimeTotals,
	projectYearlyExpenses,
	type LifetimeSummary,
	type LifetimeItemCost,
	type YearlyProjection,
} from '$lib/engine/projections';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { Badge } from '$lib/components/ui/badge';
import { Separator } from '$lib/components/ui/separator';
import { Switch } from '$lib/components/ui/switch';
import { Label } from '$lib/components/ui/label';
import * as Table from '$lib/components/ui/table';

type PageData = {
	monthlyExpenses: MonthlyExpense[];
	lifetimeExpenses: LifetimeExpense[];
	lifetimeReplacements: LifetimeReplacement[];
	travel: Travel[];
	purchases: Purchase[];
	settings: Settings;
	inflation: InflationConfig[];
};

const { data }: { data: PageData } = $props();

const fmt = (n: Num): Str => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

let applyInflation: Bool = $state(true);

// ── Computed values ──────────────────────────────────────────────────

const expenseData = $derived({
	monthlyExpenses: data.monthlyExpenses,
	lifetimeExpenses: data.lifetimeExpenses,
	lifetimeReplacements: data.lifetimeReplacements,
	travel: data.travel,
	purchases: data.purchases,
});

const lifetimeSummary: LifetimeSummary | null = $derived.by(() => {
	const result = calculateLifetimeTotals(expenseData, data.settings, data.inflation);
	return result.ok ? result.data : null;
});

const sortedItems: readonly LifetimeItemCost[] = $derived.by(() => {
	if (!lifetimeSummary) return [];
	return [...lifetimeSummary.items].toSorted(
		(a: LifetimeItemCost, b: LifetimeItemCost) => b.inflatedTotal - a.inflatedTotal,
	);
});

const nominalProjections: readonly YearlyProjection[] = $derived.by(() => {
	const result = projectYearlyExpenses(expenseData, data.settings, data.inflation, false);
	return result.ok ? result.data : [];
});

const displayProjections: readonly YearlyProjection[] = $derived(
	applyInflation && lifetimeSummary ? lifetimeSummary.projections : nominalProjections,
);

const projectionGrandTotal: Num = $derived(
	displayProjections.reduce((sum: Num, p: YearlyProjection) => sum + p.total, 0),
);

const categoryLabel = (cat: Str): Str => {
	const labels: Record<Str, Str> = {
		monthly: 'Monthly',
		'lifetime-expense': 'Lifetime',
		'lifetime-replacement': 'Replacement',
		travel: 'Travel',
		purchase: 'Purchase',
	};
	return labels[cat] ?? cat;
};
</script>

<div class="flex flex-col gap-6 p-6">
	<!-- Page header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Lifetime Costs</h1>
			<p class="text-muted-foreground text-sm">Projected expenses from now until retirement.</p>
		</div>
		<div class="flex items-center gap-3">
			{#if lifetimeSummary}
				<Badge variant="secondary">Nominal: {fmt(lifetimeSummary.nominalGrandTotal)}</Badge>
				<Badge variant="default">Inflated: {fmt(lifetimeSummary.inflatedGrandTotal)}</Badge>
			{/if}
		</div>
	</div>

	<Separator />

	<!-- Inflation toggle -->
	<div class="flex items-center gap-3">
		<Switch bind:checked={applyInflation} id="inflation-toggle" />
		<Label for="inflation-toggle">Apply Inflation</Label>
	</div>

	<!-- Per-item breakdown table -->
	{#if sortedItems.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>Per-Item Breakdown</CardTitle>
			</CardHeader>
			<CardContent>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Name</Table.Head>
							<Table.Head>Category</Table.Head>
							<Table.Head class="text-right">Annual Cost</Table.Head>
							<Table.Head class="text-right">Nominal Total</Table.Head>
							<Table.Head class="text-right">Inflation-Adjusted Total</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each sortedItems as item (item.name + item.category)}
							<Table.Row>
								<Table.Cell class="font-medium">{item.name}</Table.Cell>
								<Table.Cell>
									<Badge variant="outline">{categoryLabel(item.category)}</Badge>
								</Table.Cell>
								<Table.Cell class="text-right font-mono">{fmt(item.annualCost)}</Table.Cell>
								<Table.Cell class="text-right font-mono">{fmt(item.nominalTotal)}</Table.Cell>
								<Table.Cell class="text-right font-mono font-semibold">
									{fmt(applyInflation ? item.inflatedTotal : item.nominalTotal)}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
					<Table.Footer>
						<Table.Row>
							<Table.Cell colspan={3} class="font-semibold">Grand Total</Table.Cell>
							<Table.Cell class="text-right font-mono font-semibold">
								{#if lifetimeSummary}
									{fmt(lifetimeSummary.nominalGrandTotal)}
								{/if}
							</Table.Cell>
							<Table.Cell class="text-right font-mono font-bold">
								{#if lifetimeSummary}
									{fmt(applyInflation ? lifetimeSummary.inflatedGrandTotal : lifetimeSummary.nominalGrandTotal)}
								{/if}
							</Table.Cell>
						</Table.Row>
					</Table.Footer>
				</Table.Root>
			</CardContent>
		</Card>
	{/if}

	<!-- Year-by-year projection table -->
	{#if displayProjections.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>Year-by-Year Projection</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Year</Table.Head>
								<Table.Head class="text-right">Monthly</Table.Head>
								<Table.Head class="text-right">Lifetime Expenses</Table.Head>
								<Table.Head class="text-right">Replacements</Table.Head>
								<Table.Head class="text-right">Travel</Table.Head>
								<Table.Head class="text-right">Purchases</Table.Head>
								<Table.Head class="text-right">Total</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each displayProjections as projection (projection.year)}
								<Table.Row>
									<Table.Cell class="font-medium">{projection.year}</Table.Cell>
									<Table.Cell class="text-right font-mono">{fmt(projection.monthly)}</Table.Cell>
									<Table.Cell class="text-right font-mono">{fmt(projection.lifetimeExpenses)}</Table.Cell>
									<Table.Cell class="text-right font-mono">{fmt(projection.lifetimeReplacements)}</Table.Cell>
									<Table.Cell class="text-right font-mono">{fmt(projection.travel)}</Table.Cell>
									<Table.Cell class="text-right font-mono">{fmt(projection.purchases)}</Table.Cell>
									<Table.Cell class="text-right font-mono font-semibold">{fmt(projection.total)}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
						<Table.Footer>
							<Table.Row>
								<Table.Cell colspan={6} class="font-semibold">Grand Total</Table.Cell>
								<Table.Cell class="text-right font-mono font-bold">{fmt(projectionGrandTotal)}</Table.Cell>
							</Table.Row>
						</Table.Footer>
					</Table.Root>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>
