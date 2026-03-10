<script module lang="ts">
import * as v from 'valibot';
import { StrSchema } from '@/schemas/common';
import type { Snippet } from 'svelte';

export const LensErrorPropsSchema = v.strictObject({
	/** Primary error message. @values Load failed, Invalid metadata, Render error */
	title: StrSchema,
	/** Secondary detail text below the title. @values Check the component source file., Schema validation returned errors. */
	description: v.optional(StrSchema),
	/** Optional icon snippet — defaults to CircleAlert. */
	icon: v.optional(v.custom<Snippet>((val) => typeof val === 'function')),
	/** Additional CSS classes for the root element. */
	class: v.optional(StrSchema),
});
export type LensErrorProps = v.InferOutput<typeof LensErrorPropsSchema>;
</script>

<script lang="ts">
/**
 * Error boundary display for the Lens documentation system.
 *
 * Renders a destructive-styled card with an error icon, title, and
 * optional description. Used for schema validation failures, load
 * errors, and component render crashes.
 */
import type { Str } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import { cn } from '../utils.js';
import CircleAlert from '@lucide/svelte/icons/circle-alert';
import { stripSvelteProps } from '../lens/lens-utils.js';

const allProps = $props();
const rawProps: Record<Str, unknown> = stripSvelteProps(allProps);
const validated = safeParse(LensErrorPropsSchema, rawProps);
if (!validated.ok) throw validated.error;
const { title, description, icon, class: className }: LensErrorProps = validated.data;
</script>

<div
	class={cn(
		'flex flex-col items-center justify-center rounded-lg border border-dashed border-destructive/50 bg-destructive/5 py-16 text-center',
		className,
	)}
>
	<div class="mb-3 text-destructive/50">
		{#if icon}
			{@render icon()}
		{:else}
			<CircleAlert class="size-10" strokeWidth={1.5} />
		{/if}
	</div>
	<p class="text-sm font-medium text-destructive">
		{title}
	</p>
	{#if description}
		<p class="mt-1 max-w-md whitespace-pre-line text-left text-xs text-muted-foreground/70">{description}</p>
	{/if}
</div>
