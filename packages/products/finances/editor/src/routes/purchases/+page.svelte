<script lang="ts">
import type { Str, Num, Bool } from '@/schemas/common';
import {
	PURCHASE_CATEGORIES,
	type Purchase,
	type LifetimeReplacement,
} from '$lib/schemas/finances';
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
import { Chart, Svg, Axis, Bars } from 'layerchart';
import { scaleBand, scaleLinear } from 'd3-scale';

const { data } = $props();

const purchases: Purchase[] = $derived(data.purchases as Purchase[]);
const replacements: LifetimeReplacement[] = $derived(data.replacements as LifetimeReplacement[]);

/** Years remaining until age 65. */
const LIFETIME_YEARS: Num = 28;

function fmt(value: Num): Str {
	return `$${value.toFixed(2)}`;
}

function replacementAnnualCost(r: LifetimeReplacement): Num {
	return r.totalBudget / r.cycleYears;
}

function replacementLifetimeCost(r: LifetimeReplacement): Num {
	return (r.totalBudget / r.cycleYears) * LIFETIME_YEARS;
}

const totalPurchases: Num = $derived(purchases.reduce((sum, p) => sum + p.amount, 0));

const totalReplacementAnnual: Num = $derived(
	replacements.reduce((sum, r) => sum + replacementAnnualCost(r), 0),
);

// ── Replacement cost chart data ─────────────────────────────────

type ReplacementBar = {
	name: Str;
	annualCost: Num;
};

const replacementChartData: ReplacementBar[] = $derived(
	[...replacements]
		.map((r) => ({ name: r.name, annualCost: replacementAnnualCost(r) }))
		.sort((a, b) => b.annualCost - a.annualCost),
);

const replacementChartMax: Num = $derived.by(() => {
	if (replacementChartData.length === 0) return 1;
	return Math.max(...replacementChartData.map((d) => d.annualCost));
});

const replacementYScale = $derived(
	scaleBand<Str>()
		.domain(replacementChartData.map((d) => d.name))
		.padding(0.2),
);

// ── Purchase Dialog ──────────────────────────────────────────────
let purchaseDialogOpen: Bool = $state(false);
let purchaseIsEditing: Bool = $state(false);
let purchaseEditingId: Str = $state('');

let purchaseFormName: Str = $state('');
let purchaseFormAmount: Str = $state('');
let purchaseFormCategory: Str = $state('upcoming');
let purchaseFormNotes: Str = $state('');

function resetPurchaseForm(): void {
	purchaseFormName = '';
	purchaseFormAmount = '';
	purchaseFormCategory = 'upcoming';
	purchaseFormNotes = '';
	purchaseIsEditing = false;
	purchaseEditingId = '';
}

function openAddPurchase(): void {
	resetPurchaseForm();
	purchaseDialogOpen = true;
}

function openEditPurchase(p: Purchase): void {
	purchaseIsEditing = true;
	purchaseEditingId = p.id;
	purchaseFormName = p.name;
	purchaseFormAmount = String(p.amount);
	purchaseFormCategory = p.category;
	purchaseFormNotes = p.notes;
	purchaseDialogOpen = true;
}

async function handlePurchaseSubmit(): Promise<void> {
	const amount: Num = Number.parseFloat(purchaseFormAmount);
	if (!purchaseFormName || Number.isNaN(amount)) return;

	const payload: Purchase = {
		id: purchaseIsEditing ? purchaseEditingId : crypto.randomUUID(),
		name: purchaseFormName,
		amount,
		date: '',
		category: purchaseFormCategory as Purchase['category'],
		notes: purchaseFormNotes,
	};

	if (purchaseIsEditing) {
		await fetch(`/api/purchases/${purchaseEditingId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
	} else {
		await fetch('/api/purchases', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
	}

	purchaseDialogOpen = false;
	resetPurchaseForm();
	await invalidateAll();
}

async function handlePurchaseDelete(id: Str): Promise<void> {
	await fetch(`/api/purchases/${id}`, { method: 'DELETE' });
	await invalidateAll();
}

// ── Replacement Dialog ───────────────────────────────────────────
let replacementDialogOpen: Bool = $state(false);
let replacementIsEditing: Bool = $state(false);
let replacementEditingId: Str = $state('');

let replacementFormName: Str = $state('');
let replacementFormBudget: Str = $state('');
let replacementFormCycle: Str = $state('');
let replacementFormNotes: Str = $state('');

function resetReplacementForm(): void {
	replacementFormName = '';
	replacementFormBudget = '';
	replacementFormCycle = '';
	replacementFormNotes = '';
	replacementIsEditing = false;
	replacementEditingId = '';
}

function openAddReplacement(): void {
	resetReplacementForm();
	replacementDialogOpen = true;
}

function openEditReplacement(r: LifetimeReplacement): void {
	replacementIsEditing = true;
	replacementEditingId = r.id;
	replacementFormName = r.name;
	replacementFormBudget = String(r.totalBudget);
	replacementFormCycle = String(r.cycleYears);
	replacementFormNotes = r.notes;
	replacementDialogOpen = true;
}

async function handleReplacementSubmit(): Promise<void> {
	const totalBudget: Num = Number.parseFloat(replacementFormBudget);
	const cycleYears: Num = Number.parseFloat(replacementFormCycle);
	if (
		!replacementFormName ||
		Number.isNaN(totalBudget) ||
		Number.isNaN(cycleYears) ||
		cycleYears <= 0
	)
		return;

	const payload: LifetimeReplacement = {
		id: replacementIsEditing ? replacementEditingId : crypto.randomUUID(),
		name: replacementFormName,
		totalBudget,
		cycleYears,
		notes: replacementFormNotes,
	};

	if (replacementIsEditing) {
		await fetch(`/api/lifetime-replacements/${replacementEditingId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
	} else {
		await fetch('/api/lifetime-replacements', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
	}

	replacementDialogOpen = false;
	resetReplacementForm();
	await invalidateAll();
}

async function handleReplacementDelete(id: Str): Promise<void> {
	await fetch(`/api/lifetime-replacements/${id}`, { method: 'DELETE' });
	await invalidateAll();
}
</script>

<div class="flex flex-1 flex-col gap-6 p-6">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<h1 class="text-2xl font-semibold tracking-tight">{t(localeStore.t.finance.upcomingPurchases, 'Purchases')} &amp; {t(localeStore.t.finance.lifetimeReplacements, 'Replacements')}</h1>
	</div>

	<!-- Upcoming Purchases -->
	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between">
			<div>
				<Card.Title>{t(localeStore.t.finance.upcomingPurchases, 'Upcoming Purchases')}</Card.Title>
				<Card.Description>
					{t(localeStore.t.finance.onetimePurchasesTotal, 'One-time purchases — Total')}: {fmt(totalPurchases)}
				</Card.Description>
			</div>
			<Button size="sm" onclick={openAddPurchase}>{t(localeStore.t.finance.addItem, 'Add Purchase')}</Button>
		</Card.Header>
		<Card.Content>
			{#if purchases.length === 0}
				<p class="text-muted-foreground text-sm">{t(localeStore.t.finance.noPurchases, 'No purchases yet.')}</p>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>{t(localeStore.t.finance.name, 'Name')}</Table.Head>
							<Table.Head class="text-right">{t(localeStore.t.finance.amount, 'Amount')}</Table.Head>
							<Table.Head>{t(localeStore.t.finance.category, 'Category')}</Table.Head>
							<Table.Head>{t(localeStore.t.finance.notes, 'Notes')}</Table.Head>
							<Table.Head class="text-right">{t(localeStore.t.finance.actions, 'Actions')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each purchases as purchase (purchase.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{purchase.name}</Table.Cell>
								<Table.Cell class="text-right">{fmt(purchase.amount)}</Table.Cell>
								<Table.Cell>
									<Badge variant="secondary">{purchase.category === 'upcoming' ? t(localeStore.t.finance.categoryUpcoming, 'Upcoming') : t(localeStore.t.finance.categoryPlanned, 'Planned')}</Badge>
								</Table.Cell>
								<Table.Cell class="text-muted-foreground max-w-[200px] truncate">{purchase.notes}</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-2">
										<Button variant="ghost" size="sm" onclick={() => openEditPurchase(purchase)}>{t(localeStore.t.finance.editItem, 'Edit')}</Button>
										<Button variant="ghost" size="sm" onclick={() => handlePurchaseDelete(purchase.id)}>{t(localeStore.t.finance.deleteItem, 'Delete')}</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>

	<Separator />

	<!-- Replacement Annual Costs Chart -->
	{#if replacementChartData.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>{t(localeStore.t.finance.replacementCosts, 'Replacement Annual Costs')}</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="h-[{Math.max(200, replacementChartData.length * 40 + 60)}px]" style="height: {Math.max(200, replacementChartData.length * 40 + 60)}px">
					<Chart
						data={replacementChartData}
						x="annualCost"
						xDomain={[0, replacementChartMax]}
						xNice
						y="name"
						yScale={replacementYScale}
						padding={{ top: 10, right: 16, bottom: 40, left: 120 }}
					>
						<Svg>
							<Axis placement="left" />
							<Axis placement="bottom" format={(d) => `$${d.toLocaleString()}`} />
							<Bars fill="#8b5cf6" strokeWidth={0} />
						</Svg>
					</Chart>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Lifetime Replacements -->
	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between">
			<div>
				<Card.Title>{t(localeStore.t.finance.lifetimeReplacements, 'Lifetime Replacements')}</Card.Title>
				<Card.Description>
					{t(localeStore.t.finance.recurringReplacementsAnnual, 'Recurring replacement items — Annual')}: {fmt(totalReplacementAnnual)}
				</Card.Description>
			</div>
			<Button size="sm" onclick={openAddReplacement}>{t(localeStore.t.finance.addItem, 'Add Replacement')}</Button>
		</Card.Header>
		<Card.Content>
			{#if replacements.length === 0}
				<p class="text-muted-foreground text-sm">{t(localeStore.t.finance.noReplacements, 'No lifetime replacements yet.')}</p>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>{t(localeStore.t.finance.name, 'Name')}</Table.Head>
							<Table.Head class="text-right">{t(localeStore.t.finance.budget, 'Budget')}</Table.Head>
							<Table.Head class="text-right">{t(localeStore.t.finance.cycleYears, 'Cycle (years)')}</Table.Head>
							<Table.Head class="text-right">{t(localeStore.t.finance.annualCostLabel, 'Annual Cost')}</Table.Head>
							<Table.Head class="text-right">{t(localeStore.t.finance.lifetimeCost, 'Lifetime Cost')}</Table.Head>
							<Table.Head>{t(localeStore.t.finance.notes, 'Notes')}</Table.Head>
							<Table.Head class="text-right">{t(localeStore.t.finance.actions, 'Actions')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each replacements as replacement (replacement.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{replacement.name}</Table.Cell>
								<Table.Cell class="text-right">{fmt(replacement.totalBudget)}</Table.Cell>
								<Table.Cell class="text-right">{replacement.cycleYears}</Table.Cell>
								<Table.Cell class="text-right">{fmt(replacementAnnualCost(replacement))}</Table.Cell>
								<Table.Cell class="text-right">{fmt(replacementLifetimeCost(replacement))}</Table.Cell>
								<Table.Cell class="text-muted-foreground max-w-[200px] truncate">{replacement.notes}</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-2">
										<Button variant="ghost" size="sm" onclick={() => openEditReplacement(replacement)}>{t(localeStore.t.finance.editItem, 'Edit')}</Button>
										<Button variant="ghost" size="sm" onclick={() => handleReplacementDelete(replacement.id)}>{t(localeStore.t.finance.deleteItem, 'Delete')}</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Purchase Dialog -->
	<Dialog.Root bind:open={purchaseDialogOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>{purchaseIsEditing ? t(localeStore.t.finance.editItem, 'Edit Purchase') : t(localeStore.t.finance.addItem, 'Add Purchase')}</Dialog.Title>
				<Dialog.Description>
					{purchaseIsEditing ? t(localeStore.t.finance.editPurchaseDesc, 'Update the purchase details below.') : t(localeStore.t.finance.addPurchaseDesc, 'Enter the details for the new purchase.')}
				</Dialog.Description>
			</Dialog.Header>
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<Label for="purchase-name">{t(localeStore.t.finance.name, 'Name')}</Label>
					<Input id="purchase-name" bind:value={purchaseFormName} placeholder={t(localeStore.t.finance.placeholderPurchaseName, 'Purchase name')} />
				</div>
				<div class="grid gap-2">
					<Label for="purchase-amount">{t(localeStore.t.finance.amount, 'Amount')} ($)</Label>
					<Input id="purchase-amount" type="number" bind:value={purchaseFormAmount} placeholder={t(localeStore.t.finance.placeholderAmount, '0.00')} />
				</div>
				<div class="grid gap-2">
					<Label for="purchase-category">{t(localeStore.t.finance.category, 'Category')}</Label>
					<Select.Root bind:value={purchaseFormCategory} type="single">
						<Select.Trigger id="purchase-category" class="w-full">
							{purchaseFormCategory === 'upcoming' ? t(localeStore.t.finance.categoryUpcoming, 'Upcoming') : t(localeStore.t.finance.categoryPlanned, 'Planned')}
						</Select.Trigger>
						<Select.Content>
							{#each PURCHASE_CATEGORIES as cat}
								<Select.Item value={cat} label={cat === 'upcoming' ? t(localeStore.t.finance.categoryUpcoming, 'Upcoming') : t(localeStore.t.finance.categoryPlanned, 'Planned')} />
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-2">
					<Label for="purchase-notes">{t(localeStore.t.finance.notes, 'Notes')}</Label>
					<Input id="purchase-notes" bind:value={purchaseFormNotes} placeholder={t(localeStore.t.finance.optionalNotes, 'Optional notes')} />
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (purchaseDialogOpen = false)}>{t(localeStore.t.common.cancel, 'Cancel')}</Button>
				<Button onclick={handlePurchaseSubmit}>{purchaseIsEditing ? t(localeStore.t.finance.saveChanges, 'Save Changes') : t(localeStore.t.finance.addItem, 'Add Purchase')}</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Replacement Dialog -->
	<Dialog.Root bind:open={replacementDialogOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>{replacementIsEditing ? t(localeStore.t.finance.editItem, 'Edit Replacement') : t(localeStore.t.finance.addItem, 'Add Replacement')}</Dialog.Title>
				<Dialog.Description>
					{replacementIsEditing ? t(localeStore.t.finance.editReplacementDesc, 'Update the replacement details below.') : t(localeStore.t.finance.addReplacementDesc, 'Enter the details for the new lifetime replacement.')}
				</Dialog.Description>
			</Dialog.Header>
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<Label for="replacement-name">{t(localeStore.t.finance.name, 'Name')}</Label>
					<Input id="replacement-name" bind:value={replacementFormName} placeholder={t(localeStore.t.finance.placeholderItemName, 'Item name')} />
				</div>
				<div class="grid gap-2">
					<Label for="replacement-budget">{t(localeStore.t.finance.budget, 'Total Budget')} ($)</Label>
					<Input id="replacement-budget" type="number" bind:value={replacementFormBudget} placeholder={t(localeStore.t.finance.placeholderAmount, '0.00')} />
				</div>
				<div class="grid gap-2">
					<Label for="replacement-cycle">{t(localeStore.t.finance.cycleYears, 'Cycle (years)')}</Label>
					<Input id="replacement-cycle" type="number" bind:value={replacementFormCycle} placeholder={t(localeStore.t.finance.placeholderEgCycle, 'e.g. 3')} />
				</div>
				<div class="grid gap-2">
					<Label for="replacement-notes">{t(localeStore.t.finance.notes, 'Notes')}</Label>
					<Input id="replacement-notes" bind:value={replacementFormNotes} placeholder={t(localeStore.t.finance.optionalNotes, 'Optional notes')} />
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (replacementDialogOpen = false)}>{t(localeStore.t.common.cancel, 'Cancel')}</Button>
				<Button onclick={handleReplacementSubmit}>{replacementIsEditing ? t(localeStore.t.finance.saveChanges, 'Save Changes') : t(localeStore.t.finance.addItem, 'Add Replacement')}</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
