<script lang="ts">
import type { Num, Str, Bool } from '@/schemas/common';
import { localeStore, t } from '$lib/i18n.svelte';
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
import { Input } from '$lib/components/ui/input';
import { Button } from '$lib/components/ui/button';
import * as Table from '$lib/components/ui/table';
import { Chart, Svg, Axis, Area, Spline } from 'layerchart';
import { scaleLinear } from 'd3-scale';
import { invalidateAll } from '$app/navigation';

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
		monthly: t(localeStore.t.finance.categoryMonthly, 'Monthly'),
		'lifetime-expense': t(localeStore.t.finance.categoryLifetime, 'Lifetime'),
		'lifetime-replacement': t(localeStore.t.finance.categoryReplacements, 'Replacements'),
		travel: t(localeStore.t.finance.categoryTravel, 'Travel'),
		purchase: t(localeStore.t.finance.categoryPurchases, 'Purchases'),
	};
	return labels[cat] ?? cat;
};

// ── Cumulative cost curve data ──────────────────────────────────────

type CumulativePoint = {
	year: Num;
	cumulative: Num;
	yearTotal: Num;
};

const cumulativeData: CumulativePoint[] = $derived.by(() => {
	let running: Num = 0;
	return displayProjections.map((p: YearlyProjection) => {
		running += p.total;
		return {
			year: p.year,
			cumulative: Math.round(running * 100) / 100,
			yearTotal: p.total,
		};
	});
});

const cumulativeMax: Num = $derived.by(() => {
	if (cumulativeData.length === 0) return 1;
	return cumulativeData[cumulativeData.length - 1]?.cumulative ?? 1;
});

// ── Inflation config editing ────────────────────────────────────────

const inflationCategories = ['housing', 'food', 'general', 'travel'] as const;

const inflationCategoryLabels: Record<string, Str> = $derived({
	housing: t(localeStore.t.finance.categoryHousing, 'Housing'),
	food: t(localeStore.t.finance.categoryFood, 'Food'),
	general: t(localeStore.t.finance.categoryGeneral, 'General'),
	travel: t(localeStore.t.finance.categoryTravel, 'Travel'),
});

let inflationEdits: Record<string, string> = $state({});

// Initialize inflation edits from data
$effect(() => {
	const edits: Record<string, string> = {};
	for (const cat of inflationCategories) {
		const existing = data.inflation.find((c: InflationConfig) => c.category === cat);
		edits[cat] = existing
			? String((existing.rate * 100).toFixed(1))
			: String((data.settings.defaultInflationRate * 100).toFixed(1));
	}
	inflationEdits = edits;
});

async function saveInflationRate(category: string): Promise<void> {
	const ratePercent = Number.parseFloat(inflationEdits[category] ?? '2');
	if (Number.isNaN(ratePercent)) return;
	const rate = ratePercent / 100;

	await fetch('/api/inflation', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ category, rate }),
	});
	await invalidateAll();
}
</script>

<div class="flex flex-col gap-6 p-6">
	<!-- Page header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">{t(localeStore.t.finance.lifetimeExpenses, 'Lifetime Costs')}</h1>
			<p class="text-muted-foreground text-sm">{t(localeStore.t.finance.projectedUntilRetirement, 'Projected expenses from now until retirement.')}</p>
		</div>
		<div class="flex items-center gap-3">
			{#if lifetimeSummary}
				<Badge variant="secondary">{t(localeStore.t.finance.nominal, 'Nominal')}: {fmt(lifetimeSummary.nominalGrandTotal)}</Badge>
				<Badge variant="default">{t(localeStore.t.finance.inflationAdjusted, 'Inflated')}: {fmt(lifetimeSummary.inflatedGrandTotal)}</Badge>
			{/if}
		</div>
	</div>

	<Separator />

	<!-- Inflation toggle -->
	<div class="flex items-center gap-3">
		<Switch bind:checked={applyInflation} id="inflation-toggle" />
		<Label for="inflation-toggle">{t(localeStore.t.finance.showInflationToggle, 'Apply Inflation')}</Label>
	</div>

	<!-- Per-Category Inflation Rates -->
	<Card>
		<CardHeader>
			<CardTitle>{t(localeStore.t.finance.perCategoryInflation, 'Inflation Rates by Category')}</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{#each inflationCategories as cat}
					<div class="flex flex-col gap-2">
						<Label for="inflation-{cat}">{inflationCategoryLabels[cat]}</Label>
						<div class="flex items-center gap-2">
							<Input
								id="inflation-{cat}"
								type="number"
								step="0.1"
								min="0"
								max="100"
								bind:value={inflationEdits[cat]}
								class="w-24"
							/>
							<span class="text-sm text-muted-foreground">%</span>
							<Button variant="outline" size="sm" onclick={() => saveInflationRate(cat)}>
								{t(localeStore.t.common.save, 'Save')}
							</Button>
						</div>
					</div>
				{/each}
			</div>
			<p class="mt-3 text-xs text-muted-foreground">
				{t(localeStore.t.finance.defaultRateHint, 'Default rate')}: {(data.settings.defaultInflationRate * 100).toFixed(1)}%
			</p>
		</CardContent>
	</Card>

	<!-- Cumulative Cost Curve -->
	{#if cumulativeData.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>{t(localeStore.t.finance.cumulativeCosts, 'Cumulative Cost Curve')}</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="h-[350px]">
					<Chart
						data={cumulativeData}
						x="year"
						y="cumulative"
						xScale={scaleLinear()}
						xDomain={[cumulativeData[0]?.year ?? 0, cumulativeData[cumulativeData.length - 1]?.year ?? 1]}
						yDomain={[0, cumulativeMax]}
						yNice
						padding={{ top: 20, right: 16, bottom: 40, left: 80 }}
					>
						<Svg>
							<Axis placement="left" format={(d) => `$${(d / 1000).toFixed(0)}k`} />
							<Axis placement="bottom" format={(d) => String(Math.round(d))} />
							<Area fill="#3b82f6" fillOpacity={0.15} class="stroke-none" />
							<Spline stroke="#3b82f6" class="fill-none stroke-2" />
						</Svg>
					</Chart>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Per-item breakdown table -->
	{#if sortedItems.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>{t(localeStore.t.finance.perItemBreakdown, 'Per-Item Breakdown')}</CardTitle>
			</CardHeader>
			<CardContent>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>{t(localeStore.t.finance.name, 'Name')}</Table.Head>
							<Table.Head>{t(localeStore.t.finance.category, 'Category')}</Table.Head>
							<Table.Head class="text-right">{t(localeStore.t.finance.annualCostLabel, 'Annual Cost')}</Table.Head>
							<Table.Head class="text-right">{t(localeStore.t.finance.nominal, 'Nominal Total')}</Table.Head>
							<Table.Head class="text-right">{t(localeStore.t.finance.inflationAdjusted, 'Inflation-Adjusted Total')}</Table.Head>
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
							<Table.Cell colspan={3} class="font-semibold">{t(localeStore.t.finance.grandTotal, 'Grand Total')}</Table.Cell>
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
				<CardTitle>{t(localeStore.t.finance.yearByYear, 'Year-by-Year Projection')}</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>{t(localeStore.t.finance.year, 'Year')}</Table.Head>
								<Table.Head class="text-right">{t(localeStore.t.finance.monthlyBurnRate, 'Monthly')}</Table.Head>
								<Table.Head class="text-right">{t(localeStore.t.finance.lifetimeExpenses, 'Lifetime Expenses')}</Table.Head>
								<Table.Head class="text-right">{t(localeStore.t.finance.replacementCosts, 'Replacements')}</Table.Head>
								<Table.Head class="text-right">{t(localeStore.t.finance.categoryTravel, 'Travel')}</Table.Head>
								<Table.Head class="text-right">{t(localeStore.t.finance.upcomingPurchases, 'Purchases')}</Table.Head>
								<Table.Head class="text-right">{t(localeStore.t.finance.total, 'Total')}</Table.Head>
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
								<Table.Cell colspan={6} class="font-semibold">{t(localeStore.t.finance.grandTotal, 'Grand Total')}</Table.Cell>
								<Table.Cell class="text-right font-mono font-bold">{fmt(projectionGrandTotal)}</Table.Cell>
							</Table.Row>
						</Table.Footer>
					</Table.Root>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>
