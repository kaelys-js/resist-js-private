<script lang="ts">
import { localeStore, t } from '$lib/i18n.svelte';
import type { Num, Str } from '@/schemas/common';
import type {
	DebtItem,
	IncomeSource,
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
	monthlyToAnnual,
	lifetimeToAnnual,
	getCurrentYear,
	getRetirementYear,
	projectYearlyExpenses,
	type YearlyProjection,
} from '$lib/engine/projections';
import { projectIncome, calculateNetPosition, type YearlyIncome } from '$lib/engine/income';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { Badge } from '$lib/components/ui/badge';
import { Separator } from '$lib/components/ui/separator';
import { Chart, Svg, Axis, Bars, Spline } from 'layerchart';
import { scaleBand, scaleLinear } from 'd3-scale';
import { stack, stackOffsetNone } from 'd3-shape';

type PageData = {
	debts: DebtItem[];
	income: IncomeSource[];
	monthlyExpenses: MonthlyExpense[];
	purchases: Purchase[];
	lifetimeReplacements: LifetimeReplacement[];
	travel: Travel[];
	settings: Settings;
	inflation: InflationConfig[];
	lifetimeExpenses: LifetimeExpense[];
};

const { data }: { data: PageData } = $props();

const fmt = (n: Num): Str => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ── Computed values ──────────────────────────────────────────────────

const totalDebt: Num = $derived(data.debts.reduce((sum: Num, d: DebtItem) => sum + d.balance, 0));

const monthlyBurnRate: Num = $derived(
	data.monthlyExpenses.reduce((sum: Num, e: MonthlyExpense) => sum + monthlyToAnnual(e), 0) / 12,
);

const annualMonthly: Num = $derived(
	data.monthlyExpenses.reduce((sum: Num, e: MonthlyExpense) => sum + monthlyToAnnual(e), 0),
);

const annualLifetimeExp: Num = $derived(
	data.lifetimeExpenses.reduce((sum: Num, e: LifetimeExpense) => sum + lifetimeToAnnual(e), 0),
);

const annualReplacements: Num = $derived(
	data.lifetimeReplacements.reduce(
		(sum: Num, r: LifetimeReplacement) => sum + lifetimeToAnnual(r),
		0,
	),
);

const annualCost: Num = $derived(annualMonthly + annualLifetimeExp + annualReplacements);

const currentAge: Num = $derived.by(() => {
	const birth: Date = new Date(data.settings.birthDate);
	const now: Date = new Date();
	let age: Num = now.getFullYear() - birth.getFullYear();
	const monthDiff: Num = now.getMonth() - birth.getMonth();
	if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
		age--;
	}
	return age;
});

const yearsToRetirement: Num = $derived(Math.max(data.settings.retirementAge - currentAge, 0));

const totalAssets: Num = $derived(
	data.income
		.filter((s: IncomeSource) => s.frequency === 'one-time')
		.reduce((sum: Num, s: IncomeSource) => sum + s.amount, 0),
);

const maxDebt: Num = $derived.by(() => {
	if (data.debts.length === 0) return 1;
	return Math.max(...data.debts.map((d: DebtItem) => d.balance));
});

// ── Chart data ──────────────────────────────────────────────────────

const expenseData = $derived({
	monthlyExpenses: data.monthlyExpenses,
	lifetimeExpenses: data.lifetimeExpenses,
	lifetimeReplacements: data.lifetimeReplacements,
	travel: data.travel,
	purchases: data.purchases,
});

const yearlyProjections: readonly YearlyProjection[] = $derived.by(() => {
	const result = projectYearlyExpenses(expenseData, data.settings, data.inflation, false);
	return result.ok ? result.data : [];
});

const categoryKeys = [
	'monthly',
	'lifetimeExpenses',
	'lifetimeReplacements',
	'travel',
	'purchases',
] as const;

const categoryColors: Record<string, string> = {
	monthly: '#3b82f6',
	lifetimeExpenses: '#8b5cf6',
	lifetimeReplacements: '#f59e0b',
	travel: '#10b981',
	purchases: '#ef4444',
};

const categoryLabels: Record<string, Str> = $derived({
	monthly: t(localeStore.t.finance.categoryMonthly, 'Monthly'),
	lifetimeExpenses: t(localeStore.t.finance.categoryLifetime, 'Lifetime'),
	lifetimeReplacements: t(localeStore.t.finance.categoryReplacements, 'Replacements'),
	travel: t(localeStore.t.finance.categoryTravel, 'Travel'),
	purchases: t(localeStore.t.finance.categoryPurchases, 'Purchases'),
});

type StackedRow = {
	year: Num;
	monthly: Num;
	lifetimeExpenses: Num;
	lifetimeReplacements: Num;
	travel: Num;
	purchases: Num;
};

const stackedData = $derived.by(() => {
	const rows: StackedRow[] = yearlyProjections.map((p: YearlyProjection) => ({
		year: p.year,
		monthly: p.monthly,
		lifetimeExpenses: p.lifetimeExpenses,
		lifetimeReplacements: p.lifetimeReplacements,
		travel: p.travel,
		purchases: p.purchases,
	}));
	return rows;
});

const stackGenerator = $derived(
	stack<StackedRow>()
		.keys([...categoryKeys])
		.offset(stackOffsetNone),
);

const stackSeries = $derived(stackedData.length > 0 ? stackGenerator(stackedData) : []);

const stackYears: Num[] = $derived(stackedData.map((d) => d.year));
const stackMaxY: Num = $derived.by(() => {
	if (stackedData.length === 0) return 1;
	return Math.max(
		...stackedData.map(
			(d) => d.monthly + d.lifetimeExpenses + d.lifetimeReplacements + d.travel + d.purchases,
		),
	);
});

const xScaleBand = $derived(scaleBand<Num>().domain(stackYears).padding(0.1));

// ── Income vs Expenses line chart data ──────────────────────────────

const yearlyIncome: readonly YearlyIncome[] = $derived.by(() => {
	const result = projectIncome(data.income, data.settings);
	return result.ok ? result.data : [];
});

type IncomeExpensePoint = {
	year: Num;
	income: Num;
	expenses: Num;
};

const incomeExpenseData: IncomeExpensePoint[] = $derived.by(() => {
	const incomeMap = new Map<Num, Num>();
	for (const yi of yearlyIncome) {
		incomeMap.set(yi.year, yi.total);
	}
	return yearlyProjections.map((p: YearlyProjection) => ({
		year: p.year,
		income: incomeMap.get(p.year) ?? 0,
		expenses: p.total,
	}));
});

const lineMaxY: Num = $derived.by(() => {
	if (incomeExpenseData.length === 0) return 1;
	return Math.max(...incomeExpenseData.map((d) => Math.max(d.income, d.expenses)));
});

// ── Net Position ────────────────────────────────────────────────────

const totalProjectedIncome: Num = $derived(
	yearlyIncome.reduce((sum: Num, yi: YearlyIncome) => sum + yi.total, 0),
);

const totalProjectedExpenses: Num = $derived(
	yearlyProjections.reduce((sum: Num, p: YearlyProjection) => sum + p.total, 0),
);

const netPosition: Num = $derived(totalProjectedIncome - totalProjectedExpenses - totalDebt);
</script>

<div class="flex flex-col gap-6 p-6">
	<!-- Page header -->
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">{t(localeStore.t.finance.overview, 'Financial Overview')}</h1>
		<p class="text-muted-foreground text-sm">{t(localeStore.t.finance.overviewSubtitle, 'A snapshot of your current financial position.')}</p>
	</div>

	<Separator />

	<!-- Summary stat cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
		<Card>
			<CardHeader>
				<CardTitle class="text-sm font-medium text-muted-foreground">{t(localeStore.t.finance.totalDebt, 'Total Debt')}</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold text-destructive">{fmt(totalDebt)}</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle class="text-sm font-medium text-muted-foreground">{t(localeStore.t.finance.monthlyBurnRate, 'Monthly Burn Rate')}</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold">{fmt(monthlyBurnRate)}</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle class="text-sm font-medium text-muted-foreground">{t(localeStore.t.finance.annualCost, 'Annual Cost')}</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold">{fmt(annualCost)}</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle class="text-sm font-medium text-muted-foreground">{t(localeStore.t.finance.yearsToRetirement, 'Years to Retirement')}</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold">{yearsToRetirement}</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle class="text-sm font-medium text-muted-foreground">{t(localeStore.t.finance.totalAssets, 'Total Assets')}</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold text-green-600 dark:text-green-400">{fmt(totalAssets)}</p>
			</CardContent>
		</Card>
	</div>

	<!-- Debt overview section -->
	{#if data.debts.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>{t(localeStore.t.finance.debtProgress, 'Debt Overview')}</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="flex flex-col gap-4">
					{#each data.debts as debt (debt.id)}
						<div class="flex flex-col gap-1.5">
							<div class="flex items-center justify-between text-sm">
								<span class="font-medium">{debt.name}</span>
								<div class="flex items-center gap-2">
									{#if debt.isEstimate}
										<Badge variant="outline" class="text-xs">{t(localeStore.t.finance.est, 'Est.')}</Badge>
									{/if}
									<span class="font-mono text-muted-foreground">{fmt(debt.balance)}</span>
								</div>
							</div>
							<div class="bg-muted h-2 w-full overflow-hidden rounded-full">
								<div
									class="bg-destructive h-full rounded-full transition-all"
									style="width: {Math.min((debt.balance / maxDebt) * 100, 100)}%"
								></div>
							</div>
						</div>
					{/each}
				</div>

				<Separator class="my-4" />

				<div class="flex items-center justify-between text-sm font-semibold">
					<span>{t(localeStore.t.finance.totalDebt, 'Total Outstanding')}</span>
					<span class="font-mono">{fmt(totalDebt)}</span>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Net Position Summary -->
	<Card>
		<CardHeader>
			<CardTitle>{t(localeStore.t.finance.netPosition, 'Net Position Summary')}</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div class="flex flex-col gap-1">
					<span class="text-sm text-muted-foreground">{t(localeStore.t.finance.projectedIncome, 'Projected Income')}</span>
					<span class="text-xl font-bold text-green-600 dark:text-green-400">{fmt(totalProjectedIncome)}</span>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-sm text-muted-foreground">{t(localeStore.t.finance.projectedExpenses, 'Projected Expenses + Debt')}</span>
					<span class="text-xl font-bold text-destructive">{fmt(totalProjectedExpenses + totalDebt)}</span>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-sm text-muted-foreground">{t(localeStore.t.finance.netPosition, 'Net Position')}</span>
					<span class="text-xl font-bold" class:text-green-600={netPosition >= 0} class:dark:text-green-400={netPosition >= 0} class:text-destructive={netPosition < 0}>
						{fmt(netPosition)}
					</span>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Stacked Bar Chart: Annual Expenses by Category -->
	{#if stackedData.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>{t(localeStore.t.finance.expensesByCategory, 'Annual Expenses by Category')}</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="mb-4 flex flex-wrap gap-3">
					{#each categoryKeys as key}
						<div class="flex items-center gap-1.5 text-xs">
							<div class="h-3 w-3 rounded-sm" style="background-color: {categoryColors[key]}"></div>
							<span>{categoryLabels[key]}</span>
						</div>
					{/each}
				</div>
				<div class="h-[350px]">
					<Chart
						data={stackedData}
						x="year"
						xScale={xScaleBand}
						y="total"
						yDomain={[0, stackMaxY]}
						yNice
						padding={{ top: 20, right: 16, bottom: 40, left: 60 }}
					>
						<Svg>
							<Axis placement="left" format={(d) => `$${(d / 1000).toFixed(0)}k`} />
							<Axis placement="bottom" format={(d) => String(d)} />
							{#each stackSeries as series}
								{@const seriesData = series.map((point: any) => ({
									year: point.data.year,
									y0: point[0],
									y1: point[1],
								}))}
								<Bars
									data={seriesData}
									x="year"
									y="y1"
									y1="y0"
									fill={categoryColors[series.key]}
									strokeWidth={0}
								/>
							{/each}
						</Svg>
					</Chart>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Line Chart: Income vs Expenses Over Time -->
	{#if incomeExpenseData.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>{t(localeStore.t.finance.incomeVsExpenses, 'Income vs Expenses Over Time')}</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="mb-4 flex gap-4">
					<div class="flex items-center gap-1.5 text-xs">
						<div class="h-0.5 w-4 rounded" style="background-color: #10b981"></div>
						<span>{t(localeStore.t.finance.income, 'Income')}</span>
					</div>
					<div class="flex items-center gap-1.5 text-xs">
						<div class="h-0.5 w-4 rounded" style="background-color: #ef4444"></div>
						<span>{t(localeStore.t.finance.expenses, 'Expenses')}</span>
					</div>
				</div>
				<div class="h-[300px]">
					<Chart
						data={incomeExpenseData}
						x="year"
						y="income"
						xScale={scaleLinear()}
						xDomain={[incomeExpenseData[0]?.year ?? 0, incomeExpenseData[incomeExpenseData.length - 1]?.year ?? 1]}
						yDomain={[0, lineMaxY]}
						yNice
						padding={{ top: 20, right: 16, bottom: 40, left: 60 }}
					>
						<Svg>
							<Axis placement="left" format={(d) => `$${(d / 1000).toFixed(0)}k`} />
							<Axis placement="bottom" format={(d) => String(Math.round(d))} />
							<Spline y="income" stroke="#10b981" class="fill-none stroke-2" />
							<Spline y="expenses" stroke="#ef4444" class="fill-none stroke-2" />
						</Svg>
					</Chart>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>
