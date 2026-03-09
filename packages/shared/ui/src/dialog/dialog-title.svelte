<script lang="ts">
/**
 * Primary heading text for a dialog, rendered as a semibold large-text label.
 *
 * Provides the accessible name for the dialog via aria-labelledby.
 */
import { Dialog as DialogPrimitive } from 'bits-ui';
import { cn } from '../utils.js';

let {
	ref = $bindable(null),
	class: className,
	...restProps
}: DialogPrimitive.TitleProps = $props();
</script>

<DialogPrimitive.Title
	bind:ref
	data-slot="dialog-title"
	class={cn("text-lg leading-none font-semibold", className)}
	{...restProps}
/>
