<script lang="ts">
/**
 * An individual actionable item within a dropdown menu.
 *
 * Supports default and destructive variants, optional inset padding, and keyboard/pointer highlight states.
 */
import { cn } from '../utils.js';
import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

let {
	ref = $bindable(null),
	class: className,
	/** Whether to inset the item for icon alignment. */
	inset,
	/** Item style variant. @values default, destructive */
	variant = 'default',
	...restProps
}: DropdownMenuPrimitive.ItemProps & {
	inset?: boolean;
	variant?: 'default' | 'destructive';
} = $props();
</script>

<DropdownMenuPrimitive.Item
	bind:ref
	data-slot="dropdown-menu-item"
	data-inset={inset}
	data-variant={variant}
	class={cn(
		"data-highlighted:bg-white/[0.10] data-highlighted:text-foreground transition-colors duration-200 data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive/10 dark:data-[variant=destructive]:data-highlighted:bg-destructive/20 data-[variant=destructive]:data-highlighted:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:ps-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		className
	)}
	{...restProps}
/>
