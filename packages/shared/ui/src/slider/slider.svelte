<script lang="ts">
/**
 * Styled range slider built on bits-ui Slider primitives.
 *
 * Supports single and multiple thumb modes, horizontal/vertical orientation,
 * and integrates with the design system's color tokens.
 *
 * @example
 * ```svelte
 * <Slider type="single" bind:value={zoom} min={25} max={400} step={5} />
 * ```
 */
import { Slider as SliderPrimitive } from 'bits-ui';
import { cn, type WithoutChildrenOrChild } from '../utils.js';

let {
	ref = $bindable(null),
	value = $bindable(),
	orientation = 'horizontal',
	class: className,
	...restProps
}: WithoutChildrenOrChild<SliderPrimitive.RootProps> = $props();
</script>

<!--
  Discriminated unions + destructuring (required for bindable) do not
  get along, so we cast `value` to `never` — upstream shadcn-svelte pattern.
-->
<SliderPrimitive.Root
	bind:ref
	bind:value={value as never}
	data-slot="slider"
	{orientation}
	class={cn(
		'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
		className,
	)}
	{...restProps}
>
	{#snippet children({ thumbs })}
		<span
			data-orientation={orientation}
			data-slot="slider-track"
			class="bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
		>
			<SliderPrimitive.Range
				data-slot="slider-range"
				class="bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
			/>
		</span>
		{#each thumbs as thumb (thumb)}
			<SliderPrimitive.Thumb
				data-slot="slider-thumb"
				index={thumb}
				class="border-primary ring-ring/50 block size-4 shrink-0 rounded-full border bg-white shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
			/>
		{/each}
	{/snippet}
</SliderPrimitive.Root>
