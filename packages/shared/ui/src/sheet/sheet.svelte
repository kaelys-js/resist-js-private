<script lang="ts">
/**
 * Sheet/drawer root that manages open/close state for a slide-in panel overlay.
 */
import { Dialog as SheetPrimitive } from 'bits-ui';

let { open = $bindable(false), ...restProps }: SheetPrimitive.RootProps = $props();
</script>

<SheetPrimitive.Root bind:open {...restProps} />
