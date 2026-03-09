<script lang="ts">
/**
 * Tooltip root that manages open/close state and anchors content to a trigger element.
 */
import { Tooltip as TooltipPrimitive } from 'bits-ui';

let { open = $bindable(false), ...restProps }: TooltipPrimitive.RootProps = $props();
</script>

<TooltipPrimitive.Root bind:open {...restProps} />
