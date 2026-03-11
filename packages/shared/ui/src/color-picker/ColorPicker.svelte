<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, type Str } from '@/schemas/common';

/** Schema for the ColorPicker component props. @convert-to-lens */
export const ColorPickerPropsSchema = v.strictObject({
	/** Current hex color value (e.g. '#ff0000'). @values #000000, #ffffff, #ff0000, #00ff00, #0000ff */
	value: v.optional(StrSchema),
	/** Callback when color changes. */
	onValueChange: v.optional(v.custom<(value: Str) => void>((val: unknown): boolean => typeof val === 'function')),
	/** Placeholder text for the hex input. @values #000000, #ffffff, #ff0000 */
	placeholder: v.optional(StrSchema),
	/** Additional CSS classes for the root element. */
	class: v.optional(StrSchema),
});
/** Props for the ColorPicker component. */
export type ColorPickerProps = v.InferOutput<typeof ColorPickerPropsSchema>;
</script>

<script lang="ts">
/**
 * Compact color picker with hex text input and native color swatch.
 *
 * Uses the shared Input component for the hex field with proper focus-visible
 * ring and consistent sizing. The native color swatch provides a visual picker.
 *
 * @example
 * ```svelte
 * <ColorPicker bind:value={color} />
 * ```
 */
import Input from '../input/input.svelte';
import { cn } from '../utils.js';

// Uses $bindable() — cannot use safeParse/validated.data pattern
let {
	value = $bindable('#000000'),
	onValueChange,
	placeholder = '#000000',
	class: className,
}: ColorPickerProps = $props();

/**
 * Handle hex input changes — normalize and propagate.
 *
 * @param e - Input event from the text field
 */
function handleTextInput(e: Event): void {
	// Cast safe — oninput only fires on HTMLInputElement
	const target: HTMLInputElement = e.target as HTMLInputElement;
	const raw: Str = target.value.trim();
	const hex: Str = raw.startsWith('#') ? raw : `#${raw}`;
	if (/^#[\da-fA-F]{3,8}$/.test(hex)) {
		value = hex;
		onValueChange?.(hex);
	}
}

/**
 * Handle native color swatch changes.
 *
 * @param e - Input event from the color input
 */
function handleSwatchInput(e: Event): void {
	// Cast safe — oninput only fires on HTMLInputElement
	const target: HTMLInputElement = e.target as HTMLInputElement;
	const { value: newValue } = target;
	value = newValue;
	onValueChange?.(newValue);
}
</script>

<div class={cn('flex items-center gap-2', className)}>
	<div
		class="relative size-7 shrink-0 overflow-hidden rounded-md border shadow-sm"
		style="background-color: {value}"
	>
		<input
			type="color"
			{value}
			oninput={handleSwatchInput}
			class="absolute inset-0 size-full cursor-pointer opacity-0"
		/>
	</div>
	<Input
		type="text"
		{value}
		{placeholder}
		oninput={handleTextInput}
		onkeydown={(e) => e.stopPropagation()}
		class="h-7 font-mono text-xs"
	/>
</div>
