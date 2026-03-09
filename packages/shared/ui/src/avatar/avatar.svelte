<script lang="ts">
/**
 * Displays a circular user avatar with loading state tracking.
 *
 * Wraps the bits-ui Avatar primitive with consistent sizing and rounded styling.
 */
import { Avatar as AvatarPrimitive } from 'bits-ui';
import { cn } from '../utils.js';

let {
	/** The underlying DOM element reference. */
	ref = $bindable(null),
	/** The image loading status (loading, loaded, or error). @values loading, loaded, error */
	loadingStatus = $bindable('loading'),
	/** Additional CSS classes to apply. */
	class: className,
	...restProps
}: AvatarPrimitive.RootProps = $props();
</script>

<AvatarPrimitive.Root
	bind:ref
	bind:loadingStatus
	data-slot="avatar"
	class={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}
	{...restProps}
/>
