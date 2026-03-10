<script module lang="ts">
import * as v from 'valibot';

/**
 * Finance stat card following the shadcn-svelte dashboard-01 `section-cards` pattern.
 *
 * Structure: Card.Description (label) → Card.Title (value) → Card.Action (trend badge) → Card.Footer (subtitle).
 *
 * @example
 * ```svelte
 * <FinanceCard label="Total Debt" value="$12,500" valueClass="text-destructive" trend="down" />
 * ```
 */
export const FinanceCardPropsSchema = v.strictObject({
	/** Muted description text above the value. @values Revenue, Expenses, Net Income */
	label: v.string(),
	/** Large bold display value. @values $1,234.56, $5,678.90, -$900.00 */
	value: v.string(),
	/** Optional footer text below the card header. @values +12.5% from last month, -3.2% from last month, No change */
	subtitle: v.optional(v.string()),
	/** Optional trend badge direction. */
	trend: v.optional(v.picklist(['up', 'down', 'neutral'])),
	/** Optional Tailwind classes for the value. @values text-destructive, text-green-500, text-primary */
	valueClass: v.optional(v.string()),
});
/** Props for the FinanceCard component. */
export type FinanceCardProps = v.InferOutput<typeof FinanceCardPropsSchema>;
</script>

<script lang="ts">
/**
 * Financial data card displaying a labeled value with optional trend badge and subtitle.
 *
 * Composes shadcn Card primitives in the dashboard-01 `section-cards` pattern.
 */
import { safeParse } from '@/utils/result/safe';
import { Badge } from '../badge/index.js';
import * as Card from '../card/index.js';

const rawProps = $props();
const validated = safeParse(FinanceCardPropsSchema, rawProps);
if (!validated.ok) throw validated.error;
const { label, value, subtitle, trend, valueClass }: FinanceCardProps = validated.data;
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
