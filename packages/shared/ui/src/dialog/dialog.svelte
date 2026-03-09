<script lang="ts">
/**
 * Root state container for a dialog that manages its open/closed lifecycle.
 *
 * Wrap DialogContent, DialogHeader, and DialogFooter inside this component to create a modal dialog.
 */
import { Dialog as DialogPrimitive } from 'bits-ui';

let { /** Whether the dialog is open. */ open = $bindable(false), ...restProps }: DialogPrimitive.RootProps = $props();
</script>

<DialogPrimitive.Root bind:open {...restProps} />
