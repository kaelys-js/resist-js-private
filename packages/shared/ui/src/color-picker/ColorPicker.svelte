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
import type { Str } from '@/schemas/common';
import Input from '../input/input.svelte';
import { cn } from '../utils.js';

type ColorPickerProps = {
	/** Current hex color value (e.g. '#ff0000'). */
	value?: Str;
	/** Callback when color changes. */
	onValueChange?: (value: Str) => void;
	/** Placeholder text for the hex input. */
	placeholder?: Str;
	/** Additional CSS classes for the root element. */
	class?: Str;
};

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
