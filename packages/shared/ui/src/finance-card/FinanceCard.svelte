<script lang="ts">
/**
 * Financial data card displaying a labeled value with optional trend badge and subtitle.
 *
 * Composes shadcn Card primitives in the dashboard-01 `section-cards` pattern.
 */
import type { Str } from '@/schemas/common';
import { Badge } from '../badge/index.js';
import * as Card from '../card/index.js';

/**
 * Finance stat card following the shadcn-svelte dashboard-01 `section-cards` pattern.
 *
 * Structure: Card.Description (label) → Card.Title (value) → Card.Action (trend badge) → Card.Footer (subtitle).
 *
 * @example
 * ```svelte
 * <FinanceCard label="Total Debt" value="$12,500" valueClass="text-destructive" trend="down" />
 * ```
 *
 * @property {Str} label - Muted description text above the value (rendered via Card.Description).
 * @property {Str} value - Large bold display value (rendered via Card.Title).
 * @property {Str} [subtitle] - Optional footer text below the card header.
 * @property {'up' | 'down' | 'neutral'} [trend] - Optional trend badge: "up" (green ↑), "down" (red ↓), or "neutral" (muted —).
 * @property {Str} [valueClass] - Optional Tailwind class(es) applied to the Card.Title value (e.g. `text-destructive`).
 */
type Props = {
	/** Muted description text above the value (rendered via Card.Description). @values Revenue, Expenses, Net Income */
	label: Str;
	/** Large bold display value (rendered via Card.Title). @values $1,234.56, $5,678.90, -$900.00 */
	value: Str;
	/** Optional footer text below the card header. @values +12.5% from last month, -3.2% from last month, No change */
	subtitle?: Str;
	/** Optional trend badge: "up" (green ↑), "down" (red ↓), or "neutral" (muted —). */
	trend?: 'up' | 'down' | 'neutral';
	/** Optional Tailwind class(es) applied to the Card.Title value (e.g. `text-destructive`). @values text-destructive, text-green-500, text-primary */
	valueClass?: Str;
};

const { label, value, subtitle, trend, valueClass }: Props = $props();
</script>

<Card.Root class="@container/card">
	<Card.Header>
		<Card.Description>{label}</Card.Description>
		<Card.Title class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl {valueClass ?? ''}">
			{value}
		</Card.Title>
		{#if trend}
			<Card.Action>
				<Badge variant="outline">
					{#if trend === 'up'}
						<span class="text-green-500">↑</span>
					{:else if trend === 'down'}
						<span class="text-red-500">↓</span>
					{:else}
						<span class="text-muted-foreground">—</span>
					{/if}
				</Badge>
			</Card.Action>
		{/if}
	</Card.Header>
	{#if subtitle}
		<Card.Footer class="flex-col items-start gap-1.5 text-sm">
			<div class="text-muted-foreground">{subtitle}</div>
		</Card.Footer>
	{/if}
</Card.Root>
