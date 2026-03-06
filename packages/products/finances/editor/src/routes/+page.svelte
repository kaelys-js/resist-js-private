<script lang="ts">
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
} from '$lib/engine/projections';
import { projectIncome, calculateNetPosition } from '$lib/engine/income';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { Badge } from '$lib/components/ui/badge';
import { Separator } from '$lib/components/ui/separator';

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
</script>

<div class="flex flex-col gap-6 p-6">
	<!-- Page header -->
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Financial Overview</h1>
		<p class="text-muted-foreground text-sm">A snapshot of your current financial position.</p>
	</div>

	<Separator />

	<!-- Summary stat cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
		<Card>
			<CardHeader>
				<CardTitle class="text-sm font-medium text-muted-foreground">Total Debt</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold text-destructive">{fmt(totalDebt)}</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle class="text-sm font-medium text-muted-foreground">Monthly Burn Rate</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold">{fmt(monthlyBurnRate)}</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle class="text-sm font-medium text-muted-foreground">Annual Cost</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold">{fmt(annualCost)}</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle class="text-sm font-medium text-muted-foreground">Years to {data.settings.retirementAge}</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold">{yearsToRetirement}</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle class="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
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
				<CardTitle>Debt Overview</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="flex flex-col gap-4">
					{#each data.debts as debt (debt.id)}
						<div class="flex flex-col gap-1.5">
							<div class="flex items-center justify-between text-sm">
								<span class="font-medium">{debt.name}</span>
								<div class="flex items-center gap-2">
									{#if debt.isEstimate}
										<Badge variant="outline" class="text-xs">Est.</Badge>
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
					<span>Total Outstanding</span>
					<span class="font-mono">{fmt(totalDebt)}</span>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>
