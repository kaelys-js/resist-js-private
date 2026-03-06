<script lang="ts">
import type { Str, Num } from '@/schemas/common';
import type { Settings, InflationConfig } from '$lib/schemas/finances';
import { invalidateAll } from '$app/navigation';
import { Button } from '$lib/components/ui/button/index.js';
import * as Card from '$lib/components/ui/card/index.js';
import { Input } from '$lib/components/ui/input/index.js';
import { Label } from '$lib/components/ui/label/index.js';
import { Separator } from '$lib/components/ui/separator/index.js';
import * as Table from '$lib/components/ui/table/index.js';

type PageData = { settings: Settings; inflation: InflationConfig[] };
let { data }: { data: PageData } = $props();

// ── General settings state ──────────────────────────────────────
let birthDate: Str = $state(data.settings.birthDate);
let retirementAge: Num = $state(data.settings.retirementAge);
let defaultInflationRate: Num = $state(data.settings.defaultInflationRate);

async function saveSettings(): Promise<void> {
	const settings: Settings = {
		birthDate,
		retirementAge,
		defaultInflationRate,
	};
	await fetch('/api/settings', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(settings),
	});
	await invalidateAll();
}

// ── Inflation rates state ───────────────────────────────────────
let inflationRates: InflationConfig[] = $state(
	data.inflation.map((item: InflationConfig) => ({ ...item })),
);

function updateRate(index: Num, rate: Num): void {
	inflationRates[index] = { ...inflationRates[index], rate };
}

async function saveInflation(): Promise<void> {
	await fetch('/api/inflation', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(inflationRates),
	});
	await invalidateAll();
}

// Sync local state when server data reloads
$effect(() => {
	({ birthDate, retirementAge, defaultInflationRate } = data.settings);
});

$effect(() => {
	inflationRates = data.inflation.map((item: InflationConfig) => ({ ...item }));
});
</script>

<div class="flex flex-1 flex-col gap-6 p-6">
	<h1 class="text-2xl font-semibold tracking-tight">Settings</h1>

	<!-- General Settings -->
	<Card.Card>
		<Card.CardHeader>
			<Card.CardTitle>General Settings</Card.CardTitle>
			<Card.CardDescription>
				Configure your birth date, retirement age, and default inflation rate.
			</Card.CardDescription>
		</Card.CardHeader>
		<Card.CardContent>
			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-2">
					<Label for="birth-date">Birth Date</Label>
					<Input id="birth-date" type="date" bind:value={birthDate} />
				</div>
				<div class="flex flex-col gap-2">
					<Label for="retirement-age">Retirement Age</Label>
					<Input
						id="retirement-age"
						type="number"
						min={1}
						max={120}
						bind:value={retirementAge}
					/>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="inflation-rate">Default Inflation Rate</Label>
					<Input
						id="inflation-rate"
						type="number"
						step="0.01"
						min={0}
						max={1}
						bind:value={defaultInflationRate}
					/>
					<p class="text-muted-foreground text-sm">
						Enter as a decimal (e.g. 0.02 for 2%).
					</p>
				</div>
			</div>
		</Card.CardContent>
		<Card.CardFooter>
			<Button onclick={saveSettings}>Save Settings</Button>
		</Card.CardFooter>
	</Card.Card>

	<Separator />

	<!-- Inflation Rates by Category -->
	<Card.Card>
		<Card.CardHeader>
			<Card.CardTitle>Inflation Rates by Category</Card.CardTitle>
			<Card.CardDescription>
				Override the default inflation rate for specific expense categories.
			</Card.CardDescription>
		</Card.CardHeader>
		<Card.CardContent class="p-0">
			{#if inflationRates.length > 0}
				<Table.Table>
					<Table.TableHeader>
						<Table.TableRow>
							<Table.TableHead>Category</Table.TableHead>
							<Table.TableHead class="text-right">Rate (%)</Table.TableHead>
						</Table.TableRow>
					</Table.TableHeader>
					<Table.TableBody>
						{#each inflationRates as item, index (item.category)}
							<Table.TableRow>
								<Table.TableCell class="font-medium capitalize">
									{item.category}
								</Table.TableCell>
								<Table.TableCell class="text-right">
									<Input
										type="number"
										step="0.01"
										min={0}
										max={1}
										value={item.rate}
										class="ml-auto w-24 text-right"
										oninput={(e: Event) => {
											const target = e.target as HTMLInputElement;
											updateRate(index, Number.parseFloat(target.value) || 0);
										}}
									/>
								</Table.TableCell>
							</Table.TableRow>
						{/each}
					</Table.TableBody>
				</Table.Table>
			{:else}
				<div class="text-muted-foreground py-8 text-center text-sm">
					No category-specific inflation rates configured.
				</div>
			{/if}
		</Card.CardContent>
		{#if inflationRates.length > 0}
			<Card.CardFooter>
				<Button onclick={saveInflation}>Save Inflation Rates</Button>
			</Card.CardFooter>
		{/if}
	</Card.Card>
</div>
