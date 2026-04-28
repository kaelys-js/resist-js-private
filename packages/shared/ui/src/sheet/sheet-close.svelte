<script lang="ts">
  /**
   * SheetClose Svelte component — close trigger for the
   * Sheet panel overlay.
   *
   * @module
   */
  import { Dialog as SheetPrimitive } from 'bits-ui';

  let { ref = $bindable(null), ...restProps }: SheetPrimitive.CloseProps = $props();
</script>

<SheetPrimitive.Close bind:ref data-slot="sheet-close" {...restProps} />
