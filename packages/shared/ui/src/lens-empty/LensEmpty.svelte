<script module lang="ts">
import * as v from 'valibot';
import { StrSchema } from '@/schemas/common';
import type { Snippet } from 'svelte';

export const LensEmptyPropsSchema = v.strictObject({
	/** Primary message text. @values No variants found, No examples yet, Component not found */
	title: StrSchema,
	/** Secondary description text below the title. @values This component has no renderable variants., Add examples to see them here. */
	description: v.optional(StrSchema),
	/** Optional icon snippet — defaults to PackageOpen. */
	icon: v.optional(v.custom<Snippet>((val) => typeof val === 'function')),
	/** Visual variant. @values default, destructive */
	variant: v.optional(v.picklist(['default', 'destructive'])),
	/** Additional CSS classes for the root element. */
	class: v.optional(StrSchema),
});
export type LensEmptyProps = v.InferOutput<typeof LensEmptyPropsSchema>;
</script>

<script lang="ts">
/**
 * Empty state placeholder for the Lens documentation system.
 *
 * Renders a styled dashed-border card with optional icon, title, and
 * description. Supports a `destructive` variant for error states.
 */
import type { Str } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import { cn } from '../utils.js';
import PackageOpen from '@lucide/svelte/icons/package-open';
import { stripSvelteProps } from '../lens/lens-utils.js';

const allProps = $props();
const rawProps: Record<Str, unknown> = stripSvelteProps(allProps);
const validated = safeParse(LensEmptyPropsSchema, rawProps);
if (!validated.ok) throw validated.error;
const { title, description, icon, variant = 'default', class: className }: LensEmptyProps = validated.data;
</script>

<div
	class={cn(
		'flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center',
		variant === 'destructive'
			? 'border-destructive/50 bg-destructive/5'
			: 'bg-muted/5',
		className,
	)}
>
	<div class={cn('mb-3', variant === 'destructive' ? 'text-destructive/50' : 'text-muted-foreground/40')}>
		{#if icon}
			{@render icon()}
		{:else}
			<PackageOpen class="size-10" strokeWidth={1.5} />
		{/if}
	</div>
	<p
		class={cn(
			'text-sm font-medium',
			variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground',
		)}
	>
		{title}
	</p>
	{#if description}
		<p class="mt-1 max-w-xs text-xs text-muted-foreground/70">{description}</p>
	{/if}
</div>
