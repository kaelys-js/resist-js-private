<script lang="ts">
import type { Str } from '@/schemas/common';
import * as Card from '$lib/components/ui/card/index.js';

/**
 * Props for the StatCard component.
 *
 * @property label - Muted header text above the value.
 * @property value - Large bold display value.
 * @property subtitle - Optional secondary text below the value.
 * @property trend - Optional trend indicator: green arrow up, red arrow down, or neutral dash.
 */
type Props = {
	label: Str;
	value: Str;
	subtitle?: Str;
	trend?: 'up' | 'down' | 'neutral';
};

const { label, value, subtitle, trend }: Props = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="text-muted-foreground text-sm font-medium">{label}</Card.Title>
	</Card.Header>
	<Card.Content>
		<div class="flex items-center gap-2">
			<span class="text-2xl font-bold tracking-tight">{value}</span>
			{#if trend === 'up'}
				<span class="text-emerald-500" aria-label="Trending up">&#9650;</span>
			{:else if trend === 'down'}
				<span class="text-red-500" aria-label="Trending down">&#9660;</span>
			{:else if trend === 'neutral'}
				<span class="text-muted-foreground" aria-label="No change">&#8212;</span>
			{/if}
		</div>
		{#if subtitle}
			<p class="text-muted-foreground mt-1 text-sm">{subtitle}</p>
		{/if}
	</Card.Content>
</Card.Root>
