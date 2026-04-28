<script lang="ts">
  /**
   * SheetOverlay Svelte component — semi-transparent backdrop
   * rendered behind the sheet panel that closes the sheet
   * when clicked.
   *
   * @module
   */
  import { Dialog as SheetPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: SheetPrimitive.OverlayProps = $props();
</script>

<SheetPrimitive.Overlay
  bind:ref
  data-slot="sheet-overlay"
  class={cn(
    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
    className,
  )}
  {...restProps}
/>
