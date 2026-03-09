<script lang="ts">
import type { Str, Num } from '@/schemas/common';
import type { Settings, InflationConfig } from '$lib/schemas/finances';
import { invalidateAll } from '$app/navigation';
import { localeStore, t } from '$lib/i18n.svelte';
import { Button } from '@/ui/button/index.js';
import * as Card from '@/ui/card/index.js';
import { Input } from '@/ui/input/index.js';
import { Label } from '@/ui/label/index.js';
import { Separator } from '@/ui/separator/index.js';
import * as Table from '@/ui/table/index.js';
import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';

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
	<h1 class="text-2xl font-semibold tracking-tight">{t(localeStore.t.common.settings, 'Settings')}</h1>

	<!-- General Settings -->
	<Card.Card>
		<Card.CardHeader>
			<Card.CardTitle>{t(localeStore.t.finance.generalSettings, 'General Settings')}</Card.CardTitle>
			<Card.CardDescription>
				{t(localeStore.t.finance.settingsDesc, 'Configure your birth date, retirement age, and default inflation rate.')}
			</Card.CardDescription>
		</Card.CardHeader>
		<Card.CardContent>
			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-2">
					<Label for="birth-date">{t(localeStore.t.finance.birthDate, 'Birth Date')}</Label>
					<Input id="birth-date" type="date" bind:value={birthDate} />
				</div>
				<div class="flex flex-col gap-2">
					<Label for="retirement-age">{t(localeStore.t.finance.retirementAge, 'Retirement Age')}</Label>
					<Input
						id="retirement-age"
						type="number"
						min={1}
						max={120}
						bind:value={retirementAge}
					/>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="inflation-rate">{t(localeStore.t.finance.inflationRate, 'Default Inflation Rate')}</Label>
					<Input
						id="inflation-rate"
						type="number"
						step="0.01"
						min={0}
						max={1}
						bind:value={defaultInflationRate}
					/>
					<p class="text-muted-foreground text-sm">
						{t(localeStore.t.finance.decimalHint, 'Enter as a decimal (e.g. 0.02 for 2%).')}
					</p>
				</div>
			</div>
		</Card.CardContent>
		<Card.CardFooter>
			<Button onclick={saveSettings}>{t(localeStore.t.finance.saveChanges, 'Save Settings')}</Button>
		</Card.CardFooter>
	</Card.Card>

	<Separator />

	<!-- Appearance -->
	<Card.Card>
		<Card.CardHeader>
			<Card.CardTitle>{t(localeStore.t.settings.appearance, 'Appearance')}</Card.CardTitle>
			<Card.CardDescription>
				{t(localeStore.t.finance.appearanceDesc, 'Choose a colour theme for the editor.')}
			</Card.CardDescription>
		</Card.CardHeader>
		<Card.CardContent>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button variant='outline' {...props}>{t(localeStore.t.finance.themeSelection, 'Change theme')}</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align='start'>
					<ThemeSwitcher />
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</Card.CardContent>
	</Card.Card>

	<Separator />

	<!-- Inflation Rates by Category -->
	<Card.Card>
		<Card.CardHeader>
			<Card.CardTitle>{t(localeStore.t.finance.perCategoryInflation, 'Inflation Rates by Category')}</Card.CardTitle>
			<Card.CardDescription>
				{t(localeStore.t.finance.inflationOverrideDesc, 'Override the default inflation rate for specific expense categories.')}
			</Card.CardDescription>
		</Card.CardHeader>
		<Card.CardContent class="p-0">
			{#if inflationRates.length > 0}
				<Table.Table>
					<Table.TableHeader class="bg-muted sticky top-0 z-10">
						<Table.TableRow>
							<Table.TableHead class="text-muted-foreground text-xs font-medium uppercase tracking-wide">{t(localeStore.t.finance.category, 'Category')}</Table.TableHead>
							<Table.TableHead class="text-muted-foreground text-right text-xs font-medium uppercase tracking-wide">{t(localeStore.t.finance.ratePercent, 'Rate (%)')}</Table.TableHead>
						</Table.TableRow>
					</Table.TableHeader>
					<Table.TableBody>
						{#each inflationRates as item, index (item.category)}
							<Table.TableRow>
								<Table.TableCell class="font-medium">
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
					{t(localeStore.t.finance.noInflationRates, 'No category-specific inflation rates configured.')}
				</div>
			{/if}
		</Card.CardContent>
		{#if inflationRates.length > 0}
			<Card.CardFooter>
				<Button onclick={saveInflation}>{t(localeStore.t.finance.saveChanges, 'Save Inflation Rates')}</Button>
			</Card.CardFooter>
		{/if}
	</Card.Card>
</div>
