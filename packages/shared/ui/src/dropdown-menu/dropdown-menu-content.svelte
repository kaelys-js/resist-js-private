<script lang="ts">
/**
 * Floating content panel for a dropdown menu, rendered inside a portal with animated open/close transitions.
 *
 * Positions itself relative to the trigger with a configurable side offset and constrains its height to available viewport space.
 */
import { cn, type WithoutChildrenOrChild } from '../utils.js';
import DropdownMenuPortal from './dropdown-menu-portal.svelte';
import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
import type { ComponentProps } from 'svelte';

let {
	/** The underlying DOM element reference. */
	ref = $bindable(null),
	/** Distance in pixels from the trigger edge. @values 0, 4, 8, 16 */
	sideOffset = 4,
	/** Props forwarded to the portal wrapper. */
	portalProps,
	/** Additional CSS classes to apply. */
	class: className,
	...restProps
}: DropdownMenuPrimitive.ContentProps & {
	portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DropdownMenuPortal>>;
} = $props();
</script>

<DropdownMenuPortal {...portalProps}>
	<DropdownMenuPrimitive.Content
		bind:ref
		data-slot="dropdown-menu-content"
		{sideOffset}
		class={cn(
			"bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-end-2 data-[side=right]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--bits-dropdown-menu-content-available-height) min-w-[8rem] origin-(--bits-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md outline-none data-[state=open]:animation-duration-200 data-[state=closed]:animation-duration-400",
			className
		)}
		{...restProps}
	/>
</DropdownMenuPortal>
