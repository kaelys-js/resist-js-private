<script lang="ts">
  /**
   * SheetTrigger Svelte component — button that opens the
   * sheet panel when clicked.
   *
   * @module
   */
  import { Dialog as SheetPrimitive } from 'bits-ui';

  let { ref = $bindable(null), ...restProps }: SheetPrimitive.TriggerProps = $props();
</script>

<SheetPrimitive.Trigger bind:ref data-slot="sheet-trigger" {...restProps} />
