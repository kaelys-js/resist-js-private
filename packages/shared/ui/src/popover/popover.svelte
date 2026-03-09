<script lang="ts">
/**
 * Popover root that manages open/close state and anchors content to a trigger element.
 */
import { Popover as PopoverPrimitive } from 'bits-ui';

let {
	/** Whether the popover is open. */
	open = $bindable(false),
	...restProps
}: PopoverPrimitive.RootProps = $props();
</script>

<PopoverPrimitive.Root bind:open {...restProps} />
